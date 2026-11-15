import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ApplicationProvider } from '../core/context/ApplicationContext';
import axiosInstance from '../core/api/axiosConfig';
import PlanningPage, { TASK_PRIORITY_META, TASK_STATUS_META } from '../pages/planning/PlanningPage';
import { jalaliMonthGrid, jalaliToday, todayIso } from '../pages/planning/planningCalendar';

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
    if (url === '/planning/calendar/') {
      const iso = todayIso();
      return Promise.resolve({
        data: {
          tasks: [{
            id: 21, title: 'وظیفه تقویم', status: 'todo', priority: 'high',
            due_date: iso, due_time: '09:00',
          }],
          notes: [{ id: 22, title: 'یادداشت تقویم', color: '#0ea5e9', date: iso }],
          events: [{
            id: 23, title: 'جلسه تست', date: iso, start_time: '10:00', end_time: '',
            kind: 'meeting', color: '#6366f1', is_done: false,
            task: 21, task_title: 'وظیفه تقویم', task_status: 'todo',
            note: 22, note_title: 'یادداشت تقویم',
          }],
          counts: { tasks: 1, notes: 1, events: 1 },
        },
      });
    }
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
        <ApplicationProvider>
          <PlanningPage />
        </ApplicationProvider>
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
  await act(async () => { tasksTab.click(); await wait(400); });
  await act(async () => { await wait(300); });
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

test('planning rich text note saves and task checklist supports sub items', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <PlanningPage />
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await wait(350);
  });
  await act(async () => { await wait(250); });

  // دیالوگ یادداشت: ادیتور متن غنی و ذخیرهٔ همان متن (باگ قبلی: متن پاک می‌شد)
  const noteButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('یادداشت جدید'));
  expect(noteButton).toBeTruthy();
  await act(async () => { noteButton.click(); await wait(250); });

  const noteDialog = document.querySelector('[data-testid="planning-note-dialog"]');
  expect(noteDialog).toBeTruthy();
  expect(noteDialog.textContent).toContain('عنوان و متن یادداشت');
  expect(noteDialog.textContent).toContain('رنگ و برچسب');
  expect(noteDialog.querySelector('[aria-label="بولد (Ctrl+B)"]')).toBeTruthy();

  const editor = noteDialog.querySelector('[data-testid="planning-rich-text"]');
  expect(editor).toBeTruthy();
  editor.innerHTML = '<b>متن پررنگ</b>';
  await act(async () => {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(50);
  });

  const titleInput = noteDialog.querySelector('input');
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value',
  ).set;
  await act(async () => {
    valueSetter.call(titleInput, 'یادداشت تست');
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(50);
  });

  const saveNoteButton = Array.from(noteDialog.querySelectorAll('button'))
    .find((button) => button.textContent.includes('ساخت یادداشت'));
  expect(saveNoteButton).toBeTruthy();
  await act(async () => { saveNoteButton.click(); await wait(200); });

  const noteCall = axiosInstance.post.mock.calls
    .find(([url]) => url === '/planning/notes/');
  expect(noteCall).toBeTruthy();
  expect(noteCall[1].title).toBe('یادداشت تست');
  expect(noteCall[1].body).toContain('<b>متن پررنگ</b>');

  // وظایف: کارت‌ها به‌جای جدول/تخته + چک‌لیست تودرتو در دیالوگ
  const tasksTab = Array.from(container.querySelectorAll('[role="tab"]'))
    .find((tab) => tab.textContent.includes('وظایف'));
  await act(async () => { tasksTab.click(); await wait(350); });
  await act(async () => { await wait(300); });
  expect(container.querySelectorAll('[data-testid="planning-task-card"]').length).toBeGreaterThan(0);

  // پنل فیلتر استاندارد نوار جستجو باید باز شود (دامنه/وضعیت/اولویت)
  const filtersButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('فیلترها'));
  expect(filtersButton).toBeTruthy();
  await act(async () => { filtersButton.click(); await wait(200); });
  expect(container.textContent).toContain('دامنه');
  expect(container.textContent).toContain('وضعیت');
  expect(container.textContent).toContain('اولویت');

  const newTaskButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('وظیفه جدید'));
  await act(async () => { newTaskButton.click(); await wait(250); });
  const taskDialog = document.querySelector('[data-testid="planning-task-dialog"]');
  expect(taskDialog).toBeTruthy();
  expect(taskDialog.textContent).toContain('این وظیفه برای چه کسی است؟');

  const addItemButton = Array.from(taskDialog.querySelectorAll('button'))
    .find((button) => button.textContent.trim() === 'افزودن مورد');
  await act(async () => { addItemButton.click(); await wait(80); });
  const addChildButton = taskDialog.querySelector('[aria-label="افزودن زیرمجموعه به مورد ۱"]');
  expect(addChildButton).toBeTruthy();
  await act(async () => { addChildButton.click(); await wait(80); });
  expect(taskDialog.querySelectorAll('input[placeholder="شرح زیرمجموعه…"]').length).toBe(1);

  await act(async () => { root.unmount(); });
  container.remove();
});

test('planning calendar tab merges tasks, notes and events', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ApplicationProvider>
          <PlanningPage />
        </ApplicationProvider>
      </QueryClientProvider>,
    );
    await wait(350);
  });
  await act(async () => { await wait(200); });

  const calendarTab = Array.from(container.querySelectorAll('[role="tab"]'))
    .find((tab) => tab.textContent.includes('تقویم'));
  expect(calendarTab).toBeTruthy();
  await act(async () => { calendarTab.click(); await wait(350); });
  await act(async () => { await wait(300); });

  const today = jalaliToday();
  const grid = jalaliMonthGrid(today.jy, today.jm);
  expect(container.textContent).toContain(grid.title);
  expect(container.textContent).toContain('شنبه');
  expect(container.textContent).toContain('جلسه تست');
  expect(container.textContent).toContain('وظیفه تقویم');
  expect(container.textContent).toContain('یادداشت تقویم');

  const eventButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.trim() === 'رویداد');
  expect(eventButton).toBeTruthy();
  await act(async () => { eventButton.click(); await wait(250); });
  const eventDialog = document.querySelector('[data-testid="planning-event-dialog"]');
  expect(eventDialog).toBeTruthy();
  expect(eventDialog.textContent).toContain('عنوان رویداد');
  expect(eventDialog.textContent).toContain('پیوند به وظیفه یا یادداشت');

  await act(async () => { root.unmount(); });
  container.remove();
});

