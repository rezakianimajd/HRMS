/**
 * وضعیت پرداخت اسناد قرارداد (فاکتور و صورت‌وضعیت) — منبع واحد برای همهٔ صفحه‌ها.
 *
 * «پرداخت‌شده» و «مانده» همیشه از API خوانده می‌شوند (`paid_amount` /
 * `remaining_amount` / `payable_amount`) که خود از «تخصیص‌های پرداخت» ساخته
 * می‌شوند؛ بنابراین با ثبت/ویرایش/حذف پرداخت در هر صفحه‌ای، همهٔ صفحات با
 * invalidation مشترک (`invalidateContractFinanceQueries`) به‌روز می‌شوند.
 */
export const numOf = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const PAYMENT_STATUS = {
  paid: { key: 'paid', label: 'پرداخت‌شده', color: '#0f766e', bg: '#ecfdf5' },
  partial: { key: 'partial', label: 'پرداخت جزئی', color: '#b45309', bg: '#fffbeb' },
  unpaid: { key: 'unpaid', label: 'پرداخت‌نشده', color: '#be123c', bg: '#fff1f2' },
};

export const paymentStatusMeta = (key) => PAYMENT_STATUS[key] || PAYMENT_STATUS.unpaid;

const hasValue = (value) => value !== undefined && value !== null && value !== '';

/** مبلغ قابل پرداخت سند؛ اول از API، بعد محاسبهٔ محلی. */
export const rowPayable = (row = {}) => {
  if (!row) return 0;
  if (hasValue(row.payable_amount)) return Math.max(0, numOf(row.payable_amount));
  if (row.total !== undefined && row.total !== null && row.total !== '') {
    return Math.max(0, numOf(row.total));
  }
  return Math.max(0, numOf(row.net_amount) || numOf(row.amount));
};

/** مبلغ پرداخت‌شدهٔ سند (خالص) مستقیم از API. */
export const rowPaid = (row = {}) => (hasValue(row?.paid_amount) ? Math.max(0, numOf(row.paid_amount)) : 0);

/** ماندهٔ سند؛ اگر API مقدار نداده باشد از «قابل پرداخت − پرداخت‌شده» محاسبه می‌شود. */
export const rowRemaining = (row = {}) => {
  if (!row) return 0;
  if (hasValue(row.remaining_amount)) return Math.max(0, numOf(row.remaining_amount));
  return Math.max(0, rowPayable(row) - rowPaid(row));
};

/** درصد پیشرفت پرداخت سند (۰ تا ۱۰۰). */
export const rowPaymentProgress = (row = {}) => {
  const payable = rowPayable(row);
  if (payable <= 0) return 0;
  return Math.max(0, Math.min(100, (rowPaid(row) / payable) * 100));
};

/**
 * وضعیت پرداخت سند:
 *  - تسویه‌شده: مانده صفر (یا `is_paid` برای فاکتور)
 *  - پرداخت جزئی: بخشی پرداخت شده
 *  - پرداخت‌نشده: هیچ پرداختی ثبت نشده
 */
export const paymentStatusOf = (row = {}) => {
  const payable = rowPayable(row);
  const paid = rowPaid(row);
  if (row?.is_paid && paid <= 0 && payable > 0) return PAYMENT_STATUS.paid;
  if (payable <= 0 && paid <= 0) return PAYMENT_STATUS.paid;
  if (rowRemaining(row) <= 0 && (paid > 0 || payable > 0)) return PAYMENT_STATUS.paid;
  if (paid > 0) return PAYMENT_STATUS.partial;
  return PAYMENT_STATUS.unpaid;
};

/** خلاصهٔ پرداخت چند سند: قابل پرداخت، پرداخت‌شده، مانده و شمار هر وضعیت. */
export const paymentSummaryOf = (rows = []) => rows.reduce((acc, row) => {
  acc.payable += rowPayable(row);
  acc.paid += rowPaid(row);
  acc.remaining += rowRemaining(row);
  const status = paymentStatusOf(row).key;
  acc.counts[status] = (acc.counts[status] || 0) + 1;
  return acc;
}, { payable: 0, paid: 0, remaining: 0, counts: { paid: 0, partial: 0, unpaid: 0 } });

/**
 * کلیدهای کشی که با هر تغییر پرداخت باید تازه شوند:
 * فاکتورها، صورت‌وضعیت‌ها، پروندهٔ قرارداد، گزارش مالی، داشبورد و لیست قراردادها.
 */
export const CONTRACT_FINANCE_QUERY_KEYS = [
  'contract-payments',
  'contract-payments-all',
  'invoices-pay',
  'statements-pay',
  'contract-invoices',
  'contract-invoice-payments',
  'contract-statements',
  'contract-statement-payments',
  'contract-statement-detail',
  'external-contract',
  'external-contracts',
  'external-contracts-all',
  'external-contracts-stats',
  'ext-contracts',
  'ext-contracts-inv',
  'ext-contracts-pay',
  'contracts-finance-list',
  'contracts-finance-statements',
  'contracts-finance-payments',
  'contract-finance-detail',
  'contract-effects',
  'contract-guarantees-status',
  'contracts-calendar',
];

/** همهٔ کش‌های وابسته به پرداخت را باطل می‌کند (پویایی بین صفحه‌ها). */
export const invalidateContractFinanceQueries = (queryClient) => {
  if (!queryClient) return;
  CONTRACT_FINANCE_QUERY_KEYS.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
  queryClient.invalidateQueries({ queryKey: ['contracts-dashboard'] });
};
