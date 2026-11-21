import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Stack, Tooltip, Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import usePrintDocument from '../core/print/usePrintDocument';
import PrintPreviewDialog from '../core/print/PrintPreviewDialog';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';
import {
  AMBER, BLUE, GREEN, MetricTile, Panel, RED, SLATE, money,
} from './contracts/contractsDashboardKit';

const ACCENT = '#f59e0b';
const PAGE_UNIT = 'قرارداد';

const SORT_OPTIONS = [
  { value: 'default', label: 'ترتیب قرارداد' },
  { value: 'advance_desc', label: 'بیشترین پیش‌پرداخت' },
  { value: 'claims_desc', label: 'بیشترین مطالبات' },
  { value: 'paid_desc', label: 'بیشترین پرداخت' },
  { value: 'last_payment', label: 'آخرین پرداخت' },
];

const CLAIM_FILTERS = [
  { value: 'all', label: 'همهٔ قراردادها' },
  { value: 'with_claims', label: 'فقط دارای مطالبات' },
];

const valueOf = (row, key) => Number(row?.[key] || 0);

const rowSort = (rows, sortBy) => {
  const sorted = [...rows];
  if (sortBy === 'advance_desc') {
    return sorted.sort((a, b) => valueOf(b, 'advance_contract') - valueOf(a, 'advance_contract'));
  }
  if (sortBy === 'claims_desc') {
    return sorted.sort((a, b) => valueOf(b, 'payable_claims') - valueOf(a, 'payable_claims'));
  }
  if (sortBy === 'paid_desc') {
    return sorted.sort((a, b) => valueOf(b, 'paid_total') - valueOf(a, 'paid_total'));
  }
  if (sortBy === 'last_payment') {
    return sorted.sort((a, b) => String(b.last_payment_date || '').localeCompare(String(a.last_payment_date || '')));
  }
  return sorted;
};

const headerSort = (rows, sort) => {
  if (!sort?.key) return rows;
  const factor = sort.direction === 'desc' ? -1 : 1;
  const read = (row) => {
    if (sort.type === 'number') return valueOf(row, sort.key);
    return String(row[sort.key] ?? '');
  };
  return [...rows].sort((a, b) => {
    const left = read(a);
    const right = read(b);
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * factor;
    }
    return left.localeCompare(right, 'fa') * factor;
  });
};

const MoneyText = ({ value, color, strong = false }) => (
  <Typography sx={{ fontSize: 10.5, fontWeight: strong ? 900 : 700, color: color || 'text.primary' }}>
    {money(value)}
  </Typography>
);

const ContractPaymentReportPage = () => {
  const moduleTheme = useModuleTheme();
  const print = usePrintDocument();
  const pageSize = moduleTheme.tableTheme.rowsPerPage;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [claimFilter, setClaimFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [headerSortState, setHeaderSortState] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = useMemo(() => ({
    search: debouncedSearch,
    ...(claimFilter === 'with_claims' ? { only_claims: '1' } : {}),
  }), [debouncedSearch, claimFilter]);

  const reportQuery = useQuery({
    queryKey: ['contract-payment-report', queryParams],
    queryFn: () => axiosInstance.get('/external-contracts/payment-report/', { params: queryParams })
      .then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  });

  const serverRows = Array.isArray(reportQuery.data?.results) ? reportQuery.data.results : [];
  const rows = useMemo(() => {
    if (sortBy !== 'default') return rowSort(serverRows, sortBy);
    return headerSort(serverRows, headerSortState);
  }, [serverRows, sortBy, headerSortState]);
  const summary = reportQuery.data?.summary || {};

  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    rows.length, pageSize, [debouncedSearch, claimFilter, sortBy, headerSortState, pageSize],
  );
  const pagedRows = useMemo(
    () => rows.slice(page * pageSize, (page + 1) * pageSize),
    [rows, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);

  const activeChips = claimFilter === 'all' ? [] : [{
    key: 'claims',
    label: 'فقط دارای مطالبات',
    clear: () => setClaimFilter('all'),
  }];

  const resetFilters = () => {
    setSearch('');
    setClaimFilter('all');
    setSortBy('default');
  };


  const columns = [
    {
      key: 'row', label: 'ردیف', width: '4%', align: 'center',
      render: (_row, index) => (
        <Typography sx={{ fontSize: 10.5, fontWeight: 800 }}>
          {toPersianDigits(page * pageSize + index + 1)}
        </Typography>
      ),
    },
    {
      key: 'party_name', label: 'نام', width: '12%', sortKey: 'party_name', sortType: 'text',
      render: (row) => (
        <Typography noWrap title={row.party_name} sx={{ fontSize: 11, fontWeight: 800 }}>
          {row.party_name || '—'}
        </Typography>
      ),
    },
    {
      key: 'contract_number', label: 'شماره قرارداد', width: '9%', align: 'center',
      sortKey: 'contract_number', sortType: 'text',
      render: (row) => (
        <Typography noWrap title={row.contract_number} sx={{ fontSize: 10.5, fontWeight: 800 }}>
          {row.contract_number ? toPersianDigits(row.contract_number) : '—'}
        </Typography>
      ),
    },
    {
      key: 'projects', label: 'پروژه‌ها', width: '14%', sortKey: 'projects_display', sortType: 'text',
      render: (row) => (
        <Typography noWrap title={(row.projects || []).join('، ')} sx={{ fontSize: 10.5 }}>
          {row.projects_display || '—'}
        </Typography>
      ),
    },
    {
      key: 'subject', label: 'موضوع قرارداد', width: '15%', sortKey: 'subject', sortType: 'text',
      render: (row) => (
        <Typography noWrap title={row.subject} sx={{ fontSize: 10.5 }}>
          {row.subject || '—'}
        </Typography>
      ),
    },
    {
      key: 'advance_contract', label: 'پیش‌پرداخت (مطابق قرارداد)', width: '9%', align: 'center',
      sortKey: 'advance_contract', sortType: 'number', defaultSortDirection: 'desc',
      render: (row) => <MoneyText value={row.advance_contract} />,
    },
    {
      key: 'advance_paid', label: 'پیش‌پرداخت پرداخت‌شده', width: '9%', align: 'center',
      sortKey: 'advance_paid', sortType: 'number', defaultSortDirection: 'desc',
      render: (row) => <MoneyText value={row.advance_paid} color={GREEN} />,
    },
    {
      key: 'advance_balance', label: 'مانده پیش‌پرداخت', width: '9%', align: 'center',
      sortKey: 'advance_balance', sortType: 'number', defaultSortDirection: 'desc',
      render: (row) => (
        <MoneyText value={row.advance_balance}
          color={valueOf(row, 'advance_balance') < 0 ? RED : AMBER} strong />
      ),
    },
    {
      key: 'payable_claims', label: 'مطالبات قابل پرداخت', width: '10%', align: 'center',
      sortKey: 'payable_claims', sortType: 'number', defaultSortDirection: 'desc',
      render: (row) => (
        <MoneyText value={row.payable_claims}
          color={valueOf(row, 'payable_claims') > 0 ? RED : GREEN} strong />
      ),
    },
    {
      key: 'paid_total', label: 'مبالغ پرداخت‌شده', width: '10%', align: 'center',
      sortKey: 'paid_total', sortType: 'number', defaultSortDirection: 'desc',
      render: (row) => <MoneyText value={row.paid_total} color={BLUE} />,
    },
    {
      key: 'last_payment_date', label: 'تاریخ آخرین پرداخت', width: '9%', align: 'center',
      sortKey: 'last_payment_date', sortType: 'date', defaultSortDirection: 'desc',
      render: (row) => (
        <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>
          {row.last_payment_date ? toJalali(row.last_payment_date) : '—'}
        </Typography>
      ),
    },
  ];

  const activeFilterCount = claimFilter === 'all' ? 0 : 1;
  const loading = reportQuery.isLoading && !serverRows.length;

  const openPrint = () => {
    const printColumns = [
      { key: 'row', label: 'ردیف', align: 'center', width: '4%' },
      { key: 'party_name', label: 'نام', align: 'right', width: '11%' },
      { key: 'contract_number', label: 'شماره قرارداد', align: 'center', width: '8%' },
      { key: 'projects', label: 'پروژه‌ها', align: 'right', width: '13%' },
      { key: 'subject', label: 'موضوع قرارداد', align: 'right', width: '14%' },
      { key: 'advance_contract', label: 'پیش‌پرداخت قرارداد', align: 'center', width: '9%' },
      { key: 'advance_paid', label: 'پیش‌پرداخت پرداخت‌شده', align: 'center', width: '9%' },
      { key: 'advance_balance', label: 'مانده پیش‌پرداخت', align: 'center', width: '9%' },
      { key: 'payable_claims', label: 'مطالبات قابل پرداخت', align: 'center', width: '9%' },
      { key: 'paid_total', label: 'مبالغ پرداخت‌شده', align: 'center', width: '8%' },
      { key: 'last_payment_date', label: 'آخرین پرداخت', align: 'center', width: '8%' },
    ];
    const printRows = rows.map((row, index) => ({
      row: toPersianDigits(index + 1),
      party_name: row.party_name || '—',
      contract_number: row.contract_number ? toPersianDigits(row.contract_number) : '—',
      projects: row.projects_display || '—',
      subject: row.subject || '—',
      advance_contract: money(row.advance_contract),
      advance_paid: money(row.advance_paid),
      advance_balance: money(row.advance_balance),
      payable_claims: money(row.payable_claims),
      paid_total: money(row.paid_total),
      last_payment_date: row.last_payment_date ? toJalali(row.last_payment_date) : '—',
    }));
    print.openDocument({
      document: 'table',
      payload: {
        module: 'contracts',
        title: 'گزارش پرداخت‌ها و مطالبات قراردادها',
        subtitle: 'پیش‌پرداخت، مطالبات قابل پرداخت و سابقهٔ پرداخت',
        badge: `${formatPersianNumber(rows.length)} قرارداد`,
        filters_note: debouncedSearch ? `جست‌وجو: ${debouncedSearch}` : '',
        columns: printColumns,
        rows: printRows,
        total_row: {
          row: 'جمع',
          party_name: '',
          contract_number: '',
          projects: '',
          subject: '',
          advance_contract: money(summary.advance_contract),
          advance_paid: money(summary.advance_paid),
          advance_balance: money(summary.advance_balance),
          payable_claims: money(summary.payable_claims),
          paid_total: money(summary.paid_total),
          last_payment_date: '',
        },
        zebra: true,
      },
      options: { paper: 'A4', orientation: 'landscape' },
    });
  };


  return (
    <Box>
      <PageHeader
        icon={<PaymentsOutlinedIcon />}
        title="گزارش پرداخت‌ها و مطالبات قراردادها"
        subtitle="پیش‌پرداخت، پرداخت‌های انجام‌شده و مطالبات قابل پرداخت هر قرارداد"
        actions={(
          <Stack direction="row" spacing={1}>
            <Tooltip title="به‌روزرسانی گزارش">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => reportQuery.refetch()}
                  disabled={reportQuery.isFetching}
                >
                  به‌روزرسانی
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={openPrint}
              disabled={loading || !rows.length}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#d97706' } }}
            >
              چاپ گزارش
            </Button>
          </Stack>
        )}
      />

      <Box sx={{
        display: 'grid', gap: 1.1, mb: 1.5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(5, minmax(0,1fr))' },
      }}>
        <MetricTile theme={moduleTheme} icon={RequestQuoteOutlinedIcon} label="قراردادها"
          value={formatPersianNumber(summary.contract_count || 0)} suffix={PAGE_UNIT}
          hint="قراردادهای این گزارش" color={SLATE} />
        <MetricTile theme={moduleTheme} icon={AccountBalanceWalletOutlinedIcon} label="پیش‌پرداخت قرارداد"
          value={money(summary.advance_contract)} suffix="" hint="مطابق متن قرارداد" color={AMBER} />
        <MetricTile theme={moduleTheme} icon={PaymentsOutlinedIcon} label="پیش‌پرداخت پرداخت‌شده"
          value={money(summary.advance_paid)} suffix="" hint="پرداخت‌های نوع پیش‌پرداخت" color={GREEN} />
        <MetricTile theme={moduleTheme} icon={ReceiptLongOutlinedIcon} label="مطالبات قابل پرداخت"
          value={money(summary.payable_claims)} suffix="" hint="صورت‌وضعیت/فاکتور پرداخت‌نشده" color={RED} />
        <MetricTile theme={moduleTheme} icon={PaymentsOutlinedIcon} label="کل پرداخت اسناد"
          value={money(summary.paid_total)} suffix="" hint="تخصیص‌های خالص پرداخت" color={BLUE} />
      </Box>

      {reportQuery.isError ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          دریافت گزارش انجام نشد. دسترسی ماژول قراردادها و اتصال سرور را بررسی کنید.
        </Alert>
      ) : null}

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جست‌وجو در نام، شماره قرارداد، موضوع یا پروژه…"
        sort={sortBy}
        sortOptions={SORT_OPTIONS}
        onSort={(value) => { setSortBy(value); setHeaderSortState(null); }}
        filters={[{
          label: 'مطالبات',
          value: claimFilter,
          options: CLAIM_FILTERS,
          onChange: setClaimFilter,
        }]}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />

      <Panel
        theme={moduleTheme}
        icon={PaymentsOutlinedIcon}
        color={ACCENT}
        title="فهرست قراردادها"
        hint={loading
          ? 'در حال دریافت…'
          : `${formatPersianNumber(rows.length)} قرارداد · صفحهٔ ${formatPersianNumber(page + 1)}`}
        ariaLabel="گزارش پرداخت‌ها و مطالبات قراردادها"
      >
        {loading ? (
          <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={30} sx={{ color: ACCENT }} />
          </Box>
        ) : (
          <>
            <ModuleTable
              tableTheme={{ ...moduleTheme.tableTheme, singleLine: true }}
              ariaLabel="گزارش پرداخت‌ها و مطالبات قراردادها"
              columns={columns}
              rows={pagedRows}
              rowKey={(row) => row.id}
              containerRef={tableRef}
              rowHeight={rowHeight}
              tableHeight={tableHeight}
              dimmed={reportQuery.isFetching}
              sort={headerSortState}
              onSort={({ key, direction, column }) => {
                setSortBy('default');
                setHeaderSortState({ key, direction, type: column.sortType || 'text' });
              }}
              minWidth={1680}
              emptyText="قراردادی با این شرایط پیدا نشد."
            />
            <ModulePager
              tableTheme={moduleTheme.tableTheme}
              page={page}
              onPage={setPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              total={rows.length}
              pageSize={pageSize}
              unit={PAGE_UNIT}
            />
          </>
        )}
      </Panel>

      <PrintPreviewDialog
        open={print.open}
        title={print.title || 'گزارش پرداخت‌ها و مطالبات قراردادها'}
        html={print.html}
        loading={print.loading}
        error={print.error}
        options={print.options}
        onChangeOptions={print.updateOptions}
        onRefresh={print.refresh}
        onClose={print.close}
      />
    </Box>
  );
};

export default ContractPaymentReportPage;

