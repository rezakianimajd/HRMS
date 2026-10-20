"""ساخت ساختار پیش‌فرض کتابخانهٔ اسناد.

ساختار:
  * «مدارک و مستندات شرکت» + زیرپوشه‌های ثبتی، حقوقی، هیئت‌مدیره و ...
  * یک پوشهٔ ریشه برای هر ماژول فعال بر اساس StorageProfile آن ماژول
  * زیرپوشه‌های پیش‌فرض همان StorageProfile در داخل پوشهٔ ماژول

همهٔ پوشه‌ها با is_system=True ساخته می‌شوند تا حذف تصادفی نشوند.
"""
from __future__ import annotations

from documents.management_storage import DOCUMENTS_STORAGE_MODULE_KEY
from documents.models import DocumentFolder


COMPANY_DOCUMENTS_FOLDER = 'مدارک و مستندات شرکت'
COMPANY_DOCUMENT_SUBFOLDERS = [
    ('روزنامه‌های رسمی', '#b45309'),
    ('مدارک هیئت مدیره', '#7c3aed'),
    ('مدارک ثبت شرکت', '#2563eb'),
    ('اساسنامه و صورتجلسات', '#0ea5e9'),
    ('مدارک سهامداران و سرمایه', '#8b5cf6'),
    ('مجوزها و پروانه‌ها', '#0f766e'),
    ('اظهارنامه‌های مالیاتی', '#be123c'),
    ('گزارش‌های حسابرسی', '#ef4444'),
    ('بیمه و تأمین اجتماعی', '#14b8a6'),
    ('اسناد بانکی', '#6366f1'),
    ('اسناد ملکی و دارایی‌ها', '#f97316'),
    ('مکاتبات رسمی', '#64748b'),
    ('سایر مدارک شرکت', '#94a3b8'),
]


def _ensure_folder(company_id, parent, name, *, code='', color='#64748b', order=0, icon='folder'):
    name = str(name or '').strip()[:150]
    if not name:
        return None
    folder = DocumentFolder.objects.filter(
        company_id=company_id, parent=parent, name=name,
    ).first()
    if folder:
        updates = []
        if code and not folder.code:
            folder.code = code[:50]
            updates.append('code')
        if not folder.is_system:
            folder.is_system = True
            updates.append('is_system')
        if updates:
            folder.save(update_fields=updates)
        return folder
    return DocumentFolder.objects.create(
        company_id=company_id, parent=parent, name=name,
        code=(code or '')[:50], color=color or '#64748b',
        icon=(icon or 'folder')[:50], order=order, is_system=True,
    )


def ensure_default_document_folders(company):
    """ساخت/ترمیم ساختار پوشه‌های پیش‌فرض DMS برای یک شرکت."""
    if not company:
        return
    company_id = getattr(company, 'pk', company)

    # ساخت پروفایل‌های پیش‌فرض در صورت نبود
    profiles = []
    try:
        from settings_app.models import StorageProfile, default_storage_profiles

        if not StorageProfile.objects.filter(company_id=company_id).exists():
            for item in default_storage_profiles():
                StorageProfile.objects.get_or_create(
                    company_id=company_id, module_key=item['module_key'],
                    defaults=item,
                )
        profiles = list(
            StorageProfile.objects.filter(company_id=company_id, is_active=True)
            .order_by('sort_order', 'module_name')
        )
    except Exception:  # noqa: BLE001 — نبود تنظیمات نباید کتابخانه را بشکند
        profiles = []

    # پوشهٔ مرکزی مستندات شرکت
    company_root = _ensure_folder(
        company_id, None, COMPANY_DOCUMENTS_FOLDER,
        code='company.documents', color='#0f172a', order=0, icon='corporate_fare',
    )
    for index, (name, color) in enumerate(COMPANY_DOCUMENT_SUBFOLDERS, start=1):
        _ensure_folder(
            company_id, company_root, name,
            code=f'company.documents.{index}', color=color, order=index,
        )

    # یک ریشه برای هر ماژول و زیرپوشه‌های استاندارد همان ماژول
    for profile in profiles:
        if profile.module_key == DOCUMENTS_STORAGE_MODULE_KEY:
            continue
        root = _ensure_folder(
            company_id, None, profile.module_name,
            code=profile.module_key, color=profile.color,
            order=(profile.sort_order or 0) + 1, icon=profile.icon,
        )
        for index, subfolder in enumerate(profile.subfolders or [], start=1):
            _ensure_folder(
                company_id, root, subfolder,
                code=f'{profile.module_key}.sub.{index}',
                color=profile.color, order=index,
            )

    return company_root
