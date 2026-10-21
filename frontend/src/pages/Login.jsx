import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Avatar, Box, Button, Chip, CircularProgress, Fade,
  IconButton, InputAdornment, Stack, TextField, Typography, alpha,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
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
const BORDER = 'rgba(15,23,42,0.10)';

const HIGHLIGHTS = [
  { slug: 'hrms', title: 'منابع انسانی', caption: 'پرسنل، حضور و پرداخت' },
  { slug: 'contracts', title: 'قراردادها', caption: 'چرخهٔ کامل قرارداد' },
  { slug: 'accounting', title: 'مالی و حساب‌داری', caption: 'اسناد و گزارش‌های مدیریتی' },
  { slug: 'projects', title: 'پروژه‌ها', caption: 'برنامه‌ریزی و کنترل پیشرفت' },
];

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
  if (typeof err === 'string') return err;
  return err?.response?.data?.error
    || err?.response?.data?.detail
    || err?.response?.data?.non_field_errors?.[0]
    || fallback;
};

const companyDisplayName = (company) => companyLabel(company) || (company?.code ? `شرکت ${company.code}` : '');

const BrandMark = ({ size = 40 }) => (
  <Box sx={{
    width: size, height: size, borderRadius: size > 36 ? '13px' : '11px',
    background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 45%, #0ea5e9 100%)',
    color: '#fff', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: Math.max(12, size * 0.42), fontWeight: 900, letterSpacing: '-0.06em',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 14px 30px -16px rgba(79,70,229,0.9)',
  }}>K</Box>
);

const ProductName = ({ dark = false }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography noWrap sx={{ fontSize: 14, fontWeight: 900, lineHeight: 1.3, color: dark ? '#fff' : INK }}>
      سامانه یکپارچه مدیریت کسب و کار کیان
    </Typography>
    <Typography sx={{
      fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
      color: dark ? 'rgba(255,255,255,0.44)' : '#94a3b8', mt: 0.25,
    }}>
      KIAN BUSINESS SUITE
    </Typography>
  </Box>
);

const BrandPanel = ({ company }) => {
  const name = company ? (companyDisplayName(company) || 'شرکت') : '';

  return (
    <Box sx={{
      display: { xs: 'none', md: 'flex' },
      flex: 1,
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      flexDirection: 'column',
      justifyContent: 'space-between',
      p: { md: 4.5, lg: 5.8, xl: 6.8 },
      color: '#fff',
      bgcolor: '#07101f',
      background: [
        'radial-gradient(900px 560px at 14% 8%, rgba(79,70,229,0.34), transparent 64%)',
        'radial-gradient(720px 620px at 100% 96%, rgba(14,165,233,0.16), transparent 60%)',
        'linear-gradient(145deg, #07101f 0%, #0c1830 55%, #07101f 100%)',
      ].join(','),
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        opacity: 0.16,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '46px 46px',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.72), transparent 88%)',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        width: 380,
        height: 380,
        borderRadius: '50%',
        border: '1px solid rgba(129,140,248,0.11)',
        left: -180,
        bottom: 75,
        boxShadow: '0 0 0 42px rgba(99,102,241,0.025), 0 0 0 88px rgba(14,165,233,0.018)',
      },
    }}>
      <Stack direction="row" alignItems="center" spacing={1.2} sx={{ position: 'relative', zIndex: 1 }}>
        <BrandMark size={44} />
        <ProductName dark />
        <Box sx={{ flex: 1 }} />
        <Chip label="نسخهٔ سازمانی" sx={{
          height: 24, fontSize: 12, fontWeight: 800,
          color: 'rgba(226,232,240,0.76)', bgcolor: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.09)',
        }} />
      </Stack>

      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 590, py: { md: 4, lg: 5.5 } }}>
        <Chip label="پلتفرم یکپارچه مدیریت سازمان" sx={{
          mb: 2.2, height: 27, fontSize: 12, fontWeight: 800,
          color: '#c7d2fe', bgcolor: 'rgba(129,140,248,0.12)',
          border: '1px solid rgba(129,140,248,0.20)',
        }} />
        <Typography component="h1" sx={{
          fontSize: { md: 38, lg: 45, xl: 49 },
          fontWeight: 900,
          lineHeight: 1.34,
          letterSpacing: '-0.05em',
          color: '#fff',
        }}>
          یک فضای کاری،
          <Box component="span" sx={{ display: 'block', color: '#a5b4fc' }}>همهٔ کسب‌وکار شما.</Box>
        </Typography>
        <Typography sx={{
          mt: 2, fontSize: { md: 11.8, lg: 13 }, lineHeight: 2,
          color: 'rgba(226,232,240,0.62)', maxWidth: 470,
        }}>
          داده‌ها، فرایندها و تصمیم‌های سازمان در یک تجربهٔ منسجم؛ از منابع انسانی و قراردادها
          تا مالی، پروژه‌ها و عملیات روزانه.
        </Typography>

        <Box sx={{
          mt: 3, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 1, maxWidth: 520,
        }}>
          {HIGHLIGHTS.map((item) => {
            const Icon = MODULE_ICONS[item.slug] || MODULE_ICONS.hrms;
            const accent = MODULE_DEFAULT_ACCENTS[item.slug] || '#818cf8';
            return (
              <Box key={item.slug} sx={{
                p: 1.35, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: 1,
                bgcolor: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.075)',
                backdropFilter: 'blur(10px)',
                transition: 'background-color .2s ease, border-color .2s ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', borderColor: alpha(accent, 0.25) },
              }}>
                <Box sx={{
                  width: 35, height: 35, borderRadius: '10px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: accent, bgcolor: alpha(accent, 0.11),
                  border: `1px solid ${alpha(accent, 0.18)}`,
                }}>
                  <Icon sx={{ fontSize: 18 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{item.title}</Typography>
                  <Typography noWrap sx={{ mt: 0.15, fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>{item.caption}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" sx={{ mt: 2.1 }}>
          {['دسترسی نقش‌محور', 'داده‌های یکپارچه', 'گزارش‌های لحظه‌ای'].map((label) => (
            <Chip key={label} size="small" label={label} sx={{
              height: 22, fontSize: 12, fontWeight: 700,
              color: 'rgba(226,232,240,0.62)', bgcolor: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.07)',
            }} />
          ))}
        </Stack>
      </Box>


      <Stack spacing={1.4} sx={{ position: 'relative', zIndex: 1 }}>
        {company ? (
          <Box sx={{
            p: 1.35, borderRadius: '15px', maxWidth: 430,
            bgcolor: 'rgba(255,255,255,0.055)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
          }}>
            <Stack direction="row" alignItems="center" spacing={1.15}>
              <CompanyLogo company={company} size={42} radius="11px"
                sx={{ bgcolor: 'rgba(255,255,255,0.94)', borderColor: 'rgba(255,255,255,0.24)' }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.38)', mb: 0.15 }}>
                  سازمان انتخاب‌شده
                </Typography>
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{name}</Typography>
                <Typography noWrap sx={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', direction: 'ltr', textAlign: 'right' }}>
                  {company.code || 'COMPANY PROFILE'}
                </Typography>
              </Box>
              <Box sx={{
                width: 7, height: 7, borderRadius: '50%', bgcolor: '#34d399', flexShrink: 0,
                boxShadow: '0 0 0 4px rgba(52,211,153,0.10)',
              }} />
            </Stack>
          </Box>
        ) : null}

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={0.65}>
            <ShieldOutlinedIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }} />
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.36)' }}>
              دسترسی امن · محیط یکپارچه سازمانی
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>KIAN ERP · 1.0</Typography>
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
        // Authentication still works with manual username entry.
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
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#f7f9fd', overflowX: 'hidden' }}>
      <Box sx={{
        width: { xs: '100%', md: '47%', lg: '44%' },
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        bgcolor: '#f8fafc',
        borderLeft: { md: `1px solid ${BORDER}` },
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 580,
          height: 580,
          borderRadius: '50%',
          top: -360,
          right: -240,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 66%)',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          bottom: -280,
          left: -220,
          background: 'radial-gradient(circle, rgba(14,165,233,0.08), transparent 68%)',
          pointerEvents: 'none',
        },
      }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: { xs: 2.2, sm: 4 }, py: 2, position: 'relative', zIndex: 1 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.05} sx={{ display: { xs: 'flex', md: 'none' } }}>
            <BrandMark size={36} />
            <ProductName />
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Chip
            icon={<ShieldOutlinedIcon sx={{ fontSize: '14px !important' }} />}
            label="ورود امن"
            sx={{
              height: 24, fontSize: 12, fontWeight: 800,
              color: '#475569', bgcolor: '#fff', border: `1px solid ${BORDER}`,
              '& .MuiChip-icon': { color: '#64748b', ml: 0.65 },
            }}
          />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', direction: 'ltr' }}>
            KIAN ERP · 1.0
          </Typography>
        </Stack>

        <Box sx={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          px: { xs: 2.2, sm: 4, lg: 4.5 }, py: { xs: 2, sm: 3.5 },
          position: 'relative', zIndex: 1,
        }}>
          <Fade in timeout={450}>
            <Box sx={{ width: '100%', maxWidth: 442 }}>
              <Box sx={{ mb: 2.6 }}>
                <Typography sx={{
                  fontSize: 12, fontWeight: 800, letterSpacing: '0.08em',
                  color: ACCENT, mb: 0.75,
                }}>
                  ورود به حساب کاربری
                </Typography>
                <Typography component="h1" sx={{
                  fontSize: { xs: 27, sm: 31 }, fontWeight: 900,
                  letterSpacing: '-0.045em', color: INK, lineHeight: 1.25,
                }}>
                  خوش آمدید
                </Typography>
                <Typography sx={{ mt: 0.8, fontSize: 12, color: MUTED, lineHeight: 1.9 }}>
                  برای ادامه، سازمان و اطلاعات حساب کاربری خود را وارد کنید.
                </Typography>
              </Box>

              <Box sx={{
                p: { xs: 2, sm: 2.4 },
                borderRadius: '20px',
                bgcolor: 'rgba(255,255,255,0.88)',
                border: '1px solid rgba(255,255,255,0.9)',
                boxShadow: '0 28px 80px -64px rgba(15,23,42,0.75), 0 1px 0 rgba(15,23,42,0.02)',
                backdropFilter: 'blur(18px)',
              }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK }}>اطلاعات ورود</Typography>
                    <Typography sx={{ mt: 0.25, fontSize: 12, color: '#94a3b8' }}>
                      دسترسی شما بر اساس نقش سازمانی تعیین می‌شود.
                    </Typography>
                  </Box>
                  <Chip label="مرحله ۱ از ۲" sx={{
                    height: 22, fontSize: 12, fontWeight: 800,
                    bgcolor: alpha(ACCENT, 0.055), color: ACCENT,
                    border: `1px solid ${alpha(ACCENT, 0.10)}`,
                  }} />
                </Stack>

                {error ? (
                  <Alert severity="error" sx={{ mb: 1.8, borderRadius: '11px', fontSize: 12, py: 0.35 }}>
                    {error}
                  </Alert>
                ) : null}

                <form onSubmit={handleCredentialsSubmit} noValidate>
                  <Stack spacing={1.75}>


                    <Autocomplete
                      options={companies}
                      value={selectedCompany}
                      onChange={(_event, value) => {
                        setSelectedCompany(value);
                        setError('');
                      }}
                      getOptionLabel={(option) => companyDisplayName(option) || ''}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      loading={helpersLoading}
                      loadingText="در حال دریافت سازمان‌ها…"
                      noOptionsText="سازمانی برای انتخاب یافت نشد"
                      disableClearable={companies.length <= 1}
                      disabled={loading}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="شرکت / سازمان"
                          placeholder="سازمان خود را انتخاب کنید"
                          sx={fieldSx}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <InputAdornment position="start">
                                {selectedCompany ? (
                                  <CompanyLogo company={selectedCompany} size={24} radius="7px"
                                    sx={{ border: 0, bgcolor: '#f8fafc' }} />
                                ) : (
                                  <BusinessOutlinedIcon sx={{ fontSize: 19, color: '#94a3b8' }} />
                                )}
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <>
                                {helpersLoading ? <CircularProgress color="inherit" size={15} sx={{ mr: 0.5 }} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...optionProps } = props;
                        const selected = selectedCompany?.id === option.id;
                        return (
                          <Box component="li" key={key} {...optionProps} sx={{
                            display: 'flex !important', alignItems: 'center', gap: 1,
                            borderRadius: '9px', mx: 0.5, my: 0.15, p: '7px 9px !important',
                          }}>
                            <CompanyLogo company={option} size={30} radius="8px" />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>
                                {companyDisplayName(option) || 'شرکت'}
                              </Typography>
                              {option.code ? (
                                <Typography noWrap sx={{ fontSize: 12, color: '#94a3b8', direction: 'ltr', textAlign: 'right' }}>
                                  {option.code}
                                </Typography>
                              ) : null}
                            </Box>
                            {selected ? <CheckCircleRoundedIcon sx={{ fontSize: 17, color: ACCENT }} /> : null}
                          </Box>
                        );
                      }}
                    />


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
                      loadingText="در حال دریافت کاربران…"
                      noOptionsText="کاربری یافت نشد؛ نام کاربری را وارد کنید"
                      disabled={loading}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="نام کاربری"
                          placeholder="نام کاربری خود را وارد کنید"
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
                                {helpersLoading ? <CircularProgress color="inherit" size={15} sx={{ mr: 0.5 }} /> : null}
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
                              width: 29, height: 29, fontSize: 12, fontWeight: 800,
                              bgcolor: alpha(ACCENT, 0.08), color: ACCENT,
                            }}>{initial}</Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>
                                {option.full_name || option.username}
                              </Typography>
                              <Typography noWrap sx={{ fontSize: 12, color: '#94a3b8', direction: 'ltr', textAlign: 'right' }}>
                                @{option.username}
                              </Typography>
                            </Box>
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
                          <Typography sx={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>
                            Caps Lock روشن است.
                          </Typography>
                        </Stack>
                      ) : null}
                    </Box>


                    <Button
                      type="submit"
                      fullWidth
                      size="large"
                      variant="contained"
                      disabled={loading}
                      aria-busy={loading}
                      endIcon={!loading ? <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} /> : null}
                      sx={{
                        mt: 0.35, py: 1.25, borderRadius: '12px',
                        fontSize: 12, fontWeight: 900, textTransform: 'none',
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5 58%, #4338ca)',
                        color: '#fff', boxShadow: '0 16px 34px -20px rgba(79,70,229,0.95)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #4f46e5, #4338ca 58%, #3730a3)',
                          boxShadow: '0 18px 38px -19px rgba(79,70,229,1)',
                        },
                        '&.Mui-disabled': { background: '#cbd5e1', color: '#fff' },
                      }}
                    >
                      {loading ? (
                        <Stack direction="row" alignItems="center" spacing={0.8}>
                          <CircularProgress size={17} sx={{ color: '#fff' }} />
                          <span>در حال ورود…</span>
                        </Stack>
                      ) : 'ورود به سامانه'}
                    </Button>
                  </Stack>
                </form>

                <Stack direction="row" alignItems="center" spacing={0.65} sx={{
                  mt: 1.8, pt: 1.4, borderTop: `1px solid ${BORDER}`,
                }}>
                  <ShieldOutlinedIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                  <Typography sx={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
                    اطلاعات ورود شما محافظت می‌شود و دسترسی‌ها بر اساس نقش سازمانی اعمال می‌گردد.
                  </Typography>
                </Stack>
              </Box>

              <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.6} sx={{ mt: 1.8 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#10b981' }} />
                <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                  اتصال امن به محیط سازمانی
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
          sx={{ px: { xs: 2.2, sm: 4 }, py: 1.8, borderTop: `1px solid ${BORDER}`, position: 'relative', zIndex: 1 }}
        >
          <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
            © 2026 KIAN ERP — سامانه یکپارچه مدیریت کسب و کار
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#cbd5e1' }}>
            دسترسی سازمانی · نسخهٔ ۱.۰
          </Typography>
        </Stack>
      </Box>

      <BrandPanel company={selectedCompany} />
    </Box>
  );
};

export default Login;
