"""پیوست‌های چت: اعتبارسنجی، نام‌گذاری امن و مسیر بایگانی.

فایل‌ها در همان فضای بایگانی سازمان ذخیره می‌شوند:
``archive/company_<id>/chat/<conversation|general>/<uuid>.<ext>``.
اگر فایل از قبل در DMS است، فقط ``document`` ارجاع داده می‌شود (بدون کپی).
"""
from __future__ import annotations

import mimetypes
import os
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.text import get_valid_filename

ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.zip', '.rar',
}
EXECUTABLE_EXTENSIONS = {'.html', '.htm', '.xhtml', '.svg', '.js', '.mjs', '.xml', '.exe',
                         '.php', '.sh', '.bat', '.cmd', '.app', '.dll', '.msi'}
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'}
ARCHIVE_EXTENSIONS = {'.zip', '.rar'}

DEFAULT_MAX_MB = 25


def max_bytes() -> int:
    value = getattr(settings, 'CHAT_ATTACHMENT_MAX_MB', DEFAULT_MAX_MB)
    try:
        megabytes = max(1, int(value))
    except (TypeError, ValueError):
        megabytes = DEFAULT_MAX_MB
    return megabytes * 1024 * 1024


def extension_of(name: str) -> str:
    return os.path.splitext(str(name or ''))[1].lower()


def kind_of(name: str) -> str:
    extension = extension_of(name)
    if extension in IMAGE_EXTENSIONS:
        return 'image'
    if extension == '.pdf':
        return 'pdf'
    if extension in ARCHIVE_EXTENSIONS:
        return 'archive'
    if extension in ALLOWED_EXTENSIONS:
        return 'document'
    return 'other'


def chat_attachment_upload_path(instance, filename):
    """مسیر بایگانی: archive/company_<id>/chat/<conversation|general>/<uuid>.<ext>."""
    company_id = getattr(instance, 'company_id', None) or '0'
    conversation_id = getattr(instance, 'conversation_id', None)
    if not conversation_id:
        message = getattr(instance, 'message', None)
        conversation_id = getattr(message, 'conversation_id', None) or 'general'
    extension = extension_of(filename)
    safe_name = f'{uuid.uuid4().hex}{extension}'
    return f'archive/company_{company_id}/chat/{conversation_id}/{safe_name}'


def validate_upload(upload):
    if upload is None:
        raise ValidationError('فایلی انتخاب نشده است.')
    name = getattr(upload, 'name', '') or ''
    extension = extension_of(name)
    if not extension or extension in EXECUTABLE_EXTENSIONS or extension not in ALLOWED_EXTENSIONS:
        allowed = '، '.join(sorted(item.lstrip('.') for item in ALLOWED_EXTENSIONS))
        raise ValidationError(f'پسوند «{extension or "-"}» مجاز نیست. مجازها: {allowed}')
    size = getattr(upload, 'size', 0) or 0
    if size <= 0:
        raise ValidationError('فایل خالی است.')
    if size > max_bytes():
        limit = max_bytes() // (1024 * 1024)
        raise ValidationError(f'حجم فایل از سقف {limit} مگابایت بیشتر است.')
    return upload


def build_attachment_kwargs(item, sender=None):
    """``MessageAttachment`` kwargs از یک آیتم ورودی API.

    آیتم می‌تواند فایل تازه (``upload``) یا ارجاع به سند موجود (``document``) باشد.
    """
    if not item:
        return None
    upload = item.get('upload') if isinstance(item, dict) else None
    if upload is not None:
        validate_upload(upload)
        original = get_valid_filename(os.path.basename(getattr(upload, 'name', '')))[:255]
        return {
            'file': upload,
            'title': str(item.get('title') or original)[:200],
            'original_name': original,
            'mime_type': mimetypes.guess_type(original)[0] or '',
            'size': getattr(upload, 'size', 0) or 0,
            'kind': kind_of(original),
            'metadata': item.get('metadata') or {},
        }

    document_id = item.get('document') if isinstance(item, dict) else None
    if document_id:
        from documents.models import ManagedDocument

        document = ManagedDocument.objects.filter(pk=document_id).first()
        if not document:
            return None
        version = getattr(document, 'current_version', None)
        return {
            'document': document,
            'title': str(item.get('title') or document.title or '')[:200],
            'original_name': str(getattr(version, 'original_name', '') or '')[:255],
            'mime_type': str(getattr(version, 'mime_type', '') or ''),
            'size': int(getattr(version, 'file_size', 0) or 0),
            'kind': kind_of(getattr(version, 'original_name', '') or document.title or ''),
            'metadata': item.get('metadata') or {},
        }
    return None
