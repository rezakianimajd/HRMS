import {
  allocationKey, allocationsFromPayment, allocationsPayload, allocationsTotal,
  BUCKETS, bucketLabel, fillWithRemaining, targetPaid, targetPayable, targetRemaining,
} from '../pages/contracts/paymentAllocations';

describe('payment allocation helpers', () => {
  const statement = {
    id: 5, number: '3', amount: 10000000, net_amount: 9000000,
    payable_amount: 9000000, paid_amount: 4000000, remaining_amount: 5000000,
    retention_amount: 500000, retention_paid_amount: 100000, retention_remaining_amount: 400000,
    insurance_amount: 300000, insurance_paid_amount: 50000, insurance_remaining_amount: 250000,
  };
  const invoice = {
    id: 9, number: 'INV-9', amount: 2000000, total: 2200000,
    paid_amount: 200000, remaining_amount: 2000000,
  };

  test('exposes the three payable buckets', () => {
    expect(Object.keys(BUCKETS)).toEqual(['net', 'retention', 'insurance']);
    expect(bucketLabel('retention')).toBe('سپرده حسن انجام کار');
    expect(bucketLabel('insurance')).toBe('سپرده حق بیمه');
    expect(bucketLabel('unknown')).toBe('خالص صورت‌وضعیت');
  });

  test('uses server figures for each bucket of a statement', () => {
    expect(targetPayable('statement', 'net', statement)).toBe(9000000);
    expect(targetRemaining('statement', 'net', statement)).toBe(5000000);
    expect(targetPayable('statement', 'retention', statement)).toBe(500000);
    expect(targetPaid('statement', 'retention', statement)).toBe(100000);
    expect(targetRemaining('statement', 'retention', statement)).toBe(400000);
    expect(targetPayable('statement', 'insurance', statement)).toBe(300000);
    expect(targetRemaining('statement', 'insurance', statement)).toBe(250000);
  });

  test('invoices only have the net bucket and fall back to payable minus paid', () => {
    expect(targetPayable('invoice', 'net', invoice)).toBe(2200000);
    expect(targetRemaining('invoice', 'net', invoice)).toBe(2000000);
    expect(targetRemaining('invoice', 'net', { id: 1, total: 5000000, paid_amount: 1500000 })).toBe(3500000);
    expect(targetPayable('statement', 'net', { id: 2, amount: 7000000, net_amount: 0 })).toBe(7000000);
  });

  test('maps saved allocations, including deposit buckets, and legacy single links', () => {
    const mapped = allocationsFromPayment({
      amount: 1000000,
      allocations: [
        { id: 1, target_type: 'statement', kind: 'net', statement: 5, invoice: null, amount: 500000 },
        { id: 2, target_type: 'statement', kind: 'retention', statement: 5, invoice: null, amount: 300000 },
        { id: 3, target_type: 'invoice', kind: 'net', statement: null, invoice: 9, amount: 200000 },
      ],
    });
    expect(mapped).toHaveLength(3);
    expect(mapped[0]).toEqual({ key: allocationKey('statement', 5, 'net'), target: 'statement', bucket: 'net', id: '5', amount: '500000' });
    expect(mapped[1]).toEqual({ key: allocationKey('statement', 5, 'retention'), target: 'statement', bucket: 'retention', id: '5', amount: '300000' });
    expect(mapped[2]).toEqual({ key: allocationKey('invoice', 9, 'net'), target: 'invoice', bucket: 'net', id: '9', amount: '200000' });

    expect(allocationsFromPayment({ amount: 700000, statement: 5 })).toEqual([
      { key: allocationKey('statement', 5, 'net'), target: 'statement', bucket: 'net', id: '5', amount: '700000' },
    ]);
    expect(allocationsFromPayment({ amount: 700000, invoice: 9 })).toEqual([
      { key: allocationKey('invoice', 9, 'net'), target: 'invoice', bucket: 'net', id: '9', amount: '700000' },
    ]);
    expect(allocationsFromPayment({ amount: 700000 })).toEqual([]);
  });

  test('builds API payloads with allocation kinds', () => {
    const rows = [
      { key: allocationKey('statement', 5, 'net'), target: 'statement', bucket: 'net', id: '5', amount: '1500000' },
      { key: allocationKey('statement', 5, 'retention'), target: 'statement', bucket: 'retention', id: '5', amount: '400000' },
      { key: allocationKey('statement', 5, 'insurance'), target: 'statement', bucket: 'insurance', id: '5', amount: '250000' },
      { key: allocationKey('invoice', 9, 'net'), target: 'invoice', bucket: 'insurance', id: '9', amount: '500000' },
      { key: allocationKey('invoice', 11, 'net'), target: 'invoice', bucket: 'net', id: '', amount: '0' },
    ];
    expect(allocationsTotal(rows)).toBe(2650000);
    expect(allocationsPayload(rows)).toEqual([
      { statement: '5', invoice: null, kind: 'net', amount: 1500000 },
      { statement: '5', invoice: null, kind: 'retention', amount: 400000 },
      { statement: '5', invoice: null, kind: 'insurance', amount: 250000 },
      { statement: null, invoice: '9', kind: 'net', amount: 500000 },
    ]);
  });

  test('fills every row with the remaining amount of its own bucket', () => {
    const rows = [
      { key: allocationKey('statement', 5, 'net'), target: 'statement', bucket: 'net', id: '5', amount: '0' },
      { key: allocationKey('statement', 5, 'retention'), target: 'statement', bucket: 'retention', id: '5', amount: '0' },
      { key: allocationKey('invoice', 9, 'net'), target: 'invoice', bucket: 'net', id: '9', amount: '100' },
    ];
    expect(fillWithRemaining(rows, { statement: [statement], invoice: [invoice] })).toEqual([
      { key: allocationKey('statement', 5, 'net'), target: 'statement', bucket: 'net', id: '5', amount: '5000000' },
      { key: allocationKey('statement', 5, 'retention'), target: 'statement', bucket: 'retention', id: '5', amount: '400000' },
      { key: allocationKey('invoice', 9, 'net'), target: 'invoice', bucket: 'net', id: '9', amount: '2000000' },
    ]);
  });
});
