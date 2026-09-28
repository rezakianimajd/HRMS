"""ثبت متمرکز ردیابی حسابرسی خزانه (Audit Trail).

هر تغییر حساس (پرداخت، چک، دریافت، تعهد، علی‌الحساب، ضمانت‌نامه،
ابطال/اصلاح) باید از طریق این helper ثبت شود تا
«چه کسی / چه زمانی / چه چیزی / از چه مقداری / به چه مقداری»
قابل ردیابی باشد. خزانه هرگز رکورد مالی را فیزیکی حذف نمی‌کند.
"""
from core.models.audit_log import AuditLog


def log(user, company, action, model_name, object_id=None, changes=None, description=''):
    """ثبت آیتم در AuditLog بدون شکستن جریان اصلی."""
    try:
        AuditLog.objects.create(
            user=user if getattr(user, 'is_authenticated', False) else None,
            company=company,
            action=action,
            model_name=model_name,
            object_id=str(object_id) if object_id is not None else None,
            changes=changes or {},
            description=description or '',
        )
    except Exception:
        pass


def log_transition(user, company, model_name, object_id, from_status, to_status, extra=None):
    """ثبت تغییر وضعیت «از → به» (State Machine)."""
    approve_set = {'approved', 'paid', 'posted', 'cleared', 'released'}
    reject_set = {'rejected', 'returned', 'cancelled', 'bounced'}
    if to_status in approve_set:
        action = 'APPROVE'
    elif to_status in reject_set:
        action = 'REJECT'
    else:
        action = 'UPDATE'
    changes = {'from': from_status, 'to': to_status}
    if extra:
        changes.update(extra)
    log(user, company, action, model_name, object_id, changes,
        f'{model_name} {object_id}: {from_status} → {to_status}')