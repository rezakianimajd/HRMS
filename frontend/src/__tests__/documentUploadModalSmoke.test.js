import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import DocumentUploadModal from '../core/components/employee/DocumentUploadModal';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => {
      const labels = {
        'documents.upload_document': 'بارگذاری مدرک',
        'documents.upload': 'بارگذاری',
        'documents.document_title': 'عنوان مدرک',
        'documents.document_type': 'نوع مدرک',
        'documents.issue_date': 'تاریخ صدور',
        'documents.expiry_date': 'تاریخ انقضا',
        'documents.document_number': 'شماره مدرک',
        'documents.drag_drop': 'فایل را اینجا رها کنید',
        'documents.upload_error': 'خطا در بارگذاری',
        'employees.description': 'توضیحات',
        'common.cancel': 'انصراف',
        'validation.required': 'این فیلد الزامی است.',
      };
      return labels[key] || fallback || key;
    },
  }),
}));

const docTypes = [
  { id: 5, name: 'شناسنامه', archive_subfolder: 'مدارک هویتی' },
  { id: 6, name: 'قرارداد کار', archive_subfolder: 'قراردادها' },
];

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  axiosInstance.get.mockImplementation((url) => {
    if (String(url).includes('/documents/types/')) return Promise.resolve({ data: docTypes });
    return Promise.resolve({ data: [] });
  });
  axiosInstance.post.mockReset();
  axiosInstance.post.mockResolvedValue({ data: { id: 91, employee: 3, title: 'scan' } });
});

test('uploading a document from the personnel file posts multipart data with employee and type', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onSuccess = jest.fn();

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/employees/3']}>
          <DocumentUploadModal employeeId={3} onClose={() => {}} onSuccess={onSuccess} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(300);
  });

  const fileInput = document.querySelector('input[type="file"]');
  expect(fileInput).toBeTruthy();

  const file = new File(['%PDF-1.4 test'], 'scan.pdf', { type: 'application/pdf' });
  Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });

  await act(async () => {
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(200);
  });

  expect(document.body.textContent).toContain('scan.pdf');

  const submitButton = Array.from(document.querySelectorAll('button'))
    .find((button) => button.textContent.includes('بارگذاری'));
  expect(submitButton).toBeTruthy();

  await act(async () => {
    submitButton.click();
    await wait(300);
  });

  expect(axiosInstance.post).toHaveBeenCalledTimes(1);
  const [url, body, config] = axiosInstance.post.mock.calls[0];
  expect(url).toBe('/documents/');
  expect(body instanceof FormData).toBe(true);
  expect(body.get('employee')).toBe('3');
  expect(body.get('document_type')).toBe('5');
  expect(body.get('file')).toBeTruthy();
  // Content-Type دستی نباید تنظیم شود (مرورگر boundary را می‌سازد).
  expect(config?.headers?.['Content-Type']).toBeUndefined();
  expect(config?.timeout).toBeGreaterThan(30000);
  expect(onSuccess).toHaveBeenCalledWith(1);

  root.unmount();
  container.remove();
});
