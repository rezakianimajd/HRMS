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

  // ارتفاع جدول از توکن‌ها: هدر + ۱۳ ردیف (۴۴ + ۳۸×۱۳)
  const tableContainer = container.querySelector('.MuiTableContainer-root');
  expect(tableContainer.getAttribute('data-visible-rows')).toBe('13');
  expect(tableContainer.getAttribute('data-table-height')).toBe('538px');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('filters stay hidden until the filters button is clicked', async () => {
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

  // پنل فیلترها بسته است: هنوز هیچ سلکتی رندر نشده و دکمهٔ «فیلترها» دیده می‌شود.
  expect(container.textContent).toContain('فیلترها');
  expect(container.querySelectorAll('[role="combobox"]')).toHaveLength(0);

  const filtersButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('فیلترها'));
  expect(filtersButton).toBeTruthy();
  await act(async () => { filtersButton.click(); await wait(350); });

  expect(container.textContent).toContain('وضعیت');
  expect(container.textContent).toContain('نوع قرارداد');
  expect(container.querySelectorAll('[role="combobox"]').length).toBeGreaterThanOrEqual(2);

  await act(async () => { root.unmount(); });
  container.remove();
});


test('contracts list is paginated twenty rows at a time with Persian digits', async () => {
  axiosInstance.get.mockImplementation((url, config) => {
    if (url === '/external-contracts/') {
      const pageNumber = Number(config?.params?.page || 1);
      const length = pageNumber === 1 ? 20 : 5;
      const results = Array.from({ length }, (_, index) => ({
        id: pageNumber * 100 + index,
        number: `C-${pageNumber}-${index}`,
        subject: `قرارداد ${index}`,
        party_name: 'شرکت نمونه',
        contract_type: 'construction',
        status: 'active',
        start_date: '2025-01-01',
        end_date: '2026-01-01',
        amount: 1000,
        currency_name: 'ریال',
      }));
      return Promise.resolve({ data: { count: 25, results } });
    }
    if (url === '/contract-types-master/') return Promise.resolve({ data: [] });
    if (url === '/external-contracts/stats/') {
      return Promise.resolve({ data: { total: 25, status_counts: { active: 25 }, expiring: 1, total_amount: 25000 } });
    }
    return Promise.resolve({ data: [] });
  });

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

  const listCall = axiosInstance.get.mock.calls.find(([url]) => url === '/external-contracts/');
  expect(listCall[1].params.page_size).toBe(20);
  expect(listCall[1].params.page).toBe(1);
  expect(container.querySelectorAll('tbody tr')).toHaveLength(20);

  // بازهٔ صفحه و شماره‌های صفحه با ارقام فارسی
  expect(container.textContent).toContain('نمایش ۱ تا ۲۰ از ۲۵');
  const secondPage = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.trim() === '۲');
  expect(secondPage).toBeTruthy();

  await act(async () => { secondPage.click(); await wait(600); });
  const pageCalls = axiosInstance.get.mock.calls.filter(([url]) => url === '/external-contracts/');
  const requestedPages = pageCalls.map(([, config]) => config?.params?.page);
  expect(requestedPages).toContain(2);
  // صفحهٔ اول باید فقط یک‌بار درخواست شده باشد؛ بازگشت خودکار به صفحهٔ اول یک باگ بود.
  expect(requestedPages.filter((pageNumber) => pageNumber === 1)).toHaveLength(1);
  expect(requestedPages[requestedPages.length - 1]).toBe(2);

  // شمارهٔ صفحهٔ فعال باید ۲ باشد (با ارقام فارسی)
  const activePage = container.querySelector('[aria-current="page"]');
  expect(activePage).toBeTruthy();
  expect(activePage.textContent.trim()).toBe('۲');

  await act(async () => { root.unmount(); });
  container.remove();
});
