"""Payroll finalization: accounting, treasury, payment and closing."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from accounting.models import AccountingDocument, AccountingDocumentLine, FiscalPeriod, FiscalYear
from accounting.services import allocate_document_number
from payroll.models import (
    EmployeeAdvance, EmployeeLoanInstallment, PayrollAccountMapping,
    PayrollEmployeeResult, PayrollPeriod, PayrollSettlement,
)
from payroll.services import PayrollError, log_change, transition_period


def _company(obj):
    return getattr(obj, 'company', obj)


def _fiscal_context(company, on_date):
    year = FiscalYear.objects.filter(
        company=company, start_date__lte=on_date, end_date__gte=on_date,
    ).order_by('-start_date').first()
    period = None
    if year:
        period = FiscalPeriod.objects.filter(
            company=company, fiscal_year=year, start_date__lte=on_date, end_date__gte=on_date,
        ).first()
    return year, period


def _mapping_map(company):
    return {
        row.code: row for row in PayrollAccountMapping.objects.filter(
            company=company, is_active=True,
        ).select_related('account', 'journal')
    }


def _require_mapping(mappings, code, amount, missing):
    if amount and code not in mappings:
        missing.append(code)


def post_accounting(period, user=None, request=None):
    """Generate and post the balanced payroll accounting document."""
    if period.accounting_document_id:
        return period.accounting_document
    if period.status != PayrollPeriod.Status.APPROVED:
        raise PayrollError('برای ثبت سند، دوره باید تأیید شده باشد.')
    mappings = _mapping_map(period.company)
    missing = []
    for code, amount in (
        (PayrollAccountMapping.Event.SALARY_EXPENSE, period.gross_amount),
        (PayrollAccountMapping.Event.EMPLOYER_INSURANCE_EXPENSE, period.insurance_employer),
        (PayrollAccountMapping.Event.EMPLOYEE_INSURANCE_PAYABLE, period.insurance_employee),
        (PayrollAccountMapping.Event.EMPLOYER_INSURANCE_PAYABLE, period.insurance_employer),
        (PayrollAccountMapping.Event.TAX_PAYABLE, period.tax_amount),
        (PayrollAccountMapping.Event.OTHER_DEDUCTION_PAYABLE, period.other_deductions),
        (PayrollAccountMapping.Event.NET_PAYABLE, period.net_amount),
    ):
        _require_mapping(mappings, code, amount, missing)
    if missing:
        labels = dict(PayrollAccountMapping.Event.choices)
        raise PayrollError(
            'نگاشت حساب برای این رویدادها تعریف نشده است: '
            + '، '.join(labels.get(code, code) for code in missing),
        )
    if period.gross_amount <= 0:
        raise PayrollError('جمع حقوق دوره صفر است و سند قابل ثبت نیست.')
    lines = []

    def add(code, side, amount, title):
        mapping = mappings.get(code)
        if not amount or not mapping:
            return
        lines.append({
            'account': mapping.account, 'side': side,
            'amount': Decimal(str(amount)), 'description': title,
        })

    add(PayrollAccountMapping.Event.SALARY_EXPENSE, 'debit',
        period.gross_amount, 'هزینه حقوق و مزایا')
    add(PayrollAccountMapping.Event.EMPLOYER_INSURANCE_EXPENSE, 'debit',
        period.insurance_employer, 'هزینه بیمه سهم کارفرما')
    add(PayrollAccountMapping.Event.EMPLOYEE_INSURANCE_PAYABLE, 'credit',
        period.insurance_employee, 'بیمه پرداختنی — سهم کارمند')
    add(PayrollAccountMapping.Event.EMPLOYER_INSURANCE_PAYABLE, 'credit',
        period.insurance_employer, 'بیمه پرداختنی — سهم کارفرما')
    add(PayrollAccountMapping.Event.TAX_PAYABLE, 'credit', period.tax_amount, 'مالیات پرداختنی')
    add(PayrollAccountMapping.Event.OTHER_DEDUCTION_PAYABLE, 'credit',
        period.other_deductions, 'سایر کسورات پرداختنی')
    add(PayrollAccountMapping.Event.NET_PAYABLE, 'credit', period.net_amount, 'حقوق پرداختنی')
    debit = sum(row['amount'] for row in lines if row['side'] == 'debit')
    credit = sum(row['amount'] for row in lines if row['side'] == 'credit')
    if debit != credit:
        raise PayrollError(f'سند حقوق نامتوازن است: بدهکار {debit} ≠ بستانکار {credit}')

    # __POST_ACCOUNTING__
    year, fiscal_period = _fiscal_context(period.company, period.end_date)
    journal = next((row.journal for row in mappings.values() if row.journal_id), None)
    with transaction.atomic():
        doc = AccountingDocument.objects.create(
            company=period.company, journal=journal, fiscal_year=year, period=fiscal_period,
            number=allocate_document_number(company=period.company, journal=journal, fiscal_year=year),
            date=period.end_date, description=f'سند حقوق و دستمزد — {period.label}',
            status=AccountingDocument.Status.POSTED, source_module='payroll',
            source_id=str(period.pk), is_locked=True,
            created_by=user if getattr(user, 'is_authenticated', False) else None,
            posted_by=user if getattr(user, 'is_authenticated', False) else None,
            posted_at=timezone.now(),
        )
        for index, row in enumerate(lines, start=1):
            AccountingDocumentLine.objects.create(
                company=period.company, document=doc, account=row['account'],
                line_no=index, description=row['description'],
                debit=row['amount'] if row['side'] == 'debit' else Decimal('0'),
                credit=row['amount'] if row['side'] == 'credit' else Decimal('0'),
                base_amount=row['amount'],
            )
        period.accounting_document = doc
        period.save(update_fields=['accounting_document', 'updated_at'])
        log_change(period.company, user, 'post_accounting', 'PayrollPeriod', period.pk,
                   new={'accounting_document': doc.pk, 'number': doc.number},
                   period=period, request=request)
    return doc


def create_payment_request(period, user=None, request=None, due_date=None):
    """Create a treasury payment request for the net payroll amount."""
    if period.payment_request_id:
        return period.payment_request
    if period.status not in (PayrollPeriod.Status.APPROVED, PayrollPeriod.Status.PAYMENT_PENDING):
        raise PayrollError('درخواست پرداخت فقط برای دورهٔ تأییدشده ساخته می‌شود.')
    if period.net_amount <= 0:
        raise PayrollError('مبلغ خالص پرداختی صفر است.')
    from treasury.payment_models import PaymentRequest

    with transaction.atomic():
        row = PaymentRequest.objects.create(
            company=period.company,
            title=f'پرداخت حقوق — {period.label}',
            description=f'پرداخت خالص حقوق {period.employee_count} نفر',
            requester=user if getattr(user, 'is_authenticated', False) else None,
            amount=period.net_amount,
            approved_amount=period.net_amount,
            requested_date=date.today(),
            due_date=due_date or period.end_date,
            source_type='payroll',
            source_id=str(period.pk),
            status=PaymentRequest.Status.SUBMITTED,
            submitted_at=timezone.now(),
        )
        period.payment_request = row
        period.save(update_fields=['payment_request', 'updated_at'])
        if period.status == PayrollPeriod.Status.APPROVED:
            transition_period(period, PayrollPeriod.Status.PAYMENT_PENDING, user, request=request)
        log_change(period.company, user, 'payment_request', 'PayrollPeriod', period.pk,
                   new={'payment_request': row.pk, 'amount': str(period.net_amount)},
                   period=period, request=request)
    return row


def mark_paid(period, user=None, request=None, reference=''):
    """Mark period paid and settle loan/advance/overtime side effects."""
    if period.status == PayrollPeriod.Status.APPROVED:
        transition_period(period, PayrollPeriod.Status.PAYMENT_PENDING, user, request=request)
    if period.status != PayrollPeriod.Status.PAYMENT_PENDING:
        raise PayrollError('فقط دورهٔ در انتظار پرداخت قابل ثبت پرداخت است.')
    if period.payment_request_id:
        from treasury.payment_models import PaymentRequest

        PaymentRequest.objects.filter(pk=period.payment_request_id).update(
            status=PaymentRequest.Status.PAID, decided_at=timezone.now(),
        )
    with transaction.atomic():
        results = list(period.results.all())
        for result in results:
            result.status = PayrollEmployeeResult.Status.PAID
            result.paid_at = timezone.now()
            result.payment_reference = reference
            result.save(update_fields=['status', 'paid_at', 'payment_reference', 'updated_at'])
        for item in period.results.prefetch_related('items').all():
            for line in item.items.filter(source_type='loan_installment'):
                EmployeeLoanInstallment.objects.filter(pk=line.source_id).update(
                    status=EmployeeLoanInstallment.Status.PAID,
                    paid_amount=line.amount,
                    payroll_period=period,
                )
            for line in item.items.filter(source_type='advance'):
                advance = EmployeeAdvance.objects.filter(pk=line.source_id).first()
                if not advance:
                    continue
                advance.deducted_amount = calculator_decimal(advance.deducted_amount) + line.amount
                advance.remaining_amount = max(
                    Decimal('0'), calculator_decimal(advance.remaining_amount) - line.amount,
                )
                advance.last_deducted_period = period
                if advance.remaining_amount <= 0:
                    advance.status = EmployeeAdvance.Status.SETTLED
                advance.save(update_fields=[
                    'deducted_amount', 'remaining_amount', 'last_deducted_period', 'status', 'updated_at',
                ])
        period.paid_amount = period.net_amount
        period.payment_reference = reference
        period.save(update_fields=['paid_amount', 'payment_reference', 'updated_at'])
        PayrollAdjustment.objects.filter(
            target_period=period, status=PayrollAdjustment.Status.APPROVED,
        ).update(status=PayrollAdjustment.Status.APPLIED)
        transition_period(period, PayrollPeriod.Status.PAID, user, request=request)
        log_change(period.company, user, 'paid', 'PayrollPeriod', period.pk,
                   new={'reference': reference, 'amount': str(period.paid_amount)},
                   period=period, request=request)
    return period


def calculator_decimal(value):
    return Decimal(str(value or 0))


def close_period(period, user=None, request=None):
    if period.status != PayrollPeriod.Status.PAID:
        raise PayrollError('فقط دورهٔ پرداخت‌شده بسته می‌شود.')
    return transition_period(period, PayrollPeriod.Status.CLOSED, user, request=request)


def reopen_period(period, user=None, request=None, reason=''):
    if period.status != PayrollPeriod.Status.CLOSED:
        raise PayrollError('فقط دورهٔ بسته‌شده قابل بازگشایی است.')
    if not reason:
        raise PayrollError('بازگشایی دوره نیازمند علت است.')
    with transaction.atomic():
        period.status = PayrollPeriod.Status.APPROVED
        period.closed_at = None
        period.closed_by = None
        period.save(update_fields=['status', 'closed_at', 'closed_by', 'updated_at'])
        log_change(period.company, user, 'reopen', 'PayrollPeriod', period.pk,
                   {'status': 'closed'}, {'status': 'approved'}, reason, period, request)
    return period


def generate_loan_installments(loan, user=None, request=None):
    """Create a deterministic installment schedule for a legacy EmployeeLoan."""
    if loan.installments.exists():
        return list(loan.installments.order_by('sequence'))
    count = max(1, int(loan.installment_count or 1))
    total = Decimal(str(loan.amount or 0))
    per = Decimal(str(loan.installment_amount or 0))
    if per <= 0:
        per = total / count
    rows = []
    remaining = total
    for index in range(1, count + 1):
        amount = per if index < count else remaining
        amount = min(amount, remaining)
        rows.append(EmployeeLoanInstallment(
            company=loan.company, loan=loan, sequence=index,
            due_date=(loan.grant_date + timedelta(days=30 * (index - 1))),
            amount=amount,
        ))
        remaining -= amount
    EmployeeLoanInstallment.objects.bulk_create(rows)
    log_change(loan.company, user, 'generate_installments', 'EmployeeLoan', loan.pk,
               new={'installments': count}, request=request)
    return list(loan.installments.order_by('sequence'))


def calculate_settlement(settlement, user=None, request=None):
    """Calculate end-of-service entitlements from HR/profile data."""
    from jdatetime import date as jdate
    from payroll.models import EmployeePayrollProfile, PayrollSettings

    employee = settlement.employee
    profile = EmployeePayrollProfile.objects.filter(
        company=settlement.company, employee=employee, effective_from__lte=settlement.date,
    ).order_by('-effective_from').first()
    settings = PayrollSettings.objects.filter(company=settlement.company).first()
    base = Decimal(str(profile.base_salary if profile else 0))
    work_days = Decimal(str(settings.work_days_per_month if settings else 30)) or Decimal('30')
    hire = employee.hire_date
    years = Decimal('0')
    if hire:
        years = (Decimal(str((settlement.date - hire).days)) / Decimal('365.25')).quantize(Decimal('0.01'))
    leave_days = Decimal(str(settlement.leave_days or 0))
    if leave_days <= 0:
        try:
            today = jdate.fromgregorian(date=settlement.date)
            year_start = jdate(today.year, 1, 1).togregorian()
            used = sum(
                (row.days or Decimal('0')) for row in employee.leave_requests.filter(
                    company=settlement.company, status='approved', leave_type='annual',
                    start_date__gte=year_start, end_date__lte=settlement.date,
                )
            )
            entitlement = Decimal(str(settings.annual_leave_days if settings else 30))
            leave_days = max(Decimal('0'), entitlement - Decimal(str(used)))
        except Exception:  # noqa: BLE001 — settlement should still be editable
            leave_days = Decimal('0')
    leave_pay = (base / work_days) * leave_days
    severance = base * years
    loan_balance = sum(
        (Decimal(str(row.amount or 0)) - Decimal(str(row.paid_amount or 0)))
        for row in EmployeeLoanInstallment.objects.filter(
            company=settlement.company, loan__employee=employee,
            status=EmployeeLoanInstallment.Status.PENDING,
        )
    )
    advance_balance = sum(
        Decimal(str(row.remaining_amount or 0)) for row in EmployeeAdvance.objects.filter(
            company=settlement.company, employee=employee,
            status__in=(EmployeeAdvance.Status.APPROVED, EmployeeAdvance.Status.PAID),
            remaining_amount__gt=0,
        )
    )
    gross = (leave_pay + severance + Decimal(str(settlement.eid_amount or 0))
             + Decimal(str(settlement.other_earnings or 0)))
    net = gross - loan_balance - advance_balance - Decimal(str(settlement.other_deductions or 0))
    settlement.service_years = years
    settlement.leave_days = leave_days
    settlement.leave_pay = leave_pay
    settlement.severance = severance
    settlement.loan_balance = loan_balance
    settlement.advance_balance = advance_balance
    settlement.gross_amount = gross
    settlement.net_amount = max(Decimal('0'), net)
    settlement.status = PayrollSettlement.Status.CALCULATED
    settlement.calculation = {
        'base_salary': str(base), 'work_days': str(work_days), 'leave_days': str(leave_days),
        'leave_pay': str(leave_pay), 'severance': str(severance),
        'loan_balance': str(loan_balance), 'advance_balance': str(advance_balance),
        'gross': str(gross), 'net': str(settlement.net_amount),
    }
    settlement.save()
    log_change(settlement.company, user, 'calculate', 'PayrollSettlement', settlement.pk,
               new=settlement.calculation, request=request)
    return settlement