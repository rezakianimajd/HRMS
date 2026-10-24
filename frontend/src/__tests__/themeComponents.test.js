import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import InfoCard from '../core/components/ui/InfoCard';
import PageHeader from '../core/components/ui/PageHeader';
import { ApplicationProvider } from '../core/context/ApplicationContext';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(() => Promise.resolve({ data: { applications: [] } })) },
}));

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

test('theme-aware info card and header variants render', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <ApplicationProvider>
        <div>
          <InfoCard label="خطی" value="۱۲" suffix="ریال" variant="inline" />
          <InfoCard label="با جزئیات" value="۹۰٪" sub="جزئیات" variant="detailed" surface="glass" />
          <InfoCard label="وسط‌چین" value="۲۴" variant="centered" surface="tinted" />
          <PageHeader title="هدر نمونه" subtitle="توضیح تست" variant="compact" showSubtitle />
        </div>
      </ApplicationProvider>,
    );
  });
  expect(container.textContent).toContain('خطی');
  expect(container.textContent).toContain('با جزئیات');
  expect(container.textContent).toContain('توضیح تست');
  await act(async () => { root.unmount(); });
});
