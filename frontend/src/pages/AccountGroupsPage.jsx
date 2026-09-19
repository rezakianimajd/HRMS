import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, InputAdornment, Autocomplete, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.36))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(99,102,241,0.12)',
  borderRadius: '16px',
};

const NATURE_OPTS = [
  { value: 'debit', label: 'بدهکار' },
  { value: 'credit', label: 'بستانکار' },
];

const AccountGroupsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['account-groups'], queryFn: () => axiosInstance.get('/accounting/account-groups/').then(r => r.data) });
  const { data: types } = useQuery({ queryKey: ['acc-types'], queryFn: () => axiosInstance.get('/accounting/account-types/').then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const typeList = Array.isArray(types) ? types : types?.results || [];

  const save = useMutation({
    mutationFn: (p) => editing ? axiosInstance.patch(`/accounting/account-groups/${editing.id}/`, p) : axiosInstance.post('/accounting/account-groups/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['account-groups'] }); setOpen(false); setEditing(null); setForm({}); },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }),
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/account-groups/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-groups'] }),
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'حذف ممکن نیست' }),
  });

  const filtered = useMemo(() => {
    const q = search.trim();
    return list.filter(g => !q || `${g.code} ${g.name}`.includes(q));
  }, [list, search]);

  const openNew = () => { setEditing(null); setForm({ nature: 'debit' }); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm(row); setOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <AccountTreeIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>گروه حساب‌ها</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت گروه‌های حساب با نوع حساب و ماهیت</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
          گروه جدید
        </Button>
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <TextField
          placeholder="جستجوی گروه حساب…"
          size="small" fullWidth
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden' }}>
        {isLoading ? <Box textAlign="center" py={6}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>کد</TableCell>
                  <TableCell>عنوان گروه حساب</TableCell>
                  <TableCell>نوع حساب</TableCell>
                  <TableCell>ماهیت</TableCell>
                  <TableCell>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>گروه حسابی ثبت نشده است</TableCell></TableRow>
                ) : filtered.map(g => {
                  const type = typeList.find(t => t.id === g.account_type);
                  return (
                    <TableRow key={g.id} hover>
                      <TableCell><Chip size="small" label={g.code} sx={{ fontWeight: 800, bgcolor: 'rgba(99,102,241,0.1)', color: COLOR_DARK }} /></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={700}>{g.name}</Typography></TableCell>
                      <TableCell>{type?.name || '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={g.nature === 'credit' ? 'بستانکار' : 'بدهکار'}
                          sx={{ bgcolor: g.nature === 'credit' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: g.nature === 'credit' ? '#dc2626' : '#059669' }} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openEdit(g)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این گروه؟')) del.mutate(g.id); }}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: COLOR_DARK }}>{editing ? 'ویرایش گروه حساب' : 'افزودن گروه حساب'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="کد گروه" value={form.code || ''} onChange={e => set('code', e.target.value)} />
          <TextField fullWidth size="small" label="عنوان گروه حساب" value={form.name || ''} onChange={e => set('name', e.target.value)} />
          <Autocomplete
            size="small" options={typeList} getOptionLabel={o => o.name}
            value={typeList.find(t => t.id === form.account_type) || null}
            onChange={(e, v) => set('account_type', v ? v.id : '')}
            renderInput={p => <TextField {...p} label="نوع حساب" />}
          />
          <FormControl fullWidth size="small">
            <InputLabel>ماهیت</InputLabel>
            <Select value={form.nature || 'debit'} label="ماهیت" onChange={e => set('nature', e.target.value)}>
              <MenuItem value="debit">بدهکار</MenuItem>
              <MenuItem value="credit">بستانکار</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate(form)} disabled={save.isLoading}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>
            {save.isLoading ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountGroupsPage;