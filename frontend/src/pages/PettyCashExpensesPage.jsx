import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogContent, DialogTitle,
  FormControl, IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem, Paper,
  Select, Stack, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import EditNoteIcon from '@mui/icons-material/EditNote';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import { alpha, useTheme } from '@mui/material/styles';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import Timeline from '../core/components/ui/Timeline';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import usePrintDocument from '../core/print/usePrintDocument';
import PrintPreviewDialog from '../core/print/PrintPreviewDialog';
import { useModulePalette } from '../core/context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../core/theme/appearanceDefaults';
import { SurfaceCard } from './accounting/AccountingDashboardUI';

const GREEN = '#0f766e';
const RED = '#e11d48';
const VIOLET = '#6366f1';

const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: '#64748b', icon: EditNoteIcon },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b', icon: PendingActionsIcon },
  approved: { label: 'تأییدشده', color: '#2563eb', icon: CheckCircleIcon },
  posted: { label: 'ثبت‌شده', color: GREEN, icon: LockIcon },
  rejected: { label: 'برگشت‌خورده', color: RED, icon: UndoIcon },
  edited: { label: 'ویرایش‌شده', color: VIOLET, icon: EditNoteIcon },
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

const RowActions = ({ row, act, onTimeline, onEdit, onPrint }) => (
  <>
    {row.status === 'submitted' && (
      <>
        <Tooltip title="تأیید">
          <IconButton size="small" color="success" onClick={() => act.mutate({ id: row.id, action: 'approve' })}>
            <CheckCircleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="برگشت">
          <IconButton size="small" color="error" onClick={() => {
            const note = window.prompt('علت برگشت صورت:');
            if (note) act.mutate({ id: row.id, action: 'reject', body: { note } });
          }}>
            <UndoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </>
    )}
    {row.is_editable ? (
      <Tooltip title="ویرایش صورت">
        <IconButton size="small" color="primary" onClick={() => onEdit(row)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    ) : null}
    <Tooltip title="پیش‌نمایش و چاپ">
      <IconButton size="small" onClick={() => onPrint(row)}>
        <PrintIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip title="تایم‌لاین">
      <IconButton size="small" color="info" onClick={() => onTimeline(row)}>
        <HistoryIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    {row.status === 'draft' && (
      <Tooltip title="حذف (نرم)">
        <IconButton size="small" color="error" onClick={() => {
          if (window.confirm('این صورت هزینه به سطل بازیافت منتقل شود؟')) {
            act.mutate({ id: row.id, action: 'soft_delete' });
          }
        }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )}
  </>
);



const PettyCashExpensesPage = () => {
  const qc = useQueryClient();
  const print = usePrintDocument();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { typography, getPalette } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const accent = getPalette('pettycash')?.accent || '#f59e0b';
  const CARD_BORDER = theme.palette.divider;
  const MUTED = theme.palette.text.secondary;

  const tableCellFont = Math.max(type.bodySize - 2, 12);
  const tableHeadFont = Math.max(type.bodySize - 3, 12);
  const headSx = {
    fontSize: tableHeadFont, fontWeight: 800, color: theme.palette.text.primary,
    bgcolor: theme.palette.action.hover, borderBottom: `1px solid ${CARD_BORDER}`,
    whiteSpace: 'nowrap', py: 1.05, px: 1,
  };
  const cellSx = {
    fontSize: tableCellFont, color: theme.palette.text.primary,
    borderBottom: `1px solid ${CARD_BORDER}`, whiteSpace: 'nowrap', py: 0.8, px: 1,
  };
  const moneySx = {
    fontFamily: theme.typography.fontFamily, fontVariantNumeric: 'tabular-nums',
    direction: 'rtl', fontWeight: 800, fontSize: Math.max(type.bodySize - 1, 12),
  };

  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const [status, setStatus] = useState('');
  const [fund, setFund] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ordering, setOrdering] = useState('-date');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [timeline, setTimeline] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (location.state?.flash) {
      setMsg({ ok: true, text: location.state.flash });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['petty-expenses'],
    queryFn: () => axiosInstance.get('/petty-cash-expense-statements/', { params: { include_deleted: '1' } }).then((r) => r.data),
  });
  const { data: funds } = useQuery({
    queryKey: ['pc-funds-list'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/').then((r) => r.data),
  });

  const list = pickRows(data);
  const fundList = pickRows(funds);
  const resetFilters = () => {
    setStatus(''); setFund(''); setDateFrom(''); setDateTo(''); setOrdering('-date'); setQ('');
  };
  const activeFilters = [status, fund, dateFrom, dateTo].filter(Boolean).length;

  const filtered = useMemo(() => {
    const term = search.trim();
    const rows = list.filter((row) => {
      if (!showDeleted && row.is_deleted) return false;
      if (status && row.status !== status) return false;
      if (fund && String(row.fund) !== String(fund)) return false;
      if (dateFrom && row.date < dateFrom) return false;
      if (dateTo && row.date > dateTo) return false;
      if (term) {
        const haystack = `${row.number || ''} ${row.description || ''} ${row.fund_title || ''} ${row.custodian_name || ''}`;
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    const dir = ordering.startsWith('-') ? -1 : 1;
    const key = ordering.replace('-', '');
    return [...rows].sort((a, b) => {
      const av = key === 'number' ? String(a.number || a.id) : String(a[key] || '');
      const bv = key === 'number' ? String(b.number || b.id) : String(b[key] || '');
      return av > bv ? dir : av < bv ? -dir : 0;
    });
  }, [list, search, status, fund, dateFrom, dateTo, ordering, showDeleted]);

  const pageRows = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const pageTotal = pageRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
  const pendingCount = filtered.filter((row) => row.status === 'submitted').length;

  const refresh = () => qc.invalidateQueries({ queryKey: ['petty-expenses'] });
  const onError = (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا در انجام عملیات' });

  const act = useMutation({
    mutationFn: ({ id, action, body }) => axiosInstance.post(`/petty-cash-expense-statements/${id}/${action}/`, body || {}),
    onSuccess: () => { refresh(); setMsg({ ok: true, text: 'عملیات انجام شد' }); },
    onError,
  });
  const bulk = useMutation({
    mutationFn: ({ ids, action, note }) => axiosInstance.post('/petty-cash-expense-statements/bulk_action/', { ids, action, note }),
    onSuccess: (res) => {
      refresh();
      setSelected([]);
      const failed = res.data?.errors?.length || 0;
      setMsg({
        ok: failed === 0,
        text: failed ? `${res.data.count} مورد انجام شد و ${failed} مورد خطا داشت` : 'عملیات انبوه انجام شد',
      });
    },
    onError,
  });


  const toggleSelect = (id) => setSelected((prev) => (
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  ));
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));

  const openPrint = (row) => print.openDocument({
    document: 'petty-statement',
    payload: { id: row.id },
    options: { paper: 'A4', orientation: 'landscape' },
  });

  return (
    <Box>
      <PageHeader
        icon={<ReceiptLongIcon />}
        title="صورت ریز هزینه‌ها"
        badge={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            <Chip size="small" label={`${toPersianDigits(filtered.length)} صورت`}
              sx={{ height: 24, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
            {pendingCount ? (
              <Chip size="small" icon={<PendingActionsIcon sx={{ fontSize: 14 }} />} label={`${toPersianDigits(pendingCount)} در انتظار تأیید`}
                sx={{ height: 24, fontWeight: 800, bgcolor: '#fffbeb', color: '#b45309' }} />
            ) : null}
          </Stack>
        )}
        sx={{ mb: 1.5, py: 1 }}
        actions={(
          <>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isFetching}>به‌روزرسانی</Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/petty-cash/expenses/new')}>
              صورت هزینه جدید
            </Button>
          </>
        )}
      />

      {msg && (
        <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}
          sx={{ mb: 1.25, borderRadius: '12px', fontSize: Math.max(type.bodySize - 1, 12.5) }}>
          {msg.text}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: theme.palette.background.paper, border: `1px solid ${CARD_BORDER}`, borderRadius: '18px', boxShadow: 'none' }}>
        <Stack direction="row" spacing={1} useFlexGap alignItems="center">
          <TextField size="small" fullWidth placeholder="جستجوی شماره، شرح، تنخواه یا تنخواه‌دار…" value={q} onChange={(e) => setQ(e.target.value)}
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
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
            }}>
              <FormControl size="small">
                <InputLabel>تنخواه</InputLabel>
                <Select value={fund} label="تنخواه" onChange={(e) => { setFund(e.target.value); setPage(0); }}>
                  <MenuItem value="">همه</MenuItem>
                  {fundList.map((f) => <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>)}
                </Select>
              </FormControl>
              <JalaliDatePicker noHelper label="از تاریخ" value={dateFrom} onChange={setDateFrom} sx={{ width: '100%' }} />
              <JalaliDatePicker noHelper label="تا تاریخ" value={dateTo} onChange={setDateTo} sx={{ width: '100%' }} />
              <FormControl size="small">
                <InputLabel>مرحله صورت</InputLabel>
                <Select value={status} label="مرحله صورت" onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
                  <MenuItem value="">همه</MenuItem>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <MenuItem key={key} value={key}>{meta.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>مرتب‌سازی</InputLabel>
                <Select value={ordering} label="مرتب‌سازی" onChange={(e) => setOrdering(e.target.value)}>
                  {SORT_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Chip size="small" clickable label={showDeleted ? 'نمایش حذف‌شده‌ها: روشن' : 'نمایش حذف‌شده‌ها: خاموش'}
                color={showDeleted ? 'warning' : 'default'} onClick={() => setShowDeleted((prev) => !prev)}
                sx={{ fontWeight: 700 }} />
              {activeFilters > 0 || showDeleted ? (
                <Button size="small" startIcon={<ClearIcon />} onClick={() => { resetFilters(); setShowDeleted(false); }}>پاک کردن فیلترها</Button>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </Paper>


      <SurfaceCard
        title="فهرست صورت‌های هزینه"
        icon={ReceiptLongIcon}
        color={accent}
        contentSx={{ p: 0 }}
        action={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            <Chip size="small" label={`${toPersianDigits(filtered.length)} نتیجه`}
              sx={{ height: 23, fontSize: tableHeadFont, fontWeight: 800 }} />
            {selected.length ? (
              <>
                <Chip size="small" label={`${toPersianDigits(selected.length)} انتخاب‌شده`}
                  sx={{ height: 23, fontSize: tableHeadFont, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
                <Button size="small" color="success" startIcon={<CheckCircleIcon />} onClick={() => bulk.mutate({ ids: selected, action: 'approve' })}>تأیید</Button>
                <Button size="small" color="error" startIcon={<UndoIcon />} onClick={() => {
                  const note = window.prompt('علت برگشت گروهی:');
                  if (note) bulk.mutate({ ids: selected, action: 'return', note });
                }}>برگشت</Button>
              </>
            ) : null}
          </Stack>
        )}
      >
        {isLoading ? <Box textAlign="center" py={5}><CircularProgress /></Box> : (
          <>
            {isFetching ? <LinearProgress sx={{ height: 2 }} /> : null}
            <TableContainer sx={{ maxHeight: 620 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={headSx}>
                      <Checkbox size="small" checked={allSelected}
                        onChange={(e) => setSelected(e.target.checked ? pageRows.map((row) => row.id) : [])} />
                    </TableCell>
                    <TableCell sx={headSx}>شماره</TableCell>
                    <TableCell sx={headSx}>تاریخ</TableCell>
                    <TableCell sx={headSx}>تنخواه</TableCell>
                    <TableCell sx={headSx}>تنخواه‌دار</TableCell>
                    <TableCell sx={headSx}>پروژه</TableCell>
                    <TableCell sx={headSx}>سطر / مستند</TableCell>
                    <TableCell align="center" sx={headSx}>مبلغ</TableCell>
                    <TableCell sx={headSx}>مهلت تسویه</TableCell>
                    <TableCell sx={headSx}>وضعیت</TableCell>
                    <TableCell align="center" sx={headSx}>عملیات</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ ...cellSx, py: 4, color: MUTED }}>
                        صورت هزینه‌ای با این فیلترها یافت نشد.
                      </TableCell>
                    </TableRow>
                  ) : pageRows.map((row) => {
                    const meta = STATUS_META[row.status] || { label: row.status, color: MUTED };
                    const Icon = meta.icon || ReceiptLongIcon;
                    const rowLines = row.lines || [];
                    return (
                      <TableRow key={row.id} hover sx={{ opacity: row.is_deleted ? 0.55 : 1 }}>
                        <TableCell padding="checkbox" sx={cellSx}>
                          <Checkbox size="small" checked={selected.includes(row.id)} onChange={() => toggleSelect(row.id)} />
                        </TableCell>
                        <TableCell sx={{ ...cellSx, fontWeight: 800 }}>{toPersianDigits(row.number || `#${row.id}`)}</TableCell>
                        <TableCell sx={cellSx}>{toJalali(row.date)}</TableCell>
                        <TableCell sx={cellSx}>{row.fund_title || '—'}</TableCell>
                        <TableCell sx={cellSx}>{row.custodian_name || '—'}</TableCell>
                        <TableCell sx={cellSx}>{row.project_name || '—'}</TableCell>
                        <TableCell sx={cellSx}>
                          <Stack direction="row" spacing={0.5} useFlexGap>
                            <Chip size="small" label={`${toPersianDigits(rowLines.length)} سطر`} sx={{ height: 22, fontWeight: 700 }} />
                            {rowLines.some((line) => !line.attachment && !(line.attachments || []).length) ? (
                              <Chip size="small" label="فاقد پیوست" sx={{ height: 22, fontWeight: 700, bgcolor: '#fef2f2', color: RED }} />
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: accent }}>{formatPersianNumber(row.total)}</TableCell>
                        <TableCell sx={{ ...cellSx, color: MUTED }}>{row.due_date ? toJalali(row.due_date) : '—'}</TableCell>
                        <TableCell sx={cellSx}>
                          <Chip size="small" icon={<Icon sx={{ fontSize: 14 }} />}
                            label={row.is_deleted ? 'حذف‌شده' : meta.label}
                            sx={{
                              height: 24, fontWeight: 800,
                              bgcolor: alpha(row.is_deleted ? '#64748b' : meta.color, 0.1),
                              color: row.is_deleted ? '#64748b' : meta.color,
                            }} />
                        </TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            {row.is_deleted ? (
                              <Tooltip title="بازیابی">
                                <IconButton size="small" color="success" onClick={() => act.mutate({ id: row.id, action: 'restore' })}>
                                  <RestoreIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <RowActions row={row} act={act} onTimeline={setTimeline}
                          onEdit={(item) => navigate(`/petty-cash/expenses/${item.id}/edit`)}
                          onPrint={openPrint} />
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

                <TableFooter>
                  <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                    <TableCell colSpan={7} sx={{ ...cellSx, fontWeight: 800, color: MUTED }}>جمع صفحهٔ جاری</TableCell>
                    <TableCell align="center" sx={{ ...cellSx, ...moneySx, color: accent }}>{formatPersianNumber(pageTotal)}</TableCell>
                    <TableCell colSpan={3} align="center" sx={{ ...cellSx, fontSize: tableHeadFont, color: MUTED }}>
                      {toPersianDigits(pageRows.length)} ردیف در این صفحه
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(e, value) => setPage(value)}
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
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px', bgcolor: alpha(accent, 0.10), color: accent,
              border: `1px solid ${alpha(accent, 0.20)}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HistoryIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: type.cardSize, fontWeight: 900, color: theme.palette.text.primary }}>تایم‌لاین صورت هزینه</Typography>
              <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 12), color: MUTED }}>
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

