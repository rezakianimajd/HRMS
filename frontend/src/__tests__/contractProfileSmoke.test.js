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

test('foreign contract profile shows dual rial/foreign financial analysis', async () => {
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

  expect(container.textContent).toContain('تحلیل مالی قرارداد');
  expect(container.textContent).toContain('حسن انجام کار');
  expect(container.textContent).toContain('پیش‌پرداخت کسرشده');
  expect(container.textContent).toContain('۲٬۰۰۰٬۰۰۰٬۰۰۰ ریال');
  expect(container.textContent).toContain('۱٬۰۰۰ یورو');

  root.unmount();
  container.remove();
});
