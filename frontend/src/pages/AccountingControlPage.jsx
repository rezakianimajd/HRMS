import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Grid, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography,
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

const COLOR = '#14b8a6';
const COLOR_DARK = '#0d9488';

const glass = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.07)',
  boxShadow: 'none',
  borderRadius: '16px',
};

const StatCard = ({ icon, label, value, color }) => (
  <InfoCard icon={icon} label={label} value={value} color={color} />
);

const DocTable = ({
  title, rows, color, emptyText, selectable = false, selectedIds = [],
  onToggle, onToggleAll,
}) => {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(String(row.id)));
  const someSelected = rows.some((row) => selectedIds.includes(String(row.id)));

  return (
    <Paper sx={{ ...glass, p: 2, mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: color || COLOR_DARK, mb: 1 }}>
        {title} ({rows.length})
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
                <TableCell>مرحله</TableCell>
                <TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>تفاوت</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const diff = Math.abs(Number(row.total_debit) - Number(row.total_credit));
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
                    <TableCell>{row.number}</TableCell>
                    <TableCell>{toJalali(row.date)}</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</TableCell>
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

const AccountingControlPage = () => {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionMsg, setActionMsg] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['acc-control'],
    queryFn: () => axiosInstance.get('/accounting/documents/control/').then((r) => r.data),
  });
  const d = data || {};
  const selectedCount = selectedIds.length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['acc-control'] });
    qc.invalidateQueries({ queryKey: ['accounting-documents'] });
    qc.invalidateQueries({ queryKey: ['accounting-dashboard-rich'] });
    qc.invalidateQueries({ queryKey: ['acc-finalize-list'] });
  };

  const approve = useMutation({
    mutationFn: ({ ids, all }) => axiosInstance.post('/accounting/documents/bulk_approve/', { ids, all }),
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
    mutationFn: ({ ids, all }) => axiosInstance.post('/accounting/documents/bulk_delete/', { ids, all }),
    onSuccess: (response) => {
      refresh();
      setSelectedIds([]);
      const result = response.data || {};
      setActionMsg({
        severity: result.errors?.length ? 'warning' : 'success',
        text: `${formatPersianNumber(result.deleted || 0)} سند حذف شد${result.errors?.length ? ` · ${formatPersianNumber(result.errors.length)} سند قابل حذف نبود` : ''}`,
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
      approve.mutate({ ids: selectedIds, all: false });
    }
  };

  const approveAll = () => {
    if (window.confirm('همهٔ اسناد در انتظار تأیید، مرحلهٔ جاری را تأیید کنند؟')) {
      approve.mutate({ ids: [], all: true });
    }
  };

  const deleteSelected = () => {
    if (!selectedCount) return;
    if (window.confirm(`${formatPersianNumber(selectedCount)} سند انتخاب‌شده برای همیشه حذف شوند؟`)) {
      remove.mutate({ ids: selectedIds, all: false });
    }
  };

  const deleteAll = () => {
    if (window.confirm('همهٔ اسناد قابل حذف (پیش‌نویس، در انتظار و تأییدشده) حذف شوند؟ اسناد ثبت/قفل‌شده حذف نمی‌شوند.')) {
      remove.mutate({ ids: [], all: true });
    }
  };

  if (isLoading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        icon={<FactCheckIcon />}
        title="کنترل اسناد"
        subtitle="بررسی توازن، تأیید مرحله‌ای و حذف گروهی اسناد قابل ویرایش"
        actions={(
          <>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => qc.invalidateQueries({ queryKey: ['acc-control'] })}>به‌روزرسانی</Button>
            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
              disabled={!selectedCount || approve.isPending} onClick={approveSelected}>
              تأیید مرحله‌ای انتخاب‌شده ({toPersianDigits(selectedCount)})
            </Button>
            <Button variant="outlined" color="success" startIcon={<DoneAllIcon />}
              disabled={approve.isPending} onClick={approveAll}>
              تأیید همهٔ در انتظار
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
              disabled={!selectedCount || remove.isPending} onClick={deleteSelected}>
              حذف انتخاب‌شده
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
              disabled={remove.isPending} onClick={deleteAll}>
              حذف همهٔ قابل حذف
            </Button>
          </>
        )}
      />

      {actionMsg ? (
        <Alert severity={actionMsg.severity} onClose={() => setActionMsg(null)} sx={{ mb: 2, borderRadius: '12px' }}>
          {actionMsg.text}
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}><StatCard icon={<WarningIcon />} label="نامتوازن" value={d.counts?.unbalanced || 0} color="#ef4444" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<PendingActionsIcon />} label="در انتظار تأیید" value={d.counts?.pending || 0} color="#f59e0b" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<CheckCircleIcon />} label="آمادهٔ ثبت" value={d.counts?.ready_to_post || 0} color="#10b981" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<FactCheckIcon />} label="قطعی‌شده" value={d.counts?.posted || 0} color="#3b82f6" /></Grid>
      </Grid>

      <DocTable title="اسناد نامتوازن" rows={d.unbalanced || []} color="#ef4444" emptyText="هیچ سند نامتوازنی وجود ندارد" selectable selectedIds={selectedIds} onToggle={toggleId} onToggleAll={toggleAll} />
      <DocTable title="در انتظار تأیید" rows={d.pending || []} color="#f59e0b" emptyText="سندی در انتظار تأیید نیست" selectable selectedIds={selectedIds} onToggle={toggleId} onToggleAll={toggleAll} />
      <DocTable title="آمادهٔ ثبت نهایی" rows={d.ready_to_post || []} color="#10b981" emptyText="سند آمادهٔ ثبتی نیست" selectable selectedIds={selectedIds} onToggle={toggleId} onToggleAll={toggleAll} />
    </Box>
  );
};

export default AccountingControlPage;


