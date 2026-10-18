import React, {
  createContext, useCallback, useContext, useEffect, useState,
} from 'react';

const STORAGE_KEY = 'hrms_module_palettes_v1';

// رنگ تاکیدی پیشنهادی هر ماژول (فقط برای نمایش در انتخابگر؛ تا ذخیره نشود اعمال نمی‌شود)
export const MODULE_DEFAULT_ACCENTS = {
  hrms: '#6366f1',
  contracts: '#f59e0b',
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

const ModulePaletteContext = createContext({
  palettes: {},
  getPalette: () => null,
  setPalette: () => {},
  resetPalette: () => {},
  resetAll: () => {},
});

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

export const ModulePaletteProvider = ({ children }) => {
  const [palettes, setPalettes] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      const clean = {};
      Object.entries(parsed).forEach(([slug, palette]) => {
        if (!slug || !palette || typeof palette !== 'object') return;
        const accent = sanitize(palette.accent);
        const background = sanitize(palette.background);
        if (accent || background) {
          clean[slug] = { ...(accent ? { accent } : {}), ...(background ? { background } : {}) };
        }
      });
      return clean;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
    } catch { /* ignore quota errors */ }
  }, [palettes]);

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
    if (!slug) return;
    setPalettes((prev) => {
      const next = { ...prev };
      const merged = { ...(prev[slug] || {}), ...patch };
      const cleaned = {};
      if (sanitize(merged.accent)) cleaned.accent = sanitize(merged.accent);
      if (sanitize(merged.background)) cleaned.background = sanitize(merged.background);
      if (Object.keys(cleaned).length) next[slug] = cleaned;
      else delete next[slug];
      return next;
    });
  }, []);

  const resetPalette = useCallback((slug) => {
    setPalettes((prev) => {
      if (!prev[slug]) return prev;
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setPalettes({}), []);

  return (
    <ModulePaletteContext.Provider
      value={{ palettes, getPalette, setPalette, resetPalette, resetAll }}
    >
      {children}
    </ModulePaletteContext.Provider>
  );
};

export const useModulePalette = () => useContext(ModulePaletteContext);
