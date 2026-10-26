import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Collapse,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { formatPersianNumber, toPersianDigits, normalizeCurrencyLabel } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import downloadFile from '../core/utils/downloadUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { useDesignTokens } from '../core/context/DesignTokenContext';
import { resolveTableTheme, tableTypographySx } from '../core/theme/tableStyles';
import { withAlpha } from '../core/utils/colorUtils';
import { resolveToolbarTheme } from '../core/theme/toolbarStyles';

const currencyUnit = (contract) => normalizeCurrencyLabel(contract?.currency_name || contract?.currency_symbol);

// روزهای باقی‌مانده تا پایان (مبتنی بر تاریخ مؤثر با الحاقیه؛ بر پایهٔ روز محلی)
const parseDay = (value) => {
  const parts = String(value || '').slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};
const daysUntil = (value) => {
  const target = parseDay(value);
  if (!target) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
};
const remainMeta = (days) => {
  if (days === null) return { label: '—', color: '#64748b', bg: 'rgba(100,116,139,0.12)' };
  if (days < 0) return { label: `منقضی (${toPersianDigits(Math.abs(days))} روز)`, color: '#b91c1c', bg: 'rgba(239,68,68,0.12)' };
  if (days === 0) return { label: 'آخرین روز', color: '#b45309', bg: 'rgba(245,158,11,0.16)' };
  if (days <= 60) return { label: `${toPersianDigits(days)} روز`, color: '#b45309', bg: 'rgba(245,158,11,0.14)' };
  return { label: `${toPersianDigits(days)} روز`, color: '#047857', bg: 'rgba(16,185,129,0.14)' };
};

/* ترتیب نمایش — مستقل از فیلترهاست: نه در شمارش فیلترها می‌آید، نه چیپ فیلتر می‌سازد.
 * فیلدها همان فیلدهای قابل مرتب‌سازی سرور هستند (OrderingFilter روی ContractSerializer). */
const SORT_OPTIONS = [
  { value: '-created_at', label: 'جدیدترین' },
  { value: 'created_at', label: 'قدیمی‌ترین' },
  { value: '-start_date', label: 'شروع: جدیدترین' },
  { value: 'end_date', label: 'پایان: نزدیک‌ترین' },
  { value: '-amount', label: 'مبلغ: بیشترین' },
  { value: 'amount', label: 'مبلغ: کمترین' },
  { value: 'number', label: 'شماره: صعودی' },
  { value: '-number', label: 'شماره: نزولی' },
];
const DEFAULT_SORT = SORT_OPTIONS[0].value;

const headCellSx = {
  fontWeight: 800, fontSize: 12, color: '#334155', whiteSpace: 'nowrap',
  // پس‌زمینهٔ مات (بدون شفافیت) تا هنگام اسکرول محتوای جدول از زیر هدر دیده نشود
  backgroundColor: '#f1f5f9',
  borderBottom: '1px solid rgba(15,23,42,0.14)',
  py: 1.1,
};
const bodyCellSx = {
  whiteSpace: 'nowrap', fontSize: 12.5,
  borderBottom: '1px solid rgba(15,23,42,0.06)', py: 0.9,
};
// تراز صریح (inline) تا قاعدهٔ سراسری «[dir=rtl] .MuiTableCell-root» بازنویسی نکند
const CENTER = { textAlign: 'center' };
const RIGHT = { textAlign: 'right' };

/** سلکت فیلتر با تراز برچسب توکن‌محور (بالای فیلد / درون فیلد / مخفی). */
const FilterSelect = ({ label, value, options, onChange, labelsPosition, radius = 8 }) => (
  <Box>
    {labelsPosition === 'above' ? (
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
    ) : null}
    <FormControl size="small" fullWidth>
      {labelsPosition === 'inline' ? <InputLabel>{label}</InputLabel> : null}
      <Select
        value={value || ''}
        label={labelsPosition === 'inline' ? label : undefined}
        displayEmpty={labelsPosition !== 'inline'}
        onChange={(event) => onChange(event.target.value)}
        sx={{ fontSize: 12.5, borderRadius: `${radius}px`, bgcolor: 'background.paper' }}
        renderValue={(selected) => {
          const match = options.find((option) => String(option.value) === String(selected));
          if (!match || match.value === '') {
            return <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>همه</Typography>;
          }
          return <Typography component="span" sx={{ fontSize: 12, fontWeight: 700 }}>{match.label}</Typography>;
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  </Box>
);

const TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا',
  purchase: 'خرید',
  tender: 'مناقصه',
  consulting: 'مشاوره',
  service: 'خدمات',
  other: 'سایر',
};

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'در حال اجرا',
  suspended: 'متوقف',
  completed: 'تکمیل شده',
  terminated: 'فسخ شده',
};

const STATUS_COLORS = {
  draft: '#64748b',
  active: '#10b981',
  suspended: '#f59e0b',
  completed: '#3b82f6',
  terminated: '#ef4444',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: 'background.paper',
    '&:hover': { backgroundColor: 'background.paper' },
    '&.Mui-focused': { backgroundColor: 'background.paper' },
  },
};

const ExternalContractsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT);
  const [filtersOpen, setFiltersOpen] = useState(null);
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(true);
  const [exporting, setExporting] = useState(false);

  /* ---- توکن‌های جدول از استودیوی تم (تایپوگرافی، رنگ، خط جداکننده، قاب) ---- */
  const { tokens } = useDesignTokens();
  const tableTokens = tokens?.tables || {};
  const tableTheme = resolveTableTheme(tokens);
  const cellPadding = tableTokens.variant === 'compact' ? 6 : tableTokens.variant === 'spacious' ? 12 : tableTheme.cellPadding;
  const tableFrameSx = tableTheme.frame
    ? { px: `${tableTheme.frameX}px`, py: `${tableTheme.frameY}px` }
    : {};

  const pageSize = tableTheme.rowsPerPage;
  const { data: contractsPage, isLoading, isFetching } = useQuery({
    queryKey: ['external-contracts', { page, pageSize, search, statusFilter, typeFilter, sortOrder }],
    queryFn: async () => {
      // صفحه‌بندی سمت سرور: فقط همان ۲۰ ردیف لازم خوانده می‌شود (بارگذاری سریع‌تر).
      const response = await axiosInstance.get('/external-contracts/', {
        params: {
          page: page + 1,
          page_size: pageSize,
          ordering: sortOrder,
          ...(search ? { search } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(typeFilter ? { contract_type_master: typeFilter } : {}),
        },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return { rows: payload, count: payload.length };
      return { rows: payload?.results || [], count: Number(payload?.count || 0) };
    },
    // صفحهٔ قبلی تا رسیدن پاسخ صفحهٔ جدید نگه داشته می‌شود؛ در غیر این صورت count صفر
    // می‌شود و افکت اصلاح محدوده، کاربر را اشتباهاً به صفحهٔ اول برمی‌گرداند.
    placeholderData: (previous) => previous,
  });
  const rows = contractsPage?.rows || [];
  const totalCount = contractsPage?.count || 0;

  /* ---- ارتفاع جدول بر اساس ارتفاع واقعی ردیف‌ها ----
   * توکن rowHeight فقط یک مبنای طراحی است؛ ارتفاع واقعی هر ردیف به ارتفاع
   * محتوای سلول (چیپ وضعیت، تایپوگرافی) و padding سراسری بستگی دارد.
   * اگر ارتفاع توکن مبنا قرار گیرد، «۱۳ ردیف» در عمل به ۱۰.۵ ردیف تبدیل می‌شود؛
   * پس ارتفاع واقعی ردیف/هدر اندازه‌گیری می‌شود.
   */
  const tableScrollRef = useRef(null);
  const [measuredRowPx, setMeasuredRowPx] = useState(0);
  const [measuredHeadPx, setMeasuredHeadPx] = useState(0);
  const measureTableRows = () => {
    const host = tableScrollRef.current;
    if (!host) return;
    const rowEl = host.querySelector('tbody tr');
    const headEl = host.querySelector('thead tr');
    const rowPx = rowEl ? Math.round(rowEl.getBoundingClientRect().height) : 0;
    const headPx = headEl ? Math.round(headEl.getBoundingClientRect().height) : 0;
    setMeasuredRowPx((prev) => (prev === rowPx ? prev : rowPx));
    setMeasuredHeadPx((prev) => (prev === headPx ? prev : headPx));
  };
  useLayoutEffect(measureTableRows, [rows.length, tableTheme.rowHeight, tableTheme.headerHeight, tableTokens.variant]);
  useEffect(() => {
    const onResize = () => measureTableRows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const effectiveRowPx = measuredRowPx > 0 ? measuredRowPx : tableTheme.rowHeight;
  const effectiveHeadPx = measuredHeadPx > 0 ? measuredHeadPx : tableTheme.headerHeight;
  /* ارتفاع ثابت می‌ماند تا با رفتن به صفحهٔ آخر، جدول جمع نشود */
  const tableHeight = Math.round(effectiveHeadPx + effectiveRowPx * tableTheme.visibleRows);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  // با تغییر جستجو/فیلترها/ترتیب به صفحهٔ اول برگرد
  useEffect(() => { setPage(0); }, [search, statusFilter, typeFilter, pageSize, sortOrder]);
  // اصلاح محدوده فقط وقتی دادهٔ واقعی داریم (نه هنگام بارگذاری صفحهٔ بعد)
  useEffect(() => {
    if (!contractsPage) return;
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [contractsPage, page, totalPages]);
  const pageNumbers = (() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
  })();

  const { data: typeMasters } = useQuery({
    queryKey: ['contract-types-master'],
    queryFn: () => axiosInstance.get('/contract-types-master/').then(r => r.data),
  });
  const typeMasterList = Array.isArray(typeMasters) ? typeMasters : typeMasters?.results || [];

  // نوع قرارداد از «نوع پیکربندی‌شده» خوانده می‌شود؛ اگر خالی بود، نوع ثابت.
  const typeLabel = (c) => c.contract_type_master_name || TYPE_LABELS[c.contract_type] || c.contract_type || '—';

  /* ---- نوار جستجو و فیلترها (توکن‌محور، استودیوی تم) ---- */
  const toolbar = resolveToolbarTheme(tokens);
  const filtersExpanded = filtersOpen ?? toolbar.openByDefault;
  const activeFilterCount = (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0);
  const statusOptions = [
    { value: '', label: 'همه' },
    ...Object.entries(STATUS_LABELS).map(([key, label]) => ({ value: key, label })),
  ];
  const typeOptions = [
    { value: '', label: 'همه' },
    ...typeMasterList.map((item) => ({
      value: String(item.id),
      label: `${item.name}${item.code ? ` (${item.code})` : ''}`,
    })),
  ];
  const resetToolbar = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
  };
  const activeChips = [
    statusFilter
      ? { key: 'status', label: `وضعیت: ${STATUS_LABELS[statusFilter] || statusFilter}`, clear: () => setStatusFilter('') }
      : null,
    typeFilter
      ? {
        key: 'type',
        label: `نوع: ${typeOptions.find((option) => option.value === String(typeFilter))?.label || typeFilter}`,
        clear: () => setTypeFilter(''),
      }
      : null,
  ].filter(Boolean);
  const activeChipSx = toolbar.chipStyle === 'outlined'
    ? { bgcolor: 'transparent', color: toolbar.primary, border: `1px solid ${toolbar.chipBorder}`, fontSize: 12, height: 24, fontWeight: 700 }
    : { bgcolor: toolbar.chipBg, color: toolbar.primary, fontSize: 12, height: 24, fontWeight: 700 };

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/external-contracts/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setDeleteId(null);
      setMsg('قرارداد حذف شد.');
      setTimeout(() => setMsg(''), 2500);
    },
  });

  // خروجی اکسل جامع: تک‌شیت و یک ردیف برای هر قرارداد (همهٔ آیتم‌ها در ستون‌های همان ردیف)
  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    setMsg('');
    setMsgOk(true);
    try {
      await downloadFile('/external-contracts/export-excel/', {
        params: {
          ...(search ? { search } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(typeFilter ? { contract_type_master: typeFilter } : {}),
        },
        fallbackName: 'contracts.xlsx',
      });
      setMsg('فایل اکسل تهیه و دانلود شد.');
    } catch (e) {
      setMsg(`خطا در تهیهٔ فایل اکسل: ${e?.message || 'نامشخص'}`);
      setMsgOk(false);
    } finally {
      setExporting(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  return (
    <Box>
      <PageHeader
        icon={<HandshakeIcon />}
        title="قراردادهای برون‌سازمانی"
        actions={(
          <>
            <Tooltip title="خروجی اکسل چندشیتی: قراردادها، مفاد و شرایط، پروژه‌ها، پیش‌پرداخت‌ها، ضمانت‌ها، تضمین‌ها، فاکتورها، صورت‌وضعیت‌ها، پرداخت‌ها، الحاقیه‌ها و اختلافات">
              <span>
                <Button variant="outlined" startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                  disabled={exporting} onClick={exportExcel}>
                  {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
                </Button>
              </span>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/contracts/new')}>
              قرارداد جدید
            </Button>
          </>
        )}
      />

      {msg && <Alert severity={msgOk ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {/* نوار جستجو و فیلترها — دکمهٔ «فیلترها» پنل را زیر نوار باز می‌کند */}
      <Paper sx={{ p: 1.25, mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            size="small"
            placeholder={toolbar.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{
              flex: toolbar.searchWidth === '100%' ? 1 : '0 0 auto',
              width: toolbar.searchWidth === '100%' ? { xs: '100%', sm: 'auto' } : `${toolbar.searchWidth}px`,
              ...fieldSx,
              '& .MuiOutlinedInput-root': {
                ...fieldSx['& .MuiOutlinedInput-root'],
                height: `${toolbar.searchHeight}px`,
                borderRadius: `${toolbar.searchRadius}px`,
                bgcolor: toolbar.searchVariant === 'filled' ? 'action.hover' : toolbar.searchBg,
                ...(toolbar.searchVariant === 'plain' ? { '& fieldset': { borderColor: 'transparent' } } : null),
                ...(toolbar.searchVariant === 'soft' ? { '&:hover fieldset': { borderColor: toolbar.chipBorder } } : null),
              },
            }}
            InputProps={(toolbar.searchIconPosition === 'hidden' ? {} : {
              ...(toolbar.searchIconPosition === 'start'
                ? { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }
                : { endAdornment: <InputAdornment position="end"><SearchIcon fontSize="small" /></InputAdornment> }),
            })}
          />
          {/* ترتیب نمایش: کنار جستجو و پیش از دکمهٔ فیلترها — خودش فیلتر نیست */}
          <TextField
            select
            size="small"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            sx={{
              flex: '0 0 auto',
              minWidth: { xs: '100%', sm: 172 },
              ...fieldSx,
              '& .MuiOutlinedInput-root': {
                ...fieldSx['& .MuiOutlinedInput-root'],
                height: `${toolbar.searchHeight}px`,
                borderRadius: `${toolbar.searchRadius}px`,
                fontSize: 12.5,
              },
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SortIcon fontSize="small" /></InputAdornment>,
            }}
            SelectProps={{
              inputProps: { 'aria-label': 'ترتیب نمایش' },
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant={toolbar.filtersVariant}
            onClick={() => setFiltersOpen(!filtersExpanded)}
            startIcon={toolbar.filtersIconPosition === 'start' ? <FilterListIcon fontSize="small" /> : null}
            endIcon={toolbar.filtersIconPosition === 'end' ? <FilterListIcon fontSize="small" /> : null}
            aria-expanded={filtersExpanded}
            sx={{
              /* هم‌ارتفاع با کادر جستجو و کنترل ترتیب */
              height: `${toolbar.searchHeight}px !important`,
              minHeight: `${toolbar.searchHeight}px !important`,
              maxHeight: `${toolbar.searchHeight}px !important`,
              alignSelf: 'center', py: 0, boxSizing: 'border-box',
              borderRadius: `${toolbar.filtersRadius}px`,
              fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 'auto', px: 2,
            }}
          >
            {toolbar.filtersLabel}
            {toolbar.showFiltersCount && activeFilterCount > 0 ? (
              <Chip
                size="small"
                label={toPersianDigits(activeFilterCount)}
                sx={{
                  ml: 0.75, height: 18, fontSize: 11, fontWeight: 800,
                  bgcolor: toolbar.filtersVariant === 'contained' ? 'rgba(255,255,255,0.24)' : toolbar.chipBg,
                  color: toolbar.filtersVariant === 'contained' ? '#fff' : toolbar.primary,
                }}
              />
            ) : null}
          </Button>
          {toolbar.showReset && (activeFilterCount > 0 || search) ? (
            <Button
              size="small" variant="text" onClick={resetToolbar}
              sx={{
                height: `${toolbar.searchHeight}px`,
                minHeight: `${toolbar.searchHeight}px`,
                alignSelf: 'center', py: 0,
                fontSize: 12.5, whiteSpace: 'nowrap',
              }}
            >
              {toolbar.resetLabel}
            </Button>
          ) : null}
        </Stack>

        <Collapse in={filtersExpanded} timeout={180} unmountOnExit>
          <Box sx={{
            mt: 1.25, pt: 1.25, borderTop: '1px dashed', borderColor: 'divider',
            bgcolor: toolbar.panelBg,
            borderRadius: `${toolbar.panelRadius}px`,
            p: `${toolbar.panelPadding}px`,
          }}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: toolbar.panelGrid },
              gap: `${toolbar.panelGap}px`,
              alignItems: 'end',
            }}>
              <FilterSelect
                label="وضعیت" value={statusFilter} options={statusOptions}
                labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                onChange={setStatusFilter}
              />
              <FilterSelect
                label="نوع قرارداد" value={typeFilter} options={typeOptions}
                labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                onChange={setTypeFilter}
              />
              {toolbar.showReset ? (
                <Button
                  variant="text" size="small" onClick={resetToolbar}
                  sx={{ fontSize: 12.5, justifySelf: 'start', height: `${toolbar.searchHeight - 6}px` }}
                >
                  {toolbar.resetLabel}
                </Button>
              ) : null}
            </Box>
          </Box>
        </Collapse>

        {toolbar.showActiveChips && activeChips.length > 0 ? (
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            {activeChips.map((chip) => (
              <Chip key={chip.key} size="small" label={chip.label} onDelete={chip.clear} sx={activeChipSx} />
            ))}
          </Stack>
        ) : null}
      </Paper>

      {/* فهرست قراردادها — جدول یک‌ردیفی و خوانا */}
      <Box>
        {isLoading ? (
          <Paper sx={{ ...tableFrameSx, py: 6, textAlign: 'center', borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}><CircularProgress /></Paper>
        ) : rows.length === 0 ? (
          <Paper sx={{ ...tableFrameSx, py: 7, textAlign: 'center', borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}>
            <Typography color="textSecondary">قراردادی ثبت نشده است.</Typography>
          </Paper>
        ) : (
          <Paper
            sx={{
              ...tableFrameSx,
              borderRadius: 'var(--hrms-table-radius, 16px)',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: 'none',
            }}
          >
            <TableContainer
              ref={tableScrollRef}
              data-visible-rows={tableTheme.visibleRows}
              data-row-height={effectiveRowPx}
              data-table-height={`${tableHeight}px`}
              sx={{
                height: { xs: 'auto', sm: `${tableHeight}px` },
                maxHeight: { xs: 'none', sm: `${tableHeight}px` },
                overflowY: 'auto',
                opacity: isFetching && !isLoading ? 0.6 : 1,
                transition: 'opacity .15s ease',
              }}
            >
              <Table
                size="small"
                stickyHeader
                sx={{
                  width: '100%',
                  minWidth: 860,
                  tableLayout: 'fixed',
                  '& td, & th': {
                    px: 1,
                    py: `${cellPadding}px`,
                    whiteSpace: tableTheme.singleLine ? 'nowrap' : 'normal',
                    borderBottom: tableTheme.divider,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                  '& thead th': {
                    textAlign: `${tableTheme.headerTextAlign} !important`,
                    backgroundColor: 'var(--hrms-table-header-bg)',
                    height: `${tableTheme.headerHeight}px`,
                    fontSize: tableTheme.header.fontSize,
                    fontWeight: tableTheme.header.fontWeight,
                    color: tableTheme.header.color,
                  },
                  '& tbody td': {
                    height: `${tableTheme.rowHeight}px`,
                    fontSize: tableTheme.cell.fontSize,
                    fontWeight: tableTheme.cell.fontWeight,
                    color: tableTheme.cell.color,
                    ...(tableTheme.cellTextAlign ? { textAlign: `${tableTheme.cellTextAlign} !important` } : null),
                  },
                  '& tbody tr.MuiTableRow-hover:hover': { backgroundColor: tableTheme.hoverBg },
                  ...tableTypographySx(tableTheme),
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '7%' }}>شماره قرارداد</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '12%' }}>طرف حساب</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '17%' }}>موضوع قرارداد</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '10%' }}>نوع قرارداد</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '7%' }}>وضعیت</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '7.5%' }}>تاریخ شروع</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '7.5%' }}>تاریخ پایان</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '10%' }}>روز تا پایان</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '13%' }}>مبلغ قرارداد</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: '9%' }}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(c => {
                    const amount = c.effective_amount ?? c.amount ?? 0;
                    const baseAmount = c.amount ?? 0;
                    const endEffective = c.effective_end_date || c.end_date;
                    const extended = Boolean(c.effective_end_date && c.end_date
                      && String(c.effective_end_date).slice(0, 10) !== String(c.end_date).slice(0, 10));
                    const remain = remainMeta(daysUntil(endEffective));
                    return (
                      <TableRow
                        key={c.id} hover
                        onClick={() => navigate(`/external-contracts/${c.id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Typography sx={{ fontFamily: 'var(--hrms-table-number-font, inherit)', fontWeight: 800, fontSize: 12.5, color: '#334155' }}>
                            {toPersianDigits(c.number || '—')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" style={RIGHT} sx={{ ...bodyCellSx, maxWidth: 170 }}>
                          <Tooltip title={c.party_name || ''}>
                            <Typography fontWeight={700} color="#7c2d12" noWrap sx={{ fontSize: 12 }}>
                              {c.party_name || '—'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right" style={RIGHT} sx={{ ...bodyCellSx, maxWidth: 285 }}>
                          <Tooltip title={c.subject || ''}>
                            <Typography fontWeight={800} noWrap sx={{ color: '#0f172a', fontSize: 12 }}>
                              {c.subject || '—'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Typography variant="caption" noWrap sx={{ color: '#475569', fontWeight: 700, fontSize: 12 }}>
                            {typeLabel(c)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Chip size="small" label={STATUS_LABELS[c.status] || '—'}
                            sx={{
                              bgcolor: `${STATUS_COLORS[c.status] || '#64748b'}18`,
                              color: STATUS_COLORS[c.status] || '#64748b',
                              fontWeight: 800, fontSize: 12, height: 22,
                            }} />
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Typography variant="caption" sx={{ fontFamily: 'var(--hrms-table-number-font, inherit)', color: '#334155', fontWeight: 700 }}>
                            {c.start_date ? toJalali(c.start_date) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Typography variant="caption" sx={{
                            fontFamily: 'var(--hrms-table-number-font, inherit)', fontWeight: extended ? 800 : 700,
                            color: extended ? '#047857' : '#334155',
                          }}>
                            {endEffective ? toJalali(endEffective) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Tooltip title={remain.label}>
                            <Chip size="small" label={remain.label}
                              sx={{ maxWidth: '100%', bgcolor: remain.bg, color: remain.color, fontWeight: 800, fontSize: 12, height: 22 }} />
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Tooltip title={`پایه: ${formatPersianNumber(baseAmount)}${Number(amount) !== Number(baseAmount)
                            ? ` | تغییر الحاقیه: ${formatPersianNumber(Number(amount) - Number(baseAmount))}` : ''}`}>
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                              <Typography sx={{
                                fontFamily: 'var(--hrms-table-number-font, inherit)', fontWeight: 800, fontSize: 13.5, color: '#b45309',
                                whiteSpace: 'nowrap',
                              }}>
                                {formatPersianNumber(amount)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {currencyUnit(c)}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx} onClick={e => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            <Tooltip title="مشاهده پرونده"><IconButton size="small" color="info"
                              onClick={() => navigate(`/external-contracts/${c.id}`)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="ویرایش"><IconButton size="small" color="primary"
                              onClick={() => navigate(`/contracts/${c.id}/edit`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="حذف"><IconButton size="small" color="error"
                              onClick={() => setDeleteId(c.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {tableTheme.showPagination && totalCount > pageSize ? (
              <Box sx={{
                px: 1.5,
                py: tableTheme.paginationDense ? 0.75 : 1.25,
                borderTop: '1px solid',
                borderColor: 'var(--hrms-table-border-color, #e8edf4)',
              }}>
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 32 }}>
                  {tableTheme.showPaginationRange ? (
                    <Typography
                      sx={{
                        position: 'absolute', insetInlineStart: 0,
                        display: { xs: 'none', sm: 'block' },
                        fontSize: tableTheme.paginationFontSize - 0.5,
                        color: 'text.secondary', whiteSpace: 'nowrap',
                      }}
                    >
                      نمایش {toPersianDigits(page * pageSize + 1)} تا{' '}
                      {toPersianDigits(Math.min((page + 1) * pageSize, totalCount))} از{' '}
                      {toPersianDigits(totalCount)} قرارداد
                      {' · '}
                      {toPersianDigits(tableTheme.visibleRows)} ردیف در نما
                    </Typography>
                  ) : null}
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {tableTheme.paginationVariant === 'pages' ? (
                    <>
                      <IconButton size="small" disabled={page === 0} onClick={() => setPage(0)} aria-label="صفحهٔ اول"
                        sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                        {/* آیکون اول/آخر برای RTL آینه می‌شود تا «اول» سمت راست باشد */}
                        <FirstPageIcon fontSize="small" sx={{ transform: 'scaleX(-1)' }} />
                      </IconButton>
                      <IconButton size="small" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="صفحهٔ قبل"
                        sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                        <ChevronRightIcon fontSize="small" />
                      </IconButton>
                      {pageNumbers.map((index) => (
                        <Box
                          key={index}
                          component="button"
                          type="button"
                          onClick={() => setPage(index)}
                          aria-current={index === page ? 'page' : undefined}
                          sx={{
                            minWidth: 30, height: 30, px: 0.75,
                            borderRadius: `${tableTheme.paginationRadius}px`, cursor: 'pointer',
                            border: '1px solid',
                            borderColor: index === page ? 'transparent' : withAlpha(tableTheme.paginationAccent, 0.3),
                            bgcolor: index === page ? tableTheme.paginationAccent : 'transparent',
                            color: index === page ? '#ffffff' : tableTheme.paginationAccent,
                            fontSize: tableTheme.paginationFontSize, fontWeight: 800,
                            fontFamily: 'inherit', lineHeight: 1,
                          }}
                        >
                          {toPersianDigits(index + 1)}
                        </Box>
                      ))}
                      <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} aria-label="صفحهٔ بعد"
                        sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} aria-label="صفحهٔ آخر"
                        sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                        <LastPageIcon fontSize="small" sx={{ transform: 'scaleX(-1)' }} />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton size="small" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="صفحهٔ قبل"
                        sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                        <ChevronRightIcon fontSize="small" />
                      </IconButton>
                      <Chip
                        size="small"
                        label={`${toPersianDigits(page + 1)} / ${toPersianDigits(totalPages)}`}
                        sx={{
                          height: 24, fontSize: tableTheme.paginationFontSize, fontWeight: 800,
                          color: tableTheme.paginationAccent,
                          bgcolor: withAlpha(tableTheme.paginationAccent, 0.12),
                        }}
                      />
                      <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} aria-label="صفحهٔ بعد"
                        sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Stack>
                </Box>
                {tableTheme.showPaginationRange ? (
                  <Typography sx={{
                    display: { xs: 'block', sm: 'none' },
                    mt: 0.75, textAlign: 'center',
                    fontSize: tableTheme.paginationFontSize - 0.5, color: 'text.secondary',
                  }}>
                    نمایش {toPersianDigits(page * pageSize + 1)} تا{' '}
                    {toPersianDigits(Math.min((page + 1) * pageSize, totalCount))} از{' '}
                    {toPersianDigits(totalCount)} قرارداد
                  </Typography>
                ) : null}
              </Box>
            ) : null}
          </Paper>
        )}
      </Box>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#b91c1c', fontWeight: 800 }}>حذف قرارداد</DialogTitle>
        <DialogContent>
          <Typography variant="body2">آیا از حذف این قرارداد اطمینان دارید؟ اسناد، فاکتورها و پرداخت‌های مرتبط نیز حذف می‌شوند.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)}>انصراف</Button>
          <Button variant="contained" color="error" onClick={() => remove.mutate(deleteId)}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExternalContractsPage;


