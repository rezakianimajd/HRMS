import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import DocumentManagementPage from '../pages/DocumentManagementPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { contracts: '#f59e0b' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'documents' }, applications: [] }),
}));

jest.mock('../core/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    user: {
      id: 1,
      first_name: 'مدیر',
      last_name: 'بایگانی',
      is_superuser: true,
      permissions: {
        can_manage_documents: true,
        can_approve_documents: true,
        can_publish_documents: true,
        can_delete_documents: true,
      },
    },
  }),
}));

const folders = [
  { id: 1, name: 'قراردادها', parent: null, path: 'قراردادها', color: '#0f766e', documents_count: 1, children_count: 1 },
  { id: 2, name: 'قراردادهای جاری', parent: 1, path: 'قراردادها / قراردادهای جاری', color: '#2563eb', documents_count: 1, children_count: 0 },
  { id: 3, name: 'مدارک و مستندات شرکت', parent: null, code: 'company.documents', path: 'مدارک و مستندات شرکت', color: '#0f172a', documents_count: 0, children_count: 10, is_system: true },
  { id: 4, name: 'پرسنل', parent: null, code: 'archive.employees', path: 'پرسنل', color: '#0ea5e9', documents_count: 4, children_count: 0 },
];
const documents = [
  {
    id: 10, title: 'قرارداد پیمانکاری سالن تولید', folder: 1, folder_name: 'قراردادها',
    folder_path: 'قراردادها', description: 'نسخه امضاشده قرارداد', tags: 'قرارداد, تولید',
    tags_list: ['قرارداد', 'تولید'], reference_number: 'DOC-1405-001',
    issue_date: '2026-01-10', expiry_date: '2027-01-10', retention_until: '2032-01-10',
    confidentiality: 'confidential', confidentiality_display: 'محرمانه', status: 'active',
    status_display: 'فعال', is_locked: false, current_version: 22, version_count: 2,
    file_url: 'https://example.test/media/contract.pdf', file_name: 'contract.pdf',
    file_extension: '.pdf', file_size: 2400000, file_size_display: '2.3 MB',
    storage_path: 'archive/company_1/documents/قراردادها_قرارداد_پیمانکاری/abc.pdf',
    mime_type: 'application/pdf', created_by_name: 'مدیر بایگانی', updated_by_name: 'مدیر بایگانی',
    is_expired: false, days_until_expiry: 200, created_at: '2026-01-10T08:00:00Z',
    versions: [
      { id: 22, version_number: 2, original_name: 'contract.pdf', file_size_display: '2.3 MB', file_url: 'https://example.test/media/contract.pdf', created_by_name: 'مدیر بایگانی', created_at: '2026-01-12T08:00:00Z' },
      { id: 21, version_number: 1, original_name: 'contract-v1.pdf', file_size_display: '2.1 MB', file_url: 'https://example.test/media/contract-v1.pdf', created_by_name: 'مدیر بایگانی', created_at: '2026-01-10T08:00:00Z' },
    ],
  },
  {
    id: 11, title: 'مجوز فعالیت کارگاه', folder: 2, folder_name: 'قراردادهای جاری',
    folder_path: 'قراردادها / قراردادهای جاری', description: '', tags: 'مجوز',
    tags_list: ['مجوز'], reference_number: 'DOC-1405-002', issue_date: '2025-06-01',
    expiry_date: '2026-06-01', retention_until: null, confidentiality: 'internal',
    confidentiality_display: 'داخلی', status: 'draft', status_display: 'پیش‌نویس',
    is_locked: false, current_version: 23, version_count: 1,
    file_url: 'https://example.test/media/license.pdf', file_name: 'license.pdf',
    file_extension: '.pdf', file_size: 640000, file_size_display: '625 KB', mime_type: 'application/pdf',
    created_by_name: 'مدیر بایگانی', updated_by_name: '', is_expired: false,
    days_until_expiry: 20, created_at: '2026-01-09T08:00:00Z', versions: [],
  },
  ...[
    ['عکس پرسنلی', 'photo.jpg', '.jpg', 'photo', 100],
    ['شناسنامه', 'birth.pdf', '.pdf', 'birth', 101],
    ['کارت ملی', 'national-id.jpg', '.jpg', 'national', 102],
    ['مدرک تحصیلی', 'degree.pdf', '.pdf', 'education', 103],
  ].map(([title, fileName, ext, key, id]) => ({
    id, title, folder: 4, folder_name: '1001_علی_رضایی',
    folder_path: 'پرسنل / 1001_علی_رضایی', description: `${title} ثبت‌شده در پرونده`,
    tags: 'پرسنل', confidentiality: 'internal', confidentiality_display: 'داخلی',
    status: 'active', status_display: 'فعال', workflow_status: 'published',
    workflow_status_display: 'منتشرشده', document_type: 'hr',
    document_type_display: 'سند منابع انسانی', is_locked: false,
    current_version: 200 + id, version_count: 1,
    file_url: `https://example.test/media/${fileName}`, file_name: fileName,
    file_extension: ext, file_size: 180000, file_size_display: '176 KB',
    related_entity_type: 'archive.employees', related_entity_label: '1001_علی_رضایی',
    created_by_name: 'مدیر بایگانی', updated_by_name: '', is_expired: false,
    created_at: '2025-12-01T08:00:00Z', versions: [], key,
  })),
];
const stats = {
  total: 2, active: 1, archived: 0, expiring_soon: 1, expired: 0,
  storage_bytes: 3040000, folders: 2,
  storage_policy: {
    module_key: 'hr.documents.management', module_name: 'مدیریت اسناد و مدارک',
    root_folder: 'documents', entity_folder_pattern: '{folder}_{name}',
    subfolders: ['نسخه‌ها', 'پیوست‌ها'], max_file_size_mb: 50,
    include_company: true, path_preview: 'company_1/documents',
  },
  recent_activity: [],
};
const activity = {
  id: 1, document: 10, document_title: 'قرارداد پیمانکاری سالن تولید',
  action: 'new_version', action_display: 'ثبت نسخه جدید', user_name: 'مدیر بایگانی',
  created_at: '2026-01-12T08:00:00Z',
};
const employees = [{
  id: 7, employee_id: '1001', full_name: 'علی رضایی',
  first_name: 'علی', last_name: 'رضایی', department_name: 'فنی',
  job_title_name: 'کارشناس', photo_url: 'https://example.test/media/employee-photo.jpg',
}];

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/document-management/folders/') return Promise.resolve({ data: folders });
    if (url === '/document-management/documents/') return Promise.resolve({ data: documents });
    if (url === '/document-management/stats/') return Promise.resolve({ data: stats });
    if (url === '/document-management/activities/') return Promise.resolve({ data: [activity] });
    if (url === '/employees/') return Promise.resolve({ data: { count: employees.length, next: null, results: employees } });
    return Promise.resolve({ data: [] });
  });
});

test('document management page renders library, folder tree, detail drawer and upload dialog', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/document-management']}>
          <DocumentManagementPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(800);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('کتابخانه اسناد');
  expect(container.textContent).toContain('پوشه‌های اسناد');
  expect(container.textContent).toContain('مدارک و مستندات شرکت');
  expect(container.textContent).toContain('قراردادها');
  expect(container.textContent).toContain('قرارداد پیمانکاری سالن تولید');
  expect(container.textContent).toContain('مجوز فعالیت کارگاه');
  expect(container.textContent).toContain('سیاست ذخیره‌سازی');
  expect(container.textContent).toContain('documents');

  const detailButton = Array.from(container.querySelectorAll('button'))
    .find((element) => element.textContent.trim() === 'جزئیات');
  expect(detailButton).toBeTruthy();
  await act(async () => { detailButton.click(); await wait(300); });

  expect(document.body.textContent).toContain('مشخصات فایل');
  expect(document.body.textContent).toContain('نسخه‌ها');
  expect(document.body.textContent).toContain('تاریخچه فعالیت');
  expect(document.body.textContent).toContain('نسخه ۲');

  const closeButton = Array.from(document.querySelectorAll('button'))
    .find((element) => element.querySelector('svg[data-testid="CloseIcon"]'));
  if (closeButton) await act(async () => { closeButton.click(); await wait(200); });

  const uploadButton = Array.from(container.querySelectorAll('button'))
    .find((element) => element.textContent.trim() === 'آپلود سند');
  expect(uploadButton).toBeTruthy();
  await act(async () => { uploadButton.click(); await wait(300); });

  expect(document.body.textContent).toContain('آپلود سند جدید');
  expect(document.body.textContent).toContain('عنوان سند *');
  expect(document.body.textContent).toContain('سطح محرمانگی');

  root.unmount();
  container.remove();
});

test('personnel library shows employee cards and grouped document dialog', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/document-management/library?folder=4']}>
          <DocumentManagementPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(900);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(180); });
  }

  expect(container.textContent).toContain('کتابخانه اسناد · پرسنل');
  expect(container.textContent).toContain('علی رضایی');
  expect(container.textContent).toContain('شماره پرسنلی: ۱۰۰۱');
  expect(container.textContent).toContain('مشاهده');

  const viewButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.trim() === 'مشاهده');
  expect(viewButton).toBeTruthy();
  await act(async () => { viewButton.click(); await wait(300); });

  expect(document.body.textContent).toContain('عکس پرسنلی');
  expect(document.body.textContent).toContain('شناسنامه');
  expect(document.body.textContent).toContain('کارت ملی');
  expect(document.body.textContent).toContain('مدرک تحصیلی');
  expect(document.body.textContent).toContain('ثبت‌شده در پرونده');

  root.unmount();
  container.remove();
});
