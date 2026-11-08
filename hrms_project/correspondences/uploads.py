"""اعتبارسنجی و نام‌گذاری امن پیوست‌های مکاتبات.

هر فایل آپلودی باید پسوند مجاز و حجم مجاز داشته باشد؛ نام ذخیره‌شده هم پاک‌سازی
می‌شود. این ماژول مستقل از دیتابیس است تا تست آن ساده باشد.
"""
import mimetypes
import os

from django.conf import settings
from django.core.exceptions import ValidationError

from correspondences.attachment_import import safe_filename

DEFAULT_MAX_MB = 50

# پسوندهای مجاز (اسناد و تصاویر متداول اداری)
ALLOWED_EXTENSIONS = {
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.webp',
    '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.rtf', '.odt', '.ods',
    '.zip', '.rar', '.7z',
}

# پسوندهایی که «پیش‌نمایش درون‌مرورگری» برایشان بی‌خطر است
INLINE_EXTENSIONS = {
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.webp',
}

# پسوندهایی که هرگز نباید در مرورگر اجرا شوند
EXECUTABLE_EXTENSIONS = {'.html', '.htm', '.xhtml', '.shtml', '.svg', '.xml', '.js', '.mjs'}


def max_bytes():
    """سقف حجم هر پیوست (مگابایت) — قابل تنظیم با ``CORRESPONDENCE_ATTACHMENT_MAX_MB``."""
    value = getattr(settings, 'CORRESPONDENCE_ATTACHMENT_MAX_MB', DEFAULT_MAX_MB)
    try:
        megabytes = int(value)
    except (TypeError, ValueError):
        megabytes = DEFAULT_MAX_MB
    return max(1, megabytes) * 1024 * 1024


def extension_of(name):
    return os.path.splitext(str(name or ''))[1].lower()


def validate_attachment(upload, field='file'):
    """خطای اعتبارسنجی برای فایل خالی/بزرگ/با پسوند غیرمجاز."""
    if upload is None:
        raise ValidationError({field: 'فایلی انتخاب نشده است.'})

    name = getattr(upload, 'name', '') or ''
    extension = extension_of(name)
    if not extension:
        raise ValidationError({field: 'فایل بدون پسوند مجاز نیست.'})
    if extension in EXECUTABLE_EXTENSIONS or extension not in ALLOWED_EXTENSIONS:
        allowed = '، '.join(sorted(ALLOWED_EXTENSIONS))
        raise ValidationError({
            field: f'پسوند «{extension}» مجاز نیست. پسوندهای مجاز: {allowed}',
        })

    size = getattr(upload, 'size', 0) or 0
    if size <= 0:
        raise ValidationError({field: 'فایل خالی است یا خوانده نشد.'})
    limit = max_bytes()
    if size > limit:
        raise ValidationError({
            field: f'حجم فایل ({round(size / 1048576, 1)} مگابایت) از سقف '
                   f'{round(limit / 1048576)} مگابایت بیشتر است.',
        })
    return upload


def stored_filename(upload):
    """نام امن فایل برای ذخیره روی دیسک (بدون کاراکترهای غیرمجاز)."""
    return safe_filename(getattr(upload, 'name', '') or 'attachment')


def is_inline_safe(name):
    """آیا می‌توان فایل را inline (در پیش‌نمایش) سرو کرد؟"""
    return extension_of(name) in INLINE_EXTENSIONS


def content_type_of(name):
    guessed, _encoding = mimetypes.guess_type(str(name or ''))
    return guessed or 'application/octet-stream'
