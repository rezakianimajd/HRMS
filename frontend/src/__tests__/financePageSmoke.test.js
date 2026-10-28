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
    value_added_tax: 45000,
    additions: [{ title: 'مالیات بر ارزش افزوده', amount: 45000 }, { title: 'هزینه حمل', amount: 10000 }],
    additions_total: 55000,
    deductions_total: 75000,
    deductions: [{ title: 'حسن انجام کار', amount: 50000 }, { title: 'بیمه', amount: 25000 }],
    net_amount: 470000, exchange_rate: 1, currency_name: 'ریال', is_approved: true,
  }],
  invoices: [{ id: 1, number: 'INV-1', subject: 'فاکتور', date: '2025-02-02', amount: 100000, vat: 9000, total: 109000 }],
  payments: [{ id: 1, date: '2025-02-03', amount: 90000, method: 'bank', statement: 1, payment_type_display: 'عادی' }],
  addendums: [{ id: 1, number: 'A-1', date: '2025-03-01', amount_change: 200000, subject_type_display: 'افزایش مبلغ' }],
  guarantees: [{ id: 1, guarantee_type_display: 'حسن انجام کار', instrument_type_display: 'ضمانت‌نامه', number: 'G-1', amount: 50000, expiry_date: '2026-01-01', is_released: false, contract_guarantee_index: 0 }],
  guarantee_items: [{ type: 'performance', percent: 5 }],
  guarantee_items_display: [{ type: 'performance', type_label: 'حسن انجام کار', percent: 5 }],
  project_allocations_display: [{ project: 1, project_name: 'پروژهٔ آزمایشی', percentage: 100 }],
  retention_percent: 10,
};

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.ResizeObserver = global.ResizeObserver || class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/1/') return Promise.resolve({ data: detail });
    if (url === '/contract-statements/') return Promise.resolve({ data: { count: 0, results: [] } });
    if (url === '/contract-payments/') return Promise.resolve({ data: { count: 0, results: [] } });
    if (url === '/external-contracts/') return Promise.resolve({ data: { count: 1, results: [summary] } });
    return Promise.resolve({ data: { count: 0, results: [] } });
  });
});

const renderPage = async (entry) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={[entry]}>
            <ContractFinancePage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 220));
    });
  }
  return { container, root };
};

test('contract finance landing lists contracts with financial columns', async () => {
  const { container, root } = await renderPage('/contracts-finance');

  expect(container.textContent).toContain('تحلیل مالی قرارداد');
  expect(container.textContent).toContain('شماره قرارداد');
  expect(container.textContent).toContain('طرف قرارداد');
  expect(container.textContent).toContain('مبلغ قرارداد');
  expect(container.textContent).toContain('صورت‌وضعیت');
  expect(container.textContent).toContain('کارکرد');
  expect(container.textContent).toContain('پرداختی');
  expect(container.textContent).toContain('مانده');
  expect(container.textContent).toContain('C-۱');
  expect(container.textContent).toContain('شرکت آزمایشی');
  expect(container.textContent).toContain('بیشترین مانده مالی');
  expect(container.querySelector('input[placeholder*="جستجو"]')).toBeTruthy();
  root.unmount();
});

test('contract finance analysis renders specs, grouped table and eight analyses', async () => {
  const { container, root } = await renderPage('/contracts-finance?contract=1');

  expect(container.textContent).toContain('تحلیل مالی قرارداد');
  /* مشخصات کمی قرارداد */
  expect(container.textContent).toContain('قرارداد آزمایشی');
  expect(container.textContent).toContain('شرکت آزمایشی');
  expect(container.textContent).toContain('مبلغ پایه');
  expect(container.textContent).toContain('نرخ تبدیل');
  /* جدول تفصیلی با سرستون‌های گروه‌بندی‌شده */
  expect(container.textContent).toContain('جدول تفصیلی مالی صورت‌وضعیت‌ها');
  expect(container.textContent).toContain('مشخصات قرارداد');
  expect(container.textContent).toContain('ناخالص ارزی');
  expect(container.textContent).toContain('مالیات بر ارزش افزوده');
  expect(container.textContent).toContain('حسن انجام کار');
  expect(container.textContent).toContain('بیمه');
  expect(container.textContent).toContain('جمع اضافات');
  expect(container.textContent).toContain('جمع کسورات');
  expect(container.textContent).toContain('خالص قابل پرداخت');
  expect(container.textContent).toContain('پرداخت‌شده');
  /* هشت تحلیل */
  expect(container.textContent).toContain('تحلیل وضعیت مالی کل قرارداد');
  expect(container.textContent).toContain('تحلیل صورت‌وضعیت‌ها و پرداخت‌ها');
  expect(container.textContent).toContain('تحلیل تخصیص مالی بین پروژه‌ها');
  expect(container.textContent).toContain('تحلیل پیش‌پرداخت و کسورات');
  expect(container.textContent).toContain('تحلیل ضمانت‌نامه‌ها و ریسک مالی');
  expect(container.textContent).toContain('تحلیل انحراف مبلغ قرارداد و پیش‌بینی هزینه نهایی');
  expect(container.textContent).toContain('تحلیل جریان نقدی قرارداد');
  expect(container.textContent).toContain('تحلیل مغایرت‌ها و کنترل‌های مالی');
  /* اسناد مالی */
  expect(container.textContent).toContain('اسناد مالی قرارداد');
  expect(container.textContent).toContain('فهرست قراردادها');
  root.unmount();
});
