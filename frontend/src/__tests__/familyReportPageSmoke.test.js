import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import FamilyReportPage from '../pages/FamilyReportPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { hrms: '#8b5cf6' },
}));

const members = [
  {
    id: 11, employee: 10, employee_name: 'مریم رضایی', employee_code: '1002',
    employee_gender: 'female', employee_photo_url: 'https://example.test/maryam.jpg',
    department_name: 'مالی', job_title_name: 'کارشناس',
    first_name: 'نیما', last_name: 'رضایی', full_name: 'نیما رضایی',
    relation: 'child', relation_display: 'فرزند',
    national_id: '0012345678', birth_date: '2015-05-10', age: 10,
    is_dependent: true, source: 'supplementary_insurance', source_display: 'بیمه تکمیلی',
    phone: '', notes: '', insurance_name: 'درمان تکمیلی',
    insurance_status: 'active', insurance_status_label: 'فعال',
    insurance_period: '1405/01/01 تا 1405/12/29',
    attachment_url: 'https://example.test/dependent.pdf', attachment_name: 'dependent.pdf',
    is_active: true,
  },
  {
    id: 12, employee: 20, employee_name: 'علی احمدی', employee_code: '1003',
    employee_gender: 'male', employee_photo_url: '',
    department_name: 'فنی', job_title_name: 'تکنسین',
    first_name: 'سارا', last_name: 'احمدی', full_name: 'سارا احمدی',
    relation: 'spouse', relation_display: 'همسر',
    national_id: '', birth_date: null, age: null,
    is_dependent: false, source: 'manual', source_display: 'ثبت دستی',
    phone: '09120000000', notes: '', insurance_name: '',
    insurance_status: 'none', insurance_status_label: 'بدون بیمه',
    insurance_period: '', attachment_url: '', attachment_name: '',
    is_active: true,
  },
];

const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (String(url).includes('/family-members/')) return Promise.resolve({ data: members });
    return Promise.resolve({ data: [] });
  });
});

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/reports/family']}>
            <FamilyReportPage />
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
  return { container, root };
};

test('family report reads the personnel-file family section and shows insurance context', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('گزارش خانوادهٔ پرسنل');
  expect(container.textContent).toContain('مریم رضایی');
  expect(container.textContent).toContain('علی احمدی');
  expect(container.textContent).toContain('نیما رضایی');
  expect(container.textContent).toContain('سارا احمدی');
  expect(container.textContent).toContain('فرزند');
  expect(container.textContent).toContain('همسر');
  expect(container.textContent).toContain('بیمه تکمیلی');
  expect(container.textContent).toContain('درمان تکمیلی');
  expect(container.textContent).toContain('بدون بیمه');
  expect(container.querySelector('img[src="https://example.test/maryam.jpg"]')).not.toBeNull();

  const head = container.querySelector('thead').textContent;
  ['عکس', 'پرسنل', 'عضو خانواده', 'نسبت', 'کد ملی', 'تاریخ تولد', 'سن',
    'تحت تکفل', 'منبع', 'بیمهٔ تکمیلی', 'پیوست']
    .forEach((label) => { expect(head).toContain(label); });

  expect(container.textContent).toContain('کل اعضای خانواده');
  expect(container.textContent).toContain('تحت تکفل');
  expect(container.textContent).toContain('دارای بیمهٔ تکمیلی');
  expect(container.textContent).toContain('خروجی اکسل');

  root.unmount();
  container.remove();
});

test('family report searches by member name and national id', async () => {
  const { container, root } = await renderPage();

  const searchInput = Array.from(container.querySelectorAll('input'))
    .find((input) => input.placeholder?.includes('جست‌وجو'));
  expect(searchInput).toBeTruthy();

  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    valueSetter.call(searchInput, '0012345678');
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(250);
  });

  expect(container.textContent).toContain('نیما رضایی');
  expect(container.textContent).not.toContain('سارا احمدی');

  root.unmount();
  container.remove();
});

