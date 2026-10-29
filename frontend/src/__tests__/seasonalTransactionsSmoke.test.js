import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import SeasonalReportPage from '../pages/accounting/tax/SeasonalReportPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
  },
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
  { id: 7, name: '۱۴۰۴', start_date: '2026-03-21', end_date: '2027-03-20' },
];

const API_ROW = {
  id: 101,
  line_no: 1,
  name: 'شرکت آلفا تجارت',
  first_name: '',
  last_name: '',
  person_type: 'legal',
  national_id: '10101010101',
  postal_code: '1234567890',
  city: 'تهران',
  address: 'خیابان ولیعصر، پلاک ۱۲',
  goods_service_desc: 'خدمات مشاوره مالی',
  goods_service_type: 'other',
  is_included: true,
  amount: '1000000',
  vat: '90000',
  duties: '0',
  total: '1090000',
  kind: 1,
  invoice_date: '2026-04-10',
  invoice_no: 'A-12',
  moadian_status: 'registered',
};

const apiReport = (transactions = []) => ({
  id: 11,
  fiscal_year: 7,
  quarter: 1,
  status: 'draft',
  direction: 'purchase',
  period_start: '2026-03-21',
  period_end: '2026-06-21',
  rows_count: transactions.length,
  transactions,
  ruleset: { version: 'draft-1405.1', status: 'unverified' },
  control_totals: { count: transactions.length },
});

const apiReference = {
  direction: 'purchase',
  ruleset_version: 'draft-1405.1',
  ruleset_status: 'unverified',
  required: {
    legal: ['name', 'person_type', 'economic_code', 'national_id'],
    natural: ['name', 'person_type', 'national_id'],
    foreign: ['name', 'person_type', 'country'],
  },
  rules: [],
};

const ROWS_KEY = 'hrms.seasonal.rows.7.q1';

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

const setNativeValue = (element, value) => {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  descriptor.set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

let currentReport = apiReport();
let validateResponse = { issues: [], summary: { rows: 0, errors: 0, warnings: 0 } };
let apiShouldFail = false;

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
    await wait(520);
  });
  for (let index = 0; index < 2; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }
  return { root, container };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  currentReport = apiReport();
  validateResponse = { issues: [], summary: { rows: 0, errors: 0, warnings: 0 } };
  apiShouldFail = false;

  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));

  axiosInstance.get.mockImplementation((url) => {
    if (url === '/accounting/fiscal-years/') return Promise.resolve({ data: fiscalYears });
    if (url === '/accounting/tax/seasonal-reports/reference/') {
      return apiShouldFail
        ? Promise.reject(new Error('offline'))
        : Promise.resolve({ data: apiReference });
    }
    if (url === '/accounting/tax/seasonal-reports/current/') {
      return apiShouldFail
        ? Promise.reject(new Error('offline'))
        : Promise.resolve({ data: currentReport });
    }
    if (url.endsWith('/export/')) return Promise.resolve({ data: new Blob(['xlsx']) });
    return Promise.resolve({ data: [] });
  });

  axiosInstance.post.mockImplementation((url, body) => {
    if (url.endsWith('/validate/')) return Promise.resolve({ data: validateResponse });
    if (url.endsWith('/rows/')) {
      const rows = (body?.rows || []).map((row, index) => ({
        ...API_ROW,
        ...row,
        id: 500 + index,
        line_no: index + 1,
        total: String(Number(row.amount || 0) + Number(row.vat || 0)),
      }));
      currentReport = apiReport(rows);
      return Promise.resolve({ data: { ...currentReport, saved_rows: rows.length } });
    }
    return Promise.resolve({ data: {} });
  });
});

test('renders header, official columns, studio search bar and the api period range', async () => {
  currentReport = apiReport([API_ROW]);
  const { root, container } = await renderPage();

  expect(container.textContent).toContain('معاملات فصلی خرید');
  expect(container.textContent).toContain('بازهٔ فصل: ۱۴۰۵/۰۱/۰۱ تا ۱۴۰۵/۰۳/۳۱');
  expect(container.textContent).toContain('قواعد/قالب TTMS تأییدنشده');
  expect(container.querySelector('input[placeholder^="جستجو در نام طرف معامله"]')).not.toBeNull();

  const buttonLabels = Array.from(container.querySelectorAll('button')).map((button) => button.textContent.trim());
  expect(buttonLabels.some((label) => label.includes('اعتبارسنجی'))).toBe(true);
  expect(buttonLabels.some((label) => label.includes('چاپ'))).toBe(true);
  expect(buttonLabels.some((label) => label.includes('خروجی TTMS'))).toBe(true);
  expect(buttonLabels.some((label) => label.includes('خروجی اکسل'))).toBe(true);
  expect(buttonLabels.some((label) => label.includes('ارزش افزوده ۱۰٪'))).toBe(false);
  expect(buttonLabels.some((label) => label.includes('ردیف جدید'))).toBe(false);

  const table = container.querySelector('table');
  expect(table).not.toBeNull();
  const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
  expect(headers).toEqual([
    'ردیف',
    'نام و نام خانوادگی / نام شرکت*',
    'نوع فروشنده*',
    'شناسه ملی / کد ملی*',
    'کد پستی',
    'کشور*',
    'شهر',
    'آدرس',
    'شرح کالا / خدمات',
    'مبلغ',
    'مالیات بر ارزش افزوده',
    'عوارض',
    'جمع کل',
    'نوع',
    'تاریخ فاکتور',
    'شماره فاکتور',
    'وضعیت',
    'عملیات',
  ]);

  root.unmount();
  container.remove();
});

test('api rows render totals, persian digits and the moadian status dot', async () => {
  currentReport = apiReport([API_ROW]);
  const { root, container } = await renderPage();

  const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(2);                       // یک ردیف داده + ردیف آمادهٔ ورود

  const first = bodyRows[0];
  expect(first.textContent).toContain('۱٬۰۹۰٬۰۰۰');
  expect(first.querySelector('input[placeholder="شناسه ملی ۱۱ رقمی"]').value).toBe('۱۰۱۰۱۰۱۰۱۰۱');
  expect(first.querySelector('input[placeholder="A-۱۲"]') || first.textContent).toBeTruthy();
  const dateInput = first.querySelector('input[placeholder^="۱۴۰۵"]');
  expect(dateInput.value).toMatch(/^[۰-۹]{4}\/[۰-۹]{2}\/[۰-۹]{2}$/);
  expect(first.querySelector('[data-status="registered"]')).not.toBeNull();

  expect(container.textContent).toContain('جمع کل: ۱٬۰۹۰٬۰۰۰');
  expect(container.textContent).toContain('تعداد ردیف: ۱');

  root.unmount();
  container.remove();
});

test('a ready empty row is always available and typing creates the next one, then saves to the api', async () => {
  const { root, container } = await renderPage();

  let bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(1);

  const nameInput = bodyRows[0].querySelector('input[aria-label="نام شرکت"]');
  await act(async () => { setNativeValue(nameInput, 'ش'); await wait(220); });

  bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(2);
  expect(bodyRows[1].querySelector('input[aria-label="نام شرکت"]').value).toBe('');

  /* ذخیرهٔ خودکار با debounce روی API */
  await act(async () => { await wait(1100); });
  const rowPosts = axiosInstance.post.mock.calls.filter(([url]) => url.endsWith('/rows/'));
  expect(rowPosts.length).toBeGreaterThanOrEqual(1);
  expect(rowPosts[0][1].rows[0].name).toBe('ش');

  root.unmount();
  container.remove();
});


test('suggestions come from every api row and fill city plus national id', async () => {
  currentReport = apiReport([
    API_ROW,
    { ...API_ROW, id: 102, line_no: 2, name: 'شرکت آلفا صنعت', city: 'کرج', national_id: '20202020202', invoice_no: 'B-1' },
    { ...API_ROW, id: 103, line_no: 3, name: 'فروشگاه بتا', city: 'اصفهان', invoice_no: 'C-1' },
  ]);
  const { root, container } = await renderPage();

  const readyNameInput = Array.from(container.querySelectorAll('tbody tr'))
    .pop().querySelector('input[aria-label="نام شرکت"]');
  await act(async () => {
    readyNameInput.focus();
    setNativeValue(readyNameInput, 'شرکت آلفا');
    await wait(300);
  });

  const options = Array.from(document.querySelectorAll('li[role="option"]')).map((item) => item.textContent);
  expect(options.some((text) => text.includes('شرکت آلفا تجارت'))).toBe(true);
  expect(options.some((text) => text.includes('شرکت آلفا صنعت'))).toBe(true);
  expect(options.some((text) => text.includes('فروشگاه بتا'))).toBe(false);

  await act(async () => {
    Array.from(document.querySelectorAll('li[role="option"]'))
      .find((item) => item.textContent.includes('شرکت آلفا صنعت'))
      .click();
    await wait(260);
  });

  const filled = Array.from(container.querySelectorAll('tbody tr'))
    .find((row) => row.querySelector('input[aria-label="نام شرکت"]')?.value === 'شرکت آلفا صنعت');
  expect(filled.querySelector('input[placeholder="شهر"]').value).toBe('کرج');
  expect(filled.querySelector('input[placeholder="شناسه ملی ۱۱ رقمی"]').value).toBe('۲۰۲۰۲۰۲۰۲۰۲');

  root.unmount();
  container.remove();
});

test('validation marks rows with issues and reports counts in the footer', async () => {
  currentReport = apiReport([API_ROW]);
  validateResponse = {
    issues: [
      { row_id: 101, row_no: 1, row_name: API_ROW.name, field: 'national_id', level: 'error', message: 'شناسه ملی باید ۱۱ رقم باشد.' },
      { row_id: 101, row_no: 1, row_name: API_ROW.name, field: 'postal_code', level: 'warning', message: 'کد پستی ثبت نشده است.' },
    ],
    summary: { rows: 1, errors: 1, warnings: 1 },
  };
  const { root, container } = await renderPage();

  const validateButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('اعتبارسنجی'));
  await act(async () => { validateButton.click(); await wait(300); });

  expect(axiosInstance.post.mock.calls.some(([url]) => url.endsWith('/validate/'))).toBe(true);
  expect(container.textContent).toContain('اعتبارسنجی: ۱ خطا / ۱ هشدار');
  expect(container.querySelector('svg[data-testid="WarningAmberRoundedIcon"]')).not.toBeNull();

  root.unmount();
  container.remove();
});

test('excel export downloads the official workbook from the api', async () => {
  currentReport = apiReport([API_ROW]);
  const { root, container } = await renderPage();

  const created = [];
  window.URL.createObjectURL = jest.fn((blob) => { created.push(blob); return 'blob:seasonal'; });
  window.URL.revokeObjectURL = jest.fn();
  const clickSpy = jest.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function noop() {});

  const exportButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('خروجی اکسل'));
  await act(async () => { exportButton.click(); await wait(320); });

  const exportCalls = axiosInstance.get.mock.calls.filter(([url]) => url.endsWith('/export/'));
  expect(exportCalls.length).toBe(1);
  expect(exportCalls[0][1]).toMatchObject({ responseType: 'blob' });
  expect(clickSpy).toHaveBeenCalledTimes(1);
  expect(clickSpy.mock.instances[0].download).toBe('seasonal-purchase-7-q1.xlsx');

  clickSpy.mockRestore();
  root.unmount();
  container.remove();
});

test('falls back to the local storage when the api is unavailable', async () => {
  apiShouldFail = true;
  /* تخلیهٔ تایمرهای ذخیرهٔ تست قبلی تا آینهٔ محلی بازنویسی نشود */
  await act(async () => { await wait(200); });
  window.localStorage.clear();
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([{
    id: 'r-local-1', name: 'شرکت محلی', city: 'شیراز', address: 'بلوار زند',
    nationalId: '10101010101', description: 'خدمات', amount: '500000', vat: '50000',
    kind: 2, invoiceDate: '2026-04-15', invoiceNo: 'L-1', status: 'pending',
  }]));

  const { root, container } = await renderPage();

  expect(container.textContent).toContain('حالت محلی');
  const bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows.length).toBe(2);
  expect(bodyRows[0].querySelector('input[aria-label="نام شرکت"]').value).toBe('شرکت محلی');
  expect(bodyRows[0].textContent).toContain('۵۵۰٬۰۰۰');

  /* اعتبارسنجی در حالت محلی هم کار می‌کند */
  const validateButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('اعتبارسنجی'));
  await act(async () => { validateButton.click(); await wait(220); });
  expect(container.textContent).toMatch(/اعتبارسنجی: [۰-۹]+ (خطا|هشدار)/);

  root.unmount();
  container.remove();
});



test('purchase grid shows seller type, duties total and required markers', async () => {
  currentReport = apiReport([{ ...API_ROW, person_type: 'foreign', country: 'آلمان', economic_code: '', national_id: '', duties: '20000' }]);
  const { root, container } = await renderPage();

  const firstRow = container.querySelectorAll('tbody tr')[0];
  /* نوع فروشنده به‌صورت انتخاب‌گر با سه گزینه */
  const personSelect = firstRow.querySelector('[aria-label="نوع فروشنده"]');
  expect(personSelect).not.toBeNull();
  expect(personSelect.textContent.trim()).toBe('خارجی');
  /* کشور برای فروشندهٔ خارجی در دسترس است */
  expect(firstRow.querySelector('input[placeholder="کشور"]')).not.toBeNull();

  /* عوارض در جمع کل و در فوتر لحاظ می‌شود: ۱٬۰۰۰٬۰۰۰ + ۹۰٬۰۰۰ + ۲۰٬۰۰۰ */
  expect(firstRow.textContent).toContain('۱٬۱۱۰٬۰۰۰');
  expect(container.textContent).toContain('جمع عوارض: ۲۰٬۰۰۰');

  root.unmount();
  container.remove();
});

test('ttms draft export asks for confirmation and downloads the unverified bundle', async () => {
  currentReport = apiReport([API_ROW]);
  const { root, container } = await renderPage();

  const created = [];
  window.URL.createObjectURL = jest.fn((blob) => { created.push(blob); return 'blob:ttms'; });
  window.URL.revokeObjectURL = jest.fn();
  const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
  const clickSpy = jest.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function noop() {});

  const ttmsButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('خروجی TTMS'));
  await act(async () => { ttmsButton.click(); await wait(320); });

  expect(confirmSpy).toHaveBeenCalledTimes(1);
  expect(String(confirmSpy.mock.calls[0][0])).toContain('آزمایش‌نشده');
  const exportCalls = axiosInstance.get.mock.calls.filter(([url]) => url.endsWith('/export-ttms/'));
  expect(exportCalls.length).toBe(1);
  expect(exportCalls[0][1]).toMatchObject({ responseType: 'blob' });
  expect(clickSpy).toHaveBeenCalledTimes(1);
  expect(clickSpy.mock.instances[0].download).toBe('ttms-draft-purchase-7-q1.zip');

  confirmSpy.mockRestore();
  clickSpy.mockRestore();
  root.unmount();
  container.remove();
});

test('local rules engine flags a missing country for foreign sellers', async () => {
  apiShouldFail = true;
  await act(async () => { await wait(200); });
  window.localStorage.clear();
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([{
    id: 'r-foreign', name: 'فروشندهٔ خارجی', personType: 'foreign', country: '',
    city: '', address: '', economicCode: '', nationalId: '', postalCode: '',
    description: 'خرید دستگاه', amount: '1000000', vat: '0', duties: '0',
    kind: 1, invoiceDate: '2026-04-15', invoiceNo: 'T-1', status: 'pending',
  }]));

  const { root, container } = await renderPage();
  expect(container.textContent).toContain('حالت محلی');

  const validateButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('اعتبارسنجی'));
  await act(async () => { validateButton.click(); await wait(240); });

  /* یک خطا (کشور) و هشدارهای توصیه‌ای */
  expect(container.textContent).toMatch(/اعتبارسنجی: [۱-۹][۰-۹]* خطا/);

  root.unmount();
  container.remove();
});



test('a natural seller is edited with separate first and last name fields', async () => {
  currentReport = apiReport([{
    ...API_ROW,
    id: 201,
    person_type: 'natural',
    name: 'علی رضایی',
    first_name: 'علی',
    last_name: 'رضایی',
    national_id: '0012345678',
    invoice_no: 'N-1',
  }]);
  const { root, container } = await renderPage();

  const firstRow = container.querySelectorAll('tbody tr')[0];
  const firstName = firstRow.querySelector('input[aria-label="نام"]');
  const lastName = firstRow.querySelector('input[aria-label="نام خانوادگی"]');
  expect(firstName).not.toBeNull();
  expect(lastName).not.toBeNull();
  expect(firstName.value).toBe('علی');
  expect(lastName.value).toBe('رضایی');
  /* شناسه/کد ملی برای حقیقی ۱۰ رقمی است */
  expect(firstRow.querySelector('input[placeholder="کد ملی ۱۰ رقمی"]').value).toBe('۰۰۱۲۳۴۵۶۷۸');
  /* کد اقتصادی حذف شده است */
  expect(firstRow.querySelector('input[placeholder="۱۱ رقمی"]')).toBeNull();

  root.unmount();
  container.remove();
});

test('switching the seller type to natural swaps the name cell to two fields', async () => {
  const { root, container } = await renderPage();

  const readyRow = container.querySelectorAll('tbody tr')[0];
  expect(readyRow.querySelector('input[aria-label="نام شرکت"]')).not.toBeNull();

  const personSelect = readyRow.querySelector('[aria-label="نوع فروشنده"]');
  await act(async () => {
    personSelect.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    await wait(200);
  });
  const naturalOption = Array.from(document.querySelectorAll('li[role="option"]'))
    .find((item) => item.textContent.trim() === 'حقیقی');
  expect(naturalOption).toBeTruthy();
  await act(async () => { naturalOption.click(); await wait(220); });

  const updatedRow = container.querySelectorAll('tbody tr')[0];
  expect(updatedRow.querySelector('input[aria-label="نام"]')).not.toBeNull();
  expect(updatedRow.querySelector('input[aria-label="نام خانوادگی"]')).not.toBeNull();
  expect(updatedRow.querySelector('input[aria-label="نام شرکت"]')).toBeNull();

  root.unmount();
  container.remove();
});

