import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Grid, Button, Stack, Chip,
  Autocomplete, TextField,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { motion, useInView } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';

const COLOR = '#3b82f6';
const COLOR_DARK = '#2563eb';
const GREEN = '#059669';
const RED = '#ef4444';
const VIOLET = '#8b5cf6';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 14px 40px rgba(59,130,246,0.12)',
  borderRadius: '18px',
};

const COLORS = { draft: '#64748b', submitted: '#f59e0b', approved: '#10b981', posted: '#3b82f6', locked: '#6366f1', reversed: '#ef4444' };
const STATUS_LABELS = { draft: 'پیش‌نویس', submitted: 'در انتظار', approved: 'تأییدشده', posted: 'ثبت‌شده', locked: 'قفل‌شده', reversed: 'برگشت‌خورده' };

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return { ref, value };
}

const fmtDelta = (d) => {
  if (d === null || d === undefined) return null;
  return `${toPersianDigits(Math.abs(Math.round(d)))}٪`;
};

const KpiCard = ({ icon, label, value, color, delta, spark = [], sub, onClick }) => {
  const { ref, value: displayed } = useCountUp(Number(value) || 0);
  const del = Number.isFinite(delta) ? delta : null;
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ height: '100%' }}>
      <Paper onClick={onClick} sx={{
        ...glass, p: 2, height: '100%', cursor: onClick ? 'pointer' : 'default',
        position: 'relative', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? { transform: 'translateY(-4px)', boxShadow: `0 18px 40px ${color}33` } : {},
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Avatar sx={{ width: 42, height: 42, background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 6px 16px ${color}44` }}>{icon}</Avatar>
          <Typography variant="caption" color="textSecondary" fontWeight={600}>{label}</Typography>
        </Box>
        <Typography ref={ref} variant="h5" fontWeight={900} sx={{ color, lineHeight: 1.1 }}>{formatPersianNumber(Math.round(displayed))}</Typography>
        {del !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            {del >= 0 ? <TrendingUpIcon sx={{ fontSize: 16, color: GREEN }} /> : <TrendingDownIcon sx={{ fontSize: 16, color: RED }} />}
            <Typography variant="caption" fontWeight={800} sx={{ color: del >= 0 ? GREEN : RED }}>{fmtDelta(del)}</Typography>
            <Typography variant="caption" color="textSecondary">نسبت به ماه قبل</Typography>
          </Box>
        )}
        {sub && <Typography variant="caption" color="textSecondary">{sub}</Typography>}
        {spark.length > 1 && (
          <Box sx={{ position: 'absolute', bottom: 8, left: 8, right: 8, height: 24, opacity: 0.7 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark}>
                <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

const AccountingPage = () => {
  const navigate = useNavigate();
  const [year, setYear] = useState(null);
  const [years, setYears] = useState([]);

  useEffect(() => {
    axiosInstance.get('/accounting/fiscal-years/').then(r => {
      const d = r.data;
      const list = Array.isArray(d) ? d : d?.results || [];
      setYears(list);
      const cur = list.find(y => y.is_current) || list[0];
      if (cur) setYear(cur);
    }).catch(() => {});
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['acc-dashboard-rich', year?.id],
    queryFn: () => axiosInstance.get('/accounting/reports/dashboard-rich/', { params: year?.id ? { fiscal_year: year.id } : {} }).then(r => r.data),
    enabled: !!year,
  });

  if (isLoading || !data) {
    return <Box textAlign="center" py={8}><CircularProgress sx={{ color: COLOR }} /></Box>;
  }

  const k = data.kpis;
  const deltas = data.deltas;
  const eq = data.accounting_equation;
  const trend = (data.monthly_trend || []).map(m => ({ ...m, label: toPersianDigits(m.month.slice(5)) + '/' + toPersianDigits(m.month.slice(0, 4).slice(2)) }));
  const statusData = Object.entries(data.status_counts || {}).map(([key, value]) => ({ key, name: STATUS_LABELS[key] || key, value }));
  const categories = data.category_breakdown || [];
  const trendSpark = trend.map(t => ({ v: t.net }));

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <CalculateIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>داشبورد حسابداری</Typography>
          <Typography variant="body2" color="textSecondary">نمای تعاملی و گرافیکی وضعیت مالی و اسناد</Typography>
        </Box>
        <Autocomplete size="small" options={years} getOptionLabel={o => o.name} value={year}
          onChange={(e, v) => setYear(v)} renderInput={(p) => <TextField {...p} label="سال مالی" />} sx={{ width: 180 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/accounting/document-new')}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
          سند جدید
        </Button>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard icon={<AccountBalanceIcon sx={{ color: '#fff' }} />} label="مجموع دارایی‌ها" value={k.total_assets} color="#2563eb" onClick={() => navigate('/accounting/reports/balance-sheet')} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard icon={<ReceiptLongIcon sx={{ color: '#fff' }} />} label="مجموع بدهی‌ها" value={k.total_liabilities} color="#ef4444" onClick={() => navigate('/accounting/reports/balance-sheet')} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard icon={<TrendingUpIcon sx={{ color: '#fff' }} />} label="حقوق مالکانه" value={k.total_equity} color="#059669" onClick={() => navigate('/accounting/reports/balance-sheet')} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard icon={<TrendingUpIcon sx={{ color: '#fff' }} />} label="سود/زیان ماه" value={k.net_profit_month} color={k.net_profit_month >= 0 ? '#059669' : '#ef4444'} delta={deltas.net} spark={trendSpark} onClick={() => navigate('/accounting/reports/income-statement')} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2.4}>
          <KpiCard icon={<PendingActionsIcon sx={{ color: '#fff' }} />} label="در انتظار تأیید" value={k.pending_documents} color="#f59e0b" sub="سند" onClick={() => navigate('/accounting/documents')} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} lg={5}>
          <Paper sx={{ ...glass, p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK}>روند درآمد و هزینه ماهانه</Typography>
              <Box sx={{ flex: 1 }} />
              <Chip size="small" label={`درآمد: ${formatPersianNumber(k.revenue_month)}`} sx={{ bgcolor: `${GREEN}14`, color: GREEN, fontWeight: 700 }} />
              <Chip size="small" label={`هزینه: ${formatPersianNumber(k.expense_month)}`} sx={{ bgcolor: `${RED}14`, color: RED, fontWeight: 700 }} />
            </Box>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.4} /><stop offset="100%" stopColor={GREEN} stopOpacity={0} /></linearGradient>
                  <linearGradient id="expg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={RED} stopOpacity={0.4} /><stop offset="100%" stopColor={RED} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatPersianNumber(v)} />
                <ReTooltip formatter={(v) => formatPersianNumber(v)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="درآمد" stroke={GREEN} fill="url(#rev)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="هزینه" stroke={RED} fill="url(#expg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper sx={{ ...glass, p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK}>معادلهٔ حسابداری</Typography>
            <Box sx={{ my: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography variant="body2" color="textSecondary">دارایی‌ها</Typography>
                <Typography variant="body2" fontWeight={800} color={COLOR_DARK}>{formatPersianNumber(eq.assets)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography variant="body2" color="textSecondary">بدهی + حقوق مالکانه</Typography>
                <Typography variant="body2" fontWeight={800} color={eq.balanced ? GREEN : RED}>{formatPersianNumber(eq.liabilities_equity)}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: eq.balanced ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '10px', p: 1.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: eq.balanced ? GREEN : RED, boxShadow: `0 0 8px ${eq.balanced ? GREEN : RED}` }} />
              <Typography variant="body2" fontWeight={800} sx={{ color: eq.balanced ? GREEN : RED }}>
                {eq.balanced ? 'تراز ✓' : `اختلاف ${formatPersianNumber(eq.difference)}`}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <Paper sx={{ ...glass, p: 2, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} mb={1}>وضعیت اسناد</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}
                  onClick={(entry) => navigate('/accounting/documents', { state: { status: entry.key } })}>
                  {statusData.map((s) => <Cell key={s.key} fill={COLORS[s.key]} />)}
                </Pie>
                <ReTooltip formatter={(v) => formatPersianNumber(v)} />
              </PieChart>
            </ResponsiveContainer>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {statusData.map((s) => (
                <Chip key={s.key} size="small" label={`${s.name}: ${toPersianDigits(s.value)}`}
                  sx={{ bgcolor: `${COLORS[s.key]}18`, color: COLORS[s.key], fontWeight: 700 }}
                  onClick={() => navigate('/accounting/documents', { state: { status: s.key } })} />
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ ...glass, p: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} mb={1.5}>ترکیب طبقات حساب</Typography>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={categories} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatPersianNumber(v)} />
            <ReTooltip formatter={(v) => formatPersianNumber(v)} />
            <Bar dataKey="value" name="مبلغ" fill={VIOLET} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

export default AccountingPage;