import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import CorrespondenceNameMappingPage from '../pages/correspondence/CorrespondenceNameMappingPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn(),
  },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { correspondence: '#0ea5e9' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'correspondence' }, applications: [] }),
}));

const API = '/correspondence-name-aliases/';

const meta = {
  purposes: [
    {
      key: 'referral', label: 'گیرندهٔ ارجاع', group: 'ارجاع',
      description: 'نام گیرندهٔ ارجاع را به پرسنل منابع انسانی متصل می‌کند.',
      target_kinds: ['employee'], paired: null, bidirectional: false, count: 1,
    },
    {
      key: 'sender', label: 'فرستنده / ارسال‌کننده', group: 'طرفین نامه',
      description: 'نام فرستندهٔ نامه را به مقصد متصل می‌کند.',
      target_kinds: ['employee', 'party', 'organization', 'correspondent'],
      paired: 'receiver', bidirectional: true, count: 1,
    },
    {
      key: 'subject', label: 'موضوع نامه / نوع مکاتبه', group: 'موضوع',
      description: 'موضوع‌های تکراری نامه را به نوع مکاتبه متصل می‌کند.',
      target_kinds: ['category'], paired: null, bidirectional: false, count: 0,
    },
  ],
  purpose_groups: [
    { title: 'ارجاع', keys: ['referral'] },
    { title: 'طرفین نامه', keys: ['sender'] },
    { title: 'موضوع', keys: ['subject'] },
  ],
  target_kinds: [
    { key: 'employee', label: 'پرسنل (منابع انسانی)' },
    { key: 'party', label: 'طرف حساب (مدیریت قراردادها)' },
    { key: 'category', label: 'نوع مکاتبه (تعاریف مکاتبات)' },
  ],
  paired_scopes: { sender: 'receiver', receiver: 'sender' },
  summary: {
    aliases: 3, names: 2, multi: 1, bidirectional: 1, applied: 10, unmapped: 4,
    by_kind: { employee: 2, party: 1 }, by_scope: { referral: 2, sender: 1 },
  },
};

const groups = {
  count: 2,
  results: [
    {
      key: 'حسینی|referral',
      raw_name: 'خ.حسینی',
      normalized: 'حسینی',
      scope: 'referral',
      scope_label: 'گیرندهٔ ارجاع',
      bidirectional: false,
      applied_scopes: ['referral'],
      targets: [
        {
          id: 1, target_kind: 'employee', target_kind_display: 'پرسنل (منابع انسانی)',
          target_id: 11, label: 'سیده زهرا حسینی (1024)', order: 0,
          applied_count: 5, last_applied_at: '2026-11-06T10:20:00Z',
        },
        {
          id: 2, target_kind: 'employee', target_kind_display: 'پرسنل (منابع انسانی)',
          target_id: 12, label: 'مریم رضایی (1030)', order: 1,
          applied_count: 2, last_applied_at: '2026-11-05T09:00:00Z',
        },
      ],
      target_count: 2,
      targets_label: 'سیده زهرا حسینی (1024) — مریم رضایی (1030)',
      target_kinds: ['employee'],
      applied_count: 7,
      last_applied_at: '2026-11-06T10:20:00Z',
    },
    {
      key: 'شرکت الفا|sender',
      raw_name: 'شرکت الفا',
      normalized: 'شرکت الفا',
      scope: 'sender',
      scope_label: 'فرستنده / ارسال‌کننده',
      bidirectional: true,
      applied_scopes: ['sender', 'receiver'],
      targets: [
        {
          id: 3, target_kind: 'party', target_kind_display: 'طرف حساب (مدیریت قراردادها)',
          target_id: 7, label: 'شرکت آلفا تجارت', order: 0,
          applied_count: 3, last_applied_at: '2026-11-04T08:00:00Z',
        },
      ],
      target_count: 1,
      targets_label: 'شرکت آلفا تجارت',
      target_kinds: ['party'],
      applied_count: 3,
      last_applied_at: '2026-11-04T08:00:00Z',
    },
  ],
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === `${API}meta/`) return Promise.resolve({ data: meta });
    if (url === `${API}groups/`) return Promise.resolve({ data: groups });
    if (url === `${API}unmapped/`) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { results: [] } });
  });
  axiosInstance.post.mockResolvedValue({ data: { id: 9, raw_name: 'خ.حسینی' } });
  axiosInstance.delete.mockResolvedValue({ data: {} });
});

const renderPage = async (entry = '/correspondence/name-mapping') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <CorrespondenceNameMappingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(700);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(170); });
  }
  return { container, root };
};


test('name mapping page renders specialized purposes, KPIs and dash-joined targets', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('نگاشت نام‌ها');
  expect(container.textContent).toContain('نگاشت‌های فعال');
  expect(container.textContent).toContain('نگاشت چند مقصده');
  expect(container.textContent).toContain('ردیف‌های اصلاح‌شده');
  expect(container.textContent).toContain('نام‌های بدون نگاشت');

  const table = container.querySelector('[aria-label="نگاشت نام‌های مکاتبات"]');
  expect(table).toBeTruthy();
  expect(container.textContent).toContain('نام واردشده');
  expect(container.textContent).toContain('کاربرد');
  expect(container.textContent).toContain('مقصدها');
  expect(container.textContent).toContain('تعداد مقصد');

  // کاربرد تخصصی هر نگاشت
  expect(container.textContent).toContain('گیرندهٔ ارجاع');
  expect(container.textContent).toContain('فرستنده / ارسال‌کننده');
  // نگاشت دو مسیره
  expect(container.textContent).toContain('دو مسیره');
  // مقصدهای چندگانه با خط تیره (ارجاع به دو نفر)
  expect(container.textContent).toContain('سیده زهرا حسینی (1024) — مریم رضایی (1030)');
  expect(container.textContent).toContain('شرکت آلفا تجارت');

  root.unmount();
  container.remove();
});

test('name mapping page sends the URL query to the grouped endpoint', async () => {
  const { container, root } = await renderPage('/correspondence/name-mapping?q=حسینی');

  const calls = axiosInstance.get.mock.calls.filter(([url]) => url === `${API}groups/`);
  expect(calls.length).toBeGreaterThan(0);
  const params = calls[calls.length - 1][1].params;
  expect(params.search).toBe('حسینی');

  root.unmount();
  container.remove();
});

test('adding a mapping opens the specialized form with purpose and dual switch', async () => {
  const { container, root } = await renderPage();

  const addButton = [...container.querySelectorAll('button')]
    .find((node) => node.textContent.trim() === 'افزودن نگاشت');
  expect(addButton).toBeTruthy();
  await act(async () => {
    addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(320);
  });

  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('نگاشت نام جدید'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('کاربرد نگاشت');
  expect(dialog.textContent).toContain('نگاشت دو مسیره');
  expect(dialog.textContent).toContain('نوع مقصدهای مجاز');

  root.unmount();
  container.remove();
});

