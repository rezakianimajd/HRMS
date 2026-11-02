import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import DependentsReportPage from '../pages/DependentsReportPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { employees: '#8b5cf6' },
}));

const insurances = [
  {
    id: 1,
    employee: 10,
    employee_name: 'مریم رضایی',
    employee_code: '1002',
    employee_gender: 'female',
    employee_photo_url: 'https://example.test/maryam.jpg',
    department_name: 'مالی',
    job_title_name: 'کارشناس',
    insurance_name: 'درمان تکمیلی',
    insurance_type: 'درمان',
    plan: 'طرح خانواده',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    monthly_amount: 1200000,
    total_amount: 14400000,
    dependents: [
      {
        id: 11, first_name: 'نیما', last_name: 'رضایی', relation: 'child', relation_display: 'فرزند',
        national_id: '0012345678', birth_date: '2015-05-10',
        attachment_url: 'https://example.test/dependent.pdf', attachment_name: 'dependent.pdf',
        has_attachment: true,
      },
      {
        id: 12, first_name: 'سارا', last_name: 'رضایی', relation: 'spouse', relation_display: 'همسر',
        national_id: '', birth_date: null, has_attachment: false,
      },
    ],
  },
  {
    id: 2,
    employee: 20,
    employee_name: 'علی احمدی',
    employee_code: '1003',
    employee_gender: 'male',
    employee_photo_url: '',
    department_name: 'فنی',
    job_title_name: 'تکنسین',
    insurance_name: 'بیمه عمر',
    plan: 'طرح پایه',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    dependents: [
      { id: 21, first_name: 'حسین', last_name: 'احمدی', relation: 'father', relation_display: 'پدر', has_attachment: false },
    ],
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
    if (String(url).includes('/supplementary-insurances/')) return Promise.resolve({ data: insurances });
    return Promise.resolve({ data: [] });
  });
});

test('dependents report lists every dependent with employee context and standard columns', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/insurance/dependents']}>
            <DependentsReportPage />
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

  expect(container.textContent).toContain('گزارش افراد تحت تکفل');
  expect(container.textContent).toContain('مریم رضایی');
  expect(container.textContent).toContain('علی احمدی');
  expect(container.textContent).toContain('نیما رضایی');
  expect(container.textContent).toContain('سارا رضایی');
  expect(container.textContent).toContain('حسین احمدی');
  expect(container.textContent).toContain('فرزند');
  expect(container.textContent).toContain('همسر');
  expect(container.textContent).toContain('پدر');
  expect(container.querySelector('img[src="https://example.test/maryam.jpg"]')).not.toBeNull();

  const head = container.querySelector('thead').textContent;
  ['عکس', 'نام و نام خانوادگی پرسنل', 'کد پرسنلی', 'واحد سازمانی', 'بیمه / طرح',
    'نام و نام خانوادگی فرد تحت تکفل', 'نسبت', 'کد ملی', 'تاریخ تولد', 'سن', 'پیوست']
    .forEach((label) => { expect(head).toContain(label); });

  // فیلترهای استاندارد
  expect(container.textContent).toContain('کل افراد تحت تکفل');
  expect(container.textContent).toContain('دارای پیوست مدارک');
  expect(container.textContent).toContain('خروجی اکسل');

  root.unmount();
  container.remove();
});
