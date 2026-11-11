import React from 'react';
import {
  Box, Chip, Paper, Skeleton, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useDesignTokens } from '../../../core/context/DesignTokenContext';
import { useModuleTheme } from '../../contracts/contractModuleUi';
import { toPersianDigits } from '../../../core/utils/numberUtils';

/**
 * زبان طراحی «استودیویی» ماژول معاملات فصلی.
 *
 * همهٔ صفحه‌ها و پنل‌های این ماژول از همین اجزا استفاده می‌کنند تا ظاهر یکدست،
 * متراکم و سریع داشته باشند: هدر گرادیانی، نوار شاخص‌ها، تب‌های قرصی، کارت‌های
 * هم‌شعاع و نوار وضعیت. تمام رنگ/سایه/شعاع از توکن‌های استودیو تم گرفته می‌شود.
 */

export const SEASONAL_ACCENT = '#d97706';

export const useStudio = () => {
  const theme = useTheme();
  const { tokens } = useDesignTokens();
  const moduleTheme = useModuleTheme();
  const colors = tokens?.colors || {};
  const radius = tokens?.shape || { small: 8, medium: 10, large: 16, pill: 999 };
  const shadows = tokens?.shadows || {};
  const spacing = tokens?.spacing || {};
  return {
    theme,
    tokens,
    moduleTheme,
    colors,
    radius,
    shadows,
    spacing,
    accent: SEASONAL_ACCENT,
    accentSoft: alpha(SEASONAL_ACCENT, 0.12),
    accentBorder: alpha(SEASONAL_ACCENT, 0.35),
    border: colors.border || theme.palette.divider,
    surface: colors.surface || theme.palette.background.paper,
    muted: colors.textSecondary || theme.palette.text.secondary,
    ink: colors.textPrimary || theme.palette.text.primary,
    cardShadow: shadows.soft || 'none',
    headerShadow: shadows.header || 'none',
    padX: Math.max(12, Number(moduleTheme.cardPadX) || 16),
  };
};

export const StudioBadge = ({ label, tone = 'default', title }) => {
  const studio = useStudio();
  const palette = {
    accent: [alpha(studio.accent, 0.12), studio.accent],
    success: [alpha('#10b981', 0.12), '#047857'],
    warning: [alpha('#f59e0b', 0.14), '#b45309'],
    danger: [alpha('#ef4444', 0.12), '#b91c1c'],
    info: [alpha('#0ea5e9', 0.12), '#0369a1'],
    default: [alpha(studio.ink, 0.05), studio.muted],
  }[tone] || [alpha(studio.ink, 0.05), studio.muted];
  return (
    <Chip
      size="small"
      title={title}
      label={label}
      sx={{
        height: 22,
        fontSize: 10.5,
        fontWeight: 700,
        bgcolor: palette[0],
        color: palette[1],
        border: `1px solid ${alpha(palette[1], 0.22)}`,
        '& .MuiChip-label': { px: 0.9 },
      }}
    />
  );
};

export const StudioHero = ({
  icon, title, subtitle, badges = [], actions, periodControls, aside,
}) => {
  const studio = useStudio();
  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        mb: 1.5,
        px: { xs: 1.5, md: 2 },
        py: { xs: 1.25, md: 1.6 },
        borderRadius: `${studio.radius.large}px`,
        border: `1px solid ${studio.border}`,
        background: `linear-gradient(125deg, ${alpha(studio.accent, 0.16)} 0%, ${studio.surface} 42%, ${alpha(studio.colors.primary || '#6366f1', 0.12)} 100%)`,
        boxShadow: studio.headerShadow,
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 'auto -60px -90px auto',
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(studio.accent, 0.18)}, transparent 70%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 46, height: 46, flex: '0 0 auto', display: 'grid', placeItems: 'center',
              borderRadius: '14px', color: '#fff',
              background: `linear-gradient(140deg, ${studio.accent} 0%, ${alpha(studio.accent, 0.72)} 100%)`,
              boxShadow: `0 8px 20px ${alpha(studio.accent, 0.35)}`,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 15, md: 17 }, fontWeight: 900, color: studio.ink, lineHeight: 1.4 }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: 11, color: studio.muted, mt: 0.15 }}>
              {subtitle}
            </Typography>
            {badges.length ? (
              <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.6 }}>
                {badges}
              </Stack>
            ) : null}
          </Box>
        </Stack>
        <Box sx={{ flex: 1 }} />
        {aside}
        {actions ? (
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            flexWrap="wrap"
            sx={{ '& .MuiButton-root': { height: 34, borderRadius: `${studio.radius.medium}px`, fontSize: 12, whiteSpace: 'nowrap' } }}
          >
            {actions}
          </Stack>
        ) : null}
      </Stack>

      {periodControls ? (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
          sx={{
            mt: 1.25,
            pt: 1.1,
            borderTop: `1px dashed ${alpha(studio.ink, 0.12)}`,
            '& .MuiInputBase-root': { height: 32, fontSize: 12, bgcolor: alpha('#fff', 0.7) },
            '& .MuiInputLabel-root': { fontSize: 11.5 },
          }}
        >
          {periodControls}
        </Stack>
      ) : null}
    </Box>
  );
};

export const StudioStats = ({ items = [], dense = false }) => {
  const studio = useStudio();
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(6, minmax(0, 1fr))' },
        gap: 1,
        mb: 1.5,
      }}
    >
      {items.map((item) => (
        <Box
          key={item.key || item.label}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            px: dense ? 1 : 1.2,
            py: dense ? 0.7 : 0.9,
            borderRadius: `${studio.radius.medium}px`,
            border: `1px solid ${studio.border}`,
            bgcolor: studio.surface,
            boxShadow: studio.cardShadow,
            transition: 'transform 120ms ease, box-shadow 120ms ease',
            '&:hover': { transform: 'translateY(-1px)', boxShadow: studio.shadows.card || studio.cardShadow },
            '&::before': {
              content: '""',
              position: 'absolute',
              insetInlineStart: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: item.color || studio.accent,
              opacity: 0.85,
            },
          }}
        >
          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ color: studio.muted }}>
            {item.icon ? <Box sx={{ display: 'flex', color: item.color || studio.accent, '& svg': { fontSize: 15 } }}>{item.icon}</Box> : null}
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{item.label}</Typography>
          </Stack>
          <Typography
            sx={{
              fontSize: dense ? 13 : 14.5,
              fontWeight: 900,
              color: item.valueColor || studio.ink,
              mt: 0.25,
              direction: 'ltr',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {item.value}
          </Typography>
          {item.hint ? (
            <Typography sx={{ fontSize: 9.5, color: studio.muted, mt: 0.1 }}>{item.hint}</Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
};


export const StudioTabs = ({ value, onChange, tabs = [] }) => {
  const studio = useStudio();
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 1.5,
        p: 0.4,
        display: 'inline-flex',
        maxWidth: '100%',
        borderRadius: `${studio.radius.pill}px`,
        border: `1px solid ${studio.border}`,
        bgcolor: alpha(studio.ink, 0.035),
        boxShadow: 'none',
      }}
    >
      <Tabs
        value={value}
        onChange={(_event, next) => onChange(next)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          minHeight: 32,
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            minHeight: 32,
            minWidth: 'auto',
            px: 1.6,
            py: 0.2,
            mx: 0.1,
            borderRadius: `${studio.radius.pill}px`,
            fontSize: 12,
            fontWeight: 700,
            color: studio.muted,
            transition: 'background-color 120ms ease, color 120ms ease',
          },
          '& .Mui-selected': {
            color: '#fff !important',
            backgroundColor: studio.accent,
            boxShadow: `0 6px 16px ${alpha(studio.accent, 0.35)}`,
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} disableRipple />
        ))}
      </Tabs>
    </Paper>
  );
};

export const StudioCard = ({
  title, subtitle, actions, children, dense = false, contentSx, sx, noPadding = false,
}) => {
  const studio = useStudio();
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: `${studio.radius.large}px`,
        border: `1px solid ${studio.border}`,
        bgcolor: studio.surface,
        boxShadow: studio.cardShadow,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {title || actions ? (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: studio.padX,
            py: dense ? 0.7 : 0.9,
            borderBottom: `1px solid ${alpha(studio.ink, 0.07)}`,
            bgcolor: alpha(studio.accent, 0.04),
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: studio.ink }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography sx={{ fontSize: 10.5, color: studio.muted }}>{subtitle}</Typography>
            ) : null}
          </Box>
          <Box sx={{ flex: 1 }} />
          {actions}
        </Stack>
      ) : null}
      <Box sx={{ p: noPadding ? 0 : dense ? 1 : 1.25, ...contentSx }}>{children}</Box>
    </Paper>
  );
};

export const StudioSectionTitle = ({ children, hint, icon, actions }) => {
  const studio = useStudio();
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
      {icon ? <Box sx={{ display: 'flex', color: studio.accent, '& svg': { fontSize: 17 } }}>{icon}</Box> : null}
      <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: studio.ink }}>{children}</Typography>
      {hint ? <Typography sx={{ fontSize: 10.5, color: studio.muted }}>{hint}</Typography> : null}
      <Box sx={{ flex: 1 }} />
      {actions}
    </Stack>
  );
};

export const StudioStatusBar = ({ items = [], trailing }) => {
  const studio = useStudio();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, md: 2.5 },
        flexWrap: 'wrap',
        px: studio.padX,
        py: 0.75,
        borderTop: `1px solid ${alpha(studio.ink, 0.08)}`,
        bgcolor: alpha(studio.accent, 0.03),
      }}
    >
      {items.map((item) => (
        <Typography key={item.label} sx={{ fontSize: 11, color: studio.muted, whiteSpace: 'nowrap' }}>
          {`${item.label}: `}
          <Box component="span" sx={{ fontWeight: 900, color: item.color || studio.ink, fontVariantNumeric: 'tabular-nums' }}>
            {item.value}
          </Box>
        </Typography>
      ))}
      <Box sx={{ flex: 1 }} />
      {trailing}
    </Box>
  );
};

export const StudioEmpty = ({ icon, title, hint, action }) => {
  const studio = useStudio();
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={0.75}
      sx={{
        py: 4,
        px: 2,
        textAlign: 'center',
        borderRadius: `${studio.radius.large}px`,
        border: `1px dashed ${alpha(studio.ink, 0.18)}`,
        bgcolor: alpha(studio.accent, 0.03),
      }}
    >
      {icon ? <Box sx={{ color: alpha(studio.accent, 0.7), '& svg': { fontSize: 30 } }}>{icon}</Box> : null}
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: studio.ink }}>{title}</Typography>
      {hint ? <Typography sx={{ fontSize: 11, color: studio.muted, maxWidth: 420 }}>{hint}</Typography> : null}
      {action}
    </Stack>
  );
};

export const StudioPanelSkeleton = ({ rows = 3 }) => {
  const studio = useStudio();
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1 }}>
        {Array.from({ length: 4 }).map((_item, index) => (
          <Skeleton key={index} variant="rounded" height={58} sx={{ borderRadius: `${studio.radius.medium}px` }} />
        ))}
      </Box>
      {Array.from({ length: rows }).map((_item, index) => (
        <Skeleton key={index} variant="rounded" height={index === 0 ? 190 : 64} sx={{ borderRadius: `${studio.radius.large}px` }} />
      ))}
    </Box>
  );
};

export const StudioCount = ({ count, color }) => (
  <Box
    component="span"
    sx={{
      ml: 0.6,
      px: 0.55,
      minWidth: 17,
      height: 17,
      borderRadius: '9px',
      display: 'inline-grid',
      placeItems: 'center',
      fontSize: 10,
      fontWeight: 900,
      color: '#fff',
      bgcolor: color || SEASONAL_ACCENT,
    }}
  >
    {toPersianDigits(count)}
  </Box>
);
