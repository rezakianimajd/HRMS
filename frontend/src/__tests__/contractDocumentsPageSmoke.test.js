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

  // محتوای صفحهٔ ورود: فقط یک جدول (قراردادها) در کارت؛ عنوان و چیپ بخش‌ها حذف شده‌اند
  expect(container.textContent).not.toContain('لیست قراردادها');
  expect(container.textContent).not.toContain('آخرین بارگذاری‌ها');
  const tables = Array.from(container.querySelectorAll('table'));
  expect(tables).toHaveLength(1);
  const contractsTable = tables[0];
  expect(contractsTable.getAttribute('aria-label')).toBe('فهرست قراردادهای بایگانی');
  expect(Array.from(contractsTable.querySelectorAll('thead th')).map((th) => th.textContent.trim()))
    .toEqual(['شماره قرارداد', 'طرف قرارداد', 'موضوع قرارداد', 'تعداد اسناد']);
  expect(contractsTable.querySelector('tbody tr').textContent).toContain('قرارداد نمونه');
  // شمارهٔ قرارداد با ارقام فارسی نمایش داده می‌شود
  expect(contractsTable.querySelector('tbody tr').textContent).toMatch(/[۰-۹]/);

  // جدول در کارتی با فاصلهٔ داخلی، و آخرین بارگذاری‌ها در کارت جداگانه کنار آن
  expect(contractsTable.textContent).not.toContain('متن قرارداد');
  expect(container.textContent).toContain('متن قرارداد');
  const tableCard = contractsTable.closest('.MuiPaper-root');
  expect(tableCard).toBeTruthy();
  expect(tableCard.contains(contractsTable)).toBe(true);
  expect(tableCard.textContent).not.toContain('متن قرارداد');
  expect(window.getComputedStyle(tableCard).paddingTop).toBe('12px');
  const recentsCard = Array.from(container.querySelectorAll('.MuiPaper-root'))
    .find((card) => card !== tableCard && card.textContent.includes('متن قرارداد'));
  expect(recentsCard).toBeTruthy();

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

test('contract list renders from the documents payload before the heavy contracts request resolves', async () => {
  // endpoint سنگین قراردادها هرگز پاسخ نمی‌دهد؛ جدول باید از دادهٔ اسناد ساخته شود
  axiosInstance.get.mockImplementation((url) => {
    if (String(url).includes('/contract-documents/')) return Promise.resolve({ data: documents });
    if (String(url).includes('/external-contracts/')) return new Promise(() => {});
    if (String(url).includes('applications')) return Promise.resolve({ data: { applications: [] } });
    return Promise.resolve({ data: [] });
  });

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
    await wait(900);
  });

  for (let index = 0; index < 2; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(150); });
  }

  const contractsTable = container.querySelector('table[aria-label="فهرست قراردادهای بایگانی"]');
  expect(contractsTable).toBeTruthy();
  const rowText = contractsTable.querySelector('tbody tr').textContent;
  expect(rowText).toContain('قرارداد نمونه');
  expect(rowText).toContain('پیمانکار نمونه');

  // ستون «تعداد اسناد» وسط‌چین است (مستقل از ترازِ سلول‌های تم)
  const countHeader = contractsTable.querySelectorAll('thead th')[3];
  expect(countHeader.textContent.trim()).toBe('تعداد اسناد');
  // وسط‌چینی با flex است تا به text-align (که تم با !important راست‌چین می‌کند) وابسته نباشد
  expect(window.getComputedStyle(countHeader.querySelector('div')).justifyContent).toBe('center');
  const countCell = contractsTable.querySelector('tbody tr').querySelectorAll('td')[3];
  expect(window.getComputedStyle(countCell.querySelector('div')).justifyContent).toBe('center');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('the new document dialog keeps the relation chips icon-free and spaces the actions', async () => {
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
    await wait(1000);
  });

  for (let index = 0; index < 2; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  const newButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('سند جدید'));
  expect(newButton).toBeTruthy();
  await act(async () => { newButton.click(); await wait(450); });

  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).toBeTruthy();

  // چیپ‌های جایگاه سند بدون آیکن هستند
  const relationLabels = ['مستندات قرارداد', 'الحاقیه', 'تضمین', 'صورت‌وضعیت'];
  const relationChips = Array.from(dialog.querySelectorAll('.MuiChip-root'))
    .filter((chip) => relationLabels.includes(chip.textContent.trim()));
  expect(relationChips).toHaveLength(4);
  relationChips.forEach((chip) => expect(chip.querySelector('svg')).toBeNull());

  // توضیح زیر عنوان‌ها حذف شده است
  expect(dialog.textContent).not.toContain('می‌توانید چند فایل را هم‌زمان بارگذاری کنید');
  expect(dialog.textContent).not.toContain('خالی بماند، از نام فایل ساخته می‌شود.');
  expect(dialog.textContent).not.toContain('این سند در سطح قرارداد بایگانی می‌شود.');

  // در حالت «مستندات قرارداد» فقط یک سلکت (قرارداد) هست؛ با انتخاب الحاقیه، سلکت مورد مرتبط اضافه می‌شود
  expect(dialog.querySelectorAll('[role="combobox"]')).toHaveLength(1);
  const addendumChip = relationChips.find((chip) => chip.textContent.trim() === 'الحاقیه');
  await act(async () => {
    addendumChip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(300);
  });
  expect(dialog.querySelectorAll('[role="combobox"]')).toHaveLength(2);

  // فاصلهٔ استاندارد بین دکمه‌های انصراف و بارگذاری
  const actions = dialog.querySelector('.MuiDialogActions-root');
  expect(actions).toBeTruthy();
  expect(window.getComputedStyle(actions).gap).toBe('8px');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('opening the archive with a document id starts editing that document', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-documents?contract=1&document=1']}>
            <ContractDocumentsPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await wait(1100);
  });

  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).toBeTruthy();
  // ویرایشگر سند همان سند انتخاب‌شده را با عنوانش باز می‌کند
  expect(dialog.textContent).toContain('ویرایش سند قرارداد');
  const titleInput = Array.from(dialog.querySelectorAll('input'))
    .find((input) => String(input.value || '').includes('متن قرارداد'));
  expect(titleInput).toBeTruthy();

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
  expect(Array.from(docsTable.querySelectorAll('thead th')).map((th) => th.textContent.trim()))
    .toEqual(['ردیف', 'جایگاه', 'عنوان', 'نوع', 'حجم', 'تاریخ بارگذاری', 'عملیات']);
  // ستون «جایگاه» فقط متن جایگاه را نشان می‌دهد (نه نام قرارداد)
  const firstCells = Array.from(docsTable.querySelectorAll('tbody tr')[0].querySelectorAll('td'))
    .map((cell) => cell.textContent.trim());
  expect(firstCells[0]).toBe('۱');
  expect(firstCells[2]).toBe('متن قرارداد');
  expect(container.textContent).toContain('پرونده قرارداد');

  await act(async () => { root.unmount(); });
  container.remove();
});
