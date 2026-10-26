import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import DataTable from '../core/components/ui/DataTable';
import { DesignTokenProvider } from '../core/context/DesignTokenContext';
import { DEFAULT_DESIGN_TOKENS, mergeDesignTokens } from '../core/theme/designTokens';

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

test('themed DataTable follows header alignment tokens', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const tokens = mergeDesignTokens(DEFAULT_DESIGN_TOKENS, { tables: { headerAlign: 'start' } });
  await act(async () => {
    root.render(
      <DesignTokenProvider tokens={tokens}>
        <DataTable
          themed
          rows={[{ id: 1, name: 'ردیف آزمایشی', amount: 1200 }]}
          columns={[
            { key: 'name', label: 'نام' },
            { key: 'amount', label: 'مبلغ', align: 'center' },
          ]}
        />
      </DesignTokenProvider>,
    );
  });

  expect(container.querySelector('[data-themed="true"]')).toBeTruthy();
  const headers = Array.from(container.querySelectorAll('thead th'));
  expect(headers).toHaveLength(2);
  // در RTL، تراز «start» یعنی راست‌چین — از توکن هدر خوانده می‌شود.
  headers.forEach((th) => expect(th.style.textAlign).toBe('right'));

  const actionCell = container.querySelectorAll('tbody td')[1];
  expect(actionCell.style.textAlign).toBe('center');

  await act(async () => { root.unmount(); });
  container.remove();
});

test('non-themed DataTable keeps the previous header alignment', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <DataTable rows={[{ id: 1, name: 'ردیف' }]} columns={[{ key: 'name', label: 'نام' }]} />,
    );
  });
  const header = container.querySelector('thead th');
  expect(header.style.textAlign).toBe('');
  expect(container.querySelector('[data-themed="true"]')).toBeNull();
  await act(async () => { root.unmount(); });
  container.remove();
});
