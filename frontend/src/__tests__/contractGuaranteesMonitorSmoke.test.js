import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractGuaranteesMonitorPage from '../pages/ContractGuaranteesMonitorPage';

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

const iso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const guarantees = [
  {
    id: 1, contract: 10, contract_number: 'C-10', contract_subject: 'قرارداد راه‌سازی', contract_party: 'شرکت راه‌ساز',
    guarantee_type: 'advance', guarantee_type_display: 'پیش‌پرداخت', instrument_type: 'bank_guarantee',
    instrument_type_display: 'ضمانت‌نامه بانکی', number: 'BG-100', amount: 500000000,
    issue_date: iso(-200), expiry_date: iso(-6), is_released: false, last_action: null,
    extension_count: 1, reduction_count: 0,
  },
  {
    id: 2, contract: 11, contract_number: 'C-11', contract_subject: 'قرارداد ساختمانی', contract_party: 'شرکت سازه',
    guarantee_type: 'performance', guarantee_type_display: 'حسن انجام کار', instrument_type: 'check',
    instrument_type_display: 'چک', number: 'CH-200', amount: 120000000,
    issue_date: iso(-60), expiry_date: iso(12), is_released: false, last_action: null,
    extension_count: 0, reduction_count: 2,
  },
  {
    id: 3, contract: 12, contract_number: 'C-12', contract_subject: 'قرارداد تجهیزات', contract_party: 'شرکت تجهیز',
    guarantee_type: 'retention', guarantee_type_display: 'تضمین نگهداری', instrument_type: 'undertaking_guarantee',
    instrument_type_display: 'ضمانت‌نامه تعهدی', number: 'UG-300', amount: 90000000,
    issue_date: iso(-300), expiry_date: iso(-10), is_released: true, release_date: iso(-2),
    last_action: 'released', extension_count: 0, reduction_count: 0,
  },
  {
    id: 4, contract: 13, contract_number: 'C-13', contract_subject: 'قرارداد مشاوره', contract_party: 'شرکت مشاور',
    guarantee_type: 'performance', guarantee_type_display: 'حسن انجام کار', instrument_type: 'promissory',
    instrument_type_display: 'سفته', number: 'PR-400', amount: 40000000,
    issue_date: iso(-30), expiry_date: iso(220), is_released: false, last_action: null,
    extension_count: 0, reduction_count: 0,
  },
];

const overview = {
  results: [
    {
      contract: 10, contract_number: 'C-10', contract_subject: 'قرارداد راه‌سازی', party_name: 'شرکت راه‌ساز',
      required_total: 600000000, provided_total: 500000000, fulfilled_total: 500000000,
      released_total: 0, balance_total: 100000000, coverage_percent: 83.3,
      required_count: 2, provided_count: 1, released_count: 0, partial_count: 0, missing_count: 1,
      registered_count: 1, next_expiry: iso(-6), next_expiry_days: -6, warnings_count: 2,
    },
    {
      contract: 11, contract_number: 'C-11', contract_subject: 'قرارداد ساختمانی', party_name: 'شرکت سازه',
      required_total: 200000000, provided_total: 200000000, fulfilled_total: 200000000,
      released_total: 0, balance_total: 0, coverage_percent: 100,
      required_count: 1, provided_count: 1, released_count: 0, partial_count: 0, missing_count: 0,
      registered_count: 1, next_expiry: iso(12), next_expiry_days: 12, warnings_count: 0,
    },
  ],
  summary: {
    contracts: 2, required_total: 800000000, provided_total: 700000000, fulfilled_total: 700000000,
    released_total: 0, balance_total: 100000000, guarantees: 2, expiring_30: 0, expired: 1,
    missing_contracts: 1, partial_contracts: 0, covered_contracts: 1, coverage_percent: 87.5,
  },
};

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/contract-guarantees/') return Promise.resolve({ data: { results: guarantees } });
    if (url === '/external-contracts/guarantees-overview/') return Promise.resolve({ data: overview });
    return Promise.resolve({ data: [] });
  });
});

test('guarantees monitor page shows summary, expiry warnings and the themed table', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-guarantees-monitor']}>
          <ContractGuaranteesMonitorPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(700);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  // هدر و عملیات صفحه
  expect(container.textContent).toContain('پایش تضامین قراردادها');
  expect(container.textContent).toContain('خروجی');
  expect(container.textContent).toContain('مدیریت تضامین');

  // کارت‌های خلاصه
  expect(container.textContent).toContain('کل مبلغ تضامین');
  expect(container.textContent).toContain('پوشش تعهدات قراردادها');
  expect(container.textContent).toContain('۸۷.۵٪');

  // هشدار سررسید
  expect(container.textContent).toContain('تضمین منقضی شده است');
  expect(container.textContent).toContain('تا ۳۰ روز آینده منقضی می‌شود');
  expect(container.textContent).toContain('سررسیدهای پیشرو تضامین');

  // نوار ابزار استاندارد
  expect(container.querySelector('input[placeholder*="جستجو"]')).toBeTruthy();

  // جدول تضامین
  const table = container.querySelector('[aria-label="فهرست پایش تضامین"]');
  expect(table).toBeTruthy();
  expect(container.textContent).toContain('شماره تضمین');
  expect(container.textContent).toContain('روز مانده');
  expect(container.textContent).toContain('وضعیت');
  expect(container.textContent).toContain('سابقه');
  expect(container.textContent).toContain('قرارداد راه‌سازی');
  expect(container.textContent).toContain('شرکت راه‌ساز');
  expect(container.textContent).toContain('BG-100');
  expect(container.textContent).toContain('آزادشده');

  // تب پوشش تضامین قراردادها
  expect(container.textContent).toContain('پوشش تضامین قراردادها');

  root.unmount();
  container.remove();
});

test('coverage tab lists per-contract requirement coverage', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-guarantees-monitor']}>
          <ContractGuaranteesMonitorPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(700);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
  expect(tabs.length).toBeGreaterThanOrEqual(2);
  await act(async () => {
    tabs[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(400);
  });

  expect(container.querySelector('[aria-label="پوشش تضامین قراردادها"]')).toBeTruthy();
  expect(container.textContent).toContain('مورد نیاز');
  expect(container.textContent).toContain('تأمین‌شده');
  expect(container.textContent).toContain('درصد پوشش');
  expect(container.textContent).toContain('کمبود');
  expect(container.textContent).toContain('۱۰۰٪');

  root.unmount();
  container.remove();
});
