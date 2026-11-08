"""توکن امضاشدهٔ دانلود پیوست‌های مکاتبات.

مرورگر برای نمایش ``<iframe>``/``<img>`` هدر ``Authorization`` نمی‌فرستد؛ پس
دانلود امن با توکن کوتاه‌عمر انجام می‌شود. توکن فقط «کاربر + پیوست» را امضا
می‌کند و مجوز در لحظهٔ دانلود دوباره بررسی می‌شود.
"""
from django.core import signing

SALT = 'correspondence.attachment.download.v1'
MAX_AGE = 60 * 60 * 12          # ۱۲ ساعت


def issue_token(user, attachment_id):
    """توکن دانلود برای کاربر (بدون ذخیره در دیتابیس)."""
    if not user or not getattr(user, 'is_authenticated', False):
        return ''
    payload = {'u': user.pk, 'a': int(attachment_id)}
    return signing.dumps(payload, salt=SALT, compress=True)


def read_token(token):
    """``(user_id, attachment_id)`` یا ``None`` اگر توکن نامعتبر/منقضی باشد."""
    if not token:
        return None
    try:
        payload = signing.loads(token, salt=SALT, max_age=MAX_AGE)
    except (signing.BadSignature, signing.SignatureExpired, ValueError):
        return None
    try:
        return int(payload['u']), int(payload['a'])
    except (KeyError, TypeError, ValueError):
        return None
