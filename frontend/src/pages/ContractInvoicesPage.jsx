import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, Grid, IconButton, InputAdornment,
  InputLabel, MenuItem, Paper, Select, Snackbar, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TableRowsIcon from '@mui/icons-material/TableRows';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../core/utils/numberUtils';
import { getJalaliParts } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { ColumnChart } from '../core/components/charts/Charts';
import { KpiTile, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import {
  INVOICE_ACCENT, InvoiceCard, InvoiceContractCard, InvoiceDetailDrawer,
  InvoiceEditorDialog, InvoiceFinancialCard, InvoiceLanding, InvoiceStatusNav,
  InvoiceTable, invoiceCurrency, invoiceMetrics, invoiceStatus,
} from './contracts/InvoiceWorkspaceUI';

const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const GREEN = '#0f766e';
const AMBER = '#b45309';
const RED = '#be123c';
const BLUE = '#2563eb';
const n = (value) => Number(value) || 0;
const compactMoney = (value, currency = '') => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000000000) return `${formatPersianNumber((amount / 1000000000).toFixed(1))} میلیارد ${currency}`.trim();
  if (Math.abs(amount) >= 1000000) return `${formatPersianNumber((amount / 1000000).toFixed(1))} میلیون ${currency}`.trim();
  return `${formatPersianNumber(amount)} ${currency}`.trim();
};
const EMPTY = {
  id: null, contract: '', number: '', subject: '', date: '', due_date: '',
  currency: '', amount: 0, vat: 0, is_paid: false, description: '',
};

const ContractInvoicesPage = () => {
  const qc = useQueryClient();
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('cards');
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['ext-contracts-inv'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: currencies } = useQuery({
    queryKey: ['currencies-inv'],
    queryFn: () => axiosInstance.get('/currencies/', { params: { page_size: 100 } }).then((response) => response.data),
  });
  const currencyList = Array.isArray(currencies) ? currencies : currencies?.results || [];

  const { data: invoicesData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contract-invoices'],
    queryFn: () => axiosInstance.get('/contract-invoices/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const allInvoices = Array.isArray(invoicesData) ? invoicesData : invoicesData?.results || [];

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['contract-invoice-payments', contractId],
    queryFn: () => axiosInstance.get('/contract-payments/', { params: { contract: contractId, page_size: 500 } }).then((response) => response.data),
    enabled: Boolean(contractId),
  });
  const payments = Array.isArray(paymentsData) ? paymentsData : paymentsData?.results || [];

  const selectedContract = contractList.find((contract) => String(contract.id) === String(contractId)) || null;
  const scopedList = useMemo(
    () => (contractId ? allInvoices.filter((row) => String(row.contract) === String(contractId)) : []),
    [allInvoices, contractId],
  );
  const paidByInvoice = useMemo(() => payments.reduce((map, payment) => {
    if (!payment.invoice) return map;
    const key = String(payment.invoice);
    map[key] = (map[key] || 0) + n(payment.amount);
    return map;
  }, {}), [payments]);

  const currencyLabel = normalizeCurrencyLabel(
    selectedContract?.currency_name || selectedContract?.currency_symbol
    || scopedList[0]?.currency_name || scopedList[0]?.currency_symbol || 'ریال',
  );
  const landingCurrency = normalizeCurrencyLabel(
    contractList[0]?.currency_name || contractList[0]?.currency_symbol || 'ریال',
  );

  const counts = useMemo(() => {
    const next = { all: scopedList.length, paid: 0, pending: 0, overdue: 0 };
    scopedList.forEach((row) => {
      const key = invoiceStatus(row, paidByInvoice[String(row.id)]).key;
      next[key] = (next[key] || 0) + 1;
    });
    return next;
  }, [scopedList, paidByInvoice]);

  const totals = useMemo(() => {
    const metrics = scopedList.map((row) => invoiceMetrics(row, paidByInvoice[String(row.id)]));
    return {
      total: metrics.reduce((sum, item) => sum + item.total, 0),
      paid: metrics.reduce((sum, item) => sum + item.paid, 0),
      outstanding: metrics.reduce((sum, item) => sum + item.outstanding, 0),
      vat: metrics.reduce((sum, item) => sum + item.vat, 0),
      paidCount: counts.paid,
      pendingCount: counts.pending,
      overdueCount: counts.overdue,
    };
  }, [scopedList, paidByInvoice, counts]);

  const dueRows = useMemo(
    () => [...allInvoices]
      .filter((row) => !row.is_paid)
      .sort((a, b) => String(a.due_date || a.date || '9999').localeCompare(String(b.due_date || b.date || '9999')))
      .slice(0, 6),
    [allInvoices],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = scopedList.filter((row) => {
      if (statusFilter !== 'all' && invoiceStatus(row, paidByInvoice[String(row.id)]).key !== statusFilter) return false;
      if (!query) return true;
      return [row.number, row.subject, row.description, row.contract_subject]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'amount') return invoiceMetrics(b, paidByInvoice[String(b.id)]).total - invoiceMetrics(a, paidByInvoice[String(a.id)]).total;
      if (sortBy === 'due') return String(a.due_date || '9999').localeCompare(String(b.due_date || '9999'));
      if (sortBy === 'paid') return Number(b.is_paid) - Number(a.is_paid);
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
    return result;
  }, [scopedList, search, statusFilter, sortBy, paidByInvoice]);

  const monthlyData = useMemo(() => {
    const buckets = new Map();
    scopedList.forEach((row) => {
      if (!row.date) return;
      const parts = getJalaliParts(row.date);
      if (!parts) return;
      const key = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) || 0) + invoiceMetrics(row, paidByInvoice[String(row.id)]).total);
    });
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const month = Number(key.split('-')[1]);
        return { label: MONTH_NAMES[month - 1] || key, value };
      });
  }, [scopedList, paidByInvoice]);

  const totalAmountAll = useMemo(
    () => allInvoices.reduce((sum, row) => sum + invoiceMetrics(row, 0).total, 0),
    [allInvoices],
  );

  useEffect(() => { setContractId(urlContract); }, [urlContract]);
  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setSortBy('newest');
    setView('cards');
    setDetail(null);
  }, [contractId]);

  const selectContract = (contract) => {
    const next = String(contract.id);
    setContractId(next);
    setSearchParams({ contract: next });
  };
  const clearContract = () => {
    setContractId('');
    setSearchParams({});
  };
  const selectContractById = (id) => {
    const target = contractList.find((contract) => String(contract.id) === String(id));
    if (target) selectContract(target);
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['contract-invoices'] });
    qc.invalidateQueries({ queryKey: ['contract-invoice-payments', contractId] });
    qc.invalidateQueries({ queryKey: ['external-contracts'] });
  };

  const sanitize = (payload) => {
    const amount = Math.max(0, n(payload.amount));
    const vat = Math.max(0, n(payload.vat));
    return {
      contract: Number(payload.contract) || null,
      number: payload.number || '',
      subject: payload.subject || '',
      date: payload.date || null,
      due_date: payload.due_date || null,
      currency: payload.currency || null,
      amount,
      vat,
      total: amount + vat,
      is_paid: Boolean(payload.is_paid),
      description: payload.description || '',
    };
  };

  const save = useMutation({
    mutationFn: async (payload) => {
      const clean = sanitize(payload);
      return payload.id
        ? axiosInstance.patch(`/contract-invoices/${payload.id}/`, clean)
        : axiosInstance.post('/contract-invoices/', clean);
    },
    onSuccess: () => {
      invalidateAll();
      setDialog(false);
      setForm(EMPTY);
      setError('');
      setToast(form.id ? 'فاکتور ویرایش شد' : 'فاکتور ثبت شد');
    },
    onError: (event) => {
      const data = event.response?.data;
      let message = 'ذخیره فاکتور انجام نشد.';
      if (typeof data === 'string') message = data;
      else if (Array.isArray(data)) message = data[0];
      else if (data?.detail) message = data.detail;
      else if (data?.non_field_errors) message = data.non_field_errors[0];
      else if (data && typeof data === 'object') {
        const first = Object.values(data).flat()[0];
        if (first) message = first;
      }
      setError(message);
    },
  });

  const togglePaid = useMutation({
    mutationFn: (row) => axiosInstance.patch(`/contract-invoices/${row.id}/`, { is_paid: !row.is_paid }),
    onSuccess: (_data, row) => {
      invalidateAll();
      setDetail(null);
      setToast(row.is_paid ? 'وضعیت پرداخت فاکتور لغو شد' : 'فاکتور پرداخت‌شده ثبت شد');
    },
    onError: () => setToast('تغییر وضعیت پرداخت انجام نشد'),
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-invoices/${id}/`),
    onSuccess: () => {
      invalidateAll();
      setConfirmDelete(null);
      setDetail(null);
      setToast('فاکتور حذف شد');
    },
    onError: () => setToast('حذف فاکتور انجام نشد'),
  });

  const openNew = () => {
    setForm({
      ...EMPTY,
      contract: contractId,
      date: new Date().toISOString().slice(0, 10),
      currency: selectedContract?.currency || '',
    });
    setError('');
    setDetail(null);
    setDialog(true);
  };
  const openEdit = (row) => {
    setForm({
      ...EMPTY,
      ...row,
      contract: String(row.contract || ''),
      amount: n(row.amount),
      vat: n(row.vat),
      is_paid: Boolean(row.is_paid),
    });
    setError('');
    setDetail(null);
    setDialog(true);
  };
  const closeEditor = () => {
    if (save.isPending) return;
    setDialog(false);
    setForm(EMPTY);
    setError('');
  };
  const submit = () => {
    if (!form.contract) { setError('قرارداد مرتبط را انتخاب کنید.'); return; }
    if (n(form.amount) <= 0) { setError('مبلغ فاکتور باید بزرگ‌تر از صفر باشد.'); return; }
    setError('');
    save.mutate(form);
  };

  const exportCsv = () => {
    const headers = ['شماره', 'شرح', 'تاریخ', 'سررسید', 'مبلغ', 'مالیات', 'کل', 'پرداخت‌شده', 'وضعیت', 'توضیحات'];
    const rows = filtered.map((row) => {
      const paid = paidByInvoice[String(row.id)] || 0;
      const metrics = invoiceMetrics(row, paid);
      return [
        row.number || '', row.subject || '', row.date || '', row.due_date || '',
        metrics.amount, metrics.vat, metrics.total, metrics.paid,
        invoiceStatus(row, paid).label, row.description || '',
      ];
    });
    const csv = [headers, ...rows]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contract-invoices-${contractId || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (isLoading || contractsLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<ReceiptLongIcon />}
        title="فاکتورهای قرارداد"
        badge={(
          <Chip size="small" label={contractId ? `${formatPersianNumber(scopedList.length)} فاکتور` : 'مدیریت فاکتورها'}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(INVOICE_ACCENT, 0.08), color: INVOICE_ACCENT }} />
        )}
        actions={(
          <>
            {contractId ? (
              <Tooltip title="به‌روزرسانی">
                <span>
                  <Button variant="outlined" disabled={isFetching} onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['contract-invoice-payments', contractId] }); }} sx={{ minWidth: 40, px: 1 }}>
                    <RefreshIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {contractId ? <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => navigate(`/external-contracts/${contractId}`)}>پرونده</Button> : null}
            {contractId ? <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>چاپ</Button> : null}
            {contractId ? <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button> : null}
            {contractId ? <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>فاکتور جدید</Button> : null}
          </>
        )}
      />

      {!contractId ? (
        <InvoiceLanding
          contractList={contractList}
          invoices={allInvoices}
          dueRows={dueRows}
          paidByInvoice={paidByInvoice}
          totalAmount={totalAmountAll}
          currency={landingCurrency}
          onSelect={selectContract}
          onSelectContract={selectContractById}
        />
      ) : (
        <Grid container spacing={1.5}>
          <Grid item xs={12} lg={3} sx={{ order: { xs: 2, lg: 1 } }}>
            <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
              <InvoiceContractCard contract={selectedContract} currency={currencyLabel}
                invoiceCount={scopedList.length} onBack={clearContract} />
              <InvoiceFinancialCard totals={totals} currency={currencyLabel} isLoading={paymentsLoading} />
              <InvoiceStatusNav counts={counts} active={statusFilter} onChange={setStatusFilter} />
            </Stack>
          </Grid>

          <Grid item xs={12} lg={9} sx={{ order: { xs: 1, lg: 2 } }}>
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid item xs={6} md={3}>
                <KpiTile icon={ReceiptLongIcon} label="تعداد فاکتور" value={formatPersianNumber(counts.all)} suffix="مورد" color={INVOICE_ACCENT} hint={`${formatPersianNumber(counts.pending)} در انتظار پرداخت`} />
              </Grid>
              <Grid item xs={6} md={3}>
                <KpiTile icon={PaymentsIcon} label="مجموع مبالغ" value={compactMoney(totals.total, currencyLabel)} color={BLUE} size={16} hint={`${formatPersianNumber(counts.paid)} پرداخت‌شده`} />
              </Grid>
              <Grid item xs={6} md={3}>
                <KpiTile icon={CheckCircleIcon} label="پرداخت‌شده" value={compactMoney(totals.paid, currencyLabel)} color={GREEN} size={16} hint={`پوشش ${totals.total ? toPersianDigits(((totals.paid / totals.total) * 100).toFixed(0)) : '۰'}٪`} />
              </Grid>
              <Grid item xs={6} md={3}>
                <KpiTile icon={EventBusyIcon} label="مانده پرداخت" value={compactMoney(totals.outstanding, currencyLabel)} color={totals.overdueCount ? RED : AMBER} size={16} hint={`${formatPersianNumber(counts.overdue)} سررسید گذشته`} />
              </Grid>
            </Grid>

            <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <TextField size="small" placeholder="جست‌وجو در شماره، شرح، توضیحات…"
                  value={search} onChange={(event) => setSearch(event.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 220 }, flex: 1 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
                <FormControl size="small" sx={{ minWidth: 145 }}>
                  <InputLabel>وضعیت</InputLabel>
                  <Select value={statusFilter} label="وضعیت" onChange={(event) => setStatusFilter(event.target.value)}>
                    <MenuItem value="all">همه ({formatPersianNumber(counts.all)})</MenuItem>
                    <MenuItem value="paid">پرداخت‌شده ({formatPersianNumber(counts.paid)})</MenuItem>
                    <MenuItem value="pending">در انتظار ({formatPersianNumber(counts.pending)})</MenuItem>
                    <MenuItem value="overdue">سررسید گذشته ({formatPersianNumber(counts.overdue)})</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 125 }}>
                  <InputLabel>ترتیب</InputLabel>
                  <Select value={sortBy} label="ترتیب" onChange={(event) => setSortBy(event.target.value)}>
                    <MenuItem value="newest">جدیدترین</MenuItem>
                    <MenuItem value="amount">بیشترین مبلغ</MenuItem>
                    <MenuItem value="due">نزدیک‌ترین سررسید</MenuItem>
                    <MenuItem value="paid">پرداخت‌شده‌ها</MenuItem>
                  </Select>
                </FormControl>
                <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => value && setView(value)}>
                  <ToggleButton value="cards" aria-label="نمای کارت" sx={{ px: 1 }}><Tooltip title="کارت"><ViewModuleIcon fontSize="small" /></Tooltip></ToggleButton>
                  <ToggleButton value="table" aria-label="نمای جدول" sx={{ px: 1 }}><Tooltip title="جدول"><TableRowsIcon fontSize="small" /></Tooltip></ToggleButton>
                </ToggleButtonGroup>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ display: { xs: 'none', md: 'flex' } }}>فاکتور جدید</Button>
              </Stack>
            </Paper>

            {counts.overdue ? (
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 1, borderRadius: '11px', py: 0.2 }}>
                <Typography sx={{ fontSize: 9.5 }}>{formatPersianNumber(counts.overdue)} فاکتور از تاریخ سررسید گذشته و هنوز پرداخت نشده است.</Typography>
              </Alert>
            ) : null}

            {!filtered.length ? (
              <Paper elevation={0} sx={{ p: 5, borderRadius: '16px', border: `1px dashed ${theme.palette.divider}`, textAlign: 'center' }}>
                <ReceiptLongIcon sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }} />
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: INK }}>فاکتوری با این مشخصات ثبت نشده است.</Typography>
                <Typography sx={{ fontSize: 9, color: MUTED, mt: 0.4 }}>اولین فاکتور را ثبت کنید تا پوشش مالی و وضعیت پرداخت شکل بگیرد.</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ mt: 1.5 }}>ثبت فاکتور جدید</Button>
              </Paper>
            ) : view === 'cards' ? (
              <Grid container spacing={1.5}>
                {filtered.map((row) => (
                  <Grid item xs={12} md={6} xl={4} key={row.id}>
                    <InvoiceCard row={row} currency={invoiceCurrency(row, selectedContract)}
                      paidAmount={paidByInvoice[String(row.id)] || 0}
                      onView={setDetail} onEdit={openEdit} onDelete={setConfirmDelete}
                      onTogglePaid={(selected) => togglePaid.mutate(selected)} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <InvoiceTable rows={filtered} currency={currencyLabel} paidByInvoice={paidByInvoice}
                onView={setDetail} onEdit={openEdit} onDelete={setConfirmDelete}
                onTogglePaid={(selected) => togglePaid.mutate(selected)} />
            )}

            <Box sx={{ mt: 1.5 }}>
              <SurfaceCard title="روند فاکتورها" icon={TrendingUpIcon} color={INVOICE_ACCENT}
                action={<Chip size="small" label={`${formatPersianNumber(monthlyData.length)} ماه`} sx={{ height: 20, fontSize: 7.7, bgcolor: alpha(INVOICE_ACCENT, 0.07), color: INVOICE_ACCENT }} />}>
                {monthlyData.some((item) => item.value > 0) ? (
                  <ColumnChart data={monthlyData} color={INVOICE_ACCENT} height={150} />
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center', color: MUTED, fontSize: 9.4 }}>داده‌ای برای نمایش روند وجود ندارد.</Box>
                )}
              </SurfaceCard>
            </Box>
          </Grid>
        </Grid>
      )}

      <InvoiceDetailDrawer row={detail} contract={selectedContract} currency={currencyLabel}
        paidAmount={detail ? paidByInvoice[String(detail.id)] || 0 : 0}
        payments={payments} onClose={() => setDetail(null)} onEdit={openEdit}
        onDelete={setConfirmDelete} onTogglePaid={(selected) => togglePaid.mutate(selected)} />

      <InvoiceEditorDialog
        open={dialog}
        onClose={closeEditor}
        form={form}
        setForm={setForm}
        currencyList={currencyList}
        contract={contractList.find((contract) => String(contract.id) === String(form.contract)) || selectedContract}
        paidAmount={form.id ? paidByInvoice[String(form.id)] || 0 : 0}
        error={error}
        setError={setError}
        saving={save.isPending}
        onSave={submit}
      />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف فاکتور</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            فاکتور {confirmDelete?.number || (confirmDelete ? `#${confirmDelete.id}` : 'انتخاب‌شده')} حذف شود؟ این عملیات قابل بازگشت نیست.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={remove.isPending} onClick={() => remove.mutate(confirmDelete.id)}>
            {remove.isPending ? <CircularProgress size={18} color="inherit" /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3400} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractInvoicesPage;
