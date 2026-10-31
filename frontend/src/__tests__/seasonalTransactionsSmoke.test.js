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

const analyticsFixture = {
  totals: {
    count: 1, amount: 1000000, vat: 90000, total: 1090000, average_invoice: 1000000,
    registered: 1, pending: 0, registered_ratio: 1, vat_ratio: 0.09,
  },
  by_person_type: [{ key: 'legal', label: 'حقوقی', count: 1, amount: 1000000, share: 1 }],
  by_kind: [{ key: 1, label: 'نوع 1', count: 1, amount: 1000000, share: 1 }],
  by_month: [{ key: '1405-01', label: '1405/01', count: 1, amount: 1000000 }],
  top_parties: [{
    rank: 1, name: 'شرکت آلفا تجارت', person_type: 'legal', person_type_label: 'حقوقی',
    national_id: '10101010101', count: 1, amount: 1000000, share: 1, cumulative_share: 1,
  }],
  concentration: { parties: 1, hhi: 1, top1_share: 1, top5_share: 1, pareto_parties: 1, pareto_ratio: 1 },
  quality: {
    missing_postal_code: 0, missing_invoice_date: 0, missing_invoice_no: 0,
    aggregate_rows: 0, foreign_rows: 0,
  },
  insights: [{
    level: 'info', title: 'تحلیل پارتو (۸۰/۲۰)',
    detail: '۱ طرف معامله از ۱ طرف، ۸۰٪ مبلغ خرید را تشکیل می‌دهند.',
  }],
  filter_options: {
    kind: [
      { value: 1, label: 'نوع 1', count: 2 },
      { value: 2, label: 'نوع 2', count: 1 },
    ],
    moadian_status: [
      { value: 'registered', label: 'درج‌شده در سامانه', count: 2 },
      { value: 'pending', label: 'درج‌نشده در سامانه', count: 1 },
    ],
    person_type: [{ value: 'legal', label: 'حقوقی', count: 3 }],
    total: 3,
  },
};

const reconcileResult = {
  summary: {
    matched: { count: 1, amount: 1000000, average_confidence: 0.93 },
    only_in_ledger: { count: 1, amount: 700000 },
    only_in_seasonal: { count: 0, amount: 0 },
    differences: { amount: 0, amount_minor: 0, date: 0, vat: 0, party: 0, invoice: 0 },
    coverage: { seasonal_matched_ratio: 1, ledger_matched_ratio: 0.5 },
    amount_delta: -700000,
    counts: {
      items: 2, matched: 1, difference: 0, amount_mismatch: 0,
      missing_in_seasonal: 1, missing_in_ledger: 0, errors: 1, warnings: 0,
    },
  },
  items: [
    {
      key: 'm-101-1', kind: 'matched', kind_label: 'تطبیق کامل', severity: 'info', confidence: 0.93,
      seasonal: { id: 101, invoice_no: 'A-12', party_name: 'شرکت آلفا تجارت', amount: 1000000 },
      ledger: { index: 1, invoice_no: 'A-12', party_name: 'شرکت آلفا تجارت', amount: 1000000 },
    },
    {
      key: 'l-2', kind: 'missing_in_seasonal', kind_label: 'فقط در دفاتر', severity: 'error', confidence: 0,
      seasonal: null, ledger: { index: 2, invoice_no: 'L-9', party_name: 'شرکت دلتا', amount: 700000 },
    },
  ],
  suggested_rows: [{
    name: 'شرکت دلتا', personType: 'legal', nationalId: '40404040404', amount: '700000',
    vat: '70000', invoiceNo: 'L-9', invoiceDate: '2026-05-01', kind: 1, status: 'pending',
  }],
  source: { mapping: { invoice_no: 'شماره فاکتور', amount: 'مبلغ' }, warnings: [], rows: 2 },
};

let reconciliationRuns = [];

const pivotFixture = {
  dimension: 'kind',
  dimension_label: 'نوع معامله',
  columns: [
    { key: 'kind_1', label: 'نوع ۱', order: 'kind_01' },
    { key: 'kind_2', label: 'نوع ۲', order: 'kind_02' },
  ],
  rows: [{
    rank: 1,
    name: 'شرکت آلفا تجارت',
    person_type: 'legal',
    person_type_label: 'حقوقی',
    national_id: '10101010101',
    count: 2,
    amount: 1000000,
    vat: 90000,
    total: 1090000,
    share: 1,
    cumulative_share: 1,
    values: { kind_1: 900000, kind_2: 100000 },
  }],
  column_totals: { kind_1: 900000, kind_2: 100000 },
  totals: { count: 2, parties: 1, amount: 1000000, vat: 90000, total: 1090000 },
};

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

  axiosInstance.get.mockImplementation((url, config) => {
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
    if (url.endsWith('/analytics/')) {
      if (apiShouldFail) return Promise.reject(new Error('offline'));
      const kind = config?.params?.kind;
      const status = config?.params?.moadian_status;
      if (kind || status) {
        return Promise.resolve({
          data: {
            ...analyticsFixture,
            filters: { kind: kind ? Number(kind) : null, moadian_status: status || null },
            active_filters: true,
            unfiltered: { count: 3, amount: 2000000, vat: 180000 },
            totals: { ...analyticsFixture.totals, count: 2, amount: 500000, vat: 50000, total: 550000 },
          },
        });
      }
      return Promise.resolve({ data: { ...analyticsFixture, unfiltered: { count: 3 } } });
    }
    if (url.endsWith('/analytics-export/')) return Promise.resolve({ data: new Blob(['xlsx']) });
    if (url.endsWith('/party-pivot/')) {
      const dim = config?.params?.dimension || 'kind';
      return Promise.resolve({
        data: {
          ...pivotFixture,
          dimension: dim,
          columns: dim === 'month'
            ? [{ key: '1405/01', label: '1405/01', order: '1405/01' }]
            : pivotFixture.columns,
        },
      });
    }
    if (url.endsWith('/party-pivot-export/')) return Promise.resolve({ data: new Blob(['xlsx']) });
    if (url.endsWith('/reconciliations/')) return Promise.resolve({ data: reconciliationRuns });
    return Promise.resolve({ data: [] });
  });

  axiosInstance.post.mockImplementation((url, body) => {
    if (url.endsWith('/validate/')) return Promise.resolve({ data: validateResponse });
    if (url.includes('/reconcile/')) return Promise.resolve({ data: reconcileResult });
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


test('a large report renders only a window of rows and keeps the totals correct', async () => {
  const manyRows = Array.from({ length: 80 }, (_unused, index) => ({
    ...API_ROW,
    id: 900 + index,
    line_no: index + 1,
    name: `شرکت شماره ${index + 1}`,
    invoice_no: `V-${index + 1}`,
    amount: '1000',
    vat: '100',
  }));
  currentReport = apiReport(manyRows);
  const { root, container } = await renderPage();

  /* مجازی‌سازی: فقط ردیف‌های دیده‌شدنی در DOM هستند */
  const rendered = container.querySelectorAll('tbody tr:not([data-spacer])').length;
  expect(rendered).toBeGreaterThan(5);
  expect(rendered).toBeLessThan(manyRows.length);
  expect(container.querySelectorAll('tbody tr[data-spacer]').length).toBeGreaterThan(0);

  /* جمع‌ها و تعداد روی همهٔ ردیف‌ها محاسبه می‌شوند، نه فقط ردیف‌های دیده‌شده */
  expect(container.textContent).toContain('تعداد ردیف: ۸۰');
  expect(container.textContent).toContain('جمع مبلغ: ۸۰٬۰۰۰');
  expect(container.textContent).toContain('جمع کل: ۸۸٬۰۰۰');

  root.unmount();
  container.remove();
}, 20000);

/* ---------- تب گزارش‌ها (تحلیل) و مغایرت‌گیری با دفاتر ---------- */

const clickTab = async (container, label) => {
  const tab = Array.from(container.querySelectorAll('[role="tab"]'))
    .find((item) => item.textContent.includes(label));
  expect(tab).toBeTruthy();
  await act(async () => { tab.click(); await wait(420); });
};

test('analytics tab renders KPI cards, charts and insights from the api', async () => {
  currentReport = apiReport([API_ROW]);
  const { root, container } = await renderPage();

  await clickTab(container, 'گزارش‌ها و تحلیل');

  expect(container.textContent).toContain('جمع مبلغ خرید');
  expect(container.textContent).toContain('۱٬۰۰۰٬۰۰۰');
  expect(container.textContent).toContain('روند ماهانه خرید');
  expect(container.textContent).toContain('ترکیب بر اساس نوع طرف معامله');
  expect(container.textContent).toContain('تحلیل پارتو');
  expect(container.textContent).not.toContain('تحلیل محلی (سرور در دسترس نیست)');
  expect(axiosInstance.get.mock.calls.some(([url]) => url.endsWith('/analytics/'))).toBe(true);

  root.unmount();
  container.remove();
}, 20000);

test('analytics tab falls back to a local analysis when the api is unavailable', async () => {
  apiShouldFail = true;
  await act(async () => { await wait(160); });
  window.localStorage.clear();
  window.localStorage.setItem(ROWS_KEY, JSON.stringify([{
    id: 'r-local-9', name: 'شرکت محلی', personType: 'legal', city: 'شیراز',
    nationalId: '10101010101', amount: '400000', vat: '40000', kind: 1,
    invoiceDate: '2026-04-15', invoiceNo: 'L-9', status: 'pending',
  }]));

  const { root, container } = await renderPage();
  await clickTab(container, 'گزارش‌ها و تحلیل');

  expect(container.textContent).toContain('تحلیل محلی (سرور در دسترس نیست)');
  expect(container.textContent).toContain('جمع مبلغ خرید');
  expect(container.textContent).toContain('۴۰۰٬۰۰۰');

  root.unmount();
  container.remove();
}, 20000);

test('reconcile tab uploads the ledger file and can add the missing rows to the grid', async () => {
  currentReport = apiReport([API_ROW]);
  const { root, container } = await renderPage();

  await clickTab(container, 'مغایرت‌گیری با دفاتر');
  expect(container.textContent).toContain('مغایرت‌گیری با اکسل دفاتر');

  const fileInput = container.querySelector('input[aria-label="فایل دفاتر"]');
  expect(fileInput).not.toBeNull();
  const file = new File(['a,b\n1,2'], 'ledger.csv', { type: 'text/csv' });
  await act(async () => {
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(160);
  });
  expect(container.textContent).toContain('ledger.csv');

  const runButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('اجرای مغایرت‌گیری'));
  await act(async () => { runButton.click(); await wait(420); });

  const reconcileCalls = axiosInstance.post.mock.calls.filter(([url]) => url.includes('/reconcile/'));
  expect(reconcileCalls.length).toBe(1);
  expect(container.textContent).toContain('تطبیق کامل');
  expect(container.textContent).toContain('فقط در دفاتر');

  const addButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('ردیف جاافتاده به جدول'));
  expect(addButton).toBeTruthy();
  await act(async () => { addButton.click(); await wait(420); });

  const addedRow = Array.from(container.querySelectorAll('tbody tr')).find(
    (tr) => tr.querySelector('input[aria-label="نام شرکت"]')?.value === 'شرکت دلتا',
  );
  expect(addedRow).toBeTruthy();
  expect(addedRow.querySelector('input[aria-label="مبلغ"]').value).toBe('۷۰۰٬۰۰۰');
  expect(container.textContent).toContain('از دفاتر به جدول اضافه شد');
  expect(container.textContent).toContain('تعداد ردیف: ۲');

  root.unmount();
  container.remove();
}, 25000);


test('analytics filters by transaction kind and moadian status and can export the report', async () => {
  currentReport = apiReport([API_ROW]);
  const { root, container } = await renderPage();
  await clickTab(container, 'گزارش‌ها و تحلیل');

  /* انتخاب «نوع ۲» از فیلتر نوع معامله */
  const kindCombobox = container.querySelector('[aria-labelledby="analytics-kind-label"]');
  expect(kindCombobox).toBeTruthy();
  await act(async () => {
    kindCombobox.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    await wait(220);
  });
  const kindOption = Array.from(document.querySelectorAll('li[role="option"]'))
    .find((item) => item.textContent.trim() === 'نوع ۲ (۱)');
  expect(kindOption).toBeTruthy();
  await act(async () => { kindOption.click(); await wait(560); });

  const kindCalls = axiosInstance.get.mock.calls
    .filter(([url]) => url.endsWith('/analytics/'))
    .map(([, config]) => config?.params || {});
  expect(kindCalls.some((params) => String(params.kind) === '2')).toBe(true);
  expect(container.textContent).toContain('۵۰۰٬۰۰۰');
  expect(container.textContent).toContain('۲ ردیف از ۳');

  /* فیلتر وضعیت مودیان: «درج‌نشده در سامانه» */
  const statusCombobox = container.querySelector('[aria-labelledby="analytics-status-label"]');
  expect(statusCombobox).toBeTruthy();
  await act(async () => {
    statusCombobox.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    await wait(220);
  });
  const pendingOption = Array.from(document.querySelectorAll('li[role="option"]'))
    .find((item) => item.textContent.includes('درج‌نشده'));
  expect(pendingOption).toBeTruthy();
  await act(async () => { pendingOption.click(); await wait(560); });

  const statusCalls = axiosInstance.get.mock.calls
    .filter(([url]) => url.endsWith('/analytics/'))
    .map(([, config]) => config?.params || {});
  expect(statusCalls.some((params) => params.moadian_status === 'pending' && String(params.kind) === '2')).toBe(true);

  /* خروجی اکسل گزارش با همان فیلترها */
  window.URL.createObjectURL = jest.fn(() => 'blob:analytics');
  window.URL.revokeObjectURL = jest.fn();
  const clickSpy = jest.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const exportButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('خروجی اکسل گزارش'));
  expect(exportButton).toBeTruthy();
  await act(async () => { exportButton.click(); await wait(360); });

  const exportCalls = axiosInstance.get.mock.calls.filter(([url]) => url.endsWith('/analytics-export/'));
  expect(exportCalls.length).toBe(1);
  expect(String(exportCalls[0][1]?.params?.kind)).toBe('2');
  expect(exportCalls[0][1]?.params?.moadian_status).toBe('pending');
  expect(exportCalls[0][1]?.responseType).toBe('blob');
  expect(clickSpy).toHaveBeenCalled();

  clickSpy.mockRestore();
  root.unmount();
  container.remove();
}, 30000);


test('party pivot groups amounts per party, switches dimension and exports', async () => {
  currentReport = apiReport([API_ROW]);
  const { root, container } = await renderPage();
  await clickTab(container, 'گزارش‌ها و تحلیل');

  /* جدول پیوت با جمع مبلغ هر طرف و ستون‌های نوع معامله */
  expect(container.textContent).toContain('جدول پیوت طرف حساب');
  expect(container.textContent).toContain('شرکت آلفا تجارت');
  expect(container.textContent).toContain('نوع ۲');
  expect(container.textContent).toContain('۱٬۰۰۰٬۰۰۰');
  expect(container.textContent).toContain('جمع کل — ۱ طرف حساب');

  const pivotCalls = axiosInstance.get.mock.calls
    .filter(([url]) => url.endsWith('/party-pivot/'))
    .map(([, config]) => config?.params || {});
  expect(pivotCalls.some((params) => params.dimension === 'kind')).toBe(true);

  /* تغییر بُعد ستون‌ها به «ماه شمسی» */
  const dimensionSelect = container.querySelector('[aria-labelledby="pivot-dimension-label"]');
  expect(dimensionSelect).toBeTruthy();
  await act(async () => {
    dimensionSelect.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    await wait(220);
  });
  const monthOption = Array.from(document.querySelectorAll('li[role="option"]'))
    .find((item) => item.textContent.trim() === 'ماه شمسی');
  expect(monthOption).toBeTruthy();
  await act(async () => { monthOption.click(); await wait(520); });

  const monthCalls = axiosInstance.get.mock.calls
    .filter(([url]) => url.endsWith('/party-pivot/'))
    .map(([, config]) => config?.params || {});
  expect(monthCalls.some((params) => params.dimension === 'month')).toBe(true);
  expect(container.textContent).toContain('۱۴۰۵/۰۱');

  /* خروجی اکسل پیوت */
  window.URL.createObjectURL = jest.fn(() => 'blob:pivot');
  window.URL.revokeObjectURL = jest.fn();
  const clickSpy = jest.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const exportButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('خروجی اکسل پیوت'));
  expect(exportButton).toBeTruthy();
  await act(async () => { exportButton.click(); await wait(360); });

  const exportCalls = axiosInstance.get.mock.calls.filter(([url]) => url.endsWith('/party-pivot-export/'));
  expect(exportCalls.length).toBe(1);
  expect(exportCalls[0][1]?.params?.dimension).toBe('month');
  expect(exportCalls[0][1]?.responseType).toBe('blob');
  expect(clickSpy).toHaveBeenCalled();

  clickSpy.mockRestore();
  root.unmount();
  container.remove();
}, 30000);

