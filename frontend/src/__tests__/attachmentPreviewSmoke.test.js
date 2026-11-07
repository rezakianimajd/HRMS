import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import ContractLetterDetailsDialog from '../pages/contracts/ContractLetterDetailsDialog';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

const letter = {
  id: 11,
  number: '1404-100-135',
  subject: 'ارسال صورت‌وضعیت شماره ۴',
  direction_display: 'وارده',
  status_display: 'در جریان',
  letter_date: '2026-10-01',
  received_date: '2026-10-02',
  external_number: '8520/10/1404',
  indicator_no: 'IND-9',
  category_title: 'درخواست',
  priority_display: 'عادی',
  sender_label: 'شرکت ساز و کار',
  receiver_label: 'دبیرخانه',
  party_label: 'شرکت ساز و کار',
  referral_count: 0,
  summary: '',
  referrals: [],
  attachments: [
    {
      id: 91, title: 'statement-4.pdf', kind_display: 'نامه', size: 1048576,
      uploaded_by_name: 'خانم حقیقی', created_at: '2026-10-02',
      file_url: '/media/correspondences/letters/statement-4.pdf',
    },
    {
      id: 92, title: 'cover.docx', kind_display: 'پیوست', size: 2048,
      uploaded_by_name: 'خانم حقیقی', created_at: '2026-10-02',
      file_url: '/media/correspondences/letters/cover.docx',
    },
  ],
};

const render = async (element) => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
    await wait(250);
  });
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '';
  axiosInstance.get.mockImplementation((url) => {
    if (url === `/letters/${letter.id}/`) {
      return Promise.resolve({
        data: {
          ...letter,
          attachments: letter.attachments.map((file) => ({
            ...file, kind: 'letter', uploaded_by_name: 'خانم حقیقی',
          })),
        },
      });
    }
    return Promise.resolve({ data: {} });
  });
});

test('contract letter dialog previews its attachments inline', async () => {
  const { container, root } = await render(
    <ContractLetterDetailsDialog letter={letter} onClose={() => {}} />,
  );

  // دیالوگ در portal رندر می‌شود؛ بنابراین متن را از body می‌خوانیم
  expect(document.body.textContent).toContain('statement-4.pdf');
  const previewButton = document.querySelector('[role="dialog"] [aria-label="مشاهدهٔ پیوست"]');
  expect(previewButton).toBeTruthy();

  await act(async () => {
    previewButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(260);
  });

  const dialogs = [...document.querySelectorAll('[role="dialog"]')];
  const viewer = dialogs.find((node) => node.querySelector('iframe'));
  expect(viewer).toBeTruthy();
  expect(viewer.textContent).toContain('statement-4.pdf');
  expect(viewer.textContent).toContain('پیوست ۱ از ۲');

  // بستن پیش‌نمایش و باز کردن فایل دوم (docx) که در مرورگر پیش‌نمایش نمی‌شود
  await act(async () => {
    viewer.querySelector('[aria-label="بستن پیش‌نمایش"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(220);
  });
  const docxTitle = [...document.querySelectorAll('[role="dialog"] [role="button"]')]
    .find((node) => node.textContent.trim() === 'cover.docx');
  expect(docxTitle).toBeTruthy();
  await act(async () => {
    docxTitle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(240);
  });
  expect(document.body.textContent).toContain('پیش‌نمایش این نوع فایل در مرورگر ممکن نیست');

  root.unmount();
  container.remove();
});
