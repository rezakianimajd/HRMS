import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Stack, Grid, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, TextField, Alert, IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useEmployees } from '../core/hooks/useEmployees';

/* P3: درخواستهای اداری و گردشکار — ثبت، تأیید/رد */
const REQUEST_META = {
  transfer: { label: 'انتقال واحد', color: '#6366f1', icon: <SwapHorizIcon fontSize="small" /> },
  promotion: { label: 'ارتقا شغلی', color: '#10b981', icon: <FactCheckIcon fontSize="small" /> },
  resignation: { label: 'استعفا', color: '#ef4444', icon: <FactCheckIcon fontSize="small" /> },
  retirement: { label: 'بازنشستگی', color: '#8b5cf6', icon: <FactCheckIcon fontSize="small" /> },
  shift_change: { label: 'تغییر شیفت', color: '#f59e0b', icon: <FactCheckIcon fontSize="small" /> },
  certificate: { label: 'صدور گواهی اشتغال', color: '#0ea5e9', icon: <FactCheckIcon fontSize="small" /> },
  salary_increase: { label: 'افزایش حقوق', color: '#14b8a6', icon: <FactCheckIcon fontSize="small" /> },
  other: { label: 'سایر', color: '#94a3b8', icon: <FactCheckIcon fontSize="small" /> },
};
const STATUS_META = {
  pending: { label: 'در انتظار', color: '#f59e0b' },
  approved: { label: 'تأیید شده', color: '#10b981' },
  rejected: { label: 'رد شده', color: '#ef4444' },
  cancelled: { label: 'لغو', color: '#64748b' },
};

const RequestsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee: '', request_type: 'transfer', requested_date: '', target_value: '', description: '' });
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['hr-requests', { filter }],
    queryFn: () => axiosInstance.get('/hr-requests/', { params: filter ? { status: filter } : {} }).then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  const saveMutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/hr-requests/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-requests'] });
      setOpen(false); setError(''); setForm({ employee: '', request_type: 'transfer', requested_date: '', target_value: '', description: '' });
    },
    onError: (e) => setError(e.response?.data?.detail || 'خطا در ثبت درخواست'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, action }) => axiosInstance.post(`/hr-requests/${id}/${action}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-requests'] }),
  });

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2.5, borderRadius: 3, background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(245,158,11,0.03), rgba(255,255,255,0.3))', border: '1px solid rgba(245,158,11,0.18)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
              <FactCheckIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#b45309">درخواستهای اداری</Typography>
              <Typography variant="body2" color="textSecondary">
                گردش کار: انتقال، ارتقا، استعفا، بازنشستگی، گواهی اشتغال و ... — ثبت و تأیید
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setError(''); setOpen(true); }}
            sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 2, px: 3 }}>
            ثبت درخواست جدید
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, background: 'rgba(255,255,255,0.6)' }}>
        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel>فیلتر وضعیت</InputLabel>
          <Select value={filter} label="فیلتر وضعیت" onChange={e => setFilter(e.target.value)}>
            <MenuItem value="">همه</MenuItem>
            {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {isLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="textSecondary">درخواستی ثبت نشده است</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {items.map(r => {
            const rm = REQUEST_META[r.request_type] || REQUEST_META.other;
            const sm = STATUS_META[r.status] || STATUS_META.pending;
            return (
              <Grid item xs={12} md={6} lg={4} key={r.id}>
                <Paper sx={{ p: 2, borderRadius: 2.5, height: '100%', border: `1px solid ${rm.color}20`, background: `linear-gradient(160deg, ${rm.color}0a, rgba(255,255,255,0.5))` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: rm.color }}>
                      {(r.employee_name || '؟').charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{r.employee_name}</Typography>
                      <Typography variant="caption" color="textSecondary">{formatPersianNumber(r.employee_code)}</Typography>
                    </Box>
                    <Chip size="small" icon={rm.icon} label={r.request_type_display || rm.label}
                      sx={{ bgcolor: `${rm.color}18`, color: rm.color, fontWeight: 700 }} />
                  </Box>
                  {r.target_value && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                      هدف: {r.target_value}
                    </Typography>
                  )}
                  {r.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{r.description}</Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Chip size="small" label={r.status_display || sm.label}
                      sx={{ bgcolor: `${sm.color}15`, color: sm.color, fontWeight: 700 }} />
                    {r.status === 'pending' && (
                      <Box>
                        <Tooltip title="تأیید">
                          <IconButton size="small" color="success" onClick={() => statusMutation.mutate({ id: r.id, action: 'approve' })}><CheckIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="رد">
                          <IconButton size="small" color="error" onClick={() => statusMutation.mutate({ id: r.id, action: 'reject' })}><CloseIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#b45309' }}>ثبت درخواست اداری</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>* پرسنل</InputLabel>
            <Select value={form.employee || ''} label="* پرسنل" onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>نوع درخواست</InputLabel>
            <Select value={form.request_type} label="نوع درخواست" onChange={e => setForm(p => ({ ...p, request_type: e.target.value }))}>
              {Object.entries(REQUEST_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <JalaliDatePicker fullWidth label="تاریخ درخواست" value={form.requested_date}
            onChange={g => setForm(p => ({ ...p, requested_date: g }))} />
          <TextField fullWidth size="small" label="ارزش هدف (مثلاً واحد/سمت/مبلغ)" value={form.target_value}
            onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))} />
          <TextField fullWidth size="small" label="شرح درخواست" multiline rows={2} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
            disabled={!form.employee || !form.request_type}
            onClick={() => saveMutation.mutate(form)}>
            ثبت درخواست
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestsPage;