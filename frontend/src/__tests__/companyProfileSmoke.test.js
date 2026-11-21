import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import CompanyProfilePage from '../pages/CompanyProfilePage';

jest.setTimeout(20000);

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'settings' }, applications: [] }),
}));

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const profile = {
  id: 1,
  company: 1,
  legal_name: 'موسسه مدیریت راهبردی خاتم پاسارگاد',
  brand_name: 'کیان',
  legal_form: 'private_joint_stock',
  legal_form_display: 'سهامی خاص',
  registration_number: '12345',
  national_id: '10101010101',
  economic_code: '411111111111',
  shareholders: [],
  board_members: [],
  bank_accounts: [],
  signatories: [],
};

beforeEach(() => {
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/settings/company-profile/') return Promise.resolve({ data: profile });
    if (url === '/company-shareholders/') return Promise.resolve({ data: [{ id: 1, name: 'سهام‌دار نمونه', share_percent: 60, shares_count: 6000, is_active: true }] });
    if (url === '/company-board-members/') return Promise.resolve({ data: [{ id: 1, full_name: 'عضو نمونه', position: 'مدیرعامل', membership_type_display: 'اجرایی', is_active: true }] });
    if (url === '/company-bank-accounts/') return Promise.resolve({ data: [{ id: 1, bank_name: 'بانک نمونه', account_number: '123', is_official: true, is_active: true }] });
    if (url === '/signatories/') return Promise.resolve({ data: [{ id: 1, full_name: 'صاحب امضا نمونه', position: 'مدیرعامل', is_active: true }] });
    if (url === '/currencies/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
});

test('company profile exposes legal, banking and governance tabs', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/company-profile']}>
          <CompanyProfilePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(700);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(150); });
  }

  expect(container.textContent).toContain('مشخصات شرکت');
  expect(container.textContent).toContain('مشخصات حقوقی');
  expect(container.textContent).toContain('سهام‌داران');
  expect(container.textContent).toContain('هیئت مدیره');
  expect(container.textContent).toContain('صاحبان امضا');
  expect(container.textContent).toContain('حساب‌های بانکی');

  const signatoryTab = Array.from(container.querySelectorAll('[role="tab"]'))
    .find((tab) => tab.textContent.includes('صاحبان امضا'));
  expect(signatoryTab).toBeTruthy();
  await act(async () => { signatoryTab.click(); await wait(900); });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(200); });
  }
  expect(container.textContent).toContain('صاحب امضا جدید');
  expect(container.textContent).toContain('صاحب امضا نمونه');

  const shareholdersTab = Array.from(container.querySelectorAll('[role="tab"]'))
    .find((tab) => tab.textContent.includes('سهام‌داران'));
  await act(async () => { shareholdersTab.click(); await wait(900); });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(200); });
  }
  expect(container.textContent).toContain('سهام‌دار نمونه');
  expect(container.textContent).toContain('جمع درصد سهام');

  await act(async () => { root.unmount(); });
  container.remove();
});
