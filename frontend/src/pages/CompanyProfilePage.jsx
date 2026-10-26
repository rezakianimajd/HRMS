import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, TextField, Button, CircularProgress,
  Alert, Stack, Tooltip, Chip, alpha, Slider, IconButton,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import BadgeIcon from '@mui/icons-material/Badge';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { PageHeader, SURFACE, SOFT } from '../core/components/settings/settingsUi';
import { toPersianDigits, toEnglishDigits } from '../core/utils/numberUtils';
import {
  DEFAULT_LOGIN_BRANDING, LOGIN_PANEL_DEFAULT_BACKGROUND,
  loginOverlayGradient, normalizeHexColor, resolveLoginBranding,
} from '../core/utils/colorUtils';

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

const ColorField = ({ label, value, onChange }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Box
      component="input"
      type="color"
      aria-label={label}
      value={normalizeHexColor(value, DEFAULT_LOGIN_BRANDING.overlay_color)}
      onChange={(event) => onChange(event.target.value)}
      sx={{
        width: 40, height: 40, p: 0, flexShrink: 0, cursor: 'pointer',
        border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'transparent',
      }}
    />
    <TextField
      size="small" fullWidth sx={fieldSx} label={label} value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      inputProps={{ dir: 'ltr', spellCheck: false }}
      helperText="کد رنگ شش‌رقمی، مثل #0b3b2e"
    />
  </Stack>
);

/** پیش‌نمایش زندهٔ پنل سمت راست صفحهٔ ورود (همان لایه‌بندی تصویر + پوشش رنگی). */
const LoginPanelPreview = ({ branding }) => {
  const theme = resolveLoginBranding(branding);
  const hasImage = Boolean(theme.backgroundUrl);
  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', borderRadius: '14px', minHeight: 228, p: 1.7,
      color: theme.text, bgcolor: theme.overlay,
      border: '1px solid', borderColor: 'divider',
      background: hasImage
        ? `${loginOverlayGradient(theme)}, ${LOGIN_PANEL_DEFAULT_BACKGROUND}`
        : LOGIN_PANEL_DEFAULT_BACKGROUND,
    }}>
      {hasImage ? (
        <>
          <Box aria-hidden sx={{
            position: 'absolute', inset: 0, backgroundImage: `url("${theme.backgroundUrl}")`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: loginOverlayGradient(theme) }} />
        </>
      ) : null}
      <Box sx={{ position: 'relative' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: theme.accent }}>
          پیش‌نمایش صفحهٔ ورود
        </Typography>
        <Typography sx={{ mt: 1.1, fontSize: 15, fontWeight: 900, color: theme.text, lineHeight: 1.6 }}>
          یک فضای کاری،
        </Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 900, color: theme.accent, lineHeight: 1.6 }}>
          همهٔ کسب‌وکار شما.
        </Typography>
        <Typography sx={{ mt: 1, fontSize: 12, color: theme.muted, lineHeight: 1.9 }}>
          داده‌ها، فرایندها و تصمیم‌های سازمان در یک تجربهٔ منسجم.
        </Typography>
        {hasImage ? null : (
          <Typography sx={{ mt: 1.2, fontSize: 12, color: theme.faint }}>
            تصویری انتخاب نشده؛ پس‌زمینهٔ پیش‌فرض سامانه نمایش داده می‌شود.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

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

  /* ---------------- ظاهر صفحهٔ ورود (تصویر + رنگ پوشش + رنگ متن) ---------------- */
  const [branding, setBranding] = useState(null);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingError, setBrandingError] = useState('');
  const [backgroundUploading, setBackgroundUploading] = useState(false);

  const { data: brandingData } = useQuery({
    queryKey: ['login-branding'],
    queryFn: () => axiosInstance.get('/settings/login-branding/').then(r => r.data),
  });

  useEffect(() => {
    if (brandingData) setBranding(brandingData);
  }, [brandingData]);

  const panelBranding = { ...DEFAULT_LOGIN_BRANDING, ...(branding || {}) };
  const canEditBranding = (branding?.can_edit ?? true) !== false;

  const flashBrandingSaved = () => {
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 2500);
  };

  const saveBrandingMutation = useMutation({
    mutationFn: (data) => axiosInstance.put('/settings/login-branding/', data),
    onSuccess: (res) => {
      setBranding((previous) => ({ ...(previous || {}), ...res.data }));
      qc.invalidateQueries({ queryKey: ['login-branding'] });
      qc.invalidateQueries({ queryKey: ['login-company-profile'] });
      flashBrandingSaved();
    },
    onError: (e) => setBrandingError(e.response?.data?.error || 'ذخیرهٔ ظاهر صفحهٔ ورود انجام نشد'),
  });

  const backgroundMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('background', file);
      return axiosInstance.post('/settings/login-branding/background/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      setBackgroundUploading(false);
      setBranding((previous) => ({ ...(previous || {}), ...res.data }));
      qc.invalidateQueries({ queryKey: ['login-branding'] });
      flashBrandingSaved();
    },
    onError: (e) => {
      setBackgroundUploading(false);
      setBrandingError(e.response?.data?.error || 'بارگذاری تصویر انجام نشد');
    },
  });

  const removeBackgroundMutation = useMutation({
    mutationFn: () => axiosInstance.post('/settings/login-branding/background/', { remove: 1 }),
    onSuccess: (res) => {
      setBranding((previous) => ({ ...(previous || {}), ...res.data }));
      qc.invalidateQueries({ queryKey: ['login-branding'] });
      flashBrandingSaved();
    },
    onError: (e) => setBrandingError(e.response?.data?.error || 'حذف تصویر انجام نشد'),
  });

  const setBrandingField = (key, value) => {
    setBrandingError('');
    setBranding((previous) => ({ ...DEFAULT_LOGIN_BRANDING, ...(previous || {}), [key]: value }));
  };

  const handleBackgroundFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBrandingError('');
    setBackgroundUploading(true);
    backgroundMutation.mutate(file);
  };

  const resetBrandingColors = () => {
    setBrandingError('');
    setBranding((previous) => ({
      ...DEFAULT_LOGIN_BRANDING,
      ...(previous || {}),
      overlay_color: DEFAULT_LOGIN_BRANDING.overlay_color,
      overlay_opacity: DEFAULT_LOGIN_BRANDING.overlay_opacity,
      text_color: DEFAULT_LOGIN_BRANDING.text_color,
      accent_color: DEFAULT_LOGIN_BRANDING.accent_color,
    }));
  };

  const submitBranding = () => saveBrandingMutation.mutate({
    overlay_color: panelBranding.overlay_color,
    overlay_opacity: panelBranding.overlay_opacity,
    text_color: panelBranding.text_color,
    accent_color: panelBranding.accent_color,
  });

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

      {/* ظاهر صفحهٔ ورود */}
      <Section
        icon={<WallpaperIcon sx={{ color: '#fff', fontSize: 22 }} />}
        title="ظاهر صفحهٔ ورود"
        subtitle="تصویر پس‌زمینهٔ پنل ورود، رنگ پوشش فید روی آن و رنگ نوشته‌ها — برای همهٔ کاربران اعمال می‌شود"
        color={SOFT.blue}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <LoginPanelPreview branding={panelBranding} />
            <Stack direction="row" spacing={1} sx={{ mt: 1.2 }} flexWrap="wrap" useFlexGap alignItems="center">
              <Button
                variant="outlined" size="small" component="label" startIcon={<PhotoCameraIcon />}
                disabled={backgroundUploading || !canEditBranding}
                sx={{ fontSize: 12, borderRadius: '9px' }}
              >
                {panelBranding.background_url ? 'تغییر تصویر' : 'انتخاب تصویر'}
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleBackgroundFile} />
              </Button>
              {panelBranding.background_url ? (
                <Button
                  variant="text" size="small" color="error" startIcon={<DeleteOutlineIcon />}
                  onClick={() => removeBackgroundMutation.mutate()}
                  disabled={removeBackgroundMutation.isLoading || !canEditBranding}
                  sx={{ fontSize: 12 }}
                >
                  حذف تصویر
                </Button>
              ) : null}
              {backgroundUploading ? <CircularProgress size={18} /> : null}
            </Stack>
            <Typography sx={{ mt: 0.8, fontSize: 12, color: 'text.secondary' }}>
              JPG، PNG یا WEBP تا ۶ مگابایت. تصویر تمام‌پهنا (Cover) و زیر رنگ پوشش نمایش داده می‌شود.
            </Typography>
          </Grid>

          <Grid item xs={12} md={7}>
            <Grid container spacing={1.6}>
              <Grid item xs={12} sm={6}>
                <ColorField
                  label="رنگ پوشش (فید)" value={panelBranding.overlay_color}
                  onChange={(value) => setBrandingField('overlay_color', value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ColorField
                  label="رنگ متن اصلی" value={panelBranding.text_color}
                  onChange={(value) => setBrandingField('text_color', value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ColorField
                  label="رنگ متن تأکیدی" value={panelBranding.accent_color}
                  onChange={(value) => setBrandingField('accent_color', value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.4 }}>
                  شدت رنگ پوشش (شفافیت تصویر)
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Slider
                    size="small" min={0} max={95} step={1}
                    value={Number(panelBranding.overlay_opacity ?? 0)}
                    onChange={(_, value) => setBrandingField('overlay_opacity', value)}
                    sx={{ flex: 1 }}
                  />
                  <Chip size="small" label={`${toPersianDigits(Number(panelBranding.overlay_opacity ?? 0))}٪`} />
                </Stack>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 1, borderRadius: '10px', fontSize: 12 }}>
              هرچه درصد پوشش بیشتر باشد تصویر محو‌تر و متن خواناتر می‌شود؛ رنگ متن را طوری انتخاب کنید
              که روی رنگ پوشش به‌خوبی دیده شود.
            </Alert>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap alignItems="center">
              <Button
                variant="contained" size="small" startIcon={<SaveIcon />}
                onClick={submitBranding}
                disabled={saveBrandingMutation.isLoading || !canEditBranding}
                sx={{ bgcolor: SOFT.indigo, borderRadius: '9px', boxShadow: 'none', fontSize: 12, '&:hover': { bgcolor: '#6f7ecb' } }}
              >
                ذخیرهٔ ظاهر صفحهٔ ورود
              </Button>
              <Button variant="text" size="small" startIcon={<RestartAltIcon />} onClick={resetBrandingColors} sx={{ fontSize: 12 }}>
                بازگردانی رنگ پیش‌فرض
              </Button>
              {brandingSaved ? (
                <Chip size="small" icon={<CheckCircleIcon />} label="ذخیره شد" sx={{ bgcolor: alpha(SOFT.green, 0.14), color: '#15803d', fontSize: 12 }} />
              ) : null}
            </Stack>
            {brandingError ? (
              <Alert severity="error" sx={{ mt: 1.2, borderRadius: '10px', fontSize: 12 }} onClose={() => setBrandingError('')}>
                {brandingError}
              </Alert>
            ) : null}
          </Grid>
        </Grid>
      </Section>

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