import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, Grid, InputAdornment, InputLabel,
  MenuItem, Paper, Select, Snackbar, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import GavelIcon from '@mui/icons-material/Gavel';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TableRowsIcon from '@mui/icons-material/TableRows';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { getJalaliParts } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { ColumnChart } from '../core/components/charts/Charts';
import { KpiTile, SurfaceCard } from './accounting/AccountingDashboardUI';
import {
  DISPUTE_ACCENT, DISPUTE_STATUSES, DISPUTE_TYPES, SEVERITIES, DisputeCard,
  DisputeContractsCard, DisputeDetailDrawer, DisputeEditorDialog, DisputeSeverityCard,
  DisputeStatusCard, DisputeTable, disputeStatusMeta, severityMeta,
} from './contracts/DisputeWorkspaceUI';

const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const n = (value) => Number(value) || 0;
const todayIso = () => new Date().toISOString().slice(0, 10);
const compactClaim = (value) => {
  const amount = Number(value) || 0;
  if (amount >= 1000000000) return `${formatPersianNumber((amount / 1000000000).toFixed(1))} میلیارد ریال`;
  if (amount >= 1000000) return `${formatPersianNumber((amount / 1000000).toFixed(1))} میلیون ریال`;
  return `${formatPersianNumber(amount)} ریال`;
};

const ContractDisputesPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('cards');
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['ext-contracts-disp'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contract-disputes'],
    queryFn: () => axiosInstance.get('/contract-disputes/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const counts = useMemo(() => list.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, { all: list.length }), [list]);
  const severityCounts = useMemo(() => list.reduce((acc, row) => {
    acc[row.severity] = (acc[row.severity] || 0) + 1;
    return acc;
  }, {}), [list]);
  const totalClaim = useMemo(() => list.reduce((sum, row) => sum + n(row.claim_amount), 0), [list]);
  const criticalCount = severityCounts.critical || 0;
  const activeCount = (counts.open || 0) + (counts.under_review || 0) + (counts.escalated || 0);
  const resolvedCount = (counts.resolved || 0) + (counts.closed || 0);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = list.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (severityFilter !== 'all' && row.severity !== severityFilter) return false;
      if (!query) return true;
      return [row.title, row.contract_subject, row.description, row.resolution]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'claim') return n(b.claim_amount) - n(a.claim_amount);
      if (sortBy === 'severity') {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        return (order[b.severity] || 0) - (order[a.severity] || 0);
      }
      if (sortBy === 'oldest') return String(a.opened_date || '').localeCompare(String(b.opened_date || ''));
      return String(b.opened_date || '').localeCompare(String(a.opened_date || ''));
    });
    return result;
  }, [list, search, statusFilter, severityFilter, sortBy]);

  const topContracts = useMemo(() => {
    const map = new Map();
    list.forEach((row) => {
      const key = String(row.contract);
      const current = map.get(key) || { id: row.contract, subject: row.contract_subject, count: 0, claim: 0 };
      current.count += 1;
      current.claim += n(row.claim_amount);
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => b.count - a.count || b.claim - a.claim).slice(0, 4);
  }, [list]);

  const monthlyData = useMemo(() => {
    const buckets = new Map();
    list.forEach((row) => {
      if (!row.opened_date) return;
      const parts = getJalaliParts(row.opened_date);
      if (!parts) return;
      const key = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const month = Number(key.split('-')[1]);
        return { label: MONTH_NAMES[month - 1] || key, value };
      });
  }, [list]);

  const sanitize = (payload) => ({
    contract: Number(payload.contract) || null,
    title: payload.title || '',
    dispute_type: payload.dispute_type || 'other',
    severity: payload.severity || 'medium',
    status: payload.status || 'open',
    claim_amount: payload.claim_amount === '' || payload.claim_amount == null ? null : Math.max(0, n(payload.claim_amount)),
    opened_date: payload.opened_date || null,
    resolved_date: payload.resolved_date || null,
    description: payload.description || '',
    resolution: payload.resolution || '',
  });

  const save = useMutation({
    mutationFn: (payload) => {
      const clean = sanitize(payload);
      return payload.id
        ? axiosInstance.patch(`/contract-disputes/${payload.id}/`, clean)
        : axiosInstance.post('/contract-disputes/', clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-disputes'] });
      setDialog(false);
      setForm({});
      setError('');
      setToast(form.id ? 'اختلاف ویرایش شد' : 'اختلاف ثبت شد');
    },
    onError: (event) => {
      const data = event.response?.data;
      let message = 'ذخیره اختلاف انجام نشد.';
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

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-disputes/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-disputes'] });
      setConfirmDelete(null);
      setDetail(null);
      setToast('اختلاف حذف شد');
    },
    onError: () => setToast('حذف اختلاف انجام نشد'),
  });

  const openNew = () => {
    setForm({ opened_date: todayIso(), dispute_type: 'other', severity: 'medium', status: 'open', claim_amount: 0 });
    setError('');
    setDetail(null);
    setDialog(true);
  };
  const openEdit = (row) => {
    setForm({ ...row, contract: String(row.contract || ''), claim_amount: n(row.claim_amount) });
    setError('');
    setDetail(null);
    setDialog(true);
  };
  const closeEditor = () => {
    if (save.isPending) return;
    setDialog(false);
    setForm({});
    setError('');
  };
  const submit = () => {
    if (!form.contract) { setError('قرارداد مرتبط را انتخاب کنید.'); return; }
    if (!form.title) { setError('موضوع اختلاف را وارد کنید.'); return; }
    setError('');
    save.mutate(form);
  };

  const exportCsv = () => {
    const headers = ['موضوع', 'قرارداد', 'نوع', 'شدت', 'وضعیت', 'مبلغ ادعا', 'تاریخ طرح', 'تاریخ حل', 'شرح'];
    const body = filtered.map((row) => [
      row.title || '', row.contract_subject || '', DISPUTE_TYPES[row.dispute_type] || '',
      severityMeta(row).label, disputeStatusMeta(row).label, row.claim_amount || 0,
      row.opened_date || '', row.resolved_date || '', row.description || '',
    ]);
    const csv = [headers, ...body]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contract-disputes.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (isLoading || contractsLoading) return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<GavelIcon />}
        title="اختلافات و دعاوی"
        subtitle="ثبت، پیگیری و مدیریت دعاوی قراردادها بر اساس شدت و وضعیت رسیدگی"
        badge={<Chip size="small" label={`${formatPersianNumber(list.length)} دعوا`} sx={{ height: 23, fontWeight: 800, bgcolor: alpha(DISPUTE_ACCENT, 0.09), color: '#7c3aed' }} />}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی"><span><Button variant="outlined" disabled={isFetching} onClick={() => refetch()} sx={{ minWidth: 40, px: 1 }}><RefreshIcon fontSize="small" /></Button></span></Tooltip>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>چاپ</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>اختلاف جدید</Button>
          </>
        )}
      />

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={3} sx={{ order: { xs: 2, lg: 1 } }}>
          <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
            <DisputeStatusCard counts={counts} active={statusFilter} onChange={setStatusFilter} />
            <DisputeSeverityCard counts={severityCounts} total={list.length} />
            <DisputeContractsCard rows={topContracts} onOpen={(id) => navigate(`/external-contracts/${id}`)} />
          </Stack>
        </Grid>

        <Grid item xs={12} lg={9} sx={{ order: { xs: 1, lg: 2 } }}>
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid item xs={6} md={3}><KpiTile icon={GavelIcon} label="کل دعاوی" value={formatPersianNumber(list.length)} suffix="مورد" color={DISPUTE_ACCENT} hint={`${formatPersianNumber(activeCount)} پرونده فعال`} /></Grid>
            <Grid item xs={6} md={3}><KpiTile icon={WarningAmberIcon} label="باز و در بررسی" value={formatPersianNumber((counts.open || 0) + (counts.under_review || 0))} suffix="مورد" color="#b45309" hint={`${formatPersianNumber(counts.escalated || 0)} ارجاع بالاتر`} /></Grid>
            <Grid item xs={6} md={3}><KpiTile icon={CheckCircleIcon} label="حل‌شده / بسته" value={formatPersianNumber(resolvedCount)} suffix="مورد" color="#0f766e" hint={`${formatPersianNumber(counts.resolved || 0)} حل‌شده`} /></Grid>
            <Grid item xs={6} md={3}><KpiTile icon={PaymentsIcon} label="مجموع مبلغ ادعا" value={compactClaim(totalClaim)} color="#be123c" size={15} hint={`${formatPersianNumber(criticalCount)} مورد بحرانی`} /></Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: '1px solid #e5edf1' }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <TextField size="small" placeholder="جست‌وجو در موضوع، قرارداد، شرح یا نتیجه…"
                value={search} onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 220 }, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
              <FormControl size="small" sx={{ minWidth: 145 }}>
                <InputLabel>وضعیت</InputLabel>
                <Select value={statusFilter} label="وضعیت" onChange={(event) => setStatusFilter(event.target.value)}>
                  <MenuItem value="all">همه ({formatPersianNumber(list.length)})</MenuItem>
                  {Object.entries(DISPUTE_STATUSES).map(([key, meta]) => <MenuItem key={key} value={key}>{meta.label} ({formatPersianNumber(counts[key] || 0)})</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 125 }}>
                <InputLabel>شدت</InputLabel>
                <Select value={severityFilter} label="شدت" onChange={(event) => setSeverityFilter(event.target.value)}>
                  <MenuItem value="all">همه</MenuItem>
                  {Object.entries(SEVERITIES).map(([key, meta]) => <MenuItem key={key} value={key}>{meta.label} ({formatPersianNumber(severityCounts[key] || 0)})</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 125 }}>
                <InputLabel>ترتیب</InputLabel>
                <Select value={sortBy} label="ترتیب" onChange={(event) => setSortBy(event.target.value)}>
                  <MenuItem value="newest">جدیدترین</MenuItem>
                  <MenuItem value="oldest">قدیمی‌ترین</MenuItem>
                  <MenuItem value="claim">بیشترین مبلغ ادعا</MenuItem>
                  <MenuItem value="severity">بیشترین شدت</MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => value && setView(value)}>
                <ToggleButton value="cards" aria-label="نمای کارت" sx={{ px: 1 }}><Tooltip title="کارت"><ViewModuleIcon fontSize="small" /></Tooltip></ToggleButton>
                <ToggleButton value="table" aria-label="نمای جدول" sx={{ px: 1 }}><Tooltip title="جدول"><TableRowsIcon fontSize="small" /></Tooltip></ToggleButton>
              </ToggleButtonGroup>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ display: { xs: 'none', md: 'flex' } }}>اختلاف جدید</Button>
            </Stack>
          </Paper>

          {criticalCount > 0 ? (
            <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 1, borderRadius: '11px', py: 0.2 }}>
              <Typography sx={{ fontSize: 12 }}>{formatPersianNumber(criticalCount)} دعوای بحرانی نیازمند پیگیری فوری است.</Typography>
            </Alert>
          ) : null}

          {!filtered.length ? (
            <Paper elevation={0} sx={{ p: 5, borderRadius: '16px', border: '1px dashed #dbe4ea', textAlign: 'center' }}>
              <GavelIcon sx={{ fontSize: 38, color: '#cbd5e1', mb: 1 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>اختلافی با این مشخصات پیدا نشد.</Typography>
              <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.4 }}>فیلترها یا عبارت جست‌وجو را تغییر دهید.</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ mt: 1.5 }}>ثبت اختلاف جدید</Button>
            </Paper>
          ) : view === 'cards' ? (
            <Grid container spacing={1.5}>
              {filtered.map((row) => (
                <Grid item xs={12} md={6} xl={4} key={row.id}>
                  <DisputeCard row={row} onView={setDetail} onEdit={openEdit} onDelete={setConfirmDelete} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <DisputeTable rows={filtered} onView={setDetail} onEdit={openEdit} onDelete={setConfirmDelete} />
          )}

          <Box sx={{ mt: 1.5 }}>
            <SurfaceCard title="روند ثبت دعاوی" icon={TrendingUpIcon} color={DISPUTE_ACCENT}
              action={<Chip size="small" label={`${formatPersianNumber(monthlyData.length)} ماه`} sx={{ height: 20, fontSize: 12, bgcolor: alpha(DISPUTE_ACCENT, 0.07), color: DISPUTE_ACCENT }} />}>
              {monthlyData.length ? <ColumnChart data={monthlyData} color={DISPUTE_ACCENT} height={150} /> : (
                <Box sx={{ py: 3, textAlign: 'center', color: '#64748b', fontSize: 12 }}>داده‌ای برای نمایش روند وجود ندارد.</Box>
              )}
            </SurfaceCard>
          </Box>
        </Grid>
      </Grid>

      <DisputeDetailDrawer row={detail} onClose={() => setDetail(null)}
        contract={contractList.find((contract) => String(contract.id) === String(detail?.contract))}
        onEdit={openEdit} onDelete={setConfirmDelete} />

      <DisputeEditorDialog
        open={dialog}
        onClose={closeEditor}
        form={form}
        setForm={setForm}
        contractList={contractList}
        error={error}
        setError={setError}
        saving={save.isPending}
        onSave={submit}
      />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف اختلاف</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            اختلاف «{confirmDelete?.title || (confirmDelete ? `#${confirmDelete.id}` : 'انتخاب‌شده')}» حذف شود؟ این عملیات قابل بازگشت نیست.
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

export default ContractDisputesPage;
