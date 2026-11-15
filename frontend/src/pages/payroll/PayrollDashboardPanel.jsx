import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Grid, Paper, Stack, Typography,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import PeopleIcon from '@mui/icons-material/People';
import PaidIcon from '@mui/icons-material/Paid';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axiosInstance from '../../core/api/axiosConfig';
import InfoCard from '../../core/components/ui/InfoCard';
import { dateLabel, money, number, statusMeta } from './payrollUi';

const Section = ({ title, children, action, color }) => (
  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Box sx={{ width: 4, height: 22, borderRadius: 2, bgcolor: color || 'primary.main' }} />
      <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 800 }}>{title}</Typography>
      {action}
    </Box>
    {children}
  </Paper>
);

const PayrollDashboardPanel = ({ accent, onOpenPeriods, onOpenResults }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['payroll-dashboard'],
    queryFn: () => axiosInstance.get('/payroll/dashboard/').then((r) => r.data),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error">دریافت داشبورد حقوق ناموفق بود. مجوز ماژول و پیکربندی دوره را بررسی کنید.</Alert>;
  }
  const current = data?.current_period;
  const meta = current ? statusMeta(current.status) : null;
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {!current && (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={onOpenPeriods}>ایجاد دوره</Button>}>
          هنوز دورهٔ حقوقی ثبت نشده است. برای شروع یک دورهٔ ماهانه بسازید و پس از تنظیم نرخ‌ها، محاسبه را اجرا کنید.
        </Alert>
      )}
      {current && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<InboxIcon />} label="دورهٔ جاری" value={current.label} sub={`${dateLabel(current.start_date)} تا ${dateLabel(current.end_date)}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<PeopleIcon />} label="کارکنان محاسبه‌شده" value={number(current.calculated_count)} sub={`از ${number(current.employee_count)} نفر واجد شرایط`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<PaidIcon />} label="جمع ناخالص" value={money(current.gross)} sub={`خالص: ${money(current.net)}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<AccountBalanceWalletIcon />} label="کل هزینهٔ نیروی کار" value={money(current.total_cost)} sub={`ایجاد سند: ${current.has_accounting ? 'بله' : 'خیر'}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<HealthAndSafetyIcon />} label="بیمهٔ سهم کارمند" value={money(current.insurance_employee)} sub={`کارفرما: ${money(current.insurance_employer)}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<ReceiptLongIcon />} label="مالیات" value={money(current.tax)} sub={`سایر کسورات: ${money(current.other_deductions)}`} color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<WarningAmberIcon />} label="موارد نیازمند بررسی" value={number(current.warning_count)} sub="هشدارهای محاسباتی دوره" color={accent} /></Grid>
          <Grid item xs={12} sm={6} md={3}><InfoCard icon={<InboxIcon />} label="وضعیت دوره" value={meta?.label || '—'} sub={`پرداخت‌شده: ${money(current.paid)}`} color={accent} /></Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Section title="روند ۶ دورهٔ اخیر" color={accent} action={<Button size="small" onClick={onOpenPeriods}>مدیریت دوره‌ها</Button>}>
            {(data?.trend || []).length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>دوره‌ای برای نمایش وجود ندارد.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <Box component="thead">
                    <Box component="tr" sx={{ color: 'text.secondary' }}>
                      {['دوره', 'وضعیت', 'نفرات', 'ناخالص', 'خالص', 'کل هزینه'].map((label) => (
                        <Box component="th" key={label} sx={{ textAlign: 'right', p: 1, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 700 }}>{label}</Box>
                      ))}
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {(data?.trend || []).map((row) => (
                      <Box component="tr" key={row.id}>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{row.label}</Box>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}><Chip size="small" label={statusMeta(row.status).label} /></Box>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{number(row.employees)}</Box>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{money(row.gross)}</Box>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{money(row.net)}</Box>
                        <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>{money(row.total_cost)}</Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </Section>
        </Grid>
        <Grid item xs={12} md={5}>
          <Section title="صف بررسی" color={accent}>
            {(data?.warnings || []).length === 0 ? (
              <Stack spacing={1}>
                <Alert severity="success">هیچ هشدار محاسباتی برای دورهٔ جاری ثبت نشده است.</Alert>
                {current && <Button size="small" variant="outlined" onClick={() => onOpenResults(current.id)}>مشاهدهٔ نتایج و فیش‌ها</Button>}
              </Stack>
            ) : (
              <Stack spacing={1}>
                {(data?.warnings || []).slice(0, 8).map((row) => (
                  <Alert key={row.id} severity="warning" sx={{ fontSize: 12 }}>
                    <strong>{row.employee__first_name} {row.employee__last_name}</strong>
                    <Box component="div" sx={{ mt: 0.5 }}>{(row.warnings || []).join(' • ')}</Box>
                  </Alert>
                ))}
                {current && <Button size="small" onClick={() => onOpenResults(current.id)}>بررسی همهٔ نتایج</Button>}
              </Stack>
            )}
          </Section>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PayrollDashboardPanel;
