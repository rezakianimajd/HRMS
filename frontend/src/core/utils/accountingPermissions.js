/**
 * مجوزهای ریز «سازمان‌ها و اشخاص» در فرانت‌اند.
 *
 * آینهٔ ``hrms_project/accounting/permissions.py``: همان کدهای
 * ``accounting.acc-org-parties.<action>`` و همان قاعدهٔ سازگاری؛ بنابراین
 * دکمه‌ای که در UI فعال است، در API هم مجاز خواهد بود.
 */

export const ACCOUNTING_MODULE = 'accounting';
export const ORG_PARTIES_MENU = 'acc-org-parties';

const ACTION_FALLBACKS = {
  view: ['view'],
  create: ['create'],
  edit: ['edit', 'create'],
  delete: ['delete'],
  export: ['export', 'view'],
};

export const finePermissions = (user) => user?.fine_permissions || {};

/** آیا کاربر برای ماژول حسابداری کد ریز دارد؟ (اگر نه، لایهٔ قدیمی اعمال می‌شود) */
export const hasAccountingCodes = (user) => Object.entries(finePermissions(user))
  .some(([code, value]) => Boolean(value) && code.startsWith(`${ACCOUNTING_MODULE}.`));

export const hasOrgPartyPermission = (user, action) => {
  if (!user) return false;
  if (user.is_superuser || user.is_full_access) return true;

  const codes = finePermissions(user);
  const scoped = Object.entries(codes)
    .filter(([code, value]) => Boolean(value) && code.startsWith(`${ACCOUNTING_MODULE}.`));
  // کاربران قدیمی (بدون هیچ کد ریز حسابداری) مثل قبل مجازند
  if (!scoped.length) return true;

  const wanted = ACTION_FALLBACKS[action] || [action];
  if (wanted.some((item) => codes[`${ACCOUNTING_MODULE}.${ORG_PARTIES_MENU}.${item}`])) return true;
  // سازگاری: هر منوی حسابداری با همان عمل
  return scoped.some(([code]) => wanted.some((item) => code.endsWith(`.${item}`)));
};

export const orgPartyPermissions = (user) => ({
  canView: hasOrgPartyPermission(user, 'view'),
  canCreate: hasOrgPartyPermission(user, 'create'),
  canEdit: hasOrgPartyPermission(user, 'edit'),
  canDelete: hasOrgPartyPermission(user, 'delete'),
});

export default orgPartyPermissions;
