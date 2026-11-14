import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogContent,
  DialogTitle, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { alpha, useTheme } from '@mui/material/styles';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import Timeline from '../core/components/ui/Timeline';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import usePrintDocument from '../core/print/usePrintDocument';
import PrintPreviewDialog from '../core/print/PrintPreviewDialog';
import { useModulePalette } from '../core/context/ModulePaletteContext';
import { useDesignTokens } from '../core/context/DesignTokenContext';
import { SurfaceCard } from './accounting/AccountingDashboardUI';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';

const PAGE_SIZE = 20;
const VISIBLE_ROWS = 12;
const SORT_OPTIONS = [
  { value: '-date', label: 'تاریخ (جدیدترین)' },
  { value: 'date', label: 'تاریخ (قدیمی‌ترین)' },
  { value: '-created_at', label: 'ایجاد (جدیدترین)' },
];

const useDebounced = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const pickRows = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const RowActions = ({ row, onEdit, onPrint, onTimeline, onDelete, onRestore }) => (
  <Stack direction="row" spacing={0.25} useFlexGap justifyContent="center"
    onClick={(event) => event.stopPropagation()}>
    <Tooltip title={row.is_editable ? 'ویرایش صورت' : 'این صورت هزینه قابل ویرایش نیست'}>
      <span>
        <IconButton size="small" color="primary" disabled={!row.is_editable}
          aria-label="ویرایش صورت" onClick={() => onEdit(row)}>
          <EditIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </span>
    </Tooltip>
    <Tooltip title="پیش‌نمایش و چاپ">
      <IconButton size="small" aria-label="پیش‌نمایش و چاپ" onClick={() => onPrint(row)}>
        <PrintIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
    <Tooltip title="تایم‌لاین">
      <IconButton size="small" color="info" aria-label="تایم‌لاین" onClick={() => onTimeline(row)}>
        <HistoryIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
    {row.is_deleted ? (
      <Tooltip title="بازیابی">
        <IconButton size="small" color="success" aria-label="بازیابی" onClick={() => onRestore(row)}>
          <RestoreIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    ) : (row.is_editable ? (
      <Tooltip title="حذف (نرم)">
        <IconButton size="small" color="error" aria-label="حذف صورت" onClick={() => onDelete(row)}>
          <DeleteIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    ) : null)}
  </Stack>
);

const PettyCashExpensesPage = () => {
  const qc = useQueryClient();
  const print = usePrintDocument();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { tokens } = useDesignTokens();
  const { getPalette } = useModulePalette();
  const baseTheme = useModuleTheme();

  const moduleTheme = useMemo(() => {
    const base = baseTheme.tableTheme;
    return {
      ...baseTheme,
      tableTheme: {
        ...base,
        singleLine: true,
        visibleRows: VISIBLE_ROWS,
        rowsPerPage: PAGE_SIZE,
        tableHeight: Math.round(base.headerHeight + base.rowHeight * VISIBLE_ROWS),
      },
    };
  }, [baseTheme]);

  const accent = getPalette('pettycash')?.accent || tokens.colors?.warning || '#f59e0b';
  const OK = tokens.colors?.success || theme.palette.success.main;
  const WARN = tokens.colors?.warning || theme.palette.warning.main;
  const INFO = tokens.colors?.info || theme.palette.info.main;
  const DANGER = tokens.colors?.danger || theme.palette.error.main;
  const MUTED = tokens.colors?.textSecondary || theme.palette.text.secondary;
  const BORDER = tokens.colors?.border || theme.palette.divider;

  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const [status, setStatus] = useState('');
  const [fund, setFund] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ordering, setOrdering] = useState('-date');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(0);
  const [timeline, setTimeline] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (location.state?.flash) {
      setMsg({ ok: true, text: location.state.flash });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const listParams = useMemo(() => {
    const params = { page: page + 1, page_size: PAGE_SIZE, ordering };
    const term = search.trim();
    if (term) params.search = term;
    if (status) params.status = status;
    if (fund) params.fund = fund;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (showDeleted) params.include_deleted = '1';
    return params;
  }, [page, ordering, search, status, fund, dateFrom, dateTo, showDeleted]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['petty-expenses', listParams],
    queryFn: () => axiosInstance.get('/petty-cash-expense-statements/', { params: listParams })
      .then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30000,
  });
  const { data: fundsData } = useQuery({
    queryKey: ['pc-funds-list'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/').then((response) => response.data),
    staleTime: 60000,
  });

  const rows = pickRows(data);
  const total = Number(data?.count ?? rows.length);
  const fundList = pickRows(fundsData);
  const pageTotal = rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);

  useEffect(() => { setPage(0); }, [search, status, fund, dateFrom, dateTo, ordering, showDeleted]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);
  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    return Array.from({ length: Math.max(0, Math.min(totalPages, start + size) - start) }, (_v, i) => start + i);
  }, [page, totalPages]);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, rows.length);

  const resetFilters = () => {
    setStatus(''); setFund(''); setDateFrom(''); setDateTo('');
    setOrdering('-date'); setQ(''); setShowDeleted(false);
  };
  const activeFilters = [status, fund, dateFrom, dateTo].filter(Boolean).length;
  const activeChips = [
    status ? { key: 'status', label: `وضعیت: ${status}`, clear: () => setStatus('') } : null,
    fund ? {
      key: 'fund',
      label: `تنخواه: ${fundList.find((row) => String(row.id) === String(fund))?.title || fund}`,
      clear: () => setFund(''),
    } : null,
    dateFrom ? { key: 'from', label: `از ${toJalali(dateFrom)}`, clear: () => setDateFrom('') } : null,
    dateTo ? { key: 'to', label: `تا ${toJalali(dateTo)}`, clear: () => setDateTo('') } : null,
    showDeleted ? { key: 'deleted', label: 'شامل حذف‌شده‌ها', clear: () => setShowDeleted(false) } : null,
  ].filter(Boolean);


  const statusMeta = (value) => ({
    draft: { label: 'پیش‌نویس', color: MUTED },
    submitted: { label: 'در انتظار تأیید', color: WARN },
    approved: { label: 'تأییدشده', color: INFO },
    posted: { label: 'ثبت‌شده', color: OK },
    rejected: { label: 'برگشت‌خورده', color: DANGER },
    edited: { label: 'ویرایش‌شده', color: INFO },
  }[value] || { label: value, color: MUTED });

  const refresh = () => qc.invalidateQueries({ queryKey: ['petty-expenses'] });
  const onError = (error) => setMsg({
    ok: false,
    text: error.response?.data?.error || 'خطا در انجام عملیات',
  });

  const act = useMutation({
    mutationFn: ({ id, action }) => axiosInstance.post(`/petty-cash-expense-statements/${id}/${action}/`),
    onSuccess: () => { refresh(); setMsg({ ok: true, text: 'عملیات انجام شد' }); },
    onError,
  });

  const openPrint = (row) => print.openDocument({
    document: 'petty-statement',
    payload: { id: row.id },
    options: { paper: 'A4', orientation: 'landscape' },
  });

  const onEdit = (row) => {
    if (!row.is_editable) return;
    navigate(`/petty-cash/expenses/${row.id}/edit`);
  };

  const onDelete = (row) => {
    if (!window.confirm('این صورت هزینه به سطل بازیافت منتقل شود؟')) return;
    act.mutate({ id: row.id, action: 'soft_delete' });
  };

  const onRestore = (row) => act.mutate({ id: row.id, action: 'restore' });

  const cellFont = moduleTheme.tableTheme.cell.fontSize;
  const numberFont = 'var(--hrms-table-number-font, inherit)';
  const columns = [
    {
      key: 'number', label: 'شماره صورت', width: '12%', align: 'center',
      render: (row) => (
        <Typography noWrap sx={{ fontSize: cellFont, fontWeight: 800, color: accent }}>
          {toPersianDigits(row.number || `#${row.id}`)}
        </Typography>
      ),
    },
    {
      key: 'date', label: 'تاریخ', width: '9%', align: 'center',
      render: (row) => (
        <Typography noWrap sx={{ fontSize: cellFont, fontWeight: 700, fontFamily: numberFont }}>
          {row.date ? toJalali(row.date) : '—'}
        </Typography>
      ),
    },
    {
      key: 'fund', label: 'تنخواه', width: '18%',
      render: (row) => (
        <Typography noWrap title={row.fund_title} sx={{ fontSize: cellFont, fontWeight: 700 }}>
          {row.fund_title || '—'}
        </Typography>
      ),
    },
    {
      key: 'custodian', label: 'تنخواه‌دار', width: '14%',
      render: (row) => (
        <Typography noWrap title={row.custodian_name} sx={{ fontSize: cellFont }}>
          {row.custodian_name || '—'}
        </Typography>
      ),
    },
    {
      key: 'description', label: 'شرح', width: '23%',
      render: (row) => (
        <Typography noWrap title={row.description} sx={{ fontSize: cellFont }}>
          {row.description || '—'}
        </Typography>
      ),
    },
    {
      key: 'total', label: 'مبلغ (ریال)', width: '13%', align: 'center',
      render: (row) => (
        <Typography noWrap sx={{ fontSize: cellFont, fontWeight: 800, fontFamily: numberFont, color: accent }}>
          {formatPersianNumber(row.total || 0)}
        </Typography>
      ),
    },
    {
      key: 'status', label: 'وضعیت', width: '11%', align: 'center',
      render: (row) => {
        const meta = statusMeta(row.status);
        return (
          <Chip size="small" label={row.is_deleted ? 'حذف‌شده' : meta.label}
            sx={{
              height: 23, fontSize: 11, fontWeight: 800,
              bgcolor: alpha(row.is_deleted ? MUTED : meta.color, 0.10),
              color: row.is_deleted ? MUTED : meta.color,
            }} />
        );
      },
    },
    {
      key: 'actions', label: 'عملیات', width: '14%', align: 'center',
      render: (row) => (
        <RowActions row={row} onEdit={onEdit} onPrint={openPrint}
          onTimeline={setTimeline} onDelete={onDelete} onRestore={onRestore} />
      ),
    },
  ];


  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<ReceiptLongIcon />}
        title="صورت ریز هزینه‌ها"
        badge={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            <Chip size="small" label={`${toPersianDigits(total)} صورت`}
              sx={{ height: 24, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
            {rows.some((row) => row.status === 'submitted') ? (
              <Chip size="small" icon={<PendingActionsIcon sx={{ fontSize: 14 }} />}
                label={`${toPersianDigits(rows.filter((row) => row.status === 'submitted').length)} در انتظار`}
                sx={{ height: 24, fontWeight: 800, bgcolor: alpha(WARN, 0.10), color: WARN }} />
            ) : null}
          </Stack>
        )}
        sx={{ mb: 1.5, py: 1 }}
        actions={(
          <>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />}
              onClick={() => refetch()} disabled={isFetching}>
              به‌روزرسانی
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              onClick={() => navigate('/petty-cash/expenses/new')}>
              صورت هزینه جدید
            </Button>
          </>
        )}
      />

      {msg ? (
        <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}
          sx={{ mb: 1.25, borderRadius: 'var(--hrms-radius, 12px)', fontSize: 13 }}>
          {msg.text}
        </Alert>
      ) : null}

      <ModuleToolbar
        theme={moduleTheme}
        search={q}
        onSearch={setQ}
        searchPlaceholder="جستجوی شماره، شرح، تنخواه یا تنخواه‌دار…"
        sort={ordering}
        sortOptions={SORT_OPTIONS}
        onSort={setOrdering}
        activeChips={activeChips}
        activeFilterCount={activeFilters + (showDeleted ? 1 : 0)}
        onReset={resetFilters}
        filtersOpen={false}
        setFiltersOpen={setFiltersOpen}
      />


      {filtersOpen ? (
        <Paper elevation={0} sx={{
          p: 1.25, mb: 1.5, borderRadius: 'var(--hrms-radius-large, 16px)',
          border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
        }}>
          <Box sx={{
            display: 'grid', gap: 1,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
            alignItems: 'center',
          }}>
            <Autocomplete
              size="small" options={fundList}
              value={fundList.find((row) => String(row.id) === String(fund)) || null}
              onChange={(_event, option) => setFund(option ? option.id : '')}
              getOptionLabel={(option) => `${option.code || ''} — ${option.title || ''}`}
              isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
              renderInput={(params) => <TextField {...params} size="small" label="تنخواه" />}
            />
            <TextField size="small" select label="وضعیت" value={status}
              onChange={(event) => setStatus(event.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {Object.entries({
                draft: 'پیش‌نویس', submitted: 'در انتظار تأیید', approved: 'تأییدشده',
                posted: 'ثبت‌شده', rejected: 'برگشت‌خورده', edited: 'ویرایش‌شده',
              }).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <JalaliDatePicker noHelper label="از تاریخ" value={dateFrom}
              onChange={setDateFrom} sx={{ width: '100%' }} />
            <JalaliDatePicker noHelper label="تا تاریخ" value={dateTo}
              onChange={setDateTo} sx={{ width: '100%' }} />
            <Stack direction="row" spacing={1} useFlexGap alignItems="center" flexWrap="wrap"
              sx={{ gridColumn: { xs: 'auto', lg: '1 / -1' } }}>
              <Chip size="small" clickable
                label={showDeleted ? 'شامل حذف‌شده‌ها' : 'بدون حذف‌شده‌ها'}
                color={showDeleted ? 'warning' : 'default'} onClick={() => setShowDeleted((prev) => !prev)}
                sx={{ fontWeight: 800 }} />
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="text" startIcon={<FilterAltIcon />} onClick={resetFilters}>
                پاک کردن فیلترها
              </Button>
            </Stack>
          </Box>
        </Paper>
      ) : null}


      <SurfaceCard
        title="فهرست صورت‌های هزینه"
        icon={ReceiptLongIcon}
        color={accent}
        contentSx={{ p: 0 }}
        action={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            <Chip size="small" label={`${toPersianDigits(rows.length)} ردیف در صفحه`}
              sx={{ height: 23, fontWeight: 800 }} />
            <Chip size="small" label={`جمع صفحه: ${formatPersianNumber(pageTotal)}`}
              sx={{ height: 23, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
          </Stack>
        )}
      >
        {isLoading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress size={26} /></Box>
        ) : (
          <>
            <ModuleTable
              tableTheme={moduleTheme.tableTheme}
              ariaLabel="فهرست صورت‌های هزینهٔ تنخواه"
              containerRef={tableRef}
              tableHeight={tableHeight}
              rowHeight={rowHeight}
              dimmed={isFetching}
              rows={rows}
              rowKey={(row) => row.id}
              onRowClick={(row) => { if (row.is_editable) onEdit(row); }}
              emptyText="صورت هزینه‌ای با این شرایط یافت نشد."
              minWidth={1120}
              columns={columns}
            />
            <ModulePager
              tableTheme={moduleTheme.tableTheme}
              page={page}
              onPage={setPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              total={total}
              pageSize={PAGE_SIZE}
              unit="صورت"
            />
          </>
        )}
      </SurfaceCard>

      <Dialog open={Boolean(timeline)} onClose={() => setTimeline(null)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 'var(--hrms-radius-large, 18px)', bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px', bgcolor: alpha(accent, 0.10), color: accent,
              border: `1px solid ${alpha(accent, 0.20)}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HistoryIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900 }}>تایم‌لاین صورت هزینه</Typography>
              <Typography sx={{ fontSize: 11.5, color: MUTED }}>
                شماره {toPersianDigits(timeline?.number || `#${timeline?.id || ''}`)}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}><Timeline events={timeline?.history} /></DialogContent>
      </Dialog>

      <PrintPreviewDialog
        open={print.open}
        title={print.title || 'چاپ صورت ریز هزینهٔ تنخواه'}
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

export default PettyCashExpensesPage;

