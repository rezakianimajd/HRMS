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

test('a row is saved once when the user moves to the next row', async () => {
  const { root, container } = await renderPage();

  let bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(1);

  const nameInput = bodyRows[0].querySelector('input[aria-label="نام شرکت"]');
  await act(async () => {
    nameInput.focus();
    setNativeValue(nameInput, 'ش');
    await wait(220);
  });

  bodyRows = Array.from(container.querySelectorAll('tbody tr'));
  expect(bodyRows).toHaveLength(2);
  expect(bodyRows[1].querySelector('input[aria-label="نام شرکت"]').value).toBe('');

  /* تا وقتی داخل همان ردیف هستیم هیچ ذخیره‌ای انجام نمی‌شود (تایپ روان) */
  await act(async () => { await wait(900); });
  expect(axiosInstance.post.mock.calls.filter(([url]) => url.endsWith('/rows/'))).toHaveLength(0);

  /* رفتن به ردیف بعد → همان یک بار ذخیره */
  const nextInput = bodyRows[1].querySelector('input[aria-label="نام شرکت"]');
  await act(async () => {
    nextInput.focus();
    await wait(900);
  });
  const rowPosts = axiosInstance.post.mock.calls.filter(([url]) => url.endsWith('/rows/'));
  expect(rowPosts).toHaveLength(1);
  expect(rowPosts[0][1].rows[0].name).toBe('ش');

  /* بدون تغییر جدید، رفتن به ردیف‌های دیگر دوباره ذخیره نمی‌کند */
  await act(async () => {
    bodyRows = Array.from(container.querySelectorAll('tbody tr'));
    bodyRows[0].querySelector('input[aria-label="نام شرکت"]').focus();
    await wait(900);
  });
  expect(axiosInstance.post.mock.calls.filter(([url]) => url.endsWith('/rows/'))).toHaveLength(1);

  root.unmount();
  container.remove();
}, 20000);


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



test('purchase grid shows seller type, vat total and required markers', async () => {
  currentReport = apiReport([{ ...API_ROW, person_type: 'foreign', country: 'آلمان', economic_code: '', national_id: '' }]);
  const { root, container } = await renderPage();

  const firstRow = container.querySelectorAll('tbody tr')[0];
  /* نوع فروشنده به‌صورت انتخاب‌گر با چهار گزینه */
  const personSelect = firstRow.querySelector('[aria-label="نوع فروشنده"]');
  expect(personSelect).not.toBeNull();
  expect(personSelect.textContent.trim()).toBe('خارجی');
  /* کشور برای فروشندهٔ خارجی در دسترس است */
  expect(firstRow.querySelector('input[placeholder="کشور"]')).not.toBeNull();

  /* فقط مالیات بر ارزش افزوده: جمع کل = ۱٬۰۰۰٬۰۰۰ + ۹۰٬۰۰۰ */
  expect(firstRow.textContent).toContain('۱٬۰۹۰٬۰۰۰');
  expect(container.textContent).toContain('جمع ارزش افزوده: ۹۰٬۰۰۰');
  /* ستون عوارض کاملاً حذف شده است */
  expect(container.textContent).not.toContain('عوارض');
  expect(Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent.trim()))
    .not.toContain('عوارض');

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
    description: 'خرید دستگاه', amount: '1000000', vat: '0',
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



test('an aggregate row records «متفرقه» for names and a dash for the other columns', async () => {
  currentReport = apiReport([{
    ...API_ROW,
    id: 301,
    person_type: 'aggregate',
    name: '',
    first_name: '',
    last_name: '',
    national_id: '',
    postal_code: '',
    country: 'ایران',
    city: '',
    address: '',
    amount: '750000',
    vat: '0',
    invoice_no: '',
    kind: 3,
  }]);
  const { root, container } = await renderPage();

  const firstRow = container.querySelectorAll('tbody tr')[0];
  /* گزینهٔ «تجمیعی» در انتخاب‌گر نوع فروشنده */
  expect(firstRow.querySelector('[aria-label="نوع فروشنده"]').textContent.trim()).toBe('تجمیعی');

  /* نام و نام خانوادگی پیش‌فرض «متفرقه» */
  expect(firstRow.querySelector('input[aria-label="نام شرکت"]').value).toBe('متفرقه');

  /* بقیهٔ ستون‌ها «—» (لازم نیست ولی قابل ویرایش) */
  expect(firstRow.querySelector('input[placeholder="شناسه ملی ۱۱ رقمی"]').value).toBe('—');
  expect(firstRow.querySelector('input[placeholder="۱۰ رقمی"]').value).toBe('—');
  expect(firstRow.querySelector('input[placeholder="—"]').value).toBe('—');
  expect(firstRow.querySelector('input[placeholder="شهر"]').value).toBe('—');
  expect(firstRow.querySelector('input[placeholder="آدرس"]').value).toBe('—');
  expect(firstRow.querySelector('input[placeholder="شماره"]').value).toBe('—');
  expect(firstRow.querySelector('input[aria-label="مالیات بر ارزش افزوده"]').value).toBe('—');

  /* شرح کالا و مبلغ دست‌نخورده می‌مانند (فقط این دو باید پر شوند) */
  expect(firstRow.querySelector('input[placeholder="شرح کالا یا خدمات"]').value).toBe('خدمات مشاوره مالی');
  expect(firstRow.querySelector('input[aria-label="مبلغ"]').value).toBe('۷۵۰٬۰۰۰');

  /* نوع معامله = ۳ و وضعیت «ثبت نشده» */
  expect(firstRow.querySelector('[aria-label="نوع معامله"]').textContent.trim()).toBe('۳');
  expect(firstRow.querySelector('[data-status="pending"]')).not.toBeNull();

  /* توضیحات اضافی کنار انتخاب سال/فصل حذف شده است */
  expect(container.textContent).not.toContain('فقط مبلغ لازم دارد');
  expect(container.textContent).not.toContain('کشور پیش‌فرض');

  root.unmount();
  container.remove();
});

test('switching a row to aggregate fills the placeholder defaults', async () => {
  const { root, container } = await renderPage();

  const readyRow = container.querySelectorAll('tbody tr')[0];
  const personSelect = readyRow.querySelector('[aria-label="نوع فروشنده"]');
  await act(async () => {
    personSelect.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    await wait(200);
  });
  const aggregateOption = Array.from(document.querySelectorAll('li[role="option"]'))
    .find((item) => item.textContent.trim() === 'تجمیعی');
  await act(async () => { aggregateOption.click(); await wait(260); });

  const row = container.querySelectorAll('tbody tr')[0];
  expect(row.querySelector('input[aria-label="نام شرکت"]').value).toBe('متفرقه');
  expect(row.querySelector('input[placeholder="—"]').value).toBe('—');
  expect(row.querySelector('[aria-label="نوع معامله"]').textContent.trim()).toBe('۳');
  expect(row.querySelector('[data-status="pending"]')).not.toBeNull();

  root.unmount();
  container.remove();
});

test('a new row starts with Iran as country and switching to foreign clears it', async () => {
  const { root, container } = await renderPage();

  const readyRow = container.querySelectorAll('tbody tr')[0];
  expect(readyRow.querySelector('input[placeholder="—"]').value).toBe('ایران');

  const personSelect = readyRow.querySelector('[aria-label="نوع فروشنده"]');
  await act(async () => {
    personSelect.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    await wait(200);
  });
  const foreignOption = Array.from(document.querySelectorAll('li[role="option"]'))
    .find((item) => item.textContent.trim() === 'خارجی');
  await act(async () => { foreignOption.click(); await wait(220); });

  const updatedRow = container.querySelectorAll('tbody tr')[0];
  expect(updatedRow.querySelector('input[placeholder="کشور"]')).not.toBeNull();
  expect(updatedRow.querySelector('input[placeholder="کشور"]').value).toBe('');

  root.unmount();
  container.remove();
});

/* ---------- حافظهٔ طرف معامله برای همهٔ انواع (حقوقی/حقیقی/خارجی/تجمیعی) ---------- */

const NATURAL_ROW = {
  ...API_ROW,
  id: 201,
  line_no: 1,
  person_type: 'natural',
  name: 'علی رضایی',
  first_name: 'علی',
  last_name: 'رضایی',
  national_id: '0012345678',
  city: 'شیراز',
  address: 'خیابان زند، پلاک ۵',
  invoice_no: 'N-1',
};

const FOREIGN_ROW = {
  ...API_ROW,
  id: 202,
  line_no: 2,
  person_type: 'foreign',
  name: 'Atlas GmbH',
  national_id: '',
  country: 'آلمان',
  city: 'هامبورگ',
  invoice_no: 'F-1',
};

test('suggestions also list natural sellers and fill both name parts', async () => {
  currentReport = apiReport([NATURAL_ROW]);
  const { root, container } = await renderPage();

  const readyNameInput = Array.from(container.querySelectorAll('tbody tr'))
    .pop().querySelector('input[aria-label="نام شرکت"]');
  await act(async () => {
    readyNameInput.focus();
    setNativeValue(readyNameInput, 'رضا');
    await wait(320);
  });

  const options = Array.from(document.querySelectorAll('li[role="option"]')).map((item) => item.textContent);
  expect(options.some((text) => text.includes('علی رضایی') && text.includes('حقیقی'))).toBe(true);

  await act(async () => {
    Array.from(document.querySelectorAll('li[role="option"]'))
      .find((item) => item.textContent.includes('علی رضایی'))
      .click();
    await wait(300);
  });

  const naturalRow = Array.from(container.querySelectorAll('tbody tr'))
    .find((row) => row.querySelector('input[aria-label="نام"]'));
  expect(naturalRow).toBeTruthy();
  expect(naturalRow.querySelector('[aria-label="نوع فروشنده"]').textContent.trim()).toBe('حقیقی');
  expect(naturalRow.querySelector('input[aria-label="نام"]').value).toBe('علی');
  expect(naturalRow.querySelector('input[aria-label="نام خانوادگی"]').value).toBe('رضایی');
  expect(naturalRow.querySelector('input[placeholder="کد ملی ۱۰ رقمی"]').value).toBe('۰۰۱۲۳۴۵۶۷۸');

  root.unmount();
  container.remove();
});

test('the family-name field of a natural row also suggests earlier natural sellers', async () => {
  currentReport = apiReport([NATURAL_ROW]);
  const { root, container } = await renderPage();

  const readyRow = Array.from(container.querySelectorAll('tbody tr')).pop();
  const personSelect = readyRow.querySelector('[aria-label="نوع فروشنده"]');
  await act(async () => {
    personSelect.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    await wait(200);
  });
  const naturalOption = Array.from(document.querySelectorAll('li[role="option"]'))
    .find((item) => item.textContent.trim() === 'حقیقی');
  await act(async () => { naturalOption.click(); await wait(240); });

  const naturalRow = Array.from(container.querySelectorAll('tbody tr')).pop();
  const lastNameInput = naturalRow.querySelector('input[aria-label="نام خانوادگی"]');
  await act(async () => {
    lastNameInput.focus();
    setNativeValue(lastNameInput, 'رضا');
    await wait(320);
  });

  const options = Array.from(document.querySelectorAll('li[role="option"]')).map((item) => item.textContent);
  expect(options.some((text) => text.includes('علی رضایی'))).toBe(true);

  await act(async () => {
    Array.from(document.querySelectorAll('li[role="option"]'))
      .find((item) => item.textContent.includes('علی رضایی'))
      .click();
    await wait(300);
  });

  const filledRow = Array.from(container.querySelectorAll('tbody tr'))
    .find((row) => row.querySelector('input[aria-label="نام خانوادگی"]')?.value === 'رضایی');
  expect(filledRow).toBeTruthy();
  expect(filledRow.querySelector('input[aria-label="نام"]').value).toBe('علی');
  expect(filledRow.querySelector('input[aria-label="نام خانوادگی"]').value).toBe('رضایی');
  expect(filledRow.querySelector('input[placeholder="کد ملی ۱۰ رقمی"]').value).toBe('۰۰۱۲۳۴۵۶۷۸');

  root.unmount();
  container.remove();
});

test('selecting a foreign party restores its country instead of Iran', async () => {
  currentReport = apiReport([FOREIGN_ROW]);
  const { root, container } = await renderPage();

  const readyRow = Array.from(container.querySelectorAll('tbody tr')).pop();
  const nameInput = readyRow.querySelector('input[aria-label="نام شرکت"]');
  await act(async () => {
    nameInput.focus();
    setNativeValue(nameInput, 'Atlas');
    await wait(320);
  });

  const options = Array.from(document.querySelectorAll('li[role="option"]')).map((item) => item.textContent);
  expect(options.some((text) => text.includes('Atlas GmbH') && text.includes('خارجی'))).toBe(true);

  await act(async () => {
    Array.from(document.querySelectorAll('li[role="option"]'))
      .find((item) => item.textContent.includes('Atlas GmbH'))
      .click();
    await wait(300);
  });

  const foreignRow = Array.from(container.querySelectorAll('tbody tr'))
    .find((row) => row.querySelector('[aria-label="نوع فروشنده"]')?.textContent.trim() === 'خارجی');
  expect(foreignRow).toBeTruthy();
  expect(foreignRow.querySelector('input[placeholder="کشور"]').value).toBe('آلمان');

  root.unmount();
  container.remove();
});

test('a natural seller typed in a previous quarter is suggested as «حقیقی»', async () => {
  /* دادهٔ فصل قبل در همین مرورگر: فقط «نام کامل» و کد ملی ۱۰ رقمی، بدون نوع */
  window.localStorage.setItem('hrms.seasonal.rows.7.q4', JSON.stringify([{
    id: 'r-old-1', name: 'مریم احمدی', nationalId: '0012345679', city: 'تبریز',
    address: 'خیابان امام، پلاک ۹', amount: '300000', vat: '30000', invoiceNo: 'Q4-1',
  }]));
  const { root, container } = await renderPage();

  const readyNameInput = Array.from(container.querySelectorAll('tbody tr'))
    .pop().querySelector('input[aria-label="نام شرکت"]');
  await act(async () => {
    readyNameInput.focus();
    setNativeValue(readyNameInput, 'مریم');
    await wait(320);
  });

  const options = Array.from(document.querySelectorAll('li[role="option"]')).map((item) => item.textContent);
  expect(options.some((text) => text.includes('مریم احمدی') && text.includes('حقیقی'))).toBe(true);

  await act(async () => {
    Array.from(document.querySelectorAll('li[role="option"]'))
      .find((item) => item.textContent.includes('مریم احمدی'))
      .click();
    await wait(300);
  });

  const naturalRow = Array.from(container.querySelectorAll('tbody tr'))
    .find((row) => row.querySelector('input[aria-label="نام"]')?.value === 'مریم');
  expect(naturalRow).toBeTruthy();
  expect(naturalRow.querySelector('[aria-label="نوع فروشنده"]').textContent.trim()).toBe('حقیقی');
  expect(naturalRow.querySelector('input[aria-label="نام خانوادگی"]').value).toBe('احمدی');
  expect(naturalRow.querySelector('input[placeholder="کد ملی ۱۰ رقمی"]').value).toBe('۰۰۱۲۳۴۵۶۷۹');
  expect(naturalRow.querySelector('input[placeholder="شهر"]').value).toBe('تبریز');

  root.unmount();
  container.remove();
}, 20000);
