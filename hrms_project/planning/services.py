"""سرویس‌های ماژول برنامه‌ریزی شخصی (رمزنگاری، دسترسی، اشتراک‌گذاری)."""
from __future__ import annotations

from django.db.models import Q
from django.utils import timezone

from core.engines.encryption_engine import EncryptionEngine
from planning.models import Note, PlanningShare, Task

ITEM_MODELS = {
    PlanningShare.ItemKind.NOTE: Note,
    PlanningShare.ItemKind.TASK: Task,
}


def encrypt_text(value: str) -> str:
    return EncryptionEngine.encrypt(value or '')


def decrypt_text(value: str) -> str:
    return EncryptionEngine.decrypt(value or '')


def shares_for(user, kind=None):
    qs = PlanningShare.objects.filter(shared_with=user)
    if kind:
        qs = qs.filter(item_kind=kind)
    return qs


def shared_ids(user, kind):
    return list(shares_for(user, kind).values_list('item_id', flat=True))


def permission_for(user, kind, item_id):
    """``owner`` / ``edit`` / ``view`` / ``None``."""
    model = ITEM_MODELS.get(kind)
    if model is None:
        return None
    item = model.objects.filter(pk=item_id).first()
    if not item:
        return None
    if getattr(user, 'is_superuser', False):
        return 'owner'
    if item.owner_id == getattr(user, 'pk', None):
        return 'owner'
    share = PlanningShare.objects.filter(
        item_kind=kind, item_id=item.pk, shared_with=user,
    ).first()
    return share.permission if share else None


def can_view(user, kind, item_id):
    return permission_for(user, kind, item_id) is not None


def can_edit(user, kind, item_id):
    return permission_for(user, kind, item_id) in ('owner', 'edit')


def visible_notes(user):
    return Note.objects.filter(
        Q(owner=user) | Q(pk__in=shared_ids(user, PlanningShare.ItemKind.NOTE)),
    )


def visible_tasks(user):
    return Task.objects.filter(
        Q(owner=user) | Q(pk__in=shared_ids(user, PlanningShare.ItemKind.TASK)),
    )


def notes_for_scope(user, scope='mine'):
    """دامنهٔ فهرست یادداشت‌ها: ``mine`` (پیش‌فرض) / ``shared`` / ``all``."""
    if scope == 'all':
        return visible_notes(user)
    if scope == 'shared':
        return Note.objects.filter(
            pk__in=shared_ids(user, PlanningShare.ItemKind.NOTE),
        ).exclude(owner=user)
    return Note.objects.filter(owner=user)


def tasks_for_scope(user, scope='mine'):
    """دامنهٔ فهرست وظایف: ``mine`` (پیش‌فرض) / ``shared`` / ``all``."""
    if scope == 'all':
        return visible_tasks(user)
    if scope == 'shared':
        return Task.objects.filter(
            pk__in=shared_ids(user, PlanningShare.ItemKind.TASK),
        ).exclude(owner=user)
    return Task.objects.filter(owner=user)


def share_item(company, item, kind, shared_by, user_ids=(), permission='view'):
    """اشتراک‌گذاری با چند کاربر + علامت‌زدن آیتم به‌عنوان اشتراکی."""
    from django.contrib.auth import get_user_model

    ids = [int(value) for value in user_ids or [] if str(value).isdigit()]
    targets = get_user_model().objects.filter(pk__in=ids, is_active=True)
    created = []
    for user in targets:
        if user.pk == getattr(shared_by, 'pk', None):
            continue
        share, _created = PlanningShare.objects.update_or_create(
            company=company, item_kind=kind, item_id=item.pk, shared_with=user,
            defaults={'shared_by': shared_by, 'permission': permission,
                      'is_active': True},
        )
        created.append(share)
    if created:
        item.is_shared = True
        item.save(update_fields=['is_shared', 'updated_at'])
        _notify_share(company, item, kind, shared_by, [share.shared_with for share in created])
    return created


def unshare_item(company, item, kind, user_id):
    removed, _ = PlanningShare.objects.filter(
        company=company, item_kind=kind, item_id=item.pk, shared_with_id=user_id,
    ).delete()
    if not PlanningShare.objects.filter(item_kind=kind, item_id=item.pk).exists():
        item.is_shared = False
        item.save(update_fields=['is_shared', 'updated_at'])
    return removed


def _notify_share(company, item, kind, shared_by, users):
    from notifications.models import Notification

    label = 'یادداشت' if kind == PlanningShare.ItemKind.NOTE else 'وظیفه'
    sender = ''
    try:
        sender = (shared_by.get_full_name() or '').strip() or shared_by.get_username()
    except Exception:  # noqa: BLE001
        sender = ''
    for user in users:
        try:
            Notification.objects.create(
                company=company, user_id=user.pk, category='planning_share',
                priority='normal', title=f'{label} با شما به اشتراک گذاشته شد',
                body=f'{sender}: {getattr(item, "title", "")}'[:500],
                entity_type='planning_note' if kind == PlanningShare.ItemKind.NOTE
                else 'planning_task',
                entity_id=item.pk, dedup_key=f'planning-share:{kind}:{item.pk}:{user.pk}',
            )
        except Exception:  # noqa: BLE001
            pass


def upcoming_summary(user):
    """نشان سایدبار: وظایف **خودِ کاربر** که سررسیدشان رسیده/گذشته است."""
    if not getattr(user, 'is_authenticated', False):
        return {'planning': 0, 'planning_overdue': 0}
    today = timezone.localdate()
    tasks = Task.objects.filter(owner=user).exclude(
        status__in=(Task.Status.DONE, Task.Status.CANCELLED),
    )
    due = tasks.filter(due_date__lte=today).count()
    overdue = tasks.filter(due_date__lt=today).count()
    return {'planning': due, 'planning_overdue': overdue}
