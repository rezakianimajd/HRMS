import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Drawer, Grid, IconButton, Paper, Snackbar, Stack, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';

import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PageHeader from '../core/components/ui/PageHeader';
import InfoCard from '../core/components/ui/InfoCard';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { KpiTile, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import {
  ModulePager, ModuleTable, ModuleToolbar, moneyCell,
  useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';
import {
  INSURANCE_STATUS, dependentHasAttachment, matchesInsurance,
  statusOf, summarizeInsurances,
} from './supplementaryInsuranceHelpers';
import DependentRows from './supplementaryInsurance/DependentList';
import DependentDialog from './supplementaryInsurance/DependentDialog';
import InsuranceEditorDialog from './supplementaryInsurance/InsuranceEditorDialog';

const ACCENT = '#7c3aed';
const todayIso = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  id: null,
  employee: '',
  insurance_name: '',
  insurance_type: '',
  plan: '',
  start_date: '',
  end_date: '',
  monthly_amount: '',
  total_amount: '',
  dependents: [],
};
const EMPTY_DEP = {
  id: null,
  first_name: '',
  last_name: '',
  relation: 'spouse',
  national_id: '',
  birth_date: '',
  attachment: null,
  attachment_url: '',
  attachment_name: '',
  attachment_size_display: '',
  removeAttachment: false,
};

const money = (value) => `${formatPersianNumber(Number(value) || 0)} ریال`;
const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const InfoLine = ({ label, value, strong, ltr }) => {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ py: 0.38 }}>
      <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{
        fontSize: strong ? 11 : 9.9, fontWeight: strong ? 900 : 700, color: INK,
        textAlign: 'left', direction: ltr ? 'ltr' : 'rtl', minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={typeof display === 'string' ? display : undefined}>
        {display}
      </Typography>
    </Stack>
  );
};

const SectionHeading = ({ icon: Icon, title, hint, color = ACCENT, action }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.8 }}>
    {Icon ? (
      <Box sx={{
        width: 27, height: 27, borderRadius: '8px', color, bgcolor: alpha(color, 0.08),
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 15 }} />
      </Box>
    ) : null}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK }}>{title}</Typography>
      {hint ? <Typography sx={{ fontSize: 10.5, color: MUTED }}>{hint}</Typography> : null}
    </Box>
    {action || null}
  </Stack>
);

const StatusChip = ({ row }) => {
  const status = statusOf(row);
  return <Chip size="small" label={status.label}
    sx={{ height: 21, fontSize: 11, fontWeight: 800, bgcolor: status.bg, color: status.color }} />;
};

const InsuranceDetailDrawer = ({ row, onClose, onEdit, onDelete }) => {
  const theme = useTheme();
  if (!row) return null;
  const status = statusOf(row);
  const dependents = row.dependents || [];
  return (
    <Drawer anchor="left" open={Boolean(row)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, bgcolor: SOFT_BG } }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 1.7, bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <EmployeeAvatar
              employee={{
                full_name: row.employee_name,
                photo_url: row.employee_photo_url,
                gender: row.employee_gender,
              }}
              size={42}
              sx={{ borderRadius: '12px' }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{row.employee_name || '—'}</Typography>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                {toPersianDigits(row.employee_code || '—')}{row.department_name ? ` · ${row.department_name}` : ''}
              </Typography>
            </Box>
            <StatusChip row={row} />
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
          <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={row.insurance_name || 'بیمه تکمیلی'}
              sx={{ height: 21, fontSize: 11, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }} />
            {row.plan ? <Chip size="small" label={row.plan} sx={{ height: 21, fontSize: 11, bgcolor: SOFT_BG, color: MUTED }} /> : null}
            {row.insurance_type ? <Chip size="small" label={row.insurance_type} sx={{ height: 21, fontSize: 11, bgcolor: SOFT_BG, color: MUTED }} /> : null}
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1.4}>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <InfoCard icon={PaymentsIcon} label="مبلغ ماهانه" value={formatPersianNumber(row.monthly_amount || 0)}
                  suffix="ریال" color={ACCENT} variant="compact" surface="tinted" />
              </Grid>
              <Grid item xs={6}>
                <InfoCard icon={PeopleAltIcon} label="افراد تحت تکفل" value={formatPersianNumber(dependents.length)}
                  suffix="نفر" color="#2563eb" variant="compact" surface="tinted" />
              </Grid>
            </Grid>

            <Paper elevation={0} sx={{ p: 1.3, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={HealthAndSafetyIcon} title="پوشش بیمه" color={ACCENT} />
              <InfoLine label="وضعیت" value={status.label} strong />
              <InfoLine label="شروع پوشش" value={dateLabel(row.start_date)} />
              <InfoLine label="پایان پوشش" value={dateLabel(row.end_date)} />
              <InfoLine label="عنوان شغلی" value={row.job_title_name} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.3, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={PaymentsIcon} title="اطلاعات مالی" color="#0f766e" />
              <InfoLine label="مبلغ ماهانه" value={money(row.monthly_amount)} strong />
              <InfoLine label="مبلغ کل" value={money(row.total_amount)} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.3, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={FamilyRestroomIcon} title="افراد تحت تکفل" color="#2563eb"
                action={<Chip size="small" label={`${toPersianDigits(dependents.filter(dependentHasAttachment).length)} پیوست`}
                  sx={{ height: 19, fontSize: 10, bgcolor: alpha('#be123c', 0.06), color: '#be123c' }} />} />
              <DependentRows dependents={dependents} emptyText="برای این بیمه فرد تحت تکفلی ثبت نشده است." />
            </Paper>
          </Stack>
        </Box>

        <Divider />
        <Stack direction="row" spacing={1} sx={{ p: 1.25, bgcolor: theme.palette.background.paper }}>
          <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(row)}>ویرایش</Button>
          <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(row)}>حذف</Button>
        </Stack>
      </Stack>
    </Drawer>
  );
};


const SupplementaryInsurancePage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [attachmentFilter, setAttachmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [depDialog, setDepDialog] = useState(false);
  const [depIndex, setDepIndex] = useState(null);
  const [depForm, setDepForm] = useState(EMPTY_DEP);
  const [depError, setDepError] = useState('');

  const insuranceQuery = useQuery({
    queryKey: ['all-supplementary-insurances'],
    queryFn: () => axiosInstance.get('/supplementary-insurances/').then((response) => response.data),
  });
  const items = useMemo(
    () => (Array.isArray(insuranceQuery.data) ? insuranceQuery.data : insuranceQuery.data?.results || []),
    [insuranceQuery.data],
  );

  const employeesQuery = useQuery({
    queryKey: ['supplementary-employees-all'],
    queryFn: () => axiosInstance.get('/employees/', { params: { is_active: true, page_size: 500 } }).then((response) => response.data),
  });
  const employees = Array.isArray(employeesQuery.data)
    ? employeesQuery.data
    : employeesQuery.data?.results || [];

  const moduleTheme = useModuleTheme();
  const pageSize = moduleTheme.tableTheme.rowsPerPage;

  const summary = useMemo(() => summarizeInsurances(items), [items]);
  const filtered = useMemo(() => {
    let rows = items.filter((row) => {
      if (statusFilter !== 'all' && statusOf(row).key !== statusFilter) return false;
      if (attachmentFilter !== 'all') {
        const hasAttached = (row.dependents || []).some(dependentHasAttachment);
        if (attachmentFilter === 'with' && !hasAttached) return false;
        if (attachmentFilter === 'missing' && hasAttached) return false;
      }
      return matchesInsurance(row, search);
    });
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'name') return String(a.employee_name || '').localeCompare(String(b.employee_name || ''), 'fa');
      if (sortBy === 'monthly') return Number(b.monthly_amount || 0) - Number(a.monthly_amount || 0);
      if (sortBy === 'ending') return String(a.end_date || '9999-12-31').localeCompare(String(b.end_date || '9999-12-31'));
      return String(b.start_date || '').localeCompare(String(a.start_date || ''));
    });
    return rows;
  }, [items, search, statusFilter, attachmentFilter, sortBy]);

  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    filtered.length, pageSize, [search, statusFilter, attachmentFilter, sortBy, pageSize],
  );
  const pagedRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['all-supplementary-insurances'] });
    qc.invalidateQueries({ queryKey: ['employee'] });
    qc.invalidateQueries({ queryKey: ['employees'] });
    qc.invalidateQueries({ queryKey: ['supplementary-insurances'] });
  };


  const save = useMutation({
    mutationFn: async (payload) => {
      const body = {
        employee: Number(payload.employee),
        insurance_name: String(payload.insurance_name || '').trim(),
        insurance_type: String(payload.insurance_type || '').trim(),
        plan: String(payload.plan || '').trim(),
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        monthly_amount: Number(payload.monthly_amount) || 0,
        total_amount: Number(payload.total_amount) || 0,
      };
      let insuranceId = payload.id;
      if (insuranceId) {
        await axiosInstance.patch(`/supplementary-insurances/${insuranceId}/`, body);
      } else {
        const response = await axiosInstance.post('/supplementary-insurances/', body);
        insuranceId = response.data?.id;
      }

      const originalDependents = editingItem?.dependents || [];
      const currentDependents = payload.dependents || [];
      const currentIds = new Set(
        currentDependents.filter((dependent) => dependent.id).map((dependent) => Number(dependent.id)),
      );
      for (const original of originalDependents) {
        if (original.id && !currentIds.has(Number(original.id))) {
          await axiosInstance.delete(`/supplementary-insurance-dependents/${original.id}/`);
        }
      }

      for (const dependent of currentDependents) {
        const dependentBody = new FormData();
        dependentBody.append('insurance', insuranceId);
        dependentBody.append('first_name', String(dependent.first_name || '').trim());
        dependentBody.append('last_name', String(dependent.last_name || '').trim());
        dependentBody.append('relation', dependent.relation || 'other');
        if (String(dependent.national_id || '').trim()) {
          dependentBody.append('national_id', String(dependent.national_id).trim());
        }
        if (dependent.birth_date) {
          dependentBody.append('birth_date', String(dependent.birth_date));
        }
        if (dependent.attachment instanceof File) {
          dependentBody.append('attachment', dependent.attachment);
        }
        if (dependent.removeAttachment && dependent.id) {
          dependentBody.append('remove_attachment', 'true');
        }
        if (dependent.id) {
          await axiosInstance.patch(`/supplementary-insurance-dependents/${dependent.id}/`, dependentBody, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await axiosInstance.post('/supplementary-insurance-dependents/', dependentBody, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }
      return insuranceId;
    },
    onSuccess: () => {
      invalidateAll();
      setEditorOpen(false);
      setEditingItem(null);
      setForm(EMPTY_FORM);
      setError('');
      setToast('بیمه تکمیلی و افراد تحت تکفل با موفقیت ذخیره شد');
    },
    onError: (event) => {
      const data = event.response?.data;
      const first = typeof data === 'string'
        ? data
        : Array.isArray(data)
          ? data[0]
          : data && Object.values(data).flat()[0];
      setError(typeof first === 'string' ? first : 'ذخیرهٔ بیمه تکمیلی انجام نشد.');
    },
  });


  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/supplementary-insurances/${id}/`),
    onSuccess: () => {
      invalidateAll();
      setConfirmDelete(null);
      setDetail(null);
      setToast('بیمه تکمیلی حذف شد');
    },
    onError: () => setToast('حذف بیمه تکمیلی انجام نشد'),
  });

  const saving = save.isLoading || save.isPending;
  const removing = remove.isLoading || remove.isPending;

  const openAdd = () => {
    setEditingItem(null);
    setDetail(null);
    setForm({ ...EMPTY_FORM, start_date: todayIso(), dependents: [] });
    setError('');
    setEditorOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setDetail(null);
    setForm({
      id: item.id,
      employee: String(item.employee || ''),
      insurance_name: item.insurance_name || '',
      insurance_type: item.insurance_type || '',
      plan: item.plan || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      monthly_amount: item.monthly_amount ?? '',
      total_amount: item.total_amount ?? '',
      dependents: (item.dependents || []).map((dependent) => ({
        ...dependent,
        attachment: null,
        removeAttachment: false,
      })),
    });
    setError('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const openDependentAdd = () => {
    setDepIndex(null);
    setDepForm({ ...EMPTY_DEP });
    setDepError('');
    setDepDialog(true);
  };
  const openDependentEdit = (index) => {
    setDepIndex(index);
    setDepForm({
      ...EMPTY_DEP,
      ...(form.dependents || [])[index],
      attachment: null,
      removeAttachment: false,
    });
    setDepError('');
    setDepDialog(true);
  };
  const removeDependent = (index) => setForm((previous) => ({
    ...previous,
    dependents: (previous.dependents || []).filter((_, itemIndex) => itemIndex !== index),
  }));
  const saveDependent = () => {
    if (!String(depForm.first_name || '').trim() || !String(depForm.last_name || '').trim()) {
      setDepError('نام و نام خانوادگی فرد تحت تکفل الزامی است.');
      return;
    }
    const nationalId = String(depForm.national_id || '').trim();
    if (nationalId && !/^\d{10}$/.test(nationalId)) {
      setDepError('کد ملی باید ۱۰ رقم باشد.');
      return;
    }
    setForm((previous) => {
      const dependents = [...(previous.dependents || [])];
      const cleaned = {
        ...depForm,
        first_name: String(depForm.first_name).trim(),
        last_name: String(depForm.last_name).trim(),
        national_id: nationalId,
        birth_date: depForm.birth_date || '',
      };
      if (depIndex === null) dependents.push(cleaned);
      else dependents[depIndex] = cleaned;
      return { ...previous, dependents };
    });
    setDepDialog(false);
    setDepError('');
  };

  const submit = () => {
    if (!form.employee) {
      setError('پرسنل را انتخاب کنید.');
      return;
    }
    if (!String(form.insurance_name || '').trim()) {
      setError('نام بیمه تکمیلی را وارد کنید.');
      return;
    }
    if (!form.start_date) {
      setError('تاریخ شروع پوشش را وارد کنید.');
      return;
    }
    if (form.end_date && String(form.end_date) < String(form.start_date)) {
      setError('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');
      return;
    }
    const invalidDependent = (form.dependents || []).find(
      (dependent) => !String(dependent.first_name || '').trim() || !String(dependent.last_name || '').trim(),
    );
    if (invalidDependent) {
      setError('نام و نام خانوادگی همهٔ افراد تحت تکفل را کامل کنید.');
      return;
    }
    setError('');
    save.mutate(form);
  };

  const exportCsv = () => {
    const headers = ['پرسنل', 'کد پرسنلی', 'واحد', 'بیمه', 'طرح', 'شروع', 'پایان', 'مبلغ ماهانه', 'افراد تحت تکفل', 'وضعیت'];
    const rows = filtered.map((row) => [
      row.employee_name || '', row.employee_code || '', row.department_name || '',
      row.insurance_name || '', row.plan || '', row.start_date || '', row.end_date || '',
      Number(row.monthly_amount || 0), (row.dependents || []).length, statusOf(row).label,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'supplementary-insurance.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (insuranceQuery.isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }

  const statusOptions = [
    { value: 'all', label: `همه (${formatPersianNumber(summary.total)})` },
    ...Object.values(INSURANCE_STATUS).map((status) => ({
      value: status.key,
      label: `${status.label} (${formatPersianNumber(summary.statusCounts[status.key] || 0)})`,
    })),
  ];
  const attachmentOptions = [
    { value: 'all', label: 'همه' },
    { value: 'with', label: 'دارای پیوست' },
    { value: 'missing', label: 'بدون پیوست' },
  ];
  const activeChips = [
    statusFilter !== 'all'
      ? { key: 'status', label: `وضعیت: ${INSURANCE_STATUS[statusFilter]?.label || ''}`, clear: () => setStatusFilter('all') }
      : null,
    attachmentFilter !== 'all'
      ? {
        key: 'attachment',
        label: attachmentFilter === 'with' ? 'دارای پیوست' : 'بدون پیوست',
        clear: () => setAttachmentFilter('all'),
      }
      : null,
  ].filter(Boolean);

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<HealthAndSafetyIcon />}
        color={ACCENT}
        title="بیمه تکمیلی"
        subtitle="مدیریت پوشش درمانی کارکنان، طرح‌ها، مبالغ و افراد تحت تکفل"
        badge={(
          <Chip
            size="small"
            label={`${formatPersianNumber(summary.total)} بیمه`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }}
          />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button
                  variant="outlined"
                  onClick={() => insuranceQuery.refetch()}
                  disabled={insuranceQuery.isFetching}
                  sx={{ minWidth: 40, px: 1 }}
                >
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="چاپ">
              <Button variant="outlined" onClick={() => window.print()} sx={{ minWidth: 40, px: 1 }}>
                <PrintIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>بیمه جدید</Button>
          </>
        )}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.75 }}>
        <Grid item xs={6} md={3}>
          <KpiTile
            icon={HealthAndSafetyIcon}
            label="کل بیمه‌ها"
            value={formatPersianNumber(summary.total)}
            suffix="بیمه"
            color={ACCENT}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile
            icon={PeopleAltIcon}
            label="پرسنل تحت پوشش"
            value={formatPersianNumber(summary.employees)}
            suffix="نفر"
            color="#2563eb"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile
            icon={FamilyRestroomIcon}
            label="افراد تحت تکفل"
            value={formatPersianNumber(summary.dependents)}
            suffix="نفر"
            color="#0f766e"
            hint={`${formatPersianNumber(summary.dependentAttachments)} پیوست ثبت‌شده`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile
            icon={PaymentsIcon}
            label="حق بیمه ماهانه"
            value={formatPersianNumber(summary.monthlyTotal)}
            suffix="ریال"
            color="#b45309"
            size={16}
          />
        </Grid>
      </Grid>

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جست‌وجو در پرسنل، بیمه، طرح یا افراد تحت تکفل…"
        sort={sortBy}
        sortOptions={[
          { value: 'newest', label: 'جدیدترین شروع پوشش' },
          { value: 'name', label: 'نام پرسنل' },
          { value: 'monthly', label: 'بیشترین حق بیمه' },
          { value: 'ending', label: 'نزدیک‌ترین پایان پوشش' },
        ]}
        onSort={setSortBy}
        filters={[
          { label: 'وضعیت', value: statusFilter, options: statusOptions, onChange: setStatusFilter },
          { label: 'پیوست افراد', value: attachmentFilter, options: attachmentOptions, onChange: setAttachmentFilter },
        ]}
        activeChips={activeChips}
        activeFilterCount={activeChips.length}
        onReset={() => { setSearch(''); setStatusFilter('all'); setAttachmentFilter('all'); setSortBy('newest'); }}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        overflow: 'hidden',
        px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <ModuleTable
          tableTheme={moduleTheme.tableTheme}
          ariaLabel="فهرست بیمه‌های تکمیلی"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={insuranceQuery.isFetching}
          rows={pagedRows}
          rowKey={(row) => row.id}
          onRowClick={(row) => setDetail(row)}
          emptyText="بیمهٔ تکمیلی با این مشخصات پیدا نشد؛ فیلترها را تغییر دهید یا پوشش جدیدی ثبت کنید."
          columns={[
            {
              key: 'photo',
              label: 'عکس',
              width: '5%',
              align: 'center',
              render: (row) => (
                <EmployeeAvatar
                  employee={{
                    full_name: row.employee_name,
                    photo_url: row.employee_photo_url,
                    gender: row.employee_gender,
                  }}
                  size={32}
                  sx={{ borderRadius: '9px' }}
                />
              ),
            },
            {
              key: 'employee',
              label: 'نام و نام خانوادگی',
              width: '13%',
              align: 'right',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }} title={row.employee_name}>
                  {row.employee_name || '—'}
                </Typography>
              ),
            },
            {
              key: 'employee_code',
              label: 'کد پرسنلی',
              width: '7%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                  {toPersianDigits(row.employee_code || '—')}
                </Typography>
              ),
            },
            {
              key: 'job_title',
              label: 'عنوان شغلی',
              width: '10%',
              align: 'right',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: INK }} title={row.job_title_name}>
                  {row.job_title_name || '—'}
                </Typography>
              ),
            },
            {
              key: 'insurance',
              label: 'بیمه',
              width: '11%',
              align: 'right',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }} title={row.insurance_name}>
                  {row.insurance_name || 'بیمه تکمیلی'}
                </Typography>
              ),
            },
            {
              key: 'plan',
              label: 'طرح',
              width: '9%',
              align: 'center',
              render: (row) => (
                row.plan ? (
                  <Chip
                    size="small"
                    label={row.plan}
                    sx={{ height: 19, fontSize: 9.5, fontWeight: 800, bgcolor: alpha(ACCENT, 0.07), color: ACCENT }}
                  />
                ) : (
                  <Typography sx={{ fontSize: 11, color: MUTED }}>—</Typography>
                )
              ),
            },
            {
              key: 'start_date',
              label: 'تاریخ شروع',
              width: '8%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: INK }}>
                  {dateLabel(row.start_date)}
                </Typography>
              ),
            },
            {
              key: 'end_date',
              label: 'تاریخ پایان',
              width: '8%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: row.end_date ? INK : MUTED }}>
                  {row.end_date ? dateLabel(row.end_date) : '—'}
                </Typography>
              ),
            },
            {
              key: 'dependents',
              label: 'افراد تحت تکفل',
              width: '6%',
              align: 'center',
              render: (row) => (
                <Chip
                  size="small"
                  label={toPersianDigits((row.dependents || []).length)}
                  sx={{ height: 19, fontSize: 10, fontWeight: 800, bgcolor: alpha('#2563eb', 0.07), color: '#2563eb' }}
                />
              ),
            },
            {
              key: 'monthly',
              label: 'حق بیمه ماهیانه',
              width: '8%',
              align: 'center',
              render: (row) => moneyCell(row.monthly_amount, ACCENT),
            },
            {
              key: 'total',
              label: 'مبلغ کل',
              width: '8%',
              align: 'center',
              render: (row) => moneyCell(row.total_amount, MUTED),
            },
            {
              key: 'actions',
              label: 'عملیات',
              width: '7%',
              align: 'center',
              render: (row) => (
                <Stack
                  direction="row"
                  spacing={0.1}
                  justifyContent="center"
                  alignItems="center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Tooltip title="جزئیات">
                    <IconButton size="small" aria-label="جزئیات" onClick={() => setDetail(row)}>
                      <VisibilityIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="ویرایش">
                    <IconButton size="small" aria-label="ویرایش" onClick={() => openEdit(row)}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" aria-label="حذف" onClick={() => setConfirmDelete(row)}>
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
          unit="بیمه"
        />
      </Paper>


      <InsuranceDetailDrawer
        row={detail}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onDelete={setConfirmDelete}
      />

      <InsuranceEditorDialog
        open={editorOpen}
        onClose={closeEditor}
        form={form}
        setForm={setForm}
        employees={employees}
        saving={saving}
        error={error}
        setError={setError}
        onSave={submit}
        onOpenDependent={openDependentAdd}
        onEditDependent={openDependentEdit}
        onRemoveDependent={removeDependent}
      />

      <DependentDialog
        open={depDialog}
        onClose={() => setDepDialog(false)}
        form={depForm}
        setForm={setDepForm}
        onSave={saveDependent}
        error={depError}
        setError={setDepError}
        editing={depIndex !== null}
      />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف بیمه تکمیلی</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            بیمه «{confirmDelete?.insurance_name || 'انتخاب‌شده'}» برای {confirmDelete?.employee_name || 'این پرسنل'} حذف شود؟
            افراد تحت تکفل و پیوست‌های آن‌ها نیز حذف می‌شوند.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={removing} onClick={() => remove.mutate(confirmDelete.id)}>
            {removing ? <CircularProgress size={18} color="inherit" /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3400}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SupplementaryInsurancePage;

