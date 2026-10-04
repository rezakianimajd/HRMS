import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Switch,
  FormControl, InputLabel, Select, MenuItem, InputAdornment, IconButton,
  Tooltip, Snackbar, Alert, Stepper, Step, StepLabel,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { formatPersianNumber } from '../core/utils/numberUtils';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '16px',
};

const ContractWorkflowPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [wfDialog, setWfDialog] = useState(false);
  const [wfForm, setWfForm] = useState({ is_active: true });
  const [stepDialog, setStepDialog] = useState(false);
  const [stepForm, setStepForm] = useState({ step: 1, is_active: true });
  const [activeWf, setActiveWf] = useState(null);
  const [toast, setToast] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contract-approval-workflows'],
    queryFn: () => axiosInstance.get('/contract-approval-workflows/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const { data: types } = useQuery({
    queryKey: ['contract-types-wf'],
    queryFn: () => axiosInstance.get('/contract-types-master/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const typeList = Array.isArray(types) ? types : types?.results || [];

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(w => (w.name || '').toLowerCase().includes(q) || (w.description || '').toLowerCase().includes(q));
  }, [list, search]);

  const saveWf = useMutation({
    mutationFn: (p) => p.id
      ? axiosInstance.patch(`/contract-approval-workflows/${p.id}/`, p)
      : axiosInstance.post('/contract-approval-workflows/', p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-approval-workflows'] });
      setWfDialog(false); setWfForm({ is_active: true }); setToast('ذخیره شد');
    },
  });

  const delWf = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-approval-workflows/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-approval-workflows'] }); setToast('حذف شد'); },
  });

  const saveStep = useMutation({
    mutationFn: (p) => p.id
      ? axiosInstance.patch(`/contract-approval-steps/${p.id}/`, p)
      : axiosInstance.post('/contract-approval-steps/', { ...p, workflow: activeWf }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-approval-workflows'] });
      setStepDialog(false); setStepForm({ step: 1, is_active: true }); setToast('مرحله ذخیره شد');
    },
  });

  const delStep = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-approval-steps/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-approval-workflows'] }); setToast('مرحله حذف شد'); },
  });

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const activeCount = list.filter(w => w.is_active).length;
  const totalSteps = list.reduce((s, w) => s + (w.steps?.length || 0), 0);

  const kpi = (title, value, color, icon) => (
    <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
      <Avatar sx={{ width: 44, height: 44, background: `linear-gradient(135deg,${color},${color}99)`, mx: 'auto', mb: 1 }}>{icon}</Avatar>
      <Typography variant="caption" color="textSecondary">{title}</Typography>
      <Typography variant="h5" fontWeight={800} sx={{ color }}>{formatPersianNumber(value)}</Typography>
    </Paper>
  );

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(99,102,241,0.22)', borderRadius: '16px' }}>
        <Avatar sx={{ width: 58, height: 58, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
          <SwapHorizIcon sx={{ color: '#fff', fontSize: 30 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#4338ca">گردش‌کار تأیید قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">تعریف مراحل تأیید و نقش‌های تأییدکننده برای هر نوع قرارداد</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setWfForm({ is_active: true }); setWfDialog(true); }}
          sx={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '12px', px: 2.5 }}>
          گردش‌کار جدید
        </Button>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>{kpi('کل گردش‌کارها', list.length, '#6366f1', <SwapHorizIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={4}>{kpi('فعال', activeCount, '#10b981', <CheckCircleIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={4}>{kpi('کل مراحل', totalSteps, '#8b5cf6', <AccountTreeIcon sx={{ color: '#fff' }} />)}</Grid>
      </Grid>

      <TextField size="small" fullWidth placeholder="جستجوی گردش‌کار..." value={search}
        onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

      {filtered.length === 0 ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">گردش‌کاری تعریف نشده است. برای شروع یک گردش‌کار جدید ایجاد کنید.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(w => {
            const steps = [...(w.steps || [])].sort((a, b) => a.step - b.step);
            return (
              <Grid item xs={12} md={6} key={w.id}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Avatar sx={{ width: 42, height: 42, background: w.is_active ? '#6366f1' : '#94a3b8' }}>
                      <SwapHorizIcon sx={{ color: '#fff', fontSize: 22 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={800}>{w.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {w.contract_type_name ? `نوع قرارداد: ${w.contract_type_name}` : 'همه انواع'} · {w.steps?.length || 0} مرحله
                      </Typography>
                    </Box>
                    <Switch size="small" checked={!!w.is_active} onChange={() => saveWf.mutate({ ...w, is_active: !w.is_active })} color="success" />
                    <Tooltip title="ویرایش"><IconButton size="small" onClick={() => { setWfForm({ ...w }); setWfDialog(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این گردش‌کار؟')) delWf.mutate(w.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </Box>

                  {w.description && <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{w.description}</Typography>}

                  {steps.length === 0 ? (
                    <Typography variant="caption" color="textSecondary">مرحله‌ای تعریف نشده است</Typography>
                  ) : (
                    <Stepper orientation="vertical" connector={null} sx={{ mt: 1 }}>
                      {steps.map(s => (
                        <Step key={s.id} active completed>
                          <StepLabel>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight={700}>{s.step}. {s.title}</Typography>
                              <Chip size="small" label={s.approver_role} sx={{ bgcolor: '#eef2ff', color: '#4f46e5' }} />
                              {s.min_amount != null && s.min_amount !== '' && (
                                <Chip size="small" label={`≥ ${formatPersianNumber(s.min_amount)}`} sx={{ bgcolor: '#fef3c7', color: '#b45309' }} />
                              )}
                              <Tooltip title="ویرایش مرحله"><IconButton size="small" onClick={() => { setActiveWf(w.id); setStepForm({ ...s }); setStepDialog(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="حذف مرحله"><IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این مرحله؟')) delStep.mutate(s.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                            </Box>
                          </StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  )}

                  <Button size="small" startIcon={<AddIcon />} variant="outlined" sx={{ mt: 1 }}
                    onClick={() => { setActiveWf(w.id); setStepForm({ step: steps.length + 1, is_active: true }); setStepDialog(true); }}>
                    افزودن مرحله
                  </Button>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Workflow dialog */}
      <Dialog open={wfDialog} onClose={() => setWfDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{wfForm.id ? 'ویرایش گردش‌کار' : 'گردش‌کار جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" fullWidth label="عنوان گردش‌کار *" value={wfForm.name || ''} onChange={e => setWfForm(p => ({ ...p, name: e.target.value }))} />
          <FormControl size="small" fullWidth><InputLabel>نوع قرارداد</InputLabel>
            <Select value={wfForm.contract_type || ''} label="نوع قرارداد" onChange={e => setWfForm(p => ({ ...p, contract_type: e.target.value }))}>
              <MenuItem value="">همه انواع</MenuItem>
              {typeList.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" fullWidth label="توضیحات" multiline rows={3} value={wfForm.description || ''} onChange={e => setWfForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWfDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!wfForm.name} onClick={() => saveWf.mutate(wfForm)}
            sx={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '10px' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>

      {/* Step dialog */}
      <Dialog open={stepDialog} onClose={() => setStepDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{stepForm.id ? 'ویرایش مرحله' : 'مرحله جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={4}><TextField size="small" fullWidth type="number" label="ترتیب" value={stepForm.step || ''} onChange={e => setStepForm(p => ({ ...p, step: Number(e.target.value) }))} /></Grid>
            <Grid item xs={8}><TextField size="small" fullWidth label="عنوان مرحله *" value={stepForm.title || ''} onChange={e => setStepForm(p => ({ ...p, title: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="نقش / سمت تأییدکننده *" value={stepForm.approver_role || ''} onChange={e => setStepForm(p => ({ ...p, approver_role: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth type="number" label="آستانه مبلغ (ریال) — اختیاری" value={stepForm.min_amount ?? ''} onChange={e => setStepForm(p => ({ ...p, min_amount: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStepDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!stepForm.title || !stepForm.approver_role}
            onClick={() => saveStep.mutate({ ...stepForm, min_amount: stepForm.min_amount === '' || stepForm.min_amount == null ? null : Number(stepForm.min_amount) })}
            sx={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: '10px' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractWorkflowPage;
