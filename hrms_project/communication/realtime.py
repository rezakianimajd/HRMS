"""لایهٔ Real-time چت (قابل تعویض بدون تغییر دامنه).

امروز: ``DatabaseEventPublisher`` رویداد را در ``ChatEvent`` ثبت می‌کند و کلاینت با
Polling می‌خواند. فردا با نصب ``channels`` + ``channels_redis`` فقط کافی است
``publish()`` همین ماژول به group_send وصل شود؛ سرویس‌ها و API تغییر نمی‌کنند.
"""
from __future__ import annotations

import logging

from django.db import transaction

logger = logging.getLogger(__name__)


class Publisher:
    """قرارداد مشترک هر پیاده‌سازی Real-time."""

    def publish(self, company, event_type, payload=None, conversation=None, audience=None):
        raise NotImplementedError


class DatabaseEventPublisher(Publisher):
    """Outbox در دیتابیس (پیش‌فرض؛ بدون وابستگی جدید)."""

    def publish(self, company, event_type, payload=None, conversation=None, audience=None):
        from communication.models import ChatEvent

        return ChatEvent.objects.create(
            company=company,
            conversation=conversation,
            event_type=event_type,
            payload=payload or {},
            audience=list(audience or []),
        )


class ChannelsPublisher(Publisher):
    """نسخهٔ WebSocket (Django Channels) — آماده برای فاز بعد."""

    def publish(self, company, event_type, payload=None, conversation=None, audience=None):
        from asgiref.sync import async_to_sync  # noqa: PLC0415

        from channels.layers import get_channel_layer  # noqa: PLC0415

        layer = get_channel_layer()
        if layer is None:
            return DatabaseEventPublisher().publish(
                company, event_type, payload, conversation, audience,
            )
        group = f'chat.{company.pk}.{getattr(conversation, "pk", "global")}'
        async_to_sync(layer.group_send)(group, {
            'type': 'chat.event',
            'event': event_type,
            'payload': payload or {},
        })
        return None


def _publisher():
    """انتخاب publisher بر اساس نصب بودن Channels (بدون import سنگین)."""
    try:  # pragma: no cover — در محیط فعلی Channels نصب نیست
        import channels  # noqa: F401

        return ChannelsPublisher()
    except Exception:  # noqa: BLE001
        return DatabaseEventPublisher()


def publish(company, event_type, payload=None, conversation=None, audience=None):
    """ثبت/ارسال رویداد؛ خطا هرگز عملیات اصلی را نمی‌شکند."""
    try:
        with transaction.atomic():
            return _publisher().publish(
                company, event_type, payload, conversation, audience,
            )
    except Exception:  # noqa: BLE001
        logger.exception('chat realtime publish failed: %s', event_type)
        return None
