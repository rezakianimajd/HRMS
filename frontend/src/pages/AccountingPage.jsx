import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack, Chip,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';

const COLOR = '#3b82f6';
const COLOR_DARK = '#2563eb';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(59,130,246,0.12)',
  borderRadius: '16px',
};

const StatCard = ({ icon, label, value, color }) => (
  <Paper sx={{ ...glass, p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
    <Avatar sx={{ width: 52, height: 52, background: `linear-gradient(135deg,${color},${color}99)`, boxShadow: `0 8px 20px ${color}44` }}>
      {icon}
    </Avatar>
    <Box>
      <Typography variant="caption" color="textSecondary">{label}</Typography>
      <Typography variant="h6" fontWeight={900} sx={{ color }}>{formatPersianNumber(value)}</Typography>
    </Box>
  </Paper>
);

const AccountingPage = () => {
  const { data: accounts } = useQuery({ queryKey: ['dash-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/').then(r => r.data) });
  const { data: docs } = useQuery({ queryKey: ['dash-docs'], queryFn: () => axiosInstance.get('/accounting/documents/').then(r => r.data) });
  const { data: income } = useQuery({ queryKey: ['dash-income'], queryFn: () => axiosInstance.get('/accounting/reports/income-statement/').then(r => r.data) });

  const accountList = Array.isArray(accounts) ? accounts : accounts?.results || [];
  const docList = Array.isArray(docs) ? docs : docs?.results || [];
  const unpostedDocs = docList.filter(d => !['posted', 'locked'].includes(d.status));
  const postedDocs = docList.length - unpostedDocs.length;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <CalculateIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>داشبورد حسابداری</Typography>
          <Typography variant="body2" color="textSecondary">نمای کلان وضعیت مالی و اسناد — تعاریف کدینگ از منوی «تعاریف حسابداری» قابل دسترسی است.</Typography>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<AccountTreeIcon sx={{ color: '#fff', fontSize: 26 }} />} label="تعداد حساب‌ها" value={accountList.length} color={COLOR} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ReceiptLongIcon sx={{ color: '#fff', fontSize: 26 }} />} label="اسناد ثبت‌شده" value={postedDocs} color="#10b981" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ReceiptLongIcon sx={{ color: '#fff', fontSize: 26 }} />} label="اسناد در جریان" value={unpostedDocs.length} color="#f59e0b" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<AssessmentIcon sx={{ color: '#fff', fontSize: 26 }} />} label="سود/زیان خالص" value={income?.net_profit || 0} color={income?.net_profit >= 0 ? '#059669' : '#ef4444'} />
        </Grid>
      </Grid>

      <Paper sx={{ ...glass, p: 3, mt: 2, textAlign: 'center' }}>
        <CalculateIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body1" fontWeight={700} color={COLOR_DARK}>هستهٔ مالی مرکزی KIAN EBP</Typography>
        <Stack direction="row" spacing={1} justifyContent="center" mt={1.5} flexWrap="wrap" useFlexGap>
          <Chip label="اسناد حسابداری" /> <Chip label="قالب‌های ثبت" /> <Chip label="گزارش‌های مالی" />
        </Stack>
      </Paper>
    </Box>
  );
};

export default AccountingPage;