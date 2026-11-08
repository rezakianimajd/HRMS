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

jest.mock('../core/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    user: {
      id: 5,
      username: 'mapper',
      is_superuser: false,
      is_full_access: false,
      permissions: {},
      fine_permissions: {
        'correspondence.name-mapping.view': true,
        'correspondence.name-mapping.edit': true,
        'correspondence.name-mapping.delete': true,
      },
    },
    isAuthenticated: true,
  }),
}));

const API = '/correspondence-name-aliases/';

const meta = {
  purposes: [
    {
      key: 'counterparty', label: 'طرف حساب نامه (وارده/صادره)', group: 'طرفین نامه',
      description: 'نام طرف حساب نامه را به طرف حساب مدیریت قراردادها متصل می‌کند.',
      target_kinds: ['party', 'organization'], paired: null, bidirectional: false, count: 1,
    },
    {
      key: 'sender', label: 'فرستنده / ارسال‌کننده', group: 'طرفین نامه',
      description: 'نام فرستندهٔ نامه را به مقصد متصل می‌کند.',
      target_kinds: ['employee', 'party'], paired: 'receiver', bidirectional: true, count: 1,
    },
  ],
  purpose_groups: [
    { title: 'طرفین نامه', keys: ['counterparty', 'sender'] },
  ],
  target_kinds: [
    { key: 'employee', label: 'پرسنل (منابع انسانی)' },
    { key: 'party', label: 'طرف حساب (مدیریت قراردادها)' },
    { key: 'organization', label: 'سازمان (تعاریف مکاتبات)' },
    { key: 'category', label: 'نوع مکاتبه (تعاریف مکاتبات)' },
  ],
  paired_scopes: { sender: 'receiver', receiver: 'sender' },
  summary: {
    aliases: 3, names: 2, multi: 1, bidirectional: 1, applied: 10, unmapped: 3,
    by_kind: { employee: 2, party: 1 }, by_scope: { counterparty: 2, sender: 1 },
  },
};

const columns = [
  {
    key: 'counterparty', label: 'طرف حساب نامه (وارده/صادره)', group: 'طرفین نامه',
    description: 'نام طرف حساب نامه را به طرف حساب مدیریت قراردادها متصل می‌کند.',
    target_kinds: ['party', 'organization'], paired: null,
    names: 3, mapped: 1, unmapped: 2, rows: 6, aliases: 1,
  },
  {
    key: 'sender', label: 'فرستنده / ارسال‌کننده', group: 'طرفین نامه',
    description: 'نام فرستندهٔ نامه را به مقصد متصل می‌کند.',
    target_kinds: ['employee', 'party'], paired: 'receiver',
    names: 2, mapped: 1, unmapped: 1, rows: 12, aliases: 1,
  },
];

const groups = {
  count: 1,
  results: [
    {
      key: 'طرف حساب آلفا|counterparty',
      raw_name: 'شرکت آلفا',
      normalized: 'طرف حساب آلفا',
      scope: 'counterparty',
      scope_label: 'طرف حساب نامه (وارده/صادره)',
      bidirectional: false,
      applied_scopes: ['counterparty'],
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

const unmapped = [
  {
    raw_name: 'شرکت بتا صنعت',
    normalized: 'طرف حساب بتا صنعت',
    count: 4,
    scopes: ['counterparty'],
    suggestions: [
      { kind: 'party', id: 12, label: 'بتا صنعت پارس', score: 0.91 },
    ],
  },
];

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url, config = {}) => {
    if (url === `${API}meta/`) return Promise.resolve({ data: meta });
    if (url === `${API}columns/`) return Promise.resolve({ data: columns });
    if (url === `${API}groups/`) {
      const scope = config?.params?.scope;
      return Promise.resolve({ data: scope === 'counterparty' ? groups : { results: [] } });
    }
    if (url === `${API}unmapped/`) {
      const scope = config?.params?.scope;
      return Promise.resolve({ data: scope === 'counterparty' ? unmapped : [] });
    }
    return Promise.resolve({ data: { results: [] } });
  });
  axiosInstance.post.mockResolvedValue({ data: { id: 9, raw_name: 'شرکت بتا صنعت', total: 2 } });
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

test('name mapping page renders column cards, KPIs and the column workspace', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('نگاشت نام‌ها');
  expect(container.textContent).toContain('نگاشت‌های فعال');
  expect(container.textContent).toContain('نام‌های نگاشت‌شده');
  expect(container.textContent).toContain('نام‌های بدون نگاشت');
  expect(container.textContent).toContain('ردیف‌های اصلاح‌شده');

  // کارت ستون‌ها (همهٔ فیلدها به‌جز تاریخ/شماره)
  expect(container.querySelector('[aria-label="ستون طرف حساب نامه (وارده/صادره)"]')).toBeTruthy();
  expect(container.querySelector('[aria-label="ستون فرستنده / ارسال‌کننده"]')).toBeTruthy();

  // میزکار ستون انتخاب‌شده
  expect(container.textContent).toContain('نگاشت ستون «طرف حساب نامه (وارده/صادره)»');
  const table = container.querySelector('[aria-label="نگاشت نام‌های مکاتبات"]');
  expect(table).toBeTruthy();
  expect(container.textContent).toContain('نام واردشده');
  expect(container.textContent).toContain('مقصدها');
  expect(container.textContent).toContain('وضعیت');
  expect(container.textContent).toContain('شرکت آلفا تجارت');

  // نام بدون نگاشت + پیشنهاد سامانه
  expect(container.textContent).toContain('بدون نگاشت');
  expect(container.textContent).toContain('شرکت بتا صنعت');
  expect(container.textContent).toContain('بتا صنعت پارس');

  root.unmount();
  container.remove();
});

test('name mapping page requests the grouped endpoint for the selected column', async () => {
  const { container, root } = await renderPage('/correspondence/name-mapping?q=آلفا');

  const calls = axiosInstance.get.mock.calls.filter(([url]) => url === `${API}groups/`);
  expect(calls.length).toBeGreaterThan(0);
  const params = calls[calls.length - 1][1].params;
  expect(params.scope).toBe('counterparty');
  expect(params.search).toBe('آلفا');

  const unmappedCalls = axiosInstance.get.mock.calls.filter(([url]) => url === `${API}unmapped/`);
  expect(unmappedCalls.length).toBeGreaterThan(0);
  expect(unmappedCalls[unmappedCalls.length - 1][1].params.scope).toBe('counterparty');

  root.unmount();
  container.remove();
});


test('clicking a suggestion maps that name instantly (create + apply)', async () => {
  const { container, root } = await renderPage();

  const chip = [...container.querySelectorAll('[role="button"]')]
    .find((node) => node.textContent.includes('بتا صنعت پارس'));
  expect(chip).toBeTruthy();
  await act(async () => {
    chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(400);
  });

  const createCall = axiosInstance.post.mock.calls.find(([url]) => url === API);
  expect(createCall).toBeTruthy();
  expect(createCall[1]).toMatchObject({
    raw_name: 'شرکت بتا صنعت',
    scope: 'counterparty',
    target_kind: 'party',
    party: 12,
  });
  const applyBatch = axiosInstance.post.mock.calls
    .find(([url]) => String(url) === `${API}apply-batch/`);
  expect(applyBatch).toBeTruthy();
  expect(applyBatch[1]).toMatchObject({ ids: [9] });

  root.unmount();
  container.remove();
});

test('switching column reloads groups and unmapped for that column', async () => {
  const { container, root } = await renderPage();

  const card = container.querySelector('[aria-label="ستون فرستنده / ارسال‌کننده"]');
  expect(card).toBeTruthy();
  await act(async () => {
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(500);
  });

  const scopes = axiosInstance.get.mock.calls
    .filter(([url]) => url === `${API}groups/`)
    .map(([, config]) => config?.params?.scope);
  expect(scopes).toContain('sender');
  expect(container.textContent).toContain('نگاشت ستون «فرستنده / ارسال‌کننده»');

  root.unmount();
  container.remove();
});

test('adding a mapping opens the specialized form with purpose and target kinds', async () => {
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
  expect(dialog.textContent).toContain('نوع مقصدهای مجاز');

  root.unmount();
  container.remove();
});

