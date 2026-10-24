import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Grid, Paper,
  Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DownloadIcon from '@mui/icons-material/Download';
import EditNoteIcon from '@mui/icons-material/EditNote';
import HandshakeIcon from '@mui/icons-material/Handshake';
import LockIcon from '@mui/icons-material/Lock';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axiosInstance from '../core/api/axiosConfig';
import fetchAllPages from '../core/api/fetchAllPages';
import downloadFile from '../core/utils/downloadUtils';
import { formatPersianNumber, toPersianDigits, normalizeCurrencyLabel } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import {
  SectionCard, KpiCard, DetailTile, ProgressBar, MoneyBar, EmptyState,
  INK, MUTED, CARD_BG, CARD_BORDER, SOFT_BG,
} from './contracts/ContractProfileUI';
import {
  StatementsTable, AdvanceTable, InvoicesTable, PaymentsTable, AddendumsTable,
  GuaranteesTable, statementMetrics, toNum,
} from './contracts/ContractFinanceTables';

const ContractFinancePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState(null);

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts-finance-list'],
    queryFn: () => fetchAllPages('/external-contracts/'),
  });
  const contractList = Array.isArray(contracts) ? contracts : [];

  useEffect(() => {
    if (!contractList.length) return;
    const requestedId = searchParams.get('contract');
    const requested = requestedId ? contractList.find((item) => String(item.id) === String(requestedId)) : null;
    if (requested) {
      if (String(selected?.id) !== String(requested.id)) setSelected(requested);
      return;
    }
    if (!selected) setSelected(contractList[0]);
  }, [contractList, searchParams, selected]);

  const selectContract = (contract) => {
    setSelected(contract || null);
    setTab(0);
    setMsg(null);
    setSearchParams(contract ? { contract: String(contract.id) } : {});
  };

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract-finance-detail', selected?.id],
    queryFn: () => axiosInstance.get(`/external-contracts/${selected.id}/`).then((response) => response.data),
    enabled: Boolean(selected?.id),
  });

  const invoices = contract?.invoices || [];
  const statements = contract?.statements || [];
  const payments = contract?.payments || [];
  const addendums = contract?.addendums || [];
  const guarantees = contract?.guarantees || [];

  const sortedStatements = useMemo(
    () => [...statements].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    [statements],
  );
  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    [invoices],
  );
  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    [payments],
  );
  const sortedAddendums = useMemo(
    () => [...addendums].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    [addendums],
  );

  const amount = toNum(contract?.effective_amount ?? contract?.amount);
  const baseAmount = toNum(contract?.amount);
  const addendumAmount = amount - baseAmount;
  const currencyLabel = normalizeCurrencyLabel(contract?.currency_name || contract?.currency_symbol);
  const statementRate = [...sortedStatements]
    .reverse()
    .map((row) => toNum(row.exchange_rate))
    .find((rate) => rate > 1) || 0;
  const contractRate = toNum(contract?.exchange_rate) > 1
    ? toNum(contract.exchange_rate)
    : (statementRate || 1);
  const displayRate = contractRate > 1 ? contractRate : 1;
  const amountRial = amount * displayRate;

  const statementRows = useMemo(
    () => sortedStatements.map((row) => ({ row, metrics: statementMetrics(row, contract?.exchange_rate) })),
    [sortedStatements, contract?.exchange_rate],
  );

  const totals = useMemo(() => {
    const base = {
      gross: 0, foreign: 0, vat: 0, deductions: 0, net: 0,
      retention: 0, insurance: 0, prepayment: 0, materials: 0, statementAdvance: 0, otherAdvance: 0, other: 0,
    };
    statementRows.forEach(({ metrics }) => {
      base.gross += metrics.gross;
      base.foreign += metrics.foreignGross || 0;
      base.vat += metrics.vat;
      base.deductions += metrics.deductionsTotal;
      base.net += metrics.net;
      Object.keys(metrics.buckets).forEach((key) => { base[key] += metrics.buckets[key]; });
    });
    base.invoices = sortedInvoices.reduce((sum, row) => sum + toNum(row.total), 0);
    base.payments = sortedPayments.reduce((sum, row) => sum + toNum(row.amount), 0);
    return base;
  }, [statementRows, sortedInvoices, sortedPayments]);

  const advanceRows = (contract?.advance_payments || []).map((row, index) => ({
    id: `advance-${index}`,
    step: row.step,
    amount: toNum(row.amount),
    due_date: row.due_date,
    note: row.note,
  }));
  const stagedAdvance = advanceRows.reduce((sum, row) => sum + row.amount, 0);
  const advanceTotal = Math.max(toNum(contract?.advance_payment), stagedAdvance);
  const advanceRowsFinal = advanceRows.length
    ? advanceRows
    : [{ id: 'advance-base', step: 'پیش‌پرداخت قرارداد', amount: advanceTotal, note: '' }];
  const totalsDisplay = {
    ...totals,
    gross: totals.foreign || totals.gross / displayRate,
    net: totals.net / displayRate,
    deductions: totals.deductions / displayRate,
    payments: totals.payments / displayRate,
    prepayment: totals.prepayment / displayRate,
    retention: totals.retention / displayRate,
    insurance: totals.insurance / displayRate,
    statementAdvance: totals.statementAdvance / displayRate,
    otherAdvance: totals.otherAdvance / displayRate,
    materials: totals.materials / displayRate,
    other: totals.other / displayRate,
  };
  const advanceAmortized = Math.min(totalsDisplay.prepayment, advanceTotal);
  const advanceRemaining = Math.max(advanceTotal - advanceAmortized, 0);

  const paidRatio = amountRial > 0 ? Math.min(100, (totals.payments / amountRial) * 100) : 0;
  const workRatio = amountRial > 0 ? Math.min(100, (totals.gross / amountRial) * 100) : 0;
  const netRatio = amountRial > 0 ? Math.min(100, (totals.net / amountRial) * 100) : 0;
  const remainingContract = Math.max(amount - totalsDisplay.gross, 0);

  const exportExcel = async () => {
    if (!selected?.id || exporting) return;
    setExporting(true);
    setMsg(null);
    try {
      await downloadFile('/external-contracts/export-excel/', {
        params: { contract: selected.id },
        fallbackName: `contract-${selected.number || selected.id}-finance.xlsx`,
      });
      setMsg({ ok: true, text: 'فایل اکسل این قرارداد آماده شد.' });
    } catch (error) {
      setMsg({ ok: false, text: `خطا در تهیهٔ فایل اکسل: ${error?.message || 'نامشخص'}` });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        icon={<AccountBalanceWalletIcon />}
        title="نمای مالی قرارداد"
        badge={selected ? (
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            <Chip size="small" variant="outlined" label={`قرارداد ${toPersianDigits(selected.number || '—')}`} />
            {selected.status_display || selected.status ? (
              <Chip size="small" label={selected.status_display || selected.status} sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700 }} />
            ) : null}
          </Stack>
        ) : null}
        actions={(
          <>
            <Button variant="outlined" disabled={!selected || exporting}
              startIcon={exporting ? <CircularProgress size={15} /> : <DownloadIcon />} onClick={exportExcel}>
              {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
            </Button>
            <Button variant="outlined" disabled={!selected} startIcon={<PrintIcon />} onClick={() => window.print()}>چاپ</Button>
            <Button variant="contained" disabled={!selected} startIcon={<VisibilityIcon />}
              onClick={() => navigate(`/external-contracts/${selected.id}`)}>پرونده قرارداد</Button>
          </>
        )}
      />

      {msg ? (
        <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>
      ) : null}

      {/* انتخاب قرارداد */}
      <Paper elevation={0} sx={{
        p: 1.75, mb: 2, bgcolor: CARD_BG, border: `1px solid ${CARD_BORDER}`,
        borderRadius: '16px', boxShadow: 'none',
      }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} md={8}>
            <Autocomplete
              size="small"
              fullWidth
              options={contractList}
              value={selected}
              onChange={(_, value) => selectContract(value)}
              loading={contractsLoading}
              isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
              getOptionLabel={(option) => `${option.number || ''} — ${option.subject || ''}`}
              filterOptions={(options, state) => {
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return options;
                return options.filter((option) => [option.number, option.subject, option.party_name]
                  .some((value) => String(value || '').toLowerCase().includes(q)));
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{option.subject || '—'}</Typography>
                    <Typography sx={{ fontSize: 12, color: MUTED }}>{toPersianDigits(option.number || '—')} · {option.party_name || '—'}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#b45309' }}>
                    {formatPersianNumber(option.effective_amount ?? option.amount ?? 0)} {normalizeCurrencyLabel(option.currency_name || option.currency_symbol)}
                  </Typography>
                </Box>
              )}
              renderInput={(params) => (
                <TextField {...params} label="انتخاب قرارداد" placeholder="جستجو بر اساس شماره، موضوع یا طرف قرارداد…" />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} useFlexGap alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Chip size="small" icon={<HandshakeIcon />} label={`${toPersianDigits(contractList.length)} قرارداد`}
                sx={{ bgcolor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }} />
              {selected ? (
                <Chip size="small" icon={<CalendarMonthIcon />} label={toJalali(selected.effective_end_date || selected.end_date)}
                  sx={{ bgcolor: '#eff6ff', color: '#1d4ed8' }} />
              ) : null}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {!selected ? (
        <Paper elevation={0} sx={{ p: 6, bgcolor: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: '18px', boxShadow: 'none' }}>
          <EmptyState icon={AccountBalanceWalletIcon} text="یک قرارداد را برای مشاهدهٔ نمای مالی انتخاب کنید." />
        </Paper>
      ) : isLoading ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: '18px', boxShadow: 'none' }}>
          <CircularProgress size={28} />
        </Paper>
      ) : contract ? (
        <>
          {/* مشخصات مالی قرارداد */}
          <Paper elevation={0} sx={{
            p: 2, mb: 2, bgcolor: CARD_BG, border: `1px solid ${CARD_BORDER}`,
            borderRadius: '18px', boxShadow: 'none',
          }}>
            <Grid container spacing={2}>
              <Grid item xs={12} lg={6}>
                <Stack direction="row" alignItems="flex-start" spacing={1.25} useFlexGap>
                  <Box sx={{
                    width: 48, height: 48, flexShrink: 0, borderRadius: '14px',
                    bgcolor: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BusinessIcon sx={{ fontSize: 23 }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK, lineHeight: 1.5 }}>{contract.subject || '—'}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.2 }}>
                      {contract.party_name || '—'} · قرارداد {toPersianDigits(contract.number || '—')}
                    </Typography>
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.8 }}>
                      <Chip size="small" label={contract.contract_type_master_name || contract.contract_type_display || '—'} variant="outlined" sx={{ height: 21, fontSize: 12 }} />
                      <Chip size="small" label={contract.status_display || contract.status || '—'} sx={{ height: 21, fontSize: 12, bgcolor: '#f1f5f9', color: '#475569' }} />
                      <Chip size="small" label={`${toJalali(contract.start_date)} تا ${toJalali(contract.effective_end_date || contract.end_date)}`} variant="outlined" sx={{ height: 21, fontSize: 12 }} />
                    </Stack>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} lg={6}>
                <Grid container spacing={1}>
                  <Grid item xs={6} sm={3}><DetailTile label="مبلغ پایه" value={`${formatPersianNumber(baseAmount)} ${currencyLabel}`} ltr /></Grid>
                  <Grid item xs={6} sm={3}><DetailTile label="مبلغ با الحاقیه" value={`${formatPersianNumber(amount)} ${currencyLabel}`} ltr /></Grid>
                  <Grid item xs={6} sm={3}><DetailTile label="تغییر الحاقیه" value={`${formatPersianNumber(addendumAmount)} ${currencyLabel}`} ltr /></Grid>
                  <Grid item xs={6} sm={3}><DetailTile label="پیش‌پرداخت" value={`${formatPersianNumber(advanceTotal)} ${currencyLabel}`} ltr /></Grid>
                </Grid>
              </Grid>
            </Grid>
          </Paper>

          {/* شاخص‌های مالی */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} md={4} lg={2}>
              <KpiCard icon={AccountBalanceIcon} label="مبلغ قرارداد" value={formatPersianNumber(amount)} suffix={currencyLabel} color="#f59e0b" size={15} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiCard icon={ReceiptLongIcon} label="کارکرد صورت‌وضعیت" value={formatPersianNumber(totalsDisplay.gross)} suffix={currencyLabel} color="#3b82f6" progress={workRatio} progressLabel={`${toPersianDigits(Math.round(workRatio))}٪ پیشرفت`} size={15} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiCard icon={ReceiptIcon} label="خالص صورت‌وضعیت" value={formatPersianNumber(totalsDisplay.net)} suffix={currencyLabel} color="#6366f1" progress={netRatio} progressLabel="خالص تجمعی" size={15} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiCard icon={LockIcon} label="جمع کسورات" value={formatPersianNumber(totalsDisplay.deductions)} suffix={currencyLabel} color="#be123c" hint={`${toPersianDigits(sortedStatements.length)} دوره`} size={15} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiCard icon={PaymentsIcon} label="پرداخت‌شده" value={formatPersianNumber(totalsDisplay.payments)} suffix={currencyLabel} color="#0891b2" progress={paidRatio} progressLabel={`${toPersianDigits(Math.round(paidRatio))}٪ از قرارداد`} size={15} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiCard icon={CalendarMonthIcon} label="مانده قرارداد" value={formatPersianNumber(remainingContract)} suffix={currencyLabel} color="#64748b" progress={100 - workRatio} progressLabel="کار باقی‌مانده" size={15} />
            </Grid>
          </Grid>

          {/* جدول اصلی صورت‌وضعیت‌ها */}
          <SectionCard title="جدول مالی صورت‌وضعیت‌ها" icon={ReceiptLongIcon} color="#3b82f6" sx={{ mb: 2 }}
            action={<Chip size="small" label={`${toPersianDigits(sortedStatements.length)} صورت‌وضعیت`}
              sx={{ height: 22, fontSize: 12, bgcolor: '#eff6ff', color: '#1d4ed8' }} />}>
            <StatementsTable statements={sortedStatements} currencyLabel={currencyLabel} fallbackRate={contract.exchange_rate} />
          </SectionCard>

          {/* پیش‌پرداخت و نسبت‌های مالی */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} lg={4}>
              <SectionCard title="پیش‌پرداخت" icon={AccountBalanceWalletIcon} color="#f59e0b">
                <AdvanceTable rows={advanceRowsFinal} total={advanceTotal} amortized={advanceAmortized}
                  remaining={advanceRemaining} currency={currencyLabel} />
              </SectionCard>
            </Grid>

            <Grid item xs={12} lg={8}>
              <SectionCard title="نسبت‌های مالی" icon={AccountBalanceIcon} color="#0ea5e9"
                action={<Chip size="small" label={`مانده: ${formatPersianNumber(remainingContract)} ${currencyLabel}`}
                  sx={{ height: 22, fontSize: 12, bgcolor: '#f1f5f9', color: '#475569' }} />}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Stack spacing={1.4}>
                      <MoneyBar label="پیشرفت کارکرد" value={totalsDisplay.gross} total={amount || 1} color="#3b82f6" suffix={currencyLabel} />
                      <MoneyBar label="خالص صورت‌وضعیت" value={totalsDisplay.net} total={amount || 1} color="#6366f1" suffix={currencyLabel} />
                      <MoneyBar label="پرداخت‌شده" value={totalsDisplay.payments} total={amount || 1} color="#0891b2" suffix={currencyLabel} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 1.5, height: '100%', borderRadius: '13px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK, mb: 1 }}>ترکیب کسورات</Typography>
                      <Stack spacing={0.85}>
                        {[
                          ['حسن انجام کار', totalsDisplay.retention, '#f59e0b'],
                          ['بیمه', totalsDisplay.insurance, '#3b82f6'],
                          ['پیش‌پرداخت', totalsDisplay.prepayment, '#8b5cf6'],
                          ['علی‌الحساب‌ها', totalsDisplay.statementAdvance + totalsDisplay.otherAdvance + totalsDisplay.materials, '#ec4899'],
                          ['سایر', totalsDisplay.other, '#64748b'],
                        ].map(([label, value, color]) => (
                          <Stack key={label} direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap>
                            <Stack direction="row" alignItems="center" spacing={0.5} useFlexGap>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
                              <Typography sx={{ fontSize: 12, color: MUTED }}>{label}</Typography>
                            </Stack>
                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{formatPersianNumber(value)}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                      <Typography sx={{ mt: 1, pt: 0.8, borderTop: '1px solid #e8edf4', fontSize: 12, color: MUTED }}>
                        مانده پیش‌پرداخت: <Box component="span" sx={{ color: '#1d4ed8', fontWeight: 800 }}>{formatPersianNumber(advanceRemaining)} {currencyLabel}</Box>
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </SectionCard>
            </Grid>
          </Grid>

          {/* سایر اسناد مالی */}
          <SectionCard title="سایر اسناد مالی قرارداد" icon={ReceiptIcon} color="#6366f1"
            action={<Chip size="small" label={`${toPersianDigits(invoices.length + payments.length + addendums.length + guarantees.length)} سند`}
              sx={{ height: 22, fontSize: 12, bgcolor: '#eef2ff', color: '#4338ca' }} />}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile
              sx={{
                minHeight: 36, borderBottom: '1px solid #eef2f7', mb: 1.5,
                '& .MuiTab-root': { minHeight: 36, minWidth: 110, fontSize: 12, fontWeight: 700, textTransform: 'none' },
                '& .Mui-selected': { color: '#4338ca' },
                '& .MuiTabs-indicator': { bgcolor: '#6366f1', height: 2.5 },
              }}>
              <Tab label={`فاکتورها (${toPersianDigits(invoices.length)})`} />
              <Tab label={`پرداخت‌ها (${toPersianDigits(payments.length)})`} />
              <Tab label={`الحاقیه‌ها (${toPersianDigits(addendums.length)})`} />
              <Tab label={`تضامین (${toPersianDigits(guarantees.length)})`} />
            </Tabs>

            {tab === 0 ? <InvoicesTable invoices={sortedInvoices} currency={currencyLabel} /> : null}
            {tab === 1 ? <PaymentsTable payments={sortedPayments} currency={currencyLabel} /> : null}
            {tab === 2 ? <AddendumsTable addendums={sortedAddendums} currency={currencyLabel} /> : null}
            {tab === 3 ? <GuaranteesTable guarantees={guarantees} currency={currencyLabel} /> : null}
          </SectionCard>
        </>
      ) : null}
    </Box>
  );
};

export default ContractFinancePage;

