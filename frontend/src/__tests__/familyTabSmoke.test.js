import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import FamilyTab from '../core/components/employee/FamilyTab';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { hrms: '#8b5cf6' },
}));

const members = [
  {
    id: 11, employee: 3, first_name: 'سارا', last_name: 'احمدی', full_name: 'سارا احمدی',
    relation: 'spouse', relation_display: 'همسر', national_id: '0012345678',
    birth_date: '1992-05-21', age: 33, phone: '09120000000', is_dependent: true,
    source: 'supplementary_insurance', source_display: 'بیمه تکمیلی', notes: 'بیمه درمان',
  },
  {
    id: 12, employee: 3, first_name: 'نیما', last_name: 'احمدی', full_name: 'نیما احمدی',
    relation: 'child', relation_display: 'فرزند', national_id: '', birth_date: '2016-03-20',
    age: 9, phone: '', is_dependent: true, source: 'manual', source_display: 'ثبت دستی', notes: '',
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
  axiosInstance.post.mockReset();
});

const renderTab = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/employees/3']}>
          <FamilyTab employeeId={3} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(400);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(150); });
  }
  return { container, root };
};

test('family tab lists members with relation, national id, birth date and source', async () => {
  const { container, root } = await renderTab();

  const head = container.querySelector('thead').textContent;
  ['نام و نام خانوادگی', 'نسبت', 'کد ملی', 'تاریخ تولد', 'سن', 'تحت تکفل', 'منبع', 'عملیات']
    .forEach((label) => { expect(head).toContain(label); });

  expect(container.textContent).toContain('سارا احمدی');
  expect(container.textContent).toContain('همسر');
  expect(container.textContent).toContain('نیما احمدی');
  expect(container.textContent).toContain('فرزند');
  expect(container.textContent).toContain('بیمه تکمیلی');
  expect(container.textContent).toContain('۱۳۹۵/۰۱/۰۱');
  expect(container.textContent).toContain('اعضای خانواده:');
  expect(container.textContent).toContain('عضو خانواده جدید');
  expect(container.textContent).toContain('دریافت از بیمه تکمیلی');

  root.unmount();
  container.remove();
});

test('family tab filters members and syncs from supplementary insurance', async () => {
  const { container, root } = await renderTab();

  const searchInput = Array.from(container.querySelectorAll('input'))
    .find((input) => input.placeholder?.includes('جست‌وجو'));
  expect(searchInput).toBeTruthy();

  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    valueSetter.call(searchInput, 'نیما');
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(200);
  });

  expect(container.textContent).toContain('نیما احمدی');
  expect(container.textContent).not.toContain('سارا احمدی');

  axiosInstance.post.mockResolvedValue({ data: { created: 2, updated: 0, total: 2, removed: 0 } });
  const syncButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('دریافت از بیمه تکمیلی'));
  expect(syncButton).toBeTruthy();

  await act(async () => {
    syncButton.click();
    await wait(250);
  });

  expect(axiosInstance.post).toHaveBeenCalledWith(
    '/family-members/sync-from-insurance/', { employee: 3 },
  );

  root.unmount();
  container.remove();
});
