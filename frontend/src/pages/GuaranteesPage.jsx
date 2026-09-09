import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Tooltip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const TYPE_LABELS = {
  performance: 'ضمانت حسن انجام کار',
  advance: 'ضمانت پیش‌پرداخت',
  bid: 'ضمانت شرکت در مناقصه',
  other: 'سایر',
};

const TYPE_COLORS = {
  performance: '#10b981',
  advance: '#3b82f6',
  bid: '#f59e0b',
  other: '#64748b',
};

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
  borderRadius: 3,
};

const EMPTY = {
  id: null, contract: '', guarantee_type: 'performance', number: '',
  amount: '', issue_date: '', expiry_date: '', bank: '', note: '',
};

const GuaranteesPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['contract-guarantees'],
    queryFn: () => axiosInstance.get('/contract-guarantees/').then(r => r.data),
  });
  const list = Array.isArray(raw) ? raw : raw?.results || [];

  const { data: contracts } = useQuery({
    queryKey: ['external-contracts-all'],
    queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: signatories } = useQuery({
    queryKey: ['signatories'],
    queryFn: () => axiosInstance.get('/signatories/').then(r => r.data),
  });
  const signatoryList = Array.isArray(signatories) ? signatories : signatories?.results || [];

  const save = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`/contract-guarantees/${payload.id}/`, payload)
        : axiosInstance.post('/contract-guarantees/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-guarantees'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setDialog(false);
      setForm(EMPTY);
    },
  });

  const release = useMutation({
    mutationFn: (id) => axiosInstance.post(`/contract-guarantees/${id}/release/`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-guarantees'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-guarantees/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-guarantees'] }),
  });

  const filtered = useMemo(() => {
    if (!search) return list;
    const s = search.trim();
    return list.filter(g =>
      (g.number || '').includes(s) || (g.bank || '').includes(s) ||
      (g.contract_subject || g.contract || '').toString().includes(s));
  }, [list, search]);

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(59,130,246,0.10), rgba(16,185,129,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.16)', borderRadius: 3 }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b82f6, #10b981)', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
          <LockIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#1d4ed8">تضامین و ضمانت‌نامه‌ها</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت کامل تضامین: صدور، انقضا، آزادسازی و پیگیری</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', borderRadius: 2 }}>
          تضمین جدید
        </Button>
      </Paper>

      {/* Search */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2.5, background: 'rgba(255,255,255,0.6)' }}>
        <TextField size="small" placeholder="جستجو: شماره، بانک، قرارداد..." value={search}
          onChange={e => setSearch(e.target.value)} fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
      </Paper>

      {/* Guarantees list */}
      {filtered.length === 0 ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="textSecondary">تضمینی ثبت نشده است.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(g => {
            const color = TYPE_COLORS[g.guarantee_type] || '#64748b';
            const expired = g.expiry_date && new Date(g.expiry_date) < new Date();
            return (
              <Grid item xs={12} md={6} key={g.id}>
                <Paper sx={{ ...glassPaper, p: 2, position: 'relative' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ width: 44, height: 44, background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                      <LockIcon sx={{ color: '#fff' }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={800}>{TYPE_LABELS[g.guarantee_type]}</Typography>
                      <Typography variant="caption" color="textSecondary">{g.number || 'بدون شماره'}</Typography>
                    </Box>
                    {g.is_released ? (
                      <Chip size="small" color="success" icon={<CheckCircleIcon />} label="آزاد شده" />
                    ) : expired ? (
                      <Chip size="small" color="error" icon={<ScheduleIcon />} label="منقضی" />
                    ) : (
                      <Chip size="small" color="warning" icon={<ScheduleIcon />} label="معتبر" />
                    )}
                  </Box>

                  <Stack spacing={0.5}>
                    <Typography variant="body2"><strong>مبلغ:</strong> {formatPersianNumber(g.amount || 0)} ریال</Typography>
                    <Typography variant="body2"><strong>قرارداد:</strong> {g.contract_subject || (g.contract ? `#${g.contract}` : '—')}</Typography>
                    <Typography variant="body2"><strong>بانک:</strong> {g.bank || '—'}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      صدور: {toJalali(g.issue_date)} · انقضا: {toJalali(g.expiry_date)} · آزادسازی: {toJalali(g.release_date)}
                    </Typography>
                  </Stack>

                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                    {!g.is_released && (
                      <Button size="small" variant="contained" startIcon={<LockOpenIcon />} onClick={() => release.mutate(g.id)}
                        sx={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                        آزادسازی
                      </Button>
                    )}
                    <Button size="small" variant="outlined" onClick={() => { setForm({ ...g }); setDialog(true); }}>ویرایش</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => { if (window.confirm('حذف این تضمین؟')) remove.mutate(g.id); }}>حذف</Button>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش تضمین' : 'تضمین جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>قرارداد مرتبط</InputLabel>
            <Select value={form.contract || ''} label="قرارداد مرتبط" onChange={e => setForm(p => ({ ...p, contract: e.target.value }))}>
              {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>نوع تضمین</InputLabel>
            <Select value={form.guarantee_type} label="نوع تضمین" onChange={e => setForm(p => ({ ...p, guarantee_type: e.target.value }))}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="شماره" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
          <TextField size="small" label="مبلغ (ریال)" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <JalaliDatePicker fullWidth label="تاریخ صدور" value={form.issue_date} onChange={(g) => setForm(p => ({ ...p, issue_date: g }))} />
            </Grid>
            <Grid item xs={6}>
              <JalaliDatePicker fullWidth label="تاریخ انقضا" value={form.expiry_date} onChange={(g) => setForm(p => ({ ...p, expiry_date: g }))} />
            </Grid>
          </Grid>
          <TextField size="small" label="بانک صادرکننده" value={form.bank} onChange={e => setForm(p => ({ ...p, bank: e.target.value }))} />
          <TextField size="small" label="یادداشت" multiline rows={2} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.guarantee_type}
            onClick={() => save.mutate({ ...form, amount: Number(form.amount) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#3b82f6,#10b981)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuaranteesPage;