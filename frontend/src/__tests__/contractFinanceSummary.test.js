import {
  contractRateOf, statementFinanceOf, summarizeStatementFinance,
} from '../pages/contracts/contractFinanceSummary';

test('splits retention, VAT, prepayment and other statement items', () => {
  const row = {
    id: 1,
    amount: 200000000,
    cumulative_previous_amount: 0,
    work_done: 200000000,
    value_added_tax: 20000000,
    additions: [{ description: 'سایر اضافات', amount: 5000000 }],
    additions_total: 25000000,
    deductions: [
      { title: 'حسن انجام کار', amount: 20000000 },
      { title: 'پیش‌پرداخت', amount: 30000000 },
      { title: 'بیمه', amount: 5000000 },
      { title: 'سایر کسورات', amount: 1000000 },
    ],
    deductions_total: 56000000,
    net_amount: 169000000,
    currency_name: 'یورو',
    exchange_rate: 2000000,
  };
  const result = statementFinanceOf(row);
  expect(result.rate).toBe(2000000);
  expect(result.retention).toBe(20000000);
  expect(result.prepayment).toBe(30000000);
  expect(result.vat).toBe(20000000);
  expect(result.insurance).toBe(5000000);
  expect(result.otherDeductions).toBe(1000000);
  expect(result.net).toBe(169000000);
});

test('summarizes rial and foreign totals for contract statements', () => {
  const rows = [
    {
      id: 2, amount: 400000000, cumulative_previous_amount: 200000000, work_done: 200000000,
      deductions: [{ title: 'حسن انجام کار', amount: 20000000 }], deductions_total: 20000000,
      currency_name: 'یورو', exchange_rate: 2000000,
    },
    {
      id: 1, amount: 200000000, cumulative_previous_amount: 0, work_done: 200000000,
      deductions: [{ title: 'حسن انجام کار', amount: 10000000 }], deductions_total: 10000000,
      currency_name: 'یورو', exchange_rate: 2000000,
    },
  ];
  const summary = summarizeStatementFinance(rows);
  expect(summary.count).toBe(2);
  expect(summary.rial.retention).toBe(30000000);
  expect(summary.foreign.retention).toBe(15);
  expect(summary.rial.amount).toBe(400000000);
  expect(summary.foreign.amount).toBe(200);
});

test('keeps foreign cumulative independent from the latest rial rate', () => {
  const rows = [
    {
      id: 1, amount: 200000000, cumulative_previous_amount: 0, work_done: 200000000,
      currency_name: 'یورو', exchange_rate: 2000000,
      foreign_amount: 100, foreign_previous_amount: 0, foreign_work_done: 100,
    },
    {
      id: 2,
      amount: 287467936567,
      cumulative_previous_amount: 206621785468,
      work_done: 80846151099,
      currency_name: 'یورو',
      exchange_rate: 1838900,
      foreign_amount: 44064.4,
      foreign_previous_amount: 100,
      foreign_work_done: 43964.4,
    },
  ];
  const summary = summarizeStatementFinance(rows);
  expect(summary.foreign.amount).toBeCloseTo(44064.4, 4);
  expect(summary.foreign.work).toBeCloseTo(44064.4, 4);
  expect(summary.foreign.amount).not.toBeCloseTo(287467936567 / 1838900, 2);
});

test('keeps statement cumulative unchanged and sums signed adjustments', () => {
  const rows = [
    { id: 1, kind: 'statement', amount: 200000000, cumulative_previous_amount: 0, work_done: 200000000, net_amount: 200000000 },
    { id: 2, kind: 'increase', amount: 200000000, cumulative_previous_amount: 200000000, work_done: 50000000, net_amount: 50000000, adjustment_work_done: 50000000, adjustment_amount: 50000000 },
    { id: 3, kind: 'decrease', amount: 200000000, cumulative_previous_amount: 200000000, work_done: -20000000, net_amount: -20000000, adjustment_work_done: -20000000, adjustment_amount: 30000000 },
    { id: 4, kind: 'statement', amount: 500000000, cumulative_previous_amount: 200000000, work_done: 300000000, net_amount: 300000000 },
  ];
  const summary = summarizeStatementFinance(rows);
  expect(summary.count).toBe(4);
  expect(summary.normalCount).toBe(2);
  expect(summary.rial.amount).toBe(500000000);
  expect(summary.rial.previous).toBe(200000000);
  expect(summary.rial.work).toBe(530000000);
  expect(summary.rial.net).toBe(530000000);
  expect(summary.adjustments.increase).toBe(50000000);
  expect(summary.adjustments.decrease).toBe(20000000);
  expect(summary.adjustments.net).toBe(30000000);
});

test('uses the latest foreign statement rate for the contract', () => {
  expect(contractRateOf({}, [
    { id: 1, exchange_rate: 1800000 },
    { id: 2, exchange_rate: 2000000 },
  ])).toBe(2000000);
  expect(contractRateOf({ exchange_rate: 1 }, [])).toBe(1);
});
