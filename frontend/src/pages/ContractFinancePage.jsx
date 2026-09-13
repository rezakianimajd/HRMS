import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack,
  FormControl, InputLabel, Select, MenuItem, Chip, LinearProgress, Divider,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '10px',
};

const ContractFinancePage = () => {
  const [contractId, setContractId] = useState('');

  const { data: contracts } = useQuery({ queryKey: ['ext-contracts-fin'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: contract, isLoading } = useQuery({
    queryKey: ['ext-contract-fin', contractId],
    queryFn: () => axiosInstance.get(`/external-contracts/${contractId}/`).then(r => r.data),
    enabled: !!contractId,
  });

  const amount = contract?.amount || 0;
  const invoices = contract?.invoices || [];
  const statements = contract?.statements || [];
  const payments = contract?.payments || [];
  const addendums = contract?.addendums || [];

  const totals = {
    invoices: invoices.reduce((s, x) => s + Number(x.total || 0), 0),
    statements: statements.reduce((s, x) => s + Number(x.amount || 0), 0),
    payments: payments.reduce((s, x) => s + Number(x.amount || 0), 0),
    addendums: addendums.reduce((s, x) => s + Number(x.amount_change || 0), 0),
  };
  const paidRatio = amount ? Math.min(100, (totals.payments / amount) * 100) : 0;

  const kpi = (label, value, color, icon) => (
    <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
      <Avatar sx={{ width: 42, height: 42, mx: 'auto', mb: 1, background: `linear-gradient(135deg,${color},${color}99)` }}>{icon}</Avatar>
      <Typography variant="caption" color="textSecondary">{label}</Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color }}>{formatPersianNumber(value)}</Typography>
    </Paper>
  );

  const sectionList = (title, color, icon, rows, renderRow, emptyText) => (
    <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Avatar sx={{ width: 30, height: 30, background: `linear-gradient(135deg,${color},${color}99)` }}>{icon}</Avatar>
        <Typography variant="subtitle2" fontWeight={800}>{title}</Typography>
        <Chip size="small" label={formatPersianNumber(rows.length)} sx={{ bgcolor: `${color}22`, color }} />
      </Box>
      {rows.length === 0 ? (
        <Typography variant="caption" color="textSecondary">{emptyText}</Typography>
      ) : (
        <Stack spacing={0.75}>
          {rows.map(renderRow)}
        </Stack>
      )}
    </Paper>
  );

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(59,130,246,0.10), rgba(245,158,11,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#3b82f6,#f59e0b)', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
          <AccountBalanceWalletIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#1d4ed8">نمای مالی قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">نمایش گرافیکی فاکتورها، صورت‌وضعیت‌ها، پرداخت‌ها و الحاقیه‌ها</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>قرارداد</InputLabel>
          <Select value={contractId || ''} label="قرارداد" onChange={e => setContractId(e.target.value)}>
            {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {!contractId ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">برای مشاهدهٔ نمای مالی، یک قرارداد انتخاب کنید.</Typography>
        </Paper>
      ) : isLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>{kpi('مبلغ قرارداد', amount, '#f59e0b', <AccountBalanceWalletIcon sx={{ color: '#fff' }} />)}</Grid>
            <Grid item xs={6} md={3}>{kpi('جمع فاکتورها', totals.invoices, '#8b5cf6', <ReceiptIcon sx={{ color: '#fff' }} />)}</Grid>
            <Grid item xs={6} md={3}>{kpi('جمع پرداخت‌ها', totals.payments, '#10b981', <PaymentsIcon sx={{ color: '#fff' }} />)}</Grid>
            <Grid item xs={6} md={3}>{kpi('جمع صورت‌وضعیت', totals.statements, '#6366f1', <ReceiptLongIcon sx={{ color: '#fff' }} />)}</Grid>
          </Grid>

          <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
            <Typography variant="caption" color="textSecondary">درصد پرداخت نسبت به مبلغ قرارداد</Typography>
            <LinearProgress variant="determinate" value={paidRatio} sx={{ height: 10, borderRadius: '10px', mt: 1 }} />
            <Typography variant="caption" fontWeight={700} sx={{ mt: 0.5, display: 'block' }}>{formatPersianNumber(paidRatio)}٪</Typography>
          </Paper>

          {sectionList('فاکتورها', '#8b5cf6', <ReceiptIcon sx={{ fontSize: 16, color: '#fff' }} />, invoices,
            x => (
              <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={700}>{x.number || '—'}</Typography>
                <Typography variant="caption" color="textSecondary">{toJalali(x.date)}</Typography>
                <Typography variant="caption">مبلغ: {formatPersianNumber(x.amount || 0)}</Typography>
                <Typography variant="caption">کل: {formatPersianNumber(x.total || 0)}</Typography>
              </Paper>
            ), 'فاکتوری ثبت نشده')}

          {sectionList('صورت‌وضعیت‌ها', '#6366f1', <ReceiptLongIcon sx={{ fontSize: 16, color: '#fff' }} />, statements,
            x => (
              <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={700}>{x.number || '—'}</Typography>
                <Typography variant="caption" color="textSecondary">{toJalali(x.date)}</Typography>
                <Typography variant="caption">مبلغ: {formatPersianNumber(x.amount || 0)}</Typography>
                <Chip size="small" label={x.is_approved ? 'تأیید شده' : 'در انتظار'} sx={{ bgcolor: x.is_approved ? '#10b98122' : '#f59e0b22', color: x.is_approved ? '#10b981' : '#f59e0b' }} />
              </Paper>
            ), 'صورت‌وضعیتی ثبت نشده')}

          {sectionList('پرداخت‌ها', '#10b981', <PaymentsIcon sx={{ fontSize: 16, color: '#fff' }} />, payments,
            x => (
              <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="textSecondary">{toJalali(x.date)}</Typography>
                <Typography variant="body2" fontWeight={700}>{formatPersianNumber(x.amount || 0)}</Typography>
                <Typography variant="caption">{x.reference || ''}</Typography>
                <Typography variant="caption" color="textSecondary">{x.method || ''}</Typography>
              </Paper>
            ), 'پرداختی ثبت نشده')}

          {sectionList('الحاقیه‌ها', '#ec4899', <EditNoteIcon sx={{ fontSize: 16, color: '#fff' }} />, addendums,
            x => (
              <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                <Typography variant="body2" fontWeight={700}>{x.number || '—'}</Typography>
                <Typography variant="caption" color="textSecondary">{x.change_description}</Typography>
                {x.amount_change ? <Typography variant="caption" sx={{ ml: 2 }}>تغییر مبلغ: {formatPersianNumber(x.amount_change)}</Typography> : null}
              </Paper>
            ), 'الحاقیه‌ای ثبت نشده')}
        </>
      )}
    </Box>
  );
};

export default ContractFinancePage;