import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Autocomplete, Box, Button, ButtonBase, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl,
  Grid, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select, Snackbar, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PaymentsIcon from '@mui/icons-material/Payments';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ShieldIcon from '@mui/icons-material/Shield';
import TableRowsIcon from '@mui/icons-material/TableRows';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PageHeader from '../core/components/ui/PageHeader';
import DataTable from '../core/components/ui/DataTable';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import MoneyInput from '../core/components/ui/MoneyInput';
import InfoCard from '../core/components/ui/InfoCard';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { KpiTile, ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import {
  INSURANCE_STATUS, RELATION_LABELS, RELATION_OPTIONS,
  daysUntil, dependentHasAttachment, dependentName, matchesInsurance,
  periodLabel, statusOf, summarizeInsurances,
} from './supplementaryInsuranceHelpers';

const ACCENT = '#7c3aed';
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';
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

const AttachmentChip = ({ dependent, size = 19 }) => {
  if (!dependentHasAttachment(dependent)) return null;
  return (
    <Chip
      component="a"
      href={dependent.attachment_url || dependent.attachment}
      target="_blank"
      rel="noreferrer"
      clickable
      size="small"
      icon={<AttachFileIcon sx={{ fontSize: 12 }} />}
      label={dependent.attachment_name || 'پیوست'}
      sx={{ height: size, fontSize: 10, maxWidth: 170, bgcolor: alpha('#be123c', 0.06), color: '#be123c' }}
    />
  );
};

const AttachmentLink = ({ dependent }) => (
  <ButtonBase
    component="a"
    href={dependent.attachment_url || dependent.attachment}
    target="_blank"
    rel="noreferrer"
    sx={{
      width: '100%', p: 0.7, borderRadius: '9px', justifyContent: 'flex-start',
      border: '1px solid #f1f5f9', bgcolor: '#fff', textAlign: 'right',
      '&:hover': { bgcolor: alpha('#be123c', 0.035), borderColor: alpha('#be123c', 0.16) },
    }}>
    <Stack direction="row" alignItems="center" spacing={0.65} sx={{ width: '100%' }}>
      <Box sx={{
        width: 27, height: 27, borderRadius: '8px', flexShrink: 0, color: '#be123c',
        bgcolor: alpha('#be123c', 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><PictureAsPdfIcon sx={{ fontSize: 15 }} /></Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: INK }}>{dependentName(dependent)}</Typography>
        <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
          {dependent.employee_name || '—'} · {dependent.insurance_name || 'بیمه تکمیلی'}
        </Typography>
      </Box>
      <AttachFileIcon sx={{ fontSize: 15, color: '#be123c' }} />
    </Stack>
  </ButtonBase>
);

const DependentRows = ({ dependents = [], onEdit, onDelete, emptyText = 'فرد تحت تکفلی ثبت نشده است.' }) => {
  const theme = useTheme();
  if (!dependents.length) {
    return (
      <Box sx={{ py: 2.2, textAlign: 'center', borderRadius: '10px', bgcolor: SOFT_BG, border: '1px dashed #e2e8f0' }}>
        <FamilyRestroomIcon sx={{ fontSize: 26, color: '#cbd5e1', mb: 0.4 }} />
        <Typography sx={{ fontSize: 11, color: MUTED }}>{emptyText}</Typography>
      </Box>
    );
  }
  return (
    <Stack spacing={0.5}>
      {dependents.map((dependent, index) => (
        <Paper key={dependent.id || `dep-${index}`} variant="outlined"
          sx={{ p: 0.75, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 0.75, borderColor: theme.palette.divider }}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
            bgcolor: alpha(ACCENT, 0.07), color: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PeopleAltIcon sx={{ fontSize: 16 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.4} useFlexGap flexWrap="wrap">
              <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>{dependentName(dependent)}</Typography>
              <Chip size="small" label={dependent.relation_display || RELATION_LABELS[dependent.relation] || dependent.relation || '—'}
                sx={{ height: 18, fontSize: 10, bgcolor: alpha(ACCENT, 0.06), color: ACCENT }} />
              <AttachmentChip dependent={dependent} />
            </Stack>
            <Typography sx={{ fontSize: 10, color: MUTED }}>
              {dependent.attachment_size_display ? `پیوست: ${dependent.attachment_size_display}` : 'بدون پیوست'}
            </Typography>
          </Box>
          {onEdit ? (
            <Tooltip title="ویرایش فرد تحت تکفل">
              <IconButton size="small" onClick={() => onEdit(index)}><EditIcon sx={{ fontSize: 15 }} /></IconButton>
            </Tooltip>
          ) : null}
          {onDelete ? (
            <Tooltip title="حذف از لیست">
              <IconButton size="small" color="error" onClick={() => onDelete(index)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton>
            </Tooltip>
          ) : null}
        </Paper>
      ))}
    </Stack>
  );
};


const InsuranceCard = ({ row, onView, onEdit, onDelete }) => {
  const theme = useTheme();
  const status = statusOf(row);
  const dependents = row.dependents || [];
  const attached = dependents.filter(dependentHasAttachment).length;
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: 1.4, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', gap: 0.8,
      borderTop: `3px solid ${status.color}`, transition: 'box-shadow .18s ease, border-color .18s ease',
      '&:hover': { borderColor: alpha(status.color, 0.35), boxShadow: `0 10px 24px ${alpha(status.color, 0.07)}` },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={0.9}>
        <EmployeeAvatar
          employee={{
            full_name: row.employee_name,
            photo_url: row.employee_photo_url,
            gender: row.employee_gender,
          }}
          size={38}
          sx={{ borderRadius: '11px' }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap title={row.employee_name} sx={{ fontSize: 12.5, fontWeight: 900, color: INK }}>
            {row.employee_name || '—'}
          </Typography>
          <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
            {toPersianDigits(row.employee_code || '—')}
            {row.department_name ? ` · ${row.department_name}` : ''}
          </Typography>
        </Box>
        <StatusChip row={row} />
      </Stack>

      <Box>
        <Typography noWrap title={row.insurance_name} sx={{ fontSize: 12, fontWeight: 800, color: INK }}>
          {row.insurance_name || 'بیمه تکمیلی'}
        </Typography>
        <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.35 }}>
          {row.plan ? <Chip size="small" label={row.plan} sx={{ height: 19, fontSize: 10, bgcolor: alpha(ACCENT, 0.06), color: ACCENT }} /> : null}
          {row.insurance_type ? <Chip size="small" label={row.insurance_type} sx={{ height: 19, fontSize: 10, bgcolor: SOFT_BG, color: MUTED }} /> : null}
          <Chip size="small" icon={<PeopleAltIcon sx={{ fontSize: 12 }} />} label={`${toPersianDigits(dependents.length)} تحت تکفل`}
            sx={{ height: 19, fontSize: 10, bgcolor: alpha('#2563eb', 0.06), color: '#2563eb' }} />
          {attached ? (
            <Chip size="small" icon={<AttachFileIcon sx={{ fontSize: 12 }} />} label={`${toPersianDigits(attached)} پیوست`}
              sx={{ height: 19, fontSize: 10, bgcolor: alpha('#be123c', 0.06), color: '#be123c' }} />
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ p: 0.8, borderRadius: '9px', bgcolor: alpha(status.color, 0.035), border: `1px solid ${alpha(status.color, 0.09)}` }}>
        <Stack direction="row" alignItems="center" spacing={0.55}>
          <CalendarMonthIcon sx={{ fontSize: 13, color: status.color }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: status.color }}>{periodLabel(row)}</Typography>
        </Stack>
      </Box>

      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography sx={{ fontSize: 10, color: MUTED }}>مبلغ ماهانه</Typography>
          <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: INK }}>{money(row.monthly_amount)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography sx={{ fontSize: 10, color: MUTED }}>مبلغ کل</Typography>
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>{money(row.total_amount)}</Typography>
        </Box>
      </Stack>

      <Box sx={{ flex: 1 }} />
      <Divider />
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
        <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
          {row.job_title_name || 'بدون عنوان شغلی'}
        </Typography>
        <Stack direction="row" spacing={0.05}>
          <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)}><VisibilityIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
          <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(row)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
};


const InsuranceTable = ({ rows, onView, onEdit, onDelete }) => (
  <DataTable
    rows={rows}
    getRowId={(row) => row.id}
    maxHeight="calc(100vh - 320px)"
    stickyHeader
    ariaLabel="فهرست بیمه‌های تکمیلی"
    tableSx={{ '& td, & th': { px: 1.2, py: 0.8 } }}
    columns={[
      {
        key: 'employee',
        label: 'پرسنل',
        render: (row) => (
          <Stack direction="row" alignItems="center" spacing={0.7}>
            <EmployeeAvatar
              employee={{
                full_name: row.employee_name,
                photo_url: row.employee_photo_url,
                gender: row.employee_gender,
              }}
              size={28}
              sx={{ borderRadius: '8px' }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{row.employee_name || '—'}</Typography>
              <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
                {toPersianDigits(row.employee_code || '—')}{row.department_name ? ` · ${row.department_name}` : ''}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        key: 'insurance', label: 'بیمه / طرح',
        render: (row) => (
          <Box sx={{ maxWidth: 220 }}>
            <Typography noWrap title={row.insurance_name} sx={{ fontSize: 12, fontWeight: 800 }}>{row.insurance_name || '—'}</Typography>
            <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{[row.plan, row.insurance_type].filter(Boolean).join(' · ') || '—'}</Typography>
          </Box>
        ),
      },
      {
        key: 'period', label: 'دورهٔ پوشش', align: 'center',
        render: (row) => (
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{periodLabel(row)}</Typography>
            {row.end_date ? (
              <Typography sx={{ fontSize: 10, color: statusOf(row).color }}>
                {daysUntil(row.end_date) < 0 ? 'پایان‌یافته' : `${toPersianDigits(Math.max(0, daysUntil(row.end_date)))} روز مانده`}
              </Typography>
            ) : null}
          </Box>
        ),
      },
      {
        key: 'dependents', label: 'افراد تحت تکفل', align: 'center',
        render: (row) => (
          <Chip size="small" icon={<PeopleAltIcon sx={{ fontSize: 12 }} />}
            label={`${toPersianDigits((row.dependents || []).length)} نفر`}
            sx={{ height: 20, fontSize: 10.5, bgcolor: alpha(ACCENT, 0.06), color: ACCENT }} />
        ),
      },
      {
        key: 'monthly', label: 'مبلغ ماهانه', align: 'center',
        render: (row) => <Typography sx={{ fontSize: 11, fontWeight: 800 }}>{money(row.monthly_amount)}</Typography>,
      },
      { key: 'status', label: 'وضعیت', align: 'center', render: (row) => <StatusChip row={row} /> },
      {
        key: 'actions', label: 'عملیات', align: 'center', cellSx: { whiteSpace: 'nowrap' },
        render: (row) => (
          <Stack direction="row" spacing={0.05} justifyContent="center">
            <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
            <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)}><EditIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
            <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(row)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
          </Stack>
        ),
      },
    ]}
  />
);


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


const DependentDialog = ({ open, onClose, form, setForm, onSave, error, setError, editing }) => {
  const theme = useTheme();
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const existingAttachment = form.attachment_url && !form.removeAttachment && !form.attachment;

  const pickAttachment = (files) => {
    const file = Array.from(files || [])[0];
    if (!file) return;
    const ext = `.${String(file.name || '').split('.').pop()?.toLowerCase()}`;
    if (!['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      setError('فرمت پیوست باید PDF یا تصویر باشد.');
      return;
    }
    if (Number(file.size) > MAX_ATTACHMENT_SIZE) {
      setError('حجم پیوست نباید بیشتر از ۱۰ مگابایت باشد.');
      return;
    }
    setError('');
    setForm((previous) => ({
      ...previous,
      attachment: file,
      removeAttachment: false,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.1, py: 1.4 }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: '10px', color: '#2563eb',
          bgcolor: alpha('#2563eb', 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><FamilyRestroomIcon sx={{ fontSize: 18 }} /></Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{editing ? 'ویرایش فرد تحت تکفل' : 'افزودن فرد تحت تکفل'}</Typography>
          <Typography sx={{ fontSize: 10.5, color: MUTED }}>مشخصات و مدارک پیوست فرد را وارد کنید</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 2.1, py: 1.8 }}>
        <Stack spacing={1.5}>
          <Grid container spacing={1.2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="نام *" value={form.first_name}
                onChange={(event) => update('first_name', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="نام خانوادگی *" value={form.last_name}
                onChange={(event) => update('last_name', event.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نسبت</InputLabel>
                <Select value={form.relation || 'spouse'} label="نسبت"
                  onChange={(event) => update('relation', event.target.value)}>
                  {RELATION_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider />
          <Box>
            <SectionHeading icon={AttachFileIcon} title="پیوست مدارک فرد تحت تکفل" color="#be123c"
              hint="PDF یا تصویر، حداکثر ۱۰ مگابایت" />
            {existingAttachment ? (
              <Paper variant="outlined" sx={{ p: 0.8, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.8 }}>
                <PictureAsPdfIcon sx={{ fontSize: 19, color: '#be123c' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 11, fontWeight: 800 }}>{form.attachment_name || 'پیوست فعلی'}</Typography>
                  <Typography sx={{ fontSize: 10, color: MUTED }}>{form.attachment_size_display || 'پیوست ثبت‌شده'}</Typography>
                </Box>
                <Button size="small" href={form.attachment_url} target="_blank" rel="noreferrer">مشاهده</Button>
                <IconButton size="small" color="error" onClick={() => setForm((previous) => ({ ...previous, removeAttachment: true }))}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Paper>
            ) : null}
            {form.removeAttachment ? (
              <Alert severity="warning" sx={{ mb: 0.8, py: 0.1, borderRadius: '9px' }}>
                <Typography sx={{ fontSize: 10.5 }}>پیوست فعلی هنگام ذخیره حذف می‌شود.</Typography>
              </Alert>
            ) : null}


            <Box
              onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => { event.preventDefault(); setDragActive(false); pickAttachment(event.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              sx={{
                p: 1.8, textAlign: 'center', cursor: 'pointer', borderRadius: '11px',
                border: `2px dashed ${dragActive ? '#be123c' : alpha('#be123c', 0.25)}`,
                bgcolor: dragActive ? alpha('#be123c', 0.05) : 'rgba(190,18,60,0.02)',
              }}>
              <CloudUploadIcon sx={{ fontSize: 30, color: '#be123c', mb: 0.4 }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                {form.attachment ? form.attachment.name : 'فایل پیوست را اینجا رها کنید یا کلیک کنید'}
              </Typography>
              <Typography sx={{ fontSize: 10, color: MUTED }}>
                {form.attachment ? 'برای جایگزینی، فایل جدید انتخاب کنید.' : 'اختیاری — PDF، JPG یا PNG'}
              </Typography>
              <input ref={inputRef} type="file" hidden accept={ATTACHMENT_ACCEPT}
                onChange={(event) => { pickAttachment(event.target.files); event.target.value = ''; }} />
            </Box>
            {form.attachment ? (
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.4 }}>
                <Button size="small" color="error" onClick={() => setForm((previous) => ({ ...previous, attachment: null }))}>
                  حذف انتخاب
                </Button>
              </Stack>
            ) : null}
          </Box>

          {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.1, py: 1.25, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" onClick={onSave}>{editing ? 'ذخیره تغییرات' : 'افزودن به لیست'}</Button>
      </DialogActions>
    </Dialog>
  );
};


const InsuranceEditorDialog = ({
  open, onClose, form, setForm, employees, saving, error, setError, onSave,
  onOpenDependent, onEditDependent, onRemoveDependent,
}) => {
  const theme = useTheme();
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const selectedEmployee = employees.find((employee) => String(employee.id) === String(form.employee)) || null;
  const dependents = form.dependents || [];
  const attached = dependents.filter(dependentHasAttachment).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.1, px: 2.15, py: 1.45, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{
          width: 37, height: 37, borderRadius: '11px', flexShrink: 0,
          bgcolor: alpha(ACCENT, 0.08), color: ACCENT, border: `1px solid ${alpha(ACCENT, 0.16)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><HealthAndSafetyIcon sx={{ fontSize: 20 }} /></Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{form.id ? 'ویرایش بیمه تکمیلی' : 'افزودن بیمه تکمیلی'}</Typography>
          <Typography sx={{ fontSize: 10.5, color: MUTED }}>اطلاعات پوشش، مبالغ و افراد تحت تکفل را کامل کنید</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.15 }}>
        <Stack spacing={1.7}>
          <Box>
            <SectionHeading icon={PeopleAltIcon} title="پرسنل و نوع بیمه" color={ACCENT} />
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  size="small"
                  options={employees}
                  value={selectedEmployee}
                  onChange={(_event, value) => update('employee', value ? String(value.id) : '')}
                  getOptionLabel={(option) => `${option.full_name || ''}${option.employee_id ? ` (${option.employee_id})` : ''}`}
                  isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                      <Box component="li" key={key} {...optionProps}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.7 }}>
                        <EmployeeAvatar employee={option} size={27} sx={{ borderRadius: '8px' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{option.full_name}</Typography>
                          <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
                            {toPersianDigits(option.employee_id || '—')}
                            {option.department_name ? ` · ${option.department_name}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }}
                  renderInput={(params) => <TextField {...params} label="پرسنل *" placeholder="جست‌وجوی نام یا کد پرسنلی…" />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="نام بیمه تکمیلی *" value={form.insurance_name}
                  onChange={(event) => update('insurance_name', event.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="نوع بیمه" value={form.insurance_type}
                  onChange={(event) => update('insurance_type', event.target.value)}
                  helperText="مثلاً درمان، عمر، ازکارافتادگی" />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="طرح انتخابی" value={form.plan}
                  onChange={(event) => update('plan', event.target.value)}
                  helperText="مثلاً طرح خانواده، طلایی، ویژه" />
              </Grid>
            </Grid>
          </Box>

          <Divider />
          <Box>
            <SectionHeading icon={CalendarMonthIcon} title="دورهٔ پوشش و مبالغ" color="#2563eb" />
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={3}><JalaliDatePicker fullWidth label="تاریخ شروع *" value={form.start_date} onChange={(value) => update('start_date', value)} /></Grid>
              <Grid item xs={12} md={3}><JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date} onChange={(value) => update('end_date', value)} /></Grid>
              <Grid item xs={12} md={3}><MoneyInput size="small" fullWidth label="مبلغ ماهانه (ریال)" value={form.monthly_amount} onChange={(value) => update('monthly_amount', value)} /></Grid>
              <Grid item xs={12} md={3}><MoneyInput size="small" fullWidth label="مبلغ کل (ریال)" value={form.total_amount} onChange={(value) => update('total_amount', value)} /></Grid>
            </Grid>
          </Box>

          <Divider />


          <Box>
            <SectionHeading icon={FamilyRestroomIcon} title="افراد تحت تکفل" color="#2563eb"
              hint="پیوست مدارک هر فرد از دیالوگ همان فرد قابل ثبت است."
              action={(
                <Button size="small" startIcon={<AddIcon />} onClick={onOpenDependent}
                  variant="outlined" sx={{ fontSize: 11, borderColor: alpha('#2563eb', 0.35), color: '#2563eb' }}>
                  افزودن فرد
                </Button>
              )} />
            <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mb: 0.8 }}>
              <Chip size="small" icon={<PeopleAltIcon sx={{ fontSize: 12 }} />} label={`${toPersianDigits(dependents.length)} نفر`}
                sx={{ height: 21, fontSize: 10.5, bgcolor: alpha('#2563eb', 0.06), color: '#2563eb' }} />
              <Chip size="small" icon={<AttachFileIcon sx={{ fontSize: 12 }} />} label={`${toPersianDigits(attached)} پیوست`}
                sx={{ height: 21, fontSize: 10.5, bgcolor: alpha('#be123c', 0.06), color: '#be123c' }} />
            </Stack>
            <DependentRows dependents={dependents} onEdit={onEditDependent} onDelete={onRemoveDependent}
              emptyText="برای این بیمه هنوز فرد تحت تکفلی اضافه نشده است." />
          </Box>

          {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.15, py: 1.35, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" disabled={saving} onClick={onSave}>
          {saving ? <CircularProgress size={18} color="inherit" /> : (form.id ? 'ذخیره تغییرات' : 'ثبت بیمه')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const SupplementaryInsurancePage = () => {
  const qc = useQueryClient();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('cards');
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

  const summary = useMemo(() => summarizeInsurances(items), [items]);
  const filtered = useMemo(() => {
    let rows = items.filter((row) => {
      if (statusFilter !== 'all' && statusOf(row).key !== statusFilter) return false;
      return matchesInsurance(row, search);
    });
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'name') return String(a.employee_name || '').localeCompare(String(b.employee_name || ''), 'fa');
      if (sortBy === 'monthly') return Number(b.monthly_amount || 0) - Number(a.monthly_amount || 0);
      return String(b.start_date || '').localeCompare(String(a.start_date || ''));
    });
    return rows;
  }, [items, search, statusFilter, sortBy]);

  const attachedDependents = useMemo(() => items.flatMap((insurance) => (
    (insurance.dependents || [])
      .filter(dependentHasAttachment)
      .map((dependent) => ({ ...dependent, insurance_name: insurance.insurance_name, employee_name: insurance.employee_name }))
  )).slice(0, 8), [items]);

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
    setForm((previous) => {
      const dependents = [...(previous.dependents || [])];
      const cleaned = {
        ...depForm,
        first_name: String(depForm.first_name).trim(),
        last_name: String(depForm.last_name).trim(),
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
    return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;
  }


  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<HealthAndSafetyIcon />}
        color={ACCENT}
        title="بیمه تکمیلی"
        subtitle="مدیریت پوشش درمانی کارکنان، طرح‌ها، مبالغ و مدارک افراد تحت تکفل"
        badge={(
          <Chip size="small" label={`${formatPersianNumber(summary.total)} بیمه`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }} />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" onClick={() => insuranceQuery.refetch()} disabled={insuranceQuery.isFetching}
                  sx={{ minWidth: 40, px: 1 }}><RefreshIcon fontSize="small" /></Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} disabled={!items.length}>خروجی</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>افزودن بیمه تکمیلی</Button>
          </>
        )}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={ShieldIcon} label="کل بیمه‌ها" value={formatPersianNumber(summary.total)} suffix="بیمه" color={ACCENT} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PeopleAltIcon} label="پرسنل تحت پوشش" value={formatPersianNumber(summary.employees)} suffix="نفر" color="#2563eb" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={FamilyRestroomIcon} label="افراد تحت تکفل" value={formatPersianNumber(summary.dependents)}
            suffix="نفر" color="#0f766e" hint={`${formatPersianNumber(summary.dependentAttachments)} پیوست ثبت‌شده`} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PaymentsIcon} label="حق بیمه ماهانه" value={formatPersianNumber(summary.monthlyTotal)}
            suffix="ریال" color="#b45309" size={16} />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={9}>


          <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <TextField size="small" placeholder="جست‌وجو در پرسنل، بیمه، طرح یا افراد تحت تکفل…"
                value={search} onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 250 }, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
              <FormControl size="small" sx={{ minWidth: 155 }}>
                <InputLabel>وضعیت</InputLabel>
                <Select value={statusFilter} label="وضعیت" onChange={(event) => setStatusFilter(event.target.value)}>
                  <MenuItem value="all">همه ({formatPersianNumber(summary.total)})</MenuItem>
                  {Object.values(INSURANCE_STATUS).map((status) => (
                    <MenuItem key={status.key} value={status.key}>
                      {status.label} ({formatPersianNumber(summary.statusCounts[status.key] || 0)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 145 }}>
                <InputLabel>ترتیب</InputLabel>
                <Select value={sortBy} label="ترتیب" onChange={(event) => setSortBy(event.target.value)}>
                  <MenuItem value="newest">جدیدترین</MenuItem>
                  <MenuItem value="name">نام پرسنل</MenuItem>
                  <MenuItem value="monthly">بیشترین مبلغ</MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => value && setView(value)}>
                <ToggleButton value="cards" aria-label="نمای کارت" sx={{ px: 1 }}><Tooltip title="کارت"><ViewModuleIcon fontSize="small" /></Tooltip></ToggleButton>
                <ToggleButton value="table" aria-label="نمای جدول" sx={{ px: 1 }}><Tooltip title="جدول"><TableRowsIcon fontSize="small" /></Tooltip></ToggleButton>
              </ToggleButtonGroup>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
                sx={{ display: { xs: 'none', md: 'flex' } }}>بیمه جدید</Button>
            </Stack>
          </Paper>

          {!filtered.length ? (
            <Paper elevation={0} sx={{ p: 5, borderRadius: '16px', border: `1px dashed ${theme.palette.divider}`, textAlign: 'center' }}>
              <HealthAndSafetyIcon sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>بیمه تکمیلی با این مشخصات پیدا نشد.</Typography>
              <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.3 }}>فیلترها را تغییر دهید یا پوشش جدیدی ثبت کنید.</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ mt: 1.5 }}>افزودن بیمه تکمیلی</Button>
            </Paper>
          ) : view === 'cards' ? (
            <Grid container spacing={1.5}>
              {filtered.map((row) => (
                <Grid item xs={12} md={6} xl={4} key={row.id}>
                  <InsuranceCard row={row} onView={setDetail} onEdit={openEdit} onDelete={setConfirmDelete} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <InsuranceTable rows={filtered} onView={setDetail} onEdit={openEdit} onDelete={setConfirmDelete} />
          )}
        </Grid>

        <Grid item xs={12} lg={3} sx={{ order: { xs: 2, lg: 1 } }}>
          <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
            <SurfaceCard title="وضعیت پوشش" icon={WarningAmberIcon} color={ACCENT}>
              <Stack spacing={0.85}>
                {Object.values(INSURANCE_STATUS).map((status) => {
                  const count = summary.statusCounts[status.key] || 0;
                  const percent = summary.total ? (count / summary.total) * 100 : 0;
                  return (
                    <Box key={status.key}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.35 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: status.color }} />
                          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: INK }}>{status.label}</Typography>
                        </Stack>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: status.color }}>{formatPersianNumber(count)}</Typography>
                      </Stack>
                      <ProgressBar value={percent} color={status.color} height={5} />
                    </Box>
                  );
                })}
              </Stack>
            </SurfaceCard>
            <SurfaceCard title="افراد تحت تکفل دارای پیوست" icon={AttachFileIcon} color="#be123c"
              action={<Chip size="small" label={formatPersianNumber(summary.dependentAttachments)}
                sx={{ height: 19, fontSize: 10, bgcolor: alpha('#be123c', 0.06), color: '#be123c' }} />}>
              {attachedDependents.length ? (
                <Stack spacing={0.5}>
                  {attachedDependents.map((dependent) => (
                    <AttachmentLink key={`${dependent.id}-${dependent.employee_name}`} dependent={dependent} />
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ py: 2.5, fontSize: 11, color: MUTED, textAlign: 'center' }}>
                  هنوز پیوستی برای افراد تحت تکفل ثبت نشده است.
                </Typography>
              )}
            </SurfaceCard>
          </Stack>
        </Grid>
      </Grid>


      <InsuranceDetailDrawer row={detail} onClose={() => setDetail(null)}
        onEdit={openEdit} onDelete={setConfirmDelete} />

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
          <Button color="error" variant="contained" disabled={removing}
            onClick={() => remove.mutate(confirmDelete.id)}>
            {removing ? <CircularProgress size={18} color="inherit" /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3400} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SupplementaryInsurancePage;
