import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BadgeIcon from '@mui/icons-material/Badge';
import TuneIcon from '@mui/icons-material/Tune';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import PageHeader from '../core/components/ui/PageHeader';
import { useModulePalette, MODULE_DEFAULT_ACCENTS } from '../core/context/ModulePaletteContext';
import { useTheme } from '@mui/material/styles';
import PayrollDashboardPanel from './payroll/PayrollDashboardPanel';
import PayrollPeriodsPanel from './payroll/PayrollPeriodsPanel';
import PayrollResultsPanel from './payroll/PayrollResultsPanel';
import PayrollSettingsPanel from './payroll/PayrollSettingsPanel';
import PayrollOperationsPanel from './payroll/PayrollOperationsPanel';
import PayrollProfilesPanel from './payroll/PayrollProfilesPanel';
import PayrollReportsPanel from './payroll/PayrollReportsPanel';
import PayrollSettlementPanel from './payroll/PayrollSettlementPanel';
import { payrollCardSx } from './payroll/payrollUi';

export const PAYROLL_TABS = [
  {
    key: 'dashboard',
    path: '/payroll/dashboard',
    label: 'داشبورد',
    icon: <DashboardIcon fontSize="small" />,
    description: 'نمای کلی دورهٔ جاری، روند حقوق، هشدارهای محاسباتی و شاخص‌های هزینه',
  },
  {
    key: 'periods',
    path: '/payroll/periods',
    label: 'دوره‌های حقوق',
    icon: <CalendarMonthIcon fontSize="small" />,
    description: 'ایجاد دوره، اجرای محاسبه، بررسی، تأیید، ثبت سند و گردش پرداخت',
  },
  {
    key: 'results',
    path: '/payroll/results',
    label: 'محاسبه و فیش‌ها',
    icon: <ReceiptLongIcon fontSize="small" />,
    description: 'نتایج محاسبهٔ هر پرسنل، اقلام حقوق و چاپ فیش حقوقی',
  },
  {
    key: 'profiles',
    path: '/payroll/profiles',
    label: 'پروفایل حقوقی',
    icon: <BadgeIcon fontSize="small" />,
    description: 'پروفایل حقوقی تاریخ‌محور پرسنل؛ منبع Snapshot هر دوره',
  },
  {
    key: 'components',
    path: '/payroll/settings',
    label: 'مزایا، کسورات و تنظیمات',
    icon: <TuneIcon fontSize="small" />,
    description: 'مؤلفه‌ها و قوانین محاسبه، نرخ بیمه، پله‌های مالیات، نگاشت حساب و قالب بانکی',
  },
  {
    key: 'operations',
    path: '/payroll/operations',
    label: 'اضافه‌کاری، وام و تخصیص',
    icon: <FactCheckIcon fontSize="small" />,
    description: 'ثبت اضافه‌کاری، مساعده/وام و تخصیص هزینه به پروژه و مرکز هزینه',
  },
  {
    key: 'settlement',
    path: '/payroll/settlement',
    label: 'تسویه حساب',
    icon: <LogoutIcon fontSize="small" />,
    description: 'تسویه حساب پایان همکاری و محاسبهٔ مزایای پایان خدمت',
  },
  {
    key: 'reports',
    path: '/payroll/reports',
    label: 'گزارش‌ها و مغایرت',
    icon: <AssessmentIcon fontSize="small" />,
    description: 'گزارش روند، تفکیک هزینه، مغایرت حسابداری/خزانه و فایل پرداخت بانکی',
  },
];

const TAB_BY_KEY = Object.fromEntries(PAYROLL_TABS.map((tab) => [tab.key, tab]));
const TAB_BY_PATH = Object.fromEntries(PAYROLL_TABS.map((tab) => [tab.path, tab.key]));

const tabFromLocation = (pathname, searchParams) => {
  if (TAB_BY_PATH[pathname]) return TAB_BY_PATH[pathname];
  const legacy = searchParams.get('tab');
  if (pathname === '/payroll' && TAB_BY_KEY[legacy]) return legacy;
  return 'dashboard';
};

const PayrollPage = () => {

  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getPalette } = useModulePalette();
  const active = tabFromLocation(location.pathname, searchParams);
  const activeMeta = TAB_BY_KEY[active] || PAYROLL_TABS[0];
  const accent = getPalette('payroll')?.accent || MODULE_DEFAULT_ACCENTS.payroll || theme.palette.primary.main;
  const periodId = searchParams.get('period') || '';

  // مسیر قدیمی `/payroll?tab=...` و ورود از خانهٔ ماژول را به صفحهٔ مستقل همان تب هدایت می‌کند.
  useEffect(() => {
    if (location.pathname === '/payroll') {
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      navigate({
        pathname: activeMeta.path,
        search: next.toString() ? `?${next.toString()}` : '',
      }, { replace: true });
      return;
    }
    if (!TAB_BY_PATH[location.pathname]) {
      navigate('/payroll/dashboard', { replace: true });
    }
  }, [activeMeta.path, location.pathname, navigate, searchParams]);

  const setTab = (tabKey) => {
    const target = TAB_BY_KEY[tabKey];
    if (!target) return;
    const next = new URLSearchParams(searchParams);
    next.delete('tab');
    navigate({
      pathname: target.path,
      search: next.toString() ? `?${next.toString()}` : '',
    });
  };

  const setPeriodId = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('period', id);
    else next.delete('period');
    setSearchParams(next, { replace: true });
  };

  const openResults = (id) => {
    navigate({
      pathname: '/payroll/results',
      search: id ? `?period=${encodeURIComponent(String(id))}` : '',
    });
  };

  const panel = useMemo(() => {
    if (active === 'periods') {
      return <PayrollPeriodsPanel accent={accent} theme={theme} onOpenResults={openResults} />;
    }
    if (active === 'results') {
      return <PayrollResultsPanel accent={accent} theme={theme} periodId={periodId} setPeriodId={setPeriodId} />;
    }
    if (active === 'components') {
      return <PayrollSettingsPanel accent={accent} theme={theme} />;
    }
    if (active === 'profiles') {
      return <PayrollProfilesPanel accent={accent} theme={theme} />;
    }
    if (active === 'operations') {
      return <PayrollOperationsPanel accent={accent} theme={theme} periodId={periodId} />;
    }
    if (active === 'settlement') {
      return <PayrollSettlementPanel accent={accent} theme={theme} />;
    }
    if (active === 'reports') {
      return <PayrollReportsPanel accent={accent} theme={theme} periodId={periodId} />;
    }
    return (
      <PayrollDashboardPanel
        accent={accent}
        theme={theme}
        onOpenPeriods={() => setTab('periods')}
        onOpenResults={openResults}
      />
    );
  }, [active, accent, periodId, theme]);

  return (
    <Box sx={{ direction: 'rtl', pb: 4 }}>
      <PageHeader
        icon={<PaymentsIcon />}
        title="حقوق و دستمزد"
        subtitle={activeMeta.description}
        color={accent}
        actions={(
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TuneIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              اطلاعات حقوقی محرمانه است؛ دسترسی بر اساس مجوز ماژول و مالکیت فیش اعمال می‌شود.
            </Typography>
          </Box>
        )}
      />
      <Paper elevation={0} data-testid="payroll-tabs" sx={payrollCardSx({ mb: 2.5, p: 0, overflow: 'hidden' })}>
        <Tabs
          value={active}
          onChange={(event, value) => setTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="صفحه‌های حقوق و دستمزد"
          sx={{
            px: 1,
            '& .MuiTab-root': { fontSize: 12.5, fontWeight: 700, minHeight: 52, gap: 0.75 },
            '& .Mui-selected': { color: `${accent} !important` },
            '& .MuiTabs-indicator': { backgroundColor: accent },
          }}
        >
          {PAYROLL_TABS.map((row) => (
            <Tab key={row.key} value={row.key} icon={row.icon} iconPosition="start" label={row.label} />
          ))}
        </Tabs>
      </Paper>
      {panel}
    </Box>
  );
};

export default PayrollPage;
