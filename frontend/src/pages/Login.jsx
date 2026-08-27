import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, TextField, Button, Typography, Paper, Alert,
  CircularProgress, InputAdornment, IconButton, Avatar, Stack, Fade,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import useAuth from '../core/hooks/useAuth';
import useCompany from '../core/hooks/useCompany';
import CompanyEngine from '../core/engines/companyEngine';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { setCurrentCompany } = useCompany();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: credentials, Step 2: pick company
  const [step, setStep] = useState('credentials');
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError(t('validation.required'));
      return;
    }

    setLoading(true);
    try {
      // First, login without a company to discover which tenants the user has.
      const data = await login(username, password, null);

      const companies = data.available_companies || data.user?.companies || [];

      if (companies.length === 1) {
        // Only one company — enter it directly.
        const single = companies[0];
        CompanyEngine.setStoredCompany(single);
        setCurrentCompany(single);
        navigate('/dashboard');
        return;
      }

      if (companies.length > 1) {
        // Multiple companies — show selection step.
        setAvailableCompanies(companies);
        setSelectedCompany(null);
        setStep('company');
        return;
      }

      // No companies at all (shouldn't happen for normal users).
      navigate('/dashboard');
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
      // Re-login with the chosen company so the JWT carries the tenant claim.
      const data = await login(username, password, selectedCompany.id);

      CompanyEngine.setStoredCompany(data.company || selectedCompany);
      setCurrentCompany(data.company || selectedCompany);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ورود به شرکت');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setSelectedCompany(null);
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
        // Futuristic 2026 animated gradient
        background: 'linear-gradient(-45deg, #0f172a 0%, #312e81 25%, #7c3aed 50%, #0ea5e9 75%, #0f172a 100%)',
        backgroundSize: '400% 400%',
        animation: 'loginGradient 16s ease infinite',
        '@keyframes loginGradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      }}
    >
      {/* Floating blurred orbs */}
      <Box sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', filter: 'blur(100px)', background: 'rgba(99,102,241,0.35)', top: '-8%', left: '-6%', animation: 'floatOrb 10s ease-in-out infinite' }} />
      <Box sx={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', filter: 'blur(90px)', background: 'rgba(236,72,153,0.3)', bottom: '-6%', right: '-4%', animation: 'floatOrb 12s ease-in-out infinite reverse' }} />
      <Box sx={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', filter: 'blur(90px)', background: 'rgba(14,165,233,0.3)', bottom: '20%', left: '30%', animation: 'floatOrb 14s ease-in-out infinite' }} />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={700}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3.5, sm: 5 },
              borderRadius: 4,
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 30px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Brand header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  mx: 'auto',
                  mb: 2,
                  background: 'linear-gradient(135deg, #818cf8, #ec4899)',
                  boxShadow: '0 10px 30px rgba(129,140,248,0.5)',
                }}
              >
                <GroupsIcon sx={{ fontSize: 38, color: '#fff' }} />
              </Avatar>
              <Typography
                variant="h4"
                component="h1"
                fontWeight={900}
                sx={{
                  background: 'linear-gradient(90deg, #e0e7ff, #fbcfe8, #bae6fd)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('app.name')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', mt: 1 }}>
                {step === 'credentials' ? t('auth.welcomeBack') : 'انتخاب شرکت برای ورود'}
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

            {step === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit}>
                <Stack spacing={2.5}>
                  <TextField
                    fullWidth
                    label={t('auth.username')}
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
                    label={t('auth.password')}
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
                      py: 1.5,
                      borderRadius: 2.5,
                      fontWeight: 700,
                      background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                      boxShadow: '0 10px 25px rgba(99,102,241,0.4)',
                      '&:hover': { background: 'linear-gradient(90deg, #4f46e5, #9333ea)' },
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : t('auth.loginButton')}
                  </Button>
                </Stack>
              </form>
            ) : (
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
                          p: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderRadius: 2.5,
                          background: isSelected ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isSelected ? 'rgba(129,140,248,0.8)' : 'rgba(255,255,255,0.14)'}`,
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: 'rgba(129,140,248,0.6)', background: 'rgba(99,102,241,0.14)' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 44, height: 44, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
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
                  <Button variant="outlined" onClick={handleBack} sx={{ flex: 1, color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                    بازگشت
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCompanySelect}
                    disabled={loading}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      flex: 1,
                      fontWeight: 700,
                      borderRadius: 2,
                      background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                    }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : 'ورود به شرکت'}
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
              {t('app.shortName')} v0.1.0
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
    borderRadius: 2.5,
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