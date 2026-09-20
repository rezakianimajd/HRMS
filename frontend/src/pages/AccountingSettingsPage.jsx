import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, CircularProgress, Button,
  Stack, TextField, Chip, Switch, FormControlLabel, IconButton, Tooltip, Autocomplete,
  FormControl, InputLabel, Select, MenuItem, Alert,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';

const COLOR = '#64748b';
const COLOR_DARK = '#475569';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42))',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 18px 50px rgba(100,116,139,0.14)',
  borderRadius: '20px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.6)',
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(100,116,139,0.12)' },
  },
};

const LEVELS = [
  { value: 'account_type', label: 'نوع حساب' },
  { value: 'group', label: 'گروه حساب' },
  { value: 'general', label: 'حساب کل' },
  { value: 'subsidiary', label: 'حساب معین' },
  { value: 'auxiliary', label: 'حساب تفصیلی' },
  { value: 'cost_center', label: 'مرکز هزینه' },
];

const DEFAULTS = { prefix: '', start_number: 1, end_number: 99, min_length: 1, max_length: 10, is_active: true };

const CodingPanel = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['coding-configs'], queryFn: () => axiosInstance.get('/accounting/coding-configs/').then(r => r.data) });
  const configs = Array.isArray(data) ? data : data?.results || [];

  // local editable state (per level), initialized once quota loads
  const [draft, setDraft] = useState(null);
  const [initializedFor, setInitializedFor] = useState(null);

  useEffect(() => {
    // فقط بعد از لود کامل داده‌ها مقداردهی می‌کنیم تا id رکوردهای موجود حفظ شود
    // و ذخیره به‌صورت PATCH انجام شود (نه POST تکراری).
    if (isLoading) return;
    if (initializedFor === data) return;
    const map = {};
    LEVELS.forEach(l => {
      const found = configs.find(c => c.level === l.value);
      map[l.value] = found ? { ...found } : { level: l.value, ...DEFAULTS };
    });
    setDraft(map);
    setInitializedFor(data);
  }, [isLoading, configs, data]);

  const save = useMutation({
    mutationFn: (cfg) => cfg.id
      ? axiosInstance.patch(`/accounting/coding-configs/${cfg.id}/`, cfg)
      : axiosInstance.post('/accounting/coding-configs/', cfg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coding-configs'] }),
  });

  const setField = (level, key, value) => {
    setDraft(p => ({ ...p, [level]: { ...p[level], [key]: value } }));
  };

  const commit = (level, override) => {
    const cfg = override || draft[level];
    if (!cfg) return;
    save.mutate(cfg);
  };

  if (isLoading || !draft) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  return (
    <Stack spacing={2}>
      {LEVELS.map(level => {
        const c = draft[level.value] || {};
        return (
          <Paper key={level.value} sx={{ ...glass, p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK}>{level.label}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControlLabel
                  control={<Switch size="small" checked={!!c.is_active} onChange={e => { const next = e.target.checked; setField(level.value, 'is_active', next); commit(level.value, { ...draft[level.value], is_active: next }); }} />}
                  label={c.is_active ? 'فعال' : 'غیرفعال'}
                />
                <Chip size="small" label="ذخیره خودکار" icon={<SaveIcon fontSize="small" />} sx={{ display: { xs: 'none', sm: 'flex' } }} />
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <TextField size="small" label="پیشوند" value={c.prefix || ''} onBlur={() => commit(level.value)} onChange={e => setField(level.value, 'prefix', e.target.value)} sx={{ width: 110, ...fieldSx }} />
              <TextField size="small" label="شروع از" type="number" value={c.start_number ?? 1} onBlur={() => commit(level.value)} onChange={e => setField(level.value, 'start_number', Number(e.target.value) || 1)} sx={{ width: 100, ...fieldSx }} />
              <TextField size="small" label="پایان تا" type="number" value={c.end_number ?? 99} onBlur={() => commit(level.value)} onChange={e => setField(level.value, 'end_number', Number(e.target.value) || 99)} sx={{ width: 100, ...fieldSx }} />
              <TextField size="small" label="حداقل طول" type="number" value={c.min_length ?? 1} onBlur={() => commit(level.value)} onChange={e => setField(level.value, 'min_length', Number(e.target.value) || 1)} sx={{ width: 100, ...fieldSx }} />
              <TextField size="small" label="حداکثر طول" type="number" value={c.max_length ?? 10} onBlur={() => commit(level.value)} onChange={e => setField(level.value, 'max_length', Number(e.target.value) || 10)} sx={{ width: 100, ...fieldSx }} />
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'دستی' },
  { value: 'employee', label: 'پرسنل' },
  { value: 'party', label: 'طرف حساب' },
  { value: 'project', label: 'پروژه' },
  { value: 'contract', label: 'قرارداد' },
  { value: 'bank', label: 'بانک' },
  { value: 'cash', label: 'صندوق' },
];

const AuxiliaryCategoriesPanel = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: '', name: '', source: 'manual', sort_order: 0 });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['aux-categories'], queryFn: () => axiosInstance.get('/accounting/auxiliary-categories/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = async () => {
    try {
      if (editing) await axiosInstance.patch(`/accounting/auxiliary-categories/${editing.id}/`, form);
      else await axiosInstance.post('/accounting/auxiliary-categories/', form);
      qc.invalidateQueries({ queryKey: ['aux-categories'] });
      setEditing(null); setForm({ code: '', name: '', source: 'manual', sort_order: 0 });
    } catch (e) { setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }); }
  };

  const del = async (id) => {
    try { await axiosInstance.delete(`/accounting/auxiliary-categories/${id}/`); qc.invalidateQueries({ queryKey: ['aux-categories'] }); }
    catch (e) { setMsg({ ok: false, text: e.response?.data?.error || 'حذف ممکن نیست' }); }
  };

  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  return (
    <Stack spacing={2}>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {/* فرم ساخت دسته */}
      <Paper sx={{ ...glass, p: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} mb={1.5}>{editing ? 'ویرایش دسته' : 'ساخت دسته‌بندی جدید'}</Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="کد دسته" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} sx={{ width: 120, ...fieldSx }} />
          <TextField size="small" label="عنوان دسته" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} sx={{ width: 180, ...fieldSx }} />
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>منبع داده</InputLabel>
            <Select value={form.source} label="منبع داده" onChange={e => setForm(p => ({ ...p, source: e.target.value }))} sx={fieldSx}>
              {SOURCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="ترتیب" type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) || 0 }))} sx={{ width: 90, ...fieldSx }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={save} disabled={!form.code || !form.name}
            sx={{ borderRadius: '12px', background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>
            {editing ? 'ذخیره' : 'افزودن دسته'}
          </Button>
        </Stack>
      </Paper>

      {/* لیست دسته‌ها */}
      <Paper sx={{ ...glass, p: 2 }}>
        <Stack spacing={1}>
          {list.map(c => (
            <Paper key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '12px', background: 'rgba(255,255,255,0.55)' }}>
              <Chip size="small" label={c.code} sx={{ fontWeight: 800, bgcolor: 'rgba(100,116,139,0.1)', color: COLOR_DARK }} />
              <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>{c.name}</Typography>
              <Chip size="small" label={c.source_display || c.source} />
              <IconButton size="small" onClick={() => { setEditing(c); setForm({ code: c.code, name: c.name, source: c.source, sort_order: c.sort_order }); }}><SaveIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del(c.id); }}><DeleteIcon fontSize="small" /></IconButton>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
};

const AccountingSettingsPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '20px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 28px ${COLOR}55` }}>
          <TuneIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>تعاریف اولیهٔ حسابداری</Typography>
          <Typography variant="body2" color="textSecondary">استانداردسازی کدینگ سطوح مختلف حساب</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: '1px solid rgba(255,255,255,0.5)', px: 2 }}>
          <Tab label="کدینگ" sx={{ fontWeight: 700, color: tab === 0 ? COLOR_DARK : undefined }} />
          <Tab label="دسته‌بندی‌های تفصیلی" sx={{ fontWeight: 700, color: tab === 1 ? COLOR_DARK : undefined }} />
        </Tabs>
      </Paper>

      {tab === 0 && <CodingPanel />}
      {tab === 1 && <AuxiliaryCategoriesPanel />}
    </Box>
  );
};

export default AccountingSettingsPage;