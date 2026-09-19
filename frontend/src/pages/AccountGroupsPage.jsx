import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Grid, InputAdornment, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { toPersianDigits } from '../core/utils/numberUtils';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.36))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(99,102,241,0.12)',
  borderRadius: '16px',
};

const typeGradient = {
  asset: 'linear-gradient(135deg,#3b82f6,#2563eb)',
  liability: 'linear-gradient(135deg,#ef4444,#dc2626)',
  equity: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  revenue: 'linear-gradient(135deg,#10b981,#059669)',
  cost_of_sales: 'linear-gradient(135deg,#f59e0b,#d97706)',
  expense: 'linear-gradient(135deg,#f43f5e,#e11d48)',
  memorandum: 'linear-gradient(135deg,#64748b,#475569)',
};

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

  // فیلتر + گروه‌بندی بر اساس Parent برای نمایش سلسله‌مراتبی
  const filtered = useMemo(() => {
    const q = search.trim();
    return list.filter(g => !q || `${g.code} ${g.name}`.includes(q));
  }, [list, search]);

  const roots = filtered.filter(g => !g.parent);
  const childrenOf = (parentId) => filtered.filter(g => g.parent === parentId);

  const openNew = (parentId = null) => { setEditing(null); setForm({ parent: parentId }); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm(row); setOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const renderGroup = (g) => {
    const children = childrenOf(g.id);
    const type = typeList.find(t => t.id === g.account_type);
    const grad = typeGradient[type?.category] || 'linear-gradient(135deg,#6366f1,#4f46e5)';
    return (
      <Paper key={g.id} sx={{ ...glass, p: 2, mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ width: 44, height: 44, background: grad, boxShadow: '0 6px 16px rgba(0,0,0,0.18)' }}>
            <CategoryIcon sx={{ fontSize: 22, color: '#fff' }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip size="small" label={g.code} sx={{ fontWeight: 800, bgcolor: 'rgba(99,102,241,0.1)', color: COLOR_DARK }} />
              <Typography variant="subtitle1" fontWeight={800}>{g.name}</Typography>
            </Stack>
            <Typography variant="caption" color="textSecondary">
              {g.name ? (type?.name || '—') : ''}
              {children.length > 0 && ` · ${toPersianDigits(children.length)} زیرگروه`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="افزودن زیرگروه"><IconButton size="small" color="primary" onClick={() => openNew(g.id)}><AddIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="ویرایش"><IconButton size="small" onClick={() => openEdit(g)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این گروه؟')) del.mutate(g.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Stack>
        </Stack>

        {children.length > 0 && (
          <Box sx={{ mt: 1.5, mr: 7, borderRight: '2px solid rgba(99,102,241,0.2)', pr: 2 }}>
            {children.map(renderGroup)}
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <AccountTreeIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>گروه حساب‌ها</Typography>
          <Typography variant="body2" color="textSecondary">ساختار سلسله‌مراتبی گروه‌های حساب — با زیرگروه و نوع حساب</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openNew(null)}
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

      {isLoading ? <Box textAlign="center" py={6}><CircularProgress /></Box>
        : roots.length === 0 ? (
          <Paper sx={{ ...glass, p: 5, textAlign: 'center' }}>
            <CategoryIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography color="textSecondary">گروه حسابی ثبت نشده است.</Typography>
          </Paper>
        ) : roots.map(renderGroup)}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: COLOR_DARK }}>{editing ? 'ویرایش گروه حساب' : 'افزودن گروه حساب'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Autocomplete
            size="small" options={typeList} getOptionLabel={o => o.name}
            value={typeList.find(t => t.id === form.account_type) || null}
            onChange={(e, v) => set('account_type', v ? v.id : '')}
            renderInput={p => <TextField {...p} label="نوع حساب" />}
          />
          <Autocomplete
            size="small" options={list.filter(g => g.id !== editing?.id)} getOptionLabel={o => `${o.code} - ${o.name}`}
            value={list.find(g => g.id === form.parent) || null}
            onChange={(e, v) => set('parent', v ? v.id : null)}
            renderInput={p => <TextField {...p} label="گروه بالادستی (اختیاری)" />}
          />
          <TextField fullWidth size="small" label="کد گروه" value={form.code || ''} onChange={e => set('code', e.target.value)} />
          <TextField fullWidth size="small" label="عنوان گروه" value={form.name || ''} onChange={e => set('name', e.target.value)} />
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