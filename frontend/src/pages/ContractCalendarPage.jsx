import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Button, ButtonBase, Chip, CircularProgress, Divider, Drawer,
  FormControl, Grid, IconButton, InputAdornment, InputLabel, MenuItem, Paper,
  Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import EditNoteIcon from '@mui/icons-material/EditNote';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import FilterListIcon from '@mui/icons-material/FilterList';
import FlagIcon from '@mui/icons-material/Flag';
import GavelIcon from '@mui/icons-material/Gavel';
import LockIcon from '@mui/icons-material/Lock';
import PaymentsIcon from '@mui/icons-material/Payments';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../core/utils/numberUtils';
import { toGregorian, toJalali, getJalaliParts } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { KpiTile, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';


const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const PAD = (value) => String(value).padStart(2, '0');

const EVENT_TYPES = {
  signing: { label: 'امضا', color: '#0f766e', icon: EditNoteIcon },
  start: { label: 'شروع', color: '#2563eb', icon: PlayCircleIcon },
  end: { label: 'پایان / انقضا', color: '#be123c', icon: FlagIcon },
  invoice: { label: 'فاکتور', color: '#7c3aed', icon: ReceiptIcon },
  statement: { label: 'صورت‌وضعیت', color: '#4f46e5', icon: ReceiptLongIcon },
  payment: { label: 'پرداخت', color: '#0891b2', icon: PaymentsIcon },
  addendum: { label: 'الحاقیه', color: '#be185d', icon: DescriptionIcon },
  guarantee: { label: 'تضمین', color: '#b45309', icon: LockIcon },
  dispute: { label: 'دعوی / اختلاف', color: '#dc2626', icon: GavelIcon },
};

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'در حال اجرا',
  suspended: 'متوقف',
  completed: 'تکمیل شده',
  terminated: 'فسخ شده',
};

const STATUS_COLORS = {
  draft: '#64748b',
  active: '#0f766e',
  suspended: '#b45309',
  completed: '#2563eb',
  terminated: '#be123c',
};

const normalizeDigits = (value) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

const normalizeText = (value) => normalizeDigits(value)
  .toLowerCase()
  .replace(/ي/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/\u200c/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const localIso = (date = new Date()) => (
  `${date.getFullYear()}-${PAD(date.getMonth() + 1)}-${PAD(date.getDate())}`
);

const TODAY_ISO = localIso();
const TODAY_PARTS = getJalaliParts(TODAY_ISO) || [1404, 1, 1];
const TODAY_J = `${TODAY_PARTS[0]}/${PAD(TODAY_PARTS[1])}/${PAD(TODAY_PARTS[2])}`;

const dayKey = (gregorian) => {
  const parts = getJalaliParts(gregorian);
  if (!parts || parts.length !== 3) return null;
  return `${parts[0]}/${PAD(parts[1])}/${PAD(parts[2])}`;
};

const dayKeyFromParts = (parts) => (
  parts && parts.length === 3 ? `${parts[0]}/${PAD(parts[1])}/${PAD(parts[2])}` : null
);

const addDaysIso = (iso, amount) => {
  const date = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + amount);
  return localIso(date);
};

const jalaliMonthInfo = (jy, jm) => {
  let days = 0;
  for (let day = 1; day <= 31; day += 1) {
    const gregorian = toGregorian(`${jy}/${PAD(jm)}/${PAD(day)}`);
    if (!gregorian || !/^\d{4}-\d{2}-\d{2}$/.test(gregorian)) break;
    const parts = getJalaliParts(gregorian);
    if (parts && parts[1] === jm) days = day;
    else break;
  }
  if (!days) days = 30;
  const firstGregorian = toGregorian(`${jy}/${PAD(jm)}/01`);
  const jsDay = new Date(`${firstGregorian}T00:00:00Z`).getUTCDay();
  return { days, offset: (jsDay + 1) % 7 };
};

const parseDateQuery = (raw) => {
  const normalized = normalizeText(raw).replace(/[.\-]/g, '/').replace(/\s*\/\s*/g, '/');
  const match = normalized.match(/^(1[34]\d{2})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const key = `${year}/${PAD(month)}/${PAD(day)}`;
  const gregorian = toGregorian(key);
  if (!gregorian || !/^\d{4}-\d{2}-\d{2}$/.test(gregorian)) return null;
  const parts = getJalaliParts(gregorian);
  if (!parts || parts[0] !== year || parts[1] !== month || parts[2] !== day) return null;
  return { key, year, month, day, gregorian };
};

const parseYearQuery = (raw) => {
  const normalized = normalizeText(raw);
  return /^1[34]\d{2}$/.test(normalized) ? Number(normalized) : null;
};

const parseMonthQuery = (raw) => {
  const normalized = normalizeText(raw);
  const match = normalized.match(/^(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)(?:\s+(1[34]\d{2}))?$/);
  if (!match) return null;
  return { month: MONTHS.indexOf(match[1]) + 1, year: match[2] ? Number(match[2]) : null };
};

const presetRange = (raw) => {
  const normalized = normalizeText(raw);
  if (normalized === 'امروز') return { key: 'today', label: 'امروز', from: TODAY_ISO, to: TODAY_ISO, date: TODAY_J };
  if (normalized === 'این هفته') {
    const jsDay = new Date(`${TODAY_ISO}T00:00:00`).getDay();
    const from = addDaysIso(TODAY_ISO, -((jsDay + 1) % 7));
    return { key: 'this-week', label: 'این هفته', from, to: addDaysIso(from, 6) };
  }
  if (normalized === 'هفته آینده') {
    const jsDay = new Date(`${TODAY_ISO}T00:00:00`).getDay();
    const from = addDaysIso(TODAY_ISO, 7 - ((jsDay + 1) % 7));
    return { key: 'next-week', label: 'هفته آینده', from, to: addDaysIso(from, 6) };
  }
  if (normalized === 'این ماه') return { key: 'this-month', label: 'این ماه', month: TODAY_PARTS[1], year: TODAY_PARTS[0] };
  if (normalized === 'ماه آینده') {
    const month = TODAY_PARTS[1] === 12 ? 1 : TODAY_PARTS[1] + 1;
    const year = TODAY_PARTS[1] === 12 ? TODAY_PARTS[0] + 1 : TODAY_PARTS[0];
    return { key: 'next-month', label: 'ماه آینده', month, year };
  }
  return null;
};

const InfoLine = ({ label, value, strong, ltr }) => (
  <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ py: 0.4 }}>
    <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{
      fontSize: strong ? 10.8 : 9.9, fontWeight: strong ? 900 : 700, color: INK,
      direction: ltr ? 'ltr' : 'rtl', textAlign: 'left', minWidth: 0,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {value === null || value === undefined || value === '' ? '—' : value}
    </Typography>
  </Stack>
);

const StatusChip = ({ contract }) => {
  const color = STATUS_COLORS[contract?.status] || '#64748b';
  return (
    <Chip size="small" label={STATUS_LABELS[contract?.status] || contract?.status_display || '—'}
      sx={{ height: 20, fontSize: 12, fontWeight: 800, bgcolor: alpha(color, 0.08), color }} />
  );
};

const EventPill = ({ event, onOpen, dense = false }) => {
  const meta = EVENT_TYPES[event.kind] || { label: 'رویداد', color: '#64748b', icon: CalendarMonthIcon };
  return (
    <ButtonBase onClick={(clickEvent) => { clickEvent.stopPropagation(); onOpen(event); }} sx={{
      width: '100%', justifyContent: 'flex-start', gap: 0.45, px: 0.5, py: dense ? 0.2 : 0.35,
      borderRadius: '5px', bgcolor: alpha(meta.color, 0.08), borderRight: `2px solid ${meta.color}`,
      overflow: 'hidden', '&:hover': { bgcolor: alpha(meta.color, 0.14) },
    }}>
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: meta.color, flexShrink: 0 }} />
      <Typography noWrap sx={{ fontSize: dense ? 7.5 : 8.2, fontWeight: 700, color: meta.color, textAlign: 'right' }}>
        {event.title}
      </Typography>
    </ButtonBase>
  );
};

const SearchResults = ({ query, summary, results, onOpen, onClear }) => {
  const theme = useTheme();
  if (!query) return null;
  return (
    <SurfaceCard title="نتایج جست‌وجو" icon={SearchIcon} color="#2563eb"
      action={<Stack direction="row" spacing={0.5} alignItems="center">
        <Chip size="small" label={`${formatPersianNumber(results.length)} نتیجه`}
          sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: '#eff6ff', color: '#1d4ed8' }} />
        <IconButton size="small" onClick={onClear}><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
      </Stack>}>
      <Stack spacing={0.6}>
        <Typography sx={{ fontSize: 12, color: MUTED }}>{summary}</Typography>
        {!results.length ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <WarningAmberIcon sx={{ fontSize: 27, color: theme.palette.text.disabled, mb: 0.5 }} />
            <Typography sx={{ fontSize: 12, color: MUTED }}>رویدادی با این مشخصات پیدا نشد.</Typography>
          </Box>
        ) : (
          <Stack spacing={0.45}>
            {results.slice(0, 12).map((event) => {
              const meta = EVENT_TYPES[event.kind];
              const Icon = meta.icon;
              return (
                <ButtonBase key={event.id} onClick={() => onOpen(event)} sx={{
                  width: '100%', p: 0.7, borderRadius: '9px', justifyContent: 'flex-start', gap: 0.75,
                  border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper,
                  '&:hover': { borderColor: alpha(meta.color, 0.35), bgcolor: alpha(meta.color, 0.025) },
                }}>
                  <Box sx={{
                    width: 27, height: 27, borderRadius: '8px', bgcolor: alpha(meta.color, 0.08), color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}><Icon sx={{ fontSize: 14 }} /></Box>
                  <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{event.title}</Typography>
                    <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>
                      {toJalali(event.date)} · {event.contract?.subject || '—'} · {meta.label}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>{event.kindLabel}</Typography>
                </ButtonBase>
              );
            })}
          </Stack>
        )}
      </Stack>
    </SurfaceCard>
  );
};


const eventHaystack = (event) => normalizeText([
  event.title, event.subtitle, event.kindLabel, event.j, toJalali(event.date),
  event.contract?.subject, event.contract?.party_name, event.contract?.number,
  STATUS_LABELS[event.contract?.status], event.amount,
].filter(Boolean).join(' '));

const eventAmount = (event) => (
  event.amount == null ? '' : `${formatPersianNumber(event.amount)} ${normalizeCurrencyLabel(event.contract?.currency_name || event.contract?.currency_symbol)}`
);

const MonthView = ({ year, month, eventsByDate, selectedJ, todayJ, onSelect, onOpen }) => {
  const theme = useTheme();
  const { days, offset } = jalaliMonthInfo(year, month);
  const cells = [];
  for (let index = 0; index < offset; index += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5, mb: 0.5 }}>
        {WEEKDAYS.map((weekday, index) => (
          <Typography key={weekday} align="center" sx={{
            py: 0.7, fontSize: 12, fontWeight: 800,
            color: index === 6 ? '#be123c' : MUTED,
          }}>{weekday}</Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
        {cells.map((day, index) => {
          if (day === null) return <Box key={`empty-${index}`} sx={{ minHeight: 92, borderRadius: '9px', bgcolor: alpha(theme.palette.action.hover, 0.35) }} />;
          const key = `${year}/${PAD(month)}/${PAD(day)}`;
          const dayEvents = eventsByDate[key] || [];
          const isToday = key === todayJ;
          const isSelected = key === selectedJ;
          const isFriday = index % 7 === 6;
          return (
            <Box key={key} onClick={() => onSelect(key)} sx={{
              minHeight: 92, p: 0.5, borderRadius: '9px', cursor: 'pointer',
              border: `1px solid ${isSelected ? '#2563eb' : isToday ? alpha('#2563eb', 0.35) : theme.palette.divider}`,
              bgcolor: isSelected ? alpha('#2563eb', 0.045) : isToday ? alpha('#2563eb', 0.025) : theme.palette.background.paper,
              transition: 'background .15s ease, border-color .15s ease',
              '&:hover': { borderColor: alpha('#2563eb', 0.28), bgcolor: alpha('#2563eb', 0.025) },
            }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.35, mb: 0.35 }}>
                <Typography sx={{
                  fontSize: 12, fontWeight: isToday || isSelected ? 900 : 700,
                  color: isFriday ? '#be123c' : isToday ? '#1d4ed8' : INK,
                }}>{toPersianDigits(day)}</Typography>
                {dayEvents.length ? (
                  <Typography sx={{ fontSize: 12, color: MUTED }}>{toPersianDigits(dayEvents.length)}</Typography>
                ) : null}
              </Stack>
              <Stack spacing={0.25}>
                {dayEvents.slice(0, 2).map((event) => <EventPill key={event.id} event={event} onOpen={onOpen} dense />)}
                {dayEvents.length > 2 ? (
                  <Typography sx={{ fontSize: 12, color: MUTED, pr: 0.4 }}>+{toPersianDigits(dayEvents.length - 2)} رویداد</Typography>
                ) : null}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};



const WeekView = ({ weekDays, eventsByDate, selectedJ, todayJ, onSelect, onOpen }) => {
  const theme = useTheme();
  return (
    <Box sx={{ overflowX: 'auto', pb: 1 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', gap: 0.75, minWidth: 1050 }}>
        {weekDays.map((day, index) => {
          const events = eventsByDate[day.j] || [];
          const isToday = day.j === todayJ;
          const isSelected = day.j === selectedJ;
          return (
            <Box key={day.iso} onClick={() => onSelect(day.j)} sx={{
              minHeight: 270, p: 0.75, borderRadius: '10px', cursor: 'pointer',
              border: `1px solid ${isSelected ? '#2563eb' : isToday ? alpha('#2563eb', 0.35) : theme.palette.divider}`,
              bgcolor: isSelected ? alpha('#2563eb', 0.045) : isToday ? alpha('#2563eb', 0.025) : theme.palette.background.paper,
            }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: index === 6 ? '#be123c' : MUTED }}>
                    {WEEKDAYS[index]}
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 900, color: isToday ? '#1d4ed8' : INK }}>
                    {toPersianDigits(day.day)}
                    <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: MUTED, mr: 0.4 }}>{MONTHS[day.month - 1]}</Box>
                  </Typography>
                </Box>
                <Chip size="small" label={toPersianDigits(events.length)}
                  sx={{ height: 18, fontSize: 12, bgcolor: events.length ? alpha('#2563eb', 0.08) : '#f1f5f9', color: events.length ? '#1d4ed8' : MUTED }} />
              </Stack>
              <Stack spacing={0.35}>
                {events.slice(0, 8).map((event) => <EventPill key={event.id} event={event} onOpen={onOpen} />)}
                {events.length > 8 ? <Typography sx={{ fontSize: 12, color: MUTED }}>+{toPersianDigits(events.length - 8)} رویداد</Typography> : null}
                {!events.length ? <Typography sx={{ fontSize: 12, color: theme.palette.text.disabled, textAlign: 'center', py: 2 }}>—</Typography> : null}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const AgendaView = ({ events, onOpen }) => {
  const groups = useMemo(() => {
    const grouped = [];
    events.forEach((event) => {
      const last = grouped[grouped.length - 1];
      if (last && last.key === event.key) last.items.push(event);
      else grouped.push({ key: event.key, date: event.date, items: [event] });
    });
    return grouped;
  }, [events]);

  if (!events.length) {
    return (
      <Box sx={{ py: 5, textAlign: 'center' }}>
        <CalendarMonthIcon sx={{ fontSize: 34, color: '#cbd5e1', mb: 0.75 }} />
        <Typography sx={{ fontSize: 12, color: MUTED }}>رویدادی با فیلترهای فعلی وجود ندارد.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.1}>
      {groups.map((group) => (
        <Paper key={group.key} elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e8edf4', overflow: 'hidden' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between"
            sx={{ px: 1.1, py: 0.65, bgcolor: SOFT_BG, borderBottom: '1px solid #eef2f7' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK }}>{toJalali(group.date)}</Typography>
            <Chip size="small" label={`${formatPersianNumber(group.items.length)} رویداد`}
              sx={{ height: 18, fontSize: 12, bgcolor: '#fff', color: MUTED }} />
          </Stack>
          <Stack>
            {group.items.map((event) => {
              const meta = EVENT_TYPES[event.kind];
              const Icon = meta.icon;
              return (
                <ButtonBase key={event.id} onClick={() => onOpen(event)} sx={{
                  width: '100%', px: 1.1, py: 0.75, justifyContent: 'flex-start', gap: 0.8,
                  borderBottom: '1px solid #f1f5f9', textAlign: 'right',
                  '&:hover': { bgcolor: alpha(meta.color, 0.025) },
                }}>
                  <Box sx={{
                    width: 28, height: 28, borderRadius: '8px', bgcolor: alpha(meta.color, 0.08), color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}><Icon sx={{ fontSize: 15 }} /></Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{event.title}</Typography>
                    <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{event.contract?.subject || '—'} · {event.subtitle}</Typography>
                  </Box>
                  <Chip size="small" label={meta.label}
                    sx={{ height: 19, fontSize: 12, bgcolor: alpha(meta.color, 0.07), color: meta.color }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#b45309', minWidth: 80, textAlign: 'left' }}>
                    {event.amount ? eventAmount(event) : ''}
                  </Typography>
                </ButtonBase>
              );
            })}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};

const SelectedDayPanel = ({ selectedJ, events, onOpen }) => (
  <SurfaceCard title="رویدادهای روز" icon={CalendarTodayIcon} color="#2563eb"
    action={<Chip size="small" label={formatPersianNumber(events.length)}
      sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: '#eff6ff', color: '#1d4ed8' }} />}>
    <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK, mb: 0.8 }}>{toPersianDigits(selectedJ)}</Typography>
    {!events.length ? (
      <Box sx={{ py: 3.5, textAlign: 'center' }}>
        <EventBusyIcon sx={{ fontSize: 28, color: '#cbd5e1', mb: 0.5 }} />
        <Typography sx={{ fontSize: 12, color: MUTED }}>رویدادی در این روز ثبت نشده است.</Typography>
      </Box>
    ) : (
      <Stack spacing={0.55}>
        {events.map((event) => {
          const meta = EVENT_TYPES[event.kind];
          const Icon = meta.icon;
          return (
            <ButtonBase key={event.id} onClick={() => onOpen(event)} sx={{
              width: '100%', p: 0.7, borderRadius: '9px', justifyContent: 'flex-start', gap: 0.65,
              bgcolor: alpha(meta.color, 0.035), border: `1px solid ${alpha(meta.color, 0.12)}`, textAlign: 'right',
            }}>
              <Box sx={{
                width: 26, height: 26, borderRadius: '7px', bgcolor: alpha(meta.color, 0.1), color: meta.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}><Icon sx={{ fontSize: 14 }} /></Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{event.title}</Typography>
                <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{event.contract?.subject || '—'}</Typography>
              </Box>
              <ArrowForwardIcon sx={{ fontSize: 14, color: meta.color }} />
            </ButtonBase>
          );
        })}
      </Stack>
    )}
  </SurfaceCard>
);


const KindFilterPanel = ({ counts, selectedKinds, onToggle, onAll }) => {
  const theme = useTheme();
  return (
    <SurfaceCard title="نوع رویداد" icon={FilterListIcon} color="#7c3aed"
      action={<Button size="small" onClick={onAll} sx={{ minWidth: 0, fontSize: 12 }}>همه</Button>}>
      <Stack spacing={0.15}>
        {Object.entries(EVENT_TYPES).map(([key, meta]) => {
          const active = selectedKinds.length === 0 || selectedKinds.includes(key);
          const Icon = meta.icon;
          return (
            <ButtonBase key={key} onClick={() => onToggle(key)} sx={{
              width: '100%', p: 0.55, borderRadius: '8px', justifyContent: 'space-between',
              bgcolor: active && selectedKinds.length ? alpha(meta.color, 0.06) : 'transparent',
            }}>
              <Stack direction="row" alignItems="center" spacing={0.55}>
                <Box sx={{
                  width: 22, height: 22, borderRadius: '6px', bgcolor: alpha(meta.color, active ? 0.1 : 0.04),
                  color: active ? meta.color : theme.palette.text.disabled,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Icon sx={{ fontSize: 12 }} /></Box>
                <Typography sx={{
                  fontSize: 12, fontWeight: selectedKinds.includes(key) ? 900 : 700,
                  color: active ? theme.palette.text.primary : theme.palette.text.disabled,
                }}>{meta.label}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.4}>
                {selectedKinds.includes(key) ? <CheckCircleIcon sx={{ fontSize: 12, color: meta.color }} /> : null}
                <Chip size="small" label={formatPersianNumber(counts[key] || 0)}
                  sx={{ height: 17, fontSize: 12, bgcolor: theme.palette.action.hover }} />
              </Stack>
            </ButtonBase>
          );
        })}
      </Stack>
    </SurfaceCard>
  );
};

const UpcomingPanel = ({ events, onOpen }) => (
  <SurfaceCard title="رویدادهای پیش‌رو" icon={ScheduleIcon} color="#0f766e"
    action={<Chip size="small" label={formatPersianNumber(events.length)}
      sx={{ height: 21, fontSize: 12, bgcolor: '#ecfdf5', color: '#0f766e', fontWeight: 800 }} />}>
    {!events.length ? (
      <Typography sx={{ py: 2.5, textAlign: 'center', fontSize: 12, color: MUTED }}>رویداد نزدیکی وجود ندارد.</Typography>
    ) : (
      <Stack spacing={0.45}>
        {events.slice(0, 6).map((event) => {
          const meta = EVENT_TYPES[event.kind];
          return (
            <ButtonBase key={event.id} onClick={() => onOpen(event)} sx={{
              width: '100%', p: 0.55, borderRadius: '8px', justifyContent: 'flex-start', gap: 0.55,
              '&:hover': { bgcolor: '#f8fafc' },
            }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: meta.color, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{event.title}</Typography>
                <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{toJalali(event.date)} · {event.contract?.subject || '—'}</Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Stack>
    )}
  </SurfaceCard>
);


const EventDrawer = ({ event, onClose, onOpenContract, onOpenModule }) => {
  const theme = useTheme();
  if (!event) return null;
  const meta = EVENT_TYPES[event.kind] || { label: 'رویداد', color: '#64748b', icon: CalendarMonthIcon };
  const Icon = meta.icon;
  return (
    <Drawer anchor="left" open={Boolean(event)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, bgcolor: SOFT_BG } }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 1.75, bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px', bgcolor: alpha(meta.color, 0.08),
              color: meta.color, border: `1px solid ${alpha(meta.color, 0.16)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><Icon sx={{ fontSize: 21 }} /></Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK }}>{event.title}</Typography>
              <Typography sx={{ fontSize: 12, color: MUTED }}>{meta.label} · {toJalali(event.date)}</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
          <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={meta.label}
              sx={{ height: 21, fontSize: 12, bgcolor: alpha(meta.color, 0.08), color: meta.color, fontWeight: 800 }} />
            <StatusChip contract={event.contract} />
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1.3}>
            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '13px', border: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK, mb: 0.6 }}>قرارداد</Typography>
              <InfoLine label="موضوع" value={event.contract?.subject} strong />
              <InfoLine label="طرف حساب" value={event.contract?.party_name} />
              <InfoLine label="شماره" value={event.contract?.number} />
              <InfoLine label="وضعیت" value={STATUS_LABELS[event.contract?.status] || event.contract?.status_display} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '13px', border: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK, mb: 0.6 }}>مشخصات رویداد</Typography>
              <InfoLine label="تاریخ شمسی" value={toJalali(event.date)} />
              <InfoLine label="تاریخ میلادی" value={event.date} ltr />
              <InfoLine label="نوع" value={meta.label} />
              {event.amount != null ? <InfoLine label="مبلغ" value={eventAmount(event)} ltr /> : null}
              {event.subtitle ? <InfoLine label="توضیح" value={event.subtitle} /> : null}
            </Paper>

            {event.contract?.effective_amount != null || event.contract?.amount != null ? (
              <Paper elevation={0} sx={{ p: 1.4, borderRadius: '13px', border: `1px solid ${theme.palette.divider}` }}>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK, mb: 0.6 }}>وضعیت مالی قرارداد</Typography>
                <InfoLine label="مبلغ پایه" value={`${formatPersianNumber(event.contract?.amount || 0)} ${normalizeCurrencyLabel(event.contract?.currency_name || event.contract?.currency_symbol)}`} ltr />
                <InfoLine label="مبلغ مؤثر" value={`${formatPersianNumber(event.contract?.effective_amount || event.contract?.amount || 0)} ${normalizeCurrencyLabel(event.contract?.currency_name || event.contract?.currency_symbol)}`} strong ltr />
              </Paper>
            ) : null}
          </Stack>
        </Box>

        <Divider />
        <Stack direction="row" spacing={0.8} sx={{ p: 1.2, bgcolor: theme.palette.background.paper }}>
          <Button fullWidth variant="outlined" startIcon={<DescriptionIcon />} onClick={() => onOpenContract(event.contract)}>
            پرونده
          </Button>
          <Button fullWidth variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => onOpenModule(event)}>
            ماژول مرتبط
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
};


const ContractCalendarPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = parseDateQuery(searchParams.get('date'))?.key || TODAY_J;
  const [initialYear, initialMonth] = initialDate.split('/').map(Number);
  const [curYear, setCurYear] = useState(initialYear);
  const [curMonth, setCurMonth] = useState(initialMonth);
  const [selectedJ, setSelectedJ] = useState(initialDate);
  const [view, setView] = useState(['month', 'week', 'agenda'].includes(searchParams.get('view')) ? searchParams.get('view') : 'month');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [selectedKinds, setSelectedKinds] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['ext-contracts-calendar'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 1000 } }).then((response) => response.data),
  });
  const contractList = Array.isArray(data) ? data : data?.results || [];

  const events = useMemo(() => {
    const rows = [];
    const add = (id, contract, date, kind, title, subtitle, amount) => {
      if (!date) return;
      const key = dayKey(date);
      if (!key) return;
      const [year, month, day] = key.split('/').map(Number);
      rows.push({
        id, key, j: key, year, month, day, date: String(date).slice(0, 10), kind,
        kindLabel: EVENT_TYPES[kind]?.label || 'رویداد',
        title, subtitle, amount, contract,
      });
    };
    contractList.forEach((contract) => {
      const base = contract.subject || '—';
      const party = `${contract.party_name || '—'} · ${contract.number || '—'}`;
      add(`sign-${contract.id}`, contract, contract.signing_date, 'signing', base, `امضای قرارداد · ${party}`, contract.amount);
      add(`start-${contract.id}`, contract, contract.start_date, 'start', base, `شروع قرارداد · ${party}`, contract.amount);
      const addendumsWithEnd = (contract.addendums || []).filter((item) => item.new_end_date);
      const lastAddendum = addendumsWithEnd.length
        ? addendumsWithEnd.reduce((latest, item) => (String(item.date || '') > String(latest.date || '') ? item : latest))
        : null;
      const extendedEnd = lastAddendum?.new_end_date;
      add(`end-${contract.id}`, contract, contract.end_date, 'end', base,
        extendedEnd && extendedEnd !== contract.end_date ? `${party} · تمدید تا ${toJalali(extendedEnd)}` : party,
        contract.amount);
      if (extendedEnd && extendedEnd !== contract.end_date) {
        add(`end-addendum-${contract.id}`, contract, extendedEnd, 'end', base, `${party} · پایان با الحاقیه`, contract.amount);
      }
      (contract.invoices || []).forEach((invoice) => {
        add(`invoice-${invoice.id}`, contract, invoice.date, 'invoice', `فاکتور ${invoice.number || '—'}`, base, invoice.total);
        if (invoice.due_date && invoice.due_date !== invoice.date) {
          add(`invoice-due-${invoice.id}`, contract, invoice.due_date, 'invoice', `سررسید فاکتور ${invoice.number || '—'}`, base, invoice.total);
        }
      });
      (contract.statements || []).forEach((statement) => {
        add(`statement-${statement.id}`, contract, statement.date, 'statement', `صورت‌وضعیت ${statement.number || '—'}`, base, statement.net_amount);
      });
      (contract.payments || []).forEach((payment) => {
        add(`payment-${payment.id}`, contract, payment.date, 'payment', 'پرداخت', `${base}${payment.reference ? ` · ${payment.reference}` : ''}`, payment.amount);
      });
      (contract.addendums || []).forEach((addendum) => {
        add(`addendum-${addendum.id}`, contract, addendum.date, 'addendum', `الحاقیه ${addendum.number || '—'}`, base, null);
      });
      (contract.guarantees || []).forEach((guarantee) => {
        add(`guarantee-${guarantee.id}`, contract, guarantee.issue_date, 'guarantee', `تضمین ${guarantee.guarantee_type_display || ''}`, base, guarantee.amount);
        const due = guarantee.guarantee_expiry_date || guarantee.check_due_date
          || guarantee.promissory_due_date || guarantee.expiry_date;
        if (due) {
          add(`guarantee-expiry-${guarantee.id}`, contract, due, 'guarantee', `انقضای تضمین ${guarantee.guarantee_type_display || ''}`, base, guarantee.amount);
        }
      });
      (contract.disputes || []).forEach((dispute) => {
        add(`dispute-${dispute.id}`, contract, dispute.opened_date, 'dispute', dispute.title || 'دعوی / اختلاف', base, dispute.claim_amount);
      });
    });
    return rows.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [contractList]);


  const textQuery = normalizeText(search);
  const dateQuery = parseDateQuery(search);
  const yearQuery = dateQuery ? dateQuery.year : parseYearQuery(search);
  const monthQuery = parseMonthQuery(search);
  const preset = presetRange(search);
  const searchActive = Boolean(textQuery);
  const filtersActive = Boolean(searchActive || selectedKinds.length || statusFilter !== 'all' || scopeFilter !== 'all');

  const filteredEvents = useMemo(() => (
    events.filter((event) => {
      if (selectedKinds.length && !selectedKinds.includes(event.kind)) return false;
      if (statusFilter !== 'all' && event.contract?.status !== statusFilter) return false;
      if (dateQuery && event.j !== dateQuery.key) return false;
      if (!dateQuery && yearQuery && event.year !== yearQuery) return false;
      if (!dateQuery && monthQuery && (
        event.month !== monthQuery.month
        || (monthQuery.year && event.year !== monthQuery.year)
      )) return false;
      if (preset?.from && (event.date < preset.from || event.date > preset.to)) return false;
      if (preset?.month && (event.month !== preset.month || event.year !== preset.year)) return false;
      if (scopeFilter === 'upcoming' && event.date < TODAY_ISO) return false;
      if (scopeFilter === 'past' && event.date >= TODAY_ISO) return false;
      if (textQuery && !dateQuery && !yearQuery && !monthQuery && !preset) {
        return eventHaystack(event).includes(textQuery);
      }
      return true;
    })
  ), [events, selectedKinds, statusFilter, dateQuery?.key, yearQuery, monthQuery?.month, monthQuery?.year, preset?.key, scopeFilter, textQuery]);

  const sortedEvents = useMemo(
    () => [...filteredEvents].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
    [filteredEvents],
  );

  const eventsByDate = useMemo(() => {
    const map = {};
    sortedEvents.forEach((event) => {
      if (!map[event.j]) map[event.j] = [];
      map[event.j].push(event);
    });
    return map;
  }, [sortedEvents]);

  useEffect(() => {
    if (dateQuery) {
      setCurYear(dateQuery.year);
      setCurMonth(dateQuery.month);
      setSelectedJ(dateQuery.key);
    } else if (monthQuery?.year) {
      setCurYear(monthQuery.year);
      setCurMonth(monthQuery.month);
      setSelectedJ(`${monthQuery.year}/${PAD(monthQuery.month)}/01`);
    } else if (monthQuery) {
      setCurMonth(monthQuery.month);
      setSelectedJ(`${curYear}/${PAD(monthQuery.month)}/01`);
    } else if (yearQuery) {
      setCurYear(yearQuery);
      setSelectedJ(`${yearQuery}/${PAD(curMonth)}/01`);
    } else if (preset?.month) {
      setCurYear(preset.year);
      setCurMonth(preset.month);
      setSelectedJ(`${preset.year}/${PAD(preset.month)}/01`);
    } else if (preset?.date) {
      const [year, month] = preset.date.split('/').map(Number);
      setCurYear(year);
      setCurMonth(month);
      setSelectedJ(preset.date);
    } else if (preset?.from) {
      const key = dayKey(preset.from);
      if (key) {
        const [year, month] = key.split('/').map(Number);
        setCurYear(year);
        setCurMonth(month);
        setSelectedJ(key);
      }
    }
  }, [dateQuery?.key, monthQuery?.month, monthQuery?.year, yearQuery, preset?.key]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedJ !== TODAY_J) next.set('date', selectedJ);
    if (view !== 'month') next.set('view', view);
    setSearchParams(next, { replace: true });
  }, [selectedJ, view, setSearchParams]);

  const weekDays = useMemo(() => {
    const gregorian = toGregorian(selectedJ);
    const base = new Date(`${gregorian}T00:00:00`);
    if (Number.isNaN(base.getTime())) return [];
    const start = new Date(base);
    start.setDate(base.getDate() - ((base.getDay() + 1) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = localIso(date);
      const parts = getJalaliParts(iso) || [];
      return { iso, j: dayKeyFromParts(parts), day: parts[2], month: parts[1] };
    });
  }, [selectedJ]);

  const kindCounts = useMemo(() => events.reduce((counts, event) => {
    counts[event.kind] = (counts[event.kind] || 0) + 1;
    return counts;
  }, {}), [events]);

  const monthEvents = sortedEvents.filter((event) => event.year === curYear && event.month === curMonth);
  const upcomingEvents = sortedEvents.filter((event) => event.date >= TODAY_ISO && event.date <= addDaysIso(TODAY_ISO, 30));
  const contractCount = new Set(sortedEvents.map((event) => event.contract?.id)).size;
  const selectedEvents = eventsByDate[selectedJ] || [];
  const searchResults = dateQuery ? sortedEvents.filter((event) => event.j === dateQuery.key) : sortedEvents;
  const periodTitle = view === 'week' && weekDays.length
    ? `${toPersianDigits(weekDays[0].j)} تا ${toPersianDigits(weekDays[6].j)}`
    : `${MONTHS[curMonth - 1]} ${toPersianDigits(curYear)}`;

  const searchSummary = dateQuery
    ? `رویدادهای تاریخ ${toPersianDigits(dateQuery.key)}`
    : monthQuery
      ? `رویدادهای ${MONTHS[monthQuery.month - 1]}${monthQuery.year ? ` ${toPersianDigits(monthQuery.year)}` : ''}`
      : yearQuery
        ? `رویدادهای سال ${toPersianDigits(yearQuery)}`
        : preset
          ? `رویدادهای ${preset.label}`
          : `نتایج برای «${search.trim()}»`;


  const goToDate = (key) => {
    const parsed = parseDateQuery(key);
    if (!parsed) return;
    setCurYear(parsed.year);
    setCurMonth(parsed.month);
    setSelectedJ(parsed.key);
  };

  const openEvent = (event) => {
    setSelectedEvent(event);
    if (event.j) goToDate(event.j);
  };

  const shiftPeriod = (direction) => {
    if (view === 'week') {
      const gregorian = toGregorian(selectedJ);
      const next = addDaysIso(gregorian, direction * 7);
      goToDate(dayKey(next));
      return;
    }
    let year = curYear;
    let month = curMonth + direction;
    if (month < 1) { month = 12; year -= 1; }
    if (month > 12) { month = 1; year += 1; }
    setCurYear(year);
    setCurMonth(month);
    setSelectedJ(`${year}/${PAD(month)}/01`);
  };

  const goToday = () => {
    setCurYear(TODAY_PARTS[0]);
    setCurMonth(TODAY_PARTS[1]);
    setSelectedJ(TODAY_J);
    setView('month');
  };

  const handleMonthChange = (event) => {
    const month = Number(event.target.value);
    setCurMonth(month);
    setSelectedJ(`${curYear}/${PAD(month)}/01`);
  };

  const handleYearChange = (event) => {
    const year = Number(event.target.value);
    setCurYear(year);
    setSelectedJ(`${year}/${PAD(curMonth)}/01`);
  };

  const toggleKind = (kind) => {
    setSelectedKinds((previous) => (
      previous.includes(kind) ? previous.filter((item) => item !== kind) : [...previous, kind]
    ));
  };

  const resetFilters = () => {
    setSelectedKinds([]);
    setStatusFilter('all');
    setScopeFilter('all');
    setSearch('');
  };

  const openContract = (contract) => {
    if (contract?.id) navigate(`/external-contracts/${contract.id}`);
  };

  const openModule = (event) => {
    const paths = {
      invoice: '/contracts-invoices',
      statement: '/contracts-statements',
      payment: '/contracts-payments',
      addendum: '/contracts-addendums',
      guarantee: '/contracts-guarantees',
      dispute: '/contracts-disputes',
    };
    const id = event.contract?.id;
    if (!id) return;
    navigate(paths[event.kind] ? `${paths[event.kind]}?contract=${id}` : `/external-contracts/${id}`);
  };

  const exportCsv = () => {
    const rows = sortedEvents.map((event) => [
      toJalali(event.date), event.date, event.kindLabel, event.title,
      event.contract?.subject || '', event.contract?.party_name || '', event.contract?.number || '',
      event.amount || '', STATUS_LABELS[event.contract?.status] || event.contract?.status || '',
    ]);
    const header = ['تاریخ شمسی', 'تاریخ میلادی', 'نوع رویداد', 'عنوان', 'قرارداد', 'طرف حساب', 'شماره قرارداد', 'مبلغ', 'وضعیت'];
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contract-calendar-${toPersianDigits(curYear)}-${PAD(curMonth)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const yearOptions = [...new Set([
    ...Array.from({ length: 7 }, (_, index) => TODAY_PARTS[0] - 3 + index),
    curYear,
  ])].sort((a, b) => a - b);


  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<CalendarMonthIcon />}
        title="تقویم قراردادها"
        badge={(
          <Chip size="small" label={filtersActive ? `${formatPersianNumber(sortedEvents.length)} نتیجه` : `${formatPersianNumber(events.length)} رویداد`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha('#2563eb', 0.08), color: '#1d4ed8' }} />
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
          </>
        )}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={CalendarMonthIcon} label={filtersActive ? 'رویدادهای فیلترشده' : 'کل رویدادها'}
            value={formatPersianNumber(sortedEvents.length)} suffix="رویداد" color="#2563eb" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={CalendarTodayIcon} label="رویدادهای این ماه" value={formatPersianNumber(monthEvents.length)} suffix="رویداد" color="#0f766e" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={ScheduleIcon} label="۳۰ روز آینده" value={formatPersianNumber(upcomingEvents.length)} suffix="رویداد" color="#b45309" onClick={() => setScopeFilter('upcoming')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={DescriptionIcon} label="قراردادهای درگیر" value={formatPersianNumber(contractCount)} suffix="قرارداد" color="#7c3aed" />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <Stack spacing={0.8}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} useFlexGap alignItems={{ lg: 'center' }}>
            <TextField
              size="small"
              placeholder="جست‌وجو: قرارداد، طرف، شماره یا تاریخ ۱۴۰۴/۰۵/۱۲…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchResults[0]) openEvent(searchResults[0]);
                if (event.key === 'Escape') setSearch('');
              }}
              sx={{ flex: 1, minWidth: { xs: '100%', lg: 280 } }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                endAdornment: search ? (
                  <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment>
                ) : null,
              }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', lg: 145 } }}>
              <InputLabel>وضعیت قرارداد</InputLabel>
              <Select value={statusFilter} label="وضعیت قرارداد" onChange={(event) => setStatusFilter(event.target.value)}>
                <MenuItem value="all">همه</MenuItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', lg: 130 } }}>
              <InputLabel>بازه زمانی</InputLabel>
              <Select value={scopeFilter} label="بازه زمانی" onChange={(event) => setScopeFilter(event.target.value)}>
                <MenuItem value="all">همه</MenuItem>
                <MenuItem value="upcoming">پیش‌رو</MenuItem>
                <MenuItem value="past">گذشته</MenuItem>
              </Select>
            </FormControl>
            <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => value && setView(value)}>
              <ToggleButton value="month" aria-label="نمای ماه"><Tooltip title="ماه"><ViewModuleIcon fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="week" aria-label="نمای هفته"><Tooltip title="هفته"><ViewWeekIcon fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="agenda" aria-label="نمای فهرست"><Tooltip title="فهرست"><ViewAgendaIcon fontSize="small" /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
            {(selectedKinds.length || statusFilter !== 'all' || scopeFilter !== 'all' || search) ? (
              <Button size="small" onClick={resetFilters} sx={{ fontSize: 12 }}>پاک‌کردن فیلترها</Button>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" alignItems="center">
            {['امروز', 'این هفته', 'این ماه', 'ماه آینده'].map((presetLabel) => (
              <Chip key={presetLabel} size="small" label={presetLabel} clickable
                onClick={() => setSearch(presetLabel)}
                sx={{ height: 21, fontSize: 12, bgcolor: '#f8fafc', color: '#475569' }} />
            ))}
            <Typography sx={{ fontSize: 12, color: MUTED }}>
              جست‌وجو روی موضوع، طرف، شماره، نوع رویداد و تاریخ شمسی
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ mb: searchActive ? 1.5 : 0 }}>
        <SearchResults query={searchActive} summary={searchSummary} results={searchResults}
          onOpen={openEvent} onClear={() => setSearch('')} />
      </Box>


      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={8}>
          <SurfaceCard
            title={periodTitle}
            icon={CalendarMonthIcon}
            color="#2563eb"
            action={(
              <Stack direction="row" spacing={0.15} alignItems="center">
                <Tooltip title="دوره قبل"><IconButton size="small" onClick={() => shiftPeriod(-1)}><ChevronRightIcon fontSize="small" /></IconButton></Tooltip>
                <Button size="small" onClick={goToday} sx={{ minWidth: 0, px: 0.8, fontSize: 12 }}>امروز</Button>
                <Tooltip title="دوره بعد"><IconButton size="small" onClick={() => shiftPeriod(1)}><ChevronLeftIcon fontSize="small" /></IconButton></Tooltip>
              </Stack>
            )}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} alignItems={{ sm: 'center' }} sx={{ mb: 1.2 }}>
              <FormControl size="small" sx={{ minWidth: 115 }}>
                <InputLabel>ماه</InputLabel>
                <Select value={curMonth} label="ماه" onChange={handleMonthChange}>
                  {MONTHS.map((month, index) => <MenuItem key={month} value={index + 1}>{month}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>سال</InputLabel>
                <Select value={curYear} label="سال" onChange={handleYearChange}>
                  {yearOptions.map((year) => <MenuItem key={year} value={year}>{toPersianDigits(year)}</MenuItem>)}
                </Select>
              </FormControl>
              <Chip size="small" label={`${formatPersianNumber(monthEvents.length)} رویداد این ماه`}
                sx={{ height: 22, fontSize: 12, bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 800 }} />
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: 12, color: MUTED }}>
                {view === 'month' ? 'نمای ماهانه' : view === 'week' ? 'نمای هفتگی' : 'فهرست رویدادها'}
              </Typography>
            </Stack>

            {view === 'month' ? (
              <MonthView year={curYear} month={curMonth} eventsByDate={eventsByDate}
                selectedJ={selectedJ} todayJ={TODAY_J} onSelect={setSelectedJ} onOpen={openEvent} />
            ) : view === 'week' ? (
              <WeekView weekDays={weekDays} eventsByDate={eventsByDate} selectedJ={selectedJ}
                todayJ={TODAY_J} onSelect={setSelectedJ} onOpen={openEvent} />
            ) : (
              <AgendaView events={searchActive ? sortedEvents : monthEvents} onOpen={openEvent} />
            )}
          </SurfaceCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
            <SelectedDayPanel selectedJ={selectedJ} events={selectedEvents} onOpen={openEvent} />
            <UpcomingPanel events={upcomingEvents} onOpen={openEvent} />
            <KindFilterPanel counts={kindCounts} selectedKinds={selectedKinds} onToggle={toggleKind} onAll={() => setSelectedKinds([])} />
          </Stack>
        </Grid>
      </Grid>

      <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)}
        onOpenContract={openContract} onOpenModule={openModule} />
    </Box>
  );
};

export default ContractCalendarPage;

