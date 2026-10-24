import React from 'react';
import { Paper, Stack, Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import { useApplication } from '../../context/ApplicationContext';
import { useModulePalette } from '../../context/ModulePaletteContext';
import { useDesignTokens } from '../../context/DesignTokenContext';
import {
  colorWithAlpha, infoCardBackground, shadowValue,
} from '../../theme/designTokens';
import { OutlineIcon } from './PageHeader';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const toFa = (value) => (
  typeof value === 'number' || typeof value === 'string'
    ? String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
    : value
);

/**
 * کارت اطلاعات مشترک؛ ظاهر آن از توکن‌های infoCards و استودیوی تم می‌آید.
 * props صریح (variant/surface/align/…) برای پیش‌نمایش و استفاده‌های خاص
 * می‌توانند تنظیمات سراسری را موقتاً override کنند.
 */
const ALIGN_MAP = { start: 'flex-start', center: 'center', end: 'flex-end' };

const InfoCard = ({
  icon,
  label,
  value,
  suffix,
  sub,
  color,
  valueColor,
  onClick,
  sx,
  variant,
  surface,
  align,
  accentMode,
  labelPosition,
  iconPosition,
  valuePosition,
  showIcon,
  showLabel,
  showSub,
  showDivider,
  tint,
  glassOpacity,
  glassBlur,
  ...rest
}) => {
  const theme = useTheme();
  const { currentApp } = useApplication();
  const { getPalette } = useModulePalette();
  const { tokens } = useDesignTokens();
  const cfg = {
    ...(tokens.infoCards || {}),
    ...(variant !== undefined ? { variant } : {}),
    ...(surface !== undefined ? { surface } : {}),
    ...(align !== undefined ? { align } : {}),
    ...(accentMode !== undefined ? { accentMode } : {}),
    ...(labelPosition !== undefined ? { labelPosition } : {}),
    ...(iconPosition !== undefined ? { iconPosition } : {}),
    ...(valuePosition !== undefined ? { valuePosition } : {}),
    ...(showIcon !== undefined ? { showIcon } : {}),
    ...(showLabel !== undefined ? { showLabel } : {}),
    ...(showSub !== undefined ? { showSub } : {}),
    ...(showDivider !== undefined ? { showDivider } : {}),
    ...(tint !== undefined ? { tint } : {}),
    ...(glassOpacity !== undefined ? { glassOpacity } : {}),
    ...(glassBlur !== undefined ? { glassBlur } : {}),
  };
  const moduleAccent = getPalette(currentApp?.slug)?.accent;
  const accent = cfg.accentMode === 'theme'
    ? theme.palette.primary.main
    : color || moduleAccent || theme.palette.primary.main;
  const iconNode = React.isValidElement(icon)
    ? icon
    : typeof icon === 'function'
      ? React.createElement(icon)
      : <AppsOutlinedIcon />;
  const title = typeof label === 'string' ? `${label.replace(/:$/, '')}:` : label;
  const mainValue = value === null || value === undefined || value === '' ? '—' : value;
  const tail = suffix || sub;
  const roles = tokens.typography?.roles || {};
  const isGlass = cfg.surface === 'glass';
  const isTinted = cfg.surface === 'tinted';
  const isDetailed = cfg.variant === 'detailed';
  const isStacked = isDetailed || cfg.variant === 'stacked' || cfg.labelPosition === 'above';
  const isCentered = cfg.variant === 'centered';
  const isCompact = cfg.variant === 'compact';
  const alignValue = isCentered ? 'center' : (ALIGN_MAP[cfg.align] || 'flex-start');
  const background = isTinted
    ? `linear-gradient(135deg, ${colorWithAlpha(accent, (cfg.tint ?? 8) / 100)}, ${tokens.surfaces.card.background})`
    : infoCardBackground(tokens, cfg);
  const border = isTinted || isGlass
    ? `1px solid ${colorWithAlpha(accent, isGlass ? 0.24 : 0.18)}`
    : 'var(--hrms-info-card-border, 1px solid #e8edf4)';
  const iconBox = cfg.showIcon && cfg.iconPosition !== 'hidden' ? (
    <Box sx={{
      width: isCompact ? 26 : 30,
      height: isCompact ? 26 : 30,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--hrms-radius-small, 8px)',
      bgcolor: alpha(accent, 0.09),
      border: `1px solid ${alpha(accent, 0.16)}`,
      color: accent,
    }}>
      <OutlineIcon icon={iconNode} size={isCompact ? 14 : 16} />
    </Box>
  ) : null;
  const labelNode = cfg.showLabel && cfg.labelPosition !== 'hidden' ? (
    <Typography
      noWrap
      sx={{
        fontSize: `${Math.max(roles.cardSubtitle?.size || 12, 11)}px`,
        fontWeight: 400,
        color: 'text.secondary',
        minWidth: 0,
      }}
    >
      {toFa(title)}
    </Typography>
  ) : null;
  const valueNode = (
    <Typography
      noWrap
      dir="auto"
      sx={{
        fontSize: `${roles.cardValue?.size || 14}px`,
        fontWeight: roles.cardValue?.weight || 500,
        color: valueColor || 'text.primary',
        flexShrink: 0,
      }}
    >
      {toFa(mainValue)}
    </Typography>
  );
  const tailNode = cfg.showSub && tail ? (
    <Typography
      noWrap
      sx={{
        fontSize: `${Math.max(roles.caption?.size || 12, 11)}px`,
        fontWeight: 400,
        color: 'text.secondary',
        minWidth: 0,
      }}
    >
      {toFa(tail)}
    </Typography>
  ) : null;
  const valueFirst = cfg.valuePosition === 'start';
  const iconFirst = cfg.iconPosition !== 'end';
  const divider = cfg.showDivider ? (
    <Box aria-hidden sx={{ width: 1, alignSelf: 'stretch', bgcolor: 'var(--hrms-info-card-divider)' }} />
  ) : null;

  let content;
  if (isStacked) {
    content = (
      <Stack spacing={0.6} sx={{ width: '100%', minWidth: 0, alignItems: alignValue }}>
        <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap sx={{ width: '100%' }}>
          {iconFirst ? iconBox : null}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {labelNode}
            {tailNode}
          </Box>
          {!iconFirst ? iconBox : null}
        </Stack>
        <Box sx={{ width: '100%', textAlign: isCentered ? 'center' : cfg.align === 'end' ? 'left' : 'right' }}>
          {valueNode}
        </Box>
      </Stack>
    );
  } else {
    content = (
      <Stack
        direction="row"
        alignItems="center"
        spacing={isCompact ? 0.5 : 0.75}
        useFlexGap
        sx={{ width: '100%', minWidth: 0, justifyContent: isCentered ? 'center' : alignValue }}
      >
        {iconFirst ? iconBox : null}
        {divider}
        {valueFirst ? valueNode : null}
        {labelNode}
        {valueFirst ? null : valueNode}
        {tailNode}
        {!iconFirst ? iconBox : null}
      </Stack>
    );
  }

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      {...rest}
      className={`hrms-info-card${rest.className ? ` ${rest.className}` : ''}`}
      sx={{
        p: `${cfg.padding ?? 12}px`,
        minHeight: isCompact ? 44 : 52,
        height: '100%',
        display: 'flex',
        alignItems: isCentered ? 'center' : 'stretch',
        justifyContent: alignValue,
        borderRadius: 'var(--hrms-info-card-radius, 16px)',
        border,
        background,
        boxShadow: shadowValue(tokens, cfg.shadow || 'none'),
        backdropFilter: isGlass ? `blur(${cfg.glassBlur ?? 14}px)` : 'none',
        WebkitBackdropFilter: isGlass ? `blur(${cfg.glassBlur ?? 14}px)` : 'none',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...sx,
      }}
    >
      {content}
    </Paper>
  );
};

export default InfoCard;
