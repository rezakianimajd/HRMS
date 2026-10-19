import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Avatar, Badge, Box, Button, Chip, CircularProgress, Dialog, DialogContent,
  DialogTitle, FormControl, IconButton, InputAdornment, InputLabel, LinearProgress,
  MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableFooter,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import UndoIcon from '@mui/icons-material/Undo';
import HistoryIcon from '@mui/icons-material/History';
import ChecklistIcon from '@mui/icons-material/Checklist';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { alpha, useTheme } from '@mui/material/styles';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { toJalali } from '../core/utils/dateUtils';
import Timeline from '../core/components/ui/Timeline';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import DocumentIssuesDialog from '../core/components/accounting/DocumentIssuesDialog';
import { useModulePalette } from '../core/context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../core/theme/appearanceDefaults';
import { SurfaceCard } from './accounting/AccountingDashboardUI';

const COLOR = '#2563eb';
const GREEN = '#0f766e';
const RED = '#e11d48';
const CYAN = '#0891b2';
const VIOLET = '#6366f1';

const docLabel = (row) => row?.number || `#${row?.id}`;
const faDocLabel = (row) => toPersianDigits(docLabel(row));

// فقط اسناد ثبت/قفل‌شده قابل حذف نیستند (قاعدهٔ سمت سرور در views.py::destroy)
const CAN_DELETE = (status) => !['posted', 'locked', 'reversed'].includes(status);

const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: '#64748b', icon: EditNoteIcon },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b', icon: PendingActionsIcon },
  approved: { label: 'تأییدشده', color: COLOR, icon: CheckCircleIcon },
  posted: { label: 'ثبت‌شده', color: GREEN, icon: LockIcon },
  locked: { label: 'قفل‌شده', color: VIOLET, icon: LockIcon },
  reversed: { label: 'برگشت‌خورده', color: RED, icon: UndoIcon },
};

const ACTION_TEXT = {
  submit: 'ارسال برای تأیید',
  approve: 'تأیید سند',
  post_document: 'ثبت نهایی سند',
  lock: 'قفل سند',
  reverse: 'برگشت سند',
};

const SORT_OPTIONS = [
  { value: '-date', label: 'جدیدترین تاریخ' },
  { value: 'date', label: 'قدیمی‌ترین تاریخ' },
  { value: '-number', label: 'شماره نزولی' },
  { value: 'number', label: 'شماره صعودی' },
];

const useDebounced = (value, delay = 320) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const pickRows = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const AccountingDocumentsPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { typography, getPalette } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const accent = getPalette('accounting')?.accent || '#2563eb';
  const CARD_BORDER = theme.palette.divider;
  const INK = theme.palette.text.primary;
  const MUTED = theme.palette.text.secondary;
  const SOFT_BG = theme.palette.action.hover;
  const tableCellFont = Math.max(type.bodySize - 2, 10);
  const tableHeadFont = Math.max(type.bodySize - 3, 9);
  const headSx = {
    fontSize: tableHeadFont, fontWeight: 800, color: theme.palette.text.primary,
    bgcolor: theme.palette.action.hover, borderBottom: `1px solid ${CARD_BORDER}`,
    whiteSpace: 'nowrap', py: 1.1, px: 1,
  };
  const cellSx = {
    fontSize: tableCellFont, color: theme.palette.text.primary,
    borderBottom: `1px solid ${CARD_BORDER}`, whiteSpace: 'nowrap', py: 0.85, px: 1,
  };
  const moneySx = {
    fontFamily: theme.typography.fontFamily, fontVariantNumeric: 'tabular-nums',
    direction: 'rtl', fontWeight: 800, fontSize: Math.max(type.bodySize - 1, 10.5),
  };
  const statusMeta = useMemo(
    () => Object.fromEntries(Object.entries(STATUS_META).map(([key, meta]) => [
      key, key === 'approved' ? { ...meta, color: accent } : meta,
    ])),
    [accent],
  );
  const [actionMsg, setActionMsg] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [issuesDoc, setIssuesDoc] = useState(null);

  // فیلترها — وضعیت اولیه از داشبورد حسابداری (state.status) خوانده می‌شود
  const [q, setQ] = useState(location.state?.q || '');
  const [status, setStatus] = useState(location.state?.status || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [journal, setJournal] = useState('');
  // سال مالی: null = هنوز تعیین نشده (منتظر پیش‌فرض سرور)، '' = همهٔ سال‌ها
  const [fiscalYear, setFiscalYear] = useState(
    location.state?.fiscal_year != null ? String(location.state.fiscal_year) : null,
  );
  const [ordering, setOrdering] = useState('-date');
  const [filtersOpen, setFiltersOpen] = useState(Boolean(location.state?.status));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const debouncedQ = useDebounced(q);

  // اگر از داشبورد با فیلتر وضعیت وارد شدیم، همان فیلتر را نگه دار
  useEffect(() => {
    if (location.state?.status !== undefined) setStatus(location.state.status || '');
    if (location.state?.q !== undefined) setQ(location.state.q || '');
    if (location.state?.fiscal_year !== undefined) {
      setFiscalYear(location.state.fiscal_year == null ? null : String(location.state.fiscal_year));
    }
  }, [location.key, location.state]);

  // سال‌های مالی + پیش‌فرض سرور: آخرین سال مالی که در آن سند ثبت شده است
  const { data: fyData, isError: fyError } = useQuery({
    queryKey: ['doc-fiscal-years'],
    queryFn: () => axiosInstance.get('/accounting/documents/fiscal_years/').then((r) => r.data),
  });
  const yearOptions = fyData?.years || [];
  const defaultYear = fyData?.default != null ? String(fyData.default) : '';

  useEffect(() => {
    if (fiscalYear === null && fyData) setFiscalYear(defaultYear);
  }, [fyData, fiscalYear, defaultYear]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, status, dateFrom, dateTo, journal, fiscalYear, ordering]);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['accounting-documents', debouncedQ, status, dateFrom, dateTo, journal, fiscalYear, ordering, page, rowsPerPage],
    enabled: fiscalYear !== null || fyError,
    queryFn: () => axiosInstance.get('/accounting/documents/', {
      params: {
        q: debouncedQ || undefined,
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        journal: journal || undefined,
        fiscal_year: fiscalYear || undefined,
        ordering,
        page: page + 1,
        page_size: rowsPerPage,
      },
    }).then((r) => r.data),
  });

  const { data: journals } = useQuery({
    queryKey: ['acc-doc-journals'],
    queryFn: () => axiosInstance.get('/accounting/journals/').then((r) => r.data),
  });
  const journalList = pickRows(journals);
  const list = pickRows(data);
  const totalCount = Number(Array.isArray(data) ? list.length : (data?.count ?? list.length));

  useEffect(() => {
    if (!isLoading && list.length === 0 && page > 0) setPage((prev) => Math.max(0, prev - 1));
  }, [isLoading, list.length, page]);

  const yearFiltered = fiscalYear !== null
    && (defaultYear ? String(fiscalYear) !== defaultYear : Boolean(fiscalYear));
  const activeFilters = [debouncedQ, status, dateFrom, dateTo, journal].filter(Boolean).length
    + (yearFiltered ? 1 : 0);

  const pageTotals = useMemo(() => list.reduce((acc, row) => ({
    debit: acc.debit + (Number(row.total_debit) || 0),
    credit: acc.credit + (Number(row.total_credit) || 0),
  }), { debit: 0, credit: 0 }), [list]);

  const resetFilters = () => {
    setQ('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setJournal('');
    setOrdering('-date');
    setFiscalYear(defaultYear);
  };

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['accounting-documents'] });
    qc.invalidateQueries({ queryKey: ['accounting-dashboard-rich'] });
  };

  const action = useMutation({
    mutationFn: ({ id, act }) => axiosInstance.post(`/accounting/documents/${id}/${act}/`),
    onSuccess: (_, vars) => {
      refreshAll();
      setActionMsg({ ok: true, text: `${ACTION_TEXT[vars.act] || 'عملیات'} با موفقیت انجام شد` });
      setTimeout(() => setActionMsg(null), 2500);
    },
    onError: (e) => {
      setActionMsg({ ok: false, text: e.response?.data?.error || 'خطا در عملیات' });
      setTimeout(() => setActionMsg(null), 4000);
    },
  });

  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/documents/${id}/`),
    onSuccess: () => {
      refreshAll();
      setActionMsg({ ok: true, text: 'سند حذف شد' });
      setTimeout(() => setActionMsg(null), 2500);
    },
    onError: (e) => {
      setActionMsg({ ok: false, text: e.response?.data?.error || 'حذف سند ناموفق بود' });
      setTimeout(() => setActionMsg(null), 4000);
    },
  });

  const runAction = (row, act) => {
    const confirmMessage = {
      post_document: `سند ${faDocLabel(row)} به‌صورت نهایی ثبت و قفل شود؟ پس از ثبت فقط با برگشت سند قابل اصلاح است.`,
      lock: `سند ${faDocLabel(row)} قفل شود؟`,
      reverse: `سند ${faDocLabel(row)} برگشت داده شود؟ یک سند قرینهٔ ثبت‌شده ایجاد می‌شود.`,
    }[act];
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    action.mutate({ id: row.id, act });
  };

  const openDocument = (row) => navigate(`/accounting/documents/${row.id}/edit`);

  const openTimeline = (row) => {
    axiosInstance.get(`/accounting/documents/${row.id}/`)
      .then((r) => setTimeline(r.data))
      .catch((e) => setActionMsg({ ok: false, text: e.response?.data?.error || 'خطا در دریافت تاریخچه' }));
  };

  const busy = action.isPending || del.isPending;

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<DescriptionIcon />}
        title="اسناد حسابداری"
        actions={(
          <>
            <FormControl size="small" sx={{ minWidth: 165 }}>
              <InputLabel>سال مالی</InputLabel>
              <Select value={fiscalYear ?? ''} label="سال مالی"
                onChange={(e) => setFiscalYear(e.target.value)}
                disabled={fiscalYear === null && !fyError}>
                <MenuItem value="">همه سال‌ها</MenuItem>
                {yearOptions.map((y) => (
                  <MenuItem key={y.id} value={String(y.id)}>
                    {y.name}{y.is_current ? ' · جاری' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<PrintIcon />}>چاپ</Button>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => navigate('/accounting/document-new', { state: fiscalYear ? { fiscal_year: fiscalYear } : undefined })}>
              سند جدید
            </Button>
          </>
        )}
      />

      {actionMsg && (
        <Alert severity={actionMsg.ok ? 'success' : 'error'} sx={{ mb: 1.5, borderRadius: '12px' }} onClose={() => setActionMsg(null)}>
          {actionMsg.text}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: theme.palette.background.paper, border: `1px solid ${CARD_BORDER}`, borderRadius: '18px', boxShadow: 'none' }}>
        <Stack direction="row" spacing={1} useFlexGap alignItems="center">
          <TextField size="small" fullWidth placeholder="جستجوی شماره یا شرح سند…" value={q} onChange={(e) => setQ(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <Button variant={filtersOpen ? 'contained' : 'outlined'} startIcon={<FilterAltIcon />}
            onClick={() => setFiltersOpen((prev) => !prev)}
            sx={{
              flexShrink: 0, height: 40, minWidth: 108,
              ...(filtersOpen
                ? { bgcolor: accent, '&:hover': { bgcolor: accent } }
                : { color: accent, borderColor: alpha(accent, 0.45) }),
            }}>
            فیلتر{activeFilters > 0 ? ` (${toPersianDigits(activeFilters)})` : ''}
          </Button>
        </Stack>

        {filtersOpen ? (
          <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px solid ${CARD_BORDER}` }}>
            <Box sx={{
              display: 'grid', gap: 1,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(5, minmax(0, 1fr))',
              },
            }}>
              <FormControl size="small">
                <InputLabel>دفتر روزنامه</InputLabel>
                <Select value={journal} label="دفتر روزنامه" onChange={(e) => setJournal(e.target.value)}>
                  <MenuItem value="">همه</MenuItem>
                  {journalList.map((j) => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
                </Select>
              </FormControl>
              <JalaliDatePicker noHelper label="از تاریخ" value={dateFrom} onChange={setDateFrom} sx={{ width: '100%' }} />
              <JalaliDatePicker noHelper label="تا تاریخ" value={dateTo} onChange={setDateTo} sx={{ width: '100%' }} />
              <FormControl size="small">
                <InputLabel>مرتب‌سازی</InputLabel>
                <Select value={ordering} label="مرتب‌سازی" onChange={(e) => setOrdering(e.target.value)}>
                  {SORT_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>مرحله سند</InputLabel>
                <Select value={status} label="مرحله سند" onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="">همه</MenuItem>
                  {Object.entries(statusMeta).map(([key, meta]) => (
                    <MenuItem key={key} value={key}>{meta.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {activeFilters > 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button size="small" startIcon={<ClearIcon />} onClick={resetFilters}>پاک کردن فیلترها</Button>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Paper>

      <SurfaceCard
        title="فهرست اسناد"
        icon={DescriptionIcon}
        color={accent}
        contentSx={{ p: 0 }}
        action={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            <Chip size="small" label={`${toPersianDigits(totalCount)} نتیجه`} sx={{ height: 23, fontSize: Math.max(type.bodySize - 3, 9.5), fontWeight: 800, bgcolor: alpha(accent, 0.10), color: accent }} />
            <Tooltip title="به‌روزرسانی"><IconButton size="small" onClick={() => refetch()}><RefreshIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
          </Stack>
        )}
      >
        {isFetching && !isLoading ? <LinearProgress sx={{ height: 2 }} /> : null}
        {isLoading ? (
          <Box textAlign="center" py={6}><CircularProgress size={28} /></Box>
        ) : isError ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" action={<Button size="small" onClick={() => refetch()}>تلاش دوباره</Button>}>دریافت فهرست اسناد ناموفق بود.</Alert>
          </Box>
        ) : list.length === 0 ? (
          <Box sx={{ py: 7, px: 2, textAlign: 'center' }}>
            <Box sx={{ width: 48, height: 48, mx: 'auto', mb: 1.1, borderRadius: '14px', bgcolor: SOFT_BG, color: theme.palette.text.disabled, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography sx={{ fontSize: Math.max(type.cardSize - 1, 12.5), fontWeight: 800, color: INK }}>سندی با این فیلترها یافت نشد</Typography>
            <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 10.5), color: MUTED, mt: 0.3 }}>بازهٔ تاریخ، سال مالی یا عبارت جستجو را تغییر دهید.</Typography>
            {activeFilters > 0 ? <Button size="small" startIcon={<ClearIcon />} onClick={resetFilters} sx={{ mt: 1 }}>پاک کردن فیلترها</Button> : null}
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: { xs: 430, lg: 'calc(100vh - 520px)' }, minHeight: 280 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ ...headSx, width: 108 }}>شماره</TableCell>
                    <TableCell align="center" sx={{ ...headSx, width: 96 }}>تاریخ</TableCell>
                    <TableCell align="center" sx={{ ...headSx, width: 130 }}>دفتر روزنامه</TableCell>
                    <TableCell sx={{ ...headSx, minWidth: 240 }}>شرح سند</TableCell>
                    <TableCell align="center" sx={{ ...headSx, width: 150 }}>تهیه‌کننده</TableCell>
                    <TableCell align="center" sx={{ ...headSx, width: 125 }}>بدهکار (ریال)</TableCell>
                    <TableCell align="center" sx={{ ...headSx, width: 125 }}>بستانکار (ریال)</TableCell>
                    <TableCell align="center" sx={{ ...headSx, width: 120 }}>وضعیت</TableCell>
                    <TableCell align="center" sx={{ ...headSx, width: 210 }}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>

                  {list.map((row) => {
                    const meta = statusMeta[row.status] || { label: row.status, color: '#64748b' };
                    const StatusIcon = meta.icon;
                    const issues = row.open_issues_count || 0;
                    const creator = row.created_by_name || '';
                    return (
                      <TableRow key={row.id} hover onDoubleClick={() => openDocument(row)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover }, '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell align="center" sx={cellSx}>
                          <Tooltip title={issues > 0 ? `${toPersianDigits(issues)} مورد نیازمند اصلاح — برای مشاهده کلیک کنید` : `سند ${faDocLabel(row)}`}>
                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.4}>
                              <Box component="span" onClick={() => issues > 0 && setIssuesDoc(row)}
                                sx={{
                                  fontWeight: 900, fontSize: Math.max(type.bodySize - 1, 11), direction: 'ltr',
                                  color: issues > 0 ? RED : INK,
                                  cursor: issues > 0 ? 'pointer' : 'default',
                                  borderBottom: issues > 0 ? `1px dashed ${RED}` : 'none',
                                }}>
                                {faDocLabel(row)}
                              </Box>
                              {issues > 0 ? (
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: RED, flexShrink: 0 }} />
                              ) : null}
                            </Stack>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={{ ...cellSx, fontFamily: 'Vazirmatn, IRANSans, sans-serif', fontSize: Math.max(type.bodySize - 2, 10.5) }}>{toJalali(row.date)}</TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <Chip size="small" label={row.journal_name || '—'}
                            sx={{ height: 20, fontSize: Math.max(type.bodySize - 4, 9), fontWeight: 700, bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary, border: `1px solid ${CARD_BORDER}` }} />
                        </TableCell>
                        <TableCell sx={{ ...cellSx, maxWidth: 310 }}>
                          <Tooltip title={row.description || '—'}>
                            <Box sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: tableCellFont }}>{row.description || '—'}</Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <Stack direction="row" spacing={0.55} useFlexGap alignItems="center" justifyContent="center">
                            <Avatar sx={{ width: 22, height: 22, fontSize: Math.max(type.bodySize - 3, 9.5), fontWeight: 800, bgcolor: alpha(accent, 0.10), color: accent }}>{creator ? creator.trim().charAt(0) : '—'}</Avatar>
                            <Tooltip title={creator || 'ثبت‌کننده ثبت نشده است'}>
                              <Typography sx={{ maxWidth: 100, fontSize: tableCellFont, color: theme.palette.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{creator || '—'}</Typography>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: accent }}>{formatPersianNumber(row.total_debit)}</TableCell>
                        <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: GREEN }}>{formatPersianNumber(row.total_credit)}</TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <Chip size="small" icon={StatusIcon ? <StatusIcon sx={{ fontSize: '13px !important' }} /> : undefined}
                            label={meta.label}
                            sx={{
                              height: 23, fontSize: Math.max(type.bodySize - 4, 8.5), fontWeight: 800,
                              bgcolor: alpha(meta.color, 0.07), color: meta.color,
                              border: `1px solid ${alpha(meta.color, 0.13)}`,
                              '& .MuiChip-icon': { color: meta.color },
                            }} />
                        </TableCell>

                        <TableCell align="center" sx={{ ...cellSx, px: 0.25 }}>
                          <Stack direction="row" spacing={0.05} alignItems="center" justifyContent="center">
                            <Tooltip title={row.status === 'draft' ? 'ویرایش سند' : 'مشاهده سند'}>
                              <span>
                                <IconButton size="small" sx={{ p: 0.45 }} color={row.status === 'draft' ? 'primary' : 'default'} disabled={busy} onClick={() => openDocument(row)}>
                                  {row.status === 'draft' ? <EditIcon sx={{ fontSize: 15 }} /> : <VisibilityIcon sx={{ fontSize: 15 }} />}
                                </IconButton>
                              </span>
                            </Tooltip>
                            {row.status === 'draft' && (
                              <Tooltip title="ارسال برای تأیید"><span><IconButton size="small" sx={{ p: 0.45 }} color="primary" disabled={busy} onClick={() => runAction(row, 'submit')}><SendIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>
                            )}
                            {row.status === 'submitted' && (
                              <Tooltip title="تأیید سند"><span><IconButton size="small" sx={{ p: 0.45 }} color="success" disabled={busy} onClick={() => runAction(row, 'approve')}><CheckCircleIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>
                            )}
                            {(row.status === 'approved' || row.status === 'submitted') && (
                              <Tooltip title="ثبت نهایی"><span><IconButton size="small" sx={{ p: 0.45 }} color="info" disabled={busy} onClick={() => runAction(row, 'post_document')}><LockIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>
                            )}
                            {row.status === 'posted' && (
                              <Tooltip title="قفل سند"><span><IconButton size="small" sx={{ p: 0.45 }} color="secondary" disabled={busy} onClick={() => runAction(row, 'lock')}><LockIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>
                            )}
                            {(row.status === 'posted' || row.status === 'locked') && (
                              <Tooltip title="برگشت سند"><span><IconButton size="small" sx={{ p: 0.45 }} color="warning" disabled={busy} onClick={() => runAction(row, 'reverse')}><UndoIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>
                            )}
                            <Tooltip title={issues > 0 ? `${toPersianDigits(issues)} مورد نیازمند اصلاح` : 'چک‌لیست نواقص خالی است'}>
                              <IconButton size="small" sx={{ p: 0.45 }} onClick={() => setIssuesDoc(row)}>
                                <Badge badgeContent={issues > 0 ? toPersianDigits(issues) : 0} color="error" invisible={issues === 0}
                                  sx={{ '& .MuiBadge-badge': { fontSize: 7.5, height: 13, minWidth: 13, px: 0.3 } }}>
                                  <ChecklistIcon sx={{ fontSize: 15, color: issues > 0 ? RED : theme.palette.text.disabled }} />
                                </Badge>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تایم‌لاین سند"><IconButton size="small" sx={{ p: 0.45 }} onClick={() => openTimeline(row)}><HistoryIcon sx={{ fontSize: 15, color: CYAN }} /></IconButton></Tooltip>
                            {CAN_DELETE(row.status) && (
                              <Tooltip title="حذف سند"><span><IconButton size="small" sx={{ p: 0.45 }} color="error" disabled={busy} onClick={() => { if (window.confirm(`سند ${faDocLabel(row)} حذف شود؟`)) del.mutate(row.id); }}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                    <TableCell colSpan={5} sx={{ ...cellSx, fontWeight: 800, color: MUTED }}>جمع صفحهٔ جاری</TableCell>
                    <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: accent }}>{formatPersianNumber(pageTotals.debit)}</TableCell>
                    <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: GREEN }}>{formatPersianNumber(pageTotals.credit)}</TableCell>
                    <TableCell colSpan={2} align="center" sx={{ ...cellSx, fontSize: Math.max(type.bodySize - 3, 9.5), color: MUTED }}>
                      {Math.abs(pageTotals.debit - pageTotals.credit) < 0.01 ? 'مبلغ صفحه متوازن است' : `اختلاف: ${formatPersianNumber(Math.abs(pageTotals.debit - pageTotals.credit))} ریال`}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(e, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="تعداد در صفحه"
              labelDisplayedRows={({ from, to, count }) => `${toPersianDigits(from)}–${toPersianDigits(to)} از ${toPersianDigits(count)}`}
              sx={{
                borderTop: `1px solid ${CARD_BORDER}`, bgcolor: theme.palette.background.paper,
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: tableCellFont, color: MUTED },
                '& .MuiTablePagination-select': { fontSize: tableCellFont },
                '& .MuiTablePagination-actions button': { color: accent },
              }}
            />
          </>
        )}
      </SurfaceCard>

      <Dialog open={!!timeline} onClose={() => setTimeline(null)} fullWidth maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: '18px', background: theme.palette.background.paper, border: `1px solid ${CARD_BORDER}`, boxShadow: 'none' } } }}>
        <DialogTitle sx={{ p: 2, borderBottom: `1px solid ${CARD_BORDER}` }}>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: alpha(accent, 0.10), color: accent, border: `1px solid ${alpha(accent, 0.20)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HistoryIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: type.cardSize, fontWeight: 900, color: INK }}>تایم‌لاین سند</Typography>
              <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 10), color: MUTED }}>شماره {toPersianDigits(timeline?.number || `#${timeline?.id || ''}`)}</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}><Timeline events={timeline?.history} /></DialogContent>
      </Dialog>

      <DocumentIssuesDialog document={issuesDoc} open={Boolean(issuesDoc)} readOnly onClose={() => setIssuesDoc(null)} />
    </Box>
  );
};

export default AccountingDocumentsPage;
