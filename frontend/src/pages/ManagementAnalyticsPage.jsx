import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Grid, Avatar, CircularProgress, Chip, Table,
  TableHead, TableRow, TableCell, TableBody, Stack,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import PeopleIcon from '@mui/icons-material/People';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { DonutChart, BarChart, ColumnChart, LineChart, MultiLineChart } from '../core/components/charts/Charts';

const KpiCard = ({ label, value, unit, icon, color, subtitle }) => (
  <Paper sx={{
    p: 2, height: '100%', borderRadius: '10px',
    background: `linear-gradient(135deg, ${color}12, ${color}05)`,
    border: `1px solid ${color}22`, transition: 'all 0.2s ease',
    '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 10px 26px ${color}22` },
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Avatar sx={{ width: 36, height: 36, background: `linear-gradient(135deg, ${color}, ${color}99)`, color: '#fff' }}>
        {icon}
      </Avatar>
      <Typography variant="caption" color="textSecondary">{label}</Typography>
    </Box>
    <Typography variant="h5" fontWeight={800} sx={{ color }}>
      {formatPersianNumber(value)}
      {unit && <Typography component="span" variant="body2" sx={{ mr: 0.5, color }}>{unit}</Typography>}
    </Typography>
    {subtitle && <Typography variant="caption" color="textSecondary">{subtitle}</Typography>}
  </Paper>
);

const ManagementAnalyticsPage = () => {
  const kpis = useQuery({ queryKey: ['mgmt-kpis'], queryFn: () => axiosInstance.get('/management/kpis/').then(r => r.data) });
  const dept = useQuery({ queryKey: ['mgmt-dept'], queryFn: () => axiosInstance.get('/management/department-analytics/').then(r => r.data) });
  const cost = useQuery({ queryKey: ['mgmt-cost'], queryFn: () => axiosInstance.get('/management/payroll-cost-trend/').then(r => r.data) });
  const edu = useQuery({ queryKey: ['mgmt-edu'], queryFn: () => axiosInstance.get('/management/education-distribution/').then(r => r.data) });
  const city = useQuery({ queryKey: ['mgmt-city'], queryFn: () => axiosInstance.get('/management/city-distribution/').then(r => r.data) });
  const perf = useQuery({ queryKey: ['mgmt-perf'], queryFn: () => axiosInstance.get('/management/performance-distribution/').then(r => r.data) });
  const leave = useQuery({ queryKey: ['mgmt-leave'], queryFn: () => axiosInstance.get('/management/leave-utilization/').then(r => r.data) });
  const assets = useQuery({ queryKey: ['mgmt-assets'], queryFn: () => axiosInstance.get('/management/asset-inventory/').then(r => r.data) });
  const loans = useQuery({ queryKey: ['mgmt-loans'], queryFn: () => axiosInstance.get('/management/loan-summary/').then(r => r.data) });
  const abs = useQuery({ queryKey: ['mgmt-abs'], queryFn: () => axiosInstance.get('/management/absenteeism-summary/').then(r => r.data) });

  const loading = kpis.isLoading;
  if (loading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const k = kpis.data || {};
  const genderData = [
    { label: 'ظ…ط±ط¯', value: Math.round((k.male_ratio / 100) * k.total_active), color: '#3b82f6' },
    { label: 'ط²ظ†', value: k.total_active - Math.round((k.male_ratio / 100) * k.total_active), color: '#ec4899' },
  ];
  const perfData = (perf.data || []).map(d => ({ label: d.label, value: d.count, color: d.color }));
  const eduData = (edu.data || []).map((d, i) => ({ label: d.education, value: d.count, color: ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'][i % 6] }));
  const assetTypeData = (assets.data?.by_type || []).map((d, i) => ({ label: d.type, value: d.count, color: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6'][i % 6] }));

  const costMonths = cost.data?.months || [];
  const costSeries = [
    { key: 'net', label: 'ط®ط§ظ„طµ ظ¾ط±ط¯ط§ط®طھغŒ', color: '#6366f1', data: costMonths.map(m => m.net) },
    { key: 'benefits', label: 'ظ…ط²ط§غŒط§', color: '#10b981', data: costMonths.map(m => m.benefits) },
    { key: 'deductions', label: 'ع©ط³ظˆط±ط§طھ', color: '#ef4444', data: costMonths.map(m => m.deductions) },
    { key: 'insurance', label: 'ط¨غŒظ…ظ‡ ع©ط§ط±ظپط±ظ…ط§', color: '#f59e0b', data: costMonths.map(m => m.employer_insurance) },
  ];
  const absMonths = abs.data?.months || [];

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(59,130,246,0.10), rgba(139,92,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.16)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}>
          <InsightsIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#1d4ed8">ط¯ط§ط´ط¨ظˆط±ط¯ ظ…ط¯غŒط±غŒطھغŒ</Typography>
          <Typography variant="body2" color="textSecondary">طھط­ظ„غŒظ„ ط¹ظ…غŒظ‚ ط¹ظ…ظ„ع©ط±ط¯طŒ ط­ظ‚ظˆظ‚طŒ ظ…ط±ط®طµغŒطŒ ط§ظ…ظˆط§ظ„ ظˆ ط­ط¶ظˆط± ط³ط§ط²ظ…ط§ظ†</Typography>
        </Box>
      </Paper>

      {/* KPI row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <KpiCard label="ظ¾ط±ط³ظ†ظ„ ظپط¹ط§ظ„" value={k.total_active} unit="ظ†ظپط±" color="#6366f1" icon={<PeopleIcon fontSize="small" />} subtitle={`${formatPersianNumber(k.new_this_month)} ط§ط³طھط®ط¯ط§ظ… ط§غŒظ† ظ…ط§ظ‡`} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="ظ…غŒط§ظ†ع¯غŒظ† ط­ظ‚ظˆظ‚" value={k.avg_salary} unit="ط±غŒط§ظ„" color="#10b981" icon={<AttachMoneyIcon fontSize="small" />} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="ظ…غŒط§ظ†ع¯غŒظ† ط¹ظ…ظ„ع©ط±ط¯" value={k.avg_performance} unit="/100" color="#f59e0b" icon={<TrendingUpIcon fontSize="small" />} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="طھط±ع© ط®ط¯ظ…طھ ط³ط§ظ„" value={k.turnover_ytd} unit="ظ†ظپط±" color="#ef4444" icon={<TrendingDownIcon fontSize="small" />} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="ظ…غŒط§ظ†ع¯غŒظ† ط³ظ†" value={k.avg_age} unit="ط³ط§ظ„" color="#0ea5e9" icon={<AccountCircleIcon fontSize="small" />} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="ظ…غŒط§ظ†ع¯غŒظ† ط³ط§ط¨ظ‚ظ‡" value={k.avg_tenure_years} unit="ط³ط§ظ„" color="#14b8a6" icon={<WorkOutlineIcon fontSize="small" />} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="ط±ط¶ط§غŒطھ ط´ط؛ظ„غŒ" value={k.avg_satisfaction} unit="/100" color="#8b5cf6" icon={<TrendingUpIcon fontSize="small" />} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="ظˆط§ظ… ظپط¹ط§ظ„" value={loans.data?.active_count} unit="ظ…ظˆط±ط¯" color="#ec4899" icon={<AttachMoneyIcon fontSize="small" />} subtitle={`ظ…ط§ظ†ط¯ظ‡ ${formatPersianNumber(loans.data?.total_amount)} ط±غŒط§ظ„`} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Gender donut */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: '10px', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>طھط±ع©غŒط¨ ط¬ظ†ط³غŒطھغŒ</Typography>
            <DonutChart data={genderData} centerLabel="ظ†ظپط±" />
          </Paper>
        </Grid>

        {/* Performance distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: '10px', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>طھظˆط²غŒط¹ ط¹ظ…ظ„ع©ط±ط¯</Typography>
            <ColumnChart data={perfData} height={180} />
          </Paper>
        </Grid>

        {/* Education */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: '10px', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>طھط­طµغŒظ„ط§طھ</Typography>
            <BarChart data={eduData} color="#6366f1" height={180} />
          </Paper>
        </Grid>

        {/* Payroll cost multi-line */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: '10px' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>ط±ظˆظ†ط¯ ظ‡ط²غŒظ†ظ‡ ط­ظ‚ظˆظ‚ (غ±غ² ظ…ط§ظ‡)</Typography>
            <MultiLineChart series={costSeries} labels={costMonths.map(m => m.label)} height={240} />
          </Paper>
        </Grid>

        {/* Absenteeism */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: '10px', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>ظ†ط±ط® ط­ط¶ظˆط± ظˆ ط؛غŒط¨طھ (غ±غ² ظ…ط§ظ‡)</Typography>
            <LineChart
              data={absMonths.map(m => m.present_rate)}
              labels={absMonths.map(m => m.label)}
              color="#10b981" height={200}
            />
            <Box sx={{ mt: 1 }}>
              <Chip size="small" label={`ظ†ط±ط® ط؛غŒط¨طھ ط¢ط®ط±غŒظ† ظ…ط§ظ‡: ${formatPersianNumber(absMonths[absMonths.length - 1]?.absenteeism_rate || 0)}ظھ`} sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444' }} />
            </Box>
          </Paper>
        </Grid>

        {/* Leave utilization */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', overflow: 'auto' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>ظ…ط§ظ†ط¯ظ‡ ظ…ط±ط®طµغŒ (ع©ظ…طھط±غŒظ†â€Œظ‡ط§)</Typography>
            <Stack spacing={1}>
              {(leave.data?.detail || []).slice(0, 8).map(d => (
                <Box key={d.employee_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="body2" sx={{ flex: 1 }} noWrap>{d.employee}</Typography>
                  <Typography variant="caption" color="textSecondary">{d.department}</Typography>
                  <Chip size="small" label={`${formatPersianNumber(d.remaining)} ط±ظˆط²`} color={d.remaining <= 5 ? 'error' : 'default'} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Department analytics table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: '10px', overflow: 'auto' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>طھط­ظ„غŒظ„ ط¯ظ¾ط§ط±طھظ…ط§ظ†â€Œظ‡ط§</Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: '#475569' } }}>
                  <TableCell>ط¯ظ¾ط§ط±طھظ…ط§ظ†</TableCell>
                  <TableCell>ظ†ظپط±</TableCell>
                  <TableCell>ظ…غŒط§ظ†ع¯غŒظ† ط­ظ‚ظˆظ‚</TableCell>
                  <TableCell>ط¹ظ…ظ„ع©ط±ط¯</TableCell>
                  <TableCell>ط±ط¶ط§غŒطھ</TableCell>
                  <TableCell>ط³ظ†</TableCell>
                  <TableCell>ط³ط§ط¨ظ‚ظ‡</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(dept.data || []).map(d => (
                  <TableRow key={d.department} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{d.department}</TableCell>
                    <TableCell>{formatPersianNumber(d.headcount)}</TableCell>
                    <TableCell>{formatPersianNumber(d.avg_salary)}</TableCell>
                    <TableCell>{formatPersianNumber(d.avg_performance)}</TableCell>
                    <TableCell>{formatPersianNumber(d.avg_satisfaction)}</TableCell>
                    <TableCell>{formatPersianNumber(d.avg_age)} ط³ط§ظ„</TableCell>
                    <TableCell>{formatPersianNumber(d.avg_tenure_years)} ط³ط§ظ„</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* Assets */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: '10px', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>ط§ظ…ظˆط§ظ„ ظˆ طھط¬ظ‡غŒط²ط§طھ</Typography>
            <BarChart data={assetTypeData} color="#10b981" height={180} />
          </Paper>
        </Grid>

        {/* City distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: '10px', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>طھظ…ط±ع©ط² ط¬ط؛ط±ط§ظپغŒط§غŒغŒ (ط´ظ‡ط±ظ‡ط§)</Typography>
            <BarChart data={(city.data || []).slice(0, 6).map((d, i) => ({ label: d.city, value: d.count, color: '#3b82f6' }))} color="#3b82f6" height={180} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ManagementAnalyticsPage;