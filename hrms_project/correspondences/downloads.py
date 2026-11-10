"""توکن امضاشدهٔ دانلود پیوست‌های مکاتبات.

مرورگر برای نمایش ``<iframe>``/``<img>`` هدر ``Authorization`` نمی‌فرستد؛ پس
دانلود امن با توکن کوتاه‌عمر انجام می‌شود. توکن فقط «کاربر + پیوست» را امضا
می‌کند و مجوز در لحظهٔ دانلود دوباره بررسی می‌شود.

هدرهای پاسخ هم اینجا تعریف شده‌اند تا پیش‌نمایش درون‌برنامه‌ای (iframe) کار کند:
``X-Frame-Options: SAMEORIGIN`` و CSP با ``frame-ancestors 'self'`` اجازه می‌دهند
خود برنامه فایل را قاب بگیرد، ولی سایت‌های دیگر نتوانند (ضد clickjacking).
"""
import re

from django.core import signing

SALT = 'correspondence.attachment.download.v1'
MAX_AGE = 60 * 60 * 12          # ۱۲ ساعت

CHUNK_SIZE = 64 * 1024

#: هدرهای امنی که اجازهٔ قاب‌گرفتن درون همان دامنه را می‌دهند (بدون XSS).
#: از ``default-src 'none'`` استفاده نمی‌کنیم تا نمایشگر PDF مرورگر در iframe
#: مسدود نشود؛ محافظ اصلی ``script-src 'none'`` و ``nosniff`` است.
PREVIEW_HEADERS = {
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': (
        "default-src 'self'; script-src 'none'; object-src 'self'; "
        "base-uri 'none'; frame-ancestors 'self'"
    ),
}

_RANGE_RE = re.compile(r'^bytes=(\d*)-(\d*)$')


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


def parse_range(header, size):
    """``(start, end)`` معتبر از هدر ``Range`` یا ``None``.

    نمایشگر PDF مرورگر برای فایل‌های بزرگ درخواست بازه‌ای می‌فرستد؛ بدون پاسخ
    ``206`` فایل کامل خوانده می‌شود و پیش‌نمایش کند/ناقص می‌شود.
    """
    match = _RANGE_RE.match(str(header or '').strip())
    if not match:
        return None
    total = int(size or 0)
    if total <= 0:
        return None
    raw_start, raw_end = match.group(1), match.group(2)
    if not raw_start and not raw_end:
        return None
    if not raw_start:                                   # bytes=-500 → ۵۰۰ بایت آخر
        length = int(raw_end)
        if length <= 0:
            return None
        start = max(total - length, 0)
        end = total - 1
    else:
        start = int(raw_start)
        end = int(raw_end) if raw_end else total - 1
    if start > end or start >= total:
        return None
    return start, min(end, total - 1)


def iter_chunks(handle, length, chunk_size=CHUNK_SIZE):
    """خواندن تدریجی ``length`` بایت از فایل باز‌شده."""
    remaining = int(length or 0)
    while remaining > 0:
        chunk = handle.read(min(chunk_size, remaining))
        if not chunk:
            break
        remaining -= len(chunk)
        yield chunk
