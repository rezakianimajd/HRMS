/**
 * منطق تخصیص پرداخت قرارداد به صورت‌وضعیت‌ها و فاکتورها (چند سند در یک پرداخت).
 *
 * اعداد «قابل پرداخت / پرداخت‌شده / مانده» مستقیماً از API می‌آیند
 * (`payable_amount`, `paid_amount`, `remaining_amount`) تا هنگام ثبت پرداخت
 * همیشه پویا و به‌روز باشند.
 */
export const numOf = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const allocationKey = (kind, id) => `${kind}:${id}`;

export const targetKindLabel = (kind) => (kind === 'invoice' ? 'فاکتور' : 'صورت‌وضعیت');

const payableOf = (kind, row = {}) => {
  if (!row) return 0;
  const explicit = row.payable_amount;
  if (explicit !== undefined && explicit !== null && explicit !== '') return numOf(explicit);
  if (kind === 'invoice') {
    return numOf(row.total) || numOf(row.amount);
  }
  return numOf(row.net_amount) || numOf(row.amount);
};

export const targetPayable = (kind, row) => payableOf(kind, row);

export const targetPaid = (kind, row) => numOf(row?.paid_amount);

export const targetRemaining = (kind, row) => {
  if (!row) return 0;
  const explicit = row.remaining_amount;
  if (explicit !== undefined && explicit !== null && explicit !== '') return numOf(explicit);
  return payableOf(kind, row) - numOf(row.paid_amount);
};

/** ردیف‌های تخصیص از یک پرداخت ذخیره‌شده (با پشتیبانی از دادهٔ قدیمی تک‌سندی). */
export const allocationsFromPayment = (payment = {}) => {
  const rows = Array.isArray(payment.allocations) ? payment.allocations : [];
  const mapped = rows
    .map((row) => {
      const kind = row.target_type || (row.statement ? 'statement' : (row.invoice ? 'invoice' : null));
      const id = row.statement ?? row.invoice;
      if (!kind || id === null || id === undefined || id === '') return null;
      return {
        key: allocationKey(kind, id),
        kind,
        id: String(id),
        amount: String(numOf(row.amount)),
      };
    })
    .filter(Boolean);
  if (mapped.length) return mapped;
  if (payment.statement) {
    return [{
      key: allocationKey('statement', payment.statement),
      kind: 'statement',
      id: String(payment.statement),
      amount: String(numOf(payment.amount)),
    }];
  }
  if (payment.invoice) {
    return [{
      key: allocationKey('invoice', payment.invoice),
      kind: 'invoice',
      id: String(payment.invoice),
      amount: String(numOf(payment.amount)),
    }];
  }
  return [];
};

/** ردیف‌های تخصیص را به ساختار API تبدیل می‌کند. */
export const allocationsPayload = (rows = []) => rows
  .map((row) => ({
    statement: row.kind === 'statement' ? row.id || null : null,
    invoice: row.kind === 'invoice' ? row.id || null : null,
    amount: numOf(row.amount),
  }))
  .filter((row) => row.statement || row.invoice);

export const allocationsTotal = (rows = []) => rows.reduce((sum, row) => sum + numOf(row.amount), 0);

/** صندوق تخصیص خودکار: پر کردن هر ردیف با ماندهٔ همان سند. */
export const fillWithRemaining = (rows = [], lookup = {}) => rows.map((row) => {
  const source = (lookup[row.kind] || []).find((item) => String(item.id) === String(row.id));
  return { ...row, amount: String(Math.max(0, targetRemaining(row.kind, source))) };
});
