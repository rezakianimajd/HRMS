import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Drawer, Divider, Typography, Avatar, IconButton, Tooltip, Collapse, Menu, MenuItem,
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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PostAddIcon from '@mui/icons-material/PostAdd';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BackupIcon from '@mui/icons-material/Backup';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import InsightsIcon from '@mui/icons-material/Insights';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import LoopOutlinedIcon from '@mui/icons-material/LoopOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import FactoryOutlinedIcon from '@mui/icons-material/FactoryOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import SyncAltOutlinedIcon from '@mui/icons-material/SyncAltOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import CallReceivedOutlinedIcon from '@mui/icons-material/CallReceivedOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
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
import { useModulePalette } from '../../context/ModulePaletteContext';

const RAIL_WIDTH = 68;
const PANEL_WIDTH = 268;
const SIDEBAR_WIDTH = RAIL_WIDTH + PANEL_WIDTH;

// میانبرهای هر ماژول در ریل باریک (حداکثر ۳ مورد)
const MODULE_SHORTCUTS = {
  hrms: [
    { title: 'ثبت پرسنل', path: '/employees/new', icon: <PersonAddIcon />, color: '#ec4899' },
    { title: 'لیست قراردادها', path: '/contracts', icon: <HistoryEduIcon />, color: '#f59e0b' },
    { title: 'تقویم', path: '/calendar', icon: <CalendarMonthIcon />, color: '#8b5cf6' },
  ],
  contracts: [
    { title: 'قرارداد جدید', path: '/contracts/new', icon: <PostAddIcon />, color: '#10b981' },
    { title: 'قراردادهای من', path: '/external-contracts', icon: <HistoryEduIcon />, color: '#f59e0b' },
    { title: 'تقویم قراردادها', path: '/contracts-calendar', icon: <CalendarMonthIcon />, color: '#06b6d4' },
  ],
  settings: [
    { title: 'مشخصات شرکت', path: '/company-profile', icon: <BusinessIcon />, color: '#6366f1' },
    { title: 'کاربران', path: '/users', icon: <AdminPanelSettingsIcon />, color: '#64748b' },
    { title: 'پشتیبان‌گیری', path: '/settings?tab=backup', icon: <BackupIcon />, color: '#3b82f6' },
  ],
  accounting: [
    { title: 'سند جدید', path: '/accounting/document-new', icon: <PostAddIcon />, color: '#10b981' },
    { title: 'اسناد حسابداری', path: '/accounting/documents', icon: <ReceiptLongIcon />, color: '#3b82f6' },
    { title: 'ترازنامه', path: '/accounting/reports/balance-sheet', icon: <AssessmentIcon />, color: '#8b5cf6' },
  ],
  pettycash: [
    { title: 'درخواست هزینه', path: '/petty-cash/expenses/new', icon: <PostAddIcon />, color: '#10b981' },
    { title: 'دفتر تنخواه', path: '/petty-cash/ledger', icon: <ReceiptLongIcon />, color: '#3b82f6' },
    { title: 'تقویم تنخواه', path: '/petty-cash/calendar', icon: <CalendarMonthIcon />, color: '#ec4899' },
  ],
  projects: [
    { title: 'پروژه‌ها', path: '/projects', icon: <AccountTreeIcon />, color: '#8b5cf6' },
    { title: 'تقویم پروژه‌ها', path: '/projects/calendar', icon: <CalendarMonthIcon />, color: '#10b981' },
    { title: 'گزارش‌ها', path: '/projects/reports', icon: <InsightsIcon />, color: '#6366f1' },
  ],
};

// آیکون‌های اوت‌لاین و یک‌دست برای سرگروه‌های منوی اصلی
const GROUP_ICONS = {
  home: <HomeOutlinedIcon />,
  people: <PeopleOutlinedIcon />,
  operations: <LoopOutlinedIcon />,
  payroll: <PaymentsOutlinedIcon />,
  welfare: <CardGiftcardOutlinedIcon />,
  documents: <FolderOutlinedIcon />,
  insights: <InsightsOutlinedIcon />,

  'settings-home': <HomeOutlinedIcon />,
  'settings-general': <SettingsOutlinedIcon />,
  'settings-projects': <AccountTreeOutlinedIcon />,
  'settings-inventory': <Inventory2OutlinedIcon />,
  'settings-accounting': <CalculateOutlinedIcon />,
  'settings-assets': <HomeWorkOutlinedIcon />,
  'settings-crm': <PeopleAltOutlinedIcon />,
  'settings-sales': <ShoppingCartOutlinedIcon />,
  'settings-production': <FactoryOutlinedIcon />,
  'settings-hr': <BadgeOutlinedIcon />,
  'settings-contracts': <DescriptionOutlinedIcon />,

  'pettycash-home': <HomeOutlinedIcon />,
  'pettycash-operations': <ReceiptLongOutlinedIcon />,
  'pettycash-config': <SettingsOutlinedIcon />,

  'accounting-home': <HomeOutlinedIcon />,
  'accounting-definitions': <CategoryOutlinedIcon />,
  'accounting-operations': <ReceiptLongOutlinedIcon />,
  'accounting-tools': <HandymanOutlinedIcon />,
  'accounting-integration': <SyncAltOutlinedIcon />,
  'accounting-fiscal': <CalendarMonthOutlinedIcon />,
  'accounting-annual': <AutorenewOutlinedIcon />,
  'accounting-reports': <BarChartOutlinedIcon />,
  'accounting-tax': <AccountBalanceOutlinedIcon />,
  'accounting-settings': <SettingsOutlinedIcon />,

  'treasury-home': <HomeOutlinedIcon />,
  'treasury-operations': <AccountBalanceWalletOutlinedIcon />,
  'treasury-planning': <TrendingUpOutlinedIcon />,
  'treasury-payments': <PaymentsOutlinedIcon />,
  'treasury-receipts': <CallReceivedOutlinedIcon />,
  'treasury-guarantees': <VerifiedUserOutlinedIcon />,
  'treasury-checks': <RequestQuoteOutlinedIcon />,

  'procurement-home': <HomeOutlinedIcon />,
  'procurement-master': <CategoryOutlinedIcon />,
  'procurement-operations': <ShoppingCartOutlinedIcon />,

  'projects-home': <HomeOutlinedIcon />,
  'projects-management': <AccountTreeOutlinedIcon />,
  'projects-commercial': <RequestQuoteOutlinedIcon />,
  'projects-cost': <PaymentsOutlinedIcon />,
  'projects-control': <AssessmentOutlinedIcon />,

  'contracts-lifecycle': <DescriptionOutlinedIcon />,
  'contracts-finance': <PaymentsOutlinedIcon />,
  'contracts-parties': <StorefrontOutlinedIcon />,
  'contracts-risks': <WarningAmberOutlinedIcon />,
  'contracts-config': <SettingsOutlinedIcon />,
  'contracts-docs': <FolderOutlinedIcon />,
};

const groupIcon = (id) => GROUP_ICONS[id] || <FolderOutlinedIcon />;

// رنگ یک‌دست آیکون‌های سایدبار (خاکستری تیره در تم روشن و خاکستری روشن در تم تاریک)
const ICON_COLOR = 'text.secondary';

/**
 * چیدمان اصلی برنامه با سایدبار دوستونهٔ سفید:
 *  - ریل باریک: لوگو، ۲ تا ۳ میانبر ماژول فعال، ابزارها و پروفایل
 *  - پنل منو: انتخاب ماژول در بالا، سپس «منوی اصلی» آکاردئونی
 *  - زیرمنوها بدون آیکون، با یک خط رنگی نازک در سمت راست
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
  const { getPalette } = useModulePalette();
  const moduleAccent = getPalette(currentApp?.slug)?.accent || null;
  const menu = getMenuForApp(currentApp?.slug);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [openGroupId, setOpenGroupId] = useState(null);

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

  const fallbackShortcuts = menu
    .flatMap((group) => group.items)
    .filter((item) => item.ready !== false && item.path);
  const seenShortcuts = new Set();
  const shortcuts = (MODULE_SHORTCUTS[currentApp?.slug] || fallbackShortcuts)
    .filter((item) => {
      if (!item?.path || seenShortcuts.has(item.path)) return false;
      seenShortcuts.add(item.path);
      return true;
    })
    .slice(0, 3);

  // فقط یک گروه باز می‌ماند؛ گروه صفحهٔ جاری به‌صورت خودکار باز می‌شود
  useEffect(() => {
    if (!activeGroup?.id) return;
    setOpenGroupId(activeGroup.id);
  }, [activeGroup?.id, location.pathname, location.search]);

  const toggleGroup = (id) => {
    setOpenGroupId((prev) => (prev === id ? null : id));
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
      bgcolor: 'background.paper',
      overflow: 'hidden',
    }}>
      {/* ---------- ریل میانبرهای ماژول ---------- */}
      <Box sx={{
        width: RAIL_WIDTH,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1.5,
        px: 0.75,
        borderInlineEnd: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': { width: 0 },
      }}>
        <Tooltip title={companyName} placement="left" arrow>
          <Avatar
            onClick={() => navigateTo(menu[0]?.items?.[0]?.path || '/dashboard')}
            src={companyLogo || undefined}
            sx={{
              width: 40, height: 40, borderRadius: '12px', cursor: 'pointer', flexShrink: 0,
              ...(companyLogo ? {} : { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }),
              boxShadow: (theme) => `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            {!companyLogo && <BusinessIcon sx={{ fontSize: 20, color: '#fff' }} />}
          </Avatar>
        </Tooltip>

        <Divider sx={{ width: 24, my: 1.25, flexShrink: 0 }} />

        <Box sx={{
          width: '100%', flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75,
        }}>
          {shortcuts.map((shortcut) => {
            const active = isActive(shortcut.path);

            return (
              <Tooltip key={shortcut.path} title={shortcut.title} placement="left" arrow>
                <IconButton
                  onClick={() => navigateTo(shortcut.path)}
                  aria-label={shortcut.title}
                  sx={{
                    width: 40, height: 40,
                    color: ICON_COLOR,
                    bgcolor: active ? (moduleAccent ? alpha(moduleAccent, 0.12) : 'action.selected') : 'transparent',
                    border: '1px solid',
                    borderColor: active ? (moduleAccent ? alpha(moduleAccent, 0.35) : 'divider') : 'transparent',
                    transition: 'background 0.2s ease',
                    '&:hover': { bgcolor: moduleAccent ? alpha(moduleAccent, 0.08) : 'action.hover' },
                  }}
                >
                  {shortcut.icon
                    ? React.cloneElement(shortcut.icon, { sx: { fontSize: 19 } })
                    : <BusinessIcon sx={{ fontSize: 19 }} />}
                </IconButton>
              </Tooltip>
            );
          })}
        </Box>

        <Box sx={{ flex: 1, minHeight: 12 }} />
        <Divider sx={{ width: 24, my: 1, flexShrink: 0 }} />

        <Tooltip title="جستجوی سریع (Ctrl+K)" placement="left" arrow>
          <IconButton
            size="small"
            onClick={openPalette}
            aria-label="جستجوی سریع"
            sx={{ color: ICON_COLOR }}
          >
            <SearchIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <NotificationBell compact iconColor={ICON_COLOR} />
        <Tooltip title="تنظیمات" placement="left" arrow>
          <IconButton
            size="small"
            onClick={() => navigateTo('/settings')}
            aria-label="تنظیمات"
            sx={{
              color: ICON_COLOR,
              bgcolor: location.pathname.startsWith('/settings') ? 'action.selected' : 'transparent',
            }}
          >
            <SettingsIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        <Box sx={{
          mt: 0.75, p: 0.4, borderRadius: '999px', flexShrink: 0,
          border: '1px solid', borderColor: 'divider',
          display: 'flex', flexDirection: 'column', gap: 0.25,
          boxShadow: '0 4px 14px rgba(15,23,42,0.05)',
        }}>
          <IconButton
            size="small"
            onClick={() => setMode('light')}
            aria-label="تم روشن"
            sx={{
              width: 30, height: 30,
              color: ICON_COLOR,
              opacity: mode === 'light' ? 1 : 0.55,
              bgcolor: mode === 'light' ? 'action.selected' : 'transparent',
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
              color: ICON_COLOR,
              opacity: mode === 'dark' ? 1 : 0.55,
              bgcolor: mode === 'dark' ? 'action.selected' : 'transparent',
            }}
          >
            <DarkModeIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Tooltip title={fullName} placement="left" arrow>
          <Avatar
            onClick={(event) => setUserMenuAnchor(event.currentTarget)}
            sx={{
              mt: 1.2, width: 34, height: 34, flexShrink: 0,
              cursor: 'pointer', fontSize: 11, fontWeight: 800,
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

      {/* ---------- پنل منو ---------- */}
      <Box sx={{
        width: PANEL_WIDTH,
        flexShrink: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}>
        {/* ---------- انتخاب ماژول ---------- */}
        <Box sx={{ px: 1.75, pt: 1.75, pb: 1.25 }}>
          <Box sx={{
            display: 'flex', flexDirection: 'column', gap: 0.75,
          }}>
            <AppSwitcher />
            <CompanySwitcher />
          </Box>
        </Box>

      <Divider />

      <Typography sx={{
        px: 2, pt: 1.5, pb: 0.5,
        fontSize: 10, fontWeight: 500, letterSpacing: '0.08em',
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
          const open = openGroupId === group.id;
          const containsActive = group.items.some((item) => isActive(item.path));
          const color = group.color || '#6366f1';
          const accent = moduleAccent || color;

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
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 1.25, py: 1, borderRadius: '10px', cursor: 'pointer',
                  color: containsActive || open ? accent : 'text.primary',
                  bgcolor: open ? alpha(accent, 0.06) : 'transparent',
                  transition: 'background 0.18s ease, color 0.18s ease',
                  '&:hover': { bgcolor: alpha(accent, 0.08) },
                  '&:focus-visible': { outline: `2px solid ${alpha(accent, 0.45)}`, outlineOffset: 2 },
                }}
              >
                <Box sx={{ display: 'flex', color: ICON_COLOR, flexShrink: 0 }}>
                  {React.cloneElement(groupIcon(group.id), { sx: { fontSize: 18 } })}
                </Box>
                <Typography sx={{
                  flex: 1, fontSize: 13, fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {group.title}
                </Typography>
                <KeyboardArrowDownIcon sx={{
                  fontSize: 17, color: ICON_COLOR, opacity: 0.8,
                  transform: open ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }} />
              </Box>


              <Collapse in={open} timeout={220} unmountOnExit>
                <Box sx={{
                  mr: 2, pr: 1.25, my: 0.5,
                  borderRight: `2px solid ${alpha(accent, 0.45)}`,
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
                          color: active ? accent : 'text.secondary',
                          bgcolor: active ? alpha(accent, 0.08) : 'transparent',
                          transition: 'background 0.16s ease, color 0.16s ease',
                          '&:hover': { color: accent, bgcolor: alpha(accent, 0.06) },
                          '&:focus-visible': { outline: `2px solid ${alpha(accent, 0.4)}`, outlineOffset: 1 },
                        }}
                      >
                        <Typography noWrap sx={{
                          flex: 1, fontSize: 13,
                          fontWeight: active ? 500 : 400,
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
              mt: 1, minWidth: 200, borderRadius: '14px',
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
            width: { xs: 'calc(100vw - 20px)', sm: SIDEBAR_WIDTH },
            maxWidth: SIDEBAR_WIDTH,
            height: '100vh',
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
          <Typography noWrap sx={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
            {companyName}
          </Typography>
          <NotificationBell compact iconColor={ICON_COLOR} />
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

