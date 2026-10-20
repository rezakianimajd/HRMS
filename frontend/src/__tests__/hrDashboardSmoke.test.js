import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import DashboardPage from '../pages/DashboardPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { hrms: '#6366f1' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'hrms', title: 'منابع انسانی' }, applications: [] }),
}));

const responses = {
  '/dashboard/stats/': {
    total_active: 120, new_this_month: 6, on_leave: 4, retired_this_year: 2,
    expired_documents: 3, expiring_contracts: 7, total_documents: 150,
    pending_leave_requests: 5, pending_hr_requests: 2,
  },
  '/dashboard/alerts/': {
    total_alerts: 10,
    expiring_documents: [{ id: 1, title: 'پایان قرارداد کار', employee_name: 'رضا احمدی', expiry_date: '2026-10-25', days_left: 5 }],
    expiring_contracts: [{ id: 2, full_name: 'سارا محمدی', contract_end_date: '2026-11-01', days_left: 12 }],
  },
  '/dashboard/recent-activities/': [
    { id: 1, user: 'admin', action: 'ایجاد', description: 'ثبت پرسنل جدید', timestamp: '2026-10-19T09:10:00Z' },
  ],
  '/reports/employees-by-gender/': [{ gender: 'male', count: 70 }, { gender: 'female', count: 50 }],
  '/reports/upcoming-birthdays/': [{
    id: 8, full_name: 'سارا محمدی', employee_id: 'E8', department_name: 'مالی',
    birth_jalali: '1370/07/29', days_until: 2, is_today: false,
  }],
  '/management/kpis/': {
    total_active: 120, male_ratio: 58.3, female_ratio: 41.7, avg_age: 34.5,
    avg_tenure_years: 5.2, avg_salary: 250000000, avg_performance: 82.4,
    avg_satisfaction: 78.1, new_this_month: 6, turnover_ytd: 3,
  },
  '/management/department-analytics/': [{
    department: 'فنی و مهندسی', headcount: 40, avg_salary: 300000000, avg_performance: 86,
    avg_satisfaction: 80, avg_age: 32, avg_tenure_years: 4,
  }],
  '/management/payroll-cost-trend/': {
    months: [{ label: 'مهر/۱۴۰۴', year: 2025, month: 9, net: 900000000, benefits: 120000000, deductions: 80000000, employer_insurance: 50000000 }],
  },
  '/management/education-distribution/': [{ education: 'کارشناسی', count: 60 }],
  '/management/city-distribution/': [{ city: 'تهران', count: 70 }],
  '/management/performance-distribution/': [{ label: 'بالای ۸۵', count: 20, color: '#10b981' }],
  '/management/leave-utilization/': {
    total_employees: 120, entitlement: 30, total_used: 1000, total_remaining: 2600,
    utilization_rate: 27.8, detail: [{ employee: 'رضا احمدی', employee_id: 'E1', department: 'فنی', remaining: 4 }],
  },
  '/management/asset-inventory/': { by_type: [{ type: 'لپ‌تاپ', count: 30 }], by_status: [{ status: 'فعال', count: 25 }], total: 30 },
  '/management/loan-summary/': { active_count: 5, total_amount: 100000000, total_monthly_installments: 10000000, paid_count: 2 },
  '/management/absenteeism-summary/': { months: [{ label: 'مهر/۱۴۰۴', present_rate: 95, absenteeism_rate: 5, total: 100 }] },
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => Promise.resolve({ data: responses[url] ?? null }));
});

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const mount = async (initialEntry = '/dashboard') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(350);
  });
  for (let index = 0; index < 5; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(200); });
  }
  return { container, root, client };
};

test('HR dashboard merges management analytics into overview, people and finance tabs', async () => {
  const { container, root } = await mount();

  expect(container.textContent).toContain('داشبورد منابع انسانی');
  expect(container.textContent).toContain('سرمایه انسانی در یک نگاه');
  expect(container.textContent).toContain('مرکز هشدارها');
  expect(container.textContent).toContain('تولدهای ۷ روز آینده');
  expect(container.textContent).toContain('سارا محمدی');
  expect(container.textContent).toContain('ترکیب جنسیتی');
  expect(container.textContent).toContain('توزیع نیرو در دپارتمان‌ها');
  expect(container.textContent).toContain('روند حضور و غیاب');
  expect(container.textContent).not.toContain('آخرین به‌روزرسانی');
  expect(container.textContent).not.toContain('داشبورد مدیریتی');

  const peopleTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('سرمایه انسانی'));
  await act(async () => { peopleTab.click(); await wait(180); });
  expect(container.textContent).toContain('تحلیل دپارتمان‌ها');
  expect(container.textContent).toContain('فنی و مهندسی');
  expect(container.textContent).toContain('توزیع عملکرد');
  expect(container.textContent).toContain('سطح تحصیلات');

  const financeTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('مالی و رفاه'));
  await act(async () => { financeTab.click(); await wait(180); });
  expect(container.textContent).toContain('روند هزینه حقوق و دستمزد');
  expect(container.textContent).toContain('وام و تسهیلات');
  expect(container.textContent).toContain('مانده و مصرف مرخصی');
  expect(container.textContent).toContain('اموال و تجهیزات');

  root.unmount();
  container.remove();
});

test('deep-link to the people tab opens the merged workforce section', async () => {
  const { container, root } = await mount('/dashboard?tab=people');
  expect(container.textContent).toContain('تحلیل دپارتمان‌ها');
  expect(container.textContent).toContain('فنی و مهندسی');
  root.unmount();
  container.remove();
});

