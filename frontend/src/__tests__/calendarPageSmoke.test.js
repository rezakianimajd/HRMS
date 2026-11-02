import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import axiosInstance from '../core/api/axiosConfig';
import { toJalali } from '../core/utils/dateUtils';
import CalendarPage from '../pages/CalendarPage';

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
const futureIso = plusDays(6);
const futureJ = toJalali(futureIso);

const feed = {
  start: plusDays(-45),
  end: plusDays(75),
  events: [
    { id: 'cal-1', type: 'custom', title: 'جلسه عمومی سازمانی', date: todayIso, company: 'منابع انسانی', description: 'جلسه ماهانه' },
    { id: 'cal-2', type: 'birthday', title: 'تولد سارا احمدی', date: todayIso, company: 'فناوری اطلاعات' },
    { id: 'cal-3', type: 'contract_end', title: 'پایان قرارداد رضا کریمی', date: futureIso, company: 'مالی' },
    { id: 'cal-4', type: 'leave', title: 'مرخصی استحقاقی — مینا رضایی', date: futureIso, company: '' },
  ],
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/calendar/feed/') return Promise.resolve({ data: feed });
    return Promise.resolve({ data: [] });
  });
});

test('HR calendar renders studio panels and searches by text and Jalali date', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/calendar']}>
            <CalendarPage />
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

  expect(container.textContent).toContain('تقویم سازمانی');
  expect(container.textContent).toContain('جلسه عمومی سازمانی');
  expect(container.textContent).toContain('رویدادهای پیش‌رو');
  expect(container.textContent).toContain('فیلتر انواع رویداد');
  expect(container.textContent).toContain('پایان قرارداد رضا کریمی');

  const searchInput = Array.from(container.querySelectorAll('input'))
    .find((input) => input.placeholder?.includes('جست‌وجو'));
  expect(searchInput).toBeTruthy();

  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    valueSetter.call(searchInput, 'مینا');
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  expect(container.textContent).toContain('نتیجه برای');
  expect(container.textContent).toContain('مرخصی استحقاقی — مینا رضایی');
  expect(container.textContent).not.toContain('جلسه عمومی سازمانی');

  await act(async () => {
    valueSetter.call(searchInput, todayJ);
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  expect(container.textContent).toContain(todayJ);
  expect(container.textContent).toContain('تولد سارا احمدی');

  await act(async () => {
    valueSetter.call(searchInput, '');
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  expect(container.textContent).toContain(futureJ);
  root.unmount();
  container.remove();
});
