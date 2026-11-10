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
    reactions: [{ emoji: '👍', count: 2, mine: false, user_ids: [2, 3] }],
  },
  {
    id: 102, conversation: 7, sender: 1, sender_name: 'مدیر', body: '👍',
    kind: 'text', is_mine: true, read_count: 0, delivered_count: 1, member_count: 3,
    attachments: [], entity_refs: [], created_at: '2026-11-10T08:12:00Z',
    reactions: [],
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
    if (url === '/chat/entity-search/') {
      return Promise.resolve({ data: { results: [
        { module: 'contracts', module_label: 'قراردادها', object_type: 'contract',
          object_id: '125', label: 'قرارداد 1405/125', subtitle: 'شرکت الف',
          url: '/external-contracts/125' },
      ] } });
    }
    if (url === '/chat/conversations/7/members/') {
      return Promise.resolve({ data: [
        { id: 1, user: 2, user_name: 'مدیر مالی', role: 'owner', role_display: 'مالک' },
        { id: 2, user: 1, user_name: 'مدیر', role: 'member', role_display: 'عضو' },
      ] });
    }
    if (url === '/chat/conversations/7/pinned/') {
      return Promise.resolve({ data: [
        { id: 101, sender_name: 'مدیر مالی', body: 'صورت‌وضعیت بررسی شد', created_at: '2026-11-10T08:10:00Z' },
      ] });
    }
    return Promise.resolve({ data: [] });
  });
  axiosInstance.post.mockResolvedValue({
    data: { reactions: [{ emoji: '👍', count: 3, mine: true, user_ids: [1, 2, 3] }] },
  });
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

  // پیامِ فقط‌ایموجی بزرگ‌تر از متن معمولی رندر می‌شود.
  await act(async () => { await wait(400); });
  const emojiBubble = container.querySelector(
    '[data-testid="chat-message-body"][data-emoji-only="true"]',
  );
  expect(emojiBubble).toBeTruthy();
  expect(emojiBubble.textContent).toBe('👍');
  const textBubble = container.querySelector(
    '[data-testid="chat-message-body"][data-emoji-only="false"]',
  );
  expect(textBubble).toBeTruthy();

  // گفتگوی خصوصی از همان صفحه قابل شروع است (نه فقط گروه/کانال)
  const directButton = container.querySelector('button[aria-label="گفتگوی خصوصی"]');
  expect(directButton).toBeTruthy();
  await act(async () => { directButton.click(); await wait(200); });
  expect(document.body.textContent).toContain('گفتگوی خصوصی جدید');
  expect(document.body.textContent).toContain('یک همکار را انتخاب کنید');

  const closeDialog = Array.from(document.querySelectorAll('button'))
    .find((button) => button.textContent.trim() === 'انصراف');
  if (closeDialog) await act(async () => { closeDialog.click(); await wait(150); });

  // «الصاق رکورد» جست‌وجوی داخل ماژول‌ها را باز می‌کند
  const entityButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('الصاق رکورد'));
  expect(entityButton).toBeTruthy();
  await act(async () => { entityButton.click(); await wait(250); });
  expect(document.body.textContent).toContain('الصاق رکورد از ماژول‌ها');
  expect(document.body.textContent).toContain('در ماژول‌های مجاز جست‌وجو شود');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('emoji picker inserts into the composer and sends the emoji', async () => {
  window.localStorage.removeItem('hrms-chat-emoji-recent');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  axiosInstance.post.mockClear();

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/chat?conversation=7']}>
          <ChatPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(400);
  });
  await act(async () => { await wait(250); });

  expect(container.querySelector('textarea')).toBeTruthy();

  const emojiButton = container.querySelector('button[aria-label="ایموجی"]');
  expect(emojiButton).toBeTruthy();
  await act(async () => { emojiButton.click(); await wait(250); });

  expect(document.querySelector('[data-testid="chat-emoji-picker"]')).toBeTruthy();
  expect(document.body.textContent).toContain('ایموجی‌ها');

  const emojiNode = document.querySelector('[data-testid="chat-emoji-picker"] [data-emoji="👍"]');
  expect(emojiNode).toBeTruthy();
  await act(async () => { emojiNode.click(); await wait(250); });

  expect(container.querySelector('textarea').value).toContain('👍');
  // انتخاب ایموجی در فهرست «اخیر» ذخیره می‌شود.
  expect(JSON.parse(window.localStorage.getItem('hrms-chat-emoji-recent'))).toContain('👍');

  const sendButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.trim() === 'ارسال');
  expect(sendButton).toBeTruthy();
  await act(async () => { sendButton.click(); await wait(300); });

  const call = axiosInstance.post.mock.calls
    .find(([url]) => String(url).endsWith('/messages/'));
  expect(call).toBeTruthy();
  expect(call[1].get('body')).toContain('👍');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('rail filters, info panel, reactions and typing are wired to the API', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  axiosInstance.post.mockClear();

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/chat?conversation=7']}>
          <ChatPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(400);
  });
  await act(async () => { await wait(350); });

  // فیلترهای سریع و فیلتر نوع گفتگو
  expect(container.querySelector('[data-testid="chat-rail-tabs"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="chat-kind-filter"]')).toBeTruthy();

  // واکنش‌های ذخیره‌شده روی حباب پیام
  const reactionChip = container.querySelector('[data-testid="chat-reaction-chip"]');
  expect(reactionChip).toBeTruthy();
  expect(reactionChip.textContent).toContain('👍');
  expect(reactionChip.textContent).toContain('۲');

  // واکنش سریع از نوار اقدام پیام
  const reactButton = container.querySelector('[data-testid="chat-react-button"]');
  expect(reactButton).toBeTruthy();
  await act(async () => { reactButton.click(); await wait(200); });
  const quick = document.querySelector('[data-testid="chat-quick-reaction"]');
  expect(quick).toBeTruthy();
  await act(async () => { quick.click(); await wait(250); });
  const reactionCall = axiosInstance.post.mock.calls
    .find(([url]) => String(url).includes('/reactions/'));
  expect(reactionCall).toBeTruthy();
  expect(reactionCall[0]).toBe('/chat/messages/101/reactions/');
  expect(reactionCall[1].emoji).toBe('👍');

  // «در حال نوشتن» با تایپ در نوار نوشتن به سرور اعلام می‌شود
  const composer = container.querySelector('textarea');
  const setValue = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value',
  ).set;
  await act(async () => {
    setValue.call(composer, 'سلام');
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(250);
  });
  const typingCall = axiosInstance.post.mock.calls
    .find(([url]) => String(url).includes('/typing/'));
  expect(typingCall).toBeTruthy();
  expect(typingCall[0]).toBe('/chat/conversations/7/typing/');

  // پنل اطلاعات گفتگو: اعضا و پیام‌های سنجاق‌شده
  const infoButton = container.querySelector('button[aria-label="اطلاعات گفتگو"]');
  expect(infoButton).toBeTruthy();
  await act(async () => { infoButton.click(); await wait(300); });
  for (let index = 0; index < 4; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(250); });
  }
  const infoPanel = container.querySelector('[data-testid="chat-info-panel"]');
  expect(infoPanel).toBeTruthy();
  expect(infoPanel.textContent).toContain('اطلاعات گفتگو');
  expect(infoPanel.textContent).toContain('مدیر مالی');
  expect(infoPanel.textContent).toContain('پیام‌های سنجاق‌شده');

  await act(async () => { root.unmount(); });
  container.remove();
});

