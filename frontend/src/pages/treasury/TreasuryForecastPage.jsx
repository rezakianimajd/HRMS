import React, { useState, useEffect } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const COLOR = '#14b8a6';
const COLOR_DARK = '#0f766e';

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

const Header = ({ icon, title, subtitle, extra }) => (
  <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
    background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
    <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>{icon}</Avatar>
    <Box sx={{ flex: 1, minWidth: 200 }}>
      <Typography variant="h6" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>{title}</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT }}>{subtitle}</Typography>
    </Box>
    {extra}
  </Paper>
);

const TreasuryForecastPage = () => {
  const [fc, setFc] = useState(null);
  const [recons, setRecons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  const loadForecast = (d) => axiosInstance.get('/treasury/cash-flow-forecast/', { params: { days: d } }).then(r => setFc(r.data));
  const loadRecons = () => axiosInstance.get('/treasury/treasury-reconciliations/').then(r => {
    setRecons(Array.isArray(r.data) ? r.data : r.data?.results || []);
  });

  useEffect(() => {
    Promise.all([loadForecast(days), loadRecons()]).finally(() => setLoading(false));
  }, []);

  const refreshForecast = (d) => { setDays(d); loadForecast(d); };

  if (loading) return <Box textAlign="center" py={8}><CircularProgress sx={{ color: COLOR }} /></Box>;

  return (
    <Box>
      <Header icon={<InsightsIcon sx={{ fontSize: 28, color: '#fff' }} />} title="برنامه‌ریزی نقدینگی"
        subtitle="منابع + دریافت‌های آتی − پرداخت‌های قطعی − تعهدات آینده"
        extra={<>
          {[7, 30, 90].map(d => <Button key={d} size="small" variant={days === d ? 'contained' : 'outlined'} onClick={() => refreshForecast(d)} sx={{ fontFamily: FONT, borderRadius: '8px' }}>{d} روز</Button>)}
        </>} />

      {fc && (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={6} sm={3}><Kpi label="موجودی نقد فعلی" value={formatPersianNumber(fc.current_cash)} color="#10b981" /></Grid>
          <Grid item xs={6} sm={3}><Kpi label="دریافت‌های آتی" value={formatPersianNumber(fc.expected_in)} color="#3b82f6" /></Grid>
          <Grid item xs={6} sm={3}><Kpi label="پرداخت‌های قطعی" value={formatPersianNumber(fc.scheduled_out)} color="#f59e0b" /></Grid>
          <Grid item xs={6} sm={3}><Kpi label="ماندهٔ پیش‌بینی‌شده" value={formatPersianNumber(fc.forecast_balance)} color={fc.forecast_balance >= 0 ? '#10b981' : '#ef4444'} /></Grid>
        </Grid>
      )}

      <Header icon={<CompareArrowsIcon sx={{ fontSize: 28, color: '#fff' }} />} title="مغایرت خزانه"
        subtitle="تطبیق ماندهٔ دفتری نهادها با موجودی اعلامی" />

      <Paper sx={{ ...glass, p: 2 }}>
        {recons.length === 0 ? (
          <Typography color="textSecondary" textAlign="center" py={4} sx={{ fontFamily: FONT }}>هنوز مغایرتی ثبت نشده است.</Typography>
        ) : (
          <TableContainer><Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>نهاد</TableCell>
              <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>تاریخ</TableCell>
              <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>موجودی اعلامی</TableCell>
              <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>مانده دفتری</TableCell>
              <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>اختلاف</TableCell>
              <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>وضعیت</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {recons.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontFamily: FONT }}>{r.entity_name}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{toJalali(r.as_of)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{formatPersianNumber(r.statement_balance)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{formatPersianNumber(r.book_balance)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT, fontWeight: 800, color: r.difference === 0 ? '#10b981' : '#ef4444' }}>{formatPersianNumber(r.difference)}</TableCell>
                  <TableCell><Chip size="small" label={r.status_display} sx={{ fontFamily: FONT }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default TreasuryForecastPage;