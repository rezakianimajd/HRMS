import { useContext } from 'react';
import { CompanyContext } from '../context/CompanyContext';

/**
 * Custom hook to access company context.
 * @returns {Object} Company context with companies, currentCompany, switchCompany, etc.
 */
const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export default useCompany;