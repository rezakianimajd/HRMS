import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationProvider } from '../core/context/ApplicationContext';
import axiosInstance from '../core/api/axiosConfig';
import GuaranteesPage from '../pages/GuaranteesPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));

const contract = {
  id: 1,
  number: 'C-200',
  subject: 'قرارداد آزمایشی تضامین',
  party_name: 'شرکت پیمانکار',
  status_display: 'در حال اجرا',
  amount: 100000000,
  currency_name: 'ریال',
  end_date: '2026-06-30',
  guarantee_items: [{ type: 'performance', percent: 5 }],
};

const guarantees = [
  {
    id: 11,
    contract: 1,
    contract_subject: contract.subject,
    contract_guarantee_index: 0,
    contract_guarantee_label: 'ضمانت حسن انجام کار — ۵٪',
    guarantee_type: 'performance',
    guarantee_type_display: 'ضمانت حسن انجام کار',
    instrument_type: 'bank_guarantee',
    instrument_type_display: 'ضمانت‌نامه بانکی',
    number: 'G-11',
    amount: 5000000,
    issue_date: '2025-05-01',
    expiry_date: '2027-05-01',
    bank: 'بانک تست',
    guarantee_number: 'BG-11',
    guarantee_expiry_date: '2027-05-01',
    last_action: '',
    is_released: false,
    documents: [{ id: 20, title: 'PDF تضمین', guarantee_number: 'G-11', file_url: '/media/guarantee.pdf' }],
  },
  {
    id: 12,
    contract: 1,
    contract_subject: contract.subject,
    guarantee_type: 'advance',
    guarantee_type_display: 'ضمانت پیش‌پرداخت',
    instrument_type: 'check',
    instrument_type_display: 'چک',
    number: 'CH-12',
    amount: 1500000,
    issue_date: '2025-06-01',
    expiry_date: '2025-07-01',
    check_number: 'C-12',
    check_due_date: '2025-07-01',
    last_action: '',
    is_released: false,
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
    if (url === '/contract-guarantees/') return Promise.resolve({ data: guarantees });
    if (url === '/external-contracts/1/guarantees-status/') {
      return Promise.resolve({
        data: {
          effective_amount: contract.amount,
          requirements: [{
            index: 0, type: 'performance', label: 'ضمانت حسن انجام کار',
            required: 5000000, provided: 5000000, balance: 0,
            coverage_percent: 100, status: 'provided', items: [],
          }],
          summary: {
            required_total: 5000000, provided_total: 5000000, balance_total: 0,
            released_total: 0, coverage_percent: 100, provided_count: 1,
            partial_count: 0, missing_count: 0,
          },
          warnings: [],
        },
      });
    }
    if (url === '/external-contracts/1/') return Promise.resolve({ data: contract });
    return Promise.resolve({ data: [] });
  });
});

test('contract guarantees landing lists contracts with guarantee counts and no avatars', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-guarantees']}>
            <GuaranteesPage />
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
  expect(container.textContent).toContain('C-۲۰۰');
  expect(container.textContent).toContain('تعداد تضمین‌ها');
  expect(container.textContent).toContain('۲ تضمین');
  expect(container.querySelector('.MuiAvatar-root')).toBeNull();
  root.unmount();
});

test('contract guarantees workspace renders coverage, cards and editor without a title description', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <MemoryRouter initialEntries={['/contracts-guarantees?contract=1']}>
            <GuaranteesPage />
          </MemoryRouter>
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
  }

  expect(container.textContent).toContain('تضامین و ضمانت‌نامه‌ها');
  expect(container.textContent).toContain('پوشش تضامین');
  expect(container.textContent).toContain('G-11');
  expect(container.textContent).toContain('۱ پیوست');
  expect(container.textContent).toContain('خروجی');
  expect(container.textContent).not.toContain('برای مشاهده و ثبت تضامین');

  const newButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('تضمین جدید'));
  expect(newButton).toBeTruthy();
  await act(async () => { newButton.click(); });
  expect(document.body.textContent).toContain('ثبت تضمین جدید');
  expect(document.body.textContent).toContain('قرارداد و نوع تضمین');
  expect(document.body.textContent).toContain('اطلاعات چک');
  expect(document.body.textContent).toContain('پیوست PDF تضمین');

  root.unmount();
});
