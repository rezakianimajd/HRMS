import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import BenefitTypesManager from '../core/components/settings/BenefitTypesManager';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { hrms: '#8b5cf6' },
}));

const rows = [
  {
    id: 1, code: 'eid_fitr', title: 'عید سعید فطر', note: '',
    suggested_date: '2026-05-31', suggested_date_jalali: '1405/03/10',
    next_date: '2026-05-31', next_date_jalali: '1405/03/10',
    days_remaining: 9, urgency: 'soon', urgency_label: 'نزدیک', is_active: true,
  },
  {
    id: 2, code: 'nowruz_basket', title: 'سبد نوروزی', note: 'هر سال اسفند',
    suggested_date: '2027-03-16', suggested_date_jalali: '1405/12/25',
    next_date: '2027-03-16', next_date_jalali: '1405/12/25',
    days_remaining: 96, urgency: 'later', urgency_label: 'دور', is_active: true,
  },
  {
    id: 3, code: 'custom_type', title: 'مزایای خاص', note: '',
    suggested_date: null, suggested_date_jalali: '',
    next_date: null, next_date_jalali: '',
    days_remaining: null, urgency: 'unset', urgency_label: 'بدون تاریخ', is_active: false,
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
    if (String(url).includes('/benefit-type-definitions/')) return Promise.resolve({ data: rows });
    return Promise.resolve({ data: [] });
  });
});

test('benefit types manager shows code, title, suggested date and days remaining', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/definitions']}>
          <BenefitTypesManager />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(500);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(150); });
  }

  const head = container.querySelector('thead').textContent;
  ['کد', 'نوع مزایا', 'تاریخ پیشنهادی', 'رخداد بعدی', 'روزهای مانده', 'وضعیت', 'عملیات']
    .forEach((label) => { expect(head).toContain(label); });

  expect(container.textContent).toContain('eid_fitr');
  expect(container.textContent).toContain('عید سعید فطر');
  expect(container.textContent).toContain('1405/03/10');
  expect(container.textContent).toContain('سبد نوروزی');
  expect(container.textContent).toContain('نوع مزایای جدید');
  expect(container.textContent).toContain('کل انواع:');

  root.unmount();
  container.remove();
});
