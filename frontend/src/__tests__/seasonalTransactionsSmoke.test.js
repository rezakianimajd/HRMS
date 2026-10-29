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

const ROWS_KEY = 'hrms.seasonal.rows.7.q1';

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

test('renders header, year/quarter selectors, studio search bar and all columns', async () => {
  const { root, container } = await renderPage();

  expect(container.textContent).toContain('صورت معاملات فصلی (ورود دستی)');
  expect(container.textContent).toContain('سال مالی');
  expect(container.textContent).toContain('فصل');
  expect(container.textContent).toContain('خروجی اکسل');

  /* نوار جستجو و فیلتر استودیو تم */
  const searchInput = container.querySelector('input[placeholder^="جستجو در نام طرف معامله"]');
  expect(searchInput).not.toBeNull();

  /* دکمه‌های حذف‌شده نباید وجود داشته باشند */
  const buttonLabels = Array.from(container.querySelectorAll('button')).map((button) => button.textContent.trim());
  expect(buttonLabels.some((label) => label.includes('ارزش افزوده ۱۰٪'))).toBe(false);
  expect(buttonLabels.some((label) => label.includes('پاک کردن فصل'))).toBe(false);
  expect(buttonLabels.some((label) => label.includes('ردیف جدید'))).toBe(false);
  expect(container.textContent).not.toContain('Ctrl + Enter');

  const table = container.querySelector('table');
  expect(table).not.toBeNull();
  const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
  expect(headers).toEqual([
    'ردیف', 'نام و نام خانوادگی / نام شرکت', 'شهر', 'آدرس', 'شناسه ملی',
    'شرح کالا / خدمات', 'مبلغ', 'مالیات بر ارزش افزوده', 'جمع کل',
    'نوع', 'تاریخ فاکتور', 'شماره فاکتور', 'وضعیت', 'عملیات',
  ]);

  root.unmount();
  container.remove();
});

test('an empty row is always ready and a new one is created after typing', async () => {
  const { root, container } = await renderPage();

  /* فصل خالی: فقط یک ردیف آمادهٔ ورود */
  let bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(1);
  expect(bodyRows[0].querySelector('input[aria-label="نام طرف معامله"]')).not.toBeNull();

  /* با نوشتن در ردیف آخر، ردیف بعدی خودکار ساخته می‌شود */
  const nameInput = bodyRows[0].querySelector('input[aria-label="نام طرف معامله"]');
  await act(async () => { setNativeValue(nameInput, 'ش'); await wait(200); });
  bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(2);
  expect(bodyRows[1].querySelector('input[aria-label="نام طرف معامله"]').value).toBe('');

  root.unmount();
  container.remove();
});

test('total column equals amount + vat, numbers are Persian and the status is a dot', async () => {
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([PARTY_ROW]));
  const { root, container } = await renderPage();

  const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows.length).toBe(2);

  const firstRow = bodyRows[0];
  /* ۱٬۰۹۰٬۰۰۰ = ۱٬۰۰۰٬۰۰۰ + ۹۰٬۰۰۰ */
  expect(firstRow.textContent).toContain('۱٬۰۹۰٬۰۰۰');
  /* شناسه ملی و شماره فاکتور با ارقام فارسی نمایش داده می‌شوند */
  expect(firstRow.querySelector('input[placeholder="شناسه ملی"]').value).toBe('۱۰۱۰۱۰۱۰۱۰۱');
  expect(firstRow.querySelector('input[placeholder="شماره"]').value).toBe('A-۱۲');
  /* وضعیت: نقطهٔ سبز (درج‌شده در سامانه) */
  const select = firstRow.querySelector('[aria-label="وضعیت در سامانه مودیان"]');
  expect(select.textContent.trim()).toBe('');
  expect(select.querySelector('[data-status="registered"]')).not.toBeNull();

  expect(container.textContent).toContain('جمع کل: ۱٬۰۹۰٬۰۰۰');
  expect(container.textContent).toContain('تعداد ردیف: ۱');
  expect(container.textContent).toContain('درج‌شده در سامانه: ۱ از ۱');

  root.unmount();
  container.remove();
});

test('typing the first letters of a known party suggests it and fills city/address', async () => {
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([PARTY_ROW]));
  const { root, container } = await renderPage();

  const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(2);
  const readyRow = bodyRows[1];

  const nameInput = readyRow.querySelector('input[aria-label="نام طرف معامله"]');
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

  await act(async () => { suggestion.click(); await wait(260); });

  const filledRow = Array.from(container.querySelectorAll('tbody tr'))[1];
  expect(filledRow.querySelector('input[placeholder="شهر"]').value).toBe('تهران');
  expect(filledRow.querySelector('input[placeholder="آدرس"]').value).toBe('خیابان ولیعصر، پلاک ۱۲');
  /* پس از پر شدن، ردیف خالی بعدی خودکار ساخته می‌شود */
  expect(Array.from(container.querySelectorAll('tbody tr'))).toHaveLength(3);

  root.unmount();
  container.remove();
});

test('duplicate row keeps the party and leaves the invoice number empty', async () => {
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([PARTY_ROW]));
  const { root, container } = await renderPage();

  const copyButton = container.querySelector('button[aria-label="کپی ردیف"]');
  expect(copyButton).not.toBeNull();
  await act(async () => { copyButton.click(); await wait(200); });

  const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(3);
  expect(bodyRows[1].querySelector('input[placeholder="شهر"]').value).toBe('تهران');
  expect(bodyRows[1].querySelector('input[placeholder="شماره"]').value).toBe('');

  root.unmount();
  container.remove();
});

test('excel export builds a downloadable sheet for the selected quarter', async () => {
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([PARTY_ROW]));
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

test('search filters the table and hides the ready-to-type row', async () => {
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([
    PARTY_ROW,
    { ...PARTY_ROW, id: 'seed-2', name: 'فروشگاه بتا', city: 'اصفهان', address: 'خیابان چهارباغ', invoiceNo: 'B-9', status: 'pending' },
  ]));
  const { root, container } = await renderPage();

  expect(Array.from(container.querySelectorAll('tbody tr'))).toHaveLength(3);

  const searchInput = container.querySelector('input[placeholder^="جستجو در نام طرف معامله"]');
  await act(async () => { setNativeValue(searchInput, 'بتا'); await wait(220); });

  const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(1);
  expect(bodyRows[0].querySelector('input[aria-label="نام طرف معامله"]').value).toBe('فروشگاه بتا');
  expect(container.querySelector('[data-status="pending"]')).not.toBeNull();

  root.unmount();
  container.remove();
});



test('the date is shown with persian digits and typing a jalali date keeps it persian', async () => {
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([PARTY_ROW]));
  const { root, container } = await renderPage();

  const dateInput = container.querySelector('tbody tr input[placeholder^="۱۴۰۵"]');
  expect(dateInput).not.toBeNull();
  expect(dateInput.value).toMatch(/^[۰-۹]{4}\/[۰-۹]{2}\/[۰-۹]{2}$/);

  /* تایپ تاریخ شمسی با ارقام لاتین هم باید فارسی نمایش داده شود */
  const readyDateInput = Array.from(container.querySelectorAll('tbody tr'))
    .pop().querySelector('input[placeholder^="۱۴۰۵"]');
  await act(async () => { setNativeValue(readyDateInput, '1405/02/03'); await wait(160); });
  /* ردیف پر‌شده یکی بالاتر از ردیف خالیِ تازه‌ساخته است */
  const rowsAfterTyping = Array.from(container.querySelectorAll('tbody tr'));
  expect(rowsAfterTyping).toHaveLength(3);
  const freshDateInput = rowsAfterTyping[1].querySelector('input[placeholder^="۱۴۰۵"]');
  expect(freshDateInput.value).toBe('۱۴۰۵/۰۲/۰۳');
  expect(rowsAfterTyping[2].querySelector('input[placeholder^="۱۴۰۵"]').value).toBe('');

  root.unmount();
  container.remove();
});

test('the status dot opens the menu on click (no blocking tooltip)', async () => {
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([PARTY_ROW]));
  const { root, container } = await renderPage();

  const statusSelect = container.querySelector('tbody tr [aria-label="وضعیت در سامانه مودیان"]');
  expect(statusSelect).not.toBeNull();

  /* عنوان راهنما به‌صورت title بومی است و کلیک را نمی‌گیرد */
  expect(statusSelect.closest('[title]')).not.toBeNull();

  await act(async () => {
    statusSelect.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    await wait(220);
  });

  const menuItem = Array.from(document.querySelectorAll('li[role="option"]'))
    .find((item) => item.textContent.includes('درج نشده'));
  expect(menuItem).toBeTruthy();

  await act(async () => { menuItem.click(); await wait(200); });
  expect(container.querySelector('tbody tr [data-status="pending"]')).not.toBeNull();

  root.unmount();
  container.remove();
});

test('suggestions come from every row of the table, not only the previous one', async () => {
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([
    { ...PARTY_ROW, id: 'seed-a', name: 'شرکت آلفا تجارت', city: 'تهران' },
    { ...PARTY_ROW, id: 'seed-b', name: 'شرکت آلفا صنعت', city: 'کرج', address: 'جاده مخصوص' },
    { ...PARTY_ROW, id: 'seed-c', name: 'فروشگاه بتا', city: 'اصفهان' },
  ]));
  const { root, container } = await renderPage();

  const readyNameInput = Array.from(container.querySelectorAll('tbody tr'))
    .pop().querySelector('input[aria-label="نام طرف معامله"]');
  await act(async () => {
    readyNameInput.focus();
    setNativeValue(readyNameInput, 'شرکت آلفا');
    await wait(280);
  });

  const optionTexts = Array.from(document.querySelectorAll('li[role="option"]')).map((item) => item.textContent);
  expect(optionTexts.some((text) => text.includes('شرکت آلفا تجارت'))).toBe(true);
  expect(optionTexts.some((text) => text.includes('شرکت آلفا صنعت'))).toBe(true);
  expect(optionTexts.some((text) => text.includes('فروشگاه بتا'))).toBe(false);

  await act(async () => {
    const target = Array.from(document.querySelectorAll('li[role="option"]'))
      .find((item) => item.textContent.includes('شرکت آلفا صنعت'));
    target.click();
    await wait(240);
  });

  const filledRow = Array.from(container.querySelectorAll('tbody tr'))
    .find((row) => row.querySelector('input[aria-label="نام طرف معامله"]')
      && row.querySelector('input[aria-label="نام طرف معامله"]').value === 'شرکت آلفا صنعت');
  expect(filledRow.querySelector('input[placeholder="شهر"]').value).toBe('کرج');

  root.unmount();
  container.remove();
});
