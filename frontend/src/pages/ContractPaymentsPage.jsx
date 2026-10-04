import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Snackbar, Alert, Divider,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import ContractPicker from '../core/components/ui/ContractPicker';
import MoneyInput from '../core/components/ui/MoneyInput';
import { glassPaper } from '../core/theme/tokens';

const EMPTY = {
  id: null, contract: '', invoice: '', date: '', currency: '',
  amount: '', reference: '', method: '', note: '',
};

const ContractPaymentsPage = () => {
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
    queryKey: ['ext-contracts-pay'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: currencies } = useQuery({
    queryKey: ['currencies-pay'],
    queryFn: () => axiosInstance.get('/currencies/', { params: { page_size: 100 } }).then(r => r.data),
  });
  const currencyList = Array.isArray(currencies) ? currencies : currencies?.results || [];

  const { data: invoices } = useQuery({
    queryKey: ['invoices-pay', contractId],
    queryFn: () => axiosInstance.get('/contract-invoices/', { params: { contract: contractId, page_size: 500 } }).then(r => r.data),
    enabled: !!contractId,
  });
  const invoiceList = Array.isArray(invoices) ? invoices : invoices?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['contract-payments', contractId],
    queryFn: () => axiosInstance.get('/contract-payments/', { params: { contract: contractId, page_size: 500 } }).then(r => r.data),
    enabled: !!contractId,
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(x =>
      (x.reference || '').toLowerCase().includes(q) ||
      (x.method || '').toLowerCase().includes(q) ||
      (x.note || '').toLowerCase().includes(q) ||
      (x.invoice_number || '').toLowerCase().includes(q));
  }, [list, search]);

  const selCurrency = currencyList.find(c => String(c.id) === String(form.currency));
  const currencyLabel = selCurrency ? selCurrency.name : (contractList.find(c => String(c.id) === String(contractId))?.currency_name || 'ریال');

  const sanitize = (p) => ({
    ...p,
    contract: p.contract || null,
    invoice: p.invoice || null,
    amount: p.amount === '' || p.amount == null ? 0 : Number(p.amount),
    date: p.date || null,
    currency: p.currency || null,
  });

  const save = useMutation({
    mutationFn: (p) => {
      const clean = sanitize(p);
      return clean.id
        ? axiosInstance.patch(`/contract-payments/${clean.id}/`, clean)
        : axiosInstance.post('/contract-payments/', clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-payments'] });
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
    mutationFn: (id) => axiosInstance.delete(`/contract-payments/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-payments'] }); setToast('حذف شد'); },
  });

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(16,185,129,0.12), rgba(20,184,166,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.18)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#10b981,#14b8a6)', boxShadow: '0 8px 24px rgba(16,185,129,0.4)' }}>
          <PaymentsIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#047857">پرداخت‌های قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">ثبت پرداخت با مبلغ، ارز، مرجع، روش و فاکتور مرتبط</Typography>
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
            <TextField size="small" placeholder="جستجو در پرداخت‌ها..." value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 220 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => { setForm({ ...EMPTY, contract: contractId }); setError(''); setDialog(true); }}
              sx={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)', borderRadius: '10px' }}>
              پرداخت جدید
            </Button>
          </Paper>

          {isLoading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
              <PaymentsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="textSecondary">پرداختی ثبت نشده است.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filtered.map(x => (
                <Grid item xs={12} md={6} key={x.id}>
                  <Paper sx={{ ...glassPaper, p: 2, position: 'relative', overflow: 'hidden' }}>
                    <Box sx={{ position: 'absolute', top: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.14), transparent 70%)', pointerEvents: 'none' }} />
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ width: 44, height: 44, background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
                        <PaymentsIcon sx={{ color: '#fff' }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={800}>{formatPersianNumber(x.amount || 0)} {x.currency_name || currencyLabel}</Typography>
                        <Typography variant="caption" color="textSecondary">{toJalali(x.date)}</Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => { setForm({ ...x }); setError(''); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این پرداخت؟')) del.mutate(x.id); }}><DeleteIcon fontSize="small" /></IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      {x.reference && <Chip size="small" icon={<AccountBalanceWalletIcon />} label={`مرجع: ${x.reference}`} sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#047857', fontWeight: 700 }} />}
                      {x.method && <Chip size="small" label={`روش: ${x.method}`} sx={{ bgcolor: 'rgba(20,184,166,0.1)', color: '#0f766e', fontWeight: 700 }} />}
                      {x.invoice_number && <Chip size="small" label={`فاکتور: ${x.invoice_number}`} sx={{ bgcolor: 'rgba(139,92,246,0.1)', color: '#6d28d9', fontWeight: 700 }} />}
                    </Box>

                    {x.note && <Typography variant="body2" color="textSecondary">{x.note}</Typography>}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2,
          background: 'linear-gradient(120deg, rgba(16,185,129,0.12), rgba(20,184,166,0.08), rgba(255,255,255,0.4))',
          borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
          <Avatar sx={{ width: 44, height: 44, background: 'linear-gradient(135deg,#10b981,#14b8a6)', boxShadow: '0 6px 18px rgba(16,185,129,0.4)' }}>
            <PaymentsIcon sx={{ color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800}>{form.id ? 'ویرایش پرداخت' : 'پرداخت جدید'}</Typography>
            <Typography variant="caption" color="textSecondary">ثبت پرداخت با مبلغ، ارز و روش</Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" fontWeight={700} color="#047857" sx={{ mb: 1, display: 'block' }}>اطلاعات پرداخت</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ پرداخت" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} /></Grid>
              <Grid item xs={12} md={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>فاکتور مرتبط</InputLabel>
                  <Select value={form.invoice || ''} label="فاکتور مرتبط" onChange={e => setForm(p => ({ ...p, invoice: e.target.value }))}>
                    <MenuItem value="">—</MenuItem>
                    {invoiceList.map(inv => <MenuItem key={inv.id} value={inv.id}>{inv.number || inv.subject}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" fontWeight={700} color="#6d28d9" sx={{ mb: 1, display: 'block' }}>مبلغ و ارز</Typography>
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
              <Grid item xs={12} md={8}><MoneyInput size="small" fullWidth label={`مبلغ (${currencyLabel})`} value={form.amount} onChange={(v) => setForm(p => ({ ...p, amount: v }))} /></Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" fontWeight={700} color="#0f766e" sx={{ mb: 1, display: 'block' }}>مرجع و روش</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره مرجع / سند" value={form.reference || ''} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField size="small" fullWidth label="روش پرداخت" value={form.method || ''} onChange={e => setForm(p => ({ ...p, method: e.target.value }))} /></Grid>
              <Grid item xs={12}><TextField size="small" fullWidth label="توضیحات" multiline rows={2} value={form.note || ''} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></Grid>
            </Grid>
          </Box>

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(16,185,129,0.12)' }}>
          <Button onClick={() => setDialog(false)} sx={{ borderRadius: '10px' }}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)', borderRadius: '10px', px: 3, boxShadow: '0 8px 22px rgba(16,185,129,0.35)' }}>
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

export default ContractPaymentsPage;
