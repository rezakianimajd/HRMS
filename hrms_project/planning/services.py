"""سرویس‌های ماژول برنامه‌ریزی شخصی (رمزنگاری، دسترسی، اشتراک‌گذاری)."""
from __future__ import annotations

from django.db.models import Q
from django.utils import timezone

from core.engines.encryption_engine import EncryptionEngine
from planning.models import (
    Note, PlanningGroup, PlanningGroupMember, PlanningShare, Task,
)

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


def shared_ids(user, kind, roles=None):
    qs = shares_for(user, kind)
    if roles:
        qs = qs.filter(role__in=roles)
    return list(qs.values_list('item_id', flat=True))


def assigned_ids(user, kind=PlanningShare.ItemKind.TASK):
    """شناسهٔ آیتم‌هایی که کاربر «مسئول انجام» آن‌هاست."""
    return shared_ids(user, kind, roles=[PlanningShare.Role.ASSIGNEE])


def group_member_ids(company, group_ids):
    """شناسهٔ کاربران اعضای گروه‌های انتخاب‌شده (فقط گروه‌های همان شرکت)."""
    if not group_ids:
        return []
    return list(
        PlanningGroupMember.objects.filter(
            group_id__in=group_ids, group__company=company,
        ).values_list('user_id', flat=True)
    )


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
    """دامنهٔ فهرست وظایف.

    - ``mine`` (پیش‌فرض): وظایفی که مالک آن‌ها هستم **یا** به من محول شده‌اند.
    - ``shared``: فقط آیتم‌های اشتراکی (مشاهده/ویرایش) که مالک یا مسئول آن‌ها نیستم.
    - ``all``: همهٔ مواردی که به نحوی به من مربوط است.
    """
    owner_ids = Task.objects.filter(owner=user).values_list('id', flat=True)
    assigned = assigned_ids(user)
    shared_only = [
        item_id for item_id in shared_ids(user, PlanningShare.ItemKind.TASK,
                                           roles=[PlanningShare.Role.EDITOR,
                                                  PlanningShare.Role.VIEWER])
    ]
    if scope == 'all':
        return Task.objects.filter(pk__in=set(list(owner_ids) + assigned + shared_only))
    if scope == 'shared':
        return Task.objects.filter(pk__in=set(shared_only) - set(assigned))
    return Task.objects.filter(Q(owner=user) | Q(pk__in=assigned))


def assign_task(company, task, actor, user_ids=(), group_ids=(), notify=True):
    """محول‌کردن وظیفه به یک یا چند نفر و/یا گروه‌ها (idempotent).

    برای هر مسئول یک ``PlanningShare`` با ``role='assignee'`` و ``permission='edit'``
    ساخته می‌شود تا وظیفه در «کارهای من» او دیده شود و بتواند وضعیت را تغییر دهد.
    """
    from django.contrib.auth import get_user_model

    people = {int(value) for value in user_ids or [] if str(value).strip().isdigit()}
    groups = [int(value) for value in group_ids or [] if str(value).strip().isdigit()]
    for group_id, member_id in PlanningGroupMember.objects.filter(
        group_id__in=groups, group__company=company,
    ).values_list('group_id', 'user_id'):
        people.add(int(member_id))
    people.discard(int(getattr(actor, 'pk', 0) or 0))

    valid_ids = set(
        get_user_model().objects.filter(pk__in=people, is_active=True)
        .values_list('pk', flat=True),
    )
    created = []
    for user_id in sorted(valid_ids):
        share, _created = PlanningShare.objects.update_or_create(
            company=company, item_kind=PlanningShare.ItemKind.TASK, item_id=task.pk,
            shared_with_id=user_id,
            defaults={
                'shared_by': actor, 'permission': PlanningShare.Permission.EDIT,
                'role': PlanningShare.Role.ASSIGNEE, 'is_active': True,
            },
        )
        created.append(share)

    task.assignee_groups.set(groups)
    task.is_shared = bool(created) or bool(groups)
    task.save(update_fields=['is_shared', 'updated_at'])

    if created and notify:
        _notify_assignment(company, task, actor, [share.shared_with for share in created])
    return created


def _notify_assignment(company, task, actor, users):
    from notifications.models import Notification

    sender = ''
    try:
        sender = (actor.get_full_name() or '').strip() or actor.get_username()
    except Exception:  # noqa: BLE001
        sender = ''
    for user in users:
        if not user:
            continue
        try:
            Notification.objects.create(
                company=company, user_id=user.pk, category='planning_share',
                priority='high', title='وظیفه‌ای به شما محول شد',
                body=f'{sender}: {task.title}'[:500],
                entity_type='planning_task', entity_id=task.pk,
                dedup_key=f'planning-assign:{task.pk}:{user.pk}',
            )
        except Exception:  # noqa: BLE001
            pass


def task_assignees(task):
    """فهرست مسئولان وظیفه با نام نمایشی."""
    from django.contrib.auth import get_user_model

    rows = PlanningShare.objects.filter(
        item_kind=PlanningShare.ItemKind.TASK, item_id=task.pk,
        role=PlanningShare.Role.ASSIGNEE,
    ).values_list('shared_with_id', flat=True)
    users = get_user_model().objects.filter(pk__in=list(rows))
    return [
        {
            'id': user.pk,
            'name': (user.get_full_name() or '').strip() or user.get_username(),
        }
        for user in users
    ]


def assignee_groups(task):
    """گروه‌های انتخاب‌شده هنگام محول‌کردن وظیفه."""
    return [
        {'id': group.pk, 'name': group.name, 'color': group.color}
        for group in task.assignee_groups.all()
    ]


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
