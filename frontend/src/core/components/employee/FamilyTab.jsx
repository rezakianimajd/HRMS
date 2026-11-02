import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Grid, IconButton, Paper, Snackbar, Stack, Switch,
  TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import SyncIcon from '@mui/icons-material/Sync';
import JalaliDatePicker from '../ui/JalaliDatePicker';
import {
  ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
} from '../../../pages/contracts/contractModuleUi';
import {
  useDeleteFamilyMember, useFamilyMembers, useSaveFamilyMember, useSyncFamilyFromInsurance,
} from '../../hooks/useFamilyMembers';
import {
  FAMILY_RELATIONS, familyAgeOf, familyBirthDateLabel, familyFullName, familySearchText,
  familySummary, relationColor, relationLabel, sourceColor, sourceLabel,
} from '../../utils/familyMembers';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';

const ACCENT = '#be185d';
const BLUE = '#2563eb';
const TEAL = '#0f766e';
const VIOLET = '#7c3aed';
const INK = '#1e293b';
const MUTED = '#64748b';

const EMPTY_FORM = {
  id: null,
  first_name: '',
  last_name: '',
  relation: 'spouse',
  national_id: '',
  birth_date: '',
  phone: '',
  is_dependent: true,
  notes: '',
};

const RELATION_FILTER_OPTIONS = [
  { value: 'all', label: 'همه نسبت‌ها' },
  ...FAMILY_RELATIONS.map((item) => ({ value: item.value, label: item.label })),
];

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'همه منابع' },
  { value: 'supplementary_insurance', label: 'از بیمه تکمیلی' },
  { value: 'manual', label: 'ثبت دستی' },
];

/** بخش «خانواده» پروندهٔ پرسنلی: ثبت دستی + انتقال خودکار از بیمهٔ تکمیلی. */
const FamilyTab = ({ employeeId }) => {
  const moduleTheme = useModuleTheme();
  const { data: members = [], isLoading, isFetching } = useFamilyMembers(employeeId);
  const save = useSaveFamilyMember(employeeId);
  const remove = useDeleteFamilyMember(employeeId);
  const sync = useSyncFamilyFromInsurance(employeeId);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('relation');
  const [relationFilter, setRelationFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(() => (Array.isArray(members) ? members : []), [members]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (relationFilter !== 'all' && row.relation !== relationFilter) return false;
      if (sourceFilter === 'supplementary_insurance' && row.source !== 'supplementary_insurance') return false;
      if (sourceFilter === 'manual' && row.source === 'supplementary_insurance') return false;
      if (!term) return true;
      return familySearchText(row).includes(term);
    });
    const relationOrder = FAMILY_RELATIONS.map((item) => item.value);
    return [...result].sort((a, b) => {
      if (sortBy === 'name') return familyFullName(a).localeCompare(familyFullName(b), 'fa');
      if (sortBy === 'age') {
        const left = familyAgeOf(a.birth_date);
        const right = familyAgeOf(b.birth_date);
        if (left === null) return 1;
        if (right === null) return -1;
        return right - left;
      }
      const diff = relationOrder.indexOf(a.relation) - relationOrder.indexOf(b.relation);
      return diff || familyFullName(a).localeCompare(familyFullName(b), 'fa');
    });
  }, [rows, search, relationFilter, sourceFilter, sortBy]);

  const summary = useMemo(() => familySummary(rows), [rows]);
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, filtered.length);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      relation: row.relation || 'spouse',
      national_id: row.national_id || '',
      birth_date: row.birth_date || '',
      phone: row.phone || '',
      is_dependent: row.is_dependent !== false,
      notes: row.notes || '',
    });
    setError('');
    setDialogOpen(true);
  };


  const submit = () => {
    if (!String(form.first_name || '').trim()) {
      setError('نام عضو خانواده الزامی است.');
      return;
    }
    setError('');
    save.mutate(
      {
        id: form.id,
        employee: employeeId,
        first_name: String(form.first_name).trim(),
        last_name: String(form.last_name || '').trim(),
        relation: form.relation,
        national_id: String(form.national_id || '').trim(),
        birth_date: form.birth_date || null,
        phone: String(form.phone || '').trim(),
        is_dependent: form.is_dependent !== false,
        notes: String(form.notes || '').trim(),
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setForm(EMPTY_FORM);
          setToast('عضو خانواده ذخیره شد');
        },
        onError: (requestError) => {
          const body = requestError?.response?.data;
          const first = typeof body === 'string'
            ? body
            : Array.isArray(body)
              ? body[0]
              : body && Object.values(body).flat()[0];
          setError(typeof first === 'string' ? first : 'ذخیرهٔ عضو خانواده انجام نشد.');
        },
      },
    );
  };

  const runSync = () => {
    sync.mutate(undefined, {
      onSuccess: (data) => {
        const created = data?.created || 0;
        setToast(created
          ? `${toPersianDigits(created)} عضو از بیمهٔ تکمیلی به پروندهٔ خانواده اضافه شد`
          : 'همهٔ افراد تحت تکفل بیمهٔ تکمیلی قبلاً در پروندهٔ خانواده ثبت شده‌اند');
      },
      onError: () => setToast('دریافت اطلاعات از بیمهٔ تکمیلی انجام نشد'),
    });
  };

  const activeChips = [
    relationFilter !== 'all'
      ? { key: 'relation', label: `نسبت: ${relationLabel(relationFilter)}`, clear: () => setRelationFilter('all') }
      : null,
    sourceFilter !== 'all'
      ? {
        key: 'source',
        label: `منبع: ${sourceFilter === 'manual' ? 'ثبت دستی' : 'بیمه تکمیلی'}`,
        clear: () => setSourceFilter('all'),
      }
      : null,
  ].filter(Boolean);

  if (isLoading) {
    return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }

  return (
    <Box>
      <Paper elevation={0} sx={{
        p: 1.25, mb: 1.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" alignItems="center">
          <Chip size="small" icon={<FamilyRestroomIcon sx={{ fontSize: 14 }} />}
            label={`اعضای خانواده: ${formatPersianNumber(summary.total)}`}
            sx={{ height: 22, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }} />
          <Chip size="small" label={`تحت تکفل: ${formatPersianNumber(summary.dependents)}`}
            sx={{ height: 22, fontWeight: 800, bgcolor: alpha(TEAL, 0.09), color: TEAL }} />
          <Chip size="small" label={`از بیمه تکمیلی: ${formatPersianNumber(summary.fromInsurance)}`}
            sx={{ height: 22, fontWeight: 800, bgcolor: alpha(VIOLET, 0.1), color: VIOLET }} />
          <Chip size="small" label={`ثبت دستی: ${formatPersianNumber(summary.manual)}`}
            sx={{ height: 22, fontWeight: 800, bgcolor: alpha(BLUE, 0.08), color: BLUE }} />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="انتقال افراد تحت تکفل بیمهٔ تکمیلی به پروندهٔ خانواده">
            <span>
              <Button size="small" variant="outlined"
                startIcon={sync.isPending ? <CircularProgress size={14} /> : <SyncIcon />}
                onClick={runSync} disabled={sync.isPending}
                sx={{ fontSize: 12, borderRadius: '10px', borderColor: alpha(VIOLET, 0.4), color: VIOLET }}>
                دریافت از بیمه تکمیلی
              </Button>
            </span>
          </Tooltip>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ fontSize: 12, borderRadius: '10px', bgcolor: ACCENT, '&:hover': { bgcolor: '#9d174d' } }}>
            عضو خانواده جدید
          </Button>
        </Stack>
      </Paper>

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جست‌وجو در نام، کد ملی، موبایل یا نسبت عضو خانواده…"
        sort={sortBy}
        sortOptions={[
          { value: 'relation', label: 'نسبت' },
          { value: 'name', label: 'نام' },
          { value: 'age', label: 'سن' },
        ]}
        onSort={setSortBy}
        filters={[
          { label: 'نسبت', value: relationFilter, options: RELATION_FILTER_OPTIONS, onChange: setRelationFilter },
          { label: 'منبع ثبت', value: sourceFilter, options: SOURCE_FILTER_OPTIONS, onChange: setSourceFilter },
        ]}
        activeChips={activeChips}
        activeFilterCount={activeChips.length}
        onReset={() => {
          setSearch('');
          setRelationFilter('all');
          setSourceFilter('all');
          setSortBy('relation');
        }}
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
          ariaLabel="اعضای خانوادهٔ پرسنل"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={isFetching}
          rows={filtered}
          rowKey={(row) => row.id}
          onRowClick={openEdit}
          emptyText="برای این پرسنل عضو خانواده‌ای ثبت نشده است؛ با دکمهٔ «عضو خانواده جدید» اضافه کنید یا اطلاعات بیمهٔ تکمیلی را دریافت کنید."
          columns={[
            {
              key: 'name',
              label: 'نام و نام خانوادگی',
              width: '22%',
              align: 'right',
              render: (row) => (
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }} title={familyFullName(row)}>
                    {familyFullName(row)}
                  </Typography>
                  {row.notes ? (
                    <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }} title={row.notes}>{row.notes}</Typography>
                  ) : null}
                </Box>
              ),
            },
            {
              key: 'relation',
              label: 'نسبت',
              width: '13%',
              align: 'center',
              render: (row) => (
                <Chip size="small" label={row.relation_display || relationLabel(row.relation)}
                  sx={{
                    height: 20, fontSize: 10.5, fontWeight: 800,
                    bgcolor: alpha(relationColor(row.relation), 0.1), color: relationColor(row.relation),
                  }} />
              ),
            },
            {
              key: 'national_id',
              label: 'کد ملی',
              width: '13%',
              align: 'center',
              render: (row) => (
                <Typography sx={{
                  fontSize: 11.5, fontWeight: row.national_id ? 700 : 500,
                  color: row.national_id ? INK : MUTED, direction: 'ltr',
                }}>
                  {row.national_id ? toPersianDigits(row.national_id) : '—'}
                </Typography>
              ),
            },
            {
              key: 'birth_date',
              label: 'تاریخ تولد',
              width: '13%',
              align: 'center',
              render: (row) => (
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: row.birth_date ? INK : MUTED }}>
                  {familyBirthDateLabel(row.birth_date)}
                </Typography>
              ),
            },
            {
              key: 'age',
              label: 'سن',
              width: '8%',
              align: 'center',
              render: (row) => {
                const age = row.age ?? familyAgeOf(row.birth_date);
                return (
                  <Typography sx={{
                    fontSize: 11.5, fontWeight: 700,
                    color: age === null || age === undefined ? MUTED : INK,
                  }}>
                    {age === null || age === undefined ? '—' : `${toPersianDigits(age)} سال`}
                  </Typography>
                );
              },
            },
            {
              key: 'phone',
              label: 'موبایل',
              width: '12%',
              align: 'center',
              render: (row) => (
                <Typography sx={{ fontSize: 11.5, color: row.phone ? INK : MUTED, direction: 'ltr' }}>
                  {row.phone ? toPersianDigits(row.phone) : '—'}
                </Typography>
              ),
            },
            {
              key: 'is_dependent',
              label: 'تحت تکفل',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Chip size="small" label={row.is_dependent === false ? 'خیر' : 'بله'}
                  sx={{
                    height: 20, fontSize: 10.5, fontWeight: 800,
                    bgcolor: alpha(row.is_dependent === false ? MUTED : TEAL, 0.1),
                    color: row.is_dependent === false ? MUTED : TEAL,
                  }} />
              ),
            },
            {
              key: 'source',
              label: 'منبع',
              width: '12%',
              align: 'center',
              render: (row) => (
                <Chip size="small" label={row.source_display || sourceLabel(row.source)}
                  sx={{
                    height: 20, fontSize: 10.5, fontWeight: 800,
                    bgcolor: alpha(sourceColor(row.source), 0.09), color: sourceColor(row.source),
                  }} />
              ),
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
      </Paper>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden', bgcolor: '#f8fafc' } }}>
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 2.2, py: 1.5,
          bgcolor: '#fff', borderBottom: '1px solid #e8edf4', fontSize: 13.5, fontWeight: 900, color: ACCENT,
        }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '11px', flexShrink: 0,
            display: 'grid', placeItems: 'center', color: '#fff',
            background: `linear-gradient(140deg, ${ACCENT}, ${alpha(ACCENT, 0.72)})`,
          }}>
            <FamilyRestroomIcon sx={{ fontSize: 18 }} />
          </Box>
          {form.id ? 'ویرایش عضو خانواده' : 'افزودن عضو خانواده'}
        </DialogTitle>
        <DialogContent sx={{ px: 2.2, py: 1.6 }}>
          <Grid container spacing={1.4}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="نام *" value={form.first_name}
                onChange={(event) => setForm((previous) => ({ ...previous, first_name: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="نام خانوادگی" value={form.last_name}
                onChange={(event) => setForm((previous) => ({ ...previous, last_name: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="نسبت" SelectProps={{ native: true }}
                value={form.relation}
                onChange={(event) => setForm((previous) => ({ ...previous, relation: event.target.value }))}>
                {FAMILY_RELATIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="کد ملی" value={form.national_id}
                inputProps={{ maxLength: 10, inputMode: 'numeric', dir: 'ltr' }}
                helperText="اختیاری — ۱۰ رقم"
                onChange={(event) => setForm((previous) => ({ ...previous, national_id: event.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <JalaliDatePicker fullWidth label="تاریخ تولد" value={form.birth_date}
                onChange={(gregorian) => setForm((previous) => ({ ...previous, birth_date: gregorian }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="تلفن همراه" value={form.phone}
                inputProps={{ dir: 'ltr' }}
                onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={(
                  <Switch checked={form.is_dependent !== false}
                    onChange={(event) => setForm((previous) => ({ ...previous, is_dependent: event.target.checked }))} />
                )}
                label={<Typography sx={{ fontSize: 12, color: INK }}>تحت تکفل این پرسنل است</Typography>}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={form.notes}
                onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))} />
            </Grid>
          </Grid>
          {error ? <Alert severity="error" sx={{ mt: 1.4, borderRadius: '10px' }}>{error}</Alert> : null}
        </DialogContent>
        <DialogActions sx={{ px: 2.2, py: 1.3, bgcolor: '#fff', borderTop: '1px solid #e8edf4' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontSize: 12, color: MUTED }}>انصراف</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" onClick={submit} disabled={save.isPending}
            startIcon={save.isPending ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : null}
            sx={{ fontSize: 12, px: 2.6, borderRadius: '11px', bgcolor: ACCENT, '&:hover': { bgcolor: '#9d174d' } }}>
            {save.isPending ? 'در حال ذخیره…' : (form.id ? 'ذخیره تغییرات' : 'افزودن')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 900 }}>حذف عضو خانواده</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            «{deleteTarget ? familyFullName(deleteTarget) : ''}» از پروندهٔ خانوادهٔ این پرسنل حذف شود؟
            {deleteTarget?.source === 'supplementary_insurance'
              ? ' این عضو از بیمهٔ تکمیلی منتقل شده است؛ اطلاعات او در بیمهٔ تکمیلی باقی می‌ماند و فقط از پروندهٔ خانواده پنهان می‌شود.'
              : ''}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={remove.isPending}
            onClick={() => remove.mutate(deleteTarget.id, {
              onSuccess: () => {
                setDeleteTarget(null);
                setToast('عضو خانواده حذف شد');
              },
              onError: () => setToast('حذف عضو خانواده انجام نشد'),
            })}>
            {remove.isPending ? <CircularProgress size={16} color="inherit" /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>



    </Box>
  );
};

export default FamilyTab;

