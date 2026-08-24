import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, TextField, Button, Typography, Paper, Alert,
  CircularProgress, InputAdornment, IconButton, FormControl, InputLabel,
  Select, MenuItem
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import useAuth from '../core/hooks/useAuth';
import useCompany from '../core/hooks/useCompany';
import CompanyEngine from '../core/engines/companyEngine';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { companies, setCurrentCompany } = useCompany();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError(t('validation.required'));
      return;
    }

    setLoading(true);
    try {
      const data = await login(
        username,
        password,
        companyId || null
      );

      if (data.company) {
        CompanyEngine.setStoredCompany(data.company);
        setCurrentCompany(data.company);
        navigate('/dashboard');
      } else if (data.user.companies && data.user.companies.length === 1) {
        // Auto-select if user has only one company
        const singleCompany = data.user.companies[0];
        CompanyEngine.setStoredCompany(singleCompany);
        setCurrentCompany(singleCompany);
        navigate('/dashboard');
      } else if (data.user.companies && data.user.companies.length > 1) {
        // Multiple companies — let user pick
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const message = err.response?.data?.error || t('auth.loginError');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={8} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" component="h1" gutterBottom>
              {t('app.name')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t('auth.welcomeBack')}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('auth.username')}
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                ),
              }}
              disabled={loading}
              autoFocus
            />

            <TextField
              fullWidth
              label={t('auth.password')}
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              disabled={loading}
            />

            {companies.length > 0 && (
              <FormControl fullWidth margin="normal">
                <InputLabel>{t('auth.selectCompany')}</InputLabel>
                <Select
                  value={companyId}
                  label={t('auth.selectCompany')}
                  onChange={(e) => setCompanyId(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <BusinessIcon />
                    </InputAdornment>
                  }
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>{t('common.none')}</em>
                  </MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name} ({company.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                t('auth.loginButton')
              )}
            </Button>
          </form>

          <Typography variant="caption" color="textSecondary" align="center" display="block">
            {t('app.shortName')} v0.1.0
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;