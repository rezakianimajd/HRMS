import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, Alert,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GavelIcon from '@mui/icons-material/Gavel';
import UndoIcon from '@mui/icons-material/Undo';
import BlockIcon from '@mui/icons-material/Block';
import UpdateIcon from '@mui/icons-material/Update';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const TYPE_LABELS = {
  performance: 'ضمانت حسن انجام کار',
  advance: 'ضمانت پیش‌پرداخت',
  bid: 'ضمانت شرکت در مناقصه',
  other: 'سایر',
};

const INSTRUMENT_LABELS = {
  check: 'چک',
  promissory: 'سفته',
  bank_guarantee: 'ضمانت‌نامه بانکی',
  check_and_guarantee: 'چک + ضمانت‌نامه',
  promissory_and_guarantee: 'سفته + ضمانت‌نامه',
};

const INSTRUMENT_COLORS = {
  check: '#f59e0b',
  promissory: '#8b5cf6',
  bank_guarantee: '#10b981',
  check_and_guarantee: '#3b82f6',
  promissory_and_guarantee: '#ec4899',
};

const ACTION_LABELS = {
  returned: 'استرداد',
  executed: 'اجرا / ضبط',
  canceled: 'ابطال',
  extended: 'تمدید',
};

const ACTION_COLORS = {
  returned: '#10b981',
  executed: '#ef4444',
  canceled: '#f59e0b',
  extended: '#3b82f6',
};

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
  borderRadius: '10px',
};

const EMPTY = {
  id: null, contract: '', guarantee_type: 'performance', instrument_type: 'check',
  number: '', amount: '', issue_date: '', expiry_date: '', bank: '',
  check_number: '', check_bank: '', check_due_date: '',
  promissory_number: '', promissory_due_date: '',
  guarantee_number: '', guarantee_expiry_date: '', note: '',
};

const GuaranteesPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [actionDialog, setActionDialog] = useState(null); // { id, action }
  const [newExpiry, setNewExpiry] = useState('');

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

  const applyLifecycle = useMutation({
    mutationFn: ({ id, action, new_expiry_date }) =>
      axiosInstance.post(`/contract-guarantees/${id}/lifecycle/`, { action, new_expiry_date }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-guarantees'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setActionDialog(null);
      setNewExpiry('');
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
      (g.contract_subject || '').includes(s) || (g.check_number || '').includes(s));
  }, [list, search]);

  const availableActions = (instrumentType) => {
    if (instrumentType === 'check' || instrumentType === 'promissory') {
      return ['returned', 'executed'];
    }
    if (instrumentType === 'bank_guarantee') {
      return ['canceled', 'extended', 'executed'];
    }
    // ترکیبی: همهٔ اقدامات
    return ['returned', 'executed', 'canceled', 'extended'];
  };

  const needsInstrument = (t) => t === 'check' || t === 'check_and_guarantee';
  const needsPromissory = (t) => t === 'promissory' || t === 'promissory_and_guarantee';
  const needsGuarantee = (t) => t === 'bank_guarantee' || t === 'check_and_guarantee' || t === 'promissory_and_guarantee';

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(59,130,246,0.10), rgba(16,185,129,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.16)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b82f6, #10b981)', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
          <LockIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#1d4ed8">تضامین و ضمانت‌نامه‌ها</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت چک، سفته و ضمانت‌نامه با چرخهٔ عمر کامل</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', borderRadius: '10px' }}>
          تضمین جدید
        </Button>
      </Paper>

      {/* Search */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
        <TextField size="small" placeholder="جستجو: شماره، بانک، قرارداد، شماره چک..." value={search}
          onChange={e => setSearch(e.target.value)} fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
      </Paper>

      {/* List */}
      {filtered.length === 0 ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="textSecondary">تضمینی ثبت نشده است.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(g => {
            const color = INSTRUMENT_COLORS[g.instrument_type] || '#64748b';
            const expired = g.expiry_date && new Date(g.expiry_date) < new Date();
            const actions = availableActions(g.instrument_type);
            return (
              <Grid item xs={12} md={6} key={g.id}>
                <Paper sx={{ ...glassPaper, p: 2, position: 'relative' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ width: 44, height: 44, background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                      <LockIcon sx={{ color: '#fff' }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={800}>
                        {INSTRUMENT_LABELS[g.instrument_type] || '—'} · {TYPE_LABELS[g.guarantee_type]}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">{g.number || 'بدون شماره'}</Typography>
                    </Box>
                    {g.last_action === 'returned' ? (
                      <Chip size="small" color="success" icon={<CheckCircleIcon />} label="استرداد شده" />
                    ) : g.last_action === 'executed' ? (
                      <Chip size="small" color="error" icon={<GavelIcon />} label="اجرا / ضبط شده" />
                    ) : g.last_action === 'canceled' ? (
                      <Chip size="small" color="warning" icon={<BlockIcon />} label="ابطال شده" />
                    ) : expired ? (
                      <Chip size="small" color="error" icon={<ScheduleIcon />} label="منقضی" />
                    ) : (
                      <Chip size="small" color="primary" icon={<LockIcon />} label="معتبر" />
                    )}
                  </Box>

                  <Stack spacing={0.5}>
                    <Typography variant="body2"><strong>مبلغ:</strong> {formatPersianNumber(g.amount || 0)} ریال</Typography>
                    <Typography variant="body2"><strong>قرارداد:</strong> {g.contract_subject || '—'}</Typography>
                    {g.check_number && <Typography variant="body2"><strong>شماره چک:</strong> {g.check_number} · بانک: {g.check_bank || '—'}</Typography>}
                    {g.promissory_number && <Typography variant="body2"><strong>شماره سفته:</strong> {g.promissory_number}</Typography>}
                    {g.guarantee_number && <Typography variant="body2"><strong>شماره ضمانت‌نامه:</strong> {g.guarantee_number}</Typography>}
                    <Typography variant="caption" color="textSecondary">
                      صدور: {toJalali(g.issue_date)} · انقضا/سررسید: {toJalali(g.guarantee_expiry_date || g.check_due_date || g.promissory_due_date || g.expiry_date)}
                    </Typography>
                    {g.last_action && (
                      <Typography variant="caption" color="textSecondary">
                        آخرین اقدام: {ACTION_LABELS[g.last_action]} ({toJalali(g.last_action_date)})
                      </Typography>
                    )}
                  </Stack>

                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    {!['returned', 'executed', 'canceled'].includes(g.last_action) && (
                      actions.map(action => (
                        <Button
                          key={action}
                          size="small"
                          variant="contained"
                          startIcon={
                            action === 'returned' ? <UndoIcon /> :
                            action === 'executed' ? <GavelIcon /> :
                            action === 'canceled' ? <BlockIcon /> : <UpdateIcon />
                          }
                          onClick={() => setActionDialog({ id: g.id, action, instrument: g.instrument_type })}
                          sx={{ background: `linear-gradient(135deg, ${ACTION_COLORS[action]}, ${ACTION_COLORS[action]}cc)` }}
                        >
                          {ACTION_LABELS[action]}
                        </Button>
                      ))
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

      {/* Add/Edit dialog with dynamic fields */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش تضمین' : 'تضمین جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>قرارداد مرتبط</InputLabel>
                <Select value={form.contract || ''} label="قرارداد مرتبط" onChange={e => setForm(p => ({ ...p, contract: e.target.value }))}>
                  {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>نوع تضمین</InputLabel>
                <Select value={form.guarantee_type} label="نوع تضمین" onChange={e => setForm(p => ({ ...p, guarantee_type: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl size="small" fullWidth>
                <InputLabel>نوع ابزار تضمین</InputLabel>
                <Select value={form.instrument_type} label="نوع ابزار تضمین" onChange={e => setForm(p => ({ ...p, instrument_type: e.target.value }))}>
                  {Object.entries(INSTRUMENT_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}><TextField size="small" fullWidth label="مبلغ (ریال)" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ صدور" value={form.issue_date} onChange={(g) => setForm(p => ({ ...p, issue_date: g }))} /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" fullWidth label="بانک صادرکننده" value={form.bank} onChange={e => setForm(p => ({ ...p, bank: e.target.value }))} /></Grid>
          </Grid>

          {needsInstrument(form.instrument_type) && (
            <>
              <Typography variant="caption" color="primary" fontWeight={700}>اطلاعات چک</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره چک" value={form.check_number} onChange={e => setForm(p => ({ ...p, check_number: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="بانک چک" value={form.check_bank} onChange={e => setForm(p => ({ ...p, check_bank: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ سررسید چک" value={form.check_due_date} onChange={(g) => setForm(p => ({ ...p, check_due_date: g }))} /></Grid>
              </Grid>
            </>
          )}

          {needsPromissory(form.instrument_type) && (
            <>
              <Typography variant="caption" color="secondary" fontWeight={700}>اطلاعات سفته</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره سفته" value={form.promissory_number} onChange={e => setForm(p => ({ ...p, promissory_number: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ سررسید سفته" value={form.promissory_due_date} onChange={(g) => setForm(p => ({ ...p, promissory_due_date: g }))} /></Grid>
              </Grid>
            </>
          )}

          {needsGuarantee(form.instrument_type) && (
            <>
              <Typography variant="caption" color="success" fontWeight={700}>اطلاعات ضمانت‌نامه</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره ضمانت‌نامه" value={form.guarantee_number} onChange={e => setForm(p => ({ ...p, guarantee_number: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ انقضای ضمانت‌نامه" value={form.guarantee_expiry_date} onChange={(g) => setForm(p => ({ ...p, guarantee_expiry_date: g }))} /></Grid>
              </Grid>
            </>
          )}

          <TextField size="small" label="یادداشت" multiline rows={2} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.guarantee_type}
            onClick={() => save.mutate({ ...form, amount: Number(form.amount) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#3b82f6,#10b981)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>

      {/* Lifecycle action dialog */}
      <Dialog open={!!actionDialog} onClose={() => { setActionDialog(null); setNewExpiry(''); }} maxWidth="xs" fullWidth>
        <DialogTitle>{ACTION_LABELS[actionDialog?.action] || 'اقدام'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {actionDialog?.action === 'extended' && (
            <JalaliDatePicker fullWidth label="تاریخ انقضای جدید" value={newExpiry} onChange={setNewExpiry} />
          )}
          <Typography variant="body2" color="textSecondary">
            این اقدام بر وضعیت تضمین ثبت خواهد شد.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActionDialog(null); setNewExpiry(''); }}>انصراف</Button>
          <Button variant="contained"
            onClick={() => applyLifecycle.mutate({ id: actionDialog.id, action: actionDialog.action, new_expiry_date: newExpiry || null })}
            sx={{ background: `linear-gradient(135deg, ${ACTION_COLORS[actionDialog?.action] || '#3b82f6'}, ${ACTION_COLORS[actionDialog?.action] || '#3b82f6'}cc)` }}>
            تأیید
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuaranteesPage;