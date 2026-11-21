import React, { useEffect, useState } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { Route, Routes, MemoryRouter, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import WorkspacePageCache from '../core/components/ui/WorkspacePageCache';
import { WorkspaceTabsProvider, useWorkspaceTabs } from '../core/context/WorkspaceTabsContext';

const wait = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

const CounterPage = ({ id }) => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <span data-testid={`${id}-count`}>{count}</span>
      <button type="button" onClick={() => setCount((value) => value + 1)}>افزایش {id}</button>
    </div>
  );
};

const routes = [
  <Route key="/a" path="/a" element={<CounterPage id="a" />} />,
  <Route key="/b" path="/b" element={<CounterPage id="b" />} />,
];

const Navigation = () => {
  const navigate = useNavigate();
  const { openTab } = useWorkspaceTabs();
  useEffect(() => {
    openTab({ path: '/a', title: 'صفحه الف' });
    openTab({ path: '/b', title: 'صفحه ب' });
  }, [openTab]);
  return (
    <>
      <Button onClick={() => navigate('/a')}>رفتن به الف</Button>
      <Button onClick={() => navigate('/b')}>رفتن به ب</Button>
    </>
  );
};

test('workspace page cache keeps local page state when switching tabs', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route
            path="*"
            element={(
              <WorkspaceTabsProvider>
                <Navigation />
                <WorkspacePageCache routes={routes} />
              </WorkspaceTabsProvider>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );
    await wait(150);
  });

  const increment = () => Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('افزایش a'));
  const goToB = () => Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('رفتن به ب'));
  const goToA = () => Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('رفتن به الف'));

  await act(async () => { increment().click(); increment().click(); await wait(80); });
  expect(container.querySelector('[data-testid="a-count"]').textContent).toBe('2');

  await act(async () => { goToB().click(); await wait(120); });
  expect(container.querySelector('[data-testid="b-count"]').textContent).toBe('0');

  await act(async () => { goToA().click(); await wait(120); });
  expect(container.querySelector('[data-testid="a-count"]').textContent).toBe('2');

  await act(async () => { root.unmount(); });
  container.remove();
});
