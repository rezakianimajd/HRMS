import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack, Chip, Button,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { DonutChart } from '../core/components/charts/Charts';
import { CONTRACT_STATUS_LABELS as STATUS_LABELS, CONTRACT_STATUS_COLORS as STATUS_COLORS, CONTRACT_TYPE_LABELS as TYPE_LABELS, currencyLabel } from '../core/theme/tokens';

const HBarList = ({ data }) => {
  const maxV = Math.max(...data.map(x => x.value), 1);
  return (
    <Box>
      {data.map((d, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.25 }}>
          <Typography variant="body2" fontWeight={700} sx={{ width: '50%', textAlign: 'right', wordBreak: 'break-word' }}>
            {d.label}
          </Typography>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1, height: 20, bgcolor: '#eef2f7', borderRadius: '10px', overflow: 'hidden' }}>
              <Box sx={{ width: `${(d.value / maxV) * 100}%`, height: '100%', background: d.color, borderRadius: '10px', transition: 'width 0.6s ease' }} />
            </Box>
            <Typography variant="body2" fontWeight={700} sx={{ minWidth: 28, textAlign: 'left' }}>{formatPersianNumber(d.value)}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const ContractsDashboardPage = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['external-contracts'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  // Server-side aggregation for KPI + charts (fast with large datasets).
  const { data: statsData } = useQuery({
    queryKey: ['external-contracts-stats'],
    queryFn: () => axiosInstance.get('/external-contracts/stats/').then(r => r.data),
  });
  const s = statsData || {};
  const statusCounts = s.status_counts || {};
  const typeCounts = s.type_counts || {};
  const projectCounts = s.project_counts || {};

  const expiringItems = useMemo(() => items.filter(c => {
    if (!c.end_date) return false;
    const days = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
    return days >= 0 && days <= 60;
  }), [items]);

  const charts = useMemo(() => {
    const statusDist = Object.entries(STATUS_LABELS)
      .map(([k, v]) => ({ label: v, value: Number(statusCounts[k] || 0), color: STATUS_COLORS[k] }))
      .filter(d => d.value > 0);
    const PALETTE = ['#f97316', '#10b981', '#f59e0b', '#6366f1', '#0ea5e9', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#84cc16'];
    // نوع‌ها با نام واقعی (پیکربندی‌شده) از سرور می‌آیند؛ رنگ به‌صورت چرخشی اختصاص می‌گیرد.
    const typeDist = Object.entries(typeCounts || {})
      .map(([label, value], i) => ({ label, value: Number(value), color: PALETTE[i % PALETTE.length] }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
    const projectDist = Object.entries(projectCounts || {})
      .map(([label, value], i) => ({ label, value: Number(value), color: PALETTE[(i + 3) % PALETTE.length] }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
    return { statusDist, typeDist, projectDist };
  }, [statusCounts, typeCounts, projectCounts]);

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const card = (title, value, color, icon, suffix) => (
    <Paper sx={{ p: 2.5, borderRadius: '10px', background: 'rgba(255,255,255,0.65)', border: `1px solid ${color}22` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 52, height: 52, background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ color }}>{formatPersianNumber(value)}{suffix ? ` ${suffix}` : ''}</Typography>
          <Typography variant="caption" color="textSecondary">{title}</Typography>
        </Box>
      </Box>
    </Paper>
  );

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.12), rgba(249,115,22,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">مدیریت قراردادها</Typography>
          <Typography variant="body2" color="textSecondary">داشبورد وضعیت قراردادهای پیمانکاری، خرید و مناقصه</Typography>
        </Box>
        <Button variant="contained" onClick={() => navigate('/external-contracts')}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px' }}>
          مشاهده قراردادها
        </Button>
      </Paper>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {card('کل قراردادها', s.total || 0, '#f59e0b', <HandshakeIcon sx={{ color: '#fff' }} />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {card('در حال اجرا', statusCounts.active || 0, '#10b981', <PlayCircleIcon sx={{ color: '#fff' }} />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {card('تکمیل شده', statusCounts.completed || 0, '#3b82f6', <CheckCircleIcon sx={{ color: '#fff' }} />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {card('رو به انقضا (۶۰ روز)', s.expiring || 0, '#ef4444', <WarningIcon sx={{ color: '#fff' }} />)}
        </Grid>
      </Grid>

      {/* Analytics charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.65)', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>توزیع وضعیت قراردادها</Typography>
            {charts.statusDist.length === 0 ? (
              <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>داده‌ای نیست</Typography>
            ) : (
              <DonutChart data={charts.statusDist} size={160} centerLabel="قرارداد" />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.65)', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>توزیع انواع قرارداد</Typography>
            {charts.typeDist.length === 0 ? (
              <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>داده‌ای نیست</Typography>
            ) : (
              <HBarList data={charts.typeDist} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.65)' }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>تعداد قرارداد به تفکیک پروژه</Typography>
            {charts.projectDist.length === 0 ? (
              <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>داده‌ای نیست</Typography>
            ) : (
              <HBarList data={charts.projectDist} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Expiring alerts */}
      {expiringItems.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: '10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <Typography variant="subtitle1" fontWeight={800} color="error" sx={{ mb: 1 }}>
            ⚠️ قراردادهای رو به انقضا
          </Typography>
          <Stack spacing={1}>
            {expiringItems.slice(0, 10).map(c => (
              <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={700}>{c.subject}</Typography>
                <Typography variant="caption" color="textSecondary">{c.party_name}</Typography>
                <Chip size="small" color="warning" label={`تا ${toJalali(c.end_date)}`} />
                <Typography variant="caption" fontWeight={700}>{formatPersianNumber(c.amount || 0)} {currencyLabel(c)}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Recent contracts */}
      <Paper sx={{ p: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.65)' }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>آخرین قراردادها</Typography>
        {items.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
            قراردادی ثبت نشده است.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {items.slice(0, 8).map(c => (
              <Paper key={c.id} variant="outlined" sx={{ p: 1.5, borderRadius: '10px', background: 'rgba(255,255,255,0.4)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" fontWeight={700}>{c.subject}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {c.party_name} · {c.contract_type_master_name || TYPE_LABELS[c.contract_type] || ''}
                    </Typography>
                  </Box>
                  <Chip size="small" label={STATUS_LABELS[c.status] || c.status} color={c.status === 'active' ? 'success' : 'default'} variant="outlined" />
                  <Typography variant="caption" fontWeight={800}>{formatPersianNumber(c.amount || 0)} {currencyLabel(c)}</Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default ContractsDashboardPage;