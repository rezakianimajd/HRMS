import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import CorrespondenceLettersPage from '../pages/correspondence/CorrespondenceLettersPage';
import CorrespondenceDashboardPage from '../pages/correspondence/CorrespondenceDashboardPage';
import { getModuleLandingPath, MODULE_ICONS } from '../core/constants/moduleIcons';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { contracts: '#f59e0b', correspondence: '#0ea5e9' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'correspondence' }, applications: [] }),
}));

const iso = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const letters = [
  {
    id: 1, direction: 'incoming', number: '1404-100-135', external_number: '', indicator_no: 'IND-1',
    subject: 'معرفی شرکت جهت اخذ ردیف پیمان', summary: 'معرفی و ارسال مدارک', letter_date: iso(-3),
    received_date: iso(-2), due_date: iso(5), organization: 1, organization_name: 'شرکت ساز و کار',
    sender_name: 'آقای اسدنژاد', status: 'in_progress', priority: 'urgent', confidentiality: 'normal',
    category: 1, category_title: 'درخواست', attachment_count: 2, referral_count: 1,
    last_referral: { id: 9, seq: 1, to_name: 'واحد مالی', to_user_name: '', referred_on: iso(-1), status: 'pending' },
    events: [{ id: 1, action: 'created', action_display: 'ایجاد', note: '', actor_name: 'مدیر', created_at: iso(-3) }],
    referrals: [], attachments: [], days_to_due: 5, is_overdue: false,
  },
  {
    id: 2, direction: 'outgoing', number: 'ص/1404/007', indicator_no: '', subject: 'ارسال الحاقیه شماره ۳',
    summary: '', letter_date: iso(-10), sent_date: iso(-10), due_date: iso(-2), organization: 2,
    organization_name: 'تأمین اجتماعی', status: 'registered', priority: 'normal', confidentiality: 'normal',
    category: 2, category_title: 'ارسال', attachment_count: 0, referral_count: 0, last_referral: null,
    events: [], referrals: [], attachments: [], days_to_due: -2, is_overdue: true,
  },
];

const stats = {
  totals: {
    all: 2, incoming: 1, outgoing: 1, internal: 0, open: 1, overdue: 1, drafts: 0, archived: 0,
    incoming_this_month: 1, outgoing_this_month: 1, urgent: 1, my_referrals: 1, my_overdue_referrals: 0,
  },
  by_status: { in_progress: 1, registered: 1 },
  by_direction: { incoming: 1, outgoing: 1 },
  by_priority: { urgent: 1, normal: 1 },
  trend: [{ period: '2026-09', incoming: 1, outgoing: 0, internal: 0 }, { period: '2026-10', incoming: 0, outgoing: 1, internal: 0 }],
  top_organizations: [],
  recent: { incoming: [], outgoing: [], overdue: [{ id: 2, subject: 'ارسال الحاقیه شماره ۳', due_date: iso(-2), organization_name: 'تأمین اجتماعی' }] },
};

const meta = {
  directions: [{ value: 'incoming', label: 'وارده' }, { value: 'outgoing', label: 'صادره' }],
  statuses: [{ value: 'registered', label: 'ثبت‌شده' }],
  priorities: [{ value: 'normal', label: 'عادی' }],
  confidentialities: [{ value: 'normal', label: 'عادی' }],
  categories: [{ id: 1, name: 'درخواست', direction: 'both' }, { id: 2, name: 'ارسال', direction: 'outgoing' }],
  series: [{ id: 1, title: 'صادره اصلی', direction: 'outgoing', preview: 'ص/1404/008' }],
  defaults: { incoming: { series: null, number_preview: '' }, outgoing: { series: 1, number_preview: 'ص/1404/008' } },
};

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/letters/') return Promise.resolve({ data: { results: letters } });
    if (url === '/letters/stats/') return Promise.resolve({ data: stats });
    if (url === '/letters/meta/') return Promise.resolve({ data: meta });
    if (url === '/letter-referrals/') return Promise.resolve({ data: { results: [] } });
    if (url === '/organizations/') return Promise.resolve({ data: { results: [{ id: 1, name: 'شرکت ساز و کار' }] } });
    if (url === '/users/') return Promise.resolve({ data: [{ id: 1, username: 'admin', first_name: 'مدیر', last_name: 'سیستم' }] });
    if (url === '/correspondents/') return Promise.resolve({ data: { results: [] } });
    return Promise.resolve({ data: [] });
  });
});

const renderPage = async (element) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/correspondence/letters?direction=incoming']}>
          {element}
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

test('letters page renders header, stats, toolbar, table and drawer', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage />);

  expect(container.textContent).toContain('دفتر مکاتبات اداری');
  expect(container.textContent).toContain('خروجی اکسل');
  expect(container.textContent).toContain('نامه صادره');
  expect(container.textContent).toContain('کل مکاتبات');
  expect(container.textContent).toContain('ارجاعات من');
  expect(container.textContent).toContain('مکاتبه از مهلت پاسخ گذشته است');

  expect(container.querySelector('input[placeholder*="جستجو"]')).toBeTruthy();
  const table = container.querySelector('[aria-label="فهرست مکاتبات اداری"]');
  expect(table).toBeTruthy();
  expect(container.textContent).toContain('شماره نامه');
  expect(container.textContent).toContain('موضوع');
  expect(container.textContent).toContain('طرف مکاتبه');
  expect(container.textContent).toContain('مهلت پاسخ');
  expect(container.textContent).toContain('وضعیت');
  expect(container.textContent).toContain('معرفی شرکت جهت اخذ ردیف پیمان');
  expect(container.textContent).toContain('شرکت ساز و کار');
  expect(container.textContent).toContain('در جریان');

  // باز کردن پروندهٔ نامه از طریق کلیک روی ردیف
  const rows = table.querySelectorAll('tbody tr');
  expect(rows.length).toBeGreaterThan(0);
  await act(async () => {
    rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(250);
  });
  expect(document.body.textContent).toContain('مشخصات');
  expect(document.body.textContent).toContain('ارجاعات');
  expect(document.body.textContent).toContain('پیوست‌ها');
  expect(document.body.textContent).toContain('تاریخچه');
  expect(document.body.textContent).toContain('معرفی شرکت جهت اخذ ردیف پیمان');

  root.unmount();
  container.remove();
});

test('dashboard page shows KPI tiles, trend and follow-up sections', async () => {
  const { container, root } = await renderPage(<CorrespondenceDashboardPage />);

  expect(container.textContent).toContain('داشبورد مکاتبات اداری');
  expect(container.textContent).toContain('نامه‌های وارده');
  expect(container.textContent).toContain('معوقات پاسخ');
  expect(container.textContent).toContain('روند مکاتبات');
  expect(container.textContent).toContain('ارجاعات باز من');
  expect(container.textContent).toContain('آخرین نامه‌های وارده');
  expect(container.textContent).toContain('آخرین نامه‌های صادره');
  expect(container.textContent).toContain('ارسال الحاقیه شماره ۳');

  root.unmount();
  container.remove();
});


test('correspondence module opens its own dashboard (not the HRMS one)', () => {
  expect(getModuleLandingPath('correspondence')).toBe('/correspondence');
  expect(getModuleLandingPath('hrms')).toBe('/dashboard');
  expect(MODULE_ICONS.correspondence).toBeTruthy();
});

test('dedicated incoming page is scoped to incoming letters and has no extra filters', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="incoming" />);

  expect(container.textContent).toContain('نامه‌های وارده');
  expect(container.textContent).toContain('نامه‌های دریافتی از سازمان‌ها و اشخاص');
  expect(container.querySelector('input[placeholder*="نامه‌های وارده"]')).toBeTruthy();
  // در صفحهٔ اختصاصی، کارت‌های خلاصهٔ دفتر کل نمایش داده نمی‌شوند
  expect(container.textContent).not.toContain('کل مکاتبات');

  root.unmount();
  container.remove();
});

test('drafts page shows its own professional header', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="drafts" />);

  expect(container.textContent).toContain('پیش‌نویس‌های مکاتبات');
  expect(container.textContent).toContain('مکاتبه جدید');

  root.unmount();
  container.remove();
});


