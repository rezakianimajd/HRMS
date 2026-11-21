import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import PhonebookPanel from '../pages/PhonebookPanel';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const party = {
  id: 1,
  name: 'شرکت پارس',
  national_id: '10101010101',
  party_type_display: 'پیمانکار',
  person_type_display: 'شخص حقوقی',
  company_type_display: 'سهامی خاص',
  establishment_date: '2015-03-21',
  registered_capital: 1000000000,
  phone: '021-88776655',
  mobile: '09121234567',
  email: 'info@pars.example',
  address: 'تهران، خیابان ولیعصر',
  contact_person: 'رضا احمدی',
  ceo_name: 'علی پارس',
  ceo_phone: '021-88776600',
  finance_manager_name: 'مریم مالی',
  finance_manager_phone: '021-88776611',
  technical_contact_name: 'حسین فنی',
  technical_contact_phone: '021-88776622',
  bank_name: 'بانک ملی',
  account_number: '123456789',
  sheba_number: 'IR123456789012345678901234',
  description: 'پیمانکار نمونه برای تست دفترچه تلفن',
  contracts_count: 4,
};

const supplier = {
  id: 2,
  code: 'SUP-1',
  name: 'تأمین‌کنندهٔ الف',
  category_name: 'تجهیزات',
  phone: '021-11223344',
  mobile: '',
  email: '',
  contact_person: 'سارا محمدی',
  status_display: 'فعال',
  rating: 4.5,
};

const renderPanel = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <PhonebookPanel />
      </QueryClientProvider>,
    );
  });
  await act(async () => { await wait(900); });
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/contract-parties/') {
      return Promise.resolve({ data: { count: 1, results: [party] } });
    }
    if (url === '/procurement/suppliers/') {
      return Promise.resolve({ data: { count: 1, results: [supplier] } });
    }
    return Promise.resolve({ data: [] });
  });
});

test('phonebook dialog lists both sources, supports search and has no chips', async () => {
  const { container, root } = await renderPanel();

  expect(container.querySelector('[data-testid="phonebook-panel"]')).toBeTruthy();
  expect(container.textContent).toContain('شرکت پارس');
  expect(container.textContent).toContain('تأمین‌کنندهٔ الف');
  expect(container.textContent).toContain('قرارداد');
  expect(container.textContent).toContain('خرید');
  expect(container.querySelector('a[href="tel:02188776655"]')).toBeTruthy();
  expect(container.querySelector('.MuiChip-root')).toBeNull();

  const input = container.querySelector('[data-testid="phonebook-search"] input');
  expect(input).toBeTruthy();
  const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    setValue.call(input, 'پارس');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(250);
  });

  expect(container.textContent).toContain('شرکت پارس');
  expect(container.textContent).not.toContain('تأمین‌کنندهٔ الف');
  expect(container.textContent).toContain('۱ مخاطب از ۲ مخاطب');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('phonebook card opens the full contact details dialog', async () => {
  const { container, root } = await renderPanel();
  const card = Array.from(container.querySelectorAll('[data-testid="phonebook-card"]'))
    .find((node) => node.textContent.includes('شرکت پارس'));
  expect(card).toBeTruthy();

  await act(async () => {
    card.click();
    await wait(250);
  });

  expect(document.body.textContent).toContain('اطلاعات تماس');
  expect(document.body.textContent).toContain('افراد و نمایندگان');
  expect(document.body.textContent).toContain('مدیر عامل');
  expect(document.body.textContent).toContain('نماینده / شخص رابط');
  expect(document.body.textContent).toContain('هویت حقوقی');
  expect(document.body.textContent).toContain('بانک ملی');
  expect(document.body.textContent).toContain('سرمایه ثبتی');

  await act(async () => { root.unmount(); });
  container.remove();
});
