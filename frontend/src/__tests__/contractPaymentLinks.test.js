import {
  isPaymentLinked, paidByBucket, paidByInvoice, paidTotalsByKind,
  paymentAllocationRows, unlinkedPayments,
} from '../pages/contracts/contractPaymentLinks';

describe('contract payment links', () => {
  const payments = [
    {
      id: 1,
      amount: 1000000,
      statement: 5, // کلید قدیمی؛ نباید مبنای محاسبه باشد
      allocations: [
        { id: 1, target_type: 'statement', statement: 5, kind: 'net', amount: 500000, title: '01' },
        { id: 2, target_type: 'statement', statement: 6, kind: 'net', amount: 200000, title: '02' },
        { id: 3, target_type: 'statement', statement: 6, kind: 'retention', amount: 200000, title: '02' },
        { id: 4, target_type: 'invoice', statement: null, invoice: 9, amount: 100000, title: 'INV-9' },
      ],
    },
    { id: 2, amount: 300000, statement: null }, // بدون تخصیص → قدیمی و بدون سند
    { id: 3, amount: 700000, statement: 7 }, // دادهٔ قدیمی تک‌سندی
  ];

  test('normalizes allocation rows and falls back to legacy single links', () => {
    const rows = paymentAllocationRows(payments[0]);
    expect(rows).toHaveLength(4);
    expect(rows[1]).toMatchObject({ target: 'statement', id: '6', kind: 'net', amount: 200000 });
    expect(rows[3]).toMatchObject({ target: 'invoice', id: '9', kind: 'net', amount: 100000 });

    expect(paymentAllocationRows(payments[2])).toEqual([
      { target: 'statement', id: '7', kind: 'net', amount: 700000, title: '', kindLabel: '' },
    ]);
    expect(paymentAllocationRows(payments[1])).toEqual([]);
  });

  test('splits paid amounts per statement and per bucket', () => {
    const buckets = paidByBucket(payments);
    expect(buckets.net).toEqual({ 5: 500000, 6: 200000, 7: 700000 });
    expect(buckets.retention).toEqual({ 6: 200000 });
    expect(buckets.insurance).toEqual({});
    expect(paidByInvoice(payments)).toEqual({ 9: 100000 });
  });

  test('payment with statement=5 does not absorb the whole amount', () => {
    const buckets = paidByBucket(payments);
    expect(buckets.net['5']).toBe(500000);
    expect(buckets.net['6']).toBe(200000);
  });

  test('totals by kind and unlinked detection', () => {
    const totals = paidTotalsByKind(payments);
    // خالص = دو تخصیص صورت‌وضعیت + تخصیص فاکتور + پرداخت قدیمی تک‌سندی
    expect(totals).toEqual({ net: 1500000, retention: 200000, insurance: 0, total: 1700000 });
    expect(unlinkedPayments(payments).map((row) => row.id)).toEqual([2]);
    expect(isPaymentLinked(payments[0])).toBe(true);
    expect(isPaymentLinked(payments[1])).toBe(false);
  });
});
