import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, TextField, CircularProgress, Stack, Tooltip, Alert, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LaptopIcon from '@mui/icons-material/Laptop';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import DesktopAccessDisabledIcon from '@mui/icons-material/DesktopAccessDisabled';
import KeyIcon from '@mui/icons-material/Key';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import UndoIcon from '@mui/icons-material/Undo';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useAssets, useCreateAsset, useReturnAsset, useUpdateAsset, useDeleteAsset } from '../core/hooks/useLifecycle';
import { useEmployees } from '../core/hooks/useEmployees';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const TYPE_META = {
  laptop: { label: 'لپ‌تاپ', icon: <LaptopIcon fontSize="small" />, color: '#6366f1' },
  phone: { label: 'موبایل', icon: <PhoneAndroidIcon fontSize="small" />, color: '#10b981' },
  desk: { label: 'میز کار', icon: <DesktopAccessDisabledIcon fontSize="small" />, color: '#f59e0b' },
  monitor: { label: 'مانیتور', icon: <Inventory2Icon fontSize="small" />, color: '#3b82f6' },
  key: { label: 'کلید', icon: <KeyIcon fontSize="small" />, color: '#8b5cf6' },
  other: { label: 'سایر', icon: <Inventory2Icon fontSize="small" />, color: '#94a3b8' },
};

const STATUS_META = {
  assigned: { label: 'واگذارشده', color: '#10b981' },
  returned: { label: 'تحویل‌شده', color: '#64748b' },
  lost: { label: 'مفقود', color: '#ef4444' },
  damaged: { label: 'آسیب‌دیده', color: '#f59e0b' },
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.6)',
    transition: 'all 0.2s ease',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(16,185,129,0.12)' },
  },
};

const emptyForm = {
  name: '', asset_type: 'laptop', serial_number: '',
  employee: '', assigned_date: '', return_due_date: '', status: 'assigned', notes: '',
};

const AssetsPage = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [viewAsset, setViewAsset] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [filter, setFilter] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const { data: assets, isLoading } = useAssets();
  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const returnMutation = useReturnAsset();
  const deleteMutation = useDeleteAsset();

  const items = Array.isArray(assets) ? assets : assets?.results || [];
  const filtered = items.filter((a) =>
    (!filter || String(a.employee) === String(filter)) &&
    (!filterStatus || a.status === filterStatus)
  );

  const counts = {
    total: items.length,
    assigned: items.filter((a) => a.status === 'assigned').length,
    returned: items.filter((a) => a.status === 'returned').length,
    lost: items.filter((a) => a.status === 'lost').length,
    damaged: items.filter((a) => a.status === 'damaged').length,
  };

  const openAdd = () => { setEditId(null); setForm(emptyForm); setOpen(true); };

  const openEdit = (a) => {
    setEditId(a.id);
    setForm({
      name: a.name || '',
      asset_type: a.asset_type || 'other',
      serial_number: a.serial_number || '',
      employee: a.employee ?? '',
      assigned_date: a.assigned_date || '',
      return_due_date: a.return_due_date || '',
      status: a.status || 'assigned',
      notes: a.notes || '',
    });
    setOpen(true);
  };

  const doSave = () => {
    const p = { ...form };
    if (p.employee === '' || p.employee == null) p.employee = null;
    if (p.assigned_date === '') p.assigned_date = null;
    if (p.return_due_date === '') p.return_due_date = null;
    if (editId) {
      updateMutation.mutate({ id: editId, data: p }, {
        onSuccess: () => { setOpen(false); setEditId(null); setForm(emptyForm); setMsg('تجهیز ویرایش شد.'); setTimeout(() => setMsg(''), 2500); },
        onError: (e) => setErr(e.response?.data?.error || 'خطا در ویرایش'),
      });
    } else {
      createMutation.mutate(p, {
        onSuccess: () => { setOpen(false); setForm(emptyForm); setMsg('تجهیز ثبت شد.'); setTimeout(() => setMsg(''), 2500); },
        onError: (e) => setErr(e.response?.data?.error || 'خطا در ثبت'),
      });
    }
  };

  const doReturn = (a) => {
    returnMutation.mutate(a.id, {
      onSuccess: () => { setMsg('تجهیز تحویل شد.'); setTimeout(() => setMsg(''), 2500); },
      onError: (e) => setErr(e.response?.data?.error || 'خطا در تحویل'),
    });
  };

  const doDelete = () => {
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { setDeleteId(null); setMsg('تجهیز حذف شد.'); setTimeout(() => setMsg(''), 2500); },
      onError: (e) => setErr(e.response?.data?.error || 'خطا در حذف'),
    });
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(16,185,129,0.10), rgba(59,130,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.16)', borderRadius: '12px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #10b981, #3b82f6)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
          <Inventory2Icon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#047857">اموال و تجهیزات</Typography>
          <Typography variant="body2" color="textSecondary">
            {formatPersianNumber(counts.assigned)} تجهیز در حال واگذاری · {formatPersianNumber(counts.total)} مجموع
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', borderRadius: '10px', px: 2.5, whiteSpace: 'nowrap' }}>
          ثبت تجهیز
        </Button>
      </Paper>

      {(msg || err) && (
        <Alert severity={err ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => { setMsg(''); setErr(''); }}>{err || msg}</Alert>
      )}

      {/* KPI cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { label: 'کل تجهیزات', value: counts.total, color: '#6366f1', icon: <Inventory2Icon sx={{ fontSize: 18 }} /> },
          { label: 'واگذارشده', value: counts.assigned, color: '#10b981', icon: <LaptopIcon sx={{ fontSize: 18 }} /> },
          { label: 'تحویل‌شده', value: counts.returned, color: '#64748b', icon: <UndoIcon sx={{ fontSize: 18 }} /> },
          { label: 'مفقود', value: counts.lost, color: '#ef4444', icon: <DeleteIcon sx={{ fontSize: 18 }} /> },
          { label: 'آسیب‌دیده', value: counts.damaged, color: '#f59e0b', icon: <DesktopAccessDisabledIcon sx={{ fontSize: 18 }} /> },
        ].map(k => (
          <Grid item xs={6} sm={4} md={2.4} key={k.label}>
            <Paper sx={{ p: 1.5, borderRadius: '12px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(100,116,139,0.14)', display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: `${k.color}18`, color: k.color }}>{k.icon}</Avatar>
              <Box>
                <Typography variant="caption" color="textSecondary" display="block" noWrap>{k.label}</Typography>
                <Typography variant="h6" fontWeight={800} color={k.color} noWrap>{formatPersianNumber(k.value)}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 260 } }}>
            <InputLabel>فیلتر پرسنل</InputLabel>
            <Select value={filter || ''} label="فیلتر پرسنل" onChange={(e) => setFilter(e.target.value)}>
              <MenuItem value="">همه پرسنل</MenuItem>
              {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
            <InputLabel>فیلتر وضعیت</InputLabel>
            <Select value={filterStatus || ''} label="فیلتر وضعیت" onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="">همه وضعیت‌ها</MenuItem>
              {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Inventory2Icon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="textSecondary">تجهیزی ثبت نشده است.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(16,185,129,0.06)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>تجهیز</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>نوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>سریال</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>پرسنل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاریخ واگذاری</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>بازگشت مورد انتظار</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>وضعیت</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((a) => {
                  const tm = TYPE_META[a.asset_type] || TYPE_META.other;
                  const sm = STATUS_META[a.status] || STATUS_META.assigned;
                  return (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 30, height: 30, bgcolor: `${tm.color}18`, color: tm.color }}>{tm.icon}</Avatar>
                          <Typography variant="body2" fontWeight={700}>{a.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={a.asset_type_display || tm.label}
                          sx={{ bgcolor: `${tm.color}18`, color: tm.color, fontWeight: 700, fontSize: 11 }} />
                      </TableCell>
                      <TableCell>{a.serial_number ? toPersianDigits(a.serial_number) : '—'}</TableCell>
                      <TableCell>{a.employee_name || '—'}</TableCell>
                      <TableCell>{a.assigned_date ? toJalali(a.assigned_date) : '—'}</TableCell>
                      <TableCell>{a.return_due_date ? toJalali(a.return_due_date) : '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={a.status_display || sm.label}
                          sx={{ bgcolor: `${sm.color}18`, color: sm.color, fontWeight: 700, fontSize: 11 }} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="جزئیات">
                          <IconButton size="small" color="info" onClick={() => setViewAsset(a)}><VisibilityIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="ویرایش">
                          <IconButton size="small" color="primary" onClick={() => openEdit(a)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        {a.status !== 'returned' && (
                          <Tooltip title="تحویل">
                            <IconButton size="small" color="success" onClick={() => doReturn(a)}><UndoIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => setDeleteId(a.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Create/Edit dialog */}
      <Dialog open={open} onClose={() => { setOpen(false); setEditId(null); setForm(emptyForm); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#047857', fontWeight: 800, borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
          {editId ? 'ویرایش تجهیز' : 'ثبت تجهیز جدید'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={800} color="#047857">اطلاعات پایه</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="نام تجهیز *" value={form.name} sx={fieldSx}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>نوع</InputLabel>
                  <Select value={form.asset_type} label="نوع" onChange={(e) => setForm((p) => ({ ...p, asset_type: e.target.value }))}>
                    {Object.entries(TYPE_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField fullWidth size="small" label="سریال / شناسه" value={form.serial_number} sx={fieldSx}
              onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))} />

            <Divider />

            <Typography variant="subtitle2" fontWeight={800} color="#047857">واگذاری و تاریخ‌ها</Typography>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>پرسنل واگذارشده</InputLabel>
              <Select value={form.employee || ''} label="پرسنل واگذارشده" onChange={(e) => setForm((p) => ({ ...p, employee: e.target.value }))}>
                <MenuItem value="">بدون پرسنل</MenuItem>
                {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
              </Select>
            </FormControl>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <JalaliDatePicker fullWidth label="تاریخ واگذاری" value={form.assigned_date}
                  onChange={(g) => setForm((p) => ({ ...p, assigned_date: g }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <JalaliDatePicker fullWidth label="بازگشت مورد انتظار" value={form.return_due_date}
                  onChange={(g) => setForm((p) => ({ ...p, return_due_date: g }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>وضعیت</InputLabel>
                  <Select value={form.status} label="وضعیت" onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider />

            <TextField fullWidth size="small" label="یادداشت" multiline rows={3} value={form.notes} sx={fieldSx}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setOpen(false); setEditId(null); setForm(emptyForm); }}>انصراف</Button>
          <Button variant="contained" disabled={!form.name} onClick={doSave}
            sx={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', borderRadius: '10px', px: 3 }}>
            {editId ? 'ذخیره تغییرات' : 'ثبت تجهیز'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewAsset} onClose={() => setViewAsset(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#047857', fontWeight: 800, borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
          جزئیات تجهیز
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {viewAsset && (() => {
            const tm = TYPE_META[viewAsset.asset_type] || TYPE_META.other;
            const sm = STATUS_META[viewAsset.status] || STATUS_META.assigned;
            return (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: `${tm.color}18`, color: tm.color }}>{tm.icon}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={800}>{viewAsset.name}</Typography>
                    <Chip size="small" label={viewAsset.status_display || sm.label}
                      sx={{ bgcolor: `${sm.color}18`, color: sm.color, fontWeight: 700, fontSize: 11, mt: 0.25 }} />
                  </Box>
                </Box>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'نوع', value: viewAsset.asset_type_display || tm.label },
                    { label: 'سریال / شناسه', value: viewAsset.serial_number ? toPersianDigits(viewAsset.serial_number) : '—' },
                    { label: 'پرسنل', value: viewAsset.employee_name || '—' },
                    { label: 'تاریخ واگذاری', value: viewAsset.assigned_date ? toJalali(viewAsset.assigned_date) : '—' },
                    { label: 'بازگشت مورد انتظار', value: viewAsset.return_due_date ? toJalali(viewAsset.return_due_date) : '—' },
                    { label: 'تاریخ تحویل', value: viewAsset.returned_date ? toJalali(viewAsset.returned_date) : '—' },
                  ].map(f => (
                    <Grid item xs={12} sm={6} key={f.label}>
                      <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
                        <Typography variant="caption" color="textSecondary" display="block">{f.label}</Typography>
                        <Typography variant="body2" fontWeight={700}>{f.value}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                {viewAsset.notes && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800} color="#047857" mb={0.5}>یادداشت</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewAsset.notes}</Typography>
                  </Box>
                )}
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setViewAsset(null)}
            sx={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', borderRadius: '10px', px: 3 }}>بستن</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#b91c1c', fontWeight: 800 }}>حذف تجهیز</DialogTitle>
        <DialogContent>
          <Typography variant="body2">آیا از حذف این تجهیز اطمینان دارید؟ این عملیات قابل بازگشت نیست.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)}>انصراف</Button>
          <Button variant="contained" color="error" onClick={doDelete}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetsPage;



