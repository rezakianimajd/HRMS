import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import PettyCashExpensesPage from '../pages/PettyCashExpensesPage';

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

const row = {
  id: 21,
  number: 'PC-EXP-21',
  date: '2026-11-14',
  fund_title: 'تنخواه دفتر مرکزی',
  custodian_name: 'مریم احمدی',
  description: 'خرید لوازم اداری',
  total: 110000,
  status: 'draft',
  status_display: 'پیش‌نویس',
  is_editable: true,
  is_deleted: false,
  history: [],
};

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/petty-cash/expenses']}>
          <PettyCashExpensesPage />
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
    if (url === '/petty-cash-expense-statements/') {
      return Promise.resolve({ data: { count: 25, results: [row] } });
    }
    if (url === '/petty-cash-funds/') {
      return Promise.resolve({ data: [{ id: 5, code: 'PC-01', title: 'تنخواه دفتر مرکزی' }] });
    }
    return Promise.resolve({ data: [] });
  });
});

test('expense list uses the studio table, 20 rows per page and exposes edit in the actions column', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('صورت ریز هزینه‌ها');
  expect(container.textContent).toContain('PC-EXP-۲۱');
  expect(container.textContent).toContain('تنخواه دفتر مرکزی');
  expect(container.textContent).toContain('عملیات');
  expect(container.querySelector('[aria-label="ویرایش صورت"]')).toBeTruthy();

  const calls = axiosInstance.get.mock.calls.filter(([url]) => url === '/petty-cash-expense-statements/');
  expect(calls.length).toBeGreaterThan(0);
  expect(calls[0][1].params.page_size).toBe(20);
  expect(calls[0][1].params.page).toBe(1);

  root.unmount();
  container.remove();
});
