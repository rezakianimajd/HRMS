import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractAccountingMappingPage from '../pages/ContractAccountingMappingPage';

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

const definition = (key, label, description, required = false) => ({
  key, label, description, color: '#0f766e', required,
});

const row = (key, label, overrides = {}) => ({
  key,
  key_display: label,
  title: label,
  subsidiary_account: null,
  subsidiary_account_detail: null,
  general_account_detail: null,
  auxiliary_source_1: 'none',
  auxiliary_source_2: 'none',
  auxiliary_source_3: 'none',
  auxiliary_category_1: null,
  auxiliary_category_2: null,
  auxiliary_category_3: null,
  auxiliary_1: null,
  auxiliary_2: null,
  auxiliary_3: null,
  auto_create_auxiliaries: true,
  enforce_auxiliary: false,
  control_mode: 'soft',
  notes: '',
  sort_order: 0,
  is_active: true,
  missing: ['حساب معین'],
  is_complete: false,
  definition: definition(key, label, 'توضیح کنترل'),
  ...overrides,
});

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/contract-account-mappings/') {
      return Promise.resolve({
        data: {
          definitions: [],
          mappings: [
            row('retention', 'حسن انجام کار'),
            row('insurance_deposit', 'سپرده بیمه'),
            row('payable', 'پرداختنی‌ها'),
            row('receivable', 'دریافتنی‌ها'),
          ],
          sources: [{ value: 'none', label: 'بدون تفصیل' }, { value: 'auto', label: 'از دستهٔ تفصیلی (خودکار)' }],
          control_modes: [{ value: 'soft', label: 'کنترل نرم (هشدار)' }],
          summary: { total: 4, configured: 0, complete: 0, missing: 4, strict: 0 },
        },
      });
    }
    if (url === '/accounting/accounts/') return Promise.resolve({ data: [] });
    if (url === '/accounting/auxiliary-categories/') return Promise.resolve({ data: [] });
    if (url === '/accounting/auxiliary-accounts/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: null });
  });
});

test('contract account mapping page renders mapping and control points', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-accounting-mapping']}>
          <ContractAccountingMappingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(650);
  });

  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('نگاشت و کنترل');
  expect(container.textContent).toContain('حسن انجام کار');
  expect(container.textContent).toContain('سپرده بیمه');
  expect(container.textContent).toContain('پرداختنی‌ها');
  expect(container.textContent).toContain('دریافتنی‌ها');
  expect(container.textContent).toContain('ذخیره همه');
  expect(container.textContent).toContain('تکمیل‌شده');
});
