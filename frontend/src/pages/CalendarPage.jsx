import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Avatar, Chip, Grid, IconButton, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Tooltip,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import CakeIcon from '@mui/icons-material/Cake';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';
import { useCalendarFeed, useCreateCalendarEvent } from '../core/hooks/useLifecycle';
import { toGregorian, toJalali } from '../core/utils/dateUtils';
import { toPersianDigits } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const PAD = (n) => String(n).padStart(2, '0');

function jalaliMonthInfo(jy, jm) {
  // Find number of days in the Jalali month by advancing dd until month changes.
  let days = 0;
  for (let d = 1; d <= 31; d++) {
    const g = toGregorian(`${jy}/${PAD(jm)}/${PAD(d)}`);
    if (g && /^\d{4}-\d{2}-\d{2}$/.test(g)) {
      const back = toJalali(g);
      const parts = back.split('/').map(Number);
      if (parts[1] === jm) days = d;
      else break;
    }
  }
  if (!days) {
    // fallback: 30 days
    days = 30;
  }
  const firstGreg = toGregorian(`${jy}/${PAD(jm)}/01`);
  const jsDay = new Date(`${firstGreg}T00:00:00Z`).getUTCDay();
  const offset = (jsDay + 1) % 7; // 0 = Saturday (week start)
  return { days, offset };
}

const EVENT_META = {
  birthday: { color: '#ec4899', label: 'تولد', icon: <CakeIcon fontSize="small" /> },
  leave: { color: '#3b82f6', label: 'مرخصی', icon: <EventBusyIcon fontSize="small" /> },
  contract_end: { color: '#f59e0b', label: 'پایان قرارداد', icon: <AssignmentIcon fontSize="small" /> },
  custom: { color: '#14b8a6', label: 'رویداد', icon: <EventIcon fontSize="small" /> },
};

const CalendarPage = () => {
  const todayJ = toJalali(new Date().toISOString().slice(0, 10));
  const [curYear, setCurYear] = useState(Number(todayJ.split('/')[0]));
  const [curMonth, setCurMonth] = useState(Number(todayJ.split('/')[1]));
  const [selectedJ, setSelectedJ] = useState(todayJ);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', event_date: '', event_type: 'custom', description: '' });

  const { days, offset } = useMemo(() => jalaliMonthInfo(curYear, curMonth), [curYear, curMonth]);

  const start = toGregorian(`${curYear}/${PAD(curMonth)}/01`);
  const end = toGregorian(`${curYear}/${PAD(curMonth)}/${PAD(days)}`);

  const { data, isLoading } = useCalendarFeed({ start, end });
  const mutate = useCreateCalendarEvent();

  const eventsByDate = useMemo(() => {
    const map = {};
    (data?.events || []).forEach((ev) => {
      const j = toJalali(ev.date);
      if (!map[j]) map[j] = [];
      map[j].push(ev);
    });
    return map;
  }, [data]);

  const prevMonth = () => {
    if (curMonth === 1) { setCurMonth(12); setCurYear(curYear - 1); }
    else setCurMonth(curMonth - 1);
  };
  const nextMonth = () => {
    if (curMonth === 12) { setCurMonth(1); setCurYear(curYear + 1); }
    else setCurMonth(curMonth + 1);
  };
  const goToday = () => {
    setCurYear(Number(todayJ.split('/')[0]));
    setCurMonth(Number(todayJ.split('/')[1]));
    setSelectedJ(todayJ);
  };

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const selectedEvents = eventsByDate[selectedJ] || [];

  const saveEvent = () => {
    if (!form.title || !form.event_date) return;
    mutate.mutate(form, { onSuccess: () => { setDialogOpen(false); setForm({ title: '', event_date: '', event_type: 'custom', description: '' }); } });
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(236,72,153,0.09), rgba(99,102,241,0.04), rgba(255,255,255,0.3))',
        border: '1px solid rgba(236,72,153,0.16)', borderRadius: 3,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', boxShadow: '0 8px 24px rgba(236,72,153,0.35)' }}>
          <CalendarMonthIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#be185d">تقویم سازمانی</Typography>
          <Typography variant="body2" color="textSecondary">رویدادها، تولدها، مرخصی‌ها و پایان قراردادها — هیبریدی شمسی</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
          sx={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', borderRadius: 2, px: 2.5 }}>
          رویداد جدید
        </Button>
      </Paper>

      <Grid container spacing={2.5}>
        {/* Calendar grid */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.6)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <IconButton onClick={prevMonth}><ChevronRightIcon /></IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800} color="#be185d">
                  {JALALI_MONTHS[curMonth - 1]} {toPersianDigits(curYear)}
                </Typography>
                <Button size="small" onClick={goToday}>امروز</Button>
              </Box>
              <IconButton onClick={nextMonth}><ChevronLeftIcon /></IconButton>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
              {WEEKDAYS.map((w) => (
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
                    aspectRatio: '1/1', p: 0.5, borderRadius: 2, cursor: 'pointer',
                    border: isSelected ? '2px solid #ec4899' : '1px solid transparent',
                    background: isToday ? 'rgba(236,72,153,0.12)' : isSelected ? 'rgba(236,72,153,0.06)' : 'transparent',
                    transition: '0.15s ease', position: 'relative',
                    '&:hover': { background: 'rgba(236,72,153,0.08)' },
                  }}>
                    <Typography variant="caption" fontWeight={isToday ? 800 : 600} color={isToday ? '#be185d' : 'text.primary'}>
                      {toPersianDigits(day)}
                    </Typography>
                    {evs.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap', mt: 0.3 }}>
                        {evs.slice(0, 3).map((ev, i) => {
                          const meta = EVENT_META[ev.type] || EVENT_META.custom;
                          return <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: meta.color }} />;
                        })}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Day detail + legend */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, borderRadius: 3, mb: 2, background: 'rgba(255,255,255,0.6)' }}>
            <Typography variant="subtitle1" fontWeight={800} color="#be185d" gutterBottom>
              {selectedJ}
            </Typography>
            {isLoading ? (
              <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
            ) : selectedEvents.length === 0 ? (
              <Typography variant="body2" color="textSecondary">رویدادی در این روز ثبت نشده است</Typography>
            ) : (
              <Stack spacing={1}>
                {selectedEvents.map((ev) => {
                  const meta = EVENT_META[ev.type] || EVENT_META.custom;
                  return (
                    <Box key={ev.id} sx={{
                      p: 1.25, borderRadius: 2,
                      border: `1px solid ${meta.color}30`, background: `${meta.color}0e`,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: meta.color }}>{meta.icon}</Avatar>
                        <Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}20`, color: meta.color, height: 18, fontSize: 10 }} />
                      </Box>
                      <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>{ev.title}</Typography>
                      {ev.company && <Typography variant="caption" color="textSecondary">{ev.company}</Typography>}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>

          {/* Legend */}
          <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.6)' }}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>راهنما</Typography>
            <Stack spacing={0.75}>
              {Object.entries(EVENT_META).map(([k, m]) => (
                <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: m.color }} />
                  <Typography variant="caption" color="textSecondary">{m.label}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Add event dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#be185d' }}>ثبت رویداد تقویم</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="عنوان *" value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <JalaliDatePicker fullWidth label="تاریخ *" value={form.event_date}
            onChange={(g) => setForm((p) => ({ ...p, event_date: g }))} />
          <TextField
            select fullWidth size="small" label="نوع" SelectProps={{ native: true }}
            value={form.event_type} onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}
          >
            {Object.entries(EVENT_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </TextField>
          <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.title || !form.event_date} onClick={saveEvent}
            sx={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
            ثبت
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarPage;