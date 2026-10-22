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


const px = (value, fallback = 0) => `${Number.isFinite(Number(value)) ? Number(value) : fallback}px`;

/** متغیرهای CSS برای استفاده در کامپوننت‌های مشترک و صفحات قدیمی. */
export const designCssVariables = (design) => {
  const roles = design.typography.roles;
  const colors = design.colors;
  const surfaces = design.surfaces;
  const surfaceShadow = (key) => shadowValue(design, key);
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
    '--hrms-table-cell-padding': px(design.spacing.tableCellPadding, 8),
    '--hrms-table-row-height': px(design.density.tableRowHeight, 38),
    '--hrms-input-height': px(design.density.inputHeight, 40),
    '--hrms-button-height': px(design.density.buttonHeight, 36),
  };
};

export const applyDesignCssVariables = (variables, root = document.documentElement) => {
  if (!root) return;
  Object.entries(variables || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') root.style.setProperty(key, value);
  });
};

