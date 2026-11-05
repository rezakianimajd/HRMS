"""بارگذاری پیوست‌های نامه‌ها از فایل اکسل بر اساس هایپرلینک هر ردیف.

سناریو: فهرست نامه‌های وارده در اکسل است و در هر ردیف یک هایپرلینک به فایل
اسکن همان نامه وجود دارد (مسیر شبکه‌ای، مسیر محلی یا آدرس http). این ماژول
لینک‌ها را می‌خواند، فایل را از مسیر/آدرس می‌گیرد و به‌صورت
:class:`correspondences.models.LetterAttachment` به نامهٔ همان ردیف وصل می‌کند.

بخش‌های خالص (تشخیص نوع لینک، نام فایل، حدس نوع پیوست) جدا نگه داشته شده‌اند تا
بدون دیتابیس هم تست شوند.
"""
import hashlib
import mimetypes
import os
import re
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlparse

FILE_SIZE_LIMIT = 80 * 1024 * 1024        # حداکثر حجم هر پیوست (۸۰ مگابایت)
_LINK_RE = re.compile(r'^(file|https?|ftp)://', re.IGNORECASE)


def parse_link(raw, base_dir=None):
    """لینک خام سلول → ``(kind, value, filename)``.

    kind: ``file`` | ``url`` | ``none``. برای مسیرهای نسبی، ``base_dir`` مبنا است.
    """
    text = str(raw or '').strip()
    if not text:
        return 'none', '', ''
    if text.lower().startswith('file:'):
        parsed = urlparse(text)
        path = unquote(parsed.path or '')
        if path.startswith('/') and re.match(r'^/[A-Za-z]:', path):
            path = path[1:]                     # /C:/... → C:/...
        if parsed.netloc and parsed.netloc not in ('', 'localhost'):
            path = f'//{parsed.netloc}{path}'   # UNC: file://server/share/...
        return 'file', path, Path(path).name
    if _LINK_RE.match(text):
        return 'url', text, Path(unquote(urlparse(text).path)).name
    # مسیر ویندوزی/شبکه‌ای یا مسیر نسبی
    candidate = Path(text)
    if not candidate.is_absolute() and base_dir:
        candidate = Path(base_dir) / text
    return 'file', str(candidate), candidate.name


def safe_filename(name, fallback='attachment'):
    """نام فایل امن (بدون نویسه‌های غیرمجاز و طول محدود)."""
    text = unicodedata.normalize('NFC', str(name or '')).strip()
    text = text.replace('\\', '/').split('/')[-1]
    text = re.sub(r'[\x00-\x1f<>:"|?*]+', '_', text).strip(' .')
    if not text:
        text = fallback
    stem, dot, suffix = text.rpartition('.')
    if not dot:
        stem, suffix = text, ''
    stem = stem[:120] or fallback
    return f'{stem}.{suffix[:16]}' if suffix else stem


def guess_kind(filename, default='attachment'):
    """نوع پیوست از پسوند فایل (فقط بین گزینه‌های مجاز مدل)."""
    extension = Path(str(filename or '')).suffix.lower()
    if extension in ('.pdf', '.tif', '.tiff', '.jpg', '.jpeg', '.png', '.bmp', '.gif'):
        return 'letter'
    if extension in ('.xlsx', '.xls', '.csv', '.doc', '.docx', '.txt'):
        return 'attachment'
    return default if default in ('letter', 'attachment', 'receipt', 'other') else 'attachment'


def content_type_of(filename):
    guessed, _ = mimetypes.guess_type(str(filename or ''))
    return guessed or 'application/octet-stream'


def read_bytes(kind, value, timeout=60):
    """خواندن محتوای فایل از مسیر محلی/شبکه‌ای یا دانلود از آدرس.

    خروجی ``(content, filename)``؛ خطاها به‌صورت ``RuntimeError`` با پیام فارسی.
    """
    if kind == 'file':
        path = Path(value)
        if not path.exists():
            raise RuntimeError(f'فایل یافت نشد: {value}')
        if not path.is_file():
            raise RuntimeError(f'مسیر یک فایل نیست: {value}')
        size = path.stat().st_size
        if size > FILE_SIZE_LIMIT:
            raise RuntimeError(f'حجم فایل بیش از حد مجاز است ({size} بایت): {value}')
        return path.read_bytes(), safe_filename(path.name)
    if kind == 'url':
        import urllib.request

        request = urllib.request.Request(
            value, headers={'User-Agent': 'HRMS-letter-attachment-import/1.0'},
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                content = response.read(FILE_SIZE_LIMIT + 1)
                disposition = response.headers.get('Content-Disposition') or ''
        except Exception as exc:                        # noqa: BLE001
            raise RuntimeError(f'دریافت فایل از آدرس ممکن نشد: {value} ({exc})') from exc
        if len(content) > FILE_SIZE_LIMIT:
            raise RuntimeError(f'حجم فایل دانلودشده بیش از حد مجاز است: {value}')
        filename = ''
        match = re.search(r'filename="?([^";]+)"?', disposition)
        if match:
            filename = unquote(match.group(1))
        if not filename:
            filename = Path(unquote(urlparse(value).path)).name
        return content, safe_filename(filename)
    raise RuntimeError('لینک معتبر نیست')


def fingerprint(content):
    """اثر انگشت محتوا برای جلوگیری از بارگذاری تکراری."""
    return hashlib.sha256(content).hexdigest()
