import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack, Button, Chip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { glassPaper, STATUS_LABELS, STATUS_COLORS, PageHeader } from './projects/ProjectsShared';

const ProjectsDashboardPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['projects-dashboard'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const projects = Array.isArray(data) ? data : data?.results || [];

  const countBy = (s) => projects.filter(p => p.status === s).length;
  const stats = [
    { label: 'کل پروژه‌ها', value: projects.length, color: '#6366f1', icon: <AccountTreeIcon sx={{ color: '#fff' }} /> },
    { label: 'فعال', value: countBy('active'), color: '#10b981', icon: <PlayCircleIcon sx={{ color: '#fff' }} /> },
    { label: 'تکمیل‌شده', value: countBy('completed'), color: '#3b82f6', icon: <CheckCircleIcon sx={{ color: '#fff' }} /> },
    { label: 'متوقف', value: countBy('on_hold'), color: '#f59e0b', icon: <PauseCircleIcon sx={{ color: '#fff' }} /> },
  ];

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader icon={<DashboardIcon sx={{ color: '#fff', fontSize: 28 }} />}
        title="داشبورد پروژه" subtitle="نمای کلی پروژه‌ها و وضعیت اجرایی آن‌ها" color="#4f46e5" />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {stats.map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
              <Avatar sx={{ width: 44, height: 44, background: `linear-gradient(135deg,${s.color},${s.color}99)`, mx: 'auto', mb: 1 }}>{s.icon}</Avatar>
              <Typography variant="caption" color="textSecondary">{s.label}</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{formatPersianNumber(s.value)}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ ...glassPaper, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={800} color="#7c3aed">پروژه‌های اخیر</Typography>
          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/projects')}>همه پروژه‌ها</Button>
        </Box>
        <Stack spacing={1}>
          {projects.length === 0 && (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={3}>پروژه‌ای ثبت نشده است.</Typography>
          )}
          {projects.slice(0, 6).map(p => (
            <Paper key={p.id} variant="outlined" sx={{ p: 1.5, borderRadius: '10px', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Avatar sx={{ width: 38, height: 38, background: STATUS_COLORS[p.status] || '#64748b' }}>
                <AccountTreeIcon sx={{ color: '#fff', fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography variant="body2" fontWeight={800}>{p.name}</Typography>
                <Typography variant="caption" color="textSecondary">کد: {p.code} · کارفرما: {p.client || '—'}</Typography>
              </Box>
              <Chip size="small" label={STATUS_LABELS[p.status] || p.status} sx={{ color: '#fff', bgcolor: STATUS_COLORS[p.status] || '#64748b' }} />
              <Typography variant="caption" color="textSecondary">{toJalali(p.start_date)}</Typography>
              <Button size="small" onClick={() => navigate(`/projects/${p.id}`)}>پرونده</Button>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};

export default ProjectsDashboardPage;
