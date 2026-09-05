import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Paper, Typography, Grid, Button, Avatar, Card,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BarChartIcon from '@mui/icons-material/BarChart';
import { formatPersianNumber } from '../core/utils/numberUtils';

/* P4: گزارش مالی — جمعبندی حقوق/مزایا/کسورات به تفکیک دپارتمان */
const statCard = (icon, label, value, color, unit = '') => (
  <Grid item xs={12} sm={6} md={3}>
    <Paper sx={{
      p: 2, borderRadius: 2.5, height: '100%', textAlign: 'center',
      background: `linear-gradient(135deg, ${color}0f, rgba(255,255,255,0.4))`,
      border: `1px solid ${color}22`,
    }}>
      <Card sx={{ boxShadow: 'none', background: 'transparent' }}>
        <Avatar sx={{ width: 42, height: 42, mx: 'auto', mb: 1, bgcolor: `${color}20`, color }}>
          {icon}
        </Avatar>
        <Typography variant="h6" fontWeight={800} sx={{ color }}>{formatPersianNumber(value)}</Typography>
        <Typography variant="caption" color="textSecondary">{label} {unit}</Typography>
      </Card>
    </Paper>
  </Grid>
);

const FinanceReportsPage = () => {
  const navigate = useNavigate();
  const { data: summary } = useQuery({
    queryKey: ['finance-salary-benefits'],
    queryFn: () => axiosInstance.get('/reports/salary-benefits-summary/').then(r => r.data),
  });
  const { data: cost } = useQuery({
    queryKey: ['finance-salary-cost'],
    queryFn: () => axiosInstance.get('/reports/salary-cost/').then(r => r.data),
  });

  const rows = Array.isArray(cost) ? cost : cost?.results || [];

  return (
    <Box>
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(49,46,129,0.1), rgba(59,130,246,0.03), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.18)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #312e81, #3b82f6)', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
              <BarChartIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#1e3a8a">گزارش مالی</Typography>
              <Typography variant="body2" color="textSecondary">
                جمع کل حقوق، مزایا و کسورات؛ با نمایش به تفکیک دپارتمان
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<ReceiptLongIcon />} onClick={() => navigate('/payslips')}>
              فیش حقوق
            </Button>
            <Button variant="contained" startIcon={<AccountBalanceIcon />} onClick={() => navigate('/data-entry')}
              sx={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              ورود مالی
            </Button>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCard(<PaymentsIcon />, 'جمع حقوق پرداختی', summary?.total_salaries ?? 0, '#3b82f6', 'ریال')}
        {statCard(<AccountBalanceIcon />, 'جمع مزایا', summary?.total_benefits ?? 0, '#10b981', 'ریال')}
        {statCard(<ReceiptLongIcon />, 'جمع کسورات', summary?.total_deductions ?? 0, '#ef4444', 'ریال')}
        {statCard(<PaymentsIcon />, 'مزایای رفاهی', summary?.benefits_total_paid ?? 0, '#f59e0b', 'ریال')}
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>هزینه به تفکیک دپارتمان</Typography>
        {rows.length === 0 ? (
          <Typography color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>داده مالی موجود نیست</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {rows.slice(0, 10).map((d: any, i: number) => {
              const pct = d.total_salary ? Math.min(100, Math.max(3, (d.percent || 0))) : 0;
              return (
                <Box key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{d.department || '—'}</Typography>
                    <Typography variant="caption" fontWeight={600}>{formatPersianNumber(d.total_salary)} ریال</Typography>
                  </Box>
                  <Box sx={{ height: 6, bgcolor: 'rgba(59,130,246,0.12)', borderRadius: 3 }}>
                    <Box sx={{ width: `${pct}%`, height: 6, bgcolor: '#3b82f6', borderRadius: 3 }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FinanceReportsPage;