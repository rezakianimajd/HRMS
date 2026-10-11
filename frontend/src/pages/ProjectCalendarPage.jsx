import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack, Chip, TextField,
  InputAdornment, Button, IconButton, FormControl, InputLabel, Select, MenuItem, Tooltip,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import FlagIcon from '@mui/icons-material/Flag';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import LockIcon from '@mui/icons-material/Lock';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BookIcon from '@mui/icons-material/Book';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toGregorian, getJalaliParts } from '../core/utils/dateUtils';

const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const PAD = (n) => String(n).padStart(2, '0');

// همان دسته‌بندی تقویم قراردادها + رویدادهای اختصاصی پروژه
const EVENTS = {
  project_start: { label: 'شروع پروژه', color: '#8b5cf6', icon: <PlayCircleIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  project_end: { label: 'پایان پروژه', color: '#7c3aed', icon: <FlagIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  phase_start: { label: 'شروع فاز', color: '#0ea5e9', icon: <PlayCircleIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  phase_end: { label: 'پایان فاز', color: '#0284c7', icon: <FlagIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  cost: { label: 'تراکنش هزینه', color: '#ef4444', icon: <TrendingDownIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  commitment: { label: 'تعهد هزینه', color: '#f97316', icon: <LockIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  revenue: { label: 'صورت‌وضعیت پروژه', color: '#10b981', icon: <TrendingUpIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  ledger: { label: 'سند حسابداری', color: '#0891b2', icon: <BookIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  signing: { label: 'امضای قرارداد', color: '#34d399', icon: <EditNoteIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  start: { label: 'شروع قرارداد', color: '#3b82f6', icon: <PlayCircleIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  end: { label: 'پایان قرارداد', color: '#f43f5e', icon: <FlagIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  invoice: { label: 'فاکتور', color: '#a855f7', icon: <ReceiptIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  statement: { label: 'صورت‌وضعیت قرارداد', color: '#6366f1', icon: <ReceiptLongIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  payment: { label: 'پرداخت به پیمانکار', color: '#14b8a6', icon: <PaymentsIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  addendum: { label: 'الحاقیه', color: '#ec4899', icon: <EditNoteIcon sx={{ color: '#fff', fontSize: 16 }} /> },
  guarantee: { label: 'تضمین', color: '#f59e0b', icon: <LockIcon sx={{ color: '#fff', fontSize: 16 }} /> },
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

const ProjectCalendarPage = () => {
  const navigate = useNavigate();
  const todayParts = getJalaliParts(new Date().toISOString().slice(0, 10)) || [1404, 1, 1];
  const todayJ = `${todayParts[0]}/${PAD(todayParts[1])}/${PAD(todayParts[2])}`;
  const [curYear, setCurYear] = useState(todayParts[0]);
  const [curMonth, setCurMonth] = useState(todayParts[1]);
  const [selectedJ, setSelectedJ] = useState(todayJ);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [activeKinds, setActiveKinds] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['projects-calendar'],
    queryFn: () => axiosInstance.get('/projects/calendar/').then(r => r.data),
  });

  const kindsParam = activeKinds.join(',');
  const { data: filtered } = useQuery({
    queryKey: ['projects-calendar-filtered', projectFilter, kindsParam],
    queryFn: () => axiosInstance.get('/projects/calendar/', {
      params: {
        project: projectFilter || undefined,
        kinds: kindsParam || undefined,
      },
    }).then(r => r.data),
    enabled: Boolean(projectFilter || kindsParam),
  });

  const baseEvents = (projectFilter || kindsParam) && filtered ? filtered.events || [] : data?.events || [];
  const projects = data?.projects || [];

  const visible = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return baseEvents;
    return baseEvents.filter(ev => (
      `${ev.title || ''} ${ev.subtitle || ''} ${ev.project?.code || ''} ${ev.project?.name || ''}`
        .toLowerCase().includes(q)
    ));
  }, [baseEvents, search]);

  const eventsByDate = useMemo(() => {
    const map = {};
    visible.forEach(ev => {
      const parts = getJalaliParts(ev.date) || [];
      const jy = ev.jy || parts[0];
      const jm = ev.jm || parts[1];
      const jd = ev.jd || parts[2];
      if (!jy || !jm || !jd) return;
      const key = `${jy}/${PAD(jm)}/${PAD(jd)}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [visible]);

  const monthEvents = useMemo(
    () => visible.filter(ev => Number(ev.jy) === curYear && Number(ev.jm) === curMonth),
    [visible, curYear, curMonth],
  );

  const { days, offset } = useMemo(() => jalaliMonthInfo(curYear, curMonth), [curYear, curMonth]);

  const prevMonth = () => {
    if (curMonth === 1) { setCurMonth(12); setCurYear(curYear - 1); } else setCurMonth(curMonth - 1);
  };
  const nextMonth = () => {
    if (curMonth === 12) { setCurMonth(1); setCurYear(curYear + 1); } else setCurMonth(curMonth + 1);
  };
  const goToday = () => {
    setCurYear(todayParts[0]); setCurMonth(todayParts[1]); setSelectedJ(todayJ);
  };
  const toggleKind = (kind) => setActiveKinds(prev => (
    prev.includes(kind) ? prev.filter(k => k !== kind) : [...prev, kind]
  ));

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const selectedEvents = eventsByDate[selectedJ] || [];

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Paper sx={{
        p: 2.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.12), rgba(14,165,233,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.18)', borderRadius: '12px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#8b5cf6,#0ea5e9)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
          <CalendarMonthIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#5b21b6">تقویم پروژه‌ها</Typography>
          <Typography variant="body2" color="textSecondary">
            نمای ماهانهٔ شمسی: شروع/پایان پروژه و فازها، هزینه و تعهد، صورت‌وضعیت،
            رویدادهای قراردادی و اسناد دفاتر
          </Typography>
        </Box>
        <Chip label={`${formatPersianNumber(visible.length)} رویداد`}
          sx={{ fontWeight: 800, bgcolor: 'rgba(139,92,246,0.1)', color: '#5b21b6' }} />
        <Chip label={`${formatPersianNumber(monthEvents.length)} در این ماه`}
          sx={{ fontWeight: 800, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField size="small" fullWidth placeholder="جستجو (پروژه، قرارداد، فاکتور، صورت‌وضعیت...)"
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>پروژه</InputLabel>
          <Select value={projectFilter} label="پروژه" onChange={e => setProjectFilter(e.target.value)}>
            <MenuItem value="">همهٔ پروژه‌ها</MenuItem>
            {projects.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.code} — {p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {activeKinds.length > 0 && (
          <Button size="small" variant="outlined" onClick={() => setActiveKinds([])}>
            پاک کردن فیلتر ({toPersianDigits(activeKinds.length)})
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {Object.entries(EVENTS).map(([kind, meta]) => {
          const active = activeKinds.includes(kind);
          return (
            <Chip key={kind} size="small" clickable onClick={() => toggleKind(kind)} label={meta.label}
              sx={{
                fontWeight: active ? 800 : 600,
                bgcolor: active ? `${meta.color}22` : 'rgba(255,255,255,0.6)',
                border: active ? `1px solid ${meta.color}` : '1px solid rgba(0,0,0,0.06)',
              }} />
          );
        })}
      </Stack>
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <IconButton onClick={prevMonth}><ChevronRightIcon /></IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800} color="#5b21b6">
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
                    border: isSelected ? '2px solid #8b5cf6' : '1px solid rgba(0,0,0,0.04)',
                    background: isToday ? 'rgba(139,92,246,0.12)'
                      : isSelected ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.5)',
                    transition: '0.15s ease', position: 'relative',
                    '&:hover': { background: 'rgba(139,92,246,0.08)' },
                  }}>
                    <Typography variant="caption" fontWeight={isToday ? 800 : 600}
                      color={isToday ? '#5b21b6' : 'text.primary'}>
                      {toPersianDigits(day)}
                    </Typography>
                    {evs.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mt: 0.3 }}>
                        {evs.slice(0, 4).map((ev, i) => (
                          <Tooltip key={i} title={`${(EVENTS[ev.kind] || {}).label || ev.kind} · ${ev.title || ''}`}>
                            <Box sx={{
                              width: 7, height: 7, borderRadius: '50%',
                              bgcolor: (EVENTS[ev.kind] || {}).color || '#94a3b8',
                            }} />
                          </Tooltip>
                        ))}
                        {evs.length > 4 && (
                          <Typography variant="caption" sx={{ fontSize: 8, color: 'textSecondary' }}>
                            +{toPersianDigits(evs.length - 4)}
                          </Typography>
                        )}
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
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={800} color="#5b21b6">
                {toPersianDigits(selectedJ)}
              </Typography>
              <Chip size="small" label={`${toPersianDigits(selectedEvents.length)} رویداد`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(139,92,246,0.1)', color: '#5b21b6' }} />
            </Stack>
            {selectedEvents.length === 0 ? (
              <Typography variant="body2" color="textSecondary">رویدادی در این روز ثبت نشده است</Typography>
            ) : (
              <Stack spacing={1}>
                {selectedEvents.map(ev => {
                  const meta = EVENTS[ev.kind] || { label: ev.kind, color: '#94a3b8', icon: null };
                  return (
                    <Box key={ev.id} sx={{
                      p: 1.25, borderRadius: '12px',
                      border: `1px solid ${meta.color}30`, background: `${meta.color}0e`,
                    }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: 26, height: 26, bgcolor: meta.color }}>{meta.icon}</Avatar>
                        <Chip size="small" label={meta.label}
                          sx={{ bgcolor: `${meta.color}20`, color: meta.color, height: 18, fontSize: 10 }} />
                        {ev.project?.code ? (
                          <Chip size="small" label={ev.project.code}
                            sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(139,92,246,0.12)', color: '#5b21b6' }} />
                        ) : null}
                      </Stack>
                      <Typography variant="body2" fontWeight={800} sx={{ mt: 0.5 }}>{ev.title}</Typography>
                      <Typography variant="caption" color="textSecondary">{ev.subtitle}</Typography>
                      {ev.extra && ev.extra.debit != null ? (
                        <Typography variant="caption" display="block" color="textSecondary">
                          بدهکار: {formatPersianNumber(ev.extra.debit)} · بستانکار: {formatPersianNumber(ev.extra.credit)}
                        </Typography>
                      ) : null}
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} color="#b45309">
                          {ev.amount != null ? `${formatPersianNumber(ev.amount)} ${ev.currency || ''}` : ''}
                        </Typography>
                        <Button size="small" endIcon={<ArrowForwardIcon />}
                          onClick={() => navigate(`/projects/${ev.project.id}`)}>پرونده</Button>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2, borderRadius: '16px', mb: 2, background: 'rgba(255,255,255,0.65)' }}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>
              رویدادهای {JALALI_MONTHS[curMonth - 1]}
            </Typography>
            {monthEvents.length === 0 ? (
              <Typography variant="body2" color="textSecondary">موردی در این ماه ثبت نشده است</Typography>
            ) : (
              <Stack spacing={0.75}>
                {Object.entries(EVENTS).map(([kind, meta]) => {
                  const count = monthEvents.filter(e => e.kind === kind).length;
                  if (!count) return null;
                  return (
                    <Stack key={kind} direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: meta.color }} />
                      <Typography variant="caption" sx={{ flex: 1 }}>{meta.label}</Typography>
                      <Typography variant="caption" fontWeight={800}>{toPersianDigits(count)}</Typography>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)' }}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>راهنما</Typography>
            <Stack spacing={0.75}>
              {Object.entries(EVENTS).map(([k, m]) => (
                <Stack key={k} direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: m.color }} />
                  <Typography variant="caption" color="textSecondary">{m.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>

      </Grid>

    </Box>
  );
};

export default ProjectCalendarPage;

