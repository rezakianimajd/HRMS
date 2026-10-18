import React from 'react';
import {
  Box, Paper, Typography, Stack, Avatar, Chip, Grid, Tabs, Tab, alpha,
} from '@mui/material';

import BasePageHeader from '../ui/PageHeader';

/**
 * پالت نرم (Pastel) — آیکون‌های رنگی اما بدون اشباع بالا.
 * همهٔ کارت‌ها سفید و مستقل هستند.
 */
export const SOFT = {
  indigo: '#7c8bd9',
  violet: '#a08fdc',
  teal: '#68b7a8',
  green: '#7fbf8a',
  amber: '#d3ac6e',
  orange: '#d69a74',
  pink: '#d38aa8',
  blue: '#7aa6d6',
  slate: '#94a3b8',
};

const CARD_SX = {
  borderRadius: '16px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
};

/** استایل مشترک کارت سفید برای صفحات تنظیمات/کاربران/ظاهر */
export const SURFACE = { ...CARD_SX };

export const PageHeader = BasePageHeader;

export const StatCard = ({ label, value, sub, color = SOFT.indigo }) => (
  <Paper elevation={0} sx={{ ...CARD_SX, px: 1.6, py: 1.15, height: '100%' }}>
    <Stack direction="row" spacing={0.75} alignItems="baseline" flexWrap="wrap" useFlexGap>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary' }}>
        {label}:
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 900, color }}>{value}</Typography>
      {sub ? (
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{sub}</Typography>
      ) : null}
    </Stack>
  </Paper>
);

export const StatGrid = ({ stats = [] }) => (
  <Grid container spacing={1.25} sx={{ mb: 1.75 }}>
    {stats.map((stat) => (
      <Grid item xs={12} sm={6} lg={3} key={stat.label}>
        <StatCard {...stat} />
      </Grid>
    ))}
  </Grid>
);

export const TabsCard = ({ tabs = [], value, onChange, activeColor = SOFT.indigo }) => (
  <Paper elevation={0} sx={{ ...CARD_SX, mb: 2, overflow: 'hidden' }}>
    <Tabs
      value={value}
      onChange={(e, v) => onChange(v)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        px: 1,
        minHeight: 54,
        '& .MuiTabs-indicator': { height: 3, borderRadius: 2, bgcolor: activeColor },
        '& .MuiTab-root': {
          minHeight: 54, minWidth: 0, px: 1.75,
          textTransform: 'none', fontWeight: 400, fontSize: 13,
          color: 'text.secondary', gap: 0.75,
        },
        '& .MuiTab-root.Mui-selected': { color: activeColor, fontWeight: 500 },
      }}
    >
      {tabs.map((tab, index) => (
        <Tab
          key={tab.key}
          value={index}
          icon={React.cloneElement(tab.icon, { sx: { fontSize: 17 } })}
          iconPosition="start"
          label={(
            <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap>
              <span>{tab.label}</span>
              {tab.badge != null && tab.badge !== '' ? (
                <Chip
                  size="small" label={tab.badge}
                  sx={{
                    height: 17, fontSize: 9.5, fontWeight: 800,
                    bgcolor: alpha(activeColor, 0.12), color: activeColor,
                    '& .MuiChip-label': { px: 0.6 },
                  }}
                />
              ) : null}
            </Stack>
          )}
        />
      ))}
    </Tabs>
  </Paper>
);

export const SectionNote = ({ icon, title, desc, color = SOFT.indigo, trailing }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap',
    p: 1.4, mb: 1.75, borderRadius: '14px',
    bgcolor: alpha(color, 0.07),
    border: `1px solid ${alpha(color, 0.18)}`,
  }}>
    <Avatar variant="rounded" sx={{
      width: 34, height: 34, borderRadius: '10px',
      bgcolor: alpha(color, 0.14), color,
    }}>
      {React.cloneElement(icon, { sx: { fontSize: 18 } })}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 160 }}>
      {title ? (
        <Typography variant="h6" sx={{ color }}>{title}</Typography>
      ) : null}
      {desc ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{desc}</Typography>
      ) : null}
    </Box>
    {trailing}
  </Box>
);

export default { SOFT, PageHeader, StatCard, StatGrid, TabsCard, SectionNote };
