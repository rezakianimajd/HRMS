import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './core/context/AuthContext';
import { CompanyProvider } from './core/context/CompanyContext';
import { LanguageProvider } from './core/context/LanguageContext';
import { ThemeProvider as AppThemeProvider, useThemeMode } from './core/context/ThemeContext';
import useLanguage from './core/hooks/useLanguage';
import AppRoutes from './AppRoutes';
import GummyBearOverlay from './core/components/ui/GummyBearOverlay';
import HelpDialog from './core/components/ui/HelpDialog';
import './core/engines/languageEngine';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  },
});

/* -------------------------------------------------------------------------
 * Palette per theme mode
 * ------------------------------------------------------------------------- */
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
    // F مود روشن: سبز نئونی روی پس‌زمینه روشن
    return {
      mode: 'light',
      primary: { main: '#00c853', light: '#69f0ae', dark: '#00a844' },
      secondary: { main: '#00bfa5', light: '#64ffda', dark: '#009688' },
      success: { main: '#00c853' },
      warning: { main: '#ff9800' },
      error: { main: '#ff1744' },
      background: { default: '#f1fdf7', paper: 'rgba(255,255,255,0.8)' },
      text: { primary: '#0d3b22', secondary: '#4b6b59' },
    };
  }

  if (mode === 'kurosawa') {
    // کوراساوا مود: سیاه‌وسفید — هیچ رنگی، فقط طیف خاکستری
    return {
      mode: 'light',
      primary: { main: '#111827', light: '#374151', dark: '#000000' },
      secondary: { main: '#4b5563', light: '#6b7280', dark: '#1f2937' },
      success: { main: '#111827' },
      warning: { main: '#4b5563' },
      error: { main: '#000000' },
      background: { default: '#f3f4f6', paper: 'rgba(255,255,255,0.82)' },
      text: { primary: '#111111', secondary: '#6b7280' },
    };
  }

  // light (default)
  return {
    mode: 'light',
    primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
    secondary: { main: '#ec4899', light: '#f472b6', dark: '#db2777' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    background: { default: '#f8fafc', paper: 'rgba(255,255,255,0.72)' },
    text: { primary: '#1e293b', secondary: '#64748b' },
  };
};

/* -------------------------------------------------------------------------
 * Component overrides per mode
 * ------------------------------------------------------------------------- */
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
      MuiCssBaseline: { styleOverrides: { body: { background: bodyBg, backgroundAttachment: 'fixed' } } },
      MuiPaper: {
        styleOverrides: {
          root: {
            background: 'rgba(5,5,5,0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${neonColor}4d`,
            boxShadow: `0 0 24px ${neonColor}1f`,
            borderRadius: 16,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: 'rgba(5,5,5,0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${neonColor}40`,
            borderRadius: 16,
            transition: 'all 0.3s ease',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 0 32px ${neonColor}30` },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: 'rgba(5,5,5,0.85) !important',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderLeft: `1px solid ${neonColor}33`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              background: 'rgba(0,255,255,0.03)',
              border: `1px solid ${neonColor}33`,
              '&:hover': { border: `1px solid ${neonColor}66` },
              '&.Mui-focused': { boxShadow: `0 0 12px ${neonColor}4d` },
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: '#e0e0e0',
            '&.Mui-selected': { color: neonColor, fontWeight: 700 },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: neonColor },
        },
      },
    };
  }

  if (mode === 'kurosawa') {
    // کوراساوا مود: مونوکروم (سیاه/سفید/خاکستری) — بدون هیچ رنگ
    return {
      MuiCssBaseline: {
        styleOverrides: {
          body: { background: 'linear-gradient(135deg, #e5e7eb 0%, #f9fafb 50%, #d1d5db 100%)', backgroundAttachment: 'fixed' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            borderRadius: 16,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 16,
            transition: 'all 0.3s ease',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: 'rgba(255,255,255,0.85) !important',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(0,0,0,0.08)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(0,0,0,0.12)',
              '&:hover': { background: 'rgba(255,255,255,0.85)' },
              '&.Mui-focused': { background: 'rgba(255,255,255,0.95)', boxShadow: '0 0 0 3px rgba(0,0,0,0.08)' },
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: '#6b7280',
            '&.Mui-selected': { color: '#000000', fontWeight: 700 },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: '#000000' },
        },
      },
    };
  }

  if (isDark) {
    return {
      MuiCssBaseline: { styleOverrides: { body: { background: bodyBg, backgroundAttachment: 'fixed' } } },
      MuiPaper: {
        styleOverrides: {
          root: {
            background: 'rgba(30,41,59,0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(148,163,184,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            borderRadius: 16,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: 'rgba(30,41,59,0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(148,163,184,0.12)',
            borderRadius: 16,
            transition: 'all 0.3s ease',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: 'rgba(15,23,42,0.85) !important',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(148,163,184,0.08)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              background: 'rgba(15,23,42,0.5)',
              '&:hover': { background: 'rgba(15,23,42,0.8)' },
              '&.Mui-focused': { background: 'rgba(15,23,42,0.9)', boxShadow: '0 0 0 3px rgba(99,102,241,0.15)' },
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: '#cbd5e1',
            '&.Mui-selected': { color: '#ffffff', fontWeight: 700 },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: '#818cf8' },
        },
      },
    };
  }

  // light
  return {
    MuiCssBaseline: { styleOverrides: { body: { background: bodyBg, backgroundAttachment: 'fixed' } } },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
          borderRadius: 16,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 16,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 48px rgba(99,102,241,0.15)' },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'rgba(255,255,255,0.75) !important',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(99,102,241,0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: 'rgba(255,255,255,0.5)',
            '&:hover': { background: 'rgba(255,255,255,0.8)' },
            '&.Mui-focused': { background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 0 3px rgba(99,102,241,0.15)' },
          },
        },
      },
    },
  };
};

const ThemedApp = () => {
  const { direction } = useLanguage();
  const { mode, neonColor } = useThemeMode();

  React.useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = 'fa';
  }, [direction]);

  // کوراساوا مود: اعمال فیلتر خاکستری سراسری تا هیچ رنگی باقی نماند.
  // F مود روشن: کلاس «پاستیلی/آب‌نباتی» برای همه آیکن‌ها.
  React.useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.filter = mode === 'kurosawa' ? 'grayscale(1)' : 'none';
    }
    document.body.classList.toggle('fmode-light-candy', mode === 'fmode_light');
  }, [mode]);

  const palettes = getPalettes(mode, neonColor);
  const components = getComponents(mode, neonColor);

  const theme = createTheme({
    direction,
    palette: palettes,
    typography: {
      fontFamily: '"Vazirmatn", "Tahoma", sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.5px' },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      body1: { fontWeight: 400 },
      body2: { fontWeight: 400 },
    },
    shape: { borderRadius: 16 },
    components: {
      ...components,
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 12,
            padding: '8px 20px',
            transition: 'all 0.2s ease',
            // Remove all button icons app-wide (text-only buttons)
            '& .MuiButton-startIcon, & .MuiButton-endIcon': {
              display: 'none',
            },
          },
          contained: {
            ...(mode === 'fmode'
              ? { background: `linear-gradient(135deg, ${neonColor}, #00ffff)`, color: '#000', '&:hover': { background: `linear-gradient(135deg, ${neonColor}, #00cccc)` } }
              : mode === 'kurosawa'
                ? { background: 'linear-gradient(135deg, #111827, #4b5563)', color: '#fff', '&:hover': { background: 'linear-gradient(135deg, #000000, #374151)' } }
                : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } }),
          },
          // Text buttons have no border by default (e.g. "بازگشت"). Add one.
          text: {
            border: '1px solid currentColor',
            '&:hover': {
              border: '1px solid currentColor',
              background: 'rgba(99,102,241,0.06)',
            },
          },
        },
      },
      MuiInputBase: { styleOverrides: { input: { textAlign: 'right' } } },
      MuiSelect: { styleOverrides: { select: { textAlign: 'right' } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 10, fontWeight: 500 } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            margin: '2px 8px',
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
              '&:hover': { background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' },
            },
            '&:hover': { background: 'rgba(99,102,241,0.06)' },
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GummyBearOverlay />
      <HelpDialog />
      <AppRoutes />
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
              <LanguageProvider>
                <ThemedApp />
              </LanguageProvider>
            </CompanyProvider>
          </AuthProvider>
        </AppThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;