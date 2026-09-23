import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Grid, Button, Stack, Chip,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';

const COLOR = '#3b82f6';
const COLOR_DARK = '#2563eb';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(59,130,246,0.12)', borderRadius: '16px',
};

const StatCard = ({ icon, label, value, color, sub }) => (
  <Paper sx={{ ...glass, p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
    <Avatar sx={{ width: 52, height: 52, background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 20px ${color}44` }}>
      {icon}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="textSecondary">{label}</Typography>
      <Typography variant="h6" fontWeight={900} sx={{ color }}>{formatPersianNumber(value)}</Typography>
      {sub && <Typography variant="caption" color="textSecondary">{sub}</Typography>}
    </Box>
  </Paper>
);

const AccountingPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['acc-dashboard'], queryFn: () => axiosInstance.get('/accounting/reports/dashboard/').then(r => r.data) });
  const d = data || {};

  if (isLoading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  const statusColors = {
    draft: '#64748b', submitted: '#f59e0b', approved: '#10b981', posted: '#3b82f6', locked: '#6366f1', reversed: '#ef4444',
  };
  const statusLabels = {
    draft: 'پیش‌نویس', submitted: 'در انتظار', approved: 'تأییدشده', posted: 'ثبت‌شده', locked: 'قفل‌شده', reversed: 'برگشت‌خورده',
  };

  return (
    <Box>
      {/* هدر */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <CalculateIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>داشبورد حسابداری</Typography>
          <Typography variant="body2" color="textSecondary">نمای کلان وضعیت مالی و اسناد</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/accounting/documents/new')}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
          سند جدید
        </Button>
      </Paper>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<AccountBalanceIcon sx={{ color: '#fff' }} />} label="مجموع دارایی‌ها" value={d.total_assets} color="#2563eb" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ReceiptLongIcon sx={{ color: '#fff' }} />} label="مجموع بدهی‌ها" value={d.total_liabilities} color="#ef4444" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<TrendingUpIcon sx={{ color: '#fff' }} />} label="حقوق مالکانه" value={d.total_equity} color="#059669" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<PendingActionsIcon sx={{ color: '#fff' }} />} label="در انتظار تأیید" value={d.pending_documents} color="#f59e0b" sub="سند" />
        </Grid>
      </Grid>

      {/* درآمد و هزینه ماه */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<TrendingUpIcon sx={{ color: '#fff' }} />} label="درآمد این ماه" value={d.revenue_month} color="#059669" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ReceiptLongIcon sx={{ color: '#fff' }} />} label="هزینه این ماه" value={d.expense_month} color="#ef4444" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<TrendingUpIcon sx={{ color: '#fff' }} />} label="سود/زیان ماه" value={d.net_profit_month} color={d.net_profit_month >= 0 ? '#059669' : '#ef4444'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ReceiptLongIcon sx={{ color: '#fff' }} />} label="کل اسناد" value={d.total_documents} color="#6366f1" sub={`${toPersianDigits(d.posted_documents)} ثبت‌شده`} />
        </Grid>
      </Grid>

      {/* وضعیت اسناد */}
      <Paper sx={{ ...glass, p: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} mb={1.5}>وضعیت اسناد</Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {Object.entries(d.status_counts || {}).map(([k, v]) => (
            <Chip
              key={k}
              label={`${statusLabels[k] || k}: ${toPersianDigits(v)}`}
              sx={{ bgcolor: `${statusColors[k] || '#64748b'}18`, color: statusColors[k] || '#64748b', fontWeight: 700 }}
            />
          ))}
          {Object.keys(d.status_counts || {}).length === 0 && (
            <Typography variant="body2" color="textSecondary">هنوز سندی ثبت نشده است؛ از «سند جدید» شروع کنید.</Typography>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default AccountingPage;