import React from 'react';
import {
  Alert, Avatar, Box, Button, ButtonBase, Chip, CircularProgress, Container,
  Divider, Stack, Typography, alpha,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CompanyLogo, { companyLabel } from './CompanyLogo';
import { getModuleIcon } from '../../constants/moduleIcons';
import { MODULE_DEFAULT_ACCENTS, useModulePalette } from '../../context/ModulePaletteContext';
import { toPersianDigits } from '../../utils/numberUtils';

export const greetingForHour = (hour = new Date().getHours()) => {
  if (hour >= 5 && hour < 11) return 'صبح بخیر';
  if (hour >= 11 && hour < 15) return 'ظهر بخیر';
  if (hour >= 15 && hour < 20) return 'عصر بخیر';
  return 'شب بخیر';
};

const fullNameOf = (user) => {
  const composed = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return composed || user?.full_name || user?.username || 'کاربر گرامی';
};

const initialsOf = (user) => (
  `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}` || user?.username?.[0] || 'ک'
);

const BrandMark = ({ size = 38 }) => (
  <Box sx={{
    width: size, height: size, borderRadius: '11px', flexShrink: 0,
    bgcolor: '#0f172a', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: Math.max(12, size * 0.42), fontWeight: 900, letterSpacing: '-0.06em',
    boxShadow: '0 8px 20px -12px rgba(15,23,42,0.65)',
  }}>K</Box>
);

const CompanyIdentity = ({ company, compact = false }) => {
  const label = companyLabel(company) || 'شرکت شما';
  return (
    <Stack direction="row" alignItems="center" spacing={0.9} sx={{ minWidth: 0 }}>
      <CompanyLogo company={company} size={compact ? 34 : 40} radius="10px" />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: compact ? 10.5 : 11.5, fontWeight: 800, color: '#0f172a' }}>
          {label}
        </Typography>
        {company?.code ? (
          <Typography sx={{ fontSize: 12, color: '#94a3b8', direction: 'ltr', textAlign: 'right' }}>
            {company.code}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
};

const ModuleSelection = ({
  applications = [], currentApp = null, user = null, company = null,
  loadingAppId = null, loading = false, error = '', onPick, onBack, backLabel = 'بازگشت',
}) => {
  const { getPalette } = useModulePalette();
  const greeting = greetingForHour();
  const fullName = fullNameOf(user);
  const activeApps = applications.filter((app) => !app.is_coming_soon && app.accessible);
  const count = applications.length;

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'radial-gradient(1200px 540px at 92% -12%, rgba(99,102,241,0.10), transparent 62%), #f6f8fc',
      pb: 5,
    }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ py: { xs: 2, md: 2.5 } }}
        >
          <Stack direction="row" alignItems="center" spacing={1.1}>
            <BrandMark />
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
                کیان
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94a3b8', letterSpacing: '0.08em', fontWeight: 700 }}>
                KIAN BUSINESS SUITE
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1.1} flexWrap="wrap" useFlexGap>
            {company ? <CompanyIdentity company={company} compact /> : null}
            {company ? <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} /> : null}
            <Stack direction="row" alignItems="center" spacing={0.7} sx={{ minWidth: 0 }}>
              <Avatar sx={{
                width: 30, height: 30, fontSize: 12, fontWeight: 900,
                bgcolor: '#eef2ff', color: '#4f46e5',
              }}>
                {initialsOf(user)}
              </Avatar>
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: '#334155', maxWidth: 150 }}>
                {fullName}
              </Typography>
            </Stack>
            {onBack ? (
              <Button size="small" variant="outlined" startIcon={<ArrowForwardIcon />} onClick={onBack}
                sx={{
                  height: 32, px: 1.2, fontSize: 12, fontWeight: 800, color: '#475569',
                  borderColor: 'rgba(15,23,42,0.12)', borderRadius: '9px',
                  '&:hover': { borderColor: 'rgba(15,23,42,0.28)', bgcolor: '#fff' },
                }}>
                {backLabel}
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Box sx={{ pt: { xs: 2, md: 4 }, pb: { xs: 2.5, md: 3.5 } }}>
          <Chip
            label={`${greeting} · ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`}
            sx={{
              mb: 1.4, height: 25, fontSize: 12, fontWeight: 800,
              bgcolor: 'rgba(15,23,42,0.05)', color: '#475569',
            }}
          />
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 24, sm: 31, md: 38 },
              fontWeight: 900,
              lineHeight: 1.35,
              letterSpacing: '-0.035em',
              color: '#0f172a',
            }}
          >
            {greeting}، {fullName}
          </Typography>
          <Typography sx={{
            mt: 0.7, fontSize: { xs: 11.5, md: 13 }, color: '#64748b', lineHeight: 1.9,
          }}>
            به سامانه یکپارچه مدیریت کسب و کار کیان خوش آمدید.
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.4 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>
            انتخاب ماژول
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
            {toPersianDigits(activeApps.length)} ماژول فعال از {toPersianDigits(count)}
          </Typography>
        </Stack>

        {error ? <Alert severity="error" sx={{ mb: 1.5, borderRadius: '12px', fontSize: 12 }}>{error}</Alert> : null}


        {loading ? (
          <Box sx={{ py: 9, textAlign: 'center' }}>
            <CircularProgress size={28} sx={{ color: '#4f46e5' }} />
            <Typography sx={{ mt: 1.5, fontSize: 12, color: '#64748b' }}>در حال دریافت ماژول‌ها…</Typography>
          </Box>
        ) : !count ? (
          <Box sx={{
            py: 8, textAlign: 'center', bgcolor: '#fff', borderRadius: '16px',
            border: '1px solid rgba(15,23,42,0.07)',
          }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>
              ماژولی در دسترس نیست
            </Typography>
            <Typography sx={{ mt: 0.4, fontSize: 12, color: '#94a3b8' }}>
              دسترسی‌های کاربری خود را بررسی کنید.
            </Typography>
          </Box>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: { xs: 1, sm: 1.25, md: 1.5 },
          }}>
            {applications.map((app) => {
              const Icon = getModuleIcon(app.slug);
              const accent = getPalette(app.slug)?.accent || MODULE_DEFAULT_ACCENTS[app.slug] || app.color || '#4f46e5';
              const disabled = Boolean(app.is_coming_soon || !app.accessible);
              const active = currentApp?.id === app.id;
              const loading = loadingAppId === app.id;

              return (
                <ButtonBase
                  key={app.id}
                  disabled={disabled || Boolean(loadingAppId)}
                  onClick={() => !disabled && onPick?.(app)}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    minHeight: { xs: 139, md: 158 },
                    p: { xs: 1.3, md: 1.6 },
                    pb: { xs: 1.2, md: 1.35 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    textAlign: 'right',
                    overflow: 'hidden',
                    borderRadius: '17px',
                    border: `1px solid ${alpha(accent, disabled ? 0.07 : 0.17)}`,
                    bgcolor: disabled ? '#f8fafc' : '#fff',
                    background: disabled
                      ? '#f8fafc'
                      : `linear-gradient(150deg, ${alpha(accent, 0.05)}, #ffffff 58%)`,
                    boxShadow: '0 1px 2px rgba(15,23,42,0.025)',
                    opacity: disabled ? 0.52 : 1,
                    filter: disabled ? 'grayscale(0.7)' : 'none',
                    transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease',
                    '&:hover': !disabled ? {
                      transform: 'translateY(-3px)',
                      borderColor: alpha(accent, 0.42),
                      boxShadow: `0 18px 34px -24px ${accent}b3`,
                    } : {},
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      insetInlineStart: 0,
                      bottom: 0,
                      height: 3,
                      width: disabled ? '0%' : '48%',
                      background: `linear-gradient(90deg, ${accent}, ${alpha(accent, 0)})`,
                      opacity: 0.75,
                    },
                    '&.Mui-disabled': { color: 'inherit' },
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Box sx={{
                      width: { xs: 42, md: 48 },
                      height: { xs: 42, md: 48 },
                      borderRadius: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(accent, 0.085),
                      border: `1px solid ${alpha(accent, 0.16)}`,
                      color: accent,
                    }}>
                      {loading
                        ? <CircularProgress size={20} sx={{ color: accent }} />
                        : <Icon sx={{ fontSize: { xs: 23, md: 27 } }} />}
                    </Box>
                    {active ? (
                      <Chip icon={<CheckCircleRoundedIcon />} label="فعال" size="small"
                        sx={{
                          height: 20, fontSize: 12, fontWeight: 800,
                          bgcolor: alpha(accent, 0.08), color: accent,
                          '& .MuiChip-icon': { fontSize: 12, color: accent },
                        }} />
                    ) : null}
                  </Stack>

                  <Box sx={{ flex: 1, minHeight: 10 }} />

                  <Typography sx={{
                    fontSize: { xs: 11.3, md: 12.5 },
                    fontWeight: 900,
                    color: disabled ? '#94a3b8' : '#172033',
                    lineHeight: 1.5,
                  }}>
                    {app.title}
                  </Typography>

                  {(app.is_coming_soon || (!app.accessible && !app.is_coming_soon)) ? (
                    <Chip size="small" label={app.is_coming_soon ? 'به‌زودی' : 'عدم دسترسی'}
                      sx={{
                        mt: 0.7, alignSelf: 'flex-start', height: 19,
                        fontSize: 12, fontWeight: 700, color: '#94a3b8',
                        bgcolor: 'rgba(15,23,42,0.045)',
                      }} />
                  ) : null}
                </ButtonBase>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default ModuleSelection;

