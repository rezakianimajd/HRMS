import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import PettyCashExpenseNewPage from '../pages/PettyCashExpenseNewPage';

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

const fund = {
  id: 5,
  code: 'PC-01',
  title: 'تنخواه دفتر مرکزی',
  custodian_name: 'مریم احمدی',
  balance: 12500000,
  limit: 20000000,
  usage_percent: 62,
  payment_methods: ['cash', 'card'],
};

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/petty-cash/expenses/new']}>
          <PettyCashExpenseNewPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(420);
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
    if (url === '/petty-cash-settings/access_summary/') {
      return Promise.resolve({
        data: { can_create_expense: true, has_role: true, accessible_funds_count: 1, is_senior_manager: false },
      });
    }
    if (url === '/petty-cash-funds/') return Promise.resolve({ data: [fund] });
    return Promise.resolve({ data: [] });
  });
});

test('expense entry page is theme-driven and shows only the custodian fund', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('ثبت صورت ریز هزینه');
  expect(container.textContent).toContain('تنخواه دفتر مرکزی');
  expect(container.textContent).toContain('فروشنده / طرف حساب');
  expect(container.textContent).toContain('کد معین');
  expect(container.textContent).toContain('ارزش افزوده');
  expect(container.textContent).toContain('مریم احمدی');

  const fundCalls = axiosInstance.get.mock.calls.filter(([url]) => url === '/petty-cash-funds/');
  expect(fundCalls[0][1].params.status).toBe('active');

  root.unmount();
  container.remove();
});

test('user without any petty cash assignment sees the access notice instead of the form', async () => {
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/petty-cash-settings/access_summary/') {
      return Promise.resolve({
        data: { can_create_expense: false, has_role: false, accessible_funds_count: 0 },
      });
    }
    if (url === '/petty-cash-funds/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });

  const { container, root } = await renderPage();

  expect(container.textContent).toContain('تنخواهی به شما تخصیص داده نشده است');
  expect(container.textContent).not.toContain('ردیف‌های هزینه');

  root.unmount();
  container.remove();
});
