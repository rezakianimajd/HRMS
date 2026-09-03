import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Avatar, Divider, Stack,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import CloseIcon from '@mui/icons-material/Close';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useEmployees } from '../core/hooks/useEmployees';
import { toPersianDigits } from '../core/utils/numberUtils';

/* Supplementary Insurance management: list all employees' insurances,
   with add/edit/delete + dependents. All editing lives here (not profile). */
const emptyForm = {
  id: null,
  employee: '',
  insurance_name: '',
  insurance_type: '',
  plan: '',
  start_date: '',
  end_date: '',
  monthly_amount: 0,
  total_amount: 0,
  dependents: [],
};

const SupplementaryInsurancePage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [depDialog, setDepDialog] = useState(false);
  const [depForm, setDepForm] = useState({ first_name: '', last_name: '', relation: 'spouse' });
  const { data: employees } = useEmployees({ is_active: true });

  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['all-supplementary-insurances'],
    queryFn: () => axiosInstance.get('/supplementary-insurances/').then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) {
        return axiosInstance.patch(`/supplementary-insurances/${payload.id}/`, payload);
      }
      const res = await axiosInstance.post('/supplementary-insurances/', payload);
      // create dependents after insurance
      for (const dep of payload.dependents || []) {
        await axiosInstance.post('/supplementary-insurance-dependents/', {
          insurance: res.data.id,
          first_name: dep.first_name,
          last_name: dep.last_name,
          relation: dep.relation,
        });
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-supplementary-insurances'] });
      setOpen(false); setError('');
    },
    onError: (e) => setError(e.response?.data?.detail || 'خطا در ذخیره'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/supplementary-insurances/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-supplementary-insurances'] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      id: item.id,
      employee: item.employee,
      insurance_name: item.insurance_name || '',
      insurance_type: item.insurance_type || '',
      plan: item.plan || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      monthly_amount: item.monthly_amount ?? 0,
      total_amount: item.total_amount ?? 0,
      dependents: (item.dependents || []).map(d => ({
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        relation: d.relation,
      })),
    });
    setError('');
    setOpen(true);
  };

  const employeeName = (id) => {
    const e = empList.find(x => x.id === id);
    return e?.full_name || '—';
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid rgba(139,92,246,0.18)',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.07), rgba(255,255,255,0.3))' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 48, height: 48, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
              <HealthAndSafetyIcon sx={{ color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#8b5cf6">بیمه تکمیلی</Typography>
              <Typography variant="body2" color="textSecondary">
                مدیریت بیمههای تکمیلی کلیه پرسنل — افزودن، ویرایش، افراد تحت تکفل
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={openAdd}
            sx={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', borderRadius: 2 }}>
            افزودن بیمه تکمیلی
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        {isLoading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography color="textSecondary">بیمه تکمیلی ثبت نشده است</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>
                <TableCell sx={{ fontWeight: 700 }}>پرسنل</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>بیمه</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>طرح</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>از</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تا</TableCell>
                <TableCell align="left" sx={{ fontWeight: 700 }}>تحت تکفل</TableCell>
                <TableCell align="left" width={100} sx={{ fontWeight: 700 }}>اقدامات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((ins) => (
                <TableRow key={ins.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#8b5cf6', fontSize: 12 }}>
                        {(ins.employee_name || '؟').charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{ins.employee_name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {toPersianDigits(ins.employee_code || '')}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{ins.insurance_name}</Typography></TableCell>
                  <TableCell>
                    <Chip size="small" label={ins.plan || ins.insurance_type || '—'} variant="outlined"
                      sx={{ color: '#8b5cf6', borderColor: '#8b5cf6' }} />
                  </TableCell>
                  <TableCell><Typography variant="body2">{ins.start_date || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{ins.end_date || '—'}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {(ins.dependents || []).length > 0
                        ? ins.dependents.map(d => `${d.first_name} ${d.last_name}`).join('، ')
                        : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => openEdit(ins)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error"
                      onClick={() => { if (window.confirm('حذف این بیمه تکمیلی؟')) deleteMutation.mutate(ins.id); }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#8b5cf6' }}>
          {editing ? 'ویرایش بیمه تکمیلی' : 'افزودن بیمه تکمیلی'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>پرسنل *</InputLabel>
            <Select
              value={form.employee || ''}
              label="پرسنل *"
              onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}
            >
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="نام بیمه تکمیلی *" required
            value={form.insurance_name}
            onChange={e => setForm(p => ({ ...p, insurance_name: e.target.value }))} />
          <TextField fullWidth size="small" label="نوع بیمه" value={form.insurance_type}
            onChange={e => setForm(p => ({ ...p, insurance_type: e.target.value }))} />
          <TextField fullWidth size="small" label="طرح انتخابی" value={form.plan}
            onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} />
          <JalaliDatePicker fullWidth label="تاریخ شروع" value={form.start_date}
            onChange={g => setForm(p => ({ ...p, start_date: g }))} />
          <JalaliDatePicker fullWidth label="تاریخ خاتمه" value={form.end_date}
            onChange={g => setForm(p => ({ ...p, end_date: g }))} />
          <TextField fullWidth size="small" label="مبلغ ماهانه (ریال)" type="number" value={form.monthly_amount}
            onChange={e => setForm(p => ({ ...p, monthly_amount: Number(e.target.value) }))} />
          <TextField fullWidth size="small" label="مبلغ کل (ریال)" type="number" value={form.total_amount}
            onChange={e => setForm(p => ({ ...p, total_amount: Number(e.target.value) }))} />

          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" color="#8b5cf6">افراد تحت تکفل</Typography>
            <Button size="small" startIcon={<AddIcon />}
              onClick={() => { setDepForm({ first_name: '', last_name: '', relation: 'spouse' }); setDepDialog(true); }}>
              افزودن فرد
            </Button>
          </Box>
          {(form.dependents || []).map((dep, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {dep.first_name} {dep.last_name} ({dep.relation})
              </Typography>
              <IconButton size="small" color="error"
                onClick={() => setForm(p => ({ ...p, dependents: p.dependents.filter((_, idx) => idx !== i) }))}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" sx={{ background: '#8b5cf6' }}
            disabled={!form.employee || !form.insurance_name}
            onClick={() => saveMutation.mutate({ ...form, employee: Number(form.employee), dependents: (form.dependents || []) })}>
            {editing ? 'ذخیره تغییرات' : 'افزودن'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dependent dialog */}
      <Dialog open={depDialog} onClose={() => setDepDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#8b5cf6' }}>فرد تحت تکفل</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="نام" value={depForm.first_name}
            onChange={e => setDepForm(p => ({ ...p, first_name: e.target.value }))} />
          <TextField fullWidth size="small" label="نام خانوادگی" value={depForm.last_name}
            onChange={e => setDepForm(p => ({ ...p, last_name: e.target.value }))} />
          <FormControl fullWidth size="small">
            <InputLabel>نسبت</InputLabel>
            <Select value={depForm.relation} label="نسبت" onChange={e => setDepForm(p => ({ ...p, relation: e.target.value }))}>
              <MenuItem value="spouse">همسر</MenuItem>
              <MenuItem value="child">فرزند</MenuItem>
              <MenuItem value="father">پدر</MenuItem>
              <MenuItem value="mother">مادر</MenuItem>
              <MenuItem value="other">سایر</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepDialog(false)}>انصراف</Button>
          <Button variant="contained" sx={{ background: '#8b5cf6' }}
            onClick={() => {
              if (!depForm.first_name || !depForm.last_name) return;
              setForm(p => ({ ...p, dependents: [...(p.dependents || []), depForm] }));
              setDepDialog(false);
            }}>
            افزودن
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupplementaryInsurancePage;