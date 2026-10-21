import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import MatrixReportPage from '../pages/accounting/reports/MatrixReportPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'accounting' }, applications: [] }),
}));

const amounts = (debit) => ({
  debit, credit: 0, balance_debit: debit, balance_credit: 0,
  opening_balance_debit: 0, opening_balance_credit: 0,
  closing_balance_debit: debit, closing_balance_credit: 0,
});

const tree = [{
  kind: 'group', id: 10, code: '1', name: 'دارایی‌ها', level: 0, children: [{
    kind: 'account', id: 1, code: '1101', name: 'حساب‌های دریافتنی', level: 1, children: [{
      kind: 'account', id: 2, code: '110101', name: 'معین مشتریان', level: 2, children: [{
        kind: 'aux1', id: 100, code: 'A-100', name: 'شرکت فلان', level: 3, ...amounts(100), children: [],
      }],
    }],
  }],
}];

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  global.ResizeObserver = global.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/accounting/reports/matrix/') return Promise.resolve({ data: { tree } });
    if (url.includes('/accounting/reports/account-ledger/')) {
      return Promise.resolve({ data: { account: { nature: 'debit' }, rows: [], total_debit: 0, total_credit: 0 } });
    }
    return Promise.resolve({ data: {} });
  });
});

test('matrix report shows search results and party involvement levels', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/accounting/reports/matrix']}>
          <MatrixReportPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(900);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('مرور ترکیبی (ماتریس)');
  expect(container.textContent).toContain('پلکان سطح‌ها');

  const search = container.querySelector('input[placeholder*="جستجوی طرف حساب"]');
  expect(search).toBeTruthy();
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(search, 'شرکت فلان');
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(300);
  });

  expect(container.textContent).toContain('نتایج جستجو');
  const resultCards = Array.from(container.querySelectorAll('.MuiPaper-root')).filter((node) => (
    node.textContent.includes('شرکت فلان') && node.textContent.includes('مسیر')
  )).sort((a, b) => a.textContent.length - b.textContent.length);
  expect(resultCards.length).toBeGreaterThan(0);

  await act(async () => { resultCards[0].click(); await wait(250); });
  expect(container.textContent).toContain('تمرکز: شرکت فلان');

  const subLevelButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('معین'));
  expect(subLevelButton).toBeTruthy();
  await act(async () => { subLevelButton.click(); await wait(250); });
  expect(container.textContent).toContain('معین مشتریان');

  const row = Array.from(container.querySelectorAll('tr'))
    .find((item) => item.textContent.includes('معین مشتریان'));
  expect(row).toBeTruthy();
  await act(async () => {
    row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await wait(350);
  });
  expect(document.body.textContent).toContain('ریز گردش');
  const ledgerCall = axiosInstance.get.mock.calls.find(([url]) => url.includes('/accounting/reports/account-ledger/'));
  expect(ledgerCall[0]).toContain('/accounting/reports/account-ledger/100/');
  expect(String(ledgerCall[1].params.account)).toBe('2');

  root.unmount();
  container.remove();
});
