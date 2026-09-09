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

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'در حال اجرا',
  suspended: 'متوقف',
  completed: 'تکمیل شده',
  terminated: 'فسخ شده',
};

const TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا',
  purchase: 'خرید',
  tender: 'مناقصه',
  consulting: 'مشاوره',
  service: 'خدمات',
  other: 'سایر',
};

const ContractsDashboardPage = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['external-contracts'],
    queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  const stats = useMemo(() => {
    const active = items.filter(c => c.status === 'active').length;
    const completed = items.filter(c => c.status === 'completed').length;
    const expiring = items.filter(c => {
      if (!c.end_date) return false;
      const days = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
      return days >= 0 && days <= 60;
    });
    const totalAmount = items.reduce((s, c) => s + Number(c.amount || 0), 0);
    return { total: items.length, active, completed, expiring, totalAmount };
  }, [items]);

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const card = (title, value, color, icon, suffix) => (
    <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.65)', border: `1px solid ${color}22` }}>
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
        border: '1px solid rgba(245,158,11,0.18)', borderRadius: 3,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">مدیریت قراردادها</Typography>
          <Typography variant="body2" color="textSecondary">داشبورد وضعیت قراردادهای پیمانکاری، خرید و مناقصه</Typography>
        </Box>
        <Button variant="contained" onClick={() => navigate('/external-contracts')}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 2 }}>
          مشاهده قراردادها
        </Button>
      </Paper>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {card('کل قراردادها', stats.total, '#f59e0b', <HandshakeIcon sx={{ color: '#fff' }} />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {card('در حال اجرا', stats.active, '#10b981', <PlayCircleIcon sx={{ color: '#fff' }} />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {card('تکمیل شده', stats.completed, '#3b82f6', <CheckCircleIcon sx={{ color: '#fff' }} />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {card('رو به انقضا (۶۰ روز)', stats.expiring.length, '#ef4444', <WarningIcon sx={{ color: '#fff' }} />)}
        </Grid>
      </Grid>

      {/* Expiring alerts */}
      {stats.expiring.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <Typography variant="subtitle1" fontWeight={800} color="error" sx={{ mb: 1 }}>
            ⚠️ قراردادهای رو به انقضا
          </Typography>
          <Stack spacing={1}>
            {stats.expiring.slice(0, 10).map(c => (
              <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={700}>{c.subject}</Typography>
                <Typography variant="caption" color="textSecondary">{c.party_name}</Typography>
                <Chip size="small" color="warning" label={`تا ${toJalali(c.end_date)}`} />
                <Typography variant="caption" fontWeight={700}>{formatPersianNumber(c.amount || 0)} ریال</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Recent contracts */}
      <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>آخرین قراردادها</Typography>
        {items.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
            قراردادی ثبت نشده است.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {items.slice(0, 8).map(c => (
              <Paper key={c.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, background: 'rgba(255,255,255,0.4)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" fontWeight={700}>{c.subject}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {c.party_name} · {TYPE_LABELS[c.contract_type] || ''}
                    </Typography>
                  </Box>
                  <Chip size="small" label={STATUS_LABELS[c.status] || c.status} color={c.status === 'active' ? 'success' : 'default'} variant="outlined" />
                  <Typography variant="caption" fontWeight={800}>{formatPersianNumber(c.amount || 0)} ریال</Typography>
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