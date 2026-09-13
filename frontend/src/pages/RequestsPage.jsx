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

/* P3: ط¯ط±ط®ظˆط§ط³طھظ‡ط§غŒ ط§ط¯ط§ط±غŒ ظˆ ع¯ط±ط¯ط´ع©ط§ط± â€” ط«ط¨طھطŒ طھط£غŒغŒط¯/ط±ط¯ */
const REQUEST_META = {
  transfer: { label: 'ط§ظ†طھظ‚ط§ظ„ ظˆط§ط­ط¯', color: '#6366f1', icon: <SwapHorizIcon fontSize="small" /> },
  promotion: { label: 'ط§ط±طھظ‚ط§ ط´ط؛ظ„غŒ', color: '#10b981', icon: <FactCheckIcon fontSize="small" /> },
  resignation: { label: 'ط§ط³طھط¹ظپط§', color: '#ef4444', icon: <FactCheckIcon fontSize="small" /> },
  retirement: { label: 'ط¨ط§ط²ظ†ط´ط³طھع¯غŒ', color: '#8b5cf6', icon: <FactCheckIcon fontSize="small" /> },
  shift_change: { label: 'طھط؛غŒغŒط± ط´غŒظپطھ', color: '#f59e0b', icon: <FactCheckIcon fontSize="small" /> },
  certificate: { label: 'طµط¯ظˆط± ع¯ظˆط§ظ‡غŒ ط§ط´طھط؛ط§ظ„', color: '#0ea5e9', icon: <FactCheckIcon fontSize="small" /> },
  salary_increase: { label: 'ط§ظپط²ط§غŒط´ ط­ظ‚ظˆظ‚', color: '#14b8a6', icon: <FactCheckIcon fontSize="small" /> },
  other: { label: 'ط³ط§غŒط±', color: '#94a3b8', icon: <FactCheckIcon fontSize="small" /> },
};
const STATUS_META = {
  pending: { label: 'ط¯ط± ط§ظ†طھط¸ط§ط±', color: '#f59e0b' },
  approved: { label: 'طھط£غŒغŒط¯ ط´ط¯ظ‡', color: '#10b981' },
  rejected: { label: 'ط±ط¯ ط´ط¯ظ‡', color: '#ef4444' },
  cancelled: { label: 'ظ„ط؛ظˆ', color: '#64748b' },
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
    onError: (e) => setError(e.response?.data?.detail || 'ط®ط·ط§ ط¯ط± ط«ط¨طھ ط¯ط±ط®ظˆط§ط³طھ'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, action }) => axiosInstance.post(`/hr-requests/${id}/${action}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr-requests'] }),
  });

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2.5, borderRadius: '10px', background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(245,158,11,0.03), rgba(255,255,255,0.3))', border: '1px solid rgba(245,158,11,0.18)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
              <FactCheckIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#b45309">ط¯ط±ط®ظˆط§ط³طھظ‡ط§غŒ ط§ط¯ط§ط±غŒ</Typography>
              <Typography variant="body2" color="textSecondary">
                ع¯ط±ط¯ط´ ع©ط§ط±: ط§ظ†طھظ‚ط§ظ„طŒ ط§ط±طھظ‚ط§طŒ ط§ط³طھط¹ظپط§طŒ ط¨ط§ط²ظ†ط´ط³طھع¯غŒطŒ ع¯ظˆط§ظ‡غŒ ط§ط´طھط؛ط§ظ„ ظˆ ... â€” ط«ط¨طھ ظˆ طھط£غŒغŒط¯
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setError(''); setOpen(true); }}
            sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px', px: 3 }}>
            ط«ط¨طھ ط¯ط±ط®ظˆط§ط³طھ ط¬ط¯غŒط¯
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel>ظپغŒظ„طھط± ظˆط¶ط¹غŒطھ</InputLabel>
          <Select value={filter} label="ظپغŒظ„طھط± ظˆط¶ط¹غŒطھ" onChange={e => setFilter(e.target.value)}>
            <MenuItem value="">ظ‡ظ…ظ‡</MenuItem>
            {Object.entries(STATUS_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {isLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="textSecondary">ط¯ط±ط®ظˆط§ط³طھغŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {items.map(r => {
            const rm = REQUEST_META[r.request_type] || REQUEST_META.other;
            const sm = STATUS_META[r.status] || STATUS_META.pending;
            return (
              <Grid item xs={12} md={6} lg={4} key={r.id}>
                <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', border: `1px solid ${rm.color}20`, background: `linear-gradient(160deg, ${rm.color}0a, rgba(255,255,255,0.5))` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: rm.color }}>
                      {(r.employee_name || 'طں').charAt(0)}
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
                      ظ‡ط¯ظپ: {r.target_value}
                    </Typography>
                  )}
                  {r.requested_date_display && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                      طھط§ط±غŒط® ط¯ط±ط®ظˆط§ط³طھ: {r.requested_date_display}
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
                        <Tooltip title="طھط£غŒغŒط¯">
                          <IconButton size="small" color="success" onClick={() => statusMutation.mutate({ id: r.id, action: 'approve' })}><CheckIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="ط±ط¯">
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
        <DialogTitle sx={{ color: '#b45309' }}>ط«ط¨طھ ط¯ط±ط®ظˆط§ط³طھ ط§ط¯ط§ط±غŒ</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>* ظ¾ط±ط³ظ†ظ„</InputLabel>
            <Select value={form.employee || ''} label="* ظ¾ط±ط³ظ†ظ„" onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>ظ†ظˆط¹ ط¯ط±ط®ظˆط§ط³طھ</InputLabel>
            <Select value={form.request_type} label="ظ†ظˆط¹ ط¯ط±ط®ظˆط§ط³طھ" onChange={e => setForm(p => ({ ...p, request_type: e.target.value }))}>
              {Object.entries(REQUEST_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط¯ط±ط®ظˆط§ط³طھ" value={form.requested_date}
            onChange={g => setForm(p => ({ ...p, requested_date: g }))} />
          <TextField fullWidth size="small" label="ط§ط±ط²ط´ ظ‡ط¯ظپ (ظ…ط«ظ„ط§ظ‹ ظˆط§ط­ط¯/ط³ظ…طھ/ظ…ط¨ظ„ط؛)" value={form.target_value}
            onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))} />
          <TextField fullWidth size="small" label="ط´ط±ط­ ط¯ط±ط®ظˆط§ط³طھ" multiline rows={2} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
            disabled={!form.employee || !form.request_type}
            onClick={() => saveMutation.mutate(form)}>
            ط«ط¨طھ ط¯ط±ط®ظˆط§ط³طھ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestsPage;