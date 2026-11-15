import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import EventsReportPage from '../pages/EventsReportPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { hrms: '#8b5cf6' },
}));

const employees = [
  {
    id: 1, full_name: 'مریم احمدی', employee_id: '1001', department_name: 'واحد اداری',
    job_title_name: 'کارشناس', mobile: '09120000000',
  },
  {
    id: 2, full_name: 'سعید رضایی', employee_id: '1002', department_name: 'فنی',
    job_title_name: 'تکنسین', mobile: '09121111111',
  },
];

const events = {
  count: 3,
  summary: {
    total: 3, employees: 2, dependents: 1, birthdays_this_month: 2,
    upcoming_30: 2, contract_end_90: 1,
  },
  results: [
    {
      kind: 'employee_birthday', kind_label: 'تولد پرسنل', kind_color: '#0ea5e9',
      event_date: '2026-05-20', event_jalali: '۱۴۰۵/۰۲/۳۰', event_month: 2,
      days_until: 10, person_type: 'employee', person_type_label: 'پرسنل',
      person_id: 1, person_name: 'مریم احمدی', relation: 'employee', relation_label: 'پرسنل',
      employee_db_id: 1, employee_name: 'مریم احمدی', employee_code: '1001',
      department: 'واحد اداری', position: 'کارشناس', mobile: '09120000000',
      turning_age: 36, is_dependent: false,
    },
    {
      kind: 'dependent_birthday', kind_label: 'تولد تحت تکفل', kind_color: '#be185d',
      event_date: '2026-06-15', event_jalali: '۱۴۰۵/۰۳/۲۵', event_month: 3,
      days_until: 36, person_type: 'dependent', person_type_label: 'تحت تکفل',
      person_id: 11, person_name: 'علی احمدی', relation: 'child', relation_label: 'فرزند',
      employee_db_id: 1, employee_name: 'مریم احمدی', employee_code: '1001',
      department: 'واحد اداری', position: 'کارشناس', mobile: '09120000000',
      turning_age: 11, is_dependent: true,
    },
    {
      kind: 'contract_end', kind_label: 'پایان قرارداد', kind_color: '#f59e0b',
      event_date: '2026-07-01', event_jalali: '۱۴۰۵/۰۴/۱۰', event_month: 4,
      days_until: 52, person_type: 'employee', person_type_label: 'پرسنل',
      person_id: 2, person_name: 'سعید رضایی', relation: 'employee', relation_label: 'پرسنل',
      employee_db_id: 2, employee_name: 'سعید رضایی', employee_code: '1002',
      department: 'فنی', position: 'تکنسین', mobile: '09121111111',
      is_dependent: false,
    },
  ],
};

const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (String(url).includes('/reports/events/')) return Promise.resolve({ data: events });
    if (String(url).includes('/employees/')) return Promise.resolve({ data: { results: employees } });
    return Promise.resolve({ data: [] });
  });
});

test('events report lists birthdays, dependents and contract ends with filters and export', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/reports/events']}>
            <EventsReportPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await wait(600);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(160); });
  }

  expect(container.textContent).toContain('گزارش رویدادها');
  expect(container.textContent).toContain('کل رویدادها');
  expect(container.textContent).toContain('تولد پرسنل');
  expect(container.textContent).toContain('تولد تحت تکفل');
  expect(container.textContent).toContain('پایان قرارداد');
  expect(container.textContent).toContain('مریم احمدی');
  expect(container.textContent).toContain('علی احمدی');
  expect(container.textContent).toContain('فرزند');
  expect(container.textContent).toContain('۱۴۰۵/۰۳/۲۵');
  expect(container.textContent).toContain('خروجی اکسل');
  expect(container.querySelector('[aria-label="گزارش رویدادهای پرسنل و تحت تکفل"]')).toBeTruthy();
  expect(container.textContent).toContain('فیلترها');
  expect(container.querySelectorAll('input').length).toBeGreaterThan(0);

  axiosInstance.post.mockResolvedValue({
    data: { html: '<html><body>events</body></html>', title: 'گزارش رویدادها' },
  });
  const printButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.trim() === 'چاپ');
  expect(printButton).toBeTruthy();
  await act(async () => { printButton.click(); await wait(250); });
  const printCall = axiosInstance.post.mock.calls
    .find(([url]) => url === '/print/preview/');
  expect(printCall).toBeTruthy();
  expect(printCall[1].document).toBe('table');
  expect(printCall[1].payload.title).toBe('گزارش رویدادها');
  expect(printCall[1].payload.columns.length).toBeGreaterThan(5);
  expect(printCall[1].options.orientation).toBe('landscape');

  root.unmount();
  container.remove();
});
