import React from 'react';
import { Box, ButtonBase, Chip, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useApplication } from '../../context/ApplicationContext';
import useAuth from '../../hooks/useAuth';

const MODULE_SETTINGS = {
  hrms: { label: 'منابع انسانی', path: '/settings', color: '#6366f1' },
  contracts: { label: 'قراردادها', path: '/settings?tab=management', color: '#f59e0b' },
  projects: { label: 'پروژه‌ها', path: '/projects/definitions', color: '#8b5cf6' },
  accounting: { label: 'حسابداری', path: '/settings?tab=accounting', color: '#3b82f6' },
  pettycash: { label: 'تنخواه', path: '/petty-cash/settings', color: '#f97316' },
  payroll: { label: 'حقوق و دستمزد', path: '/payroll/definitions', color: '#10b981' },
  treasury: { label: 'خزانه‌داری', path: '/treasury/numbering', color: '#0f766e' },
  correspondence: { label: 'مکاتبات', path: '/settings/correspondence-numbering', color: '#0ea5e9' },
  documents: { label: 'مدیریت اسناد', path: '/document-management/folders', color: '#0f766e' },
  procurement: { label: 'خرید و تدارکات', path: '/procurement', color: '#06b6d4' },
  settings: { label: 'تنظیمات عمومی', path: '/settings', color: '#64748b' },
};

const Tile = ({ icon: Icon, title, subtitle, color, onClick }) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      display: 'block', width: '100%', textAlign: 'right', borderRadius: '12px',
      border: '1px solid', borderColor: alpha(color, 0.2), bgcolor: alpha(color, 0.035),
      p: 1.25, height: '100%', transition: 'border-color .16s ease, transform .16s ease',
      '&:hover': { borderColor: alpha(color, 0.45), transform: 'translateY(-1px)' },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.9 }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: '9px', display: 'grid', placeItems: 'center',
        color, bgcolor: alpha(color, 0.1), flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 11.8, fontWeight: 900 }}>{title}</Typography>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.2, lineHeight: 1.6 }}>{subtitle}</Typography>
      </Box>
    </Box>
  </ButtonBase>
);

const SettingsWorkspacePanel = ({ onNavigate }) => {
  const { applications = [] } = useApplication();
  const { user } = useAuth();
  const full = Boolean(user?.is_superuser || user?.is_full_access);
  const permissions = user?.permissions || {};
  const accessible = applications.filter((app) => app.accessible && !app.is_coming_soon);
  const generalTiles = [];

  if (full || permissions.can_edit_settings) {
    generalTiles.push({
      key: 'company', title: 'مشخصات شرکت', subtitle: 'نام، لوگو، اطلاعات تماس و ظاهر ورود',
      path: '/company-profile', icon: BusinessOutlinedIcon, color: '#6366f1',
    });
    generalTiles.push({
      key: 'appearance', title: 'ظاهر و استودیو تم', subtitle: 'پالت ماژول، تایپوگرافی و سطح‌ها',
      path: '/appearance', icon: PaletteOutlinedIcon, color: '#8b5cf6',
    });
  }
  if (full || permissions.can_manage_users) {
    generalTiles.push({
      key: 'users', title: 'کاربران و مجوزها', subtitle: 'دسترسی کاربران و ماژول‌های مجاز',
      path: '/users', icon: AdminPanelSettingsOutlinedIcon, color: '#64748b',
    });
  }
  generalTiles.push({
    key: 'notifications', title: 'اطلاع‌رسانی', subtitle: 'تنظیمات اعلان‌ها و کانال‌های اطلاع‌رسانی',
    path: '/settings?tab=notifications', icon: NotificationsActiveOutlinedIcon, color: '#10b981',
  });

  const moduleTiles = accessible
    .map((app) => MODULE_SETTINGS[app.slug])
    .filter(Boolean)
    .filter((tile, index, rows) => rows.findIndex((row) => row.path === tile.path) === index);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.3, minHeight: 0 }}>
      <Paper elevation={0} sx={{
        p: 1.2, borderRadius: 'var(--hrms-radius-large, 16px)',
        border: 'var(--hrms-border-card, 1px solid #e8edf4)',
        bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
        boxShadow: 'var(--hrms-shadow-card, none)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center', bgcolor: '#f1f5f9', color: '#64748b' }}>
            <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 900 }}>تنظیمات در دسترس شما</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.15 }}>
              فقط ماژول‌ها و بخش‌هایی که مجوز دسترسی دارید نمایش داده می‌شوند.
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', mb: 0.65 }}>تنظیمات عمومی</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.8 }}>
          {generalTiles.map((tile) => <Tile key={tile.key} {...tile} onClick={() => onNavigate?.(tile.path)} />)}
        </Box>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', mb: 0.65 }}>تنظیمات ماژول‌ها</Typography>
        {moduleTiles.length ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.8 }}>
            {moduleTiles.map((tile) => <Tile key={tile.path} {...tile} onClick={() => onNavigate?.(tile.path)} />)}
          </Box>
        ) : (
          <Chip size="small" label="ماژول تنظیمات مجازی برای شما تعریف نشده است." sx={{ fontSize: 10.5 }} />
        )}
      </Box>
    </Box>
  );
};

export default SettingsWorkspacePanel;

