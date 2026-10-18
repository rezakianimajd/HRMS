import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import AccountingPage from '../pages/AccountingPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(() => Promise.resolve({ data: { applications: [] } })) },
}));

const dashboard = {
  kpis: {
    total_assets: 500000000, total_liabilities: 180000000, total_equity: 320000000,
    revenue_month: 120000000, expense_month: 70000000, net_profit_month: 50000000,
    total_documents: 24, posted_documents: 18, pending_documents: 4,
  },
  deltas: { revenue: 12.5, expense: -3.2, net: 15.1 },
  monthly_trend: [{ month: '2025-01', revenue: 100000000, expense: 60000000, net: 40000000 }],
  status_counts: { draft: 2, submitted: 4, posted: 18 },
  category_breakdown: [
    { key: 'asset', label: 'دارایی', value: 500000000 },
    { key: 'liability', label: 'بدهی', value: 180000000 },
    { key: 'revenue', label: 'درآمد', value: 120000000 },
  ],
  accounting_equation: { assets: 500000000, liabilities_equity: 500000000, difference: 0, balanced: true },
  top_accounts: [{ id: 1, code: '101', name: 'بانک', turnover: 200000000 }],
  aging: { receivable: { current: 100, total: 100 }, payable: { current: 50, total: 50 } },
  vat_summary: { payable: 12000000, receivable: 5000000, net: 7000000 },
  recent_documents: [{
    id: 1, number: '100', date: '2025-01-02', description: 'سند آزمایشی', status: 'posted',
    status_display: 'ثبت‌شده', total_debit: 1000, total_credit: 1000,
  }],
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }) => {
    if (queryKey?.[0] === 'accounting-fiscal-years-dashboard') {
      return { data: [{ id: 1, name: '۱۴۰۴', is_current: true }], isLoading: false };
    }
    return { data: dashboard };
  },
}));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }));
  global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

test('accounting dashboard renders without runtime errors', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <ApplicationProvider>
        <MemoryRouter initialEntries={['/accounting']}>
          <AccountingPage />
        </MemoryRouter>
      </ApplicationProvider>,
    );
  });
  expect(container.textContent).toContain('داشبورد حسابداری');
  root.unmount();
});
