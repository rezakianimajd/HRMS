import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, TextField, Tooltip,
  ToggleButton, ToggleButtonGroup, Typography, alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CakeIcon from '@mui/icons-material/Cake';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventIcon from '@mui/icons-material/Event';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useCalendarFeed, useCreateCalendarEvent } from '../core/hooks/useLifecycle';
import PageHeader from '../core/components/ui/PageHeader';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { getJalaliParts, toGregorian } from '../core/utils/dateUtils';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { KpiTile, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';

const ACCENT = '#ec4899';
const BLUE = '#2563eb';
const TEAL = '#0f766e';
const AMBER = '#b45309';
const VIOLET = '#7c3aed';
const PINK = '#be185d';

const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const PAD = (value) => String(value).padStart(2, '0');

const EVENT_META = {
  birthday: { color: ACCENT, label: 'تولد', icon: CakeIcon, module: '/employees' },
  leave: { color: BLUE, label: 'مرخصی', icon: EventBusyIcon, module: '/leaves' },
  contract_end: { color: AMBER, label: 'پایان قرارداد', icon: AssignmentIcon, module: '/employees' },
  custom: { color: TEAL, label: 'رویداد سازمانی', icon: EventIcon, module: '/calendar' },
};

const metaOf = (type) => EVENT_META[type] || EVENT_META.custom;

const localIso = (date = new Date()) => (
  `${date.getFullYear()}-${PAD(date.getMonth() + 1)}-${PAD(date.getDate())}`
);

const TODAY_ISO = localIso();
const TODAY_PARTS = getJalaliParts(TODAY_ISO) || [1404, 1, 1];
const TODAY_J = `${TODAY_PARTS[0]}/${PAD(TODAY_PARTS[1])}/${PAD(TODAY_PARTS[2])}`;

const addDaysIso = (iso, amount) => {
  const base = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(base.getTime())) return iso;
  base.setDate(base.getDate() + amount);
  return localIso(base);
};

const dayKey = (gregorian) => {
  const parts = getJalaliParts(String(gregorian || '').slice(0, 10));
  if (!parts) return null;
  return `${parts[0]}/${PAD(parts[1])}/${PAD(parts[2])}`;
};

const keyParts = (key) => {
  const [year, month, day] = String(key || '').split('/').map(Number);
  return { year, month, day };
};

const jalaliMonthInfo = (jy, jm) => {
  let days = 0;
  for (let d = 1; d <= 31; d += 1) {
    const gregorian = toGregorian(`${jy}/${PAD(jm)}/${PAD(d)}`);
    if (gregorian && /^\d{4}-\d{2}-\d{2}$/.test(gregorian)) {
      const parts = getJalaliParts(gregorian);
      if (parts && parts[1] === jm) days = d;
      else break;
    }
  }
  if (!days) days = 30;
  const firstGregorian = toGregorian(`${jy}/${PAD(jm)}/01`);
  const jsDay = new Date(`${firstGregorian}T00:00:00Z`).getUTCDay();
  const offset = (jsDay + 1) % 7;
  return { days, offset };
};

const normalizeText = (value) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/-/g, '/')
  .trim()
  .toLowerCase();

/** جست‌وجوی هوشمند تاریخ: ۱۴۰۴/۰۵/۱۲ یا ۱۴۰۴/۰۵ یا ۱۴۰۴ */
const parseDateQuery = (raw) => {
  const text = normalizeText(raw);
  const full = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (full) {
    const [, year, month, day] = full;
    return { key: `${year}/${PAD(Number(month))}/${PAD(Number(day))}`, year: Number(year), month: Number(month), day: Number(day) };
  }
  const monthMatch = /^(\d{4})\/(\d{1,2})$/.exec(text);
  if (monthMatch) {
    const [, year, month] = monthMatch;
    if (Number(month) >= 1 && Number(month) <= 12) {
      return { key: null, year: Number(year), month: Number(month) };
    }
  }
  const yearMatch = /^(\d{4})$/.exec(text);
  if (yearMatch) return { key: null, year: Number(yearMatch[1]), month: null };
  return null;
};

const eventHaystack = (event) => normalizeText([
  event.title, event.company, event.description, metaOf(event.type).label, event.j,
].filter(Boolean).join(' '));


const EventPill = ({ event, onOpen, dense = false }) => {
  const meta = metaOf(event.type);
  const Icon = meta.icon;
  return (
    <ButtonBase
      onClick={(clickEvent) => { clickEvent.stopPropagation(); onOpen(event); }}
      sx={{
        width: '100%', justifyContent: 'flex-start', gap: 0.4, px: 0.5, py: dense ? 0.15 : 0.25,
        borderRadius: '7px', bgcolor: alpha(meta.color, 0.1), border: `1px solid ${alpha(meta.color, 0.16)}`,
        textAlign: 'right', '&:hover': { bgcolor: alpha(meta.color, 0.16) },
      }}
    >
      <Icon sx={{ fontSize: dense ? 11 : 12, color: meta.color, flexShrink: 0 }} />
      <Typography noWrap sx={{ fontSize: dense ? 9.5 : 10.5, fontWeight: 700, color: meta.color, flex: 1, minWidth: 0 }}>
        {event.title}
      </Typography>
    </ButtonBase>
  );
};

const MonthView = ({ year, month, eventsByDate, selectedJ, onSelect, onOpen }) => {
  const { days, offset } = useMemo(() => jalaliMonthInfo(year, month), [year, month]);
  const cells = [];
  for (let index = 0; index < offset; index += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) cells.push(day);

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5, mb: 0.5 }}>
        {WEEKDAYS.map((weekday) => (
          <Typography key={weekday} align="center" sx={{ fontSize: 11, fontWeight: 800, color: MUTED, py: 0.5 }}>
            {weekday}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
        {cells.map((day, index) => {
          if (day === null) return <Box key={`empty-${index}`} sx={{ minHeight: 88 }} />;
          const key = `${year}/${PAD(month)}/${PAD(day)}`;
          const events = eventsByDate[key] || [];
          const isToday = key === TODAY_J;
          const isSelected = key === selectedJ;
          return (
            <Box
              key={key}
              onClick={() => onSelect(key)}
              sx={{
                minHeight: 88, p: 0.5, borderRadius: '10px', cursor: 'pointer',
                border: `1px solid ${isSelected ? alpha(ACCENT, 0.55) : '#eef2f7'}`,
                bgcolor: isToday ? alpha(ACCENT, 0.07) : isSelected ? alpha(VIOLET, 0.05) : '#fff',
                transition: 'background-color .15s ease, border-color .15s ease',
                display: 'flex', flexDirection: 'column', gap: 0.25,
                '&:hover': { borderColor: alpha(ACCENT, 0.35), bgcolor: alpha(ACCENT, 0.04) },
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontSize: 11, fontWeight: isToday ? 900 : 700, color: isToday ? PINK : INK }}>
                  {toPersianDigits(day)}
                </Typography>
                {events.length ? (
                  <Chip size="small" label={toPersianDigits(events.length)}
                    sx={{ height: 15, fontSize: 9, fontWeight: 800, bgcolor: alpha(ACCENT, 0.1), color: ACCENT }} />
                ) : null}
              </Stack>
              {events.slice(0, 2).map((event) => (
                <EventPill key={event.id} event={event} onOpen={onOpen} dense />
              ))}
              {events.length > 2 ? (
                <Typography sx={{ fontSize: 9, color: MUTED, mt: 'auto' }}>
                  +{toPersianDigits(events.length - 2)} رویداد دیگر
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};


const WeekView = ({ weekDays, eventsByDate, selectedJ, onSelect, onOpen }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.6 }}>
    {weekDays.map(({ key, day, weekday, isToday }) => {
      const events = eventsByDate[key] || [];
      const isSelected = key === selectedJ;
      return (
        <Box
          key={key}
          onClick={() => onSelect(key)}
          sx={{
            minHeight: 180, p: 0.6, borderRadius: '12px', cursor: 'pointer',
            border: `1px solid ${isSelected ? alpha(ACCENT, 0.5) : '#eef2f7'}`,
            bgcolor: isToday ? alpha(ACCENT, 0.06) : '#fff',
            '&:hover': { borderColor: alpha(ACCENT, 0.32) },
          }}
        >
          <Typography align="center" sx={{ fontSize: 10.5, fontWeight: 800, color: MUTED }}>{weekday}</Typography>
          <Typography align="center" sx={{ fontSize: 13, fontWeight: isToday ? 900 : 700, color: isToday ? PINK : INK, mb: 0.4 }}>
            {toPersianDigits(day)}
          </Typography>
          <Stack spacing={0.3}>
            {events.slice(0, 5).map((event) => (
              <EventPill key={event.id} event={event} onOpen={onOpen} dense />
            ))}
            {events.length > 5 ? (
              <Typography sx={{ fontSize: 9, color: MUTED }}>+{toPersianDigits(events.length - 5)}</Typography>
            ) : null}
          </Stack>
        </Box>
      );
    })}
  </Box>
);

const AgendaView = ({ events, onOpen }) => {
  const grouped = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      if (!map.has(event.j)) map.set(event.j, []);
      map.get(event.j).push(event);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  if (!grouped.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center', borderRadius: '12px', bgcolor: SOFT_BG }}>
        <CalendarMonthIcon sx={{ fontSize: 30, color: '#cbd5e1', mb: 0.5 }} />
        <Typography sx={{ fontSize: 12, color: MUTED }}>رویدادی با این مشخصات پیدا نشد.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1}>
      {grouped.map(([key, dayEvents]) => (
        <Paper key={key} variant="outlined" sx={{ p: 0.9, borderRadius: '12px', borderColor: '#eef2f7' }}>
          <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.5 }}>
            <Chip size="small" label={toPersianDigits(key)}
              sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(VIOLET, 0.08), color: VIOLET }} />
            <Typography sx={{ fontSize: 10.5, color: MUTED }}>{toPersianDigits(dayEvents.length)} رویداد</Typography>
          </Stack>
          <Grid container spacing={0.5}>
            {dayEvents.map((event) => {
              const meta = metaOf(event.type);
              const Icon = meta.icon;
              return (
                <Grid item xs={12} sm={6} md={4} key={event.id}>
                  <ButtonBase
                    onClick={() => onOpen(event)}
                    sx={{
                      width: '100%', justifyContent: 'flex-start', gap: 0.6, p: 0.6, borderRadius: '9px',
                      border: `1px solid ${alpha(meta.color, 0.18)}`, bgcolor: alpha(meta.color, 0.045),
                      textAlign: 'right', '&:hover': { bgcolor: alpha(meta.color, 0.09) },
                    }}
                  >
                    <Box sx={{
                      width: 24, height: 24, borderRadius: '7px', flexShrink: 0,
                      bgcolor: alpha(meta.color, 0.12), color: meta.color,
                      display: 'grid', placeItems: 'center',
                    }}>
                      <Icon sx={{ fontSize: 13 }} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: INK }}>{event.title}</Typography>
                      <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
                        {meta.label}{event.company ? ` · ${event.company}` : ''}
                      </Typography>
                    </Box>
                  </ButtonBase>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      ))}
    </Stack>
  );
};


const EMPTY_FORM = { title: '', event_date: '', event_type: 'custom', description: '' };

const CalendarPage = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = parseDateQuery(searchParams.get('date'))?.key || TODAY_J;
  const [initialYear, initialMonth] = initialDate.split('/').map(Number);
  const initialView = ['month', 'week', 'agenda'].includes(searchParams.get('view')) ? searchParams.get('view') : 'month';

  const [curYear, setCurYear] = useState(initialYear);
  const [curMonth, setCurMonth] = useState(initialMonth);
  const [selectedJ, setSelectedJ] = useState(initialDate);
  const [view, setView] = useState(initialView);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState([]);
  const [scopeFilter, setScopeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const monthStartIso = toGregorian(`${curYear}/${PAD(curMonth)}/01`);
  const monthDays = useMemo(() => jalaliMonthInfo(curYear, curMonth).days, [curYear, curMonth]);
  const monthEndIso = toGregorian(`${curYear}/${PAD(curMonth)}/${PAD(monthDays)}`);

  // بازهٔ دریافت داده: ماه جاری + ۳۰ روز آینده + ۴۵ روز گذشته (برای نمای هفته و «پیش‌رو»)
  const feedStart = [monthStartIso, addDaysIso(TODAY_ISO, -45)].filter(Boolean).sort()[0];
  const feedEnd = [monthEndIso, addDaysIso(TODAY_ISO, 75)].filter(Boolean).sort().slice(-1)[0];

  const { data, isLoading, isFetching, refetch } = useCalendarFeed({ start: feedStart, end: feedEnd });
  const createEvent = useCreateCalendarEvent();

  const events = useMemo(() => (data?.events || [])
    .map((event) => {
      const key = dayKey(event.date);
      if (!key) return null;
      const parts = keyParts(key);
      return {
        ...event,
        j: key,
        year: parts.year,
        month: parts.month,
        day: parts.day,
        date: String(event.date).slice(0, 10),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.title).localeCompare(String(b.title), 'fa')),
  [data]);

  const textQuery = normalizeText(search);
  const dateQuery = parseDateQuery(search);
  const searchActive = Boolean(textQuery);

  const filteredEvents = useMemo(() => events.filter((event) => {
    if (kindFilter.length && !kindFilter.includes(event.type)) return false;
    if (scopeFilter === 'upcoming' && event.date < TODAY_ISO) return false;
    if (scopeFilter === 'past' && event.date >= TODAY_ISO) return false;
    if (dateQuery?.key && event.j !== dateQuery.key) return false;
    if (!dateQuery?.key && dateQuery?.year && event.year !== dateQuery.year) return false;
    if (!dateQuery?.key && dateQuery?.month && event.month !== dateQuery.month) return false;
    if (textQuery && !dateQuery && !eventHaystack(event).includes(textQuery)) return false;
    return true;
  }), [events, kindFilter, scopeFilter, dateQuery, textQuery]);

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach((event) => {
      if (!map[event.j]) map[event.j] = [];
      map[event.j].push(event);
    });
    return map;
  }, [filteredEvents]);

  const monthEvents = useMemo(
    () => filteredEvents.filter((event) => event.year === curYear && event.month === curMonth),
    [filteredEvents, curYear, curMonth],
  );

  const selectedEvents = eventsByDate[selectedJ] || [];

  const upcomingAll = useMemo(
    () => filteredEvents.filter((event) => event.date >= TODAY_ISO),
    [filteredEvents],
  );

  const upcomingEvents = useMemo(() => upcomingAll.slice(0, 6), [upcomingAll]);

  const kindCounts = useMemo(() => events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {}), [events]);

  const monthKindCounts = useMemo(() => monthEvents.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {}), [monthEvents]);


  const weekDays = useMemo(() => {
    const iso = toGregorian(selectedJ);
    const base = new Date(`${iso}T00:00:00`);
    const jsDay = base.getDay();
    const offsetFromSaturday = (jsDay + 1) % 7;
    const startIso = addDaysIso(iso, -offsetFromSaturday);
    return Array.from({ length: 7 }).map((_unused, index) => {
      const dayIso = addDaysIso(startIso, index);
      const parts = getJalaliParts(dayIso);
      const key = parts ? `${parts[0]}/${PAD(parts[1])}/${PAD(parts[2])}` : '';
      return {
        key,
        day: parts ? parts[2] : 0,
        weekday: WEEKDAYS[index],
        isToday: dayIso === TODAY_ISO,
      };
    });
  }, [selectedJ]);

  const searchResults = searchActive ? filteredEvents.slice(0, 8) : [];
  const filtersActive = Boolean(searchActive || kindFilter.length || scopeFilter !== 'all');
  const periodTitle = `${MONTHS[curMonth - 1]} ${toPersianDigits(curYear)}`;

  const shiftMonth = (direction) => {
    if (direction < 0) {
      if (curMonth === 1) { setCurMonth(12); setCurYear(curYear - 1); } else setCurMonth(curMonth - 1);
    } else if (curMonth === 12) { setCurMonth(1); setCurYear(curYear + 1); } else setCurMonth(curMonth + 1);
  };

  const shiftWeek = (direction) => {
    const iso = toGregorian(selectedJ);
    const next = addDaysIso(iso, direction * 7);
    const parts = getJalaliParts(next);
    if (!parts) return;
    setSelectedJ(`${parts[0]}/${PAD(parts[1])}/${PAD(parts[2])}`);
    setCurYear(parts[0]);
    setCurMonth(parts[1]);
  };

  const goToday = () => {
    setCurYear(TODAY_PARTS[0]);
    setCurMonth(TODAY_PARTS[1]);
    setSelectedJ(TODAY_J);
  };

  const syncParams = (nextDate, nextView) => {
    const next = new URLSearchParams(searchParams);
    if (nextDate) next.set('date', String(nextDate).replace(/\//g, '-'));
    if (nextView) next.set('view', nextView);
    setSearchParams(next, { replace: true });
  };

  const handleViewChange = (nextView) => {
    if (!nextView) return;
    setView(nextView);
    syncParams(selectedJ, nextView);
  };

  const handleSelectDay = (key) => {
    setSelectedJ(key);
    const parts = keyParts(key);
    if (parts.year && parts.month) { setCurYear(parts.year); setCurMonth(parts.month); }
  };

  const openEvent = (event) => setSelectedEvent(event);

  // جست‌وجوی هوشمند: با ورود تاریخ/ماه/سال شمسی، تقویم هم به همان دوره می‌رود.
  const handleSearchChange = (value) => {
    setSearch(value);
    const parsed = parseDateQuery(value);
    if (parsed?.key) {
      handleSelectDay(parsed.key);
      return;
    }
    if (parsed?.year) setCurYear(parsed.year);
    if (parsed?.month) setCurMonth(parsed.month);
  };

  const toggleKind = (type) => setKindFilter((previous) => (
    previous.includes(type) ? previous.filter((item) => item !== type) : [...previous, type]
  ));

  const resetFilters = () => {
    setSearch('');
    setKindFilter([]);
    setScopeFilter('all');
  };

  const exportCsv = () => {
    const headers = ['تاریخ شمسی', 'تاریخ میلادی', 'نوع رویداد', 'عنوان', 'واحد / پرسنل', 'توضیحات'];
    const body = filteredEvents.map((event) => [
      event.j,
      event.date,
      metaOf(event.type).label,
      event.title || '',
      event.company || '',
      event.description || '',
    ]);
    const csv = [headers, ...body]
      .map((cells) => cells.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hr-calendar-${curYear}-${PAD(curMonth)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const openCreate = (dateKey = selectedJ) => {
    setForm({ ...EMPTY_FORM, event_date: toGregorian(dateKey) || '' });
    setError('');
    setDialogOpen(true);
  };

  const saveEvent = () => {
    if (!String(form.title || '').trim()) { setError('عنوان رویداد را وارد کنید.'); return; }
    if (!form.event_date) { setError('تاریخ رویداد را انتخاب کنید.'); return; }
    setError('');
    const payload = { ...form, title: String(form.title).trim() };
    createEvent.mutate(payload, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm(EMPTY_FORM);
        const key = dayKey(payload.event_date);
        if (key) handleSelectDay(key);
      },
      onError: () => setError('ثبت رویداد انجام نشد.'),
    });
  };


  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<CalendarMonthIcon />}
        color={ACCENT}
        title="تقویم سازمانی"
        subtitle="رویدادهای سازمانی، تولدها، مرخصی‌ها و پایان قراردادها در یک نگاه"
        badge={(
          <Chip size="small" label={`${formatPersianNumber(monthEvents.length)} رویداد در ${periodTitle}`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: PINK }} />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" onClick={() => refetch()} disabled={isFetching} sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<CalendarTodayIcon />} onClick={goToday}>امروز</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>چاپ</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate()}>رویداد جدید</Button>
          </>
        )}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={CalendarMonthIcon} label={filtersActive ? 'رویدادهای فیلترشده' : 'کل رویدادها'}
            value={formatPersianNumber(filteredEvents.length)} suffix="رویداد" color={BLUE} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={CalendarTodayIcon} label="رویدادهای این ماه"
            value={formatPersianNumber(monthEvents.length)} suffix="رویداد" color={TEAL} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={ScheduleIcon} label="رویدادهای پیش‌رو"
            value={formatPersianNumber(upcomingAll.length)} suffix="رویداد" color={AMBER}
            onClick={() => setScopeFilter(scopeFilter === 'upcoming' ? 'all' : 'upcoming')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={EventIcon} label="رویدادهای سازمانی"
            value={formatPersianNumber(kindCounts.custom || 0)} suffix="رویداد" color={VIOLET} />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{
        p: 1.25, mb: 1.5, borderRadius: '16px',
        border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <Stack spacing={0.8}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} useFlexGap alignItems={{ lg: 'center' }}>
            <TextField
              size="small"
              placeholder="جست‌وجو: عنوان، واحد، نوع رویداد یا تاریخ ۱۴۰۴/۰۵/۱۲…"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchResults[0]) openEvent(searchResults[0]);
                if (event.key === 'Escape') setSearch('');
              }}
              sx={{ flex: 1, minWidth: { xs: '100%', lg: 280 } }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} aria-label="پاک کردن جست‌وجو">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', lg: 150 } }}>
              <InputLabel>بازه زمانی</InputLabel>
              <Select value={scopeFilter} label="بازه زمانی" onChange={(event) => setScopeFilter(event.target.value)}>
                <MenuItem value="all">همه</MenuItem>
                <MenuItem value="upcoming">پیش‌رو</MenuItem>
                <MenuItem value="past">گذشته</MenuItem>
              </Select>
            </FormControl>
            <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => handleViewChange(value)}>
              <ToggleButton value="month" sx={{ px: 1.2, fontSize: 11.5 }}>ماه</ToggleButton>
              <ToggleButton value="week" sx={{ px: 1.2, fontSize: 11.5 }}>هفته</ToggleButton>
              <ToggleButton value="agenda" sx={{ px: 1.2, fontSize: 11.5 }}>فهرست</ToggleButton>
            </ToggleButtonGroup>
            {filtersActive ? (
              <Button size="small" onClick={resetFilters} sx={{ fontSize: 11.5 }}>بازنشانی</Button>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" alignItems="center">
            {Object.entries(EVENT_META).map(([type, meta]) => {
              const active = kindFilter.includes(type);
              const count = monthKindCounts[type] || 0;
              return (
                <Chip
                  key={type}
                  size="small"
                  clickable
                  onClick={() => toggleKind(type)}
                  label={`${meta.label} (${formatPersianNumber(count)})`}
                  sx={{
                    height: 22, fontSize: 10.5, fontWeight: 800,
                    bgcolor: active ? alpha(meta.color, 0.16) : alpha(meta.color, 0.06),
                    color: meta.color,
                    border: `1px solid ${active ? alpha(meta.color, 0.45) : 'transparent'}`,
                  }}
                />
              );
            })}
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: 10.5, color: MUTED }}>
              جست‌وجو روی عنوان، واحد، نوع رویداد و تاریخ شمسی
            </Typography>
          </Stack>
        </Stack>
      </Paper>


      {searchActive ? (
        <Paper elevation={0} sx={{ p: 1, mb: 1.5, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.6 }}>
            <SearchIcon sx={{ fontSize: 16, color: BLUE }} />
            <Typography sx={{ flex: 1, fontSize: 11.5, fontWeight: 800, color: INK }}>
              {formatPersianNumber(filteredEvents.length)} نتیجه برای «{search}»
            </Typography>
            <Button size="small" onClick={() => setSearch('')} sx={{ fontSize: 11 }}>پاک کردن</Button>
          </Stack>
          {searchResults.length ? (
            <Grid container spacing={0.5}>
              {searchResults.map((event) => {
                const meta = metaOf(event.type);
                const Icon = meta.icon;
                return (
                  <Grid item xs={12} sm={6} md={4} key={`search-${event.id}`}>
                    <ButtonBase
                      onClick={() => openEvent(event)}
                      sx={{
                        width: '100%', justifyContent: 'flex-start', gap: 0.6, p: 0.6, borderRadius: '9px',
                        border: `1px solid ${alpha(meta.color, 0.18)}`, bgcolor: alpha(meta.color, 0.04),
                        textAlign: 'right',
                      }}
                    >
                      <Icon sx={{ fontSize: 15, color: meta.color }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: INK }}>{event.title}</Typography>
                        <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
                          {toPersianDigits(event.j)} · {meta.label}
                        </Typography>
                      </Box>
                    </ButtonBase>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Typography sx={{ fontSize: 11, color: MUTED, py: 0.5 }}>نتیجه‌ای یافت نشد.</Typography>
          )}
        </Paper>
      ) : null}


      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={8}>
          <SurfaceCard
            title={periodTitle}
            icon={CalendarMonthIcon}
            color={BLUE}
            action={(
              <Stack direction="row" spacing={0.15} alignItems="center">
                <Tooltip title={view === 'week' ? 'هفته قبل' : 'ماه قبل'}>
                  <IconButton size="small" onClick={() => (view === 'week' ? shiftWeek(-1) : shiftMonth(-1))}>
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button size="small" onClick={goToday} sx={{ minWidth: 0, px: 0.8, fontSize: 12 }}>امروز</Button>
                <Tooltip title={view === 'week' ? 'هفته بعد' : 'ماه بعد'}>
                  <IconButton size="small" onClick={() => (view === 'week' ? shiftWeek(1) : shiftMonth(1))}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} alignItems={{ sm: 'center' }} sx={{ mb: 1.2 }}>
              <FormControl size="small" sx={{ minWidth: 115 }}>
                <InputLabel>ماه</InputLabel>
                <Select value={curMonth} label="ماه" onChange={(event) => setCurMonth(Number(event.target.value))}>
                  {MONTHS.map((month, index) => <MenuItem key={month} value={index + 1}>{month}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>سال</InputLabel>
                <Select value={curYear} label="سال" onChange={(event) => setCurYear(Number(event.target.value))}>
                  {[curYear - 2, curYear - 1, curYear, curYear + 1, curYear + 2].map((year) => (
                    <MenuItem key={year} value={year}>{toPersianDigits(year)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Chip size="small" label={`${formatPersianNumber(monthEvents.length)} رویداد این ماه`}
                sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: alpha(BLUE, 0.08), color: BLUE }} />
              {isFetching ? <CircularProgress size={14} /> : null}
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: 11, color: MUTED }}>
                {view === 'month' ? 'نمای ماهانه' : view === 'week' ? 'نمای هفتگی' : 'فهرست رویدادها'}
              </Typography>
            </Stack>

            {isLoading ? (
              <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={26} sx={{ color: ACCENT }} /></Box>
            ) : view === 'month' ? (
              <MonthView year={curYear} month={curMonth} eventsByDate={eventsByDate}
                selectedJ={selectedJ} onSelect={handleSelectDay} onOpen={openEvent} />
            ) : view === 'week' ? (
              <WeekView weekDays={weekDays} eventsByDate={eventsByDate} selectedJ={selectedJ}
                onSelect={handleSelectDay} onOpen={openEvent} />
            ) : (
              <AgendaView events={filtersActive ? filteredEvents : monthEvents} onOpen={openEvent} />
            )}
          </SurfaceCard>
        </Grid>


        <Grid item xs={12} lg={4}>
          <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
            <SurfaceCard title={`روز ${toPersianDigits(selectedJ)}`} icon={CalendarTodayIcon} color={ACCENT}
              action={(
                <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={() => openCreate()}
                  sx={{ fontSize: 11 }}>رویداد</Button>
              )}
            >
              {selectedEvents.length === 0 ? (
                <Box sx={{ py: 1.5, px: 1, borderRadius: '10px', bgcolor: SOFT_BG, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 11.5, color: MUTED }}>رویدادی برای این روز ثبت نشده است.</Typography>
                </Box>
              ) : (
                <Stack spacing={0.6}>
                  {selectedEvents.map((event) => {
                    const meta = metaOf(event.type);
                    const Icon = meta.icon;
                    return (
                      <ButtonBase
                        key={event.id}
                        onClick={() => openEvent(event)}
                        sx={{
                          width: '100%', justifyContent: 'flex-start', gap: 0.7, p: 0.7, borderRadius: '10px',
                          border: `1px solid ${alpha(meta.color, 0.2)}`, bgcolor: alpha(meta.color, 0.05), textAlign: 'right',
                        }}
                      >
                        <Box sx={{
                          width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                          bgcolor: alpha(meta.color, 0.14), color: meta.color, display: 'grid', placeItems: 'center',
                        }}>
                          <Icon sx={{ fontSize: 14 }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>{event.title}</Typography>
                          <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
                            {meta.label}{event.company ? ` · ${event.company}` : ''}
                          </Typography>
                        </Box>
                      </ButtonBase>
                    );
                  })}
                </Stack>
              )}
            </SurfaceCard>

            <SurfaceCard title="رویدادهای پیش‌رو" icon={ScheduleIcon} color={AMBER}>
              {upcomingEvents.length === 0 ? (
                <Typography sx={{ fontSize: 11.5, color: MUTED }}>رویداد آینده‌ای در بازهٔ جاری وجود ندارد.</Typography>
              ) : (
                <Stack spacing={0.5}>
                  {upcomingEvents.map((event) => {
                    const meta = metaOf(event.type);
                    const Icon = meta.icon;
                    return (
                      <ButtonBase
                        key={`up-${event.id}`}
                        onClick={() => openEvent(event)}
                        sx={{
                          width: '100%', justifyContent: 'flex-start', gap: 0.6, p: 0.55, borderRadius: '9px',
                          '&:hover': { bgcolor: SOFT_BG }, textAlign: 'right',
                        }}
                      >
                        <Icon sx={{ fontSize: 14, color: meta.color }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: INK }}>{event.title}</Typography>
                          <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>{toPersianDigits(event.j)}</Typography>
                        </Box>
                        <Chip size="small" label={meta.label}
                          sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: alpha(meta.color, 0.1), color: meta.color }} />
                      </ButtonBase>
                    );
                  })}
                </Stack>
              )}
            </SurfaceCard>


            <SurfaceCard title="فیلتر انواع رویداد" icon={EventIcon} color={VIOLET}
              action={kindFilter.length ? (
                <Button size="small" onClick={() => setKindFilter([])} sx={{ fontSize: 11 }}>همه</Button>
              ) : null}
            >
              <Stack spacing={0.4}>
                {Object.entries(EVENT_META).map(([type, meta]) => {
                  const Icon = meta.icon;
                  const active = kindFilter.includes(type);
                  const total = kindCounts[type] || 0;
                  const inMonth = monthKindCounts[type] || 0;
                  const share = monthEvents.length ? Math.round((inMonth / monthEvents.length) * 100) : 0;
                  return (
                    <ButtonBase
                      key={`filter-${type}`}
                      onClick={() => toggleKind(type)}
                      sx={{
                        width: '100%', display: 'block', p: 0.6, borderRadius: '9px', textAlign: 'right',
                        border: `1px solid ${active ? alpha(meta.color, 0.4) : 'transparent'}`,
                        bgcolor: active ? alpha(meta.color, 0.07) : 'transparent',
                        '&:hover': { bgcolor: alpha(meta.color, 0.05) },
                      }}
                    >
                      <Stack direction="row" spacing={0.6} alignItems="center">
                        <Icon sx={{ fontSize: 14, color: meta.color }} />
                        <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 700, color: INK }}>{meta.label}</Typography>
                        <Typography sx={{ fontSize: 10, color: MUTED }}>{formatPersianNumber(total)}</Typography>
                      </Stack>
                      <Box sx={{ mt: 0.4, height: 4, borderRadius: 2, bgcolor: alpha(meta.color, 0.1), overflow: 'hidden' }}>
                        <Box sx={{ width: `${share}%`, height: '100%', bgcolor: meta.color, borderRadius: 2 }} />
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Stack>
              <Divider sx={{ my: 0.8 }} />
              <Typography sx={{ fontSize: 10, color: MUTED, lineHeight: 1.7 }}>
                تولدها، مرخصی‌های تأییدشده و پایان قراردادها به‌صورت خودکار از پرسنل و مرخصی‌ها خوانده می‌شوند.
              </Typography>
            </SurfaceCard>
          </Stack>
        </Grid>
      </Grid>


      <Drawer anchor="left" open={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 380 }, p: 0 } }}>
        {selectedEvent ? (() => {
          const meta = metaOf(selectedEvent.type);
          const Icon = meta.icon;
          return (
            <Box sx={{ p: 1.6 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Box sx={{
                  width: 34, height: 34, borderRadius: '10px', bgcolor: alpha(meta.color, 0.12),
                  color: meta.color, display: 'grid', placeItems: 'center',
                }}>
                  <Icon sx={{ fontSize: 18 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK }} noWrap>{selectedEvent.title}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: MUTED }}>{meta.label}</Typography>
                </Box>
                <IconButton size="small" onClick={() => setSelectedEvent(null)} aria-label="بستن">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <Stack spacing={0.7}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: 11, color: MUTED }}>تاریخ شمسی</Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>{toPersianDigits(selectedEvent.j)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: 11, color: MUTED }}>تاریخ میلادی</Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: INK, direction: 'ltr' }}>{selectedEvent.date}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontSize: 11, color: MUTED }}>روز هفته</Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: INK }}>
                    {WEEKDAYS[(new Date(`${selectedEvent.date}T00:00:00`).getDay() + 1) % 7]}
                  </Typography>
                </Stack>
                {selectedEvent.company ? (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: 11, color: MUTED }}>واحد / پرسنل</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: INK }}>{selectedEvent.company}</Typography>
                  </Stack>
                ) : null}
                {selectedEvent.description ? (
                  <Box sx={{ p: 0.9, borderRadius: '10px', bgcolor: SOFT_BG, mt: 0.4 }}>
                    <Typography sx={{ fontSize: 10.5, color: MUTED, mb: 0.3 }}>توضیحات</Typography>
                    <Typography sx={{ fontSize: 11, color: INK, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                      {selectedEvent.description}
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
              <Stack spacing={0.7} sx={{ mt: 1.4 }}>
                <Button fullWidth variant="outlined" size="small"
                  onClick={() => { setSelectedEvent(null); openCreate(selectedEvent.j); }}>
                  افزودن رویداد در همین روز
                </Button>
                <Typography sx={{ fontSize: 10, color: MUTED }}>
                  این رویداد از منبع «{meta.label}» خوانده شده و در ماژول مرتبط قابل پیگیری است.
                </Typography>
              </Stack>
            </Box>
          );
        })() : null}
      </Drawer>


      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 900, color: PINK, pb: 0.5 }}>
          ثبت رویداد تقویم سازمانی
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.4, mt: 0.6 }}>
          {error ? <Alert severity="error" sx={{ fontSize: 11.5, py: 0.2 }}>{error}</Alert> : null}
          <TextField fullWidth size="small" label="عنوان رویداد *" value={form.title}
            onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} />
          <JalaliDatePicker fullWidth label="تاریخ *" value={form.event_date}
            onChange={(gregorian) => setForm((previous) => ({ ...previous, event_date: gregorian }))} />
          <TextField
            select fullWidth size="small" label="نوع رویداد" SelectProps={{ native: true }}
            value={form.event_type}
            onChange={(event) => setForm((previous) => ({ ...previous, event_type: event.target.value }))}
          >
            {Object.entries(EVENT_META).map(([type, meta]) => (
              <option key={type} value={type}>{meta.label}</option>
            ))}
          </TextField>
          <TextField fullWidth size="small" label="توضیحات" multiline rows={3} value={form.description}
            onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} />
          <Typography sx={{ fontSize: 10, color: MUTED }}>
            تاریخ انتخابی شمسی نمایش داده می‌شود و به‌صورت میلادی برای سرور ارسال می‌گردد.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.4 }}>
          <Button onClick={() => setDialogOpen(false)} size="small">انصراف</Button>
          <Button
            variant="contained" size="small" onClick={saveEvent}
            disabled={createEvent.isPending || !form.title || !form.event_date}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: PINK }, fontWeight: 800, fontSize: 11.5 }}
          >
            {createEvent.isPending ? 'در حال ثبت…' : 'ثبت رویداد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarPage;
