import { mergeDesignTokens, shadowValue } from './designTokens';

const px = (value, fallback = 0) => `${Number.isFinite(Number(value)) ? Number(value) : fallback}px`;

const fontStyle = (role) => ({
  fontSize: px(role?.size, 13),
  fontWeight: role?.weight,
  lineHeight: role?.lineHeight,
});

/**
 * Overrideهای MUI که مستقیماً از توکن‌های طراحی ساخته می‌شوند.
 * این‌ها بعد از getComponents تم اعمال می‌شوند تا مقادیر سخت‌کدشده
 * حالت‌های مختلف تم، جای خود را به توکن بدهند.
 */
export const designComponentOverrides = (design) => {
  const { colors, surfaces, shape, density, typography, tables } = design;
  const roles = typography.roles;
  const cardShadow = shadowValue(design, surfaces.card.shadow);
  return {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: surfaces.card.background,
          border: surfaces.card.border,
          borderRadius: px(surfaces.card.radius, shape.large),
          boxShadow: cardShadow,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: surfaces.card.background,
          border: surfaces.card.border,
          borderRadius: px(surfaces.card.radius, shape.large),
          boxShadow: cardShadow,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: surfaces.appHeader.background,
          borderBottom: surfaces.appHeader.border,
          boxShadow: shadowValue(design, surfaces.appHeader.shadow),
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          background: 'var(--hrms-table-surface-bg, #ffffff)',
          borderRadius: 'var(--hrms-table-radius, 16px)',
          backdropFilter: 'var(--hrms-table-backdrop, none)',
          WebkitBackdropFilter: 'var(--hrms-table-backdrop, none)',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: { backgroundColor: 'transparent' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: 'var(--hrms-table-header-bg, #f8fafc)' },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        root: { ...fontStyle(roles.tableHeader), color: colors.textSecondary },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: fontStyle(roles.body),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          height: 'var(--hrms-table-row-height, 38px)',
          '&:nth-of-type(odd)': { backgroundColor: 'var(--hrms-table-row-alt-bg, transparent)' },
          ...(tables.hover ? { '&:hover': { backgroundColor: colors.hover } } : {}),
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          ...fontStyle(roles.tableCell),
          borderBottomColor: 'var(--hrms-table-border-color, #e8edf4)',
          paddingTop: 'var(--hrms-table-cell-padding, 8px)',
          paddingBottom: 'var(--hrms-table-cell-padding, 8px)',
        },
        head: {
          ...fontStyle(roles.tableHeader),
          backgroundColor: 'var(--hrms-table-header-bg, #f8fafc)',
          color: colors.textSecondary,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          ...fontStyle(roles.button),
          minHeight: px(density.buttonHeight, 36),
          borderRadius: px(shape.medium, 10),
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: px(roles.input.size, 13),
          fontWeight: roles.input.weight,
          borderRadius: px(shape.medium, 10),
        },
        input: { fontSize: px(roles.input.size, 13), lineHeight: roles.input.lineHeight },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { ...fontStyle(roles.input), textAlign: 'right' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { ...fontStyle(roles.formLabel), color: colors.textSecondary },
      },
    },
    MuiFormLabel: {
      styleOverrides: { root: fontStyle(roles.formLabel) },
    },
    MuiFormHelperText: {
      styleOverrides: { root: fontStyle(roles.caption) },
    },
    MuiMenuItem: {
      styleOverrides: { root: { ...fontStyle(roles.body), minHeight: px(density.buttonHeight, 36) } },
    },
    MuiCardHeader: {
      styleOverrides: {
        title: fontStyle(roles.cardTitle),
        subheader: fontStyle(roles.cardSubtitle),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: surfaces.dialog.background,
          border: surfaces.dialog.border,
          borderRadius: px(surfaces.dialog.radius, shape.large),
          boxShadow: shadowValue(design, surfaces.dialog.shadow),
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: fontStyle(roles.cardTitle) },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: surfaces.drawer.background,
          borderRadius: surfaces.drawer.radius ?? 0,
          boxShadow: shadowValue(design, surfaces.drawer.shadow),
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { ...fontStyle(roles.chip), borderRadius: px(shape.pill, 999) } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { ...fontStyle(roles.tooltip), borderRadius: px(shape.small, 8) } },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: fontStyle(roles.body),
        secondary: fontStyle(roles.caption),
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--hrms-list-bg, #ffffff)',
          backdropFilter: 'var(--hrms-list-backdrop, none)',
          WebkitBackdropFilter: 'var(--hrms-list-backdrop, none)',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          paddingTop: 'var(--hrms-list-item-padding, 8px)',
          paddingBottom: 'var(--hrms-list-item-padding, 8px)',
          borderBottom: '1px solid var(--hrms-list-divider-color, transparent)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 'var(--hrms-list-radius, 12px)',
          '&:hover': { backgroundColor: 'var(--hrms-list-hover-bg, rgba(99,102,241,0.06))' },
        },
      },
    },
    MuiTab: {
      styleOverrides: { root: fontStyle(roles.button) },
    },
  };
};

/** ادغام overrideهای توکن با تم حالت فعلی بدون از دست رفتن استایل‌های ویژه. */
export const mergeThemeComponents = (base = {}, additions = {}) => {
  const result = { ...base };
  Object.entries(additions).forEach(([name, value]) => {
    result[name] = {
      ...(base[name] || {}),
      ...value,
      styleOverrides: mergeDesignTokens(base[name]?.styleOverrides || {}, value.styleOverrides || {}),
    };
  });
  return result;
};
