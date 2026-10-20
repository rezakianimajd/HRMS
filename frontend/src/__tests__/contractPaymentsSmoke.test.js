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
  note: 'پرداخت اولیه صورت‌وضعیت',
  invoice: 1,
  invoice_number: 'INV-100',
  statement: 1,
  statement_number: 'ST-100',
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
    if (url === '/contract-statements/') return Promise.resolve({ data: [{ id: 1, number: 'ST-100' }] });
    if (url === '/contract-payments/') return Promise.resolve({ data: [payment] });
    return Promise.resolve({ data: null });
  });
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
  expect(container.textContent).toContain('مجموع پرداخت‌ها');
  expect(container.textContent).toContain('REF-100');
  expect(container.textContent).toContain('حواله بانکی');
  expect(container.textContent).toContain('INV-100');
  expect(container.textContent).toContain('ST-100');
  expect(container.textContent).toContain('مشاهده جزئیات');

  const card = Array.from(container.querySelectorAll('[role="button"]'))
    .find((element) => element.textContent.includes('مشاهده جزئیات'));
  expect(card).toBeTruthy();
  await act(async () => { card.click(); await wait(220); });

  expect(document.body.textContent).toContain('جزئیات پرداخت قرارداد');
  expect(document.body.textContent).toContain('اطلاعات پرداخت');
  expect(document.body.textContent).toContain('پیوندهای پرونده');
  expect(document.body.textContent).toContain('پرداخت اولیه صورت‌وضعیت');

  root.unmount();
  container.remove();
});
