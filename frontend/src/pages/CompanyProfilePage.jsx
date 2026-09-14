import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, TextField, Button, CircularProgress,
  Alert, Stack, Switch, FormControlLabel, Tooltip, Chip,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import BadgeIcon from '@mui/icons-material/Badge';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import StorageIcon from '@mui/icons-material/Storage';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const glassCard = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 16px 44px rgba(99,102,241,0.12)',
  borderRadius: '16px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.55)',
    transition: 'all .2s ease',
    '&:hover': { background: 'rgba(255,255,255,0.84)' },
    '&.Mui-focused': { background: 'rgba(255,255,255,0.95)', boxShadow: '0 0 0 3px #6366f122' },
  },
};

const SectionHeader = ({ icon, title, subtitle, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
    <Avatar sx={{ width: 42, height: 42, background: `linear-gradient(135deg, ${color}, ${color}99)`, boxShadow: `0 6px 16px ${color}55` }}>
      {icon}
    </Avatar>
    <Box>
      <Typography variant="subtitle1" fontWeight={800} sx={{ color }}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="textSecondary">{subtitle}</Typography>}
    </Box>
  </Box>
);

const Section = ({ icon, title, subtitle, color, children }) => (
  <Paper sx={{ ...glassCard, p: 3, mb: 2.5, overflow: 'hidden', position: 'relative' }}>
    <Box aria-hidden sx={{ position: 'absolute', top: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${color}1a, transparent 70%)`, pointerEvents: 'none' }} />
    <Box sx={{ position: 'relative' }}>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} color={color} />
      {children}
    </Box>
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
      {/* Hero — logo + company identity */}
      <Paper sx={{
        ...glassCard, mb: 2.5, p: 3.5, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(236,72,153,0.08), rgba(255,255,255,0.4))',
      }}>
        <Box aria-hidden sx={{ position: 'absolute', top: -80, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)', filter: 'blur(30px)' }} />
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ position: 'relative' }}>
            {form.logo_url ? (
              <Avatar src={form.logo_url} sx={{ width: 96, height: 96, boxShadow: '0 10px 30px rgba(99,102,241,0.4)', border: '3px solid rgba(255,255,255,0.7)' }} />
            ) : (
              <Avatar sx={{ width: 96, height: 96, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 10px 30px rgba(99,102,241,0.4)', border: '3px solid rgba(255,255,255,0.7)' }}>
                <BusinessIcon sx={{ fontSize: 46, color: '#fff' }} />
              </Avatar>
            )}
            <Tooltip title="تغییر لوگو">
              <Box
                onClick={() => document.getElementById('logo-input').click()}
                sx={{
                  position: 'absolute', bottom: 0, left: 0, width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#6366f1,#ec4899)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(99,102,241,0.5)',
                  '&:hover': { transform: 'scale(1.1)' }, transition: 'all .2s ease',
                }}
              >
                {uploading ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon sx={{ fontSize: 17 }} />}
              </Box>
            </Tooltip>
            <input id="logo-input" type="file" accept="image/*" hidden onChange={handleLogo} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>{form.company_name || 'نام شرکت'}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {form.economic_code && <Chip size="small" label={`کد اقتصادی: ${form.economic_code}`} variant="outlined" />}
              {form.national_id && <Chip size="small" label={`شناسه ملی: ${form.national_id}`} variant="outlined" />}
              {form.registration_number && <Chip size="small" label={`شماره ثبت: ${form.registration_number}`} variant="outlined" />}
            </Stack>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
              این اطلاعات در پیشنمایش صورتوضعیت، سایدبار و اسناد استفاده میشود.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {saved && <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success" sx={{ mb: 2, borderRadius: '12px' }}>مشخصات شرکت با موفقیت ذخیره شد</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError('')}>{error}</Alert>}

      {/* اطلاعات حقوقی و ثبت */}
      <Section icon={<BadgeIcon sx={{ color: '#fff', fontSize: 22 }} />} title="اطلاعات حقوقی و ثبت" subtitle="شناسهها و ابعاد حقوقی شرکت" color="#6366f1">
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="نام حقوقی شرکت" value={form.legal_name || ''} onChange={e => set('legal_name', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="شماره ثبت" value={form.registration_number || ''} onChange={e => set('registration_number', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="شناسه ملی" value={form.national_id || ''} onChange={e => set('national_id', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="کد اقتصادی" value={form.economic_code || ''} onChange={e => set('economic_code', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="شناسه مالیاتی" value={form.tax_id || ''} onChange={e => set('tax_id', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}>
            <JalaliDatePicker fullWidth label="تاریخ تأسیس" value={form.established_date || ''} onChange={g => set('established_date', g)} />
          </Grid>
        </Grid>
      </Section>

      {/* اطلاعات تماس */}
      <Section icon={<ContactPhoneIcon sx={{ color: '#fff', fontSize: 22 }} />} title="اطلاعات تماس و آدرس" subtitle="راههای ارتباطی رسمی شرکت" color="#10b981">
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="تلفن" value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="ایمیل" value={form.email || ''} onChange={e => set('email', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="وبسایت" value={form.website || ''} onChange={e => set('website', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="کد پستی" value={form.postal_code || ''} onChange={e => set('postal_code', e.target.value)} /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth sx={fieldSx} multiline rows={2} label="آدرس" value={form.address || ''} onChange={e => set('address', e.target.value)} /></Grid>
        </Grid>
      </Section>

      {/* نماینده قانونی */}
      <Section icon={<WorkOutlineIcon sx={{ color: '#fff', fontSize: 22 }} />} title="نماینده قانونی / مدیرعامل" subtitle="برای درج در قراردادها" color="#f59e0b">
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="نام نماینده حقوقی / مدیرعامل" value={form.employer_rep_name || ''} onChange={e => set('employer_rep_name', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="سمت نماینده" value={form.employer_rep_title || ''} onChange={e => set('employer_rep_title', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="کد ملی نماینده" value={form.employer_rep_national_id || ''} onChange={e => set('employer_rep_national_id', e.target.value)} /></Grid>
        </Grid>
      </Section>

      {/* اطلاعرسانی */}
      <Section icon={<NotificationsActiveIcon sx={{ color: '#fff', fontSize: 22 }} />} title="اطلاعرسانی" subtitle="کانالهای ارسال اعلان" color="#8b5cf6">
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.4)' }}>
              <FormControlLabel
                control={<Switch checked={!!form.notify_email_enabled} onChange={e => set('notify_email_enabled', e.target.checked)} />}
                label={<Typography variant="body2" fontWeight={600}>ارسال اعلان از طریق ایمیل</Typography>}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.4)' }}>
              <FormControlLabel
                control={<Switch checked={!!form.notify_bale_enabled} onChange={e => set('notify_bale_enabled', e.target.checked)} />}
                label={<Typography variant="body2" fontWeight={600}>ارسال پیام از طریق پیامرسان بله</Typography>}
              />
              {!!form.notify_bale_enabled && (
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField size="small" fullWidth sx={fieldSx} label="توکن ربات بله" value={form.bale_token || ''} onChange={e => set('bale_token', e.target.value)} />
                  <TextField size="small" fullWidth sx={fieldSx} label="شناسه گفتگوی بله (chat_id)" value={form.bale_chat_id || ''} onChange={e => set('bale_chat_id', e.target.value)} />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Section>

      {/* ذخیرهسازی */}
      <Section icon={<StorageIcon sx={{ color: '#fff', fontSize: 22 }} />} title="مسیرهای ذخیرهسازی فایلها" subtitle="محل ذخیره هر دسته از فایلهای آپلودی" color="#3b82f6">
        <Grid container spacing={2}>
          <Grid item xs={12}><TextField size="small" fullWidth sx={fieldSx} label="مسیر پایه ذخیرهسازی" placeholder="/var/hr_data/" dir="ltr" value={form.base_storage_path || ''} onChange={e => set('base_storage_path', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="پوشه مدارک پرسنل" dir="ltr" value={form.storage_path_employees || ''} onChange={e => set('storage_path_employees', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="پوشه مکاتبات" dir="ltr" value={form.storage_path_correspondences || ''} onChange={e => set('storage_path_correspondences', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="پوشه بایگانی اسناد" dir="ltr" value={form.storage_path_documents || ''} onChange={e => set('storage_path_documents', e.target.value)} /></Grid>
        </Grid>
      </Section>

      {/* توضیحات + ذخیره */}
      <Paper sx={{ ...glassCard, p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField size="small" fullWidth sx={fieldSx} multiline rows={3} label="توضیحات" value={form.description || ''} onChange={e => set('description', e.target.value)} />
          </Grid>
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={updateMutation.isLoading ? null : <SaveIcon />}
              onClick={() => updateMutation.mutate(form)}
              disabled={updateMutation.isLoading}
              sx={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)', borderRadius: '12px', px: 4 }}
            >
              {updateMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : 'ذخیره تغییرات'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default CompanyProfilePage;