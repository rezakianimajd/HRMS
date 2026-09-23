import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, Button, CircularProgress, Stack, Chip,
  TextField, Alert, IconButton, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#0ea5e9';
const COLOR_DARK = '#0284c7';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(14,165,233,0.12)', borderRadius: '16px',
};

const YEAR_STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  open: { label: 'باز', color: '#10b981' },
  closed: { label: 'بسته', color: '#f59e0b' },
  locked: { label: 'قفل‌شده', color: '#ef4444' },
};

const FiscalYearsPanel = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['fiscal-years'], queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (p) => axiosInstance.post('/accounting/fiscal-years/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fiscal-years'] }); setForm({ name: '', start_date: '', end_date: '' }); },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }),
  });
  const action = useMutation({
    mutationFn: ({ id, act }) => axiosInstance.post(`/accounting/fiscal-years/${id}/${act}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fiscal-years'] }); setMsg(null); },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }),
  });
  const createNext = useMutation({
    mutationFn: () => axiosInstance.post('/accounting/fiscal-years/next/'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-years'] }),
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }),
  });

  const doSave = () => {
    const p = { ...form };
    // تبدیل تاریخ شمسی به میلادی
    setMsg(null);
  };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Paper sx={{ ...glass, p: 2.5 }}>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK}>سال‌های مالی</Typography>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => createNext.mutate()} sx={{ borderRadius: '12px' }}>
          ایجاد سال بعدی
        </Button>
      </Stack>

      {/* فرم سال جدید */}
      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Typography variant="body2" fontWeight={700} mb={1.5}>سال مالی جدید</Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="عنوان" value={form.name} onChange={e => set('name', e.target.value)} sx={{ width: 200 }} />
          <JalaliDatePicker noHelper label="شروع" value={form.start_date} onChange={v => set('start_date', v)} sx={{ width: 150 }} />
          <JalaliDatePicker noHelper label="پایان" value={form.end_date} onChange={v => set('end_date', v)} sx={{ width: 150 }} />
          <Button variant="contained" onClick={() => save.mutate(form)} sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>ذخیره</Button>
        </Stack>
      </Paper>

      {isLoading ? <CircularProgress /> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>عنوان</TableCell><TableCell>شروع</TableCell><TableCell>پایان</TableCell><TableCell>وضعیت</TableCell><TableCell>جاری</TableCell><TableCell>عملیات</TableCell></TableRow></TableHead>
            <TableBody>
              {list.map(y => (
                <TableRow key={y.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{y.name}</TableCell>
                  <TableCell>{toJalali(y.start_date)}</TableCell>
                  <TableCell>{toJalali(y.end_date)}</TableCell>
                  <TableCell><Chip size="small" label={YEAR_STATUS[y.status]?.label || y.status} sx={{ bgcolor: `${YEAR_STATUS[y.status]?.color || '#64748b'}18`, color: YEAR_STATUS[y.status]?.color, fontWeight: 700 }} /></TableCell>
                  <TableCell>{y.is_current ? <Chip size="small" label="جاری" color="primary" /> : ''}</TableCell>
                  <TableCell>
                    {!y.is_current && <Tooltip title="تعیین به‌عنوان جاری"><IconButton size="small" color="primary" onClick={() => action.mutate({ id: y.id, act: 'set_current' })}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>}
                    {y.status === 'draft' && <Tooltip title="باز کردن"><IconButton size="small" color="success" onClick={() => action.mutate({ id: y.id, act: 'open' })}><PlayCircleIcon fontSize="small" /></IconButton></Tooltip>}
                    {y.status === 'open' && <Tooltip title="بستن"><IconButton size="small" color="warning" onClick={() => action.mutate({ id: y.id, act: 'close' })}><LockIcon fontSize="small" /></IconButton></Tooltip>}
                    {y.status === 'closed' && <Tooltip title="قفل"><IconButton size="small" color="error" onClick={() => action.mutate({ id: y.id, act: 'lock' })}><LockOpenIcon fontSize="small" /></IconButton></Tooltip>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

const FiscalPeriodsPanel = () => {
  const qc = useQueryClient();
  const [yearId, setYearId] = useState('');
  const [form, setForm] = useState({ code: '', start_date: '', end_date: '' });

  const { data: years } = useQuery({ queryKey: ['period-years'], queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then(r => r.data) });
  const yearsList = Array.isArray(years) ? years : years?.results || [];

  const { data: periods, isLoading } = useQuery({
    queryKey: ['fiscal-periods', yearId],
    queryFn: () => axiosInstance.get('/accounting/fiscal-periods/', { params: { fiscal_year: yearId } }).then(r => r.data),
    enabled: !!yearId,
  });
  const list = Array.isArray(periods) ? periods : periods?.results || [];

  const save = useMutation({
    mutationFn: (p) => axiosInstance.post('/accounting/fiscal-periods/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fiscal-periods', yearId] }); setForm({ code: '', start_date: '', end_date: '' }); },
  });
  const action = useMutation({
    mutationFn: ({ id, act }) => axiosInstance.post(`/accounting/fiscal-periods/${id}/${act}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-periods', yearId] }),
  });

  return (
    <Paper sx={{ ...glass, p: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} mb={2}>دوره‌های مالی</Typography>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={2}>
        <TextField size="small" select value={yearId} onChange={e => setYearId(e.target.value)} sx={{ minWidth: 220 }}
          SelectProps={{ native: true }}>
          <option value="">— انتخاب سال مالی —</option>
          {yearsList.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </TextField>
        <TextField size="small" label="کد دوره" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} sx={{ width: 130 }} />
        <JalaliDatePicker noHelper label="شروع" value={form.start_date} onChange={v => setForm(p => ({ ...p, start_date: v }))} sx={{ width: 150 }} />
        <JalaliDatePicker noHelper label="پایان" value={form.end_date} onChange={v => setForm(p => ({ ...p, end_date: v }))} sx={{ width: 150 }} />
        <Button variant="contained" disabled={!yearId} onClick={() => save.mutate({ ...form, fiscal_year: yearId })}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>افزودن دوره</Button>
      </Stack>

      {!yearId ? <Typography color="textSecondary">سال مالی را انتخاب کنید</Typography> : isLoading ? <CircularProgress /> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>کد</TableCell><TableCell>شروع</TableCell><TableCell>پایان</TableCell><TableCell>وضعیت</TableCell><TableCell>عملیات</TableCell></TableRow></TableHead>
            <TableBody>
              {list.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{p.code}</TableCell>
                  <TableCell>{toJalali(p.start_date)}</TableCell>
                  <TableCell>{toJalali(p.end_date)}</TableCell>
                  <TableCell><Chip size="small" label={p.status_display || p.status} sx={{ bgcolor: p.status === 'open' ? '#10b98118' : '#f59e0b18', color: p.status === 'open' ? '#059669' : '#d97706', fontWeight: 700 }} /></TableCell>
                  <TableCell>
                    {p.status === 'open' && <Tooltip title="بستن"><IconButton size="small" color="warning" onClick={() => action.mutate({ id: p.id, act: 'close' })}><LockIcon fontSize="small" /></IconButton></Tooltip>}
                    {p.status === 'closed' && <Tooltip title="باز کردن"><IconButton size="small" color="success" onClick={() => action.mutate({ id: p.id, act: 'reopen' })}><LockOpenIcon fontSize="small" /></IconButton></Tooltip>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

const AccountingFiscalPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <CalendarMonthIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>دوره مالی</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت سال‌های مالی، دوره‌ها و بستن دوره</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: '1px solid rgba(225,225,225,0.5)', px: 2 }}>
          <Tab label="سال‌های مالی" sx={{ fontWeight: 600, color: tab === 0 ? COLOR_DARK : undefined }} />
          <Tab label="دوره‌ها" sx={{ fontWeight: 600, color: tab === 1 ? COLOR_DARK : undefined }} />
        </Tabs>
      </Paper>

      {tab === 0 && <FiscalYearsPanel />}
      {tab === 1 && <FiscalPeriodsPanel />}
    </Box>
  );
};

export default AccountingFiscalPage;