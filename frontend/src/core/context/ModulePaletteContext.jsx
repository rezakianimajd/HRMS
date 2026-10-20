import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import axiosInstance from '../api/axiosConfig';
import useAuth from '../hooks/useAuth';
import useCompany from '../hooks/useCompany';
import { DEFAULT_TYPOGRAPHY } from '../theme/appearanceDefaults';

// رنگ تاکیدی پیشنهادی هر ماژول (فقط برای نمایش در انتخاب‌گر؛ تا ذخیره نشود اعمال نمی‌شود)
export const MODULE_DEFAULT_ACCENTS = {
  hrms: '#6366f1',
  contracts: '#f59e0b',
  documents: '#0f766e',
  projects: '#8b5cf6',
  inventory: '#10b981',
  accounting: '#0ea5e9',
  assets: '#f97316',
  treasury: '#14b8a6',
  crm: '#ec4899',
  procurement: '#3b82f6',
  sales: '#22c55e',
  production: '#a855f7',
  settings: '#64748b',
  pettycash: '#f59e0b',
};

const AppearanceContext = createContext({
  palettes: {},
  typography: DEFAULT_TYPOGRAPHY,
  canEdit: false,
  loading: false,
  saving: false,
  savedTick: false,
  error: '',
  getPalette: () => null,
  setPalette: () => {},
  resetPalette: () => {},
  resetPalettes: () => {},
  resetAll: () => {},
  setTypography: () => {},
  resetTypography: () => {},
});

const normalizeTypography = (raw) => {
  const value = raw && typeof raw === 'object' ? raw : {};
  const safe = {};
  Object.keys(DEFAULT_TYPOGRAPHY).forEach((key) => {
    safe[key] = value[key] ?? DEFAULT_TYPOGRAPHY[key];
  });
  return safe;
};

const normalizePalettes = (raw) => (raw && typeof raw === 'object' ? raw : {});

/**
 * ظاهر سراسری (پالت رنگی هر ماژول + تایپوگرافی) از API خوانده می‌شود؛
 * فقط «مدیر ارشد سیستم» اجازهٔ ذخیره دارد و نتیجه برای همهٔ کاربران اعمال می‌شود.
 */
export const ModulePaletteProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();

  const [palettes, setPalettes] = useState({});
  const [typography, setTypographyState] = useState(DEFAULT_TYPOGRAPHY);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState('');

  const dirtyRef = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!user) {
      setCanEdit(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    axiosInstance.get('/settings/appearance/')
      .then(({ data }) => {
        if (!alive) return;
        setPalettes(normalizePalettes(data?.palettes));
        setTypographyState(normalizeTypography(data?.typography));
        setCanEdit(Boolean(data?.can_edit));
        setError('');
        dirtyRef.current = false;
      })
      .catch(() => {
        if (alive) setError('دریافت تنظیمات ظاهر ناموفق بود');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [user?.id, currentCompany?.id]);

  useEffect(() => {
    if (!canEdit || !dirtyRef.current) return undefined;
    clearTimeout(saveTimer.current);
    const payload = { palettes, typography };
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      axiosInstance.put('/settings/appearance/', payload)
        .then(({ data }) => {
          setSaving(false);
          setSavedTick(true);
          setError('');
          dirtyRef.current = false;
          if (data?.typography) setTypographyState(normalizeTypography(data.typography));
          if (data?.palettes) setPalettes(normalizePalettes(data.palettes));
          setTimeout(() => setSavedTick(false), 1800);
        })
        .catch((err) => {
          setSaving(false);
          setError(err?.response?.data?.error || 'ذخیرهٔ تنظیمات ظاهر ناموفق بود');
        });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [palettes, typography, canEdit]);

  const getPalette = useCallback((slug) => {
    if (!slug) return null;
    const saved = palettes[slug];
    if (!saved) return null;
    return {
      accent: saved.accent || null,
      background: saved.background || null,
      hasCustom: Boolean(saved.accent || saved.background),
    };
  }, [palettes]);

  const setPalette = useCallback((slug, patch) => {
    if (!canEdit || !slug) return;
    setPalettes((prev) => {
      const next = { ...prev };
      const merged = { ...(prev[slug] || {}), ...patch };
      const cleaned = {};
      if (typeof merged.accent === 'string' && merged.accent.trim()) cleaned.accent = merged.accent.trim();
      if (typeof merged.background === 'string' && merged.background.trim()) cleaned.background = merged.background.trim();
      if (Object.keys(cleaned).length) next[slug] = cleaned;
      else delete next[slug];
      return next;
    });
    dirtyRef.current = true;
  }, [canEdit]);

  const resetPalette = useCallback((slug) => {
    if (!canEdit) return;
    setPalettes((prev) => {
      if (!prev[slug]) return prev;
      const next = { ...prev };
      delete next[slug];
      return next;
    });
    dirtyRef.current = true;
  }, [canEdit]);

  const resetPalettes = useCallback(() => {
    if (!canEdit) return;
    setPalettes({});
    dirtyRef.current = true;
  }, [canEdit]);

  const resetAll = useCallback(() => {
    if (!canEdit) return;
    setPalettes({});
    setTypographyState(DEFAULT_TYPOGRAPHY);
    dirtyRef.current = true;
  }, [canEdit]);

  const setTypography = useCallback((patch) => {
    if (!canEdit) return;
    setTypographyState((prev) => normalizeTypography({ ...prev, ...patch }));
    dirtyRef.current = true;
  }, [canEdit]);

  const resetTypography = useCallback(() => {
    if (!canEdit) return;
    setTypographyState(DEFAULT_TYPOGRAPHY);
    dirtyRef.current = true;
  }, [canEdit]);

  return (
    <AppearanceContext.Provider
      value={{
        palettes,
        typography,
        canEdit,
        loading,
        saving,
        savedTick,
        error,
        getPalette,
        setPalette,
        resetPalette,
        resetPalettes,
        resetAll,
        setTypography,
        resetTypography,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
};

export const useModulePalette = () => useContext(AppearanceContext);
