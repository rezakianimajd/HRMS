import axiosInstance from '../api/axiosConfig';
import endpoints from '../api/endpoints';

/**
 * Authentication Engine - Manages user authentication on the client side.
 * Handles login, logout, token storage, and user state.
 */
class AuthEngine {
  /**
   * Login user with username, password, and optional company.
   * @param {string} username
   * @param {string} password
   * @param {number|null} companyId
   * @returns {Promise<Object>} Response with tokens and user data
   */
  static async login(username, password, companyId = null) {
    const payload = { username, password };
    if (companyId) {
      payload.company_id = companyId;
    }

    const response = await axiosInstance.post(endpoints.auth.login, payload);

    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (response.data.company) {
        localStorage.setItem('company', JSON.stringify(response.data.company));
      }
    }

    return response.data;
  }

  /**
   * Logout user and clear stored data.
   */
  static async logout() {
    try {
      await axiosInstance.post(endpoints.auth.logout);
    } catch (error) {
      // Continue with local logout even if server call fails
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('company');
    }
  }

  /**
   * Get the current user profile from the server.
   * @returns {Promise<Object>} User data
   */
  static async getCurrentUser() {
    const response = await axiosInstance.get(endpoints.auth.me);
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  /**
   * Get stored user from localStorage.
   * @returns {Object|null} User data or null
   */
  static getStoredUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Check if user is authenticated (has token).
   * @returns {boolean}
   */
  static isAuthenticated() {
    return !!localStorage.getItem('access_token');
  }

  /**
   * Get the access token from storage.
   * @returns {string|null}
   */
  static getToken() {
    return localStorage.getItem('access_token');
  }

  /**
   * Check if token is expired (basic client-side check).
   * @returns {boolean}
   */
  static isTokenExpired() {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch {
      return true;
    }
  }
}

export default AuthEngine;