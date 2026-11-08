import React, { createContext, useState, useEffect, useCallback } from 'react';
import AuthEngine from '../engines/authEngine';

export const AuthContext = createContext(null);

/** فاصلهٔ به‌روزرسانی خودکار مجوزهای کاربر (میلی‌ثانیه). */
export const USER_REFRESH_MS = 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const hasToken = AuthEngine.isAuthenticated();
      if (hasToken && !AuthEngine.isTokenExpired()) {
        const storedUser = AuthEngine.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
        // Verify with server
        try {
          const userData = await AuthEngine.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch {
          // Token invalid, clear
          await AuthEngine.logout();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  /**
   * به‌روزرسانی کاربر جاری (مجوزهای ریز/نقش) بدون خروج و ورود مجدد.
   * وقتی مدیر در «مجوزهای کاربران» دسترسی می‌دهد یا می‌گیرد، دکمه‌ها با همین
   * تازه‌سازی (با بازگشت به تب یا حداکثر یک دقیقه) به‌روز می‌شوند.
   */
  const refreshUser = useCallback(async () => {
    if (!AuthEngine.isAuthenticated()) return null;
    try {
      const fresh = await AuthEngine.getCurrentUser();
      if (fresh) {
        setUser(fresh);
        setIsAuthenticated(true);
      }
      return fresh;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const handleFocus = () => { refreshUser(); };
    window.addEventListener('focus', handleFocus);
    const timer = window.setInterval(handleFocus, USER_REFRESH_MS);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(timer);
    };
  }, [isAuthenticated, refreshUser]);

  /**
   * Login user with credentials and optional company.
   */
  const login = useCallback(async (username, password, companyId = null) => {
    const data = await AuthEngine.login(username, password, companyId);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  }, []);

  /**
   * Logout user.
   */
  const logout = useCallback(async () => {
    await AuthEngine.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};