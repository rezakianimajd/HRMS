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
  };
  expect(renderToString(<StatementsTable statements={[statement]} currencyLabel="ریال" />)).toContain('صورت');
  expect(renderToString(<AdvanceTable rows={[{ id: 1, step: 'مرحله اول', amount: 100 }]} total={100} amortized={10} remaining={90} currency="ریال" />)).toContain('پیش');
  expect(renderToString(<InvoicesTable invoices={[]} />)).toContain('فاکتور');
  expect(renderToString(<PaymentsTable payments={[payment]} />)).toContain('تعدیل افزایشی ۰۳');
  expect(renderToString(<PaymentsTable payments={[payment]} />)).toContain('پیش‌پرداخت');
  expect(renderToString(<AddendumsTable addendums={[]} />)).toContain('الحاقیه');
  expect(renderToString(<GuaranteesTable guarantees={[]} />)).toContain('تضمین');
});
