import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import ContractDocumentsPage from '../pages/ContractDocumentsPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { contracts: '#f97316' },
}));

const contracts = [
  {
    id: 1, number: 'C-1405-01', subject: 'قرارداد نمونه', party_name: 'پیمانکار نمونه',
    status: 'active', status_display: 'در حال اجرا', amount: 1000000,
    start_date: '2026-01-01', end_date: '2026-12-31', currency_name: 'ریال',
  },
];
const documents = [
  {
    id: 1, contract: 1, contract_number: 'C-1405-01', contract_subject: 'قرارداد نمونه',
    contract_party_name: 'پیمانکار نمونه', title: 'متن قرارداد', file_name: 'contract.pdf',
    file_extension: '.pdf', file_url: 'https://example.test/contract.pdf',
    file_size: 2048, file_size_display: '2 KB', uploaded_at: '2026-10-24T08:00:00Z',
  },
];

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (String(url).includes('applications')) {
      return Promise.resolve({ data: { applications: [] } });
    }
    if (String(url).includes('/contract-documents/')) {
      return Promise.resolve({ data: documents });
    }
    if (String(url).includes('/external-contracts/')) {
      return Promise.resolve({ data: contracts });
    }
    return Promise.resolve({ data: [] });
  });
});

test('contract documents archive renders the new landing and selected-contract views', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-documents']}>
            <ContractDocumentsPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await wait(1200);
  });

  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('بایگانی اسناد قرارداد');
  expect(container.textContent).toContain('انتخاب قرارداد');
  expect(container.textContent).toContain('کل اسناد');

  root.unmount();
  container.remove();
});
