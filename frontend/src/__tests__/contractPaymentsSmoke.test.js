import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractPaymentsPage from '../pages/ContractPaymentsPage';

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

const contract = {
  id: 1,
  number: 'C-100',
  subject: 'قرارداد ساخت سالن تولید',
  party_name: 'شرکت ساختمانی الف',
  status: 'active',
  contract_type: 'construction',
  contract_type_master_name: 'پیمانکاری',
  amount: 1000000000,
  effective_amount: 1000000000,
  currency: 1,
  currency_name: 'ریال ایران',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
};

const payment = {
  id: 11,
  contract: 1,
  date: '2026-10-01',
  amount: 300000000,
  currency: 1,
  currency_name: 'ریال ایران',
  reference: 'REF-100',
  method: 'حواله بانکی',
  payment_type: 'normal',
  payment_type_display: 'پرداخت عادی',
  note: 'پرداخت اولیه صورت‌وضعیت',
  invoice: 1,
  invoice_number: 'INV-100',
  statement: 1,
  statement_number: '3',
  statement_amount: 400000000,
  statement_net_amount: 350000000,
  statement_exchange_rate: 1,
  statement_currency_name: 'ریال ایران',
  statement_foreign_amount: null,
  attachment_count: 1,
  attachments: [{
    id: 5, title: 'رسید بانکی', file_name: 'receipt.pdf', size: 2048,
    file_url: 'http://localhost/media/payment_attachments/receipt.pdf',
  }],
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/') return Promise.resolve({ data: [contract] });
    if (url === '/currencies/') return Promise.resolve({ data: [{ id: 1, name: 'ریال ایران', symbol: '﷼', code: 'IRR' }] });
    if (url === '/contract-invoices/') return Promise.resolve({ data: [{ id: 1, number: 'INV-100' }] });
    if (url === '/contract-statements/') return Promise.resolve({ data: [{ id: 1, number: '3' }] });
    if (url === '/contract-payments/') return Promise.resolve({ data: [payment] });
    return Promise.resolve({ data: null });
  });
});

test('foreign statement shows rial amount, foreign equivalent and payable amount', async () => {
  const foreignContract = {
    ...contract,
    id: 2,
    number: 'C-200',
    subject: 'قرارداد تجهیزات وارداتی',
    amount: 1000,
    effective_amount: 1000,
    currency: 2,
    currency_name: 'یورو',
    exchange_rate: 2000000,
  };
  const foreignPayment = {
    ...payment,
    id: 12,
    contract: 2,
    currency: 2,
    currency_name: 'یورو',
    amount: 2000000000,
    reference: 'REF-EUR',
    statement_amount: 4000000000,
    statement_net_amount: 3000000000,
    statement_exchange_rate: 2000000,
    statement_currency_name: 'یورو',
    statement_foreign_amount: 2000,
  };
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/') return Promise.resolve({ data: [foreignContract] });
    if (url === '/currencies/') {
      return Promise.resolve({
        data: [
          { id: 1, name: 'ریال ایران', symbol: '﷼', code: 'IRR' },
          { id: 2, name: 'یورو', symbol: '€', code: 'EUR', exchange_rate: 2000000 },
        ],
      });
    }
    if (url === '/contract-invoices/') return Promise.resolve({ data: [{ id: 1, number: 'INV-EUR' }] });
    if (url === '/contract-statements/') {
      return Promise.resolve({
        data: [{
          id: 2,
          number: 'ST-EUR',
          amount: 4000000000,
          net_amount: 3000000000,
          exchange_rate: 2000000,
          currency_name: 'یورو',
          foreign_amount: 2000,
        }],
      });
    }
    if (url === '/contract-payments/') return Promise.resolve({ data: [foreignPayment] });
    return Promise.resolve({ data: null });
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-payments?contract=2']}>
          <ContractPaymentsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(650);
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('قرارداد تجهیزات وارداتی');
  expect(container.textContent).toContain('REF-EUR');
  expect(container.textContent).toContain('قابل پرداخت صورت‌وضعیت');
  expect(container.textContent).toContain('≈');
});

test('contract payments page renders financial summary, linked details and detail drawer', async () => {

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-payments?contract=1']}>
          <ContractPaymentsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(650);
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('پرداخت‌های قرارداد');
  expect(container.textContent).toContain('قرارداد ساخت سالن تولید');
  expect(container.textContent).toContain('پوشش مالی پرداخت‌ها');
  expect(container.textContent).toContain('روش‌های پرداخت');
  expect(container.textContent).toContain('روند پرداخت‌ها');
  expect(container.textContent).toContain('مجموع پرداخت‌شده');
  expect(container.textContent).toContain('REF-100');
  expect(container.textContent).toContain('حواله بانکی');
  expect(container.textContent).toContain('پرداخت عادی');
  expect(container.textContent).toContain('INV-100');
  expect(container.textContent).toContain('۰۳');
  expect(container.textContent).toContain('قابل پرداخت صورت‌وضعیت');
  expect(container.textContent).not.toContain('≈');
  expect(container.textContent).toContain('مشاهده جزئیات');
  expect(container.textContent).toContain('۱ فایل');

  const newButton = Array.from(container.querySelectorAll('button'))
    .find((element) => element.textContent.trim() === 'پرداخت جدید');
  expect(newButton).toBeTruthy();
  await act(async () => { newButton.click(); await wait(220); });
  expect(document.body.textContent).toContain('ثبت پرداخت عادی جدید');
  expect(document.body.textContent).toContain('پیوست فایل‌ها');
  expect(document.body.textContent).toContain('انتخاب فایل پیوست');

  const typeInput = Array.from(document.querySelectorAll('input'))
    .find((element) => element.value === 'normal');
  expect(typeInput).toBeTruthy();
  const typeSelect = typeInput.closest('.MuiInputBase-root')?.querySelector('[role="combobox"]')
    || typeInput;
  await act(async () => {
    typeSelect.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    await wait(180);
  });
  const advanceOption = Array.from(document.querySelectorAll('[role="option"]'))
    .find((element) => element.textContent.includes('پیش‌پرداخت'));
  expect(advanceOption).toBeTruthy();
  await act(async () => { advanceOption.click(); await wait(220); });
  expect(document.body.textContent).toContain('ثبت پیش‌پرداخت جدید');
  expect(document.body.textContent).toContain('به صورت‌وضعیت متصل نمی‌شود');
  expect(document.body.textContent).not.toContain('صورت‌وضعیت مرتبط');

  const cancelButton = Array.from(document.querySelectorAll('button'))
    .find((element) => element.textContent.trim() === 'انصراف');
  await act(async () => { cancelButton.click(); await wait(180); });

  const card = Array.from(container.querySelectorAll('[role="button"]'))
    .find((element) => element.textContent.includes('مشاهده جزئیات'));
  expect(card).toBeTruthy();
  await act(async () => { card.click(); await wait(220); });

  expect(document.body.textContent).toContain('جزئیات پرداخت قرارداد');
  expect(document.body.textContent).toContain('اطلاعات پرداخت');
  expect(document.body.textContent).toContain('پیوندهای پرونده');
  expect(document.body.textContent).toContain('فایل‌های پیوست');
  expect(document.body.textContent).toContain('رسید بانکی');
  expect(document.body.textContent).toContain('پرداخت اولیه صورت‌وضعیت');

  root.unmount();
  container.remove();
});
