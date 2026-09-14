import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Divider, Typography, Avatar, IconButton, Tooltip,
  Menu, MenuItem,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import BusinessIcon from '@mui/icons-material/Business';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import ConstructionIcon from '@mui/icons-material/Construction';
import useAuth from '../../hooks/useAuth';
import useCompany from '../../hooks/useCompany';
import CompanySwitcher from './CompanySwitcher';
import NotificationBell from './NotificationBell';
import AppSwitcher from './AppSwitcher';
import WorkspaceTabs from './WorkspaceTabs';
import menuConfig, { getMenuForApp } from '../../config/menuConfig';
import { useApplication } from '../../context/ApplicationContext';
import { useWorkspaceTabs } from '../../context/WorkspaceTabsContext';

const DRAWER_WIDTH = 290;
const MINI_WIDTH = 82;

const Layout = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentCompany } = useCompany();
  const { currentApp } = useApplication();
  const { openTab } = useWorkspaceTabs();
  const menu = getMenuForApp(currentApp?.slug);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const path = window.location.pathname;
    const init = {};
    menu.forEach((g) => {
      init[g.id] = g.items.some((i) => path === i.path || path.startsWith(`${i.path}/`));
    });
    return init;
  });
  const [railAnchor, setRailAnchor] = useState(null);
  const [railGroup, setRailGroup] = useState(null);

  const { data: profile } = useQuery({
    queryKey: ['company-profile-layout'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data).catch(() => null),
    staleTime: 0,
  });

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => {
      const currentlyOpen = !!prev[id];
      const next = {};
      menu.forEach((g) => {
        next[g.id] = currentlyOpen ? false : g.id === id;
      });
      return next;
    });
  };

  useEffect(() => {
    let activeGroupId = null;
    menu.forEach((g) => {
      const isActive = g.items.some(
        (i) => location.pathname === i.path || location.pathname.startsWith(`${i.path}/`)
      );
      if (isActive) activeGroupId = g.id;
    });
    if (!activeGroupId) return;

    setExpandedGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      menu.forEach((g) => {
        const shouldBe = g.id === activeGroupId;
        if (!!next[g.id] !== shouldBe) {
          next[g.id] = shouldBe;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [location.pathname]);

  const drawerWidth = collapsed ? MINI_WIDTH : DRAWER_WIDTH;
  const companyName = profile?.company_name || profile?.legal_name || currentCompany?.name || t('app.shortName');
  const companyLogo = profile?.logo_url || null;

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

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

  useEffect(() => {
    if (!location.pathname || location.pathname === '/coming-soon') return;
    const meta = findMenuMeta(location.pathname);
    openTab({ path: location.pathname, title: meta.title, color: meta.color });
  }, [location.pathname]);

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{
        p: 2,
        pb: 1.5,
        borderBottom: '1px solid rgba(99,102,241,0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <Box sx={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          {companyLogo ? (
            <Avatar src={companyLogo} sx={{ width: 68, height: 68, boxShadow: '0 8px 24px rgba(99,102,241,0.35)', border: '2px solid rgba(255,255,255,0.7)' }} />
          ) : (
            <Avatar sx={{
              width: 68, height: 68,
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}>
              <BusinessIcon sx={{ fontSize: 34, color: '#fff' }} />
            </Avatar>
          )}
        </Box>
        {!collapsed && (
          <>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ mt: 1, mb: 0.25, fontSize: 13, opacity: 0.85, maxWidth: '100%', letterSpacing: '-0.1px' }}>
              {companyName}
            </Typography>
            <Box sx={{ mt: 0.75, width: '100%' }}>
              <CompanySwitcher />
            </Box>
            <Box sx={{ mt: 0.5, width: '100%' }}>
              <AppSwitcher />
            </Box>
          </>
        )}
      </Box>

      <List sx={{ flex: 1, overflowY: 'auto', py: 1, px: 1 }}>
        {collapsed ? (
          /* ---------- حالت جمع‌شده: ریل آیکونی + منوی شناور ---------- */
          menu.map((group) => {
            const groupActive = group.items.some((i) => isActive(i.path));
            const iconColor = group.color || '#6366f1';
            const primaryItem = group.items.find((i) => i.primary) || group.items[0];
            const groupIcon = primaryItem?.icon || <BusinessIcon />;

            return (
              <Box key={group.id} sx={{ display: 'flex', justifyContent: 'center', mb: 0.75 }}>
                <Tooltip title={group.title} placement="left" arrow>
                  <IconButton
                    onClick={(e) => { setRailGroup(group); setRailAnchor(e.currentTarget); }}
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      color: groupActive ? iconColor : 'text.secondary',
                      background: groupActive ? `${iconColor}1a` : 'transparent',
                      border: groupActive ? `1px solid ${iconColor}55` : '1px solid transparent',
                      boxShadow: groupActive ? `0 4px 14px ${iconColor}33` : 'none',
                      '&:hover': {
                        background: `${iconColor}14`,
                        color: iconColor,
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {groupIcon}
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })
        ) : (
          /* ---------- حالت باز: گروه‌ها + زیرآیتم‌ها ---------- */
          menu.map((group) => {
            const groupActive = group.items.some((i) => isActive(i.path));
            const open = expandedGroups[group.id];
            const iconColor = group.color || '#6366f1';

            return (
              <Box key={group.id} sx={{ mb: 0.5 }}>
                <Box
                  onClick={() => toggleGroup(group.id)}
                  sx={{
                    display: 'flex', alignItems: 'center',
                    px: 1.5, py: 0.9, mb: 0.25, mt: 0.75,
                    cursor: 'pointer',
                    borderRadius: '10px',
                    ...(groupActive && { bgcolor: `${iconColor}0d` }),
                    '&:hover': { bgcolor: `${iconColor}14` },
                  }}
                >
                  <Box
                    sx={{
                      width: 4,
                      height: 18,
                      borderRadius: '10px',
                      mr: 1.2,
                      ml: 0.3,
                      background: `linear-gradient(180deg, ${iconColor}, ${iconColor}55)`,
                      opacity: groupActive ? 1 : 0.55,
                    }}
                  />
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontFamily: 'Vazirmatn, IRANSans, sans-serif',
                      fontSize: '0.9rem',
                      letterSpacing: '0.02em',
                      color: groupActive ? iconColor : 'text.primary',
                      flex: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {group.title}
                  </Typography>
                  <IconButton size="small" sx={{ p: 0.3, color: groupActive ? iconColor : 'text.secondary', opacity: 0.7 }}>
                    {open ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowLeftIcon fontSize="small" />}
                  </IconButton>
                </Box>

                {open && group.items.map((item) => {
                  const active = isActive(item.path);
                  const isPlaceholder = item.ready === false;
                  return (
                    <ListItem key={item.id} disablePadding sx={{ mb: 0.4 }}>
                      <ListItemButton
                        selected={active}
                        onClick={() => {
                          if (item.ready === false) {
                            navigate('/coming-soon', { state: { title: item.title } });
                          } else {
                            goTo(item.path);
                          }
                        }}
                        sx={{
                          justifyContent: 'flex-start',
                          px: 1.5,
                          py: 0.7,
                          borderRadius: '10px',
                          minHeight: 36,
                          ...(active
                            ? {
                                background: `linear-gradient(135deg, ${item.color || '#6366f1'}26, ${item.color || '#6366f1'}12)`,
                                border: `1px solid ${item.color || '#6366f1'}55`,
                                boxShadow: `0 3px 12px ${item.color || '#6366f1'}20`,
                              }
                            : {}),
                          '&:hover': { background: 'rgba(99,102,241,0.06)' },
                        }}
                      >
                        <ListItemIcon sx={{
                          minWidth: 36,
                          justifyContent: 'center',
                          color: item.color || '#6366f1',
                          opacity: active ? 1 : 0.72,
                          filter: active ? `drop-shadow(0 2px 6px ${item.color || '#6366f1'}66)` : 'none',
                          transition: 'opacity 0.2s ease',
                        }}>
                          {item.icon}
                        </ListItemIcon>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                          <ListItemText
                            primary={item.title}
                            primaryTypographyProps={{
                              fontFamily: 'Vazirmatn, IRANSans, sans-serif',
                              fontSize: '0.85rem',
                              fontWeight: active ? 700 : 500,
                              color: active ? (item.color || 'inherit') : 'text.primary',
                              noWrap: true,
                            }}
                          />
                          {isPlaceholder && (
                            <Tooltip title="در حال توسعه" placement="left">
                              <ConstructionIcon sx={{ fontSize: 15, color: 'text.disabled', ml: 0.5 }} />
                            </Tooltip>
                          )}
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </Box>
            );
          })
        )}
      </List>

      {/* فلای‌اوت گروه در حالت جمع‌شده */}
      <Menu
        anchorEl={railAnchor}
        open={Boolean(railAnchor) && collapsed}
        onClose={() => { setRailAnchor(null); setRailGroup(null); }}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mr: 1,
              ml: 1,
              borderRadius: '14px',
              minWidth: 220,
              background: 'linear-gradient(160deg, #ffffff, #f8faff)',
              border: '1px solid rgba(99,102,241,0.15)',
              boxShadow: '0 18px 50px rgba(99,102,241,0.22)',
              overflow: 'hidden',
              p: 0.5,
            },
          },
        }}
      >
        {railGroup && (
          <>
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
              <Typography variant="body2" fontWeight={800} sx={{ color: railGroup.color }}>
                {railGroup.title}
              </Typography>
            </Box>
            {railGroup.items.map((item) => {
              const active = isActive(item.path);
              const isPlaceholder = item.ready === false;
              return (
                <MenuItem
                  key={item.id}
                  onClick={() => {
                    setRailAnchor(null);
                    setRailGroup(null);
                    if (isPlaceholder) {
                      navigate('/coming-soon', { state: { title: item.title } });
                    } else {
                      goTo(item.path);
                    }
                  }}
                  selected={active}
                  sx={{ borderRadius: '10px', mx: 0.5, my: 0.25, px: 1.5, py: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: item.color || '#6366f1', opacity: active ? 1 : 0.7 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 700 : 500, noWrap: true }}
                  />
                  {isPlaceholder && <ConstructionIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
                </MenuItem>
              );
            })}
          </>
        )}
      </Menu>

      <Box sx={{ borderTop: '1px solid rgba(99,102,241,0.1)', p: collapsed ? 1 : 1.5 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, mb: 1,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <NotificationBell glass />
          {!collapsed && (
            <>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {user?.first_name || ''} {user?.last_name || ''}
                </Typography>
                <Typography variant="caption" color="textSecondary" noWrap>@{user?.username}</Typography>
              </Box>
              <Tooltip title={t('nav.logout')} placement="left">
                <IconButton size="small" onClick={handleLogout} color="error"
                  sx={{ bgcolor: 'rgba(239,68,68,0.08)', '&:hover': { bgcolor: 'rgba(239,68,68,0.16)' } }}>
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
        <Divider sx={{ mb: 0.5 }} />
        <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Tooltip title={collapsed ? 'باز کردن منو' : 'جمع کردن منو'} placement="left">
            <IconButton onClick={() => setCollapsed(!collapsed)} sx={{ color: 'text.secondary' }}>
              {collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
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
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>

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
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
        <WorkspaceTabs />
      </Box>
    </Box>
  );
};

export default Layout;