import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Divider, IconButton, Tooltip,
  InputAdornment, ListItemIcon, Alert, Switch, LinearProgress,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';

const PARTY_TYPES = {
  contractor: { label: 'پیمانکار', color: '#f97316' },
  supplier: { label: 'فروشنده / تأمین‌کننده', color: '#10b981' },
  consultant: { label: 'مشاور', color: '#6366f1' },
  other: { label: 'سایر', color: '#64748b' },
};

const EMPTY_FORM = {
  id: null, name: '', party_type: 'contractor', national_id: '', economic_code: '',
  registration_number: '', phone: '', mobile: '', email: '', address: '',
  contact_person: '', bank_name: '', account_number: '', sheba_number: '', description: '',
};

const ContractPartiesPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contract-parties'],
    queryFn: () => axiosInstance.get('/contract-parties/').then(r => r.data),
  });
  const parties = Array.isArray(data) ? data : data?.results || [];

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['contract-parties-summary', selected?.id],
    queryFn: () => axiosInstance.get(`/contract-parties/${selected.id}/summary/`).then(r => r.data),
    enabled: !!selected?.id,
  });

  const save = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`/contract-parties/${payload.id}/`, payload)
        : axiosInstance.post('/contract-parties/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-parties'] });
      qc.invalidateQueries({ queryKey: ['contract-parties-summary'] });
      setDialog(false);
      setForm(EMPTY_FORM);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-parties/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-parties'] });
      setSelected(null);
    },
  });

  const toggle = useMutation({
    mutationFn: (id) => axiosInstance.post(`/contract-parties/${id}/toggle_status/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-parties'] }),
  });

  const filtered = useMemo(() => {
    let list = parties;
    if (typeFilter) list = list.filter(p => p.party_type === typeFilter);
    if (search) {
      const s = search.trim();
      list = list.filter(p =>
        (p.name || '').includes(s) || (p.mobile || '').includes(s) ||
        (p.national_id || '').includes(s) || (p.contact_person || '').includes(s)
      );
    }
    return list;
  }, [parties, search, typeFilter]);

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const infoItem = (icon, label, value) => value ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ListItemIcon sx={{ minWidth: 24 }}>{icon}</ListItemIcon>
      <Typography variant="caption" color="textSecondary">{label}:</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  ) : null;

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(14,165,233,0.10), rgba(99,102,241,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(14,165,233,0.16)', borderRadius: 3 }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', boxShadow: '0 8px 24px rgba(14,165,233,0.4)' }}>
          <StorefrontIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#0369a1">پیمانکاران و فروشندگان</Typography>
          <Typography variant="body2" color="textSecondary">پروندهٔ کامل طرف‌های قرارداد با جزئیات حقوقی، بانکی و سوابق</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY_FORM); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', borderRadius: 2 }}>
          افزودن طرف
        </Button>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2.5, display: 'flex', gap: 1, flexWrap: 'wrap', background: 'rgba(255,255,255,0.6)' }}>
        <TextField size="small" placeholder="جستجو: نام، کد، موبایل..." value={search}
          onChange={e => setSearch(e.target.value)} sx={{ minWidth: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        <Stack direction="row" spacing={0.5}>
          <Chip label="همه" variant={typeFilter === '' ? 'filled' : 'outlined'} color="primary" onClick={() => setTypeFilter('')} />
          {Object.entries(PARTY_TYPES).map(([k, v]) => (
            <Chip key={k} label={v.label} variant={typeFilter === k ? 'filled' : 'outlined'}
              sx={{ color: typeFilter === k ? '#fff' : v.color, bgcolor: typeFilter === k ? v.color : 'transparent', borderColor: v.color }}
              onClick={() => setTypeFilter(typeFilter === k ? '' : k)} />
          ))}
        </Stack>
      </Paper>

      <Grid container spacing={2.5}>
        {/* List */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
            {filtered.length === 0 ? (
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>طرف قراردادی ثبت نشده است.</Typography>
            ) : (
              <Stack spacing={1.25}>
                {filtered.map(p => {
                  const type = PARTY_TYPES[p.party_type] || PARTY_TYPES.other;
                  return (
                    <Paper
                      key={p.id}
                      onClick={() => setSelected(p)}
                      sx={{
                        p: 1.75, cursor: 'pointer', borderRadius: 2.5,
                        border: selected?.id === p.id ? `1.5px solid ${type.color}` : '1px solid rgba(0,0,0,0.07)',
                        background: selected?.id === p.id ? `${type.color}0f` : 'rgba(255,255,255,0.5)',
                        '&:hover': { borderColor: type.color, transform: 'translateX(-3px)' },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 42, height: 42, background: type.color }}><StorefrontIcon sx={{ color: '#fff' }} /></Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>{p.name}</Typography>
                          <Typography variant="caption" color="textSecondary">{type.label}{p.contact_person ? ` · ${p.contact_person}` : ''}</Typography>
                        </Box>
                        <Chip size="small" label={p.is_active !== false ? 'فعال' : 'غیرفعال'} color={p.is_active !== false ? 'success' : 'default'} variant="outlined" />
                        <Typography variant="caption" fontWeight={800}>{p.contracts_count || 0} قرارداد</Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Detail panel */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, position: 'sticky', top: 24, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
            {!selected ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <StorefrontIcon sx={{ fontSize: 50, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="textSecondary">یک طرف را برای مشاهدهٔ جزئیات انتخاب کنید.</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>{selected.name}</Typography>
                    <Typography variant="caption" color="textSecondary">{PARTY_TYPES[selected.party_type]?.label}</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" color="primary" onClick={() => { setForm(selected); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color={selected.is_active !== false ? 'error' : 'success'}
                      onClick={() => toggle.mutate(selected.id)}>
                      {selected.is_active !== false ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این طرف؟')) remove.mutate(selected.id); }}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {/* Financial summary */}
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid item xs={6}><Paper sx={{ p: 1, textAlign: 'center', background: 'rgba(14,165,233,0.06)' }}><Typography variant="h6" fontWeight={800} color="#0ea5e9">{summaryLoading ? '...' : formatPersianNumber(summary?.contracts_count || 0)}</Typography><Typography variant="caption" color="textSecondary">قراردادها</Typography></Paper></Grid>
                  <Grid item xs={6}><Paper sx={{ p: 1, textAlign: 'center', background: 'rgba(16,185,129,0.06)' }}><Typography variant="h6" fontWeight={800} color="#10b981">{summaryLoading ? '...' : formatPersianNumber(summary?.active_count || 0)}</Typography><Typography variant="caption" color="textSecondary">قرارداد فعال</Typography></Paper></Grid>
                  <Grid item xs={12}><Paper sx={{ p: 1, textAlign: 'center', background: 'rgba(139,92,246,0.06)' }}><Typography variant="body2" fontWeight={800} color="#8b5cf6">{summaryLoading ? '...' : `${formatPersianNumber(summary?.total_amount || 0)} ریال`}</Typography><Typography variant="caption" color="textSecondary">جمع مبالغ قراردادها</Typography></Paper></Grid>
                </Grid>

                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>اطلاعات تماس و حقوقی</Typography>
                <Stack spacing={0.5}>
                  {infoItem(<PhoneIcon fontSize="small" color="primary" />, 'تلفن', toPersianDigits(selected.phone))}
                  {infoItem(<PhoneIcon fontSize="small" color="primary" />, 'موبایل', toPersianDigits(selected.mobile))}
                  {infoItem(<EmailIcon fontSize="small" color="primary" />, 'ایمیل', selected.email)}
                  {infoItem(<PersonIcon fontSize="small" color="primary" />, 'شخص رابط', selected.contact_person)}
                  {infoItem(<LocationOnIcon fontSize="small" color="primary" />, 'آدرس', selected.address)}
                  {infoItem(<BusinessIcon fontSize="small" color="warning" />, 'شناسه ملی', selected.national_id)}
                  {infoItem(<BusinessIcon fontSize="small" color="warning" />, 'کد اقتصادی', selected.economic_code)}
                  {infoItem(<BusinessIcon fontSize="small" color="warning" />, 'شماره ثبت', selected.registration_number)}
                  {infoItem(<AccountBalanceIcon fontSize="small" color="info" />, 'بانک', selected.bank_name)}
                  {infoItem(<AccountBalanceIcon fontSize="small" color="info" />, 'شماره حساب', selected.account_number)}
                  {infoItem(<AccountBalanceIcon fontSize="small" color="info" />, 'شبا', selected.sheba_number)}
                </Stack>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Party dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش طرف قرارداد' : 'افزودن طرف قرارداد'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={7}><TextField size="small" fullWidth label="نام / عنوان *" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={12} md={5}>
              <FormControl size="small" fullWidth>
                <InputLabel>نوع طرف</InputLabel>
                <Select value={form.party_type} label="نوع طرف" onChange={e => setForm(p => ({ ...p, party_type: e.target.value }))}>
                  {Object.entries(PARTY_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}><TextField size="small" label="شناسه ملی / کد ثبت" value={form.national_id} onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" label="کد اقتصادی" value={form.economic_code} onChange={e => setForm(p => ({ ...p, economic_code: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" label="شماره ثبت" value={form.registration_number} onChange={e => setForm(p => ({ ...p, registration_number: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="تلفن" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="موبایل" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField size="small" label="ایمیل" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField size="small" label="آدرس" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" label="شخص رابط" value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" label="بانک" value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" label="شماره حساب" value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="شماره شبا" value={form.sheba_number} onChange={e => setForm(p => ({ ...p, sheba_number: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" label="توضیحات" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
          </Grid>
          {save.isLoading && <LinearProgress sx={{ borderRadius: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.name} onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractPartiesPage;