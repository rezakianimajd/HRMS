import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, TextField, Button, Typography, Paper, Alert,
  CircularProgress, InputAdornment, IconButton, Avatar, Stack, Fade, Chip,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AppsIcon from '@mui/icons-material/Apps';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import useAuth from '../core/hooks/useAuth';
import useCompany from '../core/hooks/useCompany';
import { useApplication } from '../core/context/ApplicationContext';
import CompanyEngine from '../core/engines/companyEngine';

const KIAN_MEANINGS = [
  { letter: 'K', fa: 'دانش' },
  { letter: 'I', fa: 'یکپارچگی' },
  { letter: 'A', fa: 'مدیریت' },
  { letter: 'N', fa: 'اتوماسیون' },
];

const R = '5px';

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
        await loadApplications();
        setStep('application');
        return;
      }

      if (companies.length > 1) {
        setAvailableCompanies(companies);
        setSelectedCompany(null);
        setStep('company');
        return;
      }

      await loadApplications();
      setStep('application');
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
      await loadApplications();
      setStep('application');
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
      setStep('company');
      setSelectedApp(null);
    }
    setError('');
  };

  const stepIndex = ['credentials', 'company', 'application'].indexOf(step);

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
        background: 'linear-gradient(-45deg, #0f172a 0%, #312e81 25%, #7c3aed 50%, #0ea5e9 75%, #0f172a 100%)',
        backgroundSize: '400% 400%',
        animation: 'loginGradient 16s ease infinite',
      }}
    >
      <Box sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', filter: 'blur(100px)', background: 'rgba(99,102,241,0.35)', top: '-8%', left: '-6%', animation: 'floatOrb 10s ease-in-out infinite' }} />
      <Box sx={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', filter: 'blur(90px)', background: 'rgba(236,72,153,0.3)', bottom: '-6%', right: '-4%', animation: 'floatOrb 12s ease-in-out infinite reverse' }} />
      <Box sx={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', filter: 'blur(90px)', background: 'rgba(14,165,233,0.3)', bottom: '20%', left: '30%', animation: 'floatOrb 14s ease-in-out infinite' }} />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={700}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: R,
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 30px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Brand header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1.5 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: R,
                    background: 'linear-gradient(135deg, #818cf8, #ec4899)',
                    boxShadow: '0 10px 30px rgba(129,140,248,0.5)',
                  }}
                >
                  <GroupsIcon sx={{ fontSize: 34, color: '#fff' }} />
                </Avatar>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="h4"
                    component="h1"
                    fontWeight={900}
                    sx={{
                      background: 'linear-gradient(90deg, #e0e7ff, #fbcfe8, #bae6fd)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      lineHeight: 1.2,
                    }}
                  >
                    کیان
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    پلتفرم یکپارچه مدیریت و عملیات سازمانی
                  </Typography>
                </Box>
              </Box>

              {/* KIAN acronym in Persian */}
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                {KIAN_MEANINGS.map((l) => (
                  <Chip
                    key={l.letter}
                    size="small"
                    label={`${l.letter} · ${l.fa}`}
                    sx={{
                      borderRadius: R,
                      bgcolor: 'rgba(255,255,255,0.08)',
                      color: '#c7d2fe',
                      border: '1px solid rgba(129,140,248,0.3)',
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Step indicator */}
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3 }}>
              {['ورود', 'شرکت', 'ماژول'].map((label, i) => (
                <Chip
                  key={label}
                  size="small"
                  label={`${i + 1} · ${label}`}
                  icon={i < stepIndex ? <CheckCircleIcon /> : i === stepIndex ? <AutoAwesomeIcon /> : undefined}
                  sx={{
                    borderRadius: R,
                    bgcolor: i === stepIndex ? 'rgba(129,140,248,0.25)' : 'rgba(255,255,255,0.06)',
                    color: i <= stepIndex ? '#e0e7ff' : 'rgba(255,255,255,0.4)',
                    border: i === stepIndex ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              ))}
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: R }}>{error}</Alert>}

            {/* STEP 1: credentials */}
            {step === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit}>
                <Stack spacing={2}>
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
                        <InputAdornment position="start"><PersonIcon sx={{ color: 'rgba(255,255,255,0.5)' }} /></InputAdornment>
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
                        <InputAdornment position="start"><LockIcon sx={{ color: 'rgba(255,255,255,0.5)' }} /></InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
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
                      py: 1.4,
                      borderRadius: R,
                      fontWeight: 700,
                      background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                      boxShadow: '0 10px 25px rgba(99,102,241,0.4)',
                      '&:hover': { background: 'linear-gradient(90deg, #4f46e5, #9333ea)' },
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'ورود'}
                  </Button>
                </Stack>
              </form>
            )}

            {/* STEP 2: company */}
            {step === 'company' && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  شما به چند شرکت دسترسی دارید. شرکت مورد نظر را انتخاب کنید:
                </Typography>
                <Stack spacing={1.5}>
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
                          borderRadius: R,
                          background: isSelected ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isSelected ? 'rgba(129,140,248,0.8)' : 'rgba(255,255,255,0.14)'}`,
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: 'rgba(129,140,248,0.6)', background: 'rgba(99,102,241,0.14)' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 40, height: 40, borderRadius: R, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <BusinessIcon sx={{ color: '#c7d2fe' }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={700} sx={{ color: '#fff' }}>{c.name}</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>{c.code}</Typography>
                          </Box>
                        </Box>
                        {isSelected && <CheckCircleIcon sx={{ color: '#818cf8' }} />}
                      </Paper>
                    );
                  })}
                </Stack>
                <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                  <Button variant="outlined" onClick={handleBack} sx={{ flex: 1, borderRadius: R, color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                    بازگشت
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCompanySelect}
                    disabled={loading || !selectedCompany}
                    endIcon={<ArrowForwardIcon />}
                    sx={{ flex: 1, fontWeight: 700, borderRadius: R, background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'ادامه'}
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* STEP 3: application */}
            {step === 'application' && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  برای ورود، یک ماژول انتخاب کنید:
                </Typography>

                {activeApps.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 2 }}>
                    ماژولی در دسترس نیست. با مدیر سیستم تماس بگیرید.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {activeApps.map((app) => {
                      const isSelected = selectedApp?.id === app.id;
                      return (
                        <Paper
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          sx={{
                            p: 1.75,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            borderRadius: R,
                            background: isSelected
                              ? `linear-gradient(135deg, ${app.color}33, rgba(255,255,255,0.08))`
                              : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isSelected ? app.color : 'rgba(255,255,255,0.14)'}`,
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: app.color, background: `${app.color}22` },
                          }}
                        >
                          <Avatar sx={{ width: 40, height: 40, borderRadius: R, background: app.color, boxShadow: `0 4px 14px ${app.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {app.icon ? (
                              <Typography fontSize={18}>{app.icon}</Typography>
                            ) : (
                              <AppsIcon sx={{ color: '#fff' }} />
                            )}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body1" fontWeight={700} sx={{ color: '#fff' }}>{app.title}</Typography>
                            <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.55)', display: 'block' }}>
                              {app.description}
                            </Typography>
                          </Box>
                          {isSelected && <CheckCircleIcon sx={{ color: app.color }} />}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}

                {comingSoonApps.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mb: 0.5, display: 'block' }}>
                      در حال بهسازی — به‌زودی
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                      {comingSoonApps.map((app) => (
                        <Chip
                          key={app.id}
                          size="small"
                          avatar={<Avatar sx={{ width: 18, height: 18, borderRadius: R, background: app.color, fontSize: 10 }}>{app.icon}</Avatar>}
                          label={app.title}
                          sx={{ borderRadius: R, bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                  <Button variant="outlined" onClick={handleBack} sx={{ flex: 1, borderRadius: R, color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                    بازگشت
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleAppSelect}
                    disabled={loading || !selectedApp}
                    endIcon={<ArrowForwardIcon />}
                    sx={{ flex: 1, fontWeight: 700, borderRadius: R, background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'ورود به ماژول'}
                  </Button>
                </Stack>
              </Stack>
            )}

            <Typography
              variant="caption"
              align="center"
              display="block"
              sx={{ mt: 3, color: 'rgba(255,255,255,0.4)' }}
            >
              پلتفرم کسب‌وکار سازمانی کیان · نسخهٔ ۲
            </Typography>
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
    borderRadius: R,
    color: '#fff',
    background: 'rgba(255,255,255,0.04)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
    '&.Mui-focused fieldset': { borderColor: '#818cf8' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#c7d2fe' },
};

export default Login;