import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, Alert, IconButton, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, FormControl, InputLabel, Select,
} from '@mui/material';
import NumbersIcon from '@mui/icons-material/Numbers';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { toPersianDigits } from '../core/utils/numberUtils';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(99,102,241,0.12)', borderRadius: '16px',
};

const AccountingSequencesPage = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['acc-sequences'], queryFn: () => axiosInstance.get('/accounting/sequences/').then(r => r.data) });
  const { data: journals } = useQuery({ queryKey: ['seq-journals'], queryFn: () => axiosInstance.get('/accounting/journals/').then(r => r.data) });
  const { data: years } = useQuery({ queryKey: ['seq-years'], queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const journalsList = Array.isArray(journals) ? journals : journals?.results || [];
  const yearsList = Array.isArray(years) ? years : years?.results || [];

  const save = useMutation({
    mutationFn: (p) => editing ? axiosInstance.patch(`/accounting/sequences/${editing.id}/`, p) : axiosInstance.post('/accounting/sequences/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['acc-sequences'] }); setEditing(null); setForm({}); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/sequences/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['acc-sequences'] }),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <NumbersIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>شماره‌گذاری اسناد</Typography>
          <Typography variant="body2" color="textSecondary">تعیین پیشوند و قالب شماره به ازای روزنامه، سال و شعبه</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, p: 2.5, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} mb={2}>{editing ? 'ویرایش شماره‌گذاری' : 'شماره‌گذاری جدید'}</Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>روزنامه</InputLabel>
            <Select value={form.journal || ''} label="روزنامه" onChange={e => set('journal', e.target.value)}>
              <MenuItem value="">—</MenuItem>
              {journalsList.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>سال مالی</InputLabel>
            <Select value={form.fiscal_year || ''} label="سال مالی" onChange={e => set('fiscal_year', e.target.value)}>
              <MenuItem value="">—</MenuItem>
              {yearsList.map(y => <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="پیشوند" value={form.prefix || ''} onChange={e => set('prefix', e.target.value)} sx={{ width: 130 }} />
          <TextField size="small" label="شمارهٔ بعدی" type="number" value={form.next_number ?? 1} onChange={e => set('next_number', Number(e.target.value) || 1)} sx={{ width: 120 }} />
          <TextField size="small" label="تعداد ارقام" type="number" value={form.padding ?? 5} onChange={e => set('padding', Number(e.target.value) || 5)} sx={{ width: 120 }} />
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => save.mutate({ ...form, next_number: Number(form.next_number) || 1, padding: Number(form.padding) || 5 })}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
            {editing ? 'به‌روزرسانی' : 'افزودن'}
          </Button>
          {editing && <Button variant="outlined" onClick={() => { setEditing(null); setForm({}); }}>انصراف</Button>}
        </Stack>
      </Paper>

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <TableContainer component={Paper} sx={{ ...glass }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>روزنامه</TableCell><TableCell>سال مالی</TableCell><TableCell>پیشوند</TableCell><TableCell>شمارهٔ بعدی</TableCell><TableCell>ارقام</TableCell><TableCell>پیش‌نمایش</TableCell><TableCell>عملیات</TableCell></TableRow></TableHead>
            <TableBody>
              {list.length === 0 ? <TableRow><TableCell colSpan={7} align="center">شماره‌گذاری‌ای ثبت نشده است</TableCell></TableRow> :
              list.map(s => {
                const journal_name = journalsList.find(j => j.id === s.journal)?.name || '—';
                const year_name = yearsList.find(y => y.id === s.fiscal_year)?.name || '—';
                const preview = `${s.prefix || ''}${String(s.next_number).padStart(s.padding || 5, '0')}`;
                return (
                  <TableRow key={s.id} hover>
                    <TableCell>{journal_name}</TableCell>
                    <TableCell>{year_name}</TableCell>
                    <TableCell>{s.prefix || '—'}</TableCell>
                    <TableCell>{toPersianDigits(s.next_number)}</TableCell>
                    <TableCell>{toPersianDigits(s.padding)}</TableCell>
                    <TableCell><Chip size="small" label={preview} color="primary" sx={{ fontWeight: 800 }} /></TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => { setEditing(s); setForm(s); }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(s.id); }}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AccountingSequencesPage;