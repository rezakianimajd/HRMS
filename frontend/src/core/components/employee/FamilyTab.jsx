import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Grid, IconButton, Paper, Snackbar, Stack, Switch,
  TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import JalaliDatePicker from '../ui/JalaliDatePicker';
import {
  ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
} from '../../../pages/contracts/contractModuleUi';
import {
  useDeleteFamilyMember, useFamilyMembers, useSaveFamilyMember,
} from '../../hooks/useFamilyMembers';
import {
  FAMILY_RELATIONS, familyAgeOf, familyBirthDateLabel, familyFullName, familySearchText,
  familySummary, relationColor, relationLabel,
} from '../../utils/familyMembers';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';

const ACCENT = '#be185d';
const BLUE = '#2563eb';
const TEAL = '#0f766e';
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
  attachment: null,
  attachment_url: '',
  attachment_name: '',
  removeAttachment: false,
};

const RELATION_FILTER_OPTIONS = [
  { value: 'all', label: 'همه نسبت‌ها' },
  ...FAMILY_RELATIONS.map((item) => ({ value: item.value, label: item.label })),
];

/** بخش «خانواده» پروندهٔ پرسنلی — تنها مرجع اعضای خانواده و مدارک آن‌ها. */
const FamilyTab = ({ employeeId }) => {
  const moduleTheme = useModuleTheme();
  const { data: members = [], isLoading, isFetching } = useFamilyMembers(employeeId);
  const save = useSaveFamilyMember(employeeId);
  const remove = useDeleteFamilyMember(employeeId);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('relation');
  const [relationFilter, setRelationFilter] = useState('all');
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
  }, [rows, search, relationFilter, sortBy]);

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
      attachment: null,
      attachment_url: row.attachment_url || '',
      attachment_name: row.attachment_name || '',
      removeAttachment: false,
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
        attachment: form.attachment,
        remove_attachment: form.removeAttachment,
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

  const activeChips = [
    relationFilter !== 'all'
      ? { key: 'relation', label: `نسبت: ${relationLabel(relationFilter)}`, clear: () => setRelationFilter('all') }
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
          <Box sx={{ flex: 1 }} />
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
        ]}
        activeChips={activeChips}
        activeFilterCount={activeChips.length}
        onReset={() => {
          setSearch('');
          setRelationFilter('all');
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
          emptyText="برای این پرسنل عضو خانواده‌ای ثبت نشده است؛ با دکمهٔ «عضو خانواده جدید» اضافه کنید."
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
              key: 'attachment',
              label: 'پیوست',
              width: '10%',
              align: 'center',
              render: (row) => (
                row.attachment_url ? (
                  <Tooltip title={row.attachment_name || 'مشاهدهٔ پیوست'}>
                    <IconButton size="small" href={row.attachment_url} target="_blank" rel="noreferrer"
                      aria-label="مشاهدهٔ پیوست">
                      <AttachFileIcon sx={{ fontSize: 16, color: BLUE }} />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Typography sx={{ fontSize: 11, color: MUTED }}>—</Typography>
                )
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
              <Paper variant="outlined" sx={{ p: 1.2, borderRadius: '12px', borderColor: '#e8edf4' }}>
                <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
                  <AttachFileIcon sx={{ fontSize: 18, color: BLUE }} />
                  <Box sx={{ flex: 1, minWidth: 120 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>پیوست مدارک</Typography>
                    <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
                      {form.attachment
                        ? form.attachment.name
                        : (form.attachment_url && !form.removeAttachment
                          ? (form.attachment_name || 'پیوست ثبت‌شده')
                          : 'PDF یا تصویر — حداکثر ۱۰ مگابایت')}
                    </Typography>
                  </Box>
                  {form.attachment_url && !form.removeAttachment ? (
                    <Button size="small" href={form.attachment_url} target="_blank" rel="noreferrer"
                      sx={{ fontSize: 11 }}>مشاهده</Button>
                  ) : null}
                  <Button size="small" component="label" variant="outlined"
                    sx={{ fontSize: 11, borderRadius: '9px' }}>
                    انتخاب فایل
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const ext = `.${String(file.name || '').split('.').pop()?.toLowerCase()}`;
                        if (!['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                          setError('فرمت پیوست باید PDF یا تصویر باشد.');
                          return;
                        }
                        if (Number(file.size) > 10 * 1024 * 1024) {
                          setError('حجم پیوست نباید بیشتر از ۱۰ مگابایت باشد.');
                          return;
                        }
                        setError('');
                        setForm((previous) => ({ ...previous, attachment: file, removeAttachment: false }));
                        event.target.value = '';
                      }}
                    />
                  </Button>
                  {form.attachment || (form.attachment_url && !form.removeAttachment) ? (
                    <IconButton size="small" color="error" aria-label="حذف پیوست"
                      onClick={() => setForm((previous) => ({
                        ...previous, attachment: null, removeAttachment: true,
                      }))}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  ) : null}
                </Stack>
              </Paper>
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

