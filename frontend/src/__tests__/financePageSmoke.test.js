import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import axiosInstance from '../core/api/axiosConfig';
import ContractFinancePage from '../pages/ContractFinancePage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const summary = {
  id: 1, number: 'C-1', subject: 'قرارداد آزمایشی', party_name: 'شرکت آزمایشی',
  amount: 1000000, effective_amount: 1200000, currency_name: 'ریال', currency_symbol: 'ریال',
  exchange_rate: 1, status: 'active', status_display: 'در حال اجرا',
  start_date: '2025-01-01', end_date: '2025-12-31', effective_end_date: '2026-03-31',
  contract_type_display: 'پیمانکاری', advance_payment: 200000, advance_payments: [],
};
const detail = {
  ...summary,
  statements: [{
    id: 1, number: '1', date: '2025-02-01', work_done: 500000, amount: 500000,
    value_added_tax: 45000, additions: [], deductions_total: 75000,
    deductions: [{ title: 'حسن انجام کار', amount: 50000 }, { title: 'بیمه', amount: 25000 }],
    net_amount: 470000, exchange_rate: 1, currency_name: 'ریال',
  }],
  invoices: [{ id: 1, number: 'INV-1', subject: 'فاکتور', date: '2025-02-02', amount: 100000, vat: 9000, total: 109000 }],
  payments: [{ id: 1, date: '2025-02-03', amount: 90000, method: 'bank' }],
  addendums: [{ id: 1, number: 'A-1', date: '2025-03-01', amount_change: 200000, subject_type_display: 'افزایش مبلغ' }],
  guarantees: [{ id: 1, guarantee_type_display: 'حسن انجام کار', instrument_type_display: 'ضمانت‌نامه', number: 'G-1', amount: 50000, expiry_date: '2026-01-01', is_released: false }],
};

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/1/') return Promise.resolve({ data: detail });
    return Promise.resolve({ data: { count: 1, results: [summary] } });
  });
});

test('contract finance page renders with data', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-finance?contract=1']}>
            <ContractFinancePage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
  expect(container.textContent).toContain('نمای مالی قرارداد');
  root.unmount();
});
