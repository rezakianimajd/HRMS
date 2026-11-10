import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import axiosInstance from '../core/api/axiosConfig';
import PlanningPage, { TASK_PRIORITY_META, TASK_STATUS_META } from '../pages/planning/PlanningPage';

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

const notes = [
  {
    id: 3, title: 'پیگیری مالیات قرارداد ۱۲۵', body: 'با واحد مالی هماهنگ شود',
    color: '#6366f1', tags: ['مالیات'], is_pinned: true, is_shared: true, is_mine: true,
    owner_name: 'مدیر', access: 'owner',
  },
];
const tasks = [
  {
    id: 5, title: 'بررسی صورت‌وضعیت شماره ۴', status: 'todo', priority: 'urgent',
    due_date: '2026-11-12', is_overdue: false, is_mine: true, is_shared: false,
    owner_name: 'مدیر', access: 'owner', description: '',
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
    if (url === '/planning/summary/') {
      return Promise.resolve({
        data: { notes: 1, open_tasks: 1, due_today: 0, overdue: 0, shared_notes: 1 },
      });
    }
    if (url === '/planning/notes/') {
      return Promise.resolve({ data: { count: notes.length, results: notes } });
    }
    if (url === '/planning/tasks/') {
      return Promise.resolve({ data: { count: tasks.length, results: tasks } });
    }
    if (url === '/chat/directory/') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
});

test('planning metadata covers task status and priority', () => {
  expect(TASK_STATUS_META.done.label).toBe('انجام‌شده');
  expect(TASK_PRIORITY_META.urgent.label).toBe('فوری');
});

test('planning page renders notes and can switch to tasks', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <PlanningPage />
      </QueryClientProvider>,
    );
    await wait(400);
  });
  await act(async () => { await wait(200); });

  expect(container.textContent).toContain('برنامه‌ریزی شخصی');
  expect(container.textContent).toContain('پیگیری مالیات قرارداد ۱۲۵');
  expect(container.textContent).toContain('یادداشت‌ها');

  const tasksTab = Array.from(container.querySelectorAll('[role="tab"]'))
    .find((tab) => tab.textContent.includes('وظایف'));
  expect(tasksTab).toBeTruthy();
  await act(async () => { tasksTab.click(); await wait(200); });
  expect(container.textContent).toContain('بررسی صورت‌وضعیت شماره ۴');

  // دیالوگ ساخت وظیفه باید بدون خطا باز شود و بخش «محول به» را نشان دهد
  const newTaskButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('وظیفه جدید'));
  expect(newTaskButton).toBeTruthy();
  await act(async () => { newTaskButton.click(); await wait(250); });
  expect(document.body.textContent).toContain('این وظیفه برای چه کسی است؟');
  expect(document.body.textContent).toContain('فقط خودم');

  await act(async () => { root.unmount(); });
  container.remove();
});
