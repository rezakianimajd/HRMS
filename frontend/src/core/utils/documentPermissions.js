/**
 * مجوزهای «اسناد سازمانی» در فرانت‌اند.
 *
 * منبع کد: ``documents.documents-organization.view`` از کاتالوگ مجوزها
 * (کاربران و مجوزها). آیتم ریل سایدبار فقط با همین مجوز (یا دسترسی کامل)
 * نمایش داده می‌شود؛ کاربران قدیمی بدون هیچ کد ریز اسناد همچنان با
 * ``can_manage_documents`` سازگار می‌مانند.
 */
export const ORGANIZATION_DOCUMENTS_MENU = 'organization';
export const ORGANIZATION_DOCUMENTS_PATH = '/document-management/library?module=organization';
export const ORGANIZATION_DOCUMENTS_PERMISSION = `documents.${ORGANIZATION_DOCUMENTS_MENU}.view`;

const finePermissions = (user) => user?.fine_permissions || {};

export const hasOrganizationDocumentsPermission = (user) => {
  if (!user) return false;
  if (user.is_superuser || user.is_full_access) return true;

  const codes = finePermissions(user);
  if (codes[ORGANIZATION_DOCUMENTS_PERMISSION]) return true;

  const documentCodes = Object.entries(codes)
    .filter(([code, value]) => Boolean(value) && code.startsWith('documents.'));
  // کاربر قدیمی/نقش‌محور که هنوز کد ریز اسناد ندارد: رفتار قبلی حفظ می‌شود
  if (!documentCodes.length) {
    return Boolean(user.permissions?.can_manage_documents);
  }
  return false;
};

export const canViewConfidentialDocuments = (user) => {
  if (!user) return false;
  if (user.is_superuser || user.is_full_access) return true;
  return Boolean(user.permissions?.can_manage_documents);
};

export default hasOrganizationDocumentsPermission;
