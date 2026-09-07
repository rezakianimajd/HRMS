"""Bulk Bale sending to employees, custom contacts, and raw chat_ids."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notifications.channels import _company_settings, send_bale


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bale_recipients(request):
    """Return employees (with chat_id) grouped by department + custom contacts."""
    from employees.models import Employee
    from settings_app.models import BaleContact

    company = _company(request)

    employees = Employee.objects.filter(is_active=True, status='active', bale_chat_id__isnull=False)
    if company:
        employees = employees.filter(company=company)
    employees = employees.exclude(bale_chat_id='').select_related('department')

    emp_list = []
    for e in employees:
        emp_list.append({
            'id': e.id,
            'name': e.full_name,
            'chat_id': e.bale_chat_id,
            'department': e.department.name if e.department else '(بدون دپارتمان)',
            'kind': 'employee',
        })

    contacts = BaleContact.objects.filter(is_active=True)
    if company:
        contacts = contacts.filter(company=company)
    contact_list = [{
        'id': c.id,
        'name': c.name,
        'chat_id': c.chat_id,
        'category': c.category or '',
        'kind': 'contact',
    } for c in contacts]

    return Response({
        'employees': emp_list,
        'contacts': contact_list,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bale_bulk_send(request):
    """Send one message to a set of chat_ids.

    Body: {
      'subject': '...',
      'text': '...',
      'chat_ids': ['123', '456', ...]   # resolved recipients (Bale chat_id)
    }
    """
    company = _company(request)
    if not company:
        return Response({'error': 'شرکت فعالی انتخاب نشده است.'}, status=400)

    if not (request.user.is_superuser or getattr(getattr(request.user, 'profile', None), 'is_hr_manager', False)):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    text = (request.data.get('text') or '').strip()
    subject = (request.data.get('subject') or '').strip()
    chat_ids = request.data.get('chat_ids') or []

    if not text:
        return Response({'error': 'متن پیام الزامی است.'}, status=400)
    if not chat_ids:
        return Response({'error': 'هیچ گیرنده‌ای انتخاب نشده است.'}, status=400)

    _, bale_enabled, token, _ = _company_settings(company)
    if not bale_enabled or not token:
        return Response({'error': 'ارسال بله فعال نیست یا توکن تنظیم نشده است.'}, status=400)

    message = f'{subject}\n\n{text}' if subject else text

    sent = 0
    failed = []
    seen = set()
    for cid in chat_ids:
        cid = str(cid).strip()
        if not cid or cid in seen:
            continue
        seen.add(cid)
        if send_bale(token, cid, message):
            sent += 1
        else:
            failed.append(cid)

    return Response({
        'sent': sent,
        'failed': failed,
        'total': len(seen),
    })