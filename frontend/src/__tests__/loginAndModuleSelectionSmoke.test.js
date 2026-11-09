import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import ModuleSelection, { ModuleSelectionCard, greetingForHour } from '../core/components/ui/ModuleSelection';
import Login from '../pages/Login';
import { getModuleLandingPath } from '../core/constants/moduleIcons';
import {
  loginGradientCss, loginOverlayGradient, normalizeLoginGradient, resolveLoginBranding,
} from '../core/utils/colorUtils';

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
          login_branding: {
            background_url: '/media/login_branding/company_1/office.jpg',
            overlay_color: '#0b3b2e',
            overlay_opacity: 80,
            overlay_blur: 14,
            text_color: '#f8fafc',
            accent_color: '#fbbf24',
          },
        }],
      });
    }
    return Promise.resolve({ data: null });
  });
});

test('login branding colors are sanitized and turned into a fade gradient', () => {
  const theme = resolveLoginBranding({
    background_url: ' /media/login_branding/bg.jpg ',
    overlay_color: '#0B3B2E',
    overlay_opacity: 200,
    overlay_blur: 40,
    text_color: 'red',
    accent_color: '#fbbf24',
  });
  expect(theme.backgroundUrl).toBe('/media/login_branding/bg.jpg');
  expect(theme.overlay).toBe('#0b3b2e');
  expect(theme.opacity).toBe(95);
  expect(theme.blur).toBe(24);
  expect(theme.text).toBe('#ffffff');
  expect(theme.accent).toBe('#fbbf24');
  expect(loginOverlayGradient(theme)).toContain('rgba(11,59,46,0.95)');

  const defaults = resolveLoginBranding(null);
  expect(defaults.backgroundUrl).toBe('');
  expect(defaults.overlay).toBe('#07101f');
  expect(defaults.opacity).toBe(72);
  expect(defaults.blur).toBe(8);
  expect(loginOverlayGradient(defaults)).toContain('rgba(7,16,31');
});

test('login background can be a color gradient instead of an image', () => {
  // دو رنگ خطی با زاویهٔ دلخواه
  const two = loginGradientCss({ preset: 'linear-two', angle: 90, colors: ['#111111', '#222222'] });
  expect(two).toContain('linear-gradient(90deg');
  expect(two).toContain('#111111 0%');
  expect(two).toContain('#222222 100%');

  // سه/چهار رنگ
  const four = loginGradientCss({
    preset: 'linear-four', angle: 45, colors: ['#111111', '#222222', '#333333', '#444444'],
  });
  expect(four).toContain('linear-gradient(45deg');
  expect((four.match(/#[0-9a-f]{6}/g) || []).length).toBe(4);

  // پریست‌های ویژه
  expect(loginGradientCss({ preset: 'radial' })).toContain('radial-gradient(');
  const rainbow = loginGradientCss({ preset: 'rainbow', angle: 30 });
  expect(rainbow).toContain('linear-gradient(30deg');
  expect(rainbow).not.toContain('conic-gradient');
  expect((rainbow.match(/#[0-9a-f]{6}/g) || []).length).toBeGreaterThan(5);
  // شناسهٔ قدیمی conic-rainbow به رنگین‌کمان خطی مهاجرت می‌کند
  expect(normalizeLoginGradient({ preset: 'conic-rainbow' }).preset).toBe('rainbow');
  expect(loginGradientCss({ preset: 'mesh' })).toContain('radial-gradient(');

  // مقدار نامعتبر → پیش‌فرض امن
  const safe = normalizeLoginGradient({ preset: 'nope', colors: ['bad', 'red'], angle: 'x' });
  expect(safe.preset).toBe('linear-three');
  expect(safe.colors.length).toBe(3);
  expect(safe.angle).toBe(135);

  // تم ورود: حالت گرادیانت + CSS آمادهٔ استفاده
  const theme = resolveLoginBranding({
    background_kind: 'gradient',
    gradient: { preset: 'mesh', angle: 210, colors: ['#123456', '#abcdef'] },
  });
  expect(theme.backgroundKind).toBe('gradient');
  expect(theme.useGradient).toBe(true);
  expect(theme.gradientCss).toContain('#123456');
  expect(theme.backgroundUrl).toBe('');

  // حالت تصویر همچنان پیش‌فرض است
  const imageTheme = resolveLoginBranding({ background_url: '/media/login_branding/a.jpg' });
  expect(imageTheme.backgroundKind).toBe('image');
  expect(imageTheme.useGradient).toBe(false);
});

test('login logo panel size and background color are configurable', () => {
  const theme = resolveLoginBranding({ logo_size: 260, logo_panel_color: '#123456' });
  expect(theme.logoSize).toBe(260);
  expect(theme.logoPanelColor).toBe('#123456');

  // محدودهٔ مجاز ۸۰..۳۲۰
  expect(resolveLoginBranding({ logo_size: 5000 }).logoSize).toBe(320);
  expect(resolveLoginBranding({ logo_size: 5 }).logoSize).toBe(80);
  expect(resolveLoginBranding({}).logoSize).toBe(176);
  expect(resolveLoginBranding({}).logoPanelColor).toBe('#ffffff');

  // رنگ نامعتبر → پیش‌فرض سفید
  expect(resolveLoginBranding({ logo_panel_color: 'nope' }).logoPanelColor).toBe('#ffffff');
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

test('module selection card renders standalone inside the login flip stage', async () => {
  const onPick = jest.fn();
  const { container, root } = await mount(
    <ModuleSelectionCard
      applications={applications}
      user={testUser}
      company={testCompany}
      onPick={onPick}
    />,
  );

  // کارت بدون پس‌زمینهٔ مستقل (پس‌زمینهٔ ثابتِ صفحهٔ ورود) رندر می‌شود
  expect(container.querySelector('[data-testid="module-selection-card"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="module-selection"]')).toBeFalsy();
  expect(container.querySelector('[data-testid="module-branding-image"]')).toBeFalsy();
  expect(container.textContent).toContain('منابع انسانی');
  expect(container.textContent).toContain('شرکت نمونه کیان');

  const hrmsCard = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('منابع انسانی'));
  await act(async () => {
    hrmsCard.click();
    await wait(40);
  });
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ slug: 'hrms' }));

  root.unmount();
  container.remove();
});

test('login page paints the configured gradient background instead of an image', async () => {
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/auth/login-users/') return Promise.resolve({ data: [] });
    if (url === '/auth/login-companies/') {
      return Promise.resolve({
        data: [{
          id: 1,
          code: 'KIAN-1',
          display_name: 'شرکت نمونه کیان',
          legal_name: 'شرکت نمونه کیان',
          logo_url: '/media/company-logos/kian.png',
          login_branding: {
            background_kind: 'gradient',
            background_url: '',
            gradient: { preset: 'linear-two', angle: 90, colors: ['#111111', '#222222'] },
            overlay_opacity: 0,
            overlay_blur: 0,
          },
        }],
      });
    }
    return Promise.resolve({ data: null });
  });

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

  const gradient = container.querySelector('[data-testid="login-branding-gradient"]');
  expect(gradient).toBeTruthy();
  expect(gradient.getAttribute('data-gradient-preset')).toBe('linear-two');
  expect(gradient.getAttribute('data-gradient-colors')).toBe('#111111,#222222');
  expect(gradient.getAttribute('data-gradient-angle')).toBe('90');
  expect(container.querySelector('[data-testid="login-branding-image"]')).toBeFalsy();
  // شفافیت پوشش صفر ⇒ لایهٔ تیره روی گرادیانت اضافه نمی‌شود
  expect(container.querySelector('[data-testid="login-gradient-overlay"]')).toBeFalsy();

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

  // صفحهٔ ورود بازطراحی‌شده: پس‌زمینهٔ تصویری + کارت وسط‌چین (فرم + لوگوی شرکت)
  const page = container.querySelector('[data-testid="login-page"]');
  expect(page).toBeTruthy();
  expect(page.getAttribute('data-branding-text-color')).toBe('#f8fafc');
  expect(page.getAttribute('data-branding-accent-color')).toBe('#fbbf24');

  expect(container.querySelector('[data-testid="login-card"]')).toBeTruthy();
  const logoPanel = container.querySelector('[data-testid="login-logo-panel"]');
  expect(logoPanel).toBeTruthy();
  expect(logoPanel.querySelector('img')).toBeTruthy();

  // نام دیتابیس/تنانت هرگز نشان داده نمی‌شود
  expect(container.textContent).not.toContain('DB-TENANT-NAME-MUST-NOT-APPEAR');

  // ظاهر صفحهٔ ورود از تنظیمات شرکت خوانده می‌شود: تصویر پس‌زمینه زیر پوشش رنگی + بلور
  const image = container.querySelector('[data-testid="login-branding-image"]');
  expect(image.getAttribute('data-background-url')).toBe('/media/login_branding/company_1/office.jpg');
  const overlay = container.querySelector('[data-testid="login-branding-overlay"]');
  expect(overlay.getAttribute('data-overlay-color')).toBe('#0b3b2e');
  expect(overlay.getAttribute('data-overlay-opacity')).toBe('80');
  expect(overlay.getAttribute('data-overlay-blur')).toBe('14');

  // عنوان‌ها و فیلدهای فرم ورود
  expect(container.textContent).toContain('خوش آمدید');
  expect(container.textContent).toContain('ورود اطلاعات');
  expect(container.textContent).toContain('شرکت');
  expect(container.textContent).toContain('نام کاربری');
  expect(container.textContent).toContain('رمز عبور');
  expect(container.textContent).toContain('ورود');

  // کارت ورود روی همان صحنهٔ چرخش می‌نشیند (پس‌زمینه بیرون از کارت است)
  const flip = container.querySelector('[data-testid="login-flip"]');
  expect(flip).toBeTruthy();
  expect(flip.getAttribute('data-flip-step')).toBe('credentials');
  expect(flip.querySelector('[data-testid="login-card"]')).toBeTruthy();

  // در فیلد انتخاب شرکت، لوگوی همان شرکت کنار نامش نمایش داده می‌شود (نه آیکن عمومی)
  const companyField = container.querySelector('.MuiAutocomplete-root');
  expect(companyField).toBeTruthy();
  expect(companyField.querySelector('img')).toBeTruthy();

  root.unmount();
  container.remove();
});
