import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, CircularProgress, Stack,
  Autocomplete, TextField, Grid, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const COLOR = '#8b5cf6';
const COLOR_DARK = '#7c3aed';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(139,92,246,0.12)',
  borderRadius: '16px',
};

const StatCard = ({ label, value, color }) => (
  <Paper sx={{ ...glass, p: 2, textAlign: 'center' }}>
    <Typography variant="caption" color="textSecondary">{label}</Typography>
    <Typography variant="h6" fontWeight={900} sx={{ color: color || COLOR_DARK }}>{formatPersianNumber(value)}</Typography>
  </Paper>
);

const GeneralLedger = () => {
  const { data, isLoading } = useQuery({ queryKey: ['acc-report-gl'], queryFn: () => axiosInstance.get('/accounting/reports/general-ledger/').then(r => r.data) });
  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  const rows = data?.rows || [];
  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}><StatCard label="جمع بدهکار" value={data?.total_debit || 0} color="#2563eb" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="جمع بستانکار" value={data?.total_credit || 0} color="#059669" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="تعداد سطر" value={rows.length} /></Grid>
      </Grid>
      <Paper sx={{ ...glass, p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>تاریخ</TableCell><TableCell>شماره سند</TableCell><TableCell>حساب</TableCell><TableCell>شرح</TableCell><TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>گردشی ثبت نشده است</TableCell></TableRow> :
                rows.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{toJalali(r.date)}</TableCell>
                    <TableCell>{r.document_number}</TableCell>
                    <TableCell>{r.account_code} - {r.account_name}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>{formatPersianNumber(r.debit)}</TableCell>
                    <TableCell>{formatPersianNumber(r.credit)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

const AccountLedger = () => {
  const [account, setAccount] = useState(null);
  const { data: accounts } = useQuery({ queryKey: ['acc-report-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/').then(r => r.data) });
  const accountList = Array.isArray(accounts) ? accounts : accounts?.results || [];
  const { data, isLoading } = useQuery({
    queryKey: ['acc-report-al', account?.id],
    queryFn: () => axiosInstance.get(`/accounting/reports/account-ledger/${account.id}/`).then(r => r.data),
    enabled: !!account,
  });

  return (
    <Box>
      <Autocomplete
        size="small" sx={{ mb: 2, maxWidth: 360 }}
        options={accountList}
        getOptionLabel={o => `${o.code} - ${o.name}`}
        value={account}
        onChange={(e, v) => setAccount(v)}
        renderInput={p => <TextField {...p} label="انتخاب حساب" />}
      />
      {!account ? <Typography color="textSecondary">حسابی انتخاب کنید</Typography> : isLoading ? <CircularProgress /> : (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}><StatCard label="جمع بدهکار" value={data?.total_debit || 0} color="#2563eb" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="جمع بستانکار" value={data?.total_credit || 0} color="#059669" /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="مانده" value={data?.balance || 0} color="#7c3aed" /></Grid>
          </Grid>
          <Paper sx={{ ...glass, p: 2 }}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>تاریخ</TableCell><TableCell>شماره</TableCell><TableCell>شرح</TableCell><TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>مانده</TableCell></TableRow></TableHead>
                <TableBody>
                  {(data?.rows || []).map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{toJalali(r.date)}</TableCell>
                      <TableCell>{r.document_number}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>{formatPersianNumber(r.debit)}</TableCell>
                      <TableCell>{formatPersianNumber(r.credit)}</TableCell>
                      <TableCell>{formatPersianNumber(r.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

const TrialBalance = () => {
  const { data, isLoading } = useQuery({ queryKey: ['acc-report-tb'], queryFn: () => axiosInstance.get('/accounting/reports/trial-balance/').then(r => r.data) });
  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  const rows = data?.rows || [];
  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}><StatCard label="جمع بدهکار" value={data?.total_debit || 0} color="#2563eb" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="جمع بستانکار" value={data?.total_credit || 0} color="#059669" /></Grid>
      </Grid>
      <Paper sx={{ ...glass, p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>کد</TableCell><TableCell>حساب</TableCell><TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>مانده</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell>{r.account_code}</TableCell>
                  <TableCell>{r.account_name}</TableCell>
                  <TableCell>{formatPersianNumber(r.debit)}</TableCell>
                  <TableCell>{formatPersianNumber(r.credit)}</TableCell>
                  <TableCell>{formatPersianNumber(r.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

const IncomeStatement = () => {
  const { data, isLoading } = useQuery({ queryKey: ['acc-report-is'], queryFn: () => axiosInstance.get('/accounting/reports/income-statement/').then(r => r.data) });
  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}><StatCard label="درآمد" value={data?.revenue || 0} color="#059669" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="بهای تمام‌شده" value={data?.cost_of_sales || 0} color="#f59e0b" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="سود ناخالص" value={data?.gross_profit || 0} color="#0ea5e9" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="هزینه‌ها" value={data?.expenses || 0} color="#ef4444" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="سود/زیان خالص" value={data?.net_profit || 0} color={data?.net_profit >= 0 ? '#059669' : '#ef4444'} /></Grid>
      </Grid>
    </Box>
  );
};

const BalanceSheet = () => {
  const { data, isLoading } = useQuery({ queryKey: ['acc-report-bs'], queryFn: () => axiosInstance.get('/accounting/reports/balance-sheet/').then(r => r.data) });
  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  const Section = ({ title, rows, total, color }) => (
    <Paper sx={{ ...glass, p: 2, mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: color || COLOR_DARK, mb: 1 }}>{title}</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow><TableCell>کد</TableCell><TableCell>حساب</TableCell><TableCell>مانده</TableCell></TableRow></TableHead>
          <TableBody>
            {(rows || []).map((r, i) => (
              <TableRow key={i} hover>
                <TableCell>{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(r.balance)}</TableCell>
              </TableRow>
            ))}
            <TableRow><TableCell colSpan={2} sx={{ fontWeight: 800 }}>جمع</TableCell><TableCell sx={{ fontWeight: 900, color: color || COLOR_DARK }}>{formatPersianNumber(total)}</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}><StatCard label="جمع دارایی‌ها" value={data?.total_assets || 0} color="#2563eb" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="جمع بدهی‌ها" value={data?.total_liabilities || 0} color="#ef4444" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="حقوق مالکانه" value={data?.total_equity || 0} color="#059669" /></Grid>
      </Grid>
      <Section title="دارایی‌ها" rows={data?.assets} total={data?.total_assets} color="#2563eb" />
      <Section title="بدهی‌ها" rows={data?.liabilities} total={data?.total_liabilities} color="#ef4444" />
      <Section title="حقوق مالکانه" rows={data?.equity} total={data?.total_equity} color="#059669" />
      <Paper sx={{ ...glass, p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2" fontWeight={700}>بدهی + حقوق مالکانه</Typography>
        <Typography variant="body2" fontWeight={900} color={COLOR_DARK}>{formatPersianNumber(data?.total_liabilities_equity || 0)}</Typography>
      </Paper>
    </Box>
  );
};

const CashFlow = () => {
  const { data, isLoading } = useQuery({ queryKey: ['acc-report-cf'], queryFn: () => axiosInstance.get('/accounting/reports/cash-flow/').then(r => r.data) });
  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  const op = data?.operating || {};
  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}><StatCard label="جریان عملیاتی" value={op.net || 0} color="#059669" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="سرمایه‌گذاری" value={data?.investing || 0} color="#f59e0b" /></Grid>
        <Grid item xs={12} sm={4}><StatCard label="تأمین مالی" value={data?.financing || 0} color="#2563eb" /></Grid>
      </Grid>

      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} mb={1}>فعالیت‌های عملیاتی</Typography>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2">ورودی</Typography><Typography variant="body2" fontWeight={700} color="green">{formatPersianNumber(op.inflows || 0)}</Typography></Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2">خروجی</Typography><Typography variant="body2" fontWeight={700} color="red">{formatPersianNumber(op.outflows || 0)}</Typography></Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" fontWeight={800}>خالص عملیاتی</Typography><Typography variant="body2" fontWeight={900} color={COLOR_DARK}>{formatPersianNumber(op.net || 0)}</Typography></Box>
        </Stack>
      </Paper>

      <Paper sx={{ ...glass, p: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} mb={1}>خالص تغییر وجه نقد</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">جمع کل</Typography>
          <Typography variant="h6" fontWeight={900} color={COLOR_DARK}>{formatPersianNumber(data?.net_change || 0)}</Typography>
        </Box>
      </Paper>
    </Box>
  );
};

const AccountingReportsPage = () => {
  const [tab, setTab] = useState(0);
  const tabs = ['دفتر کل', 'دفتر معین', 'تراز آزمایشی', 'سود و زیان', 'ترازنامه', 'جریان نقدی'];
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <AssessmentIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>گزارش‌های مالی</Typography>
          <Typography variant="body2" color="textSecondary">دفتر کل، دفتر معین، تراز آزمایشی و سود و زیان</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(225,225,225,0.5)', px: 2 }}>
          {tabs.map((t, i) => <Tab key={t} label={t} sx={{ fontWeight: 600, color: tab === i ? COLOR_DARK : undefined }} />)}
        </Tabs>
      </Paper>

      {tab === 0 && <GeneralLedger />}
      {tab === 1 && <AccountLedger />}
      {tab === 2 && <TrialBalance />}
      {tab === 3 && <IncomeStatement />}
      {tab === 4 && <BalanceSheet />}
      {tab === 5 && <CashFlow />}
    </Box>
  );
};

export default AccountingReportsPage;