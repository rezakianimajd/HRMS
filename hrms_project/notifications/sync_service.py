"""Notification sync service — derive notifications from live HR data.

Derives Notification rows for one tenant (or all tenants) for:
  1. pending leave requests   (leave_request)
  2. pending HR requests      (hr_request)
  3. soon-expiring contracts  (contract_expiry)
  4. soon-expiring documents  (document_expiry)
  5. nearly-exhausted annual leave (leave_balance)

Every item has a stable ``dedup_key`` so repeated runs (on-demand + Celery beat)
are idempotent. Notifications with ``user_id=None`` are company-wide and are
shown to HR managers / superusers.
"""
from datetime import date, timedelta

from django.contrib.auth.models import User


def _company_context(company):
    """Return the current company context, used to decide whether a tenant
    switch is needed before querying tenant models."""
    return company


def _upsert(company, dedup_key, defaults):
    """Create or update a single notification keyed by (company, dedup_key)."""
    from notifications.models import Notification

    obj, created = Notification.objects.get_or_create(
        company=company,
        dedup_key=dedup_key,
        defaults=defaults,
    )
    if not created:
        # Refresh mutable fields but keep read-state.
        changed = False
        for field, value in defaults.items():
            if getattr(obj, field) != value:
                setattr(obj, field, value)
                changed = True
        if changed:
            obj.save(update_fields=list(defaults.keys()) + ['updated_at'])
    return created


def _admin_user_ids(company):
    """User ids that should see company-wide notifications (superusers / HR)."""
    from core.models.user import UserProfile

    admin_roles = ['super_admin', 'hr_manager', 'hr_specialist']
    profile_ids = UserProfile.objects.filter(
        companies=company,
        role__in=admin_roles,
    ).values_list('user_id', flat=True)
    return list(User.objects.filter(is_active=True).filter(
        # superusers OR users with an HR-typed profile in this company
        is_superuser=True,
    ).values_list('id', flat=True)) + list(profile_ids)


def sync_for_company(company):
    """
    Run a full sync for one tenant. Assumes the caller has already activated
    this tenant's schema (e.g. inside a request or after ``set_tenant``).
    Returns {'created': N, 'updated': M}.
    """
    from employees.models import Employee, HRRequest
    from leaves.models import LeaveRequest
    from documents.models import Document
    from settings_app.engines.settings_engine import SettingsEngine
    from notifications.models import Notification

    today = date.today()
    contract_days = int(SettingsEngine.get_effective_setting(
        'CONTRACT_ALERT_DAYS', default=60, company=company,
    ) or 60)
    doc_days = int(SettingsEngine.get_effective_setting(
        'DOCUMENT_ALERT_DAYS', default=30, company=company,
    ) or 30)
    annual_days = int(SettingsEngine.get_effective_setting(
        'LEAVE_DEFAULT_TOTAL_DAYS', default=30, company=company,
    ) or 30)
    leave_alert_ratio = float(SettingsEngine.get_effective_setting(
        'LEAVE_BALANCE_ALERT_RATIO', default=0.2, company=company,
    ) or 0.2)
    leave_low_watermark = max(1.0, round(annual_days * leave_alert_ratio, 1))

    created = 0
    admin_ids = _admin_user_ids(company)

    def _emit(dedup_key, payload):
        nonlocal created
        if admin_ids:
            for uid in admin_ids:
                created += _upsert(
                    company, f'{dedup_key}-user-{uid}',
                    {**payload, 'user_id': uid},
                )
        else:
            created += _upsert(company, f'{dedup_key}-all', {
                **payload, 'user_id': None,
            })

    # 1) Pending leave requests
    leaves = LeaveRequest.objects.filter(
        company=company, status=LeaveRequest.Status.PENDING, is_active=True,
    ).select_related('employee')
    for lr in leaves:
        _emit(f'leave-{lr.id}', {
            'category': Notification.Category.LEAVE_REQUEST,
            'priority': Notification.Priority.HIGH,
            'title': f'درخواست مرخصی {lr.employee.full_name}',
            'body': (
                f'{lr.get_leave_type_display()} به مدت {lr.days} روز '
                f'({lr.start_date} تا {lr.end_date})'
            ),
            'entity_type': 'leave_request',
            'entity_id': lr.id,
        })

    # 2) Pending HR requests
    hr_requests = HRRequest.objects.filter(
        company=company, status=HRRequest.Status.PENDING, is_active=True,
    ).select_related('employee')
    for hr in hr_requests:
        _emit(f'hr-{hr.id}', {
            'category': Notification.Category.HR_REQUEST,
            'priority': Notification.Priority.HIGH,
            'title': f'درخواست اداری {hr.employee.full_name}',
            'body': f'{hr.get_request_type_display()}: {hr.target_value or hr.description}',
            'entity_type': 'hr_request',
            'entity_id': hr.id,
        })

    # 3) Soon-expiring contracts
    contracts = Employee.objects.filter(
        company=company, is_active=True, status='active',
        contract_end_date__isnull=False,
        contract_end_date__gte=today,
        contract_end_date__lte=today + timedelta(days=contract_days),
    )
    for emp in contracts:
        days_left = (emp.contract_end_date - today).days
        _emit(f'contract-{emp.id}', {
            'category': Notification.Category.CONTRACT_EXPIRY,
            'priority': (
                Notification.Priority.URGENT if days_left <= 15
                else Notification.Priority.HIGH
            ),
            'title': f'پایان قرارداد {emp.full_name}',
            'body': f'قرارداد {emp.full_name} تا {days_left} روز دیگر ({emp.contract_end_date}) به پایان می‌رسد.',
            'entity_type': 'employee',
            'entity_id': emp.id,
        })

    # 4) Soon-expiring documents
    docs = Document.objects.filter(
        company=company, is_active=True,
        expiry_date__isnull=False,
        expiry_date__gte=today,
        expiry_date__lte=today + timedelta(days=doc_days),
    ).select_related('employee')
    for doc in docs:
        days_left = (doc.expiry_date - today).days
        emp_name = doc.employee.full_name if doc.employee else ''
        _emit(f'doc-{doc.id}', {
            'category': Notification.Category.DOCUMENT_EXPIRY,
            'priority': Notification.Priority.NORMAL,
            'title': f'انقضای مدرک {doc.title}',
            'body': (
                f'مدرک «{doc.title}» '
                + (f'برای {emp_name} ' if emp_name else '')
                + f'تا {days_left} روز دیگر منقضی می‌شود.'
            ),
            'entity_type': 'document',
            'entity_id': doc.id,
        })

    # 5) Nearly-exhausted annual leave for active employees
    employees = Employee.objects.filter(company=company, is_active=True, status='active')
    for emp in employees:
        used = _annual_used_days(company, emp)
        remaining = max(0.0, annual_days - used)
        if remaining <= leave_low_watermark:
            _emit(f'balance-{emp.id}', {
                'category': Notification.Category.LEAVE_BALANCE,
                'priority': Notification.Priority.NORMAL,
                'title': f'پایان مانده مرخصی {emp.full_name}',
                'body': f'مانده مرخصی استحقاقی {emp.full_name} {round(remaining, 1)} روز است.',
                'entity_type': 'employee',
                'entity_id': emp.id,
            })

    return {'created': created, 'updated': 0}


def _annual_used_days(company, employee):
    """Sum approved annual/sick/unpaid leave days in the current Jalali year."""
    import jdatetime as jd
    from leaves.models import LeaveRequest

    today = jd.date.today()
    year_start = jd.date(today.year, 1, 1)
    if today.month == 12:
        year_end = jd.date(today.year + 1, 1, 1) - timedelta(days=1)
    else:
        year_end = jd.date(today.year, today.month + 1, 1) - timedelta(days=1)

    qs = LeaveRequest.objects.filter(
        company=company,
        employee=employee,
        status=LeaveRequest.Status.APPROVED,
        leave_type__in=[
            LeaveRequest.LeaveType.ANNUAL,
            LeaveRequest.LeaveType.SICK,
            LeaveRequest.LeaveType.UNPAID,
        ],
        start_date__lte=year_end.togregorian(),
        end_date__gte=year_start.togregorian(),
    )
    return sum(float(r.days or 0) for r in qs)


def sync_all_companies():
    """Iterate every active tenant and sync its notifications."""
    import logging
    from django.db import connection
    from core.models import Company

    logger = logging.getLogger('hrms.notifications')
    total_created = 0
    errors = []
    for company in Company.objects.filter(is_active=True):
        try:
            connection.set_tenant(company)
            res = sync_for_company(company)
            total_created += res['created']
        except Exception as exc:
            msg = f"tenant={company.schema_name}: {exc}"
            errors.append(msg)
            logger.error(msg)
    connection.set_schema_to_public()
    return {'created': total_created, 'errors': errors}
