import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractsDashboardPage from '../pages/ContractsDashboardPage';

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

const contracts = [
  {
    id: 1,
    number: 'C-100',
    subject: 'قرارداد ساخت سالن تولید',
    party: 10,
    party_name: 'شرکت ساختمانی الف',
    contract_type: 'construction',
    contract_type_master_name: 'پیمانکاری',
    status: 'active',
    amount: 1000000000,
    effective_amount: 1100000000,
    effective_end_date: '2026-11-10',
    end_date: '2026-11-10',
    start_date: '2026-09-01',
    created_at: '2026-09-01T10:00:00Z',
    project_name: 'پروژه آ',
    currency_name: 'ریال ایران',
    addendums: [{ id: 1, date: '2026-09-15', new_end_date: '2026-11-10', amount_change: 100000000 }],
    invoices: [{ id: 1, total: 400000000, amount: 350000000, is_paid: true, due_date: '2026-10-01' }],
    payments: [{ id: 1, amount: 300000000 }],
    statements: [{ id: 1, net_amount: 200000000 }],
    guarantees: [{ id: 1, amount: 50000000, is_released: false }],
    documents: [{ id: 1 }],
  },
  {
    id: 2,
    number: 'C-101',
    subject: 'قرارداد خرید تجهیزات',
    party: 11,
    party_name: 'تأمین‌کننده ب',
    contract_type: 'purchase',
    contract_type_master_name: 'خرید',
    status: 'completed',
    amount: 500000000,
    effective_amount: 500000000,
    effective_end_date: '2026-08-20',
    end_date: '2026-08-20',
    start_date: '2026-07-01',
    created_at: '2026-07-01T10:00:00Z',
    project_name: 'پروژه ب',
    currency_name: 'ریال ایران',
    addendums: [],
    invoices: [],
    payments: [],
    statements: [],
    guarantees: [],
    documents: [],
  },
  {
    id: 3,
    number: 'C-102',
    subject: 'قرارداد مشاوره فنی',
    party: 10,
    party_name: 'شرکت ساختمانی الف',
    contract_type: 'consulting',
    contract_type_master_name: 'مشاوره',
    status: 'draft',
    amount: 200000000,
    effective_amount: 200000000,
    effective_end_date: '2026-12-20',
    end_date: '2026-12-20',
    start_date: '2026-10-01',
    created_at: '2026-10-01T10:00:00Z',
    project_name: 'پروژه آ',
    currency_name: 'ریال ایران',
    addendums: [],
    invoices: [],
    payments: [],
    statements: [],
    guarantees: [],
    documents: [],
  },
  {
    id: 4,
    number: 'C-103',
    subject: 'قرارداد خرید تجهیزات وارداتی',
    party: 12,
    party_name: 'شرکت بازرگانی پ',
    contract_type: 'purchase',
    contract_type_master_name: 'خرید',
    status: 'active',
    amount: 250000,
    effective_amount: 250000,
    effective_end_date: '2026-12-31',
    end_date: '2026-12-31',
    start_date: '2026-10-15',
    created_at: '2026-10-15T10:00:00Z',
    project_name: 'پروژه ج',
    currency_name: 'دلار آمریکا',
    currency_symbol: '$',
    currency_code: 'USD',
    exchange_rate: 600000,
    addendums: [],
    invoices: [{ id: 4, total: 100000, is_paid: false, due_date: '2026-09-01' }],
    payments: [],
    statements: [],
    guarantees: [{ id: 4, amount: 20000, is_released: false }],
    documents: [],
  },
];

const stats = {
  total: 4,
  status_counts: { active: 2, completed: 1, draft: 1 },
  type_counts: { 'پیمانکاری': 1, 'خرید': 2, 'مشاوره': 1 },
  project_counts: { 'پروژه آ': 2, 'پروژه ب': 1, 'پروژه ج': 1 },
  total_amount: 1800500000,
  expiring: 1,
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/') return Promise.resolve({ data: contracts });
    if (url === '/external-contracts/stats/') return Promise.resolve({ data: stats });
    return Promise.resolve({ data: null });
  });
});
test('contracts dashboard splits rial and foreign contracts into themed tables and line charts', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-dashboard']}>
          <ContractsDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(650);
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  // هدر و شاخص‌ها
  expect(container.textContent).toContain('داشبورد قراردادها');
  expect(container.textContent).toContain('کل قراردادها');
  expect(container.textContent).toContain('ارزش پرتفوی ریالی');
  expect(container.textContent).toContain('معادل ریالی قراردادهای ارزی');

  // تفکیک ارزی / ریالی
  expect(container.textContent).toContain('تفکیک قراردادها بر اساس ارز');
  expect(container.textContent).toContain('قراردادهای ریالی');
  expect(container.textContent).toContain('قراردادهای ارزی');
  expect(container.textContent).toContain('دلار آمریکا');

  // نمودارهای خطی (recharts) — بدون نمودار میله‌ای/دونات
  expect(container.textContent).toContain('روند ماهانه انعقاد قراردادها');
  expect(container.textContent).toContain('روند ارزش قراردادهای منعقدشده');
  expect(container.querySelectorAll('.recharts-line').length).toBeGreaterThan(0);
  expect(container.querySelectorAll('.recharts-bar-rectangle').length).toBe(0);
  expect(container.querySelectorAll('.recharts-pie').length).toBe(0);

  // جداول استاندارد ریالی و ارزی
  const rialTable = container.querySelector('table[aria-label="فهرست قراردادهای ریالی داشبورد"]');
  const foreignTable = container.querySelector('table[aria-label="فهرست قراردادهای ارزی داشبورد"]');
  expect(rialTable).toBeTruthy();
  expect(foreignTable).toBeTruthy();
  expect(rialTable.textContent).toContain('قرارداد ساخت سالن تولید');
  expect(rialTable.textContent).not.toContain('قرارداد خرید تجهیزات وارداتی');
  expect(foreignTable.textContent).toContain('قرارداد خرید تجهیزات وارداتی');
  expect(foreignTable.textContent).toContain('دلار آمریکا');
  expect(rialTable.querySelectorAll('tbody tr')).toHaveLength(3);
  expect(foreignTable.querySelectorAll('tbody tr')).toHaveLength(1);
  expect(rialTable.querySelector('thead th').textContent).toContain('ردیف');

  // سایر بخش‌های جدولی
  expect(container.textContent).toContain('سلامت مالی پرونده‌ها');
  expect(container.textContent).toContain('قراردادهای رو به انقضا');
  expect(container.textContent).toContain('طرف‌های اصلی قرارداد');
  expect(container.textContent).toContain('ترکیب انواع قرارداد');
  expect(container.textContent).toContain('توزیع قراردادها در پروژه‌ها');
  expect(container.querySelector('table[aria-label="فهرست طرف‌های قرارداد داشبورد"]')).toBeTruthy();
  expect(container.textContent).toContain('شرکت ساختمانی الف');

  // هیچ چیپی در داشبورد استفاده نشده است
  expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(0);

  root.unmount();
  container.remove();
});


