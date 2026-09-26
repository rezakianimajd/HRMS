import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, TextField, Button, Typography, Paper, Alert,
  CircularProgress, InputAdornment, IconButton, Avatar, Stack, Fade, Grid, Chip,
  Autocomplete, Tooltip,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import BusinessIcon from '@mui/icons-material/Business';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AppsIcon from '@mui/icons-material/Apps';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import DescriptionIcon from '@mui/icons-material/Description';
import TimelineIcon from '@mui/icons-material/Timeline';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DevicesIcon from '@mui/icons-material/Devices';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SellIcon from '@mui/icons-material/Sell';
import FactoryIcon from '@mui/icons-material/Factory';
import SettingsIcon from '@mui/icons-material/Settings';
import useAuth from '../core/hooks/useAuth';
import useCompany from '../core/hooks/useCompany';
import { useApplication } from '../core/context/ApplicationContext';
import CompanyEngine from '../core/engines/companyEngine';
import axiosInstance from '../core/api/axiosConfig';

const COLOR = '#6a5cf5';
const COLOR_2 = '#a78bfa';
const COLOR_3 = '#67e8f9';
const INK = '#111318';
const MUTED = '#6b7280';
const GRAY = '#c2c7d1';

// Modern icon set keyed by application slug.
const MODULE_ICONS = {
  hrms: GroupsIcon,
  contracts: DescriptionIcon,
  projects: TimelineIcon,
  inventory: Inventory2Icon,
  accounting: ReceiptLongIcon,
  assets: DevicesIcon,
  treasury: AccountBalanceIcon,
  crm: SupportAgentIcon,
  procurement: ShoppingCartIcon,
  sales: SellIcon,
  production: FactoryIcon,
  settings: SettingsIcon,
};

const ModuleIcon = ({ slug, ...rest }) => {
  const Icon = MODULE_ICONS[slug] || AppsIcon;
  return <Icon {...rest} />;
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

  // Load public login helpers (users + companies) once.
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
        // keep silent; the fields just remain empty
      }
    };
    loadHelpers();
  }, []);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError('نام کاربری را انتخاب کنید');
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

      const company = data.company || selectedCompany;
      if (company) {
        CompanyEngine.setStoredCompany(company);
        setCurrentCompany(company);
      }

      await loadApplications();
      setStep('application');
    } catch (err) {
      setError(typeof err === 'string' ? err : (err.response?.data?.error || t('auth.loginError')));
    } finally {
      setLoading(false);
    }
  };

  const handleAppSelect = async (app) => {
    if (app.is_coming_soon || !app.accessible) return;
    setSelectedApp(app);
    setLoading(true);
    try {
      await switchApplication(app);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('خطا در انتخاب ماژول');
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setSelectedApp(null);
    setError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(900px 700px at 14% 6%, rgba(167,139,250,0.22), transparent 62%),' +
          'radial-gradient(900px 700px at 92% 10%, rgba(103,232,249,0.20), transparent 62%),' +
          'radial-gradient(1200px 900px at 50% 108%, rgba(240,171,252,0.18), transparent 60%),' +
          'linear-gradient(180deg, #f3f5fb 0%, #e9ecf3 100%)',
      }}
    >
      <Box sx={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', filter: 'blur(120px)', background: 'rgba(167,139,250,0.35)', top: '-10%', left: '-8%', animation: 'floatOrb 12s ease-in-out infinite' }} />
      <Box sx={{ position: 'absolute', width: 460, height: 460, borderRadius: '50%', filter: 'blur(120px)', background: 'rgba(103,232,249,0.30)', bottom: '-8%', right: '-6%', animation: 'floatOrb 14s ease-in-out infinite reverse' }} />

      <Container maxWidth={step === 'application' ? 'lg' : 'xs'} sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={500}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4.5 },
              width: '100%',
              maxWidth: step === 'application' ? 1100 : 460,
              margin: '0 auto',
              borderRadius: step === 'application' ? '28px' : '32px',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.88), rgba(255,255,255,0.66))',
              backdropFilter: 'blur(48px) saturate(180%)',
              WebkitBackdropFilter: 'blur(48px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow:
                '0 60px 120px -50px rgba(106,92,245,0.32),' +
                '0 30px 60px -30px rgba(103,232,249,0.18),' +
                '0 12px 30px -14px rgba(17,19,24,0.12),' +
                'inset 0 1.5px 1px -1px rgba(255,255,255,1)',
            }}
          >
            {/* Brand header */}
            <Box sx={{ textAlign: 'center', mb: 3.5 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 2,
                  borderRadius: '20px',
                  background: `linear-gradient(135deg, ${COLOR}, ${COLOR_2} 45%, ${COLOR_3} 100%)`,
                  boxShadow: `0 16px 34px -10px ${COLOR}8c`,
                  transform: 'rotate(-3deg)',
                }}
              >
                <svg viewBox="0 0 64 64" width="38" height="38" fill="none">
                  <path d="M32 8 L52 20 L52 44 L32 56 L12 44 L12 20 Z" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinejoin="round" />
                  <g stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 17 L22 47" />
                    <path d="M23 32 L43 17" />
                    <path d="M23 32 L43 47" />
                  </g>
                </svg>
              </Avatar>
              <Typography variant="caption" sx={{ display: 'block', color: MUTED, fontWeight: 600, letterSpacing: 2, mb: 1, fontSize: 11 }}>
                {step === 'application' ? 'انتخاب ماژول' : 'سامانه یکپارچه مدیریت کسب و کار'}
              </Typography>
              <Typography variant="h4" component="h1" fontWeight={900} letterSpacing="-1.5px" sx={{ mb: 1 }}>
                <Box component="span" sx={{
                  background: `linear-gradient(120deg, ${COLOR}, ${COLOR_2} 40%, ${COLOR_3} 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  کیان
                </Box>
              </Typography>
              <Typography variant="caption" sx={{ color: MUTED, letterSpacing: 2, fontSize: 10.5 }}>
                KIANI EBP · ENTERPRISE BUSINESS PLATFORM
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', fontSize: 13 }}>{error}</Alert>}

            {/* STEP 1: credentials */}
            {step === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit}>
                <Stack spacing={2}>
                  {/* Username dropdown */}
                  <Autocomplete
                    options={users}
                    value={selectedUser}
                    onChange={(e, v) => setSelectedUser(v)}
                    getOptionLabel={(u) => u.full_name || u.username}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    noOptionsText="کاربری یافت نشد"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="نام کاربری"
                        variant="outlined"
                        placeholder="انتخاب کاربر…"
                        sx={glassField}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <InputAdornment position="start"><PersonIcon style={{ color: MUTED, opacity: 0.6, fontSize: 20 }} /></InputAdornment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, u) => (
                      <Box component="li" {...props} key={u.id} sx={{ '& > span': { width: '100%' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: `${COLOR}22`, color: COLOR }}>
                            {((u.first_name || '')[0] || u.username[0])}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ color: INK }}>{u.full_name}</Typography>
                            <Typography variant="caption" sx={{ color: MUTED }}>@{u.username}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  />

                  {/* Password */}
                  <TextField
                    fullWidth
                    label="رمز عبور"
                    type={showPassword ? 'text' : 'password'}
                    variant="outlined"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    sx={glassField}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><LockIcon sx={{ color: MUTED, opacity: 0.6, fontSize: 20 }} /></InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: MUTED, opacity: 0.6 }}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Companies list */}
                  <Box>
                    <Typography variant="body2" fontWeight={800} sx={{ color: INK, mb: 1 }}>انتخاب شرکت</Typography>
                    {companies.length === 0 ? (
                      <Typography variant="caption" sx={{ color: MUTED }}>شرکتی تعریف نشده است.</Typography>
                    ) : (
                      <Stack spacing={1} sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
                        {companies.map((c) => {
                          const isSelected = selectedCompany?.id === c.id;
                          return (
                            <Paper
                              key={c.id}
                              onClick={() => setSelectedCompany(c)}
                              sx={{
                                p: 1.5,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderRadius: '14px',
                                background: isSelected ? `linear-gradient(135deg, ${COLOR}22, rgba(255,255,255,0.6))` : 'rgba(255,255,255,0.55)',
                                border: `1px solid ${isSelected ? COLOR : 'rgba(17,19,24,0.08)'}`,
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                                transition: 'all 0.2s',
                                '&:hover': { borderColor: COLOR_2, bgcolor: `${COLOR}0f` },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                                <Avatar sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${COLOR}, ${COLOR_2})` }}>
                                  <BusinessIcon sx={{ color: '#fff', fontSize: 20 }} />
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={700} sx={{ color: INK, noWrap: true }}>{c.name}</Typography>
                                  {c.code && <Typography variant="caption" sx={{ color: MUTED }}>{c.code}</Typography>}
                                </Box>
                              </Box>
                              {isSelected && <CheckCircleIcon sx={{ color: COLOR, fontSize: 22 }} />}
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    size="large"
                    variant="contained"
                    disabled={loading}
                    sx={{
                      py: 1.5,
                      borderRadius: '16px',
                      fontWeight: 700,
                      fontSize: 15,
                      color: '#fff',
                      background: `linear-gradient(180deg, #22242e 0%, ${INK} 100%)`,
                      boxShadow: `0 20px 40px -14px rgba(17,19,24,0.5), 0 8px 20px -8px ${COLOR}66`,
                      textTransform: 'none',
                      '&:hover': { transform: 'translateY(-2px)' },
                    }}
                  >
                    {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'ورود به سامانه'}
                  </Button>
                </Stack>
              </form>
            )}

            {/* STEP 2: application */}
            {step === 'application' && (
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ color: MUTED }}>
                    ماژول مورد نظر خود را انتخاب کنید
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Button variant="outlined" size="small" onClick={handleBack} sx={{ borderRadius: '10px', color: INK, borderColor: 'rgba(17,19,24,0.15)', textTransform: 'none' }}>
                    بازگشت
                  </Button>
                </Box>

                {applications.length === 0 ? (
                  <Typography variant="body2" sx={{ color: MUTED, textAlign: 'center', py: 4 }}>
                    ماژولی در دسترس نیست.
                  </Typography>
                ) : (
                  <Grid container spacing={1.5}>
                    {applications.map((app) => {
                      const disabled = app.is_coming_soon || !app.accessible;
                      const isSelected = selectedApp?.id === app.id;
                      return (
                        <Grid item xs={6} sm={4} md={3} lg={12 / 5} key={app.id}>
                          <Tooltip
                            title={app.is_coming_soon ? 'به‌زودی' : (!app.accessible ? 'عدم دسترسی' : '')}
                            placement="top"
                          >
                            <Paper
                              onClick={() => handleAppSelect(app)}
                              sx={{
                                height: 150,
                                cursor: disabled ? 'default' : 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                gap: 1,
                                px: 1.5,
                                borderRadius: '18px',
                                transition: 'all 0.2s',
                                background: isSelected
                                  ? `linear-gradient(160deg, ${app.color || COLOR}26, rgba(255,255,255,0.7))`
                                  : 'rgba(255,255,255,0.6)',
                                border: `1px solid ${isSelected ? (app.color || COLOR) : (disabled ? 'rgba(17,19,24,0.06)' : 'rgba(17,19,24,0.1)')}`,
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                                opacity: disabled ? 0.45 : 1,
                                filter: disabled ? 'grayscale(1)' : 'none',
                                '&:hover': !disabled ? {
                                  borderColor: app.color || COLOR,
                                  boxShadow: `0 12px 26px -14px ${app.color || COLOR}80`,
                                  transform: 'translateY(-2px)',
                                } : {},
                              }}
                            >
                              <Avatar sx={{
                                width: 46, height: 46, borderRadius: '14px',
                                background: disabled ? `linear-gradient(135deg, ${GRAY}, ${GRAY}cc)` : `linear-gradient(135deg, ${app.color || COLOR}, ${app.color || COLOR}cc)`,
                                boxShadow: disabled ? 'none' : `0 8px 18px -8px ${app.color || COLOR}b0, inset 0 1px 0 rgba(255,255,255,0.35)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <ModuleIcon slug={app.slug} sx={{ color: '#fff', fontSize: 26 }} />
                              </Avatar>
                              <Typography variant="subtitle2" fontWeight={800} sx={{ color: INK, lineHeight: 1.3 }}>{app.title}</Typography>
                              {app.description && (
                                <Typography variant="caption" noWrap sx={{ color: MUTED, display: 'block', maxWidth: '100%' }}>
                                  {app.description}
                                </Typography>
                              )}
                              {app.is_coming_soon && (
                                <Chip size="small" label="به‌زودی" sx={{ height: 18, fontSize: 9.5, color: MUTED, bgcolor: 'rgba(17,19,24,0.06)' }} />
                              )}
                              {!app.is_coming_soon && !app.accessible && (
                                <Chip size="small" label="عدم دسترسی" sx={{ height: 18, fontSize: 9.5, color: MUTED, bgcolor: 'rgba(17,19,24,0.06)' }} />
                              )}
                            </Paper>
                          </Tooltip>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}

                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                    <CircularProgress size={22} sx={{ color: COLOR }} />
                  </Box>
                )}
              </Stack>
            )}
          </Paper>
        </Fade>
      </Container>

      <style>{`
        @keyframes floatOrb {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-28px) scale(1.05); }
        }
      `}</style>
    </Box>
  );
};

const glassField = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '16px',
    color: INK,
    background: 'rgba(255,255,255,0.55)',
    '& fieldset': { borderColor: 'rgba(17,19,24,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(17,19,24,0.22)' },
    '&.Mui-focused fieldset': { borderColor: COLOR, borderWidth: '1.5px' },
  },
  '& .MuiInputBase-root': { boxShadow: '0 1px 2px rgba(17,19,24,0.04), inset 0 1px 0 rgba(255,255,255,0.95)' },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiInputLabel-root.Mui-focused': { color: COLOR },
  '& .MuiInputBase-input': { fontWeight: 600 },
};

export default Login;