import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Chip, IconButton,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '10px',
};

const RECOMMENDATIONS = {
  approved: { label: 'تأییدشده', color: '#10b981' },
  conditional: { label: 'تأیید مشروط', color: '#f59e0b' },
  suspended: { label: 'تعلیق', color: '#f97316' },
  blacklisted: { label: 'لیست سیاه', color: '#ef4444' },
};

const ContractSettingsPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(100,116,139,0.10), rgba(139,92,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(100,116,139,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#64748b,#8b5cf6)', boxShadow: '0 8px 24px rgba(100,116,139,0.4)' }}>
          <CategoryIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#475569">پیکربندی قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">انواع قرارداد و ارزیابی تأمین‌کنندگان</Typography>
        </Box>
      </Paper>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<CategoryIcon />} label="انواع قرارداد" />
        <Tab icon={<AssessmentIcon />} label="ارزیابی تأمین‌کنندگان" />
      </Tabs>
      {tab === 0 && <ContractTypesManager />}
      {tab === 1 && <EvaluationsManager />}
    </Box>
  );
};

const ContractTypesManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data, isLoading } = useQuery({ queryKey: ['contract-types-master'], queryFn: () => axiosInstance.get('/contract-types-master/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-types-master/${p.id}/`, p) : axiosInstance.post('/contract-types-master/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-types-master'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-types-master/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-types-master'] }) });
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>انواع قرارداد</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => { setForm({}); setDialog(true); }}>افزودن</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(t => (
          <Paper key={t.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={700}>{t.name}</Typography><Typography variant="caption" color="textSecondary">{t.code}</Typography></Box>
            <IconButton size="small" onClick={() => { setForm({ ...t }); setDialog(true); }}><EditNoteIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(t.id); }}><DeleteIcon fontSize="small" /></IconButton>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">نوعی ثبت نشده</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>نوع قرارداد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="کد" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
          <TextField size="small" label="عنوان" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <TextField size="small" label="توضیحات" multiline rows={2} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.name || !form.code} onClick={() => save.mutate(form)} sx={{ background: 'linear-gradient(135deg,#64748b,#8b5cf6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const EvaluationsManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data: parties } = useQuery({ queryKey: ['parties-eval'], queryFn: () => axiosInstance.get('/contract-parties/').then(r => r.data) });
  const partyList = Array.isArray(parties) ? parties : parties?.results || [];
  const { data, isLoading } = useQuery({ queryKey: ['supplier-evaluations'], queryFn: () => axiosInstance.get('/supplier-evaluations/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/supplier-evaluations/${p.id}/`, p) : axiosInstance.post('/supplier-evaluations/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-evaluations'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/supplier-evaluations/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-evaluations'] }) });
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  const scoreField = (key, label) => (
    <TextField size="small" type="number" label={label} value={form[key] ?? ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
  );
  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>ارزیابی تأمین‌کنندگان</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => { setForm({}); setDialog(true); }}>افزودن</Button>
      </Box>
      {list.length === 0 ? <Typography variant="caption" color="textSecondary" textAlign="center">ارزیابی‌ای ثبت نشده</Typography> : (
        <Grid container spacing={2}>
          {list.map(ev => (
            <Grid item xs={12} md={6} key={ev.id}>
              <Paper sx={{ ...glassPaper, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AssessmentIcon sx={{ color: RECOMMENDATIONS[ev.recommendation]?.color }} />
                  <Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={800}>{ev.party_name}</Typography><Typography variant="caption" color="textSecondary">دوره: {ev.period || '—'} · {toJalali(ev.evaluation_date)}</Typography></Box>
                  <Chip size="small" label={RECOMMENDATIONS[ev.recommendation]?.label} sx={{ bgcolor: `${RECOMMENDATIONS[ev.recommendation]?.color}22`, color: RECOMMENDATIONS[ev.recommendation]?.color }} />
                </Box>
                <Chip size="small" label={`امتیاز کل: ${formatPersianNumber(ev.total_score || 0)}`} sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => { setForm({ ...ev }); setDialog(true); }}><EditNoteIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(ev.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ارزیابی تأمین‌کننده</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth><InputLabel>طرف قرارداد *</InputLabel>
            <Select value={form.party || ''} label="طرف قرارداد *" onChange={e => setForm(p => ({ ...p, party: e.target.value }))}>
              {partyList.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Grid container spacing={1.5}>
            <Grid item xs={6}><TextField size="small" label="دوره" value={form.period || ''} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} /></Grid>
            <Grid item xs={6}><JalaliDatePicker fullWidth label="تاریخ ارزیابی" value={form.evaluation_date} onChange={(g) => setForm(p => ({ ...p, evaluation_date: g }))} /></Grid>
            <Grid item xs={6}>{scoreField('quality_score', 'کیفیت (۰-۱۰۰)')}</Grid>
            <Grid item xs={6}>{scoreField('delivery_score', 'تحویل (۰-۱۰۰)')}</Grid>
            <Grid item xs={6}>{scoreField('price_score', 'قیمت (۰-۱۰۰)')}</Grid>
            <Grid item xs={6}>{scoreField('cooperation_score', 'همکاری (۰-۱۰۰)')}</Grid>
            <Grid item xs={6}>{scoreField('safety_score', 'ایمنی (۰-۱۰۰)')}</Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>نتیجه</InputLabel>
                <Select value={form.recommendation || 'approved'} label="نتیجه" onChange={e => setForm(p => ({ ...p, recommendation: e.target.value }))}>
                  {Object.entries(RECOMMENDATIONS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <TextField size="small" label="نقاط قوت" multiline rows={2} value={form.strengths || ''} onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))} />
          <TextField size="small" label="نقاط ضعف" multiline rows={2} value={form.weaknesses || ''} onChange={e => setForm(p => ({ ...p, weaknesses: e.target.value }))} />
          <TextField size="small" label="ارزیاب" value={form.evaluator || ''} onChange={e => setForm(p => ({ ...p, evaluator: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.party} onClick={() => save.mutate({ ...form, quality_score: Number(form.quality_score) || 0, delivery_score: Number(form.delivery_score) || 0, price_score: Number(form.price_score) || 0, cooperation_score: Number(form.cooperation_score) || 0, safety_score: Number(form.safety_score) || 0 })} sx={{ background: 'linear-gradient(135deg,#64748b,#8b5cf6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ContractSettingsPage;
