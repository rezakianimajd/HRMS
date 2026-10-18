/**
 * Centralized design tokens — frosted-glass surfaces, contract status/type
 * palettes and helpers (2026 style). Import these instead of re-defining
 * `glassPaper` in every page.
 */

export const FONT_FAMILY = "'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";

export const glassPaper = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.07)',
  boxShadow: '0 4px 18px rgba(15,23,42,0.06)',
  borderRadius: '16px',
};

export const glassForm = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.08)',
  boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
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
