import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import TreasuryReceiptsPage from '../pages/treasury/TreasuryReceiptsPage';
import PaymentRequestsPage from '../pages/treasury/PaymentRequestsPage';
import TreasuryReceivedChecksPage from '../pages/treasury/TreasuryReceivedChecksPage';
import { getMenuForApp } from '../core/config/menuConfig';

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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const receipts = {
  count: 2,
  results: [
    {
      id: 7,
      number: 'RC-1405-000007',
      received_date: '2026-10-21',
      party_name: 'شرکت الف',
      method: 'cash',
      method_display: 'نقدی',
      payment_method_name: 'نقدی',
      purpose: 'فروش خدمات',
      amount: '2500000',
      status: 'received',
      status_display: 'دریافت‌شده',
    },
    {
      id: 8,
      number: 'RC-1405-000008',
      received_date: '2026-10-22',
      party_name: 'شرکت ب',
      method: 'bank',
      method_display: 'واریز به حساب',
      purpose: 'تسویه فاکتور',
      amount: '7000000',
      status: 'expected',
      status_display: 'مورد انتظار',
    },
  ],
};

const requests = {
  count: 1,
  results: [{
    id: 3,
    number: 'PR-1405-000003',
    requested_date: '2026-10-20',
    title: 'خرید تجهیزات',
    party_name: 'تأمین‌کننده ج',
    amount: '12000000',
    deductions_total: '200000',
    net_amount: '11800000',
    status: 'under_review',
    status_display: 'در بررسی',
  }],
};

const checks = {
  count: 1,
  results: [{
    id: 5,
    number: '123456',
    kind_display: 'عادی',
    party: 'آقای رضایی',
    bank_name: 'بانک ملت',
    due_date: '2026-11-20',
    amount: '15000000',
    status: 'deposited',
    status_display: 'واگذارشده به بانک',
  }],
};

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/treasury/receipts/') return Promise.resolve({ data: receipts });
    if (url === '/treasury/payment-requests/') return Promise.resolve({ data: requests });
    if (url === '/treasury/received-checks/') return Promise.resolve({ data: checks });
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
    await wait(650);
  });
  await act(async () => { await wait(200); });
  return { container, root };
};

test('receipts list renders studio header, search bar and standard table', async () => {
  const { container, root } = await renderPage(<TreasuryReceiptsPage />, '/treasury/receipts');

  expect(container.textContent).toContain('دریافت‌ها');
  expect(container.textContent).toContain('RC-1405-000007');
  expect(container.textContent).toContain('شرکت الف');
  expect(container.textContent).toContain('دریافت‌شده');
  expect(container.textContent).toContain('مورد انتظار');
  expect(container.textContent).toContain('دریافت جدید');

  const searchInput = container.querySelector('input[aria-label*="جست‌وجو"]');
  expect(searchInput).toBeTruthy();

  const actionButtons = [...container.querySelectorAll('button')]
    .map((node) => node.textContent.trim());
  expect(actionButtons).toContain('وصول');
  expect(actionButtons).toContain('چاپ');
  expect(actionButtons).toContain('دریافت');

  root.unmount();
  container.remove();
});

test('payment requests page applies the status deep link from the menu', async () => {
  const { container, root } = await renderPage(
    <PaymentRequestsPage />,
    '/treasury/payment-requests?status=submitted,under_review',
  );

  expect(container.textContent).toContain('درخواست‌های پرداخت');
  expect(container.textContent).toContain('خرید تجهیزات');
  const requestCall = axiosInstance.get.mock.calls
    .find(([url]) => url === '/treasury/payment-requests/');
  expect(requestCall[1].params.status).toBe('submitted,under_review');

  root.unmount();
  container.remove();
});

test('received checks page exposes cheque workflow actions', async () => {
  const { container, root } = await renderPage(
    <TreasuryReceivedChecksPage />,
    '/treasury/received-checks?status=deposited,clearing',
  );

  expect(container.textContent).toContain('چک‌های دریافتی');
  expect(container.textContent).toContain('123456');
  expect(container.textContent).toContain('واگذارشده به بانک');
  const buttons = [...container.querySelectorAll('button')].map((n) => n.textContent.trim());
  expect(buttons).toContain('وصول');
  expect(buttons).toContain('برگشت');

  root.unmount();
  container.remove();
});

test('treasury menu follows the reorganized structure', () => {
  const groups = getMenuForApp('treasury');
  const titles = groups.map((group) => group.title);

  expect(titles).toEqual([
    'خانه',
    'دریافت و پرداخت',
    'درخواست و دستور پرداخت',
    'بانک و حساب‌ها',
    'کارت‌خوان و درگاه',
    'اسناد دریافتنی',
    'اسناد پرداختنی',
    'عملیات چک',
    'صندوق و وجوه نقد',
    'تعهدات و سررسیدها',
    'مدیریت نقدینگی',
    'مغایرت بانکی',
    'عملیات ارزی',
    'گزارش‌ها',
    'اسناد و چاپ',
    'تعاریف',
  ]);

  const items = groups.flatMap((group) => group.items);
  const paths = items.map((item) => item.path);
  expect(paths).toContain('/treasury/transactions');
  expect(paths).toContain('/treasury/payment-orders');
  expect(paths).toContain('/treasury/approval-rules');
  expect(paths).toContain('/treasury/received-checks?status=cleared');
  expect(paths).toContain('/treasury/payment-requests?status=submitted,under_review');
  expect(items.every((item) => item.ready)).toBe(true);
});

