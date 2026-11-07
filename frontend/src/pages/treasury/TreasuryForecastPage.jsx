import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Paper, Stack, Typography,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import InsightsIcon from '@mui/icons-material/Insights';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { asList, chipSx, dateLabel, useTreasuryTheme } from './treasuryMasterUi';
import { STATUS_TONE, statusChip } from './treasuryListUi';

/**
 * پیش‌بینی نقدینگی و تقویم سررسید — تمام ظاهر از توکن‌های استودیو تم.
 */

const KpiTile = ({ label, value, color, hint }) => (
  <Paper elevation={0} sx={{
    p: 1,
    borderRadius: 'var(--hrms-info-card-radius, 14px)',
    border: '1px solid',
    borderColor: 'divider',
    minWidth: 0,
  }}>
    <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75 }}>{label}</Typography>
    <Typography noWrap sx={{
      fontSize: 15,
      fontWeight: 900,
      color,
      fontFamily: 'var(--hrms-table-number-font, inherit)',
    }}>
      {value}
    </Typography>
    {hint ? <Typography noWrap sx={{ fontSize: 9.5, opacity: 0.65 }}>{hint}</Typography> : null}
  </Paper>
);

const CheckSection = ({ title, endpoint, queryKey, accent }) => {
  const tableTheme = useModuleTheme();
  const query = useQuery({
    queryKey: [queryKey],
    queryFn: () => axiosInstance.get(endpoint, {
      params: { due_soon: 1, page_size: 20, ordering: 'due_date' },
    }).then((response) => response.data),
    staleTime: 60_000,
  });
  const rows = asList(query.data);
  const { ref, rowHeight, tableHeight } = useRowHeight(
    tableTheme.tableTheme, Math.max(1, rows.length),
  );

  const columns = useMemo(() => ([
    { key: 'number', label: 'شماره چک', width: '16%' },
    { key: 'party', label: 'طرف حساب', width: '28%', render: (row) => row.party || '—' },
    {
      key: 'due_date',
      label: 'سررسید',
      width: '16%',
      render: (row) => dateLabel(row.due_date),
    },
    {
      key: 'amount',
      label: 'مبلغ',
      width: '20%',
      align: 'center',
      render: (row) => formatPersianNumber(row.amount),
    },
    {
      key: 'status',
      label: 'وضعیت',
      width: '20%',
      align: 'center',
      render: (row) => statusChip(row),
    },
  ]), []);

  return (
    <Paper elevation={0} sx={{
      p: 1.25,
      borderRadius: 'var(--hrms-table-radius, 16px)',
      border: '1px solid',
      borderColor: 'divider',
    }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
        <Chip size="small" label={title} sx={chipSx(accent)} />
        <Typography sx={{ fontSize: 10.5, opacity: 0.7 }}>
          {`${formatPersianNumber(rows.length)} سند نزدیک سررسید`}
        </Typography>
        {query.isFetching ? <CircularProgress size={12} sx={{ color: accent }} /> : null}
      </Stack>
      <ModuleTable
        tableTheme={tableTheme.tableTheme}
        ariaLabel={title}
        containerRef={ref}
        tableHeight={Math.min(tableHeight, 320)}
        rowHeight={rowHeight}
        rows={rows}
        rowKey={(row) => row.id}
        dimmed={query.isFetching}
        emptyText="سندی نزدیک سررسید نیست."
        columns={columns}
        minWidth={640}
      />
    </Paper>
  );
};

const TreasuryForecastPage = () => {
  const moduleTheme = useTreasuryTheme();
  const tableTheme = useModuleTheme();
  const [days, setDays] = useState(90);

  const forecastQuery = useQuery({
    queryKey: ['treasury-forecast', days],
    queryFn: () => axiosInstance.get('/treasury/cash-flow-forecast/', { params: { days } })
      .then((response) => response.data),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const reconciliationQuery = useQuery({
    queryKey: ['treasury-reconciliations'],
    queryFn: () => axiosInstance.get('/treasury/treasury-reconciliations/')
      .then((response) => response.data),
    staleTime: 60_000,
  });

  const forecast = forecastQuery.data;
  const reconciliations = asList(reconciliationQuery.data);
  const { ref: reconRef, rowHeight: reconRow, tableHeight: reconHeight } = useRowHeight(
    tableTheme.tableTheme, Math.max(1, reconciliations.length),
  );

  const reconColumns = useMemo(() => ([
    {
      key: 'entity_name',
      label: 'حساب/صندوق',
      width: '22%',
      render: (row) => row.entity_name || '—',
    },
    { key: 'as_of', label: 'تاریخ', width: '12%', render: (row) => dateLabel(row.as_of) },
    {
      key: 'statement_balance',
      label: 'موجودی اعلامی',
      width: '18%',
      align: 'center',
      render: (row) => formatPersianNumber(row.statement_balance),
    },
    {
      key: 'book_balance',
      label: 'مانده دفتری',
      width: '18%',
      align: 'center',
      render: (row) => formatPersianNumber(row.book_balance),
    },
    {
      key: 'difference',
      label: 'اختلاف',
      width: '16%',
      align: 'center',
      render: (row) => (
        <Typography sx={{
          fontSize: 11,
          fontWeight: 800,
          color: Number(row.difference) === 0 ? STATUS_TONE.cleared : STATUS_TONE.bounced,
        }}>
          {formatPersianNumber(row.difference)}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      width: '14%',
      align: 'center',
      render: (row) => statusChip(row),
    },
  ]), []);

  const balance = Number(forecast?.forecast_balance || 0);

  return (
    <Box>
      <PageHeader
        icon={<InsightsIcon />}
        title="پیش‌بینی نقدینگی و تقویم سررسید"
        subtitle="منابع + دریافت‌های آتی − پرداخت‌های قطعی − تعهدات آینده"
        actions={(
          <Stack direction="row" spacing={0.5}>
            {[7, 30, 90].map((option) => (
              <Button
                key={option}
                size="small"
                variant={days === option ? 'contained' : 'outlined'}
                onClick={() => setDays(option)}
              >
                {`${formatPersianNumber(option)} روز`}
              </Button>
            ))}
          </Stack>
        )}
      />

      <Box sx={{
        display: 'grid',
        gap: 1,
        mb: 1.25,
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
      }}>
        <KpiTile
          label="موجودی نقد فعلی"
          value={formatPersianNumber(forecast?.current_cash || 0)}
          color={STATUS_TONE.cleared}
        />
        <KpiTile
          label="دریافت‌های آتی"
          value={formatPersianNumber(forecast?.expected_in || 0)}
          color="#0ea5e9"
        />
        <KpiTile
          label="پرداخت‌های قطعی"
          value={formatPersianNumber(forecast?.scheduled_out || 0)}
          color={STATUS_TONE.draft}
        />
        <KpiTile
          label="ماندهٔ پیش‌بینی‌شده"
          value={formatPersianNumber(balance)}
          color={balance >= 0 ? STATUS_TONE.cleared : STATUS_TONE.bounced}
          hint={`افق ${formatPersianNumber(days)} روز`}
        />
      </Box>

      <Box sx={{
        display: 'grid',
        gap: 1,
        mb: 1.25,
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
      }}>
        <CheckSection
          title="چک‌های پرداختی نزدیک سررسید"
          endpoint="/treasury/issued-checks/"
          queryKey="treasury-due-issued-checks"
          accent={moduleTheme.accent}
        />
        <CheckSection
          title="چک‌های دریافتی نزدیک سررسید"
          endpoint="/treasury/received-checks/"
          queryKey="treasury-due-received-checks"
          accent="#10b981"
        />
      </Box>

      <Paper elevation={0} sx={{
        p: 1.25,
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: 'divider',
      }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
          <Chip
            size="small"
            icon={<CalendarMonthIcon />}
            label="مغایرت خزانه"
            sx={chipSx(moduleTheme.accent)}
          />
        </Stack>
        <ModuleTable
          tableTheme={tableTheme.tableTheme}
          ariaLabel="مغایرت خزانه"
          containerRef={reconRef}
          tableHeight={Math.min(reconHeight, 320)}
          rowHeight={reconRow}
          rows={reconciliations}
          rowKey={(row) => row.id}
          dimmed={reconciliationQuery.isFetching}
          emptyText="هنوز مغایرتی ثبت نشده است."
          columns={reconColumns}
          minWidth={700}
        />
      </Paper>
    </Box>
  );
};

export default TreasuryForecastPage;

