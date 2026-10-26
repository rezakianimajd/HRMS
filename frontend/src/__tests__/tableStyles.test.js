import { resolveTableTheme, TABLE_NUMBER_FONT_MONO, tableTypographySx } from '../core/theme/tableStyles';
import { designComponentOverrides } from '../core/theme/themeAdapter';
import { DEFAULT_DESIGN_TOKENS } from '../core/theme/designTokens';

test('resolver derives typography, divider and row colors from tokens', () => {
  const theme = resolveTableTheme({
    colors: { primary: '#6366f1', textPrimary: '#1e293b', divider: '#eef2f7' },
    tables: {
      headerFontSize: 15, headerFontWeight: 800, headerHeight: 52, headerAlign: 'start',
      headerColorMode: 'custom', headerColor: '#7c3aed',
      cellFontSize: 11.5, cellFontWeight: 400, cellAlign: 'end',
      cellColorMode: 'theme', numberFont: 'mono',
      dividerStyle: 'dotted', dividerWidth: 2, dividerColor: '#94a3b8', dividerOpacity: 50,
      striped: true, stripeTint: 10, hoverTint: 20, hover: true,
      frame: 'card', frameMarginX: 8, framePadding: 6, singleLine: true,
      cellPadding: 10, rowHeight: 44, radius: 12, columnMinWidth: 120,
    },
  });

  expect(theme.header.fontSize).toBe('15px');
  expect(theme.header.fontWeight).toBe(800);
  expect(theme.header.height).toBe('52px');
  expect(theme.header.color).toBe('#7c3aed');
  expect(theme.headerTextAlign).toBe('right'); // start → راست‌چین در RTL
  expect(theme.cell.fontSize).toBe('11.5px');
  expect(theme.cell.fontWeight).toBe(400);
  expect(theme.cellTextAlign).toBe('left'); // end → چپ‌چین
  expect(theme.cell.color).toBe('#1e293b'); // حالت theme از پالت
  expect(theme.numberFont).toBe(TABLE_NUMBER_FONT_MONO);
  expect(theme.divider).toBe('2px dotted rgba(148,163,184,0.5)');
  expect(theme.hoverBg).toBe('rgba(99,102,241,0.2)');
  expect(theme.stripeBg).toBe('rgba(99,102,241,0.1)');
  expect(theme.frame).toBe(true);
  expect(theme.frameX).toBe(8);
  expect(theme.frameY).toBe(6);
  expect(theme.cellPadding).toBe(10);
  expect(theme.rowHeight).toBe(44);
  expect(theme.columnMinWidth).toBe(120);
});

test('defaults keep tables readable when tokens are missing', () => {
  const theme = resolveTableTheme(DEFAULT_DESIGN_TOKENS);
  expect(theme.headerAlign).toBe('center');
  expect(theme.headerTextAlign).toBe('center');
  expect(theme.header.fontWeight).toBe(700);
  expect(theme.header.fontSize).toBe('13px');
  expect(theme.divider).toContain('1px solid');
  expect(theme.dividerStyle).toBe('solid');
  expect(theme.numberFont).toBe('inherit');
  expect(theme.striped).toBe(false);
  expect(theme.hover).toBe(true);
  expect(theme.cellAlign).toBe('auto');
  expect(theme.cellTextAlign).toBeNull();
  expect(theme.rowsPerPage).toBe(20);
  expect(theme.showPagination).toBe(true);
  expect(theme.paginationVariant).toBe('pages');
  expect(theme.showPaginationRange).toBe(true);

  const empty = resolveTableTheme();
  expect(empty.headerAlign).toBe('center');
  expect(empty.divider).toContain('1px solid');
});

test('divider disappears when borders are off, style is none or width is zero', () => {
  expect(resolveTableTheme({ tables: { showBorders: false } }).divider).toBe('none');
  expect(resolveTableTheme({ tables: { dividerWidth: 0 } }).divider).toBe('none');
  expect(resolveTableTheme({ tables: { dividerStyle: 'none' } }).divider).toBe('none');
});


test('cell typography rules also target the content rendered inside cells', () => {
  const theme = resolveTableTheme({
    tables: { cellFontSize: 14, cellFontWeight: 600, headerFontSize: 16, headerFontWeight: 800 },
  });
  const sx = tableTypographySx(theme);
  const cellRule = sx['& td .MuiTypography-root, & td .MuiChip-label, & td .MuiFormControlLabel-label'];
  // متن سلول‌ها داخل Typography/Chip رندر می‌شود؛ بدون این قاعده، اندازه/وزن نادیده گرفته می‌شد.
  expect(cellRule.fontSize).toBe('14px !important');
  expect(cellRule.fontWeight).toBe('600 !important');
  expect(sx['& th .MuiTypography-root'].fontSize).toBe('16px !important');
  expect(sx['& th .MuiTypography-root'].fontWeight).toBe('800 !important');
  expect(tableTypographySx(null)).toEqual({});
});

test('striped rows are painted by one global rule driven by the token', () => {
  const overrides = designComponentOverrides(DEFAULT_DESIGN_TOKENS);
  const rowRoot = overrides.MuiTableRow.styleOverrides.root;
  // تنها منبع رنگ‌آمیزی یک‌درمیان: قاعدهٔ سراسری ردیف‌های فرد با متغیر توکن.
  // اگر صفحه‌ها خودشان هم رنگ بزنند، با فاز مخالف جمع می‌شود و همهٔ ردیف‌ها رنگی می‌شوند.
  expect(rowRoot['&:nth-of-type(odd)'].backgroundColor).toBe('var(--hrms-table-row-alt-bg, transparent)');
});


test('pagination tokens are clamped to sane page sizes', () => {
  expect(resolveTableTheme({ tables: { rowsPerPage: 500 } }).rowsPerPage).toBe(100);
  expect(resolveTableTheme({ tables: { rowsPerPage: 1 } }).rowsPerPage).toBe(5);
  expect(resolveTableTheme({ tables: { rowsPerPage: 50, paginationVariant: 'simple' } }).paginationVariant).toBe('simple');
  expect(resolveTableTheme({ tables: { showPagination: false } }).showPagination).toBe(false);
});
