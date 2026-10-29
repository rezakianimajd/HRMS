import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, Paper, Stack, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { MUTED } from './accounting/AccountingDashboardUI';
import {
  EXPIRING_ACCENT, daysUntil, effAmount, effEnd, expiryMeta,
} from './contracts/ExpiringWorkspaceUI';
import {
  ModulePager, ModuleTable, ModuleToolbar,
  useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';

const dateLabel = (value) => (value ? toJalali(value) : '—');

const compactMoney = (value, currency = '') => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000000000) return `${formatPersianNumber((amount / 1000000000).toFixed(1))} میلیارد ${currency}`.trim();
  if (Math.abs(amount) >= 1000000) return `${formatPersianNumber((amount / 1000000).toFixed(1))} میلیون ${currency}`.trim();
  return `${formatPersianNumber(amount)} ${currency}`.trim();
};

const daysLabel = (days) => {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `${toPersianDigits(Math.abs(days))} روز گذشته`;
  if (days === 0) return 'امروز';
  return `${toPersianDigits(days)} روز مانده`;
};

const RANGE_LABELS = {
  expired: 'منقضی‌شده', soon30: 'تا ۳۰ روز', soon60: 'تا ۶۰ روز', soon90: 'تا ۹۰ روز',
};

const ContractExpiringPage = () => {
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();
  const [search, setSearch] = useState('');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('days');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['ext-contracts-expiring'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const rows = useMemo(() => list
    .filter((contract) => effEnd(contract))
    .map((contract) => {
      const end = effEnd(contract);
      const days = daysUntil(end);
      return { contract, end, days, meta: expiryMeta(days) };
    }), [list]);

  const counts = useMemo(() => rows.reduce((acc, row) => {
    acc[row.meta.key] = (acc[row.meta.key] || 0) + 1;
    return acc;
  }, { expired: 0, soon30: 0, soon60: 0, soon90: 0, later: 0 }), [rows]);

  const monitoredRows = useMemo(
    () => rows.filter((row) => ['expired', 'soon30', 'soon60', 'soon90'].includes(row.meta.key)),
    [rows],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = monitoredRows.filter((row) => {
      if (rangeFilter !== 'all' && row.meta.key !== rangeFilter) return false;
      if (!query) return true;
      const contract = row.contract;
      return [contract.subject, contract.party_name, contract.number]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    return [...result].sort((a, b) => {
      if (sortBy === 'amount') return effAmount(b.contract) - effAmount(a.contract);
      if (sortBy === 'newest') return String(b.end || '').localeCompare(String(a.end || ''));
      return (a.days ?? 99999) - (b.days ?? 99999);
    });
  }, [monitoredRows, search, rangeFilter, sortBy]);

  const atRiskAmount = useMemo(
    () => monitoredRows
      .filter((row) => row.meta.key === 'expired' || row.meta.key === 'soon30')
      .reduce((sum, row) => sum + effAmount(row.contract), 0),
    [monitoredRows],
  );
  const currency = monitoredRows[0]?.contract?.currency_name || monitoredRows[0]?.contract?.currency_symbol || 'ریال';
  const monitoredCount = monitoredRows.length;

  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    filtered.length, pageSize, [search, rangeFilter, sortBy, pageSize],
  );
  const pagedRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);

  const rangeOptions = [
    { value: 'all', label: `همه (${formatPersianNumber(monitoredCount)})` },
    { value: 'expired', label: `منقضی‌شده (${formatPersianNumber(counts.expired || 0)})` },
    { value: 'soon30', label: `تا ۳۰ روز (${formatPersianNumber(counts.soon30 || 0)})` },
    { value: 'soon60', label: `تا ۶۰ روز (${formatPersianNumber(counts.soon60 || 0)})` },
    { value: 'soon90', label: `تا ۹۰ روز (${formatPersianNumber(counts.soon90 || 0)})` },
  ];
  const activeFilterCount = rangeFilter === 'all' ? 0 : 1;
  const activeChips = rangeFilter === 'all'
    ? []
    : [{ key: 'range', label: `بازه: ${RANGE_LABELS[rangeFilter] || ''}`, clear: () => setRangeFilter('all') }];

  const exportCsv = () => {
    const headers = ['قرارداد', 'شماره', 'طرف قرارداد', 'تاریخ پایان', 'روز مانده', 'مبلغ مؤثر', 'بازه'];
    const body = filtered.map(({ contract, end, days, meta }) => [
      contract.subject || '', contract.number || '', contract.party_name || '',
      end || '', days ?? '', effAmount(contract), meta.label,
    ]);
    const csv = [headers, ...body]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'expiring-contracts.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: EXPIRING_ACCENT }} /></Box>;
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<NotificationsActiveIcon />}
        title="قراردادهای رو به انقضا"
        subtitle="پایش تاریخ پایان مؤثر قراردادها با احتساب آخرین الحاقیه"
        badge={(
          <Chip size="small" label={`${formatPersianNumber(monitoredCount)} قرارداد در بازه ۹۰ روز`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(EXPIRING_ACCENT, 0.09), color: '#b45309' }} />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" disabled={isFetching} onClick={() => refetch()} sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>چاپ</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
          </>
        )}
      />

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جستجو در موضوع، طرف قرارداد یا شماره قرارداد…"
        sort={sortBy}
        sortOptions={[
          { value: 'days', label: 'نزدیک‌ترین انقضا' },
          { value: 'amount', label: 'بیشترین مبلغ' },
          { value: 'newest', label: 'دورترین تاریخ' },
        ]}
        onSort={setSortBy}
        filters={[{ label: 'بازه انقضا', value: rangeFilter, options: rangeOptions, onChange: setRangeFilter }]}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onReset={() => { setSearch(''); setRangeFilter('all'); setSortBy('days'); }}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />

      {(counts.expired || 0) > 0 ? (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 1.25, borderRadius: '12px', py: 0.35 }}>
          <Typography sx={{ fontSize: 12 }}>
            {formatPersianNumber(counts.expired)} قرارداد منقضی شده است؛ وضعیت آن‌ها را بررسی کنید.
          </Typography>
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        overflow: 'hidden',
        px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <ModuleTable
          tableTheme={moduleTheme.tableTheme}
          ariaLabel="فهرست قراردادهای رو به انقضا"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={isFetching}
          rows={pagedRows}
          rowKey={(row) => row.contract.id}
          onRowClick={(row) => navigate(`/external-contracts/${row.contract.id}`)}
          emptyText="قراردادی در این بازه پیدا نشد؛ فیلتر بازه یا عبارت جستجو را تغییر دهید."
          columns={[
            {
              key: 'row',
              label: 'ردیف',
              width: '4%',
              align: 'center',
              render: (_row, index) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                  {toPersianDigits(page * pageSize + index + 1)}
                </Typography>
              ),
            },
            {
              key: 'number',
              label: 'شماره',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {toPersianDigits(row.contract.number || row.contract.id)}
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
              key: 'party',
              label: 'طرف قرارداد',
              width: '18%',
              render: (row) => (
                <Typography noWrap title={row.contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                  {row.contract.party_name || '—'}
                </Typography>
              ),
            },
            {
              key: 'end',
              label: 'پایان مؤثر',
              width: '10%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {dateLabel(row.end)}
                </Typography>
              ),
            },
            {
              key: 'days',
              label: 'روز مانده',
              width: '11%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: row.meta.color }}>
                  {daysLabel(row.days)}
                </Typography>
              ),
            },
            {
              key: 'amount',
              label: 'مبلغ مؤثر',
              width: '12%',
              align: 'center',
              render: (row) => (
                <Typography noWrap title={`${formatPersianNumber(effAmount(row.contract))} ${currency}`}
                  sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {formatPersianNumber(Math.round(effAmount(row.contract)))}
                </Typography>
              ),
            },
            {
              key: 'range',
              label: 'بازه',
              width: '13%',
              align: 'center',
              render: (row) => (
                <Chip size="small" label={row.meta.label}
                  sx={{
                    height: 20, fontSize: 10.5, fontWeight: 800,
                    bgcolor: row.meta.bg, color: row.meta.color,
                    border: `1px solid ${alpha(row.meta.color, 0.22)}`,
                    '& .MuiChip-label': { px: 0.8 },
                  }} />
              ),
            },
            {
              key: 'actions',
              label: 'عملیات',
              width: '8%',
              align: 'center',
              render: (row) => (
                <Stack direction="row" spacing={0.15} useFlexGap alignItems="center" justifyContent="center"
                  onClick={(event) => event.stopPropagation()}>
                  <Tooltip title="پرونده قرارداد">
                    <IconButton size="small" aria-label="پرونده قرارداد"
                      onClick={() => navigate(`/external-contracts/${row.contract.id}`)}>
                      <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
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
          pageSize={pageSize}
          unit="قرارداد"
        />
        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
          sx={{ pt: 1.25, mt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Chip size="small" label={`در بازه پایش: ${formatPersianNumber(monitoredCount)}`}
            sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(EXPIRING_ACCENT, 0.12), color: '#b45309' }} />
          <Chip size="small" label={`منقضی‌شده: ${formatPersianNumber(counts.expired || 0)}`}
            sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha('#be123c', 0.1), color: '#be123c' }} />
          <Chip size="small" label={`تا ۳۰ روز: ${formatPersianNumber(counts.soon30 || 0)}`}
            sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha('#ea580c', 0.1), color: '#ea580c' }} />
          <Chip size="small" label={`تا ۶۰ روز: ${formatPersianNumber(counts.soon60 || 0)}`}
            sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha('#b45309', 0.1), color: '#b45309' }} />
          <Chip size="small" label={`تا ۹۰ روز: ${formatPersianNumber(counts.soon90 || 0)}`}
            sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha('#ca8a04', 0.12), color: '#a16207' }} />
          <Chip size="small" label={`مبلغ در معرض خطر: ${compactMoney(atRiskAmount, currency)}`}
            sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha('#0f766e', 0.1), color: '#0f766e' }} />
        </Stack>
      </Paper>
    </Box>
  );
};

export default ContractExpiringPage;