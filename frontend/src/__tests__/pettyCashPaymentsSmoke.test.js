import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import PettyCashPaymentsPage from '../pages/PettyCashPaymentsPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'pettycash' }, applications: [] }),
}));

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const payments = [{
  id: 1, number: 'PC-PAY0001', fund: 5, fund_title: 'تنخواه مرکزی', fund_code: 'PC-01',
  custodian_name: 'مریم احمدی', kind: 'initial', method: 'sheba', amount: 12500000,
  payment_date: '2026-11-10', destination_entity_name: 'حساب بانک ملت',
  destination_entity_account: 'IR000000000000000000000000', reference: '123456',
  paid_by_name: 'admin',
}];

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/petty-cash/payments']}>
          <PettyCashPaymentsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(500);
  });
  await act(async () => { await wait(200); });
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockReset();
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/petty-cash-payments/') return Promise.resolve({ data: payments });
    if (url === '/petty-cash-funds/') {
      return Promise.resolve({
        data: [{ id: 5, code: 'PC-01', title: 'تنخواه مرکزی', custodian_name: 'مریم احمدی', status: 'active' }],
      });
    }
    if (url === '/treasury/treasury-entities/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
  axiosInstance.post.mockReset();
  axiosInstance.post.mockResolvedValue({ data: { id: 2 } });
});

test('petty cash payments page lists payments and opens the payment form', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('پرداخت‌های تنخواه');
  expect(container.textContent).toContain('تنخواه مرکزی');
  expect(container.textContent).toContain('شبا / انتقال بین‌بانکی');
  expect(container.textContent).toContain('حساب بانک ملت');

  const newButton = [...container.querySelectorAll('button')]
    .find((button) => button.textContent.includes('پرداخت جدید'));
  expect(newButton).toBeTruthy();
  await act(async () => {
    newButton.click();
    await wait(250);
  });

  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('ثبت پرداخت تنخواه');
  expect(dialog.textContent).toContain('حساب مقصد');
  expect(dialog.textContent).toContain('مبلغ اولیهٔ تنخواه');

  await act(async () => { root.unmount(); });
  container.remove();
});
