import { MUTED, SOFT_BG } from '../accounting/AccountingDashboardUI';

export const EXPIRING_ACCENT = '#f59e0b';
const RED = '#be123c';
const ORANGE = '#ea580c';
const AMBER = '#b45309';
const YELLOW = '#ca8a04';
const GREEN = '#0f766e';

export const effEnd = (contract) => {
  const dated = (Array.isArray(contract?.addendums) ? contract.addendums : []).filter((item) => item.new_end_date);
  const last = dated.length ? dated.reduce((latest, item) => (String(item.date || '') > String(latest.date || '') ? item : latest), dated[0]) : null;
  return last?.new_end_date || contract?.end_date || null;
};
export const effAmount = (contract) => Number(contract?.amount || 0)
  + (Array.isArray(contract?.addendums) ? contract.addendums : []).reduce((sum, item) => sum + Number(item.amount_change || 0), 0);
export const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 86400000);
};
export const expiryMeta = (days) => {
  if (days === null) return { key: 'later', label: 'بدون تاریخ پایان', color: MUTED, bg: SOFT_BG };
  if (days < 0) return { key: 'expired', label: 'منقضی شده', color: RED, bg: '#fff1f2' };
  if (days <= 30) return { key: 'soon30', label: 'انقضا تا ۳۰ روز', color: ORANGE, bg: '#fff7ed' };
  if (days <= 60) return { key: 'soon60', label: 'انقضا تا ۶۰ روز', color: AMBER, bg: '#fffbeb' };
  if (days <= 90) return { key: 'soon90', label: 'انقضا تا ۹۰ روز', color: YELLOW, bg: '#fefce8' };
  return { key: 'later', label: 'بیش از ۹۰ روز', color: GREEN, bg: '#ecfdf5' };
};
