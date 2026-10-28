import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractInvoicesPage from '../pages/ContractInvoicesPage';

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
  status_display: 'در حال اجرا',
  amount: 1000000000,
  currency: 1,
  currency_name: 'ریال ایران',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
};

const invoice = {
  id: 7,
  contract: 1,
  contract_subject: 'قرارداد ساخت سالن تولید',
  number: 'INV-100',
  subject: 'فاکتور تجهیزات کارگاه',
  date: '2026-10-01',
  due_date: '2026-10-20',
  currency: 1,
  currency_name: 'ریال ایران',
  amount: 100000000,
  vat: 10000000,
  total: 110000000,
  is_paid: false,
  description: 'فاکتور خرید تجهیزات',
};

const payment = {
  id: 3,
  contract: 1,
  invoice: 7,
  amount: 50000000,
  date: '2026-10-05',
  method: 'حواله بانکی',
  reference: 'PAY-100',
};

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/') return Promise.resolve({ data: [contract] });
    if (url === '/currencies/') return Promise.resolve({ data: [{ id: 1, name: 'ریال ایران', symbol: '﷼', code: 'IRR' }] });
    if (url === '/contract-invoices/') return Promise.resolve({ data: [invoice] });
    if (url === '/contract-payments/') return Promise.resolve({ data: [payment] });
    return Promise.resolve({ data: [] });
  });
});

test('invoice workspace renders KPI, invoice card, detail drawer and editor dialog', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-invoices?contract=1']}>
          <ContractInvoicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(800);
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('فاکتورهای قرارداد');
  expect(container.textContent).toContain('شماره فاکتور');
  expect(container.textContent).toContain('INV-۱۰۰');
  expect(container.textContent).toContain('فاکتور تجهیزات کارگاه');
  expect(container.textContent).toContain('سررسید گذشته');
  expect(container.textContent).toContain('جمع مبلغ:');
  expect(container.textContent).toContain('فهرست قراردادها');

  const detailButton = container.querySelector('button[aria-label="جزئیات"]');
  expect(detailButton).toBeTruthy();
  await act(async () => { detailButton.click(); await wait(260); });

  expect(document.body.textContent).toContain('مشخصات مالی');
  expect(document.body.textContent).toContain('پرداخت‌های مرتبط');
  expect(document.body.textContent).toContain('PAY-100');
  expect(document.body.textContent).toContain('تاریخ سررسید');

  const editButton = document.querySelector('button[aria-label="ویرایش"]');
  expect(editButton).toBeTruthy();
  await act(async () => { editButton.click(); await wait(300); });

  expect(document.body.textContent).toContain('ویرایش فاکتور');
  expect(document.body.textContent).toContain('مبالغ و ارز');
  expect(document.body.textContent).toContain('مبلغ کل فاکتور');
  expect(document.body.textContent).toContain('ذخیره فاکتور');

  root.unmount();
  container.remove();
});

test('invoice landing shows KPI, contract picker and due invoices', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-invoices']}>
          <ContractInvoicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(850);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('شماره قرارداد');
  expect(container.textContent).toContain('طرف قرارداد');
  expect(container.textContent).toContain('موضوع قرارداد');
  expect(container.textContent).toContain('تعداد فاکتور');
  expect(container.textContent).toContain('مجموع مبلغ');
  expect(container.textContent).toContain('C-۱۰۰');
  expect(container.textContent).toContain('شرکت ساختمانی الف');
  expect(container.textContent).toContain('قرارداد ساخت سالن تولید');
  expect(container.querySelector('input[placeholder*="جستجو"]')).toBeTruthy();

  root.unmount();
  container.remove();
});
