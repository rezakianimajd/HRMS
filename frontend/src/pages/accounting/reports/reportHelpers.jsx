import React from 'react';
import { Box, Paper, Typography, Avatar, CircularProgress, Grid } from '@mui/material';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';

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

export const ReportHeader = ({ icon, title, subtitle, color = COLOR, dark = COLOR_DARK }) => (
  <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
    background: `linear-gradient(120deg, ${color}1a, rgba(255,255,255,0.3))`,
    border: `1px solid ${color}30`, borderRadius: '16px' }}>
    <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${color},${dark})`, boxShadow: `0 8px 24px ${color}55` }}>
      {icon}
    </Avatar>
    <Box sx={{ flex: 1 }}>
      <Typography variant="h6" fontWeight={800} sx={{ color: dark }}>{title}</Typography>
      <Typography variant="body2" color="textSecondary">{subtitle}</Typography>
    </Box>
  </Paper>
);

export const StatCard = ({ label, value, color = COLOR_DARK, sub }) => (
  <Paper sx={{ ...glass, p: 2, height: '100%' }}>
    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="h6" fontWeight={900} sx={{ color, my: 0.5 }}>{formatPersianNumber(value)}</Typography>
    {sub && <Typography variant="caption" color="textSecondary">{sub}</Typography>}
  </Paper>
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