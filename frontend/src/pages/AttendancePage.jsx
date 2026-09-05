import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, TextField, CircularProgress, Alert, Stack, Divider, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import BulkExcelImport from '../core/components/ui/BulkExcelImport';
import { useEmployees } from '../core/hooks/useEmployees';

/* Attendance module: register daily presence per employee, with monthly summary.
   2026-style glassy cards and helpful badges. */

const emptyForm = {
  id: null,
  employee: '',
  date: '',
  status: 'present',
  check_in: '',
  check_out: '',
  work_hours: 0,
  overtime_hours: 0,
  note: '',
};

const STATUS_META = {
  present: { label: 'حضور', color: '#10b981', icon: <CheckCircleIcon fontSize="small" /> },
  absent: { label: 'غیبت', color: '#ef4444', icon: <EventBusyIcon fontSize="small" /> },
  leave: { label: 'مرخصی', color: '#f59e0b', icon: <BeachAccessIcon fontSize="small" /> },
  mission: { label: 'مأموریت', color: '#3b82f6', icon: <FlightTakeoffIcon fontSize="small" /> },
  holiday: { label: 'تعطیل', color: '#94a3b8', icon: <EventBusyIcon fontSize="small" /> },
};

const AttendancePage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const queryParams = {};
  if (employeeFilter) queryParams.employee_id = employeeFilter;
  if (statusFilter) queryParams.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-records', queryParams],
    queryFn: () => axiosInstance.get('/attendance-records/', { params: queryParams }).then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  const { data: summary } = useQuery({
    queryKey: ['attendance-month-summary'],
    queryFn: () => axiosInstance.get('/attendance-records/month_summary/').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`/attendance-records/${payload.id}/`, payload)
        : axiosInstance.post('/attendance-records/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-month-summary'] });
      setOpen(false); setError('');
    },
    onError: (e) => setError(e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || 'خطا در ذخیره'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/attendance-records/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-month-summary'] });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const openEdit = (rec) => {
    setEditing(rec);
    setForm({
      id: rec.id,
      employee: rec.employee,
      date: rec.date || '',
      status: rec.status || 'present',
      check_in: rec.check_in || '',
      check_out: rec.check_out || '',
      work_hours: Number(rec.work_hours || 0),
      overtime_hours: Number(rec.overtime_hours || 0),
      note: rec.note || '',
    });
    setError('');
    setOpen(true);
  };

  const empName = (id) => empList.find(x => String(x.id) === String(id))?.full_name || '—';
  const empCode = (id) => empList.find(x => String(x.id) === String(id))?.employee_id || '';

  const stat = (label, value, color, icon) => (
    <Grid item xs={6} md={3}>
      <Paper sx={{
        p: 2, borderRadius: 2.5, height: '100%',
        background: `linear-gradient(135deg, ${color}0f, ${color}04)`,
        border: `1px solid ${color}1e`,
      }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: `${color}20`, color }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color }} dir="rtl">
              {formatPersianNumber(value ?? 0)}
            </Typography>
            <Typography variant="caption" color="textSecondary">{label}</Typography>
          </Box>
        </Stack>
      </Paper>
    </Grid>
  );

  return (
    <Box>
      {/* Header hero */}
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(14,165,233,0.08), rgba(14,165,233,0.02), rgba(255,255,255,0.3))',
        border: '1px solid rgba(14,165,233,0.16)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}>
              <AccessTimeIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#0369a1' }}>حضور و غیاب</Typography>
              <Typography variant="body2" color="textSecondary">
                ثبت وضعیت روزانه، پیگیری کارکرد و خلاصه ماهانه کارکنان
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', borderRadius: 2, px: 3 }}>
            ثبت رکورد حضور
          </Button>
        </Box>
      </Paper>

      {/* Monthly summary */}
      {summary && (
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          {stat('روزهای حضور', summary.present_days, '#10b981', <CheckCircleIcon />)}
          {stat('غیبت', summary.absent_days, '#ef4444', <EventBusyIcon />)}
          {stat('مرخصی', summary.leave_days, '#f59e0b', <BeachAccessIcon />)}
          <Grid item xs={12} md={3}>
            <Paper sx={{
              p: 2, borderRadius: 2.5, height: '100%',
              background: 'linear-gradient(135deg, #3b82f60f, #3b82f604)',
              border: '1px solid #3b82f61e',
            }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                مجموع کارکرد ماه (ساعت)
              </Typography>
              <Typography variant="h5" fontWeight={800} color="#2563eb">
                {formatPersianNumber(summary.total_work_hours)} ساعت
              </Typography>
              <Typography variant="caption" color="textSecondary">
                اضافه‌کار: {formatPersianNumber(summary.total_overtime_hours)} ساعت
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2.5, border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <FormControl sx={{ minWidth: { xs: '100%', md: 240 } }} size="small">
            <InputLabel>پرسنل</InputLabel>
            <Select value={employeeFilter} label="پرسنل" onChange={e => setEmployeeFilter(e.target.value)}>
              <MenuItem value="">همه پرسنل</MenuItem>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: '100%', md: 160 } }} size="small">
            <InputLabel>وضعیت</InputLabel>
            <Select value={statusFilter} label="وضعیت" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {Object.entries(STATUS_META).map(([key, m]) => <MenuItem key={key} value={key}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Bulk excel import — ثبت گروهی از طریق اکسل */}
      <BulkExcelImport
        importType="attendance_bulk"
        title="درون‌ریزی گروهی حضور و غیاب"
        description="با یک فایل اکسل، رکورد حضورِ چند پرسنل را همزمان ثبت کنید (کد پرسنلی، تاریخ شمسی، وضعیت و ...)."
        accent="#0ea5e9"
        invalidateKeys={['attendance-records', 'attendance-month-summary']}
      />

      {/* Records table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="textSecondary">رکوردی برای نمایش وجود ندارد — اولین رکورد حضور را ثبت کنید</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ textAlign: 'right', background: 'rgba(14,165,233,0.06)' }}>
                  {['پرسنل', 'تاریخ', 'وضعیت', 'ورود', 'خروج', 'ساعت کاری', 'اضافه‌کار', 'یادداشت', 'عملیات'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(rec => {
                  const sm = STATUS_META[rec.status] || STATUS_META.present;
                  return (
                    <tr key={rec.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#0ea5e9', fontSize: 12 }}>{(rec.employee_name || '؟').charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{rec.employee_name || empName(rec.employee)}</Typography>
                            <Typography variant="caption" color="textSecondary">{formatPersianNumber(rec.employee_code || empCode(rec.employee))}</Typography>
                          </Box>
                        </Box>
                      </td>
                      <td style={{ padding: '10px 14px' }}><Typography variant="body2">{rec.date_display || rec.date}</Typography></td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip size="small" label={rec.status_display || sm.label} icon={sm.icon}
                          sx={{ bgcolor: `${sm.color}15`, color: sm.color, border: `1px solid ${sm.color}30`, fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>{formatPersianNumber(rec.check_in || '—')}</td>
                      <td style={{ padding: '10px 14px' }}>{formatPersianNumber(rec.check_out || '—')}</td>
                      <td style={{ padding: '10px 14px' }}>{rec.work_hours ? formatPersianNumber(rec.work_hours) : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{rec.overtime_hours ? formatPersianNumber(rec.overtime_hours) : '—'}</td>
                      <td style={{ padding: '10px 14px', maxWidth: 180 }}>
                        <Typography variant="caption" color="textSecondary" noWrap sx={{ display: 'block', maxWidth: 180 }}>{rec.note || ''}</Typography>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <Tooltip title="ویرایش">
                          <IconButton size="small" color="primary" onClick={() => openEdit(rec)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error"
                            onClick={() => { if (window.confirm('حذف این رکورد حضور؟')) deleteMutation.mutate(rec.id); }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Paper>

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#0369a1' }}>{editing ? 'ویرایش رکورد حضور' : 'ثبت رکورد حضور'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.6, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>پرسنل *</InputLabel>
            <Select value={form.employee || ''} label="پرسنل *"
              onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>

          <JalaliDatePicker fullWidth label="تاریخ" value={form.date}
            onChange={g => setForm(p => ({ ...p, date: g }))} />

          <FormControl fullWidth size="small">
            <InputLabel>وضعیت</InputLabel>
            <Select value={form.status} label="وضعیت" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {Object.entries(STATUS_META).map(([key, m]) => <MenuItem key={key} value={key}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>

          {(form.status === 'present') && (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField fullWidth size="small" label="ساعت ورود" type="time"
                  value={form.check_in || ''}
                  InputLabelProps={{ shrink: true }}
                  onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} />
                <TextField fullWidth size="small" label="ساعت خروج" type="time"
                  value={form.check_out || ''}
                  InputLabelProps={{ shrink: true }}
                  onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField fullWidth size="small" label="ساعت کاری" type="number" value={form.work_hours}
                  onChange={e => setForm(p => ({ ...p, work_hours: Number(e.target.value) }))} />
                <TextField fullWidth size="small" label="اضافه‌کار" type="number" value={form.overtime_hours}
                  onChange={e => setForm(p => ({ ...p, overtime_hours: Number(e.target.value) }))} />
              </Stack>
            </>
          )}

          {form.status === 'holiday' && (
            <Typography variant="caption" color="textSecondary">برای روزهای تعطیل نیازی به ساعت کاری نیست.</Typography>
          )}

          <TextField fullWidth size="small" label="یادداشت" multiline rows={2} value={form.note}
            onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" sx={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }}
            disabled={!form.employee || !form.date}
            onClick={() => saveMutation.mutate(form)}>
            {editing ? 'ذخیره تغییرات' : 'ثبت رکورد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendancePage;