import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import DefinitionTable, { CodeName } from './accounting/DefinitionTable';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Alert, InputAdornment, Autocomplete,
  Grid, FormControl, InputLabel, Select, MenuItem, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
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

// پیام خطای خوانا از پاسخ DRF (فیلدهای خطادار)
const errText = (e, fallback) => {
  const d = e?.response?.data;
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  if (d.error) return d.error;
  if (d.detail) return d.detail;
  const labels = {
    account_type: 'نوع حساب', nature: 'ماهیت', code: 'کد', name: 'نام',
    group: 'گروه حساب', parent: 'حساب والد', level: 'سطح',
  };
  const first = Object.entries(d)[0];
  if (!first) return fallback;
  const [field, value] = first;
  const msg = Array.isArray(value) ? value[0] : value;
  return `${labels[field] || field}: ${msg}`;
};

const AccountGroupsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [natureFilter, setNatureFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', account_type: '', nature: 'none' });
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['account-groups'], queryFn: () => axiosInstance.get('/accounting/account-groups/').then(r => r.data) });
  const { data: types } = useQuery({ queryKey: ['acc-types'], queryFn: () => axiosInstance.get('/accounting/account-types/').then(r => r.data) });
  const { data: suggested } = useQuery({ queryKey: ['suggest-code-group'], queryFn: () => axiosInstance.get('/accounting/coding-configs/suggest/', { params: { level: 'group' } }).then(r => r.data) });

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
    onError: (e) => setMsg({ ok: false, text: errText(e, 'خطا در ذخیره') }),
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/account-groups/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account-groups'] }),
    onError: (e) => setMsg({ ok: false, text: errText(e, 'حذف ممکن نیست') }),
  });

  const resetForm = () => { setEditing(null); setForm({ code: suggested?.code || '', name: '', account_type: '', nature: 'none' }); setMsg(null); };
  const edit = (g) => {
    setEditing(g);
    setForm({ code: g.code, name: g.name, account_type: g.account_type, nature: g.nature || 'none' });
  };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = useMemo(() => {
    const q = search.trim();
    return list.filter(g => (
      (!q || `${g.code} ${g.name}`.includes(q))
      && (!typeFilter || String(g.account_type) === String(typeFilter))
      && (!natureFilter || (g.nature || 'none') === natureFilter)
    ));
  }, [list, search, typeFilter, natureFilter]);

  return (
    <Box>
      {/* هدر */}
      <PageHeader
        icon={<AccountTreeIcon />}
        title="گروه حساب‌ها"
        actions={<Chip label={`${list.length} گروه`} color="primary" variant="outlined" />}
      />

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '14px' }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap>
          <TextField
            placeholder="جستجوی کد یا عنوان گروه حساب…"
            size="small" value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1, ...fieldSx }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 180 } }}>
            <InputLabel>نوع حساب</InputLabel>
            <Select value={typeFilter} label="نوع حساب" onChange={e => setTypeFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {typeList.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 160 } }}>
            <InputLabel>ماهیت</InputLabel>
            <Select value={natureFilter} label="ماهیت" onChange={e => setNatureFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {NATURE_OPTS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
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
              <TextField
                size="small" fullWidth label="کد گروه" value={form.code} onChange={e => set('code', e.target.value)} sx={fieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="پیشنهاد کد بعدی"><IconButton size="small" onClick={() => set('code', suggested?.code || '')}><BoltIcon fontSize="small" color="primary" /></IconButton></Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField size="small" fullWidth label="عنوان گروه حساب" value={form.name} onChange={e => set('name', e.target.value)} sx={fieldSx} />

              <Autocomplete
                size="small" options={typeList} getOptionLabel={o => o.name}
                value={typeList.find(t => t.id === form.account_type) || null}
                onChange={(e, v) => set('account_type', v ? v.id : '')}
                renderInput={p => (
                  <TextField
                    {...p} label="نوع حساب" required sx={fieldSx}
                    error={!form.account_type}
                    helperText={!form.account_type ? 'انتخاب نوع حساب الزامی است (دارایی/بدهی/حقوق مالکانه/…)' : ' '}
                  />
                )}
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
                onClick={() => save.mutate()} disabled={save.isLoading || !form.code || !form.name || !form.account_type}
                sx={{ mt: 0.5, py: 1.1, borderRadius: '14px', background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 24px ${COLOR}44`, '&:hover': { background: `linear-gradient(135deg,${COLOR_DARK},${COLOR_DARK})` } }}>
                {editing ? 'ذخیره تغییرات' : 'افزودن گروه حساب'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* لیست (چپ) */}
        <Grid item xs={12} md={8}>
          <DefinitionTable
              rows={filtered}
              loading={isLoading}
              emptyText="گروه حسابی ثبت نشده است."
              onRowClick={edit}
              activeId={editing?.id}
              columns={[
                { key: 'code_name', label: 'کد / عنوان', render: g => <CodeName code={g.code} name={g.name} /> },
                { key: 'type', label: 'نوع حساب', width: 170, render: g => typeList.find(t => t.id === g.account_type)?.name || '—' },
                { key: 'nature', label: 'ماهیت', width: 110, align: 'center', render: g => natureLabel(g.nature) },
                {
                  key: 'actions', label: 'عملیات', width: 95, align: 'center',
                  render: g => (
                    <>
                      <Tooltip title="ویرایش"><IconButton size="small" onClick={(e) => { e.stopPropagation(); edit(g); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); if (window.confirm('حذف این گروه؟')) del.mutate(g.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </>
                  ),
                },
              ]}
            />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountGroupsPage;