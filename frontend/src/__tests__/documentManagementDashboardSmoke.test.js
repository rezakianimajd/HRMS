import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import DocumentManagementDashboardPage from '../pages/contracts/DocumentManagementDashboardPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { documents: '#0f766e' },
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
      is_superuser: true,
      permissions: { can_manage_documents: true },
    },
  }),
}));

const folders = [
  { id: 1, name: 'مدارک و مستندات شرکت', parent: null, code: 'company.documents', color: '#0f172a', documents_count: 1, children_count: 10, is_system: true },
  { id: 2, name: 'پرسنل', parent: null, code: 'hr.employees', color: '#ec4899', documents_count: 2, children_count: 6, is_system: true },
];
const documents = [
  { id: 1, title: 'روزنامه رسمی تأسیس', folder: 1, folder_path: 'مدارک و مستندات شرکت', status: 'active', file_size: 120000, created_at: '2026-10-01T08:00:00Z', expiry_date: null },
];
const stats = {
  total: 1, active: 1, archived: 0, expiring_soon: 0, expired: 0,
  storage_bytes: 120000, folders: 2,
  storage_policy: { root_folder: 'documents', entity_folder_pattern: '{folder}_{name}', subfolders: [], max_file_size_mb: 50, include_company: true, path_preview: 'company_1/documents' },
};

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/document-management/stats/') return Promise.resolve({ data: stats });
    if (url === '/document-management/documents/') return Promise.resolve({ data: documents });
    if (url === '/document-management/folders/') return Promise.resolve({ data: folders });
    if (url === '/document-management/activities/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
});

test('document dashboard renders identity, folder structure and storage overview', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/document-management']}>
          <DocumentManagementDashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(750);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(160); });
  }

  expect(container.textContent).toContain('داشبورد اسناد');
  expect(container.textContent).toContain('ساختار کتابخانه');
  expect(container.textContent).toContain('مدارک و مستندات شرکت');
  expect(container.textContent).toContain('فضای بایگانی');
  expect(container.textContent).toContain('سیاست ذخیره‌سازی');

  root.unmount();
  container.remove();
});
