import React from 'react';
import { TransactionForm } from './SharedForm';
import { TRANSACTION_TYPES } from './config';
import { Grid, TextField } from '@mui/material';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';

const AbsenceFields = ({ form, set }) => (
  <>
    <Grid item xs={12} sm={6}>
      <TextField fullWidth size="small" label="تعداد روز" type="number" value={form.quantity || ''}
        onChange={e => set('quantity', e.target.value)} required />
    </Grid>
    <Grid item xs={12} sm={6}>
      <JalaliDatePicker fullWidth label="تاریخ شروع" value={form.start_date}
        onChange={v => set('start_date', v)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date}
        onChange={v => set('end_date', v)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField fullWidth size="small" label="جریمه (ریال)" type="number" value={form.amount || ''}
        onChange={e => set('amount', e.target.value)} helperText="در صورت وجود جریمه مالی" />
    </Grid>
  </>
);

const AbsenceForm = ({ onSuccess }) => {
  const cfg = TRANSACTION_TYPES.absence;
  return (
    <TransactionForm
      title={`ثبت ${cfg.label}`}
      transactionType={cfg.key}
      subTypes={cfg.subTypes}
      color={cfg.color}
      onSuccess={onSuccess}
    >
      <AbsenceFields />
    </TransactionForm>
  );
};

export default AbsenceForm;