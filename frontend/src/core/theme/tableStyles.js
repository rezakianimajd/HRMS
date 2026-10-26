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

export default resolveTableTheme;
