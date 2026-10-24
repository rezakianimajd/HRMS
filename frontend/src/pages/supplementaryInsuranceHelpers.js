/** منطق خالص صفحهٔ بیمه تکمیلی — قابل تست و مستقل از UI. */
import { toJalali } from '../core/utils/dateUtils';

export const INSURANCE_STATUS = {
  active: { key: 'active', label: 'فعال', color: '#0f766e', bg: '#ecfdf5' },
  expiring: { key: 'expiring', label: 'نزدیک انقضا', color: '#b45309', bg: '#fffbeb' },
  expired: { key: 'expired', label: 'منقضی', color: '#be123c', bg: '#fff1f2' },
  upcoming: { key: 'upcoming', label: 'آینده', color: '#2563eb', bg: '#eff6ff' },
};

export const RELATION_OPTIONS = [
  { value: 'spouse', label: 'همسر' },
  { value: 'child', label: 'فرزند' },
  { value: 'father', label: 'پدر' },
  { value: 'mother', label: 'مادر' },
  { value: 'other', label: 'سایر' },
];

export const RELATION_LABELS = RELATION_OPTIONS.reduce((labels, item) => {
  labels[item.value] = item.label;
  return labels;
}, {});

const dateOnly = (value) => String(value || '').slice(0, 10);

export const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(`${dateOnly(value)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

export const statusOf = (row = {}) => {
  const startDays = daysUntil(row.start_date);
  if (startDays !== null && startDays > 0) return INSURANCE_STATUS.upcoming;
  const endDays = daysUntil(row.end_date);
  if (endDays !== null && endDays < 0) return INSURANCE_STATUS.expired;
  if (endDays !== null && endDays <= 30) return INSURANCE_STATUS.expiring;
  return INSURANCE_STATUS.active;
};

export const periodLabel = (row = {}) => {
  const start = row.start_date ? toJalali(dateOnly(row.start_date)) : '—';
  const end = row.end_date ? toJalali(dateOnly(row.end_date)) : 'اکنون';
  return `${start} تا ${end}`;
};

export const dependentName = (dependent = {}) => (
  `${dependent.first_name || ''} ${dependent.last_name || ''}`.trim() || 'بدون نام'
);

export const dependentHasAttachment = (dependent = {}) => Boolean(
  dependent.attachment_url || dependent.attachment || dependent.has_attachment,
);

export const insuranceSearchText = (row = {}) => [
  row.employee_name, row.employee_code, row.department_name, row.job_title_name,
  row.insurance_name, row.insurance_type, row.plan,
  ...(row.dependents || []).map(dependentName),
].filter(Boolean).join(' ').toLowerCase();

export const matchesInsurance = (row, query) => {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return true;
  return insuranceSearchText(row).includes(term);
};

export const summarizeInsurances = (rows = []) => {
  const employeeIds = new Set();
  let dependents = 0;
  let dependentAttachments = 0;
  let monthlyTotal = 0;
  const statusCounts = { active: 0, expiring: 0, expired: 0, upcoming: 0 };
  rows.forEach((row) => {
    if (row.employee != null) employeeIds.add(String(row.employee));
    const deps = Array.isArray(row.dependents) ? row.dependents : [];
    dependents += deps.length;
    dependentAttachments += deps.filter(dependentHasAttachment).length;
    monthlyTotal += Number(row.monthly_amount || 0);
    const status = statusOf(row);
    statusCounts[status.key] = (statusCounts[status.key] || 0) + 1;
  });
  return {
    total: rows.length,
    employees: employeeIds.size,
    dependents,
    dependentAttachments,
    monthlyTotal,
    statusCounts,
  };
};
