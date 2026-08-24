import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Grid, Avatar, Chip, CircularProgress, TextField,
  InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { PRIORITIES, PRIORITY_LABELS, PRIORITY_COLORS } from './config';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';

const LETTER_TYPES = [
  { value: 'notice', label: 'اطلاع رسانی' },
  { value: 'edict', label: 'ابلاغ' },
  { value: 'seizure', label: 'بازداشت نامه' },
  { value: 'summons', label: 'احضاریه' },
  { value: 'warning', label: 'هشدار / تذکر' },
  { value: 'request', label: 'درخواست' },
  { value: 'response', label: 'پاسخ' },
  { value: 'other', label: 'سایر' },
];
const LETTER_TYPE_LABELS = LETTER_TYPES.reduce((a, t) => { a[t.value] = t.label; return a; }, {});
const LETTER_TYPE_COLORS = {
  notice: '#3b82f6', edict: '#6366f1', seizure: '#ef4444', summons: '#f59e0b',
  warning: '#f97316', request: '#8b5cf6', response: '#10b981', other: '#94a3b8',
};

const color = '#14b8a6';

const Organizations = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => axiosInstance.get('/organizations/').then(r => r.data.results || r.data),
  });
  const { data: letters, isLoading } = useQuery({
    queryKey: ['organizational-letters'],
    queryFn: () => axiosInstance.get('/organizational-letters/').then(r => r.data.results || r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, v);
      });
      if (file) fd.append('file', file);
      return editing
        ? axiosInstance.patch(`/organizational-letters/${editing.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : axiosInstance.post('/organizational-letters/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizational-letters'] });
      setOpen(false); setEditing(null); setForm({}); setFile(null); setError('');
    },
    onError: (e) => setError(e.response?.data?.error || 'خطا در ذخیره'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/organizational-letters/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizational-letters'] }),
  });

  const filtered = (letters || []).filter(l => !search.trim() || (l.subject || '').includes(search.trim()) || (l.number || '').includes(search.trim()));

  const openNew = () => { setEditing(null); setForm({ letter_type: 'notice', priority: 'normal' }); setFile(null); setOpen(true); };
  const openEdit = (it) => { setEditing(it); setForm({ ...it }); setFile(null); setOpen(true); };

  return (
    <Box>
      {/* Toolbar */}
      <Paper sx={{
        mb: 2, p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap',
        background: `linear-gradient(135deg, ${color}0d, ${color}04)`,
        border: `1px solid ${color}20`, backdropFilter: 'blur(14px)', borderRadius: 3,
      }}>
        <TextField size="small" placeholder="جستجوی مکاتبه سازمانی..." value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 220 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ background: `linear-gradient(135deg, ${color}, ${color}90)` }}>
          افزودن مکاتبه
        </Button>
      </Paper>

      {/* Letters */}
      {isLoading ? (
        <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', borderRadius: 3 }}>
          <Typography color="textSecondary">مکاتبه سازمانی ثبت نشده است</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(l => (
            <Grid item xs={12} sm={6} lg={4} key={l.id}>
              <Paper sx={{
                p: 2, height: '100%',
                background: `linear-gradient(160deg, ${LETTER_TYPE_COLORS[l.letter_type]}0a, rgba(255,255,255,0.4))`,
                border: `1px solid ${LETTER_TYPE_COLORS[l.letter_type]}20`,
                backdropFilter: 'blur(14px)', borderRadius: 3,
                transition: 'all 0.25s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 28px ${LETTER_TYPE_COLORS[l.letter_type]}22` },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Avatar sx={{ width: 42, height: 42, background: `linear-gradient(135deg, ${LETTER_TYPE_COLORS[l.letter_type]}, ${LETTER_TYPE_COLORS[l.letter_type]}90)` }}>
                    <BusinessIcon sx={{ color: '#fff', fontSize: 20 }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>{l.subject}</Typography>
                    <Typography variant="caption" color="textSecondary" display="block">{l.organization_name || '—'}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                  <Chip size="small" label={LETTER_TYPE_LABELS[l.letter_type]} variant="outlined"
                    sx={{ color: LETTER_TYPE_COLORS[l.letter_type], borderColor: LETTER_TYPE_COLORS[l.letter_type] }} />
                  {l.priority && <Chip size="small" label={PRIORITY_LABELS[l.priority]} variant="outlined"
                    sx={{ color: PRIORITY_COLORS[l.priority], borderColor: PRIORITY_COLORS[l.priority] }} />}
                </Box>

                <Typography variant="caption" color="textSecondary" display="block">
                  شماره: {toPersianDigits(l.number)} · تاریخ: {toJalali(l.date)}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: `1px solid ${color}18` }}>
                  {l.file ? (
                    <Tooltip title="باز کردن پیوست"><Chip size="small" label="پیوست دارد" variant="outlined" component="a" href={l.file} target="_blank" clickable sx={{ color, borderColor: `${color}55` }} /></Tooltip>
                  ) : <Typography variant="caption" color="textSecondary">بدون پیوست</Typography>}
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <IconButton size="small" onClick={() => openEdit(l)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(l.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color, background: `linear-gradient(135deg, ${color}10, transparent)` }}>
          {editing ? 'ویرایش مکاتبه سازمانی' : 'افزودن مکاتبه سازمانی'}
        </DialogTitle>
        <DialogContent>
          {error && <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            <TextField fullWidth size="small" label="شماره نامه" value={form.number || ''} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} required />
            <JalaliDatePicker fullWidth label="تاریخ نامه" value={form.date} onChange={g => setForm(p => ({ ...p, date: g }))} />
            <FormControl fullWidth size="small">
              <InputLabel>سازمان</InputLabel>
              <Select value={form.organization || ''} label="سازمان" onChange={e => setForm(p => ({ ...p, organization: e.target.value }))}>
                {(orgs || []).map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>نوع مکاتبه</InputLabel>
              <Select value={form.letter_type || 'notice'} label="نوع مکاتبه" onChange={e => setForm(p => ({ ...p, letter_type: e.target.value }))}>
                {LETTER_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="موضوع" value={form.subject || ''} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} required />
            <FormControl fullWidth size="small">
              <InputLabel>اولویت</InputLabel>
              <Select value={form.priority || 'normal'} label="اولویت" onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <Box>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>فایل پیوست (اختیاری)</Typography>
              <input id="org-letter-file" type="file" hidden onChange={e => setFile(e.target.files[0] || null)} />
              <Button variant="outlined" size="small" onClick={() => document.getElementById('org-letter-file').click()}>
                {file ? file.name : (editing?.file ? 'تعویض فایل پیوست' : 'انتخاب فایل پیوست')}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => saveMutation.mutate(form)}
            sx={{ background: `linear-gradient(135deg, ${color}, ${color}90)` }}
            disabled={saveMutation.isLoading}>
            {saveMutation.isLoading ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Organizations;