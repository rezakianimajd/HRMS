"""Deep management analytics — consolidated KPIs and cross-cutting reports."""
from datetime import date, timedelta
from django.db.models import Avg, Count, Sum, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from employees.models import Employee


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _money(v):
    try:
        return round(float(v or 0), 0)
    except (TypeError, ValueError):
        return 0.0


def _age(birth):
    if not birth:
        return None
    today = date.today()
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))


def _tenure(hire):
    if not hire:
        return None
    return round((date.today() - hire).days / 365.25, 1)


def _latest_salaries(employee_ids, company=None):
    from payroll.models import SalaryRecord

    if not employee_ids:
        return {}
    qs = SalaryRecord.objects.filter(employee_id__in=employee_ids)
    if company:
        qs = qs.filter(company=company)
    out = {}
    for rec in qs.order_by('-year', '-month'):
        if rec.employee_id not in out:
            out[rec.employee_id] = rec
    return out


def _active_employees(company):
    qs = Employee.objects.filter(is_active=True, status='active')
    if company:
        qs = qs.filter(company=company)
    return qs.select_related('department', 'job_title', 'work_location', 'contract_type')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def management_kpis(request):
    """Consolidated management KPI set."""
    company = _get_company(request)
    emps = list(_active_employees(company))
    total = len(emps)
    today = date.today()
    month_start = today.replace(day=1)

    if not total:
        return Response({
            'total_active': 0, 'male_ratio': 0, 'female_ratio': 0,
            'avg_age': 0, 'avg_tenure_years': 0, 'avg_salary': 0,
            'avg_performance': 0, 'avg_satisfaction': 0,
            'new_this_month': 0, 'turnover_ytd': 0,
        })

    ids = [e.id for e in emps]
    salaries = _latest_salaries(ids, company)

    males = sum(1 for e in emps if e.gender == 'male')
    females = sum(1 for e in emps if e.gender == 'female')
    ages = [_age(e.birth_date) for e in emps if _age(e.birth_date) is not None]
    tenures = [_tenure(e.hire_date) for e in emps if _tenure(e.hire_date) is not None]
    nets = [_money(salaries[e.id].net_payable) for e in emps if e.id in salaries]
    perfs = [float(e.performance_score) for e in emps if e.performance_score is not None]
    sats = [float(e.satisfaction_score) for e in emps if e.satisfaction_score is not None]

    # Turnover YTD: employees with termination/retirement status_change_date this year
    terminated = Employee.objects.filter(
        status__in=['terminated', 'retired'],
        status_change_date__year=today.year,
    )
    if company:
        terminated = terminated.filter(company=company)

    new_this_month = sum(1 for e in emps if e.hire_date and e.hire_date >= month_start)

    return Response({
        'total_active': total,
        'male_ratio': round(males / total * 100, 1),
        'female_ratio': round(females / total * 100, 1),
        'avg_age': round(sum(ages) / len(ages), 1) if ages else 0,
        'avg_tenure_years': round(sum(tenures) / len(tenures), 1) if tenures else 0,
        'avg_salary': round(sum(nets) / len(nets), 0) if nets else 0,
        'avg_performance': round(sum(perfs) / len(perfs), 1) if perfs else 0,
        'avg_satisfaction': round(sum(sats) / len(sats), 1) if sats else 0,
        'new_this_month': new_this_month,
        'turnover_ytd': terminated.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def department_analytics(request):
    """Per-department headcount, salary, performance, satisfaction, age, tenure."""
    company = _get_company(request)
    emps = list(_active_employees(company))
    if not emps:
        return Response([])

    ids = [e.id for e in emps]
    salaries = _latest_salaries(ids, company)

    buckets = {}
    for e in emps:
        dept = e.department.name if e.department else '(بدون دپارتمان)'
        b = buckets.setdefault(dept, {'emps': []})
        b['emps'].append(e)

    out = []
    for dept, b in buckets.items():
        e_list = b['emps']
        nets = [_money(salaries[e.id].net_payable) for e in e_list if e.id in salaries]
        perfs = [float(e.performance_score) for e in e_list if e.performance_score is not None]
        sats = [float(e.satisfaction_score) for e in e_list if e.satisfaction_score is not None]
        ages = [_age(e.birth_date) for e in e_list if _age(e.birth_date) is not None]
        tenures = [_tenure(e.hire_date) for e in e_list if _tenure(e.hire_date) is not None]
        out.append({
            'department': dept,
            'headcount': len(e_list),
            'avg_salary': round(sum(nets) / len(nets), 0) if nets else 0,
            'avg_performance': round(sum(perfs) / len(perfs), 1) if perfs else 0,
            'avg_satisfaction': round(sum(sats) / len(sats), 1) if sats else 0,
            'avg_age': round(sum(ages) / len(ages), 1) if ages else 0,
            'avg_tenure_years': round(sum(tenures) / len(tenures), 1) if tenures else 0,
        })

    out.sort(key=lambda d: -d['headcount'])
    return Response(out)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payroll_cost_trend(request):
    """12-month payroll cost breakdown (net, benefits, employer insurance, deductions)."""
    from payroll.models import SalaryRecord
    from django.db.models import Sum

    company = _get_company(request)
    qs = SalaryRecord.objects.all()
    if company:
        qs = qs.filter(company=company)

    today = date.today()
    months = []
    for i in range(11, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        subset = qs.filter(year=y, month=str(m))
        agg = subset.aggregate(
            net=Sum('net_payable'),
            benefits=Sum('total_benefits'),
            deductions=Sum('total_deductions'),
            employer_insurance=Sum('employer_insurance'),
        )
        import jdatetime as jd
        try:
            j = jd.date.fromgregorian(year=y, month=m, day=1)
            label = f'{j.month}/{j.year}'
        except Exception:
            label = f'{m}/{y}'
        months.append({
            'label': label, 'year': y, 'month': m,
            'net': _money(agg['net']),
            'benefits': _money(agg['benefits']),
            'deductions': _money(agg['deductions']),
            'employer_insurance': _money(agg['employer_insurance']),
        })
    return Response({'months': months})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def education_distribution(request):
    company = _get_company(request)
    qs = _active_employees(company).values('education_level').annotate(count=Count('id'))
    labels = dict(Employee.EducationLevel.choices)
    return Response([
        {'education': labels.get(d['education_level'], 'نامشخص') if d['education_level'] else 'نامشخص',
         'count': d['count']}
        for d in qs
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def city_distribution(request):
    company = _get_company(request)
    qs = _active_employees(company).values('city').annotate(count=Count('id'))
    return Response([
        {'city': d['city'] or 'نامشخص', 'count': d['count']}
        for d in qs
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def performance_distribution(request):
    company = _get_company(request)
    emps = list(_active_employees(company).filter(performance_score__isnull=False))
    buckets = [
        {'label': 'زیر ۵۰', 'min': 0, 'max': 50, 'count': 0, 'color': '#ef4444'},
        {'label': '۵۰ تا ۷۰', 'min': 50, 'max': 70, 'count': 0, 'color': '#f59e0b'},
        {'label': '۷۰ تا ۸۵', 'min': 70, 'max': 85, 'count': 0, 'color': '#3b82f6'},
        {'label': 'بالای ۸۵', 'min': 85, 'max': 101, 'count': 0, 'color': '#10b981'},
    ]
    for e in emps:
        v = float(e.performance_score)
        for b in buckets:
            if b['min'] <= v < b['max']:
                b['count'] += 1
                break
    return Response(buckets)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leave_utilization(request):
    """Annual leave entitlement / used / remaining for active employees."""
    from jdatetime import date as jdate
    from leaves.models import LeaveRequest
    from settings_app.engines.settings_engine import SettingsEngine

    company = _get_company(request)
    emps = list(_active_employees(company))
    annual = int(SettingsEngine.get_effective_setting('LEAVE_DEFAULT_TOTAL_DAYS', default=30, company=company) or 30)

    today = jdate.today()
    year_start = jdate(today.year, 1, 1)
    year_end = (jdate(today.year + 1, 1, 1) - timedelta(days=1)) if today.month == 12 else (jdate(today.year, today.month + 1, 1) - timedelta(days=1))

    total_used = 0
    total_remaining = 0
    detail = []
    for e in emps:
        used_qs = LeaveRequest.objects.filter(
            company=company, employee=e, status=LeaveRequest.Status.APPROVED,
            leave_type__in=['annual', 'sick', 'unpaid'],
            start_date__lte=year_end.togregorian(),
            end_date__gte=year_start.togregorian(),
        )
        used = sum(float(r.days or 0) for r in used_qs)
        remaining = max(0.0, annual - used)
        total_used += used
        total_remaining += remaining
        detail.append({
            'employee': e.full_name,
            'employee_id': e.employee_id,
            'department': e.department.name if e.department else '',
            'entitlement': annual,
            'used': round(used, 1),
            'remaining': round(remaining, 1),
        })

    detail.sort(key=lambda d: d['remaining'])
    return Response({
        'total_employees': len(emps),
        'entitlement': annual,
        'total_used': round(total_used, 1),
        'total_remaining': round(total_remaining, 1),
        'utilization_rate': round(total_used / (annual * len(emps)) * 100, 1) if (annual * len(emps)) else 0,
        'detail': detail[:30],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def asset_inventory(request):
    """Assets by type and status."""
    from lifecycle.models import Asset

    company = _get_company(request)
    qs = Asset.objects.filter(is_active=True)
    if company:
        qs = qs.filter(company=company)

    by_type = list(qs.values('asset_type').annotate(count=Count('id')))
    by_status = list(qs.values('status').annotate(count=Count('id')))
    type_labels = dict(Asset.AssetType.choices)
    status_labels = dict(Asset.AssetStatus.choices)

    return Response({
        'by_type': [{'type': type_labels.get(d['asset_type'], d['asset_type']), 'count': d['count']} for d in by_type],
        'by_status': [{'status': status_labels.get(d['status'], d['status']), 'count': d['count']} for d in by_status],
        'total': qs.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_summary(request):
    """Active loans and outstanding balances."""
    from payroll.models import EmployeeLoan

    company = _get_company(request)
    qs = EmployeeLoan.objects.filter(is_active=True)
    if company:
        qs = qs.filter(company=company)

    active = qs.filter(status='active')
    total_loans = _money(active.aggregate(s=Sum('amount'))['s'])
    total_installments = _money(active.aggregate(s=Sum('installment_amount'))['s'])
    return Response({
        'active_count': active.count(),
        'total_amount': total_loans,
        'total_monthly_installments': total_installments,
        'paid_count': qs.filter(status='paid').count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def absenteeism_summary(request):
    """12-month absenteeism / attendance rates."""
    from attendance.models import AttendanceRecord

    company = _get_company(request)
    qs = AttendanceRecord.objects.all()
    if company:
        qs = qs.filter(company=company)

    today = date.today()
    months = []
    for i in range(11, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        subset = qs.filter(date__year=y, date__month=m)
        total = subset.count()
        present = subset.filter(status='present').count()
        absent = subset.filter(status='absent').count()
        import jdatetime as jd
        try:
            j = jd.date.fromgregorian(year=y, month=m, day=1)
            label = f'{j.month}/{j.year}'
        except Exception:
            label = f'{m}/{y}'
        months.append({
            'label': label,
            'present_rate': round(present / total * 100, 1) if total else 0,
            'absenteeism_rate': round(absent / total * 100, 1) if total else 0,
            'total': total,
        })
    return Response({'months': months})