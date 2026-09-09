import React, { createContext, useState, useCallback, useContext } from 'react';
import axiosInstance from '../api/axiosConfig';

const ApplicationContext = createContext(null);

export const ApplicationProvider = ({ children }) => {
  const [applications, setApplications] = useState([]);
  const [currentApp, setCurrentApp] = useState(
    JSON.parse(localStorage.getItem('current_application') || 'null'),
  );

  const loadApplications = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/applications/');
      setApplications(res.data.applications || []);
      const stored = JSON.parse(localStorage.getItem('current_application') || 'null');
      const backendCurrent = res.data.applications?.find(a => a.id === res.data.current_application_id);
      if (stored) {
        setCurrentApp(stored);
      } else if (backendCurrent) {
        setCurrentApp(backendCurrent);
        localStorage.setItem('current_application', JSON.stringify(backendCurrent));
      } else if (res.data.applications?.length === 1) {
        setCurrentApp(res.data.applications[0]);
        localStorage.setItem('current_application', JSON.stringify(res.data.applications[0]));
      }
    } catch (e) {
      // keep silent, picker will be empty
    }
  }, []);

  const switchApplication = useCallback(async (app) => {
    try {
      await axiosInstance.post('/applications/switch/', { application_id: app.id });
    } catch (e) {
      // ignore backend error for superuser / missing profile
    }
    setCurrentApp(app);
    localStorage.setItem('current_application', JSON.stringify(app));
  }, []);

  return (
    <ApplicationContext.Provider value={{ applications, currentApp, loadApplications, switchApplication }}>
      {children}
    </ApplicationContext.Provider>
  );
};

export const useApplication = () => {
  const ctx = useContext(ApplicationContext);
  if (!ctx) throw new Error('useApplication must be used within ApplicationProvider');
  return ctx;
};

export default ApplicationContext;