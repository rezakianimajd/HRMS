import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Tooltip, Snackbar, Alert, Divider,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import ContractPicker from '../core/components/ui/ContractPicker';
import MoneyInput from '../core/components/ui/MoneyInput';
import { glassPaper } from '../core/theme/tokens';

const EMPTY = {
  id: null, contract: '', number: '', subject: '', date: '',
  currency: '', amount_change: '', percent_change: '', new_end_date: '',
  change_description: '', provisions: [],
};

const ContractAddendumsPage = () => {
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
    queryKey: ['ext-contracts-addendum'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: currencies } = useQuery({
    queryKey: ['currencies-addendum'],
    queryFn: () => axiosInstance.get('/currencies/', { params: { page_size: 100 } }).then(r => r.data),
  });
  const currencyList = Array.isArray(currencies) ? currencies : currencies?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['contract-addendums', contractId],
    queryFn: () => axiosInstance.get('/contract-addendums/', { params: { contract: contractId, page_size: 500 } }).then(r => r.data),
    enabled: !!contractId,
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(a =>
      (a.number || '').toLowerCase().includes(q) ||
      (a.subject || '').toLowerCase().includes(q) ||
      (a.change_description || '').toLowerCase().includes(q));
  }, [list, search]);

  const sanitize = (p) => ({
    ...p,
    contract: p.contract || null,
    amount_change: p.amount_change === '' || p.amount_change == null ? null : Number(p.amount_change),
    percent_change: p.percent_change === '' || p.percent_change == null ? null : Number(p.percent_change),
    date: p.date || null,
    new_end_date: p.new_end_date || null,
    currency: p.currency || null,
    provisions: Array.isArray(p.provisions) ? p.provisions : [],
  });

  const save = useMutation({
    mutationFn: (p) => {
      const clean = sanitize(p);
      return clean.id
        ? axiosInstance.patch(`/contract-addendums/${clean.id}/`, clean)
        : axiosInstance.post('/contract-addendums/', clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-addendums'] });
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
    mutationFn: (id) => axiosInstance.delete(`/contract-addendums/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-addendums'] }); setToast('حذف شد'); },
  });

  const addProvision = () => setForm(p => ({ ...p, provisions: [...(p.provisions || []), { title: '', text: '' }] }));
  const updateProvision = (i, key, val) => setForm(p => ({
    ...p,
    provisions: (p.provisions || []).map((pr, idx) => (idx === i ? { ...pr, [key]: val } : pr)),
  }));
  const removeProvision = (i) => setForm(p => ({ ...p, provisions: (p.provisions || []).filter((_, idx) => idx !== i) }));

  const selCurrency = currencyList.find(c => String(c.id) === String(form.currency));
  const currencyLabel = selCurrency ? selCurrency.name : (contractList.find(c => String(c.id) === String(contractId))?.currency_name || 'ریال');

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(236,72,153,0.12), rgba(139,92,246,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(236,72,153,0.18)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', boxShadow: '0 8px 24px rgba(236,72,153,0.4)' }}>
          <EditNoteIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#be185d">الحاقیه‌های قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">ثبت الحاقیه با مبلغ، ارز، درصد تغییر، مفاد و شرح کامل</Typography>
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
            <TextField size="small" placeholder="جستجو در الحاقیه‌ها..." value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 220 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => { setForm({ ...EMPTY, contract: contractId }); setError(''); setDialog(true); }}
              sx={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', borderRadius: '10px' }}>
              الحاقیه جدید
            </Button>
          </Paper>

          {isLoading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
              <EditNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="textSecondary">الحاقیه‌ای ثبت نشده است.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filtered.map(a => (
                <Grid item xs={12} md={6} key={a.id}>
                  <Paper sx={{ ...glassPaper, p: 2, position: 'relative', overflow: 'hidden' }}>
                    <Box sx={{ position: 'absolute', top: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.14), transparent 70%)', pointerEvents: 'none' }} />
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ width: 44, height: 44, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>
                        <EditNoteIcon sx={{ color: '#fff' }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={800}>{a.subject || a.number || 'الحاقیه'}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {a.number ? `شماره: ${a.number} · ` : ''}{toJalali(a.date)}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => { setForm({ ...a, provisions: a.provisions || [] }); setError(''); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این الحاقیه؟')) del.mutate(a.id); }}><DeleteIcon fontSize="small" /></IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                      {a.amount_change != null && a.amount_change !== '' && (
                        <Chip size="small" icon={<AttachMoneyIcon />} label={`تغییر مبلغ: ${formatPersianNumber(a.amount_change)} ${a.currency_name || currencyLabel}`}
                          sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#047857', fontWeight: 700 }} />
                      )}
                      {a.percent_change != null && a.percent_change !== '' && (
                        <Chip size="small" label={`٪${formatPersianNumber(a.percent_change)}`} sx={{ bgcolor: 'rgba(139,92,246,0.1)', color: '#7c3aed', fontWeight: 700 }} />
                      )}
                      {a.new_end_date && (
                        <Chip size="small" icon={<CalendarMonthIcon />} label={`پایان جدید: ${toJalali(a.new_end_date)}`}
                          sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#1d4ed8', fontWeight: 700 }} />
                      )}
                    </Box>

                    {a.change_description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{a.change_description}</Typography>
                    )}

                    {Array.isArray(a.provisions) && a.provisions.length > 0 && (
                      <Box>
                        <Typography variant="caption" fontWeight={800} color="#be185d" sx={{ mb: 0.5, display: 'block' }}>مفاد ({formatPersianNumber(a.provisions.length)})</Typography>
                        <Stack spacing={0.5}>
                          {a.provisions.map((pr, i) => (
                            <Box key={i} sx={{ p: 1, borderRadius: '8px', background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.12)' }}>
                              <Typography variant="caption" fontWeight={700}>{pr.title}</Typography>
                              {pr.text && <Typography variant="caption" color="textSecondary" display="block">{pr.text}</Typography>}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2,
          background: 'linear-gradient(120deg, rgba(236,72,153,0.12), rgba(139,92,246,0.08), rgba(255,255,255,0.4))',
          borderBottom: '1px solid rgba(236,72,153,0.15)' }}>
          <Avatar sx={{ width: 44, height: 44, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', boxShadow: '0 6px 18px rgba(236,72,153,0.4)' }}>
            <EditNoteIcon sx={{ color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800}>{form.id ? 'ویرایش الحاقیه' : 'الحاقیه جدید'}</Typography>
            <Typography variant="caption" color="textSecondary">ثبت کامل الحاقیه با جزئیات مالی و مفاد</Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" fontWeight={700} color="#be185d" sx={{ mb: 1, display: 'block' }}>اطلاعات پایه</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره الحاقیه" value={form.number || ''} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} /></Grid>
              <Grid item xs={12} md={8}><TextField size="small" fullWidth label="موضوع الحاقیه" value={form.subject || ''} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ الحاقیه" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} /></Grid>
              <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ پایان جدید" value={form.new_end_date} onChange={(g) => setForm(p => ({ ...p, new_end_date: g }))} /></Grid>
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
              <Grid item xs={12} md={4}><MoneyInput size="small" fullWidth label={`تغییر مبلغ (${currencyLabel})`} value={form.amount_change} onChange={(v) => setForm(p => ({ ...p, amount_change: v }))} /></Grid>
              <Grid item xs={12} md={4}><TextField size="small" fullWidth type="number" label="درصد تغییر (٪)" value={form.percent_change ?? ''} onChange={e => setForm(p => ({ ...p, percent_change: e.target.value }))} /></Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="#7c3aed">مفاد / بندهای الحاقیه</Typography>
              <Button size="small" startIcon={<AddCircleIcon />} onClick={addProvision} sx={{ color: '#7c3aed' }}>افزودن بند</Button>
            </Box>
            {(form.provisions || []).length === 0 ? (
              <Typography variant="caption" color="textSecondary">بندی تعریف نشده است.</Typography>
            ) : (
              <Stack spacing={1}>
                {(form.provisions || []).map((pr, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 1.25, borderRadius: '10px', background: 'rgba(139,92,246,0.04)', borderColor: 'rgba(139,92,246,0.25)' }}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" fullWidth label="عنوان بند" value={pr.title || ''} onChange={e => updateProvision(i, 'title', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={7}>
                        <TextField size="small" fullWidth label="متن بند" value={pr.text || ''} onChange={e => updateProvision(i, 'text', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={1}>
                        <IconButton size="small" color="error" onClick={() => removeProvision(i)}><RemoveCircleIcon fontSize="small" /></IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Divider />

          <TextField size="small" fullWidth label="شرح تغییرات" multiline rows={3} value={form.change_description || ''} onChange={e => setForm(p => ({ ...p, change_description: e.target.value }))} />

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(236,72,153,0.12)' }}>
          <Button onClick={() => setDialog(false)} sx={{ borderRadius: '10px' }}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', borderRadius: '10px', px: 3, boxShadow: '0 8px 22px rgba(236,72,153,0.35)' }}>
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

export default ContractAddendumsPage;
