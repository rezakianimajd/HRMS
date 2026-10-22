import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import DataTable from '../core/components/ui/DataTable';

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

test('DataTable renders tokenized rows and empty state', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <DataTable
        rows={[{ id: 1, name: 'ردیف آزمایشی', amount: 1200 }]}
        columns={[
          { key: 'name', label: 'نام' },
          { key: 'amount', label: 'مبلغ', render: (row) => `#${row.amount}` },
        ]}
        getRowId={(row) => row.id}
      />,
    );
  });
  expect(container.textContent).toContain('ردیف آزمایشی');
  expect(container.textContent).toContain('#1200');

  await act(async () => {
    root.render(
      <DataTable
        rows={[]}
        columns={[{ key: 'name', label: 'نام' }]}
        emptyText="خالی است"
      />,
    );
  });
  expect(container.textContent).toContain('خالی است');
  await act(async () => { root.unmount(); });
});
