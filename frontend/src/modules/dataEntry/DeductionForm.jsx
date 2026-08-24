import React from 'react';
import { TransactionForm } from './SharedForm';
import { TRANSACTION_TYPES } from './config';
import { Grid, TextField } from '@mui/material';

const DeductionFields = ({ form, set }) => (
  <>
    <Grid item xs={12} sm={6}>
      <TextField fullWidth size="small" label="مبلغ (ریال)" type="number" value={form.amount || ''}
        onChange={e => set('amount', e.target.value)} required />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField fullWidth size="small" label="شماره مرجع" value={form.reference_number || ''}
        onChange={e => set('reference_number', e.target.value)} />
    </Grid>
    <Grid item xs={12} sm={6}>
      <TextField fullWidth size="small" label="دوره" value={form.period || ''}
        onChange={e => set('period', e.target.value)} placeholder="مثلاً ۱۴۰۴/۰۶" />
    </Grid>
  </>
);

const DeductionForm = ({ onSuccess }) => {
  const cfg = TRANSACTION_TYPES.deduction;
  return (
    <TransactionForm
      title={`ثبت ${cfg.label}`}
      transactionType={cfg.key}
      subTypes={cfg.subTypes}
      color={cfg.color}
      onSuccess={onSuccess}
    >
      <DeductionFields />
    </TransactionForm>
  );
};

export default DeductionForm;