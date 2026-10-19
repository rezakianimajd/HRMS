import { applyNoteOverrides, buildNotePages } from '../pages/accounting/reports/financialNotes';

const api = {
  income_statement: {
    revenue: 1000,
    cost_of_sales: 400,
    expenses: 300,
    net_profit: 300,
    revenue_groups: [{ code: '41', name: 'فروش محصولات', total: 1000, rows: [] }],
    cost_groups: [{ code: '51', name: 'بهای تمام‌شده', total: 400, rows: [] }],
    expense_groups: [{ code: '61', name: 'حقوق و دستمزد', total: 300, rows: [] }],
  },
  balance_sheet: { total_assets: 900, total_liabilities: 200, total_equity: 700 },
};

const balanceData = {
  total_assets: 900,
  total_liabilities: 200,
  total_equity: 700,
  asset_groups: [
    { code: '11', name: 'موجودی نقد', total: 500, rows: [] },
    { code: '12', name: 'حساب‌های دریافتنی', total: 400, rows: [] },
  ],
  liability_groups: [{ code: '21', name: 'حساب‌های پرداختنی', total: 200, rows: [] }],
  equity_groups: [{ code: '31', name: 'سرمایه', total: 700, rows: [] }],
};

const build = (overrides = {}) => buildNotePages({
  api,
  prior: null,
  balanceData,
  priorBalanceData: null,
  openingBalanceData: null,
  ...overrides,
});

test('notes are built from ledger groups and empty notes are removed', () => {
  const pages = build();
  expect(pages.find((page) => page.page === '21')).toBeTruthy();
  expect(pages.find((page) => page.page === '31')).toBeFalsy();
  expect(pages.find((page) => page.page === '29')).toBeFalsy();

  const revenue = pages.find((page) => page.page === '21').tables[0];
  const total = revenue.rows.find((row) => row.kind === 'total');
  expect(total.values.current).toBe(1000);
  expect(total.values.prior).toBe(0);
});

test('Excel note grids keep every row and column and accept cell overrides', () => {
  const pages = build();
  const receivables = pages.find((page) => page.page === '38');
  expect(receivables.grid).toBeTruthy();
  expect(receivables.grid.rows.length).toBeGreaterThan(20);
  expect(receivables.grid.rows.some((row) => row.label.includes('اسناد دریافتنی'))).toBe(true);
  expect(receivables.grid.rows.some((row) => row.label.includes('تسهیلات اعطایی'))).toBe(true);
  expect(receivables.grid.coverage).toBeGreaterThan(0);
  expect(receivables.grid.rows.some((row) => row.cells.some((cell) => cell.x && cell.v !== null))).toBe(true);

  const payables = pages.find((page) => page.page === '48');
  expect(payables.grid.rows.length).toBeGreaterThan(20);
  expect(payables.grid.rows.some((row) => row.label.includes('تكليفى'))).toBe(true);
  const depositRow = payables.grid.rows.find((row) => row.label.includes('حسن انجام كار'));
  expect(depositRow.cells.some((cell) => cell.x)).toBe(true);

  const numeric = receivables.grid.rows
    .flatMap((row) => row.cells.map((cell) => ({ row, cell })))
    .find(({ cell }) => cell.x);
  const edited = applyNoteOverrides(pages, {
    38: { __grid__: { [`${numeric.row.r}-${numeric.cell.c}`]: 1234 } },
  });
  const editedGrid = edited.find((page) => page.page === '38').grid;
  const editedCell = editedGrid.rows
    .find((row) => row.r === numeric.row.r)
    .cells.find((cell) => cell.c === numeric.cell.c);
  expect(editedCell.v).toBe(1234);
});

test('editing a note row recalculates its total and keeps statement source intact', () => {
  const pages = build();
  const edited = applyNoteOverrides(pages, {
    21: { 'note-21-revenue': { 'note-21-revenue-0': { current: 1200 } } },
  });
  const table = edited.find((page) => page.page === '21').tables[0];
  const total = table.rows.find((row) => row.kind === 'total');
  expect(total.values.current).toBe(1200);
  expect(api.income_statement.revenue).toBe(1000);
});
