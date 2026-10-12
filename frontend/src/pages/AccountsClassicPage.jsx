import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Alert, InputAdornment, Autocomplete,
  Grid, FormControl, InputLabel, Select, MenuItem, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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

// پیام خطای خوانا از پاسخ DRF (فیلدهای خطادار)
const errText = (e, fallback) => {
  const d = e?.response?.data;
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  if (d.error) return d.error;
  if (d.detail) return d.detail;
  const labels = {
    account_type: 'نوع حساب', nature: 'ماهیت', code: 'کد حساب', name: 'نام حساب',
    group: 'گروه حساب', parent: 'حساب والد', level: 'سطح',
  };
  const first = Object.entries(d)[0];
  if (!first) return fallback;
  const [field, value] = first;
  const msg = Array.isArray(value) ? value[0] : value;
  return `${labels[field] || field}: ${msg}`;
};
const natureBg = (n) => n === 'credit' ? 'rgba(239,68,68,0.12)' : n === 'debit' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)';

// برچسب فارسی طبقهٔ حساب و منبع وراثت (برای دیالوگ اصلاح ناهمگونی)
const CATEGORY_FA = {
  asset: 'دارایی', liability: 'بدهی', equity: 'حقوق صاحبان سهام',
  revenue: 'درآمد', expense: 'هزینه', cost_of_sales: 'بهای تمام‌شده',
};
const SOURCE_FA = { parent: 'حساب والد', group: 'گروه حساب', group_name: 'نام گروه' };

// فهرست تغییرات پیشنهادی اصلاح ناهمگونی (کد/نام/نوع فعلی → نوع درست)
const SyncChangeList = ({ report }) => (
  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', maxHeight: 280, overflow: 'auto' }}>
    <Stack spacing={0.75} divider={<Divider flexItem />}>
      {(report.changes || []).slice(0, 40).map(r => (
        <Stack key={r.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" label={r.code} sx={{ fontWeight: 800, bgcolor: 'rgba(59,130,246,0.1)', color: COLOR_DARK }} />
          <Typography variant="body2" fontWeight={700} sx={{ flex: 1, minWidth: 130 }}>{r.name}</Typography>
          <Typography variant="caption" color="textSecondary">{r.group_name || r.parent_code || '—'}</Typography>
          <Chip size="small" label={r.current_type_name} sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#b91c1c', fontWeight: 700 }} />
          <Typography variant="caption">→</Typography>
          <Chip size="small" label={r.new_type_name} sx={{ bgcolor: 'rgba(16,185,129,0.12)', color: '#047857', fontWeight: 700 }} />
          {r.current_nature !== r.new_nature && (
            <Chip size="small" label={`ماهیت: ${natureLabel(r.new_nature)}`} sx={{ bgcolor: natureBg(r.new_nature), color: natureColor(r.new_nature), fontWeight: 700 }} />
          )}
          <Typography variant="caption" color="textSecondary">منبع: {SOURCE_FA[r.source] || r.source}</Typography>
        </Stack>
      ))}
      {(report.changes || []).length > 40 && (
        <Typography variant="caption" color="textSecondary">
          … و {report.changes.length - 40} مورد دیگر
        </Typography>
      )}
    </Stack>
  </Paper>
);


const AccountsClassicPage = () => {
  const { kind } = useParams();
  const isGeneral = kind === 'general';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', group: '', parent: '', account_type: '', nature: '', auxiliary_category_1: '', auxiliary_category_2: '', auxiliary_category_3: '' });
  const [msg, setMsg] = useState(null);
  // اصلاح ناهمگونی نوع حساب‌ها (حساب‌هایی که گروهشان بدهی است اما نوعشان دارایی ثبت شده)
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncReport, setSyncReport] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncFixGroups, setSyncFixGroups] = useState(true);

  const endpoint = '/accounting/accounts/';
  const { data, isLoading } = useQuery({
    queryKey: ['accounts', kind],
    queryFn: () => axiosInstance.get(endpoint, { params: { kind } }).then(r => r.data),
  });
  const { data: groups } = useQuery({ queryKey: ['acc-groups'], queryFn: () => axiosInstance.get('/accounting/account-groups/').then(r => r.data) });
  const { data: generals } = useQuery({ queryKey: ['acc-general'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'general' } }).then(r => r.data) });
  const { data: types } = useQuery({ queryKey: ['acc-types'], queryFn: () => axiosInstance.get('/accounting/account-types/').then(r => r.data) });
  // پیشنهاد کد **بر پایهٔ والد انتخاب‌شده** (یا گروه)؛ با تغییر والد، کد بازتولید می‌شود
  const { data: suggested } = useQuery({
    queryKey: ['suggest-code', kind, form.parent || '', form.group || ''],
    queryFn: () => axiosInstance.get('/accounting/coding-configs/suggest/', {
      params: {
        level: kind,
        ...(form.parent ? { parent: form.parent } : {}),
        ...(form.group ? { group: form.group } : {}),
      },
    }).then(r => r.data),
  });
  const { data: auxCategories } = useQuery({ queryKey: ['aux-categories'], queryFn: () => axiosInstance.get('/accounting/auxiliary-categories/').then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const groupList = Array.isArray(groups) ? groups : groups?.results || [];
  const generalList = Array.isArray(generals) ? generals : generals?.results || [];
  const typeList = Array.isArray(types) ? types : types?.results || [];
  const auxCategoryList = Array.isArray(auxCategories) ? auxCategories : auxCategories?.results || [];

  const saveCredit = async (payload) => {
    if (editing) return axiosInstance.patch(`${endpoint}${editing.id}/`, payload);
    return axiosInstance.post(endpoint, payload);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ code: suggested?.code || '', name: '', group: '', parent: '', account_type: '', nature: '', auxiliary_category_1: '', auxiliary_category_2: '', auxiliary_category_3: '' });
    setMsg(null);
  };

  // پی‌ده‌ها: پیشنهاد کد و وراثت با تغییر «والد/گروه» از سرور تازه می‌شود
  useEffect(() => {
    if (editing || !suggested) return;
    setForm(p => ({
      ...p,
      code: suggested.code || p.code,
      nature: p.nature || suggested.nature || '',
    }));
  }, [suggested?.code, suggested?.parent_code, suggested?.nature, editing]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // وقتی «حساب کل» انتخاب شد، نوع حساب و ماهیت از آن ارث می‌برند
  const selectedParent = generalList.find(a => a.id === form.parent);
  const inheritedType = selectedParent?.account_type;
  const inheritedNature = selectedParent?.nature;

  // وقتی «گروه» انتخاب شد، نوع و ماهیت از گروه ارث می‌برند (حساب کل)
  const selectedGroup = groupList.find(g => g.id === form.group);
  const inheritedFromGroupType = selectedGroup?.account_type;
  const inheritedFromGroupNature = selectedGroup?.nature;

  const effectiveType = form.account_type || suggested?.account_type
    || (isGeneral ? inheritedFromGroupType : inheritedType);
  const effectiveNature = form.nature || suggested?.nature
    || (isGeneral ? inheritedFromGroupNature : inheritedNature);

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
      setMsg({ ok: false, text: errText(e, 'خطا در ذخیره') });
    }
  };

  const del = async (id) => {
    try {
      await axiosInstance.delete(`${endpoint}${id}/`);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts', kind] });
    } catch (e) {
      setMsg({ ok: false, text: errText(e, 'حذف ممکن نیست') });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    return list.filter(a => !q || `${a.code} ${a.name}`.includes(q));
  }, [list, search]);

  // تعداد حساب‌های ناهمگون در همین فهرست (نوع ثبت‌شده ≠ نوع گروه/والد)
  const mismatchCount = useMemo(() => list.filter(a => a.type_mismatch).length, [list]);

  // گروه‌هایی که نامشان هیچ نشانه‌ای از طبقه ندارد → نیازمند تعیین دستی نوع
  const reviewGroups = ((syncReport?.groups_report) || [])
    .filter(g => g.source === 'group_type' && (g.accounts_count || 0) > 0);

  const loadSyncPreview = async () => {
    setSyncLoading(true);
    setSyncError(null);
    setSyncReport(null);
    try {
      const { data } = await axiosInstance.get('/accounting/accounts/sync-types/', { params: { fix_groups: 1 } });
      setSyncReport(data);
      setSyncFixGroups((data.groups_to_fix || []).length > 0);
      setSyncOpen(true);
    } catch (e) {
      setMsg({ ok: false, text: errText(e, 'بررسی ناهمگونی کدینگ ممکن نشد') });
    } finally {
      setSyncLoading(false);
    }
  };

  const applySync = async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      const { data } = await axiosInstance.post('/accounting/accounts/sync-types/', {
        apply: 1,
        fix_groups: syncFixGroups ? 1 : 0,
      });
      setSyncReport(data);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts', kind] });
      qc.invalidateQueries({ queryKey: ['acc-groups'] });
      qc.invalidateQueries({ queryKey: ['acc-general'] });
      qc.invalidateQueries({ queryKey: ['balance-sheet'] });
      setMsg({
        ok: true,
        text: `نوع ${data.accounts_updated || 0} حساب اصلاح شد`
          + (data.groups_updated ? ` و ${data.groups_updated} گروه حساب اصلاح شد` : '')
          + '. ترازنامه را دوباره باز کنید.',
      });
    } catch (e) {
      setSyncError(errText(e, 'اعمال اصلاحات ممکن نشد'));
    } finally {
      setSyncLoading(false);
    }
  };

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
        {mismatchCount > 0 && (
          <Chip
            icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
            label={`${mismatchCount} حساب با نوع ناهمگون`}
            sx={{ fontWeight: 700, bgcolor: 'rgba(239,68,68,0.12)', color: '#b91c1c' }}
          />
        )}
        <Button
          size="small"
          variant={mismatchCount > 0 ? 'contained' : 'outlined'}
          startIcon={syncLoading ? <CircularProgress size={16} color="inherit" /> : <BoltIcon />}
          onClick={loadSyncPreview}
          disabled={syncLoading}
          sx={{
            borderRadius: '12px', fontWeight: 700, textTransform: 'none',
            ...(mismatchCount > 0
              ? { background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 8px 20px rgba(220,38,38,0.3)' }
              : { borderColor: `${COLOR}55`, color: COLOR_DARK }),
          }}>
          {mismatchCount > 0 ? 'اصلاح ناهمگونی نوع حساب‌ها' : 'بررسی ناهمگونی نوع حساب‌ها'}
        </Button>
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

              {/* وراثت از والد/گروه: کد پیشنهادی + نوع حساب + ماهیت */}
              <Box sx={{
                p: 1.5, borderRadius: '14px',
                background: 'rgba(59,130,246,0.06)', border: '1px dashed rgba(59,130,246,0.35)',
              }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip size="small" icon={<BoltIcon sx={{ fontSize: 14 }} />}
                    label={`کد پیشنهادی: ${suggested?.code || '—'}`}
                    sx={{ fontWeight: 800, bgcolor: 'rgba(59,130,246,0.14)', color: COLOR_DARK }} />
                  <Chip size="small"
                    label={suggested?.code_basis === 'parent'
                      ? `بر پایهٔ والد ${suggested?.parent_code || ''}`
                      : 'بازهٔ عمومی سطح'}
                    sx={{ fontWeight: 700, bgcolor: 'rgba(100,116,139,0.12)' }} />
                  <Chip size="small"
                    label={`نوع: ${suggested?.account_type_name || typeList.find(t => t.id === effectiveType)?.name || '—'}`}
                    sx={{ fontWeight: 700, bgcolor: 'rgba(37,99,235,0.12)', color: '#1d4ed8' }} />
                  <Chip size="small" label={`ماهیت: ${natureLabel(effectiveNature)}`}
                    sx={{ bgcolor: natureBg(effectiveNature), color: natureColor(effectiveNature), fontWeight: 700 }} />
                  {suggested?.inherited_from ? (
                    <Chip size="small" color="success" variant="outlined"
                      label={suggested.inherited_from === 'parent' ? 'ارث‌بری از والد' : 'ارث‌بری از گروه'}
                      sx={{ fontWeight: 700 }} />
                  ) : (
                    <Chip size="small" color="warning" variant="outlined"
                      label="والد/گروه انتخاب نشده" sx={{ fontWeight: 700 }} />
                  )}
                </Stack>
                {suggested?.full_code ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    مسیر کد: {suggested.full_code}
                  </Typography>
                ) : null}
              </Box>

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
                          <Typography variant="caption" color="textSecondary">
                            {typeName}{parentName ? ` · ${parentName}` : ''}
                            {a.type_mismatch
                              ? ` → باید «${a.parent_type_name || a.group_type_name || '—'}» باشد`
                              : ''}
                          </Typography>
                        </Box>
                        {a.type_mismatch && (
                          <Tooltip title={`نوع ثبت‌شده «${typeName}» با ${a.parent_id ? 'حساب والد' : 'گروه'} «${a.parent_code || a.group_name || '—'}» همخوان نیست؛ به همین دلیل در گزارش‌ها اشتباه دسته‌بندی می‌شود.`}>
                            <Chip size="small" label="نوع ناهمگون" sx={{ bgcolor: 'rgba(239,68,68,0.12)', color: '#b91c1c', fontWeight: 700, flexShrink: 0 }} />
                          </Tooltip>
                        )}
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

      {/* دیالوگ اصلاح ناهمگونی نوع حساب‌ها */}
      <Dialog open={syncOpen} onClose={() => setSyncOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, color: COLOR_DARK, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ color: '#dc2626' }} />
          اصلاح ناهمگونی نوع حساب‌ها
        </DialogTitle>
        <DialogContent dividers>
          {syncError && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{syncError}</Alert>}
          {!syncReport && syncLoading && <Box textAlign="center" py={4}><CircularProgress /></Box>}

          {syncReport && (
            <Stack spacing={2}>
              {syncReport.applied && (
                <Alert severity="success" sx={{ borderRadius: '12px' }}>
                  اعمال شد: {syncReport.accounts_updated || 0} حساب
                  {syncReport.groups_updated ? ` و ${syncReport.groups_updated} گروه` : ''} اصلاح شد.
                </Alert>
              )}

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`کل حساب‌های شرکت: ${syncReport.accounts_total}`} sx={{ fontWeight: 700 }} />
                <Chip
                  label={`ناهمگون: ${syncReport.accounts_mismatched}`}
                  sx={{ fontWeight: 700, bgcolor: syncReport.accounts_mismatched ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: syncReport.accounts_mismatched ? '#b91c1c' : '#047857' }}
                />
                <Chip label={`ماهیت ناهمگون: ${syncReport.nature_mismatched}`} sx={{ fontWeight: 700, bgcolor: 'rgba(245,158,11,0.14)', color: '#b45309' }} />
                <Chip label={`گروه ناهمگون: ${(syncReport.groups_to_fix || []).length}`} sx={{ fontWeight: 700, bgcolor: 'rgba(124,58,237,0.12)', color: '#6d28d9' }} />
              </Stack>

              {Object.keys(syncReport.summary_by_category || {}).length > 0 && (
                <Typography variant="body2" color="textSecondary">
                  انتقال‌ها:{' '}
                  {Object.entries(syncReport.summary_by_category)
                    .map(([k, v]) => `${v} حساب → «${CATEGORY_FA[k] || k}»`)
                    .join(' · ')}
                </Typography>
              )}

              {syncReport.accounts_mismatched === 0 ? (
                <Alert severity="success" sx={{ borderRadius: '12px' }}>
                  هیچ ناهمگونی‌ای یافت نشد؛ نوع همهٔ حساب‌ها با والد/گروه آن‌ها همخوان است.
                </Alert>
              ) : (
                <>
                  <Alert severity="info" sx={{ borderRadius: '12px' }}>
                    این حساب‌ها پیش‌تر با نوع اشتباه (معمولاً «دارایی») ثبت شده‌اند؛ به همین دلیل در
                    ترازنامه و صورت سود و زیان نادرست دسته‌بندی می‌شوند. با «اعمال اصلاحات»، نوع و
                    ماهیت آن‌ها از والد/گروه اصلاح می‌شود.
                  </Alert>
                  <SyncChangeList report={syncReport} />
                </>
              )}

              {!syncReport.applied && (syncReport.groups_to_fix || []).length > 0 && (
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px' }}>
                  <Typography variant="caption" color="textSecondary">گروه‌هایی که نامشان با نوعشان نمی‌خواند:</Typography>
                  <Stack spacing={0.5} mt={0.5}>
                    {syncReport.groups_to_fix.map(g => (
                      <Typography key={g.id} variant="caption">
                        • {g.code} {g.name}: {g.from_type_name} → {g.to_type_name}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              )}

              {reviewGroups.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px', bgcolor: 'rgba(245,158,11,0.06)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#b45309' }}>
                    گروه‌های نیازمند بازبینی دستی ({reviewGroups.length}): نامشان هیچ نشانه‌ای از طبقهٔ حساب ندارد،
                    پس ابزار نمی‌تواند نوعشان را تشخیص دهد؛ نوع را از صفحهٔ «گروه حساب‌ها» تعیین کنید.
                  </Typography>
                  <Stack spacing={0.5} mt={0.5}>
                    {reviewGroups.slice(0, 12).map(g => (
                      <Typography key={g.id} variant="caption">
                        • {g.code} {g.name} — نوع فعلی: {g.current_type_name} — {g.accounts_count} حساب
                      </Typography>
                    ))}
                    {reviewGroups.length > 12 && (
                      <Typography variant="caption">… و {reviewGroups.length - 12} گروه دیگر</Typography>
                    )}
                  </Stack>
                </Paper>
              )}

              <FormControlLabel
                control={<Checkbox checked={syncFixGroups} onChange={e => setSyncFixGroups(e.target.checked)} />}
                label={`اصلاح نوع ${(syncReport.groups_to_fix || []).length} گروه ناهمگون بر پایهٔ نام آن‌ها`}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setSyncOpen(false)} sx={{ fontWeight: 700 }}>بستن</Button>
          <Button
            variant="contained"
            onClick={applySync}
            disabled={syncLoading || !syncReport || syncReport.applied || syncReport.accounts_mismatched === 0}
            sx={{ borderRadius: '12px', fontWeight: 800, background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
            {syncLoading ? <CircularProgress size={20} color="inherit" /> : 'اعمال اصلاحات'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountsClassicPage;