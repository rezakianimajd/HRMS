"""واکنش‌های پیام چت (reactions): قواعد خالص + سرویس ثبت/حذف.

- هر کاربر برای هر ایموجی روی هر پیام فقط یک واکنش دارد (toggle).
- خلاصهٔ واکنش‌ها با تعداد و «واکنش من» به کلاینت داده می‌شود تا حباب پیام
  بدون کوئری اضافه (N+1) رندر شود.
"""
from __future__ import annotations

MAX_EMOJI_LENGTH = 16

# پیشنهادهای سریع در حباب پیام (قابل تغییر بدون مهاجرت داده)
QUICK_REACTIONS = ('👍', '❤️', '😂', '🎉', '🙏', '✅')


def _value(row, key, default=None):
    if isinstance(row, dict):
        return row.get(key, default)
    return getattr(row, key, default)


def clean_emoji(value) -> str:
    """ایموجی واکنش را نرمال می‌کند (حذف فاصله‌های اضافی و محدودکردن طول)."""
    text = str(value or '').strip()
    if not text:
        return ''
    return text.replace('\u200c', '').strip()[:MAX_EMOJI_LENGTH]


def summarize_reactions(rows, *, user_id=None):
    """خلاصهٔ واکنش‌ها: `[{emoji, count, mine, user_ids}]` مرتب بر اساس تعداد."""
    buckets = {}
    for row in rows or []:
        emoji = clean_emoji(_value(row, 'emoji'))
        if not emoji:
            continue
        users = buckets.setdefault(emoji, [])
        uid = _value(row, 'user_id')
        if uid is not None and uid not in users:
            users.append(uid)
    summary = [
        {
            'emoji': emoji,
            'count': len(users),
            'mine': bool(user_id is not None and user_id in users),
            'user_ids': users,
        }
        for emoji, users in buckets.items()
    ]
    return sorted(summary, key=lambda item: (-item['count'], item['emoji']))


def toggle_reaction(*, conversation, message, user, emoji):
    """ثبت یا حذف واکنش کاربر؛ خلاصهٔ تازهٔ واکنش‌های همان پیام را برمی‌گرداند."""
    from communication import realtime
    from communication.models import MessageReaction

    cleaned = clean_emoji(emoji)
    if not cleaned:
        raise ValueError('ایموجی واکنش خالی است.')

    existing = MessageReaction.objects.filter(
        message=message, user=user, emoji=cleaned,
    ).first()
    if existing:
        existing.delete()
        reacted = False
    else:
        MessageReaction.objects.create(
            company=message.company, message=message, user=user, emoji=cleaned,
        )
        reacted = True

    realtime.publish(
        message.company, 'reaction',
        {
            'message': message.pk,
            'user': getattr(user, 'pk', None),
            'emoji': cleaned,
            'reacted': reacted,
        },
        conversation=conversation,
    )
    rows = list(MessageReaction.objects.filter(message=message).values(
        'emoji', 'user_id',
    ))
    return {
        'reactions': summarize_reactions(rows, user_id=getattr(user, 'pk', None)),
        'reacted': reacted,
        'emoji': cleaned,
    }
