"""Best-effort notifications for update events (email + Bale messenger).

Uses the existing delivery helpers of the notifications app; every failure is
swallowed so an update never breaks because SMTP or Bale is unavailable.
"""
import logging

from django.conf import settings

logger = logging.getLogger('hrms.updates')


def _config():
    try:
        from core.models import UpdateSettings
        return UpdateSettings.load()
    except Exception:  # noqa: BLE001 — جدول/دیتابیس در دسترس نیست
        return None


def _targets():
    config = _config()
    emails = list(getattr(config, 'notify_emails', None) or []) if config else []
    if not emails:
        emails = [entry[1] for entry in getattr(settings, 'ADMINS', []) if len(entry) > 1]
    if not emails:
        fallback = getattr(settings, 'DEFAULT_FROM_EMAIL', '')
        emails = [fallback] if fallback else []

    wants_email = getattr(config, 'notify_email', True) if config else True
    wants_bale = getattr(config, 'notify_bale', False) if config else False
    chats = list(getattr(config, 'notify_bale_chat_ids', None) or []) if config else []
    return (emails if wants_email else []), (chats if wants_bale else [])


def notify_event(subject: str, message: str) -> dict:
    """Send one notification over the enabled channels. Never raises."""
    result = {'email': False, 'bale': False}
    try:
        from notifications.channels import send_bale, send_email
    except Exception:  # noqa: BLE001
        return result

    emails, chats = _targets()

    if emails:
        try:
            result['email'] = bool(send_email(emails, subject, message))
        except Exception:  # noqa: BLE001
            logger.exception('update notification email failed')

    token = (getattr(settings, 'UPDATE_BALE_TOKEN', '') or '').strip()
    if chats and token:
        sent = True
        for chat in chats:
            try:
                sent = bool(send_bale(token, str(chat), f'{subject}\n\n{message}')) and sent
            except Exception:  # noqa: BLE001
                logger.exception('update notification bale failed')
                sent = False
        result['bale'] = sent

    return result
