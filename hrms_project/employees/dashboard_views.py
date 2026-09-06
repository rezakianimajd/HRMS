"""Dashboard views for HR analytics."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from datetime import date, timedelta
from employees.models import Employee
from documents.models import Document
from core.models.audit_log import AuditLog


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Key statistics for the dashboard."""
    company = _get_company(request)
    today = date.today()
    month_start = today.replace(day=1)

    qs = Employee.objects.all()
    if company:
        qs = qs.filter(company=company)

    total_active = qs.filter(is_active=True, status='active').count()
    on_leave = qs.filter(is_active=True, status='leave').count()
    retired_this_year = qs.filter(status__in=['retired', 'terminated'], status_change_date__year=today.year).count()
    new_this_month = qs.filter(hire_date__gte=month_start, hire_date__lte=today).count()

    doc_qs = Document.objects.filter(is_active=True)
    if company:
        doc_qs = doc_qs.filter(company=company)
    expired_docs = doc_qs.filter(expiry_date__lt=today).count()
    expiring_contracts = qs.filter(
        is_active=True,
        contract_end_date__isnull=False,
        contract_end_date__gte=today,
        contract_end_date__lte=today + timedelta(days=90)
    ).count()

    # Pending approval counts (workflow load) — used by the dashboard KPI row.
    from leaves.models import LeaveRequest
    from employees.models import HRRequest
    pending_leaves = LeaveRequest.objects.filter(company=company, status='pending').count() if company else LeaveRequest.objects.filter(status='pending').count()
    pending_hr = HRRequest.objects.filter(company=company, status='pending').count() if company else HRRequest.objects.filter(status='pending').count()

    return Response({
        'total_active': total_active,
        'on_leave': on_leave,
        'retired_this_year': retired_this_year,
        'new_this_month': new_this_month,
        'expired_documents': expired_docs,
        'expiring_contracts': expiring_contracts,
        'total_documents': doc_qs.count(),
        'pending_leave_requests': pending_leaves,
        'pending_hr_requests': pending_hr,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_recent_activities(request):
    """10 most recent audit log entries."""
    company = _get_company(request)
    qs = AuditLog.objects.select_related('user').order_by('-timestamp')
    if company:
        qs = qs.filter(company=company)
    qs = qs[:10]
    return Response([{
        'id': log.id,
        'user': log.user.username if log.user else 'System',
        'action': log.get_action_display(),
        'model_name': log.model_name,
        'description': log.description,
        'timestamp': log.timestamp.isoformat() if log.timestamp else None,
    } for log in qs])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_alerts(request):
    """Active alerts for the dashboard."""
    company = _get_company(request)
    today = date.today()
    threshold_30 = today + timedelta(days=30)
    threshold_60 = today + timedelta(days=60)

    doc_qs = Document.objects.filter(is_active=True)
    emp_qs = Employee.objects.filter(is_active=True)
    if company:
        doc_qs = doc_qs.filter(company=company)
        emp_qs = emp_qs.filter(company=company)

    expiring_docs_qs = doc_qs.filter(
        expiry_date__isnull=False,
        expiry_date__gte=today,
        expiry_date__lte=threshold_30
    ).select_related('employee')

    expiring_contracts_qs = emp_qs.filter(
        contract_end_date__isnull=False,
        contract_end_date__gte=today,
        contract_end_date__lte=threshold_60
    )

    expiring_docs = expiring_docs_qs[:10]
    expiring_contracts = expiring_contracts_qs[:10]

    return Response({
        'expiring_documents': [
            {
                'id': d.id, 'title': d.title,
                'employee_name': d.employee.full_name if d.employee else '',
                'expiry_date': d.expiry_date,
                'days_left': (d.expiry_date - today).days if d.expiry_date else 0,
            } for d in expiring_docs
        ],
        'expiring_contracts': [
            {
                'id': e.id, 'full_name': e.full_name, 'employee_id': e.employee_id,
                'contract_end_date': e.contract_end_date,
                'days_left': (e.contract_end_date - today).days if e.contract_end_date else 0,
            } for e in expiring_contracts
        ],
        'total_alerts': expiring_docs_qs.count() + expiring_contracts_qs.count(),
    })