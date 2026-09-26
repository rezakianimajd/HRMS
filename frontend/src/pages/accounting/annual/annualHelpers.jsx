import React from 'react';
import { Box, Paper, Typography, Avatar, CircularProgress } from '@mui/material';
import { formatPersianNumber } from '../../../core/utils/numberUtils';

export const COLOR = '#0ea5e9';
export const COLOR_DARK = '#0369a1';
export const BLUE = '#2563eb';
export const GREEN = '#059669';

export const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 14px 40px rgba(14,165,233,0.12)',
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

export const Loading = () => (
  <Box textAlign="center" py={6}><CircularProgress sx={{ color: COLOR }} /></Box>
);

export const StatCard = ({ label, value, color = COLOR_DARK }) => (
  <Paper sx={{ ...glass, p: 2, textAlign: 'center' }}>
    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="h6" fontWeight={900} sx={{ color, mt: 0.5 }}>{formatPersianNumber(value)}</Typography>
  </Paper>
);

export default { COLOR, COLOR_DARK, glass, ReportHeader, Loading, StatCard };