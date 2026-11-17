import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import OrganizationalDocumentsPanel from '../pages/documents/OrganizationalDocumentsPanel';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const wait = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

test('organizational documents dialog lists folders before documents', async () => {
  axiosInstance.get.mockImplementation((url, options = {}) => {
    if (url === '/document-management/folders/') {
      return Promise.resolve({
        data: [
          {
            id: 1, name: 'مدارک و مستندات شرکت', code: 'company.documents',
            parent: null, path: 'مدارک و مستندات شرکت', color: '#0f172a',
            order: 0, documents_count: 2, children_count: 1,
          },
          {
            id: 2, name: 'مدارک ثبت شرکت', code: 'company.documents.1',
            parent: 1, path: 'مدارک و مستندات شرکت / مدارک ثبت شرکت',
            color: '#2563eb', order: 1, documents_count: 1, children_count: 0,
          },
        ],
      });
    }
    if (url === '/document-management/documents/') {
      return Promise.resolve({
        data: {
          results: [{
            id: 9, title: 'اساسنامه شرکت', document_type: 'company',
            document_type_display: 'مدارک شرکت', confidentiality: 'internal',
            confidentiality_display: 'داخلی', file_name: 'asasname.pdf',
            file_extension: '.pdf', file_size: 1200, file_size_display: '1.2 KB',
            issue_date: '2026-01-01',
          }],
        },
      });
    }
    return Promise.resolve({ data: [] });
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <OrganizationalDocumentsPanel />
      </QueryClientProvider>,
    );
  });
  await act(async () => { await wait(400); });

  expect(container.textContent).toContain('مدارک و مستندات شرکت');
  expect(container.textContent).toContain('پوشه‌های اسناد سازمانی');

  const folderButton = [...container.querySelectorAll('button')]
    .find((button) => button.textContent.includes('مدارک و مستندات شرکت'));
  expect(folderButton).toBeTruthy();
  await act(async () => {
    folderButton.click();
    await wait(100);
  });
  expect(container.textContent).toContain('مدارک ثبت شرکت');
  expect(container.textContent).toContain('اسناد این پوشه');

  act(() => root.unmount());
  container.remove();
});
