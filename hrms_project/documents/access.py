"""قواعد دسترسی «اسناد سازمانی».

این ماژول منطق خالص و بدون دیتابیس را نگه می‌دارد تا در تست‌های
SimpleTestCase و همچنین در ویوهای DMS قابل استفاده باشد.
"""
from __future__ import annotations

ORGANIZATION_DOCUMENTS_MENU = 'organization'
ORGANIZATION_DOCUMENTS_PERMISSION = f'documents.{ORGANIZATION_DOCUMENTS_MENU}.view'
ORGANIZATION_DOCUMENTS_ROOT_CODE = 'company.documents'
ORGANIZATION_DOCUMENTS_ROOT_CODES = (
    ORGANIZATION_DOCUMENTS_ROOT_CODE,
    'hrms.organization_documents',
)

# ریشهٔ پوشه‌های DMS (کد StorageProfile) → اسلاگ ماژول برنامه.
# «مدیریت اسناد» عمداً در این نگاشت نیست؛ دسترسی به خودِ ماژول DMS نباید
# باعث دیدن پوشه‌های سایر ماژول‌ها شود.
FOLDER_ROOT_APPLICATIONS = {
    'hr.employees': 'hrms',
    'hrms.recruitment': 'hrms',
    'hrms.contracts': 'contracts',
    'hrms.projects': 'projects',
    'hrms.payroll': 'payroll',
    'hrms.pettycash': 'pettycash',
    'hrms.accounting': 'accounting',
    'hrms.correspondence': 'correspondence',
}


def folder_root_application(code) -> str:
    """اسلاگ ماژولِ صاحب یک پوشهٔ ریشهٔ DMS (یا رشتهٔ خالی)."""
    code = str(code or '').strip()
    if not code:
        return ''
    if code in ORGANIZATION_DOCUMENTS_ROOT_CODES:
        return ''
    if code in FOLDER_ROOT_APPLICATIONS:
        return FOLDER_ROOT_APPLICATIONS[code]
    if code.startswith('hr.employees'):
        return 'hrms'
    if code.startswith('hrms.'):
        slug = code.split('.', 1)[1].split('.', 1)[0]
        if slug in {
            'contracts', 'projects', 'recruitment', 'payroll',
            'pettycash', 'accounting', 'correspondence',
            'procurement', 'treasury',
        }:
            return slug
        return ''
    if code.startswith('procurement'):
        return 'procurement'
    if code.startswith('treasury'):
        return 'treasury'
    return ''


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
