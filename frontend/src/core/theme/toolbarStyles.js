import { withAlpha } from '../utils/colorUtils';

export const DEFAULT_TOOLBAR_LABELS = {
  searchPlaceholder: 'جستجو در شماره، موضوع و طرف قرارداد…',
  filtersLabel: 'فیلترها',
  resetLabel: 'حذف فیلترها',
};

/**
 * تبدیل توکن‌های نوار جستجو/فیلتر به مقادیر آمادهٔ استایل.
 * منبع مشترک صفحه‌ها و پیش‌نمایش استودیو؛ همهٔ برچسب‌ها هم از همین‌جا می‌آیند.
 */
export const resolveToolbarTheme = (tokens) => {
  const source = tokens && typeof tokens === 'object' ? tokens : {};
  const cfg = source.toolbar && typeof source.toolbar === 'object' ? source.toolbar : {};
  const colors = source.colors && typeof source.colors === 'object' ? source.colors : {};
  const surfaces = source.surfaces && typeof source.surfaces === 'object' ? source.surfaces : {};
  const primary = colors.primary || '#6366f1';
  const cardBg = surfaces.card?.background || '#ffffff';
  const themeInk = colors.textPrimary || '#1e293b';

  const clamp = (value, low, high) => Math.min(high, Math.max(low, Number(value)));

  const panelSurface = cfg.panelSurface || 'solid';
  const panelBg = panelSurface === 'glass'
    ? withAlpha(cardBg, 0.65)
    : panelSurface === 'tinted'
      ? withAlpha(primary, 0.05)
      : (surfaces.table?.headerBackground || '#f8fafc');

  const searchSurface = cfg.searchSurface || 'solid';
  const searchBg = searchSurface === 'transparent'
    ? 'transparent'
    : searchSurface === 'glass'
      ? withAlpha(cardBg, 0.6)
      : searchSurface === 'tinted'
        ? withAlpha(primary, 0.06)
        : cardBg;

  const width = Number(cfg.searchWidth ?? 0);

  return {
    searchVariant: cfg.searchVariant || 'soft',
    searchSurface,
    searchBg,
    searchRadius: clamp(cfg.searchRadius ?? 12, 0, 32),
    searchHeight: clamp(cfg.searchHeight ?? 40, 32, 64),
    searchWidth: width > 0 ? width : '100%',
    searchIconPosition: cfg.searchIconPosition || 'start',
    filtersVariant: cfg.filtersVariant || 'outlined',
    filtersRadius: clamp(cfg.filtersRadius ?? 10, 0, 32),
    filtersIconPosition: cfg.filtersIconPosition || 'start',
    showFiltersCount: cfg.showFiltersCount !== false,
    panelSurface,
    panelBg,
    panelRadius: clamp(cfg.panelRadius ?? 14, 0, 32),
    panelPadding: clamp(cfg.panelPadding ?? 12, 0, 32),
    panelMinWidth: clamp(cfg.panelMinWidth ?? 160, 120, 360),
    panelGap: clamp(cfg.panelGap ?? 10, 0, 32),
    /* چیدمان خودکار: تعداد فیلترها را خودِ صفحه تعیین می‌کند، نه تم */
    get panelGrid() {
      return `repeat(auto-fit, minmax(${clamp(cfg.panelMinWidth ?? 160, 120, 360)}px, 1fr))`;
    },
    labelsPosition: cfg.labelsPosition || 'above',
    openByDefault: cfg.openByDefault === true,
    showActiveChips: cfg.showActiveChips !== false,
    chipStyle: cfg.chipStyle || 'soft',
    showReset: cfg.showReset !== false,
    searchPlaceholder: (cfg.searchPlaceholder || DEFAULT_TOOLBAR_LABELS.searchPlaceholder).trim(),
    filtersLabel: (cfg.filtersLabel || DEFAULT_TOOLBAR_LABELS.filtersLabel).trim(),
    resetLabel: (cfg.resetLabel || DEFAULT_TOOLBAR_LABELS.resetLabel).trim(),
    primary,
    textColor: themeInk,
    chipBg: withAlpha(primary, 0.1),
    chipBorder: withAlpha(primary, 0.22),
  };
};

export default resolveToolbarTheme;
