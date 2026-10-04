/**
 * Centralized design tokens — frosted-glass surfaces, contract status/type
 * palettes and helpers (2026 style). Import these instead of re-defining
 * `glassPaper` in every page.
 */

export const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
  borderRadius: '16px',
};

export const glassForm = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.4))',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 18px 48px rgba(99,102,241,0.14)',
  borderRadius: '16px',
};

export const CONTRACT_STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'در حال اجرا',
  suspended: 'متوقف',
  completed: 'تکمیل شده',
  terminated: 'فسخ شده',
};

export const CONTRACT_STATUS_COLORS = {
  draft: '#64748b',
  active: '#10b981',
  suspended: '#f59e0b',
  completed: '#3b82f6',
  terminated: '#ef4444',
};

export const CONTRACT_TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا',
  purchase: 'خرید',
  tender: 'مناقصه',
  consulting: 'مشاوره',
  service: 'خدمات',
  other: 'سایر',
};

/** Display label for a contract's currency (falls back to ریال). */
export const currencyLabel = (contract) => contract?.currency_name || 'ریال';

/** Colored gradient for a page header avatar. */
export const gradient = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;
