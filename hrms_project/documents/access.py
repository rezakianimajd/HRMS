"""قواعد دسترسی «اسناد سازمانی».

این ماژول منطق خالص و بدون دیتابیس را نگه می‌دارد تا در تست‌های
SimpleTestCase و همچنین در ویوهای DMS قابل استفاده باشد.
"""
from __future__ import annotations

ORGANIZATION_DOCUMENTS_MENU = 'organization'
ORGANIZATION_DOCUMENTS_PERMISSION = f'documents.{ORGANIZATION_DOCUMENTS_MENU}.view'
ORGANIZATION_DOCUMENTS_ROOT_CODE = 'company.documents'


def has_organization_documents_permission(
    user, fine_permissions=None, legacy_permissions=None,
) -> bool:
    """آیا کاربر مجوز دیدن «اسناد سازمانی» را دارد؟

    اولویت با کد ریز ``documents.documents-organization.view`` است. برای
    کاربران قدیمی که هنوز هیچ کد ریز اسناد ندارند، ``can_manage_documents``
    به‌عنوان سازگاری پذیرفته می‌شود. اگر کاربر کد ریز اسناد دارد ولی همین
    منو را ندارد، دسترسی داده نمی‌شود.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True

    fine = fine_permissions or {}
    if fine.get(ORGANIZATION_DOCUMENTS_PERMISSION):
        return True

    document_codes = [
        code for code, value in fine.items()
        if value and str(code).startswith('documents.')
    ]
    if document_codes:
        return False

    legacy = legacy_permissions or {}
    return bool(legacy.get('can_manage_documents'))
