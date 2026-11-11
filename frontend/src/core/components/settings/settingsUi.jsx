import React from 'react';
import {
  Box, Paper, Typography, Stack, Avatar, Chip, Grid, Tabs, Tab, alpha,
} from '@mui/material';

import BasePageHeader from '../ui/PageHeader';
import InfoCard from '../ui/InfoCard';

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
  borderRadius: 'var(--hrms-radius-large, 16px)',
  border: 'var(--hrms-border-card, 1px solid #e8edf4)',
  bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
  boxShadow: 'var(--hrms-shadow-card, 0 4px 18px rgba(15,23,42,0.04))',
};

/** استایل مشترک کارت سفید برای صفحات تنظیمات/کاربران/ظاهر */
export const SURFACE = { ...CARD_SX };

export const PageHeader = BasePageHeader;

export const StatCard = ({ label, value, sub, color = SOFT.indigo, icon }) => (
  <InfoCard icon={icon} label={label} value={value} suffix={sub} color={color} />
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

export const TabsCard = ({
  tabs = [], value, onChange, activeColor = SOFT.indigo, sx, dense = false,
}) => (
  <Paper elevation={0} sx={{ ...CARD_SX, mb: 2, overflow: 'hidden', ...(sx || {}) }}>
    <Tabs
      value={value}
      onChange={(e, v) => onChange(v)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        px: dense ? 0.25 : 1,
        minHeight: dense ? 40 : 54,
        '& .MuiTabs-indicator': { height: 3, borderRadius: 2, bgcolor: activeColor },
        '& .MuiTab-root': {
          minHeight: dense ? 40 : 54, minWidth: 0, px: dense ? 1 : 1.75,
          textTransform: 'none', fontWeight: 400,
          fontSize: dense ? 11.5 : 'var(--hrms-font-button-size, 13px)',
          color: 'text.secondary', gap: dense ? 0.4 : 0.75,
        },
        '& .MuiTab-root.Mui-selected': { color: activeColor, fontWeight: 600 },
      }}
    >
      {tabs.map((tab, index) => (
        <Tab
          key={tab.key}
          value={index}
          icon={tab.icon ? React.cloneElement(tab.icon, { sx: { fontSize: dense ? 15 : 17 } }) : undefined}
          iconPosition="start"
          label={(
            <Stack direction="row" spacing={dense ? 0.4 : 0.75} alignItems="center" useFlexGap>
              <span>{tab.label}</span>
              {tab.badge != null && tab.badge !== '' ? (
                <Chip
                  size="small" label={tab.badge}
                  sx={{
                    height: 17, fontSize: dense ? 10 : 12, fontWeight: 800,
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
