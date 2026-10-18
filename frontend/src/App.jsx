import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './core/context/AuthContext';
import { CompanyProvider } from './core/context/CompanyContext';
import { ApplicationProvider } from './core/context/ApplicationContext';
import { LanguageProvider } from './core/context/LanguageContext';
import { ThemeProvider as AppThemeProvider, useThemeMode } from './core/context/ThemeContext';
import { WorkspaceTabsProvider } from './core/context/WorkspaceTabsContext';
import useLanguage from './core/hooks/useLanguage';
import AppRoutes from './AppRoutes';
import GummyBearOverlay from './core/components/ui/GummyBearOverlay';
import HelpDialog from './core/components/ui/HelpDialog';
import GlobalErrorSnackbar from './core/components/ui/GlobalErrorSnackbar';
import SystemBroadcastGate from './core/components/ui/SystemBroadcastGate';
import ErrorBoundary from './core/components/ui/ErrorBoundary';
import { FONT_FAMILY } from './core/theme/tokens';
import './core/engines/languageEngine';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 60 * 1000,
    },
  },
});

/**
 * سطح‌های روشن و یک‌دست برنامه: همهٔ Paper/Cardها سفید، بدون گرادیان و بلور.
 * در تم‌های تاریک از این مجموعه استفاده نمی‌شود.
 */
const WHITE_SURFACES = {
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundColor: '#ffffff',
        backgroundImage: 'none',
        border: '1px solid rgba(15,23,42,0.06)',
        borderRadius: '16px',
        boxShadow: '0 3px 14px rgba(15,23,42,0.04)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        '&.MuiAlert-root, &.MuiSnackbarContent-root': {
          border: 'none',
          boxShadow: 'none',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundColor: '#ffffff',
        backgroundImage: 'none',
        border: '1px solid rgba(15,23,42,0.07)',
        borderRadius: '16px',
        boxShadow: '0 4px 18px rgba(15,23,42,0.05)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'none',
          boxShadow: '0 10px 28px rgba(15,23,42,0.08)',
        },
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        background: '#ffffff !important',
        borderLeft: '1px solid rgba(15,23,42,0.06)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          background: '#ffffff',
          border: '1px solid rgba(15,23,42,0.1)',
          '&:hover': { background: '#ffffff' },
          '&.Mui-focused': {
            background: '#ffffff',
            boxShadow: '0 0 0 3px rgba(99,102,241,0.12)',
          },
        },
      },
    },
  },
};

/**
 * پایهٔ سراسری تایپوگرافی + سفیدسازی اجباری Paperهایی که inline gradient دارند.
 */
const cssBase = (bodyBg, whiteCards = false) => ({
  styleOverrides: {
    body: {
      background: bodyBg,
      backgroundAttachment: 'fixed',
      fontFamily: FONT_FAMILY,
    },
    'button, input, select, textarea': { fontFamily: 'inherit' },
    ...(whiteCards
      ? {
        '.MuiPaper-root:not(.MuiAlert-root):not(.MuiSnackbarContent-root)': {
          backgroundColor: '#ffffff !important',
          backgroundImage: 'none !important',
          backdropFilter: 'none !important',
          WebkitBackdropFilter: 'none !important',
        },
      }
      : {}),
  },
});

const getPalettes = (mode, neonColor) => {
  if (mode === 'dark') {
    return {
      mode: 'dark',
      primary: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1' },
      secondary: { main: '#f472b6', light: '#f9a8d4', dark: '#ec4899' },
      success: { main: '#34d399' },
      warning: { main: '#fbbf24' },
      error: { main: '#f87171' },
      background: { default: '#0f172a', paper: 'rgba(30,41,59,0.75)' },
      text: { primary: '#e2e8f0', secondary: '#94a3b8' },
    };
  }
  if (mode === 'fmode') {
    return {
      mode: 'dark',
      primary: { main: neonColor, light: neonColor, dark: neonColor },
      secondary: { main: '#00ffff', light: '#66ffff', dark: '#00cccc' },
      success: { main: neonColor },
      warning: { main: '#ffff00' },
      error: { main: '#ff073a' },
      background: { default: '#050505', paper: 'rgba(15,15,15,0.85)' },
      text: { primary: neonColor, secondary: '#a3a3a3' },
    };
  }
  if (mode === 'fmode_light') {
    return {
      mode: 'light',
      primary: { main: '#00c853', light: '#69f0ae', dark: '#00a844' },
      secondary: { main: '#00bfa5', light: '#64ffda', dark: '#009688' },
      success: { main: '#00c853' },
      warning: { main: '#ff9800' },
      error: { main: '#ff1744' },
      background: { default: '#f1fdf7', paper: '#ffffff' },
      text: { primary: '#0d3b22', secondary: '#4b6b59' },
    };
  }
  if (mode === 'kurosawa') {
    return {
      mode: 'light',
      primary: { main: '#111827', light: '#374151', dark: '#000000' },
      secondary: { main: '#4b5563', light: '#6b7280', dark: '#1f2937' },
      success: { main: '#111827' },
      warning: { main: '#4b5563' },
      error: { main: '#000000' },
      background: { default: '#f3f4f6', paper: '#ffffff' },
      text: { primary: '#111111', secondary: '#6b7280' },
    };
  }
  return {
    mode: 'light',
    primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
    secondary: { main: '#ec4899', light: '#f472b6', dark: '#db2777' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#64748b' },
  };
};

const getComponents = (mode, neonColor) => {
  const isDark = mode === 'dark';
  const isF = mode === 'fmode';
  const bodyBg = isF
    ? 'linear-gradient(135deg, #050505 0%, #0d0d0d 50%, #050505 100%)'
    : isDark
      ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
      : 'linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f8fafc 100%)';

  if (isF) {
    return {
      MuiCssBaseline: cssBase(bodyBg),
      MuiPaper: {
        styleOverrides: { root: { background: 'rgba(5,5,5,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${neonColor}4d`, boxShadow: `0 0 24px ${neonColor}1f`, borderRadius: '10px' } },
      },
      MuiCard: {
        styleOverrides: { root: { background: 'rgba(5,5,5,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${neonColor}40`, borderRadius: '10px', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 0 32px ${neonColor}30` } } },
      },
      MuiDrawer: { styleOverrides: { paper: { background: 'rgba(5,5,5,0.85) !important', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderLeft: `1px solid ${neonColor}33` } } },
      MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: '10px', background: 'rgba(0,255,255,0.03)', border: `1px solid ${neonColor}33`, '&:hover': { border: `1px solid ${neonColor}66` }, '&.Mui-focused': { boxShadow: `0 0 12px ${neonColor}4d` } } } } },
      MuiTab: { styleOverrides: { root: { color: '#e0e0e0', '&.Mui-selected': { color: neonColor, fontWeight: 700 } } } },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: neonColor } } },
    };
  }

  if (mode === 'kurosawa') {
    return {
      MuiCssBaseline: cssBase('linear-gradient(135deg, #e5e7eb 0%, #f9fafb 50%, #d1d5db 100%)', true),
      MuiTab: { styleOverrides: { root: { color: '#6b7280', '&.Mui-selected': { color: '#000000', fontWeight: 700 } } } },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: '#000000' } } },
      ...WHITE_SURFACES,
    };
  }

  if (isDark) {
    return {
      MuiCssBaseline: cssBase(bodyBg),
      MuiPaper: { styleOverrides: { root: { background: 'rgba(30,41,59,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', borderRadius: '10px' } } },
      MuiCard: { styleOverrides: { root: { background: 'rgba(30,41,59,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '10px', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' } } } },
      MuiDrawer: { styleOverrides: { paper: { background: 'rgba(15,23,42,0.85) !important', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(148,163,184,0.08)' } } },
      MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: '10px', background: 'rgba(15,23,42,0.5)', '&:hover': { background: 'rgba(15,23,42,0.8)' }, '&.Mui-focused': { background: 'rgba(15,23,42,0.9)', boxShadow: '0 0 0 3px rgba(99,102,241,0.15)' } } } } },
      MuiTab: { styleOverrides: { root: { color: '#cbd5e1', '&.Mui-selected': { color: '#ffffff', fontWeight: 700 } } } },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: '#818cf8' } } },
    };
  }

  return {
    MuiCssBaseline: cssBase(bodyBg, true),
    ...WHITE_SURFACES,
  };
};

const ThemedApp = () => {
  const { direction } = useLanguage();
  const { mode, neonColor } = useThemeMode();

  React.useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = 'fa';
  }, [direction]);

  React.useEffect(() => {
    const root = document.getElementById('root');
    if (root) root.style.filter = mode === 'kurosawa' ? 'grayscale(1)' : 'none';
    document.body.classList.toggle('fmode-light-candy', mode === 'fmode_light');
  }, [mode]);

  const palettes = getPalettes(mode, neonColor);
  const components = getComponents(mode, neonColor);

  const theme = createTheme({
    direction,
    palette: palettes,
    typography: {
      fontFamily: FONT_FAMILY,
      h4: { fontWeight: 800, letterSpacing: '-0.5px' },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      body1: { fontWeight: 400 },
      body2: { fontWeight: 400 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 1 },
    components: {
      ...components,
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', fontWeight: 600, borderRadius: '10px', padding: '8px 20px', transition: 'all 0.2s ease',
            '& .MuiButton-startIcon, & .MuiButton-endIcon': { display: 'none' },
          },
          contained: {
            ...(mode === 'fmode'
              ? { background: `linear-gradient(135deg, ${neonColor}, #00ffff)`, color: '#000', '&:hover': { background: `linear-gradient(135deg, ${neonColor}, #00cccc)` } }
              : mode === 'kurosawa'
                ? { background: 'linear-gradient(135deg, #111827, #4b5563)', color: '#fff', '&:hover': { background: 'linear-gradient(135deg, #000000, #374151)' } }
                : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } }),
          },
          text: { border: '1px solid currentColor', '&:hover': { border: '1px solid currentColor', background: 'rgba(99,102,241,0.06)' } },
        },
      },
      MuiInputBase: { styleOverrides: { input: { textAlign: 'right' } } },
      MuiSelect: { styleOverrides: { select: { textAlign: 'right' } } },
      MuiChip: { styleOverrides: { root: { borderRadius: '10px', fontWeight: 500 } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: '10px', margin: '2px 8px', transition: 'all 0.2s ease',
            '&.Mui-selected': { background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))', '&:hover': { background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' } },
            '&:hover': { background: 'rgba(99,102,241,0.06)' },
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <GummyBearOverlay />
        <HelpDialog />
        <GlobalErrorSnackbar />
        <SystemBroadcastGate />
        <AppRoutes />
      </ErrorBoundary>
    </ThemeProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppThemeProvider>
          <AuthProvider>
            <CompanyProvider>
              <ApplicationProvider>
                <LanguageProvider>
                  <WorkspaceTabsProvider>
                    <ThemedApp />
                  </WorkspaceTabsProvider>
                </LanguageProvider>
              </ApplicationProvider>
            </CompanyProvider>
          </AuthProvider>
        </AppThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;