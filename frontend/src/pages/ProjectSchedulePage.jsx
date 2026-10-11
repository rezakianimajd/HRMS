import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, Grid, InputLabel,
  MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import FlagIcon from '@mui/icons-material/Flag';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Legend, BarChart, Bar, Cell,
} from 'recharts';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { getJalaliParts, toJalali } from '../core/utils/dateUtils';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const ROW_H = 34;
const NAME_W = 330;
const ZOOMS = { day: 26, week: 9, month: 3.2 };
const numSx = { direction: 'ltr', textAlign: 'center !important', whiteSpace: 'nowrap', fontFamily: FONT };
const headSx = {
  fontWeight: 800, whiteSpace: 'nowrap', fontSize: 12,
  textAlign: 'center !important', bgcolor: 'rgba(248,250,252,0.9)',
};
const money = (v) => formatPersianNumber(v || 0);
const pct = (v) => (v == null ? '—' : toPersianDigits(String(v)));

const parseDate = (value) => (value ? new Date(`${value}T00:00:00Z`) : null);
const daysBetween = (a, b) => Math.round((b - a) / 86400000);

function buildTimeline(minDate, maxDate) {
  const days = [];
  if (!minDate || !maxDate) return days;
  const cursor = new Date(minDate);
  while (cursor <= maxDate && days.length < 4000) {
    const iso = cursor.toISOString().slice(0, 10);
    const parts = getJalaliParts(iso) || [0, 0, 0];
    days.push({ iso, jy: parts[0], jm: parts[1], jd: parts[2] });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function monthBands(days) {
  const bands = [];
  days.forEach((day) => {
    const last = bands[bands.length - 1];
    if (last && last.jy === day.jy && last.jm === day.jm) {
      last.count += 1;
      return;
    }
    bands.push({ jy: day.jy, jm: day.jm, count: 1 });
  });
  return bands;
}

const ProjectSchedulePage = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const projectId = params.get('project') || '';
  const [tab, setTab] = useState(0);
  const [zoom, setZoom] = useState('month');
  const [asOf, setAsOf] = useState('');
  const [message, setMessage] = useState(null);

  const { data: projects } = useQuery({
    queryKey: ['projects-schedule-list'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  useEffect(() => {
    if (!projectId && projectList.length) {
      setParams({ project: String(projectList[0].id) }, { replace: true });
    }
  }, [projectId, projectList, setParams]);

  const { data: gantt, isLoading: loadingGantt } = useQuery({
    queryKey: ['project-gantt', projectId],
    queryFn: () => axiosInstance.get(`/projects/${projectId}/gantt/`).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: evm } = useQuery({
    queryKey: ['project-evm', projectId, asOf],
    queryFn: () => axiosInstance.get(`/projects/${projectId}/evm/`, {
      params: asOf ? { as_of: asOf } : {},
    }).then(r => r.data),
    enabled: !!projectId && tab === 1,
  });

  const { data: histogram } = useQuery({
    queryKey: ['project-histogram', projectId],
    queryFn: () => axiosInstance.get(`/projects/${projectId}/resource-histogram/`).then(r => r.data),
    enabled: !!projectId && tab === 2,
  });

  const { data: cashflow } = useQuery({
    queryKey: ['project-cashflow', projectId],
    queryFn: () => axiosInstance.get(`/projects/${projectId}/cashflow/`).then(r => r.data),
    enabled: !!projectId && tab === 3,
  });

  const recalc = useMutation({
    mutationFn: () => axiosInstance.post(`/projects/${projectId}/recalculate-schedule/`).then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `زمان‌بندی بازمحاسبه شد — ${toPersianDigits(data.activities)} فعالیت، `
          + `${toPersianDigits(data.critical_count)} بحرانی، پایان پروژه: ${toJalali(data.project_finish)}`,
      });
      qc.invalidateQueries({ queryKey: ['project-gantt', projectId] });
      qc.invalidateQueries({ queryKey: ['project-evm', projectId] });
    },
    onError: (err) => setMessage({
      type: 'error',
      text: err?.response?.data?.detail || 'بازمحاسبهٔ زمان‌بندی ناموفق بود.',
    }),
  });

  const freeze = useMutation({
    mutationFn: () => axiosInstance.post(`/projects/${projectId}/baseline/`, { name: '' }).then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `بیس‌لاین «${data.name}» (نسخهٔ ${toPersianDigits(data.version)}) قفل شد.`,
      });
      qc.invalidateQueries({ queryKey: ['project-gantt', projectId] });
      qc.invalidateQueries({ queryKey: ['project-evm', projectId] });
    },
    onError: (err) => setMessage({
      type: 'error',
      text: err?.response?.data?.detail || 'قفل بیس‌لاین ناموفق بود.',
    }),
  });

  const activities = gantt?.activities || [];
  const counts = gantt?.counts || {};
  const baseline = gantt?.baseline;

  const timeline = useMemo(() => {
    const starts = activities.map(a => parseDate(a.start)).filter(Boolean);
    const finishes = activities.map(a => parseDate(a.finish)).filter(Boolean);
    if (!starts.length || !finishes.length) return { days: [], bands: [], width: 0, min: null, dayWidth: ZOOMS.month };
    const min = new Date(Math.min(...starts.map(d => d.getTime())));
    const max = new Date(Math.max(...finishes.map(d => d.getTime())));
    const days = buildTimeline(min, max);
    const dayWidth = ZOOMS[zoom] || ZOOMS.month;
    return { days, bands: monthBands(days), width: days.length * dayWidth, min, dayWidth };
  }, [activities, zoom]);

  const dayWidth = timeline.dayWidth || ZOOMS.month;

  const barOf = (activity) => {
    const start = parseDate(activity.start);
    const finish = parseDate(activity.finish);
    if (!start || !finish || !timeline.min) return null;
    const offsetDays = daysBetween(timeline.min, start);
    const spanDays = Math.max(1, daysBetween(start, finish) + 1);
    const height = activity.activity_type === 'milestone' ? 10 : 16;
    let baseBar = null;
    if (activity.baseline_start && activity.baseline_finish) {
      const bs = parseDate(activity.baseline_start);
      const bf = parseDate(activity.baseline_finish);
      baseBar = {
        right: daysBetween(timeline.min, bs) * dayWidth,
        width: Math.max(4, (daysBetween(bs, bf) + 1) * dayWidth),
      };
    }
    return {
      right: offsetDays * dayWidth,
      width: activity.activity_type === 'milestone' ? 10 : Math.max(6, spanDays * dayWidth),
      height,
      baseBar,
    };
  };

  return (
    <Box>
      <Paper sx={{
        p: 2.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.12), rgba(14,165,233,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.18)', borderRadius: '12px',
      }}>
        <TimelineIcon sx={{ fontSize: 40, color: '#6d28d9' }} />
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#5b21b6">زمان‌بندی، منابع و EVM</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${toPersianDigits(counts.activities || 0)} فعالیت`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#5b21b6' }} />
            <Chip size="small" label={`${toPersianDigits(counts.critical || 0)} بحرانی`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(239,68,68,0.14)', color: '#b91c1c' }} />
            <Chip size="small" label={`${toPersianDigits(counts.milestones || 0)} نقطهٔ عطف`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
            {baseline ? (
              <Chip size="small" variant="outlined"
                label={`بیس‌لاین: ${baseline.name} (v${toPersianDigits(baseline.version)})`}
                sx={{ fontWeight: 700 }} />
            ) : (
              <Chip size="small" variant="outlined" label="بیس‌لاین ثبت نشده" />
            )}
          </Stack>
        </Box>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>پروژه</InputLabel>
          <Select value={projectId} label="پروژه"
            onChange={e => setParams({ project: e.target.value })}>
            {projectList.map(p => (
              <MenuItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<RefreshIcon />} disabled={!projectId || recalc.isPending}
          onClick={() => recalc.mutate()}
          sx={{ borderRadius: '12px', background: 'linear-gradient(135deg,#8b5cf6,#0ea5e9)' }}>
          بازمحاسبهٔ CPM
        </Button>
        <Button variant="outlined" startIcon={<LockIcon />} disabled={!projectId || freeze.isPending}
          onClick={() => freeze.mutate()} sx={{ borderRadius: '12px' }}>
          قفل بیس‌لاین
        </Button>
      </Paper>

      {message ? (
        <Alert severity={message.type} sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}

      <Paper sx={{ p: 1, mb: 1.5, borderRadius: '12px' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontFamily: FONT, fontWeight: 700, fontSize: 13.5 } }}>
          <Tab label="گانت (RTL شمسی)" />
          <Tab label="EVM و منحنی S" />
          <Tab label="منابع و بیش‌تخصیص" />
          <Tab label="جریان نقدی" />
        </Tabs>
      </Paper>
      {/* ---------------- تب ۰: گانت ---------------- */}
      {tab === 0 && (
        <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} color="#5b21b6">نمودار گانت</Typography>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>بزرگ‌نمایی</InputLabel>
              <Select value={zoom} label="بزرگ‌نمایی" onChange={e => setZoom(e.target.value)}>
                <MenuItem value="day">روزانه</MenuItem>
                <MenuItem value="week">هفتگی</MenuItem>
                <MenuItem value="month">ماهانه</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" spacing={1.2} alignItems="center">
              {[
                ['#ef4444', 'بحرانی'],
                ['#8b5cf6', 'عادی'],
                ['#94a3b8', 'بیس‌لاین'],
              ].map(([color, label]) => (
                <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 12, height: 8, borderRadius: 2, bgcolor: color }} />
                  <Typography variant="caption" sx={{ fontFamily: FONT }}>{label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>

          {loadingGantt ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : activities.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '10px' }}>
              برای این پروژه فعالیتی ثبت نشده است. ابتدا فعالیت‌ها و وابستگی‌ها را تعریف کنید
              (API: <code>/api/activities/</code>) سپس «بازمحاسبهٔ CPM» را بزنید.
            </Alert>
          ) : (
            <Box sx={{ overflowX: 'auto', direction: 'rtl', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px' }}>
              <Box sx={{ width: NAME_W + timeline.width, minWidth: '100%' }}>
                <Stack direction="row" sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: '#fff' }}>
                  <Box sx={{
                    width: NAME_W, position: 'sticky', right: 0, zIndex: 5,
                    bgcolor: 'rgba(248,250,252,0.97)', borderLeft: '1px solid rgba(0,0,0,0.08)',
                    px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 1,
                  }}>
                    <Typography variant="caption" fontWeight={800}>فعالیت</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="caption" fontWeight={800}>مدت</Typography>
                  </Box>
                  <Box sx={{ width: timeline.width, position: 'relative' }}>
                    <Box sx={{ display: 'flex' }}>
                      {timeline.bands.map((band, idx) => (
                        <Box key={`${band.jy}-${band.jm}-${idx}`} sx={{
                          width: band.count * dayWidth, borderLeft: '1px solid rgba(0,0,0,0.08)',
                          textAlign: 'center', py: 0.25, bgcolor: 'rgba(139,92,246,0.05)',
                        }}>
                          <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700 }}>
                            {JALALI_MONTHS[band.jm - 1]} {toPersianDigits(band.jy)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    {zoom === 'day' ? (
                      <Box sx={{ display: 'flex' }}>
                        {timeline.days.map(day => (
                          <Box key={day.iso} sx={{
                            width: dayWidth, textAlign: 'center',
                            borderLeft: '1px solid rgba(0,0,0,0.04)',
                            bgcolor: day.jm % 2 ? 'rgba(248,250,252,0.9)' : 'rgba(255,255,255,0.9)',
                          }}>
                            <Typography sx={{ fontSize: 8 }}>{toPersianDigits(day.jd)}</Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : null}
                  </Box>
                </Stack>
                {(() => {
                  let acc = 0;
                  const bands = timeline.bands.map((b) => {
                    const offset = acc;
                    acc += b.count;
                    return { ...b, offset };
                  });
                  const todayOffset = timeline.min
                    ? daysBetween(timeline.min, parseDate(new Date().toISOString().slice(0, 10)))
                    : -1;
                  return activities.map((activity) => {
                    const bar = barOf(activity);
                    if (!bar) return null;
                    return (
                      <Stack direction="row" key={activity.id} sx={{
                        height: ROW_H, borderTop: '1px solid rgba(0,0,0,0.04)',
                        '&:hover': { bgcolor: 'rgba(139,92,246,0.05)' },
                      }}>
                        <Box sx={{
                          width: NAME_W, position: 'sticky', right: 0, zIndex: 3,
                          bgcolor: 'rgba(255,255,255,0.97)', borderLeft: '1px solid rgba(0,0,0,0.08)',
                          px: 1, display: 'flex', alignItems: 'center', gap: 0.75,
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, direction: 'ltr', minWidth: 46 }}>
                            {toPersianDigits(activity.code)}
                          </Typography>
                          <Tooltip title={activity.wbs_name || ''}>
                            <Typography variant="caption" noWrap sx={{
                              flex: 1, fontFamily: FONT,
                              fontWeight: activity.is_critical ? 800 : 500,
                            }}>
                              {activity.name}
                            </Typography>
                          </Tooltip>
                          {activity.activity_type === 'milestone'
                            ? <FlagIcon sx={{ fontSize: 13, color: '#0ea5e9' }} /> : null}
                          <Typography variant="caption" color="textSecondary" sx={{ direction: 'ltr' }}>
                            {toPersianDigits(activity.duration_days)}ر
                          </Typography>
                        </Box>
                        <Tooltip arrow title={(
                          <Box sx={{ direction: 'rtl', fontFamily: FONT, fontSize: 12 }}>
                            <div>{activity.code} — {activity.name}</div>
                            <div>شروع: {toJalali(activity.start)} | پایان: {toJalali(activity.finish)}</div>
                            <div>
                              مدت: {toPersianDigits(activity.duration_days)} روز کاری | شناوری:{' '}
                              {toPersianDigits(activity.total_float)}
                            </div>
                            <div>
                              پیشرفت: {pct(activity.percent_complete)}٪ | هزینهٔ برنامه: {money(activity.planned_cost)}
                            </div>
                            <div>وضعیت: {activity.is_critical ? 'بحرانی' : 'غیربحرانی'}</div>
                          </Box>
                        )}>
                          <Box sx={{
                            width: timeline.width, position: 'relative',
                            display: 'flex', alignItems: 'center', height: '100%',
                          }}>
                            {bands.map((band, idx) => (
                              <Box key={`line-${idx}`} sx={{
                                position: 'absolute', right: band.offset * dayWidth,
                                width: band.count * dayWidth, height: '100%',
                                borderLeft: '1px solid rgba(0,0,0,0.05)',
                              }} />
                            ))}
                            {todayOffset >= 0 && todayOffset <= timeline.days.length ? (
                              <Box sx={{
                                position: 'absolute', right: todayOffset * dayWidth, top: 0, bottom: 0,
                                width: 0, borderLeft: '1px dashed rgba(239,68,68,0.7)',
                              }} />
                            ) : null}
                            {bar.baseBar ? (
                              <Box sx={{
                                position: 'absolute', right: bar.baseBar.right, width: bar.baseBar.width,
                                height: 3, top: 5, bgcolor: '#94a3b8', borderRadius: 2, opacity: 0.9,
                              }} />
                            ) : null}
                            <Box sx={{
                              position: 'absolute', right: bar.right, width: bar.width, height: bar.height,
                              borderRadius: activity.activity_type === 'milestone' ? '50%' : '6px',
                              bgcolor: activity.is_critical ? '#ef4444' : '#8b5cf6',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.12)', overflow: 'hidden',
                            }}>
                              <Box sx={{
                                position: 'absolute', right: 0, top: 0, bottom: 0,
                                width: `${Math.min(100, activity.percent_complete || 0)}%`,
                                bgcolor: 'rgba(255,255,255,0.55)',
                              }} />
                            </Box>
                          </Box>
                        </Tooltip>
                      </Stack>
                    );
                  });
                })()}

              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* ---------------- تب ۱: EVM و منحنی S ---------------- */}
      {tab === 1 && (
        !evm ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Paper>
        ) : (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#047857">ارزش کسب‌شده (EVM)</Typography>
              <Chip size="small"
                label={`مبنا: ${evm.metrics.source === 'baseline' ? (evm.metrics.baseline_name || 'بیس‌لاین') : 'برنامهٔ فعلی'}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: '#047857' }} />
              <Chip size="small" label={`تا تاریخ: ${toJalali(evm.metrics.as_of)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
              {evm.metrics.performance ? (
                <Chip size="small"
                  label={evm.metrics.performance === 'ahead' ? 'جلوتر از برنامه'
                    : evm.metrics.performance === 'behind' ? 'عقب‌تر از برنامه' : 'طبق برنامه'}
                  sx={{
                    fontWeight: 800,
                    bgcolor: evm.metrics.performance === 'behind' ? 'rgba(239,68,68,0.14)' : 'rgba(16,185,129,0.14)',
                    color: evm.metrics.performance === 'behind' ? '#b91c1c' : '#047857',
                  }} />
              ) : null}
            </Stack>

            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {[
                ['BAC (بودجهٔ کل)', money(evm.metrics.bac), '#8b5cf6'],
                ['PV (ارزش برنامه‌ای)', money(evm.metrics.pv), '#0ea5e9'],
                ['EV (ارزش کسب‌شده)', money(evm.metrics.ev), '#10b981'],
                ['AC (هزینهٔ واقعی)', money(evm.metrics.ac), '#ef4444'],
                ['SV (انحراف زمانی)', money(evm.metrics.sv), evm.metrics.sv >= 0 ? '#047857' : '#b91c1c'],
                ['CV (انحراف هزینه)', money(evm.metrics.cv), evm.metrics.cv >= 0 ? '#047857' : '#b91c1c'],
                ['SPI (شاخص زمان)', pct(evm.metrics.spi), '#6366f1'],
                ['CPI (شاخص هزینه)', pct(evm.metrics.cpi), '#f59e0b'],
                ['EAC (برآورد نهایی)', money(evm.metrics.eac), '#7c3aed'],
                ['ETC (باقی‌مانده)', money(evm.metrics.etc), '#0891b2'],
                ['VAC (انحراف نهایی)', money(evm.metrics.vac), evm.metrics.vac >= 0 ? '#047857' : '#b91c1c'],
                ['TCPI', pct(evm.metrics.tcpi), '#ec4899'],
              ].map(([label, value, color]) => (
                <Grid item xs={6} sm={4} md={2} key={label}>
                  <Paper sx={{
                    p: 1.25, borderRadius: '12px', textAlign: 'center',
                    background: `linear-gradient(160deg, ${color}12, rgba(255,255,255,0.7))`,
                    border: `1px solid ${color}22`,
                  }}>
                    <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>{label}</Typography>
                    <Typography variant="subtitle1" fontWeight={900} sx={{ ...numSx, color }}>{value}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#5b21b6">منحنی S (تجمعی، ماه شمسی)</Typography>
                <Chip size="small" label={`پیشرفت فیزیکی: ${pct(evm.metrics.physical_percent)}٪`}
                  sx={{ fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: '#047857' }} />
              </Stack>
              {(!evm.curve || evm.curve.length === 0) ? (
                <Alert severity="info" sx={{ borderRadius: '10px' }}>
                  برای رسم منحنی، فعالیت‌ها باید تاریخ داشته باشند (ابتدا «بازمحاسبهٔ CPM» را بزنید).
                </Alert>
              ) : (
                <Box sx={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evm.curve} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                      <XAxis dataKey="month_short" reversed tick={{ fontSize: 11 }}
                        tickFormatter={(v) => toPersianDigits(String(v))} />
                      <YAxis orientation="right" tick={{ fontSize: 11 }} width={90}
                        tickFormatter={(v) => formatPersianNumber(v)} />
                      <ReTooltip
                        formatter={(v) => formatPersianNumber(v)}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.month_label
                          || toPersianDigits(String(label))}
                        contentStyle={{ direction: 'rtl', textAlign: 'right', fontFamily: FONT }} />
                      <Legend align="right" wrapperStyle={{ fontFamily: FONT, direction: 'rtl' }} />
                      <Line type="monotone" dataKey="pv" name="PV (برنامه‌ای)" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ev" name="EV (کسب‌شده)" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ac" name="AC (واقعی)" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>
          </Box>
        )
      )}
      {/* ---------------- تب ۳: جریان نقدی ---------------- */}
      {tab === 3 && (
        !cashflow ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Paper>
        ) : (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0e7490">جریان نقدی پروژه (ماه شمسی)</Typography>
              {cashflow.baseline ? (
                <Chip size="small" label={`مبنا: ${cashflow.baseline}`}
                  sx={{ fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
              ) : null}
              <Chip size="small" label={`پیش‌بینی ورودی: ${money(cashflow.totals?.planned_in)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
              <Chip size="small" label={`واقعی ورودی: ${money(cashflow.totals?.actual_in)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(16,185,129,0.14)', color: '#047857' }} />
              <Chip size="small" label={`واقعی خروجی: ${money(cashflow.totals?.actual_out)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(239,68,68,0.14)', color: '#b91c1c' }} />
              <Chip size="small" label={`خالص واقعی: ${money(cashflow.totals?.net_actual)}`}
                color={(cashflow.totals?.net_actual || 0) >= 0 ? 'success' : 'error'}
                sx={{ fontWeight: 700 }} />
            </Stack>

            {(!cashflow.rows || cashflow.rows.length === 0) ? (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                برای محاسبهٔ جریان نقدی، ابتدا فعالیت‌ها/بیس‌لاین (برای پیش‌بینی) و پرداخت‌ها یا تراکنش‌های هزینه
                (برای واقعی) را ثبت کنید.
              </Alert>
            ) : (
              <React.Fragment>
                <Paper sx={{ p: 2, mb: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
                  <Box sx={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cashflow.rows} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                        <XAxis dataKey="month_short" reversed tick={{ fontSize: 11 }}
                          tickFormatter={(v) => toPersianDigits(String(v))} />
                        <YAxis orientation="right" tick={{ fontSize: 11 }} width={90}
                          tickFormatter={(v) => formatPersianNumber(v)} />
                        <ReTooltip formatter={(v) => formatPersianNumber(v)}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.month_label
                            || toPersianDigits(String(label))}
                          contentStyle={{ direction: 'rtl', textAlign: 'right', fontFamily: FONT }} />
                        <Legend align="right" wrapperStyle={{ fontFamily: FONT, direction: 'rtl' }} />
                        <Line type="monotone" dataKey="cum_inflow_planned" name="ورودی برنامه‌ای (تجمعی)"
                          stroke="#0ea5e9" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cum_inflow_actual" name="ورودی واقعی (تجمعی)"
                          stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cum_outflow_planned" name="خروجی برنامه‌ای (تجمعی)"
                          stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                        <Line type="monotone" dataKey="cum_outflow_actual" name="خروجی واقعی (تجمعی)"
                          stroke="#ef4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>

                <Paper sx={{ p: 1.5, borderRadius: '12px' }}>
                  <TableContainer sx={{ maxHeight: 320 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headSx}>ماه</TableCell>
                          <TableCell sx={headSx}>ورودی برنامه‌ای</TableCell>
                          <TableCell sx={headSx}>ورودی واقعی</TableCell>
                          <TableCell sx={headSx}>خروجی برنامه‌ای</TableCell>
                          <TableCell sx={headSx}>خروجی واقعی</TableCell>
                          <TableCell sx={headSx}>خالص برنامه‌ای</TableCell>
                          <TableCell sx={headSx}>خالص واقعی</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cashflow.rows.slice(-14).map((row) => (
                          <TableRow key={row.month} hover>
                            <TableCell sx={{ fontFamily: FONT, whiteSpace: 'nowrap' }}>{row.month_label}</TableCell>
                            <TableCell sx={numSx}>{money(row.inflow_planned)}</TableCell>
                            <TableCell sx={{ ...numSx, color: '#047857' }}>{money(row.inflow_actual)}</TableCell>
                            <TableCell sx={numSx}>{money(row.outflow_planned)}</TableCell>
                            <TableCell sx={{ ...numSx, color: '#b91c1c' }}>{money(row.outflow_actual)}</TableCell>
                            <TableCell sx={numSx}>{money(row.net_planned)}</TableCell>
                            <TableCell sx={{ ...numSx, fontWeight: 700 }}>{money(row.net_actual)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </React.Fragment>
            )}
          </Box>
        )
      )}

      {tab === 2 && (
        !histogram ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Paper>
        ) : (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0e7490">بار منابع و بیش‌تخصیص</Typography>
              <Chip size="small" label={`${toPersianDigits((histogram.resources || []).length)} منبع`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(8,145,178,0.12)', color: '#0e7490' }} />
              <Chip size="small" label={`بیشترین بار روزانه: ${money(histogram.max_load)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
              <Chip size="small"
                color={(histogram.overallocated || []).length ? 'error' : 'success'}
                label={`${toPersianDigits((histogram.overallocated || []).length)} روز بیش‌تخصیص`}
                sx={{ fontWeight: 700 }} />
            </Stack>

            {(histogram.days || []).length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                برای تحلیل منابع، ابتدا «نرخ منبع» <code>/api/resource-rates/</code> و سپس «تخصیص منابع»
                به فعالیت‌ها <code>/api/resource-assignments/</code> را ثبت کنید و «بازمحاسبهٔ CPM» را بزنید.
              </Alert>
            ) : (
              <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogram.days} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                      <XAxis dataKey="date" reversed tick={{ fontSize: 9 }}
                        tickFormatter={(v) => toJalali(v)} interval="preserveStartEnd" />
                      <YAxis orientation="right" tick={{ fontSize: 10 }} width={60}
                        tickFormatter={(v) => formatPersianNumber(v)} />
                      <ReTooltip formatter={(v) => formatPersianNumber(v)}
                        labelFormatter={(label) => toJalali(label)}
                        contentStyle={{ direction: 'rtl', fontFamily: FONT }} />
                      <Bar dataKey="total" name="بار روزانه" radius={[6, 6, 0, 0]}>
                        {(histogram.days || []).map((day, idx) => (
                          <Cell key={idx} fill="#0891b2" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            )}

            {(histogram.overallocated || []).length ? (
              <Paper sx={{ p: 2, mt: 1.5, borderRadius: '12px' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#b91c1c" sx={{ mb: 1 }}>
                  روزهای بیش‌تخصیص (بار بیشتر از ظرفیت منبع)
                </Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={headSx}>منبع</TableCell>
                        <TableCell sx={headSx}>تاریخ</TableCell>
                        <TableCell sx={headSx}>بار</TableCell>
                        <TableCell sx={headSx}>ظرفیت</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {histogram.overallocated.slice(0, 100).map((row, idx) => (
                        <TableRow key={`${row.resource_id}-${row.date}-${idx}`} hover>
                          <TableCell sx={{ fontFamily: FONT }}>{row.resource}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{toJalali(row.date)}</TableCell>
                          <TableCell sx={{ ...numSx, color: '#b91c1c', fontWeight: 700 }}>{money(row.load)}</TableCell>
                          <TableCell sx={numSx}>{money(row.capacity)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ) : null}
          </Box>
        )
      )}


    </Box>
  );
};

export default ProjectSchedulePage;
