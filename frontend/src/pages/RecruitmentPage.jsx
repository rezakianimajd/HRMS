import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Divider, IconButton, Tooltip, Alert,
} from '@mui/material';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const STAGE_LABELS = {
  applied: 'دریافت رزومه',
  screening: 'غربالگری',
  interview: 'مصاحبه',
  assessment: 'ارزیابی فنی',
  offer: 'پیشنهاد همکاری',
  hired: 'استخدام شده',
  rejected: 'رد شده',
};

const STAGE_COLORS = {
  applied: '#64748b', screening: '#0ea5e9', interview: '#f59e0b',
  assessment: '#8b5cf6', offer: '#10b981', hired: '#16a34a', rejected: '#ef4444',
};

const STAGE_FLOW = ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired'];

const RecruitmentPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [openReq, setOpenReq] = useState(false);
  const [reqForm, setReqForm] = useState({ title: '', headcount: 1, department: '', job_title: '', reason: '' });

  const { data: reqs, isLoading: reqsLoading } = useQuery({
    queryKey: ['job-requisitions'],
    queryFn: () => axiosInstance.get('/job-requisitions/').then(r => r.data),
  });
  const requisitions = Array.isArray(reqs) ? reqs : reqs?.results || [];

  const { data: candidates, isLoading: candLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => axiosInstance.get('/candidates/').then(r => r.data),
  });
  const candList = Array.isArray(candidates) ? candidates : candidates?.results || [];

  const createReq = useMutation({
    mutationFn: (payload) => axiosInstance.post('/job-requisitions/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-requisitions'] });
      setOpenReq(false);
      setReqForm({ title: '', headcount: 1, department: '', job_title: '', reason: '' });
    },
  });

  const moveStage = useMutation({
    mutationFn: ({ id, stage }) => axiosInstance.post(`/candidates/${id}/move_stage/`, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }),
  });

  const isLoading = reqsLoading || candLoading;
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;

  const stageCounts = STAGE_FLOW.map(s => ({ stage: s, count: candList.filter(c => c.stage === s).length }));

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(14,165,233,0.10), rgba(139,92,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(14,165,233,0.16)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}>
          <WorkOutlineIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#0369a1">جذب و استخدام</Typography>
          <Typography variant="body2" color="textSecondary">درخواست استخدام ← کاندید ← مصاحبه ← استخدام (پایپلاین کامل)</Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setOpenReq(true)}
          sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px', px: 2.5 }}>
          درخواست استخدام جدید
        </Button>
      </Paper>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`درخواست‌های استخدام (${toPersianDigits(requisitions.length)})`} />
        <Tab label={`کانبان کاندیدها (${toPersianDigits(candList.length)})`} />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2}>
          {requisitions.map(r => (
            <Grid item xs={12} md={6} key={r.id}>
              <Paper sx={{ p: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={800}>{r.title}</Typography>
                  <Chip size="small" label={r.status_display} color={r.status === 'open' ? 'success' : 'default'} variant="outlined" />
                </Box>
                <Typography variant="caption" color="textSecondary" display="block">
                  {r.department_name || '—'} · نیاز: {formatPersianNumber(r.headcount)} نفر · کاندید: {formatPersianNumber(r.candidates_count || 0)}
                </Typography>
                {r.reason && <Typography variant="body2" sx={{ mt: 1 }}>{r.reason}</Typography>}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 1 && (
        <Box>
          <Paper sx={{ p: 1.5, mb: 2, borderRadius: '10px', display: 'flex', gap: 1, flexWrap: 'wrap', background: 'rgba(255,255,255,0.6)' }}>
            {stageCounts.map(s => (
              <Chip key={s.stage} label={`${STAGE_LABELS[s.stage]}: ${formatPersianNumber(s.count)}`}
                sx={{ bgcolor: `${STAGE_COLORS[s.stage]}18`, color: STAGE_COLORS[s.stage], fontWeight: 700 }} />
            ))}
          </Paper>

          <Grid container spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            {STAGE_FLOW.map(stage => {
              const inStage = candList.filter(c => c.stage === stage);
              return (
                <Grid item xs={12} sm={6} md={4} lg={2.4} key={stage}>
                  <Paper sx={{ p: 1.25, borderRadius: '10px', minHeight: 200, background: 'rgba(255,255,255,0.55)' }}>
                    <Typography variant="caption" fontWeight={800} sx={{ color: STAGE_COLORS[stage], mb: 1, display: 'block' }}>
                      {STAGE_LABELS[stage]}
                    </Typography>
                    <Stack spacing={1}>
                      {inStage.map(c => (
                        <Paper key={c.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', borderColor: `${STAGE_COLORS[stage]}44` }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{c.full_name}</Typography>
                          {c.rating > 0 && <Typography variant="caption" color="textSecondary">امتیاز: {formatPersianNumber(c.rating)}</Typography>}
                          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                            {stage !== 'hired' && stage !== 'rejected' && (
                              <IconButton size="small" color="primary" onClick={() => {
                                const idx = STAGE_FLOW.indexOf(stage);
                                if (idx < STAGE_FLOW.length - 1) moveStage.mutate({ id: c.id, stage: STAGE_FLOW[idx + 1] });
                              }}>
                                <ArrowForwardIcon fontSize="small" />
                              </IconButton>
                            )}
                            {stage !== 'rejected' && stage !== 'hired' && (
                              <IconButton size="small" color="error" onClick={() => moveStage.mutate({ id: c.id, stage: 'rejected' })}>
                                <DescriptionIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Paper>
                      ))}
                      {inStage.length === 0 && (
                        <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>—</Typography>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* New requisition dialog */}
      <Dialog open={openReq} onClose={() => setOpenReq(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#0369a1' }}>درخواست استخدام جدید</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="عنوان شغلی *" value={reqForm.title}
            onChange={e => setReqForm(p => ({ ...p, title: e.target.value }))} />
          <TextField fullWidth size="small" label="تعداد نیرو" type="number" value={reqForm.headcount}
            onChange={e => setReqForm(p => ({ ...p, headcount: e.target.value }))} />
          <TextField fullWidth size="small" label="دلیل استخدام" multiline rows={2} value={reqForm.reason}
            onChange={e => setReqForm(p => ({ ...p, reason: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReq(false)}>انصراف</Button>
          <Button variant="contained" disabled={!reqForm.title} onClick={() => createReq.mutate(reqForm)}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' }}>ثبت</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecruitmentPage;