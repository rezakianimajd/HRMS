import {
  CONTRACT_FINANCE_QUERY_KEYS, PAYMENT_STATUS, invalidateContractFinanceQueries,
  paymentStatusOf, paymentSummaryOf, rowPaid, rowPayable, rowRemaining,
} from '../pages/contracts/contractPaymentsSummary';

test('reads payable, paid and remaining amounts from the API payload', () => {
  const row = { payable_amount: 1000, paid_amount: 400, remaining_amount: 600 };
  expect(rowPayable(row)).toBe(1000);
  expect(rowPaid(row)).toBe(400);
  expect(rowRemaining(row)).toBe(600);
});

test('falls back to local calculations when the API omits derived amounts', () => {
  expect(rowPayable({ total: 500, vat: 0 })).toBe(500);
  expect(rowPayable({ net_amount: 800, amount: 900 })).toBe(800);
  expect(rowPaid({})).toBe(0);
  expect(rowRemaining({ payable_amount: 1000, paid_amount: 250 })).toBe(750);
  expect(rowRemaining({})).toBe(0);
});

test('classifies documents as paid, partially paid or unpaid', () => {
  expect(paymentStatusOf({ payable_amount: 1000, paid_amount: 1000 }).key).toBe(PAYMENT_STATUS.paid.key);
  expect(paymentStatusOf({ payable_amount: 1000, paid_amount: 0 }).key).toBe(PAYMENT_STATUS.unpaid.key);
  expect(paymentStatusOf({ payable_amount: 1000, paid_amount: 300 }).key).toBe(PAYMENT_STATUS.partial.key);
  expect(paymentStatusOf({ payable_amount: 0, paid_amount: 0 }).key).toBe(PAYMENT_STATUS.paid.key);
  // فاکتورهایی که با تیک «پرداخت شده» بسته شده‌اند بدون تخصیص
  expect(paymentStatusOf({ total: 900, is_paid: true }).key).toBe(PAYMENT_STATUS.paid.key);
});

test('summarizes payments across several documents', () => {
  const rows = [
    { payable_amount: 1000, paid_amount: 1000, remaining_amount: 0 },
    { payable_amount: 500, paid_amount: 200, remaining_amount: 300 },
    { payable_amount: 800, paid_amount: 0, remaining_amount: 800 },
  ];
  const summary = paymentSummaryOf(rows);
  expect(summary.payable).toBe(2300);
  expect(summary.paid).toBe(1200);
  expect(summary.remaining).toBe(1100);
  expect(summary.counts).toEqual({ paid: 1, partial: 1, unpaid: 1 });
});

test('invalidation covers invoices, statements, profile, reports and dashboard caches', () => {
  ['contract-invoices', 'contract-statements', 'external-contract', 'external-contracts',
    'contracts-finance-list', 'contracts-finance-statements', 'contracts-finance-payments',
    'contract-finance-detail', 'contract-payments']
    .forEach((key) => { expect(CONTRACT_FINANCE_QUERY_KEYS).toContain(key); });

  const calls = [];
  const fakeClient = { invalidateQueries: (payload) => calls.push(payload.queryKey[0]) };
  invalidateContractFinanceQueries(fakeClient);
  expect(calls).toContain('contract-invoices');
  expect(calls).toContain('contract-statements');
  expect(calls).toContain('external-contract');
  expect(calls).toContain('contracts-finance-list');
  expect(calls).toContain('contracts-dashboard');
});
