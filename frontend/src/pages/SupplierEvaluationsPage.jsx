import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Slider,
  FormControl, InputLabel, Select, MenuItem, InputAdornment, IconButton,
  Tooltip, Snackbar, Alert, LinearProgress,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import BlockIcon from '@mui/icons-material/Block';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '16px',
};

const RECOMMENDATIONS = {
  approved: { label: 'تأییدشده', color: '#10b981' },
  conditional: { label: 'تأیید مشروط', color: '#f59e0b' },
  suspended: { label: 'تعلیق', color: '#f97316' },
  blacklisted: { label: 'لیست سیاه', color: '#ef4444' },
};

const CRITERIA = [
  { key: 'quality_score', label: 'کیفیت', color: '#6366f1' },
  { key: 'delivery_score', label: 'تحویل به‌موقع', color: '#0ea5e9' },
  { key: 'price_score', label: 'قیمت', color: '#10b981' },
  { key: 'cooperation_score', label: 'همکاری', color: '#f59e0b' },
  { key: 'safety_score', label: 'ایمنی/HSE', color: '#ef4444' },
];

const SupplierEvaluationsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [recFilter, setRecFilter] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ recommendation: 'approved' });
  const [toast, setToast] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-evaluations'],
    queryFn: () => axiosInstance.get('/supplier-evaluations/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const { data: parties } = useQuery({
    queryKey: ['parties-eval'],
    queryFn: () => axiosInstance.get('/contract-parties/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const partyList = Array.isArray(parties) ? parties : parties?.results || [];

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    return list.filter(ev => {
      const matchQ = !q || (ev.party_name || '').toLowerCase().includes(q) || (ev.period || '').toLowerCase().includes(q) || (ev.evaluator || '').toLowerCase().includes(q);
      const matchR = !recFilter || ev.recommendation === recFilter;
      return matchQ && matchR;
    });
  }, [list, search, recFilter]);

  const save = useMutation({
    mutationFn: (p) => p.id
      ? axiosInstance.patch(`/supplier-evaluations/${p.id}/`, p)
      : axiosInstance.post('/supplier-evaluations/', p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-evaluations'] });
      setDialog(false); setForm({ recommendation: 'approved' }); setToast('ذخیره شد');
    },
  });

  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/supplier-evaluations/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-evaluations'] }); setToast('حذف شد'); },
  });

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const avgTotal = list.length ? (list.reduce((s, e) => s + Number(e.total_score || 0), 0) / list.length) : 0;
  const countBy = (r) => list.filter(e => e.recommendation === r).length;

  const kpi = (title, value, color, icon, suffix = '') => (
    <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
      <Avatar sx={{ width: 44, height: 44, background: `linear-gradient(135deg,${color},${color}99)`, mx: 'auto', mb: 1 }}>{icon}</Avatar>
      <Typography variant="caption" color="textSecondary">{title}</Typography>
      <Typography variant="h5" fontWeight={800} sx={{ color }}>{formatPersianNumber(value)}{suffix}</Typography>
    </Paper>
  );

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(249,115,22,0.12), rgba(99,102,241,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(249,115,22,0.22)', borderRadius: '16px' }}>
        <Avatar sx={{ width: 58, height: 58, background: 'linear-gradient(135deg,#f97316,#6366f1)', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}>
          <AssessmentIcon sx={{ color: '#fff', fontSize: 30 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#c2410c">ارزیابی تأمین‌کنندگان</Typography>
          <Typography variant="body2" color="textSecondary">ارزیابی عملکرد پیمانکاران و فروشندگان بر اساس معیارهای وزنی</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setForm({ recommendation: 'approved' }); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg,#f97316,#6366f1)', borderRadius: '12px', px: 2.5 }}>
          ارزیابی جدید
        </Button>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>{kpi('کل ارزیابی‌ها', list.length, '#6366f1', <AssessmentIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={6} md={3}>{kpi('میانگین امتیاز', avgTotal.toFixed(1), '#0ea5e9', <CheckCircleIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={6} md={3}>{kpi('تأییدشده', countBy('approved'), '#10b981', <CheckCircleIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={6} md={3}>{kpi('لیست سیاه', countBy('blacklisted'), '#ef4444', <BlockIcon sx={{ color: '#fff' }} />)}</Grid>
      </Grid>

      <Paper sx={{ ...glassPaper, p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField size="small" fullWidth placeholder="جستجو (نام طرف، دوره، ارزیاب)..." value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>نتیجه</InputLabel>
            <Select value={recFilter} label="نتیجه" onChange={e => setRecFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {Object.entries(RECOMMENDATIONS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        {filtered.length === 0 ? (
          <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>ارزیابی‌ای ثبت نشده است</Typography>
        ) : (
          <Grid container spacing={2}>
            {filtered.map(ev => (
              <Grid item xs={12} md={6} key={ev.id}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Avatar sx={{ width: 40, height: 40, background: RECOMMENDATIONS[ev.recommendation]?.color }}>
                      <AssessmentIcon sx={{ color: '#fff', fontSize: 20 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={800}>{ev.party_name}</Typography>
                      <Typography variant="caption" color="textSecondary">دوره: {ev.period || '—'} · {toJalali(ev.evaluation_date)}</Typography>
                    </Box>
                    <Chip size="small" label={RECOMMENDATIONS[ev.recommendation]?.label}
                      sx={{ bgcolor: `${RECOMMENDATIONS[ev.recommendation]?.color}22`, color: RECOMMENDATIONS[ev.recommendation]?.color, fontWeight: 700 }} />
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    {CRITERIA.map(c => (
                      <Box key={c.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="caption" sx={{ width: 90, color: 'text.secondary' }}>{c.label}</Typography>
                        <LinearProgress variant="determinate" value={Number(ev[c.key] || 0)} sx={{ flex: 1, height: 7, borderRadius: 4, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { background: c.color, borderRadius: 4 } }} />
                        <Typography variant="caption" fontWeight={700} sx={{ width: 30, textAlign: 'left' }}>{formatPersianNumber(ev[c.key] || 0)}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip size="small" label={`امتیاز کل: ${formatPersianNumber(Number(ev.total_score || 0).toFixed(1))}`}
                      sx={{ bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 700 }} />
                    <Box>
                      <Tooltip title="ویرایش"><IconButton size="small" onClick={() => { setForm({ ...ev }); setDialog(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این ارزیابی؟')) del.mutate(ev.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش ارزیابی' : 'ارزیابی تأمین‌کننده'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth><InputLabel>طرف قرارداد *</InputLabel>
            <Select value={form.party || ''} label="طرف قرارداد *" onChange={e => setForm(p => ({ ...p, party: e.target.value }))}>
              {partyList.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Grid container spacing={1.5}>
            <Grid item xs={6}><TextField size="small" fullWidth label="دوره" value={form.period || ''} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} /></Grid>
            <Grid item xs={6}><JalaliDatePicker fullWidth label="تاریخ ارزیابی" value={form.evaluation_date} onChange={(g) => setForm(p => ({ ...p, evaluation_date: g }))} /></Grid>
          </Grid>
          <Box sx={{ px: 1 }}>
            {CRITERIA.map(c => (
              <Box key={c.key}>
                <Typography variant="caption" color="textSecondary">{c.label}: {formatPersianNumber(Number(form[c.key] || 0))}</Typography>
                <Slider size="small" min={0} max={100} value={Number(form[c.key] || 0)} onChange={(e, v) => setForm(p => ({ ...p, [c.key]: v }))} />
              </Box>
            ))}
          </Box>
          <FormControl size="small" fullWidth><InputLabel>نتیجه</InputLabel>
            <Select value={form.recommendation || 'approved'} label="نتیجه" onChange={e => setForm(p => ({ ...p, recommendation: e.target.value }))}>
              {Object.entries(RECOMMENDATIONS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="نقاط قوت" multiline rows={2} value={form.strengths || ''} onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))} />
          <TextField size="small" label="نقاط ضعف" multiline rows={2} value={form.weaknesses || ''} onChange={e => setForm(p => ({ ...p, weaknesses: e.target.value }))} />
          <TextField size="small" label="ارزیاب" value={form.evaluator || ''} onChange={e => setForm(p => ({ ...p, evaluator: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.party}
            onClick={() => save.mutate({ ...form, quality_score: Number(form.quality_score) || 0, delivery_score: Number(form.delivery_score) || 0, price_score: Number(form.price_score) || 0, cooperation_score: Number(form.cooperation_score) || 0, safety_score: Number(form.safety_score) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#f97316,#6366f1)', borderRadius: '10px' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SupplierEvaluationsPage;
