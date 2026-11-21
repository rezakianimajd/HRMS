import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractPaymentReportPage from '../pages/ContractPaymentReportPage';
import { ApplicationProvider } from '../core/context/ApplicationContext';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: {},
}));

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/payment-report/') {
      return Promise.resolve({
        data: {
          results: [{
            id: 1,
            party_name: 'شرکت نمونه',
            contract_number: 'C-100',
            projects: ['پروژه الف'],
            projects_display: 'پروژه الف',
            subject: 'قرارداد تست',
            advance_contract: '1000',
            advance_paid: '200',
            advance_balance: '800',
            payable_claims: '500',
            paid_total: '400',
            last_payment_date: '2026-05-02',
          }],
          summary: {
            contract_count: 1,
            advance_contract: '1000',
            advance_paid: '200',
            advance_balance: '800',
            payable_claims: '500',
            paid_total: '400',
          },
        },
      });
    }
    return Promise.resolve({ data: [] });
  });
});

test('contract payment report shows the payment columns and print action', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-payment-report']}>
            <ContractPaymentReportPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
  });
  await act(async () => { await wait(700); });

  expect(container.textContent).toContain('گزارش پرداخت‌ها و مطالبات قراردادها');
  expect(container.textContent).toContain('شرکت نمونه');
  expect(container.textContent).toContain('پروژه الف');
  expect(container.textContent).toContain('مطالبات قابل پرداخت');
  expect(container.textContent).toContain('مانده پیش‌پرداخت');
  expect(container.textContent).toContain('چاپ گزارش');
  expect(axiosInstance.get).toHaveBeenCalledWith(
    '/external-contracts/payment-report/',
    expect.objectContaining({ params: expect.objectContaining({ search: '' }) }),
  );

  await act(async () => { root.unmount(); });
  container.remove();
});
