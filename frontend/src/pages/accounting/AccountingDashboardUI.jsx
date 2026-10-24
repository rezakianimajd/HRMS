import React from 'react';
import { Box, Paper, Stack, Typography, Chip, ButtonBase } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import { DEFAULT_TYPOGRAPHY } from '../../core/theme/appearanceDefaults';
import { infoCardBackground, shadowValue } from '../../core/theme/designTokens';

export const CARD_BG = '#ffffff';
export const CARD_BORDER = '#e8edf4';
export const SOFT_BG = '#f8fafc';
export const INK = '#0f172a';
export const MUTED = '#64748b';
export const ACCOUNTING_BLUE = '#2563eb';

export const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export const SurfaceCard = ({ title, icon: Icon, color, action, children, sx, contentSx }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const accent = color || theme.palette.primary.main;
  return (
    <Paper elevation={0} sx={{
      bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
      border: 'var(--hrms-border-card, 1px solid #e8edf4)',
      borderRadius: 'var(--hrms-radius-large, 18px)', boxShadow: 'var(--hrms-shadow-card, none)', overflow: 'hidden', height: '100%',
      display: 'flex', flexDirection: 'column', ...sx,
    }}>
      <Stack direction="row" alignItems="center" spacing={1} useFlexGap
        sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'var(--hrms-region-card-bg, #ffffff)' }}>
        <Box sx={{
          width: 34, height: 34, flexShrink: 0, borderRadius: '10px', color: accent,
          bgcolor: alpha(accent, 0.07), border: `1px solid ${alpha(accent, 0.16)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        <Typography sx={{
          flex: 1, minWidth: 0, fontSize: `${type.cardSize}px`,
          fontWeight: type.cardWeight, color: theme.palette.text.primary,
        }}>{title}</Typography>
        {action || null}
      </Stack>
      <Box sx={{ p: 2, flex: 1, minWidth: 0, ...contentSx }}>{children}</Box>
    </Paper>
  );
};

export const ProgressBar = ({ value, color = ACCOUNTING_BLUE, height = 8, track }) => {
  const theme = useTheme();
  const trackColor = track || theme.palette.divider;
  return (
    <Box sx={{ width: '100%', height, bgcolor: trackColor, borderRadius: height / 2, overflow: 'hidden' }}>
      <Box sx={{ width: `${clamp(value)}%`, height: '100%', bgcolor: color, borderRadius: height / 2 }} />
    </Box>
  );
};

export const DeltaChip = ({ value, inverse = false }) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const numeric = Number(value);
  const positive = inverse ? numeric <= 0 : numeric >= 0;
  return (
    <Chip size="small"
      label={`${numeric >= 0 ? '+' : ''}${numeric.toLocaleString('en-US', { maximumFractionDigits: 1 })}٪`}
      sx={{
        height: 21, fontSize: 12, fontWeight: 800,
        bgcolor: positive ? '#eff6ff' : '#fff1f2',
        color: positive ? '#1d4ed8' : '#be123c',
      }} />
  );
};

export const KpiTile = ({
  icon: Icon, label, value, suffix, color = ACCOUNTING_BLUE,
  delta, inverseDelta, hint, progress, progressLabel, onClick, size = 18,
}) => {
  const { tokens } = useDesignTokens();
  const info = tokens.infoCards || {};
  const isGlass = info.surface === 'glass';
  const isCompact = info.variant === 'compact';
  const isCentered = info.variant === 'centered' || info.align === 'center';
  const align = isCentered ? 'center' : info.align === 'end' ? 'flex-end' : 'flex-start';
  const showIcon = info.showIcon !== false;
  const showLabel = info.showLabel !== false;
  const showSub = info.showSub !== false;
  const content = (
    <Paper elevation={0} sx={{
      p: `${info.padding ?? 14}px`, height: '100%', minHeight: isCompact ? 108 : 132,
      background: infoCardBackground(tokens, info),
      border: isGlass
        ? `1px solid ${color}3d`
        : 'var(--hrms-info-card-border, 1px solid #e8edf4)',
      borderRadius: 'var(--hrms-info-card-radius, 16px)',
      boxShadow: shadowValue(tokens, info.shadow || 'none'),
      backdropFilter: isGlass ? `blur(${info.glassBlur ?? 14}px)` : 'none',
      WebkitBackdropFilter: isGlass ? `blur(${info.glassBlur ?? 14}px)` : 'none',
      display: 'flex', flexDirection: 'column', alignItems: align, justifyContent: 'space-between', gap: 1,
      textAlign: isCentered ? 'center' : 'right',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick && !isGlass ? { borderColor: `${color}66`, bgcolor: '#fbfdff' } : undefined,
    }}>
      {showIcon ? (
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75} useFlexGap sx={{ width: '100%' }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '11px', bgcolor: `${color}10`,
            border: `1px solid ${color}1f`, color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon sx={{ fontSize: 20 }} />
          </Box>
          <DeltaChip value={delta} inverse={inverseDelta} />
        </Stack>
      ) : null}
      <Box sx={{ minWidth: 0, width: '100%' }}>
        {showLabel ? <Typography sx={{ fontSize: 12, color: MUTED, mb: 0.2 }}>{label}</Typography> : null}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0, justifyContent: isCentered ? 'center' : 'flex-start' }}>
          <Typography sx={{ fontSize: Math.max(12, size), fontWeight: 900, color: INK, direction: 'rtl', lineHeight: 1.25, wordBreak: 'break-word' }}>
            {value}
          </Typography>
          {showSub && suffix ? <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>{suffix}</Typography> : null}
        </Box>
        {showSub && hint ? <Typography sx={{ mt: 0.2, fontSize: 12, color: MUTED }}>{hint}</Typography> : null}
        {progress !== undefined && progress !== null ? (
          <Box sx={{ mt: 0.7 }}>
            <ProgressBar value={progress} color={color} height={5} />
            {showSub && progressLabel ? <Typography sx={{ mt: 0.35, fontSize: 12, color: MUTED }}>{progressLabel}</Typography> : null}
          </Box>
        ) : null}
      </Box>
    </Paper>
  );
  return onClick ? <ButtonBase onClick={onClick} sx={{ width: '100%', height: '100%', borderRadius: '16px', display: 'block' }}>{content}</ButtonBase> : content;
};

export const RatioRow = ({ label, value, max = 100, color = ACCOUNTING_BLUE, suffix = '٪' }) => (
  <Box>
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap sx={{ mb: 0.45 }}>
      <Typography sx={{ fontSize: 12, color: '#475569' }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{value}{suffix}</Typography>
    </Stack>
    <ProgressBar value={(Number(value) / (max || 1)) * 100} color={color} height={6} />
  </Box>
);

export const QuickTile = ({ icon: Icon, label, description, color, onClick }) => (
  <ButtonBase onClick={onClick} sx={{
    width: '100%', height: '100%', p: 1.35, borderRadius: '14px', bgcolor: CARD_BG,
    border: `1px solid ${CARD_BORDER}`, textAlign: 'right',
    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1,
    '&:hover': { borderColor: `${color}66`, bgcolor: `${color}06` },
  }}>
    <Box sx={{
      width: 38, height: 38, flexShrink: 0, borderRadius: '11px', bgcolor: `${color}0f`,
      color, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon sx={{ fontSize: 19 }} />
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{label}</Typography>
      {description ? <Typography sx={{ mt: 0.15, fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{description}</Typography> : null}
    </Box>
    <ChevronLeftIcon sx={{ fontSize: 17, color: '#cbd5e1', flexShrink: 0 }} />
  </ButtonBase>
);
