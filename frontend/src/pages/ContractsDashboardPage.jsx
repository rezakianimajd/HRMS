import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack, Chip, LinearProgress, Button,
} from '@mui/material';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const ContractsDashboardPage = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['contract-versions-all'],
    queryFn: () => axiosInstance.get('/contract-versions/').then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  const stats = useMemo(() => {
    const signed = items.filter(c => c.signed_by).length;
    const unsigned = items.length - signed;
    const expiring = items.filter(c => {
      if (!c.end_date) return false;
      const days = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
      return days >= 0 && days <= 60;
    });
    const expired = items.filter(c => c.end_date && new Date(c.end_date) < new Date());
    return { total: items.length, signed, unsigned, expiring, expired };
  }, [items]);

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const card = (title, value, color, icon, desc) => (
    <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.65)', border: `1px solid ${color}22` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 52, height: 52, background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ color }}>{formatPersianNumber(value)}</Typography>
          <Typography variant="caption" color="textSecondary">{title}</Typography>
        </Box>
      </Box>
      {desc && <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>{desc}</Typography>}
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
          <HistoryEduIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">مدیریت قراردادها</Typography>
          <Typography variant="body2" color="textSecondary">داشبورد وضعیت قراردادها، امضاها و هشدارهای انقضا</Typography>
        </Box>
        <Button variant="contained" onClick={() => navigate('/contracts')}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 2 }}>
          مشاهده قراردادها
        </Button>
      </Paper>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          {card('کل قراردادها', stats.total, '#f59e0b', <HistoryEduIcon sx={{ color: '#fff' }} />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {card('امضا شده', stats.signed, '#10b981', <CheckCircleIcon sx={{ color: '#fff' }} />)}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {card('در انتظار امضا', stats.unsigned, '#8b5cf6', <PendingIcon sx={{ color: '#fff' }} />)}
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
                <Typography variant="body2" fontWeight={700}>{c.employee_name}</Typography>
                <Typography variant="caption" color="textSecondary">نسخه {toPersianDigits(c.version)} ({toPersianDigits(c.year)})</Typography>
                <Chip size="small" color="warning" label={`تا ${toJalali(c.end_date)}`} />
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
                    <Typography variant="body2" fontWeight={700}>{c.employee_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {c.contract_type_display || '—'} · شروع {toJalali(c.start_date)} {c.end_date ? `· پایان ${toJalali(c.end_date)}` : ''}
                    </Typography>
                  </Box>
                  {c.signed_by ? (
                    <Chip size="small" color="success" icon={<CheckCircleIcon />} label={`امضا: ${c.signed_by}`} />
                  ) : (
                    <Chip size="small" color="default" icon={<PendingIcon />} label="در انتظار امضا" />
                  )}
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