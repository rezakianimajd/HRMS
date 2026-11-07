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

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'settings' }, applications: [] }),
}));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const rolesPayload = {
  stats: { modules: 2, groups: 3, menus: 3, codes: 5, actions: [] },
  actions: [
    { key: 'view', label: 'مشاهده', hint: '' },
    { key: 'edit', label: 'ویرایش', hint: '' },
    { key: 'delete', label: 'حذف', hint: '' },
  ],
  roles: [
    {
      code: 'super_admin', name: 'مدیر ارشد سیستم', description: 'دسترسی کامل',
      color: '#8b5cf6', base_role: 'super_admin', is_system: true, employees: 1,
      permissions_total: 5, permissions: {}, applications: [],
    },
    {
      code: 'treasury_manager', name: 'مدیر خزانه', description: 'مدیریت خزانه',
      color: '#14b8a6', base_role: 'employee', is_system: false, employees: 2,
      permissions_total: 1, permissions: { 'treasury.receipts.view': true }, applications: [],
    },
  ],
  catalog: [
    {
      slug: 'treasury', name: 'خزانه‌داری', color: '#14b8a6', menu_count: 2, code_count: 4,
      groups: [
        {
          title: 'دریافت و پرداخت',
          items: [
            {
              id: 'receipts', title: 'دریافت‌ها', path: '/treasury/receipts',
              actions: ['view', 'edit'],
              codes: { view: 'treasury.receipts.view', edit: 'treasury.receipts.edit' },
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
    {
      slug: 'settings', name: 'تنظیمات و تعاریف', color: '#64748b', menu_count: 1, code_count: 1,
      groups: [
        {
          title: 'تعاریف',
          items: [{
            id: 'general', title: 'تنظیمات عمومی', path: '/settings',
            actions: ['view'], codes: { view: 'settings.general.view' },
          }],
        },
      ],
    },
  ],
};

const usersPayload = {
  count: 1,
  results: [
    {
      id: 4, username: 'nasrin', full_name: 'نسرین احمدی', first_name: 'نسرین',
      last_name: 'احمدی', email: 'nasrin@example.com', is_active: true,
      is_superuser: false, role: 'treasury_manager', role_name: 'مدیر خزانه',
      applications: [1], permissions_granted: 1,
      employee_position: 'کارشناس ارشد خزانه', employee_department: 'امور مالی',
      employee_code: '1042', last_login: '2026-11-01T08:00:00Z',
    },
  ],
};

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/users/roles/') return Promise.resolve({ data: rolesPayload });
    if (url === '/users/') return Promise.resolve({ data: usersPayload });
    if (url === '/applications/catalog/') {
      return Promise.resolve({ data: { applications: [{ id: 1, name: 'خزانه', label: 'خزانه' }] } });
    }
    if (url === '/employees/') return Promise.resolve({ data: { results: [] } });
    return Promise.resolve({ data: { results: [] } });
  });
  axiosInstance.post.mockResolvedValue({ data: {} });
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
  await act(async () => { await wait(250); });
  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (container.textContent.includes('نسرین')) break;
    await act(async () => { await wait(150); });
  }
  return { container, root };
};

test('users tab shows employee job title as organizational role', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('کاربران، نقش‌ها و مجوزها');
  expect(container.textContent).toContain('نسرین احمدی');
  expect(container.textContent).toContain('کارشناس ارشد خزانه');
  expect(container.textContent).toContain('امور مالی');
  expect(container.textContent).toContain('مدیر خزانه');
  expect(container.textContent).toContain('کاربر جدید');

  root.unmount();
  container.remove();
});

test('roles tab renders the fine-grained permission matrix and saves it', async () => {
  const { container, root } = await renderPage();

  const rolesTab = [...container.querySelectorAll('[role="tab"]')]
    .find((node) => node.textContent.includes('نقش‌ها و مجوزهای ریز'));
  expect(rolesTab).toBeTruthy();
  await act(async () => {
    rolesTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(500);
  });

  expect(container.textContent).toContain('مدیر ارشد سیستم');
  expect(container.textContent).toContain('مدیر خزانه');

  const roleCards = [...container.querySelectorAll('div')]
    .filter((node) => node.textContent.trim().startsWith('مدیر خزانه'));
  await act(async () => {
    roleCards[roleCards.length - 1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(350);
  });

  const accordion = [...container.querySelectorAll('[role="button"]')]
    .find((node) => node.textContent.includes('خزانه‌داری'));
  expect(accordion).toBeTruthy();
  await act(async () => {
    accordion.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(400);
  });

  expect(container.textContent).toContain('دریافت‌ها');
  expect(container.textContent).toContain('انتقال وجوه');
  expect(container.textContent).toContain('مشاهده');

  const saveButton = [...container.querySelectorAll('button')]
    .find((node) => node.textContent.includes('ذخیرهٔ مجوزها'));
  expect(saveButton).toBeTruthy();
  await act(async () => {
    saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(450);
  });

  const saveCall = axiosInstance.post.mock.calls
    .find(([url]) => url === '/users/roles/treasury_manager/permissions/');
  expect(saveCall).toBeTruthy();
  expect(saveCall[1].permissions['treasury.receipts.view']).toBe(true);

  root.unmount();
  container.remove();
});

