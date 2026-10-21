import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, TextField, Button, CircularProgress,
  Alert, Stack, Tooltip, Chip, alpha,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import BadgeIcon from '@mui/icons-material/Badge';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { PageHeader, SURFACE, SOFT } from '../core/components/settings/settingsUi';
import { toPersianDigits, toEnglishDigits } from '../core/utils/numberUtils';

const glassCard = { ...SURFACE };

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12.5 },
};

const SectionHeader = ({ icon, title, subtitle, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5, flexWrap: 'wrap' }}>
    <Avatar variant="rounded" sx={{
      width: 32, height: 32, borderRadius: '9px',
      bgcolor: alpha(color, 0.14), color,
    }}>
      {React.cloneElement(icon, { sx: { fontSize: 18 } })}
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h6">{title}</Typography>
      {subtitle ? (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{subtitle}</Typography>
      ) : null}
    </Box>
  </Box>
);

const Section = ({ icon, title, subtitle, color, children }) => (
  <Paper sx={{ ...glassCard, p: 1.75, mb: 1.75, overflow: 'hidden' }}>
    <SectionHeader icon={icon} title={title} subtitle={subtitle} color={color} />
    {children}
  </Paper>
);

const CompanyProfilePage = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data),
  });

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data) => axiosInstance.put('/settings/company-profile/update/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      qc.invalidateQueries({ queryKey: ['company-profile-layout'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setError(e.response?.data?.error || 'خطا در ذخیره'),
  });

  const logoMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('logo', file);
      return axiosInstance.post('/settings/company-profile/logo/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      setForm(p => ({ ...p, logo_url: res.data.logo_url, logo: res.data.logo }));
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      qc.invalidateQueries({ queryKey: ['company-profile-layout'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setUploading(false);
    },
    onError: () => setUploading(false),
  });

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));
  const handleLogo = (e) => {
    const f = e.target.files?.[0];
    if (f) { setUploading(true); logoMutation.mutate(f); }
  };

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        icon={<BusinessIcon />}
        title="مشخصات شرکت"
        color={SOFT.indigo}
        actions={(
          <Button
            variant="contained"
            startIcon={updateMutation.isLoading ? null : <SaveIcon />}
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isLoading}
            sx={{
              bgcolor: SOFT.indigo, borderRadius: '9px', px: 2.5, fontSize: 12,
              boxShadow: 'none', '&:hover': { bgcolor: '#6f7ecb' },
            }}
          >
            {updateMutation.isLoading ? <CircularProgress size={18} color="inherit" /> : 'ذخیره تغییرات'}
          </Button>
        )}
      />

      {/* Hero — logo + company identity */}
      <Paper sx={{ ...glassCard, mb: 1.75, p: 2, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2.25, flexWrap: 'wrap' }}>
          <Box sx={{ position: 'relative' }}>
            {form.logo_url ? (
              <Avatar src={form.logo_url} variant="rounded" sx={{ width: 72, height: 72, borderRadius: '18px', border: '1px solid', borderColor: 'divider' }} />
            ) : (
              <Avatar variant="rounded" sx={{ width: 72, height: 72, borderRadius: '18px', bgcolor: alpha(SOFT.indigo, 0.14), color: SOFT.indigo }}>
                <BusinessIcon sx={{ fontSize: 34 }} />
              </Avatar>
            )}
            <Tooltip title="تغییر لوگو">
              <Box
                onClick={() => document.getElementById('logo-input').click()}
                sx={{
                  position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderRadius: '50%',
                  background: SOFT.indigo, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  boxShadow: `0 3px 10px ${SOFT.indigo}44`,
                  '&:hover': { transform: 'scale(1.1)' }, transition: 'all .2s ease',
                }}
              >
                {uploading ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon sx={{ fontSize: 17 }} />}
              </Box>
            </Tooltip>
            <input id="logo-input" type="file" accept="image/*" hidden onChange={handleLogo} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 900, mb: 0.5 }}>{toPersianDigits(form.legal_name) || 'نام شرکت'}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {form.economic_code && <Chip size="small" label={`کد اقتصادی: ${toPersianDigits(form.economic_code)}`} variant="outlined" />}
              {form.national_id && <Chip size="small" label={`شناسه ملی: ${toPersianDigits(form.national_id)}`} variant="outlined" />}
              {form.registration_number && <Chip size="small" label={`شماره ثبت: ${toPersianDigits(form.registration_number)}`} variant="outlined" />}
            </Stack>
          </Box>
        </Box>
      </Paper>

      {saved && <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success" sx={{ mb: 2, borderRadius: '12px' }}>مشخصات شرکت با موفقیت ذخیره شد</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError('')}>{error}</Alert>}

      {/* اطلاعات حقوقی و ثبت */}
      <Section icon={<BadgeIcon sx={{ color: '#fff', fontSize: 22 }} />} title="اطلاعات حقوقی و ثبت" color={SOFT.indigo}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="نام حقوقی شرکت" value={toPersianDigits(form.legal_name || '')} onChange={e => set('legal_name', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="شماره ثبت" value={toPersianDigits(form.registration_number || '')} onChange={e => set('registration_number', toEnglishDigits(e.target.value))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="شناسه ملی" value={toPersianDigits(form.national_id || '')} onChange={e => set('national_id', toEnglishDigits(e.target.value))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="کد اقتصادی" value={toPersianDigits(form.economic_code || '')} onChange={e => set('economic_code', toEnglishDigits(e.target.value))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="شناسه مالیاتی" value={toPersianDigits(form.tax_id || '')} onChange={e => set('tax_id', toEnglishDigits(e.target.value))} /></Grid>
          <Grid item xs={12} md={4}>
            <JalaliDatePicker fullWidth sx={fieldSx} label="تاریخ تأسیس" value={form.established_date || ''} onChange={g => set('established_date', g)} />
          </Grid>
        </Grid>
      </Section>

      {/* اطلاعات تماس */}
      <Section icon={<ContactPhoneIcon sx={{ color: '#fff', fontSize: 22 }} />} title="اطلاعات تماس و آدرس" color={SOFT.green}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="تلفن" value={toPersianDigits(form.phone || '')} onChange={e => set('phone', toEnglishDigits(e.target.value))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="ایمیل" value={toPersianDigits(form.email || '')} onChange={e => set('email', toEnglishDigits(e.target.value))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="وبسایت" value={toPersianDigits(form.website || '')} onChange={e => set('website', toEnglishDigits(e.target.value))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="کد پستی" value={toPersianDigits(form.postal_code || '')} onChange={e => set('postal_code', toEnglishDigits(e.target.value))} /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth sx={fieldSx} multiline rows={2} label="آدرس" value={toPersianDigits(form.address || '')} onChange={e => set('address', e.target.value)} /></Grid>
        </Grid>
      </Section>

      {/* نماینده قانونی */}
      <Section icon={<WorkOutlineIcon sx={{ color: '#fff', fontSize: 22 }} />} title="نماینده قانونی / مدیرعامل" color={SOFT.amber}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="نام نماینده حقوقی / مدیرعامل" value={toPersianDigits(form.employer_rep_name || '')} onChange={e => set('employer_rep_name', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="سمت نماینده" value={toPersianDigits(form.employer_rep_title || '')} onChange={e => set('employer_rep_title', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="کد ملی نماینده" value={toPersianDigits(form.employer_rep_national_id || '')} onChange={e => set('employer_rep_national_id', toEnglishDigits(e.target.value))} /></Grid>
        </Grid>
      </Section>






    </Box>
  );
};

export default CompanyProfilePage;