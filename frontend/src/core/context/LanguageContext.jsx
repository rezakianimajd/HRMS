import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageEngine from '../engines/languageEngine';

export const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(
    LanguageEngine.getCurrentLanguage()
  );
  const [direction, setDirection] = useState(
    LanguageEngine.getCurrentDirection()
  );

  // Initialize direction on mount
  useEffect(() => {
    LanguageEngine.initialize();
  }, []);

  /**
   * Switch the application language.
   */
  const switchLanguage = useCallback(async (languageCode) => {
    await LanguageEngine.switchLanguage(languageCode);
    setCurrentLanguage(languageCode);
    setDirection(LanguageEngine.getLanguageDirection(languageCode));
  }, []);

  /**
   * Toggle between available languages.
   */
  const toggleLanguage = useCallback(() => {
    const nextLang = currentLanguage === 'fa' ? 'en' : 'fa';
    switchLanguage(nextLang);
  }, [currentLanguage, switchLanguage]);

  /**
   * Get language direction.
   */
  const getDirection = useCallback((langCode) => {
    const lang = LanguageEngine.SUPPORTED_LANGUAGES.find(l => l.code === langCode);
    return lang ? lang.direction : 'rtl';
  }, []);

  const value = {
    currentLanguage,
    direction,
    switchLanguage,
    toggleLanguage,
    getDirection,
    supportedLanguages: LanguageEngine.getSupportedLanguages(),
    isRTL: direction === 'rtl',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};