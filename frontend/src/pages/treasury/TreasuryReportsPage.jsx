import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import InsightsIcon from '@mui/icons-material/Insights';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { asList, chipSx, useTreasuryTheme } from './treasuryMasterUi';

const ReportsPage = () => {
  const moduleTheme = useTreasuryTheme();
  const tableTheme = useModuleTheme();
  const [kind, setKind] = useState('daily');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entityId, setEntityId] = useState('');
  const [error, setError] = useState('');

  const catalogQuery = useQuery({
    queryKey: ['treasury-reports-catalog'],
    queryFn: () => axiosInstance.get('/treasury/reports/').then((response) => response.data),
    staleTime: 300_000,
  });
  const catalog = catalogQuery.data?.catalog || [];

  const entitiesQuery = useQuery({
    queryKey: ['treasury-entity-balances'],
    queryFn: () => axiosInstance.get('/treasury/treasury-entities/balances/')
      .then((response) => response.data),
    staleTime: 60_000,
  });
  const entities = asList(entitiesQuery.data);

  const reportQuery = useQuery({
    queryKey: ['treasury-report', kind, dateFrom, dateTo, entityId],
    queryFn: () => axiosInstance.get('/treasury/reports/', {
      params: {
        kind,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        entity: entityId || undefined,
      },
    }).then((response) => response.data),
    enabled: Boolean(kind),
    staleTime: 30_000,
  });
  const report = reportQuery.data;
  const rows = report?.rows || [];

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    tableTheme.tableTheme, Math.max(1, rows.length),
  );

  const columns = useMemo(() => (report?.columns || []).map((column) => ({
    key: column.key,
    label: column.label,
    width: column.width,
    align: ['date', 'type', 'status'].includes(column.key) ? 'center' : undefined,
    render: (row) => {
      const value = row[column.key];
      if (value === null || value === undefined || value === '') return '—';
      if (['amount', 'receipts', 'payments', 'net', 'balance', 'fee'].includes(column.key)) {
        return formatPersianNumber(value);
      }
      return value;
    },
  })), [report]);

  const exportExcel = () => {
    axiosInstance.get('/treasury/reports/', {
      params: {
        kind,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        entity: entityId || undefined,
        export: 'xlsx',
      },
      responseType: 'blob',
    }).then((response) => {
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `treasury-${kind}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    }).catch(() => setError('خروجی اکسل انجام نشد.'));
  };

  const totals = report?.totals || {};

  return (
    <Box>
      <PageHeader
        icon={<InsightsIcon />}
        title="گزارش‌های دریافت و پرداخت"
        subtitle="گزارش‌های تجمیعی خزانه با فیلتر تاریخ/حساب و خروجی Excel"
        badge={(
          <Chip size="small" label={report?.title || 'گزارش'} sx={chipSx(moduleTheme.accent)} />
        )}
        actions={(
          <Button size="small" variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
            onClick={exportExcel}>
            خروجی اکسل
          </Button>
        )}
      />

      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        mb: 1.25,
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
          <TextField select size="small" label="نوع گزارش" value={kind}
            onChange={(event) => setKind(event.target.value)} sx={{ minWidth: 220 }}>
            {catalog.map((item) => (
              <MenuItem key={item.key} value={item.key} sx={{ fontSize: 12 }}>
                {item.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="حساب/صندوق" value={entityId}
            onChange={(event) => setEntityId(event.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">همه</MenuItem>
            {entities.map((entity) => (
              <MenuItem key={entity.id} value={entity.id} sx={{ fontSize: 12 }}>
                {entity.name}
              </MenuItem>
            ))}
          </TextField>
          <JalaliMaskedDateInput label="از تاریخ" value={dateFrom}
            onChange={setDateFrom} variant="outlined" size="small" />
          <JalaliMaskedDateInput label="تا تاریخ" value={dateTo}
            onChange={setDateTo} variant="outlined" size="small" />
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            {Object.entries(totals).map(([key, value]) => (
              <Chip key={key} size="small"
                label={`${key === 'count' ? 'تعداد' : key} : ${
                  typeof value === 'string' && /^[0-9.]+$/.test(value)
                    ? formatPersianNumber(value)
                    : value
                }`}
                sx={chipSx(moduleTheme.accent)} />
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        {reportQuery.isLoading ? (
          <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : (
          <ModuleTable
            tableTheme={tableTheme.tableTheme}
            ariaLabel={report?.title || 'گزارش خزانه'}
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            rows={rows}
            rowKey={(row, index) => (
              `${index}-${row.date || row.party || row.entity || row.number || index}`
            )}
            emptyText="داده‌ای برای این گزارش پیدا نشد."
            columns={columns}
          />
        )}
        {rows.length ? (
          <Typography sx={{ fontSize: 10.5, opacity: 0.7, mt: 0.75 }}>
            {`${formatPersianNumber(rows.length)} ردیف — برای خروجی رسمی از دکمهٔ اکسل استفاده کنید.`}
          </Typography>
        ) : null}
      </Paper>
    </Box>
  );
};

export default ReportsPage;

