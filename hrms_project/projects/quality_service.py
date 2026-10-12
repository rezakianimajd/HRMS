"""سرویس کیفیت و HSE (فاز ۳ بخش دوم) — گردش کار NCR، کسرکار، بازرسی و رویداد HSE."""
from django.utils import timezone

from projects import audit, quality_engine
from projects.quality_engine import (  # noqa: F401 — بازصدور برای ویوها/تست‌ها
    can_transition_hse, can_transition_ncr, can_transition_plan_item, can_transition_punch,
    hse_next_statuses, ncr_next_statuses, plan_item_next_statuses, punch_next_statuses,
)
from projects.quality_models import HSEIncident, Inspection, NCR, PunchItem, QualityPlanItem


def _user_or_none(user):
    return user if getattr(user, 'is_authenticated', False) else None


def user_display(user):
    """نام نمایشی کاربر برای ثبت در تاریخچه."""
    if not getattr(user, 'is_authenticated', False):
        return ''
    full = f'{getattr(user, "first_name", "")} {getattr(user, "last_name", "")}'.strip()
    return full or getattr(user, 'username', '') or ''


# ---------------------------------- NCR ----------------------------------

def set_ncr_status(ncr, user, target_status, note='', date_value=None):
    """تغییر وضعیت NCR با اعتبارسنجی گذار و ثبت در AuditLog."""
    if not quality_engine.can_transition_ncr(ncr.status, target_status):
        raise ValueError('تغییر وضعیت این NCR از وضعیت فعلی مجاز نیست.')
    previous = ncr.status
    ncr.status = target_status
    if target_status == NCR.Status.CLOSED:
        ncr.closed_date = date_value or timezone.localdate()
        ncr.closed_by = _user_or_none(user)
    elif previous == NCR.Status.CLOSED:
        ncr.closed_date = None
        ncr.closed_by = None
    if note:
        ncr.note = (ncr.note + '\n' if ncr.note else '') + note
    ncr.save()
    audit.log_object(
        _user_or_none(user), ncr, 'UPDATE',
        description=f'وضعیت NCR {ncr.number}: {previous} → {target_status}',
    )
    return ncr


def close_ncr(ncr, user, note='', date_value=None):
    """بستن NCR (تأیید اقدام اصلاحی)."""
    return set_ncr_status(ncr, user, NCR.Status.CLOSED, note=note, date_value=date_value)


def create_ncr_from_inspection(inspection, user, **kwargs):
    """ساخت NCR از یک بازرسی رد‌شده (شمارهٔ پیش‌فرض: NCR-<شمارهٔ بازرسی>)."""
    number = kwargs.get('number') or f'NCR-{inspection.number}'
    if NCR.objects.filter(project=inspection.project, number=number).exists():
        raise ValueError(f'NCR با شمارهٔ {number} قبلاً ثبت شده است.')
    ncr = NCR.objects.create(
        company=inspection.company,
        project=inspection.project,
        inspection=inspection,
        wbs=kwargs.get('wbs') or inspection.wbs,
        number=number,
        title=kwargs.get('title') or f'عدم انطباق در بازرسی {inspection.number}',
        description=kwargs.get('description') or (inspection.remarks or ''),
        source=NCR.Source.INSPECTION,
        severity=kwargs.get('severity') or NCR.Severity.MINOR,
        discipline=kwargs.get('discipline') or '',
        status=NCR.Status.OPEN,
        detected_date=kwargs.get('detected_date') or inspection.date or timezone.localdate(),
        due_date=kwargs.get('due_date'),
        responsible=kwargs.get('responsible'),
        responsible_name=kwargs.get('responsible_name') or '',
        cost_impact=kwargs.get('cost_impact') or 0,
    )
    plan_item = inspection.plan_item
    if plan_item and plan_item.status != QualityPlanItem.Status.FAILED:
        plan_item.status = QualityPlanItem.Status.FAILED
        plan_item.save(update_fields=['status', 'updated_at'])
    audit.log_object(
        _user_or_none(user), ncr, 'CREATE',
        description=f'ثبت NCR از بازرسی {inspection.number}',
    )
    return ncr


def complete_inspection(inspection, user, result, date_value=None, remarks='',
                        next_inspection_date=None, create_ncr=False, ncr_defaults=None):
    """بستن یک بازرسی با ثبت نتیجه؛ در صورت رد، امکان ساخت خودکار NCR."""
    if not result:
        raise ValueError('ثبت نتیجهٔ بازرسی الزامی است.')
    inspection.result = result
    inspection.status = Inspection.Status.DONE
    inspection.date = date_value or inspection.date or timezone.localdate()
    if remarks:
        inspection.remarks = (inspection.remarks + '\n' if inspection.remarks else '') + remarks
    if next_inspection_date is not None:
        inspection.next_inspection_date = next_inspection_date
    inspection.save()
    audit.log_object(
        _user_or_none(user), inspection, 'UPDATE',
        description=f'نتیجهٔ بازرسی {inspection.number}: {result}',
    )

    plan_item = inspection.plan_item
    if plan_item:
        plan_item.status = (
            QualityPlanItem.Status.PASSED if result == Inspection.Result.PASS
            else QualityPlanItem.Status.FAILED
        )
        plan_item.save(update_fields=['status', 'updated_at'])

    ncr = None
    if create_ncr or result == Inspection.Result.FAIL:
        ncr = create_ncr_from_inspection(inspection, user, **(ncr_defaults or {}))
    return inspection, ncr


# ------------------------------- لیست کسرکار -------------------------------

def set_punch_status(item, user, target_status, date_value=None, verified_by_name='', note=''):
    """تغییر وضعیت مورد کسرکار (ثبت تاریخ رفع/تأیید در گذارهای مربوط)."""
    if not quality_engine.can_transition_punch(item.status, target_status):
        raise ValueError('تغییر وضعیت این مورد کسرکار مجاز نیست.')
    previous = item.status
    item.status = target_status
    when = date_value or timezone.localdate()
    if target_status == PunchItem.Status.FIXED:
        item.fixed_date = when
    elif target_status == PunchItem.Status.VERIFIED:
        item.verified_date = when
        if verified_by_name:
            item.verified_by_name = verified_by_name
    elif target_status in ('open', 'in_progress', 'rejected'):
        item.fixed_date = None
        item.verified_date = None
    if note:
        item.note = (item.note + '\n' if item.note else '') + note
    item.save()
    audit.log_object(
        _user_or_none(user), item, 'UPDATE',
        description=f'وضعیت کسرکار {item.number}: {previous} → {target_status}',
    )
    return item


def verify_punch_item(item, user, verified_by_name='', date_value=None, note=''):
    """تأیید رفع مورد کسرکار."""
    return set_punch_status(
        item, user, PunchItem.Status.VERIFIED, date_value=date_value,
        verified_by_name=verified_by_name, note=note,
    )


# --------------------------------- HSE ---------------------------------

def set_hse_status(incident, user, target_status, date_value=None, note=''):
    """تغییر وضعیت رویداد HSE."""
    if not quality_engine.can_transition_hse(incident.status, target_status):
        raise ValueError('تغییر وضعیت این رویداد HSE مجاز نیست.')
    previous = incident.status
    incident.status = target_status
    if target_status == HSEIncident.Status.CLOSED:
        incident.closed_date = date_value or timezone.localdate()
    else:
        incident.closed_date = None
    if note:
        incident.note = (incident.note + '\n' if incident.note else '') + note
    incident.save()
    audit.log_object(
        _user_or_none(user), incident, 'UPDATE',
        description=f'وضعیت رویداد HSE {incident.number}: {previous} → {target_status}',
    )
    return incident


def close_hse_incident(incident, user, date_value=None, note=''):
    """بستن رویداد HSE پس از تکمیل بررسی."""
    return set_hse_status(
        incident, user, HSEIncident.Status.CLOSED, date_value=date_value, note=note,
    )


# ------------------------------ طرح بازرسی (ITP) ------------------------------

def set_plan_item_status(item, user, target_status):
    """تغییر وضعیت ردیف طرح بازرسی (شروع/قبول/رد/معاف)."""
    if not quality_engine.can_transition_plan_item(item.status, target_status):
        raise ValueError('تغییر وضعیت این ردیف طرح بازرسی مجاز نیست.')
    previous = item.status
    item.status = target_status
    item.save(update_fields=['status', 'updated_at'])
    audit.log_object(
        _user_or_none(user), item, 'UPDATE',
        description=f'وضعیت ردیف ITP {item.item_no}: {previous} → {target_status}',
    )
    return item


# ---------------------------------- KPI ----------------------------------

def project_quality_kpis(project, today=None):
    """شاخص‌های یکجای کیفیت/HSE پروژه (کیفیت، NCR، کسرکار، HSE)."""
    day = today or timezone.localdate()
    plans = list(
        QualityPlanItem.objects.filter(plan__project=project)
        .values('id', 'status', 'point_type')
    )
    inspections = list(
        Inspection.objects.filter(project=project).values('id', 'status', 'result')
    )
    ncrs = list(
        NCR.objects.filter(project=project).values(
            'id', 'status', 'severity', 'due_date', 'detected_date', 'closed_date', 'cost_impact',
        )
    )
    punch_items = list(
        PunchItem.objects.filter(project=project).values(
            'id', 'status', 'priority', 'due_date', 'cost',
        )
    )
    incidents = list(
        HSEIncident.objects.filter(project=project).values(
            'id', 'status', 'incident_type', 'date', 'lost_days', 'man_hours', 'cost_impact',
        )
    )
    return quality_engine.quality_kpis(
        plans=plans, inspections=inspections, ncrs=ncrs,
        punch_items=punch_items, incidents=incidents, today=day,
    )
