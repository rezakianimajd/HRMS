import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import axiosInstance from '../core/api/axiosConfig';
import { toJalali } from '../core/utils/dateUtils';
import ContractCalendarPage from '../pages/ContractCalendarPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));

const localIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = new Date();
const todayIso = localIso(today);
const plusDays = (days) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return localIso(date);
};
const todayJ = toJalali(todayIso);
const futureIso = plusDays(65);
const futureJ = toJalali(futureIso);

const contract = {
  id: 1,
  number: 'CAL-1',
  subject: 'قرارداد آزمایشی تقویم',
  party_name: 'شرکت تقویم',
  status: 'active',
  status_display: 'در حال اجرا',
  amount: 100000000,
  currency_name: 'ریال',
  signing_date: todayIso,
  start_date: todayIso,
  end_date: plusDays(45),
  effective_end_date: plusDays(45),
  invoices: [
    { id: 3, number: 'INV-1', date: todayIso, due_date: plusDays(5), total: 10000000 },
    { id: 8, number: 'INV-2', date: todayIso, due_date: futureIso, total: 12000000 },
  ],
  addendums: [{ id: 4, number: 'ADD-1', date: todayIso, new_end_date: plusDays(45) }],
  guarantees: [{
    id: 5, guarantee_type_display: 'ضمانت حسن انجام کار', number: 'G-1',
    issue_date: todayIso, expiry_date: plusDays(10), amount: 5000000,
  }],
  payments: [{ id: 6, date: todayIso, amount: 2000000, reference: 'PAY-1' }],
  statements: [{ id: 7, number: 'ST-1', date: todayIso, net_amount: 3000000 }],
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/') return Promise.resolve({ data: [contract] });
    return Promise.resolve({ data: [] });
  });
});

test('contract calendar renders events and finds a Jalali date through search', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-calendar']}>
            <ContractCalendarPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
  }

  expect(container.textContent).toContain('تقویم قراردادها');
  expect(container.textContent).toContain('قرارداد آزمایشی تقویم');
  expect(container.textContent).toContain('رویدادهای روز');

  const searchInput = Array.from(container.querySelectorAll('input'))
    .find((input) => input.placeholder?.includes('جست‌وجو'));
  expect(searchInput).toBeTruthy();

  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    valueSetter.call(searchInput, todayJ);
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  expect(container.textContent).toContain('نتایج جست‌وجو');
  expect(container.textContent).toContain('رویدادهای تاریخ');
  expect(container.textContent).toContain(todayJ);

  await act(async () => {
    valueSetter.call(searchInput, futureJ);
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  expect(container.textContent).toContain(futureJ);
  expect(container.textContent).toContain('سررسید فاکتور INV-2');
  root.unmount();
});
