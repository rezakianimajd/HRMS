import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import useAuth from '../core/hooks/useAuth';
import useCompany from '../core/hooks/useCompany';
import { useApplication } from '../core/context/ApplicationContext';
import ModuleSelection from '../core/components/ui/ModuleSelection';
import { getModuleLandingPath } from '../core/constants/moduleIcons';

const AppSelectPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { currentCompany } = useCompany();
  const { applications, currentApp, loadApplications, switchApplication } = useApplication();
  const [loadingAppId, setLoadingAppId] = useState(null);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [error, setError] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['app-select-company-profile', currentCompany?.id],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then((res) => res.data).catch(() => null),
    enabled: Boolean(isAuthenticated),
    staleTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setApplicationsLoading(true);
    loadApplications().finally(() => setApplicationsLoading(false));
  }, [isAuthenticated, loadApplications]);

  const pick = async (app) => {
    if (app.is_coming_soon || !app.accessible) return;
    setError('');
    setLoadingAppId(app.id);
    try {
      await switchApplication(app);
      navigate(getModuleLandingPath(app.slug), { replace: true });
    } catch (err) {
      setError('خطا در انتخاب ماژول');
      setLoadingAppId(null);
    }
  };

  const company = {
    display_name: profile?.legal_name || '',
    legal_name: profile?.legal_name || '',
    logo_url: profile?.logo_url || null,
    code: currentCompany?.code || '',
    id: currentCompany?.id,
  };

  return (
    <ModuleSelection
      applications={applications}
      currentApp={currentApp}
      user={user}
      company={company}
      loadingAppId={loadingAppId}
      loading={applicationsLoading}
      error={error}
      onPick={pick}
      onBack={() => navigate(currentApp ? getModuleLandingPath(currentApp.slug) : '/login', { replace: true })}
      backLabel={currentApp ? 'داشبورد' : 'ورود'}
    />
  );
};

export default AppSelectPage;
