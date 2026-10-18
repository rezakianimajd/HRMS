import React from 'react';
import { Box, Paper, Typography, Avatar, CircularProgress } from '@mui/material';
import { formatPersianNumber } from '../../../core/utils/numberUtils';
import InfoCard from '../../../core/components/ui/InfoCard';
import PageHeader from '../../../core/components/ui/PageHeader';

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

export const ReportHeader = ({ icon, title, actions }) => (
  <PageHeader icon={icon} title={title} actions={actions} />
);

export const Loading = () => (
  <Box textAlign="center" py={6}><CircularProgress sx={{ color: COLOR }} /></Box>
);

export const StatCard = ({ label, value, color = COLOR_DARK }) => (
  <InfoCard label={label} value={value} color={color} />
);

export default { COLOR, COLOR_DARK, glass, ReportHeader, Loading, StatCard };