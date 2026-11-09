import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, Grid, IconButton, InputAdornment,
  MenuItem, Paper, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneIcon from '@mui/icons-material/Phone';
import LinkIcon from '@mui/icons-material/Link';
import NotesIcon from '@mui/icons-material/Notes';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { PrintButton } from '../../core/print/PrintButton';
import useAuth from '../../core/hooks/useAuth';
import { orgPartyPermissions } from '../../core/utils/accountingPermissions';
import { useApplication } from '../../core/context/ApplicationContext';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { ModulePager, ModuleTable, useModuleTheme } from '../contracts/contractModuleUi';

/**
 * سازمان‌ها و اشخاص — تعاریف حسابداری.
 *
 * مرجع یکتای «نهاد/شخص» برای حقوق و تکالیف مالی: سازمان و نهاد عمومی، مرجع
 * قانونی و نظارتی (تأمین اجتماعی، امور مالیاتی…)، کارفرما، سهامدار، بیمه‌گر،
 * حسابرس و سایر اشخاص حقوقی/حقیقی. هر رکورد می‌تواند به حساب تفصیلی، طرف
 * قرارداد و سازمان/مخاطب مکاتبات وصل شود.
 */

const FALLBACK_ACCENT = '#0ea5e9';


// رنگ معنایی هر نوع (هویت بصری هر دسته)
export const KIND_COLORS = {
  organization: '#0ea5e9',
  regulatory: '#8b5cf6',
  employer: '#f59e0b',
  shareholder: '#10b981',
  insurer: '#ec4899',
  auditor: '#0f766e',
  legal_person: '#6366f1',
  natural_person: '#14b8a6',
  other: '#64748b',
};

// نسخهٔ محلی انواع (fallback وقتی آمار سرور نیامده باشد) — با بک‌اند یکسان است
export const LOCAL_KINDS = [
  { value: 'organization', label: 'سازمان و نهاد عمومی', hint: 'مثل شهرداری، دانشگاه، شرکت دولتی یا نهاد عمومی غیردولتی' },
  { value: 'regulatory', label: 'مرجع قانونی و نظارتی', hint: 'مثل سازمان تأمین اجتماعی (شعبه …)، امور مالیاتی، اداره کار، بانک مرکزی' },
  { value: 'employer', label: 'کارفرما', hint: 'کارفرمای قراردادها و مشتریان پروژه‌ای' },
  { value: 'shareholder', label: 'سهامدار', hint: 'سهامداران شرکت با درصد سهام' },
  { value: 'insurer', label: 'شرکت بیمه', hint: 'شرکت‌های بیمه‌ای که با آن‌ها قرارداد بیمه دارید' },
  { value: 'auditor', label: 'حسابرس / بازرس قانونی', hint: 'حسابرس مستقل و بازرس قانونی' },
  { value: 'legal_person', label: 'سایر اشخاص حقوقی', hint: 'سایر شرکت‌ها و مؤسسات (تابعه، مشارکتی، …)' },
  { value: 'natural_person', label: 'سایر اشخاص حقیقی', hint: 'اشخاص حقیقی طرف حساب (غیرپرسنل)' },
  { value: 'other', label: 'سایر', hint: 'مواردی که در دسته‌های بالا نمی‌گنجند' },
];

const KIND_LABEL = LOCAL_KINDS.reduce((acc, item) => ({ ...acc, [item.value]: item.label }), {});
const kindColor = (kind) => KIND_COLORS[kind] || KIND_COLORS.other;

export const asList = (data) => (Array.isArray(data) ? data : (data?.results || []));

const apiError = (error, fallback = 'خطا در انجام عملیات') => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  if (data.non_field_errors) return data.non_field_errors[0];
  const labels = {
    name: 'نام / عنوان', kind: 'نوع', code: 'کد', parent: 'نهاد بالادستی',
    national_id: 'شناسه ملی', economic_code: 'کد اقتصادی',
    registration_number: 'شماره ثبت', share_percent: 'درصد سهام',
    email: 'ایمیل', account: 'حساب تفصیلی',
  };
  const first = Object.entries(data)[0];
  if (!first) return fallback;
  const [field, value] = first;
  const message = Array.isArray(value) ? value[0] : value;
  return `${labels[field] || field}: ${message}`;
};

const useDebounced = (value, delay = 320) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

export const kindChip = (kind, size = 'small') => (
  <Chip
    size={size}
    label={KIND_LABEL[kind] || kind || '—'}
    sx={{
      height: 22, fontSize: 11, fontWeight: 800,
      bgcolor: `${kindColor(kind)}14`, color: kindColor(kind),
      border: `1px solid ${kindColor(kind)}33`,
    }}
  />
);

const statusChip = (row) => (
  <Chip
    size="small"
    label={row.is_active ? 'فعال' : 'غیرفعال'}
    sx={{
      height: 22, fontSize: 11, fontWeight: 800,
      bgcolor: row.is_active ? '#0f766e14' : '#64748b14',
      color: row.is_active ? '#0f766e' : '#64748b',
      border: `1px solid ${row.is_active ? '#0f766e33' : '#64748b33'}`,
    }}
  />
);

const EMPTY_FORM = {
  id: null,
  kind: 'organization',
  name: '',
  unit_name: '',
  code: '',
  parent: null,
  national_id: '',
  economic_code: '',
  registration_number: '',
  share_percent: '',
  phone: '',
  mobile: '',
  fax: '',
  email: '',
  website: '',
  postal_code: '',
  address: '',
  contact_person: '',
  contact_title: '',
  contact_phone: '',
  bank_name: '',
  account_number: '',
  iban: '',
  account: null,
  contract_party: null,
  organization: null,
  correspondent: null,
  notes: '',
  is_active: true,
};

const toForm = (row) => {
  if (!row) return EMPTY_FORM;
  const form = { ...EMPTY_FORM };
  Object.keys(EMPTY_FORM).forEach((key) => {
    const value = row[key];
    if (value !== undefined && value !== null) form[key] = value;
  });
  form.id = row.id;
  form.share_percent = row.share_percent ?? '';
  form.is_active = row.is_active !== false;
  return form;
};

const buildPayload = (form) => ({
  kind: form.kind,
  name: (form.name || '').trim(),
  unit_name: form.unit_name || '',
  code: (form.code || '').trim(),
  parent: form.parent || null,
  national_id: form.national_id || '',
  economic_code: form.economic_code || '',
  registration_number: form.registration_number || '',
  share_percent: form.share_percent === '' || form.share_percent == null ? null : Number(form.share_percent),
  phone: form.phone || '',
  mobile: form.mobile || '',
  fax: form.fax || '',
  email: form.email || '',
  website: form.website || '',
  postal_code: form.postal_code || '',
  address: form.address || '',
  contact_person: form.contact_person || '',
  contact_title: form.contact_title || '',
  contact_phone: form.contact_phone || '',
  bank_name: form.bank_name || '',
  account_number: form.account_number || '',
  iban: form.iban || '',
  account: form.account || null,
  contract_party: form.contract_party || null,
  organization: form.organization || null,
  correspondent: form.correspondent || null,
  notes: form.notes || '',
  is_active: form.is_active !== false,
});

/* انتخابگر دور-جست‌وجو برای رابطه‌ها (حساب تفصیلی، طرف قرارداد، مکاتبات) */
const RemoteLookup = ({
  label, endpoint, params, searchParam = 'search', value, valueLabel,
  onChange, getOptionLabel, helperText, disabled,
}) => {
  const [input, setInput] = useState('');
  const term = useDebounced(input.trim());
  const { data, isFetching } = useQuery({
    queryKey: ['org-party-lookup', endpoint, JSON.stringify(params || {}), term],
    queryFn: () => axiosInstance.get(endpoint, {
      params: { ...(params || {}), page_size: 30, ...(term ? { [searchParam]: term } : {}) },
    }).then((response) => asList(response.data)),
    staleTime: 60_000,
    enabled: !disabled,
  });

  const options = useMemo(() => {
    const rows = asList(data);
    if (value && valueLabel && !rows.some((row) => row.id === value)) {
      return [{ id: value, __label: valueLabel }, ...rows];
    }
    return rows;
  }, [data, value, valueLabel]);

  return (
    <Autocomplete
      size="small"
      disabled={disabled}
      options={options}
      loading={isFetching}
      value={options.find((row) => row.id === value) || null}
      onChange={(_event, next) => onChange(next ? next.id : null)}
      onInputChange={(_event, next) => setInput(next || '')}
      filterOptions={(items) => items}
      getOptionLabel={(row) => row.__label || getOptionLabel(row)}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      noOptionsText="موردی یافت نشد"
      loadingText="در حال جست‌وجو…"
      renderInput={(params) => (
        <TextField {...params} label={label} helperText={helperText} />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id} sx={{ fontSize: 12.5 }}>
          {option.__label || getOptionLabel(option)}
        </Box>
      )}
    />
  );
};


/* کارت اطلاعات — رنگ/شعاع/سایه از توکن‌های استودیو تم */
const InfoCard = ({ title, icon: Icon, color, children }) => (
  <Box sx={{
    borderRadius: 'var(--hrms-info-card-radius, 14px)', overflow: 'hidden',
    border: 'var(--hrms-info-card-border, 1px solid #e8edf4)',
    background: 'var(--hrms-info-card-bg, #fff)',
    boxShadow: 'var(--hrms-info-card-shadow, none)',
    height: '100%',
  }}>
    <Box sx={{
      px: 1.5, py: 0.9, display: 'flex', alignItems: 'center', gap: 0.75,
      bgcolor: `${color}12`, borderBottom: `1px solid ${color}22`,
    }}>
      <Icon sx={{ color, fontSize: 17 }} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color }}>{title}</Typography>
    </Box>
    <Box sx={{ p: 1.5 }}>{children}</Box>
  </Box>
);

const InfoRow = ({ label, value, ltr }) => (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    gap: 1.25, py: 0.5, borderBottom: '1px dashed',
    borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' },
  }}>
    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', flexShrink: 0 }}>{label}</Typography>
    <Typography noWrap title={typeof value === 'string' ? value : undefined} sx={{
      fontSize: 12, fontWeight: 700, textAlign: 'left',
      direction: ltr ? 'ltr' : 'inherit', minWidth: 0,
    }}>{value || '—'}</Typography>
  </Box>
);

const digitsOrDash = (value) => (value ? toPersianDigits(value) : '—');


/* پروندهٔ سازمان/شخص — همهٔ اطلاعات یک‌نگاه */
const DetailsDialog = ({ open, row, onClose, onEdit, canEdit }) => {
  if (!row) return null;
  const color = kindColor(row.kind);
  const links = [
    row.account_display && { label: 'حساب تفصیلی', value: row.account_display },
    row.contract_party_name && { label: 'طرف قرارداد', value: row.contract_party_name },
    row.organization_name && { label: 'سازمان مکاتبات', value: row.organization_name },
    row.correspondent_name && { label: 'مخاطب مکاتبات', value: row.correspondent_name },
  ].filter(Boolean);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: '10px', bgcolor: `${color}16`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <GroupsIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 900 }} noWrap>{row.full_name || row.name}</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {KIND_LABEL[row.kind] || row.kind} · کد {digitsOrDash(row.code)}
          </Typography>
        </Box>
        {statusChip(row)}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <InfoCard title="هویت حقوقی" icon={BadgeIcon} color={color}>
              <InfoRow label="شناسه ملی / کد ملی" value={digitsOrDash(row.national_id)} ltr />
              <InfoRow label="کد اقتصادی" value={digitsOrDash(row.economic_code)} ltr />
              <InfoRow label="شماره ثبت" value={digitsOrDash(row.registration_number)} ltr />
              <InfoRow label="شعبه / واحد" value={row.unit_name} />
              <InfoRow label="نهاد بالادستی" value={row.parent_name} />
              {row.kind === 'shareholder' ? (
                <InfoRow label="درصد سهام" value={row.share_percent != null ? `${formatPersianNumber(row.share_percent)}٪` : '—'} />
              ) : null}
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoCard title="راه‌های تماس" icon={PhoneIcon} color={color}>
              <InfoRow label="تلفن" value={digitsOrDash(row.phone)} ltr />
              <InfoRow label="همراه" value={digitsOrDash(row.mobile)} ltr />
              <InfoRow label="دورنگار" value={digitsOrDash(row.fax)} ltr />
              <InfoRow label="ایمیل" value={row.email} ltr />
              <InfoRow label="وب‌سایت" value={row.website} ltr />
              <InfoRow label="کد پستی" value={digitsOrDash(row.postal_code)} ltr />
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoCard title="شخص رابط" icon={GroupsIcon} color={color}>
              <InfoRow label="نام" value={row.contact_person} />
              <InfoRow label="سمت" value={row.contact_title} />
              <InfoRow label="تلفن" value={digitsOrDash(row.contact_phone)} ltr />
              <InfoRow label="آدرس" value={row.address} />
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoCard title="اطلاعات بانکی" icon={AccountBalanceIcon} color={color}>
              <InfoRow label="بانک" value={row.bank_name} />
              <InfoRow label="شماره حساب" value={digitsOrDash(row.account_number)} ltr />
              <InfoRow label="شبا" value={digitsOrDash(row.iban)} ltr />
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoCard title="ارتباط با ماژول‌ها" icon={LinkIcon} color={color}>
              {links.length ? links.map((item) => (
                <InfoRow key={item.label} label={item.label} value={item.value} />
              )) : (
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                  هنوز به حساب تفصیلی، طرف قرارداد یا مکاتباتی وصل نشده است.
                </Typography>
              )}
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoCard title="توضیحات" icon={NotesIcon} color={color}>
              <Typography sx={{
                fontSize: 12, whiteSpace: 'pre-wrap',
                color: row.notes ? 'text.primary' : 'text.secondary',
              }}>
                {row.notes || 'توضیحی ثبت نشده است.'}
              </Typography>
              {row.children_count ? (
                <Typography sx={{ mt: 0.75, fontSize: 11.5, color }}>
                  {toPersianDigits(row.children_count)} زیرمجموعه ثبت شده است.
                </Typography>
              ) : null}
            </InfoCard>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>بستن</Button>
        {canEdit ? (
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(row)}>ویرایش</Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};


const SectionTitle = ({ children, color }) => (
  <Typography sx={{ fontSize: 12, fontWeight: 800, color: color || 'text.secondary', mb: 1 }}>
    {children}
  </Typography>
);

/* فرم ثبت/ویرایش سازمان یا شخص — بخش‌بندی‌شده و پویا بر اساس نوع */
const FormDialog = ({ open, initial, kinds, accent, onClose, onSaved }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(toForm(initial));
  const [error, setError] = useState('');

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
        ? axiosInstance.patch(`/accounting/org-parties/${payload.id}/`, body)
        : axiosInstance.post('/accounting/org-parties/', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-parties'] });
      qc.invalidateQueries({ queryKey: ['org-parties-stats'] });
      onSaved?.();
      onClose?.();
    },
    onError: (err) => setError(apiError(err, 'خطا در ذخیرهٔ سازمان/شخص')),
  });

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const isShareholder = form.kind === 'shareholder';
  const activeKind = kinds.find((item) => item.value === form.kind);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {form.id ? 'ویرایش سازمان / شخص' : 'ثبت سازمان یا شخص جدید'}
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
          پس از ثبت، همین رکورد را می‌توانید به حساب تفصیلی، طرف قرارداد یا مکاتبات وصل کنید.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.75}>
          <Box>
            <SectionTitle color={accent}>نوع و عنوان</SectionTitle>
            <Grid container spacing={1.25}>
              <Grid item xs={12} md={5}>
                <TextField select size="small" fullWidth label="نوع سازمان / شخص"
                  value={form.kind} onChange={set('kind')}
                  helperText={activeKind?.hint || ''}
                  FormHelperTextProps={{ sx: { fontSize: 10.5, mx: 0.25 } }}>
                  {kinds.map((item) => (
                    <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="نام / عنوان" required
                  value={form.name} onChange={set('name')} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField size="small" fullWidth label="شعبه / واحد"
                  value={form.unit_name} onChange={set('unit_name')}
                  placeholder="مثلاً شعبه ۱۲ تهران" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="کد"
                  value={form.code} onChange={set('code')}
                  placeholder="خالی = خودکار" />
              </Grid>
              <Grid item xs={12} md={5}>
                <RemoteLookup
                  label="نهاد بالادستی"
                  endpoint="/accounting/org-parties/"
                  value={form.parent}
                  valueLabel={initial?.parent_name}
                  onChange={(id) => setForm((prev) => ({ ...prev, parent: id }))}
                  getOptionLabel={(row) => `${row.code ? `${row.code} · ` : ''}${row.name}${row.unit_name ? ` (${row.unit_name})` : ''}`}
                  helperText="مثلاً «سازمان تأمین اجتماعی» برای شعبه‌ها"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Switch size="small" checked={form.is_active}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} />}
                  label={<Typography sx={{ fontSize: 12 }}>فعال</Typography>}
                />
              </Grid>
              {isShareholder ? (
                <Grid item xs={12} md={4}>
                  <TextField size="small" fullWidth label="درصد سهام" type="number"
                    inputProps={{ min: 0, max: 100, step: '0.01' }}
                    value={form.share_percent} onChange={set('share_percent')} />
                </Grid>
              ) : null}
            </Grid>
          </Box>

          <Divider />

          <Box>
            <SectionTitle color={accent}>هویت حقوقی</SectionTitle>
            <Grid container spacing={1.25}>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="شناسه ملی / کد ملی"
                  value={form.national_id} onChange={set('national_id')} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="کد اقتصادی"
                  value={form.economic_code} onChange={set('economic_code')} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="شماره ثبت"
                  value={form.registration_number} onChange={set('registration_number')} />
              </Grid>
            </Grid>
          </Box>


          <Divider />

          <Box>
            <SectionTitle color={accent}>راه‌های تماس و شخص رابط</SectionTitle>
            <Grid container spacing={1.25}>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth label="تلفن" value={form.phone} onChange={set('phone')} />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth label="همراه" value={form.mobile} onChange={set('mobile')} />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth label="دورنگار" value={form.fax} onChange={set('fax')} />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField size="small" fullWidth label="کد پستی" value={form.postal_code} onChange={set('postal_code')} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField size="small" fullWidth label="ایمیل" value={form.email} onChange={set('email')} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField size="small" fullWidth label="وب‌سایت" value={form.website} onChange={set('website')} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="شخص رابط" value={form.contact_person} onChange={set('contact_person')} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="سمت شخص رابط" value={form.contact_title} onChange={set('contact_title')} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="تلفن شخص رابط" value={form.contact_phone} onChange={set('contact_phone')} />
              </Grid>
              <Grid item xs={12}>
                <TextField size="small" fullWidth label="آدرس" multiline rows={2}
                  value={form.address} onChange={set('address')} />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <SectionTitle color={accent}>اطلاعات بانکی</SectionTitle>
            <Grid container spacing={1.25}>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="بانک" value={form.bank_name} onChange={set('bank_name')} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="شماره حساب" value={form.account_number} onChange={set('account_number')} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="شماره شبا" value={form.iban} onChange={set('iban')} />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <SectionTitle color={accent}>ارتباط با ماژول‌ها (اختیاری)</SectionTitle>
            <Grid container spacing={1.25}>
              <Grid item xs={12} md={6}>
                <RemoteLookup
                  label="حساب تفصیلی مرتبط"
                  endpoint="/accounting/auxiliary-accounts/"
                  value={form.account}
                  valueLabel={initial?.account_display}
                  onChange={(id) => setForm((prev) => ({ ...prev, account: id }))}
                  getOptionLabel={(row) => `${row.code} - ${row.name}`}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <RemoteLookup
                  label="طرف قرارداد مرتبط"
                  endpoint="/contract-parties/"
                  value={form.contract_party}
                  valueLabel={initial?.contract_party_name}
                  onChange={(id) => setForm((prev) => ({ ...prev, contract_party: id }))}
                  getOptionLabel={(row) => row.name}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <RemoteLookup
                  label="سازمان در مکاتبات"
                  endpoint="/organizations/"
                  value={form.organization}
                  valueLabel={initial?.organization_name}
                  onChange={(id) => setForm((prev) => ({ ...prev, organization: id }))}
                  getOptionLabel={(row) => row.name}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <RemoteLookup
                  label="مخاطب در مکاتبات"
                  endpoint="/correspondents/"
                  value={form.correspondent}
                  valueLabel={initial?.correspondent_name}
                  onChange={(id) => setForm((prev) => ({ ...prev, correspondent: id }))}
                  getOptionLabel={(row) => row.name}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <TextField size="small" fullWidth label="توضیحات" multiline rows={2}
            value={form.notes} onChange={set('notes')} />

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={save.isPending}>انصراف</Button>
        <Button
          variant="contained"
          disabled={!form.name || save.isPending}
          onClick={() => save.mutate(form)}
        >
          {form.id ? 'ذخیره تغییرات' : 'ثبت'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const DEFAULT_PAGE_SIZE = 25;

const pageWindow = (current, totalPages) => {
  const size = 5;
  const start = Math.max(0, Math.min(current - 2, totalPages - size));
  const end = Math.min(totalPages, start + size);
  return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
};

const OrgPartiesPage = () => {
  const moduleTheme = useModuleTheme();
  const { currentApp } = useApplication();
  const { getPalette } = useModulePalette();
  const { user } = useAuth();
  const perms = useMemo(() => orgPartyPermissions(user), [user]);
  const accent = getPalette(currentApp?.slug)?.accent || FALLBACK_ACCENT;
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const debouncedSearch = useDebounced(search.trim());
  const [kindFilter, setKindFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  useEffect(() => { setPage(0); }, [debouncedSearch, kindFilter, statusFilter]);

  const params = useMemo(() => {
    const next = { page_size: DEFAULT_PAGE_SIZE, ordering: 'name' };
    if (debouncedSearch) next.search = debouncedSearch;
    if (kindFilter.length) next.kind = kindFilter.join(',');
    if (statusFilter) next.is_active = statusFilter;
    return next;
  }, [debouncedSearch, kindFilter, statusFilter]);

  const listQuery = useQuery({
    queryKey: ['org-parties', params, page],
    queryFn: () => axiosInstance.get('/accounting/org-parties/', {
      params: { ...params, page: page + 1 },
    }).then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const rows = asList(listQuery.data);
  const total = listQuery.data?.count ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const pageNumbers = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);

  const statsQuery = useQuery({
    queryKey: ['org-parties-stats'],
    queryFn: () => axiosInstance.get('/accounting/org-parties/stats/').then((response) => response.data),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const stats = statsQuery.data || {};

  const kinds = useMemo(() => {
    const meta = Array.isArray(stats.kinds_meta) ? stats.kinds_meta : LOCAL_KINDS;
    return meta.map((item) => ({ ...item, color: KIND_COLORS[item.value] || KIND_COLORS.other }));
  }, [stats.kinds_meta]);

  const kindCounts = useMemo(() => {
    const map = {};
    (stats.kinds || []).forEach((item) => { map[item.kind] = item.count; });
    return map;
  }, [stats.kinds]);

  const refreshAll = () => {
    listQuery.refetch();
    statsQuery.refetch();
  };


  const toggleStatus = useMutation({
    mutationFn: (id) => axiosInstance.post(`/accounting/org-parties/${id}/toggle_status/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-parties'] });
      qc.invalidateQueries({ queryKey: ['org-parties-stats'] });
      setError('');
    },
    onError: (err) => setError(apiError(err, 'خطا در تغییر وضعیت')),
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/org-parties/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-parties'] });
      qc.invalidateQueries({ queryKey: ['org-parties-stats'] });
      setDeleteRow(null);
      setDetailsRow(null);
      setError('');
    },
    onError: (err) => {
      setDeleteRow(null);
      setError(apiError(err, 'خطا در حذف سازمان/شخص'));
    },
  });

  const openCreate = () => { setFormInitial(null); setFormOpen(true); };
  const openEdit = (row) => { setFormInitial(row); setFormOpen(true); setDetailsRow(null); };
  const toggleKind = (kind) => setKindFilter((prev) => (
    prev.includes(kind) ? prev.filter((item) => item !== kind) : [...prev, kind]
  ));
  const resetFilters = () => { setSearch(''); setKindFilter([]); setStatusFilter(''); };
  const activeFilterCount = (debouncedSearch ? 1 : 0) + kindFilter.length + (statusFilter ? 1 : 0);

  const kpis = [
    { label: 'کل سازمان‌ها و اشخاص', value: stats.total ?? total, color: accent },
    { label: 'فعال', value: stats.active ?? 0, color: '#0f766e' },
    { label: 'غیرفعال', value: stats.inactive ?? 0, color: '#64748b' },
    { label: 'دارای ارتباط', value: stats.linked ?? 0, color: '#8b5cf6' },
  ];

  const columns = useMemo(() => [
    {
      key: 'code', label: 'کد', width: 96, align: 'center',
      render: (row) => (
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {row.code ? toPersianDigits(row.code) : '—'}
        </Typography>
      ),
    },
    {
      key: 'name', label: 'نام / عنوان',
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{row.name}</Typography>
          <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            {[row.unit_name, row.parent_name].filter(Boolean).join(' · ') || '—'}
          </Typography>
        </Box>
      ),
    },
    { key: 'kind', label: 'نوع', width: 150, align: 'center', render: (row) => kindChip(row.kind) },
    {
      key: 'national_id', label: 'شناسه ملی', width: 118, align: 'center',
      render: (row) => (
        <Typography sx={{ fontSize: 11.5 }}>
          {row.national_id ? toPersianDigits(row.national_id) : '—'}
        </Typography>
      ),
    },
    {
      key: 'mobile', label: 'همراه / تلفن', width: 130, align: 'center',
      render: (row) => (
        <Typography sx={{ fontSize: 11.5 }}>
          {toPersianDigits(row.mobile || row.phone || '') || '—'}
        </Typography>
      ),
    },
    {
      key: 'account_display', label: 'حساب تفصیلی', width: 160,
      render: (row) => (
        <Typography noWrap sx={{ fontSize: 11 }} color={row.account_display ? 'text.primary' : 'text.secondary'}>
          {row.account_display || '—'}
        </Typography>
      ),
    },
    { key: 'is_active', label: 'وضعیت', width: 90, align: 'center', render: (row) => statusChip(row) },
    {
      key: 'actions', label: 'عملیات', width: 136, align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.25} justifyContent="center">
          <Tooltip title="پرونده">
            <IconButton size="small" aria-label="پرونده" onClick={(event) => {
              event.stopPropagation();
              setDetailsRow(row);
            }}>
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {perms.canEdit ? (
            <Tooltip title="ویرایش">
              <IconButton size="small" aria-label="ویرایش" onClick={(event) => {
                event.stopPropagation();
                openEdit(row);
              }}>
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          {perms.canEdit ? (
            <Tooltip title={row.is_active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}>
              <IconButton size="small" aria-label="تغییر وضعیت" onClick={(event) => {
                event.stopPropagation();
                toggleStatus.mutate(row.id);
              }}>
                {row.is_active
                  ? <BlockIcon sx={{ fontSize: 16, color: '#b45309' }} />
                  : <CheckCircleIcon sx={{ fontSize: 16, color: '#0f766e' }} />}
              </IconButton>
            </Tooltip>
          ) : null}
          {perms.canDelete ? (
            <Tooltip title="حذف">
              <IconButton size="small" aria-label="حذف" onClick={(event) => {
                event.stopPropagation();
                setDeleteRow(row);
              }}>
                <DeleteIcon sx={{ fontSize: 16, color: '#be123c' }} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      ),
    },
  ], [toggleStatus, perms]);


  return (
    <Box>
      <PageHeader
        icon={<GroupsIcon />}
        title="سازمان‌ها و اشخاص"
        subtitle="تعاریف حسابداری — مرجع یکتای نهادها، مراجع قانونی و نظارتی، کارفرمایان، سهامداران و اشخاص"
        badge={(
          <Chip
            size="small"
            label={`${formatPersianNumber(stats.total ?? total)} مورد`}
            sx={{ bgcolor: `${accent}18`, color: accent, fontWeight: 800, fontSize: 11 }}
          />
        )}
        actions={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="بازخوانی">
              <IconButton size="small" aria-label="بازخوانی" onClick={refreshAll}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <PrintButton target="main" title="سازمان‌ها و اشخاص" orientation="landscape" label="چاپ" />
            {perms.canCreate ? (
              <Button variant="contained" size="small" startIcon={<AddIcon />}
                onClick={openCreate} sx={{ bgcolor: accent }}>
                ثبت سازمان یا شخص
              </Button>
            ) : null}
          </Stack>
        )}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 1, borderRadius: '12px' }} onClose={() => setError('')}>
          <Typography sx={{ fontSize: 12 }}>{error}</Typography>
        </Alert>
      ) : null}

      {/* شاخص‌ها */}
      <Box sx={{
        display: 'grid', gap: 1, mb: 1.25,
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
      }}>
        {kpis.map((kpi) => (
          <Paper key={kpi.label} elevation={0} sx={{
            p: 1, minWidth: 0,
            borderRadius: 'var(--hrms-info-card-radius, 14px)',
            border: '1px solid', borderColor: 'divider',
          }}>
            <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75 }}>{kpi.label}</Typography>
            <Typography noWrap sx={{
              fontSize: 16, fontWeight: 900, color: kpi.color,
              fontFamily: 'var(--hrms-table-number-font, inherit)',
            }}>
              {formatPersianNumber(kpi.value)}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* فیلتر نوع — چیپ‌های قابل انتخاب */}
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
        <Chip
          label={`همه (${formatPersianNumber(stats.total ?? total)})`}
          onClick={() => setKindFilter([])}
          sx={{
            height: 26, fontSize: 11.5, fontWeight: 800,
            bgcolor: kindFilter.length ? 'transparent' : `${accent}18`,
            color: kindFilter.length ? 'text.secondary' : accent,
            border: `1px solid ${kindFilter.length ? 'transparent' : accent}`,
          }}
        />
        {kinds.map((kind) => {
          const active = kindFilter.includes(kind.value);
          return (
            <Chip
              key={kind.value}
              label={`${kind.label} (${formatPersianNumber(kindCounts[kind.value] || 0)})`}
              onClick={() => toggleKind(kind.value)}
              title={kind.hint}
              sx={{
                height: 26, fontSize: 11.5, fontWeight: 700,
                bgcolor: active ? `${kind.color}1c` : 'transparent',
                color: active ? kind.color : 'text.secondary',
                border: `1px solid ${active ? kind.color : 'divider'}`,
              }}
            />
          );
        })}
      </Stack>


      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper', px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}
          alignItems={{ xs: 'stretch', md: 'center' }} useFlexGap sx={{ mb: 1 }}>
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجو: نام، شعبه، شناسه ملی، کد اقتصادی، شماره ثبت، تلفن، شخص رابط…"
            sx={{ flex: 1, minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: accent }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="پاک کردن جست‌وجو" onClick={() => setSearch('')}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <TextField select size="small" label="وضعیت" value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">همه</MenuItem>
            <MenuItem value="true">فعال</MenuItem>
            <MenuItem value="false">غیرفعال</MenuItem>
          </TextField>
          {activeFilterCount ? (
            <Button size="small" variant="text" startIcon={<ClearIcon />} onClick={resetFilters}>
              حذف فیلترها ({toPersianDigits(activeFilterCount)})
            </Button>
          ) : null}
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {listQuery.isFetching ? 'در حال دریافت…' : `${formatPersianNumber(total)} رکورد`}
          </Typography>
        </Stack>

        {listQuery.isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={26} /></Box>
        ) : (
          <ModuleTable
            tableTheme={moduleTheme.tableTheme}
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => setDetailsRow(row)}
            rowHeight={moduleTheme.tableTheme.rowHeight}
            emptyText="سازمان یا شخصی ثبت نشده است؛ با «ثبت سازمان یا شخص» شروع کنید."
            ariaLabel="فهرست سازمان‌ها و اشخاص"
            minWidth={980}
          />
        )}

        <ModulePager
          tableTheme={moduleTheme.tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={total}
          pageSize={DEFAULT_PAGE_SIZE}
          unit="رکورد"
        />
      </Paper>

      <DetailsDialog
        open={Boolean(detailsRow)}
        row={detailsRow}
        onClose={() => setDetailsRow(null)}
        onEdit={openEdit}
        canEdit={perms.canEdit}
      />

      <FormDialog
        open={formOpen}
        initial={formInitial}
        kinds={kinds}
        accent={accent}
        onClose={() => setFormOpen(false)}
        onSaved={() => setError('')}
      />

      <Dialog open={Boolean(deleteRow)} onClose={() => setDeleteRow(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>حذف سازمان / شخص</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5 }}>
            آیا «{deleteRow?.full_name || deleteRow?.name}» حذف شود؟ این عمل بازگشت‌پذیر نیست.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteRow(null)}>انصراف</Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => remove.mutate(deleteRow.id)}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrgPartiesPage;
