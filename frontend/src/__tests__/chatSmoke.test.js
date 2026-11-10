import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import axiosInstance from '../core/api/axiosConfig';
import ChatPage, { CHAT_KIND_META, receiptLabel } from '../pages/chat/ChatPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
}));

jest.mock('../core/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({ user: { id: 1, first_name: 'مدیر', is_superuser: true } }),
}));

const conversations = [
  {
    id: 7, kind: 'group', title: 'گفتگوی قرارداد ۱۴۰۵/۱۲۵', member_count: 3,
    unread_count: 2, related_label: 'قرارداد 1405/125', is_public: false,
    last_message: { preview: 'صورت‌وضعیت بررسی شد', sender: 'مدیر مالی' },
    last_message_at: '2026-11-10T08:10:00Z', members: [],
  },
];
const messages = [
  {
    id: 101, conversation: 7, sender: 2, sender_name: 'مدیر مالی', body: 'صورت‌وضعیت بررسی شد',
    kind: 'text', is_mine: false, read_count: 1, delivered_count: 1, member_count: 3,
    attachments: [], entity_refs: [], created_at: '2026-11-10T08:10:00Z',
  },
];

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/chat/conversations/') {
      return Promise.resolve({ data: { count: conversations.length, next: null, results: conversations } });
    }
    if (url.startsWith('/chat/conversations/7/messages/')) {
      return Promise.resolve({ data: { results: messages, has_more: false, member_count: 3 } });
    }
    if (url === '/chat/unread/') return Promise.resolve({ data: { chat: 2, mentions: 1, planning: 0 } });
    if (url === '/chat/events/') return Promise.resolve({ data: { results: [], last: 0 } });
    if (url === '/chat/directory/') {
      return Promise.resolve({ data: [{ id: 2, name: 'مدیر مالی', username: 'finance' }] });
    }
    return Promise.resolve({ data: [] });
  });
  axiosInstance.post.mockResolvedValue({ data: {} });
});

test('chat kind meta covers private, group and channel', () => {
  expect(Object.keys(CHAT_KIND_META)).toEqual(['direct', 'group', 'channel', 'system']);
  expect(receiptLabel({ member_count: 3, read_count: 2, delivered_count: 3 })).toContain('۲');
});

test('chat page lists conversations and shows the encrypted-thread notice', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/chat']}>
          <ChatPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(400);
  });
  await act(async () => { await wait(200); });

  expect(container.textContent).toContain('گفتگوی سازمانی');
  expect(container.textContent).toContain('گفتگوی قرارداد ۱۴۰۵/۱۲۵');
  expect(container.textContent).toContain('صورت‌وضعیت بررسی شد');
  expect(container.querySelector('input[type="file"]')).toBeTruthy();

  // گفتگوی خصوصی از همان صفحه قابل شروع است (نه فقط گروه/کانال)
  const directButton = container.querySelector('button[aria-label="گفتگوی خصوصی"]');
  expect(directButton).toBeTruthy();
  await act(async () => { directButton.click(); await wait(200); });
  expect(document.body.textContent).toContain('گفتگوی خصوصی جدید');
  expect(document.body.textContent).toContain('یک همکار را انتخاب کنید');

  await act(async () => { root.unmount(); });
  container.remove();
});
