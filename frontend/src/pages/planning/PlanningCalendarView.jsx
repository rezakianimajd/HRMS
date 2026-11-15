/**
 * تب «تقویم شخصی» — ماهانهٔ شمسی با پیوند دوطرفه به وظایف و یادداشت‌ها.
 *
 * چیدمان: نوار جستجو/فیلتر استاندارد → شبکهٔ تقویم (۸۰٪، سمت راست) و پنل روز
 * (۲۰٪، سمت چپ). هر تغییر کش `planning` را باطل می‌کند تا تقویم و فهرست‌ها
 * همیشه هم‌گام باشند.
 */
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import TodayIcon from '@mui/icons-material/Today';
import axiosInstance from '../../core/api/axiosConfig';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { ModuleToolbar } from '../contracts/contractModuleUi';
import { EventDialog } from './PlanningDialogs';
import {
  EMPTY_EVENT, EVENT_KIND_META, SCOPES, TASK_PRIORITY_META, TASK_STATUS_META, toneColor,
} from './planningTheme';
import {
  JALALI_MONTHS, WEEKDAYS, groupByDate, jalaliDayLabel, jalaliMonthGrid, jalaliToday,
  shiftJalaliMonth, todayIso,
} from './planningCalendar';

const pickRows = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const timeText = (value) => String(value || '').slice(0, 5);

const taskTone = (task) => {
  if (task.status === 'done') return 'success';
  if (task.status === 'cancelled') return 'neutral';
  if (task.due_date && task.due_date < todayIso()) return 'danger';
  return TASK_STATUS_META[task.status]?.tone || 'info';
};

const KINDS = [
  { value: 'all', label: 'همه' },
  { value: 'task', label: 'وظیفه' },
  { value: 'note', label: 'یادداشت' },
  { value: 'event', label: 'رویداد' },
];

const STATUSES = [
  { value: 'all', label: 'همه' },
  { value: 'open', label: 'باز' },
  { value: 'done', label: 'انجام‌شده' },
];

const passesFilter = (type, row, kindFilter, statusFilter) => {
  if (kindFilter !== 'all' && kindFilter !== type) return false;
  if (statusFilter === 'all') return true;
  if (type === 'task') {
    return statusFilter === 'done'
      ? row.status === 'done'
      : (row.status !== 'done' && row.status !== 'cancelled');
  }
  if (type === 'event') {
    return statusFilter === 'done' ? Boolean(row.is_done) : !row.is_done;
  }
  return true;
};

const PlanningCalendarView = ({
  theme, search, apiSearch, onSearch, onCreateTask, onCreateNote, onToggleTask, onEditTask,
  onEditNote, onNotify,
}) => {
  const qc = useQueryClient();
  const today = useMemo(() => jalaliToday(), []);
  const [cursor, setCursor] = useState(today || { jy: 1405, jm: 1 });
  const grid = useMemo(() => jalaliMonthGrid(cursor.jy, cursor.jm), [cursor]);
  const [selected, setSelected] = useState(todayIso());
  const [scope, setScope] = useState('mine');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);

  const calendarQuery = useQuery({
    queryKey: ['planning', 'calendar', { start: grid.start, end: grid.end, scope, q: apiSearch }],
    queryFn: () => axiosInstance.get('/planning/calendar/', {
      params: {
        start: grid.start, end: grid.end, scope,
        ...(apiSearch.trim() ? { q: apiSearch.trim() } : {}),
      },
    }).then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30000,
  });
  const data = calendarQuery.data || {};

  const calendarTasks = useMemo(
    () => (data.tasks || []).filter((row) => passesFilter('task', row, kindFilter, statusFilter)),
    [data.tasks, kindFilter, statusFilter],
  );
  const calendarNotes = useMemo(
    () => (data.notes || []).filter((row) => passesFilter('note', row, kindFilter, statusFilter)),
    [data.notes, kindFilter, statusFilter],
  );
  const calendarEvents = useMemo(
    () => (data.events || []).filter((row) => passesFilter('event', row, kindFilter, statusFilter)),
    [data.events, kindFilter, statusFilter],
  );

  const tasksByDate = useMemo(
    () => groupByDate(calendarTasks, (row) => row.due_date),
    [calendarTasks],
  );
  const notesByDate = useMemo(
    () => groupByDate(calendarNotes, (row) => row.date),
    [calendarNotes],
  );
  const eventsByDate = useMemo(
    () => groupByDate(calendarEvents, (row) => row.date),
    [calendarEvents],
  );

  const linkOptionsQuery = useQuery({
    queryKey: ['planning', 'calendar-links'],
    queryFn: () => Promise.all([
      axiosInstance.get('/planning/tasks/', { params: { page_size: 200, ordering: '-created_at' } }),
      axiosInstance.get('/planning/notes/', { params: { page_size: 200, ordering: '-updated_at' } }),
    ]).then(([tasksResponse, notesResponse]) => ({
      tasks: pickRows(tasksResponse.data),
      notes: pickRows(notesResponse.data),
    })),
    enabled: eventOpen,
    staleTime: 60000,
  });
  const linkOptions = linkOptionsQuery.data || { tasks: [], notes: [] };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['planning'] });

  const saveEvent = useMutation({
    mutationFn: () => {
      const body = {
        title: String(eventForm.title || '').trim(),
        description: eventForm.description || '',
        date: eventForm.date,
        start_time: eventForm.start_time || null,
        end_time: eventForm.end_time || null,
        kind: eventForm.kind || 'event',
        color: eventForm.color || theme.accent,
        is_done: Boolean(eventForm.is_done),
        task: eventForm.task || null,
        note: eventForm.note || null,
      };
      return eventForm.id
        ? axiosInstance.patch(`/planning/events/${eventForm.id}/`, body)
        : axiosInstance.post('/planning/events/', body);
    },
    onSuccess: () => {
      const editing = Boolean(eventForm.id);
      setEventOpen(false);
      setEventForm(EMPTY_EVENT);
      invalidate();
      onNotify?.(editing ? 'رویداد به‌روزرسانی شد' : 'رویداد ساخته شد');
    },
    onError: (error) => onNotify?.(
      error?.response?.data?.detail || 'ذخیرهٔ رویداد انجام نشد', false,
    ),
  });

  const toggleEvent = useMutation({
    mutationFn: (row) => axiosInstance.patch(`/planning/events/${row.id}/`, {
      is_done: !row.is_done,
    }),
    onSuccess: invalidate,
    onError: () => onNotify?.('تغییر وضعیت رویداد انجام نشد', false),
  });

  const removeEvent = useMutation({
    mutationFn: (row) => axiosInstance.delete(`/planning/events/${row.id}/`),
    onSuccess: () => { invalidate(); onNotify?.('رویداد حذف شد'); },
    onError: () => onNotify?.('حذف رویداد انجام نشد', false),
  });

  const openEventNew = (iso) => {
    setEventForm({ ...EMPTY_EVENT, date: iso || selected, color: theme.accent });
    setEventOpen(true);
  };
  const openEventEdit = (row) => {
    setEventForm({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      date: row.date || selected,
      start_time: timeText(row.start_time),
      end_time: timeText(row.end_time),
      kind: row.kind || 'event',
      color: row.color || theme.accent,
      is_done: Boolean(row.is_done),
      task: row.task || null,
      note: row.note || null,
    });
    setEventOpen(true);
  };
  const openTask = async (row) => {
    const response = await axiosInstance.get(`/planning/tasks/${row.id}/`);
    onEditTask?.(response.data);
  };
  const openNote = async (row) => {
    const response = await axiosInstance.get(`/planning/notes/${row.id}/`);
    onEditNote?.(response.data);
  };
  const removeEventWithConfirm = (row) => {
    if (!window.confirm(`رویداد «${row.title}» حذف شود؟`)) return;
    removeEvent.mutate(row);
  };

  const activeFilterCount = (scope !== 'mine' ? 1 : 0)
    + (kindFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);
  const resetFilters = () => {
    setScope('mine');
    setKindFilter('all');
    setStatusFilter('all');
  };
  const filters = [
    { label: 'دامنه', value: scope, options: SCOPES, onChange: setScope },
    { label: 'نوع', value: kindFilter, options: KINDS, onChange: setKindFilter },
    { label: 'وضعیت', value: statusFilter, options: STATUSES, onChange: setStatusFilter },
  ];
  const activeChips = [
    scope !== 'mine' ? {
      key: 'scope',
      label: `دامنه: ${SCOPES.find((item) => item.value === scope)?.label || scope}`,
      clear: () => setScope('mine'),
    } : null,
    kindFilter !== 'all' ? {
      key: 'kind',
      label: `نوع: ${KINDS.find((item) => item.value === kindFilter)?.label || kindFilter}`,
      clear: () => setKindFilter('all'),
    } : null,
    statusFilter !== 'all' ? {
      key: 'status',
      label: `وضعیت: ${STATUSES.find((item) => item.value === statusFilter)?.label || statusFilter}`,
      clear: () => setStatusFilter('all'),
    } : null,
  ].filter(Boolean);

  const dayTasks = tasksByDate[selected] || [];
  const dayNotes = notesByDate[selected] || [];
  const dayEvents = eventsByDate[selected] || [];
  const selectedWeekday = (() => {
    const date = new Date(`${selected}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? '' : WEEKDAYS[(date.getUTCDay() + 1) % 7];
  })();
  const monthPart = grid.cells.find((cell) => cell.inMonth) || { jy: cursor.jy, jm: cursor.jm };

  const cellChips = (iso) => {
    const items = [
      ...(eventsByDate[iso] || []).map((row) => ({ key: `e-${row.id}`, row, type: 'event' })),
      ...(tasksByDate[iso] || []).map((row) => ({ key: `t-${row.id}`, row, type: 'task' })),
      ...(notesByDate[iso] || []).map((row) => ({ key: `n-${row.id}`, row, type: 'note' })),
    ];
    return { items, hidden: Math.max(0, items.length - 2) };
  };
  const chipColor = (item) => {
    if (item.type === 'event') {
      return item.row.color || toneColor(theme, EVENT_KIND_META[item.row.kind]?.tone || 'accent');
    }
    if (item.type === 'task') return toneColor(theme, taskTone(item.row));
    return item.row.color || theme.tones.neutral;
  };


  return (
    <Box>
      <ModuleToolbar
        theme={theme}
        search={search}
        onSearch={onSearch}
        searchPlaceholder="جستجو در رویداد، وظیفه و یادداشت تقویم…"
        sort={sort}
        sortOptions={[{ value: 'date', label: 'بر اساس تاریخ' }]}
        onSort={setSort}
        filters={filters}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />

      <Box sx={{
        display: 'grid', gap: 1.25, alignItems: 'start',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 4fr) minmax(240px, 1fr)' },
      }}>
        <Box sx={{ minWidth: 0 }}>
          <Paper elevation={0} sx={{
            p: 0.75, mb: 1, borderRadius: theme.radii.large, border: '1px solid',
            borderColor: theme.cardBorderColor, bgcolor: 'background.paper',
          }}>
            <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
              <Tooltip title="ماه قبل">
                <IconButton size="small" aria-label="ماه قبل"
                  onClick={() => setCursor((value) => shiftJalaliMonth(value.jy, value.jm, -1))}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography sx={{ minWidth: 116, textAlign: 'center', fontSize: 12.5, fontWeight: 900 }}>
                {`${JALALI_MONTHS[monthPart.jm - 1]} ${monthPart.jy}`}
              </Typography>
              <Tooltip title="ماه بعد">
                <IconButton size="small" aria-label="ماه بعد"
                  onClick={() => setCursor((value) => shiftJalaliMonth(value.jy, value.jm, 1))}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                size="small"
                variant="outlined"
                startIcon={<TodayIcon fontSize="small" />}
                onClick={() => {
                  const now = jalaliToday();
                  if (now) setCursor(now);
                  setSelected(todayIso());
                }}
                sx={{ height: 28, fontSize: 10.5 }}
              >
                امروز
              </Button>
              <Box sx={{ flex: 1 }} />
              {[
                { key: 'events', label: 'رویداد' },
                { key: 'tasks', label: 'وظیفه' },
                { key: 'notes', label: 'یادداشت' },
              ].map((item) => {
                const count = Number((data.counts || {})[item.key] || 0);
                if (!count) return null;
                return (
                  <Chip
                    key={item.key}
                    size="small"
                    label={`${toPersianDigits(count)} ${item.label}`}
                    sx={{ height: 20, fontSize: 9.5, fontWeight: 800 }}
                  />
                );
              })}
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{
            borderRadius: theme.radii.large, border: '1px solid', borderColor: theme.cardBorderColor,
            bgcolor: 'background.paper', overflow: 'hidden',
            opacity: calendarQuery.isFetching ? 0.75 : 1, transition: 'opacity .15s ease',
          }}>
            <Box sx={{
              display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              borderBottom: '1px solid', borderColor: 'divider',
              bgcolor: alpha(theme.tones.neutral, 0.04),
            }}>
              {WEEKDAYS.map((day) => (
                <Typography key={day} sx={{
                  py: 0.5, textAlign: 'center', fontSize: 9.5, fontWeight: 800,
                  color: theme.tones.muted,
                }}>
                  {day}
                </Typography>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {grid.cells.map((cell) => {
                const { items, hidden } = cellChips(cell.iso);
                const active = selected === cell.iso;
                return (
                  <Box
                    key={cell.iso}
                    role="button"
                    tabIndex={0}
                    aria-label={`روز ${cell.jd} ${JALALI_MONTHS[cell.jm - 1]}`}
                    onClick={() => setSelected(cell.iso)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setSelected(cell.iso);
                    }}
                    sx={{
                      minHeight: 62, p: 0.4, cursor: 'pointer', position: 'relative',
                      borderInlineEnd: '1px solid', borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: active
                        ? alpha(theme.accent, 0.12)
                        : (items.length
                          ? alpha(theme.accent, 0.05)
                          : (cell.inMonth ? 'transparent' : alpha(theme.tones.neutral, 0.05))),
                      '&:hover': { bgcolor: alpha(theme.accent, 0.08) },
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{
                        fontSize: 10.5, fontWeight: 900,
                        color: cell.isToday
                          ? theme.accent
                          : (cell.inMonth ? theme.tones.text : theme.tones.muted),
                      }}>
                        {toPersianDigits(cell.jd)}
                      </Typography>
                      {cell.isToday ? (
                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: theme.accent }} />
                      ) : null}
                    </Stack>
                    <Stack spacing={0.15} sx={{ mt: 0.25 }}>
                      {items.slice(0, 2).map((item) => (
                        <Stack key={item.key} direction="row" spacing={0.3} alignItems="center">
                          <Box sx={{
                            width: 5, height: 5, borderRadius: '50%',
                            bgcolor: chipColor(item), flexShrink: 0,
                          }} />
                          <Typography noWrap sx={{ fontSize: 8, color: theme.tones.muted }}>
                            {item.row.title || '—'}
                          </Typography>
                        </Stack>
                      ))}
                      {hidden > 0 ? (
                        <Typography sx={{ fontSize: 8, color: theme.accent, fontWeight: 800 }}>
                          {`+${toPersianDigits(hidden)}`}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Box>



        <Paper elevation={0} sx={{
          p: 1, borderRadius: theme.radii.large, border: '1px solid', borderColor: theme.cardBorderColor,
          bgcolor: 'background.paper', minWidth: 0,
          position: { lg: 'sticky' }, top: { lg: 8 },
          maxHeight: { lg: 'calc(100vh - 210px)' }, overflowY: { lg: 'auto' },
        }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: theme.tones.text }}>
              {`${selectedWeekday} ${jalaliDayLabel(selected)}`}
            </Typography>
            <Typography sx={{ fontSize: 9.5, color: theme.tones.muted }}>
              {`${toPersianDigits(dayEvents.length + dayTasks.length + dayNotes.length)} مورد`}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
            <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />}
              onClick={() => openEventNew(selected)}
              sx={{ fontSize: 10, py: 0.2, px: 1 }}>
              رویداد
            </Button>
            <Button size="small" variant="outlined" startIcon={<TaskAltOutlinedIcon fontSize="small" />}
              onClick={() => onCreateTask?.(selected)}
              sx={{ fontSize: 10, py: 0.2, px: 1 }}>
              وظیفه
            </Button>
            <Button size="small" variant="text" startIcon={<StickyNote2OutlinedIcon fontSize="small" />}
              onClick={() => onCreateNote?.()}
              sx={{ fontSize: 10, py: 0.2, px: 0.75 }}>
              یادداشت
            </Button>
          </Stack>

          <Stack spacing={0.5} sx={{ mt: 1 }}>

            {dayEvents.map((row) => {
              const meta = EVENT_KIND_META[row.kind] || EVENT_KIND_META.event;
              const color = row.color || toneColor(theme, meta.tone);
              return (
                <Box key={`event-${row.id}`} sx={{
                  p: 0.6, borderRadius: theme.radii.medium, border: '1px solid',
                  borderColor: alpha(color, 0.3), bgcolor: alpha(color, 0.05),
                }}>
                  <Stack direction="row" spacing={0.4} alignItems="flex-start">
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, mt: 0.6 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{
                        fontSize: 10.5, fontWeight: 800, color: theme.tones.text,
                        textDecoration: row.is_done ? 'line-through' : 'none',
                      }}>
                        {row.title}
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: theme.tones.muted }}>
                        {[meta.label, timeText(row.start_time),
                          row.task_title ? `وظیفه: ${row.task_title}` : '',
                          row.note_title ? `یادداشت: ${row.note_title}` : '']
                          .filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0} justifyContent="flex-end">
                    <Tooltip title={row.is_done ? 'بازگرداندن' : 'انجام شد'}>
                      <IconButton size="small" aria-label={`تغییر وضعیت رویداد ${row.title}`}
                        onClick={() => toggleEvent.mutate(row)}
                        sx={{ p: 0.25, color: row.is_done ? theme.tones.success : theme.tones.muted }}>
                        <TaskAltOutlinedIcon sx={{ fontSize: 14, opacity: row.is_done ? 1 : 0.5 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ویرایش رویداد">
                      <IconButton size="small" aria-label={`ویرایش رویداد ${row.title}`}
                        onClick={() => openEventEdit(row)} sx={{ p: 0.25 }}>
                        <EditOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف رویداد">
                      <IconButton size="small" aria-label={`حذف رویداد ${row.title}`}
                        onClick={() => removeEventWithConfirm(row)}
                        sx={{ p: 0.25, color: theme.tones.danger }}>
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              );
            })}

            {dayTasks.map((row) => {
              const meta = TASK_STATUS_META[row.status] || TASK_STATUS_META.todo;
              const color = toneColor(theme, taskTone(row));
              return (
                <Box key={`task-${row.id}`} sx={{
                  p: 0.6, borderRadius: theme.radii.medium, border: '1px solid',
                  borderColor: alpha(color, 0.3), bgcolor: alpha(color, 0.04),
                }}>
                  <Stack direction="row" spacing={0.4} alignItems="flex-start">
                    <TaskAltOutlinedIcon sx={{ fontSize: 14, color, mt: 0.3, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{
                        fontSize: 10.5, fontWeight: 800, color: theme.tones.text,
                        textDecoration: row.status === 'done' ? 'line-through' : 'none',
                      }}>
                        {row.title}
                      </Typography>
                      <Typography sx={{ fontSize: 9, color: theme.tones.muted }}>
                        {[meta.label, TASK_PRIORITY_META[row.priority]?.label,
                          row.due_time ? `ساعت ${timeText(row.due_time)}` : '']
                          .filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0} justifyContent="flex-end">
                    <Tooltip title={row.status === 'done' ? 'بازگرداندن' : 'انجام شد'}>
                      <IconButton size="small" aria-label={`تغییر وضعیت وظیفه ${row.title}`}
                        onClick={() => onToggleTask?.(row)}
                        sx={{ p: 0.25, color: row.status === 'done' ? theme.tones.success : theme.tones.muted }}>
                        <TaskAltOutlinedIcon sx={{ fontSize: 14, opacity: row.status === 'done' ? 1 : 0.5 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ویرایش وظیفه">
                      <IconButton size="small" aria-label={`ویرایش وظیفه ${row.title}`}
                        onClick={() => openTask(row)} sx={{ p: 0.25 }}>
                        <EditOutlinedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              );
            })}


            {dayNotes.map((row) => (
              <Box key={`note-${row.id}`} sx={{
                p: 0.6, borderRadius: theme.radii.medium, border: '1px solid',
                borderColor: 'divider', bgcolor: alpha(theme.tones.neutral, 0.03),
              }}>
                <Stack direction="row" spacing={0.4} alignItems="center">
                  <Box sx={{
                    width: 6, height: 6, borderRadius: '50%',
                    bgcolor: row.color || theme.tones.neutral, flexShrink: 0,
                  }} />
                  <Typography sx={{ flex: 1, fontSize: 10.5, fontWeight: 700, color: theme.tones.text }}>
                    {row.title || 'بدون عنوان'}
                  </Typography>
                  <IconButton size="small" aria-label={`ویرایش یادداشت ${row.title}`}
                    onClick={() => openNote(row)} sx={{ p: 0.25 }}>
                    <EditOutlinedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
              </Box>
            ))}

            {!dayEvents.length && !dayTasks.length && !dayNotes.length ? (
              <Typography sx={{ fontSize: 10, color: theme.tones.muted, textAlign: 'center', py: 1.5 }}>
                برای این روز چیزی ثبت نشده است.
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      </Box>

      <EventDialog
        open={eventOpen}
        form={eventForm}
        setForm={setEventForm}
        onClose={() => setEventOpen(false)}
        onSave={() => saveEvent.mutate()}
        saving={saveEvent.isPending}
        theme={theme}
        tasks={linkOptions.tasks}
        notes={linkOptions.notes}
      />
    </Box>
  );
};

export default PlanningCalendarView;

