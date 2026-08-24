import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import translationFA from '../../locales/fa/translation.json';
import translationEN from '../../locales/en/translation.json';

/**
 * Initialize i18next with language detection and resources.
 */
const resources = {
  fa: { translation: translationFA },
  en: { translation: translationEN },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fa',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
  });

/**
 * Language Engine - Manages i18n and document direction.
 */
class LanguageEngine {
  static SUPPORTED_LANGUAGES = [
    { code: 'fa', name: 'فارسی', direction: 'rtl' },
    { code: 'en', name: 'English', direction: 'ltr' },
  ];

  /**
   * Get the current active language.
   * @returns {string} Language code (e.g., 'fa')
   */
  static getCurrentLanguage() {
    return i18n.language || localStorage.getItem('language') || 'fa';
  }

  /**
   * Get the direction for the current language.
   * @returns {string} 'rtl' or 'ltr'
   */
  static getCurrentDirection() {
    const lang = this.getCurrentLanguage();
    const langConfig = this.SUPPORTED_LANGUAGES.find(l => l.code === lang);
    return langConfig ? langConfig.direction : 'rtl';
  }

  /**
   * Get direction for a specific language code.
   * @param {string} languageCode
   * @returns {string} 'rtl' or 'ltr'
   */
  static getLanguageDirection(languageCode) {
    const langConfig = this.SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
    return langConfig ? langConfig.direction : 'rtl';
  }

  /**
   * Switch the application language.
   * @param {string} languageCode - 'fa' or 'en'
   */
  static switchLanguage(languageCode) {
    return new Promise((resolve) => {
      i18n.changeLanguage(languageCode, () => {
        localStorage.setItem('language', languageCode);
        this.updateDocumentDirection(languageCode);
        resolve(languageCode);
      });
    });
  }

  /**
   * Update document.dir and document.documentElement.lang
   * @param {string} languageCode
   */
  static updateDocumentDirection(languageCode) {
    const langConfig = this.SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
    const direction = langConfig ? langConfig.direction : 'rtl';
    document.documentElement.dir = direction;
    document.documentElement.lang = languageCode;
  }

  /**
   * Initialize document direction on app load.
   * Forces RTL (Persian) - English disabled for now.
   */
  static initialize() {
    // Force Persian RTL - English disabled
    const lang = 'fa';
    localStorage.setItem('language', lang);
    i18n.changeLanguage(lang);
    this.updateDocumentDirection(lang);
  }

  /**
   * Get the name of a language by code.
   * @param {string} code
   * @returns {string}
   */
  static getLanguageName(code) {
    const langConfig = this.SUPPORTED_LANGUAGES.find(l => l.code === code);
    return langConfig ? langConfig.name : code;
  }

  /**
   * Get list of supported languages.
   * @returns {Array}
   */
  static getSupportedLanguages() {
    return this.SUPPORTED_LANGUAGES;
  }

  /**
   * Check if a language code is supported.
   * @param {string} code
   * @returns {boolean}
   */
  static isLanguageSupported(code) {
    return this.SUPPORTED_LANGUAGES.some(l => l.code === code);
  }
}

export { i18n };
export default LanguageEngine;