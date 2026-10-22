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
  const { colors, surfaces, shape, spacing, density, typography } = design;
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
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: surfaces.table.headerBackground },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          height: px(density.tableRowHeight, 38),
          '&:hover': { backgroundColor: colors.hover },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          ...fontStyle(roles.tableCell),
          borderBottomColor: colors.divider,
          paddingTop: px(spacing.tableCellPadding, 8),
          paddingBottom: px(spacing.tableCellPadding, 8),
        },
        head: {
          ...fontStyle(roles.tableHeader),
          backgroundColor: surfaces.table.headerBackground,
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
