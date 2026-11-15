import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import PageHeader from '../core/components/ui/PageHeader';
import { useModulePalette, MODULE_DEFAULT_ACCENTS } from '../core/context/ModulePaletteContext';
import { useTheme } from '@mui/material/styles';
import PayrollDashboardPanel from './payroll/PayrollDashboardPanel';
import PayrollEmployeeSpecsPanel from './payroll/PayrollEmployeeSpecsPanel';
import PayrollOrderPage from './payroll/PayrollOrderPage';
import PayrollWorkDataPage from './payroll/PayrollWorkDataPage';
import PayrollLoansPanel from './payroll/PayrollLoansPanel';
import PayrollPeriodsPanel from './payroll/PayrollPeriodsPanel';
import PayrollResultsPanel from './payroll/PayrollResultsPanel';
import PayrollSettingsPanel from './payroll/PayrollSettingsPanel';
import PayrollOperationsPanel from './payroll/PayrollOperationsPanel';
import PayrollReportsPanel from './payroll/PayrollReportsPanel';
import PayrollSettlementPanel from './payroll/PayrollSettlementPanel';
import PayrollExportPanel from './payroll/PayrollExportPanel';
import PayrollCentersPanel from './payroll/PayrollCentersPanel';
import PayrollStatusPanel from './payroll/PayrollStatusPanel';
import PayrollPlaceholderPanel from './payroll/PayrollPlaceholderPanel';
import { PAYROLL_PAGES } from './payroll/payrollPages';

const PAGE_BY_PATH = Object.fromEntries(PAYROLL_PAGES.map((page) => [page.path, page]));

const PayrollPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { getPalette } = useModulePalette();
  const active = PAGE_BY_PATH[location.pathname] || PAYROLL_PAGES[0];
  const accent = getPalette('payroll')?.accent || MODULE_DEFAULT_ACCENTS.payroll || theme.palette.primary.main;
  const periodId = searchParams.get('period') || '';

  // مسیر قدیمی `/payroll` و مسیرهای ناشناخته را به صفحهٔ خانهٔ ماژول هدایت می‌کند.
  useEffect(() => {
    if (location.pathname === '/payroll') {
      const legacyTab = searchParams.get('tab');
      const target = legacyTab === 'periods' ? '/payroll/calculate'
        : legacyTab === 'results' ? '/payroll/results'
          : legacyTab === 'profiles' ? '/payroll/profiles'
            : legacyTab === 'components' ? '/payroll/definitions/components'
              : '/payroll/dashboard';
      navigate(target, { replace: true });
      return;
    }
    if (!PAGE_BY_PATH[location.pathname]) {
      navigate('/payroll/dashboard', { replace: true });
    }
  }, [location.pathname, navigate, searchParams]);

  const setPeriodId = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('period', id);
    else next.delete('period');
    const search = next.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  };

  const openResults = (id) => {
    navigate({
      pathname: '/payroll/results',
      search: id ? `?period=${encodeURIComponent(String(id))}` : '',
    });
  };

  const panel = useMemo(() => {
    const common = { accent, theme };
    if (active.panel === 'employees') return <PayrollEmployeeSpecsPanel {...common} />;
    if (active.panel === 'profiles') return <PayrollOrderPage {...common} />;
    if (active.panel === 'work_data') return <PayrollWorkDataPage {...common} />;
    if (active.panel === 'loans') return <PayrollLoansPanel {...common} />;
    if (active.panel === 'periods') return <PayrollPeriodsPanel {...common} onOpenResults={openResults} />;
    if (active.panel === 'results') return <PayrollResultsPanel {...common} periodId={periodId} setPeriodId={setPeriodId} />;
    if (active.panel === 'settings') return <PayrollSettingsPanel {...common} section={active.section} />;
    if (active.panel === 'operations') return <PayrollOperationsPanel {...common} periodId={periodId} mode={active.mode || 'all'} />;
    if (active.panel === 'settlement') return <PayrollSettlementPanel {...common} />;
    if (active.panel === 'reports') return <PayrollReportsPanel {...common} periodId={periodId} />;
    if (active.panel === 'export') return <PayrollExportPanel {...common} periodId={periodId} setPeriodId={setPeriodId} kind={active.kind || 'insurance'} />;
    if (active.panel === 'centers') return <PayrollCentersPanel {...common} mode={active.mode || 'projects'} />;
    if (active.panel === 'status') return <PayrollStatusPanel {...common} />;
    if (active.panel === 'placeholder') {
      return (
        <PayrollPlaceholderPanel
          accent={accent}
          description={active.description}
          requirements={active.requirements}
          related={active.related}
        />
      );
    }
    return (
      <PayrollDashboardPanel
        {...common}
        onOpenPeriods={() => navigate('/payroll/calculate')}
        onOpenResults={openResults}
      />
    );
  }, [active, accent, location.pathname, periodId, searchParams, theme]);

  return (
    <Box sx={{ direction: 'rtl', pb: 4 }}>
      <PageHeader
        icon={active.icon}
        title={active.key === 'home' ? 'حقوق و دستمزد' : `حقوق و دستمزد — ${active.label}`}
        subtitle={active.description}
        color={accent}
        actions={(
          <Box sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.9 }}>
            قوانین و نرخ‌ها تاریخ‌محور هستند؛ نرخ‌های سال ۱۴۰۵ را در تعاریف اولیه وارد کنید.
          </Box>
        )}
      />
      {panel}
    </Box>
  );
};

export default PayrollPage;
