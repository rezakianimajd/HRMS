"""ایندکس فایل‌های موجود در پروفایل‌های بایگانی ماژول‌ها در کتابخانه DMS.

فایل‌های هر ماژول در مسیر
``archive/company_<id>/<root_folder>/<entity>/...`` قرار دارند. این ماژول
آن‌ها را بدون کپی‌کردن فایل، به‌صورت سند و نسخهٔ DMS ثبت می‌کند تا در
کتابخانه، جست‌وجو، آمار و تاریخچه دیده شوند.
"""
from __future__ import annotations

import mimetypes
import os
import re

from documents.models import (
    DocumentActivity, DocumentFolder, DocumentVersion, ManagedDocument,
)
from documents.management_storage import DOCUMENTS_STORAGE_MODULE_KEY

_HASHED_NAME = re.compile(r'^[0-9a-f]{24,}$', re.IGNORECASE)


def _get_or_create_folder(company_id, parent, name, code='', color='#64748b'):
    name = str(name or '').strip()[:150] or 'عمومی'
    folder = DocumentFolder.objects.filter(
        company_id=company_id, parent=parent, name=name,
    ).first()
    if folder:
        return folder
    return DocumentFolder.objects.create(
        company_id=company_id, parent=parent, name=name, code=code[:50],
        color=color or '#64748b', is_system=True,
    )


def _display_title(filename, entity_parts, module_name):
    stem = os.path.splitext(filename)[0] or filename
    if _HASHED_NAME.fullmatch(stem):
        label = entity_parts[-1] if entity_parts else module_name
        return f'{label} - {stem[:8]}'
    return stem[:245]


def _profile_for_root(profiles, root_key):
    return next(
        (profile for profile in profiles if (profile.root_folder or '').strip('/') == root_key),
        None,
    )


def _document_type_for(module_key, module_root):
    """نوع منطقی سند را از ماژول منبع استنباط می‌کند (نه از مسیر فیزیکی)."""
    key = f'{module_key} {module_root}'.lower()
    if 'contract' in key or 'قرارداد' in key:
        return ManagedDocument.DocumentType.CONTRACT
    if 'project' in key or 'پروژه' in key:
        return ManagedDocument.DocumentType.PROJECT
    if any(part in key for part in ('employee', 'personnel', 'hr.', 'hr_', 'پرسنل')):
        return ManagedDocument.DocumentType.HR
    if any(part in key for part in ('account', 'financ', 'treasury', 'invoice', 'حساب', 'مالی')):
        return ManagedDocument.DocumentType.FINANCIAL
    if 'quality' in key or 'iso' in key or 'کیفیت' in key:
        return ManagedDocument.DocumentType.QUALITY
    if 'document' in key or 'company' in key or 'شرکت' in key:
        return ManagedDocument.DocumentType.COMPANY
    return ManagedDocument.DocumentType.OTHER


def sync_archive_files(company, max_files=5000):
    """فایل‌های موجود در archive را در DMS ایندکس می‌کند."""
    if not company:
        return {'scanned': 0, 'created': 0, 'skipped': 0, 'truncated': False}
    company_id = getattr(company, 'pk', company)
    try:
        from core.engines.archive_storage_engine import archive_engine
        from settings_app.models import StorageProfile

        from documents.management_folders import ensure_default_document_folders

        ensure_default_document_folders(company)
    except Exception:  # noqa: BLE001
        return {'scanned': 0, 'created': 0, 'skipped': 0, 'truncated': False}

    media_root = os.path.abspath(archive_engine.media_root)
    company_root = os.path.abspath(archive_engine.company_root(company_id, True))
    if not os.path.isdir(company_root):
        return {'scanned': 0, 'created': 0, 'skipped': 0, 'truncated': False}

    profiles = list(StorageProfile.objects.filter(company_id=company_id, is_active=True))
    existing = set(
        ManagedDocument.objects.filter(company_id=company_id)
        .exclude(storage_path='')
        .values_list('storage_path', flat=True)
    )
    module_cache = {}
    scanned = created = skipped = 0
    truncated = False

    for root, _dirs, files in os.walk(company_root):
        for filename in files:
            if scanned >= max_files:
                truncated = True
                break
            absolute = os.path.join(root, filename)
            relative = os.path.relpath(absolute, media_root).replace('\\', '/')
            scanned += 1
            if relative in existing:
                skipped += 1
                continue

            parts = relative.split('/')
            if len(parts) < 5 or parts[0] != 'archive' or not parts[1].startswith('company_'):
                skipped += 1
                continue
            module_root = parts[2]
            if module_root == 'documents':
                # فایل‌های خود DMS از قبل رکورد اختصاصی دارند.
                skipped += 1
                continue

            profile = _profile_for_root(profiles, module_root)
            if profile and profile.module_key == DOCUMENTS_STORAGE_MODULE_KEY:
                skipped += 1
                continue

            module_name = profile.module_name if profile else module_root
            module_key = profile.module_key if profile else f'archive.{module_root}'
            color = getattr(profile, 'color', '') or '#64748b'
            entity_parts = parts[3:-1]

            if module_key not in module_cache:
                module_cache[module_key] = _get_or_create_folder(
                    company_id, None, module_name, code=module_key, color=color,
                )
            folder = module_cache[module_key]
            for segment in entity_parts:
                folder = _get_or_create_folder(
                    company_id, folder, segment, code='', color=color,
                )

            title = _display_title(filename, entity_parts, module_name)
            try:
                size = os.path.getsize(absolute)
                mime = mimetypes.guess_type(filename)[0] or ''
            except OSError:
                skipped += 1
                continue

            document = ManagedDocument.objects.create(
                company_id=company_id,
                folder=folder,
                title=title,
                description=f'فایل موجود در بایگانی ماژول {module_name}',
                tags=f'{module_name}, بایگانی, واردشده',
                document_type=_document_type_for(module_key, module_root),
                owner_department=module_name[:150],
                related_entity_type=module_key[:50],
                related_entity_label=(entity_parts[-1][:200] if entity_parts else module_name[:200]),
                confidentiality=ManagedDocument.Confidentiality.INTERNAL,
                status=ManagedDocument.Status.ACTIVE,
                workflow_status=ManagedDocument.WorkflowStatus.PUBLISHED,
                is_controlled=False,
                metadata={'legacy_indexed': True, 'source': 'archive_sync'},
                source_module_key=module_key,
                storage_path=relative,
                is_indexed=True,
            )
            version = DocumentVersion.objects.create(
                company_id=company_id,
                document=document,
                version_number=1,
                file=relative,
                original_name=filename,
                file_size=size,
                mime_type=mime,
                change_note='ایندکس‌شده از بایگانی موجود',
            )
            document.current_version = version
            document.version_count = 1
            document.save(update_fields=['current_version', 'version_count', 'updated_at'])
            DocumentActivity.objects.create(
                company_id=company_id, document=document,
                action=DocumentActivity.Action.CREATE,
                details={'source': 'archive_sync', 'storage_path': relative},
            )
            existing.add(relative)
            created += 1
        if truncated:
            break

    return {
        'scanned': scanned,
        'created': created,
        'skipped': skipped,
        'truncated': truncated,
    }
