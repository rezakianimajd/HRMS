import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import SeasonalReportPage from '../pages/accounting/tax/SeasonalReportPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { accounting: '#0ea5e9' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'accounting' }, applications: [] }),
}));

const fiscalYears = [
  { id: 7, name: '۱۴۰۴', start_date: '2025-03-21', end_date: '2026-03-20' },
];

const PARTY_ROW = {
  id: 'seed-1',
  name: 'شرکت آلفا تجارت',
  city: 'تهران',
  address: 'خیابان ولیعصر، پلاک ۱۲',
  nationalId: '10101010101',
  description: 'خدمات مشاوره مالی',
  amount: '1000000',
  vat: '90000',
  kind: 1,
  invoiceDate: '2026-04-10',
  invoiceNo: 'A-12',
  status: 'registered',
};

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

const setNativeValue = (element, value) => {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  descriptor.set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/accounting/tax/seasonal']}>
          <SeasonalReportPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(500);
  });
  for (let index = 0; index < 2; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(160); });
  }
  return { root, container };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/accounting/fiscal-years/') return Promise.resolve({ data: fiscalYears });
    return Promise.resolve({ data: [] });
  });
});


test('seasonal manual report renders header, period selectors and all columns', async () => {
  const { root, container } = await renderPage();

  expect(container.textContent).toContain('صورت معاملات فصلی (ورود دستی)');
  expect(container.textContent).toContain('سال مالی');
  expect(container.textContent).toContain('فصل');
  expect(container.textContent).toContain('خروجی اکسل');

  const table = container.querySelector('table');
  expect(table).not.toBeNull();
  const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
  expect(headers).toEqual([
    'ردیف', 'نام و نام خانوادگی / نام شرکت', 'شهر', 'آدرس', 'شناسه ملی',
    'شرح کالا / خدمات', 'مبلغ', 'مالیات بر ارزش افزوده', 'جمع کل',
    'نوع', 'تاریخ فاکتور', 'شماره فاکتور', 'وضعیت (سامانه مودیان)', 'عملیات',
  ]);

  root.unmount();
  container.remove();
});

test('total column equals amount + vat and the footer aggregates the quarter', async () => {
  window.localStorage.setItem('hrms.seasonal.rows.7.q1', JSON.stringify([PARTY_ROW]));
  const { root, container } = await renderPage();

  const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(1);
  // ۱٬۰۹۰٬۰۰۰ = ۱٬۰۰۰٬۰۰۰ + ۹۰٬۰۰۰
  expect(bodyRows[0].textContent).toContain('۱٬۰۹۰٬۰۰۰');
  expect(container.textContent).toContain('جمع کل: ۱٬۰۹۰٬۰۰۰');
  expect(container.textContent).toContain('جمع ارزش افزوده: ۹۰٬۰۰۰');
  expect(container.textContent).toContain('درج‌شده در سامانه: ۱ از ۱');

  root.unmount();
  container.remove();
});

test('typing the first letters of a known party suggests it and fills city/address', async () => {
  window.localStorage.setItem('hrms.seasonal.rows.7.q1', JSON.stringify([PARTY_ROW]));
  const { root, container } = await renderPage();

  const addButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('ردیف جدید'));
  await act(async () => { addButton.click(); await wait(120); });

  const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(2);
  const newRow = bodyRows[1];

  const nameInput = newRow.querySelector('input[aria-label="نام طرف معامله"]');
  expect(nameInput).not.toBeNull();
  await act(async () => {
    nameInput.focus();
    setNativeValue(nameInput, 'شر');
    await wait(260);
  });

  const suggestion = Array.from(document.querySelectorAll('li[role="option"]'))
    .find((option) => option.textContent.includes('شرکت آلفا تجارت'));
  expect(suggestion).toBeTruthy();
  expect(suggestion.textContent).toContain('را می‌خواهی؟');
  expect(suggestion.textContent).toContain('تهران');

  await act(async () => { suggestion.click(); await wait(260); });

  const freshRow = Array.from(container.querySelectorAll('tbody tr'))[1];
  expect(freshRow.querySelector('input[placeholder="شهر"]').value).toBe('تهران');
  expect(freshRow.querySelector('input[placeholder="آدرس"]').value).toBe('خیابان ولیعصر، پلاک ۱۲');

  root.unmount();
  container.remove();
});

test('excel export builds a downloadable sheet for the selected quarter', async () => {
  window.localStorage.setItem('hrms.seasonal.rows.7.q1', JSON.stringify([PARTY_ROW]));
  const { root, container } = await renderPage();

  const created = [];
  window.URL.createObjectURL = jest.fn((blob) => { created.push(blob); return 'blob:seasonal'; });
  window.URL.revokeObjectURL = jest.fn();
  const clickSpy = jest.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function noop() {});

  const exportButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('خروجی اکسل'));
  await act(async () => { exportButton.click(); await wait(160); });

  expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(created[0].type).toContain('application/vnd.ms-excel');
  expect(clickSpy).toHaveBeenCalledTimes(1);
  expect(clickSpy.mock.instances[0].download).toBe('seasonal-transactions-7-q1.xls');

  clickSpy.mockRestore();
  root.unmount();
  container.remove();
});

test('duplicate row keeps the party and the 10% vat helper fills empty vat cells', async () => {
  window.localStorage.setItem('hrms.seasonal.rows.7.q1', JSON.stringify([
    { ...PARTY_ROW, vat: '' },
  ]));
  const { root, container } = await renderPage();

  const vatButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('ارزش افزوده ۱۰٪'));
  await act(async () => { vatButton.click(); await wait(160); });

  // ۱۰٪ از ۱٬۰۰۰٬۰۰۰ = ۱۰۰٬۰۰۰ و جمع کل = ۱٬۱۰۰٬۰۰۰
  expect(Array.from(container.querySelectorAll('tbody tr'))[0].textContent).toContain('۱٬۱۰۰٬۰۰۰');

  const copyButton = container.querySelector('button[aria-label="کپی ردیف"]');
  expect(copyButton).not.toBeNull();
  await act(async () => { copyButton.click(); await wait(160); });

  const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(2);
  expect(bodyRows[1].querySelector('input[placeholder="شهر"]').value).toBe('تهران');
  expect(bodyRows[1].querySelector('input[placeholder="شماره"]').value).toBe('');

  root.unmount();
  container.remove();
});
