import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, Grid, IconButton, MenuItem, Paper, Stack,
  Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NumbersIcon from '@mui/icons-material/Numbers';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { PrintButton } from '../../core/print/PrintButton';
import { ModulePager, ModuleTable, useModuleTheme } from '../contracts/contractModuleUi';
import {
  ACCENT, INCOMING, INTERNAL, OUTGOING, SLATE, WARN, MetaChip, DIRECTION_META, chipSx,
} from './correspondenceUi';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import {
  DEFAULT_TEMPLATE, NUMBER_TOKENS, TEMPLATE_PRESETS, localPreview, renderNumber,
  seriesStatus, validateTemplate,
} from './correspondenceNumbering';

/**
 * تعاریف اولیه و شماره‌گذاری مکاتبات اداری.
 *
 * هر «گروه شماره‌گذاری» یک نوع شماره‌گذاری است (مثلاً مکاتبات مؤسسه و مکاتبات
 * دانشگاه) با الگوی دلخواه (تک‌قسمتی یا چندقسمتی، حروف فارسی + اعداد)، شماره
 * شروع، شمارهٔ فعلی/آخرین شمارهٔ زده‌شده و سقف اختیاری. در دیالوگ ثبت نامهٔ
 * صادره همین گروه انتخاب و شمارهٔ بعدی به‌صورت خودکار پیشنهاد می‌شود.
 */

const PAGE_SIZE = 25;
const QUERY_KEY = ['correspondence-series'];

const DIRECTION_COLORS = { incoming: INCOMING, outgoing: OUTGOING, internal: INTERNAL };

const EMPTY_FORM = {
  id: null,
  title: '',
  direction: 'outgoing',
  description: '',
  prefix: '',
  template: DEFAULT_TEMPLATE,
  start_number: 1,
  last_number: '',
  end_number: '',
  padding: 3,
  reset_yearly: true,
  is_default: false,
  is_active: true,
};

const asList = (data) => (Array.isArray(data) ? data : (data?.results || []));

const apiError = (error, fallback = 'خطا در انجام عملیات') => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  const labels = {
    title: 'عنوان گروه', direction: 'جهت', template: 'قالب شماره', prefix: 'پیشوند',
    start_number: 'شماره شروع', last_number: 'آخرین شماره', end_number: 'تا شماره',
    padding: 'تعداد رقم',
  };
  const first = Object.entries(data)[0];
  if (!first) return fallback;
  const [field, value] = first;
  const message = Array.isArray(value) ? value[0] : value;
  return `${labels[field] || field}: ${message}`;
};

const toForm = (row) => {
  if (!row) return { ...EMPTY_FORM };
  const start = Math.max(1, Number(row.start_number) || 1);
  const next = Math.max(start, Number(row.next_number) || start);
  return {
    ...EMPTY_FORM,
    id: row.id,
    title: row.title || '',
    direction: row.direction || 'outgoing',
    description: row.description || '',
    prefix: row.prefix || '',
    template: row.template || DEFAULT_TEMPLATE,
    start_number: start,
    last_number: next > start ? next - 1 : '',
    end_number: row.end_number ?? '',
    padding: row.padding ?? 3,
    reset_yearly: row.reset_yearly !== false,
    is_default: Boolean(row.is_default),
    is_active: row.is_active !== false,
  };
};

const buildPayload = (form) => {
  const payload = {
    title: (form.title || '').trim(),
    direction: form.direction,
    description: form.description || '',
    prefix: form.prefix || '',
    template: (form.template || '').trim(),
    start_number: Math.max(1, Number(form.start_number) || 1),
    padding: Math.max(0, Math.min(Number(form.padding) || 0, 6)),
    reset_yearly: Boolean(form.reset_yearly),
    is_default: Boolean(form.is_default),
    is_active: form.is_active !== false,
  };
  if (form.end_number !== '' && form.end_number != null) {
    payload.end_number = Math.max(1, Number(form.end_number) || 1);
  } else {
    payload.end_number = null;
  }
  if (form.last_number !== '' && form.last_number != null) {
    payload.last_number = Math.max(1, Number(form.last_number) || 1);
  }
  return payload;
};

/** پیش‌نمایش شماره با مقدار فعلی فرم (بدون سرور) */
const formPreview = (form) => {
  const start = Math.max(1, Number(form.start_number) || 1);
  const lastUsed = form.last_number === '' ? start - 1 : Math.max(0, Number(form.last_number) || 0);
  const next = Math.max(start, lastUsed + 1);
  return {
    next,
    number: renderNumber(form.template, {
      prefix: form.prefix,
      seq: next,
      padding: form.padding,
    }),
  };
};

/* ---------------------------------------------------------------- فرم گروه */
const SeriesDialog = ({ open, initial, onClose, onSaved }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(toForm(initial));
  const [error, setError] = useState('');
  const templateError = validateTemplate(form.template);
  const preview = formPreview(form);
  const directionColor = DIRECTION_COLORS[form.direction] || ACCENT;

  useEffect(() => {
    if (open) {
      setForm(toForm(initial));
      setError('');
    }
  }, [open, initial]);

  const save = useMutation({
    mutationFn: (payload) => {
      const body = buildPayload(payload);
      return payload.id
        ? axiosInstance.patch(`/letter-series/${payload.id}/`, body)
        : axiosInstance.post('/letter-series/', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      onSaved?.();
      onClose?.();
    },
    onError: (err) => setError(apiError(err, 'خطا در ذخیرهٔ گروه شماره‌گذاری')),
  });

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const insertToken = (token) => setForm((prev) => ({ ...prev, template: `${prev.template || ''}${token}` }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0.75 }}>
        {form.id ? 'ویرایش گروه شماره‌گذاری' : 'گروه شماره‌گذاری جدید'}
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
          هر گروه یک «نوع شماره‌گذاری» است؛ مثلاً مکاتبات مؤسسه و مکاتبات دانشگاه می‌توانند
          الگو، پیشوند و شمارش جداگانه داشته باشند.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.75}>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: directionColor, mb: 1 }}>
              مشخصات گروه
            </Typography>
            <Grid container spacing={1.25}>
              <Grid item xs={12} md={6}>
                <TextField size="small" fullWidth required label="عنوان گروه"
                  placeholder="مثلاً مکاتبات صادرهٔ مؤسسه"
                  value={form.title} onChange={set('title')} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select size="small" fullWidth label="جهت مکاتبه"
                  value={form.direction} onChange={set('direction')}>
                  <MenuItem value="outgoing">صادره</MenuItem>
                  <MenuItem value="incoming">وارده</MenuItem>
                  <MenuItem value="internal">داخلی</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField size="small" fullWidth label="پیشوند"
                  placeholder="مثلاً ص م یا دانشگاه"
                  value={form.prefix} onChange={set('prefix')} />
              </Grid>
              <Grid item xs={12}>
                <TextField size="small" fullWidth label="توضیح / کاربرد"
                  placeholder="این گروه برای چه مکاتباتی استفاده می‌شود؟"
                  value={form.description} onChange={set('description')} />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: directionColor, mb: 1 }}>
              الگوی شماره (تک‌قسمتی یا چندقسمتی، حروف فارسی و اعداد)
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
              {NUMBER_TOKENS.map((token) => (
                <Chip key={token.value} size="small" label={token.label} title={token.hint}
                  onClick={() => insertToken(token.value)}
                  sx={{ ...chipSx(directionColor), cursor: 'pointer' }} />
              ))}
            </Stack>
            <TextField size="small" fullWidth label="قالب شماره"
              value={form.template} onChange={set('template')}
              error={Boolean(templateError)}
              helperText={templateError || 'توکن‌ها با کلیک روی چیپ‌ها اضافه می‌شوند؛ متن فارسی هم مجاز است.'} />
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {TEMPLATE_PRESETS.map((preset) => (
                <Chip key={preset.value} size="small" variant="outlined"
                  label={preset.label}
                  onClick={() => setForm((prev) => ({ ...prev, template: preset.value }))}
                  sx={{ fontSize: 10.5 }} />
              ))}
            </Stack>
            <Paper elevation={0} sx={{
              mt: 1.25, px: 1.5, py: 1, borderRadius: 'var(--hrms-info-card-radius, 12px)',
              border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover',
              display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
            }}>
              <AutoAwesomeIcon sx={{ fontSize: 16, color: directionColor }} />
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>پیش‌نمایش شمارهٔ بعدی:</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                {preview.number || '—'}
              </Typography>
            </Paper>
          </Box>


          <Divider />

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: directionColor, mb: 1 }}>
              شمارش
            </Typography>
            <Grid container spacing={1.25}>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth type="number" label="شماره شروع"
                  inputProps={{ min: 1 }} value={form.start_number} onChange={set('start_number')}
                  helperText="از این شماره شروع می‌شود"
                  FormHelperTextProps={{ sx: { fontSize: 10 } }} />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth type="number" label="آخرین شمارهٔ زده‌شده"
                  inputProps={{ min: 0 }} value={form.last_number} onChange={set('last_number')}
                  placeholder="خالی = هنوز شروع نشده"
                  helperText="شمارهٔ بعدی، یکی بعد از این است"
                  FormHelperTextProps={{ sx: { fontSize: 10 } }} />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth type="number" label="تا شماره (سقف اختیاری)"
                  inputProps={{ min: 1 }} value={form.end_number} onChange={set('end_number')}
                  helperText="فقط برای هشدار"
                  FormHelperTextProps={{ sx: { fontSize: 10 } }} />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth type="number" label="تعداد رقم شماره"
                  inputProps={{ min: 0, max: 6 }} value={form.padding} onChange={set('padding')}
                  helperText={`مثال: ۳ → ${String(preview.next).padStart(3, '0')}`}
                  FormHelperTextProps={{ sx: { fontSize: 10 } }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Switch size="small" checked={form.reset_yearly}
                    onChange={(event) => setForm((prev) => ({ ...prev, reset_yearly: event.target.checked }))} />}
                  label={<Typography sx={{ fontSize: 12 }}>شمارش سالانه از «شماره شروع» از نو آغاز شود</Typography>}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Switch size="small" checked={form.is_default}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_default: event.target.checked }))} />}
                  label={<Typography sx={{ fontSize: 12 }}>گروه پیش‌فرض این جهت (در فرم نامه انتخاب‌شده باشد)</Typography>}
                />
              </Grid>
            </Grid>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={save.isPending}>انصراف</Button>
        <Button
          variant="contained"
          disabled={!form.title || Boolean(templateError) || save.isPending}
          onClick={() => save.mutate(form)}
        >
          {form.id ? 'ذخیره تغییرات' : 'ثبت گروه'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const CorrespondenceNumberingPage = () => {
  const moduleTheme = useModuleTheme();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogRow, setDialogRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const listQuery = useQuery({
    queryKey: [...QUERY_KEY, 'list'],
    queryFn: () => axiosInstance.get('/letter-series/', {
      params: { page_size: 200, ordering: '-is_default,title' },
    }).then((response) => asList(response.data)),
    staleTime: 30_000,
  });
  const rows = listQuery.data || [];
  const refresh = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  const setDefault = useMutation({
    mutationFn: (id) => axiosInstance.post(`/letter-series/${id}/set-default/`),
    onSuccess: () => { refresh(); setToast('گروه پیش‌فرض این جهت به‌روزرسانی شد.'); },
    onError: (err) => setError(apiError(err, 'تعیین گروه پیش‌فرض ممکن نشد')),
  });

  const resetCounter = useMutation({
    mutationFn: (id) => axiosInstance.post(`/letter-series/${id}/reset-counter/`),
    onSuccess: () => { refresh(); setToast('شمارنده روی «شماره شروع» گروه بازنشانی شد.'); },
    onError: (err) => setError(apiError(err, 'بازنشانی شمارنده ممکن نشد')),
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/letter-series/${id}/`),
    onSuccess: () => { refresh(); setDeleteRow(null); setToast('گروه شماره‌گذاری حذف شد.'); },
    onError: (err) => { setDeleteRow(null); setError(apiError(err, 'حذف گروه ممکن نشد')); },
  });

  const counts = useMemo(() => {
    const map = { all: rows.length, outgoing: 0, incoming: 0, internal: 0 };
    rows.forEach((row) => { map[row.direction] = (map[row.direction] || 0) + 1; });
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim();
    return rows.filter((row) => {
      if (directionFilter !== 'all' && row.direction !== directionFilter) return false;
      if (!term) return true;
      return [row.title, row.prefix, row.template, row.description]
        .filter(Boolean)
        .some((value) => String(value).includes(term));
    });
  }, [rows, search, directionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(0); }, [search, directionFilter]);
  useEffect(() => { if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1)); }, [page, totalPages]);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const length = Math.max(0, Math.min(totalPages, start + size) - start);
    return Array.from({ length }, (_unused, index) => start + index);
  }, [page, totalPages]);

  const openCreate = () => { setDialogRow(null); setDialogOpen(true); };
  const openEdit = (row) => { setDialogRow(row); setDialogOpen(true); };


  const columns = useMemo(() => [
    {
      key: 'title', label: 'گروه شماره‌گذاری',
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{row.title}</Typography>
            {row.is_default ? <Chip size="small" label="پیش‌فرض" sx={chipSx(WARN)} /> : null}
            {row.is_active === false ? <Chip size="small" label="غیرفعال" sx={chipSx(SLATE)} /> : null}
          </Stack>
          <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            {row.description || seriesStatus(row)}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'direction', label: 'جهت', width: 96, align: 'center',
      render: (row) => (
        <MetaChip meta={DIRECTION_META[row.direction] || { label: row.direction, color: SLATE }} />
      ),
    },
    {
      key: 'template', label: 'الگوی شماره', width: 220,
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
            {row.template}
          </Typography>
          <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            پیشوند: {row.prefix || '—'} · {formatPersianNumber(row.padding)} رقم
          </Typography>
        </Box>
      ),
    },
    {
      key: 'preview', label: 'پیشنهاد بعدی', width: 148, align: 'center',
      render: (row) => (
        <Tooltip title={seriesStatus(row)}>
          <Typography sx={{
            fontSize: 12, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
            color: row.is_default ? WARN : 'text.primary',
          }}>
            {row.preview || localPreview(row) || '—'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      key: 'next_number', label: 'شماره بعدی', width: 96, align: 'center',
      render: (row) => (
        <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
          {toPersianDigits(row.next_number || 1)}
        </Typography>
      ),
    },
    {
      key: 'letter_count', label: 'نامه‌ها', width: 76, align: 'center',
      render: (row) => (
        <Typography sx={{ fontSize: 11.5 }}>{formatPersianNumber(row.letter_count || 0)}</Typography>
      ),
    },
    {
      key: 'actions', label: 'عملیات', width: 168, align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.25} justifyContent="center">
          <Tooltip title="ویرایش">
            <IconButton size="small" aria-label="ویرایش" onClick={() => openEdit(row)}>
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="پیش‌فرض این جهت">
            <span>
              <IconButton size="small" aria-label="پیش‌فرض" disabled={row.is_default}
                onClick={() => setDefault.mutate(row.id)}>
                <StarIcon sx={{ fontSize: 16, color: row.is_default ? WARN : undefined }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="بازنشانی شمارنده روی شماره شروع">
            <IconButton size="small" aria-label="بازنشانی شمارنده"
              onClick={() => resetCounter.mutate(row.id)}>
              <RestartAltIcon sx={{ fontSize: 16, color: '#b45309' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="حذف">
            <IconButton size="small" aria-label="حذف" onClick={() => setDeleteRow(row)}>
              <DeleteIcon sx={{ fontSize: 16, color: '#be123c' }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [setDefault, resetCounter]);


  return (
    <Box>
      <PageHeader
        icon={<NumbersIcon />}
        title="تعاریف اولیه و شماره‌گذاری مکاتبات"
        subtitle="گروه‌های شماره‌گذاری نامه‌ها (مؤسسه، دانشگاه، …) با الگوی دلخواه، شماره شروع و شمارنده"
        badge={(
          <Chip size="small" label={`${formatPersianNumber(counts.all)} گروه`}
            sx={{ bgcolor: `${ACCENT}18`, color: ACCENT, fontWeight: 800, fontSize: 11 }} />
        )}
        actions={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="بازخوانی">
              <IconButton size="small" aria-label="بازخوانی" onClick={refresh}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <PrintButton target="main" title="گروه‌های شماره‌گذاری" orientation="landscape" label="چاپ" />
            <Button variant="contained" size="small" startIcon={<AddIcon />}
              onClick={openCreate} sx={{ bgcolor: ACCENT }}>
              گروه شماره‌گذاری جدید
            </Button>
          </Stack>
        )}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 1, borderRadius: '12px' }} onClose={() => setError('')}>
          <Typography sx={{ fontSize: 12 }}>{error}</Typography>
        </Alert>
      ) : null}
      {toast ? (
        <Alert severity="success" sx={{ mb: 1, borderRadius: '12px' }} onClose={() => setToast('')}>
          <Typography sx={{ fontSize: 12 }}>{toast}</Typography>
        </Alert>
      ) : null}

      <Box sx={{
        display: 'grid', gap: 1, mb: 1.25,
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
      }}>
        {[
          { key: 'all', label: 'کل گروه‌ها', color: ACCENT },
          { key: 'outgoing', label: 'صادره', color: OUTGOING },
          { key: 'incoming', label: 'وارده', color: INCOMING },
          { key: 'internal', label: 'داخلی', color: INTERNAL },
        ].map((tile) => (
          <Paper key={tile.key} elevation={0} sx={{
            p: 1, minWidth: 0, borderRadius: 'var(--hrms-info-card-radius, 14px)',
            border: '1px solid', borderColor: 'divider',
          }}>
            <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75 }}>{tile.label}</Typography>
            <Typography noWrap sx={{
              fontSize: 16, fontWeight: 900, color: tile.color,
              fontFamily: 'var(--hrms-table-number-font, inherit)',
            }}>
              {formatPersianNumber(counts[tile.key] || 0)}
            </Typography>
          </Paper>
        ))}
      </Box>


      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper', px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}
          alignItems={{ xs: 'stretch', md: 'center' }} useFlexGap sx={{ mb: 1 }}>
          <TextField size="small" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجو: عنوان گروه، پیشوند، الگو یا توضیح…" sx={{ flex: 1, minWidth: 220 }} />
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            {[
              { key: 'all', label: `همه (${formatPersianNumber(counts.all)})` },
              { key: 'outgoing', label: `صادره (${formatPersianNumber(counts.outgoing)})` },
              { key: 'incoming', label: `وارده (${formatPersianNumber(counts.incoming)})` },
              { key: 'internal', label: `داخلی (${formatPersianNumber(counts.internal)})` },
            ].map((chip) => {
              const active = directionFilter === chip.key;
              return (
                <Chip key={chip.key} label={chip.label} onClick={() => setDirectionFilter(chip.key)}
                  sx={{
                    height: 26, fontSize: 11, fontWeight: 700,
                    bgcolor: active ? `${ACCENT}18` : 'transparent',
                    color: active ? ACCENT : 'text.secondary',
                    border: `1px solid ${active ? ACCENT : 'divider'}`,
                  }} />
              );
            })}
          </Stack>
        </Stack>

        {listQuery.isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={26} /></Box>
        ) : (
          <ModuleTable
            tableTheme={moduleTheme.tableTheme}
            columns={columns}
            rows={pageRows}
            rowKey={(row) => row.id}
            onRowClick={openEdit}
            rowHeight={moduleTheme.tableTheme.rowHeight}
            emptyText="گروه شماره‌گذاری ثبت نشده است؛ با «گروه شماره‌گذاری جدید» شروع کنید."
            ariaLabel="فهرست گروه‌های شماره‌گذاری"
            minWidth={1040}
          />
        )}

        <ModulePager
          tableTheme={moduleTheme.tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          unit="گروه"
        />
      </Paper>

      <SeriesDialog
        open={dialogOpen}
        initial={dialogRow}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
      />

      <Dialog open={Boolean(deleteRow)} onClose={() => setDeleteRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>حذف گروه شماره‌گذاری</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5 }}>
            آیا «{deleteRow?.title}» حذف شود؟ نامه‌های شماره‌گذاری‌شده با این گروه حذف نمی‌شوند
            ولی ارتباطشان با گروه قطع می‌شود.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteRow(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={remove.isPending}
            onClick={() => remove.mutate(deleteRow.id)}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CorrespondenceNumberingPage;

