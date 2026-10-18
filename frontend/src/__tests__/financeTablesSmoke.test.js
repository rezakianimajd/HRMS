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
  expect(renderToString(<StatementsTable statements={[statement]} currencyLabel="ریال" />)).toContain('صورت');
  expect(renderToString(<AdvanceTable rows={[{ id: 1, step: 'مرحله اول', amount: 100 }]} total={100} amortized={10} remaining={90} currency="ریال" />)).toContain('پیش');
  expect(renderToString(<InvoicesTable invoices={[]} />)).toContain('فاکتور');
  expect(renderToString(<PaymentsTable payments={[]} />)).toContain('پرداخت');
  expect(renderToString(<AddendumsTable addendums={[]} />)).toContain('الحاقیه');
  expect(renderToString(<GuaranteesTable guarantees={[]} />)).toContain('تضمین');
});
