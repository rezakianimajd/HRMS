"""تولید نسخهٔ باکیفیت عکس پرسنلی برای نمایش (thumbnail + شارپ).

عکس‌های پرسنلی بعضاً اسکن/آپلود با کیفیت پایین‌اند و در آواتارهای کوچک تار دیده
می‌شوند. این ماژول با نمونه‌برداری LANCZOS، اصلاح جهت EXIF و شارپ ملایم، نسخهٔ
نمایشی می‌سازد و در ``MEDIA_ROOT/thumbnails/employees`` کش می‌کند.
"""
from __future__ import annotations

import hashlib
import io
import os
from pathlib import Path

from django.conf import settings

MIN_SIZE = 32
MAX_SIZE = 1024
DEFAULT_SIZE = 256
CACHE_FOLDER = 'thumbnails/employees'


def clamp_size(value, default: int = DEFAULT_SIZE) -> int:
    try:
        size = int(value)
    except (TypeError, ValueError):
        return default
    return max(MIN_SIZE, min(MAX_SIZE, size))


def cache_path(employee_id, source_name: str, size: int) -> Path:
    digest = hashlib.sha1(f'{source_name}|{size}'.encode('utf-8')).hexdigest()[:20]
    return (
        Path(settings.MEDIA_ROOT) / CACHE_FOLDER / str(employee_id) / f'{digest}_{size}.webp'
    )


def render_photo(source_path: str, size: int, *, sharpen: bool = True) -> bytes:
    """نسخهٔ WebP باکیفیت با بزرگ‌ترین ضلع ``size`` (بدون کشیدگی/بریدگی)."""
    from PIL import Image, ImageFilter, ImageOps

    with Image.open(source_path) as image:
        image = ImageOps.exif_transpose(image)
        image = image.convert('RGB')
        image.thumbnail((size, size), Image.LANCZOS)
        if sharpen and min(image.size) >= 48:
            image = image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=110, threshold=3))
        buffer = io.BytesIO()
        image.save(buffer, format='WEBP', quality=90, method=4)
        return buffer.getvalue()


def photo_thumbnail(employee, size, *, request=None) -> bytes:
    """بایت‌های نسخهٔ نمایشی (با کش روی دیسک)."""
    target = cache_path(employee.pk, employee.photo.name, size)
    if target.exists():
        return target.read_bytes()
    data = render_photo(employee.photo.path, size)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return data


def photo_exists(employee) -> bool:
    try:
        return bool(employee.photo) and os.path.exists(employee.photo.path)
    except Exception:  # noqa: BLE001 — storage ناموجود/غیرمحلی نباید خطا بدهد
        return False


def photo_version(employee) -> str:
    """نسخهٔ کش‌شکن برای URL (با تغییر فایل عکس عوض می‌شود)."""
    name = getattr(employee.photo, 'name', '') or ''
    return hashlib.sha1(name.encode('utf-8')).hexdigest()[:10]


def signed_photo_url(employee, request, *, size: int = DEFAULT_SIZE) -> str:
    """URL امضاشدهٔ عکس نمایشی (برای <img> که هدر JWT ندارد)."""
    from employees.photo_tokens import sign_employee

    if not request or not photo_exists(employee):
        return ''
    token = sign_employee(employee.pk)
    path = f'/api/employees/{employee.pk}/photo/?size={size}&v={photo_version(employee)}&t={token}'
    return request.build_absolute_uri(path)


def photo_url(employee, request=None, *, size: int = DEFAULT_SIZE) -> str:
    """URL نمایشی عکس پرسنلی =نسخهٔ شارپ/WebP= با fallback به فایل اصلی."""
    if not getattr(employee, 'photo', None):
        return ''
    try:
        signed = signed_photo_url(employee, request, size=size)
    except Exception:  # noqa: BLE001 — نبود فایل/تنظیمات نباید پاسخ API را بشکند
        signed = ''
    if signed:
        return signed
    try:
        return request.build_absolute_uri(employee.photo.url) if request else employee.photo.url
    except (ValueError, AttributeError):
        return ''
