import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Alert, InputAdornment, Autocomplete,
  Grid, FormControl, InputLabel, Select, MenuItem, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42))',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 18px 50px rgba(99,102,241,0.14)',
  borderRadius: '20px',
};

const NATURE_OPTS = [
  { value: 'debit', label: 'بدهکار' },
  { value: 'credit', label: 'بستانکار' },
  { value: 'none', label: 'مهم نیست' },
];
const natureLabel = (n) => NATURE_OPTS.find(o => o.value === n)?.label || 'مهم نیست';
const natureColor = (n) => n === 'credit' ? '#dc2626' : n === 'debit' ? '#059669' : '#888';
const natureBg = (n) => n === 'credit' ? 'rgba(239,68,68,0.12)' : n === 'debit' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.6)',
    transition: 'all 0.2s ease',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(99,102,241,0.12)' },
  },
};

const AccountGroupsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', account_type: '', nature: 'none' });
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['account-groups'], queryFn: () => axiosInstance.get('/accounting/account-groups/').then(r => r.data) });
  const { data: types } = useQuery({ queryKey: ['acc-types'], queryFn: () => axiosInstance.get('/accounting/account-types/').then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const typeList = Array.isArray(types) ? types : types?.results || [];

  const save = useMutation({
    mutationFn: () => editing
      ? axiosInstance.patch(`/accounting/account-groups/${editing.id}/`, form)
      : axiosInstance.post('/accounting/account-groups/', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-groups'] });
      resetForm();
    },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا در ذخیره' }),
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/account-groups/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-groups'] }),
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'حذف ممکن نیست' }),
  });

  const resetForm = () => { setEditing(null); setForm({ code: '', name: '', account_type: '', nature: 'none' }); setMsg(null); };
  const edit = (g) => {
    setEditing(g);
    setForm({ code: g.code, name: g.name, account_type: g.account_type, nature: g.nature || 'none' });
  };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = useMemo(() => {
    const q = search.trim();
    return list.filter(g => !q || `${g.code} ${g.name}`.includes(q));
  }, [list, search]);

  return (
    <Box>
      {/* هدر */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '20px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 28px ${COLOR}55` }}>
          <AccountTreeIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>گروه حساب‌ها</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت گروه‌های حساب با نوع حساب و ماهیت</Typography>
        </Box>
        <Chip label={`${list.length} گروه`} sx={{ fontWeight: 700, bgcolor: 'rgba(99,102,241,0.1)', color: COLOR_DARK }} />
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '14px' }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {/* جستجو */}
      <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
        <TextField
          placeholder="جستجوی گروه حساب…"
          size="small" fullWidth
          value={search} onChange={e => setSearch(e.target.value)}
          sx={fieldSx}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Paper>

      {/* دو ستون: راست = فرم، چپ = لیست */}
      <Grid container spacing={2.5}>
        {/* فرم ورود (راست) */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...glass, p: 2.5, position: 'sticky', top: 16 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK}>
                {editing ? 'ویرایش گروه حساب' : 'ثبت گروه حساب جدید'}
              </Typography>
              {editing && (
                <Tooltip title="لغو ویرایش"><IconButton size="small" onClick={resetForm}><ClearIcon fontSize="small" /></IconButton></Tooltip>
              )}
            </Stack>

            <Stack spacing={1.5}>
              <TextField size="small" fullWidth label="کد گروه" value={form.code} onChange={e => set('code', e.target.value)} sx={fieldSx} />
              <TextField size="small" fullWidth label="عنوان گروه حساب" value={form.name} onChange={e => set('name', e.target.value)} sx={fieldSx} />

              <Autocomplete
                size="small" options={typeList} getOptionLabel={o => o.name}
                value={typeList.find(t => t.id === form.account_type) || null}
                onChange={(e, v) => set('account_type', v ? v.id : '')}
                renderInput={p => <TextField {...p} label="نوع حساب" sx={fieldSx} />}
              />

              <FormControl fullWidth size="small">
                <InputLabel>ماهیت</InputLabel>
                <Select value={form.nature || 'none'} label="ماهیت" onChange={e => set('nature', e.target.value)} sx={fieldSx}>
                  <MenuItem value="debit">بدهکار</MenuItem>
                  <MenuItem value="credit">بستانکار</MenuItem>
                  <MenuItem value="none">مهم نیست</MenuItem>
                </Select>
              </FormControl>

              <Button
                fullWidth variant="contained" startIcon={save.isLoading ? <CircularProgress size={18} /> : <AddIcon />}
                onClick={() => save.mutate()} disabled={save.isLoading || !form.code || !form.name}
                sx={{ mt: 0.5, py: 1.1, borderRadius: '14px', background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 24px ${COLOR}44`, '&:hover': { background: `linear-gradient(135deg,${COLOR_DARK},${COLOR_DARK})` } }}>
                {editing ? 'ذخیره تغییرات' : 'افزودن گروه حساب'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* لیست (چپ) */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ ...glass, p: 2.5 }}>
            {isLoading ? (
              <Box textAlign="center" py={6}><CircularProgress /></Box>
            ) : filtered.length === 0 ? (
              <Box textAlign="center" py={6}>
                <AccountTreeIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                <Typography color="textSecondary">گروه حسابی ثبت نشده است.</Typography>
              </Box>
            ) : (
              <Stack spacing={1.25}>
                {filtered.map(g => {
                  const type = typeList.find(t => t.id === g.account_type);
                  const active = editing?.id === g.id;
                  return (
                    <Paper
                      key={g.id}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75,
                        borderRadius: '14px', cursor: 'pointer',
                        background: active ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.55)',
                        border: active ? `1px solid ${COLOR}66` : '1px solid rgba(255,255,255,0.8)',
                        transition: 'all 0.2s ease',
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 10px 26px rgba(99,102,241,0.12)' },
                      }}
                      onClick={() => edit(g)}
                    >
                      <Box sx={{ width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 6px 14px ${COLOR}40`, flexShrink: 0 }}>
                        <AccountTreeIcon sx={{ fontSize: 22, color: '#fff' }} />
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip size="small" label={g.code} sx={{ fontWeight: 800, bgcolor: 'rgba(99,102,241,0.1)', color: COLOR_DARK, fontSize: 11 }} />
                          <Typography variant="body2" fontWeight={700} noWrap>{g.name}</Typography>
                        </Stack>
                        <Typography variant="caption" color="textSecondary">{type?.name || '—'}</Typography>
                      </Box>

                      <Chip size="small" label={natureLabel(g.nature)} sx={{ bgcolor: natureBg(g.nature), color: natureColor(g.nature), fontWeight: 700, flexShrink: 0 }} />
                      <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); if (window.confirm('حذف این گروه؟')) del.mutate(g.id); }} title="حذف">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountGroupsPage;