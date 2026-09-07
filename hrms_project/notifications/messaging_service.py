"""Bale messaging service: dynamic variables, send-with-log, scheduling."""
from datetime import datetime

from notifications.channels import send_bale


# Available variables for templates. Each function receives the employee object.
def _render_variables(text, employee=None, company=None):
    """Replace {key} placeholders with employee/company values."""
    if not text:
        return text

    ctx = {}
    if employee is not None:
        ctx = {
            'name': employee.full_name,
            'first_name': employee.first_name,
            'last_name': employee.last_name,
            'employee_id': employee.employee_id or '',
            'national_id': employee.national_id or '',
            'mobile': employee.mobile or '',
            'department': employee.department.name if employee.department else '',
            'job_title': employee.job_title.name if employee.job_title else '',
        }

    for key, value in ctx.items():
        text = text.replace('{' + key + '}', str(value or ''))
    return text


def resolve_employee_by_chat_id(company, chat_id):
    """Find an active employee by their Bale chat_id."""
    if not chat_id:
        return None
    from employees.models import Employee
    return Employee.objects.filter(
        company=company,
        is_active=True,
        bale_chat_id=str(chat_id),
    ).select_related('department', 'job_title').first()


def send_to_all(company, token, chat_ids, text, subject='', template=None):
    """Send a message to each chat_id, rendering dynamic variables per recipient,
    and log every delivery to BaleSendLog. Returns a summary dict."""
    from notifications.models import BaleSendLog

    sent = 0
    failed = 0
    seen = set()

    for cid in chat_ids:
        cid = str(cid).strip() if cid else ''
        if not cid or cid in seen:
            continue
        seen.add(cid)

        employee = resolve_employee_by_chat_id(company, cid)
        rendered_text = _render_variables(text, employee=employee, company=company)
        message = f'{subject}\n\n{rendered_text}' if subject else rendered_text
        recipient_name = employee.full_name if employee else ''

        ok = send_bale(token, cid, message)
        if ok:
            sent += 1
            status = BaleSendLog.Status.SENT
            error = ''
        else:
            failed += 1
            status = BaleSendLog.Status.FAILED
            error = 'API error'

        BaleSendLog.objects.create(
            company=company,
            template=template,
            subject=subject,
            text=message,
            chat_id=cid,
            recipient_name=recipient_name,
            status=status,
            error=error,
        )

    return {
        'sent': sent,
        'failed': failed,
        'total': len(seen),
    }