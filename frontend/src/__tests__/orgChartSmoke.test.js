import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import OrgChartPage from '../pages/OrgChartPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'hrms' }, applications: [] }),
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { hrms: '#6366f1' },
}));

const tree = [{
  id: 1, title: 'مدیرعامل', code: 'CEO', level: 1, parent_id: null, department_id: null,
  department_name: 'مدیریت', children: [{
    id: 2, title: 'واحد اداری', code: 'ADM', level: 2, parent_id: 1, department_id: null,
    department_name: 'اداری', employees: [{ id: 3, full_name: 'مریم رضایی' }], children: [],
  }],
  employees: [{ id: 4, full_name: 'علی رضایی' }],
}];

test('org chart renders a centered tree and uses the standard print button', async () => {
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/org-chart/positions/tree/') return Promise.resolve({ data: tree });
    if (url === '/org-chart/positions/list_all/') return Promise.resolve({ data: [{ id: 1, title: 'مدیرعامل' }] });
    if (url === '/departments/') return Promise.resolve({ data: [] });
    if (url === '/employees/') return Promise.resolve({ data: { results: [] } });
    return Promise.resolve({ data: [] });
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <OrgChartPage />
      </QueryClientProvider>,
    );
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 120)); });
  expect(container.textContent).toContain('مدیرعامل');
  expect(container.textContent).toContain('واحد اداری');
  expect(container.textContent).toContain('چاپ');
  expect(container.querySelector('.orgchart-print-area')).toBeTruthy();
  const printCard = container.querySelector('.orgchart-print-area .org-tree--root > li > div');
  expect(printCard).toBeTruthy();
  expect(printCard.getAttribute('style')).toContain('border');
  expect(printCard.getAttribute('style')).toContain('width: 190px');
  act(() => root.unmount());
  container.remove();
});
