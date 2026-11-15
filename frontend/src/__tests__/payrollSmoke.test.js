import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import PayrollPage from '../pages/PayrollPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { payroll: '#3b82f6' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'payroll' }, applications: [] }),
}));

const dashboard = {
  current_period: {
    id: 7, label: 'حقوق 1405/08', status: 'calculated', status_display: 'محاسبه‌شده',
    year: 1405, month: 8, start_date: '2026-10-23', end_date: '2026-11-21',
    employee_count: 12, calculated_count: 12, warning_count: 2, error_count: 0,
    gross: '120000000', insurance_employee: '8400000', insurance_employer: '27600000',
    tax: '3000000', other_deductions: '500000', net: '102600000',
    employer_cost: '27600000', total_cost: '147600000', paid: '0',
    has_accounting: false, has_payment_request: false,
  },
  previous_period: null,
  status_counts: { calculated: 1 },
  trend: [{ id: 7, label: 'حقوق 1405/08', status: 'calculated', employees: 12, gross: '120000000', net: '102600000', total_cost: '147600000' }],
  warnings: [{ id: 1, employee__first_name: 'علی', employee__last_name: 'رضایی', warnings: ['اطلاعات بانکی ثبت نشده است.'] }],
  payroll_count: 1,
  pending_periods: 1,
};

const renderPage = async (entry = '/payroll/dashboard') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[entry]}>
          <PayrollPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 250)); });
  return { container, root };
};

describe('Payroll smoke', () => {
  beforeEach(() => {
    axiosInstance.get.mockImplementation((url) => {
      if (url === '/payroll/dashboard/') return Promise.resolve({ data: dashboard });
      if (url === '/payroll/options/') return Promise.resolve({ data: { employees: [], projects: [], cost_centers: [], bank_formats: [], periods: [] } });
      if (url === '/payroll-periods/') return Promise.resolve({ data: { results: [], count: 0 } });
      if (url === '/payroll-reports/') return Promise.resolve({ data: { periods: [], by_department: [] } });
      return Promise.resolve({ data: { results: [], count: 0 } });
    });
  });

  it('renders the payroll dashboard and its period metrics', async () => {
    const { container, root } = await renderPage();
    expect(container.textContent).toContain('حقوق و دستمزد');
    expect(container.textContent).toContain('حقوق 1405/08');
    act(() => root.unmount());
    container.remove();
  });

  it('opens the periods tab with the create action', async () => {
    const { container, root } = await renderPage('/payroll/periods');
    expect(container.textContent).toContain('دورهٔ جدید');
    expect(container.textContent).toContain('دوره‌های حقوق');
    act(() => root.unmount());
    container.remove();
  });

  it('renders independent payroll pages without a tab shell', async () => {
    const { container, root } = await renderPage('/payroll/employees');
    expect(container.textContent).toContain('مشخصات پرسنل');
    expect(container.querySelector('input[placeholder="جست‌وجوی نام، کد، واحد یا عنوان شغلی"]')).toBeTruthy();
    act(() => root.unmount());
    container.remove();
  });

  it('renders annual operation pages as standalone routes', async () => {
    const { container, root } = await renderPage('/payroll/annual/eidi-operations');
    expect(container.textContent).toContain('عملیات و کارکرد عیدی');
    expect(container.textContent).toContain('پیش‌نیازهای این بخش');
    act(() => root.unmount());
    container.remove();
  });

  it('separates work entry and calculation method into two tabs', async () => {
    const { container, root } = await renderPage('/payroll/attendance-entry');
    expect(container.textContent).toContain('ورود اطلاعات');
    expect(container.textContent).toContain('فاکتورهای کارکرد');
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    await act(async () => { tabs[1].click(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
    expect(container.textContent).toContain('روش محاسبات');
    expect(container.textContent).toContain('قواعد محاسبهٔ کارکرد سال ۱۴۰۵');
    expect(container.textContent).toContain('اقلام و تأثیر در محاسبه');
    act(() => root.unmount());
    container.remove();
  });

  it.each([
    ['/payroll/loans', 'وام‌های کارکنان'],
    ['/payroll/insurance-export', 'خروجی بیمهٔ کارکنان'],
    ['/payroll/definitions/activity-centers', 'مراکز اصلی فعالیت'],
    ['/payroll/definitions/employee-status', 'وضعیت کارکنان بر اساس احکام حقوقی'],
    ['/payroll/profiles', 'احکام پرسنل'],
    ['/payroll/attendance-entry', 'ورود اطلاعات کارکرد'],
  ])('renders standalone payroll page %s', async (entry, text) => {
    const { container, root } = await renderPage(entry);
    expect(container.textContent).toContain(text);
    act(() => root.unmount());
    container.remove();
  });
});
