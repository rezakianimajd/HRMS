/**
 * انتخاب ماژول پس از ورود — همان زبان بصری صفحهٔ ورود:
 * پس‌زمینهٔ تصویری (با پوشش/بلور از تنظیمات ظاهر ورود) + کارت وسط‌چین.
 *
 * قابلیت‌ها بدون تغییر: سلام/نام کاربر، هویت شرکت، کارت ماژول‌های مجاز،
 * حالت بارگذاری هر ماژول، خطا و دکمهٔ بازگشت.
 */
import React from 'react';
import {
  Alert, Avatar, Box, Button, ButtonBase, CircularProgress, Paper, Stack, Typography, alpha,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CompanyLogo, { companyLabel } from './CompanyLogo';
import { getModuleIcon } from '../../constants/moduleIcons';
import { MODULE_DEFAULT_ACCENTS, useModulePalette } from '../../context/ModulePaletteContext';
import {
  LOGIN_PANEL_DEFAULT_BACKGROUND, loginOverlayGradient, resolveLoginBranding,
} from '../../utils/colorUtils';

const INK = '#0f172a';
const MUTED = '#64748b';
const BORDER = 'rgba(15,23,42,0.10)';

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

const CompanyIdentity = ({ company }) => {
  const label = companyLabel(company) || 'شرکت شما';
  return (
    <Stack direction="row" alignItems="center" spacing={0.9} sx={{ minWidth: 0 }}>
      <CompanyLogo company={company} size={34} radius="10px" sx={{ bgcolor: '#f8fafc' }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
          {label}
        </Typography>
        {company?.code ? (
          <Typography sx={{ fontSize: 10.5, color: '#94a3b8', direction: 'ltr', textAlign: 'right' }}>
            {company.code}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
};


const ModuleCard = ({ app, accent, busy, disabled, active, onPick }) => {
  const Icon = getModuleIcon(app.slug);
  return (
    <ButtonBase
      onClick={() => onPick(app)}
      disabled={disabled || busy}
      focusRipple
      aria-current={active ? 'true' : undefined}
      sx={{
        width: '100%', p: 1.35, borderRadius: '16px', textAlign: 'right',
        border: `${active ? 2 : 1}px solid ${active ? accent : alpha(accent, 0.28)}`,
        bgcolor: active ? alpha(accent, 0.05) : '#fff',
        transition: 'border-color .16s ease, box-shadow .16s ease, transform .16s ease',
        '&:hover': {
          borderColor: alpha(accent, 0.6), transform: 'translateY(-2px)',
          boxShadow: `0 16px 30px -22px ${alpha(accent, 0.9)}`,
        },
        '&:focus-visible': { outline: `2px solid ${alpha(accent, 0.55)}`, outlineOffset: 2 },
        '&.Mui-disabled': { opacity: 0.55 },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.1} sx={{ width: '100%', minWidth: 0 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '12px', flexShrink: 0,
          display: 'grid', placeItems: 'center',
          bgcolor: alpha(accent, 0.1), color: accent,
        }}>
          {busy ? <CircularProgress size={17} sx={{ color: accent }} /> : <Icon sx={{ fontSize: 19 }} />}
        </Box>
        <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 900, color: INK }}>
          {app.title}
        </Typography>
        <ChevronLeftIcon sx={{ fontSize: 17, color: alpha(accent, 0.75), flexShrink: 0 }} />
      </Stack>
    </ButtonBase>
  );
};

const ModuleSelectionCard = ({
  applications = [], currentApp = null, user = null, company = null,
  loadingAppId = null, loading = false, error = '', onPick, onBack, backLabel = 'بازگشت',
}) => {
  const { getPalette } = useModulePalette();
  const greeting = greetingForHour();
  const fullName = fullNameOf(user);
  const activeApps = applications.filter((app) => !app.is_coming_soon && app.accessible);

  const accentOf = (app) => {
    const palette = typeof getPalette === 'function' ? getPalette(app.slug) : null;
    return palette?.accent || MODULE_DEFAULT_ACCENTS[app.slug] || '#6366f1';
  };

  return (
    <Paper elevation={0} data-testid="module-selection-card" sx={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 960,
        borderRadius: '24px', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.18)', bgcolor: '#fff',
        boxShadow: '0 44px 94px -44px rgba(2,6,23,0.78)',
      }}>
        {/* هدر: سلام و نام کاربر، هویت شرکت و بازگشت */}
        <Box sx={{
          px: { xs: 2, md: 2.75 }, py: 1.75,
          display: 'flex', alignItems: 'center', gap: 1.4, flexWrap: 'wrap',
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <Avatar sx={{
            width: 40, height: 40, fontSize: 13, fontWeight: 900,
            bgcolor: alpha('#4f46e5', 0.1), color: '#4f46e5',
          }}>
            {initialsOf(user)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 900, color: INK }}>
              {`${greeting}، ${fullName}`}
            </Typography>
            <Typography noWrap sx={{ fontSize: 11, color: MUTED }}>
              به سامانه یکپارچه مدیریت کسب و کار کیان خوش آمدید
            </Typography>
          </Box>
          <CompanyIdentity company={company} />
          {onBack ? (
            <Button size="small" variant="outlined" startIcon={<ArrowForwardIcon />}
              onClick={onBack}
              sx={{ fontSize: 11.5, fontWeight: 800, borderRadius: '10px', textTransform: 'none' }}>
              {backLabel}
            </Button>
          ) : null}
        </Box>

        {error ? (
          <Alert severity="error" sx={{
            mx: { xs: 2, md: 2.75 }, mt: 1.5, borderRadius: '12px', fontSize: 12,
          }}>
            {error}
          </Alert>
        ) : null}

        <Box sx={{ p: { xs: 2, md: 2.75 } }}>
          {activeApps.length ? (
            <>
              <Typography sx={{ mb: 1.4, fontSize: 12, fontWeight: 800, color: MUTED }}>
                انتخاب ماژول
              </Typography>
              <Box sx={{
                display: 'grid', gap: 1.25,
                gridTemplateColumns: {
                  xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))',
                },
              }}>
                {activeApps.map((app) => (
                  <ModuleCard
                    key={app.id || app.slug}
                    app={app}
                    accent={accentOf(app)}
                    active={currentApp?.slug === app.slug}
                    busy={loadingAppId === app.id}
                    disabled={loading && loadingAppId !== app.id}
                    onPick={onPick}
                  />
                ))}
              </Box>
            </>
          ) : loading ? (
            <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={22} /></Stack>
          ) : (
            <Typography sx={{ py: 4, textAlign: 'center', fontSize: 12, color: MUTED }}>
              ماژولی برای این کاربر فعال نیست.
            </Typography>
          )}
        </Box>
    </Paper>
  );
};

/**
 * صفحهٔ انتخاب ماژول: پس‌زمینهٔ برند + کارت وسط‌چین.
 * برای ترنزیشن چرخشی داخل صفحهٔ ورود، فقط `ModuleSelectionCard` لازم است.
 */
const ModuleSelection = (props) => {
  const theme = resolveLoginBranding(props.company?.login_branding);
  const hasImage = theme.backgroundKind === 'image' && Boolean(theme.backgroundUrl);
  const hasGradient = theme.useGradient;
  return (
    <Box data-testid="module-selection" sx={{
      position: 'relative', minHeight: '100vh', display: 'grid', placeItems: 'center',
      px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 5 }, overflow: 'hidden',
      background: hasGradient ? theme.gradientCss
        : (hasImage ? theme.overlay : LOGIN_PANEL_DEFAULT_BACKGROUND),
    }}>
      {hasGradient ? (
        <Box aria-hidden data-testid="module-branding-gradient"
          data-gradient-preset={theme.gradient.preset}
          sx={{ position: 'absolute', inset: 0, background: theme.gradientCss }} />
      ) : null}
      {hasImage ? (
        <>
          <Box aria-hidden data-testid="module-branding-image" data-background-url={theme.backgroundUrl}
            sx={{
              position: 'absolute', inset: 0,
              backgroundImage: `url("${theme.backgroundUrl}")`,
              backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
              filter: theme.blur ? `blur(${theme.blur}px)` : 'none',
              transform: theme.blur ? 'scale(1.08)' : 'none',
            }} />
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: loginOverlayGradient(theme) }} />
        </>
      ) : null}

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'grid', placeItems: 'center' }}>
        <ModuleSelectionCard {...props} />
      </Box>
    </Box>
  );
};

export { ModuleSelectionCard };
export default ModuleSelection;

