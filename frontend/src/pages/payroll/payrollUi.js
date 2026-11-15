import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

export const PAYROLL_STATUS = {
  draft: { label: 'پیش‌نویس', tone: 'default' },
  open: { label: 'باز', tone: 'info' },
  calculating: { label: 'در حال محاسبه', tone: 'warning' },
  calculated: { label: 'محاسبه‌شده', tone: 'info' },
  under_review: { label: 'در حال بررسی', tone: 'warning' },
  approved: { label: 'تأییدشده', tone: 'success' },
  payment_pending: { label: 'در انتظار پرداخت', tone: 'warning' },
  paid: { label: 'پرداخت‌شده', tone: 'success' },
  closed: { label: 'بسته‌شده', tone: 'default' },
  cancelled: { label: 'لغو‌شده', tone: 'error' },
  warning: { label: 'نیازمند بررسی', tone: 'warning' },
  reviewed: { label: 'بررسی‌شده', tone: 'info' },
  calculated_employee: { label: 'محاسبه‌شده', tone: 'info' },
  pending: { label: 'در انتظار', tone: 'warning' },
  approved_advance: { label: 'تأییدشده', tone: 'success' },
  settled: { label: 'تسویه‌شده', tone: 'success' },
  rejected: { label: 'رد‌شده', tone: 'error' },
  processed: { label: 'پردازش‌شده', tone: 'success' },
  submitted: { label: 'ثبت‌شده', tone: 'info' },
  paid_advance: { label: 'پرداخت‌شده', tone: 'success' },
  generated: { label: 'فایل تولیدشده', tone: 'success' },
};

export const money = (value) => (
  value == null || value === '' ? '—' : `${formatPersianNumber(value)} ریال`
);

export const number = (value) => (
  value == null || value === '' ? '—' : formatPersianNumber(value)
);

export const dateLabel = (value) => (value ? toPersianDigits(toJalali(value)) : '—');

export const statusMeta = (status) => PAYROLL_STATUS[status] || { label: status || '—', tone: 'default' };

export const toneColor = (theme, tone) => {
  if (tone === 'success') return theme.palette.success.main;
  if (tone === 'warning') return theme.palette.warning.main;
  if (tone === 'error') return theme.palette.error.main;
  if (tone === 'info') return theme.palette.info.main;
  return theme.palette.text.secondary;
};
