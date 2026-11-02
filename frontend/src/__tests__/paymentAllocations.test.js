import {
  allocationKey, allocationsFromPayment, allocationsPayload, allocationsTotal,
  fillWithRemaining, targetPaid, targetPayable, targetRemaining,
} from '../pages/contracts/paymentAllocations';

describe('payment allocation helpers', () => {
  const statement = {
    id: 5, number: '3', amount: 10000000, net_amount: 9000000,
    paid_amount: 4000000, remaining_amount: 5000000,
  };
  const invoice = {
    id: 9, number: 'INV-9', amount: 2000000, total: 2200000,
    paid_amount: 200000, remaining_amount: 2000000,
  };

  test('uses server remaining/payable values when present', () => {
    expect(targetPayable('statement', statement)).toBe(9000000);
    expect(targetPaid('statement', statement)).toBe(4000000);
    expect(targetRemaining('statement', statement)).toBe(5000000);
    expect(targetRemaining('invoice', invoice)).toBe(2000000);
  });

  test('falls back to payable minus paid when remaining is absent', () => {
    expect(targetRemaining('invoice', { id: 1, total: 5000000, paid_amount: 1500000 })).toBe(3500000);
    expect(targetPayable('statement', { id: 2, amount: 7000000, net_amount: 0 })).toBe(7000000);
  });

  test('maps saved payment allocations and legacy single links', () => {
    const mapped = allocationsFromPayment({
      amount: 900000,
      allocations: [
        { id: 1, target_type: 'statement', statement: 5, invoice: null, amount: 500000 },
        { id: 2, target_type: 'invoice', statement: null, invoice: 9, amount: 400000 },
      ],
    });
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toEqual({ key: allocationKey('statement', 5), kind: 'statement', id: '5', amount: '500000' });

    expect(allocationsFromPayment({ amount: 700000, statement: 5 })).toEqual([
      { key: allocationKey('statement', 5), kind: 'statement', id: '5', amount: '700000' },
    ]);
    expect(allocationsFromPayment({ amount: 700000, invoice: 9 })).toEqual([
      { key: allocationKey('invoice', 9), kind: 'invoice', id: '9', amount: '700000' },
    ]);
    expect(allocationsFromPayment({ amount: 700000 })).toEqual([]);
  });

  test('builds API payloads and totals', () => {
    const rows = [
      { key: allocationKey('statement', 5), kind: 'statement', id: '5', amount: '1500000' },
      { key: allocationKey('invoice', 9), kind: 'invoice', id: '9', amount: '500000' },
      { key: allocationKey('invoice', 11), kind: 'invoice', id: '', amount: '0' },
    ];
    expect(allocationsTotal(rows)).toBe(2000000);
    expect(allocationsPayload(rows)).toEqual([
      { statement: '5', invoice: null, amount: 1500000 },
      { statement: null, invoice: '9', amount: 500000 },
    ]);
  });

  test('fills every row with the remaining amount of its target', () => {
    const rows = [
      { key: allocationKey('statement', 5), kind: 'statement', id: '5', amount: '0' },
      { key: allocationKey('invoice', 9), kind: 'invoice', id: '9', amount: '100' },
    ];
    expect(fillWithRemaining(rows, { statement: [statement], invoice: [invoice] })).toEqual([
      { key: allocationKey('statement', 5), kind: 'statement', id: '5', amount: '5000000' },
      { key: allocationKey('invoice', 9), kind: 'invoice', id: '9', amount: '2000000' },
    ]);
  });
});
