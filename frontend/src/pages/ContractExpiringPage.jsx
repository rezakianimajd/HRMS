import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack, Chip, TextField, InputAdornment, Button,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { glassPaper, currencyLabel, CONTRACT_STATUS_COLORS } from '../core/theme/tokens';

const ContractExpiringPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ext-contracts-expiring'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const buckets = useMemo(() => {
    const now = new Date();
    const days = (d) => Math.ceil((new Date(d) - now) / 86400000);
    const withEnd = list.filter(c => c.end_date);
    const q = (search || '').trim().toLowerCase();
    const matches = (c) => !q || (c.subject || '').toLowerCase().includes(q) || (c.party_name || '').toLowerCase().includes(q) || (c.number || '').toLowerCase().includes(q);
    return {
      expired: withEnd.filter(c => days(c.end_date) < 0 && matches(c)),
      soon30: withEnd.filter(c => days(c.end_date) >= 0 && days(c.end_date) <= 30 && matches(c)),
      soon60: withEnd.filter(c => days(c.end_date) > 30 && days(c.end_date) <= 60 && matches(c)),
      soon90: withEnd.filter(c => days(c.end_date) > 60 && days(c.end_date) <= 90 && matches(c)),
    };
  }, [list, search]);

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const total = buckets.expired.length + buckets.soon30.length + buckets.soon60.length + buckets.soon90.length;

  const Section = ({ title, color, items }) => (
    <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: `0 0 0 4px ${color}22` }} />
        <Typography variant="subtitle2" fontWeight={800}>{title}</Typography>
        <Chip size="small" label={formatPersianNumber(items.length)} sx={{ bgcolor: `${color}22`, color, fontWeight: 700 }} />
      </Box>
      {items.length === 0 ? (
        <Typography variant="caption" color="textSecondary">موردی نیست</Typography>
      ) : (
        <Stack spacing={0.75}>
          {items.map(c => {
            const d = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
            return (
              <Paper key={c.id} variant="outlined" sx={{ p: 1.25, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', background: 'rgba(255,255,255,0.5)' }}>
                <Avatar sx={{ width: 36, height: 36, background: CONTRACT_STATUS_COLORS[c.status] || '#64748b' }}>
                  <NotificationsActiveIcon sx={{ color: '#fff', fontSize: 18 }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography variant="body2" fontWeight={800}>{c.subject}</Typography>
                  <Typography variant="caption" color="textSecondary">{c.party_name} · {c.number || '—'}</Typography>
                </Box>
                <Typography variant="caption" fontWeight={700} color="#b45309">{formatPersianNumber(c.amount || 0)} {currencyLabel(c)}</Typography>
                <Typography variant="caption" color="textSecondary">پایان: {toJalali(c.end_date)}</Typography>
                <Chip size="small" label={d < 0 ? `${formatPersianNumber(Math.abs(d))} روز گذشته` : `${formatPersianNumber(d)} روز مانده`} sx={{ bgcolor: `${color}22`, color, fontWeight: 700 }} />
                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate(`/external-contracts/${c.id}`)}>پرونده</Button>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Paper>
  );

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(239,68,68,0.12), rgba(245,158,11,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(239,68,68,0.18)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#ef4444,#f59e0b)', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
          <NotificationsActiveIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#b91c1c">قراردادهای رو به انقضا</Typography>
          <Typography variant="body2" color="textSecondary">پایش تاریخ پایان قراردادها در بازه‌های ۳۰، ۶۰ و ۹۰ روز</Typography>
        </Box>
        <Chip label={`${formatPersianNumber(total)} مورد در بازه پایش`} sx={{ fontWeight: 800, bgcolor: 'rgba(239,68,68,0.1)', color: '#b91c1c' }} />
      </Paper>

      <TextField size="small" fullWidth placeholder="جستجو (موضوع، طرف، شماره)..." value={search}
        onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

      <Section title="منقضی‌شده" color="#ef4444" items={buckets.expired} />
      <Section title="انقضا تا ۳۰ روز" color="#f97316" items={buckets.soon30} />
      <Section title="انقضا تا ۶۰ روز" color="#f59e0b" items={buckets.soon60} />
      <Section title="انقضا تا ۹۰ روز" color="#eab308" items={buckets.soon90} />
    </Box>
  );
};

export default ContractExpiringPage;
