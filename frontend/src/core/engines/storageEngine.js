/**
 * Storage Engine - Manages browser storage operations.
 * Provides a unified interface for localStorage and sessionStorage.
 */
class StorageEngine {
  /**
   * Set a value in localStorage.
   * @param {string} key
   * @param {*} value
   */
  static setLocalItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.error('StorageEngine: Failed to set localStorage item', e);
    }
  }

  /**
   * Get a value from localStorage.
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  static getLocalItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Remove a value from localStorage.
   * @param {string} key
   */
  static removeLocalItem(key) {
    localStorage.removeItem(key);
  }

  /**
   * Clear all localStorage items except specified keys.
   * @param {Array<string>} preserveKeys - Keys to keep
   */
  static clearLocalStorage(preserveKeys = []) {
    const preserved = {};
    preserveKeys.forEach(key => {
      preserved[key] = localStorage.getItem(key);
    });

    localStorage.clear();

    // Restore preserved keys
    Object.entries(preserved).forEach(([key, value]) => {
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    });
  }

  /**
   * Set a value in sessionStorage.
   * @param {string} key
   * @param {*} value
   */
  static setSessionItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      sessionStorage.setItem(key, serialized);
    } catch (e) {
      console.error('StorageEngine: Failed to set sessionStorage item', e);
    }
  }

  /**
   * Get a value from sessionStorage.
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  static getSessionItem(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }
}

export default StorageEngine;