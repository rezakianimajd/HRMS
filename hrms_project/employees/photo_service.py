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
# تا ۲۰۴۸px برای نمایش تمام‌صفحه/چاپ و صفحه‌های با چگالی بالا
MAX_SIZE = 2048
DEFAULT_SIZE = 512
CACHE_FOLDER = 'thumbnails/employees'
# با تغییر نسخهٔ رندر، کش‌های قدیمی (و کش مرورگر) باطل می‌شوند
RENDER_VERSION = '3'
WEBP_QUALITY = 95


def clamp_size(value, default: int = DEFAULT_SIZE) -> int:
    try:
        size = int(value)
    except (TypeError, ValueError):
        return default
    return max(MIN_SIZE, min(MAX_SIZE, size))


def cache_path(
    employee_id, source_name: str, size: int, version: str = RENDER_VERSION,
    *, crop: bool = False,
) -> Path:
    digest = hashlib.sha1(
        f'{version}|{source_name}|{size}|crop{int(bool(crop))}'.encode('utf-8')
    ).hexdigest()[:20]
    return (
        Path(settings.MEDIA_ROOT) / CACHE_FOLDER / str(employee_id) / f'{digest}_{size}.webp'
    )


def render_photo(
    source_path: str, size: int, *, sharpen: bool = True, crop: bool = False,
) -> bytes:
    """نسخهٔ WebP باکیفیت از تصویر اصلی (بدون تغییر فایل منبع).

    ``crop=False`` → بزرگ‌ترین ضلع ``size`` با حفظ نسبت (برای پیش‌نمایش/چاپ).
    ``crop=True``  → مربع ``size×size`` با برش مرکزی-بالا (برای آواتار) تا CSS
    دیگر تصویر را بزرگ‌نمایی نکند؛ همین علت اصلی تار/پیکسلی‌شدن آواتارها بود.
    اگر تصویر منبع کوچک‌تر از ``size`` باشد، بزرگ‌نمایی انجام نمی‌شود.
    """
    from PIL import Image, ImageFilter, ImageOps

    with Image.open(source_path) as image:
        image = ImageOps.exif_transpose(image)
        icc_profile = image.info.get('icc_profile')
        image = image.convert('RGB')
        source_width, source_height = image.size
        if crop:
            side = min(size, source_width, source_height)
            # برش مربع با گرایش به بالای تصویر (چهره در پرتره‌ها حفظ شود)
            image = ImageOps.fit(
                image, (side, side), Image.LANCZOS, centering=(0.5, 0.28),
            )
        else:
            image.thumbnail((size, size), Image.LANCZOS)
        # فقط وقتی واقعاً کوچک شده، شارپ ملایم (بدون هاله/نویز)
        downscale = max(source_width, source_height) > max(image.size) * 1.15
        if sharpen and downscale and min(image.size) >= 64:
            image = image.filter(ImageFilter.UnsharpMask(radius=0.8, percent=70, threshold=3))
        buffer = io.BytesIO()
        save_kwargs = {
            'format': 'WEBP', 'quality': WEBP_QUALITY, 'method': 6,
        }
        if icc_profile:
            save_kwargs['icc_profile'] = icc_profile
        try:
            image.save(buffer, **save_kwargs)
        except TypeError:  # Pillow قدیمی: بدون ICC
            save_kwargs.pop('icc_profile', None)
            image.save(buffer, **save_kwargs)
        return buffer.getvalue()


def photo_thumbnail(employee, size, *, request=None, crop: bool = False) -> bytes:
    """بایت‌های نسخهٔ نمایشی (با کش روی دیسک)."""
    target = cache_path(employee.pk, employee.photo.name, size, crop=crop)
    if target.exists():
        return target.read_bytes()
    data = render_photo(employee.photo.path, size, crop=crop)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return data


def photo_exists(employee) -> bool:
    try:
        return bool(employee.photo) and os.path.exists(employee.photo.path)
    except Exception:  # noqa: BLE001 — storage ناموجود/غیرمحلی نباید خطا بدهد
        return False


IMAGE_MIME_BY_FORMAT = {
    'JPEG': ('image/jpeg', '.jpg'),
    'MPO': ('image/jpeg', '.jpg'),
    'PNG': ('image/png', '.png'),
    'WEBP': ('image/webp', '.webp'),
    'GIF': ('image/gif', '.gif'),
    'BMP': ('image/bmp', '.bmp'),
    'TIFF': ('image/tiff', '.tif'),
}


def source_media(employee):
    """نوع واقعی فایل اصلی (پسوند فایل‌های آپلودی همیشه قابل‌اعتماد نیست)."""
    path = employee.photo.path
    image_format = None
    try:
        from PIL import Image

        with Image.open(path) as image:
            image_format = image.format
    except Exception:  # noqa: BLE001
        image_format = None
    if image_format in IMAGE_MIME_BY_FORMAT:
        return IMAGE_MIME_BY_FORMAT[image_format]
    import mimetypes

    content_type = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    return content_type, os.path.splitext(path)[1] or ''


def photo_version(employee) -> str:
    """نسخهٔ کش‌شکن برای URL (با تغییر فایل عکس عوض می‌شود)."""
    name = getattr(employee.photo, 'name', '') or ''
    return hashlib.sha1(name.encode('utf-8')).hexdigest()[:10]


def signed_photo_url(
    employee, request, *, size: int = DEFAULT_SIZE, full: bool = False,
    crop: bool = False,
) -> str:
    """URL امضاشدهٔ عکس (نمایشی WebP یا فایل اصلی با ``full=1``)."""
    from employees.photo_tokens import sign_employee

    if not request or not photo_exists(employee):
        return ''
    token = sign_employee(employee.pk)
    params = [
        f'v={photo_version(employee)}',
        f'cv={RENDER_VERSION}',
        f't={token}',
    ]
    if full:
        params.insert(0, 'full=1')
    else:
        params.insert(0, f'size={clamp_size(size)}')
        if crop:
            params.insert(1, 'crop=1')
    path = f'/api/employees/{employee.pk}/photo/?{"&".join(params)}'
    return request.build_absolute_uri(path)


def photo_url(
    employee, request=None, *, size: int = DEFAULT_SIZE, crop: bool = False,
) -> str:
    """URL نمایشی عکس پرسنلی =نسخهٔ شارپ/WebP= با fallback به فایل اصلی."""
    if not getattr(employee, 'photo', None):
        return ''
    try:
        signed = signed_photo_url(employee, request, size=size, crop=crop)
    except Exception:  # noqa: BLE001 — نبود فایل/تنظیمات نباید پاسخ API را بشکند
        signed = ''
    if signed:
        return signed
    try:
        return request.build_absolute_uri(employee.photo.url) if request else employee.photo.url
    except (ValueError, AttributeError):
        return ''


def photo_full_url(employee, request=None) -> str:
    """URL امضاشدهٔ فایل اصلی (برای نمایش تمام‌کیفیت/دانلود)."""
    if not getattr(employee, 'photo', None):
        return ''
    try:
        return signed_photo_url(employee, request, full=True)
    except Exception:  # noqa: BLE001
        return ''
