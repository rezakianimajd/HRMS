import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Avatar,
  List, ListItem, ListItemText, ListItemIcon, Chip, Tooltip,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FolderIcon from '@mui/icons-material/Folder';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { DonutChart, BarChart } from '../core/components/charts/Charts';
import { toJalali } from '../core/utils/dateUtils';
import useAuth from '../core/hooks/useAuth';

const PALETTE = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

/* -------------------------------------------------------------------------
 * Compact stat card
 * ------------------------------------------------------------------------- */
const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{
    height: '100%',
    background: `linear-gradient(135deg, ${color}12, ${color}05)`,
    border: `1px solid ${color}20`,
    borderRadius: 2.5,
    transition: 'all 0.2s ease',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${color}20` },
  }}>
    <CardContent sx={{ py: 1.25, px: 1.75, '&:last-child': { pb: 1.25 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Avatar sx={{ width: 36, height: 36, background: `linear-gradient(135deg, ${color}, ${color}99)`, boxShadow: `0 3px 10px ${color}30` }}>
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="textSecondary" noWrap display="block">{title}</Typography>
          <Typography variant="h6" fontWeight={800} sx={{ color, lineHeight: 1.1 }}>
            {formatPersianNumber(value ?? 0)}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const PanelHeader = ({ title, icon, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
    <Avatar sx={{ width: 24, height: 24, background: `linear-gradient(135deg, ${color}, ${color}90)`, color: '#fff', boxShadow: `0 2px 8px ${color}40` }}>
      {icon}
    </Avatar>
    <Typography variant="subtitle2" fontWeight={700} noWrap>{title}</Typography>
  </Box>
);

const glassPanel = (from) => ({
  p: 1.75,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: `linear-gradient(135deg, ${from}10, ${from}05)`,
  border: `1px solid ${from}1e`,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: 3,
});

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => axiosInstance.get('/dashboard/stats/').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  });
  const { data: alerts } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: () => axiosInstance.get('/dashboard/alerts/').then(r => r.data),
  });
  const { data: activities } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: () => axiosInstance.get('/dashboard/recent-activities/').then(r => r.data),
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

  const pendingApprovals = (stats?.pending_leave_requests || 0) + (stats?.pending_hr_requests || 0);
  const alertsCount = (alerts?.expiring_documents?.length || 0) + (alerts?.expiring_contracts?.length || 0);

  return (
    <Box sx={{
      height: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Compact greeting */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={800}>
          {t('dashboard.welcome')}، {user?.first_name || user?.username}
        </Typography>
        <Chip size="small" label={t('dashboard_home.total_employees')} color="primary" variant="outlined" />
      </Box>

      {/* Stat cards — 8 compact widgets */}
      <Grid container spacing={1.25}>
        <Grid item xs={6} md={3}>
          <StatCard title={t('dashboard_home.total_employees')} value={stats?.total_active} icon={<PeopleIcon sx={{ color: '#fff', fontSize: 20 }} />} color="#6366f1" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title={t('dashboard_home.new_this_month')} value={stats?.new_this_month} icon={<PersonAddIcon sx={{ color: '#fff', fontSize: 20 }} />} color="#10b981" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title={t('dashboard_home.on_leave_count')} value={stats?.on_leave} icon={<EventBusyIcon sx={{ color: '#fff', fontSize: 20 }} />} color="#f59e0b" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title={t('dashboard_home.retired_this_year')} value={stats?.retired_this_year} icon={<TrendingDownIcon sx={{ color: '#fff', fontSize: 20 }} />} color="#ef4444" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="در انتظار تأیید" value={pendingApprovals} icon={<PendingActionsIcon sx={{ color: '#fff', fontSize: 20 }} />} color="#8b5cf6" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="قرارداد رو به انقضا" value={stats?.expiring_contracts} icon={<FactCheckIcon sx={{ color: '#fff', fontSize: 20 }} />} color="#f97316" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="مدارک منقضی" value={stats?.expired_documents} icon={<WarningAmberIcon sx={{ color: '#fff', fontSize: 20 }} />} color="#f43f5e" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard title="مجموع مدارک" value={stats?.total_documents} icon={<FolderIcon sx={{ color: '#fff', fontSize: 20 }} />} color="#14b8a6" />
        </Grid>
      </Grid>

      {/* Charts + alerts + activities (fills remaining, no scroll) */}
      <Grid container spacing={1.25} sx={{ flex: 1, minHeight: 0, mt: 0.5 }}>
        <Grid item xs={12} md={4} sx={{ display: 'flex', minHeight: 0 }}>
          <Paper sx={glassPanel('#ec4899')}>
            <PanelHeader title="ترکیب جنسیتی" icon={<PeopleIcon sx={{ fontSize: 14 }} />} color="#ec4899" />
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              <DonutChart data={genderData} size={120} thickness={20} centerLabel="نفر" />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4} sx={{ display: 'flex', minHeight: 0 }}>
          <Paper sx={glassPanel('#6366f1')}>
            <PanelHeader title="توزیع دپارتمان" icon={<PeopleIcon sx={{ fontSize: 14 }} />} color="#6366f1" />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <BarChart data={deptData} color="#6366f1" height={150} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4} sx={{ display: 'flex', minHeight: 0 }}>
          <Paper sx={glassPanel('#f59e0b')}>
            <PanelHeader title="هشدارها" icon={<WarningAmberIcon sx={{ fontSize: 14 }} />} color="#f59e0b" />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {alertsCount === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                  هشداری نیست
                </Typography>
              ) : (
                <List dense disablePadding sx={{ overflow: 'hidden' }}>
                  {alerts?.expiring_documents?.slice(0, 3).map(doc => (
                    <ListItem key={`doc-${doc.id}`} disableGutters sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 26 }}>
                        <DescriptionIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2" noWrap>{doc.title}</Typography>}
                        secondary={<Typography variant="caption" noWrap>{doc.employee_name} · {formatPersianNumber(doc.days_left)} روز</Typography>}
                      />
                    </ListItem>
                  ))}
                  {alerts?.expiring_contracts?.slice(0, 2).map(emp => (
                    <ListItem key={`ctr-${emp.id}`} disableGutters sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 26 }}>
                        <AssignmentIcon color="info" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2" noWrap>{emp.full_name}</Typography>}
                        secondary={<Typography variant="caption" noWrap>قرارداد · {toJalali(emp.contract_end_date)}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Box sx={{ borderTop: '1px solid #f59e0b22', pt: 0.75, mt: 0.75 }}>
              <PanelHeader title="فعالیت اخیر" icon={<AssignmentIcon sx={{ fontSize: 14 }} />} color="#10b981" />
              <Box sx={{ overflow: 'hidden' }}>
                {(activities || []).length === 0 ? (
                  <Typography variant="caption" color="textSecondary">فعالیتی ثبت نشده است</Typography>
                ) : (
                  <List dense disablePadding>
                    {activities.slice(0, 3).map(act => (
                      <ListItem key={act.id} disableGutters sx={{ py: 0.15 }}>
                        <ListItemText
                          primary={<Typography variant="body2" noWrap>{act.description}</Typography>}
                          secondary={<Typography variant="caption" noWrap>{act.user} · {act.action}</Typography>}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;