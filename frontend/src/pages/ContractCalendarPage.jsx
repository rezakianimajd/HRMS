import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack, Chip, TextField,
  InputAdornment, Button, IconButton, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import FlagIcon from '@mui/icons-material/Flag';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toGregorian, getJalaliParts } from '../core/utils/dateUtils';
import { currencyLabel, CONTRACT_STATUS_COLORS } from '../core/theme/tokens';

const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const PAD = (n) => String(n).padStart(2, '0');

const EVENTS = {
  signing: { label: 'امضا', color: '#10b981', icon: <EditNoteIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  start: { label: 'شروع', color: '#3b82f6', icon: <PlayCircleIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  end: { label: 'پایان / انقضا', color: '#ef4444', icon: <FlagIcon sx={{ color: '#fff', fontSize: 16 }} /> },
};

function jalaliMonthInfo(jy, jm) {
  let days = 0;
  for (let d = 1; d <= 31; d++) {
    const g = toGregorian(`${jy}/${PAD(jm)}/${PAD(d)}`);
    if (g && /^\d{4}-\d{2}-\d{2}$/.test(g)) {
      const parts = getJalaliParts(g);
      if (parts && parts[1] === jm) days = d;
      else break;
    }
  }
  if (!days) days = 30;
  const firstGreg = toGregorian(`${jy}/${PAD(jm)}/01`);
  const jsDay = new Date(`${firstGreg}T00:00:00Z`).getUTCDay();
  const offset = (jsDay + 1) % 7;
  return { days, offset };
}

const ContractCalendarPage = () => {
  const navigate = useNavigate();
  const todayParts = getJalaliParts(new Date().toISOString().slice(0, 10)) || [1404, 1, 1];
  const todayJ = `${todayParts[0]}/${PAD(todayParts[1])}/${PAD(todayParts[2])}`;
  const [curYear, setCurYear] = useState(todayParts[0]);
  const [curMonth, setCurMonth] = useState(todayParts[1]);
  const [selectedJ, setSelectedJ] = useState(todayJ);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['ext-contracts-cal'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 1000 } }).then(r => r.data),
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
      .filter(r => type === 'all' || r.kind === type);
  }, [list, search, type]);

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      const parts = getJalaliParts(ev.date);
      if (!parts) return;
      const j = `${parts[0]}/${PAD(parts[1])}/${PAD(parts[2])}`;
      if (!map[j]) map[j] = [];
      map[j].push(ev);
    });
    return map;
  }, [events]);

  const { days, offset } = useMemo(() => jalaliMonthInfo(curYear, curMonth), [curYear, curMonth]);

  const prevMonth = () => { if (curMonth === 1) { setCurMonth(12); setCurYear(curYear - 1); } else setCurMonth(curMonth - 1); };
  const nextMonth = () => { if (curMonth === 12) { setCurMonth(1); setCurYear(curYear + 1); } else setCurMonth(curMonth + 1); };
  const goToday = () => { setCurYear(todayParts[0]); setCurMonth(todayParts[1]); setSelectedJ(todayJ); };

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const selectedEvents = eventsByDate[selectedJ] || [];

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
          <Typography variant="h6" fontWeight={800} color="#047857">تقویم قراردادها</Typography>
          <Typography variant="body2" color="textSecondary">نمای ماهانهٔ رویدادهای کلیدی (امضا، شروع، پایان) قراردادها</Typography>
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

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <IconButton onClick={prevMonth}><ChevronRightIcon /></IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800} color="#047857">
                  {JALALI_MONTHS[curMonth - 1]} {toPersianDigits(curYear)}
                </Typography>
                <Button size="small" onClick={goToday}>امروز</Button>
              </Box>
              <IconButton onClick={nextMonth}><ChevronLeftIcon /></IconButton>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
              {WEEKDAYS.map(w => (
                <Typography key={w} align="center" variant="caption" fontWeight={700} color="textSecondary" sx={{ py: 1 }}>
                  {w}
                </Typography>
              ))}
              {cells.map((day, idx) => {
                if (day === null) return <Box key={`e-${idx}`} sx={{ aspectRatio: '1/1' }} />;
                const j = `${curYear}/${PAD(curMonth)}/${PAD(day)}`;
                const evs = eventsByDate[j] || [];
                const isToday = j === todayJ;
                const isSelected = j === selectedJ;
                return (
                  <Box key={j} onClick={() => setSelectedJ(j)} sx={{
                    aspectRatio: '1/1', p: 0.5, borderRadius: '10px', cursor: 'pointer',
                    border: isSelected ? '2px solid #10b981' : '1px solid rgba(0,0,0,0.04)',
                    background: isToday ? 'rgba(16,185,129,0.12)' : isSelected ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.5)',
                    transition: '0.15s ease', position: 'relative',
                    '&:hover': { background: 'rgba(16,185,129,0.08)' },
                  }}>
                    <Typography variant="caption" fontWeight={isToday ? 800 : 600} color={isToday ? '#047857' : 'text.primary'}>
                      {toPersianDigits(day)}
                    </Typography>
                    {evs.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mt: 0.3 }}>
                        {evs.slice(0, 4).map((ev, i) => (
                          <Box key={i} sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: EVENTS[ev.kind].color }} />
                        ))}
                        {evs.length > 4 && <Typography variant="caption" sx={{ fontSize: 8, color: 'textSecondary' }}>+{toPersianDigits(evs.length - 4)}</Typography>}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, borderRadius: '16px', mb: 2, background: 'rgba(255,255,255,0.65)' }}>
            <Typography variant="subtitle1" fontWeight={800} color="#047857" gutterBottom>
              {toPersianDigits(selectedJ)}
            </Typography>
            {selectedEvents.length === 0 ? (
              <Typography variant="body2" color="textSecondary">رویدادی در این روز ثبت نشده است</Typography>
            ) : (
              <Stack spacing={1}>
                {selectedEvents.map(ev => {
                  const meta = EVENTS[ev.kind];
                  return (
                    <Box key={ev.id} sx={{ p: 1.25, borderRadius: '12px', border: `1px solid ${meta.color}30`, background: `${meta.color}0e` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 26, height: 26, bgcolor: meta.color }}>{meta.icon}</Avatar>
                        <Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}20`, color: meta.color, height: 18, fontSize: 10 }} />
                        <Chip size="small" label={ev.contract.status}
                          sx={{ bgcolor: `${CONTRACT_STATUS_COLORS[ev.contract.status] || '#64748b'}18`, color: CONTRACT_STATUS_COLORS[ev.contract.status] || '#64748b', height: 18, fontSize: 10 }} />
                      </Box>
                      <Typography variant="body2" fontWeight={800} sx={{ mt: 0.5 }}>{ev.contract.subject}</Typography>
                      <Typography variant="caption" color="textSecondary">{ev.contract.party_name} · {ev.contract.number || '—'}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} color="#b45309">{formatPersianNumber(ev.contract.amount || 0)} {currencyLabel(ev.contract)}</Typography>
                        <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate(`/external-contracts/${ev.contract.id}`)}>پرونده</Button>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)' }}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>راهنما</Typography>
            <Stack spacing={0.75}>
              {Object.entries(EVENTS).map(([k, m]) => (
                <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: m.color }} />
                  <Typography variant="caption" color="textSecondary">{m.label}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContractCalendarPage;

