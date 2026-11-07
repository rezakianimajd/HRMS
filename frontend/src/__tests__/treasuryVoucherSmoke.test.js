import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import TreasuryVoucherBookPage from '../pages/treasury/TreasuryVoucherBookPage';
import TreasuryBankOrdersPage from '../pages/treasury/TreasuryBankOrdersPage';
import TreasuryPrintTemplatesPage from '../pages/treasury/TreasuryPrintTemplatesPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn(),
  },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { treasury: '#14b8a6' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'treasury' }, applications: [] }),
}));

const entities = [
  {
    id: 3, code: '101', name: 'بانک ملت جاری', entity_type: 'bank',
    balance: '150000000', currency: 'IRR', is_active: true,
    sheba_number: 'IR062960000000100324200001',
  },
  {
    id: 4, code: '201', name: 'صندوق مرکزی', entity_type: 'cash',
    balance: '25000000', currency: 'IRR', is_active: true,
  },
];

const transactions = {
  results: [
    {
      id: 11, number: 'RC-1405-000011', date: '2025-10-11', direction: 'receipt',
      instrument_kind: 'cheque', instrument_kind_display: 'چک',
      party: 'آقای احمدی', party_national_id: '0012345678', cheque_number: '884422',
      cheque_due_date: '2025-11-01', is_guarantee: false, invoice_number: 'INV-9',
      invoice_date: '2025-10-05', invoice_amount: '2500000', amount: '2500000',
      description: 'دریافت چک', status: 'draft', status_display: 'پیش‌نویس',
      entity: 3, entity_name: 'بانک ملت جاری', entity_code: '101',
      debit_account: null, reference_no: 'REF-9', tracking_no: '',
    },
  ],
};

const bankOrders = {
  results: [
    {
      id: 5, number: 'BO-1405-000005', transfer_type: 'satna',
      transfer_type_display: 'ساتنا (فوری)', date: '2025-10-12',
      destination_owner_name: 'شرکت پیمانکار', destination_iban: 'IR062960000000100324200001',
      destination_bank_name: 'بانک مسکن', amount: '45000000',
      status: 'draft', status_display: 'پیش‌نویس',
    },
  ],
};

const templates = {
  results: [
    {
      id: 1, name: 'فیش دریافت — قالب استاندارد', kind: 'receipt', paper: 'A5',
      is_default: true, note: '', body: '<b>{{number}}</b> {{amount_words}}',
    },
  ],
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/treasury/treasury-entities/balances/') return Promise.resolve({ data: entities });
    if (url === '/treasury/treasury-transactions/') return Promise.resolve({ data: transactions });
    if (url === '/treasury/bank-orders/') return Promise.resolve({ data: bankOrders });
    if (url === '/treasury/print-templates/') return Promise.resolve({ data: templates });
    if (url === '/treasury/numbering/') {
      return Promise.resolve({
        data: { preview: { receipt: 'RC-1405-000012', payment: 'PY-1405-000012' } },
      });
    }
    return Promise.resolve({ data: { results: [] } });
  });
});

const renderPage = async (element, entry = '/treasury/voucher-book') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>{element}</MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(650);
  });
  await act(async () => { await wait(220); });
  return { container, root };
};

test('voucher book shows cheque/cash/sheba form and the document grid', async () => {
  const { container, root } = await renderPage(<TreasuryVoucherBookPage />);

  expect(container.textContent).toContain('دفتر اسناد دریافت و پرداخت');
  expect(container.textContent).toContain('اسناد دریافتی');
  expect(container.textContent).toContain('اسناد پرداختی');
  expect(container.textContent).toContain('RC-1405-000011');
  expect(container.textContent).toContain('884422');
  expect(container.textContent).toContain('شناسه / کد ملی');
  expect(container.textContent).toContain('شماره فاکتور');
  expect(container.textContent).toContain('حساب بدهکار/بستانکار سند');
  expect(container.textContent).toContain('سریال بعدی');

  root.unmount();
  container.remove();
});

test('bank order page renders SATNA/PAYA form with sheba fields', async () => {
  const { container, root } = await renderPage(
    <TreasuryBankOrdersPage />, '/treasury/bank-orders',
  );

  expect(container.textContent).toContain('دستور پرداخت الکترونیکی بین‌بانکی');
  expect(container.textContent).toContain('ساتنا');
  expect(container.textContent).toContain('پایا');
  expect(container.textContent).toContain('شبا مبدأ');
  expect(container.textContent).toContain('شبا مقصد');
  expect(container.textContent).toContain('مبلغ به حروف');
  expect(container.textContent).toContain('BO-1405-000005');
  expect(container.textContent).toContain('شرکت پیمانکار');

  root.unmount();
  container.remove();
});

test('print templates page lists templates and opens the editor', async () => {
  const { container, root } = await renderPage(
    <TreasuryPrintTemplatesPage />, '/treasury/print-templates',
  );

  expect(container.textContent).toContain('قالب‌های چاپ فیش و رسید');
  expect(container.textContent).toContain('فیش دریافت — قالب استاندارد');

  const createButton = [...container.querySelectorAll('button')]
    .find((node) => node.textContent.includes('قالب جدید'));
  expect(createButton).toBeTruthy();
  await act(async () => {
    createButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(260);
  });
  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('قالب چاپ جدید'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('بدنهٔ قالب');

  root.unmount();
  container.remove();
});

