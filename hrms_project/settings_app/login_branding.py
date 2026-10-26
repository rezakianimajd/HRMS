"""ظاهر صفحهٔ ورود: تصویر پس‌زمینه، رنگ پوشش (فید) و رنگ متن.

این تنظیمات در همان الگوی «تنظیمات سیستمی» (``SystemSetting`` با ``data_type=json``)
ذخیره می‌شوند؛ بنابراین بدون تغییر ساختار دیتابیس و بدون مایگریشن در دسترس‌اند و
مثل بقیهٔ تنظیمات برای هر شرکت جدا نگه داشته می‌شوند.

قواعد:
* فقط رنگ‌های هگز ۶ رقمی پذیرفته می‌شوند و مقدار نامعتبر به پیش‌فرض برمی‌گردد.
* شفافیت پوشش بین ۰ تا ۹۵ درصد محدود می‌شود (۱۰۰٪ تصویر را کامل می‌پوشاند).
* ``background_url`` فقط آدرس http(s) یا مسیر نسبیِ امن را می‌پذیرد تا از
  تزریق ``javascript:`` در استایل جلوگیری شود.
"""
import json
import os
import re
import uuid

from django.conf import settings
from django.core.files.storage import default_storage

from settings_app.engines.settings_engine import SettingsEngine

LOGIN_BRANDING_KEY = 'LOGIN_BRANDING'
LOGIN_BRANDING_DESCRIPTION = 'ظاهر صفحهٔ ورود: تصویر پس‌زمینه، رنگ پوشش و رنگ متن'

HEX_COLOR = re.compile(r'^#[0-9a-fA-F]{6}$')
SAFE_URL = re.compile(r'^(?:(?:https?:)?//|/)[^\s"\'<>()]*$')
UPLOAD_DIR = 'login_branding'
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_UPLOAD_BYTES = 6 * 1024 * 1024
MAX_OVERLAY_OPACITY = 95

DEFAULT_LOGIN_BRANDING = {
    'background_url': '',
    'overlay_color': '#07101f',
    'overlay_opacity': 72,
    'text_color': '#ffffff',
    'accent_color': '#a5b4fc',
}


class BackgroundUploadError(ValueError):
    """خطای اعتبارسنجی فایل پس‌زمینهٔ صفحهٔ ورود."""


def _color(value, fallback):
    if isinstance(value, str) and HEX_COLOR.fullmatch(value.strip()):
        return value.strip().lower()
    return fallback


def _opacity(value, fallback):
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError):
        return fallback
    return max(0, min(MAX_OVERLAY_OPACITY, number))


def _url(value, fallback=''):
    if not isinstance(value, str):
        return fallback
    candidate = value.strip()
    return candidate if SAFE_URL.fullmatch(candidate) else fallback


def sanitize_login_branding(raw):
    """ورودی خام → تنظیمات معتبر (کلیدهای ناشناخته حذف می‌شوند)."""
    source = raw if isinstance(raw, dict) else {}
    return {
        'background_url': _url(source.get('background_url'), DEFAULT_LOGIN_BRANDING['background_url']),
        'overlay_color': _color(source.get('overlay_color'), DEFAULT_LOGIN_BRANDING['overlay_color']),
        'overlay_opacity': _opacity(source.get('overlay_opacity'), DEFAULT_LOGIN_BRANDING['overlay_opacity']),
        'text_color': _color(source.get('text_color'), DEFAULT_LOGIN_BRANDING['text_color']),
        'accent_color': _color(source.get('accent_color'), DEFAULT_LOGIN_BRANDING['accent_color']),
    }


def _stored_dict(company):
    stored = SettingsEngine.get_setting(LOGIN_BRANDING_KEY, company, default={})
    if isinstance(stored, str):
        try:
            stored = json.loads(stored) if stored.strip() else {}
        except (TypeError, ValueError):
            stored = {}
    return stored if isinstance(stored, dict) else {}


def read_login_branding(company):
    """تنظیمات ظاهر لاگین برای یک شرکت (با پیش‌فرض‌های امن)."""
    if not company:
        return dict(DEFAULT_LOGIN_BRANDING)
    return sanitize_login_branding(_stored_dict(company))


def _persist(company, branding):
    SettingsEngine.set_setting(
        LOGIN_BRANDING_KEY, branding, company,
        description=LOGIN_BRANDING_DESCRIPTION, data_type='json', is_editable=False,
    )
    return branding


def save_login_branding(company, payload):
    """ذخیرهٔ رنگ‌ها/شفافیت؛ تصویر فقط از مسیر آپلود یا پاک‌سازی تغییر می‌کند."""
    current = read_login_branding(company)
    incoming = payload if isinstance(payload, dict) else {}
    merged = dict(current)
    for key in ('overlay_color', 'overlay_opacity', 'text_color', 'accent_color'):
        if key in incoming:
            merged[key] = incoming[key]
    if 'background_url' in incoming and not incoming.get('background_url'):
        merged['background_url'] = ''
    return _persist(company, sanitize_login_branding(merged))


def _validate_upload(upload):
    if not upload:
        raise BackgroundUploadError('فایل تصویر پس‌زمینه الزامی است.')
    content_type = str(getattr(upload, 'content_type', '') or '').lower()
    if content_type and not content_type.startswith('image/'):
        raise BackgroundUploadError('فقط فایل تصویری مجاز است.')
    extension = os.path.splitext(getattr(upload, 'name', '') or '')[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise BackgroundUploadError('فرمت تصویر باید JPG، PNG یا WEBP باشد.')
    size = getattr(upload, 'size', 0) or 0
    if size > MAX_UPLOAD_BYTES:
        raise BackgroundUploadError('حجم تصویر نباید بیشتر از ۶ مگابایت باشد.')
    return extension


def _storage_name_from_url(url):
    """تبدیل URL عمومی به مسیر ذخیره‌سازی؛ فقط داخل پوشهٔ login_branding مجاز است."""
    if not isinstance(url, str) or not url:
        return ''
    media_url = str(getattr(settings, 'MEDIA_URL', '/media/') or '/media/')
    if not url.startswith(media_url):
        return ''
    name = url[len(media_url):].lstrip('/')
    return name if name.startswith(f'{UPLOAD_DIR}/') else ''


def _remove_file(url):
    name = _storage_name_from_url(url)
    if not name:
        return
    try:
        if default_storage.exists(name):
            default_storage.delete(name)
    except Exception:  # noqa: BLE001 — حذف فایل قدیمی نباید ذخیرهٔ تنظیمات را بشکند
        pass


def store_login_background(company, upload):
    """ذخیرهٔ تصویر جدید، حذف تصویر قبلی و برگرداندن تنظیمات به‌روزشده."""
    extension = _validate_upload(upload)
    current = read_login_branding(company)
    _remove_file(current.get('background_url'))

    folder = f'{UPLOAD_DIR}/company_{getattr(company, "pk", "unknown")}'
    try:
        name = default_storage.save(f'{folder}/{uuid.uuid4().hex}{extension}', upload)
        url = default_storage.url(name)
    except Exception as exc:  # noqa: BLE001
        raise BackgroundUploadError('ذخیرهٔ تصویر انجام نشد.') from exc

    return _persist(company, {**current, 'background_url': url})


def clear_login_background(company):
    """حذف تصویر پس‌زمینه (رنگ‌ها دست‌نخورده می‌مانند)."""
    current = read_login_branding(company)
    _remove_file(current.get('background_url'))
    return _persist(company, {**current, 'background_url': ''})
