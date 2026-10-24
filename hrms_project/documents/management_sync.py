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
import time

from django.core.files.storage import default_storage

from documents.models import (
    Document, DocumentActivity, DocumentFolder, DocumentVersion,
    ManagedDocument, OrganizationDocument,
)
from documents.management_storage import DOCUMENTS_STORAGE_MODULE_KEY

_HASHED_NAME = re.compile(r'^[0-9a-f]{24,}$', re.IGNORECASE)
_RECONCILE_CACHE = {}


def _normalize_path(value):
    return str(value or '').replace('\\', '/').strip('/')


def _source_maps(company_id):
    """نگاشت مسیر فیزیکی فایل به رکورد منبع (پرسنلی/سازمانی)."""
    employee_documents = {}
    queryset = (
        Document.objects.filter(company_id=company_id)
        .exclude(file='')
        .select_related('employee', 'document_type')
    )
    for document in queryset.iterator(chunk_size=500):
        path = _normalize_path(document.file.name)
        if path:
            employee_documents[path] = document

    organization_documents = {}
    queryset = (
        OrganizationDocument.objects.filter(company_id=company_id)
        .exclude(file='')
        .select_related('employee')
    )
    for document in queryset.iterator(chunk_size=500):
        path = _normalize_path(document.file.name)
        if path:
            organization_documents[path] = document

    return employee_documents, organization_documents


def _employee_label(document):
    employee = getattr(document, 'employee', None)
    if not employee:
        return document.title[:200]
    return (
        getattr(employee, 'full_name', '')
        or f'{employee.first_name} {employee.last_name}'.strip()
        or document.title
    )[:200]


def _employee_type_name(document):
    document_type = getattr(document, 'document_type', None)
    return str(getattr(document_type, 'name', '') or '')[:150]


def reconcile_indexed_sources(company, *, purge_missing=True, force=False, max_age=60):
    """اتصال رکوردهای ایندکس‌شده به منبع و حذف ایندکس‌های فایل‌نداشته.

    حذف مدرک پرسنلی از مسیر FK منبع به‌صورت آبشاری انجام می‌شود؛ این تابع
    رکوردهای قدیمی (قبل از ایجاد رابطه) و ایندکس‌های یتیم را ترمیم می‌کند.
    """
    company_id = getattr(company, 'pk', company)
    empty = {'linked': 0, 'purged': 0}
    if not company_id:
        return empty

    now = time.monotonic()
    if not force and now - _RECONCILE_CACHE.get(company_id, 0) < max_age:
        return empty
    _RECONCILE_CACHE[company_id] = now

    employee_documents, organization_documents = _source_maps(company_id)
    stale_ids = []
    updates = []
    linked = 0

    queryset = (
        ManagedDocument.objects.filter(company_id=company_id, is_indexed=True)
        .select_related('current_version')
    )
    for managed in queryset.iterator(chunk_size=500):
        path = _normalize_path(managed.storage_path)
        if not path and managed.current_version_id:
            path = _normalize_path(managed.current_version.file.name)

        if path and purge_missing:
            try:
                file_exists = default_storage.exists(path)
            except Exception:  # noqa: BLE001 — خطای استوریج نباید فهرست را بشکند
                file_exists = True
            if not file_exists:
                stale_ids.append(managed.pk)
                continue

        document = employee_documents.get(path) if path else None
        organization_document = organization_documents.get(path) if path else None
        changed = False

        if document:
            label = _employee_label(document)
            if managed.source_document_id != document.pk:
                managed.source_document_id = document.pk
                changed = True
            if managed.source_organization_document_id:
                managed.source_organization_document_id = None
                changed = True
            if managed.related_entity_type != 'employee':
                managed.related_entity_type = 'employee'
                changed = True
            related_id = str(document.employee_id or '')
            if managed.related_entity_id != related_id:
                managed.related_entity_id = related_id
                changed = True
            if managed.related_entity_label != label:
                managed.related_entity_label = label
                changed = True
            if managed.document_type != ManagedDocument.DocumentType.HR:
                managed.document_type = ManagedDocument.DocumentType.HR
                changed = True
        elif organization_document:
            label = (organization_document.title or '')[:200]
            if managed.source_organization_document_id != organization_document.pk:
                managed.source_organization_document_id = organization_document.pk
                changed = True
            if managed.source_document_id:
                managed.source_document_id = None
                changed = True
            if managed.related_entity_type != 'organization_document':
                managed.related_entity_type = 'organization_document'
                changed = True
            related_id = str(organization_document.pk)
            if managed.related_entity_id != related_id:
                managed.related_entity_id = related_id
                changed = True
            if managed.related_entity_label != label:
                managed.related_entity_label = label
                changed = True

        if changed:
            updates.append(managed)
            linked += 1

    if updates:
        ManagedDocument.objects.bulk_update(
            updates,
            [
                'source_document', 'source_organization_document',
                'related_entity_type', 'related_entity_id',
                'related_entity_label', 'document_type',
            ],
            batch_size=500,
        )

    if stale_ids:
        ManagedDocument.objects.filter(pk__in=stale_ids).delete()

    return {'linked': linked, 'purged': len(stale_ids)}



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

    # ابتدا رکوردهای قدیمی را به منبع متصل و ایندکس‌های فایل‌نداشته را پاک کن.
    reconcile_indexed_sources(company, force=True)
    employee_documents, organization_documents = _source_maps(company_id)

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

            employee_document = employee_documents.get(relative)
            organization_document = organization_documents.get(relative)
            title = (
                (employee_document.title if employee_document else '')
                or (organization_document.title if organization_document else '')
                or _display_title(filename, entity_parts, module_name)
            )[:250]
            type_name = _employee_type_name(employee_document) if employee_document else ''
            if employee_document:
                related_entity_type = 'employee'
                related_entity_id = str(employee_document.employee_id or '')
                related_entity_label = _employee_label(employee_document)
            elif organization_document:
                related_entity_type = 'organization_document'
                related_entity_id = str(organization_document.pk)
                related_entity_label = (organization_document.title or '')[:200]
            else:
                related_entity_type = module_key[:50]
                related_entity_id = ''
                related_entity_label = (
                    entity_parts[-1][:200] if entity_parts else module_name[:200]
                )

            try:
                size = os.path.getsize(absolute)
                mime = mimetypes.guess_type(filename)[0] or ''
            except OSError:
                skipped += 1
                continue

            description = f'فایل موجود در بایگانی ماژول {module_name}'
            if type_name:
                description = f'{description} · نوع مدرک: {type_name}'
            tags = f'{module_name}, بایگانی, واردشده'
            if type_name:
                tags = f'{tags}, {type_name}'

            document = ManagedDocument.objects.create(
                company_id=company_id,
                folder=folder,
                title=title,
                description=description,
                tags=tags,
                document_type=(
                    ManagedDocument.DocumentType.HR
                    if employee_document
                    else _document_type_for(module_key, module_root)
                ),
                owner_department=module_name[:150],
                related_entity_type=related_entity_type[:50],
                related_entity_id=related_entity_id,
                related_entity_label=related_entity_label,
                source_document=employee_document,
                source_organization_document=organization_document,
                confidentiality=ManagedDocument.Confidentiality.INTERNAL,
                status=ManagedDocument.Status.ACTIVE,
                workflow_status=ManagedDocument.WorkflowStatus.PUBLISHED,
                is_controlled=False,
                metadata={
                    'legacy_indexed': True,
                    'source': 'archive_sync',
                    'source_document_type_name': type_name,
                },
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
