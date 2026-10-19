import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Avatar, Badge, Box, Button, Chip, CircularProgress, Dialog, DialogContent,
  DialogTitle, FormControl, Grid, IconButton, InputAdornment, InputLabel, LinearProgress,
  MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableFooter,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
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
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { toJalali } from '../core/utils/dateUtils';
import Timeline from '../core/components/ui/Timeline';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import DocumentIssuesDialog from '../core/components/accounting/DocumentIssuesDialog';
import downloadFile from '../core/utils/downloadUtils';
import {
  SurfaceCard, KpiTile, CARD_BORDER, INK, MUTED, SOFT_BG,
} from './accounting/AccountingDashboardUI';

const COLOR = '#2563eb';
const COLOR_DARK = '#1d4ed8';
const GREEN = '#0f766e';
const RED = '#e11d48';
const AMBER = '#d97706';
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

const headSx = {
  fontSize: 9.8, fontWeight: 800, color: '#334155', bgcolor: '#f8fafc',
  borderBottom: `1px solid ${CARD_BORDER}`, whiteSpace: 'nowrap', py: 1.1, px: 1,
};
const cellSx = {
  fontSize: 10.5, color: '#334155', borderBottom: '1px solid #eef2f7',
  whiteSpace: 'nowrap', py: 0.85, px: 1,
};
const moneySx = {
  fontFamily: 'Vazirmatn, IRANSans, sans-serif', fontVariantNumeric: 'tabular-nums',
  direction: 'rtl', fontWeight: 800, fontSize: 11,
};

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

  // خلاصهٔ وضعیت اسناد همان سال مالی (سبک: فقط شمارش وضعیت‌ها)
  const { data: summaryData } = useQuery({
    queryKey: ['doc-stats', fiscalYear],
    queryFn: async () => {
      const params = fiscalYear ? { fiscal_year: fiscalYear } : {};
      try {
        const response = await axiosInstance.get('/accounting/documents/stats/', { params });
        return response.data;
      } catch (error) {
        // سازگاری با نسخه‌های قدیمی بک‌اند که هنوز اکشن stats را ندارند
        if (![404, 405].includes(error.response?.status)) throw error;
        const fallback = await axiosInstance.get('/accounting/reports/dashboard-rich/', { params });
        const payload = fallback.data || {};
        return {
          total: payload.kpis?.total_documents ?? 0,
          pending_documents: payload.kpis?.pending_documents ?? 0,
          posted_documents: payload.kpis?.posted_documents ?? 0,
          status_counts: payload.status_counts || {},
        };
      }
    },
    enabled: fiscalYear !== null || fyError,
  });
  const summary = summaryData || {};
  const statusCounts = summary.status_counts || {};

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
  const selectedYearName = fiscalYear === ''
    ? 'همه سال‌ها'
    : yearOptions.find((y) => String(y.id) === String(fiscalYear))?.name || 'سال مالی';

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
    qc.invalidateQueries({ queryKey: ['doc-stats'] });
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
        badge={<Chip size="small" label={`${toPersianDigits(totalCount)} سند`} sx={{ height: 24, fontWeight: 800, bgcolor: '#eff6ff', color: COLOR_DARK }} />}
        actions={(
          <>
            <Button variant="outlined" startIcon={<DownloadIcon />}
              onClick={async () => {
                try {
                  await downloadFile('/accounting/documents/export/', {
                    params: {
                      q: debouncedQ, status, date_from: dateFrom, date_to: dateTo,
                      journal, fiscal_year: fiscalYear, ordering,
                    },
                    fallbackName: 'accounting_documents.csv',
                  });
                } catch (e) {
                  setActionMsg({ ok: false, text: `خطا در تهیهٔ خروجی: ${e?.message || 'نامشخص'}` });
                }
              }}>
              خروجی CSV
            </Button>
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

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={DescriptionIcon} label="کل اسناد"
            value={summary.total != null ? toPersianDigits(summary.total) : (isLoading ? '…' : '—')}
            suffix="سند" color={COLOR} hint={selectedYearName} onClick={() => setStatus('')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PendingActionsIcon} label="در انتظار تأیید"
            value={summary.pending_documents != null ? toPersianDigits(summary.pending_documents) : (isLoading ? '…' : '—')}
            suffix="سند" color={AMBER} hint="نیازمند اقدام" onClick={() => setStatus('submitted')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={LockIcon} label="ثبت‌شده"
            value={statusCounts.posted != null
              ? toPersianDigits(statusCounts.posted)
              : (summary.posted_documents != null ? toPersianDigits(summary.posted_documents) : (isLoading ? '…' : '—'))}
            suffix="سند" color={GREEN}
            hint={statusCounts.locked ? `${toPersianDigits(statusCounts.locked)} قفل‌شده` : 'قطعی‌شده در دفاتر'}
            onClick={() => setStatus('posted')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={EditNoteIcon} label="پیش‌نویس"
            value={statusCounts.draft != null ? toPersianDigits(statusCounts.draft) : (isLoading ? '…' : '—')}
            suffix="سند" color={CYAN} hint="قابل ویرایش" onClick={() => setStatus('draft')} />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: '#ffffff', border: `1px solid ${CARD_BORDER}`, borderRadius: '18px', boxShadow: 'none' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap sx={{ mb: 1.25 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap>
            <FilterAltIcon sx={{ fontSize: 18, color: COLOR }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: INK }}>فیلتر و جستجو</Typography>
            {activeFilters > 0 ? <Chip size="small" label={`${toPersianDigits(activeFilters)} فیلتر فعال`} sx={{ height: 21, fontSize: 9, fontWeight: 800, bgcolor: '#eff6ff', color: COLOR_DARK }} /> : null}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap>
            <Button size="small" variant="text" startIcon={<ClearIcon />} onClick={resetFilters} sx={{ fontSize: 10.5 }}>پاک کردن</Button>
            <Tooltip title="به‌روزرسانی فهرست"><IconButton size="small" onClick={() => refetch()}><RefreshIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
          </Stack>
        </Stack>

        <Box sx={{
          display: 'grid', gap: 1,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'minmax(230px, 1.7fr) repeat(5, minmax(128px, 1fr))',
          },
        }}>
          <TextField size="small" placeholder="جستجوی شماره یا شرح سند…" value={q} onChange={(e) => setQ(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <FormControl size="small">
            <InputLabel>سال مالی</InputLabel>
            <Select value={fiscalYear ?? ''} label="سال مالی" onChange={(e) => setFiscalYear(e.target.value)}
              disabled={fiscalYear === null && !fyError}>
              <MenuItem value="">همه سال‌ها</MenuItem>
              {yearOptions.map((y) => (
                <MenuItem key={y.id} value={String(y.id)}>
                  {y.name}
                  {` (${toPersianDigits(y.document_count || 0)} سند)`}
                  {y.is_current ? ' · جاری' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>روزنامه</InputLabel>
            <Select value={journal} label="روزنامه" onChange={(e) => setJournal(e.target.value)}>
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
        </Box>

        <Box sx={{ display: 'flex', gap: 0.65, flexWrap: 'wrap', alignItems: 'center', mt: 1.25, pt: 1.15, borderTop: '1px solid #eef2f7' }}>
          {[{ key: '', label: 'همه', color: COLOR, count: summary.total },
            ...Object.entries(STATUS_META).map(([key, meta]) => ({ key, ...meta, count: statusCounts[key] }))].map((item) => {
            const selected = status === item.key;
            return (
              <Chip key={item.key || 'all'} onClick={() => setStatus(item.key)}
                label={`${item.label}${item.count != null ? ` · ${toPersianDigits(item.count)}` : ''}`}
                sx={{
                  height: 24, fontSize: 9.8, fontWeight: 800, cursor: 'pointer',
                  bgcolor: selected ? `${item.color}14` : '#ffffff',
                  color: selected ? item.color : '#64748b',
                  border: `1px solid ${selected ? `${item.color}44` : CARD_BORDER}`,
                  '&:hover': { bgcolor: `${item.color}0d` },
                }} />
            );
          })}
        </Box>
      </Paper>

      <SurfaceCard
        title="فهرست اسناد"
        icon={DescriptionIcon}
        color={COLOR}
        contentSx={{ p: 0 }}
        action={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            <Chip size="small" label={`${toPersianDigits(totalCount)} نتیجه`} sx={{ height: 23, fontSize: 9.5, fontWeight: 800, bgcolor: '#eff6ff', color: COLOR_DARK }} />
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
            <Box sx={{ width: 48, height: 48, mx: 'auto', mb: 1.1, borderRadius: '14px', bgcolor: SOFT_BG, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: INK }}>سندی با این فیلترها یافت نشد</Typography>
            <Typography sx={{ fontSize: 10.5, color: MUTED, mt: 0.3 }}>بازهٔ تاریخ، سال مالی یا عبارت جستجو را تغییر دهید.</Typography>
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
                    const meta = STATUS_META[row.status] || { label: row.status, color: '#64748b' };
                    const StatusIcon = meta.icon;
                    const issues = row.open_issues_count || 0;
                    const creator = row.created_by_name || '';
                    return (
                      <TableRow key={row.id} hover onDoubleClick={() => openDocument(row)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#fbfdff' }, '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell align="center" sx={cellSx}>
                          <Tooltip title={issues > 0 ? `${toPersianDigits(issues)} مورد نیازمند اصلاح — برای مشاهده کلیک کنید` : `سند ${faDocLabel(row)}`}>
                            <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.4}>
                              <Box component="span" onClick={() => issues > 0 && setIssuesDoc(row)}
                                sx={{
                                  fontWeight: 900, fontSize: 11, direction: 'ltr',
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
                        <TableCell align="center" sx={{ ...cellSx, fontFamily: 'Vazirmatn, IRANSans, sans-serif', fontSize: 10.5 }}>{toJalali(row.date)}</TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <Chip size="small" label={row.journal_name || '—'}
                            sx={{ height: 20, fontSize: 9, fontWeight: 700, bgcolor: '#f8fafc', color: '#475569', border: `1px solid ${CARD_BORDER}` }} />
                        </TableCell>
                        <TableCell sx={{ ...cellSx, maxWidth: 310 }}>
                          <Tooltip title={row.description || '—'}>
                            <Box sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10.5 }}>{row.description || '—'}</Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <Stack direction="row" spacing={0.55} useFlexGap alignItems="center" justifyContent="center">
                            <Avatar sx={{ width: 22, height: 22, fontSize: 9.5, fontWeight: 800, bgcolor: '#eff6ff', color: COLOR_DARK }}>{creator ? creator.trim().charAt(0) : '—'}</Avatar>
                            <Tooltip title={creator || 'ثبت‌کننده ثبت نشده است'}>
                              <Typography sx={{ maxWidth: 100, fontSize: 10, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{creator || '—'}</Typography>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: '#1d4ed8' }}>{formatPersianNumber(row.total_debit)}</TableCell>
                        <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: GREEN }}>{formatPersianNumber(row.total_credit)}</TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <Chip size="small" icon={StatusIcon ? <StatusIcon sx={{ fontSize: '13px !important' }} /> : undefined}
                            label={meta.label}
                            sx={{ height: 23, fontSize: 9.2, fontWeight: 800, bgcolor: `${meta.color}12`, color: meta.color, border: `1px solid ${meta.color}22`, '& .MuiChip-icon': { color: meta.color } }} />
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
                                  <ChecklistIcon sx={{ fontSize: 15, color: issues > 0 ? RED : '#94a3b8' }} />
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
                  <TableRow sx={{ bgcolor: '#fbfdff' }}>
                    <TableCell colSpan={5} sx={{ ...cellSx, fontWeight: 800, color: MUTED }}>جمع صفحهٔ جاری</TableCell>
                    <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: COLOR_DARK }}>{formatPersianNumber(pageTotals.debit)}</TableCell>
                    <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: GREEN }}>{formatPersianNumber(pageTotals.credit)}</TableCell>
                    <TableCell colSpan={2} align="center" sx={{ ...cellSx, fontSize: 9.5, color: MUTED }}>
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
                borderTop: `1px solid ${CARD_BORDER}`, bgcolor: '#ffffff',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 10.5, color: MUTED },
                '& .MuiTablePagination-select': { fontSize: 10.5 },
                '& .MuiTablePagination-actions button': { color: COLOR },
              }}
            />
          </>
        )}
      </SurfaceCard>

      <Dialog open={!!timeline} onClose={() => setTimeline(null)} fullWidth maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: '18px', background: '#ffffff', border: `1px solid ${CARD_BORDER}`, boxShadow: 'none' } } }}>
        <DialogTitle sx={{ p: 2, borderBottom: `1px solid ${CARD_BORDER}` }}>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: '#eff6ff', color: COLOR_DARK, border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HistoryIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>تایم‌لاین سند</Typography>
              <Typography sx={{ fontSize: 10, color: MUTED }}>شماره {toPersianDigits(timeline?.number || `#${timeline?.id || ''}`)}</Typography>
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
