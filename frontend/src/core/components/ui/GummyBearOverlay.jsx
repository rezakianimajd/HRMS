import React, { useEffect, useCallback } from 'react';
import { useThemeMode } from '../../context/ThemeContext';

const EMOJIS = ['🐻', '🍬', '🟢', '💚', '🐸', '🥝', '🍏'];

/**
 * Gummy bear drop overlay.
 * Only active in 'fmode_light' theme.
 * Listens for clicks on any button whose text is "ذخیره" (save).
 */
const GummyBearOverlay = () => {
  const { mode } = useThemeMode();

  const dropBears = useCallback(() => {
    if (mode !== 'fmode_light') return;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const bear = document.createElement('div');
      bear.className = 'gummy-bear';
      bear.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      bear.style.left = `${Math.random() * (window.innerWidth - 40)}px`;
      bear.style.animationDelay = `${i * 0.12}s`;
      bear.style.fontSize = `${22 + Math.random() * 18}px`;
      document.body.appendChild(bear);
      // Remove after animation ends
      setTimeout(() => bear.remove(), 2500 + i * 120);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'fmode_light') return;

    const handler = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const text = (btn.textContent || '').trim();
      // Trigger only on real "save" actions (ذخیره / ثبت)
      if (/ذخیره|ثبت/.test(text)) {
        dropBears();
      }
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [mode, dropBears]);

  return null;
};

export default GummyBearOverlay;