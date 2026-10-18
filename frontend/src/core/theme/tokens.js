/**
 * Centralized design tokens — frosted-glass surfaces, contract status/type
 * palettes and helpers (2026 style). Import these instead of re-defining
 * `glassPaper` in every page.
 */

import { normalizeCurrencyLabel } from '../utils/numberUtils';

export const FONT_FAMILY = "'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif";

/** ترکیب یک رنگ HEX با سفید/سیاه برای ساخت نسخهٔ روشن/تیره */
export const mixHex = (hex, target, amount = 0.2) => {
  const parse = (value) => {
    const raw = String(value || '').replace('#', '').trim();
    const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  };
  const from = parse(hex);
  const to = parse(target);
  if (!from || !to) return hex;
  const channel = (index) => Math.round(from[index] + (to[index] - from[index]) * amount)
    .toString(16).padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
};

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

/** Display label for a contract's currency (ریال ایران/﷼/IRR => ریال). */
export const currencyLabel = (contract) => normalizeCurrencyLabel(
  contract?.currency_name || contract?.currency_symbol || contract?.name || contract?.symbol
);

/** Colored gradient for a page header avatar. */
export const gradient = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;
