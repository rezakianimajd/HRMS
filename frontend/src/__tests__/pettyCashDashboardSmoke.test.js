import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import PettyCashDashboard from '../pages/pettyCash/PettyCashDashboard';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'pettycash' }, applications: [] }),
}));

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const dashboard = {
  total_balance: 12500000,
  total_limit: 20000000,
  active_funds: 2,
  funds_count: 2,
  pending_total: 0,
  posted_total: 3500000,
  monthly_spend: 2100000,
  unsettled_count: 1,
  overdue_count: 1,
  total_statements: 4,
  status_counts: { draft: 1, posted: 3 },
  by_category: [{ category: 'خرید', total: 1200000 }],
  by_custodian: [{ name: 'مریم احمدی', total: 1500000 }],
  by_account: [{ code: '701', account: 'هزینه‌های اداری', total: 900000 }],
  by_project: [],
  monthly_trend: [
    { year: 1405, month: 5, total: 1000000 },
    { year: 1405, month: 6, total: 1400000 },
  ],
  recent_activity: [
    { type: 'statement', id: 8, title: 'PC-EXP-1', fund: 'تنخواه مرکزی', amount: 500000, date: '2026-11-10' },
  ],
  alerts: [{ level: 'warning', title: '۱ تنخواه به سقف اعتبار نزدیک شده است', count: 1 }],
  near_limit: [{ id: 5, title: 'تنخواه مرکزی', balance: 19000000, limit: 20000000, percent: 95 }],
  overdue: [{ id: 9, number: 'PC-EXP-2', fund: 'تنخواه مرکزی', total: 250000, days_late: 4 }],
};

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/petty-cash/dashboard']}>
          <PettyCashDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(450);
  });
  await act(async () => { await wait(200); });
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockReset();
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/petty-cash-funds/dashboard/') return Promise.resolve({ data: dashboard });
    if (url === '/petty-cash-funds/') {
      return Promise.resolve({
        data: [{ id: 5, code: 'PC-01', title: 'تنخواه مرکزی', custodian_name: 'مریم احمدی', status: 'active' }],
      });
    }
    return Promise.resolve({ data: [] });
  });
});

test('petty cash dashboard renders theme-driven analytics and the print action', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('داشبورد تنخواه');
  expect(container.textContent).toContain('مانده کل تنخواه‌ها');
  expect(container.textContent).toContain('روند مصرف ۶ ماه اخیر');
  expect(container.textContent).toContain('تنخواه مرکزی');
  expect(container.textContent).toContain('ثبت‌شده');
  expect(container.textContent).toContain('صورت‌های معوق');
  expect(container.textContent).toContain('چاپ');

  const calls = axiosInstance.get.mock.calls;
  expect(calls.some(([url]) => url === '/petty-cash-funds/dashboard/')).toBe(true);

  root.unmount();
  container.remove();
});
