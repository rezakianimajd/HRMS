import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Chip, IconButton, InputAdornment,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { glassPaper } from '../core/theme/tokens';

const DISPUTE_TYPES = {
  financial: 'مالی', technical: 'فنی', timeline: 'زمان‌بندی / تأخیر',
  quality: 'کیفیت', legal: 'حقوقی', other: 'سایر',
};

const DISPUTE_STATUS = {
  open: { label: 'باز', color: '#ef4444' },
  under_review: { label: 'در حال بررسی', color: '#f59e0b' },
  resolved: { label: 'حل‌شده', color: '#10b981' },
  escalated: { label: 'ارجاع بالاتر', color: '#8b5cf6' },
  closed: { label: 'بسته', color: '#64748b' },
};

const SEVERITY = {
  low: { label: 'کم', color: '#10b981' },
  medium: { label: 'متوسط', color: '#f59e0b' },
  high: { label: 'زیاد', color: '#f97316' },
  critical: { label: 'بحرانی', color: '#ef4444' },
};

const ContractDisputesPage = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');

  const { data: contracts } = useQuery({
    queryKey: ['ext-contracts-disp'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['contract-disputes'],
    queryFn: () => axiosInstance.get('/contract-disputes/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(d => (d.title || '').toLowerCase().includes(q) || (d.contract_subject || '').toLowerCase().includes(q));
  }, [list, search]);

  const save = useMutation({
    mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-disputes/${p.id}/`, p) : axiosInstance.post('/contract-disputes/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-disputes'] }); setDialog(false); setForm({}); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-disputes/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-disputes'] }),
  });

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.12), rgba(239,68,68,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.18)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#8b5cf6,#ef4444)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
          <GavelIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#7c3aed">اختلافات و دعاوی</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت دعاوی قراردادها، شدت و وضعیت رسیدگی</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm({}); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg,#8b5cf6,#ef4444)', borderRadius: '10px' }}>
          اختلاف جدید
        </Button>
      </Paper>

      <TextField size="small" fullWidth placeholder="جستجو (موضوع، قرارداد)..." value={search}
        onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

      {filtered.length === 0 ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <GavelIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="textSecondary">اختلافی ثبت نشده است.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(d => (
            <Grid item xs={12} md={6} key={d.id}>
              <Paper sx={{ ...glassPaper, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <GavelIcon sx={{ color: SEVERITY[d.severity]?.color }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800}>{d.title}</Typography>
                    <Typography variant="caption" color="textSecondary">{d.contract_subject}</Typography>
                  </Box>
                  <Chip size="small" label={DISPUTE_STATUS[d.status]?.label} sx={{ bgcolor: `${DISPUTE_STATUS[d.status]?.color}22`, color: DISPUTE_STATUS[d.status]?.color, fontWeight: 700 }} />
                  <Chip size="small" label={SEVERITY[d.severity]?.label} sx={{ bgcolor: `${SEVERITY[d.severity]?.color}22`, color: SEVERITY[d.severity]?.color, fontWeight: 700 }} />
                </Box>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="textSecondary">نوع: {DISPUTE_TYPES[d.dispute_type]} · تاریخ: {toJalali(d.opened_date)}</Typography>
                  {d.claim_amount ? <Typography variant="caption" fontWeight={700}>مبلغ ادعا: {formatPersianNumber(d.claim_amount)} ریال</Typography> : null}
                </Stack>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  <IconButton size="small" onClick={() => { setForm({ ...d }); setDialog(true); }}><EditNoteIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(d.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش اختلاف' : 'اختلاف جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth><InputLabel>قرارداد *</InputLabel>
            <Select value={form.contract || ''} label="قرارداد *" onChange={e => setForm(p => ({ ...p, contract: e.target.value }))}>
              {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="موضوع *" value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>نوع</InputLabel>
                <Select value={form.dispute_type || 'other'} label="نوع" onChange={e => setForm(p => ({ ...p, dispute_type: e.target.value }))}>
                  {Object.entries(DISPUTE_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>شدت</InputLabel>
                <Select value={form.severity || 'medium'} label="شدت" onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                  {Object.entries(SEVERITY).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>وضعیت</InputLabel>
                <Select value={form.status || 'open'} label="وضعیت" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {Object.entries(DISPUTE_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField size="small" label="مبلغ ادعا" type="number" value={form.claim_amount ?? ''} onChange={e => setForm(p => ({ ...p, claim_amount: e.target.value }))} /></Grid>
          </Grid>
          <JalaliDatePicker fullWidth label="تاریخ طرح" value={form.opened_date} onChange={(g) => setForm(p => ({ ...p, opened_date: g }))} />
          <TextField size="small" label="شرح" multiline rows={2} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <TextField size="small" label="اقدام / نتیجه" multiline rows={2} value={form.resolution || ''} onChange={e => setForm(p => ({ ...p, resolution: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.title || !form.contract}
            onClick={() => save.mutate({ ...form, claim_amount: form.claim_amount === '' ? null : Number(form.claim_amount) || null, opened_date: form.opened_date || null })}
            sx={{ background: 'linear-gradient(135deg,#8b5cf6,#ef4444)', borderRadius: '10px' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractDisputesPage;
