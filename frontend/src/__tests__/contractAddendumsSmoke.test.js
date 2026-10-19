import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import axiosInstance from '../core/api/axiosConfig';
import ContractAddendumsPage from '../pages/ContractAddendumsPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));

const contract = {
  id: 1,
  number: 'C-100',
  subject: 'قرارداد آزمایشی الحاقیه',
  party_name: 'شرکت طرف قرارداد',
  contract_type_display: 'پیمانکاری',
  status: 'active',
  status_display: 'در حال اجرا',
  amount: 1000000,
  effective_amount: 1250000,
  advance_payment: 100000,
  guarantee_amount: 50000,
  retention_percent: 5,
  currency_name: 'ریال',
  start_date: '2025-04-21',
  end_date: '2026-04-20',
  effective_end_date: '2026-07-20',
  has_addendum: true,
  addendums: [{ id: 7 }],
};

const addendums = [
  {
    id: 7,
    contract: 1,
    number: 'A-7',
    date: '2025-09-01',
    subject: 'افزایش مبلغ و تمدید',
    subjects_display: 'تغییر مبلغ، تغییر مدت',
    subjects_detail: [
      { type: 'amount', label: 'تغییر مبلغ', group: 'financial', group_label: 'مالی و مبلغ' },
      { type: 'duration', label: 'تغییر مدت', group: 'time', group_label: 'زمان و برنامه' },
    ],
    subjects: [
      { type: 'amount', fields: { amount_change: 150000 } },
      { type: 'duration', fields: { extension_days: 90 } },
    ],
    amount_change: 150000,
    change_description: 'افزایش مبلغ و تمدید سه‌ماهه',
    provisions: [{ title: 'بند اول', text: 'متن بند' }],
    documents: [{ id: 3, title: 'PDF الحاقیه', file_url: '/media/addendum.pdf' }],
    effect: {
      has_effect: true,
      changes: [
        { field: 'amount', label: 'مبلغ قرارداد', from: 1000000, to: 1250000, source_field: 'amount_change' },
      ],
    },
  },
];

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/external-contracts/') return Promise.resolve({ data: [contract] });
    if (url === '/currencies/') return Promise.resolve({ data: [] });
    if (url === '/contract-addendums/subject-types/') return Promise.resolve({ data: { subjects: [] } });
    if (url === '/contract-addendums/') return Promise.resolve({ data: addendums });
    if (url === '/external-contracts/1/effective/') {
      return Promise.resolve({
        data: {
          base: { amount: 1000000, advance_payment: 100000, retention_percent: 5, guarantee_amount: 50000, end_date: '2026-04-20' },
          effective: { amount: 1250000, advance_payment: 100000, retention_percent: 5, guarantee_amount: 50000, end_date: '2026-07-20' },
          deltas: { amount: 250000, advance_payment: 0, retention_percent: 0, guarantee_amount: 0, end_date: null },
          changed: ['amount', 'end_date'],
          warnings: [],
          addendum_count: 1,
        },
      });
    }
    return Promise.resolve({ data: [] });
  });
  axiosInstance.post.mockResolvedValue({
    data: {
      base: { amount: 1000000, advance_payment: 100000, retention_percent: 5, guarantee_amount: 50000, end_date: '2026-04-20' },
      effective: { amount: 1150000, advance_payment: 100000, retention_percent: 5, guarantee_amount: 50000, end_date: '2026-04-20' },
      deltas: { amount: 150000 },
      changed: ['amount'],
      warnings: [],
    },
  });
});

test('contract addendums landing lists contracts with addendum counts and no avatars', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-addendums']}>
            <ContractAddendumsPage />
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

  expect(container.textContent).toContain('انتخاب قرارداد');
  expect(container.textContent).toContain('C-۱۰۰');
  expect(container.textContent).toContain('تعداد الحاقیه‌ها');
  expect(container.textContent).toContain('۱ الحاقیه');
  expect(container.querySelector('.MuiAvatar-root')).toBeNull();
  root.unmount();
});

test('contract addendums workspace renders effective profile, timeline and editor', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contract-addendums?contract=1']}>
            <ContractAddendumsPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
  }

  expect(container.textContent).toContain('الحاقیه‌های قرارداد');
  expect(container.textContent).toContain('پروندهٔ مؤثر');
  expect(container.textContent).toContain('C-100');
  expect(container.textContent).toContain('A-7');
  expect(container.textContent).toContain('۱ پیوست PDF');
  expect(container.textContent).toContain('خروجی');

  const newButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('الحاقیه جدید'));
  expect(newButton).toBeTruthy();
  await act(async () => { newButton.click(); });
  expect(document.body.textContent).toContain('اطلاعات پایه');
  expect(document.body.textContent).toContain('اثر زنده');
  expect(document.body.textContent).toContain('تاریخ الحاقیه (اختیاری)');
  expect(document.body.textContent).toContain('پیوست PDF الحاقیه');

  root.unmount();
});
