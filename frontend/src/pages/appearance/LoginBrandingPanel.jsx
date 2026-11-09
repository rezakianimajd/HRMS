/**
 * تب «ورود» در صفحهٔ «ظاهر و پوسته» — تنظیم کامل ظاهر صفحهٔ ورود.
 *
 * (از «مشخصات شرکت» منتقل شده است): پس‌زمینهٔ تصویری یا گرادیانت رنگی، رنگ پوشش
 * (فید)، بلور، اندازه و رنگ پنل لوگو و رنگ نوشته‌ها — برای همهٔ کاربران اعمال می‌شود.
 */
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Grid, Paper, Slider,
  Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography, alpha,
} from '@mui/material';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axiosInstance from '../../core/api/axiosConfig';
import { SURFACE, SOFT } from '../../core/components/settings/settingsUi';
import { toPersianDigits } from '../../core/utils/numberUtils';
import {
  DEFAULT_LOGIN_BRANDING, DEFAULT_LOGIN_GRADIENT, LOGIN_GRADIENT_PRESETS, LOGIN_LOGO_SIZE,
  LOGIN_PANEL_DEFAULT_BACKGROUND, clampLogoSize, gradientColorCount, loginOverlayGradient,
  normalizeHexColor, normalizeLoginGradient, resolveLoginBranding,
} from '../../core/utils/colorUtils';

const PanelSection = ({ icon, title, subtitle, color, children }) => (
  <Paper sx={{ ...SURFACE, p: 1.75, overflow: 'hidden' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5, flexWrap: 'wrap' }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
        display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.14), color,
      }}>
        {React.cloneElement(icon, { sx: { fontSize: 18 } })}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6">{title}</Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{subtitle}</Typography>
        ) : null}
      </Box>
    </Box>
    {children}
  </Paper>
);

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12.5 },
  '& .MuiFormHelperText-root': { fontSize: 10.5 },
};

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
  const hasImage = theme.backgroundKind === 'image' && Boolean(theme.backgroundUrl);
  const hasGradient = theme.useGradient;
  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', borderRadius: '14px', minHeight: 228, p: 1.7,
      color: theme.text, bgcolor: theme.overlay,
      border: '1px solid', borderColor: 'divider',
      background: hasGradient
        ? theme.gradientCss
        : (hasImage ? `${loginOverlayGradient(theme)}, ${LOGIN_PANEL_DEFAULT_BACKGROUND}`
          : LOGIN_PANEL_DEFAULT_BACKGROUND),
    }}>
      {hasGradient && theme.opacity > 0 ? (
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: loginOverlayGradient(theme) }} />
      ) : null}
      {hasImage ? (
        <>
          <Box aria-hidden sx={{
            position: 'absolute', inset: 0, backgroundImage: `url("${theme.backgroundUrl}")`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: theme.blur ? `blur(${theme.blur}px)` : 'none',
            transform: theme.blur ? 'scale(1.08)' : 'none',
          }} />
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: loginOverlayGradient(theme) }} />
        </>
      ) : null}
      <Box sx={{ position: 'relative' }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: theme.accent }}>
          پیش‌نمایش کارت ورود
        </Typography>
        <Box sx={{
          mt: 1, display: 'grid', gridTemplateColumns: '1fr 74px', borderRadius: '14px',
          overflow: 'hidden', bgcolor: '#fff', color: '#0f172a',
          boxShadow: '0 22px 44px -26px rgba(2,6,23,0.7)',
        }}>
          <Box sx={{ p: 1.4 }}>
            <Box sx={{ height: 12, borderRadius: '4px', bgcolor: '#e8edf5' }} />
            <Box sx={{ mt: 0.8, height: 12, borderRadius: '4px', bgcolor: '#e8edf5' }} />
            <Box sx={{
              mt: 1.1, height: 15, borderRadius: '6px',
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.overlay})`,
            }} />
          </Box>
          <Box sx={{
            display: 'grid', placeItems: 'center',
            bgcolor: theme.logoPanelColor,
          }}>
            <Box sx={{
              width: Math.min(56, Math.round(theme.logoSize / 5.5)),
              height: Math.min(56, Math.round(theme.logoSize / 5.5)),
              borderRadius: '6px', border: '1px solid rgba(15,23,42,0.14)',
              bgcolor: 'rgba(255,255,255,0.65)',
            }} />
          </Box>
        </Box>
        {hasImage || hasGradient ? null : (
          <Typography sx={{ mt: 1, fontSize: 11.5, color: theme.faint }}>
            تصویری انتخاب نشده؛ پس‌زمینهٔ پیش‌فرض سامانه نمایش داده می‌شود.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const LoginBrandingPanel = () => {
  const qc = useQueryClient();

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
  const loginGradient = normalizeLoginGradient(panelBranding.gradient);
  const isGradientBackground = panelBranding.background_kind === 'gradient';
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

  /** ویرایش فیلدهای گرادیانت (preset / angle / colors) روی همان تنظیمات. */
  const setGradientField = (key, value) => {
    setBrandingError('');
    setBranding((previous) => {
      const base = { ...DEFAULT_LOGIN_BRANDING, ...(previous || {}) };
      const gradient = normalizeLoginGradient(base.gradient);
      return { ...base, gradient: { ...gradient, [key]: value } };
    });
  };

  const setGradientColor = (index, value) => {
    const colors = [...loginGradient.colors];
    colors[index] = normalizeHexColor(value, colors[index]);
    setGradientField('colors', colors);
  };

  const chooseGradientPreset = (preset) => {
    if (!preset) return;
    const needed = Math.max(2, gradientColorCount(preset));
    const colors = [...loginGradient.colors];
    while (colors.length < needed) {
      colors.push(DEFAULT_LOGIN_GRADIENT.colors[colors.length % DEFAULT_LOGIN_GRADIENT.colors.length]);
    }
    setBrandingError('');
    setBranding((previous) => {
      const base = { ...DEFAULT_LOGIN_BRANDING, ...(previous || {}) };
      return { ...base, gradient: { ...loginGradient, preset, colors: colors.slice(0, needed) } };
    });
  };

  const toggleBlur = (enabled) => setBrandingField('overlay_blur', enabled ? 8 : 0);

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
    background_kind: panelBranding.background_kind,
    gradient: loginGradient,
    logo_size: clampLogoSize(panelBranding.logo_size),
    logo_panel_color: normalizeHexColor(
      panelBranding.logo_panel_color, DEFAULT_LOGIN_BRANDING.logo_panel_color,
    ),
    overlay_color: panelBranding.overlay_color,
    overlay_opacity: panelBranding.overlay_opacity,
    overlay_blur: panelBranding.overlay_blur,
    text_color: panelBranding.text_color,
    accent_color: panelBranding.accent_color,
  });

  return (
    <PanelSection
      icon={<WallpaperIcon sx={{ color: '#fff', fontSize: 22 }} />}
      title="ظاهر صفحهٔ ورود"
      subtitle="پس‌زمینهٔ پنل ورود (تصویر یا گرادیانت رنگی)، رنگ پوشش/فید، بلور، اندازه و رنگ پنل لوگو و رنگ نوشته‌ها — برای همهٔ کاربران اعمال می‌شود"
      color={SOFT.blue}
    >
    icon={<WallpaperIcon sx={{ color: '#fff', fontSize: 22 }} />}
    title="ظاهر صفحهٔ ورود"
    subtitle="پس‌زمینهٔ پنل ورود (تصویر یا گرادیانت رنگی)، رنگ پوشش/فید روی آن، بلور و رنگ نوشته‌ها — برای همهٔ کاربران اعمال می‌شود"
    color={SOFT.blue}
  >
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <LoginPanelPreview branding={panelBranding} />

        {/* انتخاب نوع پس‌زمینه: تصویر یا گرادیانت */}
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={isGradientBackground ? 'gradient' : 'image'}
          onChange={(_event, value) => {
            if (value) setBrandingField('background_kind', value);
          }}
          sx={{ mt: 1.2, '& .MuiToggleButton-root': { fontSize: 12, fontWeight: 800, py: 0.5 } }}
        >
          <ToggleButton value="image">تصویر پس‌زمینه</ToggleButton>
          <ToggleButton value="gradient">گرادیانت رنگی</ToggleButton>
        </ToggleButtonGroup>

        {isGradientBackground ? (
          <Box sx={{ mt: 1.2 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.6 }}>
              نوع گرادیانت
            </Typography>
            <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
              {LOGIN_GRADIENT_PRESETS.map((preset) => (
                <Chip
                  key={preset.id}
                  label={preset.label}
                  size="small"
                  clickable
                  color={loginGradient.preset === preset.id ? 'primary' : 'default'}
                  variant={loginGradient.preset === preset.id ? 'filled' : 'outlined'}
                  onClick={() => chooseGradientPreset(preset.id)}
                  sx={{ fontSize: 11.5, fontWeight: 800 }}
                />
              ))}
            </Stack>

            {gradientColorCount(loginGradient.preset) === 0 ? (
              <Typography sx={{ mt: 1, fontSize: 11.5, color: 'text.secondary' }}>
                رنگین‌کمان با رنگ‌های ثابت و به‌صورت نوارهای خطی روی کل صفحه اعمال می‌شود؛
                برای رنگ دلخواه یکی از گزینه‌های دو/سه/چهار رنگ یا مش را انتخاب کنید.
              </Typography>
            ) : (
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {loginGradient.colors.map((color, index) => (
                  <ColorField
                    key={`gradient-color-${index}`}
                    label={`رنگ ${index + 1}`}
                    value={color}
                    onChange={(value) => setGradientColor(index, value)}
                  />
                ))}
              </Stack>
            )}

            <Typography sx={{ mt: 1, mb: 0.2, fontSize: 12, color: 'text.secondary' }}>
              زاویهٔ گرادیانت
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Slider
                size="small" min={0} max={360} step={5}
                value={Number(loginGradient.angle || 0)}
                onChange={(_event, value) => setGradientField('angle', value)}
                sx={{ flex: 1 }}
              />
              <Chip size="small" label={`${toPersianDigits(Number(loginGradient.angle || 0))}°`} />
            </Stack>
          </Box>
        ) : (
          <>
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
          </>
        )}
      </Grid>

      <Grid item xs={12} md={7}>
        <Grid container spacing={1.6}>
          <Grid item xs={12} sm={6}>
            <ColorField
              label="رنگ پس‌زمینهٔ پنل لوگو" value={panelBranding.logo_panel_color}
              onChange={(value) => setBrandingField('logo_panel_color', value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                اندازهٔ لوگوی پنل ورود
              </Typography>
              <Chip size="small" label={`${toPersianDigits(Number(panelBranding.logo_size ?? 0))}px`} />
            </Stack>
            <Slider
              size="small" min={LOGIN_LOGO_SIZE.min} max={LOGIN_LOGO_SIZE.max} step={4}
              value={clampLogoSize(panelBranding.logo_size)}
              onChange={(_event, value) => setBrandingField('logo_size', value)}
              aria-label="اندازهٔ لوگوی پنل ورود"
            />
          </Grid>
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
          <Grid item xs={12} sm={6}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                بلور پس‌زمینه
              </Typography>
              <FormControlLabel
                sx={{ m: 0 }}
                control={(
                  <Switch
                    size="small"
                    checked={Number(panelBranding.overlay_blur ?? 0) > 0}
                    onChange={(event) => toggleBlur(event.target.checked)}
                  />
                )}
                label={<Typography sx={{ fontSize: 11.5 }}>فعال</Typography>}
              />
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Slider
                size="small" min={0} max={24} step={1}
                value={Number(panelBranding.overlay_blur ?? 0)}
                onChange={(_event, value) => setBrandingField('overlay_blur', value)}
                disabled={Number(panelBranding.overlay_blur ?? 0) <= 0 || isGradientBackground}
                sx={{ flex: 1 }}
              />
              <Chip size="small"
                label={`${toPersianDigits(Number(panelBranding.overlay_blur ?? 0))}px`} />
            </Stack>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              {isGradientBackground
                ? 'بلور فقط روی تصویر اثر دارد؛ در حالت گرادیانت غیرفعال است.'
                : '۰ = بدون بلور (تصویر شارپ)، ۲۴ = حداکثر نرمی.'}
            </Typography>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 1, borderRadius: '10px', fontSize: 12 }}>
          هرچه درصد پوشش بیشتر باشد تصویر محو‌تر و متن خواناتر می‌شود؛ «بلور» تصویر را نرم می‌کند
          (۰ = تصویر شارپ، ۲۴ = حداکثر نرمی). رنگ متن را طوری انتخاب کنید که روی رنگ پوشش خوانا باشد.
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
    </PanelSection>
  );
};


export default LoginBrandingPanel;
