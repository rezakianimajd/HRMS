import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControl,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { toJalali } from '../core/utils/dateUtils';

const glass = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.07)',
  boxShadow: 'none',
  borderRadius: '16px',
};

const STAGES = [
  { key: 'draft', label: 'پیش‌نویس', color: '#64748b', icon: EditNoteIcon, description: 'آمادهٔ تکمیل و ارسال برای بررسی' },
  { key: 'submitted', label: 'در انتظار بررسی', color: '#f59e0b', icon: PendingActionsIcon, description: 'منتظر تأیید و بررسی حسابدار' },
  { key: 'approved', label: 'بررسی‌شده', color: '#2563eb', icon: CheckCircleIcon, description: 'تأیید شده و آمادهٔ ثبت نهایی' },
  { key: 'posted', label: 'ثبت‌شده', color: '#0f766e', icon: FactCheckIcon, description: 'در دفاتر ثبت شده است' },
  { key: 'locked', label: 'قفل‌شده', color: '#6366f1', icon: LockIcon, description: 'پایان گردش‌کار و غیرقابل تغییر' },
];

const STAGE_MAP = Object.fromEntries(STAGES.map((stage, index) => [stage.key, { ...stage, index }]));
const NEXT_STAGE = { draft: 'submitted', submitted: 'approved', approved: 'posted', posted: 'locked' };

const useDebounced = (value, delay = 320) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const stageLabel = (key) => STAGE_MAP[key]?.label || key;
const nextStageLabel = (key) => STAGE_MAP[NEXT_STAGE[key]]?.label || '—';

const DocTable = ({ rows, selectedIds, onToggle, onToggleAll }) => {
  const selectableRows = rows.filter((row) => row.status !== 'locked');
  const allSelected = selectableRows.length > 0
    && selectableRows.every((row) => selectedIds.includes(String(row.id)));
  const someSelected = selectableRows.some((row) => selectedIds.includes(String(row.id)));

  return (
    <Paper sx={{ ...glass, overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={(event) => onToggleAll?.(selectableRows, event.target.checked)}
                />
              </TableCell>
              <TableCell>شماره</TableCell>
              <TableCell>تاریخ</TableCell>
              <TableCell>شرح سند</TableCell>
              <TableCell>مرحله</TableCell>
              <TableCell>مرحله بعد</TableCell>
              <TableCell>بدهکار</TableCell>
              <TableCell>بستانکار</TableCell>
              <TableCell>تفاوت</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const diff = Math.abs(Number(row.total_debit) - Number(row.total_credit));
              const stage = STAGE_MAP[row.status] || { label: row.status_display || row.status, color: '#64748b' };
              const selectable = row.status !== 'locked';
              return (
                <TableRow key={row.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selectedIds.includes(String(row.id))}
                      disabled={!selectable}
                      onChange={() => onToggle?.(row.id)}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{toPersianDigits(row.number)}</TableCell>
                  <TableCell>{toJalali(row.date)}</TableCell>
                  <TableCell sx={{ maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={stage.label}
                      sx={{ bgcolor: `${stage.color}18`, color: stage.color, fontWeight: 800 }} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {row.status === 'locked' ? '—' : nextStageLabel(row.status)}
                  </TableCell>
                  <TableCell>{formatPersianNumber(row.total_debit)}</TableCell>
                  <TableCell>{formatPersianNumber(row.total_credit)}</TableCell>
                  <TableCell>
                    {diff > 0
                      ? <Chip size="small" color="error" label={formatPersianNumber(diff)} />
                      : <Chip size="small" color="success" label="✔" />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography color="text.secondary">سندی با این فیلترها پیدا نشد.</Typography>
        </Box>
      ) : null}
    </Paper>
  );
};

const AccountingControlPage = () => {
  const qc = useQueryClient();
  const [fiscalYear, setFiscalYear] = useState(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionMsg, setActionMsg] = useState(null);
  const debouncedQ = useDebounced(q);

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
    setSelectedIds([]);
  }, [fiscalYear, status, debouncedQ]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['acc-control', fiscalYear, status, debouncedQ],
    enabled: fiscalYear !== null || fyError,
    queryFn: () => axiosInstance.get('/accounting/documents/control/', {
      params: {
        fiscal_year: fiscalYear || undefined,
        status: status || undefined,
        q: debouncedQ || undefined,
      },
    }).then((r) => r.data),
  });
  const d = data || {};
  const documents = d.documents || [];
  const selectedRows = useMemo(
    () => documents.filter((row) => selectedIds.includes(String(row.id))),
    [documents, selectedIds],
  );
  const selectedCount = selectedRows.length;
  const selectedStatuses = [...new Set(selectedRows.map((row) => row.status))];
  const filterStage = STAGE_MAP[status];
  const selectedTarget = selectedStatuses.length === 1 && NEXT_STAGE[selectedStatuses[0]]
    ? stageLabel(NEXT_STAGE[selectedStatuses[0]])
    : 'مرحله بعد';
  const allTarget = filterStage && NEXT_STAGE[status] ? stageLabel(NEXT_STAGE[status]) : 'مرحله بعد';

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['acc-control'] });
    qc.invalidateQueries({ queryKey: ['accounting-documents'] });
    qc.invalidateQueries({ queryKey: ['accounting-dashboard-rich'] });
    qc.invalidateQueries({ queryKey: ['acc-finalize-list'] });
  };

  const advance = useMutation({
    mutationFn: (payload) => axiosInstance.post('/accounting/documents/bulk_advance/', payload),
    onSuccess: (response) => {
      refresh();
      setSelectedIds([]);
      const result = response.data || {};
      const messages = [`${formatPersianNumber(result.advanced || 0)} سند به مرحله بعد منتقل شد`];
      if (result.skipped) messages.push(`${formatPersianNumber(result.skipped)} سند در مرحله پایانی بود`);
      if (result.errors?.length) messages.push(`${formatPersianNumber(result.errors.length)} خطا`);
      setActionMsg({ severity: result.errors?.length ? 'warning' : 'success', text: messages.join(' · ') });
    },
    onError: (error) => setActionMsg({
      severity: 'error',
      text: error.response?.data?.error || 'انتقال گروهی انجام نشد',
    }),
  });

  const remove = useMutation({
    mutationFn: (payload) => axiosInstance.post('/accounting/documents/bulk_delete/', payload),
    onSuccess: (response) => {
      refresh();
      setSelectedIds([]);
      const result = response.data || {};
      const extra = result.protected
        ? ` · ${formatPersianNumber(result.protected)} سند محافظت‌شده باقی ماند`
        : '';
      setActionMsg({
        severity: result.errors?.length ? 'warning' : 'success',
        text: `${formatPersianNumber(result.deleted || 0)} سند حذف شد${extra}`,
      });
    },
    onError: (error) => setActionMsg({
      severity: 'error',
      text: error.response?.data?.error || 'حذف گروهی انجام نشد',
    }),
  });

  const toggleId = (id) => {
    setSelectedIds((previous) => (
      previous.includes(String(id))
        ? previous.filter((item) => item !== String(id))
        : [...previous, String(id)]
    ));
  };

  const toggleAll = (rows, checked) => {
    const ids = rows.map((row) => String(row.id));
    setSelectedIds((previous) => (
      checked
        ? Array.from(new Set([...previous, ...ids]))
        : previous.filter((id) => !ids.includes(id))
    ));
  };

  const advanceSelected = () => {
    if (!selectedCount) return;
    if (window.confirm(`${formatPersianNumber(selectedCount)} سند انتخاب‌شده به «${selectedTarget}» منتقل شوند؟`)) {
      advance.mutate({
        ids: selectedIds,
        all: false,
        fiscal_year: fiscalYear || undefined,
        status: status || undefined,
        q: debouncedQ || undefined,
      });
    }
  };

  const advanceAll = () => {
    const label = filterStage ? `همهٔ اسناد «${filterStage.label}»` : 'همهٔ اسناد فیلترشده';
    if (window.confirm(`${label} به «${allTarget}» منتقل شوند؟`)) {
      advance.mutate({
        ids: [],
        all: true,
        fiscal_year: fiscalYear || undefined,
        status: status || undefined,
        q: debouncedQ || undefined,
      });
    }
  };

  const deleteSelected = () => {
    if (!selectedCount) return;
    if (window.confirm(`${formatPersianNumber(selectedCount)} سند انتخاب‌شده برای همیشه حذف شوند؟`)) {
      remove.mutate({ ids: selectedIds, all: false, fiscal_year: fiscalYear || undefined });
    }
  };

  const deleteAll = () => {
    if (window.confirm(`همهٔ اسناد قابل حذف با فیلتر «${filterStage?.label || 'همه وضعیت‌ها'}» حذف شوند؟`)) {
      remove.mutate({
        ids: [], all: true,
        fiscal_year: fiscalYear || undefined,
        status: status || undefined,
        q: debouncedQ || undefined,
      });
    }
  };

  if (fiscalYear === null && !fyError) return <Box textAlign="center" py={6}><CircularProgress /></Box>;
  if (isLoading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        icon={<FactCheckIcon />}
        title="کنترل و چرخهٔ اسناد"
        actions={(
          <>
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <InputLabel>سال مالی</InputLabel>
              <Select value={fiscalYear ?? ''} label="سال مالی"
                onChange={(event) => setFiscalYear(event.target.value)}
                disabled={fiscalYear === null && !fyError}>
                <MenuItem value="">همه سال‌ها</MenuItem>
                {yearOptions.map((year) => (
                  <MenuItem key={year.id} value={String(year.id)}>
                    {year.name}{year.is_current ? ' · جاری' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<RefreshIcon />}
              onClick={() => qc.invalidateQueries({ queryKey: ['acc-control'] })} disabled={isFetching}>
              به‌روزرسانی
            </Button>
          </>
        )}
      />

      {actionMsg ? (
        <Alert severity={actionMsg.severity} onClose={() => setActionMsg(null)} sx={{ mb: 2, borderRadius: '12px' }}>
          {actionMsg.text}
        </Alert>
      ) : null}

      <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} useFlexGap alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            size="small"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="جستجوی شماره یا شرح سند…"
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: q ? (
                <InputAdornment position="end">
                  <Button size="small" sx={{ minWidth: 0, p: 0.4 }} onClick={() => setQ('')}>
                    <ClearIcon fontSize="small" />
                  </Button>
                </InputAdornment>
              ) : null,
            }}
            sx={{ flex: 1, minWidth: { xs: 0, md: 260 } }}
          />
          <FormControl size="small" sx={{ minWidth: 210 }}>
            <InputLabel>فیلتر مرحله</InputLabel>
            <Select value={status} label="فیلتر مرحله" onChange={(event) => setStatus(event.target.value)}>
              <MenuItem value="">همه مراحل</MenuItem>
              {STAGES.map((stage) => (
                <MenuItem key={stage.key} value={stage.key}>{stage.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip
            label={`${formatPersianNumber(d.documents_total || 0)} سند`}
            sx={{ bgcolor: 'rgba(15,118,110,0.08)', color: '#0f766e', fontWeight: 800 }}
          />
        </Stack>
      </Paper>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
        gap: 1.5, mb: 2,
      }}>
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const count = d.status_counts?.[stage.key] || 0;
          const active = status === stage.key;
          return (
            <Paper
              key={stage.key}
              onClick={() => setStatus(active ? '' : stage.key)}
              sx={{
                ...glass,
                p: 1.5,
                cursor: 'pointer',
                border: active ? `2px solid ${stage.color}` : '1px solid rgba(15,23,42,0.07)',
                bgcolor: active ? `${stage.color}0d` : '#fff',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Box sx={{
                  width: 34, height: 34, borderRadius: '10px', color: stage.color,
                  bgcolor: `${stage.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon sx={{ fontSize: 18 }} />
                </Box>
                <Chip size="small" label={`مرحله ${toPersianDigits(index + 1)}`}
                  sx={{ bgcolor: `${stage.color}12`, color: stage.color, fontWeight: 700 }} />
              </Stack>
              <Typography sx={{ mt: 1, fontWeight: 800, color: '#0f172a' }}>{stage.label}</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 900, color: stage.color, lineHeight: 1.4 }}>
                {formatPersianNumber(count)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                {stage.description}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <Chip size="small" label={`${formatPersianNumber(selectedCount)} سند انتخاب‌شده`}
            sx={{ bgcolor: 'rgba(37,99,235,0.08)', color: '#1d4ed8', fontWeight: 700 }} />
          <Button variant="contained" color="success" startIcon={<ArrowForwardIcon />}
            disabled={!selectedCount || advance.isPending} onClick={advanceSelected}
            sx={{ color: '#fff' }}>
            انتقال انتخاب‌شده به {selectedTarget}
          </Button>
          <Button variant="outlined" color="success" startIcon={<DoneAllIcon />}
            disabled={advance.isPending || status === 'locked'} onClick={advanceAll}>
            انتقال همهٔ {filterStage ? `«${filterStage.label}»` : 'فیلترشده'} به {allTarget}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
            disabled={!selectedCount || remove.isPending} onClick={deleteSelected}>
            حذف انتخاب‌شده
          </Button>
          <Button variant="text" color="error" startIcon={<DeleteOutlineIcon />}
            disabled={remove.isPending || !d.documents_total} onClick={deleteAll}>
            حذف همهٔ فیلترشده
          </Button>
        </Stack>
      </Paper>

      {d.counts?.unbalanced ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>
          {formatPersianNumber(d.counts.unbalanced)} سند نامتوازن در این فیلتر وجود دارد؛ انتقال مرحله‌ای متوقف نمی‌شود اما قبل از ثبت نهایی توازن را بررسی کنید.
        </Alert>
      ) : null}

      {d.documents_truncated ? (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          فقط ۱۰۰۰ سند اول نمایش داده شده است؛ برای دیدن و انتخاب بقیه، سال مالی، مرحله یا جستجو را محدودتر کنید.
        </Alert>
      ) : null}

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>فهرست اسناد</Typography>
        <Typography variant="caption" color="text.secondary">
          با هر انتقال، سند فقط یک مرحله جلو می‌رود؛ برگشت‌خورده در این چرخه نمایش داده نمی‌شود.
        </Typography>
      </Stack>

      <DocTable
        rows={documents}
        selectedIds={selectedIds}
        onToggle={toggleId}
        onToggleAll={toggleAll}
      />
    </Box>
  );
};

export default AccountingControlPage;





