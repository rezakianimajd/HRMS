import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Chip,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';

const COLOR = '#14b8a6';
const COLOR_DARK = '#0f766e';
const FONT = 'Vazirmatn, IRANSans, sans-serif';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 14px 40px rgba(20,184,166,0.12)',
  borderRadius: '16px',
};

const Kpi = ({ label, value, color }) => (
  <Paper sx={{ ...glass, p: 2, textAlign: 'center' }}>
    <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>{label}</Typography>
    <Typography variant="h5" fontWeight={900} sx={{ color: color || COLOR_DARK, fontFamily: FONT, mt: 0.5 }}>{value}</Typography>
  </Paper>
);

const QuickLink = ({ icon, title, subtitle, path, color }) => {
  const navigate = useNavigate();
  return (
    <Paper onClick={() => navigate(path)} sx={{ ...glass, p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-3px)' } }}>
      <Avatar sx={{ width: 46, height: 46, borderRadius: '13px', background: `linear-gradient(135deg, ${color || COLOR}, ${color || COLOR}cc)` }}>{icon}</Avatar>
      <Box>
        <Typography variant="body2" fontWeight={800} sx={{ fontFamily: FONT }}>{title}</Typography>
        <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>{subtitle}</Typography>
      </Box>
    </Paper>
  );
};

const TreasuryPage = () => {
  const [kpis, setKpis] = useState({ payable: 0, paid: 0, outstanding: 0, cash: 0, open: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/treasury/payable-items/dashboard/').then(r => {
      setKpis({ payable: r.data.total_payable, paid: r.data.total_paid, outstanding: r.data.outstanding, cash: r.data.total_cash, open: r.data.open_count });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box textAlign="center" py={8}><CircularProgress sx={{ color: COLOR }} /></Box>;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <AccountBalanceWalletIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>داشبورد خزانه‌داری</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT }}>نمای کلی وجوه نقد و بدهی‌های قابل پرداخت</Typography>
        </Box>
        <Chip label="Treasury" sx={{ bgcolor: `${COLOR}14`, color: COLOR_DARK, fontWeight: 700, fontFamily: FONT }} />
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={4} md={2.4}><Kpi label="کل قابل‌پرداخت" value={formatPersianNumber(kpis.payable)} color="#b45309" /></Grid>
        <Grid item xs={6} sm={4} md={2.4}><Kpi label="پرداخت‌شده" value={formatPersianNumber(kpis.paid)} color="#10b981" /></Grid>
        <Grid item xs={6} sm={4} md={2.4}><Kpi label="ماندهٔ باز" value={formatPersianNumber(kpis.outstanding)} color="#ef4444" /></Grid>
        <Grid item xs={6} sm={4} md={2.4}><Kpi label="موجودی نقد" value={formatPersianNumber(kpis.cash)} color="#14b8a6" /></Grid>
        <Grid item xs={6} sm={4} md={2.4}><Kpi label="اقلام باز" value={toPersianDigits(kpis.open)} color="#f59e0b" /></Grid>
      </Grid>

      <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT, mb: 1.5 }}>دسترسی سریع</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<AccountBalanceIcon sx={{ color: '#fff' }} />} title="بانک‌ها و صندوق‌ها" subtitle="نهادهای پولی و مانده" path="/treasury/entities" color="#14b8a6" /></Grid>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<SwapHorizIcon sx={{ color: '#fff' }} />} title="تراکنش‌ها" subtitle="دریافت و پرداخت" path="/treasury/transactions" color="#3b82f6" /></Grid>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<ReceiptLongIcon sx={{ color: '#fff' }} />} title="قابل‌پرداخت‌ها" subtitle="تجمیع بدهی‌های ماژول‌ها" path="/treasury/payables" color="#f59e0b" /></Grid>
      </Grid>
    </Box>
  );
};

export default TreasuryPage;