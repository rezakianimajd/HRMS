import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import TreasuryBanksPage from '../pages/treasury/TreasuryBanksPage';
import TreasuryPage from '../pages/treasury/TreasuryPage';
import TreasuryVoucherDialog from '../pages/treasury/TreasuryVoucherDialog';

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

const banks = {
  results: [
    { id: 1, name: 'بانک ملت', name_en: 'Bank Mellat', code: '012', swift_code: 'BKMTIRTH', sort_order: 1, branch_count: 2, is_active: true },
    { id: 2, name: 'بانک پاسارگاد', name_en: 'Bank Pasargad', code: '057', swift_code: '', sort_order: 2, branch_count: 0, is_active: false },
  ],
};

const dashboard = {
  as_of: '2026-11-07',
  liquidity: { banks: '150000000', cashboxes: '25000000', total: '175000000', available: '175000000' },
  receivables: {
    received_checks: { count: 4, amount: '40000000' },
    receipts_in_clearing: { count: 2, amount: '12000000' },
  },
  payables: {
    issued_checks: { count: 3, amount: '33000000' },
    commitments: { count: 5, amount: '51000000' },
    advances: { count: 1, amount: '5000000' },
  },
  pending_payments: { count: 6, amount: '61000000' },
  due_soon_7d: {
    received_checks: { count: 1, amount: '10000000' },
    issued_checks: { count: 2, amount: '20000000' },
    commitments: { count: 0, amount: '0' },
  },
  reconciliations: { open: 1 },
  forecast_30d: { expected_receipts: '30000000', upcoming_payments: '45000000', projected_balance: '160000000' },
  entities: [
    { id: 1, code: '101', name: 'بانک ملت - جاری', entity_type: 'bank', balance: '150000000', currency: 'IRR', is_active: true },
    { id: 2, code: '201', name: 'صندوق مرکزی', entity_type: 'cash', balance: '25000000', currency: 'IRR', is_active: true },
  ],
  trend: [
    { month: 'مهر', in: '90000000', out: '70000000' },
    { month: 'آبان', in: '120000000', out: '95000000' },
  ],
};

const voucher = {
  kind: 'receipt',
  title: 'فیش دریافت وجه',
  company: { name: 'موسسه نمونه', code: 'T1', phone: '02100000000', address: 'تهران' },
  number: 'RC-1404-000007',
  date: '۱۴۰۴/۰۷/۱۹',
  time: '',
  status: 'دریافت‌شده',
  received_from: 'آقای احمدی',
  amount: '2500000',
  amount_words: 'دو میلیون و پانصد هزار ریال',
  currency: 'IRR',
  purpose: 'فروش خدمات',
  description: 'دریافت بخشی از مطالبات',
  method: 'نقدی',
  instrument: { reference_no: 'REF-1', tracking_no: '', bank_reference: '', terminal: '', cheque: '' },
  account: { name: 'بانک ملت', account_number: '1234567890', sheba_number: 'IR00', bank_name: 'بانک ملت' },
  project: '',
  contract: '',
  signatures: [
    { label: 'دریافت‌کننده', name: '' },
    { label: 'خزانه‌دار', name: '' },
  ],
  verification: { code: 'RECEIPT-RC-1404-000007', token: 'signed-token', url: '/treasury/verify?token=signed-token' },
  footer: 'این رسید صرفاً پس از ثبت و تأیید در سامانه معتبر است.',
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/treasury/banks/') return Promise.resolve({ data: banks });
    if (url === '/treasury/dashboard/') return Promise.resolve({ data: dashboard });
    if (url === '/treasury/receipts/9/print-data/') return Promise.resolve({ data: voucher });
    return Promise.resolve({ data: { results: [] } });
  });
});

const renderPage = async (element, entry = '/treasury') => {
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
    await wait(600);
  });
  await act(async () => { await wait(200); });
  return { container, root };
};

test('banks master page lists banks and opens the create dialog', async () => {
  const { container, root } = await renderPage(<TreasuryBanksPage />, '/treasury/banks');

  expect(container.textContent).toContain('بانک‌ها');
  expect(container.textContent).toContain('بانک ملت');
  expect(container.textContent).toContain('بانک پاسارگاد');

  const createButton = [...container.querySelectorAll('button')]
    .find((node) => node.textContent.includes('بانک جدید'));
  expect(createButton).toBeTruthy();
  await act(async () => {
    createButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(220);
  });
  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('بانک جدید'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('نام بانک');
  expect(dialog.textContent).toContain('کد بانک');

  root.unmount();
  container.remove();
});

test('treasury dashboard shows liquidity KPIs and entity balances', async () => {
  const { container, root } = await renderPage(<TreasuryPage />, '/treasury');

  expect(container.textContent).toContain('داشبورد خزانه‌داری');
  expect(container.textContent).toContain('موجودی بانک‌ها');
  expect(container.textContent).toContain('موجودی صندوق‌ها');
  expect(container.textContent).toContain('اسناد دریافتنی');
  expect(container.textContent).toContain('اسناد پرداختنی');
  expect(container.textContent).toContain('در انتظار پرداخت');
  expect(container.textContent).toContain('پیش‌بینی ۳۰ روزه');
  expect(container.textContent).toContain('بانک ملت - جاری');
  expect(container.textContent).toContain('صندوق مرکزی');

  root.unmount();
  container.remove();
});

test('voucher dialog prints amount in words and verification code', async () => {
  const { container, root } = await renderPage(
    <TreasuryVoucherDialog open endpoint="/treasury/receipts/9/print-data/" onClose={() => {}} />,
    '/treasury/receipts',
  );

  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('فیش دریافت وجه'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('RC-1404-000007');
  expect(dialog.textContent).toContain('دو میلیون و پانصد هزار ریال');
  expect(dialog.textContent).toContain('آقای احمدی');
  expect(dialog.textContent).toContain('RECEIPT-RC-1404-000007');
  expect(dialog.textContent).toContain('چاپ');

  root.unmount();
  container.remove();
});

