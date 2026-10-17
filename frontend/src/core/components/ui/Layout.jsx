import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Drawer, Divider, Typography, Avatar, IconButton, Tooltip, Collapse,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import BusinessIcon from '@mui/icons-material/Business';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import useAuth from '../../hooks/useAuth';
import useCompany from '../../hooks/useCompany';
import CompanySwitcher from './CompanySwitcher';
import NotificationBell from './NotificationBell';
import AppSwitcher from './AppSwitcher';
import WorkspaceTabs from './WorkspaceTabs';
import CommandPalette from './CommandPalette';
import menuConfig, { getMenuForApp } from '../../config/menuConfig';
import { useApplication } from '../../context/ApplicationContext';
import { useWorkspaceTabs } from '../../context/WorkspaceTabsContext';
import { useThemeMode } from '../../context/ThemeContext';

const SIDEBAR_WIDTH = 288;

/**
 * چیدمان اصلی برنامه با سایدبار سفید تک‌ستونه:
 *  - انتخاب ماژول در بالای سایدبار، بالاتر از عنوان «منوی اصلی»
 *  - گروه‌های منو به‌صورت آکاردئونی؛ زیرمنوها با یک خط رنگی نازک در سمت راست
 *  - بدون آیکون برای آیتم‌های منو
 *  - ابزارها و کارت کاربر در پایین سایدبار
 */
const Layout = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentCompany } = useCompany();
  const { currentApp } = useApplication();
  const { openTab } = useWorkspaceTabs();
  const { mode, setMode } = useThemeMode();
  const menu = getMenuForApp(currentApp?.slug);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const path = window.location.pathname;
    const init = {};
    menu.forEach((group) => {
      init[group.id] = group.items.some(
        (item) => path === item.path || path.startsWith(`${item.path}/`),
      );
    });
    return init;
  });

  const { data: profile } = useQuery({
    queryKey: ['company-profile-layout'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data).catch(() => null),
    staleTime: 0,
  });

  const isActive = (path) => {
    const [targetPath, targetQuery = ''] = String(path || '').split('?');
    const pathMatches = location.pathname === targetPath
      || location.pathname.startsWith(`${targetPath}/`);
    if (!pathMatches) return false;

    const current = new URLSearchParams(location.search);
    if (!targetQuery) {
      // آیتم بدون کوئری (مثل /settings) وقتی فعال است که تب خاصی انتخاب نشده باشد
      if (targetPath === '/settings' && current.get('tab')) return false;
      return true;
    }
    const expected = new URLSearchParams(targetQuery);
    for (const [key, value] of expected.entries()) {
      if (current.get(key) !== value) return false;
    }
    return true;
  };

  const activeGroup = menu.find((group) => group.items.some((item) => isActive(item.path)));

  // گروه صفحهٔ جاری همیشه باز می‌ماند (حتی بعد از جابه‌جایی بین صفحه‌ها)
  useEffect(() => {
    if (!activeGroup?.id) return;
    setExpandedGroups((prev) => (
      prev[activeGroup.id] ? prev : { ...prev, [activeGroup.id]: true }
    ));
  }, [activeGroup?.id, location.pathname, location.search]);

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const companyName = profile?.company_name || profile?.legal_name || currentCompany?.name ||
    t('app.shortName');
  const companyLogo = profile?.logo_url || null;
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '';
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}` ||
    user?.username?.[0] || '؟';

  const handleLogout = async () => {
    await logout();
  };

  const findMenuMeta = (path) => {
    const allMenus = [menu, menuConfig];
    for (const m of allMenus) {
      for (const g of m) {
        for (const it of g.items) {
          if (it.path === path) return { title: it.title, color: it.color };
        }
      }
    }
    return { title: path, color: '#6366f1' };
  };

  const goTo = (path) => {
    const meta = findMenuMeta(path);
    openTab({ path, title: meta.title, color: meta.color });
    navigate(path);
  };

  const navigateTo = (path) => {
    if (mobileOpen) setMobileOpen(false);
    goTo(path);
  };

  const openPalette = () => {
    if (mobileOpen) setMobileOpen(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  useEffect(() => {
    if (!location.pathname || location.pathname === '/coming-soon') return;
    const meta = findMenuMeta(location.pathname);
    openTab({ path: location.pathname, title: meta.title, color: meta.color });
  }, [location.pathname]);

  const sidebarContent = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.paper',
      overflow: 'hidden',
    }}>
      {/* ---------- برند و انتخاب ماژول ---------- */}
      <Box sx={{ px: 1.75, pt: 1.75, pb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, mb: 1.5 }}>
          <Avatar
            src={companyLogo || undefined}
            onClick={() => navigateTo(menu[0]?.items?.[0]?.path || '/dashboard')}
            sx={{
              width: 38, height: 38, borderRadius: '11px', cursor: 'pointer',
              ...(companyLogo ? {} : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }),
              boxShadow: (theme) => `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            {!companyLogo && <BusinessIcon sx={{ fontSize: 19, color: '#fff' }} />}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.7 }}>
              {companyName}
            </Typography>
            <Typography noWrap sx={{ fontSize: 9.5, color: 'text.secondary' }}>
              {currentApp?.title || 'سامانهٔ منابع انسانی'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{
          display: 'flex', flexDirection: 'column', gap: 0.75,
          '& .MuiButton-root': { fontSize: 11, minHeight: 32, py: 0.5, borderRadius: '10px' },
        }}>
          <AppSwitcher />
          <CompanySwitcher />
        </Box>
      </Box>

      <Divider />

      <Typography sx={{
        px: 2, pt: 1.5, pb: 0.5,
        fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
        color: 'text.disabled',
      }}>
        منوی اصلی
      </Typography>

      {/* ---------- گروه‌ها و زیرمنوها ---------- */}
      <Box sx={{
        flex: 1, minHeight: 0, overflowY: 'auto', px: 1, pb: 1,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
      }}>
        {menu.map((group) => {
          const open = Boolean(expandedGroups[group.id]);
          const containsActive = group.items.some((item) => isActive(item.path));
          const color = group.color || '#6366f1';

          return (
            <Box key={group.id} sx={{ mb: 0.25 }}>
              <Box
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onClick={() => toggleGroup(group.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleGroup(group.id);
                  }
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 1.25, py: 1, borderRadius: '10px', cursor: 'pointer',
                  color: containsActive || open ? color : 'text.primary',
                  bgcolor: open ? alpha(color, 0.06) : 'transparent',
                  transition: 'background 0.18s ease, color 0.18s ease',
                  '&:hover': { bgcolor: alpha(color, 0.08) },
                  '&:focus-visible': { outline: `2px solid ${alpha(color, 0.45)}`, outlineOffset: 2 },
                }}
              >
                <Typography sx={{
                  flex: 1, fontSize: 12.5,
                  fontWeight: containsActive || open ? 800 : 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {group.title}
                </Typography>
                <KeyboardArrowDownIcon sx={{
                  fontSize: 17, opacity: 0.65,
                  transform: open ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }} />
              </Box>


              <Collapse in={open} timeout={220} unmountOnExit>
                <Box sx={{
                  mr: 2, pr: 1.25, my: 0.5,
                  borderRight: `2px solid ${alpha(color, 0.45)}`,
                }}>
                  {group.items.map((item) => {
                    const active = isActive(item.path);
                    const isPlaceholder = item.ready === false;

                    return (
                      <Box
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (isPlaceholder) {
                            if (mobileOpen) setMobileOpen(false);
                            navigate('/coming-soon', { state: { title: item.title } });
                          } else {
                            navigateTo(item.path);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.currentTarget.click();
                          }
                        }}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.75,
                          px: 1.15, py: 0.75, mb: 0.2, borderRadius: '8px',
                          cursor: 'pointer',
                          color: active ? color : 'text.secondary',
                          bgcolor: active ? alpha(color, 0.08) : 'transparent',
                          transition: 'background 0.16s ease, color 0.16s ease',
                          '&:hover': { color, bgcolor: alpha(color, 0.06) },
                          '&:focus-visible': { outline: `2px solid ${alpha(color, 0.4)}`, outlineOffset: 1 },
                        }}
                      >
                        <Typography noWrap sx={{
                          flex: 1, fontSize: 11.5,
                          fontWeight: active ? 800 : 500,
                        }}>
                          {item.title}
                        </Typography>
                        {isPlaceholder && (
                          <Typography sx={{ fontSize: 8.5, color: 'text.disabled', flexShrink: 0 }}>
                            به‌زودی
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* ---------- ابزارها و کارت کاربر ---------- */}
      <Box sx={{
        px: 1.25, pb: 1.25, pt: 0.75,
        borderTop: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: 'text.secondary' }}>
          <Tooltip title="جستجوی سریع (Ctrl+K)" arrow>
            <IconButton size="small" onClick={openPalette} aria-label="جستجوی سریع">
              <SearchIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
          <NotificationBell compact />
          <Tooltip title="تنظیمات" arrow>
            <IconButton
              size="small"
              onClick={() => navigateTo('/settings')}
              aria-label="تنظیمات"
              sx={{
                color: location.pathname.startsWith('/settings') ? 'primary.main' : 'text.secondary',
                bgcolor: location.pathname.startsWith('/settings')
                  ? (theme) => alpha(theme.palette.primary.main, 0.1)
                  : 'transparent',
              }}
            >
              <SettingsIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Tooltip title={mode === 'dark' ? 'تم روشن' : 'تم تاریک'} arrow>
            <IconButton
              size="small"
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              aria-label="تغییر تم"
              sx={{ color: 'text.secondary' }}
            >
              {mode === 'dark'
                ? <LightModeIcon sx={{ fontSize: 19 }} />
                : <DarkModeIcon sx={{ fontSize: 19 }} />}
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          mt: 0.75, p: 1, borderRadius: '12px',
          border: '1px solid', borderColor: 'divider',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
        }}>
          <Avatar sx={{
            width: 32, height: 32, fontSize: 11, fontWeight: 800,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
            color: 'primary.main',
          }}>
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.6 }}>
              {fullName}
            </Typography>
            <Typography noWrap sx={{ fontSize: 9.5, color: 'text.secondary' }}>
              @{user?.username}
            </Typography>
          </Box>
          <Tooltip title={t('nav.logout')} arrow>
            <IconButton
              size="small"
              onClick={handleLogout}
              aria-label={t('nav.logout')}
              sx={{
                color: 'error.main',
                bgcolor: 'rgba(239,68,68,0.08)',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.16)' },
              }}
            >
              <LogoutIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );


  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: false }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH, height: '100vh',
            boxSizing: 'border-box', border: 0,
          },
        }}
      >
        {mobileOpen ? sidebarContent : null}
      </Drawer>

      <Box sx={{
        display: { xs: 'none', md: 'block' },
        width: SIDEBAR_WIDTH, flexShrink: 0, height: '100vh',
        borderInlineEnd: '1px solid', borderColor: 'divider',
      }}>
        {sidebarContent}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box sx={{
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center', gap: 1,
          px: 1.5, py: 0.9,
          borderBottom: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper',
        }}>
          <IconButton
            size="small"
            onClick={() => setMobileOpen(true)}
            aria-label="باز کردن منو"
            sx={{ color: 'text.primary' }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
          {companyLogo ? (
            <Avatar src={companyLogo} sx={{ width: 26, height: 26 }} />
          ) : (
            <Avatar sx={{ width: 26, height: 26, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <BusinessIcon sx={{ fontSize: 14, color: '#fff' }} />
            </Avatar>
          )}
          <Typography noWrap sx={{ flex: 1, fontSize: 12, fontWeight: 800 }}>
            {companyName}
          </Typography>
          <NotificationBell compact />
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
        <WorkspaceTabs />
      </Box>
      <CommandPalette />
    </Box>
  );
};

export default Layout;

