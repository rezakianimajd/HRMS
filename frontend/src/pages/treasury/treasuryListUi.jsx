import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment, MenuItem,
  Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import { QuickCreateButton } from '../../core/components/ui/QuickCreateDialog';
import {
  ModulePager, ModuleTable, useModuleTheme, useRowHeight,
} from '../contracts/contractModuleUi';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { asList, chipSx, dateLabel, useTreasuryTheme } from './treasuryMasterUi';

/**
 * موتور فهرست تم‌محور خزانه: هدر تطبیق‌پذیر (PageHeader با توکن‌های استودیو)،
 * نوار جست‌وجو + فیلتر، جدول استاندارد (ModuleTable) و صفحه‌بندی سروری.
 * هر صفحه فقط «کانفیگ» می‌دهد تا ظاهر همهٔ صفحات یکدست بماند.
 */

export const STATUS_TONE = {
  draft: '#b45309', expected: '#0ea5e9', received: '#0f766e', registered: '#0ea5e9',
  in_custody: '#0ea5e9', deposited: '#0284c7', clearing: '#7c3aed', cleared: '#0f766e',
  collected: '#0f766e', delivered: '#0ea5e9', issued: '#0ea5e9', posted: '#0f766e',
  paid: '#0f766e', matched: '#0f766e', open: '#b45309', pending: '#b45309',
  submitted: '#0ea5e9', under_review: '#b45309', approved: '#7c3aed',
  scheduled: '#7c3aed', payment_ordered: '#7c3aed', bounced: '#be123c',
  returned: '#be123c', returned_to_customer: '#be123c', rejected: '#be123c',
  cancelled: '#64748b', archived: '#475569', released: '#0f766e', active: '#0f766e',
  partial: '#b45309', ignored: '#64748b', adjusted: '#7c3aed',
};

const useDebounced = (value, delay = 320) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

export const statusChip = (row, key = 'status', labelKey = 'status_display') => (
  <Chip
    size="small"
    label={row[labelKey] || row[key] || '—'}
    sx={chipSx(STATUS_TONE[row[key]] || '#64748b')}
  />
);

const cellValue = (column, row) => {
  if (column.render) return column.render(row);
  const value = row[column.key];
  if (value === null || value === undefined || value === '') return '—';
  if (column.type === 'money') return formatPersianNumber(value);
  if (column.type === 'date') return dateLabel(value);
  if (column.type === 'chip') {
    return statusChip(row, column.key, column.labelKey || `${column.key}_display`);
  }
  return value;
};

export const TreasuryListPage = ({
  title, subtitle, icon, endpoint, queryKey, emptyText,
  searchPlaceholder = 'جست‌وجو…', columns, filters = [], defaultParams = {},
  kpis = [], rowActions = [], quickCreate = null, headerActions = null,
  rowKey = (row) => row.id, pageSize = 25,
}) => {
  const moduleTheme = useTreasuryTheme();
  const tableTheme = useModuleTheme();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(0);
  const [filterValues, setFilterValues] = useState(() => {
    const initial = {};
    filters.forEach((filter) => {
      initial[filter.key] = searchParams.get(filter.key) || filter.default || '';
    });
    return initial;
  });
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const debouncedSearch = useDebounced(search);

  const entitiesQuery = useQuery({
    queryKey: ['treasury-entity-balances'],
    queryFn: () => axiosInstance.get('/treasury/treasury-entities/balances/')
      .then((response) => response.data),
    staleTime: 120_000,
    enabled: filters.some((filter) => filter.optionsFrom === 'entities'),
  });
  const entities = asList(entitiesQuery.data);

  const params = useMemo(() => {
    const merged = { ...defaultParams, page: page + 1, page_size: pageSize };
    if (debouncedSearch) merged.search = debouncedSearch;
    filters.forEach((filter) => {
      const value = filterValues[filter.key];
      if (value !== '' && value !== undefined && value !== null) {
        merged[filter.key] = value;
      }
    });
    return merged;
  }, [defaultParams, page, pageSize, debouncedSearch, filters, filterValues]);

  const listQuery = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => axiosInstance.get(endpoint, { params }).then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 20_000,
  });
  const rows = asList(listQuery.data);
  const total = listQuery.data?.count ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    tableTheme.tableTheme, Math.max(1, rows.length),
  );

  const resetFilters = () => {
    setSearch('');
    setPage(0);
    const cleared = {};
    filters.forEach((filter) => { cleared[filter.key] = filter.default || ''; });
    setFilterValues(cleared);
  };
  const activeFilterCount = filters.filter((filter) => filterValues[filter.key]).length
    + (search ? 1 : 0);

  const runAction = useMutation({
    mutationFn: ({ row, action }) => {
      if (action.onRun) return Promise.resolve(action.onRun(row));
      const url = typeof action.url === 'function' ? action.url(row) : action.url;
      const payload = action.payload ? action.payload(row) : {};
      return action.method === 'get'
        ? axiosInstance.get(url, { params: payload })
        : axiosInstance.post(url, payload);
    },
    onSuccess: (_response, variables) => {
      qc.invalidateQueries({ queryKey });
      if (!variables.action.silent) {
        setToast(`${variables.action.successLabel || variables.action.label} انجام شد.`);
      }
      setError('');
    },
    onError: (err) => setError(
      err?.response?.data?.error
      || err?.response?.data?.detail
      || 'عملیات انجام نشد.',
    ),
  });


  const allColumns = useMemo(() => ([
    ...columns,
    ...(rowActions.length ? [{
      key: 'row-actions',
      label: 'عملیات',
      width: '16%',
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.3} justifyContent="center" useFlexGap flexWrap="wrap">
          {rowActions
            .filter((action) => !action.visible || action.visible(row))
            .map((action) => (
              <Tooltip key={action.key} title={action.tooltip || action.label}>
                <span>
                  <Button
                    size="small"
                    sx={{ minWidth: 0, px: 0.6, py: 0.2, fontSize: 10.5 }}
                    disabled={(action.disabled && action.disabled(row)) || runAction.isPending}
                    onClick={() => runAction.mutate({ row, action })}
                  >
                    {action.label}
                  </Button>
                </span>
              </Tooltip>
            ))}
        </Stack>
      ),
    }] : []),
  ]), [columns, rowActions, runAction.isPending]); // eslint-disable-line

  const filterOptions = (filter) => (
    filter.optionsFrom === 'entities'
      ? entities.map((entity) => ({ value: entity.id, label: entity.name }))
      : filter.options || []
  );

  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
  }, [page, totalPages]);

  const kpiRows = kpis.map((kpi) => ({
    ...kpi,
    value: typeof kpi.value === 'function' ? kpi.value({ rows, total }) : kpi.value,
  }));

  return (
    <Box>
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        badge={(
          <Chip size="small" label={`${formatPersianNumber(total)} مورد`}
            sx={chipSx(moduleTheme.accent)} />
        )}
        actions={(
          <>
            {headerActions}
            <Tooltip title="بازخوانی">
              <IconButton size="small" aria-label="بازخوانی"
                onClick={() => listQuery.refetch()}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            {quickCreate ? (
              <QuickCreateButton
                title={quickCreate.label}
                color={moduleTheme.accent}
                endpoint={quickCreate.endpoint || endpoint}
                fields={quickCreate.fields || []}
                onSaved={() => qc.invalidateQueries({ queryKey })}
              />
            ) : null}
          </>
        )}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 1, borderRadius: '12px' }} onClose={() => setError('')}>
          <Typography sx={{ fontSize: 12 }}>{error}</Typography>
        </Alert>
      ) : null}
      {toast ? (
        <Alert severity="success" sx={{ mb: 1, borderRadius: '12px' }} onClose={() => setToast('')}>
          <Typography sx={{ fontSize: 12 }}>{toast}</Typography>
        </Alert>
      ) : null}

      {kpiRows.length ? (
        <Box sx={{
          display: 'grid',
          gap: 1,
          mb: 1.25,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: `repeat(${Math.min(kpiRows.length, 4)}, minmax(0, 1fr))`,
          },
        }}>
          {kpiRows.map((kpi) => (
            <Paper key={kpi.label} elevation={0} sx={{
              p: 1,
              borderRadius: 'var(--hrms-info-card-radius, 14px)',
              border: '1px solid',
              borderColor: 'divider',
              minWidth: 0,
            }}>
              <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75 }}>
                {kpi.label}
              </Typography>
              <Typography noWrap sx={{
                fontSize: 15, fontWeight: 900, color: kpi.color || moduleTheme.accent,
                fontFamily: 'var(--hrms-table-number-font, inherit)',
              }}>
                {kpi.value}
              </Typography>
              {kpi.hint ? (
                <Typography noWrap sx={{ fontSize: 9.5, opacity: 0.65 }}>{kpi.hint}</Typography>
              ) : null}
            </Paper>
          ))}
        </Box>
      ) : null}


      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper',
        boxShadow: 'none',
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', md: 'center' }}
          useFlexGap
          flexWrap="wrap"
          sx={{ mb: 1 }}
        >
          <TextField
            size="small"
            value={search}
            placeholder={searchPlaceholder}
            inputProps={{ 'aria-label': searchPlaceholder }}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: '100%', md: 250 } }}
          />
          {filters.map((filter) => (
            filter.type === 'date' ? (
              <JalaliMaskedDateInput
                key={filter.key}
                label={filter.label}
                value={filterValues[filter.key]}
                onChange={(value) => {
                  setFilterValues((previous) => ({ ...previous, [filter.key]: value }));
                  setPage(0);
                }}
                variant="outlined"
                size="small"
              />
            ) : (
              <TextField
                key={filter.key}
                select
                size="small"
                label={filter.label}
                value={filterValues[filter.key]}
                onChange={(event) => {
                  setFilterValues((previous) => ({
                    ...previous, [filter.key]: event.target.value,
                  }));
                  setPage(0);
                }}
                sx={{ minWidth: filter.width || 150 }}
              >
                <MenuItem value="">همه</MenuItem>
                {filterOptions(filter).map((option) => (
                  <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12 }}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )
          ))}
          <Box sx={{ flex: 1 }} />
          {activeFilterCount ? (
            <Button size="small" startIcon={<ClearAllIcon sx={{ fontSize: 15 }} />}
              onClick={resetFilters} sx={{ fontSize: 11, color: 'text.secondary' }}>
              {`پاک‌کردن ${formatPersianNumber(activeFilterCount)} فیلتر`}
            </Button>
          ) : null}
          {listQuery.isFetching ? (
            <CircularProgress size={14} sx={{ color: moduleTheme.accent }} />
          ) : null}
        </Stack>

        {listQuery.isLoading && !rows.length ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={22} sx={{ color: moduleTheme.accent }} />
          </Box>
        ) : (
          <ModuleTable
            tableTheme={tableTheme.tableTheme}
            ariaLabel={title}
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            rows={rows}
            rowKey={rowKey}
            dimmed={listQuery.isFetching}
            emptyText={emptyText || 'ردیفی با این فیلترها پیدا نشد.'}
            columns={allColumns.map((column) => ({
              ...column,
              render: (row, index) => cellValue(column, row, index),
            }))}
          />
        )}

        <ModulePager
          tableTheme={tableTheme.tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={total}
          pageSize={pageSize}
          unit="ردیف"
        />
      </Paper>
    </Box>
  );
};

export default TreasuryListPage;

