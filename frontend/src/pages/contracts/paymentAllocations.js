/**
 * منطق تخصیص پرداخت قرارداد به صورت‌وضعیت‌ها و فاکتورها (چند سند در یک پرداخت).
 *
 * هر ردیف تخصیص دو بُعد دارد:
 *   target → «statement» (صورت‌وضعیت) یا «invoice» (فاکتور)
 *   bucket → «net» (خالص صورت‌وضعیت) | «retention» (سپرده حسن انجام کار)
 *            | «insurance» (سپرده حق بیمه)؛ فاکتور فقط سبد «net» دارد.
 *
 * اعداد «قابل پرداخت / پرداخت‌شده / مانده» مستقیماً از API می‌آیند
 * (`payable_amount`, `paid_amount`, `remaining_amount` و نسخهٔ هر سبد) تا هنگام
 * ثبت پرداخت همیشه پویا و به‌روز باشند.
 */
export const numOf = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const BUCKETS = {
  net: { key: 'net', label: 'خالص صورت‌وضعیت', shortLabel: 'خالص', color: '#0f766e' },
  retention: { key: 'retention', label: 'سپرده حسن انجام کار', shortLabel: 'حسن انجام کار', color: '#7c3aed' },
  insurance: { key: 'insurance', label: 'سپرده حق بیمه', shortLabel: 'حق بیمه', color: '#2563eb' },
};

export const BUCKET_KEYS = ['net', 'retention', 'insurance'];

export const bucketMeta = (bucket) => BUCKETS[bucket] || BUCKETS.net;

export const bucketLabel = (bucket) => bucketMeta(bucket).label;

export const allocationKey = (target, id, bucket = 'net') => `${target}:${id}:${bucket || 'net'}`;

export const targetKindLabel = (target) => (target === 'invoice' ? 'فاکتور' : 'صورت‌وضعیت');

const payableOf = (target, bucket, row = {}) => {
  if (!row) return 0;
  if (target === 'statement') {
    if (bucket === 'retention') return numOf(row.retention_amount);
    if (bucket === 'insurance') return numOf(row.insurance_amount);
  }
  const explicit = row.payable_amount;
  if (explicit !== undefined && explicit !== null && explicit !== '') return numOf(explicit);
  if (target === 'invoice') return numOf(row.total) || numOf(row.amount);
  return numOf(row.net_amount) || numOf(row.amount);
};

const paidOf = (target, bucket, row = {}) => {
  if (!row) return 0;
  if (target === 'statement') {
    if (bucket === 'retention') return numOf(row.retention_paid_amount);
    if (bucket === 'insurance') return numOf(row.insurance_paid_amount);
  }
  return numOf(row.paid_amount);
};

const remainingOf = (target, bucket, row = {}) => {
  if (!row) return 0;
  const explicit = target === 'statement'
    ? (bucket === 'retention'
      ? row.retention_remaining_amount
      : (bucket === 'insurance' ? row.insurance_remaining_amount : row.remaining_amount))
    : row.remaining_amount;
  if (explicit !== undefined && explicit !== null && explicit !== '') return numOf(explicit);
  return payableOf(target, bucket, row) - paidOf(target, bucket, row);
};

export const targetPayable = (target, bucket, row) => payableOf(target, bucket, row);

export const targetPaid = (target, bucket, row) => paidOf(target, bucket, row);

export const targetRemaining = (target, bucket, row) => remainingOf(target, bucket, row);

/** ردیف‌های تخصیص از یک پرداخت ذخیره‌شده (با پشتیبانی از دادهٔ قدیمی تک‌سندی). */
export const allocationsFromPayment = (payment = {}) => {
  const rows = Array.isArray(payment.allocations) ? payment.allocations : [];
  const mapped = rows
    .map((row) => {
      const target = row.target_type || (row.statement ? 'statement' : (row.invoice ? 'invoice' : null));
      const id = row.statement ?? row.invoice;
      if (!target || id === null || id === undefined || id === '') return null;
      const bucket = target === 'invoice' ? 'net' : (row.kind || 'net');
      return {
        key: allocationKey(target, id, bucket),
        target,
        bucket,
        id: String(id),
        amount: String(numOf(row.amount)),
      };
    })
    .filter(Boolean);
  if (mapped.length) return mapped;
  if (payment.statement) {
    return [{
      key: allocationKey('statement', payment.statement, 'net'),
      target: 'statement', bucket: 'net',
      id: String(payment.statement),
      amount: String(numOf(payment.amount)),
    }];
  }
  if (payment.invoice) {
    return [{
      key: allocationKey('invoice', payment.invoice, 'net'),
      target: 'invoice', bucket: 'net',
      id: String(payment.invoice),
      amount: String(numOf(payment.amount)),
    }];
  }
  return [];
};

/** ردیف‌های تخصیص را به ساختار API تبدیل می‌کند. */
export const allocationsPayload = (rows = []) => rows
  .map((row) => {
    const bucket = row.target === 'invoice' ? 'net' : (row.bucket || 'net');
    return {
      statement: row.target === 'statement' ? row.id || null : null,
      invoice: row.target === 'invoice' ? row.id || null : null,
      kind: bucket,
      amount: numOf(row.amount),
    };
  })
  .filter((row) => row.statement || row.invoice);

export const allocationsTotal = (rows = []) => rows.reduce((sum, row) => sum + numOf(row.amount), 0);

/** تخصیص خودکار: پر کردن هر ردیف با ماندهٔ همان سند در همان سبد. */
export const fillWithRemaining = (rows = [], lookup = {}) => rows.map((row) => {
  const source = (lookup[row.target] || []).find((item) => String(item.id) === String(row.id));
  return {
    ...row,
    amount: String(Math.max(0, targetRemaining(row.target, row.bucket, source))),
  };
});
