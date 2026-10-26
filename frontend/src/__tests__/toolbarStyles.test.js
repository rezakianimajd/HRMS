import { resolveToolbarTheme, DEFAULT_TOOLBAR_LABELS } from '../core/theme/toolbarStyles';
import { DEFAULT_DESIGN_TOKENS as DEFAULT_DESIGN } from '../core/theme/designTokens';

test('toolbar resolver exposes defaults and clamped sizes', () => {
  const toolbar = resolveToolbarTheme(DEFAULT_DESIGN);
  expect(toolbar.filtersLabel).toBe('فیلترها');
  expect(toolbar.searchPlaceholder).toBe(DEFAULT_TOOLBAR_LABELS.searchPlaceholder);
  expect(toolbar.searchWidth).toBe('100%');
  expect(toolbar.panelColumns).toBe(3);
  expect(toolbar.openByDefault).toBe(false);
  expect(toolbar.showActiveChips).toBe(true);
  expect(toolbar.labelsPosition).toBe('above');
});

test('toolbar resolver applies custom labels, width and surfaces', () => {
  const toolbar = resolveToolbarTheme({
    colors: { primary: '#2563eb', textPrimary: '#0f172a' },
    surfaces: { card: { background: '#ffffff' }, table: { headerBackground: '#f1f5f9' } },
    toolbar: {
      searchWidth: 320, searchHeight: 80, searchRadius: 99, panelColumns: 9,
      filtersLabel: '  فیلتر پیشرفته  ', resetLabel: 'پاک‌سازی', searchPlaceholder: 'جستجو…',
      panelSurface: 'tinted', chipStyle: 'outlined', openByDefault: true,
    },
  });
  expect(toolbar.searchWidth).toBe(320);
  expect(toolbar.searchHeight).toBe(64); // سقف مجاز
  expect(toolbar.searchRadius).toBe(32);
  expect(toolbar.panelColumns).toBe(4);
  expect(toolbar.filtersLabel).toBe('فیلتر پیشرفته');
  expect(toolbar.resetLabel).toBe('پاک‌سازی');
  expect(toolbar.searchPlaceholder).toBe('جستجو…');
  expect(toolbar.openByDefault).toBe(true);
  expect(toolbar.chipStyle).toBe('outlined');
  expect(toolbar.panelBg).toContain('rgba(37,99,235');
  expect(toolbar.chipBg).toContain('rgba(37,99,235');
});
