import React, { useState } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { ModuleTable } from '../pages/contracts/contractModuleUi';

const tableTheme = {
  fontFamily: 'inherit',
  cellPadding: 4,
  divider: 'none',
  headerTextAlign: 'center',
  headerHeight: 32,
  rowHeight: 32,
  singleLine: true,
  header: { fontSize: 10, fontWeight: 700, color: '#111' },
  cell: { fontSize: 10, fontWeight: 400, color: '#333' },
  hoverBg: 'transparent',
};

const columns = [
  {
    key: 'name', label: 'نام', sortKey: 'name', sortType: 'text',
    render: (row) => <span>{row.name}</span>,
  },
  {
    key: 'amount', label: 'مبلغ', sortKey: 'amount', sortType: 'number', defaultSortDirection: 'desc',
    render: (row) => <span>{row.amount}</span>,
  },
  {
    key: 'actions', label: 'عملیات',
    render: () => <span>—</span>,
  },
];

const rows = [
  { id: 1, name: 'ب', amount: 200 },
  { id: 2, name: 'الف', amount: 100 },
];

const Harness = () => {
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });
  return (
    <>
      <span data-testid="sort-state">{sort.key}:{sort.direction}</span>
      <ModuleTable
        tableTheme={tableTheme}
        ariaLabel="test table"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        sort={sort}
        onSort={setSort}
      />
    </>
  );
};

test('module table headers toggle ascending and descending sorting', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(<Harness />); });

  const nameHeader = container.querySelector('[aria-label="مرتب‌سازی بر اساس نام"]');
  expect(nameHeader).toBeTruthy();
  expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
  await act(async () => { nameHeader.click(); });
  expect(container.querySelector('[data-testid="sort-state"]').textContent).toBe('name:desc');

  const amountHeader = container.querySelector('[aria-label="مرتب‌سازی بر اساس مبلغ"]');
  await act(async () => { amountHeader.click(); });
  expect(container.querySelector('[data-testid="sort-state"]').textContent).toBe('amount:desc');

  await act(async () => { root.unmount(); });
  container.remove();
});
