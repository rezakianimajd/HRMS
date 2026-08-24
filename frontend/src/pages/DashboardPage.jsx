import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Avatar,
  List, ListItem, ListItemText, ListItemIcon, Divider,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { DonutChart, BarChart } from '../core/components/charts/Charts';
import { toJalali } from '../core/utils/dateUtils';

const PALETTE = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

/* -------------------------------------------------------------------------
 * Stat Card - gradient, glassmorphism
 * ------------------------------------------------------------------------- */
const StatCard = ({ title, value, icon, from, to }) => (
  <Card sx={{
    height: '100%',
    background: `linear-gradient(135deg, ${from}14, ${to}08)`,
    border: `1px solid ${from}20`,
    backdropFilter: 'blur(12px)',
    transition: 'all 0.25s ease',
    '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 32px ${from}20` },
  }}>
    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" color="textSecondary">{title}</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: from, lineHeight: 1.1 }}>
            {formatPersianNumber(value ?? 0)}
          </Typography>
        </Box>
        <Avatar sx={{ width: 44, height: 44, background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 4px 12px ${from}30` }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

/* -------------------------------------------------------------------------
 * Panel header
 * ------------------------------------------------------------------------- */
const PanelHeader = ({ title, icon, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Avatar sx={{ width: 28, height: 28, background: `linear-gradient(135deg, ${color}, ${color}90)`, color: '#fff', boxShadow: `0 2px 8px ${color}40` }}>
      {icon}
    </Avatar>
    <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
  </Box>
);

// Consistent glass panel style matching the stat cards
const glassPanel = (from) => ({
  p: 2,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: `linear-gradient(135deg, ${from}10, ${from}05)`,
  border: `1px solid ${from}1e`,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 3,
  transition: 'all 0.25s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 12px 32px ${from}18`,
  },
});

const DashboardPage = () => {
  const { t } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => axiosInstance.get('/dashboard/stats/').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  });
  const { data: alerts } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => axiosInstance.get('/dashboard/alerts/').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  });
  const { data: activities } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: () => axiosInstance.get('/dashboard/recent-activities/').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  });
  const { data: byGender } = useQuery({
    queryKey: ['dash-gender'],
    queryFn: () => axiosInstance.get('/reports/employees-by-gender/').then(r => r.data),
  });
  const { data: byDept } = useQuery({
    queryKey: ['dash-dept'],
    queryFn: () => axiosInstance.get('/reports/employees-by-department/').then(r => r.data),
  });

  const genderData = (byGender || []).map((g, i) => ({ label: g.gender, value: g.count, color: ['#ec4899', '#3b82f6'][i] }));
  const deptData = (byDept || []).slice(0, 5).map((d, i) => ({ label: d.name, value: d.count, color: PALETTE[i] }));

  const alertsCount = (alerts?.expiring_documents?.length || 0) + (alerts?.expiring_contracts?.length || 0);

  return (
    <Box sx={{
      height: 'calc(100vh - 24px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      overflow: 'hidden',
    }}>
      {/* Stat cards row */}
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <StatCard title={t('dashboard_home.total_employees')} value={stats?.total_active}
            icon={<PeopleIcon sx={{ color: '#fff' }} />} from="#6366f1" to="#8b5cf6" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title={t('dashboard_home.new_this_month')} value={stats?.new_this_month}
            icon={<PersonAddIcon sx={{ color: '#fff' }} />} from="#10b981" to="#34d399" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title={t('dashboard_home.on_leave_count')} value={stats?.on_leave}
            icon={<EventBusyIcon sx={{ color: '#fff' }} />} from="#f59e0b" to="#fbbf24" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title={t('dashboard_home.retired_this_year')} value={stats?.retired_this_year}
            icon={<TrendingDownIcon sx={{ color: '#fff' }} />} from="#ef4444" to="#f87171" />
        </Grid>
      </Grid>

      {/* Main content: charts + alerts/activities - fills remaining space without scroll */}
      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left column: charts */}
        <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
          <Paper sx={glassPanel('#ec4899')}>
            <PanelHeader title="ترکیب جنسیتی" icon={<PeopleIcon sx={{ fontSize: 16 }} />} color="#ec4899" />
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              <DonutChart data={genderData} size={160} centerLabel="نفر" />
            </Box>
          </Paper>

          <Paper sx={glassPanel('#6366f1')}>
            <PanelHeader title="توزیع دپارتمان" icon={<TrendingDownIcon sx={{ fontSize: 16 }} />} color="#6366f1" />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <BarChart data={deptData} color="#6366f1" />
            </Box>
          </Paper>
        </Grid>

        {/* Right column: alerts + activities */}
        <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
          <Paper sx={glassPanel('#f59e0b')}>
            <PanelHeader title={t('dashboard_home.alerts_title')} icon={<WarningAmberIcon sx={{ fontSize: 16 }} />} color="#f59e0b" />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {alertsCount === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  {t('dashboard_home.no_alerts')}
                </Typography>
              ) : (
                <List dense disablePadding>
                  {alerts?.expiring_documents?.slice(0, 4).map(doc => (
                    <ListItem key={`doc-${doc.id}`} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <DescriptionIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2">{doc.title}</Typography>}
                        secondary={<Typography variant="caption">{doc.employee_name} · {formatPersianNumber(doc.days_left)} روز مانده</Typography>}
                      />
                    </ListItem>
                  ))}
                  {alerts?.expiring_contracts?.slice(0, 3).map(emp => (
                    <ListItem key={`ctr-${emp.id}`} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <AssignmentIcon color="info" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2">{emp.full_name}</Typography>}
                        secondary={<Typography variant="caption">قرارداد · {toJalali(emp.contract_end_date)}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>

          <Paper sx={glassPanel('#10b981')}>
            <PanelHeader title={t('dashboard_home.recent_activities')} icon={<AssignmentIcon sx={{ fontSize: 16 }} />} color="#10b981" />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {(!activities || activities.length === 0) ? (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  {t('dashboard_home.no_activities')}
                </Typography>
              ) : (
                <List dense disablePadding>
                  {activities.slice(0, 6).map(act => (
                    <ListItem key={act.id} disableGutters>
                      <ListItemText
                        primary={<Typography variant="body2" noWrap>{act.description}</Typography>}
                        secondary={<Typography variant="caption">{act.user} · {act.action}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;