import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Divider, Typography, Avatar, IconButton, Tooltip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import InputIcon from '@mui/icons-material/Input';
import MailIcon from '@mui/icons-material/Mail';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BusinessIcon from '@mui/icons-material/Business';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import useAuth from '../../hooks/useAuth';
import useCompany from '../../hooks/useCompany';
import CompanySwitcher from './CompanySwitcher';

const DRAWER_WIDTH = 270;
const MINI_WIDTH = 76;

const menuItems = [
  { key: 'dashboard', icon: <DashboardIcon />, path: '/dashboard', color: '#6366f1' },
  { key: 'employees', icon: <PeopleIcon />, path: '/employees', color: '#ec4899' },
  { key: 'phonebook', icon: <DescriptionIcon />, path: '/phonebook', color: '#10b981' },
  { key: 'search', icon: <EventBusyIcon />, path: '/search', color: '#f59e0b' },
  { key: 'orgchart', icon: <AccountTreeIcon />, path: '/org-chart', color: '#8b5cf6' },
  { key: 'reports', icon: <AttachMoneyIcon />, path: '/reports', color: '#3b82f6' },
  { key: 'definitions', icon: <CategoryIcon />, path: '/definitions', color: '#14b8a6' },
  { key: 'data-entry', icon: <InputIcon />, path: '/data-entry', color: '#f97316' },
  { key: 'correspondences', icon: <MailIcon />, path: '/correspondences', color: '#06b6d4' },
  { key: 'assistant', icon: <SmartToyIcon />, path: '/assistant', color: '#f43f5e' },
  { key: 'scoring', icon: <AssessmentIcon />, path: '/scoring', color: '#3b82f6' },
  { key: 'settings', icon: <SettingsIcon />, path: '/settings', color: '#64748b' },
];

const Layout = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentCompany } = useCompany();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch company profile for logo & name
  const { data: profile } = useQuery({
    queryKey: ['company-profile-layout'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data).catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const drawerWidth = collapsed ? MINI_WIDTH : DRAWER_WIDTH;
  const companyName = profile?.company_name || profile?.legal_name || currentCompany?.name || t('app.shortName');
  const companyLogo = profile?.logo_url || null;

  const handleLogout = async () => {
    await logout();
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Company logo & name */}
      <Box sx={{
        p: 2, pb: 2.5, position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
        display: 'flex', alignItems: 'center', gap: 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {/* Decorative glow behind logo */}
        <Box sx={{
          position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
          width: 130, height: 90, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18), rgba(236,72,153,0.06), transparent 70%)',
          filter: 'blur(6px)', pointerEvents: 'none',
        }} />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {companyLogo ? (
            <Avatar src={companyLogo} sx={{ width: 46, height: 46, boxShadow: '0 4px 16px rgba(99,102,241,0.35)', border: '2px solid rgba(255,255,255,0.6)' }} />
          ) : (
            <Avatar sx={{
              width: 46, height: 46,
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
              border: '2px solid rgba(255,255,255,0.6)',
            }}>
              <BusinessIcon sx={{ fontSize: 24, color: '#fff' }} />
            </Avatar>
          )}
        </Box>
        {!collapsed && (
          <Box sx={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ letterSpacing: '-0.2px' }}>{companyName}</Typography>
            <Box sx={{ mt: 0.25 }}>
              <CompanySwitcher />
            </Box>
          </Box>
        )}
      </Box>

      {/* Menu items */}
      <List sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.key} disablePadding>
            <Tooltip title={collapsed ? t(`nav.${item.key}`) : ''} placement="left" arrow>
              <ListItemButton
                selected={location.pathname.startsWith(item.path)}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                sx={{
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1.5 : 2,
                  borderRadius: 2.5,
                  mx: 1,
                  mb: 0.25,
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: location.pathname.startsWith(item.path) ? 'blur(8px)' : 'none',
                  WebkitBackdropFilter: location.pathname.startsWith(item.path) ? 'blur(8px)' : 'none',
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(139,92,246,0.12))',
                    border: '1px solid rgba(99,102,241,0.22)',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.12)',
                    '&:hover': { background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.16))' },
                  },
                  '&:hover': { background: 'rgba(99,102,241,0.06)' },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: collapsed ? 0 : 40, justifyContent: 'center',
                  color: item.color,
                  transition: 'transform 0.2s ease',
                  ...(location.pathname.startsWith(item.path) && { transform: 'scale(1.15)' }),
                }}>
                  {React.cloneElement(item.icon, { sx: { filter: `drop-shadow(0 2px 6px ${item.color}55)` } })}
                </ListItemIcon>
                {!collapsed && <ListItemText primary={t(`nav.${item.key}`)} primaryTypographyProps={{ fontWeight: location.pathname.startsWith(item.path) ? 700 : 500, fontSize: '0.84rem' }} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      {/* Bottom: user info + collapse */}
      <Box sx={{ borderTop: '1px solid rgba(99,102,241,0.1)', p: collapsed ? 1 : 1.5 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, mb: 1,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <Tooltip title={collapsed ? (user?.first_name || user?.username || '') : ''} placement="left" arrow>
            <Avatar sx={{
              width: 40, height: 40, flexShrink: 0,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              fontSize: 16, fontWeight: 700,
              boxShadow: '0 3px 12px rgba(16,185,129,0.35)',
              border: '2px solid rgba(255,255,255,0.55)',
            }}>
              {(user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U')}
            </Avatar>
          </Tooltip>
          {!collapsed && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {user?.first_name || ''} {user?.last_name || ''}
              </Typography>
              <Typography variant="caption" color="textSecondary" noWrap>@{user?.username}</Typography>
            </Box>
          )}
          {!collapsed && (
            <Tooltip title={t('nav.logout')} placement="left">
              <IconButton size="small" onClick={handleLogout} color="error"
                sx={{ bgcolor: 'rgba(239,68,68,0.08)', '&:hover': { bgcolor: 'rgba(239,68,68,0.16)' } }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ mb: 0.5 }} />

        {/* Collapse toggle below user */}
        <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Tooltip title={collapsed ? 'باز کردن منو' : 'جمع کردن منو'} placement="left" arrow>
            <IconButton onClick={() => setCollapsed(!collapsed)} sx={{ color: 'text.secondary' }}>
              {collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop permanent collapsible drawer */}
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          minWidth: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;