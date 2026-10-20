import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractDisputesPage from '../pages/ContractDisputesPage';

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

const contract = {
  id: 1,
  number: 'C-100',
  subject: 'قرارداد ساخت سالن تولید',
  party_name: 'شرکت ساختمانی الف',
};

const dispute = {
  id: 9,
  contract: 1,
  contract_subject: 'قرارداد ساخت سالن تولید',
  title: 'اختلاف مالی در صورت‌وضعیت',
  dispute_type: 'financial',
  severity: 'high',
  status: 'open',
  claim_amount: 500000000,
  opened_date: '2026-10-01',
  resolved_date: null,
  description: 'اختلاف در مبلغ کسورات',
  resolution: '',
};

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/') return Promise.resolve({ data: [contract] });
    if (url === '/contract-disputes/') return Promise.resolve({ data: [dispute] });
    return Promise.resolve({ data: [] });
  });
});

test('disputes page renders KPI, side summaries, detail drawer and editor dialog', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-disputes']}>
          <ContractDisputesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(750);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('اختلافات و دعاوی');
  expect(container.textContent).toContain('وضعیت دعاوی');
  expect(container.textContent).toContain('شدت دعاوی');
  expect(container.textContent).toContain('اختلاف مالی در صورت‌وضعیت');
  expect(container.textContent).toContain('شدت زیاد');
  expect(container.textContent).toContain('جزئیات');

  const detailButton = Array.from(container.querySelectorAll('button'))
    .find((element) => element.textContent.trim() === 'جزئیات');
  expect(detailButton).toBeTruthy();
  await act(async () => { detailButton.click(); await wait(260); });

  expect(document.body.textContent).toContain('اطلاعات دعوا');
  expect(document.body.textContent).toContain('شرح اختلاف');
  expect(document.body.textContent).toContain('اختلاف در مبلغ کسورات');

  const editButton = Array.from(document.querySelectorAll('button'))
    .find((element) => element.textContent.trim() === 'ویرایش');
  expect(editButton).toBeTruthy();
  await act(async () => { editButton.click(); await wait(300); });

  expect(document.body.textContent).toContain('ویرایش اختلاف');
  expect(document.body.textContent).toContain('موضوع اختلاف *');
  expect(document.body.textContent).toContain('ذخیره اختلاف');

  root.unmount();
  container.remove();
});
