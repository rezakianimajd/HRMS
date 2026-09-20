import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Alert, InputAdornment, Autocomplete,
  Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const COLOR = '#3b82f6';
const COLOR_DARK = '#2563eb';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42))',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 18px 50px rgba(59,130,246,0.14)',
  borderRadius: '20px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.6)',
    transition: 'all 0.2s ease',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(59,130,246,0.12)' },
  },
};

const natureLabel = (n) => n === 'credit' ? 'بستانکار' : n === 'debit' ? 'بدهکار' : 'مهم نیست';
const natureColor = (n) => n === 'credit' ? '#dc2626' : n === 'debit' ? '#059669' : '#888';
const natureBg = (n) => n === 'credit' ? 'rgba(239,68,68,0.12)' : n === 'debit' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)';

const AccountsClassicPage = () => {
  const { kind } = useParams();
  const isGeneral = kind === 'general';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', group: '', parent: '', account_type: '', nature: 'debit', auxiliary_category_1: '', auxiliary_category_2: '', auxiliary_category_3: '' });
  const [msg, setMsg] = useState(null);

  const endpoint = '/accounting/accounts/';
  const { data, isLoading } = useQuery({
    queryKey: ['accounts', kind],
    queryFn: () => axiosInstance.get(endpoint, { params: { kind } }).then(r => r.data),
  });
  const { data: groups } = useQuery({ queryKey: ['acc-groups'], queryFn: () => axiosInstance.get('/accounting/account-groups/').then(r => r.data) });
  const { data: generals } = useQuery({ queryKey: ['acc-general'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'general' } }).then(r => r.data) });
  const { data: suggested } = useQuery({
    queryKey: ['suggest-code', kind],
    queryFn: () => axiosInstance.get('/accounting/coding-configs/suggest/', { params: { level: kind } }).then(r => r.data),
  });
  const { data: auxCategories } = useQuery({ queryKey: ['aux-categories'], queryFn: () => axiosInstance.get('/accounting/auxiliary-categories/').then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const groupList = Array.isArray(groups) ? groups : groups?.results || [];
  const generalList = Array.isArray(generals) ? generals : generals?.results || [];
  const auxCategoryList = Array.isArray(auxCategories) ? auxCategories : auxCategories?.results || [];

  const saveCredit = async (payload) => {
    if (editing) return axiosInstance.patch(`${endpoint}${editing.id}/`, payload);
    return axiosInstance.post(endpoint, payload);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ code: suggested?.code || '', name: '', group: '', parent: '', account_type: '', nature: 'debit', auxiliary_category_1: '', auxiliary_category_2: '', auxiliary_category_3: '' });
    setMsg(null);
  };

  // پیشنهاد خودکار کد هنگام باز شدن فرم
  useEffect(() => {
    if (!editing && suggested?.code) {
      setForm(p => ({ ...p, code: suggested.code }));
    }
  }, [suggested?.code]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // وقتی «حساب کل» انتخاب شد، نوع حساب و ماهیت از آن ارث می‌برند
  const selectedParent = generalList.find(a => a.id === form.parent);
  const inheritedType = selectedParent?.account_type;
  const inheritedNature = selectedParent?.nature;

  // وقتی «گروه» انتخاب شد، نوع و ماهیت از گروه ارث می‌برند (حساب کل)
  const selectedGroup = groupList.find(g => g.id === form.group);
  const inheritedFromGroupType = selectedGroup?.account_type;
  const inheritedFromGroupNature = selectedGroup?.nature;

  const effectiveType = isGeneral ? (form.account_type || inheritedFromGroupType) : (form.account_type || inheritedType);
  const effectiveNature = isGeneral ? (form.nature || inheritedFromGroupNature) : (form.nature || inheritedNature);

  const submit = async () => {
    setMsg(null);
    const payload = {
      code: form.code,
      name: form.name,
      nature: effectiveNature || 'debit',
      account_type: effectiveType || null,
      level: isGeneral ? 1 : 2,
      ...(isGeneral ? { group: form.group || null, parent: null } : {
        parent: form.parent || null,
        auxiliary_category_1: form.auxiliary_category_1 || null,
        auxiliary_category_2: form.auxiliary_category_2 || null,
        auxiliary_category_3: form.auxiliary_category_3 || null,
      }),
    };
    try {
      await saveCredit(payload);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts', kind] });
      resetForm();
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'خطا در ذخیره' });
    }
  };

  const del = async (id) => {
    try {
      await axiosInstance.delete(`${endpoint}${id}/`);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts', kind] });
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'حذف ممکن نیست' });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    return list.filter(a => !q || `${a.code} ${a.name}`.includes(q));
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
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>{isGeneral ? 'حساب‌های کل' : 'حساب‌های معین'}</Typography>
          <Typography variant="body2" color="textSecondary">
            {isGeneral ? 'وراثت از گروه حساب، با پیشنهاد خودکار کد' : 'وراثت از حساب کل، با پیشنهاد خودکار کد'}
          </Typography>
        </Box>
        <Chip label={`${list.length} حساب`} sx={{ fontWeight: 700, bgcolor: 'rgba(59,130,246,0.1)', color: COLOR_DARK }} />
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '14px' }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {/* جستجو */}
      <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
        <TextField
          placeholder={isGeneral ? 'جستجوی حساب کل…' : 'جستجوی حساب معین…'}
          size="small" fullWidth value={search} onChange={e => setSearch(e.target.value)} sx={fieldSx}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Paper>

      <Grid container spacing={2.5}>
        {/* فرم (راست) */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...glass, p: 2.5, position: 'sticky', top: 16 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK}>
                {editing ? 'ویرایش حساب' : isGeneral ? 'ثبت حساب کل جدید' : 'ثبت حساب معین جدید'}
              </Typography>
              <Tooltip title="لغو"><IconButton size="small" onClick={resetForm}><ClearIcon fontSize="small" /></IconButton></Tooltip>
            </Stack>

            <Stack spacing={1.5}>
              <TextField
                size="small" fullWidth label="کد حساب" value={form.code} onChange={e => set('code', e.target.value)} sx={fieldSx}
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="پیشنهاد کد بعدی"><IconButton size="small" onClick={() => set('code', suggested?.code || '')}><BoltIcon fontSize="small" color="primary" /></IconButton></Tooltip>
                  </InputAdornment>
                ) }}
              />
              <TextField size="small" fullWidth label="نام حساب" value={form.name} onChange={e => set('name', e.target.value)} sx={fieldSx} />

              {isGeneral ? (
                <Autocomplete
                  size="small" options={groupList} getOptionLabel={o => `${o.code} - ${o.name}`}
                  value={groupList.find(g => g.id === form.group) || null}
                  onChange={(e, v) => set('group', v ? v.id : '')}
                  renderInput={p => <TextField {...p} label="گروه حساب (پدر)" sx={fieldSx} />}
                />
              ) : (
                <Autocomplete
                  size="small" options={generalList} getOptionLabel={o => `${o.code} - ${o.name}`}
                  value={generalList.find(a => a.id === form.parent) || null}
                  onChange={(e, v) => set('parent', v ? v.id : '')}
                  renderInput={p => <TextField {...p} label="حساب کل (پدر)" sx={fieldSx} />}
                />
              )}

              {/* نمایش وراثت نوع و ماهیت */}
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={`نوع: ${effectiveType ? groupList.find(x => x.account_type === effectiveType)?.account_type_name || '—' : '—'}`} />
                <Chip size="small" label={`ماهیت: ${natureLabel(effectiveNature)}`} sx={{ bgcolor: natureBg(effectiveNature), color: natureColor(effectiveNature) }} />
              </Stack>

              {/* اجازه تغییر دستی ماهیت (در بازه) */}
              <FormControl fullWidth size="small">
                <InputLabel>ماهیت</InputLabel>
                <Select value={form.nature || ''} label="ماهیت" onChange={e => set('nature', e.target.value)} sx={fieldSx}>
                  <MenuItem value="">وراثت</MenuItem>
                  <MenuItem value="debit">بدهکار</MenuItem>
                  <MenuItem value="credit">بستانکار</MenuItem>
                  <MenuItem value="none">مهم نیست</MenuItem>
                </Select>
              </FormControl>

              {/* ارتباط با تفصیل‌ها (فقط برای حساب معین) */}
              {!isGeneral && (
                <>
                  <Autocomplete size="small" options={auxCategoryList} getOptionLabel={o => o.name}
                    value={auxCategoryList.find(c => c.id === form.auxiliary_category_1) || null}
                    onChange={(e, v) => set('auxiliary_category_1', v ? v.id : '')}
                    renderInput={p => <TextField {...p} label="ارتباط با تفصیل یک" sx={fieldSx} />} />
                  <Autocomplete size="small" options={auxCategoryList} getOptionLabel={o => o.name}
                    value={auxCategoryList.find(c => c.id === form.auxiliary_category_2) || null}
                    onChange={(e, v) => set('auxiliary_category_2', v ? v.id : '')}
                    renderInput={p => <TextField {...p} label="ارتباط با تفصیل دو" sx={fieldSx} />} />
                  <Autocomplete size="small" options={auxCategoryList} getOptionLabel={o => o.name}
                    value={auxCategoryList.find(c => c.id === form.auxiliary_category_3) || null}
                    onChange={(e, v) => set('auxiliary_category_3', v ? v.id : '')}
                    renderInput={p => <TextField {...p} label="ارتباط با تفصیل سه" sx={fieldSx} />} />
                </>
              )}

              <Button
                fullWidth variant="contained" startIcon={isLoading ? <CircularProgress size={18} /> : <AddIcon />}
                onClick={submit} disabled={!form.code || !form.name || (isGeneral ? !form.group : !form.parent)}
                sx={{ mt: 0.5, py: 1.1, borderRadius: '14px', background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 24px ${COLOR}44` }}>
                {editing ? 'ذخیره تغییرات' : isGeneral ? 'افزودن حساب کل' : 'افزودن حساب معین'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* لیست (چپ) */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ ...glass, p: 2.5 }}>
            {isLoading ? <Box textAlign="center" py={6}><CircularProgress /></Box>
              : filtered.length === 0 ? <Box textAlign="center" py={6}><AccountTreeIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} /><Typography color="textSecondary">حسابی ثبت نشده است.</Typography></Box>
              : <Stack spacing={1.25}>
                  {filtered.map(a => {
                    const active = editing?.id === a.id;
                    const typeName = a.account_type_name || '';
                    const parentName = a.parent_code || a.group_name || '';
                    return (
                      <Paper key={a.id}
                        onClick={() => {
                          setEditing(a);
                          setForm({ code: a.code, name: a.name, group: a.group, parent: a.parent, account_type: a.account_type, nature: a.nature || '', auxiliary_category_1: a.auxiliary_category_1 || '', auxiliary_category_2: a.auxiliary_category_2 || '', auxiliary_category_3: a.auxiliary_category_3 || '' });
                        }}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, borderRadius: '14px', cursor: 'pointer',
                          background: active ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.55)', border: active ? `1px solid ${COLOR}66` : '1px solid rgba(255,255,255,0.8)',
                          transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 10px 26px rgba(59,130,246,0.12)' } }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 6px 14px ${COLOR}40`, flexShrink: 0 }}>
                          <AccountTreeIcon sx={{ fontSize: 22, color: '#fff' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip size="small" label={a.code} sx={{ fontWeight: 800, bgcolor: 'rgba(59,130,246,0.1)', color: COLOR_DARK, fontSize: 11 }} />
                            <Typography variant="body2" fontWeight={700} noWrap>{a.name}</Typography>
                          </Stack>
                          <Typography variant="caption" color="textSecondary">{typeName}{parentName ? ` · ${parentName}` : ''}</Typography>
                        </Box>
                        <Chip size="small" label={natureLabel(a.nature)} sx={{ bgcolor: natureBg(a.nature), color: natureColor(a.nature), fontWeight: 700, flexShrink: 0 }} />
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); if (window.confirm('حذف این حساب؟')) del(a.id); }} title="حذف">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    );
                  })}
                </Stack>
            }
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountsClassicPage;