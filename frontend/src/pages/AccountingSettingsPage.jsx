import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import {
  Box, Typography, Paper, Tabs, Tab, CircularProgress, Button,
  Stack, TextField, Chip, Switch, FormControlLabel, IconButton, Tooltip,
  FormControl, InputLabel, Select, MenuItem, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DefinitionTable, { CodeName } from './accounting/DefinitionTable';
import { toPersianDigits } from '../core/utils/numberUtils';

const glass = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.07)',
  boxShadow: 'none',
  borderRadius: '16px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    background: '#ffffff',
    '&.Mui-focused': { background: '#ffffff' },
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
    <Paper sx={{ ...glass, p: 0, overflow: 'hidden' }}>
      <Box sx={{
        px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap',
      }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={500}>ساختار کدینگ حساب‌ها</Typography>
          <Typography variant="caption" color="text.secondary">پیشوند، بازهٔ شماره و طول کد هر سطح را تعیین کنید.</Typography>
        </Box>
        <Chip size="small" variant="outlined" icon={<SaveIcon fontSize="small" />} label="ذخیره خودکار" />
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 330px)' }}>
        <Table size="small" stickyHeader sx={{ '& td, & th': { px: 1.25, py: 0.9 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>سطح</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>پیشوند</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>شماره از</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>شماره تا</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>حداقل طول</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>حداکثر طول</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>نمونه کد</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>وضعیت</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {LEVELS.map(level => {
              const c = draft[level.value] || {};
              const sample = `${c.prefix || ''}${String(c.start_number ?? 1).padStart(Math.max(Number(c.min_length) || 1, 1), '0')}`;
              return (
                <TableRow key={level.value} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{level.label}</TableCell>
                  <TableCell>
                    <TextField size="small" value={c.prefix || ''} onChange={e => setField(level.value, 'prefix', e.target.value)}
                      onBlur={() => commit(level.value)} sx={{ width: 90, ...fieldSx }} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={c.start_number ?? 1}
                      onChange={e => setField(level.value, 'start_number', Number(e.target.value) || 1)}
                      onBlur={() => commit(level.value)} sx={{ width: 90, ...fieldSx }} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={c.end_number ?? 99}
                      onChange={e => setField(level.value, 'end_number', Number(e.target.value) || 99)}
                      onBlur={() => commit(level.value)} sx={{ width: 90, ...fieldSx }} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={c.min_length ?? 1}
                      onChange={e => setField(level.value, 'min_length', Number(e.target.value) || 1)}
                      onBlur={() => commit(level.value)} sx={{ width: 80, ...fieldSx }} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={c.max_length ?? 10}
                      onChange={e => setField(level.value, 'max_length', Number(e.target.value) || 10)}
                      onBlur={() => commit(level.value)} sx={{ width: 80, ...fieldSx }} />
                  </TableCell>
                  <TableCell align="center">
                    <Typography component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                      {toPersianDigits(sample || '—')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <FormControlLabel
                      sx={{ m: 0, justifyContent: 'center' }}
                      control={<Switch size="small" checked={!!c.is_active}
                        onChange={e => { const next = e.target.checked; setField(level.value, 'is_active', next); commit(level.value, { ...draft[level.value], is_active: next }); }} />}
                      label={<Typography variant="caption" color="text.secondary">{c.is_active ? 'فعال' : 'غیرفعال'}</Typography>}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
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
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

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

  const startEdit = (category) => {
    setEditing(category);
    setForm({ code: category.code, name: category.name, source: category.source, sort_order: category.sort_order });
  };

  const filtered = list.filter((category) => {
    const q = search.trim();
    return (!q || `${category.code} ${category.name}`.includes(q))
      && (!sourceFilter || category.source === sourceFilter);
  });

  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  return (
    <Stack spacing={2}>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Paper sx={{ ...glass, p: 2 }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={500}>{editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی تفصیلی جدید'}</Typography>
          <Typography variant="caption" color="text.secondary">کد، عنوان و منبع دادهٔ دسته را مشخص کنید.</Typography>
        </Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap>
          <TextField size="small" label="کد دسته" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} sx={{ width: { xs: '100%', md: 130 }, ...fieldSx }} />
          <TextField size="small" label="عنوان دسته" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} sx={{ width: { xs: '100%', md: 220 }, ...fieldSx }} />
          <FormControl size="small" sx={{ width: { xs: '100%', md: 160 } }}>
            <InputLabel>منبع داده</InputLabel>
            <Select value={form.source} label="منبع داده" onChange={e => setForm(p => ({ ...p, source: e.target.value }))} sx={fieldSx}>
              {SOURCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="ترتیب" type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) || 0 }))} sx={{ width: { xs: '100%', md: 100 }, ...fieldSx }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={save} disabled={!form.code || !form.name}>
            {editing ? 'ذخیره' : 'افزودن دسته'}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap>
          <TextField size="small" placeholder="جستجوی کد یا عنوان دسته…" value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 180 } }}>
            <InputLabel>منبع داده</InputLabel>
            <Select value={sourceFilter} label="منبع داده" onChange={e => setSourceFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {SOURCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <DefinitionTable
        rows={filtered}
        emptyText="دسته‌بندی‌ای ثبت نشده است."
        activeId={editing?.id}
        onRowClick={startEdit}
        columns={[
          { key: 'code_name', label: 'کد / عنوان', render: c => <CodeName code={c.code} name={c.name} /> },
          { key: 'source', label: 'منبع داده', width: 170, render: c => c.source_display || SOURCE_OPTIONS.find(o => o.value === c.source)?.label || '—' },
          { key: 'sort_order', label: 'ترتیب', width: 90, align: 'center', render: c => toPersianDigits(c.sort_order ?? 0) },
          {
            key: 'actions', label: 'عملیات', width: 95, align: 'center',
            render: c => (
              <>
                <Tooltip title="ویرایش"><IconButton size="small" onClick={(e) => { e.stopPropagation(); startEdit(c); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="حذف"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); if (window.confirm('حذف؟')) del(c.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </>
            ),
          },
        ]}
        maxHeight="calc(100vh - 430px)"
      />
    </Stack>
  );
};

const AccountingSettingsPage = ({ embedded = false }) => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      {!embedded && <PageHeader icon={<TuneIcon />} title="تعاریف اولیهٔ حسابداری" />}

      <Paper sx={{ ...glass, overflow: 'hidden', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{
            minHeight: 48,
            px: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 48, minWidth: 0, px: 2, fontSize: 13, fontWeight: 500, textTransform: 'none' },
          }}
        >
          <Tab label="کدینگ" />
          <Tab label="دسته‌بندی‌های تفصیلی" />
        </Tabs>
      </Paper>

      {tab === 0 && <CodingPanel />}
      {tab === 1 && <AuxiliaryCategoriesPanel />}
    </Box>
  );
};

export default AccountingSettingsPage;