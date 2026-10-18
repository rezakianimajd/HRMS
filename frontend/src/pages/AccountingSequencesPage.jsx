import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, Alert, IconButton, Tooltip, Grid,
  MenuItem, FormControl, InputLabel, Select, LinearProgress, Switch, FormControlLabel,
} from '@mui/material';
import NumbersIcon from '@mui/icons-material/Numbers';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import HistoryIcon from '@mui/icons-material/History';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';
const FONT = 'Vazirmatn, IRANSans, sans-serif';

const glass = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.07)',
  boxShadow: 'none',
  borderRadius: '16px',
};

const AccountingSequencesPage = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const [renumber, setRenumber] = useState({ fiscal_year_id: '', journal_id: '', prefix: '', padding: 5, start: 1 });

  const { data, isLoading } = useQuery({ queryKey: ['acc-sequences'], queryFn: () => axiosInstance.get('/accounting/sequences/').then(r => r.data) });
  const { data: journals } = useQuery({ queryKey: ['seq-journals'], queryFn: () => axiosInstance.get('/accounting/journals/').then(r => r.data) });
  const { data: years } = useQuery({ queryKey: ['seq-years'], queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const journalsList = Array.isArray(journals) ? journals : journals?.results || [];
  const yearsList = Array.isArray(years) ? years : years?.results || [];

  const save = useMutation({
    mutationFn: (p) => editing ? axiosInstance.patch(`/accounting/sequences/${editing.id}/`, p) : axiosInstance.post('/accounting/sequences/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['acc-sequences'] }); setEditing(null); setForm({}); setMsg({ ok: true, text: 'ذخیره شد' }); },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا در ذخیره' }),
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/sequences/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['acc-sequences'] }); setMsg({ ok: true, text: 'حذف شد' }); },
  });

  const renumberMutation = useMutation({
    mutationFn: (p) => axiosInstance.post('/accounting/sequences/renumber/', p),
    onSuccess: (r) => setMsg({ ok: true, text: r.data?.message || 'شماره‌گذاری مجدد انجام شد' }),
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا در شماره‌گذاری مجدد' }),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setRn = (k, v) => setRenumber(p => ({ ...p, [k]: v }));

  const previewOf = (s) => `${s.prefix || ''}${String(s.next_number || 1).padStart(s.padding || 5, '0')}`;
  const stats = useMemo(() => {
    const byYear = {};
    list.forEach(s => { if (s.fiscal_year) byYear[s.fiscal_year] = (byYear[s.fiscal_year] || 0) + 1; });
    return { total: list.length, years: Object.keys(byYear).length };
  }, [list]);

  return (
    <Box>
      <PageHeader
        icon={<NumbersIcon />}
        title="شماره‌گذاری اسناد"
        actions={(
          <>
            <Chip label={`${formatPersianNumber(stats.total)} قانون`} color="primary" variant="outlined" />
            <Chip label={`${formatPersianNumber(stats.years)} سال مالی`} color="success" variant="outlined" />
          </>
        )}
      />

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)} sx={{ mb: 2, borderRadius: '14px', fontFamily: FONT }}>{msg.text}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ ...glass, p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} mb={2} sx={{ fontFamily: FONT }}>{editing ? 'ویرایش شماره‌گذاری' : 'شماره‌گذاری جدید'}</Typography>
            <Stack spacing={1.5}>
              <FormControl size="small" fullWidth>
                <InputLabel>دفتر روزنامه</InputLabel>
                <Select value={form.journal || ''} label="دفتر روزنامه" onChange={e => set('journal', e.target.value)}>
                  <MenuItem value="">— عمومی —</MenuItem>
                  {journalsList.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>سال مالی</InputLabel>
                <Select value={form.fiscal_year || ''} label="سال مالی" onChange={e => set('fiscal_year', e.target.value)}>
                  <MenuItem value="">— عمومی —</MenuItem>
                  {yearsList.map(y => <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>)}
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1.5}>
                <TextField size="small" label="پیشوند" value={form.prefix || ''} onChange={e => set('prefix', e.target.value)} sx={{ flex: 1 }} placeholder="مثلاً INV-" />
                <TextField size="small" label="شمارهٔ بعدی" type="number" value={form.next_number ?? 1} onChange={e => set('next_number', Number(e.target.value) || 1)} sx={{ width: 130 }} />
                <TextField size="small" label="تعداد ارقام" type="number" value={form.padding ?? 5} onChange={e => set('padding', Number(e.target.value) || 5)} sx={{ width: 120 }} />
              </Stack>
              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.3)', textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">پیش‌نمایش</Typography>
                <Typography variant="h6" fontWeight={900} sx={{ direction: 'ltr', color: COLOR_DARK, fontFamily: FONT }}>
                  {`${form.prefix || ''}${String(form.next_number ?? 1).padStart(form.padding ?? 5, '0')}`}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={() => save.mutate({ ...form, next_number: Number(form.next_number) || 1, padding: Number(form.padding) || 5 })}
                  sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', flex: 1, fontFamily: FONT }}>
                  {editing ? 'به‌روزرسانی' : 'افزودن'}
                </Button>
                {editing && <Button variant="outlined" onClick={() => { setEditing(null); setForm({}); }} sx={{ borderRadius: '12px', fontFamily: FONT }}>انصراف</Button>}
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ ...glass, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'rgba(16,185,129,0.15)' }}>
                <AutoFixHighIcon sx={{ color: '#059669' }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#059669" sx={{ fontFamily: FONT }}>شماره‌گذاری مجدد اسناد</Typography>
                <Typography variant="caption" color="textSecondary">اسناد بر اساس تاریخ مرتب و شماره‌گذاری مجدد می‌شوند</Typography>
              </Box>
            </Box>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>سال مالی</InputLabel>
                  <Select value={renumber.fiscal_year_id || ''} label="سال مالی" onChange={e => setRn('fiscal_year_id', e.target.value)}>
                    <MenuItem value="">همه سال‌ها</MenuItem>
                    {yearsList.map(y => <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>دفتر روزنامه</InputLabel>
                  <Select value={renumber.journal_id || ''} label="دفتر روزنامه" onChange={e => setRn('journal_id', e.target.value)}>
                    <MenuItem value="">همه روزنامه‌ها</MenuItem>
                    {journalsList.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <TextField size="small" label="پیشوند" value={renumber.prefix} onChange={e => setRn('prefix', e.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" label="شروع از" type="number" value={renumber.start} onChange={e => setRn('start', Number(e.target.value) || 1)} sx={{ width: 110 }} />
                <TextField size="small" label="تعداد ارقام" type="number" value={renumber.padding} onChange={e => setRn('padding', Number(e.target.value) || 5)} sx={{ width: 110 }} />
              </Stack>
              <Button variant="contained" startIcon={<AutorenewIcon />} disabled={renumberMutation.isPending}
                onClick={() => renumberMutation.mutate({ ...renumber, start: Number(renumber.start) || 1, padding: Number(renumber.padding) || 5 })}
                sx={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '12px', fontFamily: FONT }}>
                {renumberMutation.isPending ? 'در حال انجام...' : 'شماره‌گذاری مجدد'}
              </Button>
              {renumberMutation.isPending && <LinearProgress sx={{ borderRadius: '6px' }} />}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <Paper sx={{ ...glass, p: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <HistoryIcon fontSize="small" sx={{ color: COLOR_DARK }} />
            <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>قوانین شماره‌گذاری</Typography>
          </Box>
          {list.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4} sx={{ fontFamily: FONT }}>هنوز قانونی ثبت نشده است.</Typography>
          ) : (
            <Stack spacing={1}>
              {list.map(s => {
                const j = journalsList.find(x => x.id === s.journal);
                const y = yearsList.find(x => x.id === s.fiscal_year);
                return (
                  <Box key={s.id} sx={{
                    p: 1.5, borderRadius: '14px', border: '1px solid rgba(15,23,42,0.07)',
                    background: '#ffffff',
                    display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                  }}>
                    <Box sx={{ flex: 1, minWidth: 160 }}>
                      <Typography variant="body2" fontWeight={800} sx={{ fontFamily: FONT }}>{j?.name || 'عمومی'}</Typography>
                      <Typography variant="caption" color="textSecondary">{y?.name || 'همه سال‌ها'}</Typography>
                    </Box>
                    <Box sx={{ minWidth: 100 }}>
                      <Typography variant="caption" color="textSecondary" display="block">پیشوند</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ direction: 'ltr', textAlign: 'left', fontFamily: FONT }}>{s.prefix || '—'}</Typography>
                    </Box>
                    <Box sx={{ minWidth: 90 }}>
                      <Typography variant="caption" color="textSecondary" display="block">شمارهٔ بعدی</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ fontFamily: FONT }}>{toPersianDigits(s.next_number)}</Typography>
                    </Box>
                    <Box sx={{ minWidth: 70 }}>
                      <Typography variant="caption" color="textSecondary" display="block">ارقام</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ fontFamily: FONT }}>{toPersianDigits(s.padding)}</Typography>
                    </Box>
                    <Chip size="small" label={previewOf(s)} sx={{ fontWeight: 800, bgcolor: 'rgba(99,102,241,0.12)', color: COLOR_DARK, direction: 'ltr', fontFamily: FONT }} />
                    <Box>
                      <Tooltip title="ویرایش"><IconButton size="small" onClick={() => { setEditing(s); setForm(s); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(s.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default AccountingSequencesPage;