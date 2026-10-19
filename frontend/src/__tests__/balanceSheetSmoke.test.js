import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import axiosInstance from '../core/api/axiosConfig';
import BalanceSheetPage from '../pages/accounting/reports/BalanceSheetPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const balanceSheet = {
  total_assets: 1500000,
  total_liabilities: 600000,
  total_equity: 900000,
  total_liabilities_equity: 1500000,
  difference: 0,
  is_balanced: true,
  net_profit: 150000,
  ratios: { debt_to_asset: 40, equity_to_asset: 60, leverage: 0.67 },
  asset_groups: [{
    code: '11', name: 'دارایی جاری', total: 1500000, percent: 100,
    rows: [{ id: 1, code: '1101', name: 'موجودی نقد', balance: 1500000, share: 100 }],
  }],
  liability_groups: [{
    code: '21', name: 'بدهی جاری', total: 600000, percent: 100,
    rows: [{ id: 2, code: '2101', name: 'حساب‌های پرداختنی', balance: 600000, share: 100 }],
  }],
  equity_groups: [{
    code: '31', name: 'سرمایه', total: 900000, percent: 100,
    rows: [{ id: 3, code: '3101', name: 'سرمایهٔ ثبت‌شده', balance: 900000, share: 100 }],
  }],
  fiscal_year: {
    id: 1, name: '۱۴۰۴', start_date: '2025-03-21', end_date: '2026-03-20', is_current: true,
  },
  as_of: '',
  generated_at: '2026-10-19T10:00:00+03:30',
  audited: true,
  audit: {
    is_audited: true,
    approval: {
      auditor_name: 'حسابرس نمونه', audit_firm: 'مؤسسهٔ حسابرسی', reference_no: 'A-12',
      approved_at: '2026-10-18', status_display: 'تأییدشده', fiscal_year_name: '۱۴۰۴',
      prepared_by_name: 'واحد مالی', opinion_note: 'صورت‌های مالی مطابق استاندارد است.',
      is_final: true,
    },
    integrity: {
      posted: 10, pending_approval: 0, unbalanced_documents: 0, draft_excluded: 0, is_clean: true,
    },
  },
};

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter>
            <BalanceSheetPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
  });
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 220));
    });
  }
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  axiosInstance.get.mockClear();
  axiosInstance.post.mockClear();
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/accounting/fiscal-years/') {
      return Promise.resolve({ data: [{ id: 1, name: '۱۴۰۴', is_current: true }] });
    }
    if (url === '/accounting/reports/balance-sheet/') {
      return Promise.resolve({ data: balanceSheet });
    }
    if (url === '/applications/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
});

test('balance sheet renders balance sections, ratios and audit seal', async () => {
  const { container, root } = await renderPage();
  expect(container.textContent).toContain('ترازنامه');
  expect(container.textContent).toContain('جمع دارایی‌ها');
  expect(container.textContent).toContain('موجودی نقد');
  expect(container.textContent).toContain('تحلیل ساختار مالی');
  expect(container.textContent).toContain('مهر تأیید حسابرسی');
  expect(container.textContent).toContain('معادلهٔ حسابداری تراز است');
  expect(container.textContent).toContain('حسابرس نمونه');
  root.unmount();
});
