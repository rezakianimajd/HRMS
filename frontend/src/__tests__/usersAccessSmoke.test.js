import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import UsersPage from '../pages/UsersPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn(),
  },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: {},
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'settings' }, applications: [] }),
}));

jest.mock('../core/components/ui/UserAvatar', () => ({
  __esModule: true,
  default: ({ user }) => (
    <span data-testid="avatar">{user?.employee_name || user?.username || 'U'}</span>
  ),
}));

jest.mock('../core/components/ui/EmployeePicker', () => ({
  __esModule: true,
  default: () => <div data-testid="employee-picker" />,
}));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const actions = [
  { key: 'view', label: 'مشاهده', hint: '' },
  { key: 'edit', label: 'ویرایش', hint: '' },
  { key: 'approve', label: 'تأیید', hint: '' },
];

const catalog = [
  {
    slug: 'treasury', name: 'خزانه‌داری', color: '#14b8a6', menu_count: 2, code_count: 5,
    groups: [
      {
        title: 'دریافت و پرداخت',
        items: [
          {
            id: 'receipts', title: 'دریافت‌ها', path: '/treasury/receipts',
            actions: ['view', 'edit', 'approve'],
            codes: {
              view: 'treasury.receipts.view',
              edit: 'treasury.receipts.edit',
              approve: 'treasury.receipts.approve',
            },
          },
          {
            id: 'transfers', title: 'انتقال وجوه', path: '/treasury/transfers',
            actions: ['view', 'edit'],
            codes: { view: 'treasury.transfers.view', edit: 'treasury.transfers.edit' },
          },
        ],
      },
    ],
  },
];

const usersPayload = {
  count: 2,
  results: [
    {
      id: 1, username: 'admin', full_name: 'مدیر سیستم', is_active: true,
      is_superuser: false, is_full_access: true, permissions_granted: 'همه',
      modules: [], applications: [], employee_position: 'مدیرعامل',
      employee_department: 'مدیریت', last_login: '2026-11-02T08:00:00Z',
    },
    {
      id: 4, username: 'nasrin', full_name: 'نسرین احمدی', is_active: true,
      is_superuser: false, is_full_access: false, permissions_granted: 1,
      modules: [{ slug: 'treasury', name: 'خزانه‌داری', color: '#14b8a6', count: 1 }],
      applications: [], employee_position: 'کارشناس ارشد خزانه',
      employee_department: 'امور مالی', employee_code: '1042',
      last_login: '2026-11-01T08:00:00Z',
    },
  ],
};

const accessPayload = {
  user: { id: 4, username: 'nasrin', full_name: 'نسرین احمدی', is_superuser: false },
  full_access: false,
  permissions: { 'treasury.receipts.view': true },
  applications: [],
  catalog,
  actions,
  stats: { modules: 1, groups: 1, menus: 2, codes: 5 },
};

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/users/') return Promise.resolve({ data: usersPayload });
    if (url === '/users/access/catalog/') {
      return Promise.resolve({
        data: { catalog, actions, stats: { modules: 1, groups: 1, menus: 2, codes: 5 } },
      });
    }
    if (url === '/users/4/access/') return Promise.resolve({ data: accessPayload });
    if (url === '/users/1/access/') {
      return Promise.resolve({
        data: { ...accessPayload, user: { ...accessPayload.user, id: 1, username: 'admin' } },
      });
    }
    if (url === '/applications/catalog/') {
      return Promise.resolve({
        data: [{
          id: 1, slug: 'treasury', title: 'خزانه‌داری', description: 'خزانه',
          icon: 'account_balance', color: '#14b8a6', order: 1, is_coming_soon: false,
        }],
      });
    }
    if (url === '/employees/') return Promise.resolve({ data: { results: [] } });
    return Promise.resolve({ data: { results: [] } });
  });
  axiosInstance.post.mockResolvedValue({ data: { message: 'ذخیره شد' } });
});

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter><UsersPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(700);
  });
  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (container.textContent.includes('نسرین')) break;
    await act(async () => { await wait(150); });
  }
  return { container, root };
};

test('users tab shows job title, system admin and per-user permission counts', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('کاربران و مجوزهای ریز');
  expect(container.textContent).toContain('نسرین احمدی');
  expect(container.textContent).toContain('کارشناس ارشد خزانه');
  expect(container.textContent).toContain('امور مالی');
  expect(container.textContent).toContain('مدیر سیستم');
  expect(container.textContent).toContain('کاربر جدید');

  root.unmount();
  container.remove();
});

test('edit dialog lists module titles (not blank/white cards)', async () => {
  const { container, root } = await renderPage();

  const editButton = container.querySelector('button[aria-label="ویرایش کاربر"]');
  expect(editButton).toBeTruthy();
  await act(async () => {
    editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(500);
  });

  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('ویرایش کاربر'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('خزانه‌داری');
  expect(dialog.textContent).toContain('ماژول‌های مجاز');

  root.unmount();
  container.remove();
});

test('permission tab edits one employee independently and saves the matrix', async () => {
  const { container, root } = await renderPage();

  const accessTab = [...container.querySelectorAll('[role="tab"]')]
    .find((node) => node.textContent.includes('مجوزهای کاربران'));
  expect(accessTab).toBeTruthy();
  await act(async () => {
    accessTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(600);
  });

  const userCard = [...container.querySelectorAll('div')]
    .filter((node) => node.textContent.trim().startsWith('نسرین احمدی'));
  await act(async () => {
    userCard[userCard.length - 1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(400);
  });
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (container.textContent.includes('ذخیرهٔ مجوزها')) break;
    await act(async () => { await wait(200); });
  }

  // eslint-disable-next-line no-console
  console.log('DEBUG-FULL::', container.textContent.slice(-400));
  // eslint-disable-next-line no-console
  console.log('DEBUG-BUTTONS::', container.querySelectorAll('[role="button"]').length,
    container.innerHTML.length);
  const accordion = [...container.querySelectorAll('[role="button"]')]
    .find((node) => node.textContent.includes('خزانه‌داری'));
  expect(accordion).toBeTruthy();
  await act(async () => {
    accordion.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(450);
  });

  expect(container.textContent).toContain('دریافت‌ها');
  expect(container.textContent).toContain('انتقال وجوه');
  expect(container.textContent).toContain('تأیید');

  const approveBox = container.querySelector(
    'input[aria-label="دریافت‌ها تأیید"]',
  );
  expect(approveBox).toBeTruthy();
  await act(async () => {
    approveBox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(300);
  });

  const saveButton = [...container.querySelectorAll('button')]
    .find((node) => node.textContent.includes('ذخیرهٔ مجوزها'));
  expect(saveButton).toBeTruthy();
  await act(async () => {
    saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(450);
  });

  const saveCall = axiosInstance.post.mock.calls
    .find(([url]) => url === '/users/4/access/');
  expect(saveCall).toBeTruthy();
  expect(saveCall[1].permissions['treasury.receipts.view']).toBe(true);
  expect(saveCall[1].permissions['treasury.receipts.approve']).toBe(true);

  root.unmount();
  container.remove();
});

