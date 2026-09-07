"""Notification delivery channels: Email (SMTP) and Bale messenger.

Bale is delivered via its Bot API (HTTPS) using only the Python standard
library (urllib) so no extra dependency is required. The bot token is
configured per company through the CompanyProfile fields (see
settings_app.models). Email is delivered through Django's SMTP backend
configured in production settings.
"""
import json
import logging
import urllib.request

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger('hrms.notifications')

BALE_SEND_URL = 'https://tapi.bale.ai/bot{token}/sendMessage'


def _company_settings(company):
    """Return (email_enabled, bale_enabled, bale_token, bale_chat_id)."""
    profile = None
    if company is not None:
        try:
            profile = company.profile
        except Exception:
            profile = None

    email_enabled = getattr(profile, 'notify_email_enabled', True)
    bale_enabled = getattr(profile, 'notify_bale_enabled', False)
    bale_token = getattr(profile, 'bale_token', '') or ''
    bale_chat_id = getattr(profile, 'bale_chat_id', '') or ''
    return email_enabled, bale_enabled, bale_token, bale_chat_id


def send_email(recipients, subject, body):
    """Send a plain email (falls back silently on failure)."""
    if not recipients:
        return False
    try:
        send_mail(
            subject,
            body,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hrms.local'),
            recipients,
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.error(f'Email send failed: {e}')
        return False


def send_bale(token, chat_id, text):
    """Send a message through the Bale Bot API (urllib, no extra deps)."""
    if not token or not chat_id:
        return False
    url = BALE_SEND_URL.format(token=token)
    payload = json.dumps({'chat_id': chat_id, 'text': text}).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        ok = bool(data.get('ok'))
        if not ok:
            logger.error(f'Bale send failed: {data}')
        return ok
    except Exception as e:
        logger.error(f'Bale send exception: {e}')
        return False


def deliver_notification(company, admins_emails, subject, body):
    """Deliver a notification over all enabled channels."""
    email_enabled, bale_enabled, bale_token, bale_chat_id = _company_settings(company)

    results = {'email': False, 'bale': False}

    if email_enabled:
        results['email'] = send_email(admins_emails, subject, body)

    if bale_enabled:
        results['bale'] = send_bale(bale_token, bale_chat_id, f'{subject}\n\n{body}')

    return results