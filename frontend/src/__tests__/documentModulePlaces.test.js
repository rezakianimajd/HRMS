import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ModuleSelection from '../core/components/ui/ModuleSelection';
import AppSwitcher from '../core/components/ui/AppSwitcher';

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({
    applications: [
      { id: 1, slug: 'hrms', title: 'منابع انسانی', color: '#6366f1', order: 1, is_coming_soon: false, accessible: true },
      { id: 2, slug: 'documents', title: 'مدیریت اسناد و مدارک', color: '#0f766e', order: 3, is_coming_soon: false, accessible: true },
    ],
    currentApp: { id: 1, slug: 'hrms', title: 'منابع انسانی' },
    loadApplications: jest.fn(),
    switchApplication: jest.fn(() => Promise.resolve()),
  }),
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { hrms: '#6366f1', documents: '#0f766e' },
}));

const wait = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

const documentsApp = {
  id: 2, slug: 'documents', title: 'مدیریت اسناد و مدارک',
  description: 'کتابخانه اسناد', color: '#0f766e', order: 3,
  is_coming_soon: false, accessible: true,
};

test('documents module is rendered on the module selection page', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <ModuleSelection
          applications={[documentsApp]}
          currentApp={{ id: 1, slug: 'hrms', title: 'منابع انسانی' }}
          user={{ first_name: 'مدیر', last_name: 'سیستم', username: 'admin' }}
          company={{ legal_name: 'شرکت نمونه', code: 'C-1' }}
          onPick={jest.fn()}
        />
      </MemoryRouter>,
    );
    await wait();
  });
  expect(container.textContent).toContain('انتخاب ماژول');
  expect(container.textContent).toContain('مدیریت اسناد و مدارک');
  root.unmount();
  container.remove();
});

test('documents module is listed in the sidebar app switcher', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <AppSwitcher />
      </MemoryRouter>,
    );
    await wait();
  });
  const trigger = container.querySelector('[aria-label="تغییر ماژول"]');
  expect(trigger).toBeTruthy();
  await act(async () => { trigger.click(); await wait(); });
  expect(document.body.textContent).toContain('مدیریت اسناد و مدارک');
  root.unmount();
  container.remove();
});
