"""Consolidated data endpoint for the AI/human assistant."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Count, Sum
from datetime import date, timedelta
from employees.models import Employee
from documents.models import Document
from correspondences.models import IncomingLetter, OutgoingLetter, Announcement, Form


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assistant_query(request):
    """
    Hybrid assistant endpoint:
      - Intent + Entity + SQL for structured data
      - Lightweight semantic retrieval (RAG) for documents
      - Resignation-risk scoring
    """
    from core.engines.assistant_engine import AssistantEngine

    question = (request.data or {}).get('question', '')
    company = _get_company(request)
    result = AssistantEngine.answer(question, company=company)
    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def assistant_chart(request):
    """
    Generate an SVG chart from DB data (offline, no external deps).
    Query params: chart_type=bar|donut, subject=departments|gender|...
    """
    from django.http import HttpResponse
    from core.engines import assistant_charts
    from employees.models import Employee
    from django.db.models import Count

    company = _get_company(request)
    chart_type = request.query_params.get('chart_type', 'bar')
    subject = request.query_params.get('subject', 'departments')

    qs = Employee.objects.filter(is_active=True)
    if company:
        qs = qs.filter(company=company)

    if subject == 'departments':
        data = list(qs.values('department__name').annotate(c=Count('id')).order_by('-c')[:8])
        labels = [d['department__name'] or 'نامشخص' for d in data]
        values = [d['c'] for d in data]
        title = 'توزیع پرسنل در دپارتمان‌ها'
    elif subject == 'gender':
        data = list(qs.values('gender').annotate(c=Count('id')))
        gender_map = {'male': 'مرد', 'female': 'زن'}
        labels = [gender_map.get(d['gender'], d['gender'] or 'نامشخص') for d in data]
        values = [d['c'] for d in data]
        title = 'ترکیب جنسیتی پرسنل'
    elif subject == 'job_titles':
        data = list(qs.values('job_title__name').annotate(c=Count('id')).order_by('-c')[:8])
        labels = [d['job_title__name'] or 'نامشخص' for d in data]
        values = [d['c'] for d in data]
        title = 'عناوین شغلی'
    elif subject == 'locations':
        data = list(qs.values('work_location__name').annotate(c=Count('id')).order_by('-c')[:8])
        labels = [d['work_location__name'] or 'نامشخص' for d in data]
        values = [d['c'] for d in data]
        title = 'محل‌های استقرار'
    else:
        data = list(qs.values('department__name').annotate(c=Count('id')).order_by('-c')[:8])
        labels = [d['department__name'] or 'نامشخص' for d in data]
        values = [d['c'] for d in data]
        title = 'توزیع پرسنل در دپارتمان‌ها'

    if chart_type == 'donut':
        colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e']
        svg = assistant_charts.donut(title, labels, values, colors[:len(labels)])
    else:
        svg = assistant_charts.horizontal_bar(title, labels, values, color='#6366f1', value_suffix=' نفر')

    return HttpResponse(svg, content_type='image/svg+xml')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def assistant_data(request):
    """
    Single endpoint returning everything the assistant needs,
    read fresh from the database and combined into one payload.
    """
    company = _get_company(request)
    emp_qs = Employee.objects.all()
    if company:
        emp_qs = emp_qs.filter(company=company, is_active=True)

    # Employees with full personal/employment fields (for name-based lookups)
    employees = [
        {
            'id': e.id,
            'first_name': e.first_name,
            'last_name': e.last_name,
            'full_name': e.full_name,
            'employee_id': e.employee_id,
            'national_id': e.national_id,
            'mobile': e.mobile,
            'birth_date': e.birth_date.isoformat() if e.birth_date else None,
            'hire_date': e.hire_date.isoformat() if e.hire_date else None,
            'gender': e.get_gender_display() if e.gender else '',
            'marital_status': e.get_marital_status_display() if e.marital_status else '',
            'status': e.get_status_display() if e.status else '',
            'department_name': e.department.name if e.department else '',
            'job_title_name': e.job_title.name if e.job_title else '',
            'work_location_name': e.work_location.name if e.work_location else '',
            'contract_type_name': e.contract_type.name if e.contract_type else '',
            'contract_end_date': e.contract_end_date.isoformat() if e.contract_end_date else None,
        }
        for e in emp_qs.select_related('department', 'job_title', 'work_location', 'contract_type')
    ]

    # Department distribution
    departments = list(
        emp_qs.values('department__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Gender distribution
    genders = list(emp_qs.values('gender').annotate(count=Count('id')))

    # Location distribution
    locations = list(
        emp_qs.values('work_location__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Job title distribution
    job_titles = list(
        emp_qs.values('job_title__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Turnover
    today = date.today()
    terminated = emp_qs.filter(
        status__in=['terminated', 'retired'],
        status_change_date__year=today.year,
    ).count()
    total = emp_qs.count()

    # Birthdays (next 7 days, Jalali)
    from jdatetime import date as jdate
    from datetime import timedelta
    today_j = jdate.today()
    birthdays = []
    for e in emp_qs.filter(birth_date__isnull=False):
        gj = jdate.fromgregorian(date=e.birth_date)
        for offset in range(0, 8):
            target = today_j + timedelta(days=offset)
            if target.month == gj.month and target.day == gj.day:
                birthdays.append({
                    'id': e.id,
                    'full_name': e.full_name,
                    'department_name': e.department.name if e.department else '',
                    'days_until': offset,
                    'is_today': offset == 0,
                })
                break
    birthdays.sort(key=lambda x: x['days_until'])

    # Expiring contracts (90 days)
    threshold = today + timedelta(days=90)
    contracts_expiring = [
        {'id': e.id, 'full_name': e.full_name, 'employee_id': e.employee_id, 'contract_end_date': e.contract_end_date.isoformat()}
        for e in emp_qs.filter(contract_end_date__isnull=False, contract_end_date__gte=today, contract_end_date__lte=threshold)
    ]

    # Correspondence summary
    def _c(model):
        qs = model.objects
        if company:
            qs = qs.filter(company=company)
        return qs.count()

    correspondences = {
        'incoming': _c(IncomingLetter),
        'outgoing': _c(OutgoingLetter),
        'announcements': _c(Announcement),
        'forms': _c(Form),
    }

    # Documents summary
    doc_qs = Document.objects.filter(is_active=True)
    if company:
        doc_qs = doc_qs.filter(company=company)
    documents = {
        'total': doc_qs.count(),
        'expired': doc_qs.filter(expiry_date__lt=today).count(),
    }

    # Salary summary (global)
    from payroll.models import SalaryRecord, BenefitRecord
    sal_qs = SalaryRecord.objects.filter(company=company) if company else SalaryRecord.objects.all()
    salary = {
        'total_payable': sal_qs.aggregate(s=Sum('net_payable'))['s'] or 0,
        'total_deductions': sal_qs.aggregate(s=Sum('total_deductions'))['s'] or 0,
    }

    # Per-employee payroll for "ماه گذشته" (previous Jalali month)
    from jdatetime import date as jdate
    today_j = jdate.today()
    prev_j = today_j - timedelta(days=30)
    prev_year, prev_month = prev_j.year, str(prev_j.month)

    payroll = {}
    for e in emp_qs:
        rec = SalaryRecord.objects.filter(
            company=company, employee=e, year=prev_year, month=prev_month
        ).first() if company else SalaryRecord.objects.filter(
            employee=e, year=prev_year, month=prev_month
        ).first()
        benefits_sum = (BenefitRecord.objects.filter(company=company, employee=e, year=prev_year, month=prev_month) if company else BenefitRecord.objects.filter(employee=e, year=prev_year, month=prev_month)).aggregate(s=Sum('paid_amount'))['s'] or 0
        payroll[str(e.id)] = {
            'year': prev_year,
            'month': prev_month,
            'month_label': f"{prev_year}/{prev_month}",
            'work_days': float(rec.work_days) if rec else 0,
            'total_benefits': float(rec.total_benefits) if rec else 0,
            'total_deductions': float(rec.total_deductions) if rec else 0,
            'net_payable': float(rec.net_payable) if rec else 0,
            'benefits': float(benefits_sum),
        }

    return Response({
        'employees': employees,
        'departments': [{'name': d['department__name'] or 'نامشخص', 'count': d['count']} for d in departments],
        'genders': genders,
        'locations': [{'name': l['work_location__name'] or 'نامشخص', 'count': l['count']} for l in locations],
        'job_titles': [{'name': j['job_title__name'] or 'نامشخص', 'count': j['count']} for j in job_titles],
        'turnover': {'rate': round(terminated / total * 100, 2) if total else 0, 'terminated_count': terminated},
        'avg_age': 0,  # computed client-side from birth_date if needed
        'birthdays': birthdays,
        'contracts_expiring': contracts_expiring,
        'correspondences': correspondences,
        'documents': documents,
        'salary': salary,
        'payroll': payroll,
    })
