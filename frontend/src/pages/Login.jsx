import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Avatar, Box, Button, Chip, CircularProgress, Fade,
  IconButton, InputAdornment, Stack, TextField, Typography, alpha,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import useAuth from '../core/hooks/useAuth';
import useCompany from '../core/hooks/useCompany';
import { useApplication } from '../core/context/ApplicationContext';
import CompanyEngine from '../core/engines/companyEngine';
import axiosInstance from '../core/api/axiosConfig';
import ModuleSelection from '../core/components/ui/ModuleSelection';
import CompanyLogo, { companyLabel } from '../core/components/ui/CompanyLogo';
import { MODULE_ICONS, getModuleLandingPath } from '../core/constants/moduleIcons';
import { MODULE_DEFAULT_ACCENTS } from '../core/context/ModulePaletteContext';

const ACCENT = '#4f46e5';
const INK = '#0f172a';
const MUTED = '#64748b';
const BORDER = 'rgba(15,23,42,0.09)';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: '#fff',
    fontSize: 12.5,
    fontWeight: 600,
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.2)' },
    '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(79,70,229,0.10)' },
    '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: '1.2px' },
  },
  '& .MuiInputLabel-root': { fontSize: 11.5, color: MUTED },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
};

const mapLoginError = (err, fallback) => {
  if (typeof err === 'string') return err;
  return err?.response?.data?.error
    || err?.response?.data?.detail
    || err?.response?.data?.non_field_errors?.[0]
    || fallback;
};

const companyDisplayName = (company) => companyLabel(company) || (company?.code ? `شرکت ${company.code}` : '');

const BrandMark = ({ size = 40 }) => (
  <Box sx={{
    width: size, height: size, borderRadius: '12px',
    bgcolor: '#0f172a', color: '#fff', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.42, fontWeight: 900, letterSpacing: '-0.06em',
    boxShadow: '0 8px 20px -12px rgba(15,23,42,0.7)',
  }}>K</Box>
);

const ProductName = ({ dark = false }) => (
  <Box>
    <Typography sx={{ fontSize: 14, fontWeight: 900, lineHeight: 1.3, color: dark ? '#fff' : INK }}>
      سامانه یکپارچه مدیریت کسب و کار کیان
    </Typography>
    <Typography sx={{
      fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
      color: dark ? 'rgba(255,255,255,0.48)' : '#94a3b8', mt: 0.25,
    }}>
      KIAN BUSINESS SUITE
    </Typography>
  </Box>
);

const BrandPanel = ({ company }) => {
  const name = company ? (companyDisplayName(company) || 'شرکت') : '';
  const moduleSlugs = Object.keys(MODULE_ICONS).slice(0, 6);

  return (
    <Box sx={{
      display: { xs: 'none', md: 'flex' },
      flex: 1,
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      flexDirection: 'column',
      justifyContent: 'space-between',
      p: { md: 4.5, lg: 6, xl: 7 },
      color: '#fff',
      bgcolor: '#0b1220',
      background: [
        'radial-gradient(900px 520px at 18% 10%, rgba(79,70,229,0.26), transparent 64%)',
        'radial-gradient(780px 520px at 100% 100%, rgba(14,165,233,0.14), transparent 58%)',
        'linear-gradient(145deg, #0b1220 0%, #101a30 58%, #0b1220 100%)',
      ].join(','),
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        opacity: 0.18,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '42px 42px',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent 85%)',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.07)',
        left: -90,
        bottom: 110,
      },
    }}>
      <Stack direction="row" alignItems="center" spacing={1.2} sx={{ position: 'relative', zIndex: 1 }}>
        <BrandMark size={42} />
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 900, lineHeight: 1.3 }}>کیان</Typography>
          <Typography sx={{ fontSize: 8, color: 'rgba(255,255,255,0.46)', letterSpacing: '0.12em', fontWeight: 700 }}>
            KIAN BUSINESS SUITE
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 530, py: 6 }}>
        <Chip label="پلتفرم یکپارچه مدیریت سازمان" sx={{
          mb: 2.2, height: 26, fontSize: 9.5, fontWeight: 800,
          color: '#c7d2fe', bgcolor: 'rgba(129,140,248,0.12)',
          border: '1px solid rgba(129,140,248,0.18)',
        }} />
        <Typography component="h1" sx={{
          fontSize: { md: 37, lg: 44, xl: 48 },
          fontWeight: 900,
          lineHeight: 1.42,
          letterSpacing: '-0.045em',
          color: '#fff',
        }}>
          سامانه یکپارچه
          <Box component="span" sx={{ display: 'block', color: '#a5b4fc' }}>مدیریت کسب و کار کیان</Box>
        </Typography>
        <Typography sx={{
          mt: 2.2, fontSize: { md: 12, lg: 13.5 }, lineHeight: 2,
          color: 'rgba(226,232,240,0.64)', maxWidth: 455,
        }}>
          یک فضای کاری منسجم برای منابع انسانی، قراردادها، پروژه‌ها، مالی و عملیات سازمانی؛
          با دسترسی یکپارچه و تجربه‌ای حرفه‌ای.
        </Typography>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 3.2 }}>
          {moduleSlugs.map((slug) => {
            const Icon = MODULE_ICONS[slug];
            const accent = MODULE_DEFAULT_ACCENTS[slug] || '#818cf8';
            return (
              <Box key={slug} sx={{
                width: 42, height: 42, borderRadius: '11px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: accent, bgcolor: alpha(accent, 0.10),
                border: `1px solid ${alpha(accent, 0.18)}`,
                backdropFilter: 'blur(4px)',
              }}>
                <Icon sx={{ fontSize: 21 }} />
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Stack spacing={1.6} sx={{ position: 'relative', zIndex: 1 }}>
        {company ? (
          <Box sx={{
            p: 1.4, borderRadius: '15px', maxWidth: 420,
            bgcolor: 'rgba(255,255,255,0.055)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
          }}>
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <CompanyLogo company={company} size={44} radius="11px"
                sx={{ bgcolor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(255,255,255,0.25)' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
                  {name}
                </Typography>
                <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.42)', direction: 'ltr', textAlign: 'right' }}>
                  {company.code || 'COMPANY PROFILE'}
                </Typography>
              </Box>
            </Stack>
          </Box>
        ) : null}

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={0.6}>
            <ShieldOutlinedIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.38)' }} />
            <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.38)' }}>
              دسترسی امن · محیط یکپارچه سازمانی
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)' }}>نسخه ۱.۰</Typography>
        </Stack>
      </Stack>
    </Box>
  );
};


const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setCurrentCompany } = useCompany();
  const { loadApplications, applications, switchApplication } = useApplication();

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);
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
    const loadHelpers = async () => {
      try {
        const [usersRes, companiesRes] = await Promise.all([
          axiosInstance.get('/auth/login-users/'),
          axiosInstance.get('/auth/login-companies/'),
        ]);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
      } catch (e) {
        // The form remains usable; the lists are simply empty.
      }
    };
    loadHelpers();
  }, []);

  useEffect(() => {
    if (!companies.length) return;
    setSelectedCompany((previous) => (
      previous && companies.some((company) => company.id === previous.id) ? previous : companies[0]
    ));
  }, [companies]);

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!selectedUser) {
      setError('نام کاربری را انتخاب کنید');
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
      const data = await login(
        selectedUser.username,
        password,
        selectedCompany ? selectedCompany.id : null,
      );

      setLoggedInUser(data.user || selectedUser);
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
      await loadApplications();
      setApplicationsLoading(false);
      setStep('application');
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


  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#fff' }}>
      <Box sx={{
        width: { xs: '100%', md: '47%', lg: '44%' },
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        bgcolor: '#fbfcfe',
        borderLeft: { md: `1px solid ${BORDER}` },
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: '50%',
          top: -300,
          right: -220,
          background: 'radial-gradient(circle, rgba(99,102,241,0.10), transparent 68%)',
          pointerEvents: 'none',
        },
      }}>
        <Box sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2.2, sm: 4, lg: 5 },
          py: { xs: 3, sm: 5 },
          position: 'relative',
          zIndex: 1,
        }}>
          <Fade in timeout={450}>
            <Box sx={{ width: '100%', maxWidth: 432 }}>
              <Stack direction="row" alignItems="center" spacing={1.1} sx={{ display: { xs: 'flex', md: 'none' }, mb: 4 }}>
                <BrandMark size={38} />
                <ProductName />
              </Stack>

              <Box sx={{ mb: 3 }}>
                <Typography sx={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
                  color: ACCENT, mb: 0.8,
                }}>
                  ورود به حساب کاربری
                </Typography>
                <Typography component="h1" sx={{
                  fontSize: { xs: 27, sm: 31 }, fontWeight: 900,
                  letterSpacing: '-0.04em', color: INK, lineHeight: 1.3,
                }}>
                  خوش آمدید
                </Typography>
                <Typography sx={{ mt: 0.9, fontSize: 11.5, color: MUTED, lineHeight: 1.9 }}>
                  برای ورود به سامانه، شرکت و اطلاعات حساب خود را انتخاب کنید.
                </Typography>
              </Box>

              {error ? (
                <Alert severity="error" sx={{ mb: 2, borderRadius: '11px', fontSize: 11.5 }}>
                  {error}
                </Alert>
              ) : null}


              <form onSubmit={handleCredentialsSubmit}>
                <Stack spacing={2}>
                  <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.85 }}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#334155' }}>
                        شرکت / سازمان
                      </Typography>
                      {companies.length > 0 ? (
                        <Typography sx={{ fontSize: 8.5, color: '#94a3b8' }}>
                          {companies.length.toLocaleString('fa-IR')} شرکت
                        </Typography>
                      ) : null}
                    </Stack>

                    {companies.length === 0 ? (
                      <Box sx={{
                        p: 1.25, borderRadius: '11px', bgcolor: '#f8fafc',
                        border: `1px dashed ${BORDER}`,
                      }}>
                        <Typography sx={{ fontSize: 10, color: MUTED }}>
                          اطلاعات شرکت‌ها در دسترس نیست.
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: companies.length === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                        gap: 0.8,
                        maxHeight: 172,
                        overflowY: 'auto',
                        pr: 0.25,
                        '&::-webkit-scrollbar': { width: 4 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 },
                      }}>
                        {companies.map((company) => {
                          const selected = selectedCompany?.id === company.id;
                          return (
                            <Button
                              key={company.id}
                              type="button"
                              variant="text"
                              onClick={() => setSelectedCompany(company)}
                              sx={{
                                justifyContent: 'flex-start', textAlign: 'right', p: 0.9, minWidth: 0,
                                borderRadius: '11px', color: INK,
                                bgcolor: selected ? alpha(ACCENT, 0.055) : '#fff',
                                border: `1px solid ${selected ? alpha(ACCENT, 0.46) : BORDER}`,
                                boxShadow: selected ? `0 0 0 3px ${alpha(ACCENT, 0.06)}` : 'none',
                                '&:hover': { bgcolor: selected ? alpha(ACCENT, 0.07) : '#f8fafc', borderColor: alpha(ACCENT, 0.26) },
                              }}
                            >
                              <CompanyLogo company={company} size={31} radius="9px" />
                              <Box sx={{ flex: 1, minWidth: 0, mr: 0.8 }}>
                                <Typography noWrap sx={{ fontSize: 9.6, fontWeight: 800, color: INK }}>
                                  {companyDisplayName(company) || 'شرکت'}
                                </Typography>
                                {company.code ? (
                                  <Typography sx={{ fontSize: 7.8, color: '#94a3b8', direction: 'ltr', textAlign: 'right' }}>
                                    {company.code}
                                  </Typography>
                                ) : null}
                              </Box>
                              {selected ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: ACCENT }} /> : null}
                            </Button>
                          );
                        })}
                      </Box>
                    )}
                  </Box>


                  <Autocomplete
                    options={users}
                    value={selectedUser}
                    onChange={(_event, value) => setSelectedUser(value)}
                    getOptionLabel={(user) => user.full_name || user.username || ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    noOptionsText="کاربری یافت نشد"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="نام کاربری"
                        placeholder="کاربر خود را انتخاب کنید"
                        sx={fieldSx}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonOutlineIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, user) => {
                      const initial = user.first_name?.[0] || user.username?.[0] || '?';
                      return (
                        <Box component="li" {...props} key={user.id} sx={{ gap: 1 }}>
                          <Avatar sx={{
                            width: 28, height: 28, fontSize: 11, fontWeight: 800,
                            bgcolor: alpha(ACCENT, 0.08), color: ACCENT,
                          }}>
                            {initial}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: INK }}>
                              {user.full_name || user.username}
                            </Typography>
                            <Typography sx={{ fontSize: 8.5, color: '#94a3b8' }}>@{user.username}</Typography>
                          </Box>
                        </Box>
                      );
                    }}
                  />

                  <TextField
                    fullWidth
                    label="رمز عبور"
                    autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loading}
                    sx={fieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
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

                  <Button
                    type="submit"
                    fullWidth
                    size="large"
                    variant="contained"
                    disabled={loading}
                    sx={{
                      mt: 0.35, py: 1.25, borderRadius: '11px',
                      fontSize: 12, fontWeight: 800, textTransform: 'none',
                      bgcolor: '#111827', color: '#fff',
                      boxShadow: '0 12px 25px -16px rgba(15,23,42,0.7)',
                      '&:hover': { bgcolor: '#1e293b', boxShadow: '0 14px 30px -15px rgba(15,23,42,0.8)' },
                      '&.Mui-disabled': { bgcolor: '#cbd5e1', color: '#fff' },
                    }}
                  >
                    {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'ورود به سامانه'}
                  </Button>
                </Stack>
              </form>


              <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mt: 2.4 }}>
                <ShieldOutlinedIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                <Typography sx={{ fontSize: 8.8, color: '#94a3b8' }}>
                  ارتباط شما با سامانه به‌صورت امن برقرار می‌شود.
                </Typography>
              </Stack>
            </Box>
          </Fade>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={0.5}
          sx={{ px: { xs: 2.2, sm: 4 }, py: 2, borderTop: `1px solid ${BORDER}`, position: 'relative', zIndex: 1 }}
        >
          <Typography sx={{ fontSize: 8.8, color: '#94a3b8' }}>
            سامانه یکپارچه مدیریت کسب و کار کیان
          </Typography>
          <Typography sx={{ fontSize: 8.8, color: '#cbd5e1' }}>© KIAN ERP</Typography>
        </Stack>
      </Box>

      <BrandPanel company={selectedCompany} />
    </Box>
  );
};

export default Login;
