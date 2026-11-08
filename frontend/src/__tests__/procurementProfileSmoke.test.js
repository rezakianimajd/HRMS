import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ProcurementSupplierProfilePage from '../pages/procurement/ProcurementSupplierProfilePage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { procurement: '#3b82f6' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'procurement' }, applications: [] }),
}));

const profile = {
  supplier: {
    id: 7, code: 'SUP-7', name: 'شرکت بازرگانی نمونه', status: 'active', rating: 4.5,
    credit_limit: 5000000000, national_id: '10101010101', economic_code: '411111111111',
    tax_id: 'TAX-7', registration_number: '12345', phone: '02100000000', mobile: '09120000000',
    contact_person: 'آقای نمونه', sheba_number: 'IR120570000000000000000001',
    payment_terms: '۳۰ روزه', category_name: 'تجهیزات', address: 'تهران',
  },
  summary: {
    orders: {
      count: 2, amount: 1000000000, open_count: 1, open_amount: 600000000, average: 500000000,
      last_date: '2026-10-01', rial_count: 1, foreign_count: 1,
      rial_amount: 600000000, foreign_amount: 400000000,
      by_currency: [{ currency: 'USD', count: 1, amount: 500, rial_amount: 400000000 }],
    },
    invoices: {
      count: 1, invoiced: 500000000, paid: 300000000, balance: 200000000,
      unpaid_count: 1, overdue_count: 1, overdue_amount: 200000000, last_date: '2026-10-05',
    },
    payments: { count: 1, amount: 300000000, last_date: '2026-10-08' },
    guarantees: {
      count: 1, active_count: 1, expiring_count: 0, expired_count: 0, released_count: 0,
      amount: 50000000, active_amount: 50000000,
    },
    proformas: { count: 1, amount: 100000000, last_date: '2026-09-20' },
    quotations: { count: 1, amount: 700000000, won_count: 1, last_date: '2026-09-15' },
    collection_rate: 60,
    last_activity: '2026-10-08',
    today: '2026-11-08',
  },
  orders: [
    {
      id: 1, number: 'PO-100', date: '2026-10-01', status: 'sent',
      status_label: 'ارسال به تأمین‌کننده', amount: 600000000, rial_amount: 600000000,
      group: 'rial', currency: '', rate: 1, expected_date: '2026-11-12', days: 4,
    },
    {
      id: 2, number: 'PO-200', date: '2026-09-10', status: 'approved',
      status_label: 'تأییدشده', amount: 500, rial_amount: 400000000,
      group: 'foreign', currency: 'USD', rate: 800000, expected_date: null, days: null,
    },
  ],
  invoices: [{
    id: 11, number: 'INV-1', date: '2026-10-05', due_date: '2026-10-20',
    status: 'approved', status_label: 'تأییدشده', amount: 500000000, rial_amount: 500000000,
    paid_amount: 300000000, payment_status: 'partial', overdue: true, group: 'rial', currency: '',
  }],
  payments: [{
    id: 21, date: '2026-10-08', amount: 300000000, method: 'transfer',
    method_label: 'انتقال بانکی', reference: 'REF-1', bank: 'ملت',
    invoice_id: 11, invoice_number: 'INV-1',
  }],
  guarantees: [{
    id: 31, number: 'G-1', kind: 'performance', kind_label: 'حسن انجام تعهدات',
    instrument_type: 'check', amount: 50000000, issue_date: '2026-08-01',
    expiry_date: '2026-09-01', is_released: false, valid_until: '2031-08-01',
    days_to_expiry: 1000, is_expired: false,
  }],
  proformas: [{
    id: 41, number: 'PF-1', date: '2026-09-20', status: 'approved',
    status_label: 'تأییدشده', amount: 100000000, rial_amount: 100000000,
    group: 'rial', currency: '',
  }],
  quotations: [{
    id: 51, number: 'QT-1', inquiry_number: 'RFQ-1', date: '2026-09-15',
    status: 'awarded', status_label: 'برنده انتخاب شد', total: 700000000,
    rial_amount: 700000000, group: 'rial', currency: '', delivery_days: 15, is_winner: true,
  }],
  documents: [{
    id: 61, title: 'پیش‌فاکتور تأمین‌کننده', kind: 'proforma', kind_label: 'پیش‌فاکتور',
    file_url: 'http://server/media/procurement/pf.pdf', size: 204800, note: '',
    created_at: '2026-09-20',
  }],
  timeline: [
    { kind: 'document', label: 'سند', tone: '#475569', date: '2026-09-20', title: 'پیش‌فاکتور تأمین‌کننده', detail: 'پیش‌فاکتور', amount: null },
    { kind: 'payment', label: 'پرداخت', tone: '#0f766e', date: '2026-10-08', title: 'INV-1', detail: 'انتقال بانکی', amount: 300000000 },
  ],
};

const suppliers = [{ id: 7, name: 'شرکت بازرگانی نمونه' }, { id: 8, name: 'تأمین‌کننده دوم' }];

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/procurement/supplier-profile?supplier=7']}>
          <ProcurementSupplierProfilePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(500);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(160); });
  }
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/procurement/suppliers/') return Promise.resolve({ data: suppliers });
    if (url === '/procurement/suppliers/7/profile/') return Promise.resolve({ data: profile });
    return Promise.resolve({ data: null });
  });
});

test('purchase profile mirrors the contract profile layout', async () => {
  const { container, root } = await renderPage();

  expect(axiosInstance.get).toHaveBeenCalledWith('/procurement/suppliers/7/profile/');

  // هدر و کارت هویت
  expect(container.textContent).toContain('پرونده خرید');
  expect(container.textContent).toContain('شرکت بازرگانی نمونه');
  expect(container.textContent).toContain('شناسه ملی / کد ثبت');
  expect(container.textContent).toContain('سقف اعتبار');

  // کاشی‌های مالی
  expect(container.textContent).toContain('ارزش سفارش‌ها');
  expect(container.textContent).toContain('صورتحساب‌شده');
  expect(container.textContent).toContain('پرداخت‌شده');
  expect(container.textContent).toContain('ماندهٔ تسویه');
  expect(container.textContent).toContain('تضامین فعال');

  // نمای کلی
  expect(container.textContent).toContain('جریان خرید در شش ماه');
  expect(container.textContent).toContain('آخرین اسناد پرونده');
  expect(container.textContent).toContain('نرخ تسویه');

  // تب‌ها
  const tabs = [...container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent);
  expect(tabs).toEqual(expect.arrayContaining([
    'نمای کلی', 'سفارش‌ها', 'پیشنهادها (RFQ)', 'پیش‌فاکتورها', 'صورتحساب‌ها',
    'پرداخت‌ها', 'تضامین', 'اسناد', 'خط زمانی',
  ]));

  // تب سفارش‌ها
  const ordersTab = [...container.querySelectorAll('[role="tab"]')]
    .find((tab) => tab.textContent === 'سفارش‌ها');
  await act(async () => {
    ordersTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(220);
  });
  expect(container.textContent).toContain('PO-۱۰۰');
  expect(container.textContent).toContain('معادل ریالی');
  expect(container.textContent).toContain('USD');

  // تب تضامین (نمایش «اعتبار تا»)
  const guaranteesTab = [...container.querySelectorAll('[role="tab"]')]
    .find((tab) => tab.textContent === 'تضامین');
  await act(async () => {
    guaranteesTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(220);
  });
  expect(container.textContent).toContain('حسن انجام تعهدات');
  expect(container.textContent).toContain('اعتبار تا');

  root.unmount();
  container.remove();
});
