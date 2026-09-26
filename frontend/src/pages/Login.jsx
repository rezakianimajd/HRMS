import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, TextField, Button, Typography, Paper, Alert,
  CircularProgress, InputAdornment, IconButton, Avatar, Stack, Fade, Grid, Chip,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AppsIcon from '@mui/icons-material/Apps';
import useAuth from '../core/hooks/useAuth';
import useCompany from '../core/hooks/useCompany';
import { useApplication } from '../core/context/ApplicationContext';
import CompanyEngine from '../core/engines/companyEngine';

const COLOR = '#6a5cf5';
const COLOR_2 = '#a78bfa';
const COLOR_3 = '#67e8f9';
const INK = '#111318';
const MUTED = '#6b7280';
const R = 16;

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setCurrentCompany } = useCompany();
  const { loadApplications, applications, switchApplication } = useApplication();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [step, setStep] = useState('credentials');
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  const goApplication = async () => {
    await loadApplications();
    setStep('application');
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError(t('validation.required'));
      return;
    }

    setLoading(true);
    try {
      const data = await login(username, password, null);
      const companies = data.available_companies || data.user?.companies || [];

      if (companies.length === 1) {
        const single = companies[0];
        CompanyEngine.setStoredCompany(single);
        setCurrentCompany(single);
        await goApplication();
        return;
      }

      if (companies.length > 1) {
        setAvailableCompanies(companies);
        setSelectedCompany(null);
        setStep('company');
        return;
      }

      await goApplication();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err.response?.data?.error || t('auth.loginError')));
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = async () => {
    if (!selectedCompany) {
      setError('لطفاً یک شرکت انتخاب کنید');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await login(username, password, selectedCompany.id);
      CompanyEngine.setStoredCompany(data.company || selectedCompany);
      setCurrentCompany(data.company || selectedCompany);
      await goApplication();
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ورود به شرکت');
    } finally {
      setLoading(false);
    }
  };

  const handleAppSelect = async () => {
    if (!selectedApp) {
      setError('لطفاً یک ماژول انتخاب کنید');
      return;
    }
    setLoading(true);
    try {
      await switchApplication(selectedApp);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('خطا در انتخاب ماژول');
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'company') {
      setStep('credentials');
      setSelectedCompany(null);
    } else if (step === 'application') {
      setStep(availableCompanies.length > 1 ? 'company' : 'credentials');
      setSelectedApp(null);
    }
    setError('');
  };

  const activeApps = applications.filter(a => !a.is_coming_soon);
  const comingSoonApps = applications.filter(a => a.is_coming_soon);

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
      {/* ambient blobs */}
      <Box sx={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', filter: 'blur(120px)', background: 'rgba(167,139,250,0.35)', top: '-10%', left: '-8%', animation: 'floatOrb 12s ease-in-out infinite' }} />
      <Box sx={{ position: 'absolute', width: 460, height: 460, borderRadius: '50%', filter: 'blur(120px)', background: 'rgba(103,232,249,0.30)', bottom: '-8%', right: '-6%', animation: 'floatOrb 14s ease-in-out infinite reverse' }} />
      <Box sx={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', filter: 'blur(120px)', background: 'rgba(240,171,252,0.28)', top: '35%', left: '38%', animation: 'floatOrb 16s ease-in-out infinite' }} />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={700}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4.5 },
              width: 'min(460px, 100%)',
              margin: '0 auto',
              borderRadius: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              background: 'linear-gradient(160deg, rgba(255,255,255,0.85), rgba(255,255,255,0.62))',
              backdropFilter: 'blur(48px) saturate(180%)',
              WebkitBackdropFilter: 'blur(48px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.85)',
              boxShadow:
                '0 60px 120px -50px rgba(106,92,245,0.32),' +
                '0 30px 60px -30px rgba(103,232,249,0.18),' +
                '0 12px 30px -14px rgba(17,19,24,0.12),' +
                'inset 0 1.5px 1px -1px rgba(255,255,255,1),' +
                'inset 1.5px 0 0 rgba(255,90,180,0.10),' +
                'inset -1.5px 0 0 rgba(90,220,255,0.10)',
            }}
          >
            {/* Brand header */}
            <Box sx={{ textAlign: 'center', mb: 3.5 }}>
              <Avatar
                sx={{
                  width: 68,
                  height: 68,
                  mx: 'auto',
                  mb: 2.5,
                  borderRadius: '20px',
                  background: `linear-gradient(135deg, ${COLOR}, ${COLOR_2} 45%, ${COLOR_3} 100%)`,
                  boxShadow: `0 16px 34px -10px ${COLOR}8c`,
                  transform: 'rotate(-3deg)',
                }}
              >
                <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
                  <path d="M32 8 L52 20 L52 44 L32 56 L12 44 L12 20 Z" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinejoin="round" />
                  <g stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 17 L22 47" />
                    <path d="M23 32 L43 17" />
                    <path d="M23 32 L43 47" />
                  </g>
                </svg>
              </Avatar>
              <Typography variant="caption" sx={{ display: 'block', color: MUTED, fontWeight: 600, letterSpacing: 3, mb: 1, fontSize: 11 }}>
                سامانه سازمانی
              </Typography>
              <Typography
                variant="h5"
                component="h1"
                fontWeight={800}
                letterSpacing="-1px"
                sx={{ color: INK, mb: 1 }}
              >
                سامانه{' '}
                <Box component="span" sx={{
                  background: `linear-gradient(120deg, ${COLOR}, ${COLOR_2} 40%, ${COLOR_3} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 900,
                }}>
                  کیان
                </Box>
              </Typography>
              <Typography variant="caption" sx={{ color: MUTED, letterSpacing: 2, fontSize: 10.5 }}>
                ENTERPRISE RESOURCE PLATFORM
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', fontSize: 13 }}>{error}</Alert>}

            {/* STEP 1: credentials */}
            {step === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit}>
                <Stack spacing={2.5}>
                  <TextField
                    fullWidth
                    label="نام کاربری"
                    variant="outlined"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoFocus
                    sx={glassField}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><PersonIcon sx={{ color: MUTED, opacity: 0.6, fontSize: 20 }} /></InputAdornment>
                      ),
                    }}
                  />
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

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: MUTED, fontSize: 13, px: 0.5 }}>
                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', background: COLOR, display: 'inline-block' }} />
                    ۲۴ ساعت وارد بمان
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    size="large"
                    variant="contained"
                    disabled={loading}
                    sx={{
                      py: 1.55,
                      borderRadius: '16px',
                      fontWeight: 700,
                      fontSize: 15,
                      color: '#fff',
                      background: `linear-gradient(180deg, #22242e 0%, ${INK} 100%)`,
                      boxShadow: `0 20px 40px -14px rgba(17,19,24,0.5), 0 8px 20px -8px ${COLOR}66`,
                      textTransform: 'none',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        background: `linear-gradient(180deg, #2a2d3a 0%, #171920 100%)`,
                      },
                    }}
                  >
                    {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'ورود به سامانه'}
                  </Button>
                </Stack>
              </form>
            )}

            {/* STEP 2: company */}
            {step === 'company' && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" fontWeight={800} sx={{ color: INK }}>انتخاب شرکت</Typography>
                  <Typography variant="caption" sx={{ color: MUTED }}>شرکت مورد نظر را انتخاب کنید</Typography>
                </Box>
                <Stack spacing={1.25}>
                  {availableCompanies.map((c) => {
                    const isSelected = selectedCompany?.id === c.id;
                    return (
                      <Paper
                        key={c.id}
                        onClick={() => setSelectedCompany(c)}
                        sx={{
                          p: 1.75,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: '16px',
                          background: isSelected ? `linear-gradient(135deg, ${COLOR}22, rgba(255,255,255,0.6))` : 'rgba(255,255,255,0.55)',
                          border: `1px solid ${isSelected ? COLOR : 'rgba(17,19,24,0.08)'}`,
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: COLOR_2, background: `linear-gradient(135deg, ${COLOR}18, rgba(255,255,255,0.6))` },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 42, height: 42, borderRadius: '12px', background: `linear-gradient(135deg, ${COLOR}, ${COLOR_2})`, boxShadow: `0 6px 16px -6px ${COLOR}99` }}>
                            <BusinessIcon sx={{ color: '#fff' }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={700} sx={{ color: INK }}>{c.name}</Typography>
                            {c.code && <Typography variant="caption" sx={{ color: MUTED }}>{c.code}</Typography>}
                          </Box>
                        </Box>
                        {isSelected && <CheckCircleIcon sx={{ color: COLOR }} />}
                      </Paper>
                    );
                  })}
                </Stack>
                <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                  <Button variant="outlined" onClick={handleBack} sx={{ flex: 1, borderRadius: '12px', color: INK, borderColor: 'rgba(17,19,24,0.15)', textTransform: 'none' }}>
                    بازگشت
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCompanySelect}
                    disabled={loading || !selectedCompany}
                    endIcon={<ArrowForwardIcon />}
                    sx={{ flex: 1, fontWeight: 700, borderRadius: '12px', background: `linear-gradient(135deg, ${COLOR}, ${COLOR_2})`, boxShadow: `0 8px 20px -6px ${COLOR}99`, textTransform: 'none' }}
                  >
                    {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'ادامه'}
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* STEP 3: application */}
            {step === 'application' && (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" fontWeight={800} sx={{ color: INK }}>انتخاب ماژول</Typography>
                  <Typography variant="caption" sx={{ color: MUTED }}>یک ماژول را برای ورود انتخاب کنید</Typography>
                </Box>

                {activeApps.length === 0 ? (
                  <Typography variant="body2" sx={{ color: MUTED, textAlign: 'center', py: 2 }}>
                    ماژولی در دسترس نیست.
                  </Typography>
                ) : (
                  <Grid container spacing={1.25}>
                    {activeApps.map((app) => {
                      const isSelected = selectedApp?.id === app.id;
                      return (
                        <Grid item xs={6} key={app.id}>
                          <Paper
                            onClick={() => setSelectedApp(app)}
                            sx={{
                              p: 1.75,
                              height: '100%',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center',
                              gap: 1,
                              borderRadius: '16px',
                              background: isSelected ? `linear-gradient(160deg, ${app.color || COLOR}22, rgba(255,255,255,0.6))` : 'rgba(255,255,255,0.55)',
                              border: `1px solid ${isSelected ? (app.color || COLOR) : 'rgba(17,19,24,0.08)'}`,
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                              transition: 'all 0.2s',
                              '&:hover': { borderColor: app.color || COLOR, background: `${app.color || COLOR}14` },
                            }}
                          >
                            <Avatar sx={{ width: 40, height: 40, borderRadius: '12px', background: app.color || COLOR, boxShadow: `0 6px 16px -6px ${app.color || COLOR}99`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {app.icon ? (
                                <Typography fontSize={18}>{app.icon}</Typography>
                              ) : (
                                <AppsIcon sx={{ color: '#fff' }} />
                              )}
                            </Avatar>
                            <Typography variant="body2" fontWeight={700} sx={{ color: INK, lineHeight: 1.3 }}>{app.title}</Typography>
                            {app.description && (
                              <Typography variant="caption" noWrap sx={{ color: MUTED, display: 'block', maxWidth: '100%' }}>
                                {app.description}
                              </Typography>
                            )}
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}

                {comingSoonApps.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ color: MUTED, display: 'block', mb: 0.5 }}>
                      به‌زودی
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                      {comingSoonApps.map((app) => (
                        <Chip
                          key={app.id}
                          label={app.title}
                          size="small"
                          sx={{ borderRadius: '10px', color: MUTED, bgcolor: 'rgba(17,19,24,0.04)', fontWeight: 600, fontSize: 11 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                  <Button variant="outlined" onClick={handleBack} sx={{ flex: 1, borderRadius: '12px', color: INK, borderColor: 'rgba(17,19,24,0.15)', textTransform: 'none' }}>
                    بازگشت
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleAppSelect}
                    disabled={loading || !selectedApp}
                    endIcon={<ArrowForwardIcon />}
                    sx={{ flex: 1, fontWeight: 700, borderRadius: '12px', background: `linear-gradient(135deg, ${COLOR}, ${COLOR_2})`, boxShadow: `0 8px 20px -6px ${COLOR}99`, textTransform: 'none' }}
                  >
                    {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'ورود'}
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* trust footer */}
            {step === 'credentials' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, color: MUTED, fontSize: 9.5, letterSpacing: 0.4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#059669' }}>
                    <Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                    امن
                  </Box>
                  <span>·</span>
                  <span>رمزنگاری‌شده</span>
                </Box>
                <span>v.26</span>
              </Box>
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