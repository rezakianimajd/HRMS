import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, LinearProgress, Paper, Stack, Tab,
  Tabs, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DownloadIcon from '@mui/icons-material/Download';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import GavelIcon from '@mui/icons-material/Gavel';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import UndoIcon from '@mui/icons-material/Undo';
import UpdateIcon from '@mui/icons-material/Update';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { MUTED } from './accounting/AccountingDashboardUI';
import {
  ModulePager, ModuleTable, ModuleToolbar,
  useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';
import { printElement } from '../core/print/printEngine';

const ACCENT = '#f59e0b';
const OK = '#0f766e';
const WARN = '#b45309';
const SOON = '#ea580c';
const DANGER = '#be123c';
const SLATE = '#475569';
const INFO = '#2563eb';
const VIOLET = '#7c3aed';

const INSTRUMENT_META = {
  check: { label: 'چک', color: WARN, icon: ReceiptLongIcon },
  promissory: { label: 'سفته', color: VIOLET, icon: NoteAltIcon },
  bank_guarantee: { label: 'ضمانت‌نامه بانکی', color: OK, icon: AccountBalanceIcon },
  undertaking_guarantee: { label: 'ضمانت‌نامه تعهدی', color: '#0e7490', icon: VerifiedUserIcon },
  check_and_guarantee: { label: 'چک + ضمانت‌نامه', color: INFO, icon: AccountBalanceIcon },
  promissory_and_guarantee: { label: 'سفته + ضمانت‌نامه', color: '#be185d', icon: AccountBalanceIcon },
};

const GUARANTEE_TYPE_LABELS = {
  advance: 'پیش‌پرداخت',
  performance: 'حسن انجام کار',
  retention: 'تضمین نگهداری',
  warranty: 'گارانتی / دوره تضمین',
  other: 'سایر',
};

const STATUS_META = {
  active: { label: 'معتبر', color: OK, bg: '#ecfdf5' },
  expiring: { label: 'نزدیک انقضا', color: WARN, bg: '#fffbeb' },
  expired: { label: 'منقضی', color: DANGER, bg: '#fff1f2' },
  returned: { label: 'استرداد شده', color: SLATE, bg: '#f1f5f9' },
  released: { label: 'آزادشده', color: OK, bg: '#ecfdf5' },
  executed: { label: 'اجرا / ضبط شده', color: DANGER, bg: '#fff1f2' },
  canceled: { label: 'ابطال شده', color: VIOLET, bg: '#f5f3ff' },
};


/* ---------------- کمکی‌ها ---------------- */
const dateLabel = (value) => (value ? toJalali(value) : '—');

const money = (value) => formatPersianNumber(Math.round(Number(value) || 0));

const compactMoney = (value, currency = '') => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000000000) return `${formatPersianNumber((amount / 1000000000).toFixed(1))} میلیارد ${currency}`.trim();
  if (Math.abs(amount) >= 1000000) return `${formatPersianNumber((amount / 1000000).toFixed(1))} میلیون ${currency}`.trim();
  return `${formatPersianNumber(Math.round(amount))} ${currency}`.trim();
};

const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target - new Date()) / 86400000);
};

const dueOf = (row) => row.guarantee_expiry_date || row.check_due_date || row.promissory_due_date || row.expiry_date;
const numberFor = (row) => row.number || row.check_number || row.promissory_number || row.guarantee_number || '—';

const daysLabel = (days) => {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `${toPersianDigits(Math.abs(days))} روز گذشته`;
  if (days === 0) return 'امروز';
  return `${toPersianDigits(days)} روز مانده`;
};

const daysColor = (days) => {
  if (days === null || days === undefined) return MUTED;
  if (days < 0) return DANGER;
  if (days <= 30) return SOON;
  if (days <= 60) return WARN;
  return OK;
};

const statusOf = (row) => {
  if (row.last_action === 'released') return { key: 'released', ...STATUS_META.released };
  if (row.last_action === 'returned' || (!row.last_action && row.is_released)) {
    return { key: 'returned', ...STATUS_META.returned };
  }
  if (row.last_action === 'executed') return { key: 'executed', ...STATUS_META.executed };
  if (row.last_action === 'canceled') return { key: 'canceled', ...STATUS_META.canceled };
  const days = daysUntil(dueOf(row));
  if (days !== null && days < 0) return { key: 'expired', ...STATUS_META.expired };
  if (days !== null && days <= 30) return { key: 'expiring', ...STATUS_META.expiring };
  return { key: 'active', ...STATUS_META.active };
};

const chipSx = (color, bg) => ({
  height: 20,
  fontSize: 10.5,
  fontWeight: 800,
  bgcolor: bg || alpha(color, 0.08),
  color,
  border: `1px solid ${alpha(color, 0.22)}`,
  '& .MuiChip-label': { px: 0.8 },
});

/* کارت آماری کوچک */
const KpiTile = ({ label, value, hint, color, icon: Icon, onClick }) => (
  <Paper
    elevation={0}
    onClick={onClick}
    sx={{
      p: 1.15,
      borderRadius: '14px',
      border: '1px solid',
      borderColor: alpha(color, 0.2),
      bgcolor: alpha(color, 0.035),
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minWidth: 0,
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow .15s ease, transform .15s ease',
      '&:hover': onClick ? { boxShadow: `0 6px 18px ${alpha(color, 0.14)}`, transform: 'translateY(-1px)' } : undefined,
    }}
  >
    <Box sx={{
      width: 34, height: 34, borderRadius: '10px', flex: '0 0 auto',
      display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.12), color,
    }}>
      <Icon sx={{ fontSize: 18 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700, color: MUTED }}>{label}</Typography>
      <Typography noWrap title={String(value)} sx={{
        fontSize: 14, fontWeight: 900, color,
        fontFamily: 'var(--hrms-table-number-font, inherit)',
      }}>
        {value}
      </Typography>
      {hint ? (
        <Typography noWrap sx={{ fontSize: 9.5, fontWeight: 600, color: MUTED }}>{hint}</Typography>
      ) : null}
    </Box>
  </Paper>
);


const ContractGuaranteesMonitorPage = () => {
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('guarantees');
  const [sortBy, setSortBy] = useState('days');
  const [instrumentFilter, setInstrumentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: raw, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contract-guarantees-monitor'],
    queryFn: () => axiosInstance.get('/contract-guarantees/', { params: { page_size: 500 } })
      .then((response) => response.data),
  });

  const {
    data: overview, isError: overviewError, isFetching: overviewFetching, refetch: refetchOverview,
  } = useQuery({
    queryKey: ['contract-guarantees-overview'],
    queryFn: () => axiosInstance.get('/external-contracts/guarantees-overview/')
      .then((response) => response.data),
    retry: false,
  });

  const guarantees = useMemo(
    () => (Array.isArray(raw) ? raw : raw?.results || []),
    [raw],
  );

  const rows = useMemo(() => guarantees.map((guarantee) => {
    const due = dueOf(guarantee);
    const days = daysUntil(due);
    return {
      g: guarantee,
      due,
      days,
      amount: Number(guarantee.amount) || 0,
      number: numberFor(guarantee),
      status: statusOf(guarantee),
    };
  }), [guarantees]);

  const counts = useMemo(() => rows.reduce((acc, row) => {
    acc[row.status.key] = (acc[row.status.key] || 0) + 1;
    return acc;
  }, {
    active: 0, expiring: 0, expired: 0, released: 0, returned: 0, executed: 0, canceled: 0,
  }), [rows]);

  const totals = useMemo(() => rows.reduce((acc, row) => {
    acc.all += row.amount;
    if (row.status.key === 'released' || row.status.key === 'returned') acc.released += row.amount;
    else acc.active += row.amount;
    if (row.days !== null && row.days < 0) acc.expired += row.amount;
    if (row.days !== null && row.days >= 0 && row.days <= 30 && row.g.last_action !== 'released') {
      acc.risk += row.amount;
    }
    return acc;
  }, { all: 0, active: 0, released: 0, expired: 0, risk: 0 }), [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      const guarantee = row.g;
      if (instrumentFilter !== 'all' && guarantee.instrument_type !== instrumentFilter) return false;
      if (typeFilter !== 'all' && guarantee.guarantee_type !== typeFilter) return false;
      if (statusFilter !== 'all' && row.status.key !== statusFilter) return false;
      if (rangeFilter === 'expired' && !(row.days !== null && row.days < 0)) return false;
      if (rangeFilter === 'soon30' && !(row.days !== null && row.days >= 0 && row.days <= 30)) return false;
      if (rangeFilter === 'soon60' && !(row.days !== null && row.days >= 0 && row.days <= 60)) return false;
      if (rangeFilter === 'no_due' && row.days !== null) return false;
      if (!query) return true;
      return [
        row.number, guarantee.contract_number, guarantee.contract_subject, guarantee.contract_party,
        guarantee.bank, guarantee.instrument_type_display, guarantee.guarantee_type_display,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
    return [...result].sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'contract') {
        return String(a.g.contract_number || '').localeCompare(String(b.g.contract_number || ''), 'fa');
      }
      return (a.days ?? 999999) - (b.days ?? 999999);
    });
  }, [rows, search, instrumentFilter, typeFilter, statusFilter, rangeFilter, sortBy]);

  const coverageRows = useMemo(() => {
    const list = overview?.results || [];
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((row) => [row.contract_number, row.contract_subject, row.party_name]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [overview, search]);

  const overviewSummary = overview?.summary || null;

  const watchList = useMemo(
    () => rows
      .filter((row) => row.days !== null && row.days <= 60 && !['released', 'returned', 'canceled'].includes(row.status.key))
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
      .slice(0, 6),
    [rows],
  );

  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    filteredRows.length, pageSize,
    [search, instrumentFilter, typeFilter, statusFilter, rangeFilter, sortBy, pageSize],
  );
  const pagedRows = useMemo(
    () => filteredRows.slice(page * pageSize, (page + 1) * pageSize),
    [filteredRows, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);

  const coverageState = useModuleTableState(coverageRows.length, pageSize, [search, pageSize]);
  const pagedCoverage = useMemo(
    () => coverageRows.slice(coverageState.page * pageSize, (coverageState.page + 1) * pageSize),
    [coverageRows, coverageState.page, pageSize],
  );
  const {
    ref: coverageRef, rowHeight: coverageRowHeight, tableHeight: coverageTableHeight,
  } = useRowHeight(moduleTheme.tableTheme, pagedCoverage.length);

  const activeFilterCount = [instrumentFilter, typeFilter, statusFilter, rangeFilter]
    .filter((value) => value !== 'all').length;

  const instrumentOptions = [
    { value: 'all', label: `همهٔ ابزارها (${formatPersianNumber(rows.length)})` },
    ...Object.entries(INSTRUMENT_META).map(([value, meta]) => ({ value, label: meta.label })),
  ];
  const typeOptions = [
    { value: 'all', label: 'همهٔ انواع تضمین' },
    ...Object.entries(GUARANTEE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const statusOptions = [
    { value: 'all', label: 'همهٔ وضعیت‌ها' },
    ...Object.entries(STATUS_META).map(([value, meta]) => ({
      value, label: `${meta.label} (${formatPersianNumber(counts[value] || 0)})`,
    })),
  ];
  const rangeOptions = [
    { value: 'all', label: 'همهٔ سررسیدها' },
    { value: 'expired', label: `منقضی‌شده (${formatPersianNumber(counts.expired || 0)})` },
    { value: 'soon30', label: 'تا ۳۰ روز' },
    { value: 'soon60', label: 'تا ۶۰ روز' },
    { value: 'no_due', label: 'بدون تاریخ سررسید' },
  ];

  const activeChips = [
    instrumentFilter !== 'all' && {
      key: 'instrument',
      label: `ابزار: ${INSTRUMENT_META[instrumentFilter]?.label || instrumentFilter}`,
      clear: () => setInstrumentFilter('all'),
    },
    typeFilter !== 'all' && {
      key: 'type',
      label: `نوع: ${GUARANTEE_TYPE_LABELS[typeFilter] || typeFilter}`,
      clear: () => setTypeFilter('all'),
    },
    statusFilter !== 'all' && {
      key: 'status',
      label: `وضعیت: ${STATUS_META[statusFilter]?.label || statusFilter}`,
      clear: () => setStatusFilter('all'),
    },
    rangeFilter !== 'all' && {
      key: 'range',
      label: `سررسید: ${rangeOptions.find((option) => option.value === rangeFilter)?.label || ''}`,
      clear: () => setRangeFilter('all'),
    },
  ].filter(Boolean);

  const resetFilters = () => {
    setSearch('');
    setInstrumentFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setRangeFilter('all');
    setSortBy('days');
  };

  const refreshAll = () => {
    refetch();
    refetchOverview();
  };

  const exportCsv = () => {
    const download = (name, headers, body) => {
      const csv = [headers, ...body]
        .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
    };
    if (tab === 'coverage') {
      download(
        'guarantee-coverage.csv',
        ['شماره قرارداد', 'موضوع', 'طرف قرارداد', 'مبلغ مورد نیاز', 'تأمین‌شده', 'آزادشده', 'کمبود', 'درصد پوشش', 'اقلام ناقص', 'اقلام تأمین‌نشده', 'نزدیک‌ترین سررسید'],
        coverageRows.map((row) => [
          row.contract_number, row.contract_subject, row.party_name,
          row.required_total, row.fulfilled_total, row.released_total, row.balance_total,
          row.coverage_percent, row.partial_count, row.missing_count,
          row.next_expiry || '',
        ]),
      );
      return;
    }
    download(
      'guarantees-monitor.csv',
      ['شماره تضمین', 'قرارداد', 'طرف قرارداد', 'ابزار', 'نوع تضمین', 'بانک', 'مبلغ', 'تاریخ صدور', 'سررسید', 'روز مانده', 'وضعیت', 'تمدید', 'تقلیل'],
      filteredRows.map((row) => [
        row.number, row.g.contract_number || '', row.g.contract_party || '',
        row.g.instrument_type_display || '', row.g.guarantee_type_display || '', row.g.bank || '',
        row.amount, row.g.issue_date || '', row.due || '', row.days ?? '',
        row.status.label, row.g.extension_count || 0, row.g.reduction_count || 0,
      ]),
    );
  };

  if (isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }

  const currency = 'ریال';
  const coveragePercent = overviewSummary?.coverage_percent ?? null;


  return (
    <Box sx={{ pb: 1, minWidth: 0 }}>
      <PageHeader
        icon={<VerifiedUserIcon />}
        title="پایش تضامین قراردادها"
        subtitle="نمای کلی وضعیت تضامین، پوشش تعهدات هر قرارداد و هشدار سررسید ضمانت‌نامه‌ها"
        badge={(
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`${formatPersianNumber(rows.length)} تضمین ثبت‌شده`}
              sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.1), color: '#b45309' }} />
            {counts.expired ? (
              <Chip size="small" label={`${formatPersianNumber(counts.expired)} منقضی`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(DANGER, 0.1), color: DANGER }} />
            ) : null}
            {counts.expiring ? (
              <Chip size="small" label={`${formatPersianNumber(counts.expiring)} نزدیک انقضا`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(SOON, 0.12), color: SOON }} />
            ) : null}
          </Stack>
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" disabled={isFetching || overviewFetching} onClick={refreshAll}
                  sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => printElement('main', { title: 'پایش ضمانت‌نامه‌ها' })}>چاپ</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="contained" startIcon={<LockOpenIcon />} onClick={() => navigate('/contracts-guarantees')}
              sx={{ bgcolor: OK, '&:hover': { bgcolor: '#115e59' } }}>
              مدیریت تضامین
            </Button>
          </>
        )}
      />

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(6, minmax(0, 1fr))',
        },
        gap: 1, mb: 1.25, minWidth: 0,
      }}>
        <KpiTile label="کل مبلغ تضامین" value={compactMoney(totals.all, currency)}
          hint={`${formatPersianNumber(rows.length)} سند`} color={SLATE} icon={VerifiedUserIcon} />
        <KpiTile label="تضامین فعال" value={compactMoney(totals.active, currency)}
          hint={`${formatPersianNumber(rows.length - (counts.released || 0) - (counts.returned || 0))} سند جاری`}
          color={OK} icon={LockOpenIcon}
          onClick={() => { setTab('guarantees'); setStatusFilter('active'); setRangeFilter('all'); }} />
        <KpiTile label="نزدیک انقضا (۳۰ روز)" value={formatPersianNumber(counts.expiring || 0)}
          hint={compactMoney(totals.risk, currency)} color={SOON} icon={EventBusyIcon}
          onClick={() => { setTab('guarantees'); setRangeFilter('soon30'); setStatusFilter('all'); }} />
        <KpiTile label="منقضی‌شده" value={formatPersianNumber(counts.expired || 0)}
          hint={compactMoney(totals.expired, currency)} color={DANGER} icon={WarningAmberIcon}
          onClick={() => { setTab('guarantees'); setRangeFilter('expired'); setStatusFilter('all'); }} />
        <KpiTile label="آزادشده / استردادشده"
          value={formatPersianNumber((counts.released || 0) + (counts.returned || 0))}
          hint={compactMoney(totals.released, currency)} color={INFO} icon={UndoIcon}
          onClick={() => { setTab('guarantees'); setStatusFilter('released'); setRangeFilter('all'); }} />
        <KpiTile label="پوشش تعهدات قراردادها"
          value={coveragePercent === null ? '—' : `${toPersianDigits(coveragePercent)}٪`}
          hint={overviewSummary ? `کمبود ${compactMoney(overviewSummary.balance_total, currency)}` : 'در حال محاسبه…'}
          color={VIOLET} icon={GavelIcon} onClick={() => setTab('coverage')} />
      </Box>

      {(counts.expired || 0) > 0 ? (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 1, borderRadius: '12px', py: 0.35 }}>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
            <Typography sx={{ fontSize: 12 }}>
              {formatPersianNumber(counts.expired)} تضمین منقضی شده است؛ تمدید یا آزادسازی آن‌ها را بررسی کنید.
            </Typography>
            <Button size="small" variant="text"
              onClick={() => { setTab('guarantees'); setRangeFilter('expired'); setStatusFilter('all'); }}
              sx={{ fontSize: 11.5, fontWeight: 800, py: 0 }}>
              نمایش فهرست
            </Button>
          </Stack>
        </Alert>
      ) : null}

      {(counts.expiring || 0) > 0 ? (
        <Alert severity="warning" icon={<EventBusyIcon />} sx={{ mb: 1, borderRadius: '12px', py: 0.35 }}>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
            <Typography sx={{ fontSize: 12 }}>
              {formatPersianNumber(counts.expiring)} تضمین تا ۳۰ روز آینده منقضی می‌شود (مبلغ در معرض خطر: {compactMoney(totals.risk, currency)}).
            </Typography>
            <Button size="small" variant="text"
              onClick={() => { setTab('guarantees'); setRangeFilter('soon30'); setStatusFilter('all'); }}
              sx={{ fontSize: 11.5, fontWeight: 800, py: 0 }}>
              نمایش فهرست
            </Button>
          </Stack>
        </Alert>
      ) : null}

      {watchList.length ? (
        <Paper elevation={0} sx={{
          p: 1.25, mb: 1.25, borderRadius: '16px', border: '1px solid', overflow: 'hidden',
          borderColor: alpha(ACCENT, 0.28), bgcolor: alpha(ACCENT, 0.03), boxShadow: 'none',
        }}>
          <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap"
            sx={{ mb: 0.85, minWidth: 0 }}>
            <EventBusyIcon sx={{ fontSize: 17, color: WARN, flex: '0 0 auto' }} />
            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 900, flex: '0 0 auto' }}>
              سررسیدهای پیشرو تضامین
            </Typography>
            <Chip size="small" label="تا ۶۰ روز" sx={{ ...chipSx(WARN), flex: '0 0 auto' }} />
            <Typography noWrap sx={{ fontSize: 10.5, color: MUTED, flex: '1 1 auto', minWidth: 0 }}>
              نزدیک‌ترین سررسیدهای تضامین آزادنشده — برای جزئیات کلیک کنید.
            </Typography>
          </Stack>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            gap: 0.75,
            minWidth: 0,
          }}>
            {watchList.map((row) => (
              <Box
                key={`watch-${row.g.id}`}
                onClick={() => navigate(`/external-contracts/${row.g.contract}`)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  minWidth: 0, overflow: 'hidden',
                  px: 0.75, py: 0.55, borderRadius: '10px', cursor: 'pointer',
                  bgcolor: 'background.paper', border: '1px solid',
                  borderColor: alpha(daysColor(row.days), 0.22),
                  '&:hover': { bgcolor: alpha(daysColor(row.days), 0.06) },
                }}
              >
                <Chip size="small" label={daysLabel(row.days)}
                  sx={{ ...chipSx(daysColor(row.days)), height: 19, fontSize: 10, flex: '0 0 auto' }} />
                <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                  <Typography noWrap
                    title={`${row.g.guarantee_type_display || 'تضمین'} · ${row.number} · ${row.g.contract_subject || ''}`}
                    sx={{ fontSize: 11, fontWeight: 800, lineHeight: 1.5 }}>
                    {row.g.guarantee_type_display || 'تضمین'} · {row.number}
                  </Typography>
                  <Typography noWrap title={`${row.g.contract_subject || '—'} — سررسید ${dateLabel(row.due)}`}
                    sx={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>
                    {row.g.contract_subject || '—'} · {dateLabel(row.due)}
                  </Typography>
                </Box>
                <Typography noWrap title={`${money(row.amount)} ${currency}`}
                  sx={{
                    flex: '0 0 auto', maxWidth: '30%', fontSize: 10, fontWeight: 800,
                    color: daysColor(row.days), fontFamily: 'var(--hrms-table-number-font, inherit)',
                  }}>
                  {money(row.amount)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      ) : null}

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جستجو در شماره تضمین، شماره/موضوع قرارداد، طرف قرارداد یا بانک…"
        sort={sortBy}
        sortOptions={[
          { value: 'days', label: 'نزدیک‌ترین سررسید' },
          { value: 'amount', label: 'بیشترین مبلغ' },
          { value: 'contract', label: 'شماره قرارداد' },
        ]}
        onSort={setSortBy}
        filters={[
          { label: 'ابزار تضمین', value: instrumentFilter, options: instrumentOptions, onChange: setInstrumentFilter },
          { label: 'نوع تضمین', value: typeFilter, options: typeOptions, onChange: setTypeFilter },
          { label: 'وضعیت', value: statusFilter, options: statusOptions, onChange: setStatusFilter },
          { label: 'بازهٔ سررسید', value: rangeFilter, options: rangeOptions, onChange: setRangeFilter },
        ]}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
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
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          sx={{
            minHeight: 34, mb: 1,
            borderBottom: '1px solid', borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 34, py: 0.4, fontSize: 12, fontWeight: 800 },
            '& .MuiTabs-indicator': { bgcolor: ACCENT, height: 2.5, borderRadius: 2 },
          }}
        >
          <Tab value="guarantees" label={`فهرست تضامین (${formatPersianNumber(filteredRows.length)})`} />
          <Tab value="coverage" label={`پوشش تضامین قراردادها (${formatPersianNumber(coverageRows.length)})`} />
        </Tabs>

        {tab === 'guarantees' ? (
          <>
            <ModuleTable
              tableTheme={moduleTheme.tableTheme}
              ariaLabel="فهرست پایش تضامین"
              containerRef={tableRef}
              tableHeight={tableHeight}
              rowHeight={rowHeight}
              dimmed={isFetching}
              rows={pagedRows}
              rowKey={(row) => row.g.id}
              onRowClick={(row) => navigate(`/external-contracts/${row.g.contract}`)}
              emptyText="تضمینی با این شرایط یافت نشد."
              columns={[
                {
                  key: 'row', label: 'ردیف', width: '3.5%', align: 'center',
                  render: (_row, index) => (
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: MUTED }}>
                      {toPersianDigits(page * pageSize + index + 1)}
                    </Typography>
                  ),
                },
                {
                  key: 'number', label: 'شماره تضمین', width: '9%', align: 'center',
                  render: (row) => (
                    <Typography noWrap title={row.number}
                      sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {toPersianDigits(row.number)}
                    </Typography>
                  ),
                },
                {
                  key: 'contract', label: 'قرارداد', width: '18%',
                  render: (row) => (
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap title={row.g.contract_subject} sx={{ fontSize: 11.5, fontWeight: 800 }}>
                        {row.g.contract_subject || '—'}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
                        {row.g.contract_number ? `شماره ${toPersianDigits(row.g.contract_number)}` : '—'}
                        {row.g.contract_guarantee_label ? ` · ${row.g.contract_guarantee_label}` : ''}
                      </Typography>
                    </Box>
                  ),
                },
                {
                  key: 'party', label: 'طرف قرارداد', width: '11%',
                  render: (row) => (
                    <Typography noWrap title={row.g.contract_party} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                      {row.g.contract_party || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'instrument', label: 'ابزار / نوع', width: '10%', align: 'center',
                  render: (row) => {
                    const meta = INSTRUMENT_META[row.g.instrument_type]
                      || { label: row.g.instrument_type_display || '—', color: SLATE };
                    return (
                      <Stack spacing={0.3} alignItems="center">
                        <Chip size="small" label={meta.label} sx={chipSx(meta.color)} />
                        <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
                          {row.g.guarantee_type_display || GUARANTEE_TYPE_LABELS[row.g.guarantee_type] || '—'}
                        </Typography>
                      </Stack>
                    );
                  },
                },
                {
                  key: 'amount', label: 'مبلغ', width: '11%', align: 'center',
                  render: (row) => (
                    <Typography noWrap title={`${money(row.amount)} ${currency}`}
                      sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {money(row.amount)}
                    </Typography>
                  ),
                },
                {
                  key: 'expiry', label: 'سررسید', width: '9%', align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {dateLabel(row.due)}
                    </Typography>
                  ),
                },
                {
                  key: 'days', label: 'روز مانده', width: '8.5%', align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: daysColor(row.days) }}>
                      {['released', 'returned'].includes(row.status.key) ? '—' : daysLabel(row.days)}
                    </Typography>
                  ),
                },
                {
                  key: 'history', label: 'سابقه', width: '8%', align: 'center',
                  render: (row) => {
                    const extensions = row.g.extension_count || 0;
                    const reductions = row.g.reduction_count || 0;
                    if (!extensions && !reductions) {
                      return <Typography sx={{ fontSize: 10, color: MUTED }}>—</Typography>;
                    }
                    return (
                      <Stack direction="row" spacing={0.3} useFlexGap justifyContent="center" flexWrap="wrap">
                        {extensions ? (
                          <Tooltip title={`${toPersianDigits(extensions)} بار تمدید`}>
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center', gap: 0.2, px: 0.4,
                              borderRadius: '6px', bgcolor: alpha(INFO, 0.1), color: INFO,
                            }}>
                              <UpdateIcon sx={{ fontSize: 11 }} />
                              <Typography sx={{ fontSize: 9.5, fontWeight: 800 }}>{toPersianDigits(extensions)}</Typography>
                            </Box>
                          </Tooltip>
                        ) : null}
                        {reductions ? (
                          <Tooltip title={`${toPersianDigits(reductions)} بار تقلیل`}>
                            <Box sx={{
                              display: 'inline-flex', alignItems: 'center', gap: 0.2, px: 0.4,
                              borderRadius: '6px', bgcolor: alpha(VIOLET, 0.1), color: VIOLET,
                            }}>
                              <TrendingDownIcon sx={{ fontSize: 11 }} />
                              <Typography sx={{ fontSize: 9.5, fontWeight: 800 }}>{toPersianDigits(reductions)}</Typography>
                            </Box>
                          </Tooltip>
                        ) : null}
                      </Stack>
                    );
                  },
                },
                {
                  key: 'status', label: 'وضعیت', width: '8.5%', align: 'center',
                  render: (row) => (
                    <Chip size="small" label={row.status.label} sx={chipSx(row.status.color, row.status.bg)} />
                  ),
                },
                {
                  key: 'actions', label: 'عملیات', width: '3.5%', align: 'center',
                  render: (row) => (
                    <Stack direction="row" spacing={0.1} useFlexGap justifyContent="center"
                      onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="پرونده قرارداد">
                        <IconButton size="small" aria-label="پرونده قرارداد"
                          onClick={() => navigate(`/external-contracts/${row.g.contract}`)}>
                          <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
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
              total={filteredRows.length}
              pageSize={pageSize}
              unit="سند"
            />
          </>
        ) : null}

        {tab === 'coverage' ? (
          <>
            {overviewError ? (
              <Alert severity="info" sx={{ mb: 1, borderRadius: '12px', py: 0.35 }}>
                <Typography sx={{ fontSize: 12 }}>
                  نمای پوشش تضامین قراردادها در دسترس نیست؛ فهرست تضامین در تب اول قابل استفاده است.
                </Typography>
              </Alert>
            ) : null}
            {overviewSummary ? (
              <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                <Chip size="small" sx={chipSx(SLATE)}
                  label={`قراردادهای پایش‌شده: ${formatPersianNumber(overviewSummary.contracts)}`} />
                <Chip size="small" sx={chipSx(OK)}
                  label={`تأمین‌شده: ${compactMoney(overviewSummary.fulfilled_total, currency)}`} />
                <Chip size="small" sx={chipSx(INFO)}
                  label={`آزادشده: ${compactMoney(overviewSummary.released_total, currency)}`} />
                <Chip size="small" sx={chipSx(DANGER)}
                  label={`کمبود: ${compactMoney(overviewSummary.balance_total, currency)}`} />
                <Chip size="small" sx={chipSx(VIOLET)}
                  label={`پوشش کل: ${toPersianDigits(overviewSummary.coverage_percent)}٪`} />
                {overviewSummary.missing_contracts ? (
                  <Chip size="small" sx={chipSx(DANGER)}
                    label={`${formatPersianNumber(overviewSummary.missing_contracts)} قرارداد با قلم تأمین‌نشده`} />
                ) : null}
                {overviewSummary.partial_contracts ? (
                  <Chip size="small" sx={chipSx(WARN)}
                    label={`${formatPersianNumber(overviewSummary.partial_contracts)} قرارداد با پوشش ناقص`} />
                ) : null}
              </Stack>
            ) : null}
            <ModuleTable
              tableTheme={moduleTheme.tableTheme}
              ariaLabel="پوشش تضامین قراردادها"
              containerRef={coverageRef}
              tableHeight={coverageTableHeight}
              rowHeight={coverageRowHeight}
              dimmed={overviewFetching}
              rows={pagedCoverage}
              rowKey={(row) => row.contract}
              onRowClick={(row) => navigate(`/external-contracts/${row.contract}`)}
              emptyText="قراردادی با اقلام تضمین برای نمایش نیست."
              columns={[
                {
                  key: 'row', label: 'ردیف', width: '4%', align: 'center',
                  render: (_row, index) => (
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: MUTED }}>
                      {toPersianDigits(coverageState.page * pageSize + index + 1)}
                    </Typography>
                  ),
                },
                {
                  key: 'contract', label: 'قرارداد', width: '22%',
                  render: (row) => (
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap title={row.contract_subject} sx={{ fontSize: 11.5, fontWeight: 800 }}>
                        {row.contract_subject || '—'}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
                        {row.contract_number ? `شماره ${toPersianDigits(row.contract_number)}` : '—'}
                      </Typography>
                    </Box>
                  ),
                },
                {
                  key: 'party', label: 'طرف قرارداد', width: '12%',
                  render: (row) => (
                    <Typography noWrap title={row.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                      {row.party_name || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'required', label: 'مورد نیاز', width: '10%', align: 'center',
                  render: (row) => (
                    <Typography noWrap title={money(row.required_total)}
                      sx={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {money(row.required_total)}
                    </Typography>
                  ),
                },
                {
                  key: 'fulfilled', label: 'تأمین‌شده', width: '10%', align: 'center',
                  render: (row) => (
                    <Typography noWrap title={money(row.fulfilled_total)}
                      sx={{ fontSize: 11, fontWeight: 800, color: OK, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {money(row.fulfilled_total)}
                    </Typography>
                  ),
                },
                {
                  key: 'released', label: 'آزادشده', width: '9%', align: 'center',
                  render: (row) => (
                    <Typography noWrap title={money(row.released_total)}
                      sx={{ fontSize: 11, fontWeight: 800, color: INFO, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {money(row.released_total)}
                    </Typography>
                  ),
                },
                {
                  key: 'balance', label: 'کمبود', width: '9%', align: 'center',
                  render: (row) => (
                    <Typography noWrap title={money(row.balance_total)}
                      sx={{
                        fontSize: 11, fontWeight: 800,
                        color: Number(row.balance_total) > 0 ? DANGER : MUTED,
                        fontFamily: 'var(--hrms-table-number-font, inherit)',
                      }}>
                      {money(row.balance_total)}
                    </Typography>
                  ),
                },
                {
                  key: 'coverage', label: 'درصد پوشش', width: '14%', align: 'center',
                  render: (row) => {
                    const percent = Math.max(0, Math.min(100, Number(row.coverage_percent) || 0));
                    const color = percent >= 100 ? OK : percent >= 60 ? WARN : DANGER;
                    return (
                      <Stack spacing={0.25} sx={{ width: '100%', px: 0.4 }}>
                        <LinearProgress variant="determinate" value={percent}
                          sx={{
                            height: 5, borderRadius: 3, bgcolor: alpha(color, 0.14),
                            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                          }} />
                        <Typography sx={{ fontSize: 9.5, fontWeight: 800, color }}>
                          {toPersianDigits(row.coverage_percent)}٪
                        </Typography>
                      </Stack>
                    );
                  },
                },
                {
                  key: 'items', label: 'اقلام', width: '6%', align: 'center',
                  render: (row) => (
                    <Tooltip title={`تأمین‌شده ${row.provided_count} · آزادشده ${row.released_count} · ناقص ${row.partial_count} · تأمین‌نشده ${row.missing_count}`}>
                      <Stack spacing={0.25} alignItems="center">
                        {row.missing_count ? (
                          <Chip size="small" label={`${toPersianDigits(row.missing_count)} ناقص`} sx={chipSx(DANGER)} />
                        ) : row.partial_count ? (
                          <Chip size="small" label={`${toPersianDigits(row.partial_count)} جزئی`} sx={chipSx(WARN)} />
                        ) : (
                          <Chip size="small" label="کامل" sx={chipSx(OK)} />
                        )}
                        <Typography noWrap sx={{ fontSize: 9, color: MUTED }}>
                          سررسید {row.next_expiry ? toJalali(row.next_expiry) : '—'}
                        </Typography>
                      </Stack>
                    </Tooltip>
                  ),
                },
                {
                  key: 'actions', label: 'عملیات', width: '4%', align: 'center',
                  render: (row) => (
                    <Stack direction="row" spacing={0.1} useFlexGap justifyContent="center"
                      onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="پرونده قرارداد">
                        <IconButton size="small" aria-label="پرونده قرارداد"
                          onClick={() => navigate(`/external-contracts/${row.contract}`)}>
                          <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ),
                },
              ]}
            />
            <ModulePager
              tableTheme={moduleTheme.tableTheme}
              page={coverageState.page}
              onPage={coverageState.setPage}
              totalPages={coverageState.totalPages}
              pageNumbers={coverageState.pageNumbers}
              total={coverageRows.length}
              pageSize={pageSize}
              unit="قرارداد"
            />
          </>
        ) : null}

        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
          sx={{ pt: 1.25, mt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Chip size="small" label={`معتبر: ${formatPersianNumber(counts.active || 0)}`}
            sx={chipSx(OK)} />
          <Chip size="small" label={`نزدیک انقضا: ${formatPersianNumber(counts.expiring || 0)}`}
            sx={chipSx(WARN)} />
          <Chip size="small" label={`منقضی: ${formatPersianNumber(counts.expired || 0)}`}
            sx={chipSx(DANGER)} />
          <Chip size="small" label={`آزادشده: ${formatPersianNumber(counts.released || 0)}`}
            sx={chipSx(INFO)} />
          <Chip size="small" label={`اجرا/ضبط: ${formatPersianNumber(counts.executed || 0)}`}
            sx={chipSx(DANGER)} />
          <Chip size="small" label={`ابطال: ${formatPersianNumber(counts.canceled || 0)}`}
            sx={chipSx(VIOLET)} />
          <Chip size="small" label={`مبلغ کل: ${compactMoney(totals.all, currency)}`}
            sx={chipSx(SLATE)} />
          <Chip size="small" label={`مبلغ در معرض خطر: ${compactMoney(totals.risk, currency)}`}
            sx={chipSx(VIOLET)} />
        </Stack>
      </Paper>
    </Box>
  );
};

export default ContractGuaranteesMonitorPage;
