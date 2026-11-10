import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '@mui/material';

import axiosInstance from '../core/api/axiosConfig';
import WorkspaceDockProvider, { useWorkspaceDock } from '../core/components/ui/WorkspaceDock';

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
  default: () => ({ user: { id: 1, is_superuser: true } }),
}));

const Probe = () => {
  const { openChat, openPlanning } = useWorkspaceDock();
  return (
    <>
      <Button onClick={() => openChat('7')}>باز کردن چت</Button>
      <Button onClick={() => openPlanning(1)}>باز کردن برنامه‌ریزی</Button>
    </>
  );
};

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/chat/conversations/') {
      return Promise.resolve({ data: { count: 1, results: [
        { id: 7, kind: 'group', title: 'گروه فنی', members: [], member_count: 2, unread_count: 0 },
      ] } });
    }
    if (url.startsWith('/chat/conversations/7/messages/')) {
      return Promise.resolve({ data: { results: [], has_more: false, member_count: 2 } });
    }
    if (url === '/chat/unread/') return Promise.resolve({ data: { chat: 0, mentions: 0, planning: 0 } });
    if (url === '/chat/events/') return Promise.resolve({ data: { results: [] } });
    if (url === '/chat/directory/') return Promise.resolve({ data: [] });
    if (url === '/planning/summary/') return Promise.resolve({ data: { notes: 0, open_tasks: 0 } });
    if (url === '/planning/notes/') return Promise.resolve({ data: { results: [] } });
    if (url === '/planning/tasks/') return Promise.resolve({ data: { results: [] } });
    return Promise.resolve({ data: [] });
  });
});

test('workspace dock opens chat and planning as dialogs without leaving the page', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <WorkspaceDockProvider>
            <Probe />
          </WorkspaceDockProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(200);
  });

  const chatButton = Array.from(document.querySelectorAll('button'))
    .find((button) => button.textContent.includes('باز کردن چت'));
  expect(chatButton).toBeTruthy();
  await act(async () => { chatButton.click(); await wait(300); });
  expect(document.body.textContent).toContain('گفتگوی سازمانی');
  expect(window.location.pathname).toBe('/');

  const closeButton = Array.from(document.querySelectorAll('button'))
    .find((button) => button.getAttribute('aria-label') === 'بستن گفتگوی سازمانی');
  expect(closeButton).toBeTruthy();
  await act(async () => { closeButton.click(); await wait(200); });

  const planningButton = Array.from(document.querySelectorAll('button'))
    .find((button) => button.textContent.includes('باز کردن برنامه‌ریزی'));
  await act(async () => { planningButton.click(); await wait(300); });
  expect(document.body.textContent).toContain('برنامه‌ریزی شخصی');

  await act(async () => { root.unmount(); });
  container.remove();
});
