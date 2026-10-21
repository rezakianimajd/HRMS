import React from 'react';
import { Paper, Stack, Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import { useApplication } from '../../context/ApplicationContext';
import { useModulePalette } from '../../context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../../theme/appearanceDefaults';
import { OutlineIcon } from './PageHeader';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const toFa = (value) => (
  typeof value === 'number' || typeof value === 'string'
    ? String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
    : value
);

/**
 * کارت اطلاعات تک‌خطی:
 *   [آیکون اوت‌لاین]  عنوان:  مقدار  پسوند
 * پس‌زمینهٔ سفید، بدون سایه و بدون انیمیشن.
 */
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
  ...rest
}) => {
  const theme = useTheme();
  const { currentApp } = useApplication();
  const { getPalette, typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const accent = color || getPalette(currentApp?.slug)?.accent || theme.palette.primary.main;
  const iconNode = React.isValidElement(icon)
    ? icon
    : typeof icon === 'function'
      ? React.createElement(icon)
      : <AppsOutlinedIcon />;
  const title = typeof label === 'string' ? `${label.replace(/:$/, '')}:` : label;
  const mainValue = value === null || value === undefined || value === '' ? '—' : value;
  const tail = suffix || sub;

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      {...rest}
      sx={{
        p: 1.1,
        px: 1.25,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...sx,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        useFlexGap
        sx={{ width: '100%', minWidth: 0 }}
      >
        <Box sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '9px',
          bgcolor: alpha(accent, 0.09),
          border: `1px solid ${alpha(accent, 0.16)}`,
          color: accent,
        }}>
          <OutlineIcon icon={iconNode} size={16} />
        </Box>

        <Typography
          noWrap
          sx={{
            fontSize: `${Math.max(type.statSize - 1, 12)}px`,
            fontWeight: 400,
            color: 'text.secondary',
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {toFa(title)}
        </Typography>

        <Typography
          noWrap
          dir="auto"
          sx={{
            fontSize: `${type.statSize}px`,
            fontWeight: type.statWeight,
            color: valueColor || 'text.primary',
            flexShrink: 0,
          }}
        >
          {toFa(mainValue)}
        </Typography>

        {tail ? (
          <Typography
            noWrap
            sx={{
              fontSize: `${Math.max(type.statSize - 2, 12)}px`,
              fontWeight: 400,
              color: 'text.secondary',
              flexShrink: 1,
              minWidth: 0,
            }}
          >
            {toFa(tail)}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default InfoCard;
