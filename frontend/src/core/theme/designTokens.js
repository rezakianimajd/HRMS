/**
 * Design tokens — منبع واحد پیش‌فرض‌های ظاهری برنامه.
 *
 * این فایل فقط داده و توابع خالص دارد و نباید به MUI وابسته باشد؛
 * App.jsx و Theme Studio از همین ساختار برای ساخت تم و CSS Variables
 * استفاده می‌کنند.
 *
 * ساختار:
 *  typography → نقش‌های متنی (هدر، کارت، جدول، فرم، دکمه و...)
 *  colors     → رنگ‌های معنایی
 *  surfaces   → سطح‌های صفحه، هدر، کارت، جدول، دیالوگ و Drawer
 *  shape      → شعاع گوشه‌ها
 *  spacing    → فاصله‌های سراسری
 *  shadows    → سایه‌های از پیش تعریف‌شده
 *  density    → چگالی نمایش
 */
import { DEFAULT_TYPOGRAPHY, fontStack } from './appearanceDefaults';

export const DESIGN_TOKEN_VERSION = 2;

export const DESIGN_ROLE_KEYS = [
  'pageHeader', 'sectionTitle', 'cardTitle', 'cardSubtitle', 'cardValue',
  'tableHeader', 'tableCell', 'formLabel', 'input', 'body', 'button',
  'chip', 'navItem', 'caption', 'tooltip',
];

export const DEFAULT_DESIGN_TOKENS = {
  version: DESIGN_TOKEN_VERSION,
  typography: {
    family: DEFAULT_TYPOGRAPHY.family,
    roles: {
      pageHeader: { size: DEFAULT_TYPOGRAPHY.headerSize, weight: DEFAULT_TYPOGRAPHY.headerWeight, lineHeight: 1.5 },
      sectionTitle: { size: 16, weight: 500, lineHeight: 1.6 },
      cardTitle: { size: DEFAULT_TYPOGRAPHY.cardSize, weight: DEFAULT_TYPOGRAPHY.cardWeight, lineHeight: 1.6 },
      cardSubtitle: { size: 12, weight: 400, lineHeight: 1.6 },
      cardValue: { size: DEFAULT_TYPOGRAPHY.statSize, weight: DEFAULT_TYPOGRAPHY.statWeight, lineHeight: 1.5 },
      tableHeader: { size: DEFAULT_TYPOGRAPHY.bodySize, weight: 500, lineHeight: 1.5 },
      tableCell: { size: DEFAULT_TYPOGRAPHY.bodySize, weight: DEFAULT_TYPOGRAPHY.bodyWeight, lineHeight: 1.6 },
      formLabel: { size: DEFAULT_TYPOGRAPHY.bodySize, weight: DEFAULT_TYPOGRAPHY.bodyWeight, lineHeight: 1.5 },
      input: { size: DEFAULT_TYPOGRAPHY.bodySize, weight: DEFAULT_TYPOGRAPHY.bodyWeight, lineHeight: 1.5 },
      body: { size: DEFAULT_TYPOGRAPHY.bodySize, weight: DEFAULT_TYPOGRAPHY.bodyWeight, lineHeight: 1.8 },
      button: { size: DEFAULT_TYPOGRAPHY.buttonSize, weight: DEFAULT_TYPOGRAPHY.buttonWeight, lineHeight: 1.5 },
      chip: { size: 12, weight: 400, lineHeight: 1.5 },
      navItem: { size: 12.5, weight: 400, lineHeight: 1.6 },
      caption: { size: 12, weight: 400, lineHeight: 1.6 },
      tooltip: { size: 12, weight: 400, lineHeight: 1.5 },
    },
  },
  colors: {
    primary: '#6366f1',
    secondary: '#ec4899',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#0ea5e9',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    border: '#e8edf4',
    divider: '#eef2f7',
    hover: '#f5f7fb',
    selected: '#eef2ff',
  },
  surfaces: {
    page: { background: '#f8fafc', shadow: 'none' },
    appHeader: { background: '#ffffff', height: 64, border: '1px solid #e8edf4', shadow: 'soft' },
    sidebar: { background: '#ffffff', width: 336, border: '1px solid #e8edf4', shadow: 'none' },
    pageHeader: { background: '#ffffff', border: '1px solid #e8edf4', radius: 16, shadow: 'header' },
    card: { background: '#ffffff', border: '1px solid #e8edf4', radius: 16, shadow: 'none' },
    table: { background: '#ffffff', border: '1px solid #e8edf4', radius: 16, shadow: 'none', headerBackground: '#f8fafc' },
    dialog: { background: '#ffffff', border: 'none', radius: 18, shadow: 'dialog' },
    drawer: { background: '#ffffff', radius: 0, shadow: 'drawer' },
  },
  shape: { small: 8, medium: 10, large: 16, pill: 999 },
  spacing: { pagePadding: 24, sectionGap: 14, cardPadding: 16, tableCellPadding: 8 },
  shadows: {
    none: 'none',
    soft: '0 2px 10px rgba(15,23,42,0.04)',
    card: '0 4px 18px rgba(15,23,42,0.06)',
    header: '0 4px 18px rgba(15,23,42,0.04)',
    dropdown: '0 18px 45px rgba(15,23,42,0.16)',
    dialog: '0 24px 80px rgba(15,23,42,0.18)',
    drawer: '0 18px 45px rgba(15,23,42,0.12)',
    focus: '0 0 0 3px rgba(99,102,241,0.12)',
  },
  density: { mode: 'comfortable', tableRowHeight: 38, inputHeight: 40, buttonHeight: 36 },
  infoCards: {
    variant: 'inline',
    surface: 'solid',
    align: 'start',
    accentMode: 'module',
    labelPosition: 'inline',
    iconPosition: 'start',
    valuePosition: 'end',
    showIcon: true,
    showLabel: true,
    showSub: true,
    showDivider: false,
    tint: 8,
    glassOpacity: 0.55,
    glassBlur: 14,
    radius: 16,
    padding: 12,
    shadow: 'none',
  },
  headers: {
    variant: 'standard',
    surface: 'solid',
    align: 'start',
    accentMode: 'module',
    showIcon: true,
    showSubtitle: true,
    subtitlePosition: 'below',
    showBadge: true,
    iconPosition: 'start',
    tint: 8,
    glassOpacity: 0.55,
    glassBlur: 14,
    radius: 16,
    padding: 16,
    shadow: 'header',
  },
  tables: {
    variant: 'default',
    surface: 'solid',
    striped: false,
    hover: true,
    showBorders: true,
    headerStyle: 'filled',
    headerAlign: 'center',
    headerFontSize: 13,
    headerFontWeight: 700,
    headerHeight: 44,
    headerColorMode: 'theme',
    headerColor: '#334155',
    cellFontSize: 12.5,
    cellFontWeight: 500,
    cellAlign: 'auto',
    cellColorMode: 'theme',
    cellColor: '#334155',
    numberFont: 'inherit',
    hoverTint: 6,
    stripeTint: 4,
    dividerWidth: 1,
    dividerStyle: 'solid',
    dividerColor: '#e2e8f0',
    dividerOpacity: 100,
    frame: 'card',
    frameMarginX: 0,
    framePadding: 0,
    singleLine: true,
    columnMinWidth: 0,
    cellPadding: 8,
    rowHeight: 38,
    radius: 16,
    glassOpacity: 0.5,
    glassBlur: 12,
  },
  lists: {
    variant: 'default',
    surface: 'solid',
    itemPadding: 8,
    showDivider: true,
    hover: true,
    radius: 12,
    glassOpacity: 0.5,
    glassBlur: 12,
  },
  toolbar: {
    searchVariant: 'soft',
    searchSurface: 'solid',
    searchRadius: 12,
    searchHeight: 40,
    searchWidth: 0,
    searchIconPosition: 'start',
    searchPlaceholder: 'جستجو در شماره، موضوع و طرف قرارداد…',
    filtersVariant: 'outlined',
    filtersLabel: 'فیلترها',
    filtersIconPosition: 'start',
    filtersRadius: 10,
    showFiltersCount: true,
    panelSurface: 'solid',
    panelRadius: 14,
    panelPadding: 12,
    panelColumns: 3,
    panelGap: 10,
    labelsPosition: 'above',
    openByDefault: false,
    showActiveChips: true,
    chipStyle: 'soft',
    showReset: true,
    resetLabel: 'حذف فیلترها',
  },
  components: {},
};

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** ادغام عمیق فقط برای آبجکت‌ها؛ آرایه‌ها و مقادیر ساده جایگزین می‌شوند. */
export const mergeDesignTokens = (...sources) => {
  const result = {};
  sources.forEach((source) => {
    if (!isPlainObject(source)) return;
    Object.entries(source).forEach(([key, value]) => {
      if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = mergeDesignTokens(result[key], value);
      } else if (isPlainObject(value)) {
        result[key] = mergeDesignTokens({}, value);
      } else {
        result[key] = value;
      }
    });
  });
  return result;
};

const modeSurface = (overrides) => {
  const surface = (background) => ({
    background,
    ...(overrides.border ? { border: overrides.border } : {}),
  });
  return {
    page: { background: overrides.page || overrides.background },
    appHeader: surface(overrides.appHeader || overrides.surface),
    sidebar: surface(overrides.sidebar || overrides.surface),
    pageHeader: surface(overrides.pageHeader || overrides.surface),
    card: surface(overrides.card || overrides.surface),
    table: {
      ...surface(overrides.table || overrides.surface),
      headerBackground: overrides.tableHeader || overrides.surfaceMuted || overrides.surface,
    },
    dialog: { background: overrides.dialog || overrides.surface },
    drawer: { background: overrides.drawer || overrides.surface },
  };
};

export const DESIGN_MODE_OVERRIDES = {
  dark: {
    colors: {
      primary: '#818cf8', secondary: '#f472b6', success: '#34d399', warning: '#fbbf24',
      danger: '#f87171', info: '#38bdf8', background: '#0f172a',
      surface: 'rgba(30,41,59,0.75)', surfaceElevated: 'rgba(30,41,59,0.92)',
      textPrimary: '#e2e8f0', textSecondary: '#94a3b8',
      border: 'rgba(148,163,184,0.12)', divider: 'rgba(148,163,184,0.12)',
      hover: 'rgba(129,140,248,0.08)', selected: 'rgba(129,140,248,0.16)',
    },
    surfaces: modeSurface({
      background: '#0f172a', page: '#0f172a', surface: 'rgba(30,41,59,0.75)',
      surfaceMuted: 'rgba(15,23,42,0.55)', appHeader: '#0f172a', sidebar: '#0f172a',
      pageHeader: 'rgba(30,41,59,0.75)', card: 'rgba(30,41,59,0.6)',
      table: 'rgba(30,41,59,0.6)', dialog: '#1e293b', drawer: '#0f172a',
      border: '1px solid rgba(148,163,184,0.12)',
    }),
    shadows: {
      card: '0 8px 24px rgba(0,0,0,0.20)', header: '0 8px 24px rgba(0,0,0,0.16)',
      dropdown: '0 18px 45px rgba(0,0,0,0.35)', dialog: '0 24px 80px rgba(0,0,0,0.4)',
    },
  },
  fmode: {
    colors: {
      primary: '#39ff14', secondary: '#00ffff', success: '#39ff14', warning: '#ffff00',
      danger: '#ff073a', info: '#00ffff', background: '#050505',
      surface: 'rgba(5,5,5,0.75)', surfaceElevated: 'rgba(15,15,15,0.92)',
      textPrimary: '#39ff14', textSecondary: '#a3a3a3',
      border: 'rgba(57,255,20,0.3)', divider: 'rgba(57,255,20,0.2)',
      hover: 'rgba(57,255,20,0.07)', selected: 'rgba(57,255,20,0.14)',
    },
    surfaces: modeSurface({
      background: '#050505', page: '#050505', surface: 'rgba(5,5,5,0.75)',
      surfaceMuted: 'rgba(15,15,15,0.55)', appHeader: '#050505', sidebar: '#050505',
      pageHeader: 'rgba(5,5,5,0.75)', card: 'rgba(5,5,5,0.6)',
      table: 'rgba(5,5,5,0.6)', dialog: '#0d0d0d', drawer: '#050505',
      border: '1px solid rgba(57,255,20,0.3)',
    }),
    shadows: {
      card: '0 0 18px rgba(57,255,20,0.12)', header: '0 0 18px rgba(57,255,20,0.10)',
      focus: '0 0 12px rgba(57,255,20,0.25)',
    },
  },
  fmode_light: {
    colors: {
      primary: '#00c853', secondary: '#00bfa5', success: '#00c853', warning: '#ff9800',
      danger: '#ff1744', info: '#00b8d4', background: '#f1fdf7',
      surface: '#ffffff', surfaceElevated: '#ffffff',
      textPrimary: '#0d3b22', textSecondary: '#4b6b59',
      border: '#d7f3e4', divider: '#e3f7eb', hover: '#effbf5', selected: '#dcf8e9',
    },
    surfaces: modeSurface({
      background: '#f1fdf7', page: '#f1fdf7', surface: '#ffffff',
      surfaceMuted: '#f4fcf8', appHeader: '#ffffff', sidebar: '#ffffff',
      pageHeader: '#ffffff', card: '#ffffff', table: '#ffffff',
      dialog: '#ffffff', drawer: '#ffffff',
      border: '1px solid #d7f3e4',
    }),
  },
  kurosawa: {
    colors: {
      primary: '#111827', secondary: '#4b5563', success: '#111827', warning: '#4b5563',
      danger: '#000000', info: '#374151', background: '#f3f4f6',
      surface: '#ffffff', surfaceElevated: '#ffffff',
      textPrimary: '#111111', textSecondary: '#6b7280',
      border: '#e5e7eb', divider: '#e5e7eb', hover: '#f3f4f6', selected: '#e5e7eb',
    },
    surfaces: modeSurface({
      background: '#f3f4f6', page: '#f3f4f6', surface: '#ffffff',
      surfaceMuted: '#f9fafb', appHeader: '#ffffff', sidebar: '#ffffff',
      pageHeader: '#ffffff', card: '#ffffff', table: '#ffffff',
      dialog: '#ffffff', drawer: '#ffffff',
      border: '1px solid #e5e7eb',
    }),
  },
};


const LEGACY_ROLE_MAP = {
  pageHeader: ['headerSize', 'headerWeight'],
  cardTitle: ['cardSize', 'cardWeight'],
  cardValue: ['statSize', 'statWeight'],
  body: ['bodySize', 'bodyWeight'],
  button: ['buttonSize', 'buttonWeight'],
};

const applyLegacyTypography = (tokens, legacy = {}) => {
  const source = legacy && typeof legacy === 'object' ? legacy : {};
  if (!Object.keys(source).length) return mergeDesignTokens(tokens);
  const next = mergeDesignTokens(tokens);
  if (source.family) next.typography.family = source.family;
  Object.entries(LEGACY_ROLE_MAP).forEach(([role, [sizeKey, weightKey]]) => {
    const target = next.typography.roles[role];
    next.typography.roles[role] = {
      ...target,
      size: source[sizeKey] ?? target.size,
      weight: source[weightKey] ?? target.weight,
    };
  });
  return next;
};

/** ادغام توکن‌های ذخیره‌شده با پیش‌فرض‌ها. */
export const normalizeDesignTokens = (raw) => {
  const value = raw?.design || raw?.tokens || raw;
  return mergeDesignTokens(DEFAULT_DESIGN_TOKENS, isPlainObject(value) ? value : {});
};

/**
 * توکن مؤثر برنامه:
 * پیش‌فرض → تنظیمات ذخیره‌شده → تایپوگرافی قدیمی → تم → ماژول.
 */
export const resolveDesignTokens = ({
  design, typography, mode = 'light', modulePalette = null, neonColor = null,
} = {}) => {
  let tokens = normalizeDesignTokens(design);
  tokens = applyLegacyTypography(tokens, typography);
  tokens = mergeDesignTokens(tokens, DESIGN_MODE_OVERRIDES[mode] || {});

  if (mode === 'fmode' && neonColor) {
    tokens.colors.primary = neonColor;
    tokens.colors.moduleAccent = neonColor;
  } else if (modulePalette?.accent && mode !== 'fmode' && mode !== 'kurosawa') {
    tokens.colors.primary = modulePalette.accent;
    tokens.colors.moduleAccent = modulePalette.accent;
    tokens.shadows.focus = `0 0 0 3px ${modulePalette.accent}1f`;
  }
  if (modulePalette?.background && (mode === 'light' || mode === 'fmode_light')) {
    tokens.colors.background = modulePalette.background;
    tokens.surfaces.page.background = modulePalette.background;
  }
  return tokens;
};

/** تبدیل توکن‌های جدید به تایپوگرافی flat فعلی برای سازگاری. */
export const legacyTypographyFromDesign = (design) => {
  const roles = design?.typography?.roles || DEFAULT_DESIGN_TOKENS.typography.roles;
  return {
    family: design?.typography?.family || DEFAULT_TYPOGRAPHY.family,
    headerSize: roles.pageHeader.size,
    headerWeight: roles.pageHeader.weight,
    cardSize: roles.cardTitle.size,
    cardWeight: roles.cardTitle.weight,
    bodySize: roles.body.size,
    bodyWeight: roles.body.weight,
    buttonSize: roles.button.size,
    buttonWeight: roles.button.weight,
    statSize: roles.cardValue.size,
    statWeight: roles.cardValue.weight,
  };
};

/** تغییرات تایپوگرافی قدیمی را به نقش‌های جدید منتقل می‌کند. */
export const syncDesignWithLegacyTypography = (design, typography) => (
  applyLegacyTypography(normalizeDesignTokens(design), typography)
);

export const shadowValue = (design, key) => {
  if (!key) return 'none';
  if (design?.shadows?.[key]) return design.shadows[key];
  return key;
};

const parseColor = (value) => {
  const text = String(value || '').trim();
  const hex = text.replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
  }
  const rgba = text.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const channels = rgba[1].split(',').map((part) => Number(part.trim()));
    if (channels.length >= 3 && channels.slice(0, 3).every(Number.isFinite)) return channels.slice(0, 3);
  }
  return null;
};

/** رنگ HEX/RGB را به RGBA امن تبدیل می‌کند (برای شیشه‌ای و شفافیت). */
export const colorWithAlpha = (value, alpha = 1) => {
  const channels = parseColor(value);
  if (!channels) return value;
  const safeAlpha = Math.min(1, Math.max(0, Number(alpha) || 0));
  return `rgba(${channels.join(',')},${safeAlpha})`;
};

export const infoCardBackground = (design, config = {}) => {
  const surface = config.surface || 'solid';
  const base = design.surfaces.card.background;
  if (surface === 'transparent') return 'transparent';
  if (surface === 'glass') return colorWithAlpha(base, config.glassOpacity ?? 0.55);
  if (surface === 'tinted') {
    return `linear-gradient(135deg, ${colorWithAlpha(design.colors.primary, (config.tint ?? 8) / 100)}, ${base})`;
  }
  return base;
};

export const headerBackground = (design, config = {}) => {
  const surface = config.surface || 'solid';
  const base = design.surfaces.pageHeader.background;
  if (surface === 'transparent') return 'transparent';
  if (surface === 'glass') return colorWithAlpha(base, config.glassOpacity ?? 0.55);
  if (surface === 'tinted') {
    return `linear-gradient(135deg, ${colorWithAlpha(design.colors.primary, (config.tint ?? 8) / 100)}, ${base})`;
  }
  return base;
};

export const tableBackground = (design, config = {}) => {
  const surface = config.surface || 'solid';
  const base = design.surfaces.table.background;
  if (surface === 'transparent') return 'transparent';
  if (surface === 'glass') return colorWithAlpha(base, config.glassOpacity ?? 0.5);
  if (surface === 'tinted') {
    return `linear-gradient(135deg, ${colorWithAlpha(design.colors.primary, 0.06)}, ${base})`;
  }
  return base;
};

export const listBackground = (design, config = {}) => {
  const base = design.surfaces.card.background;
  if (config.surface === 'transparent') return 'transparent';
  if (config.surface === 'glass') return colorWithAlpha(base, config.glassOpacity ?? 0.5);
  if (config.surface === 'tinted') return colorWithAlpha(design.colors.primary, 0.04);
  return base;
};


const px = (value, fallback = 0) => `${Number.isFinite(Number(value)) ? Number(value) : fallback}px`;

/** متغیرهای CSS برای استفاده در کامپوننت‌های مشترک و صفحات قدیمی. */
export const designCssVariables = (design) => {
  const roles = design.typography.roles;
  const colors = design.colors;
  const surfaces = design.surfaces;
  const infoCards = design.infoCards;
  const headers = design.headers;
  const tables = design.tables;
  const lists = design.lists;
  const surfaceShadow = (key) => shadowValue(design, key);
  const glassFilter = (config) => (config.surface === 'glass' ? `blur(${config.glassBlur ?? 14}px)` : 'none');
  const tableBorder = tables.showBorders ? surfaces.table.border : 'none';
  const tableDividerOpacity = Math.min(100, Math.max(0, Number(tables.dividerOpacity ?? 100))) / 100;
  const tableDividerWidth = Math.min(4, Math.max(0, Number(tables.dividerWidth ?? 1)));
  const tableDivider = tables.showBorders && tables.dividerStyle !== 'none' && tableDividerWidth > 0
    ? `${tableDividerWidth}px ${tables.dividerStyle || 'solid'} ${colorWithAlpha(tables.dividerColor || colors.divider || '#e2e8f0', tableDividerOpacity)}`
    : 'none';
  /* تایپوگرافی و رنگ‌های جدول: حالت «تم» از پالت پیروی می‌کند، حالت «سفارشی» از رنگ انتخابی. */
  const tableHeaderColor = tables.headerColorMode === 'custom'
    ? (tables.headerColor || colors.textPrimary)
    : colors.textPrimary;
  const tableCellColor = tables.cellColorMode === 'custom'
    ? (tables.cellColor || colors.textPrimary)
    : colors.textPrimary;
  const tableHoverBg = tables.hover
    ? colorWithAlpha(colors.primary, Math.min(40, Math.max(0, Number(tables.hoverTint ?? 6))) / 100)
    : 'transparent';
  const tableStripeBg = tables.striped
    ? colorWithAlpha(colors.primary, Math.min(40, Math.max(0, Number(tables.stripeTint ?? 4))) / 100)
    : 'transparent';
  const tableCellAlign = tables.cellAlign === 'end' ? 'left' : (tables.cellAlign === 'start' ? 'right' : (tables.cellAlign === 'center' ? 'center' : 'inherit'));
  const tableIsGlass = tables.variant === 'glass' || tables.surface === 'glass';
  const effectiveTables = { ...tables, surface: tableIsGlass ? 'glass' : tables.surface };
  const tableCellPadding = tables.variant === 'compact' ? 6 : tables.variant === 'spacious' ? 12 : tables.cellPadding;
  const tableRowHeight = tables.variant === 'compact' ? 32 : tables.variant === 'spacious' ? 46 : tables.rowHeight;
  const listItemPadding = lists.variant === 'compact' ? 5 : lists.variant === 'spacious' ? 14 : lists.itemPadding;
  return {
    '--hrms-font-family': fontStack(design.typography.family),
    '--hrms-font-page-header-size': px(roles.pageHeader.size, 20),
    '--hrms-font-section-title-size': px(roles.sectionTitle.size, 16),
    '--hrms-font-card-title-size': px(roles.cardTitle.size, 16),
    '--hrms-font-card-subtitle-size': px(roles.cardSubtitle.size, 12),
    '--hrms-font-card-value-size': px(roles.cardValue.size, 14),
    '--hrms-font-table-header-size': px(roles.tableHeader.size, 13),
    '--hrms-font-table-cell-size': px(roles.tableCell.size, 13),
    '--hrms-font-form-label-size': px(roles.formLabel.size, 13),
    '--hrms-font-input-size': px(roles.input.size, 13),
    '--hrms-font-body-size': px(roles.body.size, 13),
    '--hrms-font-button-size': px(roles.button.size, 13),
    '--hrms-font-chip-size': px(roles.chip.size, 12),
    '--hrms-font-nav-size': px(roles.navItem.size, 12.5),
    '--hrms-font-caption-size': px(roles.caption.size, 12),
    '--hrms-font-tooltip-size': px(roles.tooltip.size, 12),
    '--hrms-color-primary': colors.primary,
    '--hrms-color-module-accent': colors.moduleAccent || colors.primary,
    '--hrms-color-secondary': colors.secondary,
    '--hrms-color-success': colors.success,
    '--hrms-color-warning': colors.warning,
    '--hrms-color-danger': colors.danger,
    '--hrms-color-info': colors.info,
    '--hrms-color-background': colors.background,
    '--hrms-color-surface': colors.surface,
    '--hrms-color-text-primary': colors.textPrimary,
    '--hrms-color-text-secondary': colors.textSecondary,
    '--hrms-color-border': colors.border,
    '--hrms-color-divider': colors.divider,
    '--hrms-color-hover': colors.hover,
    '--hrms-color-selected': colors.selected,
    '--hrms-region-page-bg': surfaces.page.background,
    '--hrms-region-app-header-bg': surfaces.appHeader.background,
    '--hrms-region-sidebar-bg': surfaces.sidebar.background,
    '--hrms-region-header-bg': surfaces.pageHeader.background,
    '--hrms-region-card-bg': surfaces.card.background,
    '--hrms-region-table-bg': surfaces.table.background,
    '--hrms-region-table-header-bg': surfaces.table.headerBackground,
    '--hrms-region-dialog-bg': surfaces.dialog.background,
    '--hrms-region-drawer-bg': surfaces.drawer.background,
    '--hrms-border-page-header': surfaces.pageHeader.border,
    '--hrms-border-card': surfaces.card.border,
    '--hrms-border-table': surfaces.table.border,
    '--hrms-shadow-page-header': surfaceShadow(surfaces.pageHeader.shadow),
    '--hrms-shadow-card': surfaceShadow(surfaces.card.shadow),
    '--hrms-shadow-table': surfaceShadow(surfaces.table.shadow),
    '--hrms-shadow-dialog': surfaceShadow(surfaces.dialog.shadow),
    '--hrms-shadow-drawer': surfaceShadow(surfaces.drawer.shadow),
    '--hrms-shadow-focus': surfaceShadow('focus'),
    '--hrms-radius-small': px(design.shape.small, 8),
    '--hrms-radius-medium': px(design.shape.medium, 10),
    '--hrms-radius-large': px(design.shape.large, 16),
    '--hrms-radius-pill': px(design.shape.pill, 999),
    '--hrms-page-padding': px(design.spacing.pagePadding, 24),
    '--hrms-section-gap': px(design.spacing.sectionGap, 14),
    '--hrms-card-padding': px(design.spacing.cardPadding, 16),
    '--hrms-input-height': px(design.density.inputHeight, 40),
    '--hrms-button-height': px(design.density.buttonHeight, 36),
    '--hrms-info-card-bg': infoCardBackground(design, infoCards),
    '--hrms-info-card-border': surfaces.card.border,
    '--hrms-info-card-radius': px(infoCards.radius, 16),
    '--hrms-info-card-padding': px(infoCards.padding, 12),
    '--hrms-info-card-shadow': surfaceShadow(infoCards.shadow),
    '--hrms-info-card-backdrop': glassFilter(infoCards),
    '--hrms-info-card-divider': colorWithAlpha(colors.primary, 0.12),
    '--hrms-header-surface-bg': headerBackground(design, headers),
    '--hrms-header-radius': px(headers.radius, 16),
    '--hrms-header-padding': px(headers.padding, 16),
    '--hrms-header-shadow': surfaceShadow(headers.shadow),
    '--hrms-header-backdrop': glassFilter(headers),
    '--hrms-table-surface-bg': tableBackground(design, effectiveTables),
    '--hrms-table-header-bg': tables.headerStyle === 'plain' ? 'transparent' : surfaces.table.headerBackground,
    '--hrms-table-header-align': tables.headerAlign || 'center',
    '--hrms-table-header-size': `${Number(tables.headerFontSize ?? 13)}px`,
    '--hrms-table-header-weight': String(Number(tables.headerFontWeight ?? 700)),
    '--hrms-table-header-color': tableHeaderColor,
    '--hrms-table-header-height': px(tables.headerHeight, 44),
    '--hrms-table-cell-size': `${Number(tables.cellFontSize ?? 12.5)}px`,
    '--hrms-table-cell-weight': String(Number(tables.cellFontWeight ?? 500)),
    '--hrms-table-cell-color': tableCellColor,
    '--hrms-table-cell-align': tableCellAlign,
    '--hrms-table-number-font': tables.numberFont === 'mono'
      ? "'JetBrains Mono','Consolas','Courier New',monospace"
      : 'inherit',
    '--hrms-table-hover-bg': tableHoverBg,
    '--hrms-table-row-alt-bg': tableStripeBg,
    '--hrms-table-border': tableBorder,
    '--hrms-table-border-color': tableBorder === 'none' ? 'transparent' : (tables.dividerColor || colors.divider || '#e2e8f0'),
    '--hrms-table-divider': tableDivider,
    '--hrms-table-divider-width': `${tableDividerWidth}px`,
    '--hrms-table-divider-style': tables.dividerStyle && tables.dividerStyle !== 'none' ? tables.dividerStyle : 'solid',
    '--hrms-table-frame-margin': tables.frame === 'plain' ? '0px' : px(tables.frameMarginX, 0),
    '--hrms-table-frame-padding': tables.frame === 'plain' ? '0px' : px(tables.framePadding, 0),
    '--hrms-table-column-min-width': px(tables.columnMinWidth, 0),
    '--hrms-table-white-space': tables.singleLine === false ? 'normal' : 'nowrap',
    '--hrms-table-radius': px(tables.radius, 16),
    '--hrms-table-cell-padding': px(tableCellPadding, 8),
    '--hrms-table-row-height': px(tableRowHeight, 38),
    '--hrms-table-shadow': surfaceShadow(surfaces.table.shadow),
    '--hrms-table-backdrop': tableIsGlass ? `blur(${tables.glassBlur ?? 12}px)` : 'none',
    '--hrms-list-item-padding': px(listItemPadding, 8),
    '--hrms-list-radius': px(lists.radius, 12),
    '--hrms-list-bg': listBackground(design, lists),
    '--hrms-list-hover-bg': lists.hover ? colors.hover : 'transparent',
    '--hrms-list-divider-color': lists.showDivider ? colors.divider : 'transparent',
    '--hrms-list-backdrop': lists.surface === 'glass' ? `blur(${lists.glassBlur ?? 12}px)` : 'none',
    '--hrms-toolbar-search-radius': px(design.toolbar?.searchRadius, 12),
    '--hrms-toolbar-search-height': px(design.toolbar?.searchHeight, 40),
    '--hrms-toolbar-filters-radius': px(design.toolbar?.filtersRadius, 10),
    '--hrms-toolbar-panel-radius': px(design.toolbar?.panelRadius, 14),
    '--hrms-toolbar-panel-padding': px(design.toolbar?.panelPadding, 12),
    '--hrms-toolbar-panel-gap': px(design.toolbar?.panelGap, 10),
  };
};

export const applyDesignCssVariables = (variables, root = document.documentElement) => {
  if (!root) return;
  Object.entries(variables || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') root.style.setProperty(key, value);
  });
};

