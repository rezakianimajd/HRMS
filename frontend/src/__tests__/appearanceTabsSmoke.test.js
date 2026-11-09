import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import AppearancePage from '../pages/AppearancePage';
import LoginBrandingPanel from '../pages/appearance/LoginBrandingPanel';
import { toPersianDigits } from '../core/utils/numberUtils';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn(),
  },
}));

jest.mock('../core/context/ThemeContext', () => ({
  __esModule: true,
  useThemeMode: () => ({
    mode: 'light', setMode: jest.fn(), neonColor: '#22d3ee', setNeonColor: jest.fn(),
  }),
  THEME_MODES: [
    { key: 'light', label: 'روشن', icon: 'L', color: '#f59e0b' },
    { key: 'dark', label: 'تیره', icon: 'D', color: '#6366f1' },
  ],
  NEON_COLOR_OPTIONS: [{ key: 'cyan', label: 'فیروزه‌ای', color: '#22d3ee' }],
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  MODULE_DEFAULT_ACCENTS: { hrms: '#6366f1', settings: '#64748b' },
  useModulePalette: () => ({
    canEdit: true,
    palettes: {},
    typography: {},
    designTokens: {},
    getPalette: () => null,
    setPalette: jest.fn(),
    setTypography: jest.fn(),
    resetTypography: jest.fn(),
    resetPalettes: jest.fn(),
    setDesignTokens: jest.fn(),
    resetDesign: jest.fn(),
    saving: false,
    savedTick: 0,
    error: '',
  }),
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({
    applications: [
      { id: 1, slug: 'hrms', title: 'منابع انسانی', accessible: true, is_coming_soon: false },
    ],
    currentApp: { slug: 'settings' },
    loadApplications: jest.fn(),
  }),
}));

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const renderAt = async (entry) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <AppearancePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
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
  axiosInstance.get.mockResolvedValue({
    data: {
      background_kind: 'gradient',
      gradient: { preset: 'linear-three', angle: 135, colors: ['#4f46e5', '#0ea5e9', '#0f766e'] },
      logo_size: 200,
      logo_panel_color: '#ffffff',
      overlay_color: '#07101f',
      overlay_opacity: 72,
      overlay_blur: 8,
      text_color: '#ffffff',
      accent_color: '#a5b4fc',
      can_edit: true,
    },
  });
  axiosInstance.put.mockResolvedValue({ data: {} });
});

test('appearance page exposes five tabs and defaults to the themes tab', async () => {
  const { container, root } = await renderAt('/appearance');

  const tabs = container.querySelector('[data-testid="appearance-tabs"]');
  expect(tabs).toBeTruthy();
  ['پوسته‌ها', 'پالت‌های رنگی', 'استودیو تم', 'ورود', 'فونت و اندازه‌ها'].forEach((label) => {
    expect(tabs.textContent).toContain(label);
  });
  // تب پیش‌فرض: پوسته‌ها (کارت‌های تم)، بدون پنل ورود
  expect(container.textContent).toContain('پوسته');
  expect(container.textContent).not.toContain('ظاهر صفحهٔ ورود');

  root.unmount();
  container.remove();
});

test('the login tab hosts the login branding panel moved from the company profile', async () => {
  const { container, root } = await renderAt('/appearance?tab=login');

  expect(container.textContent).toContain('ظاهر صفحهٔ ورود');
  expect(container.textContent).toContain('گرادیانت رنگی');
  expect(container.textContent).toContain('اندازهٔ لوگوی پنل ورود');
  expect(container.textContent).toContain('رنگ پس‌زمینهٔ پنل لوگو');
  expect(container.textContent).toContain('ذخیرهٔ ظاهر صفحهٔ ورود');

  root.unmount();
  container.remove();
});

test('login branding panel saves kind, gradient, logo and overlay fields', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <LoginBrandingPanel />
      </QueryClientProvider>,
    );
    await wait();
  });
  await act(async () => { await wait(200); });

  // داده‌های ذخیره‌شده در پنل نشسته‌اند (اندازهٔ لوگو ۲۰۰px)
  expect(container.textContent).toContain(`${toPersianDigits(200)}px`);

  const saveButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('ذخیرهٔ ظاهر صفحهٔ ورود'));
  expect(saveButton).toBeTruthy();

  await act(async () => {
    saveButton.click();
    await wait(60);
  });

  expect(axiosInstance.put).toHaveBeenCalledWith('/settings/login-branding/', expect.objectContaining({
    background_kind: 'gradient',
    logo_size: 200,
    logo_panel_color: '#ffffff',
    overlay_color: '#07101f',
    overlay_blur: 8,
    gradient: expect.objectContaining({ preset: 'linear-three' }),
  }));

  root.unmount();
  container.remove();
});
