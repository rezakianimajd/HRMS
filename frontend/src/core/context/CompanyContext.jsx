import React, { createContext, useState, useEffect, useCallback } from 'react';
import CompanyEngine from '../engines/companyEngine';
import AuthEngine from '../engines/authEngine';

export const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load companies when authenticated
  useEffect(() => {
    if (AuthEngine.isAuthenticated()) {
      loadInitialData();
    }
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load companies list
      const companyList = await CompanyEngine.getCompanies();
      setCompanies(companyList);

      // Load current company from storage or first in list
      const storedCompany = CompanyEngine.getStoredCompany();
      if (storedCompany && companyList.some(c => c.id === storedCompany.id)) {
        setCurrentCompany(storedCompany);
      } else if (companyList.length > 0) {
        setCurrentCompany(companyList[0]);
        CompanyEngine.setStoredCompany(companyList[0]);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch the active company.
   */
  const switchCompany = useCallback(async (companyId) => {
    setLoading(true);
    try {
      const result = await CompanyEngine.switchCompany(companyId);
      if (result.company) {
        setCurrentCompany(result.company);
        // Reload companies list
        const companyList = await CompanyEngine.getCompanies();
        setCompanies(companyList);
      }
      return result;
    } catch (error) {
      console.error('Failed to switch company:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh companies list.
   */
  const refreshCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const companyList = await CompanyEngine.getCompanies();
      setCompanies(companyList);
      return companyList;
    } catch (error) {
      console.error('Failed to refresh companies:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    companies,
    currentCompany,
    loading,
    switchCompany,
    refreshCompanies,
    setCurrentCompany,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};