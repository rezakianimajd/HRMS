import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Switch,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  InputAdornment, IconButton, Tooltip, Snackbar, Alert,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import { formatPersianNumber } from '../core/utils/numberUtils';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '16px',
};

const ContractTypesPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contract-types-master'],
    queryFn: () => axiosInstance.get('/contract-types-master/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(t =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.code || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q));
  }, [list, search]);

  const save = useMutation({
    mutationFn: (p) => p.id
      ? axiosInstance.patch(`/contract-types-master/${p.id}/`, p)
      : axiosInstance.post('/contract-types-master/', p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-types-master'] });
      setDialog(false); setForm({}); setToast('ذخیره شد');
    },
    onError: (e) => setToast(e.response?.data?.detail || 'خطا در ذخیره'),
  });

  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-types-master/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-types-master'] }); setToast('حذف شد'); },
  });

  const toggle = useMutation({
    mutationFn: (row) => axiosInstance.patch(`/contract-types-master/${row.id}/`, { is_active: !row.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-types-master'] }),
  });

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const activeCount = list.filter(t => t.is_active).length;
  const totalContracts = list.reduce((s, t) => s + Number(t.contracts_count || 0), 0);

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
        background: 'linear-gradient(120deg, rgba(20,184,166,0.12), rgba(99,102,241,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(20,184,166,0.22)', borderRadius: '16px' }}>
        <Avatar sx={{ width: 58, height: 58, background: 'linear-gradient(135deg,#14b8a6,#6366f1)', boxShadow: '0 8px 24px rgba(20,184,166,0.4)' }}>
          <CategoryIcon sx={{ color: '#fff', fontSize: 30 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#0f766e">انواع قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت دسته‌بندی انواع قرارداد و فعال‌سازی آن‌ها</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setForm({ is_active: true }); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg,#14b8a6,#6366f1)', borderRadius: '12px', px: 2.5 }}>
          نوع جدید
        </Button>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>{kpi('کل انواع', list.length, '#6366f1', <CategoryIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={4}>{kpi('فعال', activeCount, '#10b981', <CheckCircleIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={4}>{kpi('قراردادهای ثبت‌شده', totalContracts, '#14b8a6', <BlockIcon sx={{ color: '#fff' }} />)}</Grid>
      </Grid>

      <Paper sx={{ ...glassPaper, p: 2 }}>
        <TextField size="small" fullWidth placeholder="جستجوی نوع قرارداد (کد، عنوان، توضیحات)..." value={search}
          onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }} />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 800, color: '#475569' } }}>
                <TableCell>کد</TableCell>
                <TableCell>عنوان</TableCell>
                <TableCell>توضیحات</TableCell>
                <TableCell align="center">قراردادها</TableCell>
                <TableCell align="center">وضعیت</TableCell>
                <TableCell align="left">عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>نوعی ثبت نشده است</TableCell></TableRow>
              )}
              {filtered.map(t => (
                <TableRow key={t.id} hover>
                  <TableCell><Chip size="small" label={t.code} sx={{ fontWeight: 700, bgcolor: '#e0f2fe', color: '#0369a1' }} /></TableCell>
                  <TableCell><Typography variant="body2" fontWeight={700}>{t.name}</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="textSecondary">{t.description || '—'}</Typography></TableCell>
                  <TableCell align="center"><Typography variant="body2" fontWeight={700}>{formatPersianNumber(t.contracts_count || 0)}</Typography></TableCell>
                  <TableCell align="center">
                    <Switch size="small" checked={!!t.is_active} onChange={() => toggle.mutate(t)} color="success" />
                  </TableCell>
                  <TableCell align="left">
                    <Tooltip title="ویرایش"><IconButton size="small" onClick={() => { setForm({ ...t }); setDialog(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این نوع قرارداد؟')) del.mutate(t.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش نوع قرارداد' : 'نوع قرارداد جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}><TextField size="small" fullWidth label="کد *" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></Grid>
            <Grid item xs={12} md={8}><TextField size="small" fullWidth label="عنوان *" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="توضیحات" multiline rows={3} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.name || !form.code} onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg,#14b8a6,#6366f1)', borderRadius: '10px' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractTypesPage;
