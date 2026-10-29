import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractExpiringPage from '../pages/ContractExpiringPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { contracts: '#f59e0b' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'contracts' }, applications: [] }),
}));

const iso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const contracts = [
  { id: 1, number: 'C-1', subject: 'قرارداد منقضی‌شده', party_name: 'شرکت الف', status: 'active', status_display: 'در حال اجرا', amount: 100000000, currency_name: 'ریال ایران', start_date: iso(-300), end_date: iso(-5), addendums: [] },
  { id: 2, number: 'C-2', subject: 'قرارداد ۳۰ روزه', party_name: 'شرکت ب', status: 'active', status_display: 'در حال اجرا', amount: 200000000, currency_name: 'ریال ایران', start_date: iso(-100), end_date: iso(10), addendums: [] },
  { id: 3, number: 'C-3', subject: 'قرارداد ۶۰ روزه', party_name: 'شرکت ج', status: 'active', status_display: 'در حال اجرا', amount: 300000000, currency_name: 'ریال ایران', start_date: iso(-100), end_date: iso(45), addendums: [] },
  { id: 4, number: 'C-4', subject: 'قرارداد ۹۰ روزه', party_name: 'شرکت د', status: 'active', status_display: 'در حال اجرا', amount: 400000000, currency_name: 'ریال ایران', start_date: iso(-100), end_date: iso(80), addendums: [] },
];

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/') return Promise.resolve({ data: contracts });
    return Promise.resolve({ data: [] });
  });
});

test('expiring contracts page renders the themed toolbar and a single-row table', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-expiring']}>
          <ContractExpiringPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(700);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  // هدر صفحه
  expect(container.textContent).toContain('قراردادهای رو به انقضا');
  expect(container.textContent).toContain('خروجی');

  // کارت‌های حذف‌شده نباید وجود داشته باشند
  expect(container.textContent).not.toContain('توزیع بازه‌های انقضا');
  expect(container.textContent).not.toContain('فوری‌ترین قراردادها');
  expect(container.textContent).not.toContain('درجه فوریت');
  expect(container.querySelector('[aria-label="نمای کارت"]')).toBeNull();

  // نوار ابزار استاندارد استودیوتم
  expect(container.querySelector('input[placeholder*="جستجو"]')).toBeTruthy();

  // جدول تک‌ردیفه با ستون‌های جدید
  const table = container.querySelector('[aria-label="فهرست قراردادهای رو به انقضا"]');
  expect(table).toBeTruthy();
  expect(container.textContent).toContain('موضوع قرارداد');
  expect(container.textContent).toContain('طرف قرارداد');
  expect(container.textContent).toContain('پایان مؤثر');
  expect(container.textContent).toContain('روز مانده');
  expect(container.textContent).toContain('مبلغ مؤثر');
  expect(container.textContent).toContain('بازه');

  // ردیف‌های بازه پایش
  expect(container.textContent).toContain('قرارداد منقضی‌شده');
  expect(container.textContent).toContain('قرارداد ۳۰ روزه');
  expect(container.textContent).toContain('منقضی شده');
  expect(container.textContent).toContain('انقضا تا ۳۰ روز');

  // جمع‌های پایین جدول
  expect(container.textContent).toContain('در بازه پایش:');
  expect(container.textContent).toContain('مبلغ در معرض خطر:');

  // عملیات ردیف
  expect(container.querySelector('button[aria-label="پرونده قرارداد"]')).toBeTruthy();

  root.unmount();
  container.remove();
});
