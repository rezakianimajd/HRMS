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
import { toJalali } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { INK, MUTED } from './accounting/AccountingDashboardUI';
import { INVOICE_ACCENT, InvoiceDetailDrawer, InvoiceEditorDialog, invoiceMetrics, invoiceStatus } from './contracts/InvoiceWorkspaceUI';
import {
  ContractPickerLanding, ModulePager, ModuleTable, ModuleToolbar, moneyCell,
  useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

const GREEN = '#0f766e';
const AMBER = '#b45309';
const RED = '#be123c';
const BLUE = '#2563eb';
const n = (value) => Number(value) || 0;
const EMPTY = {
  id: null, contract: '', number: '', subject: '', date: '', due_date: '',
  currency: '', amount: 0, vat: 0, is_paid: false, description: '',
};

const ContractInvoicesPage = () => {
  const qc = useQueryClient();
  const moduleTheme = useModuleTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const scopedPageSize = moduleTheme.tableTheme.rowsPerPage;
  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    filtered.length, scopedPageSize, [search, statusFilter, sortBy, contractId, scopedPageSize],
  );
  const pagedInvoices = useMemo(
    () => filtered.slice(page * scopedPageSize, (page + 1) * scopedPageSize),
    [filtered, page, scopedPageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedInvoices.length);
  const statusOptions = [
    { value: 'all', label: `همه (${formatPersianNumber(counts.all)})` },
    { value: 'paid', label: `پرداخت‌شده (${formatPersianNumber(counts.paid)})` },
    { value: 'pending', label: `در انتظار (${formatPersianNumber(counts.pending)})` },
    { value: 'overdue', label: `سررسید گذشته (${formatPersianNumber(counts.overdue)})` },
  ];
  const activeFilterCount = statusFilter !== 'all' ? 1 : 0;
  const statusLabelOf = (key) => ({ paid: 'پرداخت‌شده', pending: 'در انتظار پرداخت', overdue: 'سررسید گذشته' }[key] || key);
  const activeChips = statusFilter !== 'all'
    ? [{ key: 'status', label: `وضعیت: ${statusLabelOf(statusFilter)}`, clear: () => setStatusFilter('all') }]
    : [];
  const scoped = Boolean(contractId);

  useEffect(() => { setContractId(urlContract); }, [urlContract]);
  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setSortBy('newest');
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
          <Chip size="small" label={`${formatPersianNumber(scoped ? scopedList.length : allInvoices.length)} فاکتور`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(INVOICE_ACCENT, 0.08), color: INVOICE_ACCENT }} />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" disabled={isFetching}
                  onClick={() => { refetch(); if (contractId) qc.invalidateQueries({ queryKey: ['contract-invoice-payments', contractId] }); }}
                  sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            {scoped ? (
              <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => navigate(`/external-contracts/${contractId}`)}>
                پرونده قرارداد
              </Button>
            ) : null}
            {scoped ? <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>چاپ</Button> : null}
            {scoped ? <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button> : null}
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>فاکتور جدید</Button>
            {scoped ? (
              <Button variant="contained" startIcon={<ChevronRightIcon />} onClick={clearContract}>فهرست قراردادها</Button>
            ) : null}
          </>
        )}
      />

      {!scoped ? (
        <ContractPickerLanding
          theme={moduleTheme}
          contracts={contractList}
          records={allInvoices}
          getContractId={(row) => row.contract}
          metrics={(row) => {
            const values = invoiceMetrics(row, 0);
            return { total: values.total, vat: values.vat, paid: row.is_paid ? values.total : 0 };
          }}
          onSelect={selectContract}
          ariaLabel="فهرست قراردادها برای فاکتورها"
          sortOptions={[
            { value: 'total', label: 'بیشترین مبلغ فاکتورها' },
            { value: 'paid', label: 'بیشترین پرداخت‌شده' },
            { value: 'count', label: 'بیشترین تعداد فاکتور' },
            { value: 'number', label: 'شماره قرارداد' },
          ]}
          columns={[
            {
              key: 'number',
              label: 'شماره قرارداد',
              width: '10%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {toPersianDigits(row.contract.number || '—')}
                </Typography>
              ),
            },
            {
              key: 'party',
              label: 'طرف قرارداد',
              width: '19%',
              render: (row) => (
                <Typography noWrap title={row.contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                  {row.contract.party_name || '—'}
                </Typography>
              ),
            },
            {
              key: 'subject',
              label: 'موضوع قرارداد',
              width: '25%',
              render: (row) => (
                <Typography noWrap title={row.contract.subject} sx={{ fontSize: 12, fontWeight: 800 }}>
                  {row.contract.subject || '—'}
                </Typography>
              ),
            },
            {
              key: 'count',
              label: 'تعداد فاکتور',
              width: '10%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{formatPersianNumber(row.count || 0)}</Typography>
              ),
            },
            { key: 'total', label: 'مجموع مبلغ', width: '14%', align: 'center', render: (row) => moneyCell(row.total, BLUE) },
            { key: 'vat', label: 'مالیات', width: '10%', align: 'center', render: (row) => moneyCell(row.vat, MUTED) },
            { key: 'paid', label: 'پرداخت‌شده', width: '12%', align: 'center', render: (row) => moneyCell(row.paid, GREEN) },
          ]}
        />
      ) : (

        <>
          <ModuleToolbar
            theme={moduleTheme}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="جستجو در شماره، شرح و توضیحات فاکتور…"
            sort={sortBy}
            sortOptions={[
              { value: 'newest', label: 'جدیدترین' },
              { value: 'amount', label: 'بیشترین مبلغ' },
              { value: 'due', label: 'نزدیک‌ترین سررسید' },
              { value: 'paid', label: 'پرداخت‌شده‌ها' },
            ]}
            onSort={setSortBy}
            filters={[{ label: 'وضعیت فاکتور', value: statusFilter, options: statusOptions, onChange: setStatusFilter }]}
            activeChips={activeChips}
            activeFilterCount={activeFilterCount}
            onReset={() => { setSearch(''); setStatusFilter('all'); setSortBy('newest'); }}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
          />

          <Paper elevation={0} sx={{
            borderRadius: 'var(--hrms-table-radius, 16px)',
            overflow: 'hidden',
            px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
            border: '1px solid', borderColor: moduleTheme.cardBorderColor,
            bgcolor: 'background.paper', boxShadow: 'none',
          }}>
            <ModuleTable
              tableTheme={moduleTheme.tableTheme}
              ariaLabel="فهرست فاکتورهای قرارداد"
              containerRef={tableRef}
              tableHeight={tableHeight}
              rowHeight={rowHeight}
              dimmed={isFetching || paymentsLoading}
              rows={pagedInvoices}
              rowKey={(row) => row.id}
              onRowClick={(row) => setDetail(row)}
              emptyText="فاکتوری با این مشخصات ثبت نشده است."
              columns={[
                {
                  key: 'row',
                  label: 'ردیف',
                  width: '4%',
                  align: 'center',
                  render: (_row, index) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                      {toPersianDigits(page * scopedPageSize + index + 1)}
                    </Typography>
                  ),
                },
                {
                  key: 'number',
                  label: 'شماره فاکتور',
                  width: '10%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {toPersianDigits(row.number || `#${row.id}`)}
                    </Typography>
                  ),
                },
                {
                  key: 'subject',
                  label: 'شرح',
                  width: '20%',
                  render: (row) => (
                    <Typography noWrap title={row.subject || row.description} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                      {row.subject || row.description || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'date',
                  label: 'تاریخ',
                  width: '9%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {row.date ? toJalali(row.date) : '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'due',
                  label: 'سررسید',
                  width: '9%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {row.due_date ? toJalali(row.due_date) : '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'amount',
                  label: 'مبلغ',
                  width: '11%',
                  align: 'center',
                  render: (row) => moneyCell(invoiceMetrics(row, paidByInvoice[String(row.id)]).amount, INK),
                },
                {
                  key: 'vat',
                  label: 'مالیات',
                  width: '8%',
                  align: 'center',
                  render: (row) => moneyCell(invoiceMetrics(row, paidByInvoice[String(row.id)]).vat, MUTED),
                },
                {
                  key: 'total',
                  label: 'مبلغ کل',
                  width: '11%',
                  align: 'center',
                  render: (row) => moneyCell(invoiceMetrics(row, paidByInvoice[String(row.id)]).total, BLUE),
                },
                {
                  key: 'paid',
                  label: 'پرداخت‌شده',
                  width: '10%',
                  align: 'center',
                  render: (row) => moneyCell(invoiceMetrics(row, paidByInvoice[String(row.id)]).paid, GREEN),
                },
                {
                  key: 'status',
                  label: 'وضعیت',
                  width: '9%',
                  align: 'center',
                  render: (row) => {
                    const status = invoiceStatus(row, paidByInvoice[String(row.id)]);
                    return (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip size="small" label={status.label}
                          sx={{
                            height: 20, fontSize: 10.5, fontWeight: 800,
                            bgcolor: status.bg, color: status.color,
                            border: `1px solid ${alpha(status.color, 0.28)}`,
                            '& .MuiChip-label': { px: 0.8 },
                          }} />
                      </Box>
                    );
                  },
                },
                {
                  key: 'actions',
                  label: 'عملیات',
                  width: '9%',
                  align: 'center',
                  render: (row) => (
                    <Stack direction="row" spacing={0.15} useFlexGap alignItems="center" justifyContent="center"
                      onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="جزئیات"><IconButton size="small" aria-label="جزئیات" onClick={() => setDetail(row)}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      <Tooltip title="ویرایش"><IconButton size="small" aria-label="ویرایش" onClick={() => openEdit(row)}><EditIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      <Tooltip title={row.is_paid ? 'لغو پرداخت' : 'ثبت پرداخت'}>
                        <IconButton size="small" aria-label={row.is_paid ? 'لغو پرداخت' : 'ثبت پرداخت'} sx={{ color: row.is_paid ? GREEN : MUTED }} onClick={() => togglePaid.mutate(row)}>
                          <CheckCircleIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" aria-label="حذف" color="error" onClick={() => setConfirmDelete(row)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    </Stack>
                  ),
                },
              ]}
            />

            <ModulePager
              tableTheme={moduleTheme.tableTheme}
              page={page}
              onPage={setPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              total={filtered.length}
              pageSize={scopedPageSize}
              unit="فاکتور"
            />
            <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
              sx={{ pt: 1.25, mt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Chip size="small" label={`جمع مبلغ: ${formatPersianNumber(Math.round(totals.total))} ${currencyLabel}`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(BLUE, 0.1), color: BLUE }} />
              <Chip size="small" label={`پرداخت‌شده: ${formatPersianNumber(Math.round(totals.paid))}`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(GREEN, 0.1), color: GREEN }} />
              <Chip size="small" label={`مانده: ${formatPersianNumber(Math.round(totals.outstanding))}`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(totals.overdueCount ? RED : AMBER, 0.1), color: totals.overdueCount ? RED : AMBER }} />
              {counts.overdue ? (
                <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 13 }} />}
                  label={`${formatPersianNumber(counts.overdue)} فاکتور سررسید گذشته`}
                  sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(RED, 0.1), color: RED }} />
              ) : null}
            </Stack>
          </Paper>
        </>
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