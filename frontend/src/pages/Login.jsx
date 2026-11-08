/**
 * صفحهٔ ورود — چیدمان کارت وسط‌چین روی تصویر پس‌زمینهٔ انتخابی.
 *
 * - پس‌زمینه: تصویری که در «تنظیمات → مشخصات شرکت → ظاهر صفحهٔ ورود» انتخاب شده،
 *   با پوشش رنگی/شفافیت/**بلور** همان تنظیمات (پیش‌فرض: گرادیان تیرهٔ سامانه).
 * - کارت مستطیلی وسط صفحه: سمت راست ورود اطلاعات، سمت چپ لوگوی شرکت.
 * - هیچ متن توضیحی/تبلیغاتی روی صفحه نیست؛ فقط برچسب فیلدها، خطا و دکمهٔ ورود.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Avatar, Box, Button, CircularProgress, IconButton, InputAdornment,
  Paper, Stack, TextField, Typography, alpha,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import useAuth from '../core/hooks/useAuth';
import useCompany from '../core/hooks/useCompany';
import { useApplication } from '../core/context/ApplicationContext';
import CompanyEngine from '../core/engines/companyEngine';
import axiosInstance from '../core/api/axiosConfig';
import ModuleSelection from '../core/components/ui/ModuleSelection';
import CompanyLogo, { companyLabel } from '../core/components/ui/CompanyLogo';
import { getModuleLandingPath } from '../core/constants/moduleIcons';
import {
  LOGIN_PANEL_DEFAULT_BACKGROUND, loginOverlayGradient, resolveLoginBranding, withAlpha,
} from '../core/utils/colorUtils';

const ACCENT = '#4f46e5';
const INK = '#0f172a';
const MUTED = '#64748b';
const BORDER = 'rgba(15,23,42,0.10)';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 50,
    borderRadius: '13px',
    bgcolor: '#fff',
    fontSize: 12.5,
    fontWeight: 600,
    transition: 'box-shadow .18s ease, background-color .18s ease',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.22)' },
    '&.Mui-focused': { bgcolor: '#fff', boxShadow: '0 0 0 4px rgba(79,70,229,0.08)' },
    '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: '1.2px' },
    '&.Mui-disabled': { bgcolor: '#f8fafc' },
  },
  '& .MuiInputLabel-root': { fontSize: 12, color: MUTED },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
  '& .MuiFormHelperText-root': { fontSize: 12, mr: 0.4 },
};

const mapLoginError = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.non_field_errors) return data.non_field_errors;
  const first = Object.values(data).flat?.()[0];
  return typeof first === 'string' ? first : fallback;
};

const companyDisplayName = (company) => companyLabel(company) || (company?.code ? `شرکت ${company.code}` : '');

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setCurrentCompany } = useCompany();
  const { loadApplications, applications, switchApplication } = useApplication();

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [helpersLoading, setHelpersLoading] = useState(true);
  const [error, setError] = useState('');

  const [step, setStep] = useState('credentials');
  const [selectedApp, setSelectedApp] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  const { data: companyProfile } = useQuery({
    queryKey: ['login-company-profile', selectedCompany?.id],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then((res) => res.data).catch(() => null),
    enabled: step === 'application',
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    let mounted = true;
    const loadHelpers = async () => {
      try {
        const [usersRes, companiesRes] = await Promise.all([
          axiosInstance.get('/auth/login-users/'),
          axiosInstance.get('/auth/login-companies/'),
        ]);
        if (!mounted) return;
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
      } catch (e) {
        // ورود با نام کاربری دستی همچنان کار می‌کند.
      } finally {
        if (mounted) setHelpersLoading(false);
      }
    };
    loadHelpers();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!companies.length) return;
    setSelectedCompany((previous) => (
      previous && companies.some((company) => company.id === previous.id) ? previous : companies[0]
    ));
  }, [companies]);

  const handleCapsLock = (event) => {
    setCapsLock(Boolean(event.getModifierState && event.getModifierState('CapsLock')));
  };

  const resolveUsername = () => (
    (typeof selectedUser === 'string' ? selectedUser : selectedUser?.username) || usernameInput.trim()
  );

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const username = resolveUsername();
    if (!username) {
      setError('نام کاربری را وارد کنید');
      return;
    }
    if (companies.length > 0 && !selectedCompany) {
      setError('شرکت مورد نظر را انتخاب کنید');
      return;
    }
    if (!password) {
      setError('رمز عبور را وارد کنید');
      return;
    }

    setLoading(true);
    try {
      const data = await login(username, password, selectedCompany ? selectedCompany.id : null);
      const userForSession = data.user
        || (typeof selectedUser === 'object' && selectedUser ? selectedUser : { username, full_name: username });
      setLoggedInUser(userForSession);

      const company = data.company || selectedCompany;
      if (company) {
        const companyForSession = {
          ...company,
          display_name: companyDisplayName(selectedCompany) || company.display_name || '',
          legal_name: selectedCompany?.legal_name || company.legal_name || '',
          logo_url: selectedCompany?.logo_url || company.logo_url || null,
          code: selectedCompany?.code || company.code || '',
        };
        CompanyEngine.setStoredCompany(companyForSession);
        setCurrentCompany(companyForSession);
      }

      setApplicationsLoading(true);
      try {
        await loadApplications();
      } catch {
        setError('ورود انجام شد، اما دریافت دسترسی ماژول‌ها ناموفق بود. دوباره تلاش کنید.');
      } finally {
        setApplicationsLoading(false);
        setStep('application');
      }
    } catch (err) {
      setError(mapLoginError(err, t('auth.loginError')));
    } finally {
      setLoading(false);
    }
  };

  const handleAppSelect = async (app) => {
    if (app.is_coming_soon || !app.accessible) return;
    setError('');
    setSelectedApp(app);
    setLoading(true);
    try {
      await switchApplication(app);
      navigate(getModuleLandingPath(app.slug), { replace: true });
    } catch (err) {
      setError('خطا در انتخاب ماژول');
      setSelectedApp(null);
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setSelectedApp(null);
    setError('');
  };

  const activeCompany = {
    display_name: companyProfile?.legal_name || companyDisplayName(selectedCompany) || (selectedCompany ? 'شرکت' : ''),
    legal_name: companyProfile?.legal_name || selectedCompany?.legal_name || '',
    logo_url: companyProfile?.logo_url || selectedCompany?.logo_url || null,
    code: selectedCompany?.code || '',
    id: selectedCompany?.id,
    login_branding: selectedCompany?.login_branding || null,
  };

  if (step === 'application') {
    return (
      <ModuleSelection
        applications={applications}
        currentApp={selectedApp}
        user={loggedInUser || selectedUser}
        company={activeCompany}
        loadingAppId={selectedApp?.id}
        loading={applicationsLoading}
        error={error}
        onPick={handleAppSelect}
        onBack={handleBack}
      />
    );
  }

  const theme = resolveLoginBranding(selectedCompany?.login_branding);
  const hasImage = Boolean(theme.backgroundUrl);

  return (
    <Box data-testid="login-page" data-branding-text-color={theme.text}
      data-branding-accent-color={theme.accent} sx={{
      position: 'relative', minHeight: '100vh', display: 'grid', placeItems: 'center',
      px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 5 }, overflow: 'hidden',
      background: hasImage ? theme.overlay : LOGIN_PANEL_DEFAULT_BACKGROUND,
    }}>
      {/* ---- تصویر پس‌زمینه + پوشش/بلور از تنظیمات ---- */}
      {hasImage ? (
        <>
          <Box aria-hidden data-testid="login-branding-image" data-background-url={theme.backgroundUrl}
            sx={{
              position: 'absolute', inset: 0,
              backgroundImage: `url("${theme.backgroundUrl}")`,
              backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
              filter: theme.blur ? `blur(${theme.blur}px)` : 'none',
              transform: theme.blur ? 'scale(1.08)' : 'none',
            }} />
          <Box aria-hidden data-testid="login-branding-overlay"
            data-overlay-color={theme.overlay}
            data-overlay-opacity={theme.opacity}
            data-overlay-blur={theme.blur}
            sx={{ position: 'absolute', inset: 0, background: loginOverlayGradient(theme) }} />
        </>
      ) : null}

      {/* ---- کارت وسط‌چین: راست ورود اطلاعات، چپ لوگوی شرکت ---- */}
      <Paper elevation={0} data-testid="login-card" sx={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 880,
        display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.08fr 0.92fr' },
        minHeight: { md: 420 }, borderRadius: '24px', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.18)', bgcolor: '#fff',
        boxShadow: '0 44px 94px -44px rgba(2,6,23,0.78)',
      }}>
        {/* ورود اطلاعات (سمت راست) */}
        <Box sx={{
          p: { xs: 2.5, sm: 3.25, md: 4 },
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, placeItems: 'center', mb: 2 }}>
            <CompanyLogo company={selectedCompany} size={58} radius="14px"
              sx={{ bgcolor: '#f8fafc' }} />
          </Box>

          <Box component="form" onSubmit={handleCredentialsSubmit} sx={{ display: 'grid', gap: 1.5 }}>
            {companies.length > 1 ? (
              <Autocomplete
                options={companies}
                value={selectedCompany}
                onChange={(_event, value) => { setSelectedCompany(value); setError(''); }}
                getOptionLabel={(option) => companyDisplayName(option) || 'شرکت'}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                disableClearable
                disabled={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="شرکت"
                    sx={fieldSx}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessOutlinedIcon sx={{ fontSize: 19, color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box component="li" key={key} {...optionProps} sx={{
                      display: 'flex !important', alignItems: 'center', gap: 1,
                      borderRadius: '9px', mx: 0.5, my: 0.15, p: '7px 9px !important',
                    }}>
                      <CompanyLogo company={option} size={26} radius="7px" />
                      <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 800, color: INK }}>
                        {companyDisplayName(option) || 'شرکت'}
                      </Typography>
                    </Box>
                  );
                }}
              />
            ) : null}


            <Autocomplete
              freeSolo
              options={users}
              value={selectedUser}
              inputValue={usernameInput}
              onInputChange={(_event, value) => setUsernameInput(value)}
              onChange={(_event, value) => {
                setSelectedUser(value);
                setError('');
                if (typeof value === 'string') setUsernameInput(value);
              }}
              getOptionLabel={(option) => (
                typeof option === 'string' ? option : (option.full_name || option.username || '')
              )}
              isOptionEqualToValue={(option, value) => (
                typeof value === 'string' ? option.username === value : option.id === value?.id
              )}
              loading={helpersLoading}
              disabled={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="نام کاربری"
                  autoComplete="username"
                  sx={fieldSx}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={{ fontSize: 19, color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {helpersLoading
                          ? <CircularProgress color="inherit" size={15} sx={{ mr: 0.5 }} />
                          : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                const initial = option.first_name?.[0] || option.username?.[0] || '?';
                return (
                  <Box component="li" key={key} {...optionProps} sx={{
                    display: 'flex !important', alignItems: 'center', gap: 1,
                    borderRadius: '9px', mx: 0.5, my: 0.15, p: '7px 9px !important',
                  }}>
                    <Avatar sx={{
                      width: 28, height: 28, fontSize: 11.5, fontWeight: 800,
                      bgcolor: alpha(ACCENT, 0.08), color: ACCENT,
                    }}>{initial}</Avatar>
                    <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 800, color: INK }}>
                      {option.full_name || option.username}
                    </Typography>
                  </Box>
                );
              }}
            />


            <Box>
              <TextField
                fullWidth
                label="رمز عبور"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyUp={handleCapsLock}
                onKeyDown={handleCapsLock}
                onFocus={handleCapsLock}
                disabled={loading}
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 19, color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((previous) => !previous)}
                        edge="end"
                        size="small"
                        sx={{ color: '#94a3b8' }}
                        aria-label={showPassword ? 'پنهان‌کردن رمز عبور' : 'نمایش رمز عبور'}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {capsLock ? (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.6, px: 0.5 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                  <Typography sx={{ fontSize: 11.5, color: '#b45309', fontWeight: 700 }}>
                    Caps Lock روشن است.
                  </Typography>
                </Stack>
              ) : null}
            </Box>

            {error ? (
              <Alert severity="error" sx={{ borderRadius: '12px', fontSize: 12, py: 0.35 }}>
                {error}
              </Alert>
            ) : null}

            <Button
              type="submit"
              fullWidth
              size="large"
              variant="contained"
              disabled={loading}
              aria-busy={loading}
              endIcon={!loading ? <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} /> : null}
              sx={{
                py: 1.25, borderRadius: '14px', fontSize: 12.5, fontWeight: 900, textTransform: 'none',
                color: '#fff', boxShadow: '0 18px 36px -22px rgba(79,70,229,0.95)',
                background: `linear-gradient(135deg, ${ACCENT}, ${withAlpha(ACCENT, 0.86)} 62%, ${theme.overlay})`,
                '&:hover': { boxShadow: '0 20px 40px -20px rgba(79,70,229,1)' },
                '&.Mui-disabled': { background: '#cbd5e1', color: '#fff' },
              }}
            >
              {loading ? (
                <Stack direction="row" alignItems="center" spacing={0.8}>
                  <CircularProgress size={17} sx={{ color: '#fff' }} />
                  <span>در حال ورود…</span>
                </Stack>
              ) : 'ورود'}
            </Button>
          </Box>
        </Box>

        {/* لوگوی شرکت (سمت چپ) */}
        <Box data-testid="login-logo-panel" sx={{
          display: { xs: 'none', md: 'grid' }, placeItems: 'center', position: 'relative',
          background: `linear-gradient(158deg, ${withAlpha(theme.overlay, 0.94)} 0%, ${withAlpha(theme.accent, 0.55)} 100%)`,
        }}>
          <Box sx={{
            p: 2.4, display: 'grid', placeItems: 'center', borderRadius: '28px',
            bgcolor: 'rgba(255,255,255,0.95)',
            boxShadow: '0 26px 54px -26px rgba(2,6,23,0.7)',
          }}>
            <CompanyLogo company={selectedCompany} size={132} radius="20px" sx={{ bgcolor: '#fff' }} />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;

