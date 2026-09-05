import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, TextField, CircularProgress, Alert, Stack, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useEmployees } from '../core/hooks/useEmployees';

/* P2: Leaves & Missions — requests, approve/reject, balance summary. */
const emptyForm = {
  id: null,
  employee: '',
  leave_type: 'annual',
  start_date: '',
  end_date: '',
  days: 1,
  reason: '',
};

const LEAVE_META = {
  annual: { label: 'استحقاقی', color: '#10b981', icon: <EventBusyIcon fontSize="small" /> },
  sick: { label: 'استعلاجی', color: '#f59e0b', icon: <EventBusyIcon fontSize="small" /> },
  mission: { label: 'مأموریت', color: '#3b82f6', icon: <FlightTakeoffIcon fontSize="small" /> },
  unpaid: { label: 'بدون حقوق', color: '#64748b', icon: <EventBusyIcon fontSize="small" /> },
  marriage: { label: 'ازدواج', color: '#ec4899', icon: <EventBusyIcon fontSize="small" /> },
  maternity: { label: 'زایمان', color: '#8b5cf6', icon: <EventBusyIcon fontSize="small" /> },
  other: { label: 'سایر', color: '#94a3b8', icon: <EventBusyIcon fontSize="small" /> },
};

const STATUS_META = {
  pending: { label: 'در انتظار', color: '#f59e0b' },
  approved: { label: 'تأیید شده', color: '#10b981' },
  rejected: { label: 'رد شده', color: '#ef4444' },
  cancelled: { label: 'لغو', color: '#64748b' },
};

const LeavePage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['leave-requests', { employeeFilter }],
    queryFn: () => axiosInstance.get('/leave-requests/', { params: employeeFilter ? { employee_id: employeeFilter } : {} }).then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  // Leave balance for the employee being viewed (if selected)
  const { data: balance } = useQuery({
    queryKey: ['leave-balance', employeeFilter],
    queryFn: () => axiosInstance.get('/leave-requests/balance/', { params: { employee_id: employeeFilter } }).then(r => r.data),
    enabled: !!employeeFilter,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`/leave-requests/${payload.id}/`, payload)
        : axiosInstance.post('/leave-requests/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      setOpen(false); setError('');
    },
    onError: (e) => setError(e.response?.data?.detail || 'خطا در ثبت درخواست'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/leave-requests/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }) => axiosInstance.post(`/leave-requests/${id}/${action}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const openAdd = () => {
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const empName = (id) => empList.find(x => String(x.id) === String(id))?.full_name || '—';
  const empCode = (id) => empList.find(x => String(x.id) === String(id))?.employee_id || '';

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(6,182,212,0.09), rgba(6,182,212,0.02), rgba(255,255,255,0.3))',
        border: '1px solid rgba(6,182,212,0.16)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 8px 24px rgba(6,182,212,0.35)' }}>
              <EventBusyIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#155e75">مرخصی و مأموریت</Typography>
              <Typography variant="body2" color="textSecondary">
                ثبت درخواست، تأیید/رد و مشاهده مانده مرخصی کارکنان
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
            sx={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', borderRadius: 2, px: 3 }}>
            ثبت درخواست جدید
          </Button>
        </Box>
      </Paper>

      {/* Balance card when employee selected */}
      {balance && (
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2.5, textAlign: 'center', background: 'linear-gradient(135deg,#10b9810f,#fff)', border: '1px solid #10b9812e' }}>
              <Typography variant="body2" color="textSecondary">سهم سالانه</Typography>
              <Typography variant="h5" fontWeight={800} color="#059669">{formatPersianNumber(balance.annual_entitlement)} روز</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2.5, textAlign: 'center', background: 'linear-gradient(135deg,#f59e0b0f,#fff)', border: '1px solid #f59e0b2e' }}>
              <Typography variant="body2" color="textSecondary">مصرفشده</Typography>
              <Typography variant="h5" fontWeight={800} color="#d97706">{formatPersianNumber(balance.used_days)} روز</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2.5, textAlign: 'center', background: 'linear-gradient(135deg,#8b5cf60f,#fff)', border: '1px solid #8b5cf62e' }}>
              <Typography variant="body2" color="textSecondary">مانده {empName(employeeFilter)}</Typography>
              <Typography variant="h5" fontWeight={800} color="#7c3aed">{formatPersianNumber(balance.remaining_days)} روز</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2.5, background: 'rgba(255,255,255,0.6)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center">
          <FormControl sx={{ minWidth: { xs: '100%', md: 250 } }} size="small">
            <InputLabel>پرسنل (برای ماندهگیری و فیلتر)</InputLabel>
            <Select value={employeeFilter || ''} label="پرسنل" onChange={e => setEmployeeFilter(e.target.value)}>
              <MenuItem value="">همه پرسنل</MenuItem>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="textSecondary">درخواستی ثبت نشده است</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ textAlign: 'right', background: 'rgba(6,182,212,0.06)', color: '#475569', fontSize: '0.78rem' }}>
                  <th style={{ padding: '10px 14px' }}>پرسنل</th>
                  <th style={{ padding: '10px 14px' }}>نوع</th>
                  <th style={{ padding: '10px 14px' }}>از</th>
                  <th style={{ padding: '10px 14px' }}>تا</th>
                  <th style={{ padding: '10px 14px' }}>روزها</th>
                  <th style={{ padding: '10px 14px' }}>وضعیت</th>
                  <th style={{ padding: '10px 14px' }}>دلیل</th>
                  <th style={{ padding: '10px 14px' }}>اقدامات</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => {
                  const lm = LEAVE_META[r.leave_type] || LEAVE_META.other;
                  const sm = STATUS_META[r.status] || STATUS_META.pending;
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: lm.color, fontSize: 12 }}>{(r.employee_name || '؟').charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{r.employee_name || empName(r.employee)}</Typography>
                            <Typography variant="caption" color="textSecondary">{formatPersianNumber(r.employee_code || empCode(r.employee))}</Typography>
                          </Box>
                        </Box>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip size="small" icon={lm.icon} label={r.leave_type_display || lm.label}
                          sx={{ bgcolor: `${lm.color}15`, color: lm.color, border: `1px solid ${lm.color}30`, fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>{r.start_date || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{r.end_date || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{formatPersianNumber(r.days)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip size="small" label={r.status_display || sm.label}
                          sx={{ bgcolor: `${sm.color}15`, color: sm.color, fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 180 }}>
                        <Typography variant="caption" color="textSecondary" noWrap sx={{ display: 'block' }}>{r.reason || ''}</Typography>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {r.status === 'pending' && (
                          <>
                            <Tooltip title="تأیید">
                              <IconButton size="small" color="success" onClick={() => statusMutation.mutate({ id: r.id, action: 'approve' })}>
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="رد">
                              <IconButton size="small" color="error" onClick={() => statusMutation.mutate({ id: r.id, action: 'reject' })}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error"
                            onClick={() => { if (window.confirm('حذف این درخواست؟')) deleteMutation.mutate(r.id); }}>
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

      {/* Add request dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#155e75' }}>ثبت درخواست مرخصی/مأموریت</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>* پرسنل</InputLabel>
            <Select value={form.employee || ''} label="* پرسنل" onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>نوع</InputLabel>
            <Select value={form.leave_type} label="نوع" onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))}>
              {Object.entries(LEAVE_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>

          <JalaliDatePicker fullWidth label="تاریخ شروع *" value={form.start_date}
            onChange={g => setForm(p => ({ ...p, start_date: g }))} />
          <JalaliDatePicker fullWidth label="تاریخ پایان *" value={form.end_date}
            onChange={g => setForm(p => ({ ...p, end_date: g }))} />

          <TextField fullWidth size="small" label="تعداد روز *" type="number" value={form.days}
            onChange={e => setForm(p => ({ ...p, days: Number(e.target.value) }))} />

          <TextField fullWidth size="small" label="دلیل/توضیح" multiline rows={2} value={form.reason}
            onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" sx={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
            disabled={!form.employee || !form.start_date || !form.end_date}
            onClick={() => saveMutation.mutate(form)}>
            ثبت درخواست
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeavePage;