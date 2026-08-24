import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Grid, TextField, Button, FormControl, InputLabel, Select,
  MenuItem, Alert, CircularProgress, Typography, Paper,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';

/**
 * Shared form infrastructure for all transaction types.
 * Provides: employee selector, common fields, and submit logic.
 */
export const useTransactionForm = (onSuccess) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/transactions/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      if (onSuccess) onSuccess();
    },
  });
  return mutation;
};

export const useEmployees = () => {
  return useQuery({
    queryKey: ['emp-dropdown'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 500 } }).then(r => r.data.results || r.data),
  });
};

const EmployeeSelector = ({ value, onChange, employees }) => (
  <FormControl fullWidth size="small" required>
    <InputLabel>پرسنل</InputLabel>
    <Select value={value || ''} label="پرسنل" onChange={e => onChange(e.target.value)}>
      {Array.isArray(employees) && employees.map(emp => (
        <MenuItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</MenuItem>
      ))}
    </Select>
  </FormControl>
);

const SubTypeSelector = ({ value, onChange, subTypes }) => (
  <FormControl fullWidth size="small">
    <InputLabel>نوع</InputLabel>
    <Select value={value || ''} label="نوع" onChange={e => onChange(e.target.value)}>
      {subTypes.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
    </Select>
  </FormControl>
);

const DatePickerField = ({ value, onChange, label }) => (
  <JalaliDatePicker fullWidth label={label} value={value}
    onChange={gregorian => onChange(gregorian)} />
);

const DescriptionField = ({ value, onChange }) => (
  <TextField fullWidth size="small" label="توضیحات" multiline rows={2}
    value={value || ''} onChange={e => onChange(e.target.value)} />
);

/**
 * Shared TransactionForm component.
 * Props:
 *  - title: form title
 *  - transactionType: 'leave' | 'absence' | 'salary' | 'benefit' | 'deduction'
 *  - subTypes: array of {value, label}
 *  - extraFields: React node rendered in the form (specific fields per type)
 *  - onSuccess: callback
 */
export const TransactionForm = ({ title, transactionType, subTypes, children, onSuccess, color }) => {
  const { data: employees } = useEmployees();
  const mutation = useTransactionForm(onSuccess);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.employee) { setError('انتخاب پرسنل الزامی است'); return; }
    if (!form.date) { setError('تاریخ الزامی است'); return; }

    const payload = {
      ...form,
      transaction_type: transactionType,
      amount: form.amount ? Number(form.amount) : 0,
      quantity: form.quantity ? Number(form.quantity) : 0,
    };
    mutation.mutate(payload, {
      onSuccess: () => { setSaved(true); setForm({}); setTimeout(() => setSaved(false), 2000); },
      onError: (err) => setError(err.response?.data?.error || 'خطا در ذخیره'),
    });
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color }}>{title}</Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>✅ تراکنش با موفقیت ثبت شد</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <EmployeeSelector value={form.employee} onChange={v => set('employee', v)} employees={employees} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <SubTypeSelector value={form.sub_type} onChange={v => set('sub_type', v)} subTypes={subTypes} />
        </Grid>

        {/* Specific fields per type */}
        {children && React.cloneElement(children, { form, set })}

        <Grid item xs={12} sm={6}>
          <DatePickerField value={form.date} onChange={v => set('date', v)} label="تاریخ" />
        </Grid>

        <Grid item xs={12}>
          <DescriptionField value={form.description} onChange={v => set('description', v)} />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="outlined" startIcon={<ClearIcon />} onClick={() => setForm({})}>پاک کردن</Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={mutation.isLoading}>
          {mutation.isLoading ? <CircularProgress size={20} /> : 'ثبت تراکنش'}
        </Button>
      </Box>
    </Paper>
  );
};