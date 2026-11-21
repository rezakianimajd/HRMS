import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { GUARANTEE_TYPES } from '../../core/constants/guaranteeTypes';
import { toEnglishDigits } from '../../core/utils/numberUtils';

const INSTRUMENTS = [
  { value: 'check', label: 'چک' },
  { value: 'promissory', label: 'سفته' },
  { value: 'bank_guarantee', label: 'ضمانت‌نامه بانکی' },
  { value: 'undertaking_guarantee', label: 'ضمانت‌نامه تعهدی' },
  { value: 'check_and_guarantee', label: 'چک + ضمانت‌نامه' },
  { value: 'promissory_and_guarantee', label: 'سفته + ضمانت‌نامه' },
];
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '9px', fontSize: 12.5 } };

const emptyForm = (guarantee, requirement) => {
  if (guarantee?.id) {
    return {
      number: guarantee.number || '',
      guarantee_type: guarantee.type || 'performance',
      instrument_type: guarantee.instrument || 'check',
      amount: guarantee.amount || '',
      issue_date: guarantee.issue_date || '',
      expiry_date: guarantee.expiry_date || '',
      bank: guarantee.bank || '',
      note: guarantee.note || '',
    };
  }
  return {
    number: '',
    guarantee_type: requirement?.type || 'performance',
    instrument_type: 'check',
    amount: requirement ? (requirement.balance > 0 ? requirement.balance : requirement.required) : '',
    issue_date: '',
    expiry_date: '',
    bank: '',
    note: '',
  };
};

const GuaranteeInlineDialog = ({ open, onClose, contractId, guarantee, requirement }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(guarantee, requirement));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(emptyForm(guarantee, requirement));
      setError('');
    }
  }, [open, guarantee, requirement]);

  const save = useMutation({
    mutationFn: (payload) => (guarantee?.id
      ? axiosInstance.patch(`/contract-guarantees/${guarantee.id}/`, payload)
      : axiosInstance.post('/contract-guarantees/', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external-contract', String(contractId)] });
      qc.invalidateQueries({ queryKey: ['contract-guarantees-status', String(contractId)] });
      qc.invalidateQueries({ queryKey: ['contract-guarantees-monitor'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setError('');
      onClose();
    },
    onError: (event) => {
      const data = event.response?.data;
      const message = data?.error || data?.detail || (data && typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : 'خطا در ثبت تضمین');
      setError(String(message || 'خطا در ثبت تضمین'));
    },
  });

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const remove = useMutation({
    mutationFn: () => axiosInstance.delete(`/contract-guarantees/${guarantee.id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external-contract', String(contractId)] });
      qc.invalidateQueries({ queryKey: ['contract-guarantees-status', String(contractId)] });
      qc.invalidateQueries({ queryKey: ['contract-guarantees-monitor'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      onClose();
    },
    onError: (event) => setError(event.response?.data?.detail || 'خطا در حذف تضمین'),
  });
  const confirmRemove = () => {
    if (window.confirm('این تضمین از قرارداد حذف شود؟ این اقدام قابل بازگشت نیست.')) {
      remove.mutate();
    }
  };
  const submit = () => {
    if (!form.amount || Number(toEnglishDigits(form.amount)) <= 0) {
      setError('مبلغ تضمین باید بزرگ‌تر از صفر باشد.');
      return;
    }
    save.mutate({
      contract: Number(contractId),
      contract_guarantee_index: guarantee?.contract_guarantee_index ?? requirement?.index ?? null,
      guarantee_type: form.guarantee_type,
      instrument_type: form.instrument_type,
      number: form.number || '',
      amount: toEnglishDigits(String(form.amount)),
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      bank: form.bank || '',
      note: form.note || '',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ style: { borderRadius: 12 } }}>
      <DialogTitle sx={{ pb: 0.75 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
          {guarantee?.id ? 'ویرایش تضمین' : 'ثبت تضمین برای این قلم'}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.3 }}>
          {requirement?.label ? `قلم: ${requirement.label}` : 'تغییرات پس از ذخیره، فوراً در پروندهٔ قرارداد اعمال می‌شود.'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1.5 }}>
        {error ? <Alert severity="error" sx={{ mb: 1.5, borderRadius: '9px' }}>{error}</Alert> : null}
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <TextField select size="small" fullWidth sx={fieldSx} label="نوع تضمین"
              value={form.guarantee_type} onChange={(event) => set('guarantee_type', event.target.value)}>
              {GUARANTEE_TYPES.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select size="small" fullWidth sx={fieldSx} label="ابزار تضمین"
              value={form.instrument_type} onChange={(event) => set('instrument_type', event.target.value)}>
              {INSTRUMENTS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" fullWidth sx={fieldSx} label="شماره تضمین"
              value={form.number} onChange={(event) => set('number', event.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField size="small" fullWidth sx={fieldSx} label="مبلغ (به ارز تضمین)"
              value={form.amount} onChange={(event) => set('amount', toEnglishDigits(event.target.value))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <JalaliDatePicker fullWidth sx={fieldSx} label="تاریخ صدور"
              value={form.issue_date || ''} onChange={(value) => set('issue_date', value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <JalaliDatePicker fullWidth sx={fieldSx} label="تاریخ سررسید / انقضا"
              value={form.expiry_date || ''} onChange={(value) => set('expiry_date', value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField size="small" fullWidth sx={fieldSx} label="بانک / صادرکننده"
              value={form.bank} onChange={(event) => set('bank', event.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField size="small" fullWidth sx={fieldSx} multiline rows={2} label="یادداشت"
              value={form.note} onChange={(event) => set('note', event.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25, gap: 0.5 }}>
        {guarantee?.id ? (
          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={confirmRemove}
            disabled={save.isPending || remove.isPending} sx={{ ml: 0 }}>
            حذف تضمین
          </Button>
        ) : null}
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClose} disabled={save.isPending || remove.isPending}>انصراف</Button>
        <Button size="small" variant="contained" onClick={submit} disabled={save.isPending || remove.isPending}
          sx={{ px: 2.4, borderRadius: '8px', fontWeight: 800, boxShadow: 'none' }}>
          {save.isPending ? 'در حال ذخیره…' : 'ذخیره و به‌روزرسانی پرونده'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GuaranteeInlineDialog;

