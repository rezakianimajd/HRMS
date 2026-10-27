import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractProfilePage from '../pages/ContractProfilePage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
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

const contract = {
  id: 1,
  number: 'C-EUR-1',
  subject: 'قرارداد ارزی نمونه',
  party_name: 'شرکت طرف قرارداد',
  status: 'active',
  status_display: 'در حال اجرا',
  contract_type: 'construction',
  amount: 1000,
  effective_amount: 1000,
  currency: 2,
  currency_name: 'یورو',
  currency_symbol: '€',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  addendums: [],
  invoices: [{ id: 1, number: 'INV-1', date: '2026-02-01', total: 100000000 }],
  payments: [{ id: 1, amount: 50000000, date: '2026-02-02' }],
  statements: [{
    id: 1,
    number: 'ST-EUR-1',
    date: '2026-03-01',
    amount: 200000000,
    cumulative_previous_amount: 0,
    work_done: 200000000,
    value_added_tax: 20000000,
    additions: [{ description: 'سایر اضافات', amount: 5000000 }],
    additions_total: 25000000,
    deductions: [
      { title: 'حسن انجام کار', amount: 20000000 },
      { title: 'پیش‌پرداخت', amount: 30000000 },
    ],
    deductions_total: 50000000,
    net_amount: 175000000,
    currency_name: 'یورو',
    exchange_rate: 2000000,
    is_approved: true,
  }],
  documents: [],
  project_allocations_display: [
    { project: 1, project_name: 'پروژهٔ نمونه', percentage: 60 },
    { project: 2, project_name: 'پروژهٔ دوم', percentage: 40 },
  ],
};

const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (String(url).includes('/effective/')) {
      return Promise.resolve({ data: { effective: {}, changed: [], changes: [], warnings: [], addendum_count: 0 } });
    }
    if (String(url).includes('/external-contracts/1/')) return Promise.resolve({ data: contract });
    if (String(url).includes('/external-contracts/')) return Promise.resolve({ data: [contract] });
    return Promise.resolve({ data: {} });
  });
});

test('contract profile shows the compact card, single-row quick access and the archive tabs', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/external-contracts/1']}>
          <Routes>
            <Route path="/external-contracts/:id" element={<ContractProfilePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(800);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  // کارت قرارداد فشرده (مبلغ مؤثر با ارز قرارداد)
  expect(container.textContent).toContain('قرارداد ارزی نمونه');
  expect(container.textContent).toContain('۱٬۰۰۰ یورو');
  expect(container.textContent).toContain('مبلغ مؤثر قرارداد');

  // دسترسی سریع: ردیف کارت‌های تک‌خطی با تعداد موارد
  const quickLabels = ['فاکتورها', 'صورت‌وضعیت‌ها', 'پرداخت‌ها', 'الحاقیه‌ها', 'تضمین‌ها', 'اختلافات', 'اسناد و بایگانی'];
  const quickTiles = Array.from(container.querySelectorAll('[role="button"]'))
    .filter((tile) => quickLabels.some((label) => tile.textContent.trim().startsWith(label)));
  expect(quickTiles.length).toBeGreaterThanOrEqual(quickLabels.length);
  expect(quickTiles.some((tile) => tile.textContent.includes('مورد'))).toBe(true);

  // تب‌های پرونده
  const tabLabels = Array.from(container.querySelectorAll('.MuiTab-root')).map((tab) => tab.textContent.trim());
  expect(tabLabels).toEqual([
    'نمای کلی', 'تایم‌لاین', 'مشخصات قرارداد', 'مشخصات مالی', 'الحاقیه‌ها', 'تضامین',
    'صورت‌وضعیت', 'فاکتورها', 'پرداخت‌ها', 'قراردادهای هم‌تراز', 'مدارک',
  ]);

  // تب پیش‌فرض (نمای کلی بازطراحی‌شده)
  expect(container.textContent).toContain('تحلیل مالی');
  expect(container.textContent).toContain('شاخص‌های پرونده');
  expect(container.textContent).toContain('آخرین رویدادها');
  expect(container.textContent).toContain('آخرین مدارک');

  const openTab = async (label) => {
    const tab = Array.from(container.querySelectorAll('.MuiTab-root'))
      .find((item) => item.textContent.trim() === label);
    expect(tab).toBeTruthy();
    await act(async () => {
      tab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await wait(260);
    });
  };

  await openTab('مشخصات قرارداد');
  expect(container.textContent).toContain('شناسنامهٔ قرارداد');
  expect(container.textContent).toContain('زمان‌بندی قرارداد');
  expect(container.textContent).toContain('پروژه‌ها و تخصیص درصدی');
  expect(container.textContent).toContain('پروژهٔ نمونه');
  expect(container.textContent).toContain('۶۰٪');
  expect(container.textContent).toContain('جمع تخصیص: ۱۰۰٪');
  expect(container.textContent).toContain('شرایط و تعهدات');

  await openTab('مشخصات مالی');
  expect(container.textContent).toContain('مشخصات مالی پایه');
  expect(container.textContent).toContain('تحلیل مالی قرارداد');

  await openTab('الحاقیه‌ها');
  expect(container.textContent).toContain('فهرست الحاقیه‌ها');

  await openTab('صورت‌وضعیت');
  expect(container.textContent).toContain('فهرست صورت‌وضعیت‌ها');

  await openTab('فاکتورها');
  expect(container.textContent).toContain('فهرست فاکتورها');

  await openTab('پرداخت‌ها');
  expect(container.textContent).toContain('فهرست پرداخت‌ها');

  await openTab('مدارک');
  expect(container.textContent).toContain('مدارک قرارداد');

  await act(async () => { root.unmount(); });
  container.remove();
});
