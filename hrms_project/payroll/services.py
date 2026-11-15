"""Payroll calculation and workflow services.

All money arithmetic is Decimal. Legal rates come from effective-dated
configuration; employee identity/bank data is read from HR.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from attendance.models import AttendanceRecord
from employees.models import Employee
from leaves.models import LeaveRequest
from payroll.defaults import ensure_default_components, ensure_payroll_settings
from payroll.engine import calculator
from payroll.engine.formula import FormulaError, evaluate
from payroll.models import (
    EmployeeAdvance, EmployeeLoanInstallment, EmployeePayrollComponent,
    EmployeePayrollProfile, PayrollAdjustment, PayrollChangeLog, PayrollComponent,
    PayrollComponentRule, PayrollCost, PayrollCostAllocation, PayrollEmployeeResult,
    PayrollItem, PayrollOvertime, PayrollPeriod, PayrollWorkData,
)
from payroll.rates import effective_insurance_rate, effective_tax_brackets, insurance_values


class PayrollError(Exception):
    """Business-rule violation safe to show to the API caller."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def _company(obj):
    return getattr(obj, 'company', obj)


def _ip(request):
    if request is None:
        return None
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR')


def log_change(company, user, action, object_type, object_id='', old=None, new=None,
               reason='', period=None, request=None):
    if company is None:
        return None
    return PayrollChangeLog.objects.create(
        company=company, period=period, object_type=object_type, object_id=str(object_id or ''),
        action=action, old_value=old or {}, new_value=new or {}, reason=reason or '',
        user=user if getattr(user, 'is_authenticated', False) else None,
        ip_address=_ip(request),
    )


PERIOD_TRANSITIONS = {
    PayrollPeriod.Status.DRAFT: {PayrollPeriod.Status.OPEN, PayrollPeriod.Status.CANCELLED},
    PayrollPeriod.Status.OPEN: {PayrollPeriod.Status.CALCULATING, PayrollPeriod.Status.CANCELLED},
    PayrollPeriod.Status.CALCULATING: {PayrollPeriod.Status.CALCULATED, PayrollPeriod.Status.OPEN},
    PayrollPeriod.Status.CALCULATED: {PayrollPeriod.Status.UNDER_REVIEW, PayrollPeriod.Status.APPROVED,
                                      PayrollPeriod.Status.OPEN},
    PayrollPeriod.Status.UNDER_REVIEW: {PayrollPeriod.Status.CALCULATED, PayrollPeriod.Status.APPROVED},
    PayrollPeriod.Status.APPROVED: {PayrollPeriod.Status.PAYMENT_PENDING, PayrollPeriod.Status.CALCULATED},
    PayrollPeriod.Status.PAYMENT_PENDING: {PayrollPeriod.Status.PAID, PayrollPeriod.Status.APPROVED},
    PayrollPeriod.Status.PAID: {PayrollPeriod.Status.CLOSED},
    PayrollPeriod.Status.CLOSED: set(),
    PayrollPeriod.Status.CANCELLED: set(),
}


def transition_period(period, target, user=None, reason='', request=None):
    if target not in PERIOD_TRANSITIONS.get(period.status, set()):
        raise PayrollError('گذار وضعیت دوره مجاز نیست.')
    old_status = period.status
    period.status = target
    now = timezone.now()
    actor = user if getattr(user, 'is_authenticated', False) else None
    if target == PayrollPeriod.Status.UNDER_REVIEW:
        period.reviewed_at, period.reviewed_by = now, actor
    if target == PayrollPeriod.Status.APPROVED:
        period.approved_at, period.approved_by = now, actor
    if target == PayrollPeriod.Status.PAID:
        period.paid_at, period.paid_by = now, actor
    if target == PayrollPeriod.Status.CLOSED:
        period.closed_at, period.closed_by = now, actor
    period.save()
    log_change(period.company, user, 'status', 'PayrollPeriod', period.pk,
               {'status': old_status}, {'status': target}, reason, period, request)
    return period


def open_period(period, user=None, request=None):
    if period.status == PayrollPeriod.Status.DRAFT:
        return transition_period(period, PayrollPeriod.Status.OPEN, user, request=request)
    if period.status == PayrollPeriod.Status.OPEN:
        return period
    raise PayrollError('فقط دورهٔ پیش‌نویس را می‌توان باز کرد.')


def calculate_period(period, user=None, request=None, recalculate=False, reason=''):
    """Calculate all eligible employees in one transaction (batch)."""
    blocked = (PayrollPeriod.Status.PAID, PayrollPeriod.Status.CLOSED, PayrollPeriod.Status.CANCELLED)
    if period.status in blocked:
        raise PayrollError('دورهٔ پرداخت‌شده/بسته‌شده قابل محاسبه مجدد نیست؛ از اصلاحات استفاده کنید.')
    if period.status == PayrollPeriod.Status.APPROVED and not recalculate:
        raise PayrollError('برای محاسبهٔ مجدد دورهٔ تأییدشده، recalculate و علت لازم است.')
    if period.status == PayrollPeriod.Status.CALCULATED and not recalculate:
        raise PayrollError('دوره قبلاً محاسبه شده است؛ برای بازمحاسبه recalculate=1 بفرستید.')
    if recalculate and period.status in (
        PayrollPeriod.Status.CALCULATED, PayrollPeriod.Status.UNDER_REVIEW, PayrollPeriod.Status.APPROVED,
    ) and not reason:
        raise PayrollError('بازمحاسبه نیازمند ثبت علت است.')
    if period.status == PayrollPeriod.Status.DRAFT:
        open_period(period, user, request)
    if period.status not in (
        PayrollPeriod.Status.OPEN, PayrollPeriod.Status.CALCULATED,
        PayrollPeriod.Status.UNDER_REVIEW, PayrollPeriod.Status.APPROVED,
    ):
        raise PayrollError('وضعیت دوره برای محاسبه مجاز نیست.')

    company = period.company
    settings = ensure_payroll_settings(company)
    ensure_default_components(company)
    insurance_rate = effective_insurance_rate(company, period.end_date)
    tax_brackets = effective_tax_brackets(company, period.end_date)
    insurance_cfg = insurance_values(settings, insurance_rate)
    components = {c.code: c for c in PayrollComponent.objects.filter(company=company, is_active=True)}
    rules = {}
    for rule in PayrollComponentRule.objects.filter(
        company=company, effective_from__lte=period.end_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=period.start_date)).order_by('effective_from'):
        rules[rule.component_id] = rule

    # __CALC_DATA__
    employees = list(
        Employee.objects.filter(company=company, is_active=True)
        .filter(Q(hire_date__isnull=True) | Q(hire_date__lte=period.end_date))
        .filter(Q(contract_end_date__isnull=True) | Q(contract_end_date__gte=period.start_date))
        .filter(status__in=(Employee.EmploymentStatus.ACTIVE, Employee.EmploymentStatus.LEAVE))
        .select_related('department', 'job_title', 'work_location', 'contract_type')
        .order_by('employee_id')
    )
    ids = [employee.pk for employee in employees]
    profiles = {}
    for profile in EmployeePayrollProfile.objects.filter(
        company=company, employee_id__in=ids, effective_from__lte=period.end_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=period.start_date)).order_by('employee_id', '-effective_from'):
        profiles.setdefault(profile.employee_id, profile)
    work_data = {}
    if period.month:
        work_data = {
            row.employee_id: row for row in PayrollWorkData.objects.filter(
                company=company, employee_id__in=ids, year=period.year, month=period.month,
            ).exclude(status=PayrollWorkData.Status.REJECTED)
        }
    attendance = {
        row['employee_id']: row for row in AttendanceRecord.objects.filter(
            company=company, employee_id__in=ids, date__range=(period.start_date, period.end_date),
        ).values('employee_id').annotate(
            present=Count('id', filter=Q(status=AttendanceRecord.Status.PRESENT)),
            absent=Count('id', filter=Q(status=AttendanceRecord.Status.ABSENT)),
            leave=Count('id', filter=Q(status=AttendanceRecord.Status.LEAVE)),
            mission=Count('id', filter=Q(status=AttendanceRecord.Status.MISSION)),
            holiday=Count('id', filter=Q(status=AttendanceRecord.Status.HOLIDAY)),
            overtime=Sum('overtime_hours'), work_hours=Sum('work_hours'),
        )
    }
    leave_map = {}
    for row in LeaveRequest.objects.filter(
        company=company, employee_id__in=ids, status=LeaveRequest.Status.APPROVED,
        start_date__lte=period.end_date, end_date__gte=period.start_date,
    ).values('employee_id', 'leave_type', 'days', 'hours'):
        bucket = leave_map.setdefault(row['employee_id'], {'unpaid_days': Decimal('0'), 'hourly_hours': Decimal('0')})
        if row['leave_type'] == LeaveRequest.LeaveType.UNPAID:
            bucket['unpaid_days'] += row['days'] or Decimal('0')
        if row['leave_type'] == LeaveRequest.LeaveType.HOURLY:
            bucket['hourly_hours'] += row['hours'] or Decimal('0')
    overtime_map = {}
    for row in PayrollOvertime.objects.filter(
        company=company, employee_id__in=ids, status=PayrollOvertime.Status.APPROVED,
        date__range=(period.start_date, period.end_date),
    ):
        overtime_map.setdefault(row.employee_id, []).append(row)
    assignments = {}
    for row in EmployeePayrollComponent.objects.filter(
        company=company, employee_id__in=ids, effective_from__lte=period.end_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=period.start_date)).select_related('component'):
        assignments.setdefault(row.employee_id, []).append(row)
    advances = {}
    for row in EmployeeAdvance.objects.filter(
        company=company, employee_id__in=ids,
        status__in=(EmployeeAdvance.Status.APPROVED, EmployeeAdvance.Status.PAID),
        remaining_amount__gt=0,
    ):
        advances.setdefault(row.employee_id, []).append(row)
    installments = {}
    for row in EmployeeLoanInstallment.objects.filter(
        company=company, loan__employee_id__in=ids,
        status=EmployeeLoanInstallment.Status.PENDING, due_date__lte=period.end_date,
    ).select_related('loan'):
        installments.setdefault(row.loan.employee_id, []).append(row)
    allocations = {}
    for row in PayrollCostAllocation.objects.filter(
        company=company, employee_id__in=ids, effective_from__lte=period.end_date,
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=period.start_date)):
        allocations.setdefault(row.employee_id, []).append(row)
    adjustments = {}
    for row in PayrollAdjustment.objects.filter(
        company=company, target_period=period, status=PayrollAdjustment.Status.APPROVED,
    ):
        adjustments.setdefault(row.employee_id, []).append(row)
    prior_results = {}
    for row in PayrollEmployeeResult.objects.filter(
        company=company, employee_id__in=ids,
    ).exclude(period=period).order_by('employee_id', '-period__year', '-period__month', '-id'):
        prior_results.setdefault(row.employee_id, row)

    with transaction.atomic():
        old_status = period.status
        period.status = PayrollPeriod.Status.CALCULATING
        period.save(update_fields=['status', 'updated_at'])
        PayrollEmployeeResult.objects.filter(period=period).delete()
        PayrollCost.objects.filter(period=period).delete()
        for employee in employees:
            profile = profiles.get(employee.pk)
            metrics = _attendance_metrics(settings, attendance.get(employee.pk), leave_map.get(employee.pk))
            calc = _calculate_employee(
                company=company, period=period, employee=employee, profile=profile,
                settings=settings, components=components, rules=rules,
                insurance_cfg=insurance_cfg, tax_brackets=tax_brackets, metrics=metrics,
                overtime_rows=overtime_map.get(employee.pk, []),
                assignments=assignments.get(employee.pk, []),
                advances=advances.get(employee.pk, []),
                installments=installments.get(employee.pk, []),
                prior=prior_results.get(employee.pk),
                allocations=allocations.get(employee.pk, []),
                adjustments=adjustments.get(employee.pk, []),
                work=work_data.get(employee.pk),
            )
            result = PayrollEmployeeResult.objects.create(
                company=company, period=period, employee=employee,
                status=(PayrollEmployeeResult.Status.WARNING if calc['warnings']
                        else PayrollEmployeeResult.Status.CALCULATED),
                snapshot=calc['snapshot'], bank_snapshot=calc['bank_snapshot'],
                base_salary=calc['base_salary'], work_days=calc['work_days'],
                payable_days=calc['payable_days'], absence_days=calc['absence_days'],
                unpaid_leave_days=calc['unpaid_leave_days'], overtime_hours=calc['overtime_hours'],
                gross_amount=calc['gross'], insurance_base=calc['insurance_base'],
                insurance_employee=calc['insurance_employee'], insurance_employer=calc['insurance_employer'],
                tax_amount=calc['tax'], other_deductions=calc['other_deductions'],
                net_amount=calc['net'], employer_cost=calc['employer_cost'],
                total_cost=calc['total_cost'], warnings=calc['warnings'],
                cost_center=calc['cost_center'], project=calc['project'],
            )
            PayrollItem.objects.bulk_create([
                PayrollItem(
                    company=company, result=result, component=line.get('component'),
                    code=line['code'], title=line['title'], kind=line['kind'],
                    quantity=line.get('quantity') or 0, rate=line.get('rate') or 0,
                    amount=line['amount'], is_insurable=line.get('is_insurable', False),
                    is_taxable=line.get('is_taxable', False), project=line.get('project'),
                    cost_center=line.get('cost_center'), expense_account=line.get('expense_account'),
                    payable_account=line.get('payable_account'),
                    source_type=line.get('source_type', ''), source_id=line.get('source_id', ''),
                    description=line.get('description', ''),
                )
                for line in calc['items']
            ])
            PayrollCost.objects.bulk_create(_cost_rows(company, period, result, calc))
        _update_period_totals(period)
        period.status = PayrollPeriod.Status.CALCULATED
        period.calculated_at = timezone.now()
        period.calculated_by = user if getattr(user, 'is_authenticated', False) else None
        period.insurance_rate_snapshot = {
            'employee_rate': str(insurance_cfg['employee_rate']),
            'employer_rate': str(insurance_cfg['employer_rate']),
            'min_base': str(insurance_cfg['min_base']),
            'max_base': str(insurance_cfg['max_base']),
            'source': insurance_cfg['source'],
        }
        period.tax_rules_snapshot = [
            {
                'lower_bound': str(row.lower_bound),
                'upper_bound': str(row.upper_bound) if row.upper_bound is not None else None,
                'rate': str(row.rate),
            }
            for row in tax_brackets
        ]
        period.save()
        log_change(company, user, 'calculate', 'PayrollPeriod', period.pk,
                   {'status': old_status}, {'status': period.status, 'employees': len(employees)},
                   reason, period, request)
    return period


def _attendance_metrics(settings, row, leave):
    work_days = Decimal(str(settings.work_days_per_month or 0))
    if row is None:
        unpaid = (leave or {}).get('unpaid_days', Decimal('0'))
        payable = max(Decimal('0'), work_days - unpaid)
        return {
            'work_days': work_days, 'payable_days': payable,
            'absence_days': Decimal('0'), 'unpaid_leave_days': unpaid,
            'paid_days': payable, 'unapproved_overtime': Decimal('0'),
            'has_attendance': False,
        }
    present = Decimal(str(row.get('present') or 0))
    absent = Decimal(str(row.get('absent') or 0))
    leave_days = Decimal(str(row.get('leave') or 0))
    mission = Decimal(str(row.get('mission') or 0))
    holiday = Decimal(str(row.get('holiday') or 0))
    unpaid = (leave or {}).get('unpaid_days', Decimal('0'))
    payable = min(work_days, present + leave_days + mission + holiday)
    return {
        'work_days': work_days, 'payable_days': max(Decimal('0'), payable),
        'absence_days': absent, 'unpaid_leave_days': unpaid,
        'paid_days': payable,
        'unapproved_overtime': Decimal(str(row.get('overtime') or 0)),
        'has_attendance': True,
    }


def _rule_for(rules, component):
    return rules.get(getattr(component, 'pk', None)) if component else None


def _add_item(items, component, code, title, kind, amount, **kwargs):
    amount = calculator.dec(amount)
    items.append({
        'component': component, 'code': code, 'title': title, 'kind': kind,
        'amount': amount,
        'is_insurable': bool(kwargs.get('is_insurable', getattr(component, 'is_insurable', False))),
        'is_taxable': bool(kwargs.get('is_taxable', getattr(component, 'is_taxable', False))),
        'quantity': kwargs.get('quantity', Decimal('0')),
        'rate': kwargs.get('rate', Decimal('0')),
        'project': kwargs.get('project'), 'cost_center': kwargs.get('cost_center'),
        'expense_account': kwargs.get('expense_account', getattr(component, 'expense_account', None)),
        'payable_account': kwargs.get('payable_account', getattr(component, 'payable_account', None)),
        'source_type': kwargs.get('source_type', ''), 'source_id': kwargs.get('source_id', ''),
        'description': kwargs.get('description', ''),
    })
    return items[-1]


def _calculate_employee(*, company, period, employee, profile, settings, components, rules,
                        insurance_cfg, tax_brackets, metrics, overtime_rows, assignments,
                        advances, installments, prior, allocations, adjustments, work=None):
    """Build a full snapshot and item lines for one employee."""
    warnings = []
    items = []
    base_salary = calculator.dec(profile.base_salary if profile else 0)
    work_days = calculator.dec(metrics['work_days']) or Decimal('1')
    payable_days = calculator.dec(metrics['payable_days'])
    if work is not None:
        entered_work_days = calculator.dec(work.work_days)
        entered_payable_days = calculator.dec(work.payable_days)
        if entered_work_days > 0:
            work_days = entered_work_days
        if entered_payable_days > 0:
            payable_days = entered_payable_days
        elif entered_work_days > 0:
            payable_days = entered_work_days
    prorated_base = base_salary * payable_days / work_days
    daily = calculator.daily_rate(base_salary, work_days)
    hourly = calculator.hourly_rate(base_salary, work_days, settings.work_hours_per_day)
    cost_center = getattr(profile, 'default_cost_center', None) if profile else None
    project = getattr(profile, 'default_project', None) if profile else None
    if allocations:
        cost_center = allocations[0].cost_center or cost_center
        project = allocations[0].project or project
    bank = {
        'bank_name': getattr(employee, 'bank_name', '') or '',
        'account_number': getattr(employee, 'account_number', '') or '',
        'sheba_number': getattr(employee, 'sheba_number', '') or '',
        'card_number': getattr(employee, 'card_number', '') or '',
    }
    snapshot = {
        'employee_id': employee.pk,
        'employee_code': getattr(employee, 'employee_id', '') or '',
        'full_name': getattr(employee, 'full_name', '') or '',
        'national_id': getattr(employee, 'national_id', '') or '',
        'department': getattr(getattr(employee, 'department', None), 'name', '') or '',
        'job_title': getattr(getattr(employee, 'job_title', None), 'name', '') or '',
        'work_location': getattr(getattr(employee, 'work_location', None), 'name', '') or '',
        'contract_type': getattr(getattr(employee, 'contract_type', None), 'name', '') or '',
        'hire_date': employee.hire_date.isoformat() if getattr(employee, 'hire_date', None) else None,
        'contract_start_date': employee.contract_start_date.isoformat() if getattr(employee, 'contract_start_date', None) else None,
        'contract_end_date': employee.contract_end_date.isoformat() if getattr(employee, 'contract_end_date', None) else None,
        'insurance_number': getattr(employee, 'insurance_number', '') or '',
        'profile_id': getattr(profile, 'pk', None),
        'profile_effective_from': profile.effective_from.isoformat() if profile else None,
    }
    if not profile:
        warnings.append('پروفایل حقوقی برای این پرسنل تعریف نشده است؛ حقوق پایه صفر لحاظ شد.')
    elif base_salary <= 0:
        warnings.append('حقوق پایه در پروفایل حقوقی ثبت نشده است.')
    if not metrics['has_attendance']:
        warnings.append('برای این دوره رکورد حضور ثبت نشده؛ کارکرد کامل ماه فرض شد.')
    if settings.require_bank_account and not (bank['account_number'] or bank['sheba_number']):
        warnings.append('اطلاعات حساب/شبا برای پرداخت ثبت نشده است.')
    if metrics['unpaid_leave_days']:
        warnings.append(f"{calculator.dec(metrics['unpaid_leave_days']):g} روز مرخصی بدون حقوق در محاسبه لحاظ شد.")

    # __CALC_ITEMS__
    def fixed(code, title, value, category='allowance'):
        comp = components.get(code)
        if comp is None:
            return
        flags = (getattr(profile, 'component_settings', None) or {}).get(code, {}) if profile else {}
        if flags.get('compute') is False:
            return
        amount = calculator.round_money(calculator.clamp_amount(
            calculator.dec(value), comp.min_amount, comp.max_amount,
        ), settings.rounding_step)
        if amount:
            _add_item(
                items, comp, code, comp.title or title,
                comp.kind or 'earning', amount,
                is_insurable=flags.get('insurable', comp.is_insurable),
                is_taxable=flags.get('taxable', comp.is_taxable),
                project=project, cost_center=cost_center,
            )

    fixed('BASE_SALARY', 'حقوق پایه', prorated_base)
    if profile:
        fixed('HOUSING_ALLOWANCE', 'حق مسکن', profile.housing_allowance)
        fixed('FOOD_ALLOWANCE', 'بن/کمک‌هزینه اقلام مصرفی', profile.food_allowance)
        fixed('SENIORITY_ALLOWANCE', 'پایه سنوات', profile.seniority_allowance)
        fixed('ATTRACTION_ALLOWANCE', 'حق جذب', profile.attraction_allowance)
        fixed('JOB_ALLOWANCE', 'فوق‌العاده شغل', profile.job_allowance)
        fixed('SUPERVISION_ALLOWANCE', 'حق سرپرستی', profile.supervision_allowance)
        fixed('HARDSHIP_ALLOWANCE', 'سختی کار', profile.hardship_allowance)
        fixed('WORKSHOP_MISSION', 'ماموریت کارگاهی', profile.workshop_mission_allowance)
        fixed('MARRIAGE_ALLOWANCE', 'حق تأهل', profile.marriage_allowance)
        fixed('CHILD_ALLOWANCE', 'حق اولاد', profile.child_allowance)
        fixed('TRAVEL_ALLOWANCE', 'هزینه سفر', profile.travel_allowance)
        fixed('PHONE_ALLOWANCE', 'هزینه تلفن', profile.phone_allowance)
        fixed('OTHER_ALLOWANCE', 'سایر مزایای ثابت', profile.other_allowance)

    builtin_codes = {
        'BASE_SALARY', 'HOUSING_ALLOWANCE', 'FOOD_ALLOWANCE', 'SENIORITY_ALLOWANCE',
        'ATTRACTION_ALLOWANCE', 'JOB_ALLOWANCE', 'OTHER_ALLOWANCE', 'OVERTIME',
        'SUPERVISION_ALLOWANCE', 'HARDSHIP_ALLOWANCE', 'WORKSHOP_MISSION',
        'MARRIAGE_ALLOWANCE', 'CHILD_ALLOWANCE', 'TRAVEL_ALLOWANCE', 'PHONE_ALLOWANCE',
        'EMPLOYEE_INSURANCE', 'INCOME_TAX', 'LOAN_INSTALLMENT', 'ADVANCE',
        'OTHER_DEDUCTION', 'EMPLOYER_INSURANCE',
    }
    context = {
        'BASE_SALARY': base_salary,
        'PRORATED_BASE': prorated_base,
        'DAILY_RATE': daily,
        'HOURLY_RATE': hourly,
        'WORK_DAYS': work_days,
        'PAYABLE_DAYS': payable_days,
        'ABSENCE_DAYS': calculator.dec(metrics['absence_days']),
        'UNPAID_LEAVE_DAYS': calculator.dec(metrics['unpaid_leave_days']),
        'OVERTIME_HOURS': Decimal('0'),
    }
    for assignment in assignments:
        comp = assignment.component
        if comp is None or (comp.is_builtin and comp.code in builtin_codes):
            continue
        rule = _rule_for(rules, comp)
        calc_type = comp.calc_type
        formula = assignment.formula or (rule.formula if rule else '') or comp.formula
        amount = assignment.amount or (rule.amount if rule else Decimal('0'))
        rate = assignment.rate or (rule.rate if rule else Decimal('0'))
        try:
            if calc_type == PayrollComponent.CalcType.FORMULA:
                amount = evaluate(formula, {**context, **{
                    row['code']: row['amount'] for row in items if row['kind'] == 'earning'
                }})
            elif calc_type == PayrollComponent.CalcType.PERCENT:
                amount = base_salary * calculator.dec(rate) / Decimal('100')
            elif calc_type == PayrollComponent.CalcType.ATTENDANCE:
                amount = daily * calculator.dec(assignment.quantity or payable_days)
            else:
                amount = calculator.dec(amount) + (
                    calculator.dec(assignment.quantity) * calculator.dec(rate)
                )
        except FormulaError as exc:
            warnings.append(f'فرمول مؤلفه «{comp.title}» نامعتبر است: {exc}')
            amount = Decimal('0')
        min_amount = rule.min_amount if rule and rule.min_amount is not None else comp.min_amount
        max_amount = rule.max_amount if rule and rule.max_amount is not None else comp.max_amount
        amount = calculator.round_money(
            calculator.clamp_amount(abs(amount), min_amount, max_amount), settings.rounding_step,
        )
        if amount:
            _add_item(
                items, comp, comp.code, comp.title, comp.kind, amount,
                is_insurable=comp.is_insurable, is_taxable=comp.is_taxable,
                quantity=assignment.quantity, rate=rate,
                project=project, cost_center=cost_center,
                description=assignment.note,
            )
            if comp.kind == 'earning':
                context[comp.code] = amount

    overtime_component = components.get('OVERTIME')
    overtime_hours = Decimal('0')
    rate_map = {
        PayrollOvertime.Kind.OVERTIME: settings.overtime_rate,
        PayrollOvertime.Kind.NIGHT: settings.night_rate,
        PayrollOvertime.Kind.HOLIDAY: settings.holiday_rate,
        PayrollOvertime.Kind.SHIFT: settings.shift_rate,
        PayrollOvertime.Kind.MISSION: settings.overtime_rate,
    }
    for row in overtime_rows:
        hours = calculator.dec(row.hours)
        multiplier = calculator.dec(row.multiplier or rate_map.get(row.kind, settings.overtime_rate))
        amount = calculator.dec(row.amount) if row.amount is not None else calculator.overtime_amount(
            base_salary, work_days, settings.work_hours_per_day, hours, multiplier,
        )
        amount = calculator.round_money(amount, settings.rounding_step)
        if amount:
            _add_item(
                items, overtime_component, overtime_component.code if overtime_component else 'OVERTIME',
                overtime_component.title if overtime_component else row.get_kind_display(),
                'earning', amount, quantity=hours, rate=hourly * multiplier,
                is_insurable=overtime_component.is_insurable if overtime_component else True,
                is_taxable=overtime_component.is_taxable if overtime_component else True,
                project=project, cost_center=cost_center,
                source_type='overtime', source_id=str(row.pk),
                description=f'{row.get_kind_display()} — {row.date}',
            )
            overtime_hours += hours
            context['OVERTIME_HOURS'] = overtime_hours
    unapproved_hours = calculator.dec(metrics.get('unapproved_overtime'))
    approved_hours = overtime_hours
    if unapproved_hours > approved_hours:
        remain = unapproved_hours - approved_hours
        if settings.include_unapproved_overtime:
            amount = calculator.round_money(
                calculator.overtime_amount(
                    base_salary, work_days, settings.work_hours_per_day, remain, settings.overtime_rate,
                ), settings.rounding_step,
            )
            if amount:
                _add_item(
                    items, overtime_component, 'OVERTIME',
                    overtime_component.title if overtime_component else 'اضافه‌کاری',
                    'earning', amount, quantity=remain, rate=hourly * settings.overtime_rate,
                    is_insurable=True, is_taxable=True, project=project, cost_center=cost_center,
                    source_type='attendance', description='اضافه‌کاری ثبت‌شده در حضور و غیاب',
                )
                overtime_hours += remain
                context['OVERTIME_HOURS'] = overtime_hours
        else:
            warnings.append(
                f'{calculator.dec(remain):g} ساعت اضافه‌کاری تأییدنشده در حضور و غیاب وجود دارد و وارد محاسبه نشد.'
            )

    if work is not None:
        work_hours = [
            ('overtime_hours', settings.overtime_rate, 'اضافه‌کاری کارکرد'),
            ('friday_hours', settings.holiday_rate, 'جمعه‌کاری'),
            ('night_hours', settings.night_rate, 'شب‌کاری کارکرد'),
            ('shift_hours', settings.shift_rate, 'نوبت‌کاری کارکرد'),
        ]
        for field, multiplier, title in work_hours:
            hours = calculator.dec(getattr(work, field, 0))
            if hours <= 0:
                continue
            amount = calculator.round_money(
                calculator.overtime_amount(
                    base_salary, work_days, settings.work_hours_per_day, hours, multiplier,
                ), settings.rounding_step,
            )
            if amount:
                _add_item(
                    items, overtime_component, 'OVERTIME', title, 'earning', amount,
                    quantity=hours, rate=hourly * multiplier,
                    is_insurable=True, is_taxable=True, project=project, cost_center=cost_center,
                    source_type='work_data', source_id=str(work.pk),
                    description=f'ورود اطلاعات کارکرد {work.year}/{work.month}',
                )
                overtime_hours += hours
                context['OVERTIME_HOURS'] = overtime_hours
        extra_earning = calculator.round_money(calculator.dec(work.other_earning), settings.rounding_step)
        if extra_earning:
            _add_item(
                items, components.get('OTHER_ALLOWANCE'), 'WORK_OTHER_EARNING',
                'سایر دریافتی کارکرد', 'earning', extra_earning,
                is_insurable=False, is_taxable=False, project=project, cost_center=cost_center,
                source_type='work_data', source_id=str(work.pk),
            )
        extra_deduction = calculator.round_money(calculator.dec(work.other_deduction), settings.rounding_step)
        if extra_deduction:
            _add_item(
                items, components.get('OTHER_DEDUCTION'), 'WORK_OTHER_DEDUCTION',
                'سایر کسورات کارکرد', 'deduction', extra_deduction,
                is_insurable=False, is_taxable=False, project=project, cost_center=cost_center,
                source_type='work_data', source_id=str(work.pk),
            )

    summary = calculator.summarize_lines(items)
    insurance_base = summary['insurance_base']
    if profile and not profile.insurance_eligible:
        insurance_base = Decimal('0')
    insurance = calculator.insurance_amounts(
        insurance_base, insurance_cfg['employee_rate'], insurance_cfg['employer_rate'],
        insurance_cfg['min_base'], insurance_cfg['max_base'],
    )
    insurance_component = components.get('EMPLOYEE_INSURANCE')
    if insurance['employee']:
        _add_item(
            items, insurance_component, 'EMPLOYEE_INSURANCE',
            insurance_component.title if insurance_component else 'بیمه سهم کارمند',
            'deduction', calculator.round_money(insurance['employee'], settings.rounding_step),
            is_insurable=False, is_taxable=False, rate=insurance_cfg['employee_rate'],
            project=project, cost_center=cost_center,
        )
    elif insurance_base > 0 and calculator.dec(insurance_cfg['employee_rate'])<= 0:
        warnings.append('نرخ بیمه برای این دوره تنظیم نشده است؛ بیمه صفر محاسبه شد.')
    employer_component = components.get('EMPLOYER_INSURANCE')
    if insurance['employer']:
        _add_item(
            items, employer_component, 'EMPLOYER_INSURANCE',
            employer_component.title if employer_component else 'بیمه سهم کارفرما',
            'employer_cost', calculator.round_money(insurance['employer'], settings.rounding_step),
            is_insurable=False, is_taxable=False, rate=insurance_cfg['employer_rate'],
            project=project, cost_center=cost_center,
        )

    taxable_base = summary['taxable_base']
    if profile and not profile.tax_eligible:
        taxable_base = Decimal('0')
    if taxable_base > 0 and not tax_brackets:
        warnings.append('پله‌های مالیات برای این دوره تنظیم نشده است؛ مالیات صفر محاسبه شد.')
    tax_result = calculator.progressive_tax(
        taxable_base, tax_brackets, settings.tax_exemption_monthly,
        insurance['employee'] if settings.tax_deduct_employee_insurance else Decimal('0'),
    )
    tax_component = components.get('INCOME_TAX')
    if tax_result['amount']:
        _add_item(
            items, tax_component, 'INCOME_TAX',
            tax_component.title if tax_component else 'مالیات حقوق',
            'deduction', calculator.round_money(tax_result['amount'], settings.rounding_step),
            is_insurable=False, is_taxable=False,
            project=project, cost_center=cost_center,
        )

    loan_component = components.get('LOAN_INSTALLMENT')
    for row in installments:
        amount = max(Decimal('0'), calculator.dec(row.amount) - calculator.dec(row.paid_amount))
        if amount:
            _add_item(
                items, loan_component, 'LOAN_INSTALLMENT',
                loan_component.title if loan_component else 'قسط وام',
                'deduction', calculator.round_money(amount, settings.rounding_step),
                is_insurable=False, is_taxable=False,
                project=project, cost_center=cost_center,
                source_type='loan_installment', source_id=str(row.pk),
                description=f'قسط {row.sequence} وام — سررسید {row.due_date}',
            )
    advance_component = components.get('ADVANCE')
    for row in advances:
        remaining = calculator.dec(row.remaining_amount)
        installment = calculator.dec(row.installment_amount)
        amount = min(remaining, installment) if installment > 0 else remaining
        if amount:
            _add_item(
                items, advance_component, 'ADVANCE',
                advance_component.title if advance_component else 'مساعده',
                'deduction', calculator.round_money(amount, settings.rounding_step),
                is_insurable=False, is_taxable=False,
                project=project, cost_center=cost_center,
                source_type='advance', source_id=str(row.pk),
                description=row.reason or 'مساعده',
            )

    for adjustment in adjustments:
        _add_item(
            items, None, f'ADJUSTMENT-{adjustment.pk}', f'اصلاح حقوق — {adjustment.title}',
            adjustment.kind, calculator.round_money(adjustment.amount, settings.rounding_step),
            is_insurable=False, is_taxable=False,
            project=project, cost_center=cost_center,
            source_type='adjustment', source_id=str(adjustment.pk),
            description=adjustment.reason,
        )
        warnings.append(f'اصلاح تأییدشدهٔ «{adjustment.title}» در این دوره اعمال شد.')

    gross = sum((row['amount'] for row in items if row['kind'] == 'earning'), Decimal('0'))
    employee_insurance = sum(
        (row['amount'] for row in items if row['kind'] == 'deduction' and row['code'] == 'EMPLOYEE_INSURANCE'),
        Decimal('0'),
    )
    tax_amount = sum(
        (row['amount'] for row in items if row['kind'] == 'deduction' and row['code'] == 'INCOME_TAX'),
        Decimal('0'),
    )
    all_deductions = sum((row['amount'] for row in items if row['kind'] == 'deduction'), Decimal('0'))
    other_deductions = max(Decimal('0'), all_deductions - employee_insurance - tax_amount)
    employer_costs = sum((row['amount'] for row in items if row['kind'] == 'employer_cost'), Decimal('0'))
    net = gross - employee_insurance - tax_amount - other_deductions
    if net < 0:
        warnings.append('خالص پرداختی منفی شده است؛ مبلغ صفر ثبت شد و کسورات نیازمند بررسی است.')
        net = Decimal('0')
    if prior and calculator.dec(prior.gross_amount) > 0:
        previous_gross = calculator.dec(prior.gross_amount)
        change = abs((gross - previous_gross) / previous_gross * Decimal('100'))
        if change > calculator.dec(settings.large_change_threshold):
            warnings.append(
                f'تغییر غیرعادی نسبت به دورهٔ قبل: {change:.1f}٪ '
                f'(قبلی {previous_gross:,.0f} / فعلی {gross:,.0f})'
            )
    if not allocations and not project and not cost_center:
        warnings.append('تخصیص پروژه/مرکز هزینه برای این پرسنل تعریف نشده است.')

    totals = {
        'base_salary': base_salary,
        'work_days': work_days,
        'payable_days': payable_days,
        'absence_days': calculator.dec(work.absence_days if work is not None else metrics['absence_days']),
        'unpaid_leave_days': calculator.dec(work.unpaid_leave_days if work is not None else metrics['unpaid_leave_days']),
        'overtime_hours': overtime_hours,
        'gross': calculator.round_money(gross, settings.rounding_step),
        'insurance_base': calculator.round_money(insurance_base, settings.rounding_step),
        'insurance_employee': calculator.round_money(employee_insurance, settings.rounding_step),
        'insurance_employer': calculator.round_money(insurance['employer'], settings.rounding_step),
        'tax': calculator.round_money(tax_amount, settings.rounding_step),
        'other_deductions': calculator.round_money(other_deductions, settings.rounding_step),
        'net': calculator.round_money(net, settings.rounding_step),
        'employer_cost': calculator.round_money(employer_costs, settings.rounding_step),
        'total_cost': calculator.round_money(gross + employer_costs, settings.rounding_step),
        'cost_center': cost_center,
        'project': project,
    }
    return {
        **totals,
        'snapshot': snapshot,
        'bank_snapshot': bank,
        'items': items,
        'warnings': warnings,
        'allocations': allocations,
        'tax_breakdown': [
            {
                'lower_bound': str(row['lower_bound']),
                'upper_bound': str(row['upper_bound']) if row['upper_bound'] is not None else None,
                'rate': str(row['rate']),
                'portion': str(row['portion']),
                'amount': str(row['amount']),
            }
            for row in tax_result['rows']
        ],
    }


def _cost_rows(company, period, result, calc):
    raw_allocations = calc.get('allocations') or []
    allocations = []
    for row in raw_allocations:
        if isinstance(row, dict):
            allocations.append(row)
            continue
        allocations.append({
            'percentage': row.percentage,
            'project': row.project,
            'cost_center': row.cost_center,
            'is_direct': row.is_direct,
        })
    if not allocations:
        allocations = [{
            'percentage': Decimal('100'),
            'project': calc.get('project'),
            'cost_center': calc.get('cost_center'),
            'is_direct': True,
        }]
    total_percent = sum((calculator.dec(row['percentage']) for row in allocations), Decimal('0'))
    if total_percent <= 0:
        total_percent = Decimal('100')
    if total_percent != Decimal('100'):
        allocations = [
            {**row, 'percentage': calculator.dec(row['percentage']) * Decimal('100') / total_percent}
            for row in allocations
        ]
    rows = []
    for line in calc['items']:
        if line['kind'] not in ('earning', 'employer_cost'):
            continue
        component = line.get('component')
        if component is not None and not component.affects_cost:
            continue
        for allocation in allocations:
            amount = calculator.dec(line['amount']) * calculator.dec(allocation['percentage']) / Decimal('100')
            if amount <= 0:
                continue
            rows.append(PayrollCost(
                company=company, period=period, result=result, employee=result.employee,
                component=component, code=line['code'], title=line['title'],
                amount=amount,
                project=allocation.get('project') or line.get('project') or calc.get('project'),
                cost_center=(allocation.get('cost_center') or line.get('cost_center')
                             or calc.get('cost_center')),
                is_direct=bool(allocation.get('is_direct', True)),
                is_employer_cost=line['kind'] == 'employer_cost',
                date=period.end_date,
            ))
    return rows


def _update_period_totals(period):
    rows = period.results.all()
    aggregate = rows.aggregate(
        employee_count=Count('id'),
        warning_count=Count('id', filter=Q(status=PayrollEmployeeResult.Status.WARNING)),
        gross=Sum('gross_amount'),
        insurance_employee=Sum('insurance_employee'),
        insurance_employer=Sum('insurance_employer'),
        tax=Sum('tax_amount'),
        other_deductions=Sum('other_deductions'),
        net=Sum('net_amount'),
        employer_cost=Sum('employer_cost'),
        total_cost=Sum('total_cost'),
    )
    period.employee_count = aggregate['employee_count'] or 0
    period.calculated_count = aggregate['employee_count'] or 0
    period.warning_count = aggregate['warning_count'] or 0
    period.gross_amount = aggregate['gross'] or Decimal('0')
    period.insurance_employee = aggregate['insurance_employee'] or Decimal('0')
    period.insurance_employer = aggregate['insurance_employer'] or Decimal('0')
    period.tax_amount = aggregate['tax'] or Decimal('0')
    period.other_deductions = aggregate['other_deductions'] or Decimal('0')
    period.net_amount = aggregate['net'] or Decimal('0')
    period.employer_cost = aggregate['employer_cost'] or Decimal('0')
    period.total_cost = aggregate['total_cost'] or Decimal('0')
    period.save(update_fields=[
        'employee_count', 'calculated_count', 'warning_count', 'gross_amount',
        'insurance_employee', 'insurance_employer', 'tax_amount', 'other_deductions',
        'net_amount', 'employer_cost', 'total_cost', 'updated_at',
    ])
    return period
    # __CALC_TOTALS__
    return {}