import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import OrgPartiesPage from '../pages/accounting/OrgPartiesPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { accounting: '#0ea5e9' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'accounting' }, applications: [] }),
}));

// چاپ در jsdom پیاده‌سازی ندارد
jest.mock('../core/print/printEngine', () => ({
  __esModule: true,
  printElement: jest.fn(),
}));

// کاربر جاری (برای گیت دکمه‌ها با مجوز ریز)
const mockAuth = { user: { is_superuser: true } };
jest.mock('../core/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({ user: mockAuth.user }),
}));

const stats = {
  total: 2,
  active: 1,
  inactive: 1,
  linked: 1,
  kinds: [
    { kind: 'organization', label: 'سازمان و نهاد عمومی', count: 1 },
    { kind: 'regulatory', label: 'مرجع قانونی و نظارتی', count: 1 },
    { kind: 'employer', label: 'کارفرما', count: 0 },
    { kind: 'shareholder', label: 'سهامدار', count: 0 },
    { kind: 'insurer', label: 'شرکت بیمه', count: 0 },
    { kind: 'auditor', label: 'حسابرس / بازرس قانونی', count: 0 },
    { kind: 'legal_person', label: 'سایر اشخاص حقوقی', count: 0 },
    { kind: 'natural_person', label: 'سایر اشخاص حقیقی', count: 0 },
    { kind: 'other', label: 'سایر', count: 0 },
  ],
  kinds_meta: [
    { value: 'organization', label: 'سازمان و نهاد عمومی', hint: 'مثل شهرداری', prefix: 'ORG', person_type: 'legal' },
    { value: 'regulatory', label: 'مرجع قانونی و نظارتی', hint: 'مثل سازمان تأمین اجتماعی', prefix: 'REG', person_type: 'legal' },
    { value: 'employer', label: 'کارفرما', hint: 'کارفرمای قراردادها', prefix: 'EMP', person_type: 'legal' },
    { value: 'shareholder', label: 'سهامدار', hint: 'سهامداران شرکت', prefix: 'SHR', person_type: 'legal' },
    { value: 'insurer', label: 'شرکت بیمه', hint: 'شرکت‌های بیمه', prefix: 'INS', person_type: 'legal' },
    { value: 'auditor', label: 'حسابرس / بازرس قانونی', hint: 'حسابرس مستقل', prefix: 'AUD', person_type: 'legal' },
    { value: 'legal_person', label: 'سایر اشخاص حقوقی', hint: 'سایر شرکت‌ها', prefix: 'LGL', person_type: 'legal' },
    { value: 'natural_person', label: 'سایر اشخاص حقیقی', hint: 'اشخاص حقیقی', prefix: 'NAT', person_type: 'natural' },
    { value: 'other', label: 'سایر', hint: 'موارد دیگر', prefix: 'OTH', person_type: 'legal' },
  ],
};

const rows = [
  {
    id: 1, code: 'REG-0001', name: 'سازمان تأمین اجتماعی', unit_name: 'شعبه ۱۲ تهران',
    kind: 'regulatory', full_name: 'سازمان تأمین اجتماعی (شعبه ۱۲ تهران)',
    national_id: '12345678901', mobile: '09121234567', account_display: '2101 - بیمه پرداختنی',
    parent_name: '', is_active: true, children_count: 0, share_percent: null,
  },
  {
    id: 2, code: 'ORG-0001', name: 'شهرداری تهران', unit_name: '',
    kind: 'organization', full_name: 'شهرداری تهران',
    national_id: '', mobile: '', account_display: '', parent_name: '', is_active: false,
    children_count: 2,
  },
];


const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/accounting/org-parties']}>
          <OrgPartiesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(400);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(160); });
  }
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockAuth.user = { is_superuser: true };
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/accounting/org-parties/') return Promise.resolve({ data: listPayload });
    if (url === '/accounting/org-parties/stats/') return Promise.resolve({ data: stats });
    return Promise.resolve({ data: { results: [] } });
  });
  axiosInstance.post.mockResolvedValue({ data: {} });
  axiosInstance.patch.mockResolvedValue({ data: {} });
  axiosInstance.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('renders the registry with kind filters and rows', async () => {
  const { container, root } = await renderPage();

  expect(axiosInstance.get).toHaveBeenCalledWith('/accounting/org-parties/', expect.objectContaining({
    params: expect.objectContaining({ page: 1, ordering: 'name' }),
  }));
  expect(axiosInstance.get).toHaveBeenCalledWith('/accounting/org-parties/stats/');

  expect(container.textContent).toContain('سازمان‌ها و اشخاص');
  expect(container.textContent).toContain('مرجع قانونی و نظارتی');
  expect(container.textContent).toContain('کارفرما');
  expect(container.textContent).toContain('سهامدار');
  expect(container.textContent).toContain('سازمان تأمین اجتماعی');
  expect(container.textContent).toContain('شعبه ۱۲ تهران');
  expect(container.textContent).toContain('شهرداری تهران');
  expect(container.textContent).toContain('دارای ارتباط');

  root.unmount();
  container.remove();
});


test('create button opens the registry form with all sections', async () => {
  const { container, root } = await renderPage();

  const createButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('ثبت سازمان یا شخص'));
  expect(createButton).toBeTruthy();

  await act(async () => {
    createButton.click();
    await wait(250);
  });

  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('ثبت سازمان یا شخص جدید');
  expect(dialog.textContent).toContain('نوع و عنوان');
  expect(dialog.textContent).toContain('هویت حقوقی');
  expect(dialog.textContent).toContain('راه‌های تماس و شخص رابط');
  expect(dialog.textContent).toContain('اطلاعات بانکی');
  expect(dialog.textContent).toContain('ارتباط با ماژول‌ها');
  expect(dialog.textContent).toContain('سازمان و نهاد عمومی');

  // باز کردن انتخابگر نوع و بررسی همهٔ دسته‌های درخواستی
  const kindSelect = dialog.querySelector('[role="combobox"]');
  expect(kindSelect).toBeTruthy();
  await act(async () => {
    kindSelect.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await wait(250);
  });
  const menuText = Array.from(document.querySelectorAll('[role="option"]'))
    .map((node) => node.textContent).join(' | ');
  expect(menuText).toContain('سازمان و نهاد عمومی');
  expect(menuText).toContain('مرجع قانونی و نظارتی');
  expect(menuText).toContain('کارفرما');
  expect(menuText).toContain('سهامدار');
  expect(menuText).toContain('سایر اشخاص حقوقی');
  expect(menuText).toContain('سایر اشخاص حقیقی');

  root.unmount();
  container.remove();
});

test('selecting a kind chip filters the list on the server', async () => {
  const { container, root } = await renderPage();

  const chip = Array.from(container.querySelectorAll('.MuiChip-root'))
    .find((node) => (node.textContent || '').startsWith('مرجع قانونی و نظارتی'));
  expect(chip).toBeTruthy();

  await act(async () => {
    chip.click();
    await wait(500);
  });

  const filtered = axiosInstance.get.mock.calls
    .filter(([url]) => url === '/accounting/org-parties/')
    .map(([, config]) => config && config.params);
  expect(filtered.some((params) => params && params.kind === 'regulatory')).toBe(true);

  root.unmount();
  container.remove();
});

test('empty list shows a guiding message', async () => {
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/accounting/org-parties/') return Promise.resolve({ data: { count: 0, results: [] } });
    if (url === '/accounting/org-parties/stats/') {
      return Promise.resolve({ data: { ...stats, total: 0, active: 0, inactive: 0, linked: 0 } });
    }
    return Promise.resolve({ data: { results: [] } });
  });

  const { container, root } = await renderPage();
  expect(container.textContent).toContain('سازمان یا شخصی ثبت نشده است');

  root.unmount();
  container.remove();
});


test('read-only user (fine permission view only) cannot see create/edit buttons', async () => {
  mockAuth.user = { fine_permissions: { 'accounting.acc-org-parties.view': true } };

  const { container, root } = await renderPage();

  const createButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('ثبت سازمان یا شخص'));
  expect(createButton).toBeFalsy();
  expect(container.querySelector('[aria-label="ویرایش"]')).toBeNull();
  expect(container.querySelector('[aria-label="حذف"]')).toBeNull();
  expect(container.querySelector('[aria-label="پرونده"]')).toBeTruthy();

  root.unmount();
  container.remove();
});

const listPayload = { count: rows.length, results: rows };
