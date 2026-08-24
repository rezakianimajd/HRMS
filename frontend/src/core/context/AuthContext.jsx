import React, { createContext, useState, useEffect, useCallback } from 'react';
import AuthEngine from '../engines/authEngine';

export const AuthContext = createContext(null);

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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};