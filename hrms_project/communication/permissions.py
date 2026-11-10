"""قواعد دسترسی چت.

- دیدن گفتگو: عضویت در آن، یا **کانال عمومی**. هیچ استثنایی برای سوپریوزر نیست؛
  یعنی گفتگوی خصوصی (دو نفره) و گروهیِ دیگران حتی برای مدیر سیستم هم قابل مشاهده،
  ارسال پیام یا مدیریت عضو نیست. (حریم خصوصی پیام‌ها مقدم بر نقش مدیریتی است.)
- فرستادن پیام: عضو + (کانال با ``post_policy='admins'`` فقط مدیران/مالک).
- هر پیام/ارجاع فقط برای اعضای همان گفتگو قابل مشاهده است؛ بنابراین چت هیچ‌وقت
  راه میان‌بُری برای دیدن رکوردهای ماژول‌های دیگر نمی‌شود.
- برای ارجاع به موجودیت‌ها هم مجوز همان ماژول بررسی می‌شود (``can_read_module``).
"""
from __future__ import annotations

from rest_framework.exceptions import PermissionDenied

from communication.models import Conversation, ConversationMember

# نگاشت ماژول ارجاع → پیشوند کدهای مجوز ریز
MODULE_PERMISSION_PREFIX = {
    'contracts': ('contracts',),
    'projects': ('projects',),
    'procurement': ('procurement',),
    'accounting': ('accounting',),
    'treasury': ('treasury',),
    'pettycash': ('pettycash',),
    'correspondence': ('correspondence',),
    'documents': ('documents',),
    'employees': ('hrms', 'employees'),
}

READ_ACTIONS = ('view', 'list', 'retrieve', 'export', 'print')


def is_privileged(user, conversation) -> bool:
    """مدیر/مالک همان گفتگو (سوپریوزر بدون عضویت، مدیر آن گفتگو نیست)."""
    if not getattr(user, 'is_authenticated', False):
        return False
    return ConversationMember.objects.filter(
        conversation=conversation, user=user,
        role__in=(ConversationMember.Role.OWNER, ConversationMember.Role.ADMIN),
    ).exists()


def membership(user, conversation):
    if not getattr(user, 'is_authenticated', False):
        return None
    return ConversationMember.objects.filter(conversation=conversation, user=user).first()


def can_view(user, conversation) -> bool:
    """دیدن گفتگو فقط با عضویت؛ تنها استثنا: کانال عمومی.

    ⚠️ سوپریوزر هم بدون عضویت نمی‌تواند گفتگوی خصوصی/گروهی دیگران را ببیند.
    """
    if membership(user, conversation):
        return True
    return bool(conversation.is_public and conversation.kind == Conversation.Kind.CHANNEL)


def ensure_view(user, conversation):
    if not can_view(user, conversation):
        raise PermissionDenied('شما عضو این گفتگو نیستید.')
    return True


def can_post(user, conversation) -> bool:
    """ارسال پیام فقط با عضویت (حتی برای سوپریوزر)."""
    member = membership(user, conversation)
    if not member:
        return False
    if conversation.status == Conversation.Status.CLOSED:
        return False
    if (
        conversation.kind == Conversation.Kind.CHANNEL
        and conversation.post_policy == Conversation.PostPolicy.ADMINS
    ):
        return bool(member.is_privileged) or bool(getattr(user, 'is_superuser', False))
    return True


def ensure_can_post(user, conversation):
    if not can_post(user, conversation):
        raise PermissionDenied('اجازهٔ ارسال پیام در این گفتگو را ندارید.')
    return True


def can_manage_members(user, conversation) -> bool:
    """افزودن/حذف عضو فقط برای مدیر/مالک همان گفتگو (نه هر سوپریوزری)."""
    return is_privileged(user, conversation)


def visible_conversations(user):
    """گفتگوهای قابل مشاهده: عضویت + کانال‌های عمومی (بدون استثنای سوپریوزر)."""
    from django.db.models import Q

    if not getattr(user, 'is_authenticated', False):
        return Conversation.objects.none()
    return Conversation.objects.filter(
        Q(members__user=user)
        | Q(kind=Conversation.Kind.CHANNEL, is_public=True)
    ).distinct()


def can_read_module(user, module: str) -> bool:
    """آیا کاربر اصلاً به ماژول ارجاع‌شده دسترسی «خواندن» دارد؟

    سوپریوزر همیشه؛ در غیر این صورت اگر هیچ کد ریزی برای آن ماژول ثبت نشده باشد
    (کاربر قدیمی/نقش‌محور) محافظه‌کارانه اجازه می‌دهیم تا چیزی قفل نشود.
    """
    if getattr(user, 'is_superuser', False):
        return True
    prefixes = MODULE_PERMISSION_PREFIX.get(module)
    if not prefixes:
        return True
    try:
        from core.engines.permission_engine import fine_permissions_for

        granted = fine_permissions_for(user) or {}
    except Exception:  # noqa: BLE001
        return True
    if not granted:
        return True
    for code, allowed in granted.items():
        if not allowed:
            continue
        if not any(str(code).startswith(f'{prefix}.') for prefix in prefixes):
            continue
        action = str(code).rsplit('.', 1)[-1]
        if action in READ_ACTIONS:
            return True
    return False
