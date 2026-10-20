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
];

const stats = {
  total: 3,
  status_counts: { active: 1, completed: 1, draft: 1 },
  type_counts: { 'پیمانکاری': 1, 'خرید': 1, 'مشاوره': 1 },
  project_counts: { 'پروژه آ': 2, 'پروژه ب': 1 },
  total_amount: 1800000000,
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

test('contracts dashboard shows graphical portfolio, finance and actionable tables', async () => {
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

  expect(container.textContent).toContain('داشبورد قراردادها');
  expect(container.textContent).toContain('پرتفوی قراردادها در یک نگاه');
  expect(container.textContent).toContain('کل قراردادها');
  expect(container.textContent).toContain('وضعیت قراردادها');
  expect(container.textContent).toContain('ترکیب انواع قرارداد');
  expect(container.textContent).toContain('روند ماهانه قراردادها');
  expect(container.textContent).toContain('قراردادهای رو به انقضا');
  expect(container.textContent).toContain('سلامت مالی پرونده‌ها');
  expect(container.textContent).toContain('قراردادهای اخیر');
  expect(container.textContent).toContain('قرارداد ساخت سالن تولید');
  expect(container.textContent).toContain('پیمانکاران و تأمین‌کنندگان کلیدی');
  expect(container.textContent).toContain('شرکت ساختمانی الف');
  expect(container.textContent).toContain('توزیع قراردادها در پروژه‌ها');

  root.unmount();
  container.remove();
});
