import React from 'react';
import {
  Box, Paper, Typography, Stack, Avatar, Chip, Grid, alpha, useTheme,
} from '@mui/material';

/**
 * SettingsShell — پوستهٔ مشترک «تنظیمات» و «تعاریف اولیه».
 *
 * طراحی الهام‌گرفته از داشبوردهای ERP: نوار کناری عمودی با گروه‌بندی منو،
 * کارت‌های آماری بالای محتوا و پنل سفید با گوشه‌های نرم.
 */
export const SHELL_ACCENT = '#6366f1';
export const SHELL_ACCENT_2 = '#8b5cf6';

export const StatTile = ({ icon, label, value, sub, color = SHELL_ACCENT }) => (
  <Paper
    elevation={0}
    sx={{
      position: 'relative', overflow: 'hidden',
      p: 1.75, height: '100%', borderRadius: '16px',
      border: '1px solid', borderColor: 'divider',
      bgcolor: 'background.paper',
      transition: 'transform .2s ease, box-shadow .2s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 14px 30px ${alpha(color, 0.16)}` },
      '&::after': {
        content: '""', position: 'absolute', insetInlineStart: -26, bottom: -34,
        width: 92, height: 92, borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(color, 0.18)}, transparent 70%)`,
      },
    }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
      <Avatar variant="rounded" sx={{
        width: 44, height: 44, borderRadius: '13px',
        bgcolor: alpha(color, 0.12), color,
        border: `1px solid ${alpha(color, 0.18)}`,
      }}>
        {React.cloneElement(icon, { sx: { fontSize: 22 } })}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }} noWrap>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 21, fontWeight: 900, lineHeight: 1.35, letterSpacing: '-.01em' }} noWrap>
          {value}
        </Typography>
        {sub ? (
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }} noWrap>{sub}</Typography>
        ) : null}
      </Box>
    </Stack>
  </Paper>
);

const NavButton = ({ item, active, onClick }) => {
  const color = item.color || SHELL_ACCENT;
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset', boxSizing: 'border-box', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 1.1, width: '100%',
        px: 1.25, py: 0.9, borderRadius: '12px',
        color: active ? '#fff' : 'text.secondary',
        background: active
          ? `linear-gradient(135deg, ${color}, ${alpha(color, 0.78)})`
          : 'transparent',
        boxShadow: active ? `0 10px 22px ${alpha(color, 0.32)}` : 'none',
        transition: 'all .18s ease',
        '&:hover': active ? {} : { bgcolor: alpha(color, 0.09), color: 'text.primary' },
        '&:focus-visible': { outline: `2px solid ${alpha(color, 0.6)}`, outlineOffset: 2 },
      }}
    >
      <Box sx={{
        width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center',
        flexShrink: 0,
        bgcolor: active ? 'rgba(255,255,255,0.18)' : alpha(color, 0.12),
        color: active ? '#fff' : color,
      }}>
        {React.cloneElement(item.icon, { sx: { fontSize: 17 } })}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: active ? 800 : 700, lineHeight: 1.6 }} noWrap>
          {item.label}
        </Typography>
        {item.desc ? (
          <Typography sx={{
            fontSize: 10, lineHeight: 1.5,
            color: active ? 'rgba(255,255,255,0.82)' : 'text.secondary',
          }} noWrap>
            {item.desc}
          </Typography>
        ) : null}
      </Box>
      {item.badge != null && item.badge !== '' ? (
        <Chip
          size="small"
          label={item.badge}
          sx={{
            height: 18, minWidth: 22, fontSize: 10, fontWeight: 800,
            bgcolor: active ? 'rgba(255,255,255,0.22)' : alpha(color, 0.12),
            color: active ? '#fff' : color,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      ) : null}
    </Box>
  );
};

const SettingsShell = ({
  brand = 'Kian ERP',
  brandSub = 'مرکز تنظیمات',
  icon,
  title,
  subtitle,
  badge,
  nav = [],
  activeKey,
  onSelect,
  stats = [],
  actions,
  footer,
  children,
}) => {
  const theme = useTheme();
  const groups = React.useMemo(() => {
    const map = new Map();
    nav.forEach((item) => {
      const key = item.group || 'بخش‌ها';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [nav]);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* هاله‌های تزئینی پس‌زمینه (شبیه تصویر مرجع) */}
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: '28px' }}>
        <Box sx={{
          position: 'absolute', width: 360, height: 360, borderRadius: '50%',
          top: -150, insetInlineEnd: -90,
          background: `radial-gradient(circle at 35% 35%, ${alpha(SHELL_ACCENT, 0.3)}, ${alpha(SHELL_ACCENT, 0)} 70%)`,
        }} />
        <Box sx={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          bottom: -160, insetInlineStart: -80,
          background: `radial-gradient(circle at 60% 40%, ${alpha(SHELL_ACCENT_2, 0.26)}, ${alpha(SHELL_ACCENT_2, 0)} 70%)`,
        }} />
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: { xs: 'column', md: 'row' },
          borderRadius: '24px',
          border: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: `0 24px 60px ${alpha(theme.palette.common.black, 0.10)}`,
        }}
      >
        {/* ------------------------------ نوار کناری ------------------------------ */}
        <Box sx={{
          width: { xs: '100%', md: 262 }, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderLeft: { xs: 'none', md: '1px solid' },
          borderBottom: { xs: '1px solid', md: 'none' },
          borderColor: 'divider',
          background: `linear-gradient(180deg, ${alpha(SHELL_ACCENT, 0.07)}, transparent 60%)`,
        }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2, pt: 2, pb: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '13px', display: 'grid', placeItems: 'center',
              color: '#fff', flexShrink: 0,
              background: `linear-gradient(135deg, ${SHELL_ACCENT}, ${SHELL_ACCENT_2})`,
              boxShadow: `0 10px 22px ${alpha(SHELL_ACCENT, 0.35)}`,
            }}>
              {icon ? React.cloneElement(icon, { sx: { fontSize: 22 } }) : null}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 14.5, fontWeight: 900, lineHeight: 1.5 }} noWrap>{brand}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }} noWrap>{brandSub}</Typography>
            </Box>
          </Stack>

          <Box sx={{
            flex: 1, overflowY: { md: 'auto' }, overflowX: { xs: 'auto', md: 'hidden' },
            px: 1.25, pb: 1,
          }}>
            {/* موبایل: نوار افقی فشرده */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, py: 0.5 }}>
              {nav.map((item) => (
                <Box key={item.key} sx={{ minWidth: 172 }}>
                  <NavButton
                    item={{ ...item, desc: '' }}
                    active={item.key === activeKey}
                    onClick={() => onSelect?.(item.key)}
                  />
                </Box>
              ))}
            </Box>

            {/* دسکتاپ: منوی گروه‌بندی‌شده */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              {groups.map((group) => (
                <Box key={group.label} sx={{ mb: 1.5 }}>
                  <Typography sx={{
                    px: 1, mb: 0.6, fontSize: 9.5, fontWeight: 900,
                    letterSpacing: '0.09em', color: 'text.disabled',
                  }}>
                    {group.label}
                  </Typography>
                  <Stack spacing={0.5}>
                    {group.items.map((item) => (
                      <NavButton
                        key={item.key}
                        item={item}
                        active={item.key === activeKey}
                        onClick={() => onSelect?.(item.key)}
                      />
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Box>

          {footer ? (
            <Box sx={{ px: 1.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              {footer}
            </Box>
          ) : null}
        </Box>

        {/* -------------------------------- محتوا -------------------------------- */}
        <Box sx={{ flex: 1, minWidth: 0, p: { xs: 1.75, md: 2.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 2.25 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography sx={{ fontSize: { xs: 19, md: 22 }, fontWeight: 900, letterSpacing: '-.01em' }}>
                  {title}
                </Typography>
                {badge}
              </Stack>
              {subtitle ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
            {actions ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{actions}</Stack>
            ) : null}
          </Stack>

          {stats.length > 0 ? (
            <Grid container spacing={1.5} sx={{ mb: 2.25 }}>
              {stats.map((stat) => (
                <Grid item xs={12} sm={6} lg={3} key={stat.label}>
                  <StatTile {...stat} />
                </Grid>
              ))}
            </Grid>
          ) : null}

          {children}
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingsShell;

