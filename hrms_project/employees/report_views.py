"""Report views for HR analytics."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Avg, Sum, Q, F
from django.db.models.functions import ExtractYear, TruncMonth
from datetime import date, timedelta
from employees.models import Employee, Department
from documents.models import Document


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_department(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True)
    if company: qs = qs.filter(company=company)
    total = qs.count()
    data = qs.values('department__name').annotate(count=Count('id')).order_by('-count')
    return Response([{'name': d['department__name'] or 'نامشخص', 'count': d['count'], 'percent': round(d['count']/total*100,1) if total else 0} for d in data])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_location(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True)
    if company: qs = qs.filter(company=company)
    data = qs.values('work_location__name').annotate(count=Count('id')).order_by('-count')
    return Response([{'name': d['work_location__name'] or 'نامشخص', 'count': d['count']} for d in data])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_job_title(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True)
    if company: qs = qs.filter(company=company)
    data = qs.values('job_title__name','job_title__level').annotate(count=Count('id')).order_by('-count')
    return Response([{'name': d['job_title__name'] or 'نامشخص','level': d['job_title__level'], 'count': d['count']} for d in data])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_gender(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True)
    if company: qs = qs.filter(company=company)
    total = qs.count()
    data = qs.values('gender').annotate(count=Count('id'))
    result = []
    for g in [{'value':'male','label':'مرد'},{'value':'female','label':'زن'}]:
        item = next((d for d in data if d['gender']==g['value']), None)
        result.append({'gender':g['label'],'count':item['count'] if item else 0,'percent': round((item['count']/total*100) if item and total else 0, 1)})
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def turnover_rate(request):
    company = _get_company(request)
    year = int(request.query_params.get('year', date.today().year))
    qs = Employee.objects
    if company: qs = qs.filter(company=company)
    terminated = qs.filter(status__in=['terminated','retired'], status_change_date__year=year).count()
    avg_employees = qs.count()
    rate = round(terminated/avg_employees*100, 2) if avg_employees else 0
    return Response({'year': year, 'terminated_count': terminated, 'avg_employees': avg_employees, 'rate': rate})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def salary_cost(request):
    """Monthly payroll cost trend over the last 12 months (payroll module)."""
    from payroll.models import SalaryRecord
    from django.db.models import Sum

    company = _get_company(request)
    qs = SalaryRecord.objects.all()
    if company:
        qs = qs.filter(company=company)

    today = date.today()
    rows = []
    for i in range(11, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        agg = qs.filter(year=y, month=str(m)).aggregate(s=Sum('net_payable'))
        # Jalali label for the trend axis
        from jdatetime import date as jdate
        try:
            jd = jdate.fromgregorian(year=y, month=m, day=1)
            label = f'{jd.month}/{jd.year}'
        except Exception:
            label = f'{m}/{y}'
        rows.append({'label': label, 'year': y, 'month': m, 'total': agg['s'] or 0})

    return Response({'months': rows, 'total': sum(r['total'] for r in rows)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_summary(request):
    """Monthly attendance/absence/leave rate over the last 12 months."""
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
        present = subset.filter(status=AttendanceRecord.Status.PRESENT).count()
        absent = subset.filter(status=AttendanceRecord.Status.ABSENT).count()
        leave = subset.filter(status=AttendanceRecord.Status.LEAVE).count()
        mission = subset.filter(status=AttendanceRecord.Status.MISSION).count()
        from jdatetime import date as jdate
        try:
            jd = jdate.fromgregorian(year=y, month=m, day=1)
            label = f'{jd.month}/{jd.year}'
        except Exception:
            label = f'{m}/{y}'
        months.append({
            'label': label, 'year': y, 'month': m,
            'total': total, 'present': present, 'absent': absent,
            'leave': leave, 'mission': mission,
            'present_rate': round(present / total * 100, 1) if total else 0,
        })

    return Response({'months': months})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def average_age_experience(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True)
    if company: qs = qs.filter(company=company)
    today = date.today()
    data = qs.values('department__name').annotate(
        avg_age=Avg(ExtractYear('birth_date')),
        avg_hire_year=Avg(ExtractYear('hire_date'))
    )
    return Response([{
        'department': d['department__name'] or 'نامشخص',
        'avg_age': round(today.year - d['avg_age'], 1) if d['avg_age'] else None,
        'avg_experience_years': round(today.year - d['avg_hire_year'], 1) if d['avg_hire_year'] else None,
    } for d in data])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contracts_expiring(request):
    company = _get_company(request)
    today = date.today()
    threshold = today + timedelta(days=90)
    qs = Employee.objects.filter(is_active=True, contract_end_date__isnull=False, contract_end_date__gte=today, contract_end_date__lte=threshold)
    if company: qs = qs.filter(company=company)
    return Response([{'id': e.id, 'full_name': e.full_name, 'employee_id': e.employee_id, 'contract_end_date': e.contract_end_date, 'department': e.department.name if e.department else ''} for e in qs[:100]])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leave_balance_summary(request):
    return Response({'message': 'Leave balances available after leaves module activation.', 'balances': []})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_contract_type(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True)
    if company: qs = qs.filter(company=company)
    total = qs.count()
    data = qs.values('contract_type__name').annotate(count=Count('id')).order_by('-count')
    return Response([
        {'name': d['contract_type__name'] or 'نامشخص',
         'key': d['contract_type__name'],
         'count': d['count'],
         'percent': round(d['count']/total*100, 1) if total else 0}
        for d in data
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_marital_status(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True)
    if company: qs = qs.filter(company=company)
    total = qs.count()
    data = qs.values('marital_status').annotate(count=Count('id')).order_by('-count')
    return Response([
        {'name': dict(Employee.MaritalStatus.choices).get(d['marital_status'], d['marital_status']),
         'key': d['marital_status'], 'count': d['count'],
         'percent': round(d['count']/total*100, 1) if total else 0}
        for d in data
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_work_shift(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True)
    if company: qs = qs.filter(company=company)
    total = qs.count()
    data = qs.values('work_shift').annotate(count=Count('id')).order_by('-count')
    return Response([
        {'name': dict(Employee.WorkShift.choices).get(d['work_shift'], 'نامشخص') if d['work_shift'] else 'نامشخص',
         'key': d['work_shift'], 'count': d['count'],
         'percent': round(d['count']/total*100, 1) if total else 0}
        for d in data
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_age_group(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True, birth_date__isnull=False)
    if company: qs = qs.filter(company=company)
    today = date.today()
    groups = [
        {'label': 'زیر ۲۵ سال', 'min': 25, 'max': None, 'count': 0},
        {'label': '۲۵ تا ۳۰ سال', 'min': 30, 'max': 25, 'count': 0},
        {'label': '۳۰ تا ۳۵ سال', 'min': 35, 'max': 30, 'count': 0},
        {'label': '۳۵ تا ۴۵ سال', 'min': 45, 'max': 35, 'count': 0},
        {'label': 'بالای ۴۵ سال', 'min': None, 'max': 45, 'count': 0},
    ]
    for e in qs:
        age = today.year - e.birth_date.year
        for g in groups:
            if g['min'] is None and age > g['max']:
                g['count'] += 1
                break
            elif g['max'] is None and age <= g['min']:
                g['count'] += 1
                break
            elif g['min'] is not None and g['max'] is not None and g['max'] <= age < g['min']:
                g['count'] += 1
                break
    return Response(groups)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_hires_trend(request):
    """Monthly new hires over the last 12 months."""
    company = _get_company(request)
    qs = Employee.objects.all()
    if company: qs = qs.filter(company=company)
    today = date.today()
    result = []
    for i in range(11, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        count = qs.filter(hire_date__year=y, hire_date__month=m).count()
        from jdatetime import date as jdate
        try:
            jd = jdate.fromgregorian(year=y, month=m, day=1)
            label = f'{jd.month}/{jd.year}'
        except Exception:
            label = f'{m}/{y}'
        result.append({'label': label, 'count': count})
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_by_insurance(request):
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True)
    if company: qs = qs.filter(company=company)
    total = qs.count()
    data = qs.values('insurance_list__name').annotate(count=Count('id')).order_by('-count')
    return Response([
        {'name': d['insurance_list__name'] or 'نامشخص', 'count': d['count'],
         'percent': round(d['count']/total*100, 1) if total else 0}
        for d in data
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def upcoming_birthdays(request):
    """Employees whose birthday falls within the next 7 days."""
    from jdatetime import date as jdate
    from datetime import timedelta
    company = _get_company(request)
    qs = Employee.objects.filter(is_active=True, birth_date__isnull=False)
    if company: qs = qs.filter(company=company)

    days_ahead = int(request.query_params.get('days', 7))
    today_j = jdate.today()
    result = []
    for e in qs:
        gj = jdate.fromgregorian(date=e.birth_date)
        # Compute days until the next occurrence of this birthday
        for offset in range(0, days_ahead + 1):
            target = today_j + timedelta(days=offset)
            if target.month == gj.month and target.day == gj.day:
                result.append({
                    'id': e.id,
                    'full_name': e.full_name,
                    'employee_id': e.employee_id,
                    'department_name': e.department.name if e.department else '',
                    'birth_jalali': f'{gj.year}/{str(gj.month).zfill(2)}/{str(gj.day).zfill(2)}',
                    'birth_gregorian': e.birth_date.isoformat(),
                    'days_until': offset,
                    'is_today': offset == 0,
                })
                break
    result.sort(key=lambda x: x['days_until'])
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def correspondences_summary(request):
    """Count of incoming/outgoing letters, announcements, and forms."""
    from correspondences.models import IncomingLetter, OutgoingLetter, Announcement, Form
    company = _get_company(request)
    qs = lambda m: m.objects.filter(company=company) if company else m.objects.all()
    return Response({
        'incoming_letters': qs(IncomingLetter).count(),
        'outgoing_letters': qs(OutgoingLetter).count(),
        'announcements': qs(Announcement).count(),
        'forms': qs(Form).count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def salary_and_benefits_summary(request):
    """Aggregated salary & benefit report."""
    company = _get_company(request)
    from payroll.models import SalaryRecord, BenefitRecord
    from django.db.models import Sum

    qs_s = SalaryRecord.objects.filter(company=company) if company else SalaryRecord.objects.all()
    qs_b = BenefitRecord.objects.filter(company=company) if company else BenefitRecord.objects.all()

    return Response({
        'total_salaries': qs_s.aggregate(s=Sum('net_payable'))['s'] or 0,
        'total_benefits': qs_s.aggregate(s=Sum('total_benefits'))['s'] or 0,
        'total_deductions': qs_s.aggregate(s=Sum('total_deductions'))['s'] or 0,
        'salary_records': qs_s.count(),
        'benefit_records': qs_b.count(),
        'benefits_total_gross': qs_b.aggregate(s=Sum('gross_amount'))['s'] or 0,
        'benefits_total_paid': qs_b.aggregate(s=Sum('paid_amount'))['s'] or 0,
    })
