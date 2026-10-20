"""پل اتصال مدیریت اسناد به پروفایل بایگانی ماژول‌ها در «تنظیمات و تعاریف».

قوانین مسیر، الگوی پوشه، فرمت‌ها و سقف حجم از StorageProfile خوانده می‌شود؛
اگر هنوز پروفایل ساخته نشده باشد، نسخهٔ پیش‌فرض DMS ساخته می‌شود.
"""
from __future__ import annotations

import os

DOCUMENTS_STORAGE_MODULE_KEY = 'hr.documents.management'

DEFAULT_DOCUMENTS_STORAGE_PROFILE = {
    'module_key': DOCUMENTS_STORAGE_MODULE_KEY,
    'module_name': 'مدیریت اسناد و مدارک',
    'root_folder': 'documents',
    'entity_folder_pattern': '{folder}_{name}',
    'subfolders': ['نسخه‌ها', 'پیوست‌ها', 'فایل‌های موقت'],
    'allowed_extensions': [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
        '.zip', '.rar',
    ],
    'max_file_size_mb': 50,
    'include_company': True,
    'color': '#0f766e',
    'icon': 'folder_copy',
    'sort_order': 9,
    'description': 'پروفایل بایگانی کتابخانهٔ مرکزی مدیریت اسناد و مدارک',
}


def get_documents_storage_profile(company_id):
    """پروفایل بایگانی DMS را برمی‌گرداند و در صورت نبود، می‌سازد."""
    if not company_id:
        return None
    try:
        from settings_app.models import StorageProfile

        profile = StorageProfile.objects.filter(
            company_id=company_id,
            module_key=DOCUMENTS_STORAGE_MODULE_KEY,
        ).first()
        if profile:
            return profile
        return StorageProfile.objects.create(
            company_id=company_id,
            **DEFAULT_DOCUMENTS_STORAGE_PROFILE,
        )
    except Exception:  # noqa: BLE001 — نبود جدول تنظیمات نباید آپلود را بشکند
        return None


def normalize_extensions(profile, fallback):
    """فرمت‌های profile را به مجموعهٔ پسوندهای نقطه‌دار تبدیل می‌کند."""
    values = getattr(profile, 'allowed_extensions', None) or fallback or []
    normalized = set()
    for value in values:
        text = str(value or '').strip().lower()
        if not text:
            continue
        normalized.add(text if text.startswith('.') else f'.{text}')
    return normalized


def storage_policy_dict(profile):
    """خلاصهٔ قابل نمایش سیاست ذخیره‌سازی برای API/UI."""
    if not profile:
        return None
    root = getattr(profile, 'root_folder', '') or ''
    include_company = bool(getattr(profile, 'include_company', True))
    return {
        'module_key': getattr(profile, 'module_key', ''),
        'module_name': getattr(profile, 'module_name', ''),
        'root_folder': root,
        'entity_folder_pattern': getattr(profile, 'entity_folder_pattern', ''),
        'subfolders': list(getattr(profile, 'subfolders', None) or []),
        'allowed_extensions': list(getattr(profile, 'allowed_extensions', None) or []),
        'max_file_size_mb': getattr(profile, 'max_file_size_mb', 50) or 50,
        'include_company': include_company,
        'path_preview': f'company_{profile.company_id}/{root}'.strip('/') if include_company else root,
    }


def storage_fields(document):
    """متغیرهای الگوی نام پوشه را از سند DMS می‌سازد."""
    folder = getattr(document, 'folder', None)
    folder_path = getattr(folder, 'path', '') if folder else 'عمومی'
    issue_date = getattr(document, 'issue_date', None)
    return {
        'folder': folder_path or 'عمومی',
        'category': getattr(folder, 'name', '') if folder else 'عمومی',
        'name': getattr(document, 'title', '') or '',
        'title': getattr(document, 'title', '') or '',
        'number': getattr(document, 'reference_number', '') or '',
        'id': getattr(document, 'pk', '') or '',
        'year': getattr(issue_date, 'year', '') if issue_date else '',
        'month': getattr(issue_date, 'month', '') if issue_date else '',
    }


def validate_upload(profile, upload, fallback_extensions):
    """اعتبارسنجی فایل بر اساس profile؛ پیام خطا یا None برمی‌گرداند."""
    if not upload:
        return None
    extension = os.path.splitext(upload.name or '')[1].lower()
    allowed = normalize_extensions(profile, fallback_extensions)
    if allowed and extension not in allowed:
        return 'فرمت فایل مجاز نیست. فرمت‌های مجاز: ' + '، '.join(sorted(item.lstrip('.') for item in allowed))
    max_mb = (getattr(profile, 'max_file_size_mb', None) or 50) if profile else 50
    if upload.size > max_mb * 1024 * 1024:
        return f'حجم فایل نباید بیشتر از {max_mb} مگابایت باشد.'
    return None
