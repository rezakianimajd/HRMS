import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import axiosInstance from '../core/api/axiosConfig';
import AccountingDocumentsPage from '../pages/AccountingDocumentsPage';
import AccountingDocumentNewPage from '../pages/AccountingDocumentNewPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const documentRow = {
  id: 7, number: '00071', date: '2025-04-12', description: 'سند آزمایشی حقوق',
  journal_name: 'روزنامه عمومی', created_by_name: 'رضا کیانی', status: 'draft',
  total_debit: 12500000, total_credit: 12500000, open_issues_count: 2,
};

const summary = {
  total: 12,
  posted_documents: 7,
  pending_documents: 2,
  status_counts: { draft: 3, submitted: 2, approved: 1, posted: 6, locked: 1 },
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  axiosInstance.get.mockClear();
  axiosInstance.post.mockClear();
  axiosInstance.delete.mockClear();
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/accounting/documents/fiscal_years/') {
      return Promise.resolve({ data: { years: [{ id: 1, name: '۱۴۰۴', is_current: true, document_count: 12 }], default: 1 } });
    }
    if (url === '/accounting/documents/') {
      return Promise.resolve({ data: { count: 1, results: [documentRow] } });
    }
    if (url === '/accounting/documents/stats/') return Promise.resolve({ data: summary });
    if (url === '/accounting/documents/7/') {
      return Promise.resolve({
        data: {
          id: 7, number: '00071', date: '2025-04-12', description: 'سند ثبت‌شده', status: 'posted',
          is_locked: true, fiscal_year: 1, journal: 1, created_by_name: 'رضا کیانی',
          lines: [
            { account: 10, auxiliary_1: null, debit: 100, credit: 0, base_amount: 100, vat_amount: 0, line_no: 1 },
            { account: 11, auxiliary_1: null, debit: 0, credit: 100, base_amount: 100, vat_amount: 0, line_no: 2 },
          ],
        },
      });
    }
    if (url === '/accounting/journals/') {
      return Promise.resolve({ data: [{ id: 1, name: 'روزنامه عمومی', is_active: true }] });
    }
    if (url === '/accounting/accounts/') {
      return Promise.resolve({
        data: [
          { id: 10, code: '1001', name: 'صندوق', is_active: true, is_postable: true },
          { id: 11, code: '1002', name: 'بانک', is_active: true, is_postable: true },
        ],
      });
    }
    if (url === '/accounting/auxiliary-accounts/') return Promise.resolve({ data: [] });
    if (url === '/accounting/sequences/') {
      return Promise.resolve({ data: [{ id: 1, prefix: 'ACC-', next_number: 72, padding: 5, journal: 1, fiscal_year: 1, branch: null }] });
    }
    if (url === '/applications/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
});

const renderPage = async (element, path, routePath = null) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={[path]}>
            {routePath ? <Routes><Route path={routePath} element={element} /></Routes> : element}
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

test('accounting documents list renders KPIs, filters and rows', async () => {
  const { container, root } = await renderPage(<AccountingDocumentsPage />, '/accounting/documents');
  expect(container.textContent).toContain('اسناد حسابداری');
  expect(container.textContent).toContain('فهرست اسناد');
  expect(container.textContent).toContain('سند آزمایشی حقوق');
  expect(container.textContent).toContain('۱۲'); // total documents KPI
  root.unmount();
});

test('new accounting document renders document workbook', async () => {
  const { container, root } = await renderPage(<AccountingDocumentNewPage />, '/accounting/documents/new');
  expect(container.textContent).toContain('سند جدید');
  expect(container.textContent).toContain('مشخصات سند');
  expect(container.textContent).toContain('آرتیکل‌های سند');
  expect(container.textContent).toContain('ACC-۰۰۰۷۲');
  expect(container.textContent).toContain('روزنامه عمومی');
  root.unmount();
});

test('documents list honors status passed from accounting dashboard', async () => {
  const { container, root } = await renderPage(
    <AccountingDocumentsPage />,
    { pathname: '/accounting/documents', state: { status: 'posted', fiscal_year: 1 } },
  );
  expect(container.textContent).toContain('اسناد حسابداری');
  const listCall = axiosInstance.get.mock.calls.find(([url, config]) => (
    url === '/accounting/documents/'
    && config?.params?.status === 'posted'
    && String(config?.params?.fiscal_year) === '1'
  ));
  expect(listCall).toBeTruthy();
  root.unmount();
});

test('posted document opens read-only with workflow actions', async () => {
  const { container, root } = await renderPage(
    <AccountingDocumentNewPage />,
    '/accounting/documents/7/edit',
    '/accounting/documents/:id/edit',
  );
  expect(container.textContent).toContain('فقط مشاهده');
  expect(container.textContent).toContain('برگشت سند');
  expect(container.textContent).not.toContain('به‌روزرسانی');
  root.unmount();
});
