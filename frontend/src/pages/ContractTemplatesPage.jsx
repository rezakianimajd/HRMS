import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Avatar, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px', background: 'rgba(255,255,255,0.6)',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(99,102,241,0.12)' },
  },
};

const EMPTY = { name: '', contract_type_master: '', content: '', description: '' };

const ContractTemplatesPage = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [view, setView] = useState(null);
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['contract-templates'], queryFn: () => axiosInstance.get('/contract-templates/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];

  const { data: typeMasters } = useQuery({ queryKey: ['contract-types-master'], queryFn: () => axiosInstance.get('/contract-types-master/').then(r => r.data) });
  const typeList = Array.isArray(typeMasters) ? typeMasters : typeMasters?.results || [];

  const save = useMutation({
    mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-templates/${p.id}/`, p) : axiosInstance.post('/contract-templates/', p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-templates'] });
      setDialog(false); setForm(EMPTY);
      setMsg(form.id ? 'قالب ویرایش شد.' : 'قالب ثبت شد.');
      setTimeout(() => setMsg(''), 2500);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-templates/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-templates'] });
      setMsg('قالب حذف شد.'); setTimeout(() => setMsg(''), 2500);
    },
  });

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(99,102,241,0.10), rgba(139,92,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(99,102,241,0.16)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
          <DescriptionIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#4338ca">قالب‌ها و پیش‌نویس‌ها</Typography>
          <Typography variant="body2" color="textSecondary">ساخت و مدیریت قالب‌های آمادهٔ قرارداد برای تولید سریع پیش‌نویس</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', px: 2.5, whiteSpace: 'nowrap' }}>
          قالب جدید
        </Button>
      </Paper>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : list.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <DescriptionIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="textSecondary">قالبی ثبت نشده است.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.06)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>عنوان قالب</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>نوع قرارداد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>توضیحات</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map(t => (
                  <TableRow key={t.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={700}>{t.name}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={t.contract_type_name || '—'} sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#4338ca', fontWeight: 700, fontSize: 11 }} />
                    </TableCell>
                    <TableCell><Typography variant="caption" color="textSecondary">{t.description ? t.description.slice(0, 60) : '—'}</Typography></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="مشاهده"><IconButton size="small" color="info" onClick={() => setView(t)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="ویرایش"><IconButton size="small" color="primary" onClick={() => { setForm(t); setDialog(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => remove.mutate(t.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#4338ca', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
          {form.id ? 'ویرایش قالب' : 'قالب جدید'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={1.5}>
            <TextField size="small" fullWidth label="عنوان قالب *" value={form.name} sx={fieldSx} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <FormControl size="small" fullWidth sx={fieldSx}>
              <InputLabel>نوع قرارداد</InputLabel>
              <Select value={form.contract_type_master || ''} label="نوع قرارداد" onChange={e => setForm(p => ({ ...p, contract_type_master: e.target.value }))}>
                <MenuItem value="">—</MenuItem>
                {typeList.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" fullWidth label="توضیحات" value={form.description} sx={fieldSx} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <TextField size="small" fullWidth label="متن / ساختار قالب" multiline rows={8} value={form.content} sx={fieldSx} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.name} onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', px: 3 }}>ذخیره</Button>
        </DialogActions>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!view} onClose={() => setView(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#4338ca', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>{view?.name}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {view && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {view.contract_type_name && <Chip size="small" label={view.contract_type_name} sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#4338ca', fontWeight: 700 }} />}
              </Box>
              {view.description && <Typography variant="body2" color="textSecondary">{view.description}</Typography>}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{view.content || '—'}</Typography>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setView(null)} sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', px: 3 }}>بستن</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractTemplatesPage;


