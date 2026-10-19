import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import axiosInstance from '../core/api/axiosConfig';
import FinancialStatementsPage from '../pages/accounting/reports/FinancialStatementsPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const statementData = {
  income_statement: {
    revenue: 1000000, cost_of_sales: 400000, gross_profit: 600000,
    expenses: 200000, net_profit: 400000, expense_details: [],
  },
  balance_sheet: {
    total_assets: 5000000, total_liabilities: 2000000, total_equity: 3000000,
    total_liabilities_equity: 5000000, assets: [], liabilities: [], equity: [],
  },
  cash_flow: {
    operating_in: 800000, operating_out: 300000, operating: 500000,
    investing: -100000, financing: 50000, net_change: 450000,
  },
  ratios: {
    debt_ratio: 0.4, equity_ratio: 0.6, gross_margin: 0.6,
    net_margin: 0.4, return_on_equity: 0.13, return_on_assets: 0.08,
  },
  fiscal_year: {
    id: 1, name: '۱۴۰۴', start_date: '2025-03-21', end_date: '2026-03-20', is_current: true,
  },
  as_of: '',
  generated_at: '2026-10-19T10:00:00+03:30',
};

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter>
            <FinancialStatementsPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
  });
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 220));
    });
  }
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  axiosInstance.get.mockClear();
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/accounting/fiscal-years/') {
      return Promise.resolve({ data: [{ id: 1, name: '۱۴۰۴', is_current: true, start_date: '2025-03-21', end_date: '2026-03-20' }] });
    }
    if (url === '/accounting/reports/financial-statements/') {
      return Promise.resolve({ data: statementData });
    }
    if (url === '/accounting/reports/balance-sheet/') {
      return Promise.resolve({
        data: {
          total_assets: 5000000, total_liabilities: 2000000, total_equity: 3000000,
          asset_groups: [{ code: '11', name: 'موجودی نقد', total: 5000000, rows: [] }],
          liability_groups: [{ code: '21', name: 'حساب‌های پرداختنی', total: 2000000, rows: [] }],
          equity_groups: [{ code: '31', name: 'سرمایه', total: 3000000, rows: [] }],
        },
      });
    }
    if (url === '/applications/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
});

test('financial statements workspace renders TOC, statements and edit mode', async () => {
  const { container, root } = await renderPage();
  expect(container.textContent).toContain('صورت‌های مالی');
  expect(container.textContent).toContain('فهرست گزارش');
  expect(container.textContent).toContain('نسخهٔ قابل ویرایش');
  expect(container.textContent).toContain('۵٬۰۰۰٬۰۰۰');

  const incomeButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('سود و زیان'));
  expect(incomeButton).toBeTruthy();
  await act(async () => { incomeButton.click(); });
  expect(container.textContent).toContain('درآمدهای عملیاتی');
  expect(container.textContent).toContain('سود ناخالص');

  const balanceButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('دارایی‌ها'));
  expect(balanceButton).toBeTruthy();
  await act(async () => { balanceButton.click(); });
  const cashRow = Array.from(container.querySelectorAll('tr'))
    .find((row) => row.textContent.includes('موجودی نقد'));
  expect(cashRow).toBeTruthy();
  expect(cashRow.textContent).toContain('۵٬۰۰۰٬۰۰۰');

  const equityButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('تغییرات حقوق'));
  expect(equityButton).toBeTruthy();
  await act(async () => { equityButton.click(); });
  expect(container.textContent).toContain('صورت تغییرات در حقوق مالکانه');
  expect(container.textContent).toContain('مانده در پایان سال جاری');

  const notesButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('یادداشت‌ها'));
  expect(notesButton).toBeTruthy();
  await act(async () => { notesButton.click(); });
  expect(container.textContent).toContain('تاریخچه و فعالیت شرکت');
  expect(container.textContent).toContain('یادداشت دارای جدول خودکار');
  expect(container.textContent).not.toContain('عملیات متوقف‌شده');

  const revenueNoteButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('درآمدهای عملیاتی') && button.textContent.includes('صفحه'));
  expect(revenueNoteButton).toBeTruthy();
  await act(async () => { revenueNoteButton.click(); });
  expect(container.textContent).toContain('درآمدهای عملیاتی به تفکیک گروه حساب');
  expect(container.textContent).toContain('جمع');

  const editButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.trim() === 'ویرایش');
  expect(editButton).toBeTruthy();
  await act(async () => { editButton.click(); });
  expect(container.textContent).toContain('پایان ویرایش');
  root.unmount();
});
