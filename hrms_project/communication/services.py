"""سرویس‌های دامنهٔ چت (منطق اصلی، مستقل از UI و HTTP).

هر عملیات مهم (ساخت گفتگو، ارسال/ویرایش/حذف پیام، خواندن) اینجا متمرکز است تا
API، اعلان‌ها، رویدادهای Real-time و Audit همه از یک مسیر عبور کنند.
"""
from __future__ import annotations

import logging

from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from communication import crypto, permissions, realtime
from communication.models import (
    ChatAuditLog, Conversation, ConversationMember, Message, MessageAttachment,
    MessageEntityRef, MessageMention, MessageReceipt,
)

logger = logging.getLogger(__name__)

DEFAULT_CHANNELS = (
    ('اطلاعیه‌های سازمان', '📢', '#0ea5e9'),
    ('امور مالی', '💰', '#10b981'),
    ('قراردادها', '📑', '#f59e0b'),
    ('پروژه‌ها', '🏗', '#8b5cf6'),
    ('منابع انسانی', '👥', '#ec4899'),
)


def direct_key_for(first_id, second_id) -> str:
    """کلید پایدار گفتگوی خصوصی (بدون توجه به ترتیب)."""
    return '-'.join(str(part) for part in sorted([str(first_id), str(second_id)]))


def get_or_create_direct(company, user, other_user):
    """گفتگوی خصوصی بین دو کاربر (idempotent)."""
    if not other_user or str(other_user.pk) == str(user.pk):
        raise ValueError('گفتگوی خصوصی به دو کاربر متفاوت نیاز دارد.')
    key = direct_key_for(user.pk, other_user.pk)
    conversation = Conversation.objects.filter(
        company=company, kind=Conversation.Kind.DIRECT, direct_key=key,
    ).first()
    if conversation:
        return conversation, False
    with transaction.atomic():
        conversation = Conversation.objects.create(
            company=company, kind=Conversation.Kind.DIRECT, direct_key=key,
            title='', created_by=user, status=Conversation.Status.ACTIVE,
        )
        for member_user, role in ((user, ConversationMember.Role.MEMBER),
                                  (other_user, ConversationMember.Role.MEMBER)):
            ConversationMember.objects.create(
                company=company, conversation=conversation, user=member_user, role=role,
            )
    _audit(conversation, None, user, ChatAuditLog.Action.CREATE, metadata={'kind': 'direct'})
    return conversation, True


def create_conversation(company, creator, *, kind, title, member_ids=(), description='',
                        related_module='', related_object_type='', related_object_id='',
                        related_label='', color='', icon='', is_public=False,
                        post_policy=Conversation.PostPolicy.MEMBERS, extra_members=()):
    """ساخت گروه/کانال با مالک و اعضا."""
    kind = kind if kind in dict(Conversation.Kind.choices) else Conversation.Kind.GROUP
    with transaction.atomic():
        conversation = Conversation.objects.create(
            company=company, kind=kind, title=(title or '').strip()[:180],
            description=description or '', color=color or '', icon=icon or '',
            is_public=bool(is_public), post_policy=post_policy,
            related_module=related_module or '',
            related_object_type=related_object_type or '',
            related_object_id=str(related_object_id or ''),
            related_label=related_label or '',
            created_by=creator,
        )
        ConversationMember.objects.create(
            company=company, conversation=conversation, user=creator,
            role=ConversationMember.Role.OWNER,
        )
        add_members(company, conversation, member_ids, actor=creator, notify=False,
                    extra_members=extra_members)
    _audit(conversation, None, creator, ChatAuditLog.Action.CREATE,
           metadata={'kind': kind, 'title': conversation.title})
    realtime.publish(company, 'conversation.created',
                     {'conversation': conversation.pk, 'title': conversation.title},
                     conversation=conversation)
    return conversation


def add_members(company, conversation, member_ids=(), actor=None, notify=True,
                extra_members=()):
    """افزودن اعضا (idempotent) و انتشار رویداد/اعلان."""
    users = list(extra_members or [])
    ids = [int(value) for value in member_ids or [] if str(value).isdigit()]
    if ids:
        from django.contrib.auth import get_user_model

        users.extend(get_user_model().objects.filter(pk__in=ids, is_active=True))
    added = []
    for user in users:
        if not user or ConversationMember.objects.filter(
            conversation=conversation, user=user,
        ).exists():
            continue
        ConversationMember.objects.create(
            company=company, conversation=conversation, user=user,
            role=ConversationMember.Role.MEMBER,
        )
        added.append(user)
        _audit(conversation, None, actor, ChatAuditLog.Action.MEMBER_ADD,
               metadata={'user': user.pk})
    if added and notify:
        _notify_users(
            company, [user.pk for user in added], 'chat_member_added',
            title='به یک گفتگو اضافه شدید',
            body=f'شما به «{conversation.display_title}» اضافه شدید.',
            conversation=conversation,
        )
        realtime.publish(company, 'conversation.members',
                         {'conversation': conversation.pk,
                          'added': [user.pk for user in added]},
                         conversation=conversation)
    return added


def remove_member(company, conversation, member_user, actor=None):
    member = ConversationMember.objects.filter(
        conversation=conversation, user=member_user,
    ).first()
    if not member:
        return False
    member.delete()
    _audit(conversation, None, actor, ChatAuditLog.Action.MEMBER_REMOVE,
           metadata={'user': member_user.pk})
    realtime.publish(company, 'conversation.members',
                     {'conversation': conversation.pk, 'removed': [member_user.pk]},
                     conversation=conversation)
    return True


# --------------------------------------------------------------------------- #
# پیام‌ها
# --------------------------------------------------------------------------- #
def _audit(conversation, message, actor, action, old_value='', new_value='', metadata=None):
    try:
        ChatAuditLog.objects.create(
            company=conversation.company, conversation=conversation, message=message,
            actor=actor, action=action, old_value=old_value or '', new_value=new_value or '',
            metadata=metadata or {},
        )
    except Exception:  # noqa: BLE001 — حسابرسی نباید عملیات اصلی را بشکند
        logger.exception('chat audit failed for conversation %s', conversation.pk)


def _notify_users(company, user_ids, category, *, title, body='', conversation=None,
                  priority='normal', entity_type='chat_conversation'):
    from notifications.models import Notification

    created = 0
    for user_id in user_ids or []:
        if not user_id:
            continue
        dedup = f'{category}:{getattr(conversation, "pk", 0)}:{user_id}:{title[:40]}'
        try:
            Notification.objects.create(
                company=company, user_id=user_id, category=category, priority=priority,
                title=title[:200], body=body[:500], entity_type=entity_type,
                entity_id=getattr(conversation, 'pk', None), dedup_key=dedup,
            )
            created += 1
        except Exception:  # noqa: BLE001
            logger.exception('chat notification failed for user %s', user_id)
    return created


def post_message(company, conversation, sender, body, *, kind=Message.Kind.TEXT,
                 reply_to=None, mentions=(), entity_refs=(), attachments=(),
                 sender_name='', metadata=None, system=False):
    """ثبت پیام رمزنگاری‌شده + منشن/ارجاع/پیوست + اعلان و رویداد."""
    if not system:
        permissions.ensure_can_post(sender, conversation)

    clean = crypto.clean_body(body)
    if not clean and not attachments:
        raise ValueError('متن پیام خالی است.')
    if reply_to and reply_to.conversation_id != conversation.pk:
        reply_to = None

    thread_root = None
    if reply_to:
        thread_root = reply_to.thread_root or reply_to

    with transaction.atomic():
        message = Message.objects.create(
            company=company, conversation=conversation,
            sender=None if system else sender,
            sender_name=(sender_name or _user_label(sender))[:150],
            kind=kind, body=crypto.encrypt_body(clean), body_length=len(clean),
            search_tokens=crypto.blind_index(clean),
            reply_to=reply_to, thread_root=thread_root,
            metadata=metadata or {},
        )
        _save_attachments(company, message, attachments, sender)
        _save_entity_refs(company, message, entity_refs)
        mentioned = _save_mentions(company, message, mentions)

        conversation.last_message_at = message.created_at
        conversation.message_count = (conversation.message_count or 0) + 1
        conversation.save(update_fields=['last_message_at', 'message_count', 'updated_at'])

        MessageReceipt.objects.get_or_create(
            company=company, message=message, user=sender if sender else None,
            delivered_at=message.created_at, read_at=message.created_at,
        ) if sender else None

    _audit(conversation, message, sender, ChatAuditLog.Action.CREATE)
    notify_targets = _notification_targets(conversation, sender, mentioned)
    _notify_targets(company, conversation, message, sender, notify_targets, mentioned)

    realtime.publish(
        company, 'message.created',
        {
            'conversation': conversation.pk,
            'message': message.pk,
            'sender': getattr(sender, 'pk', None),
            'preview': crypto.preview_of(clean, 90),
            'created_at': message.created_at.isoformat(),
        },
        conversation=conversation,
    )
    return message


def _user_label(user):
    if not user:
        return ''
    try:
        return (user.get_full_name() or '').strip() or user.get_username()
    except Exception:  # noqa: BLE001
        return ''



def _save_attachments(company, message, attachments, sender):
    from communication.uploads import build_attachment_kwargs

    saved = []
    for item in attachments or []:
        kwargs = build_attachment_kwargs(item, sender)
        if not kwargs:
            continue
        saved.append(MessageAttachment.objects.create(
            company=company, message=message, **kwargs,
        ))
    return saved


def _save_entity_refs(company, message, entity_refs):
    created = []
    for ref in entity_refs or []:
        module = str((ref or {}).get('module') or '').strip()[:40]
        if not module:
            continue
        created.append(MessageEntityRef.objects.create(
            company=company, message=message, module=module,
            object_type=str(ref.get('object_type') or '')[:60],
            object_id=str(ref.get('object_id') or '')[:60],
            label=str(ref.get('label') or '')[:200],
            url=str(ref.get('url') or '')[:300],
            metadata=ref.get('metadata') or {},
        ))
    if created:
        message.metadata = {**(message.metadata or {}), 'entity_refs': len(created)}
        message.save(update_fields=['metadata', 'updated_at'])
    return created


def _save_mentions(company, message, mentions):
    from django.contrib.auth import get_user_model

    ids = [int(value) for value in mentions or [] if str(value).isdigit()]
    if not ids:
        return []
    users = list(get_user_model().objects.filter(pk__in=ids, is_active=True))
    for user in users:
        MessageMention.objects.get_or_create(
            company=company, message=message, user=user,
        )
    return users


def _notification_targets(conversation, sender, mentioned):
    """اعضایی که باید اعلان بگیرند (به‌جز فرستنده و بی‌صداها)."""
    from django.db.models import Q

    member_rows = (
        ConversationMember.objects.filter(conversation=conversation)
        .exclude(user=sender)
        .values('user_id', 'notify', 'muted_until')
    )
    mentioned_ids = {user.pk for user in mentioned or []}
    now = timezone.now()
    targets = []
    for row in member_rows:
        user_id = row['user_id']
        if user_id in mentioned_ids:
            targets.append((user_id, True))
            continue
        if row['notify'] == ConversationMember.Notify.MUTED:
            continue
        if row['muted_until'] and row['muted_until'] > now:
            continue
        if row['notify'] == ConversationMember.Notify.MENTIONS:
            continue
        targets.append((user_id, False))
    return targets


def _notify_targets(company, conversation, message, sender, targets, mentioned):
    sender_label = _user_label(sender) or 'Kian'
    mentioned_ids = {user.pk for user in mentioned or []}
    for user_id, is_mention in targets:
        if is_mention:
            _notify_users(
                company, [user_id], 'chat_mention',
                title=f'{sender_label} شما را در «{conversation.display_title}» نام برد',
                body=crypto.preview_of(crypto.decrypt_body(message.body), 140),
                conversation=conversation, priority='high',
            )
        else:
            _notify_users(
                company, [user_id], 'chat_message',
                title=f'پیام جدید در «{conversation.display_title}»',
                body=f'{sender_label}: '
                     f'{crypto.preview_of(crypto.decrypt_body(message.body), 120)}',
                conversation=conversation,
            )
    if mentioned_ids:
        MessageMention.objects.filter(message=message, is_notified=False).update(
            is_notified=True,
        )



# --------------------------------------------------------------------------- #
# ویرایش/حذف/خواندن
# --------------------------------------------------------------------------- #
def edit_message(message, actor, body):
    """ویرایش پیام با ثبت مقدار قبلی در Audit (پیام حذف نمی‌شود)."""
    if message.sender_id and str(message.sender_id) != str(getattr(actor, 'pk', '')):
        if not getattr(actor, 'is_superuser', False):
            raise PermissionError('فقط فرستنده یا مدیر سیستم می‌تواند پیام را ویرایش کند.')
    if message.deleted_at:
        raise ValueError('پیام حذف‌شده قابل ویرایش نیست.')
    clean = crypto.clean_body(body)
    if not clean:
        raise ValueError('متن پیام خالی است.')
    old_plain = crypto.decrypt_body(message.body)
    message.body = crypto.encrypt_body(clean)
    message.body_length = len(clean)
    message.search_tokens = crypto.blind_index(clean)
    message.edited_at = timezone.now()
    message.save(update_fields=['body', 'body_length', 'search_tokens', 'edited_at',
                                'updated_at'])
    _audit(message.conversation, message, actor, ChatAuditLog.Action.EDIT,
           old_value=crypto.encrypt_body(old_plain), new_value=message.body)
    realtime.publish(
        message.company, 'message.updated',
        {'conversation': message.conversation_id, 'message': message.pk,
         'edited': True},
        conversation=message.conversation,
    )
    return message


def delete_message(message, actor):
    """حذف نرم: متن از دید کاربران حذف می‌شود ولی برای حسابرسی می‌ماند."""
    if message.sender_id and str(message.sender_id) != str(getattr(actor, 'pk', '')):
        if not getattr(actor, 'is_superuser', False) and not permissions.is_privileged(
            actor, message.conversation,
        ):
            raise PermissionError('اجازهٔ حذف این پیام را ندارید.')
    if message.deleted_at:
        return message
    message.deleted_at = timezone.now()
    message.deleted_by = actor
    message.save(update_fields=['deleted_at', 'deleted_by', 'updated_at'])
    _audit(message.conversation, message, actor, ChatAuditLog.Action.DELETE)
    realtime.publish(
        message.company, 'message.deleted',
        {'conversation': message.conversation_id, 'message': message.pk},
        conversation=message.conversation,
    )
    return message


def mark_read(conversation, user, message=None):
    """ثبت «خوانده شد» تا پیام مشخص (یا آخرین پیام) + رسیدها."""
    member = ConversationMember.objects.filter(conversation=conversation, user=user).first()
    if not member:
        return None
    if message is None:
        message = (Message.objects.filter(conversation=conversation, deleted_at__isnull=True)
                   .order_by('-id').first())
    if message is None:
        return member
    now = timezone.now()
    if not member.last_read_message_id or message.pk > member.last_read_message_id:
        member.last_read_message = message
    member.last_read_at = now
    member.save(update_fields=['last_read_message', 'last_read_at', 'updated_at'])

    pending = MessageReceipt.objects.filter(
        message__conversation=conversation, user=user, read_at__isnull=True,
        message_id__lte=message.pk,
    )
    pending.update(read_at=now, delivered_at=now, updated_at=now)
    realtime.publish(
        conversation.company, 'conversation.read',
        {'conversation': conversation.pk, 'user': getattr(user, 'pk', None),
         'message': message.pk},
        conversation=conversation, audience=[getattr(user, 'pk', None)],
    )
    return member


def unread_count_by_id(conversation_id, member):
    """تعداد پیام‌های خوانده‌نشده با شناسهٔ گفتگو (بدون بارگذاری گفتگو)."""
    query = Q(conversation_id=conversation_id, deleted_at__isnull=True)
    if member is not None and member.last_read_message_id:
        query &= Q(pk__gt=member.last_read_message_id)
    return Message.objects.filter(query).count()


def unread_count(conversation, member):
    """تعداد پیام‌های خوانده‌نشدهٔ یک عضو."""
    if not member or conversation is None:
        return 0
    return unread_count_by_id(conversation.pk, member)


def unread_summary(user):
    """خلاصهٔ خوانده‌نشده‌ها برای نشان سایدبار."""
    if not getattr(user, 'is_authenticated', False):
        return {'chat': 0, 'mentions': 0, 'planning': 0}
    members = ConversationMember.objects.filter(user=user).select_related('conversation')
    total = 0
    for member in members:
        total += unread_count(member.conversation, member)
    mentions = MessageMention.objects.filter(
        user=user, is_notified=False,
    ).count()
    return {'chat': total, 'mentions': mentions}


def search_messages(user, query, limit=30):
    """جست‌وجوی واژه‌ای روی گفتگوهای مجاز (blind index)."""
    digests = crypto.query_digests(query)
    if not digests:
        return Message.objects.none()
    conversations = permissions.visible_conversations(user)
    qs = Message.objects.filter(
        conversation__in=conversations, deleted_at__isnull=True,
    )
    for digest in digests:
        qs = qs.filter(search_tokens__contains=digest)
    return qs.order_by('-created_at')[:limit]

