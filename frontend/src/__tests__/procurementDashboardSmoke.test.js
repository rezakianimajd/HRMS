import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ProcurementDashboardPage from '../pages/procurement/ProcurementDashboardPage';

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

const dashboard = {
  counts: {
    suppliers: 12, items: 40, requests: 5, receipts: 6, proformas: 3,
    orders: 3, invoices: 2, payments: 2, inquiries: 2, guarantees: 2,
  },
  totals: {
    order_amount: 1300000000, invoiced: 500000000, paid: 300000000,
    outstanding: 200000000, collection_rate: 60, overdue_invoices: 1,
    open_orders: 2, open_inquiries: 1, rial_count: 2, foreign_count: 1,
    rial_amount: 1000000000, foreign_rial_amount: 300000000,
    guarantee_amount: 80000000, active_guarantees: 2, expiring_guarantees: 1,
  },
  groups: {
    rial: {
      count: 2, amount: 1000000000, average: 500000000, active: 1,
      invoiced: 400000000, paid: 300000000, outstanding: 100000000, overdue: 1,
    },
    foreign: {
      count: 1, amount: 300000000, average: 300000000, active: 1,
      invoiced: 100000000, paid: 0, outstanding: 100000000, overdue: 0,
    },
  },
  by_currency: [{ currency: 'USD', count: 1, amount: 500, rial_amount: 300000000 }],
  monthly: [
    { month: '2026-06', orders: 0, order_amount: 0, rial_orders: 0, foreign_orders: 0, rial_amount: 0, foreign_amount: 0, invoice_amount: 0, payment_amount: 0 },
    { month: '2026-07', orders: 1, order_amount: 500000000, rial_orders: 1, foreign_orders: 0, rial_amount: 500000000, foreign_amount: 0, invoice_amount: 200000000, payment_amount: 100000000 },
    { month: '2026-08', orders: 1, order_amount: 500000000, rial_orders: 1, foreign_orders: 0, rial_amount: 500000000, foreign_amount: 0, invoice_amount: 200000000, payment_amount: 100000000 },
    { month: '2026-09', orders: 1, order_amount: 300000000, rial_orders: 0, foreign_orders: 1, rial_amount: 0, foreign_amount: 300000000, invoice_amount: 100000000, payment_amount: 100000000 },
    { month: '2026-10', orders: 0, order_amount: 0, rial_orders: 0, foreign_orders: 0, rial_amount: 0, foreign_amount: 0, invoice_amount: 0, payment_amount: 0 },
    { month: '2026-11', orders: 0, order_amount: 0, rial_orders: 0, foreign_orders: 0, rial_amount: 0, foreign_amount: 0, invoice_amount: 0, payment_amount: 0 },
  ],
  order_status: [
    { key: 'sent', label: 'ارسال به تأمین‌کننده', count: 2, percent: 66.7 },
    { key: 'closed', label: 'بسته', count: 1, percent: 33.3 },
  ],
  inquiry_status: [
    { key: 'open', label: 'باز — در حال دریافت پیشنهاد', count: 1, percent: 50 },
    { key: 'awarded', label: 'برنده انتخاب شد', count: 1, percent: 50 },
  ],
  top_suppliers: [{ name: 'تأمین‌کننده الف', count: 2, amount: 900000000 }],
  projects: [{ label: 'پروژه یک', count: 2, amount: 800000000 }],
  due_orders: [{
    id: 1, number: 'PO-100', supplier: 'تأمین‌کننده الف', status: 'sent',
    expected_date: '2026-11-12', days: 4, rial_amount: 600000000, group: 'rial',
  }],
  orders: [
    {
      id: 1, number: 'PO-100', supplier: 'تأمین‌کننده الف', status: 'sent', date: '2026-10-01',
      expected_date: '2026-11-12', days: 4, amount: 600000000, rial_amount: 600000000,
      group: 'rial', currency: '', rate: 1,
    },
    {
      id: 2, number: 'PO-101', supplier: 'تأمین‌کننده ب', status: 'closed', date: '2026-09-20',
      expected_date: '2026-10-20', days: -10, amount: 400000000, rial_amount: 400000000,
      group: 'rial', currency: '', rate: 1,
    },
    {
      id: 3, number: 'PO-200', supplier: 'شرکت بازرگانی پ', status: 'approved', date: '2026-09-05',
      expected_date: '2026-12-05', days: 27, amount: 500, rial_amount: 300000000,
      group: 'foreign', currency: 'USD', rate: 600000,
    },
  ],
  guarantees: {
    total: 2, active: 2, expiring: 1, expired: 0, released: 0,
    total_amount: 80000000, active_amount: 80000000,
    expiring_amount: 30000000, released_amount: 0,
    kinds: [{ key: 'performance', label: 'حسن انجام تعهدات', count: 2, amount: 80000000 }],
  },
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/procurement']}>
          <ProcurementDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(650);
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
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
    if (url === '/procurement/dashboard/') return Promise.resolve({ data: dashboard });
    return Promise.resolve({ data: null });
  });
});

test('procurement dashboard mirrors the contracts dashboard layout', async () => {
  const { container, root } = await renderPage();

  expect(axiosInstance.get).toHaveBeenCalledWith('/procurement/dashboard/');

  // سرصفحه و نوار شاخص
  expect(container.textContent).toContain('داشبورد خریدها');
  expect(container.textContent).toContain('کل سفارش‌ها');
  expect(container.textContent).toContain('استعلام‌های باز');
  expect(container.textContent).toContain('ارزش سفارش‌ها');
  expect(container.textContent).toContain('معادل ریالی خرید ارزی');
  expect(container.textContent).toContain('ماندهٔ پرداخت');

  // پرتفوی ریالی/ارزی + نمودارهای روند
  expect(container.textContent).toContain('خرید ریالی');
  expect(container.textContent).toContain('خرید ارزی');
  expect(container.textContent).toContain('روند ماهانهٔ سفارش‌های خرید');
  expect(container.textContent).toContain('روند ارزش سفارش‌های خرید');

  // کارت‌های سفارش به تفکیک گروه ارزی
  const rialCards = container.querySelector('[aria-label="کارت‌های سفارش‌های ریالی"]');
  const foreignCards = container.querySelector('[aria-label="کارت‌های سفارش‌های ارزی"]');
  expect(rialCards).toBeTruthy();
  expect(foreignCards).toBeTruthy();
  expect(rialCards.textContent).toContain('تأمین‌کننده الف');
  expect(rialCards.textContent).not.toContain('شرکت بازرگانی پ');
  expect(foreignCards.textContent).toContain('شرکت بازرگانی پ');
  expect(foreignCards.textContent).toContain('USD');

  // پنل‌های تحلیلی
  expect(container.textContent).toContain('سلامت مالی خریدها');
  expect(container.textContent).toContain('سررسید تحویل سفارش‌ها');
  expect(container.textContent).toContain('تضامین خرید');
  expect(container.textContent).toContain('ترکیب وضعیت سفارش‌ها');
  expect(container.textContent).toContain('وضعیت استعلام‌ها');
  expect(container.textContent).toContain('تأمین‌کنندگان برتر');
  expect(container.textContent).toContain('خرید در پروژه‌ها');
  expect(container.textContent).toContain('نرخ تسویه');
  expect(container.textContent).toContain('پروژه یک');

  root.unmount();
  container.remove();
});
