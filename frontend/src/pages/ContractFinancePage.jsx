import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Grid, CircularProgress, Stack,
  Chip, LinearProgress, Divider, Button,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import ContractPicker from '../core/components/ui/ContractPicker';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '12px',
};

const ACTIONS = [
  { key: 'invoices', label: 'فاکتور', path: '/contracts-invoices', color: '#8b5cf6', icon: <ReceiptIcon sx={{ fontSize: 18 }} /> },
  { key: 'statements', label: 'صورت‌وضعیت', path: '/contracts-statements', color: '#6366f1', icon: <ReceiptLongIcon sx={{ fontSize: 18 }} /> },
  { key: 'payments', label: 'پرداخت', path: '/contracts-payments', color: '#10b981', icon: <PaymentsIcon sx={{ fontSize: 18 }} /> },
  { key: 'addendums', label: 'الحاقیه', path: '/contracts-addendums', color: '#ec4899', icon: <EditNoteIcon sx={{ fontSize: 18 }} /> },
  { key: 'guarantees', label: 'تضمین', path: '/contracts-guarantees', color: '#3b82f6', icon: <LockIcon sx={{ fontSize: 18 }} /> },
];

const ContractFinancePage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const { data: contracts } = useQuery({
    queryKey: ['ext-contracts-fin'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: contract, isLoading } = useQuery({
    queryKey: ['ext-contract-fin', selected?.id],
    queryFn: () => axiosInstance.get(`/external-contracts/${selected.id}/`).then(r => r.data),
    enabled: !!selected?.id,
  });

  const amount = contract?.amount || 0;
  const invoices = contract?.invoices || [];
  const statements = contract?.statements || [];
  const payments = contract?.payments || [];
  const addendums = contract?.addendums || [];
  const guarantees = contract?.guarantees || [];

  const totals = {
    invoices: invoices.reduce((s, x) => s + Number(x.total || 0), 0),
    statements: statements.reduce((s, x) => s + Number(x.amount || 0), 0),
    payments: payments.reduce((s, x) => s + Number(x.amount || 0), 0),
    addendums: addendums.reduce((s, x) => s + Number(x.amount_change || 0), 0),
  };
  const paidRatio = amount ? Math.min(100, (totals.payments / amount) * 100) : 0;
  const currencyLabel = contract?.currency_name || 'ریال';

  const kpi = (label, value, color, icon) => (
    <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
      <Avatar sx={{ width: 40, height: 40, mx: 'auto', mb: 1, background: `linear-gradient(135deg,${color},${color}99)` }}>{icon}</Avatar>
      <Typography variant="caption" color="textSecondary">{label}</Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color }}>{formatPersianNumber(value)}</Typography>
    </Paper>
  );

  const goTo = (path) => navigate(`${path}?contract=${selected.id}`);

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(59,130,246,0.12), rgba(16,185,129,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.18)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#3b82f6,#10b981)', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
          <AccountBalanceWalletIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#1d4ed8">نمای مالی قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">جستجو و انتخاب قرارداد، سپس ثبت فاکتور، صورت‌وضعیت، پرداخت، الحاقیه و تضمین</Typography>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ ...glassPaper, p: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
              قراردادها ({formatPersianNumber(contractList.length)})
            </Typography>
            <ContractPicker
              contracts={contractList}
              selectedId={selected?.id}
              onSelect={setSelected}
              height={560}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          {!selected ? (
            <Paper sx={{ ...glassPaper, p: 6, textAlign: 'center' }}>
              <HandshakeIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body1" color="textSecondary">یک قرارداد از لیست انتخاب کنید تا عملیات مالی آن نمایش داده شود.</Typography>
            </Paper>
          ) : isLoading ? (
            <Paper sx={{ ...glassPaper, p: 6, textAlign: 'center' }}><CircularProgress /></Paper>
          ) : (
            <>
              <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
                  <Avatar sx={{ width: 46, height: 46, background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                    <HandshakeIcon sx={{ color: '#fff', fontSize: 24 }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="body1" fontWeight={800}>{contract.subject}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      شماره: {contract.number || '—'} · {contract.party_name || '—'}
                    </Typography>
                  </Box>
                  <Chip label={`${formatPersianNumber(amount)} ${currencyLabel}`} color="warning" sx={{ fontWeight: 800 }} />
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>ثبت عملیات مالی</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {ACTIONS.map(a => (
                    <Button key={a.key} variant="outlined" startIcon={a.icon}
                      onClick={() => goTo(a.path)}
                      sx={{ color: a.color, borderColor: `${a.color}66`, borderRadius: '10px', textTransform: 'none' }}>
                      ثبت {a.label}
                    </Button>
                  ))}
                  <Button variant="contained" startIcon={<VisibilityIcon />}
                    onClick={() => navigate(`/external-contracts/${selected.id}`)}
                    sx={{ borderRadius: '10px', textTransform: 'none', background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                    مشاهده پرونده
                  </Button>
                </Stack>
              </Paper>

              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6} md={3}>{kpi('جمع فاکتورها', totals.invoices, '#8b5cf6', <ReceiptIcon sx={{ color: '#fff' }} />)}</Grid>
                <Grid item xs={6} md={3}>{kpi('جمع پرداخت‌ها', totals.payments, '#10b981', <PaymentsIcon sx={{ color: '#fff' }} />)}</Grid>
                <Grid item xs={6} md={3}>{kpi('جمع صورت‌وضعیت', totals.statements, '#6366f1', <ReceiptLongIcon sx={{ color: '#fff' }} />)}</Grid>
                <Grid item xs={6} md={3}>{kpi('تضمین‌ها', guarantees.length, '#3b82f6', <LockIcon sx={{ color: '#fff' }} />)}</Grid>
              </Grid>

              <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
                <Typography variant="caption" color="textSecondary">درصد پرداخت نسبت به مبلغ قرارداد</Typography>
                <LinearProgress variant="determinate" value={paidRatio} sx={{ height: 10, borderRadius: '10px', mt: 1 }} />
                <Typography variant="caption" fontWeight={700} sx={{ mt: 0.5, display: 'block' }}>{formatPersianNumber(paidRatio)}٪</Typography>
              </Paper>

              {[
                { title: 'فاکتورها', color: '#8b5cf6', icon: <ReceiptIcon sx={{ fontSize: 16, color: '#fff' }} />, rows: invoices, empty: 'فاکتوری ثبت نشده', render: x => `${x.number || '—'} · ${toJalali(x.date)} · ${formatPersianNumber(x.total || 0)}` },
                { title: 'صورت‌وضعیت‌ها', color: '#6366f1', icon: <ReceiptLongIcon sx={{ fontSize: 16, color: '#fff' }} />, rows: statements, empty: 'صورت‌وضعیتی ثبت نشده', render: x => `${x.number || '—'} · ${toJalali(x.date)} · ${formatPersianNumber(x.amount || 0)}` },
                { title: 'پرداخت‌ها', color: '#10b981', icon: <PaymentsIcon sx={{ fontSize: 16, color: '#fff' }} />, rows: payments, empty: 'پرداختی ثبت نشده', render: x => `${toJalali(x.date)} · ${formatPersianNumber(x.amount || 0)}` },
                { title: 'الحاقیه‌ها', color: '#ec4899', icon: <EditNoteIcon sx={{ fontSize: 16, color: '#fff' }} />, rows: addendums, empty: 'الحاقیه‌ای ثبت نشده', render: x => `${x.number || '—'} · ${x.change_description || ''}` },
              ].map(s => (
                <Paper key={s.title} sx={{ ...glassPaper, p: 2, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Avatar sx={{ width: 26, height: 26, background: `linear-gradient(135deg,${s.color},${s.color}99)` }}>{s.icon}</Avatar>
                    <Typography variant="subtitle2" fontWeight={800}>{s.title}</Typography>
                    <Chip size="small" label={formatPersianNumber(s.rows.length)} sx={{ bgcolor: `${s.color}22`, color: s.color }} />
                  </Box>
                  {s.rows.length === 0 ? (
                    <Typography variant="caption" color="textSecondary">{s.empty}</Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {s.rows.map(r => <Typography key={r.id} variant="body2" color="textSecondary">{s.render(r)}</Typography>)}
                    </Stack>
                  )}
                </Paper>
              ))}
            </>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContractFinancePage;
