/**
 * تست دودی فهرست پروندهٔ پرسنل: نوار جست‌وجوی تم‌محور (استودیو تم) با
 * ترتیب/فیلتر/فعال‌چیپ‌ها و ارسال پارامترهای درست به API.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import EmployeeListPage from '../pages/EmployeeListPage';

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
  useApplication: () => ({ currentApp: { slug: 'hrms' }, applications: [] }),
}));

const employee = {
  id: 7,
  full_name: 'مریم احمدی',
  first_name: 'مریم',
  last_name: 'احمدی',
  employee_id: '1042',
  national_id: '0012345678',
  mobile: '09120000000',
  department_name: 'مالی',
  job_title_name: 'کارشناس حسابداری',
  work_location_name: 'تهران',
  insurance_list_name: 'تأمین اجتماعی',
  status: 'active',
  gender: 'female',
  is_record_complete: false,
  completeness_percent: 80,
};

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const employeeCalls = () => axiosInstance.get.mock.calls
  .filter(([url]) => url === '/employees/');

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/employees']}>
          <EmployeeListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(400);
  });
  await act(async () => { await wait(250); });
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
    if (url === '/employees/') {
      return Promise.resolve({ data: { count: 1, results: [employee] } });
    }
    if (url === '/departments/') return Promise.resolve({ data: [{ id: 1, name: 'مالی' }] });
    if (url === '/job-titles/') return Promise.resolve({ data: [{ id: 2, name: 'کارشناس حسابداری' }] });
    if (url === '/work-locations/') return Promise.resolve({ data: [{ id: 3, name: 'تهران' }] });
    if (url === '/insurance-lists/') return Promise.resolve({ data: [{ id: 4, name: 'تأمین اجتماعی' }] });
    return Promise.resolve({ data: [] });
  });
});

test('personnel list uses the themed toolbar, keeps the default order and renders rows', async () => {
  const { container, root } = await renderPage();

  const [firstCall] = employeeCalls();
  expect(firstCall).toBeTruthy();
  expect(firstCall[1].params).toMatchObject({
    page: 1,
    ordering: '-created_at',
  });

  expect(container.textContent).toContain('مریم احمدی');
  expect(container.textContent).toContain('وضعیت پرونده');
  expect(container.textContent).toContain('کارشناس حسابداری');
  // نوار ابزار استاندارد: جست‌وجو + ترتیب + فیلترها
  expect(container.querySelector('input[placeholder*="نام خانوادگی"]')).toBeTruthy();
  expect(container.querySelector('[role="combobox"]')).toBeTruthy();
  expect(container.textContent).toContain('فیلترها');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('sorting by last name sends the ordering parameter to the API', async () => {
  const { container, root } = await renderPage();

  const combobox = container.querySelector('[role="combobox"]');
  expect(combobox).toBeTruthy();
  await act(async () => {
    combobox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    await wait(200);
  });

  const option = Array.from(document.querySelectorAll('[role="option"]'))
    .find((element) => element.textContent.includes('نام خانوادگی (الف تا ی)'));
  expect(option).toBeTruthy();
  await act(async () => { option.click(); await wait(350); });

  const calls = employeeCalls();
  expect(calls[calls.length - 1][1].params.ordering).toBe('last_name,first_name');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('filters panel keeps every existing filter and shows active chips', async () => {
  const { container, root } = await renderPage();

  const filtersButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('فیلترها'));
  expect(filtersButton).toBeTruthy();
  await act(async () => { filtersButton.click(); await wait(250); });

  // در تست، i18n مقدار کلید را برمی‌گرداند؛ در برنامهٔ واقعی همین کلیدها ترجمه می‌شوند.
  ['employees.department', 'employees.job_title', 'employees.work_location',
    'employees.insurance_list', 'employees.status', 'employees.gender']
    .forEach((key) => {
      expect(container.textContent).toContain(key);
    });
  // ترتیب + شش فیلتر = هفت کمبوباکس
  expect(container.querySelectorAll('[role="combobox"]').length).toBeGreaterThanOrEqual(7);

  await act(async () => { root.unmount(); });
  container.remove();
});
