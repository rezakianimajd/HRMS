import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack,
  FormControl, InputLabel, Select, MenuItem, LinearProgress,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LockIcon from '@mui/icons-material/Lock';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { formatPersianNumber } from '../core/utils/numberUtils';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '10px',
};

const AnalyticsPage = () => {
  const [projectId, setProjectId] = useState('');

  const { data: projects } = useQuery({ queryKey: ['projects-analytics'], queryFn: () => axiosInstance.get('/projects/').then(r => r.data) });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics-cost-summary', projectId],
    queryFn: () => axiosInstance.get('/analytics/cost-summary/', { params: { project: projectId } }).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: wbsData } = useQuery({
    queryKey: ['analytics-cost-by-wbs', projectId],
    queryFn: () => axiosInstance.get('/analytics/cost-by-wbs/', { params: { project: projectId } }).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: cbsData } = useQuery({
    queryKey: ['analytics-cost-by-cbs', projectId],
    queryFn: () => axiosInstance.get('/analytics/cost-by-cbs/', { params: { project: projectId } }).then(r => r.data),
    enabled: !!projectId,
  });

  const wbsRows = Array.isArray(wbsData) ? wbsData : [];
  const cbsRows = Array.isArray(cbsData) ? cbsData : [];

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(99,102,241,0.10), rgba(16,185,129,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(99,102,241,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#6366f1,#10b981)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
          <InsightsIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#4338ca">ع¯ط²ط§ط±ط´ ظˆ ع©ظ†طھط±ظ„ ظ¾ط±ظˆعکظ‡</Typography>
          <Typography variant="body2" color="textSecondary">ظپط§ط² غ³ â€” ط¨ظˆط¯ط¬ظ‡ ط¯ط± ط¨ط±ط§ط¨ط± ظˆط§ظ‚ط¹غŒطŒ طھط¹ظ‡ط¯طŒ ظ¾غŒط´ط±ظپطھ ظˆ طھط­ظ„غŒظ„ WBS/CBS</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>ظ¾ط±ظˆعکظ‡</InputLabel>
          <Select value={projectId || ''} label="ظ¾ط±ظˆعکظ‡" onChange={e => setProjectId(e.target.value)}>
            {projectList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {!projectId ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">ظ¾ط±ظˆعکظ‡ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯.</Typography>
        </Paper>
      ) : summaryLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : (
        <Box>
          {/* Summary KPI */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={2.4}>
              <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                <AccountBalanceWalletIcon color="primary" />
                <Typography variant="caption" color="textSecondary">ط¨ظˆط¯ط¬ظ‡</Typography>
                <Typography variant="h6" fontWeight={800}>{formatPersianNumber(summary.budget)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                <LockIcon color="secondary" />
                <Typography variant="caption" color="textSecondary">طھط¹ظ‡ط¯</Typography>
                <Typography variant="h6" fontWeight={800}>{formatPersianNumber(summary.committed)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                <ReceiptIcon color="error" />
                <Typography variant="caption" color="textSecondary">ظ‡ط²غŒظ†ظ‡ ظˆط§ظ‚ط¹غŒ</Typography>
                <Typography variant="h6" fontWeight={800} color="error">{formatPersianNumber(summary.actual)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                <TrendingUpIcon color="success" />
                <Typography variant="caption" color="textSecondary">ظ¾غŒط´â€Œط¨غŒظ†غŒ</Typography>
                <Typography variant="h6" fontWeight={800}>{formatPersianNumber(summary.forecast)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                <InsightsIcon color="warning" />
                <Typography variant="caption" color="textSecondary">ط§ظ†ط­ط±ط§ظپ</Typography>
                <Typography variant="h6" fontWeight={800} color={summary.variance >= 0 ? 'success.main' : 'error.main'}>
                  {formatPersianNumber(summary.variance)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* WBS breakdown */}
          <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>طھط­ظ„غŒظ„ ط¨ط± ط§ط³ط§ط³ WBS</Typography>
            {wbsRows.length === 0 ? (
              <Typography variant="caption" color="textSecondary">ع¯ط±ظ‡ WBS طھط¹ط±غŒظپ ظ†ط´ط¯ظ‡ ط§ط³طھ.</Typography>
            ) : (
              <Stack spacing={1}>
                {wbsRows.map(w => (
                  <Box key={w.wbs_id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>{w.code} - {w.name}</Typography>
                      <Typography variant="caption">ط¨ظˆط¯ط¬ظ‡: {formatPersianNumber(w.budget)} آ· ظˆط§ظ‚ط¹غŒ: {formatPersianNumber(w.actual)}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={w.budget ? Math.min(100, (w.actual / w.budget) * 100) : 0}
                      color={w.actual > w.budget ? 'error' : 'primary'}
                      sx={{ height: 6, borderRadius: '10px' }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          {/* CBS breakdown */}
          <Paper sx={{ ...glassPaper, p: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>طھط­ظ„غŒظ„ ط¨ط± ط§ط³ط§ط³ CBS</Typography>
            {cbsRows.length === 0 ? (
              <Typography variant="caption" color="textSecondary">ع¯ط±ظ‡ CBS طھط¹ط±غŒظپ ظ†ط´ط¯ظ‡ ط§ط³طھ.</Typography>
            ) : (
              <Stack spacing={1}>
                {cbsRows.map(c => (
                  <Box key={c.cbs_id}>
                    <Typography variant="body2" fontWeight={700}>{c.code} - {c.name}</Typography>
                    <Typography variant="caption">ظ‡ط²غŒظ†ظ‡: {formatPersianNumber(c.actual)}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default AnalyticsPage;