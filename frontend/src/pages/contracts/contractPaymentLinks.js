/**
 * پیوند پرداخت‌های قرارداد به صورت‌وضعیت‌ها، فاکتورها و سبدهای سپرده.
 *
 * از زمانی که هر پرداخت می‌تواند چند تخصیص داشته باشد (`payment.allocations` با
 * `kind` = net | retention | insurance)، هیچ گزارشی نباید مبلغ پرداخت را فقط به
 * `payment.statement` نسبت بدهد. این ماژول تنها منبع محاسبهٔ «پرداخت‌شدهٔ هر سند»
 * در صفحهٔ تحلیل مالی، پروندهٔ قرارداد و گزارش‌هاست.
 */
import { numOf } from './paymentAllocations';

export const ALLOCATION_KINDS = ['net', 'retention', 'insurance'];

/** ردیف‌های تخصیص یک پرداخت؛ با پشتیبانی از دادهٔ قدیمی تک‌سندی. */
export const paymentAllocationRows = (payment = {}) => {
  const rows = Array.isArray(payment.allocations) ? payment.allocations : [];
  const mapped = rows
    .map((row) => {
      const target = row.target_type || (row.statement ? 'statement' : (row.invoice ? 'invoice' : null));
      const rawId = row.statement ?? row.invoice;
      if (!target || rawId === null || rawId === undefined || rawId === '') return null;
      return {
        target,
        id: String(rawId),
        kind: target === 'invoice' ? 'net' : (ALLOCATION_KINDS.includes(row.kind) ? row.kind : 'net'),
        amount: numOf(row.amount),
        title: row.title || '',
        kindLabel: row.kind_display || '',
      };
    })
    .filter(Boolean);
  if (mapped.length) return mapped;
  if (payment.statement) {
    return [{ target: 'statement', id: String(payment.statement), kind: 'net', amount: numOf(payment.amount), title: '', kindLabel: '' }];
  }
  if (payment.invoice) {
    return [{ target: 'invoice', id: String(payment.invoice), kind: 'net', amount: numOf(payment.amount), title: '', kindLabel: '' }];
  }
  return [];
};

export const isPaymentLinked = (payment = {}) => paymentAllocationRows(payment).length > 0;

const emptyBuckets = () => ({ net: {}, retention: {}, insurance: {} });

/** جمع پرداخت‌های تخصیص‌یافته به هر صورت‌وضعیت، تفکیک‌شده بر اساس سبد. */
export const paidByBucket = (payments = []) => payments.reduce((acc, payment) => {
  paymentAllocationRows(payment).forEach((row) => {
    if (row.target !== 'statement') return;
    const kind = ALLOCATION_KINDS.includes(row.kind) ? row.kind : 'net';
    acc[kind][row.id] = (acc[kind][row.id] || 0) + row.amount;
  });
  return acc;
}, emptyBuckets());

/** جمع پرداخت‌های تخصیص‌یافته به هر فاکتور. */
export const paidByInvoice = (payments = []) => payments.reduce((acc, payment) => {
  paymentAllocationRows(payment).forEach((row) => {
    if (row.target !== 'invoice') return;
    acc[row.id] = (acc[row.id] || 0) + row.amount;
  });
  return acc;
}, {});

/** جمع کل هر سبد پرداخت (خالص / سپرده حسن انجام کار / سپرده حق بیمه). */
export const paidTotalsByKind = (payments = []) => payments.reduce((acc, payment) => {
  paymentAllocationRows(payment).forEach((row) => {
    acc[row.kind] = (acc[row.kind] || 0) + row.amount;
    acc.total += row.amount;
  });
  return acc;
}, { net: 0, retention: 0, insurance: 0, total: 0 });

/** پرداخت‌هایی که به هیچ سند/سپرده‌ای تخصیص نیافته‌اند (علی‌الحساب آزاد). */
export const unlinkedPayments = (payments = []) => payments.filter((payment) => !isPaymentLinked(payment));

/** خلاصهٔ کوتاه تخصیص‌ها برای نمایش در جدول‌ها. */
export const allocationSummary = (payment = {}) => {
  const rows = paymentAllocationRows(payment);
  const labels = { net: 'خالص', retention: 'حسن انجام کار', insurance: 'حق بیمه' };
  return rows.map((row) => ({
    ...row,
    text: `${row.target === 'invoice' ? 'فاکتور' : 'صورت‌وضعیت'} ${row.title || row.id} · ${labels[row.kind] || 'خالص'}`,
  }));
};
