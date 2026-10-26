/**
 * تبدیل توکن‌های جدول (استودیوی تم) به مقادیر آمادهٔ استایل.
 *
 * یک منبع حقیقت برای صفحهٔ «قراردادهای من»، کامپوننت مشترک DataTable و
 * پیش‌نمایش استودیو؛ بنابراین هر تنظیمی که در استودیو تغییر کند، دقیقاً با
 * همان محاسبه روی جدول واقعی و پیش‌نمایش اعمال می‌شود.
 */
import { withAlpha } from '../utils/colorUtils';

const clamp = (value, low, high) => Math.min(high, Math.max(low, Number(value)));

const alignToText = (value, fallback = 'center') => {
  const key = value || fallback;
  if (key === 'start') return 'right';
  if (key === 'end') return 'left';
  return 'center';
};

export const TABLE_NUMBER_FONT_MONO = "'JetBrains Mono','Consolas','Courier New',monospace";

export const resolveTableTheme = (tokens) => {
  const source = tokens && typeof tokens === 'object' ? tokens : {};
  const cfg = source.tables && typeof source.tables === 'object' ? source.tables : {};
  const colors = source.colors && typeof source.colors === 'object' ? source.colors : {};
  const primary = colors.primary || '#6366f1';
  const themeInk = colors.textPrimary || '#1e293b';

  const dividerWidth = clamp(cfg.dividerWidth ?? 1, 0, 4);
  const dividerOpacity = clamp(cfg.dividerOpacity ?? 100, 0, 100) / 100;
  const dividerStyle = cfg.dividerStyle || 'solid';
  const divider = (cfg.showBorders !== false && dividerStyle !== 'none' && dividerWidth > 0)
    ? `${dividerWidth}px ${dividerStyle} ${withAlpha(cfg.dividerColor || colors.divider || '#e2e8f0', dividerOpacity)}`
    : 'none';

  const headerFontSize = Number(cfg.headerFontSize ?? 13);
  const headerFontWeight = Number(cfg.headerFontWeight ?? 700);
  const headerHeight = Number(cfg.headerHeight ?? 44);
  const headerColor = cfg.headerColorMode === 'custom' ? (cfg.headerColor || themeInk) : themeInk;
  const cellFontSize = Number(cfg.cellFontSize ?? 12.5);
  const cellFontWeight = Number(cfg.cellFontWeight ?? 500);
  const cellColor = cfg.cellColorMode === 'custom' ? (cfg.cellColor || themeInk) : themeInk;
  const numberFont = cfg.numberFont === 'mono' ? TABLE_NUMBER_FONT_MONO : 'inherit';
  const hover = cfg.hover !== false;
  const striped = cfg.striped === true;

  return {
    divider,
    dividerStyle,
    dividerWidth,
    headerAlign: cfg.headerAlign || 'center',
    headerTextAlign: alignToText(cfg.headerAlign, 'center'),
    cellAlign: cfg.cellAlign || 'auto',
    cellTextAlign: cfg.cellAlign === 'start' ? 'right' : (cfg.cellAlign === 'end' ? 'left' : (cfg.cellAlign === 'center' ? 'center' : null)),
    headerFontSize,
    headerFontWeight,
    headerHeight,
    headerColor,
    cellFontSize,
    cellFontWeight,
    cellColor,
    numberFont,
    hover,
    striped,
    hoverBg: hover ? withAlpha(primary, clamp(cfg.hoverTint ?? 6, 0, 40) / 100) : 'transparent',
    stripeBg: striped ? withAlpha(primary, clamp(cfg.stripeTint ?? 4, 0, 40) / 100) : 'transparent',
    frame: cfg.frame !== 'plain',
    frameX: Number(cfg.frameMarginX ?? 0),
    frameY: Number(cfg.framePadding ?? 0),
    singleLine: cfg.singleLine !== false,
    cellPadding: Number(cfg.cellPadding ?? 8),
    rowHeight: Number(cfg.rowHeight ?? 38),
    radius: Number(cfg.radius ?? 16),
    columnMinWidth: Number(cfg.columnMinWidth ?? 0),
    /* صفحه‌بندی: تعداد ردیف هر صفحه از همین توکن به API هم فرستاده می‌شود */
    rowsPerPage: Math.min(100, Math.max(5, Number(cfg.rowsPerPage ?? 20))),
    showPagination: cfg.showPagination !== false,
    paginationVariant: cfg.paginationVariant === 'simple' ? 'simple' : 'pages',
    paginationDense: cfg.paginationDense !== false,
    showPaginationRange: cfg.showPaginationRange !== false,
    paginationFontSize: Math.min(18, Math.max(10, Number(cfg.paginationFontSize ?? 12))),
    /* رنگ صفحه‌بندی: از رنگ اصلی تم، رنگ ماژول، یا رنگ سفارشی */
    paginationAccent: cfg.paginationColorMode === 'custom'
      ? (cfg.paginationColor || colors.primary || '#6366f1')
      : cfg.paginationColorMode === 'module'
        ? (colors.moduleAccent || colors.primary || '#6366f1')
        : (colors.primary || '#6366f1'),
    paginationRadius: Math.min(20, Math.max(0, Number(source.shape?.small ?? 8))),
    /* استایل‌های آمادهٔ inline برای هدر و سلول‌ها */
    header: {
      fontSize: `${headerFontSize}px`,
      fontWeight: headerFontWeight,
      color: headerColor,
      height: `${headerHeight}px`,
    },
    cell: {
      fontSize: `${cellFontSize}px`,
      fontWeight: cellFontWeight,
      color: cellColor,
    },
  };
};

/** استایل تایپوگرافی محتوای سلول‌ها (متن داخل Typography/Chip را هم می‌گیرد). */
export const tableTypographySx = (theme) => {
  if (!theme) return {};
  return {
    '& td .MuiTypography-root, & td .MuiChip-label, & td .MuiFormControlLabel-label': {
      fontSize: `${theme.cellFontSize}px !important`,
      fontWeight: `${theme.cellFontWeight} !important`,
    },
    '& th .MuiTypography-root': {
      fontSize: `${theme.headerFontSize}px !important`,
      fontWeight: `${theme.headerFontWeight} !important`,
    },
  };
};

export default resolveTableTheme;
