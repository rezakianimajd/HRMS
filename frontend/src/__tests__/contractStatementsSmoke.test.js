import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import StatementEditorPage from '../pages/contracts/StatementEditorPage';

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

jest.mock('../core/hooks/useCompany', () => ({
  __esModule: true,
  default: () => ({ currentCompany: { id: 1, name: 'شرکت نمونه', code: 'CO-1' } }),
}));

jest.mock('html2canvas', () => jest.fn(() => Promise.resolve({ width: 100, height: 100, toDataURL: () => 'data:image/png;base64,x' })));

const contract = {
  id: 1,
  number: 'C-100',
  subject: 'قرارداد ساخت سالن تولید',
  party_name: 'شرکت ساختمانی الف',
  status_display: 'در حال اجرا',
  amount: 1000000000,
  currency: 1,
  currency_name: 'ریال ایران',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  addendums: [],
};

const statement = {
  id: 11,
  contract: 1,
  contract_number: 'C-100',
  contract_subject: 'قرارداد ساخت سالن تولید',
  number: '3',
  date: '2026-10-01',
  amount: 500000000,
  cumulative_previous_amount: 300000000,
  work_done: 200000000,
  additions: [{ code: 'vat', description: 'ارزش افزوده', percent: 10, amount: 20000000 }],
  additions_total: 20000000,
  deductions: [{ title: 'حسن انجام کار', amount: 10000000 }],
  deductions_total: 10000000,
  net_amount: 210000000,
  currency: 1,
  currency_name: 'ریال ایران',
  exchange_rate: 1,
  is_approved: true,
  description: 'صورت‌وضعیت دوره مهر',
  documents: [{
    id: 5,
    title: 'صورت‌وضعیت امضاشده',
    file_name: 'statement.pdf',
    file_url: 'http://localhost/media/contracts/statement.pdf',
  }],
};

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

const buttonByText = (rootEl, text) => Array.from(rootEl.querySelectorAll('button'))
  .find((element) => element.textContent.trim() === text);

const pickKindOption = async (rootEl, label) => {
  const kindInput = Array.from(rootEl.querySelectorAll('input')).find((element) => element.value === 'statement');
  const select = kindInput.closest('.MuiInputBase-root')?.querySelector('[role="combobox"]') || kindInput;
  await act(async () => {
    select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    await wait(180);
  });
  const option = Array.from(document.querySelectorAll('[role="option"]'))
    .find((element) => element.textContent.includes(label));
  await act(async () => { option.click(); await wait(320); });
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/settings/company-profile/') return Promise.resolve({ data: { company_name: 'شرکت نمونه', logo_url: null } });
    if (url === '/external-contracts/') return Promise.resolve({ data: [contract] });
    if (url === '/external-contracts/1/') return Promise.resolve({ data: contract });
    if (url === '/contract-statements/') return Promise.resolve({ data: [statement] });
    if (url === '/contract-payments/') return Promise.resolve({ data: [{ id: 3, contract: 1, statement: 11, amount: 150000000 }] });
    if (url === '/currencies/') return Promise.resolve({ data: [{ id: 1, name: 'ریال ایران', symbol: '﷼', code: 'IRR', exchange_rate: 1 }] });
    if (url === '/additions/') return Promise.resolve({ data: [{ id: 1, code: 'vat', description: 'ارزش افزوده', default_percent: 10 }] });
    if (url === '/deductions/') return Promise.resolve({ data: [{ id: 1, code: 'retention', description: 'حسن انجام کار', default_percent: 5 }] });
    return Promise.resolve({ data: [] });
  });
});

test('statements workspace renders KPI, cards, detail drawer and editor with attachments', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-statements?contract=1']}>
          <StatementEditorPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(800);
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('صورت‌وضعیت‌های قرارداد');
  expect(container.textContent).toContain('قرارداد ساخت سالن تولید');
  expect(container.textContent).toContain('پوشش مالی صورت‌وضعیت‌ها');
  expect(container.textContent).toContain('روند صورت‌وضعیت‌ها');
  expect(container.textContent).toContain('۰۳');
  expect(container.textContent).toContain('تأیید شده');
  expect(container.textContent).toContain('۱ پیوست');
  expect(container.textContent).toContain('جزئیات');

  const detailButton = Array.from(container.querySelectorAll('button'))
    .find((element) => element.textContent.trim() === 'جزئیات');
  expect(detailButton).toBeTruthy();
  await act(async () => { detailButton.click(); await wait(260); });

  expect(document.body.textContent).toContain('مشخصات مالی');
  expect(document.body.textContent).toContain('مدارک و پیوست‌ها');
  expect(document.body.textContent).toContain('صورت‌وضعیت امضاشده');
  expect(document.body.textContent).toContain('کارکرد این دوره');

  const editButton = Array.from(document.querySelectorAll('button'))
    .find((element) => element.textContent.trim() === 'ویرایش');
  expect(editButton).toBeTruthy();
  await act(async () => { editButton.click(); await wait(320); });

  expect(document.body.textContent).toContain('ویرایش صورت‌وضعیت');
  expect(document.body.textContent).toContain('مدارک و پیوست‌ها');
  expect(document.body.textContent).toContain('افزودن مدرک صورت‌وضعیت');
  expect(document.body.textContent).toContain('مبلغ تجمعی این صورت‌وضعیت');
  expect(document.body.textContent).toContain('ذخیره صورت‌وضعیت');
  expect(document.body.textContent).toContain('بازگشت به لیست');
  expect(document.querySelector('[role="dialog"]')).toBeNull();

  const kindInput = Array.from(document.querySelectorAll('input'))
    .find((element) => element.value === 'statement');
  expect(kindInput).toBeTruthy();
  const kindSelect = kindInput.closest('.MuiInputBase-root')?.querySelector('[role="combobox"]')
    || kindInput;
  await act(async () => {
    kindSelect.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    await wait(180);
  });
  const adjustmentOption = Array.from(document.querySelectorAll('[role="option"]'))
    .find((element) => element.textContent.includes('تعدیل افزایشی'));
  expect(adjustmentOption).toBeTruthy();
  await act(async () => { adjustmentOption.click(); await wait(320); });

  expect(document.body.textContent).toContain('تعدیل افزایشی این دوره');
  expect(document.body.textContent).toContain('مبلغ قابل پرداخت این تعدیل');
  expect(document.body.textContent).toContain('تعدیل تجمعی پس از این سند');
  expect(document.body.textContent).toContain('اضافات');
  expect(document.body.textContent).toContain('کسورات');

  const backButton = Array.from(document.querySelectorAll('button'))
    .find((element) => element.textContent.trim() === 'بازگشت به لیست');
  expect(backButton).toBeTruthy();
  await act(async () => { backButton.click(); await wait(260); });
  expect(container.textContent).toContain('روند صورت‌وضعیت‌ها');

  root.unmount();
  container.remove();
});

test('statements landing shows KPI, contract picker and pending approvals', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-statements']}>
          <StatementEditorPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(850);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('انتخاب قرارداد');
  expect(container.textContent).toContain('کل قراردادها');
  expect(container.textContent).toContain('دارای صورت‌وضعیت');
  expect(container.textContent).toContain('قرارداد ساخت سالن تولید');
  expect(container.textContent).toContain('در انتظار تأیید');

  root.unmount();
  container.remove();
});



test('saving an increase adjustment keeps its additions and deductions', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  axiosInstance.patch.mockReset();
  axiosInstance.patch.mockResolvedValue({ data: { ...statement } });

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-statements?contract=1']}>
          <StatementEditorPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(800);
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  const detailButton = buttonByText(container, 'جزئیات');
  expect(detailButton).toBeTruthy();
  await act(async () => { detailButton.click(); await wait(260); });

  const editButton = buttonByText(document, 'ویرایش');
  expect(editButton).toBeTruthy();
  await act(async () => { editButton.click(); await wait(320); });

  await pickKindOption(container, 'تعدیل افزایشی');
  expect(container.textContent).toContain('تعدیل افزایشی این دوره');

  // فیلد «تعدیل افزایشی این دوره» باید قابل ویرایش باشد.
  const adjustmentInput = Array.from(container.querySelectorAll('input')).find((input) => (
    (input.closest('.MuiFormControl-root')?.textContent || '').includes('تعدیل افزایشی این دوره')
    && !input.readOnly
  ));
  expect(adjustmentInput).toBeTruthy();

  const saveButton = buttonByText(container, 'ذخیره تعدیل افزایشی');
  expect(saveButton).toBeTruthy();
  await act(async () => { saveButton.click(); await wait(400); });

  expect(axiosInstance.patch).toHaveBeenCalled();
  const [url, payload] = axiosInstance.patch.mock.calls[0];
  expect(url).toBe('/contract-statements/11/');
  expect(payload.kind).toBe('increase');
  expect(payload.adjustment_work_done).toBe(200000000);
  // رگرسیون: اضافات/کسورات تعدیل هنگام ذخیره نباید حذف شوند.
  expect(payload.additions).toHaveLength(1);
  expect(payload.additions[0].amount).toBe(20000000);
  expect(payload.deductions).toHaveLength(1);
  expect(payload.additions_total).toBe(20000000);
  expect(payload.deductions_total).toBe(10000000);
  expect(payload.net_amount).toBe(210000000);

  root.unmount();
  container.remove();
});
