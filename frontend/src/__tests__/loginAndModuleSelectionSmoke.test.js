import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ModuleSelection, { greetingForHour } from '../core/components/ui/ModuleSelection';
import Login from '../pages/Login';
import { getModuleLandingPath } from '../core/constants/moduleIcons';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn(), patch: jest.fn(), put: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null }),
  MODULE_DEFAULT_ACCENTS: {
    hrms: '#6366f1', contracts: '#f59e0b', projects: '#8b5cf6', accounting: '#0ea5e9',
    inventory: '#10b981', settings: '#64748b',
  },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({
    applications: [], currentApp: null, loadApplications: jest.fn(() => Promise.resolve()),
    switchApplication: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock('../core/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({ login: jest.fn(), user: null, isAuthenticated: false, loading: false }),
}));

jest.mock('../core/hooks/useCompany', () => ({
  __esModule: true,
  default: () => ({ setCurrentCompany: jest.fn(), currentCompany: null }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const applications = [
  {
    id: 1, slug: 'hrms', title: 'منابع انسانی', description: 'توضیحی که نباید نمایش داده شود',
    accessible: true, is_coming_soon: false,
  },
  {
    id: 2, slug: 'contracts', title: 'قراردادها', description: 'توضیحی که نباید نمایش داده شود',
    accessible: true, is_coming_soon: false,
  },
  {
    id: 3, slug: 'projects', title: 'پروژه‌ها', accessible: false, is_coming_soon: false,
  },
];

const testUser = { first_name: 'علی', last_name: 'رضایی', username: 'ali' };
const testCompany = {
  legal_name: 'شرکت نمونه کیان', code: 'KIAN-1', logo_url: '/media/company-logos/kian.png',
};

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const mount = async (node) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
    await wait();
  });
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/auth/login-users/') {
      return Promise.resolve({ data: [{ id: 1, username: 'ali', first_name: 'علی', last_name: 'رضایی', full_name: 'علی رضایی' }] });
    }
    if (url === '/auth/login-companies/') {
      return Promise.resolve({
        data: [{
          id: 1,
          code: 'KIAN-1',
          display_name: 'شرکت نمونه کیان',
          legal_name: 'شرکت نمونه کیان',
          logo_url: '/media/company-logos/kian.png',
          name: 'DB-TENANT-NAME-MUST-NOT-APPEAR',
        }],
      });
    }
    return Promise.resolve({ data: null });
  });
});

test('each selected module resolves to its own landing dashboard', () => {
  expect(getModuleLandingPath('hrms')).toBe('/dashboard');
  expect(getModuleLandingPath('contracts')).toBe('/contracts-dashboard');
  expect(getModuleLandingPath('projects')).toBe('/projects/dashboard');
  expect(getModuleLandingPath('accounting')).toBe('/accounting');
  expect(getModuleLandingPath('procurement')).toBe('/procurement');
  expect(getModuleLandingPath('treasury')).toBe('/treasury');
  expect(getModuleLandingPath('pettycash')).toBe('/petty-cash/dashboard');
  expect(getModuleLandingPath('settings')).toBe('/settings');
});

test('module selection uses outlined module cards, full name and time greeting without descriptions', async () => {
  const onPick = jest.fn();
  const { container, root } = await mount(
    <ModuleSelection
      applications={applications}
      user={testUser}
      company={testCompany}
      onPick={onPick}
      onBack={() => {}}
    />,
  );

  const greeting = greetingForHour(new Date().getHours());
  expect(container.textContent).toContain(greeting);
  expect(container.textContent).toContain('علی رضایی');
  expect(container.textContent).toContain('به سامانه یکپارچه مدیریت کسب و کار کیان خوش آمدید');
  expect(container.textContent).toContain('منابع انسانی');
  expect(container.textContent).toContain('قراردادها');
  expect(container.textContent).not.toContain('توضیحی که نباید نمایش داده شود');
  expect(container.textContent).toContain('شرکت نمونه کیان');
  expect(container.querySelectorAll('svg').length).toBeGreaterThan(3);
  expect(container.querySelector('img')).toBeTruthy();

  const hrmsCard = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('منابع انسانی'));
  expect(hrmsCard).toBeTruthy();
  await act(async () => {
    hrmsCard.click();
    await wait(40);
  });
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ slug: 'hrms' }));

  root.unmount();
  container.remove();
});

test('login page reads company name and logo from company profile, not tenant DB name', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { container, root } = await mount(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(150); });
  }

  expect(container.textContent).toContain('سامانه یکپارچه مدیریت کسب و کار کیان');
  expect(container.textContent).toContain('شرکت نمونه کیان');
  expect(container.textContent).not.toContain('DB-TENANT-NAME-MUST-NOT-APPEAR');
  expect(container.querySelector('img')).toBeTruthy();
  expect(container.textContent).toContain('خوش آمدید');

  root.unmount();
  container.remove();
});
