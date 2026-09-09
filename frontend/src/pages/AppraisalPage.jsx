import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Divider, LinearProgress,
} from '@mui/material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';

const AppraisalPage = () => {
  const qc = useQueryClient();
  const [cycle, setCycle] = useState('');
  const [openCycle, setOpenCycle] = useState(false);
  const [openRecord, setOpenRecord] = useState(false);
  const [cycleForm, setCycleForm] = useState({ title: '', cycle_type: '', start_date: '', end_date: '', description: '' });
  const [recordForm, setRecordForm] = useState({
    employee: '', cycle: '', total_score: '', manager_score: '', self_score: '',
    strengths: '', improvements: '', comments: '', reviewed_by: '',
  });

  const { data: cycles, isLoading: cycleLoading } = useQuery({
    queryKey: ['appraisal-cycles'],
    queryFn: () => axiosInstance.get('/appraisal-cycles/').then(r => r.data),
  });
  const cycleList = Array.isArray(cycles) ? cycles : cycles?.results || [];

  const { data: employees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => axiosInstance.get('/employees/?page_size=100').then(r => r.data),
  });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const { data: records, isLoading: recLoading } = useQuery({
    queryKey: ['appraisal-records', cycle],
    queryFn: () => axiosInstance.get('/appraisal-records/', { params: cycle ? { cycle } : {} }).then(r => r.data),
    enabled: !!cycle,
  });
  const recordList = Array.isArray(records) ? records : records?.results || [];

  const createCycle = useMutation({
    mutationFn: (payload) => axiosInstance.post('/appraisal-cycles/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appraisal-cycles'] });
      setOpenCycle(false);
      setCycleForm({ title: '', cycle_type: '', start_date: '', end_date: '', description: '' });
    },
  });

  const createRecord = useMutation({
    mutationFn: (payload) => axiosInstance.post('/appraisal-records/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appraisal-records'] });
      setOpenRecord(false);
    },
  });

  if (cycleLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;

  const activeCycle = cycleList.find(c => c.id === cycle);

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(59,130,246,0.10), rgba(16,185,129,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.16)', borderRadius: 3,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b82f6, #10b981)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}>
          <AssessmentOutlinedIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#1d4ed8">ارزیابی عملکرد دورهای</Typography>
          <Typography variant="body2" color="textSecondary">دورههای ارزیابی + سابقه امتیاز و اهداف (OKR)</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCycle(true)}
          sx={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', borderRadius: 2, px: 2.5 }}>
          دوره ارزیابی جدید
        </Button>
      </Paper>

      <Grid container spacing={2.5}>
        {/* Cycles list */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.6)' }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>دورههای ارزیابی</Typography>
            <Stack spacing={1}>
              {cycleList.map(c => (
                <Paper
                  key={c.id}
                  onClick={() => setCycle(c.id)}
                  sx={{
                    p: 1.5, cursor: 'pointer', borderRadius: 2.5,
                    border: cycle === c.id ? '1.5px solid #3b82f6' : '1px solid rgba(0,0,0,0.08)',
                    background: cycle === c.id ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  <Typography variant="body2" fontWeight={700}>{c.title}</Typography>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {toJalali(c.start_date)} تا {toJalali(c.end_date)}
                  </Typography>
                  <Chip size="small" label={c.status_display} color={c.status === 'active' ? 'success' : 'default'} variant="outlined" sx={{ mt: 0.5 }} />
                </Paper>
              ))}
              {cycleList.length === 0 && (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
                  هنوز دورهای تعریف نشده است.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Records */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.6)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={800}>
                {activeCycle ? `سوابق دورهٔ «${activeCycle.title}»` : 'انتخاب دوره برای مشاهده سوابق'}
              </Typography>
              {cycle && (
                <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!cycle}
                  onClick={() => { setRecordForm(p => ({ ...p, cycle })); setOpenRecord(true); }}
                  sx={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)' }}>
                  ثبت ارزیابی
                </Button>
              )}
            </Box>

            {!cycle ? (
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                یک دوره ارزیابی را از لیست انتخاب کنید.
              </Typography>
            ) : recLoading ? (
              <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
            ) : recordList.length === 0 ? (
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                هنوز ارزیابیی برای این دوره ثبت نشده است.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {recordList.map(r => (
                  <Paper key={r.id} sx={{ p: 1.5, borderRadius: 2.5, background: 'rgba(255,255,255,0.5)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <EmployeeAvatar employee={{ id: r.employee, full_name: r.employee_name }} size={38} />
                      <Box sx={{ flex: 1, minWidth: 160 }}>
                        <Typography variant="body2" fontWeight={700}>{r.employee_name}</Typography>
                        <Typography variant="caption" color="textSecondary">{r.department} — {r.job_title}</Typography>
                      </Box>
                      <Box sx={{ width: 140 }}>
                        <LinearProgress
                          variant="determinate" value={Number(r.total_score)}
                          sx={{ height: 7, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.06)',
                            '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#3b82f6,#10b981)', borderRadius: 4 } }}
                        />
                        <Typography variant="caption" fontWeight={800}>امتیاز: {formatPersianNumber(r.total_score)} از ۱۰۰</Typography>
                      </Box>
                    </Box>
                    {r.goals && r.goals.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {r.goals.map((g, i) => <Chip key={i} size="small" label={g.title || g} variant="outlined" sx={{ ml: 0.5, mb: 0.5 }} />)}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Cycle dialog */}
      <Dialog open={openCycle} onClose={() => setOpenCycle(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#1d4ed8' }}>دوره ارزیابی جدید</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="عنوان دوره *" value={cycleForm.title}
            onChange={e => setCycleForm(p => ({ ...p, title: e.target.value }))} />
          <TextField fullWidth size="small" label="نوع دوره" value={cycleForm.cycle_type}
            onChange={e => setCycleForm(p => ({ ...p, cycle_type: e.target.value }))} />
          <TextField fullWidth size="small" label="تاریخ شروع" type="date" InputLabelProps={{ shrink: true }} value={cycleForm.start_date}
            onChange={e => setCycleForm(p => ({ ...p, start_date: e.target.value }))} />
          <TextField fullWidth size="small" label="تاریخ پایان" type="date" InputLabelProps={{ shrink: true }} value={cycleForm.end_date}
            onChange={e => setCycleForm(p => ({ ...p, end_date: e.target.value }))} />
          <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={cycleForm.description}
            onChange={e => setCycleForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCycle(false)}>انصراف</Button>
          <Button variant="contained" disabled={!cycleForm.title} onClick={() => createCycle.mutate(cycleForm)}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)' }}>ثبت</Button>
        </DialogActions>
      </Dialog>

      {/* Record dialog */}
      <Dialog open={openRecord} onClose={() => setOpenRecord(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#1d4ed8' }}>ثبت ارزیابی</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>پرسنل *</InputLabel>
            <Select value={recordForm.employee || ''} label="پرسنل *"
              onChange={e => setRecordForm(p => ({ ...p, employee: e.target.value }))}>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <Grid container spacing={1.5}>
            <Grid item xs={4}><TextField size="small" label="امتیاز نهایی (۰-۱۰۰)" type="number" value={recordForm.total_score} onChange={e => setRecordForm(p => ({ ...p, total_score: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="امتیاز مدیر" type="number" value={recordForm.manager_score} onChange={e => setRecordForm(p => ({ ...p, manager_score: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="خودارزیابی" type="number" value={recordForm.self_score} onChange={e => setRecordForm(p => ({ ...p, self_score: e.target.value }))} /></Grid>
          </Grid>
          <TextField fullWidth size="small" label="نقاط قوت" multiline rows={2} value={recordForm.strengths}
            onChange={e => setRecordForm(p => ({ ...p, strengths: e.target.value }))} />
          <TextField fullWidth size="small" label="نقاط بهبود" multiline rows={2} value={recordForm.improvements}
            onChange={e => setRecordForm(p => ({ ...p, improvements: e.target.value }))} />
          <TextField fullWidth size="small" label="نظر نهایی" multiline rows={2} value={recordForm.comments}
            onChange={e => setRecordForm(p => ({ ...p, comments: e.target.value }))} />
          <TextField fullWidth size="small" label="ارزیاب" value={recordForm.reviewed_by}
            onChange={e => setRecordForm(p => ({ ...p, reviewed_by: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRecord(false)}>انصراف</Button>
          <Button variant="contained" disabled={!recordForm.employee || !recordForm.total_score}
            onClick={() => createRecord.mutate({ ...recordForm, total_score: Number(recordForm.total_score) })}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)' }}>ثبت</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppraisalPage;