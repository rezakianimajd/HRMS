/** پوستهٔ استودیو-تم صفحات «مدیریت خریدها» (توکن‌محور، بدون رنگ hard-code). */
import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import PageHeader from '../../core/components/ui/PageHeader';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { ACCENT as FALLBACK_ACCENT, FONT } from './procurementUi';

/** توکن‌های استودیو تم + رنگ ماژول (با fallback). */
export const useProcurementStudio = () => {
  const tokens = useDesignTokens() || {};
  const palettes = useModulePalette() || {};
  const palette = typeof palettes.getPalette === 'function' ? palettes.getPalette('procurement') : null;
  const colors = tokens.colors || {};
  return {
    tokens,
    accent: palette?.accent || FALLBACK_ACCENT,
    ink: colors.textPrimary || 'text.primary',
    muted: colors.textSecondary || 'text.secondary',
    border: colors.border || 'divider',
    surface: tokens.surfaces?.card || 'background.paper',
    elevated: tokens.surfaces?.surfaceElevated || 'background.paper',
    radius: tokens.shape?.large || '16px',
    radiusSmall: tokens.shape?.medium || '12px',
    padding: tokens.spacing?.cardPadding || 16,
    headerAlign: tokens.headers?.align || 'right',
    rowHeight: tokens.density?.tableRowHeight || 38,
    font: tokens.typography?.family || FONT,
  };
};

/** سرصفحهٔ صفحه مطابق تم (PageHeader استودیو). */
export const StudioHeader = ({ icon, title, subtitle, actions, badge }) => (
  <PageHeader icon={icon} title={title} subtitle={subtitle} actions={actions} badge={badge} />
);

/** کارت شیشه‌ای/سطحی تم‌محور. */
export const StudioCard = ({ children, sx = {}, padding }) => {
  const studio = useProcurementStudio();
  return (
    <Paper
      elevation={0}
      sx={{
        p: padding ?? `${studio.padding}px`,
        borderRadius: studio.radius,
        border: `1px solid`,
        borderColor: studio.border,
        bgcolor: studio.surface,
        backdropFilter: studio.tokens.infoCards?.glassBlur
          ? `blur(${studio.tokens.infoCards.glassBlur}px)` : undefined,
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
};

/** کاشی KPI استودیو (کلیک‌پذیر). */
export const StudioKpi = ({ label, value, hint, color, icon: Icon, onClick }) => {
  const studio = useProcurementStudio();
  const tone = color || studio.accent;
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 1.5, minHeight: 92, borderRadius: studio.radius,
        border: '1px solid', borderColor: studio.border, bgcolor: studio.surface,
        cursor: onClick ? 'pointer' : 'default', transition: 'transform .15s ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)' } : undefined,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {Icon ? (
          <Box sx={{
            width: 34, height: 34, borderRadius: studio.radiusSmall, display: 'grid',
            placeItems: 'center', bgcolor: `${tone}1f`, color: tone,
          }}>
            <Icon sx={{ fontSize: 18 }} />
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: studio.font, fontSize: 11.5, color: studio.muted }} noWrap>
            {label}
          </Typography>
          <Typography sx={{ fontFamily: studio.font, fontSize: 16, fontWeight: 900, color: studio.ink }}>
            {value}
          </Typography>
        </Box>
      </Stack>
      {hint ? (
        <Typography sx={{ mt: 0.75, fontFamily: studio.font, fontSize: 10.5, color: studio.muted }} noWrap>
          {hint}
        </Typography>
      ) : null}
    </Paper>
  );
};

/** چیپ وضعیت با رنگ معنایی. */
export const StudioChip = ({ label, color }) => {
  const studio = useProcurementStudio();
  const tone = color || studio.accent;
  return (
    <Chip size="small" label={label}
      sx={{
        height: 22, fontFamily: studio.font, fontWeight: 800, fontSize: 11,
        color: tone, bgcolor: `${tone}1a`, border: `1px solid ${tone}33`,
      }} />
  );
};

/** جدول تم‌محور (ارتفاع ردیف و رنگ از توکن‌ها). */
export const studioTableSx = (studio) => ({
  '& .MuiTableCell-root': {
    fontFamily: studio.font,
    fontSize: 12,
    borderColor: studio.border,
    py: `${Math.max(4, Math.round((studio.rowHeight - 22) / 2))}px`,
    color: studio.ink,
  },
  '& .MuiTableCell-head': {
    fontWeight: 800,
    color: studio.muted,
    bgcolor: studio.elevated,
  },
  '& .MuiTableRow-root:hover': { bgcolor: `${studio.accent}0d` },
});
