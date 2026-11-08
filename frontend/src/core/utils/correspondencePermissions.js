/**
 * مجوزهای ریز ماژول مکاتبات در فرانت‌اند.
 *
 * آینهٔ ``hrms_project/correspondences/permissions.py``: همان کدهای
 * ``correspondence.<menu>.<action>`` و همان قاعدهٔ سازگاری؛ بنابراین دکمه‌ای که
 * در UI فعال است، در API هم مجاز خواهد بود و برعکس.
 */

export const CORRESPONDENCE_MODULE = 'correspondence';

const ACTION_FALLBACKS = {
  view: ['view'],
  create: ['create'],
  edit: ['edit', 'create'],
  delete: ['delete'],
  approve: ['approve', 'edit'],
  export: ['export', 'view'],
};

export const READ_MENUS = [
  'all', 'incoming', 'outgoing', 'internal', 'drafts', 'referrals', 'overdue',
  'archive', 'dashboard',
];

export const DIRECTION_MENUS = {
  incoming: ['incoming', 'all', 'new', 'drafts'],
  outgoing: ['outgoing', 'all', 'new', 'drafts'],
  internal: ['internal', 'all', 'new', 'drafts'],
};

export const MAPPING_MENUS = ['name-mapping', 'settings', 'directory'];
export const REQUESTS_MENUS = [
  'drafts', 'all', 'referrals', 'new', 'incoming', 'outgoing', 'internal',
];

export const finePermissions = (user) => user?.fine_permissions || {};

/** آیا کاربر برای این ماژول کد ریز دارد؟ (اگر نه، لایهٔ قدیمی اعمال می‌شود) */
export const hasCorrespondenceCodes = (user) => Object.entries(finePermissions(user))
  .some(([code, value]) => Boolean(value) && code.startsWith(`${CORRESPONDENCE_MODULE}.`));

const legacyAllowed = (user, action) => {
  const legacy = user?.permissions || {};
  switch (action) {
    case 'delete':
      return Boolean(legacy.can_delete_documents);
    case 'approve':
      return Boolean(legacy.can_approve_documents || legacy.can_publish_documents);
    case 'view':
      return Boolean(
        legacy.can_manage_documents || legacy.can_delete_documents
        || legacy.can_approve_documents || legacy.can_publish_documents,
      );
    default:
      return Boolean(legacy.can_manage_documents || legacy.can_publish_documents);
  }
};

/**
 * آیا کاربر این عمل را در ماژول مکاتبات دارد؟
 * @param {object} user کاربر جاری (از AuthContext)
 * @param {'view'|'create'|'edit'|'delete'|'approve'|'export'} action
 * @param {{direction?: string, menus?: string[]}} options
 */
export const correspondenceCan = (user, action, { direction, menus } = {}) => {
  if (!user) return false;
  if (user.is_superuser) return true;

  const wanted = ACTION_FALLBACKS[action] || [action];
  const targets = menus || (direction ? (DIRECTION_MENUS[direction] || READ_MENUS) : READ_MENUS);
  if (hasCorrespondenceCodes(user)) {
    const fine = finePermissions(user);
    return targets.some((menu) => wanted.some(
      (name) => Boolean(fine[`${CORRESPONDENCE_MODULE}.${menu}.${name}`]),
    ));
  }
  return legacyAllowed(user, action);
};

/** مجوز عمل روی یک نامه (منوی همان جهت). */
export const letterCan = (user, action, direction) => correspondenceCan(
  user, action, { direction: direction || 'incoming' },
);

/** مجوز عمل در صفحهٔ نگاشت نام‌ها. */
export const mappingCan = (user, action) => correspondenceCan(user, action, { menus: MAPPING_MENUS });

/** مجوز عمل در کارتابل درخواست‌ها. */
export const requestsCan = (user, action) => correspondenceCan(
  user, action, { menus: REQUESTS_MENUS },
);
