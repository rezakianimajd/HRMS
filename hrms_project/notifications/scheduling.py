"""Scheduling helpers: run due schedules, send automatic birthday messages."""
from datetime import datetime

from django.utils import timezone

from notifications.channels import _company_settings


def _all_active_chat_ids(company):
    """Collect all registered chat_ids (employees + custom contacts + default)."""
    from employees.models import Employee
    from settings_app.models import BaleContact

    ids = []
    seen = set()

    _, _, _, default_id = _company_settings(company)
    if default_id:
        default_id = str(default_id).strip()
        if default_id not in seen:
            seen.add(default_id)
            ids.append(default_id)

    for cid in Employee.objects.filter(is_active=True).exclude(bale_chat_id__isnull=True).exclude(bale_chat_id='').values_list('bale_chat_id', flat=True):
        cid = str(cid).strip()
        if cid and cid not in seen:
            seen.add(cid)
            ids.append(cid)

    for cid in BaleContact.objects.filter(is_active=True).exclude(chat_id='').values_list('chat_id', flat=True):
        cid = str(cid).strip()
        if cid and cid not in seen:
            seen.add(cid)
            ids.append(cid)

    return ids


def run_schedule(schedule):
    """Execute one BaleSchedule (used by worker/beat and run_now action)."""
    from notifications.messaging_service import send_to_all
    from notifications.models import BaleSchedule

    company = schedule.company
    _, bale_enabled, token, _ = _company_settings(company)
    if not bale_enabled or not token:
        return {'error': 'ارسال بله فعال نیست یا توکن تنظیم نشده است.'}

    chat_ids = [x.strip() for x in (schedule.chat_ids or '').split(',') if x.strip()]
    if not chat_ids:
        chat_ids = _all_active_chat_ids(company)

    subject = schedule.template.title if schedule.template else schedule.title
    result = send_to_all(
        company=company,
        token=token,
        chat_ids=chat_ids,
        text=schedule.text,
        subject=subject,
        template=schedule.template,
    )

    schedule.last_run_at = timezone.now()
    if schedule.frequency == BaleSchedule.Frequency.ONCE:
        schedule.status = BaleSchedule.Status.DONE
    schedule.save(update_fields=['last_run_at', 'status', 'updated_at'])
    return result


def run_due_schedules(company=None):
    """Execute all due schedules (adapted to run as a synchronous worker/beat task)."""
    from notifications.models import BaleSchedule

    qs = BaleSchedule.objects.filter(status=BaleSchedule.Status.PENDING, scheduled_at__lte=timezone.now())
    if company:
        qs = qs.filter(company=company)

    executed = 0
    for sch in qs:
        try:
            run_schedule(sch)
            executed += 1
        except Exception:
            continue
    return executed


def run_birthday_messages(company):
    """Send a birthday greeting to employees born today (Jalali month/day match)."""
    import jdatetime as jd
    from employees.models import Employee
    from notifications.models import BaleTemplate
    from notifications.messaging_service import send_to_all
    from notifications.channels import _company_settings

    _, bale_enabled, token, _ = _company_settings(company)
    if not bale_enabled or not token:
        return

    template = BaleTemplate.objects.filter(
        company=company, event_type=BaleTemplate.EventType.BIRTHDAY, is_active=True,
    ).first()
    if not template:
        return

    today_j = jd.date.today()
    employees = Employee.objects.filter(
        company=company, is_active=True, status='active',
        birth_date__isnull=False,
    ).exclude(bale_chat_id__isnull=True).exclude(bale_chat_id='')

    for emp in employees:
        if not emp.birth_date:
            continue
        j_birth = jd.date.fromgregorian(date=emp.birth_date)
        if j_birth.month == today_j.month and j_birth.day == today_j.day:
            send_to_all(
                company=company,
                token=token,
                chat_ids=[emp.bale_chat_id],
                text=template.text,
                subject=template.title,
                template=template,
            )