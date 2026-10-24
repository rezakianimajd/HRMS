import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import SupplementaryInsurancePage from '../pages/SupplementaryInsurancePage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { employees: '#8b5cf6' },
}));

const insurance = [{
  id: 1,
  employee: 1,
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
  dependents: [{
    id: 1, first_name: 'نیما', last_name: 'رضایی', relation: 'child', relation_display: 'فرزند',
    attachment_url: 'https://example.test/dependent.pdf', attachment_name: 'dependent.pdf',
    attachment_size_display: '1 KB', has_attachment: true,
  }],
}];

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (String(url).includes('applications')) return Promise.resolve({ data: { applications: [] } });
    if (String(url).includes('/supplementary-insurances/')) return Promise.resolve({ data: insurance });
    if (String(url).includes('/employees/')) {
      return Promise.resolve({ data: [{ id: 1, full_name: 'مریم رضایی', employee_id: '1002', gender: 'female', photo_url: 'https://example.test/maryam.jpg' }] });
    }
    return Promise.resolve({ data: [] });
  });
});

test('supplementary insurance page renders theme-aware summary and policy cards', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/insurance']}>
            <SupplementaryInsurancePage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await wait(800);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('بیمه تکمیلی');
  expect(container.textContent).toContain('کل بیمه‌ها');
  expect(container.textContent).toContain('مریم رضایی');
  expect(container.textContent).toContain('طرح خانواده');
  expect(container.querySelector('img[src="https://example.test/maryam.jpg"]')).not.toBeNull();

  root.unmount();
  container.remove();
});
