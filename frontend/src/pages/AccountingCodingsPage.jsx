import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, Autocomplete, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CategoryIcon from '@mui/icons-material/Category';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(99,102,241,0.12)',
  borderRadius: '16px',
};

const CodingsPanel = ({
  title, icon, endpoint, level, columns, fields, transformList, buildPayload, warnDelete,
}) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: [endpoint], queryFn: () => axiosInstance.get(endpoint).then(r => r.data) });
  const { data: suggested } = useQuery({
    queryKey: ['suggest-code', level],
    queryFn: () => axiosInstance.get('/accounting/coding-configs/suggest/', { params: { level } }).then(r => r.data),
    enabled: !!level,
  });
  const raw = Array.isArray(data) ? data : data?.results || [];
  const list = transformList ? transformList(raw) : raw;

  const save = useMutation({
    mutationFn: (p) => editing ? axiosInstance.patch(`${endpoint}${editing.id}/`, p) : axiosInstance.post(endpoint, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); setOpen(false); setEditing(null); setForm({}); },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }),
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${endpoint}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [endpoint] }),
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'حذف ممکن نیست' }),
  });

  const openNew = () => { setEditing(null); setForm({ code: suggested?.code || '' }); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm(row); setOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Paper sx={{ ...glass, p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 40, height: 40, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 6px 16px ${COLOR}55` }}>{icon}</Avatar>
          <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK}>{title}</Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '10px' }}>
          افزودن
        </Button>
      </Stack>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{columns.map(c => <TableCell key={c.key}>{c.label}</TableCell>)}<TableCell>عملیات</TableCell></TableRow></TableHead>
            <TableBody>
              {list.length === 0
                ? <TableRow><TableCell colSpan={columns.length + 1} align="center" sx={{ color: 'text.secondary' }}>موردی ثبت نشده است</TableCell></TableRow>
                : list.map(row => (
                  <TableRow key={row.id} hover>
                    {columns.map(c => <TableCell key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</TableCell>)}
                    <TableCell>
                      <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => {
                        if (warnDelete && warnDelete(row)) { setMsg({ ok: false, text: warnDelete(row) }); return; }
                        if (window.confirm('حذف؟')) del.mutate(row.id);
                      }}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: COLOR_DARK }}>{editing ? 'ویرایش' : 'افزودن'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {fields.map(f => f.type === 'select' ? (
            <FormControl key={f.key} fullWidth size="small">
              <InputLabel>{f.label}</InputLabel>
              <Select value={form[f.key] || ''} label={f.label} onChange={e => set(f.key, e.target.value)}>
                <MenuItem value="">—</MenuItem>
                {(f.options || []).map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          ) : f.type === 'autocomplete' ? (
            <Autocomplete key={f.key} size="small" options={f.options || []} getOptionLabel={f.getLabel || (o => o.name)}
              value={(f.options || []).find(o => o.id === form[f.key]) || null}
              onChange={(e, v) => set(f.key, v ? v.id : '')}
              renderInput={p => <TextField {...p} label={f.label} />} />
          ) : f.type === 'number' ? (
            <TextField key={f.key} fullWidth size="small" type="number" label={f.label} value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
          ) : f.type === 'date' ? (
            <JalaliDatePicker key={f.key} fullWidth label={f.label} value={form[f.key] || ''} onChange={v => set(f.key, v)} />
          ) : (
            <TextField
              key={f.key} fullWidth size="small" label={f.label} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
              InputProps={f.key === 'code' ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="پیشنهاد کد بعدی"><IconButton size="small" onClick={() => set('code', suggested?.code || '')}><BoltIcon fontSize="small" color="primary" /></IconButton></Tooltip>
                  </InputAdornment>
                ),
              } : undefined}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate(buildPayload ? buildPayload(form) : form)} disabled={save.isLoading}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>
            {save.isLoading ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const AccountingCodingsPage = () => {
  const { kind } = useParams();
  const { data: types } = useQuery({ queryKey: ['acc-types'], queryFn: () => axiosInstance.get('/accounting/account-types/').then(r => r.data) });
  const { data: groups } = useQuery({ queryKey: ['acc-groups'], queryFn: () => axiosInstance.get('/accounting/account-groups/').then(r => r.data) });
  const { data: generals } = useQuery({ queryKey: ['acc-general'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'general' } }).then(r => r.data) });
  const { data: subsidiaries } = useQuery({ queryKey: ['acc-subsidiary'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } }).then(r => r.data) });
  const { data: auxiliaries } = useQuery({ queryKey: ['acc-aux'], queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/').then(r => r.data) });

  const typeList = Array.isArray(types) ? types : types?.results || [];
  const groupList = Array.isArray(groups) ? groups : groups?.results || [];
  const generalList = Array.isArray(generals) ? generals : generals?.results || [];
  const subsidiaryList = Array.isArray(subsidiaries) ? subsidiaries : subsidiaries?.results || [];
  const auxList = Array.isArray(auxiliaries) ? auxiliaries : auxiliaries?.results || [];

  const pageMeta = {
    groups: {
      title: 'گروه حساب‌ها', icon: <CategoryIcon sx={{ color: '#fff', fontSize: 22 }} />,
      endpoint: '/accounting/account-groups/',
      columns: [{ key: 'code', label: 'کد' }, { key: 'name', label: 'عنوان گروه' }],
      fields: [
        { key: 'account_type', label: 'نوع حساب', type: 'autocomplete', options: typeList, getLabel: o => o.name },
        { key: 'code', label: 'کد' },
        { key: 'name', label: 'عنوان گروه' },
      ],
      transformList: (raw) => raw.map(g => ({ ...g, account_type_name: g.account_type_name || typeList.find(t => t.id === g.account_type)?.name })),
    },
    general: {
      title: 'حساب‌های کل', icon: <AccountTreeIcon sx={{ color: '#fff', fontSize: 22 }} />,
      endpoint: '/accounting/accounts/',
      level: 'general',
      columns: [{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام حساب کل' }, { key: 'nature', label: 'ماهیت' }],
      fields: [
        { key: 'account_type', label: 'نوع حساب', type: 'autocomplete', options: typeList, getLabel: o => o.name },
        { key: 'code', label: 'کد' }, { key: 'name', label: 'نام حساب کل' },
        { key: 'nature', label: 'ماهیت', type: 'select', options: [{ value: 'debit', label: 'بدهکار' }, { value: 'credit', label: 'بستانکار' }] },
      ],
      buildPayload: (f) => ({ ...f, parent: null }),
    },
    subsidiary: {
      title: 'حساب‌های معین', icon: <AccountTreeIcon sx={{ color: '#fff', fontSize: 22 }} />,
      endpoint: '/accounting/accounts/',
      level: 'subsidiary',
      columns: [{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام حساب معین' }, { key: 'parent_code', label: 'حساب کل' }],
      fields: [
        { key: 'parent', label: 'حساب کل', type: 'autocomplete', options: generalList, getLabel: o => `${o.code} - ${o.name}` },
        { key: 'account_type', label: 'نوع حساب', type: 'autocomplete', options: typeList, getLabel: o => o.name },
        { key: 'code', label: 'کد' }, { key: 'name', label: 'نام حساب معین' },
        { key: 'nature', label: 'ماهیت', type: 'select', options: [{ value: 'debit', label: 'بدهکار' }, { value: 'credit', label: 'بستانکار' }] },
      ],
      transformList: (raw) => {
        const gen = generals||[];
        return raw.filter(a => a.parent).map(a => ({ ...a, parent_code: (gen.find(g => g.id === a.parent)?.code) || '—' }));
      },
      buildPayload: (f) => ({ ...f }),
    },
    auxiliary: {
      title: 'حساب‌های تفصیلی', icon: <CategoryIcon sx={{ color: '#fff', fontSize: 22 }} />,
      endpoint: '/accounting/auxiliary-accounts/',
      level: 'auxiliary',
      columns: [{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام تفصیلی' }, { key: 'aux_level', label: 'سطح' }],
      fields: [
        { key: 'account', label: 'حساب معین', type: 'autocomplete', options: subsidiaryList, getLabel: o => `${o.code} - ${o.name}` },
        { key: 'parent', label: 'تفصیلی بالادستی', type: 'autocomplete', options: auxList, getLabel: o => `${o.code} - ${o.name}` },
        { key: 'code', label: 'کد' }, { key: 'name', label: 'نام تفصیلی' },
        { key: 'aux_level', label: 'سطح (۱ تا ۳)', type: 'number' },
      ],
    },
    costcenters: {
      title: 'مراکز هزینه', icon: <CategoryIcon sx={{ color: '#fff', fontSize: 22 }} />,
      endpoint: '/accounting/cost-centers/',
      level: 'cost_center',
      columns: [{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام مرکز هزینه' }],
      fields: [{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام مرکز هزینه' }],
    },
    dimensions: {
      title: 'ابعاد مالی', icon: <CategoryIcon sx={{ color: '#fff', fontSize: 22 }} />,
      endpoint: '/accounting/dimensions/',
      columns: [{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام بُعد مالی' }],
      fields: [{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام بُعد مالی' }],
    },
    fiscalyears: {
      title: 'سال‌های مالی', icon: <CategoryIcon sx={{ color: '#fff', fontSize: 22 }} />,
      endpoint: '/accounting/fiscal-years/',
      columns: [
        { key: 'name', label: 'عنوان' },
        { key: 'start_date', label: 'شروع', render: r => toJalali(r.start_date) },
        { key: 'end_date', label: 'پایان', render: r => toJalali(r.end_date) },
        { key: 'status_display', label: 'وضعیت', render: r => r.status_display || r.status },
      ],
      fields: [
        { key: 'name', label: 'عنوان سال مالی' },
        { key: 'start_date', label: 'تاریخ شروع', type: 'date' },
        { key: 'end_date', label: 'تاریخ پایان', type: 'date' },
        { key: 'status', label: 'وضعیت', type: 'select', options: [
          { value: 'draft', label: 'پیش‌نویس' }, { value: 'open', label: 'باز' },
          { value: 'closed', label: 'بسته' }, { value: 'locked', label: 'قفل‌شده' },
        ] },
      ],
    },
  };

  const meta = pageMeta[kind];
  if (!meta) return <Typography>ناشناخته</Typography>;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          {meta.icon}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>{meta.title}</Typography>
          <Typography variant="body2" color="textSecondary">کدینگ حسابداری — افزودن، ویرایش و حذف</Typography>
        </Box>
      </Paper>

      <CodingsPanel {...meta} />
    </Box>
  );
};

export default AccountingCodingsPage;