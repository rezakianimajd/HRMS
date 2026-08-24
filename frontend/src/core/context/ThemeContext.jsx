import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  mode: 'light',
  setMode: () => {},
  neonColor: '#39ff14',
  setNeonColor: () => {},
});

const MODE_STORAGE_KEY = 'hrms_theme_mode';
const NEON_STORAGE_KEY = 'hrms_neon_color';

export const THEME_MODES = [
  { key: 'light', label: 'روشن', icon: '☀️', color: '#f59e0b' },
  { key: 'dark', label: 'تاریک', icon: '🌙', color: '#6366f1' },
  { key: 'fmode', label: 'F مود', icon: '⚡', color: '#39ff14' },
  { key: 'fmode_light', label: 'F مود روشن', icon: '✨', color: '#00c853' },
  { key: 'kurosawa', label: 'کوراساوا مود', icon: '🎬', color: '#808080' },
];

export const NEON_COLOR_OPTIONS = [
  { key: 'green', label: 'سبز نئونی', color: '#39ff14' },
  { key: 'cyan', label: 'فیروزه‌ای', color: '#00ffff' },
  { key: 'magenta', label: 'سرخابی', color: '#ff00ff' },
  { key: 'yellow', label: 'زرد نئونی', color: '#ffff00' },
  { key: 'orange', label: 'نارنجی نئونی', color: '#ff9900' },
  { key: 'pink', label: 'صورتی نئونی', color: '#ff0a6c' },
];

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      return saved && ['light', 'dark', 'fmode', 'fmode_light', 'kurosawa'].includes(saved) ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  const [neonColor, setNeonColor] = useState(() => {
    try {
      const saved = localStorage.getItem(NEON_STORAGE_KEY);
      return saved || '#39ff14';
    } catch {
      return '#39ff14';
    }
  });

  useEffect(() => {
    try { localStorage.setItem(MODE_STORAGE_KEY, mode); } catch { /* ignore */ }
  }, [mode]);

  useEffect(() => {
    try { localStorage.setItem(NEON_STORAGE_KEY, neonColor); } catch { /* ignore */ }
  }, [neonColor]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, neonColor, setNeonColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeContext);