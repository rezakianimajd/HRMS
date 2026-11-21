import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Avatar, Grid, TextField, Button, CircularProgress,
  Alert, Stack, Tooltip, Chip, alpha, MenuItem,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DrawIcon from '@mui/icons-material/Draw';
import GroupsIcon from '@mui/icons-material/Groups';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import NotesIcon from '@mui/icons-material/Notes';
import axiosInstance from '../core/api/axiosConfig';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { PageHeader, SURFACE, SOFT, TabsCard } from '../core/components/settings/settingsUi';
import { toPersianDigits, toEnglishDigits } from '../core/utils/numberUtils';
import { SectionCard, Field, FormGrid, NumericField } from './companyProfile/companyProfileUi';
import CompanyShareholdersPanel from './companyProfile/CompanyShareholdersPanel';
import CompanyBoardMembersPanel from './companyProfile/CompanyBoardMembersPanel';
import CompanyBankAccountsPanel from './companyProfile/CompanyBankAccountsPanel';
import CompanySignatoriesPanel from './companyProfile/CompanySignatoriesPanel';

const glassCard = { ...SURFACE };
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12.5 } };
const LEGAL_FORMS = [
  ['private_joint_stock', 'سهامی خاص'], ['public_joint_stock', 'سهامی عام'],
  ['limited_liability', 'با مسئولیت محدود'], ['general_partnership', 'تضامنی'],
  ['cooperative', 'تعاونی'], ['sole_proprietorship', 'مالکیت فردی'],
  ['public_institution', 'مؤسسه/نهاد عمومی'], ['other', 'سایر'],
];
const TABS = [
  { key: 'legal', label: 'مشخصات حقوقی', icon: <GavelIcon /> },
  { key: 'contact', label: 'تماس و نشانی', icon: <ContactPhoneIcon /> },
  { key: 'capital', label: 'سرمایه و سهام', icon: <AccountBalanceIcon /> },
  { key: 'representative', label: 'نماینده و مشاوران', icon: <WorkOutlineIcon /> },
  { key: 'bank', label: 'حساب‌های بانکی', icon: <AccountBalanceIcon /> },
  { key: 'signatories', label: 'صاحبان امضا', icon: <DrawIcon /> },
  { key: 'shareholders', label: 'سهام‌داران', icon: <GroupsIcon /> },
  { key: 'board', label: 'هیئت مدیره', icon: <AccountTreeIcon /> },
  { key: 'notes', label: 'توضیحات و مهر', icon: <NotesIcon /> },
];
const cleanDate = (value) => value || null;
const profilePayload = (form) => ({
  ...form,
  registration_date: cleanDate(form.registration_date),
  established_date: cleanDate(form.established_date),
  fiscal_year_end: cleanDate(form.fiscal_year_end),
});

const CompanyProfilePage = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then((r) => r.data),
  });
  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data) => axiosInstance.put('/settings/company-profile/update/', profilePayload(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      qc.invalidateQueries({ queryKey: ['company-profile-layout'] });
      qc.invalidateQueries({ queryKey: ['company-branding'] });
      setError(''); setSaved(true); setTimeout(() => setSaved(false), 2500);
    },
    onError: (event) => setError(event.response?.data?.error || 'خطا در ذخیره'),
  });

  const logoMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('logo', file);
      return axiosInstance.post('/settings/company-profile/logo/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (response) => {
      setForm((previous) => ({ ...previous, logo_url: response.data.logo_url, logo: response.data.logo }));
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      qc.invalidateQueries({ queryKey: ['company-profile-layout'] });
      qc.invalidateQueries({ queryKey: ['company-branding'] });
      setSaved(true); setTimeout(() => setSaved(false), 2500); setUploading(false);
    },
    onError: () => setUploading(false),
  });

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const handleLogo = (event) => {
    const file = event.target.files?.[0];
    if (file) { setUploading(true); logoMutation.mutate(file); }
  };

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box>;
  const tabKey = TABS[tab]?.key;

  return (
    <Box>
      <PageHeader icon={<BusinessIcon />} title="مشخصات شرکت"
        subtitle="پروندهٔ جامع حقوقی، مالی، بانکی و حاکمیت شرکتی — همراه با چند صاحب امضا"
        color={SOFT.indigo}
        actions={(
          <Button variant="contained" startIcon={updateMutation.isPending ? null : <SaveIcon />}
            onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}
            sx={{ bgcolor: SOFT.indigo, borderRadius: '9px', px: 2.5, fontSize: 12, boxShadow: 'none', '&:hover': { bgcolor: '#6f7ecb' } }}>
            {updateMutation.isPending ? <CircularProgress size={18} color="inherit" /> : 'ذخیره مشخصات'}
          </Button>
        )}
      />

      <Paper sx={{ ...glassCard, mb: 1.75, p: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.25, flexWrap: 'wrap' }}>
          <Box sx={{ position: 'relative' }}>
            {form.logo_url
              ? <Avatar src={form.logo_url} variant="rounded" sx={{ width: 72, height: 72, borderRadius: '18px', border: '1px solid', borderColor: 'divider' }} />
              : <Avatar variant="rounded" sx={{ width: 72, height: 72, borderRadius: '18px', bgcolor: alpha(SOFT.indigo, 0.14), color: SOFT.indigo }}><BusinessIcon sx={{ fontSize: 34 }} /></Avatar>}
            <Tooltip title="تغییر لوگو">
              <Box onClick={() => document.getElementById('logo-input').click()} sx={{
                position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderRadius: '50%',
                background: SOFT.indigo, color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', boxShadow: `0 3px 10px ${SOFT.indigo}44`,
              }}>
                {uploading ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon sx={{ fontSize: 17 }} />}
              </Box>
            </Tooltip>
            <input id="logo-input" type="file" accept="image/*" hidden onChange={handleLogo} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 900, mb: 0.4 }}>{toPersianDigits(form.legal_name) || 'نام شرکت'}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.7 }}>
              {form.brand_name ? `برند: ${form.brand_name}` : 'نام حقوقی و اطلاعات ثبتی شرکت را کامل کنید.'}
            </Typography>
            <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
              {form.legal_form_display ? <Chip size="small" label={form.legal_form_display} variant="outlined" /> : null}
              {form.economic_code ? <Chip size="small" label={`کد اقتصادی: ${toPersianDigits(form.economic_code)}`} variant="outlined" /> : null}
              {form.national_id ? <Chip size="small" label={`شناسه ملی: ${toPersianDigits(form.national_id)}`} variant="outlined" /> : null}
              {form.registration_number ? <Chip size="small" label={`شماره ثبت: ${toPersianDigits(form.registration_number)}`} variant="outlined" /> : null}
            </Stack>
          </Box>
        </Box>
      </Paper>
      {saved && <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success" sx={{ mb: 2, borderRadius: '12px' }}>مشخصات شرکت با موفقیت ذخیره شد.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError('')}>{error}</Alert>}
      <TabsCard tabs={TABS} value={tab} onChange={setTab} activeColor={SOFT.indigo} />
      <Box>
        {tabKey === 'legal' && <LegalTab form={form} set={set} />}
        {tabKey === 'contact' && <ContactTab form={form} set={set} />}
        {tabKey === 'capital' && <CapitalTab form={form} set={set} />}
        {tabKey === 'representative' && <RepresentativeTab form={form} set={set} />}
        {tabKey === 'bank' && <CompanyBankAccountsPanel />}
        {tabKey === 'signatories' && <CompanySignatoriesPanel />}
        {tabKey === 'shareholders' && <CompanyShareholdersPanel />}
        {tabKey === 'board' && <CompanyBoardMembersPanel />}
        {tabKey === 'notes' && <NotesTab form={form} set={set} />}
      </Box>
    </Box>
  );
};

const LegalTab = ({ form, set }) => (
  <SectionCard icon={<GavelIcon />} title="مشخصات حقوقی و ثبتی" color={SOFT.indigo}
    subtitle="اطلاعات هویتی، ثبت شرکت، شناسه‌های قانونی و مالیاتی">
    <FormGrid>
      <Field label="نام کامل حقوقی" value={form.legal_name} onChange={(value) => set('legal_name', value)} md={8} />
      <Field label="نام تجاری / برند" value={form.brand_name} onChange={(value) => set('brand_name', value)} />
      <Grid item xs={12} md={4}>
        <TextField select size="small" fullWidth sx={fieldSx} label="شکل حقوقی"
          value={form.legal_form || ''} onChange={(event) => set('legal_form', event.target.value)}>
          <MenuItem value="">انتخاب کنید</MenuItem>
          {LEGAL_FORMS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
      </Grid>
      <Field label="شماره ثبت" value={form.registration_number} onChange={(value) => set('registration_number', value)} />
      <Field label="اداره ثبت" value={form.registration_office} onChange={(value) => set('registration_office', value)} />
      <Grid item xs={12} md={4}><JalaliDatePicker fullWidth sx={fieldSx} label="تاریخ ثبت شرکت"
        value={form.registration_date || ''} onChange={(value) => set('registration_date', value)} /></Grid>
      <Field label="شناسه ملی" value={form.national_id} onChange={(value) => set('national_id', value)} />
      <Field label="کد اقتصادی" value={form.economic_code} onChange={(value) => set('economic_code', value)} />
      <Field label="شناسه مالیاتی" value={form.tax_id} onChange={(value) => set('tax_id', value)} />
      <Field label="حوزه مالیاتی" value={form.tax_office} onChange={(value) => set('tax_office', value)} />
      <Field label="کد بیمه‌ای کارفرما" value={form.insurance_code} onChange={(value) => set('insurance_code', value)} />
      <Field label="شماره DUNS / کد بین‌المللی" value={form.duns_number} onChange={(value) => set('duns_number', value)} />
      <Field label="نماد بورسی" value={form.stock_symbol} onChange={(value) => set('stock_symbol', value)} />
      <Grid item xs={12} md={4}><JalaliDatePicker fullWidth sx={fieldSx} label="تاریخ تأسیس"
        value={form.established_date || ''} onChange={(value) => set('established_date', value)} /></Grid>
    </FormGrid>
  </SectionCard>
);

const ContactTab = ({ form, set }) => (
  <SectionCard icon={<ContactPhoneIcon />} title="اطلاعات تماس و نشانی" color={SOFT.green}
    subtitle="راه‌های ارتباطی رسمی، نشانی قانونی و موقعیت جغرافیایی">
    <FormGrid>
      <Field label="تلفن اصلی" value={form.phone} onChange={(value) => set('phone', value)} />
      <Field label="تلفن دوم" value={form.secondary_phone} onChange={(value) => set('secondary_phone', value)} />
      <Field label="فکس" value={form.fax} onChange={(value) => set('fax', value)} />
      <Field label="موبایل" value={form.mobile} onChange={(value) => set('mobile', value)} />
      <Field label="ایمیل" value={form.email} onChange={(value) => set('email', value)} />
      <Field label="وب‌سایت" value={form.website} onChange={(value) => set('website', value)} />
      <Field label="کشور" value={form.country} onChange={(value) => set('country', value)} />
      <Field label="استان" value={form.province} onChange={(value) => set('province', value)} />
      <Field label="شهر" value={form.city} onChange={(value) => set('city', value)} />
      <Field label="کد پستی" value={form.postal_code} onChange={(value) => set('postal_code', value)} />
      <Field label="مختصات جغرافیایی" value={form.coordinates} onChange={(value) => set('coordinates', value)} />
      <Grid item xs={12}><TextField size="small" fullWidth sx={fieldSx} multiline rows={2} label="نشانی قانونی"
        value={form.address || ''} onChange={(event) => set('address', event.target.value)} /></Grid>
      <Grid item xs={12}><TextField size="small" fullWidth sx={fieldSx} label="ادامهٔ آدرس"
        value={form.address_line2 || ''} onChange={(event) => set('address_line2', event.target.value)} /></Grid>
    </FormGrid>
  </SectionCard>
);

const CapitalTab = ({ form, set }) => (
  <SectionCard icon={<AccountBalanceIcon />} title="سرمایه، سهام و سال مالی" color={SOFT.blue}
    subtitle="سرمایهٔ ثبت‌شده و پرداخت‌شده، ارزش اسمی سهام و اطلاعات مالی رسمی">
    <FormGrid>
      <NumericField label="سرمایهٔ ثبت‌شده (ریال)" value={form.registered_capital} onChange={(value) => set('registered_capital', value)} />
      <NumericField label="سرمایهٔ پرداخت‌شده (ریال)" value={form.paid_capital} onChange={(value) => set('paid_capital', value)} />
      <NumericField label="تعداد کل سهام" value={form.total_shares} onChange={(value) => set('total_shares', value)} />
      <NumericField label="ارزش اسمی هر سهم (ریال)" value={form.share_nominal_value} onChange={(value) => set('share_nominal_value', value)} />
      <Grid item xs={12} md={4}><JalaliDatePicker fullWidth sx={fieldSx} label="پایان سال مالی"
        value={form.fiscal_year_end || ''} onChange={(value) => set('fiscal_year_end', value)} /></Grid>
      <Field label="بازرس قانونی" value={form.legal_auditor} onChange={(value) => set('legal_auditor', value)} />
      <Field label="مشاور مالی" value={form.financial_advisor} onChange={(value) => set('financial_advisor', value)} />
    </FormGrid>
  </SectionCard>
);

const RepresentativeTab = ({ form, set }) => (
  <SectionCard icon={<WorkOutlineIcon />} title="نماینده قانونی / مدیرعامل" color={SOFT.amber}
    subtitle="مشخصات فردی که در قراردادها و اسناد رسمی از طرف شرکت امضا می‌کند">
    <FormGrid>
      <Field label="نام نماینده حقوقی / مدیرعامل" value={form.employer_rep_name} onChange={(value) => set('employer_rep_name', value)} md={8} />
      <Field label="سمت نماینده" value={form.employer_rep_title} onChange={(value) => set('employer_rep_title', value)} />
      <Field label="کد ملی نماینده" value={form.employer_rep_national_id} onChange={(value) => set('employer_rep_national_id', value)} />
    </FormGrid>
  </SectionCard>
);

const NotesTab = ({ form, set }) => {
  const qc = useQueryClient();
  const [uploading, setUploading] = React.useState(false);
  const sealMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('seal_image', file);
      return axiosInstance.post('/settings/company-profile/seal/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (response) => {
      set('seal_image_url', response.data.seal_image_url);
      set('seal_image', response.data.seal_image);
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      qc.invalidateQueries({ queryKey: ['company-branding'] });
      setUploading(false);
    },
    onError: () => setUploading(false),
  });

  return (
    <SectionCard icon={<NotesIcon />} title="توضیحات، مهر و اطلاعات تکمیلی" color={SOFT.slate}
      subtitle="هر توضیح دیگری که باید در پروندهٔ جامع شرکت بماند">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
        <Box sx={{ width: 150, height: 100, borderRadius: '10px', border: '1px dashed', borderColor: 'divider', display: 'grid', placeItems: 'center', overflow: 'hidden', bgcolor: 'background.paper' }}>
          {form.seal_image_url ? (
            <Box component="img" src={form.seal_image_url} alt="مهر شرکت" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : <NotesIcon sx={{ color: SOFT.slate }} />}
        </Box>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 0.5 }}>تصویر مهر رسمی شرکت</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>
            برای اسناد رسمی و چاپ قرارداد استفاده می‌شود.
          </Typography>
          <Button size="small" variant="outlined" component="label" disabled={uploading}
            sx={{ borderColor: alpha(SOFT.slate, 0.4), color: '#475569' }}>
            {uploading ? 'در حال بارگذاری…' : 'انتخاب تصویر مهر'}
            <input hidden type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) { setUploading(true); sealMutation.mutate(file); }
            }} />
          </Button>
        </Box>
      </Stack>
      <TextField size="small" fullWidth sx={fieldSx} multiline minRows={5} label="توضیحات شرکت"
        value={form.description || ''} onChange={(event) => set('description', event.target.value)} />
    </SectionCard>
  );
};

export default CompanyProfilePage;
