import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, LinearProgress
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import useAuth from '../core/hooks/useAuth';
import useCompany from '../core/hooks/useCompany';

const StatCard = ({ title, value, icon, color }) => (
  <Grid item xs={12} sm={6} md={3}>
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{
            backgroundColor: `${color}20`,
            borderRadius: 2,
            p: 1,
            mr: 2,
            display: 'flex',
          }}>
            {icon}
          </Box>
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">
          {value}
        </Typography>
      </CardContent>
      <LinearProgress
        variant="determinate"
        value={Math.min(Number(value) || 0, 100)}
        sx={{ height: 4, backgroundColor: `${color}20`, '& .MuiLinearProgress-bar': { backgroundColor: color } }}
      />
    </Card>
  </Grid>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentCompany } = useCompany();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('dashboard.welcome')}، {user?.first_name || user?.username}
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        {currentCompany?.name && `${t('company.current')}: ${currentCompany.name}`}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <StatCard
          title={t('dashboard.totalEmployees')}
          value="0"
          icon={<PeopleIcon sx={{ color: '#1976d2' }} />}
          color="#1976d2"
        />
        <StatCard
          title={t('dashboard.activeLeaves')}
          value="0"
          icon={<EventBusyIcon sx={{ color: '#ed6c02' }} />}
          color="#ed6c02"
        />
        <StatCard
          title={t('dashboard.pendingApprovals')}
          value="0"
          icon={<PendingActionsIcon sx={{ color: '#9c27b0' }} />}
          color="#9c27b0"
        />
        <StatCard
          title={t('dashboard.monthlyPayroll')}
          value="0"
          icon={<AttachMoneyIcon sx={{ color: '#2e7d32' }} />}
          color="#2e7d32"
        />
      </Grid>

      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('dashboard.recentActivities')}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t('common.noData')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;