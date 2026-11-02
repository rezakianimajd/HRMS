import React from 'react';
import { renderToString } from 'react-dom/server';
import { StatementsTable, AdvanceTable, InvoicesTable, PaymentsTable, AddendumsTable, GuaranteesTable } from '../pages/contracts/ContractFinanceTables';

const statement = {
  id: 1,
  number: '1',
  date: '2025-01-01',
  work_done: 1000000,
  amount: 1000000,
  value_added_tax: 90000,
  additions: [],
  deductions: [{ title: 'حسن انجام کار', amount: 100000 }, { title: 'بیمه', amount: 50000 }],
  deductions_total: 150000,
  net_amount: 940000,
  exchange_rate: 1,
  currency_name: 'ریال',
};

test('finance tables render', () => {
  const payment = {
    id: 1,
    date: '2025-01-02',
    amount: 100,
    method: 'نقدی',
    statement_number: '03',
    statement_kind: 'increase',
    payment_type: 'advance',
    payment_type_display: 'پیش‌پرداخت',
    allocations: [
      { id: 1, target_type: 'statement', statement: 3, kind: 'net', amount: 60, title: '03', kind_display: 'خالص صورت‌وضعیت' },
      { id: 2, target_type: 'statement', statement: 3, kind: 'retention', amount: 40, title: '03', kind_display: 'سپرده حسن انجام کار' },
    ],
  };
  const unlinked = {
    id: 2, date: '2025-01-03', amount: 50, payment_type_display: 'علی‌الحساب', allocations: [],
  };
  expect(renderToString(<StatementsTable statements={[statement]} currencyLabel="ریال" />)).toContain('صورت');
  expect(renderToString(<AdvanceTable rows={[{ id: 1, step: 'مرحله اول', amount: 100 }]} total={100} amortized={10} remaining={90} currency="ریال" />)).toContain('پیش');
  expect(renderToString(<InvoicesTable invoices={[]} />)).toContain('فاکتور');
  const paymentsHtml = renderToString(<PaymentsTable payments={[payment, unlinked]} />);
  expect(paymentsHtml).toContain('صورت‌وضعیت');
  expect(paymentsHtml).toContain('03');
  expect(paymentsHtml).toContain('خالص');
  expect(paymentsHtml).toContain('حسن انجام کار');
  expect(paymentsHtml).toContain('پیش‌پرداخت');
  expect(paymentsHtml).toContain('بدون تخصیص');
  expect(renderToString(<AddendumsTable addendums={[]} />)).toContain('الحاقیه');
  expect(renderToString(<GuaranteesTable guarantees={[]} />)).toContain('تضمین');
});
