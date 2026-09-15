import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, Button, CircularProgress,
  Grid, TextField, FormControl, InputLabel, Select, MenuItem, Chip,
  Stack, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#3b82f6';
const COLOR_DARK = '#2563eb';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(59,130,246,0.12)',
  borderRadius: '16px',
};

const fieldSx = (w) => ({
  width: w || 'auto',
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px', background: 'rgba(255,255,255,0.55)',
    '&.Mui-focused': { background: 'rgba(255,255,255,0.95)', boxShadow: '0 0 0 3px #3b82f622' },
  },
});

/* Generic entity CRUD panel (list + add/edit dialog). */
const EntityPanel = ({ endpoint, columns, fields, title, extra, searchFields }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => axiosInstance.get(endpoint).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (p) => editing ? axiosInstance.patch(`${endpoint}${editing.id}/`, p) : axiosInstance.post(endpoint, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); setOpen(false); setEditing(null); setForm({}); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${endpoint}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [endpoint] }),
  });

  const openNew = () => { setEditing(null); setForm({}); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm(row); setOpen(true); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Paper sx={{ ...glass, p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK}>{title}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '10px' }}>
          افزودن
        </Button>
      </Stack>

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map(c => <TableCell key={c.key}>{c.label}</TableCell>)}
                <TableCell>عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length + 1} align="center" sx={{ color: 'text.secondary' }}>موردی ثبت نشده است</TableCell></TableRow>
              ) : list.map(row => (
                <TableRow key={row.id} hover>
                  {columns.map(c => (
                    <TableCell key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</TableCell>
                  ))}
                  <TableCell>
                    <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(row.id); }}><DeleteIcon fontSize="small" /></IconButton>
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
          ) : f.type === 'date' ? (
            <JalaliDatePicker key={f.key} fullWidth label={f.label} value={form[f.key] || ''} onChange={v => set(f.key, v)} />
          ) : f.type === 'number' ? (
            <TextField key={f.key} fullWidth size="small" type="number" label={f.label} value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
          ) : (
            <TextField key={f.key} fullWidth size="small" label={f.label} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate(form)} disabled={save.isLoading}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>
            {save.isLoading ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const NATURE_OPTS = [{ value: 'debit', label: 'بدهکار' }, { value: 'credit', label: 'بستانکار' }];
const CATEGORY_OPTS = [
  { value: 'asset', label: 'دارایی' }, { value: 'liability', label: 'بدهی' },
  { value: 'equity', label: 'حقوق مالکانه' }, { value: 'revenue', label: 'درآمد' },
  { value: 'cost_of_sales', label: 'بهای تمام‌شده' }, { value: 'expense', label: 'هزینه' },
  { value: 'memorandum', label: 'خارج از تراز' },
];

const AccountingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const tabs = [
    { path: '/accounting', label: 'داشبورد' },
    { path: '/accounting/chart', label: 'سرفصل حساب‌ها' },
    { path: '/accounting/accounts', label: 'حساب‌ها' },
    { path: '/accounting/auxiliary', label: 'تفصیلی' },
    { path: '/accounting/cost-centers', label: 'مراکز هزینه' },
    { path: '/accounting/dimensions', label: 'ابعاد مالی' },
    { path: '/accounting/fiscal-years', label: 'سال‌های مالی' },
  ];

  const activeIndex = Math.max(0, tabs.findIndex(t => t.path === path));

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <CalculateIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>حسابداری</Typography>
          <Typography variant="body2" color="textSecondary">هستهٔ مالی مرکزی — سرفصل حساب‌ها، مراکز هزینه، ابعاد و دورهٔ مالی</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden', mb: 2 }}>
        <Tabs value={activeIndex} onChange={(e, v) => navigate(tabs[v].path)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(225,225,225,0.5)', px: 2 }}>
          {tabs.map((t, i) => <Tab key={t.path} label={t.label} sx={{ fontWeight: 600, color: activeIndex === i ? COLOR_DARK : undefined }} />)}
        </Tabs>
      </Paper>

      {activeIndex === 0 && (
        <Paper sx={{ ...glass, p: 4, textAlign: 'center' }}>
          <CalculateIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>داشبورد حسابداری</Typography>
          <Typography color="textSecondary" mt={1}>
            گزارش‌های کلان مالی (ترازنامه، سود و زیان و ...) در فازهای بعدی اضافه می‌شوند.
          </Typography>
        </Paper>
      )}

      {activeIndex === 1 && (
        <EntityPanel
          endpoint="/accounting/account-types/"
          title="انواع حساب (سرفصل)"
          columns={[
            { key: 'code', label: 'کد' },
            { key: 'name', label: 'عنوان' },
            { key: 'category_display', label: 'طبقه' },
            { key: 'default_nature', label: 'ماهیت' },
          ]}
          fields={[
            { key: 'code', label: 'کد' },
            { key: 'name', label: 'عنوان' },
            { key: 'category', label: 'طبقه', type: 'select', options: CATEGORY_OPTS },
            { key: 'default_nature', label: 'ماهیت پیش‌فرض', type: 'select', options: NATURE_OPTS },
          ]}
        />
      )}

      {activeIndex === 2 && (
        <EntityPanel
          endpoint="/accounting/accounts/"
          title="حساب‌ها"
          columns={[
            { key: 'code', label: 'کد' },
            { key: 'name', label: 'نام حساب' },
            { key: 'full_code', label: 'مسیر' },
          ]}
          fields={[
            { key: 'code', label: 'کد حساب' },
            { key: 'name', label: 'نام حساب' },
            { key: 'nature', label: 'ماهیت', type: 'select', options: NATURE_OPTS },
            { key: 'level', label: 'سطح', type: 'number' },
          ]}
        />
      )}

      {activeIndex === 3 && (
        <EntityPanel
          endpoint="/accounting/auxiliary-accounts/"
          title="حساب‌های تفصیلی"
          columns={[
            { key: 'code', label: 'کد' },
            { key: 'name', label: 'نام' },
            { key: 'aux_type_display', label: 'نوع' },
          ]}
          fields={[
            { key: 'code', label: 'کد تفصیلی' },
            { key: 'name', label: 'نام تفصیلی' },
            { key: 'aux_type', label: 'نوع تفصیلی', type: 'select', options: [
              { value: 'party', label: 'طرف حساب' }, { value: 'customer', label: 'مشتری' },
              { value: 'supplier', label: 'تأمین‌کننده' }, { value: 'contractor', label: 'پیمانکار' },
              { value: 'employee', label: 'پرسنل' }, { value: 'bank', label: 'بانک' },
              { value: 'cash', label: 'صندوق' }, { value: 'project', label: 'پروژه' },
              { value: 'contract', label: 'قرارداد' }, { value: 'other', label: 'سایر' },
            ] },
          ]}
        />
      )}

      {activeIndex === 4 && (
        <EntityPanel
          endpoint="/accounting/cost-centers/"
          title="مراکز هزینه"
          columns={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام مرکز هزینه' }]}
          fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام مرکز هزینه' }]}
        />
      )}

      {activeIndex === 5 && (
        <EntityPanel
          endpoint="/accounting/dimensions/"
          title="ابعاد مالی"
          columns={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام بُعد' }]}
          fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام بُعد' }]}
        />
      )}

      {activeIndex === 6 && (
        <EntityPanel
          endpoint="/accounting/fiscal-years/"
          title="سال‌های مالی"
          columns={[
            { key: 'name', label: 'عنوان' },
            { key: 'start_date', label: 'شروع', render: r => toJalali(r.start_date) },
            { key: 'end_date', label: 'پایان', render: r => toJalali(r.end_date) },
            { key: 'status_display', label: 'وضعیت' },
          ]}
          fields={[
            { key: 'name', label: 'عنوان سال مالی' },
            { key: 'start_date', label: 'تاریخ شروع', type: 'date' },
            { key: 'end_date', label: 'تاریخ پایان', type: 'date' },
            { key: 'status', label: 'وضعیت', type: 'select', options: [
              { value: 'draft', label: 'پیش‌نویس' }, { value: 'open', label: 'باز' },
              { value: 'closed', label: 'بسته' }, { value: 'locked', label: 'قفل‌شده' },
            ] },
          ]}
        />
      )}
    </Box>
  );
};

export default AccountingPage;