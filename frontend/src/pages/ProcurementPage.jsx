import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Chip,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';

const COLOR = '#f59e0b';
const COLOR_DARK = '#b45309';
const FONT = 'Vazirmatn, IRANSans, sans-serif';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 14px 40px rgba(245,158,11,0.12)',
  borderRadius: '16px',
};

const listOf = (r) => Array.isArray(r.data) ? r.data : r.data?.results || [];

const Kpi = ({ label, value, color }) => (
  <Paper sx={{ ...glass, p: 2, textAlign: 'center' }}>
    <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>{label}</Typography>
    <Typography variant="h5" fontWeight={900} sx={{ color: color || COLOR_DARK, fontFamily: FONT, mt: 0.5 }}>
      {typeof value === 'number' ? toPersianDigits(value) : value}
    </Typography>
  </Paper>
);

const QuickLink = ({ icon, title, subtitle, path, color }) => {
  const navigate = useNavigate();
  return (
    <Paper
      onClick={() => navigate(path)}
      sx={{
        ...glass, p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 18px 40px ${color || COLOR}33` },
      }}
    >
      <Avatar sx={{ width: 46, height: 46, borderRadius: '13px', background: `linear-gradient(135deg, ${color || COLOR}, ${color || COLOR}cc)` }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="body2" fontWeight={800} sx={{ fontFamily: FONT }}>{title}</Typography>
        <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>{subtitle}</Typography>
      </Box>
    </Paper>
  );
};

const ProcurementPage = () => {
  const [kpis, setKpis] = useState({ suppliers: 0, items: 0, requests: 0, orders: 0, invoices: 0, payable: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [suppliers, items, requests, orders, invoices] = await Promise.all([
          axiosInstance.get('/procurement/suppliers/'),
          axiosInstance.get('/procurement/items/'),
          axiosInstance.get('/procurement/purchase-requests/'),
          axiosInstance.get('/procurement/purchase-orders/'),
          axiosInstance.get('/procurement/purchase-invoices/'),
        ]);
        const invs = listOf(invoices);
        setKpis({
          suppliers: listOf(suppliers).length,
          items: listOf(items).length,
          requests: listOf(requests).length,
          orders: listOf(orders).length,
          invoices: invs.length,
          payable: invs.reduce((s, i) => s + (Number(i.balance) || 0), 0),
        });
      } catch (e) {
        // keep silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <Box textAlign="center" py={8}><CircularProgress sx={{ color: COLOR }} /></Box>;
  }

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <ShoppingCartIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>داشبورد تدارکات</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT }}>نمای کلی چرخهٔ تدارکات و دسترسی سریع به بخش‌ها</Typography>
        </Box>
        <Chip label="Procure-to-Pay" sx={{ bgcolor: `${COLOR}14`, color: COLOR_DARK, fontWeight: 700, fontFamily: FONT }} />
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={4} md={2}><Kpi label="تأمین‌کنندگان" value={kpis.suppliers} color="#f59e0b" /></Grid>
        <Grid item xs={6} sm={4} md={2}><Kpi label="کالاها" value={kpis.items} color="#10b981" /></Grid>
        <Grid item xs={6} sm={4} md={2}><Kpi label="درخواست‌ها" value={kpis.requests} color="#3b82f6" /></Grid>
        <Grid item xs={6} sm={4} md={2}><Kpi label="سفارش‌ها" value={kpis.orders} color="#8b5cf6" /></Grid>
        <Grid item xs={6} sm={4} md={2}><Kpi label="صورتحساب‌ها" value={kpis.invoices} color="#ef4444" /></Grid>
        <Grid item xs={6} sm={4} md={2}><Kpi label="مانده پرداختنی" value={formatPersianNumber(kpis.payable)} color="#b45309" /></Grid>
      </Grid>

      <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT, mb: 1.5 }}>
        دسترسی سریع
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<StorefrontIcon sx={{ color: '#fff' }} />} title="تأمین‌کنندگان" subtitle="مدیریت و ارزیابی تأمین‌کنندگان" path="/procurement/suppliers" color="#f59e0b" /></Grid>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<Inventory2Icon sx={{ color: '#fff' }} />} title="کالاها و خدمات" subtitle="کاتالوگ کالاها و خدمات" path="/procurement/items" color="#10b981" /></Grid>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<RequestQuoteIcon sx={{ color: '#fff' }} />} title="درخواست‌های خرید" subtitle="درخواست‌ها و گردشکار تأیید" path="/procurement/requests" color="#3b82f6" /></Grid>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<ShoppingCartOutlinedIcon sx={{ color: '#fff' }} />} title="سفارش‌های خرید" subtitle="سفارش‌ها و پیگیری تحویل" path="/procurement/orders" color="#8b5cf6" /></Grid>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<LocalShippingIcon sx={{ color: '#fff' }} />} title="رسید کالا" subtitle="قبض انبار و تحویل کالا" path="/procurement/receipts" color="#0ea5e9" /></Grid>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<ReceiptLongIcon sx={{ color: '#fff' }} />} title="صورتحساب‌ها" subtitle="صورتحساب تأمین‌کنندگان" path="/procurement/invoices" color="#ef4444" /></Grid>
        <Grid item xs={12} sm={6} md={4}><QuickLink icon={<PaymentsIcon sx={{ color: '#fff' }} />} title="پرداخت‌ها" subtitle="پرداخت‌های انجام‌شده" path="/procurement/payments" color="#10b981" /></Grid>
      </Grid>
    </Box>
  );
};

export default ProcurementPage;