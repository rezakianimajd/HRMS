import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Button } from '@mui/material';

import WorkspaceTabs from '../core/components/ui/WorkspaceTabs';
import { WorkspaceTabsProvider, useWorkspaceTabs } from '../core/context/WorkspaceTabsContext';

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const Probe = () => {
  const { openTab } = useWorkspaceTabs();
  const location = useLocation();
  return (
    <>
      <Button onClick={() => openTab({ path: '/contracts', title: 'قراردادها', color: '#f59e0b' })}>
        باز کردن قراردادها
      </Button>
      <Button onClick={() => openTab({ path: '/employees', title: 'پرسنل', color: '#ec4899' })}>
        باز کردن پرسنل
      </Button>
      <Button onClick={() => openTab({ path: '/payroll', title: 'حقوق و دستمزد', color: '#3b82f6' })}>
        باز کردن حقوق
      </Button>
      <span data-testid="current-location">{location.pathname}</span>
    </>
  );
};

const renderStrip = async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <WorkspaceTabsProvider>
          <Probe />
          <WorkspaceTabs />
        </WorkspaceTabsProvider>
      </MemoryRouter>,
    );
    await wait(150);
  });
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
});

test('workspace tabs dock opens, switches, closes and exposes all pages', async () => {
  const { container, root } = await renderStrip();
  expect(container.querySelector('[data-testid="workspace-tabs"]')).toBeNull();

  const clickButton = async (label) => {
    const button = Array.from(container.querySelectorAll('button'))
      .find((node) => node.textContent.includes(label));
    expect(button).toBeTruthy();
    await act(async () => { button.click(); await wait(80); });
  };

  await clickButton('باز کردن قراردادها');
  await clickButton('باز کردن پرسنل');
  await clickButton('باز کردن حقوق');

  const strip = container.querySelector('[data-testid="workspace-tabs"]');
  expect(strip).toBeTruthy();
  expect(container.querySelectorAll('[data-testid="workspace-tab"]')).toHaveLength(3);
  expect(container.textContent).toContain('صفحات باز');
  expect(container.textContent).toContain('حقوق و دستمزد');
  expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(0);

  const activeTab = container.querySelector('[data-testid="workspace-tab"][data-active="true"]');
  expect(activeTab.textContent).toContain('حقوق و دستمزد');

  const firstTab = Array.from(container.querySelectorAll('[data-testid="workspace-tab"]'))
    .find((tab) => tab.textContent.includes('قراردادها'));
  await act(async () => { firstTab.click(); await wait(80); });
  expect(container.querySelector('[data-testid="current-location"]').textContent).toBe('/contracts');
  expect(container.querySelector('[data-testid="workspace-tab"][data-active="true"]').textContent)
    .toContain('قراردادها');

  const allPages = container.querySelector('[aria-label="همهٔ صفحات باز"]');
  await act(async () => { allPages.click(); await wait(120); });
  expect(document.querySelector('input[aria-label="جست‌وجوی صفحات باز"]')).toBeTruthy();
  expect(document.body.textContent).toContain('پرسنل');

  const closeFirst = Array.from(document.querySelectorAll('[aria-label="بستن قراردادها"]'))[0];
  await act(async () => { closeFirst.click(); await wait(120); });
  expect(container.querySelectorAll('[data-testid="workspace-tab"]')).toHaveLength(2);

  await act(async () => { root.unmount(); });
  container.remove();
});

test('workspace tabs context menu can close the other pages', async () => {
  const { container, root } = await renderStrip();
  const clickButton = async (label) => {
    const button = Array.from(container.querySelectorAll('button'))
      .find((node) => node.textContent.includes(label));
    await act(async () => { button.click(); await wait(60); });
  };
  await clickButton('باز کردن قراردادها');
  await clickButton('باز کردن پرسنل');

  const tab = Array.from(container.querySelectorAll('[data-testid="workspace-tab"]'))
    .find((node) => node.textContent.includes('قراردادها'));
  await act(async () => {
    tab.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 30, clientY: 30 }));
    await wait(120);
  });
  expect(document.body.textContent).toContain('بستن سایر صفحات');

  const closeOthers = Array.from(document.querySelectorAll('[role="menuitem"]'))
    .find((node) => node.textContent.includes('بستن سایر صفحات'));
  await act(async () => { closeOthers.click(); await wait(120); });
  expect(container.querySelectorAll('[data-testid="workspace-tab"]')).toHaveLength(1);
  expect(container.textContent).toContain('قراردادها');

  await act(async () => { root.unmount(); });
  container.remove();
});
