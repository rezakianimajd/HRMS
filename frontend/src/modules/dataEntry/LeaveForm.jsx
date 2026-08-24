import React from 'react';
import { TransactionForm } from './SharedForm';
import { TRANSACTION_TYPES } from './config';
import { Grid, TextField } from '@mui/material';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';

const LeaveFields = ({ form, set }) => (
  <>
    <Grid item xs={12} sm={6}>
      <TextField fullWidth size="small" label="تعداد روز" type="number" value={form.quantity || ''}
        onChange={e => set('quantity', e.target.value)} required
        helperText="می‌تواند اعشاری باشد (مثلاً ۰.۵ برای نیم روز)" />
    </Grid>
    <Grid item xs={12} sm={6}>
      <JalaliDatePicker fullWidth label="تاریخ شروع" value={form.start_date}
        onChange={v => set('start_date', v)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date}
        onChange={v => set('end_date', v)} />
    </Grid>
  </>
);

const LeaveForm = ({ onSuccess }) => {
  const cfg = TRANSACTION_TYPES.leave;
  return (
    <TransactionForm
      title={`ثبت ${cfg.label}`}
      transactionType={cfg.key}
      subTypes={cfg.subTypes}
      color={cfg.color}
      onSuccess={onSuccess}
    >
      <LeaveFields />
    </TransactionForm>
  );
};

export default LeaveForm;