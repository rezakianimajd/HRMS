import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Drawer, Divider, Typography, Avatar, IconButton, Tooltip, Menu, MenuItem, Chip, Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import BusinessIcon from '@mui/icons-material/Business';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ConstructionIcon from '@mui/icons-material/Construction';
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
import { toPersianDigits } from '../../utils/numberUtils';

const RAIL_WIDTH = 72;
const PANEL_WIDTH = 226;
const SIDEBAR_WIDTH = RAIL_WIDTH + PANEL_WIDTH;

// انتخاب رنگ متن خوانا روی پس‌زمینهٔ رنگی (برای پیل فعال و آیکون گروه)
const contrastText = (hex) => {
  const raw = String(hex || '').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
  if (full.length !== 6) return '#ffffff';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#111827' : '#ffffff';
};

/**
 * چیدمان اصلی برنامه با سایدبار دوستونهٔ مدرن:
 *  - ریل آیکونی (لوگو، گروه‌ها، ابزارها، سوییچ تم، پروفایل)
 *  - پنل زیرمنوی گروه فعال (با هدر گروه و کارت دسترسی سریع)
 * در موبایل هر دو ستون داخل Drawer باز می‌شوند.
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
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

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
  const [shownGroupId, setShownGroupId] = useState(() => activeGroup?.id || menu[0]?.id || null);

  useEffect(() => {
    if (activeGroup?.id) setShownGroupId(activeGroup.id);
  }, [activeGroup?.id]);

  const shownGroup = menu.find((group) => group.id === shownGroupId) || activeGroup || menu[0];
  const accent = shownGroup?.color || '#6366f1';
  const panelIcon = shownGroup?.items?.find((item) => item.primary)?.icon || shownGroup?.items?.[0]?.icon;

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
      display: 'flex',
      height: '100%',
      bgcolor: 'background.paper',
      overflow: 'hidden',
    }}>
      {/* ---------- ریل آیکونی ---------- */}
      <Box sx={{
        width: RAIL_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1.5,
        px: 0.75,
        borderInlineEnd: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        <Tooltip title={companyName} placement="left" arrow>
          <Avatar
            onClick={() => navigateTo(menu[0]?.items?.[0]?.path || '/dashboard')}
            src={companyLogo || undefined}
            sx={{
              width: 40, height: 40, borderRadius: '12px', cursor: 'pointer',
              border: '2px solid', borderColor: 'background.paper',
              ...(companyLogo ? {} : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }),
              boxShadow: (theme) => `0 8px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
              transition: 'transform 0.2s ease',
              '&:hover': { transform: 'translateY(-1px) scale(1.03)' },
            }}
          >
            {!companyLogo && <BusinessIcon sx={{ fontSize: 20, color: '#fff' }} />}
          </Avatar>
        </Tooltip>

        <Divider sx={{ width: 26, my: 1.4 }} />

        <Box sx={{
          flex: 1, minHeight: 0, width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
          overflowY: 'auto', overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 0 },
        }}>
          {menu.map((group) => {
            const selected = group.id === shownGroup?.id;
            const containsActive = group.items.some((item) => isActive(item.path));
            const groupColor = group.color || '#6366f1';
            const groupOn = contrastText(groupColor);
            const groupIcon = (group.items.find((item) => item.primary) || group.items[0])?.icon;

            return (
              <Tooltip key={group.id} title={group.title} placement="left" arrow>
                <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <IconButton
                    onClick={() => setShownGroupId(group.id)}
                    aria-label={group.title}
                    sx={{
                      width: 42, height: 42, borderRadius: '50%',
                      color: selected ? groupOn : 'text.secondary',
                      bgcolor: selected ? groupColor : 'transparent',
                      boxShadow: selected ? `0 8px 18px ${alpha(groupColor, 0.32)}` : 'none',
                      transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        bgcolor: selected ? groupColor : alpha(groupColor, 0.1),
                        color: selected ? groupOn : groupColor,
                      },
                    }}
                  >
                    {groupIcon
                      ? React.cloneElement(groupIcon, { sx: { fontSize: 20 } })
                      : <BusinessIcon sx={{ fontSize: 20 }} />}
                  </IconButton>
                  {containsActive && !selected && (
                    <Box sx={{
                      position: 'absolute', bottom: 2, width: 5, height: 5,
                      borderRadius: '50%', bgcolor: groupColor, opacity: 0.85,
                    }} />
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        <Divider sx={{ width: 26, my: 1 }} />

        <Tooltip title="جستجوی سریع (Ctrl+K)" placement="left" arrow>
          <IconButton onClick={openPalette} aria-label="جستجوی سریع" sx={{ width: 38, height: 38, color: 'text.secondary' }}>
            <SearchIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        <NotificationBell />

        <Tooltip title="تنظیمات" placement="left" arrow>
          <IconButton
            onClick={() => navigateTo('/settings')}
            aria-label="تنظیمات"
            sx={{
              width: 38, height: 38,
              color: location.pathname.startsWith('/settings') ? 'primary.main' : 'text.secondary',
              bgcolor: location.pathname.startsWith('/settings')
                ? (theme) => alpha(theme.palette.primary.main, 0.1)
                : 'transparent',
            }}
          >
            <SettingsIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        <Box sx={{
          mt: 1, p: 0.4, borderRadius: '999px',
          border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
          display: 'flex', flexDirection: 'column', gap: 0.25,
          boxShadow: '0 4px 14px rgba(15,23,42,0.05)',
        }}>
          <IconButton
            size="small"
            onClick={() => setMode('light')}
            aria-label="تم روشن"
            sx={{
              width: 30, height: 30,
              color: mode === 'light' ? 'primary.main' : 'text.disabled',
              bgcolor: mode === 'light'
                ? (theme) => alpha(theme.palette.primary.main, 0.12)
                : 'transparent',
            }}
          >
            <LightModeIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setMode('dark')}
            aria-label="تم تاریک"
            sx={{
              width: 30, height: 30,
              color: mode === 'dark' ? 'primary.main' : 'text.disabled',
              bgcolor: mode === 'dark'
                ? (theme) => alpha(theme.palette.primary.main, 0.12)
                : 'transparent',
            }}
          >
            <DarkModeIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Tooltip title={fullName} placement="left" arrow>
          <Avatar
            onClick={(event) => setUserMenuAnchor(event.currentTarget)}
            sx={{
              mt: 1.2, width: 36, height: 36, cursor: 'pointer',
              fontSize: 12, fontWeight: 800,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
              color: 'primary.main',
              border: '2px solid', borderColor: 'background.paper',
              boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
            }}
          >
            {initials}
          </Avatar>
        </Tooltip>
      </Box>
      {/* ---------- پنل زیرمنو ---------- */}
      <Box sx={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}>
        <Box sx={{ px: 1.25, pt: 1.5 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.9,
            px: 1.1, py: 0.8, borderRadius: '999px',
            border: '1px solid', borderColor: alpha(accent, 0.22),
            bgcolor: 'background.paper',
            boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
          }}>
            <Avatar variant="rounded" sx={{
              width: 24, height: 24, borderRadius: '8px',
              bgcolor: alpha(accent, 0.14), color: accent,
            }}>
              {panelIcon
                ? React.cloneElement(panelIcon, { sx: { fontSize: 14 } })
                : <BusinessIcon sx={{ fontSize: 14 }} />}
            </Avatar>
            <Typography noWrap sx={{ flex: 1, fontSize: 12, fontWeight: 800 }}>
              {shownGroup?.title || currentApp?.title || companyName}
            </Typography>
            <Chip
              size="small"
              label={toPersianDigits(shownGroup?.items?.length || 0)}
              sx={{
                height: 18, fontSize: 9.5, fontWeight: 800,
                bgcolor: alpha(accent, 0.12), color: accent,
                '& .MuiChip-label': { px: 0.8 },
              }}
            />
          </Box>

          <Box sx={{
            mt: 1,
            display: 'flex', flexDirection: 'column', gap: 0.5,
            '& .MuiButton-root': { fontSize: 11, minHeight: 30, py: 0.4, borderRadius: '10px' },
          }}>
            <AppSwitcher />
            <CompanySwitcher />
          </Box>
        </Box>

        <Box sx={{
          flex: 1, minHeight: 0, overflowY: 'auto', px: 1, py: 1.25,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
        }}>
          <Typography sx={{
            px: 1, mb: 0.75, fontSize: 9.5, fontWeight: 800,
            letterSpacing: '0.06em', color: 'text.disabled',
          }}>
            صفحه‌ها
          </Typography>

          {(shownGroup?.items || []).map((item) => {
            const active = isActive(item.path);
            const itemColor = item.color || accent;
            const itemOn = contrastText(itemColor);
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
                  display: 'flex', alignItems: 'center', gap: 1.1,
                  px: 1.15, py: 0.85, mb: 0.25, borderRadius: '11px',
                  cursor: 'pointer',
                  color: active ? itemOn : 'text.secondary',
                  bgcolor: active ? itemColor : 'transparent',
                  boxShadow: active ? `0 8px 18px ${alpha(itemColor, 0.28)}` : 'none',
                  transition: 'background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
                  '&:hover': {
                    bgcolor: active ? itemColor : alpha(itemColor, 0.09),
                    color: active ? itemOn : itemColor,
                  },
                  '&:focus-visible': { outline: `2px solid ${alpha(itemColor, 0.5)}`, outlineOffset: 2 },
                }}
              >
                <Box sx={{ display: 'flex', color: active ? itemOn : itemColor, opacity: active ? 1 : 0.8 }}>
                  {item.icon
                    ? React.cloneElement(item.icon, { sx: { fontSize: 18 } })
                    : <BusinessIcon sx={{ fontSize: 18 }} />}
                </Box>
                <Typography noWrap sx={{ flex: 1, fontSize: 11.5, fontWeight: active ? 800 : 600 }}>
                  {item.title}
                </Typography>
                {isPlaceholder && <ConstructionIcon sx={{ fontSize: 13, opacity: 0.7 }} />}
              </Box>
            );
          })}
        </Box>



        <Box sx={{ p: 1.25, pt: 0.5 }}>
          <Box sx={{
            position: 'relative', overflow: 'hidden',
            borderRadius: '16px', border: '1px solid', borderColor: alpha(accent, 0.2),
            background: `linear-gradient(155deg, ${alpha(accent, 0.16)}, ${alpha(accent, 0.04)})`,
            p: 1.5,
          }}>
            <Box sx={{
              position: 'absolute', top: -20, left: -20, width: 70, height: 70,
              borderRadius: '50%', bgcolor: alpha(accent, 0.12),
            }} />
            <RocketLaunchIcon sx={{ fontSize: 20, color: accent, mb: 0.5 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>دسترسی سریع</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 10.5, lineHeight: 1.9, color: 'text.secondary' }}>
              با Ctrl+K صفحه‌ها و قراردادها را سریع پیدا کنید.
            </Typography>
            <Button
              fullWidth
              size="small"
              variant="contained"
              onClick={openPalette}
              sx={{
                mt: 1.2, py: 0.6, fontSize: 10.5, borderRadius: '9px',
                background: accent, color: contrastText(accent),
                boxShadow: `0 6px 14px ${alpha(accent, 0.3)}`,
                '&:hover': { background: accent, filter: 'brightness(0.95)' },
              }}
            >
              جستجوی سریع
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1, minWidth: 210, borderRadius: '14px',
              border: '1px solid', borderColor: 'divider',
              boxShadow: '0 18px 40px rgba(15,23,42,0.16)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>{fullName}</Typography>
          <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            @{user?.username}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => { setUserMenuAnchor(null); navigateTo('/settings'); }}
          sx={{ fontSize: 11.5, gap: 1, py: 0.9 }}
        >
          <SettingsIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
          تنظیمات
        </MenuItem>
        <MenuItem
          onClick={() => { setUserMenuAnchor(null); handleLogout(); }}
          sx={{ fontSize: 11.5, gap: 1, py: 0.9, color: 'error.main' }}
        >
          <LogoutIcon sx={{ fontSize: 17 }} />
          {t('nav.logout')}
        </MenuItem>
      </Menu>

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
          <NotificationBell />
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

