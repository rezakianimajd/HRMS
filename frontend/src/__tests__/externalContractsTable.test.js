import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ExternalContractsPage from '../pages/ExternalContractsPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null }),
  MODULE_DEFAULT_ACCENTS: { contracts: '#f59e0b' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'contracts' }, applications: [] }),
}));

const contract = {
  id: 7,
  number: 'C-77',
  subject: 'احداث سالن تولید',
  party_name: 'شرکت ساختمانی الف',
  contract_type: 'construction',
  contract_type_master_name: 'پیمانکاری اجرا',
  status: 'active',
  start_date: '2025-01-01',
  end_date: '2026-06-30',
  amount: 1000000,
  effective_amount: 1200000,
  currency_name: 'ریال ایران',
};

const wait = (ms = 280) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/') return Promise.resolve({ data: [contract] });
    if (url === '/contract-types-master/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
});

test('contracts table renders every field in its own single-line column', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/external-contracts']}>
          <ExternalContractsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(700);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(150); });
  }

  const headers = Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent.trim());
  expect(headers).toHaveLength(10);
  expect(headers).toContain('موضوع قرارداد');
  // نوع قرارداد ستون مستقل خودش را دارد (قبلاً زیر موضوع قرار می‌گرفت)
  expect(headers).toContain('نوع قرارداد');

  const cells = Array.from(container.querySelectorAll('tbody tr')).map((row) => (
    Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent.trim())
  ));
  expect(cells).toHaveLength(1);
  expect(cells[0]).toHaveLength(10);
  expect(cells[0][2]).toBe('احداث سالن تولید');
  expect(cells[0][2]).not.toContain('پیمانکاری اجرا');
  expect(cells[0][3]).toBe('پیمانکاری اجرا');

  await act(async () => { root.unmount(); });
  container.remove();
});
