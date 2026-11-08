import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import CorrespondenceLettersPage from '../pages/correspondence/CorrespondenceLettersPage';
import CorrespondenceDashboardPage from '../pages/correspondence/CorrespondenceDashboardPage';
import CorrespondenceWorkdeskPage from '../pages/correspondence/CorrespondenceWorkdeskPage';
import { getModuleLandingPath, MODULE_ICONS } from '../core/constants/moduleIcons';
import { toJalali } from '../core/utils/dateUtils';
import { deltaPercent } from '../pages/correspondence/correspondenceStudioUi';

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

jest.mock('../core/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    user: {
      id: 11,
      username: 'mahdieh',
      is_superuser: false,
      is_full_access: false,
      permissions: { can_delete_documents: false },
      fine_permissions: { 'correspondence.incoming.delete': true },
    },
    isAuthenticated: true,
  }),
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
    entry_method: 'manual', entry_method_display: 'دستی', entry_time: '09:30:00',
    entered_by_name: 'خانم حقیقی', entered_by_label: 'خانم حقیقی',
    company_reg_no: '140400123', company_reg_date: iso(-2),
    unit_reg_no: 'د-88', unit_reg_date: iso(-2), unit_name: 'دبیرخانه',
    sender_organization_name: 'شرکت ناظر', sender_title: 'ناظر پروژه',
    category: 1, category_title: 'درخواست', attachment_count: 2, referral_count: 1,
    last_referral: { id: 9, seq: 1, to_name: 'واحد مالی', to_user_name: '', referred_on: iso(-1), status: 'pending' },
    events: [{ id: 1, action: 'created', action_display: 'ایجاد', note: '', actor_name: 'مدیر', created_at: iso(-3) }],
    referrals: [{
      id: 9, seq: 1, from_user_name: 'مدیر مکاتبات', to_name: 'واحد مالی', to_user_name: '',
      referred_on: iso(-1), due_date: iso(3), instruction: 'بررسی و اعلام نظر', note: '',
      status: 'pending', status_display: 'در انتظار اقدام', response: '', result: '',
      result_note: '', answered_on: null, answered_by_name: '', is_overdue: false,
    }],
    attachments: [], days_to_due: 5, is_overdue: false,
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

const cartable = {
  counts: { total: 2, action: 1, info: 1, comment: 0, pending: 1, done: 1, overdue: 1, unseen: 1 },
  total: 1,
  results: [{
    id: 11, letter: 1, letter_number: '1404-100-135',
    letter_subject: 'معرفی شرکت جهت اخذ ردیف پیمان', letter_direction: 'incoming',
    letter_priority: 'urgent', letter_status: 'in_progress', seq: 1, parent: null,
    purpose: 'action', purpose_display: 'اقدام / انجام کار',
    from_user_name: 'مدیر مکاتبات', from_employee_name: 'مدیر مکاتبات',
    to_user_name: '', to_employee: 5, to_employee_name: 'خانم حقیقی',
    to_employee_code: '1024', to_name: '', target_label: 'خانم حقیقی',
    referred_on: iso(-1), due_date: iso(-2), instruction: 'بررسی و اعلام نظر',
    note: 'فوری پیگیری شود', margin_note: '', seen_at: null, status: 'pending',
    status_display: 'در انتظار اقدام', response: '', result: '', result_note: '',
    answered_on: null, answered_by_name: '', done_at: null, is_overdue: true,
  }],
};

const requestTypes = {
  results: [
    { id: 1, code: 'leave', name: 'مرخصی استحقاقی', requires_attachment: false, approval_levels: 2 },
    { id: 2, code: 'loan', name: 'وام کارکنان', requires_attachment: true, approval_levels: 3 },
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
    if (url === '/letters/') return Promise.resolve({ data: { results: letters } });
    if (url === '/letters/1/') {
      return Promise.resolve({
        data: {
          ...letters[0],
          attachments: [
            {
              id: 71, letter: 1, title: 'scan-1404-100.pdf', kind: 'letter',
              kind_display: 'نامه', file_url: '/media/correspondences/letters/scan-1404-100.pdf',
              size: 2097152, uploaded_by_name: 'خانم حقیقی', created_at: iso(-2),
            },
            {
              id: 72, letter: 1, title: 'پیوست-دوم.jpg', kind: 'attachment',
              kind_display: 'پیوست', file_url: '/media/correspondences/letters/second.jpg',
              size: 4096, uploaded_by_name: 'خانم حقیقی', created_at: iso(-2),
            },
          ],
        },
      });
    }
    if (url === '/letters/stats/') return Promise.resolve({ data: stats });
    if (url === '/letters/meta/') return Promise.resolve({ data: meta });
    if (url === '/letter-referrals/') return Promise.resolve({ data: { results: [] } });
    if (url === '/organizations/') return Promise.resolve({ data: { results: [{ id: 1, name: 'شرکت ساز و کار' }] } });
    if (url === '/users/') return Promise.resolve({ data: [{ id: 1, username: 'admin', first_name: 'مدیر', last_name: 'سیستم' }] });
    if (url === '/correspondents/') return Promise.resolve({ data: { results: [] } });
    if (url === '/letter-referrals/cartable/') return Promise.resolve({ data: cartable });
    if (url === '/letter-request-types/') return Promise.resolve({ data: requestTypes });
    if (url === '/letter-requests/') return Promise.resolve({ data: { results: [] } });
    return Promise.resolve({ data: [] });
  });
});

const renderPage = async (element, entry = '/correspondence/letters?direction=incoming') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
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

  // ویجت‌های کاربردی و استودیویی داشبورد
  expect(container.textContent).toContain('صف اقدام امروز');
  expect(container.textContent).toContain('دسترسی سریع');
  expect(container.textContent).toContain('نسبت مکاتبات اسکن‌شده');
  expect(container.textContent).toContain('وضعیت پرونده‌ها');
  expect(container.textContent).toContain('نوع مکاتبه');
  expect(container.textContent).toContain('طرف حساب‌های فعال');
  expect(container.textContent).toContain('نامه‌های وارده بدون اسکن');

  root.unmount();
  container.remove();
});

test('dashboard month-over-month deltas and scanned ratio are computed from stats', () => {
  expect(deltaPercent(10, 15)).toBe(50);
  expect(deltaPercent(0, 4)).toBe(100);
  expect(deltaPercent(0, 0)).toBe(0);
  expect(deltaPercent(8, 6)).toBe(-25);
});


test('correspondence module opens its own dashboard (not the HRMS one)', () => {
  expect(getModuleLandingPath('correspondence')).toBe('/correspondence');
  expect(getModuleLandingPath('hrms')).toBe('/dashboard');
  expect(MODULE_ICONS.correspondence).toBeTruthy();
});

test('dedicated incoming page is scoped to incoming letters and has no extra filters', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="incoming" />);

  expect(container.textContent).toContain('نامه‌های وارده');
  // توضیحات زیر عنوان در این ماژول حذف شده است
  expect(container.textContent).not.toContain('نامه‌های دریافتی از سازمان‌ها و اشخاص');
  expect(container.querySelector('input[placeholder*="نامه‌های وارده"]')).toBeTruthy();
  expect(container.textContent).not.toContain('کل مکاتبات');

  // ستون‌های دفتر وارده (چیدمان استاندارد و ساده)
  expect(container.textContent).toContain('تاریخ ورود');
  expect(container.textContent).toContain('شماره نامه');
  expect(container.textContent).toContain('طرف حساب');
  expect(container.textContent).toContain('موضوع نامه');
  expect(container.textContent).toContain('تاریخ نامه');
  expect(container.textContent).toContain('ارجاع');
  expect(container.textContent).toContain('عملیات');
  expect(container.textContent).toContain('شرکت ساز و کار');
  expect(container.textContent).toContain('معرفی شرکت جهت اخذ ردیف پیمان');
  // تاریخ‌ها شمسی و با اعداد فارسی
  expect(container.textContent).toContain(toJalali(letters[0].received_date));
  expect(container.textContent).toContain(toJalali(letters[0].letter_date));
  expect(container.textContent).not.toContain('09:30');

  root.unmount();
  container.remove();
});

test('letter detail opens as a centered dialog with grouped sections', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="incoming" />);
  const table = container.querySelector('[aria-label="فهرست مکاتبات اداری"]');
  const rows = table.querySelectorAll('tbody tr');
  await act(async () => {
    rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(300);
  });

  expect(document.querySelector('[role="dialog"]')).toBeTruthy();
  expect(document.body.textContent).toContain('ثبت و ورود');
  expect(document.body.textContent).toContain('شماره‌های ثبت');
  expect(document.body.textContent).toContain('طرفین مکاتبه');
  expect(document.body.textContent).toContain('شماره ثبت ورود به شرکت');
  expect(document.body.textContent).toContain('نحوهٔ ورود');

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

test('letters table supports grid-style inline row editing', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="incoming" />);

  const editButton = container.querySelector('[aria-label="ویرایش ردیف"]');
  expect(editButton).toBeTruthy();
  await act(async () => {
    editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(220);
  });

  expect(container.querySelector('[aria-label="ذخیرهٔ ردیف"]')).toBeTruthy();
  expect(container.querySelector('[aria-label="انصراف از ویرایش"]')).toBeTruthy();
  expect(container.textContent).toContain('ذخیرهٔ تغییرات');
  // ورودی‌های درجا داخل همان ردیف ظاهر می‌شوند
  expect(container.querySelectorAll('tbody input').length).toBeGreaterThan(3);

  root.unmount();
  container.remove();
});

test('letters table shows the standard incoming column set', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="incoming" />);

  const headers = [...container.querySelectorAll('thead th')].map((cell) => cell.textContent.trim());
  expect(headers).toEqual([
    'تاریخ ورود', 'شماره نامه', 'طرف حساب', 'موضوع نامه', 'تاریخ نامه', 'ارجاع', 'عملیات',
  ]);

  root.unmount();
  container.remove();
});

test('incoming row exposes an inline attachment preview without downloading', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="incoming" />);

  const previewButton = container.querySelector('[aria-label="مشاهدهٔ پیوست"]');
  expect(previewButton).toBeTruthy();

  await act(async () => {
    previewButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(400);
  });

  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).toBeTruthy();
  expect(dialog.querySelector('iframe')).toBeTruthy();
  expect(dialog.textContent).toContain('scan-1404-100.pdf');
  expect(dialog.textContent).toContain('دریافت فایل');
  expect(dialog.textContent).toContain('باز کردن در تب جدید');
  expect(dialog.querySelector('[aria-label="پیوست بعدی"]')).toBeTruthy();

  const nextButton = [...dialog.querySelectorAll('[aria-label="پیوست بعدی"]')]
    .find((node) => node.tagName === 'BUTTON');
  expect(nextButton).toBeTruthy();
  await act(async () => {
    nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(260);
  });
  expect(document.body.textContent).toContain('پیوست-دوم.jpg');
  expect(document.body.textContent).toContain('پیوست ۲ از ۲');

  root.unmount();
  container.remove();
});

test('letter drawer attachment tab shows a preview action per file', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="incoming" />);

  const rows = container.querySelectorAll('tbody tr');
  await act(async () => {
    rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(400);
  });

  const attachmentsTab = [...document.querySelectorAll('[role="tab"]')]
    .find((tab) => tab.textContent.includes('پیوست'));
  expect(attachmentsTab).toBeTruthy();
  await act(async () => {
    attachmentsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(320);
  });

  expect(document.body.textContent).toContain('scan-1404-100.pdf');
  const viewButton = document.querySelector('[aria-label="مشاهدهٔ پیوست"]');
  expect(viewButton).toBeTruthy();
  await act(async () => {
    viewButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(320);
  });

  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.querySelector('iframe'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('scan-1404-100.pdf');

  root.unmount();
  container.remove();
});

test('outgoing page shows its own date column and send-oriented labels', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="outgoing" />);

  expect(container.textContent).toContain('نامه‌های صادره');
  const table = container.querySelector('[aria-label="فهرست مکاتبات اداری"]');
  expect(table).toBeTruthy();
  // ستون تاریخ ارسال مخصوص دفتر صادره
  expect(container.textContent).toContain('تاریخ ارسال');
  expect(container.textContent).toContain('طرف مکاتبه');
  // فیلترهای جهت و وضعیت مخصوص این صفحه حذف شده‌اند
  expect(container.textContent).toContain('تاریخ نامه');

  const newButton = [...container.querySelectorAll('button')]
    .find((node) => node.textContent.includes('نامه صادره جدید'));
  expect(newButton).toBeTruthy();
  await act(async () => {
    newButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(320);
  });

  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('ثبت نامهٔ جدید'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('ثبت و ارسال');
  expect(dialog.textContent).toContain('شماره اندیکاتور');
  expect(dialog.textContent).toContain('شماره نامهٔ طرف مقابل');
  expect(dialog.textContent).toContain('نوع ارسال');
  expect(dialog.textContent).not.toContain('شماره ثبت ورود به شرکت');

  root.unmount();
  container.remove();
});

test('delete permission exposes row delete action and attachment delete button', async () => {
  const { container, root } = await renderPage(<CorrespondenceLettersPage mode="incoming" />);

  const moreButton = container.querySelector('[aria-label="عملیات بیشتر"]');
  expect(moreButton).toBeTruthy();
  await act(async () => {
    moreButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(260);
  });
  const rowDelete = [...document.querySelectorAll('[role="menuitem"]')]
    .find((item) => item.textContent.includes('حذف نامه'));
  expect(rowDelete).toBeTruthy();

  const rows = container.querySelectorAll('tbody tr');
  await act(async () => {
    rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(400);
  });
  const attachmentsTab = [...document.querySelectorAll('[role="tab"]')]
    .find((tab) => tab.textContent.includes('پیوست'));
  expect(attachmentsTab).toBeTruthy();
  await act(async () => {
    attachmentsTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(320);
  });
  expect(document.querySelector('[aria-label="حذف پیوست"]')).toBeTruthy();
  expect(document.body.textContent).not.toContain('دسترسی غیرمجاز');

  root.unmount();
  container.remove();
});

test('letters list request carries the URL search and attachment filters', async () => {
  const { container, root } = await renderPage(
    <CorrespondenceLettersPage mode="incoming" />,
    '/correspondence/incoming?q=آزمایشی&has_attachments=0',
  );

  const listCalls = axiosInstance.get.mock.calls.filter(([url]) => url === '/letters/');
  expect(listCalls.length).toBeGreaterThan(0);
  const params = listCalls[listCalls.length - 1][1].params;
  expect(params.has_attachments).toBe('0');
  expect(params.search).toBe('آزمایشی');
  expect(params.direction).toBe('incoming');

  root.unmount();
  container.remove();
});

test('workdesk page renders cartable counters, referrals and actions', async () => {
  const { container, root } = await renderPage(<CorrespondenceWorkdeskPage />);

  expect(container.textContent).toContain('کارتابل من');
  expect(container.textContent).toContain('نیازمند اقدام');
  expect(container.textContent).toContain('برای اطلاع');
  expect(container.textContent).toContain('دیده‌نشده');
  expect(container.textContent).toContain('معرفی شرکت جهت اخذ ردیف پیمان');
  expect(container.textContent).toContain('بررسی و اعلام نظر');
  expect(container.textContent).toContain('در انتظار اقدام');
  expect(container.querySelector('[aria-label="مشاهدهٔ ارجاع"]')).toBeTruthy();
  expect(container.querySelector('[aria-label="ثبت نتیجه"]')).toBeTruthy();

  root.unmount();
  container.remove();
});


