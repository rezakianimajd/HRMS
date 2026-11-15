import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { useApplication } from '../core/context/ApplicationContext';
import { useModulePalette } from '../core/context/ModulePaletteContext';
import { useTheme } from '@mui/material/styles';
import PayrollDashboardPanel from './payroll/PayrollDashboardPanel';
import PayrollPeriodsPanel from './payroll/PayrollPeriodsPanel';
import PayrollResultsPanel from './payroll/PayrollResultsPanel';
import PayrollSettingsPanel from './payroll/PayrollSettingsPanel';
import PayrollOperationsPanel from './payroll/PayrollOperationsPanel';
import PayrollProfilesPanel from './payroll/PayrollProfilesPanel';
import PayrollReportsPanel from './payroll/PayrollReportsPanel';
import PayrollSettlementPanel from './payroll/PayrollSettlementPanel';

const TABS = [
  { key: 'dashboard', label: 'داشبورد', icon: <DashboardIcon fontSize="small" /> },
  { key: 'periods', label: 'دوره‌های حقوق', icon: <CalendarMonthIcon fontSize="small" /> },
  { key: 'results', label: 'محاسبه و فیش‌ها', icon: <ReceiptLongIcon fontSize="small" /> },
  { key: 'profiles', label: 'پروفایل حقوقی', icon: <BadgeIcon fontSize="small" /> },
  { key: 'components', label: 'مزایا، کسورات و تنظیمات', icon: <TuneIcon fontSize="small" /> },
  { key: 'operations', label: 'اضافه‌کاری، وام و تخصیص', icon: <FactCheckIcon fontSize="small" /> },
  { key: 'settlement', label: 'تسویه حساب', icon: <LogoutIcon fontSize="small" /> },
  { key: 'reports', label: 'گزارش‌ها و مغایرت', icon: <AssessmentIcon fontSize="small" /> },
];

const PayrollPage = () => {
  const theme = useTheme();
  const { currentApp } = useApplication();
  const { getPalette } = useModulePalette();
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get('tab') || 'dashboard';
  const accent = getPalette(currentApp?.slug || 'payroll')?.accent || theme.palette.primary.main;
  const periodId = searchParams.get('period') || '';

  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const setPeriodId = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('period', id);
    else next.delete('period');
    setSearchParams(next, { replace: true });
  };

  const panel = useMemo(() => {
    if (active === 'periods') {
      return <PayrollPeriodsPanel accent={accent} theme={theme} onOpenResults={(id) => { setPeriodId(String(id)); setTab('results'); }} />;
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
        onOpenResults={(id) => { setPeriodId(String(id)); setTab('results'); }}
      />
    );
  }, [active, accent, periodId, setPeriodId, theme]);

  return (
    <Box sx={{ direction: 'rtl', pb: 4 }}>
      <PageHeader
        icon={<PaymentsIcon />}
        title="حقوق و دستمزد"
        subtitle="دوره‌های حقوق، محاسبهٔ مؤلفه‌محور، بیمه و مالیات، فیش حقوقی، پرداخت و بهای تمام‌شده"
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
      <Paper elevation={0} sx={{ mb: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <Tabs
          value={active}
          onChange={(event, value) => setTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="تب‌های حقوق و دستمزد"
          sx={{
            px: 1,
            '& .MuiTab-root': { fontSize: 12.5, fontWeight: 700, minHeight: 52, gap: 0.75 },
            '& .Mui-selected': { color: `${accent} !important` },
            '& .MuiTabs-indicator': { backgroundColor: accent },
          }}
        >
          {TABS.map((row) => <Tab key={row.key} value={row.key} icon={row.icon} iconPosition="start" label={row.label} />)}
        </Tabs>
      </Paper>
      {panel}
    </Box>
  );
};

export default PayrollPage;
