"""Employee 360° timeline — aggregated chronological events for one employee.

Unifies the scattered events (hire, employment changes, leaves, documents,
work experience, contract versions, penalties, correspondence) into a single
chronological stream for the employee profile page.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_timeline(request, employee_id):
    """Return a chronological list of events for a single employee."""
    from employees.models import (
        Employee, EmploymentChange, WorkExperience, ContractVersion, EmployeePenalty,
    )
    from documents.models import Document
    from leaves.models import LeaveRequest
    from correspondences.models import IncomingLetter, OutgoingLetter, Announcement

    company = _company(request)

    # Note: do NOT filter by is_active here — the timeline must also render
    # for employees who have since left (retired/terminated).
    base = Employee.objects.all()
    if company:
        base = base.filter(company=company)
    employee = base.filter(id=employee_id).select_related(
        'department', 'job_title', 'work_location'
    ).first()
    if not employee:
        return Response({'error': 'کارمند یافت نشد.'}, status=404)

    events = []

    # -- Hire (the starting point of every timeline) --
    if employee.hire_date:
        events.append({
            'type': 'hire',
            'date': employee.hire_date.isoformat(),
            'title': 'شروع همکاری',
            'description': (
                f'استخدام {employee.full_name} در '
                f'{employee.department.name if employee.department else "—"}'
            ),
        })

    # -- Employment changes --
    changes = EmploymentChange.objects.filter(employee=employee)
    if company:
        changes = changes.filter(company=company)
    for c in changes.select_related('employee'):
        events.append({
            'type': 'employment_change',
            'date': c.effective_date.isoformat(),
            'title': c.get_change_type_display(),
            'description': (
                f'{c.old_value} ← {c.new_value}' if (c.old_value or c.new_value)
                else (c.description or '')
            ),
        })

    # -- Work experience (prior jobs) --
    for w in employee.work_experiences.all():
        events.append({
            'type': 'work_experience',
            'date': w.start_date.isoformat(),
            'title': f'سابقه قبلی: {w.company_name}',
            'description': w.job_title or w.description or '',
        })

    # -- Contract versions --
    contracts = ContractVersion.objects.filter(employee=employee)
    if company:
        contracts = contracts.filter(company=company)
    for cv in contracts.select_related('contract_type'):
        events.append({
            'type': 'contract',
            'date': cv.start_date.isoformat(),
            'title': f'نسخه {cv.version} قرارداد ({cv.year})',
            'description': (
                f'{cv.contract_type.name if cv.contract_type else "قرارداد"} — '
                f'حقوق پایه {cv.base_salary or 0}'
            ),
        })

    # -- Leave requests --
    leaves = LeaveRequest.objects.filter(employee=employee)
    if company:
        leaves = leaves.filter(company=company)
    for lr in leaves:
        status_note = f' ({lr.get_status_display()})' if lr.status != LeaveRequest.Status.APPROVED else ''
        events.append({
            'type': 'leave',
            'date': lr.start_date.isoformat(),
            'title': f'{lr.get_leave_type_display()}{status_note}',
            'description': f'{lr.days} روز ({lr.start_date} تا {lr.end_date})',
        })

    # -- Documents --
    docs = Document.objects.filter(employee=employee, is_active=True)
    if company:
        docs = docs.filter(company=company)
    for d in docs.select_related('document_type'):
        date_str = (d.issue_date or d.created_at or None)
        if not date_str:
            continue
        events.append({
            'type': 'document',
            'date': date_str.isoformat() if hasattr(date_str, 'isoformat') else str(date_str),
            'title': f'مدرک: {d.title}',
            'description': d.document_type.name if d.document_type else '',
        })

    # -- Penalties (addition may need chronological placement) --
    for p in employee.penalties.all():
        events.append({
            'type': 'penalty',
            'date': p.date.isoformat(),
            'title': f'جریمه انضباطی ({p.amount} ریال)',
            'description': p.reason or '',
        })

    # -- Correspondence (incoming letters) --
    inc = IncomingLetter.objects.filter(employees=employee)
    if company:
        inc = inc.filter(company=company)
    for letter in inc:
        events.append({
            'type': 'incoming_letter',
            'date': letter.date.isoformat(),
            'title': f'نامه وارده: {letter.subject}',
            'description': letter.number,
        })

    out = OutgoingLetter.objects.filter(employees=employee)
    if company:
        out = out.filter(company=company)
    for letter in out:
        events.append({
            'type': 'outgoing_letter',
            'date': letter.date.isoformat(),
            'title': f'نامه صادره: {letter.subject}',
            'description': letter.number,
        })

    ann = Announcement.objects.filter(employees=employee)
    if company:
        ann = ann.filter(company=company)
    for a in ann:
        events.append({
            'type': 'announcement',
            'date': a.date.isoformat(),
            'title': f'ابلاغ: {a.title}',
            'description': a.number,
        })

    # Sort strictly by date (newest first).
    events.sort(key=lambda e: (e['date'], e['type']), reverse=True)

    return Response({
        'employee_id': employee.id,
        'full_name': employee.full_name,
        'total': len(events),
        'events': events,
    })