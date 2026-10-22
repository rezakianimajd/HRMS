import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import CommandPalette from '../core/components/ui/CommandPalette';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'contracts', title: 'مدیریت قراردادها' }, applications: [] }),
}));

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockResolvedValue({
    data: {
      module: 'contracts',
      module_label: 'مدیریت قراردادها',
      query: 'پیمان',
      results: [{
        id: 'contracts.Contract-7',
        type: 'contract',
        title: 'قرارداد نمونه پیمانکاری',
        subtitle: 'شرکت نمونه · در حال اجرا',
        path: '/external-contracts/7',
        section: 'قراردادها',
        icon: 'contract',
        color: '#f59e0b',
      }],
      sections: [{ label: 'قراردادها', count: 1, icon: 'contract', color: '#f59e0b' }],
    },
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  jest.clearAllMocks();
});

test('command palette searches only the active module', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/contracts']}>
          <CommandPalette />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(80);
  });

  await act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await wait(120);
  });

  const input = document.querySelector('input');
  expect(input).toBeTruthy();
  expect(document.body.textContent).toContain('جستجو در مدیریت قراردادها');

  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'پیمان');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(900);
  });

  await act(async () => { await wait(350); });

  expect(axiosInstance.get).toHaveBeenCalledWith(
    '/search/module/',
    { params: { q: 'پیمان', module: 'contracts' } },
  );
  expect(document.body.textContent).toContain('قرارداد نمونه پیمانکاری');
  expect(document.body.textContent).toContain('شرکت نمونه');
});
