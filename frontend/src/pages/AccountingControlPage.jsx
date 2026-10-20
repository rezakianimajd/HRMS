import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControl, Grid,
  InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WarningIcon from '@mui/icons-material/Warning';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import InfoCard from '../core/components/ui/InfoCard';
import { toJalali } from '../core/utils/dateUtils';

const COLOR_DARK = '#0d9488';

const glass = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.07)',
  boxShadow: 'none',
  borderRadius: '16px',
};

const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: '#2563eb' },
  posted: { label: 'ثبت‌شده', color: '#0f766e' },
  locked: { label: 'قفل‌شده', color: '#6366f1' },
  reversed: { label: 'برگشت‌خورده', color: '#e11d48' },
};

const DocTable = ({
  title, rows, color, emptyText, selectable = false, selectedIds = [],
  onToggle, onToggleAll,
}) => {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(String(row.id)));
  const someSelected = rows.some((row) => selectedIds.includes(String(row.id)));

  return (
    <Paper sx={{ ...glass, p: 2, mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: color || COLOR_DARK, mb: 1 }}>
        {title} ({formatPersianNumber(rows.length)})
      </Typography>
      {rows.length === 0 ? <Typography variant="body2" color="textSecondary">{emptyText}</Typography> : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {selectable ? (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={(event) => onToggleAll?.(rows, event.target.checked)}
                    />
                  </TableCell>
                ) : null}
                <TableCell>شماره</TableCell><TableCell>تاریخ</TableCell><TableCell>شرح</TableCell>
                <TableCell>وضعیت</TableCell><TableCell>مرحله</TableCell>
                <TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>تفاوت</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const diff = Math.abs(Number(row.total_debit) - Number(row.total_credit));
                const statusMeta = STATUS_META[row.status] || { label: row.status_display || row.status, color: COLOR_DARK };
                return (
                  <TableRow key={row.id} hover>
                    {selectable ? (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selectedIds.includes(String(row.id))}
                          onChange={() => onToggle?.(row.id)}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell>{toPersianDigits(row.number)}</TableCell>
                    <TableCell>{toJalali(row.date)}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusMeta.label}
                        sx={{ bgcolor: `${statusMeta.color}18`, color: statusMeta.color, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>{row.approval_stage ? `${toPersianDigits(row.approval_stage)}/${toPersianDigits(row.approval_total || 1)}` : '—'}</TableCell>
                    <TableCell>{formatPersianNumber(row.total_debit)}</TableCell>
                    <TableCell>{formatPersianNumber(row.total_credit)}</TableCell>
                    <TableCell>{diff > 0 ? <Chip size="small" color="error" label={formatPersianNumber(diff)} /> : <Chip size="small" color="success" label="✔" />}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <InfoCard icon={icon} label={label} value={value} color={color} />
);

const AccountingControlPage = () => {
  const qc = useQueryClient();
  const [fiscalYear, setFiscalYear] = useState(null);
  const [status, setStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionMsg, setActionMsg] = useState(null);

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
  }, [fiscalYear, status]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['acc-control', fiscalYear, status],
    enabled: fiscalYear !== null || fyError,
    queryFn: () => axiosInstance.get('/accounting/documents/control/', {
      params: {
        fiscal_year: fiscalYear || undefined,
        status: status || undefined,
      },
    }).then((r) => r.data),
  });
  const d = data || {};
  const documents = d.documents || [];
  const selectedCount = selectedIds.length;
  const filterLabel = status ? STATUS_META[status]?.label || status : 'همه وضعیت‌ها';

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['acc-control'] });
    qc.invalidateQueries({ queryKey: ['accounting-documents'] });
    qc.invalidateQueries({ queryKey: ['accounting-dashboard-rich'] });
    qc.invalidateQueries({ queryKey: ['acc-finalize-list'] });
  };

  const approve = useMutation({
    mutationFn: (payload) => axiosInstance.post('/accounting/documents/bulk_approve/', payload),
    onSuccess: (response) => {
      refresh();
      setSelectedIds([]);
      const result = response.data || {};
      const messages = [`${formatPersianNumber(result.approved || 0)} سند نهایی تأیید شد`];
      if (result.staged) messages.push(`${formatPersianNumber(result.staged)} سند به مرحلهٔ بعد رفت`);
      if (result.errors?.length) messages.push(`${formatPersianNumber(result.errors.length)} خطا`);
      setActionMsg({ severity: result.errors?.length ? 'warning' : 'success', text: messages.join(' · ') });
    },
    onError: (error) => setActionMsg({
      severity: 'error',
      text: error.response?.data?.error || 'تأیید گروهی انجام نشد',
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

  const approveSelected = () => {
    if (!selectedCount) return;
    if (window.confirm(`${formatPersianNumber(selectedCount)} سند انتخاب‌شده در مرحلهٔ جاری تأیید شوند؟`)) {
      approve.mutate({ ids: selectedIds, all: false, fiscal_year: fiscalYear || undefined });
    }
  };

  const approveAll = () => {
    if (window.confirm(`همهٔ اسناد «در انتظار تأیید» ${fiscalYear ? 'در سال مالی انتخاب‌شده' : ''} مرحلهٔ جاری را تأیید کنند؟`)) {
      approve.mutate({ ids: [], all: true, fiscal_year: fiscalYear || undefined });
    }
  };

  const deleteSelected = () => {
    if (!selectedCount) return;
    if (window.confirm(`${formatPersianNumber(selectedCount)} سند انتخاب‌شده برای همیشه حذف شوند؟`)) {
      remove.mutate({ ids: selectedIds, all: false });
    }
  };

  const deleteAll = () => {
    if (window.confirm(`همهٔ اسناد قابل حذف با فیلتر «${filterLabel}» ${fiscalYear ? 'در سال مالی انتخاب‌شده' : ''} حذف شوند؟ اسناد ثبت/قفل‌شده حذف نمی‌شوند.`)) {
      remove.mutate({
        ids: [], all: true,
        fiscal_year: fiscalYear || undefined,
        status: status || undefined,
      });
    }
  };

  if (fiscalYear === null && !fyError) return <Box textAlign="center" py={6}><CircularProgress /></Box>;
  if (isLoading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        icon={<FactCheckIcon />}
        title="کنترل اسناد"
        actions={(
          <>
            <Button variant="outlined" startIcon={<RefreshIcon />}
              onClick={() => qc.invalidateQueries({ queryKey: ['acc-control'] })} disabled={isFetching}>
              به‌روزرسانی
            </Button>
            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
              disabled={!selectedCount || approve.isPending} onClick={approveSelected}>
              تأیید مرحله‌ای انتخاب‌شده ({toPersianDigits(selectedCount)})
            </Button>
            <Button variant="outlined" color="success" startIcon={<DoneAllIcon />}
              disabled={approve.isPending || !d.counts?.pending} onClick={approveAll}>
              تأیید همهٔ در انتظار
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
              disabled={!selectedCount || remove.isPending} onClick={deleteSelected}>
              حذف انتخاب‌شده
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
              disabled={remove.isPending || !d.documents_total} onClick={deleteAll}>
              حذف همهٔ فیلترشده
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
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap alignItems={{ xs: 'stretch', md: 'center' }}>
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
          <FormControl size="small" sx={{ minWidth: 210 }}>
            <InputLabel>وضعیت سند</InputLabel>
            <Select value={status} label="وضعیت سند" onChange={(event) => setStatus(event.target.value)}>
              <MenuItem value="">همه وضعیت‌ها</MenuItem>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <MenuItem key={key} value={key}>{meta.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="textSecondary">
            نمایش {formatPersianNumber(d.documents_total || 0)} سند با فیلتر «{filterLabel}»
          </Typography>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}><StatCard icon={<WarningIcon />} label="نامتوازن" value={d.counts?.unbalanced || 0} color="#ef4444" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<PendingActionsIcon />} label="در انتظار تأیید" value={d.counts?.pending || 0} color="#f59e0b" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<CheckCircleIcon />} label="آمادهٔ ثبت" value={d.counts?.ready_to_post || 0} color="#10b981" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<FactCheckIcon />} label="قطعی‌شده" value={d.counts?.posted || 0} color="#3b82f6" /></Grid>
      </Grid>

      {d.documents_truncated ? (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          فقط ۱۰۰۰ سند اول نمایش داده شده است؛ برای دیدن/انتخاب بقیه، سال مالی یا وضعیت را محدودتر کنید.
        </Alert>
      ) : null}

      <DocTable
        title={`کل اسناد — ${filterLabel}`}
        rows={documents}
        color={COLOR_DARK}
        emptyText="سندی با این فیلترها وجود ندارد"
        selectable
        selectedIds={selectedIds}
        onToggle={toggleId}
        onToggleAll={toggleAll}
      />
    </Box>
  );
};

export default AccountingControlPage;



