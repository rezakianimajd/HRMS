import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { toJalali } from '../core/utils/dateUtils';

const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  pending_approval: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأیید شده', color: '#10b981' },
  rejected: { label: 'رد شده', color: '#ef4444' },
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px', background: 'rgba(255,255,255,0.6)',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(100,116,139,0.12)' },
  },
};

const EMPTY = { title: '', template: '', contract: '', content: '', submitted_by: '' };

const ContractDraftsPage = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [statusFilter, setStatusFilter] = useState('');
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['contract-drafts'], queryFn: () => axiosInstance.get('/contract-drafts/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];

  const { data: templates } = useQuery({ queryKey: ['contract-templates'], queryFn: () => axiosInstance.get('/contract-templates/').then(r => r.data) });
  const templateList = Array.isArray(templates) ? templates : templates?.results || [];

  const save = useMutation({
    mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-drafts/${p.id}/`, p) : axiosInstance.post('/contract-drafts/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-drafts'] }); setDialog(false); setForm(EMPTY); setMsg('پیش‌نویس ذخیره شد.'); setTimeout(() => setMsg(''), 2500); },
  });

  const submit = useMutation({
    mutationFn: (id) => axiosInstance.post(`/contract-drafts/${id}/submit/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-drafts'] }); setMsg('برای تأیید ارسال شد.'); setTimeout(() => setMsg(''), 2500); },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-drafts/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-drafts'] }); setMsg('پیش‌نویس حذف شد.'); setTimeout(() => setMsg(''), 2500); },
  });

  const filtered = list.filter(d => !statusFilter || d.status === statusFilter);

  const onTemplateSelect = (templateId) => {
    const t = templateList.find(x => x.id === templateId);
    if (t) setForm(p => ({ ...p, template: templateId, content: t.content || p.content }));
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(100,116,139,0.10), rgba(71,85,105,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(100,116,139,0.16)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #64748b, #475569)', boxShadow: '0 8px 24px rgba(100,116,139,0.35)' }}>
          <FactCheckIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#334155">پیش‌نویس‌ها</Typography>
          <Typography variant="body2" color="textSecondary">تهیه و مدیریت پیش‌نویس قراردادها و ارسال برای گردش‌کار تأیید</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg, #64748b, #475569)', borderRadius: '10px', px: 2.5, whiteSpace: 'nowrap' }}>
          پیش‌نویس جدید
        </Button>
      </Paper>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          <Chip label="همه" variant={statusFilter === '' ? 'filled' : 'outlined'} color="primary" onClick={() => setStatusFilter('')} />
          {Object.entries(STATUS_META).map(([k, v]) => (
            <Chip key={k} label={v.label} variant={statusFilter === k ? 'filled' : 'outlined'}
              sx={{ color: statusFilter === k ? '#fff' : v.color, bgcolor: statusFilter === k ? v.color : 'transparent', borderColor: v.color }}
              onClick={() => setStatusFilter(statusFilter === k ? '' : k)} />
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <FactCheckIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="textSecondary">پیش‌نویسی ثبت نشده است.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(100,116,139,0.06)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>عنوان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>قالب مبدأ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ثبت‌کننده</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>به‌روزرسانی</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>وضعیت</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(d => {
                  const sm = STATUS_META[d.status] || STATUS_META.draft;
                  return (
                    <TableRow key={d.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={700}>{d.title}</Typography></TableCell>
                      <TableCell>{d.template_name || '—'}</TableCell>
                      <TableCell>{d.submitted_by || '—'}</TableCell>
                      <TableCell>{d.updated_at ? toJalali(String(d.updated_at).slice(0, 10)) : '—'}</TableCell>
                      <TableCell><Chip size="small" label={sm.label} sx={{ bgcolor: `${sm.color}18`, color: sm.color, fontWeight: 700, fontSize: 11 }} /></TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {d.status === 'draft' && (
                          <Tooltip title="ارسال برای تأیید"><IconButton size="small" color="warning" onClick={() => submit.mutate(d.id)}><SendIcon fontSize="small" /></IconButton></Tooltip>
                        )}
                        <Tooltip title="ویرایش"><IconButton size="small" color="primary" onClick={() => { setForm(d); setDialog(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => remove.mutate(d.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#334155', borderBottom: '1px solid rgba(100,116,139,0.15)' }}>
          {form.id ? 'ویرایش پیش‌نویس' : 'پیش‌نویس جدید'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={1.5}>
            <TextField size="small" fullWidth label="عنوان پیش‌نویس *" value={form.title} sx={fieldSx} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <FormControl size="small" fullWidth sx={fieldSx}>
                  <InputLabel>قالب مبدأ</InputLabel>
                  <Select value={form.template || ''} label="قالب مبدأ" onChange={e => onTemplateSelect(e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {templateList.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField size="small" fullWidth label="ثبت‌کننده" value={form.submitted_by} sx={fieldSx} onChange={e => setForm(p => ({ ...p, submitted_by: e.target.value }))} />
              </Grid>
            </Grid>
            <TextField size="small" fullWidth label="متن پیش‌نویس" multiline rows={10} value={form.content} sx={fieldSx} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.title} onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg, #64748b, #475569)', borderRadius: '10px', px: 3 }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractDraftsPage;


