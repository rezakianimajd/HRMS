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
import HolidayVillageIcon from '@mui/icons-material/HolidayVillage';
import { formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
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

// Note: ظ…ط±ط®طµغŒ ظˆ ظ…ط£ظ…ظˆط±غŒطھ ط§ط² طµظپط­ظ‡ظ” ط®ظˆط¯ط´ط§ظ† (ظ…ط±ط®طµغŒ ظˆ ظ…ط£ظ…ظˆط±غŒطھ) ط«ط¨طھ ظ…غŒط´ظˆظ†ط¯.
const STATUS_META = {
  present: { label: 'ط­ط¶ظˆط±', color: '#10b981', icon: <CheckCircleIcon fontSize="small" /> },
  absent: { label: 'ط؛غŒط¨طھ', color: '#ef4444', icon: <EventBusyIcon fontSize="small" /> },
  holiday: { label: 'طھط¹ط·غŒظ„', color: '#94a3b8', icon: <HolidayVillageIcon fontSize="small" /> },
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
    onError: (e) => setError(e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡'),
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

  const empName = (id) => empList.find(x => String(x.id) === String(id))?.full_name || 'â€”';
  const empCode = (id) => empList.find(x => String(x.id) === String(id))?.employee_id || '';

  const stat = (label, value, color, icon) => (
    <Grid item xs={6} md={3}>
      <Paper sx={{
        p: 2, borderRadius: '10px', height: '100%',
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
        p: 3, mb: 2.5, borderRadius: '10px',
        background: 'linear-gradient(120deg, rgba(14,165,233,0.08), rgba(14,165,233,0.02), rgba(255,255,255,0.3))',
        border: '1px solid rgba(14,165,233,0.16)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}>
              <AccessTimeIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#0369a1' }}>ط­ط¶ظˆط± ظˆ ط؛غŒط§ط¨</Typography>
              <Typography variant="body2" color="textSecondary">
                ط«ط¨طھ ظˆط¶ط¹غŒطھ ط±ظˆط²ط§ظ†ظ‡طŒ ظ¾غŒع¯غŒط±غŒ ع©ط§ط±ع©ط±ط¯ ظˆ ط®ظ„ط§طµظ‡ ظ…ط§ظ‡ط§ظ†ظ‡ ع©ط§ط±ع©ظ†ط§ظ†
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', borderRadius: '10px', px: 3 }}>
            ط«ط¨طھ ط±ع©ظˆط±ط¯ ط­ط¶ظˆط±
          </Button>
        </Box>
      </Paper>

      {/* Monthly summary */}
      {summary && (
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          {stat('ط±ظˆط²ظ‡ط§غŒ ط­ط¶ظˆط±', summary.present_days, '#10b981', <CheckCircleIcon />)}
          {stat('ط؛غŒط¨طھ', summary.absent_days, '#ef4444', <EventBusyIcon />)}
          {stat('طھط¹ط·غŒظ„', summary.holiday_days ?? summary.by_status?.holiday ?? 0, '#94a3b8', <HolidayVillageIcon />)}
          <Grid item xs={12} md={3}>
            <Paper sx={{
              p: 2, borderRadius: '10px', height: '100%',
              background: 'linear-gradient(135deg, #3b82f60f, #3b82f604)',
              border: '1px solid #3b82f61e',
            }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                ظ…ط¬ظ…ظˆط¹ ع©ط§ط±ع©ط±ط¯ ظ…ط§ظ‡ (ط³ط§ط¹طھ)
              </Typography>
              <Typography variant="h5" fontWeight={800} color="#2563eb">
                {formatPersianNumber(summary.total_work_hours)} ط³ط§ط¹طھ
              </Typography>
              <Typography variant="caption" color="textSecondary">
                ط§ط¶ط§ظپظ‡â€Œع©ط§ط±: {formatPersianNumber(summary.total_overtime_hours)} ط³ط§ط¹طھ
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2.5, borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <FormControl sx={{ minWidth: { xs: '100%', md: 240 } }} size="small">
            <InputLabel>ظ¾ط±ط³ظ†ظ„</InputLabel>
            <Select value={employeeFilter} label="ظ¾ط±ط³ظ†ظ„" onChange={e => setEmployeeFilter(e.target.value)}>
              <MenuItem value="">ظ‡ظ…ظ‡ ظ¾ط±ط³ظ†ظ„</MenuItem>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: '100%', md: 160 } }} size="small">
            <InputLabel>ظˆط¶ط¹غŒطھ</InputLabel>
            <Select value={statusFilter} label="ظˆط¶ط¹غŒطھ" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">ظ‡ظ…ظ‡</MenuItem>
              {Object.entries(STATUS_META).map(([key, m]) => <MenuItem key={key} value={key}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Records table */}
      <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="textSecondary">ط±ع©ظˆط±ط¯غŒ ط¨ط±ط§غŒ ظ†ظ…ط§غŒط´ ظˆط¬ظˆط¯ ظ†ط¯ط§ط±ط¯ â€” ط§ظˆظ„غŒظ† ط±ع©ظˆط±ط¯ ط­ط¶ظˆط± ط±ط§ ط«ط¨طھ ع©ظ†غŒط¯</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ textAlign: 'right', background: 'rgba(14,165,233,0.06)' }}>
                  {['ظ¾ط±ط³ظ†ظ„', 'طھط§ط±غŒط®', 'ظˆط¶ط¹غŒطھ', 'ظˆط±ظˆط¯', 'ط®ط±ظˆط¬', 'ط³ط§ط¹طھ ع©ط§ط±غŒ', 'ط§ط¶ط§ظپظ‡â€Œع©ط§ط±', 'غŒط§ط¯ط¯ط§ط´طھ', 'ط¹ظ…ظ„غŒط§طھ'].map(h => (
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
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#0ea5e9', fontSize: 12 }}>{(rec.employee_name || 'طں').charAt(0)}</Avatar>
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
                      <td style={{ padding: '10px 14px' }}><span dir="ltr">{rec.check_in || 'â€”'}</span></td>
                      <td style={{ padding: '10px 14px' }}><span dir="ltr">{rec.check_out || 'â€”'}</span></td>
                      <td style={{ padding: '10px 14px' }}>{rec.work_hours ? formatPersianNumber(rec.work_hours) : 'â€”'}</td>
                      <td style={{ padding: '10px 14px' }}>{rec.overtime_hours ? formatPersianNumber(rec.overtime_hours) : 'â€”'}</td>
                      <td style={{ padding: '10px 14px', maxWidth: 180 }}>
                        <Typography variant="caption" color="textSecondary" noWrap sx={{ display: 'block', maxWidth: 180 }}>{rec.note || ''}</Typography>
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <Tooltip title="ظˆغŒط±ط§غŒط´">
                          <IconButton size="small" color="primary" onClick={() => openEdit(rec)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="ط­ط°ظپ">
                          <IconButton size="small" color="error"
                            onClick={() => { if (window.confirm('ط­ط°ظپ ط§غŒظ† ط±ع©ظˆط±ط¯ ط­ط¶ظˆط±طں')) deleteMutation.mutate(rec.id); }}>
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
        <DialogTitle sx={{ color: '#0369a1' }}>{editing ? 'ظˆغŒط±ط§غŒط´ ط±ع©ظˆط±ط¯ ط­ط¶ظˆط±' : 'ط«ط¨طھ ط±ع©ظˆط±ط¯ ط­ط¶ظˆط±'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.6, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>ظ¾ط±ط³ظ†ظ„ *</InputLabel>
            <Select value={form.employee || ''} label="ظ¾ط±ط³ظ†ظ„ *"
              onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>

          <JalaliDatePicker fullWidth label="طھط§ط±غŒط®" value={form.date}
            onChange={g => setForm(p => ({ ...p, date: g }))} />

          <FormControl fullWidth size="small">
            <InputLabel>ظˆط¶ط¹غŒطھ</InputLabel>
            <Select value={form.status} label="ظˆط¶ط¹غŒطھ" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {Object.entries(STATUS_META).map(([key, m]) => <MenuItem key={key} value={key}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>

          {(form.status === 'present') && (
            <>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth size="small" label="ط³ط§ط¹طھ ظˆط±ظˆط¯"
                  placeholder="غ°غ¸:غ°غ°"
                  helperText="ظپط±ظ…طھ غ²غ´ ط³ط§ط¹طھظ‡طŒ ظ…ط«ط§ظ„ غ°غ¸:غ°غ° غŒط§ غ±غ´:غ³غ°"
                  value={form.check_in || ''}
                  onChange={e => {
                    // ظ‡ظ…â€Œط±ظˆط´ ظپط±ظ… ظ¾ط±ط³ظ†ظ„غŒ: ظپظ‚ط· ط§ط±ظ‚ط§ظ…/ط¯ظˆâ€Œظ†ظ‚ط·ظ‡ط› ط¨ط¹ط¯ ط§ط² ط¯ظˆ ط±ظ‚ظ… ط®ظˆط¯ع©ط§ط± آ«:آ» ط§ط¶ط§ظپظ‡ ظ…غŒâ€Œط´ظˆط¯
                    let v = e.target.value.replace(/[^\d:]/g, '');
                    if (v.length === 2 && !v.includes(':') && e.target.value.length > 2) v = v + ':';
                    setForm(p => ({ ...p, check_in: v.slice(0, 5) }));
                  }}
                  inputProps={{ maxLength: 5, inputMode: 'numeric', style: { direction: 'ltr' } }}
                />
                <TextField
                  fullWidth size="small" label="ط³ط§ط¹طھ ط®ط±ظˆط¬"
                  placeholder="غ±غ¶:غ³غ°"
                  helperText="ظپط±ظ…طھ غ²غ´ ط³ط§ط¹طھظ‡طŒ ظ…ط«ط§ظ„ غ°غ¸:غ°غ° غŒط§ غ±غ´:غ³غ°"
                  value={form.check_out || ''}
                  onChange={e => {
                    let v = e.target.value.replace(/[^\d:]/g, '');
                    if (v.length === 2 && !v.includes(':') && e.target.value.length > 2) v = v + ':';
                    setForm(p => ({ ...p, check_out: v.slice(0, 5) }));
                  }}
                  inputProps={{ maxLength: 5, inputMode: 'numeric', style: { direction: 'ltr' } }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField fullWidth size="small" label="ط³ط§ط¹طھ ع©ط§ط±غŒ" type="number" value={form.work_hours}
                  onChange={e => setForm(p => ({ ...p, work_hours: Number(e.target.value) }))} />
                <TextField fullWidth size="small" label="ط§ط¶ط§ظپظ‡â€Œع©ط§ط±" type="number" value={form.overtime_hours}
                  onChange={e => setForm(p => ({ ...p, overtime_hours: Number(e.target.value) }))} />
              </Stack>
            </>
          )}

          {form.status === 'holiday' && (
            <Typography variant="caption" color="textSecondary">ط¨ط±ط§غŒ ط±ظˆط²ظ‡ط§غŒ طھط¹ط·غŒظ„ ظ†غŒط§ط²غŒ ط¨ظ‡ ط³ط§ط¹طھ ع©ط§ط±غŒ ظ†غŒط³طھ.</Typography>
          )}

          <TextField fullWidth size="small" label="غŒط§ط¯ط¯ط§ط´طھ" multiline rows={2} value={form.note}
            onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" sx={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }}
            disabled={!form.employee || !form.date}
            onClick={() => saveMutation.mutate(form)}>
            {editing ? 'ط°ط®غŒط±ظ‡ طھط؛غŒغŒط±ط§طھ' : 'ط«ط¨طھ ط±ع©ظˆط±ط¯'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendancePage;