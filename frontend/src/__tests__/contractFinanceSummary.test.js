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
  expect(summary.rial.amount).toBe(600000000);
  expect(summary.foreign.amount).toBe(300);
});

test('uses the latest foreign statement rate for the contract', () => {
  expect(contractRateOf({}, [
    { id: 1, exchange_rate: 1800000 },
    { id: 2, exchange_rate: 2000000 },
  ])).toBe(2000000);
  expect(contractRateOf({ exchange_rate: 1 }, [])).toBe(1);
});
