import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack, Chip, TextField, InputAdornment, Button, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import FlagIcon from '@mui/icons-material/Flag';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { glassPaper, currencyLabel, CONTRACT_STATUS_COLORS } from '../core/theme/tokens';

const EVENTS = {
  signing: { label: 'امضا', color: '#10b981', icon: <EditNoteIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  start: { label: 'شروع', color: '#3b82f6', icon: <PlayCircleIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  end: { label: 'پایان / انقضا', color: '#ef4444', icon: <FlagIcon sx={{ color: '#fff', fontSize: 16 }} /> },
};

const ContractCalendarPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['ext-contracts-cal'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const events = useMemo(() => {
    const rows = [];
    const q = (search || '').trim().toLowerCase();
    list.forEach(c => {
      if (c.signing_date) rows.push({ id: `${c.id}-sign`, contract: c, date: c.signing_date, kind: 'signing' });
      if (c.start_date) rows.push({ id: `${c.id}-start`, contract: c, date: c.start_date, kind: 'start' });
      if (c.end_date) rows.push({ id: `${c.id}-end`, contract: c, date: c.end_date, kind: 'end' });
    });
    return rows
      .filter(r => !q || (r.contract.subject || '').toLowerCase().includes(q) || (r.contract.party_name || '').toLowerCase().includes(q))
      .filter(r => type === 'all' || r.kind === type)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [list, search, type]);

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(16,185,129,0.12), rgba(59,130,246,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.18)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#10b981,#3b82f6)', boxShadow: '0 8px 24px rgba(16,185,129,0.4)' }}>
          <CalendarMonthIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#047857">تقویم قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">نمای کرونولوژیک رویدادهای کلیدی (امضا، شروع، پایان) همه قراردادها</Typography>
        </Box>
        <Chip label={`${formatPersianNumber(events.length)} رویداد`} sx={{ fontWeight: 800, bgcolor: 'rgba(16,185,129,0.1)', color: '#047857' }} />
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField size="small" fullWidth placeholder="جستجو (موضوع، طرف)..." value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        <ToggleButtonGroup size="small" value={type} exclusive onChange={(e, v) => v && setType(v)}>
          <ToggleButton value="all">همه</ToggleButton>
          <ToggleButton value="signing">امضا</ToggleButton>
          <ToggleButton value="start">شروع</ToggleButton>
          <ToggleButton value="end">پایان</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {events.length === 0 ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <CalendarMonthIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="textSecondary">رویدادی ثبت نشده است.</Typography>
        </Paper>
      ) : (
        <Box sx={{ position: 'relative', '&::before': { content: '""', position: 'absolute', right: 16, top: 0, bottom: 0, width: 2, background: 'rgba(99,102,241,0.18)' } }}>
          <Stack spacing={1.5}>
            {events.map(ev => {
              const meta = EVENTS[ev.kind];
              return (
                <Box key={ev.id} sx={{ position: 'relative', pr: 5 }}>
                  <Box sx={{ position: 'absolute', right: 9, top: 14, width: 16, height: 16, borderRadius: '50%', background: meta.color, border: '3px solid #fff', boxShadow: `0 0 0 2px ${meta.color}33` }} />
                  <Paper sx={{ ...glassPaper, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Avatar sx={{ width: 38, height: 38, background: meta.color }}>{meta.icon}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 180 }}>
                      <Typography variant="body2" fontWeight={800}>{ev.contract.subject}</Typography>
                      <Typography variant="caption" color="textSecondary">{ev.contract.party_name} · {ev.contract.number || '—'}</Typography>
                    </Box>
                    <Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}22`, color: meta.color, fontWeight: 700 }} />
                    <Typography variant="caption" color="textSecondary">{toJalali(ev.date)}</Typography>
                    <Typography variant="caption" fontWeight={700} color="#b45309">{formatPersianNumber(ev.contract.amount || 0)} {currencyLabel(ev.contract)}</Typography>
                    <Chip size="small" label={ev.contract.status} sx={{ bgcolor: `${CONTRACT_STATUS_COLORS[ev.contract.status] || '#64748b'}18`, color: CONTRACT_STATUS_COLORS[ev.contract.status] || '#64748b' }} />
                    <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate(`/external-contracts/${ev.contract.id}`)}>پرونده</Button>
                  </Paper>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default ContractCalendarPage;
