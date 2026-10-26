import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import ContractDocumentsPage from '../pages/ContractDocumentsPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { contracts: '#f97316' },
}));

const contracts = [
  {
    id: 1, number: 'C-1405-01', subject: 'قرارداد نمونه', party_name: 'پیمانکار نمونه',
    status: 'active', status_display: 'در حال اجرا', amount: 1000000,
    start_date: '2026-01-01', end_date: '2026-12-31', currency_name: 'ریال',
  },
];
const documents = [
  {
    id: 1, contract: 1, contract_number: 'C-1405-01', contract_subject: 'قرارداد نمونه',
    contract_party_name: 'پیمانکار نمونه', title: 'متن قرارداد', file_name: 'contract.pdf',
    file_extension: '.pdf', file_url: 'https://example.test/contract.pdf',
    file_size: 2048, file_size_display: '2 KB', uploaded_at: '2026-10-24T08:00:00Z',
  },
];

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (String(url).includes('applications')) {
      return Promise.resolve({ data: { applications: [] } });
    }
    if (String(url).includes('/contract-documents/')) {
      return Promise.resolve({ data: documents });
    }
    if (String(url).includes('/external-contracts/')) {
      return Promise.resolve({ data: contracts });
    }
    return Promise.resolve({ data: [] });
  });
});

test('archive landing shows the contract list above the latest uploads on the standard toolbar', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-documents']}>
            <ContractDocumentsPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await wait(1200);
  });

  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('بایگانی اسناد قرارداد');
  // کارت راهنمای بایگانی حذف شده است
  expect(container.textContent).not.toContain('راهنمای بایگانی');

  // نوار استاندارد زیر هدر: جستجو → ترتیب → فیلترها
  const searchInput = container.querySelector('input[placeholder]');
  const sortSelect = container.querySelector('[role="combobox"]');
  const filtersButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('فیلترها'));
  expect(searchInput).toBeTruthy();
  expect(sortSelect).toBeTruthy();
  expect(filtersButton).toBeTruthy();
  expect(searchInput.compareDocumentPosition(sortSelect) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(sortSelect.compareDocumentPosition(filtersButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  // محتوای صفحهٔ ورود: لیست قراردادها و سپس آخرین بارگذاری‌ها
  expect(container.textContent).toContain('لیست قراردادها');
  expect(container.textContent).toContain('آخرین بارگذاری‌ها');
  const contractsTable = container.querySelector('table[aria-label="فهرست قراردادهای بایگانی"]');
  expect(contractsTable).toBeTruthy();
  expect(Array.from(contractsTable.querySelectorAll('thead th')).map((th) => th.textContent.trim()))
    .toEqual(['شماره', 'موضوع قرارداد', 'طرف قرارداد', 'وضعیت', 'تعداد اسناد', 'آخرین بارگذاری', 'عملیات']);
  expect(contractsTable.querySelector('tbody tr').textContent).toContain('قرارداد نمونه');
  // شمارهٔ قرارداد با ارقام فارسی نمایش داده می‌شود
  expect(contractsTable.querySelector('tbody tr').textContent).toMatch(/[۰-۹]/);

  const docsTable = container.querySelector('table[aria-label="فهرست اسناد قرارداد"]');
  expect(docsTable).toBeTruthy();
  expect(docsTable.querySelector('tbody tr').textContent).toContain('متن قرارداد');

  // جدول‌ها از توکن‌های تم استفاده می‌کنند
  const contractsHost = contractsTable.closest('.MuiTableContainer-root');
  expect(contractsHost.getAttribute('data-visible-rows')).toBe('13');
  expect(contractsHost.getAttribute('data-row-height')).toBe('38');

  // جستجوی سمت کاربر روی لیست قراردادها
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    valueSetter.call(searchInput, 'یافت‌نشدنی');
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
  });
  expect(container.textContent).toContain('قراردادی با این مشخصات پیدا نشد.');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('clicking a contract row opens its documents in the same standard table', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-documents']}>
            <ContractDocumentsPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await wait(1200);
  });

  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  const contractsTable = container.querySelector('table[aria-label="فهرست قراردادهای بایگانی"]');
  expect(contractsTable).toBeTruthy();
  const firstRow = contractsTable.querySelector('tbody tr');
  await act(async () => {
    firstRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(500);
  });

  // نمای قرارداد: فقط جدول اسناد می‌ماند و دکمهٔ «پرونده قرارداد» ظاهر می‌شود
  expect(container.querySelector('table[aria-label="فهرست قراردادهای بایگانی"]')).toBeNull();
  const docsTable = container.querySelector('table[aria-label="فهرست اسناد قرارداد"]');
  expect(docsTable).toBeTruthy();
  expect(docsTable.textContent).toContain('متن قرارداد');
  expect(container.textContent).toContain('پرونده قرارداد');

  await act(async () => { root.unmount(); });
  container.remove();
});
