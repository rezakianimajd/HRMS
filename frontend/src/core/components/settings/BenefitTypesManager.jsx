import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Grid, IconButton, Paper, Snackbar, Stack, Switch,
  TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import fetchAllPages from '../../api/fetchAllPages';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';
import axiosInstance from '../../api/axiosConfig';
import JalaliDatePicker from '../ui/JalaliDatePicker';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTableState, useModuleTheme, useRowHeight,
} from '../../../pages/contracts/contractModuleUi';

const ACCENT = '#8b5cf6';
const BLUE = '#2563eb';
const TEAL = '#0f766e';
const AMBER = '#b45309';
const RED = '#be123c';
const INK = '#1e293b';
const MUTED = '#64748b';

const URGENCY_META = {
  today: { label: 'امروز', color: RED },
  soon: { label: 'نزدیک', color: AMBER },
  upcoming: { label: 'پیش‌رو', color: BLUE },
  later: { label: 'دور', color: TEAL },
  unset: { label: 'بدون تاریخ', color: MUTED },
};

const EMPTY_FORM = {
  id: null,
  code: '',
  title: '',
  suggested_date: '',
  note: '',
  is_active: true,
};

const daysLabel = (days) => {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'امروز';
  return `${toPersianDigits(days)} روز`;
};

/** مدیریت تعاریف اولیهٔ «انواع مزایا» (کد، عنوان و تاریخ پیشنهادی). */
const BenefitTypesManager = () => {
  const qc = useQueryClient();
  const moduleTheme = useModuleTheme();
  const pageSize = moduleTheme.tableTheme.rowsPerPage;

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [dateFilter, setDateFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const query = useQuery({
    queryKey: ['benefit-type-definitions'],
    queryFn: () => fetchAllPages('/benefit-type-definitions/'),
    staleTime: 60 * 1000,
  });
  const rows = useMemo(
    () => (Array.isArray(query.data) ? query.data : []),
    [query.data],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (dateFilter === 'with' && !row.suggested_date) return false;
      if (dateFilter === 'missing' && row.suggested_date) return false;
      if (!term) return true;
      return [row.code, row.title, row.note].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
    return [...result].sort((a, b) => {
      if (sortBy === 'code') return String(a.code || '').localeCompare(String(b.code || ''));
      if (sortBy === 'date') {
        const left = a.days_remaining;
        const right = b.days_remaining;
        if (left === null || left === undefined) return 1;
        if (right === null || right === undefined) return -1;
        return left - right;
      }
      return String(a.title || '').localeCompare(String(b.title || ''), 'fa');
    });
  }, [rows, search, sortBy, dateFilter]);

  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    filtered.length, pageSize, [search, sortBy, dateFilter, pageSize],
  );
  const pagedRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);

  const summary = useMemo(() => {
    const withDate = rows.filter((row) => row.suggested_date).length;
    const soon = rows.filter((row) => ['today', 'soon'].includes(row.urgency)).length;
    return { total: rows.length, withDate, withoutDate: rows.length - withDate, soon };
  }, [rows]);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['benefit-type-definitions'] });
    qc.invalidateQueries({ queryKey: ['benefit-types-upcoming'] });
  };

  const save = useMutation({
    mutationFn: (payload) => {
      const body = {
        code: String(payload.code || '').trim(),
        title: String(payload.title || '').trim(),
        suggested_date: payload.suggested_date || null,
        note: String(payload.note || '').trim(),
        is_active: payload.is_active !== false,
      };
      return payload.id
        ? axiosInstance.patch(`/benefit-type-definitions/${payload.id}/`, body)
        : axiosInstance.post('/benefit-type-definitions/', body);
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setError('');
      setToast('نوع مزایا ذخیره شد');
    },
    onError: (requestError) => {
      const body = requestError.response?.data;
      const first = typeof body === 'string'
        ? body
        : Array.isArray(body)
          ? body[0]
          : body && Object.values(body).flat()[0];
      setError(typeof first === 'string' ? first : 'ذخیرهٔ نوع مزایا انجام نشد.');
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/benefit-type-definitions/${id}/`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      setToast('نوع مزایا حذف شد');
    },
    onError: () => setToast('حذف نوع مزایا انجام نشد'),
  });

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      code: row.code || '',
      title: row.title || '',
      suggested_date: row.suggested_date || '',
      note: row.note || '',
      is_active: row.is_active !== false,
    });
    setError('');
    setDialogOpen(true);
  };

  const submit = () => {
    if (!String(form.code || '').trim()) {
      setError('کد نوع مزایا را وارد کنید.');
      return;
    }
    if (!String(form.title || '').trim()) {
      setError('عنوان نوع مزایا را وارد کنید.');
      return;
    }
    setError('');
    save.mutate(form);
  };

  const activeChips = dateFilter === 'all'
    ? []
    : [{
      key: 'date',
      label: dateFilter === 'with' ? 'دارای تاریخ پیشنهادی' : 'بدون تاریخ پیشنهادی',
      clear: () => setDateFilter('all'),
    }];

  if (query.isLoading) {
    return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }

  return (
    <Box>
      <Paper elevation={0} sx={{
        p: 1.25, mb: 1.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" alignItems="center">
          <Chip size="small" label={`کل انواع: ${formatPersianNumber(summary.total)}`}
            sx={{ height: 22, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }} />
          <Chip size="small" label={`دارای تاریخ پیشنهادی: ${formatPersianNumber(summary.withDate)}`}
            sx={{ height: 22, fontWeight: 800, bgcolor: alpha(BLUE, 0.08), color: BLUE }} />
          <Chip size="small" label={`بدون تاریخ: ${formatPersianNumber(summary.withoutDate)}`}
            sx={{ height: 22, fontWeight: 800, bgcolor: alpha(MUTED, 0.1), color: MUTED }} />
          <Chip size="small" label={`نزدیک (۱۴ روز): ${formatPersianNumber(summary.soon)}`}
            sx={{ height: 22, fontWeight: 800, bgcolor: alpha(AMBER, 0.1), color: AMBER }} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ fontSize: 12, borderRadius: '10px', bgcolor: ACCENT, '&:hover': { bgcolor: '#6d28d9' } }}>
            نوع مزایای جدید
          </Button>
        </Stack>
      </Paper>

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جست‌وجو در کد، عنوان یا توضیحات نوع مزایا…"
        sort={sortBy}
        sortOptions={[
          { value: 'title', label: 'عنوان' },
          { value: 'code', label: 'کد' },
          { value: 'date', label: 'نزدیک‌ترین تاریخ' },
        ]}
        onSort={setSortBy}
        filters={[{
          label: 'تاریخ پیشنهادی',
          value: dateFilter,
          options: [
            { value: 'all', label: 'همه' },
            { value: 'with', label: 'دارای تاریخ' },
            { value: 'missing', label: 'بدون تاریخ' },
          ],
          onChange: setDateFilter,
        }]}
        activeChips={activeChips}
        activeFilterCount={activeChips.length}
        onReset={() => { setSearch(''); setDateFilter('all'); setSortBy('title'); }}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />
      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)', overflow: 'hidden',
        px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <ModuleTable
          tableTheme={moduleTheme.tableTheme}
          ariaLabel="تعاریف انواع مزایا"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={query.isFetching}
          rows={pagedRows}
          rowKey={(row) => row.id}
          onRowClick={openEdit}
          emptyText="نوع مزایایی با این مشخصات پیدا نشد؛ با دکمهٔ «نوع مزایای جدید» اضافه کنید."
          columns={[
            {
              key: 'code',
              label: 'کد',
              width: '16%',
              align: 'center',
              render: (row) => (
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: ACCENT, direction: 'ltr', fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {row.code || '—'}
                </Typography>
              ),
            },
            {
              key: 'title',
              label: 'نوع مزایا',
              width: '26%',
              align: 'right',
              render: (row) => (
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }} title={row.title}>
                    {row.title || '—'}
                  </Typography>
                  {row.note ? (
                    <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }} title={row.note}>{row.note}</Typography>
                  ) : null}
                </Box>
              ),
            },
            {
              key: 'suggested_date',
              label: 'تاریخ پیشنهادی',
              width: '14%',
              align: 'center',
              render: (row) => (
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: row.suggested_date_jalali ? INK : MUTED }}>
                  {row.suggested_date_jalali || '—'}
                </Typography>
              ),
            },
            {
              key: 'next_date',
              label: 'رخداد بعدی',
              width: '14%',
              align: 'center',
              render: (row) => (
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: row.next_date_jalali ? INK : MUTED }}>
                  {row.next_date_jalali || '—'}
                </Typography>
              ),
            },
            {
              key: 'days_remaining',
              label: 'روزهای مانده',
              width: '12%',
              align: 'center',
              render: (row) => {
                const meta = URGENCY_META[row.urgency] || URGENCY_META.unset;
                if (row.days_remaining === null || row.days_remaining === undefined) {
                  return <Typography sx={{ fontSize: 11, color: MUTED }}>—</Typography>;
                }
                return (
                  <Chip
                    size="small"
                    label={daysLabel(row.days_remaining)}
                    sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(meta.color, 0.09), color: meta.color }}
                  />
                );
              },
            },
            {
              key: 'status',
              label: 'وضعیت',
              width: '10%',
              align: 'center',
              render: (row) => {
                if (!row.is_active) {
                  return <Chip size="small" label="غیرفعال" sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(MUTED, 0.12), color: MUTED }} />;
                }
                const meta = URGENCY_META[row.urgency] || URGENCY_META.unset;
                return (
                  <Chip size="small" label={meta.label}
                    sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(meta.color, 0.09), color: meta.color }} />
                );
              },
            },
            {
              key: 'actions',
              label: 'عملیات',
              width: '8%',
              align: 'center',
              render: (row) => (
                <Stack direction="row" spacing={0.1} justifyContent="center"
                  onClick={(event) => event.stopPropagation()}>
                  <Tooltip title="ویرایش">
                    <IconButton size="small" aria-label="ویرایش" onClick={() => openEdit(row)}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" aria-label="حذف" onClick={() => setDeleteTarget(row)}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ),
            },
          ]}
        />
        <ModulePager
          tableTheme={moduleTheme.tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={filtered.length}
          pageSize={pageSize}
          unit="نوع مزایا"
        />
      </Paper>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden', bgcolor: '#f8fafc' } }}>
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 2.2, py: 1.5,
          bgcolor: '#fff', borderBottom: '1px solid #e8edf4',
        }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '11px', flexShrink: 0,
            display: 'grid', placeItems: 'center', color: '#fff',
            background: `linear-gradient(140deg, ${ACCENT}, ${alpha(ACCENT, 0.72)})`,
            boxShadow: `0 8px 20px ${alpha(ACCENT, 0.28)}`,
          }}>
            <EventAvailableIcon sx={{ fontSize: 19 }} />
          </Box>
          <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 900, color: INK }}>
            {form.id ? 'ویرایش نوع مزایا' : 'نوع مزایای جدید'}
          </Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)} aria-label="بستن">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Grid container spacing={1.4}>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                label="کد *"
                value={form.code}
                onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value }))}
                inputProps={{ dir: 'ltr' }}
              />
            </Grid>
            <Grid item xs={12} md={7}>
              <TextField
                fullWidth
                size="small"
                label="نوع مزایا *"
                value={form.title}
                onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <JalaliDatePicker
                fullWidth
                label="تاریخ پیشنهادی"
                value={form.suggested_date}
                onChange={(value) => setForm((previous) => ({ ...previous, suggested_date: value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={(
                  <Switch
                    checked={form.is_active !== false}
                    onChange={(event) => setForm((previous) => ({ ...previous, is_active: event.target.checked }))}
                  />
                )}
                label={<Typography sx={{ fontSize: 12, color: INK }}>فعال</Typography>}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="توضیحات"
                value={form.note}
                onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))}
              />
            </Grid>
          </Grid>
          {error ? <Alert severity="error" sx={{ mt: 1.5, borderRadius: '10px' }}>{error}</Alert> : null}
        </DialogContent>

        <DialogActions sx={{ px: 2.2, py: 1.3, bgcolor: '#fff', borderTop: '1px solid #e8edf4' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontSize: 12, color: MUTED }}>انصراف</Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            disabled={save.isPending}
            onClick={submit}
            startIcon={save.isPending ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : null}
            sx={{ fontSize: 12, px: 2.6, borderRadius: '11px', bgcolor: ACCENT, '&:hover': { bgcolor: '#6d28d9' } }}
          >
            {save.isPending ? 'در حال ذخیره…' : (form.id ? 'ذخیره تغییرات' : 'افزودن')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 900 }}>حذف نوع مزایا</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            نوع مزایای «{deleteTarget?.title || 'انتخاب‌شده'}» (کد {deleteTarget?.code || '—'}) حذف شود؟
            رکوردهای پرداخت ثبت‌شده با این کد تغییر نمی‌کنند.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={remove.isPending}
            onClick={() => remove.mutate(deleteTarget.id)}>
            {remove.isPending ? <CircularProgress size={16} color="inherit" /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>

    </Box>
  );
};

export default BenefitTypesManager;
