import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Grid, TextField, Button, FormControl, InputLabel, Select,
  MenuItem, Alert, CircularProgress, Typography, Paper, Avatar,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { BENEFIT_TYPES } from './config';

const MONTHS = [
  { value: '1', label: 'فروردین' }, { value: '2', label: 'اردیبهشت' },
  { value: '3', label: 'خرداد' }, { value: '4', label: 'تیر' },
  { value: '5', label: 'مرداد' }, { value: '6', label: 'شهریور' },
  { value: '7', label: 'مهر' }, { value: '8', label: 'آبان' },
  { value: '9', label: 'آذر' }, { value: '10', label: 'دی' },
  { value: '11', label: 'بهمن' }, { value: '12', label: 'اسفند' },
];

const BenefitForm = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ year: 1404, month: '6' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: employees } = useQuery({
    queryKey: ['emp-dropdown'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 500 } }).then(r => r.data.results || r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/benefits/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      queryClient.invalidateQueries({ queryKey: ['employee-benefit-records'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (onSuccess) onSuccess();
    },
    onError: (e) => setError(e.response?.data?.error || 'خطا در ذخیره'),
  });

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const gross = Number(form.gross_amount) || 0;
  const tax = Number(form.reserved_tax) || 0;
  const paid = gross - tax;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.employee) { setError('انتخاب پرسنل الزامی است'); return; }
    if (!form.benefit_type) { setError('نوع مزایا الزامی است'); return; }
    if (!form.year || !form.month) { setError('سال و ماه الزامی است'); return; }

    const payload = {
      ...form,
      gross_amount: gross,
      reserved_tax: tax,
      paid_amount: Number(form.paid_amount) || paid,
    };
    mutation.mutate(payload);
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#10b981' }}>
        ثبت مزایای رفاهی
      </Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>✅ مزایا با موفقیت ثبت شد</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small" required>
            <InputLabel>پرسنل</InputLabel>
            <Select value={form.employee || ''} label="پرسنل" onChange={e => set('employee', e.target.value)}>
              {Array.isArray(employees) && employees.map(emp => (
                <MenuItem key={emp.id} value={emp.id}>{emp.full_name} ({toPersianDigits(emp.employee_id)})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small" required>
            <InputLabel>نوع مزایای رفاهی</InputLabel>
            <Select value={form.benefit_type || ''} label="نوع مزایای رفاهی" onChange={e => set('benefit_type', e.target.value)}>
              {BENEFIT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField fullWidth size="small" label="سال" type="number" value={form.year || ''}
            onChange={e => set('year', e.target.value)} required inputProps={{ style: { textAlign: 'right' } }} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <FormControl fullWidth size="small" required>
            <InputLabel>ماه</InputLabel>
            <Select value={form.month || ''} label="ماه" onChange={e => set('month', e.target.value)}>
              {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth size="small" label="مبلغ ناخالص (ریال)" type="number" value={form.gross_amount || ''}
            onChange={e => set('gross_amount', e.target.value)} required inputProps={{ style: { textAlign: 'right' } }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="مالیات ذخیره شده (ریال)" type="number" value={form.reserved_tax || ''}
            onChange={e => set('reserved_tax', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" label="مبلغ پرداخت شده (ریال)" type="number" value={form.paid_amount || ''}
            onChange={e => set('paid_amount', e.target.value)} inputProps={{ style: { textAlign: 'right' } }}
            helperText={gross > 0 ? `پیشنهاد: ${formatPersianNumber(paid)} ریال` : ''} />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="outlined" startIcon={<ClearIcon />} onClick={() => setForm({ year: 1404, month: '6' })}>پاک کردن</Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={mutation.isLoading}>
          {mutation.isLoading ? <CircularProgress size={20} /> : 'ثبت مزایا'}
        </Button>
      </Box>
    </Paper>
  );
};

export { MONTHS };
export default BenefitForm;