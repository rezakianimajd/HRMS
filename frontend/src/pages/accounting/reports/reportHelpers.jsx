import React from 'react';
import { Box, Paper, Typography, Avatar, CircularProgress, Grid, Stack } from '@mui/material';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import InfoCard from '../../../core/components/ui/InfoCard';
import PageHeader from '../../../core/components/ui/PageHeader';

export const COLOR = '#8b5cf6';
export const COLOR_DARK = '#7c3aed';
export const BLUE = '#2563eb';
export const GREEN = '#059669';
export const RED = '#ef4444';
export const AMBER = '#f59e0b';
export const CYAN = '#06b6d4';

export const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 14px 40px rgba(139,92,246,0.12)',
  borderRadius: '16px',
};

export const ReportHeader = ({ icon, title, actions }) => (
  <PageHeader icon={icon} title={title} actions={actions} />
);

export const StatCard = ({ label, value, color = COLOR_DARK, sub }) => (
  <InfoCard label={label} value={value} suffix={sub} color={color} />
);

export const Loading = () => (
  <Box textAlign="center" py={6}><CircularProgress sx={{ color: COLOR }} /></Box>
);

export const EmptyState = ({ message = 'داده‌ای برای نمایش وجود ندارد' }) => (
  <Box textAlign="center" py={6}>
    <Typography color="textSecondary">{message}</Typography>
  </Box>
);

export const SectionCard = ({ title, color = COLOR_DARK, children, action }) => (
  <Paper sx={{ ...glass, p: 2, mb: 2, overflow: 'hidden' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color }}>{title}</Typography>
      {action}
    </Box>
    {children}
  </Paper>
);

export const MoneyRow = ({ label, value, color = 'inherit', border = false, bold = false }) => (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    py: 0.5, ...(border ? { borderTop: '1px solid rgba(0,0,0,0.08)', mt: 0.5 } : {}),
  }}>
    <Typography variant="body2" fontWeight={bold ? 800 : 500} sx={{ color: bold ? COLOR_DARK : 'text.primary' }}>{label}</Typography>
    <Typography variant="body2" fontWeight={bold ? 900 : 700} sx={{ color }}>{formatPersianNumber(value)}</Typography>
  </Box>
);

export const HeaderCaption = ({ children }) => (
  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: -1.5, mb: 2 }}>
    {children}
  </Typography>
);

// Persian-safe percent formatter
export const formatPercent = (v) => {
  if (v === null || v === undefined) return '—';
  return `${toPersianDigits((v * 100).toFixed(1))}٪`;
};

export const StatGrid = ({ children }) => (
  <Grid container spacing={2} sx={{ mb: 2 }}>
    {children}
  </Grid>
);

export default {
  COLOR, COLOR_DARK, BLUE, GREEN, RED, AMBER, CYAN, glass,
  ReportHeader, StatCard, Loading, EmptyState, SectionCard, MoneyRow, StatGrid, formatPercent,
};