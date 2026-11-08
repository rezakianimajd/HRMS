import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ProcurementSuppliersPage from '../pages/procurement/ProcurementSuppliersPage';

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

const suppliers = [
  {
    id: 7, code: 'SUP-7', name: 'شرکت بازرگانی نمونه', status: 'active', category: 3,
    rating: 4.5, credit_limit: 5000000000, national_id: '10101010101',
    economic_code: '411111111111', registration_number: '12345', tax_id: 'TAX-7',
    phone: '02100000000', mobile: '09120000000', email: 'info@example.com',
    contact_person: 'آقای نمونه', payment_terms: '۳۰ روزه', postal_code: '1234567890',
    bank_name: 'ملت', account_number: '123456789', sheba_number: '120570000000000000000001',
    address: 'تهران، خیابان نمونه', description: 'تأمین‌کننده تجهیزات',
  },
  {
    id: 8, code: 'SUP-8', name: 'شرکت آسمان بالابر توان', status: 'inactive', category: null,
    rating: 0, credit_limit: null, national_id: '', economic_code: '', registration_number: '',
    tax_id: '', phone: '', mobile: '', email: '', contact_person: '', payment_terms: '',
    postal_code: '', bank_name: '', account_number: '', sheba_number: '', address: '', description: '',
  },
];

const categories = [{ id: 3, name: 'تجهیزات' }];

const profile = {
  supplier: suppliers[0],
  summary: {
    orders: { count: 4, amount: 1200000000, open_count: 2, open_amount: 700000000, average: 300000000 },
    invoices: { count: 2, invoiced: 800000000, paid: 500000000, balance: 300000000, overdue_count: 1 },
    payments: { count: 2, amount: 500000000 },
    guarantees: { count: 2, active_count: 2, active_amount: 90000000 },
    quotations: { count: 1 },
    last_activity: '2026-10-20',
  },
  orders: [{
    id: 1, number: 'PO-100', date: '2026-10-01', status: 'sent',
    status_label: 'ارسال به تأمین‌کننده', amount: 600000000, rial_amount: 600000000,
    group: 'rial', currency: '', rate: 1, expected_date: '2026-11-12', days: 4,
  }],
  invoices: [],
  payments: [],
  guarantees: [{
    id: 31, number: 'G-1', kind: 'performance', kind_label: 'حسن انجام تعهدات',
    amount: 50000000, issue_date: '2026-08-01', valid_until: '2031-08-01',
    days_to_expiry: 1000, is_expired: false, is_released: false,
  }],
  proformas: [],
  quotations: [],
  documents: [],
  timeline: [],
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
        <MemoryRouter initialEntries={['/procurement/suppliers']}>
          <ProcurementSuppliersPage />
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
    if (url === '/procurement/supplier-categories/') return Promise.resolve({ data: categories });
    if (url === '/procurement/suppliers/7/profile/') return Promise.resolve({ data: profile });
    return Promise.resolve({ data: null });
  });
});

test('suppliers page mirrors the contract-parties master/detail layout', async () => {
  const { container, root } = await renderPage();

  // سرصفحه و فهرست
  expect(container.textContent).toContain('تأمین‌کنندگان');
  expect(container.textContent).toContain('شرکت بازرگانی نمونه');
  expect(container.textContent).toContain('شرکت آسمان بالابر توان');
  expect(container.textContent).toContain('افزودن تأمین‌کننده');
  expect(container.textContent).toContain('تجهیزات');

  // انتخاب یک ردیف → پنل جزئیات با کارت‌های اطلاعاتی
  const listRow = [...container.querySelectorAll('p')]
    .find((node) => node.textContent === 'شرکت بازرگانی نمونه');
  expect(listRow).toBeTruthy();
  await act(async () => {
    listRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(460);
  });

  expect(container.textContent).toContain('آمار خرید');
  expect(container.textContent).toContain('اطلاعات حقوقی');
  expect(container.textContent).toContain('اطلاعات تماس');
  expect(container.textContent).toContain('اطلاعات بانکی');
  expect(container.textContent).toContain('تضامین خرید');
  expect(container.textContent).toContain('باز کردن پروندهٔ خرید');
  expect(container.querySelector('[aria-label="حذف تأمین‌کننده"]')).toBeTruthy();
  expect(container.querySelector('[aria-label="ویرایش تأمین‌کننده"]')).toBeTruthy();

  // دیالوگ ثبت با بخش‌های استاندارد
  const addButton = [...container.querySelectorAll('button')]
    .find((node) => node.textContent.includes('افزودن تأمین‌کننده'));
  await act(async () => {
    addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(260);
  });
  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('افزودن تأمین‌کننده'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('مشخصات پایه');
  expect(dialog.textContent).toContain('اطلاعات حقوقی');
  expect(dialog.textContent).toContain('اطلاعات بانکی');

  root.unmount();
  container.remove();
});
