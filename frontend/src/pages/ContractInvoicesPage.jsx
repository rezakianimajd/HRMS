import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Snackbar, Alert, Divider, Switch, FormControlLabel,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import ContractPicker from '../core/components/ui/ContractPicker';
import MoneyInput from '../core/components/ui/MoneyInput';
import { glassPaper } from '../core/theme/tokens';

const EMPTY = {
  id: null, contract: '', number: '', subject: '', date: '', due_date: '',
  currency: '', amount: '', vat: '', is_paid: false, description: '',
};

const ContractInvoicesPage = () => {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const { data: contracts } = useQuery({
    queryKey: ['ext-contracts-inv'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: currencies } = useQuery({
    queryKey: ['currencies-inv'],
    queryFn: () => axiosInstance.get('/currencies/', { params: { page_size: 100 } }).then(r => r.data),
  });
  const currencyList = Array.isArray(currencies) ? currencies : currencies?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['contract-invoices', contractId],
    queryFn: () => axiosInstance.get('/contract-invoices/', { params: { contract: contractId, page_size: 500 } }).then(r => r.data),
    enabled: !!contractId,
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(x =>
      (x.number || '').toLowerCase().includes(q) ||
      (x.subject || '').toLowerCase().includes(q) ||
      (x.description || '').toLowerCase().includes(q));
  }, [list, search]);

  const selCurrency = currencyList.find(c => String(c.id) === String(form.currency));
  const currencyLabel = selCurrency ? selCurrency.name : (contractList.find(c => String(c.id) === String(contractId))?.currency_name || 'ریال');
  const totalCalc = (Number(form.amount) || 0) + (Number(form.vat) || 0);

  const sanitize = (p) => ({
    ...p,
    contract: p.contract || null,
    amount: p.amount === '' || p.amount == null ? 0 : Number(p.amount),
    vat: p.vat === '' || p.vat == null ? 0 : Number(p.vat),
    total: (Number(p.amount) || 0) + (Number(p.vat) || 0),
    date: p.date || null,
    due_date: p.due_date || null,
    currency: p.currency || null,
    is_paid: !!p.is_paid,
  });

  const save = useMutation({
    mutationFn: (p) => {
      const clean = sanitize(p);
      return clean.id
        ? axiosInstance.patch(`/contract-invoices/${clean.id}/`, clean)
        : axiosInstance.post('/contract-invoices/', clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-invoices'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setDialog(false); setForm(EMPTY); setToast('ذخیره شد');
    },
    onError: (e) => {
      const d = e.response?.data;
      let msg = 'خطا در ذخیره';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (Array.isArray(d)) msg = d[0];
        else if (d.detail) msg = d.detail;
        else if (d.error) msg = d.error;
        else if (d.non_field_errors) msg = d.non_field_errors[0];
        else { const first = Object.values(d).flat()[0]; if (first) msg = first; }
      }
      setError(msg);
    },
  });

  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-invoices/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-invoices'] }); setToast('حذف شد'); },
  });

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.12), rgba(99,102,241,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.18)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
          <ReceiptIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#6d28d9">فاکتورهای قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">ثبت فاکتور با مبلغ، مالیات، ارز و وضعیت پرداخت</Typography>
        </Box>
      </Paper>

      {!contractId ? (
        <Paper sx={{ ...glassPaper, p: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
            انتخاب قرارداد ({formatPersianNumber(contractList.length)})
          </Typography>
          <ContractPicker contracts={contractList} onSelect={(c) => setContractId(String(c.id))} height={520} />
        </Paper>
      ) : (
        <>
          <Paper sx={{ ...glassPaper, p: 1.5, mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button size="small" startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => setContractId('')}>تغییر قرارداد</Button>
            <Typography variant="body2" fontWeight={800} sx={{ flex: 1, minWidth: 160 }}>
              {contractList.find(c => String(c.id) === String(contractId))?.subject || 'قرارداد'}
            </Typography>
            <TextField size="small" placeholder="جستجو در فاکتورها..." value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 220 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => { setForm({ ...EMPTY, contract: contractId }); setError(''); setDialog(true); }}
              sx={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', borderRadius: '10px' }}>
              فاکتور جدید
            </Button>
          </Paper>

          {isLoading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
              <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="textSecondary">فاکتوری ثبت نشده است.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filtered.map(x => (
                <Grid item xs={12} md={6} key={x.id}>
                  <Paper sx={{ ...glassPaper, p: 2, position: 'relative', overflow: 'hidden' }}>
                    <Box sx={{ position: 'absolute', top: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.14), transparent 70%)', pointerEvents: 'none' }} />
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ width: 44, height: 44, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
                        <ReceiptIcon sx={{ color: '#fff' }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={800}>{x.subject || x.number || 'فاکتور'}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {x.number ? `شماره: ${x.number} · ` : ''}{toJalali(x.date)}
                        </Typography>
                      </Box>
                      <Chip size="small" icon={x.is_paid ? <CheckCircleIcon /> : null} label={x.is_paid ? 'پرداخت شده' : 'در انتظار'}
                        sx={{ bgcolor: x.is_paid ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: x.is_paid ? '#047857' : '#b45309', fontWeight: 700 }} />
                      <Box>
                        <IconButton size="small" onClick={() => { setForm({ ...x }); setError(''); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این فاکتور؟')) del.mutate(x.id); }}><DeleteIcon fontSize="small" /></IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      <Chip size="small" icon={<AttachMoneyIcon />} label={`مبلغ: ${formatPersianNumber(x.amount || 0)}`} sx={{ bgcolor: 'rgba(139,92,246,0.1)', color: '#6d28d9', fontWeight: 700 }} />
                      <Chip size="small" label={`مالیات: ${formatPersianNumber(x.vat || 0)}`} sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#4338ca', fontWeight: 700 }} />
                      <Chip size="small" label={`کل: ${formatPersianNumber(x.total || 0)} ${x.currency_name || currencyLabel}`} sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#047857', fontWeight: 700 }} />
                      {x.due_date && <Chip size="small" icon={<CalendarMonthIcon />} label={`سررسید: ${toJalali(x.due_date)}`} sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#1d4ed8' }} />}
                    </Box>

                    {x.description && <Typography variant="body2" color="textSecondary">{x.description}</Typography>}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2,
          background: 'linear-gradient(120deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08), rgba(255,255,255,0.4))',
          borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
          <Avatar sx={{ width: 44, height: 44, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 6px 18px rgba(139,92,246,0.4)' }}>
            <ReceiptIcon sx={{ color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800}>{form.id ? 'ویرایش فاکتور' : 'فاکتور جدید'}</Typography>
            <Typography variant="caption" color="textSecondary">ثبت فاکتور با جزئیات مالی و ارز</Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" fontWeight={700} color="#6d28d9" sx={{ mb: 1, display: 'block' }}>اطلاعات پایه</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره فاکتور" value={form.number || ''} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} /></Grid>
              <Grid item xs={12} md={8}><TextField size="small" fullWidth label="شرح فاکتور" value={form.subject || ''} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ فاکتور" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} /></Grid>
              <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ سررسید" value={form.due_date} onChange={(g) => setForm(p => ({ ...p, due_date: g }))} /></Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" fontWeight={700} color="#047857" sx={{ mb: 1, display: 'block' }}>مبالغ و ارز</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl size="small" fullWidth>
                  <InputLabel>واحد ارز</InputLabel>
                  <Select value={form.currency || ''} label="واحد ارز" onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                    <MenuItem value="">—</MenuItem>
                    {currencyList.map(c => <MenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}><MoneyInput size="small" fullWidth label={`مبلغ (${currencyLabel})`} value={form.amount} onChange={(v) => setForm(p => ({ ...p, amount: v }))} /></Grid>
              <Grid item xs={12} md={4}><MoneyInput size="small" fullWidth label={`مالیات (${currencyLabel})`} value={form.vat} onChange={(v) => setForm(p => ({ ...p, vat: v }))} /></Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 1.5, borderRadius: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={700} color="#047857">مبلغ کل</Typography>
                  <Typography variant="h6" fontWeight={800} color="#047857">{formatPersianNumber(totalCalc)} {currencyLabel}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <FormControlLabel control={<Switch checked={!!form.is_paid} onChange={e => setForm(p => ({ ...p, is_paid: e.target.checked }))} />} label={<Typography variant="body2" fontWeight={700}>پرداخت شده</Typography>} />
          <TextField size="small" fullWidth label="توضیحات" multiline rows={2} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(139,92,246,0.12)' }}>
          <Button onClick={() => setDialog(false)} sx={{ borderRadius: '10px' }}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', borderRadius: '10px', px: 3, boxShadow: '0 8px 22px rgba(139,92,246,0.35)' }}>
            {save.isLoading ? <CircularProgress size={20} color="inherit" /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractInvoicesPage;
