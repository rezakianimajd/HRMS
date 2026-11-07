import React from 'react';
import { Box, ButtonBase, Chip, Paper, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../../core/theme/appearanceDefaults';
import { infoCardBackground, shadowValue } from '../../core/theme/designTokens';

export const INK = '#0f172a';
export const MUTED = '#64748b';
export const SOFT = '#f8fafc';

/** رنگ ماژول از استودیو تم/پالت؛ در نبود آن، رنگ پیش‌فرض مکاتبات. */
export const useStudio = () => {
  const theme = useTheme();
  const { tokens } = useDesignTokens();
  const { getPalette, typography } = useModulePalette();
  const palette = typeof getPalette === 'function' ? getPalette('correspondence') : null;
  const accent = palette?.accent || palette?.primary || '#0ea5e9';
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const info = tokens.infoCards || {};
  const headers = tokens.headers || {};
  const card = tokens.surfaces?.card || {};
  return { theme, tokens, accent, type, info, headers, card };
};

/** درصد تغییر (برای نشانگر رشد ماهانه). */
export const deltaPercent = (previous, current) => {
  const before = Number(previous) || 0;
  const now = Number(current) || 0;
  if (!before) return now ? 100 : 0;
  return Math.round(((now - before) / before) * 1000) / 10;
};

export const DeltaChip = ({ value, inverse = false }) => {
  const theme = useTheme();
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const numeric = Number(value);
  const positive = inverse ? numeric <= 0 : numeric >= 0;
  const color = positive ? '#1d4ed8' : '#be123c';
  return (
    <Chip size="small" label={`${numeric >= 0 ? '+' : ''}${numeric}٪`}
      sx={{
        height: 19, fontSize: 10.5, fontWeight: 800,
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.22 : 0.08), color,
        border: `1px solid ${alpha(color, 0.22)}`,
        '& .MuiChip-label': { px: 0.7 },
      }} />
  );
};

export const StudioBar = ({ value, color, height = 6, track }) => {
  const theme = useTheme();
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <Box sx={{
      width: '100%', height, borderRadius: height / 2, overflow: 'hidden',
      bgcolor: track || theme.palette.divider,
    }}>
      <Box sx={{ width: `${percent}%`, height: '100%', bgcolor: color, borderRadius: height / 2 }} />
    </Box>
  );
};

/**
 * کارت اطلاعات داشبورد؛ همهٔ ظاهر (سطح، شعاع، سایه، آیکون، چیدمان)
 * از توکن‌های استودیو تم (`infoCards`) خوانده می‌شود.
 */
export const StudioKpi = ({
  icon: Icon, label, value, hint, color, delta, inverseDelta = false,
  progress, progressLabel, onClick, dense = false,
}) => {
  const { tokens, info, accent } = useStudio();
  const tone = color || accent;
  const isGlass = info.surface === 'glass';
  const isFlat = dense || info.variant === 'inline' || info.variant === 'compact';
  const showIcon = info.showIcon !== false;
  const showLabel = info.showLabel !== false;
  const showSub = info.showSub !== false;
  const alignCenter = info.align === 'center';

  const content = (
    <Paper elevation={0} sx={{
      p: `${Math.min(info.padding ?? 12, dense ? 10 : 14)}px`,
      height: '100%', minHeight: isFlat ? 86 : 122,
      background: infoCardBackground(tokens, info),
      border: isGlass ? `1px solid ${alpha(tone, 0.28)}` : '1px solid',
      borderColor: isGlass ? undefined : 'divider',
      borderRadius: `var(--hrms-info-card-radius, ${info.radius ?? 16}px)`,
      boxShadow: shadowValue(tokens, info.shadow || 'none'),
      backdropFilter: isGlass ? `blur(${info.glassBlur ?? 14}px)` : 'none',
      WebkitBackdropFilter: isGlass ? `blur(${info.glassBlur ?? 14}px)` : 'none',
      display: 'flex', alignItems: isFlat ? 'center' : 'flex-start', gap: 1,
      minWidth: 0, overflow: 'hidden', textAlign: alignCenter ? 'center' : 'right',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color .16s ease, transform .16s ease',
      '&:hover': onClick ? { borderColor: alpha(tone, 0.45), transform: 'translateY(-1px)' } : undefined,
    }}>
      {showIcon && Icon ? (
        <Box sx={{
          width: isFlat ? 32 : 36, height: isFlat ? 32 : 36, flex: '0 0 auto',
          borderRadius: '10px', bgcolor: alpha(tone, 0.09), color: tone,
          border: `1px solid ${alpha(tone, 0.18)}`, display: 'grid', placeItems: 'center',
        }}>
          <Icon sx={{ fontSize: isFlat ? 16 : 18 }} />
        </Box>
      ) : null}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5} useFlexGap sx={{ minWidth: 0 }}>
          {showLabel ? (
            <Typography noWrap sx={{ flex: 1, fontSize: 11, fontWeight: 700, color: MUTED }}>{label}</Typography>
          ) : null}
          {delta !== undefined && delta !== null ? <DeltaChip value={delta} inverse={inverseDelta} /> : null}
        </Stack>
        <Typography noWrap title={String(value)} sx={{
          fontSize: isFlat ? 15 : 19, fontWeight: 900, color: tone, lineHeight: 1.3,
          fontFamily: 'var(--hrms-table-number-font, inherit)',
        }}>
          {value}
        </Typography>
        {showSub && hint ? (
          <Typography noWrap title={String(hint)} sx={{ fontSize: 10, fontWeight: 600, color: MUTED }}>
            {hint}
          </Typography>
        ) : null}
        {progress !== undefined && progress !== null ? (
          <Box sx={{ mt: 0.6 }}>
            <StudioBar value={progress} color={tone} height={4} />
            {showSub && progressLabel ? (
              <Typography noWrap sx={{ mt: 0.3, fontSize: 9.5, color: MUTED }}>{progressLabel}</Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Paper>
  );
  return onClick
    ? (
      <ButtonBase onClick={onClick}
        sx={{ width: '100%', height: '100%', borderRadius: '14px', display: 'block', textAlign: 'inherit' }}>
        {content}
      </ButtonBase>
    )
    : content;
};

/** کارت بخش داشبورد؛ سربرگ آن از توکن‌های `headers` استودیو تم تبعیت می‌کند. */
export const StudioCard = ({ icon: Icon, title, hint, color, action, children, sx, bodySx }) => {
  const { theme, tokens, accent, headers, type } = useStudio();
  const tone = color || accent;
  const isGlass = headers.surface === 'glass';
  return (
    <Paper elevation={0} sx={{
      display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden',
      bgcolor: isGlass ? alpha(tokens.surfaces.card.background, headers.glassOpacity ?? 0.6) : 'background.paper',
      border: '1px solid', borderColor: 'divider',
      borderRadius: `var(--hrms-radius-large, ${tokens.shape?.large ?? 16}px)`,
      boxShadow: shadowValue(tokens, tokens.surfaces?.card?.shadow || 'none'),
      ...sx,
    }}>
      <Stack direction="row" alignItems="center" spacing={0.9} useFlexGap
        sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid', borderColor: 'divider', minWidth: 0 }}>
        {headers.showIcon !== false && Icon ? (
          <Box sx={{
            width: 30, height: 30, flex: '0 0 auto', borderRadius: '9px',
            bgcolor: alpha(tone, (headers.tint ?? 8) / 100), color: tone,
            display: 'grid', placeItems: 'center',
          }}>
            <Icon sx={{ fontSize: 16 }} />
          </Box>
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: `${type.cardSize}px`, fontWeight: type.cardWeight || 800, color: 'text.primary' }}>
            {title}
          </Typography>
          {hint ? (
            <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{hint}</Typography>
          ) : null}
        </Box>
        {action || null}
      </Stack>
      <Box sx={{ p: 1.25, flex: 1, minWidth: 0, ...bodySx }}>{children}</Box>
    </Paper>
  );
};

/** ردیف فهرست (hover و شعاع از توکن‌های لیست/تم). */
export const StudioRow = ({ onClick, children, sx, dense = false }) => {
  const { theme, accent, tokens } = useStudio();
  const lists = tokens.lists || {};
  return (
    <Box onClick={onClick} sx={{
      display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, overflow: 'hidden',
      px: 0.85, py: dense ? 0.45 : 0.6, borderRadius: '10px',
      border: '1px solid', borderColor: 'divider',
      bgcolor: 'background.paper',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background-color .15s ease, border-color .15s ease',
      '&:hover': onClick ? {
        bgcolor: alpha(accent, (lists.hoverTint ?? 6) / 100),
        borderColor: alpha(accent, 0.28),
      } : undefined,
      '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
      ...sx,
    }}>
      {children}
    </Box>
  );
};

/** کاشی دسترسی سریع داشبورد. */
export const QuickAction = ({ icon: Icon, label, description, color, onClick }) => {
  const { tokens, accent, theme } = useStudio();
  const tone = color || accent;
  return (
    <ButtonBase onClick={onClick} sx={{
      width: '100%', height: '100%', p: 1.1, borderRadius: '12px', textAlign: 'right',
      bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
      display: 'flex', alignItems: 'center', gap: 0.9,
      transition: 'border-color .15s ease, background-color .15s ease',
      '&:hover': { borderColor: alpha(tone, 0.42), bgcolor: alpha(tone, 0.04) },
    }}>
      <Box sx={{
        width: 32, height: 32, flex: '0 0 auto', borderRadius: '10px',
        bgcolor: alpha(tone, 0.09), color: tone, display: 'grid', placeItems: 'center',
      }}>
        <Icon sx={{ fontSize: 17 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
        <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: 'text.primary' }}>{label}</Typography>
        {description ? (
          <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{description}</Typography>
        ) : null}
      </Box>
      <Box component="span" sx={{ color: theme.palette.text.disabled, fontSize: 16, lineHeight: 1 }}>‹</Box>
    </ButtonBase>
  );
};

