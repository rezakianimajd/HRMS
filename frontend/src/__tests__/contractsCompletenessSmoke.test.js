import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ContractsCompletenessPage from '../pages/ContractsCompletenessPage';

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

const rules = [
  { code: 'no_documents', label: 'هیچ مدرکی برای قرارداد بارگذاری نشده است', severity: 'high', group: 'documents' },
  { code: 'project_share_missing', label: 'درصد تخصیص پروژه مشخص نشده است', severity: 'high', group: 'project' },
  { code: 'missing_description', label: 'توضیحات قرارداد خالی است', severity: 'low', group: 'fields' },
];

const payload = {
  generated_at: '2026-11-08',
  total_contracts: 2,
  filtered_total: 2,
  summary: {
    with_issues: 1,
    clean: 1,
    avg_score: 76,
    issues_total: 3,
    severity: { high: 1, medium: 0, low: 1 },
    by_code: [
      { code: 'no_documents', label: rules[0].label, severity: 'high', group: 'documents', count: 1 },
      { code: 'project_share_missing', label: rules[1].label, severity: 'high', group: 'project', count: 1 },
      { code: 'missing_description', label: rules[2].label, severity: 'low', group: 'fields', count: 1 },
    ],
    by_group: [
      { group: 'documents', label: 'مدارک', count: 1 },
      { group: 'project', label: 'پروژه و درصد تخصیص', count: 1 },
      { group: 'fields', label: 'فیلدهای ناقص', count: 1 },
    ],
    group_labels: {
      fields: 'فیلدهای ناقص', documents: 'مدارک', project: 'پروژه و درصد تخصیص',
    },
    severity_labels: { high: 'بحرانی', medium: 'متوسط', low: 'کم' },
  },
  contracts: [
    {
      id: 1, number: 'C-100', subject: 'قرارداد ساخت سالن تولید', party_name: 'شرکت ساختمانی الف',
      status: 'active', status_label: 'در حال اجرا', contract_type: 'construction',
      contract_type_label: 'پیمانکاری', amount: 1200000000, end_date: '2026-12-31',
      project_name: 'پروژه آ', documents_count: 0,
      issues: [
        { ...rules[0] },
        { ...rules[1] },
        { ...rules[2] },
      ],
      issue_count: 3, max_severity: 'high', score: 52,
    },
    {
      id: 2, number: 'C-101', subject: 'قرارداد مشاوره فنی', party_name: 'شرکت مشاور ب',
      status: 'completed', status_label: 'تکمیل شده', contract_type: 'consulting',
      contract_type_label: 'مشاوره', amount: 300000000, end_date: '2026-06-30',
      project_name: 'پروژه ب', documents_count: 3, issues: [],
      issue_count: 0, max_severity: null, score: 100,
    },
  ],
  rules,
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts-completeness']}>
          <ContractsCompletenessPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(450);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(150); });
  }
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/completeness/') return Promise.resolve({ data: payload });
    return Promise.resolve({ data: null });
  });
});

test('contracts completeness page lists deficiencies, filters and details', async () => {
  const { container, root } = await renderPage();

  expect(axiosInstance.get).toHaveBeenCalledWith('/external-contracts/completeness/', { params: {} });

  // سرصفحه و شاخص‌ها
  expect(container.textContent).toContain('نواقص قراردادها');
  expect(container.textContent).toContain('کل قراردادها');
  expect(container.textContent).toContain('دارای نقص');
  expect(container.textContent).toContain('بدون مدرک');
  expect(container.textContent).toContain('بدون درصد پروژه');
  expect(container.textContent).toContain('فیلدهای ناقص');

  // فیلترها
  expect(container.textContent).toContain('فیلتر نواقص');
  expect(container.textContent).toContain('شدت');
  expect(container.textContent).toContain('نوع نقص');
  expect(container.textContent).toContain('بحرانی');

  // جدول
  const table = container.querySelector('[aria-label="جدول نواقص قراردادها"]');
  expect(table).toBeTruthy();
  expect(table.textContent).toContain('C-۱۰۰');
  expect(table.textContent).toContain('قرارداد ساخت سالن تولید');
  expect(table.textContent).toContain('شرکت ساختمانی الف');
  expect(table.textContent).toContain('امتیاز سلامت');
  expect(container.textContent).toContain('قراردادهای نیازمند تکمیل');

  // دیالوگ جزئیات با فهرست نواقص و لینک پرونده
  const firstRow = table.querySelector('tbody tr');
  await act(async () => {
    firstRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(300);
  });
  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('قرارداد C-۱۰۰'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('هیچ مدرکی برای قرارداد بارگذاری نشده است');
  expect(dialog.textContent).toContain('درصد تخصیص پروژه مشخص نشده است');
  expect(dialog.textContent).toContain('مدارک');
  expect(dialog.textContent).toContain('باز کردن پروندهٔ قرارداد');

  root.unmount();
  container.remove();
});
