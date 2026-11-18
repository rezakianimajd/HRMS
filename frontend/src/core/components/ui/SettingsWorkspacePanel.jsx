import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Tab, Tabs, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SettingsIcon from '@mui/icons-material/Settings';
import { useApplication } from '../../context/ApplicationContext';
import useAuth from '../../hooks/useAuth';
import Settings, { SETTINGS_SECTIONS } from '../../../modules/settings/Settings';

const SECTION_META = {
  general: { label: 'عمومی', color: '#6366f1' },
  management: { label: 'مدیریتی', color: '#f97316' },
  notifications: { label: 'اطلاع‌رسانی', color: '#10b981' },
  accounting: { label: 'حسابداری', color: '#3b82f6' },
  backup: { label: 'پشتیبان‌گیری', color: '#0ea5e9' },
  updates: { label: 'به‌روزرسانی', color: '#8b5cf6' },
};

const SettingsWorkspacePanel = () => {
  const { applications = [] } = useApplication();
  const { user } = useAuth();
  const full = Boolean(user?.is_superuser || user?.is_full_access);
  const permissions = user?.permissions || {};
  const accessibleSlugs = useMemo(
    () => new Set(applications.filter((app) => app.accessible && !app.is_coming_soon).map((app) => app.slug)),
    [applications],
  );

  const allowedSections = useMemo(() => [
    { key: 'general', enabled: full || permissions.can_edit_settings || permissions.can_manage_users },
    { key: 'management', enabled: full || permissions.can_edit_settings || permissions.can_manage_users },
    { key: 'notifications', enabled: true },
    { key: 'accounting', enabled: full || accessibleSlugs.has('accounting') },
    { key: 'backup', enabled: full || permissions.can_edit_settings },
    { key: 'updates', enabled: full || permissions.can_manage_updates },
  ].filter((item) => item.enabled), [full, permissions, accessibleSlugs]);

  const [tab, setTab] = useState(allowedSections[0]?.key || 'notifications');
  useEffect(() => {
    if (!allowedSections.some((item) => item.key === tab)) {
      setTab(allowedSections[0]?.key || 'notifications');
    }
  }, [allowedSections, tab]);

  const activeSection = SETTINGS_SECTIONS[tab] || SETTINGS_SECTIONS.notifications;
  const activeMeta = SECTION_META[tab] || SECTION_META.notifications;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
      <Box sx={{
        p: 1.15, borderRadius: 'var(--hrms-radius-large, 16px)',
        border: 'var(--hrms-border-card, 1px solid #e8edf4)',
        bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
        boxShadow: 'var(--hrms-shadow-card, none)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center',
            bgcolor: alpha(activeMeta.color, 0.1), color: activeMeta.color,
          }}>
            <SettingsIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 900 }}>تنظیمات در دسترس شما</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.15 }}>
              فقط بخش‌ها و ماژول‌هایی که مجوز دسترسی دارید نمایش داده می‌شوند.
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Chip
            size="small"
            label={activeSection?.title || activeMeta.label}
            sx={{ height: 22, fontSize: 10, bgcolor: alpha(activeMeta.color, 0.08), color: activeMeta.color }}
          />
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_event, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          borderBottom: '1px solid', borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 36, py: 0.4, fontSize: 11, fontWeight: 800 },
        }}
      >
        {allowedSections.map((item) => (
          <Tab
            key={item.key}
            value={item.key}
            label={SECTION_META[item.key]?.label || item.key}
            sx={{ color: tab === item.key ? (SECTION_META[item.key]?.color || 'primary.main') : 'text.secondary' }}
          />
        ))}
      </Tabs>

      <Box sx={{ minHeight: 0, pt: 0.2 }}>
        <Settings key={tab} embedded initialTab={tab} />
      </Box>
    </Box>
  );
};

export default SettingsWorkspacePanel;
