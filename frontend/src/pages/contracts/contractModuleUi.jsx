import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Chip, Collapse, FormControl, IconButton, InputAdornment, InputLabel, MenuItem,
  Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import { resolveTableTheme, tableTypographySx } from '../../core/theme/tableStyles';
import { resolveToolbarTheme } from '../../core/theme/toolbarStyles';
import { INK, MUTED } from './ContractProfileUI';

/**
 * اجزای مشترک صفحه‌های مالی قرارداد (الحاقیه‌ها، پرداخت‌ها، فاکتورها، صورت‌وضعیت)
 * با همان الگو و توکن‌های استودیو تمِ صفحهٔ تضامین.
 */

/* توکن‌های تم + اندازه‌های کارت */
export const useModuleTheme = () => {
  const theme = useTheme();
  const { tokens } = useDesignTokens();
  const tableTheme = resolveTableTheme(tokens);
  const toolbar = resolveToolbarTheme(tokens);
  return {
    theme,
    tableTheme,
    toolbar,
    cardPadX: Math.max(12, Number(tableTheme.frameX) || 0),
    cardPadY: Math.max(12, Number(tableTheme.frameY) || 0),
    cardBorderColor: alpha(theme.palette.text.primary, 0.14),
  };
};

export const SortArrow = ({ className, ...rest }) => (
  <ExpandMoreIcon
    {...rest}
    sx={{ position: 'absolute', left: 8, top: 'calc(50% - 10px)', fontSize: 20, color: 'text.secondary', pointerEvents: 'none' }}
  />
);

export const FilterSelect = ({ label, value, options, onChange, labelsPosition, radius = 8 }) => (
  <Box>
    {labelsPosition === 'above' ? (
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
    ) : null}
    <FormControl size="small" fullWidth>
      {labelsPosition === 'inline' ? <InputLabel>{label}</InputLabel> : null}
      <Select
        value={value || ''}
        label={labelsPosition === 'inline' ? label : undefined}
        displayEmpty={labelsPosition !== 'inline'}
        onChange={(event) => onChange(event.target.value)}
        sx={{ fontSize: 12.5, borderRadius: `${radius}px`, bgcolor: 'background.paper' }}
        renderValue={(selected) => {
          const match = options.find((option) => String(option.value) === String(selected));
          if (!match || match.value === '') {
            return <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>همه</Typography>;
          }
          return <Typography component="span" sx={{ fontSize: 12, fontWeight: 700 }}>{match.label}</Typography>;
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  </Box>
);

export const ModulePager = ({ tableTheme, page, onPage, totalPages, pageNumbers, total, pageSize, unit = 'سند' }) => {
  if (!tableTheme.showPagination || total <= pageSize) return null;
  return (
    <Box sx={{
      px: 1.5,
      py: tableTheme.paginationDense ? 0.75 : 1.25,
      borderTop: '1px solid',
      borderColor: 'var(--hrms-table-border-color, #e8edf4)',
    }}>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 32 }}>
        {tableTheme.showPaginationRange ? (
          <Typography sx={{
            position: 'absolute', insetInlineStart: 0,
            display: { xs: 'none', sm: 'block' },
            fontSize: tableTheme.paginationFontSize - 0.5,
            color: 'text.secondary', whiteSpace: 'nowrap',
          }}>
            نمایش {toPersianDigits(page * pageSize + 1)} تا{' '}
            {toPersianDigits(Math.min((page + 1) * pageSize, total))} از {toPersianDigits(total)} {unit}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={0.5} useFlexGap alignItems="center">
          <IconButton size="small" disabled={page === 0} onClick={() => onPage(0)} aria-label="صفحهٔ اول"
            sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
            <FirstPageIcon fontSize="small" sx={{ transform: 'scaleX(-1)' }} />
          </IconButton>
          <IconButton size="small" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="صفحهٔ قبل"
            sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
          {pageNumbers.map((index) => (
            <Box
              key={index}
              component="button"
              type="button"
              onClick={() => onPage(index)}
              aria-current={index === page ? 'page' : undefined}
              sx={{
                minWidth: 28, height: 28, px: 0.75,
                borderRadius: `${tableTheme.paginationRadius}px`,
                border: '1px solid',
                borderColor: index === page ? tableTheme.paginationAccent : 'divider',
                bgcolor: index === page ? tableTheme.paginationAccent : 'transparent',
                color: index === page ? '#fff' : 'text.secondary',
                fontFamily: 'inherit',
                fontSize: tableTheme.paginationFontSize,
                fontWeight: index === page ? 800 : 600,
                cursor: 'pointer',
              }}
            >
              {toPersianDigits(index + 1)}
            </Box>
          ))}
          <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)} aria-label="صفحهٔ بعد"
            sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => onPage(totalPages - 1)} aria-label="صفحهٔ آخر"
            sx={{ color: tableTheme.paginationAccent, p: 0.4 }}>
            <LastPageIcon fontSize="small" sx={{ transform: 'scaleX(-1)' }} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
};


/* جدول استاندارد (هدر چسبان + توکن‌های تم) */
export const ModuleTable = ({ tableTheme, columns, rows, rowKey, onRowClick, containerRef, tableHeight, rowHeight, dimmed, emptyText, ariaLabel }) => (
  <TableContainer
    ref={containerRef}
    sx={{
      height: tableHeight ? { xs: 'auto', sm: `${tableHeight}px` } : 'auto',
      maxHeight: tableHeight ? { xs: 'none', sm: `${tableHeight}px` } : 'none',
      overflowY: 'auto',
      opacity: dimmed ? 0.6 : 1,
      transition: 'opacity .15s ease',
    }}
  >
    <Table
      size="small"
      stickyHeader
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        minWidth: 860,
        tableLayout: 'fixed',
        '& td, & th': {
          px: 1,
          py: `${tableTheme.cellPadding}px`,
          whiteSpace: tableTheme.singleLine ? 'nowrap' : 'normal',
          borderBottom: tableTheme.divider,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        '& thead th': {
          textAlign: 'center !important',
          backgroundColor: 'var(--hrms-table-header-bg)',
          height: `${tableTheme.headerHeight}px`,
          fontSize: tableTheme.header.fontSize,
          fontWeight: tableTheme.header.fontWeight,
          color: tableTheme.header.color,
        },
        '& tbody td': {
          height: `${tableTheme.rowHeight}px`,
          fontSize: tableTheme.cell.fontSize,
          fontWeight: tableTheme.cell.fontWeight,
          color: tableTheme.cell.color,
        },
        '& tbody tr.MuiTableRow-hover:hover': { backgroundColor: tableTheme.hoverBg },
        '& th.hrms-cell-center, & td.hrms-cell-center': { textAlign: 'center !important' },
        ...tableTypographySx(tableTheme),
      }}
    >
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableCell
              key={column.key}
              align="center"
              className={column.align === 'center' ? 'hrms-cell-center' : undefined}
              sx={{ width: column.width }}
            >
              {column.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length ? rows.map((row, index) => (
          <TableRow
            key={rowKey ? rowKey(row, index) : index}
            hover={Boolean(onRowClick)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            sx={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align || 'right'}
                className={column.align === 'center' ? 'hrms-cell-center' : undefined}
              >
                {column.render(row, index)}
              </TableCell>
            ))}
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
              <Typography sx={{ fontSize: 11.5, color: MUTED }}>{emptyText || 'موردی برای نمایش نیست.'}</Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);


/* صفحهٔ اول مشترک ماژول‌های مالی: فهرست قراردادها با جمع‌های همان ماژول */
export const ContractPickerLanding = ({
  theme, contracts = [], records = [], getContractId, metrics, columns,
  onSelect, searchPlaceholder = 'جستجو در شماره، موضوع و طرف قرارداد…', sortOptions = [], ariaLabel,
}) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(sortOptions[0]?.value || '');
  const [onlyWithRecords, setOnlyWithRecords] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { tableTheme, toolbar } = theme;

  const aggregates = useMemo(() => {
    const map = new Map();
    records.forEach((record) => {
      const key = String(getContractId ? getContractId(record) : record.contract ?? '');
      if (!key || key === 'null') return;
      const entry = map.get(key) || { count: 0 };
      const values = metrics ? metrics(record) : {};
      entry.count += 1;
      Object.entries(values).forEach(([name, value]) => {
        entry[name] = (entry[name] || 0) + (Number(value) || 0);
      });
      map.set(key, entry);
    });
    return map;
  }, [records, getContractId, metrics]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = contracts
      .filter((contract) => {
        const agg = aggregates.get(String(contract.id));
        if (onlyWithRecords && (!agg || !agg.count)) return false;
        if (!term) return true;
        return [contract.number, contract.subject, contract.party_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .map((contract) => {
        const agg = aggregates.get(String(contract.id)) || { count: 0 };
        return { contract, count: agg.count, ...agg };
      });
    return [...list].sort((a, b) => {
      if (sort === 'count') return b.count - a.count;
      if (sort === 'number') return String(a.contract.number || '').localeCompare(String(b.contract.number || ''), 'fa');
      const metricKey = sort || 'count';
      return (Number(b[metricKey]) || 0) - (Number(a[metricKey]) || 0);
    });
  }, [contracts, aggregates, search, onlyWithRecords, sort]);

  const pageSize = tableTheme.rowsPerPage;
  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(rows.length, pageSize, [search, onlyWithRecords, sort, pageSize]);
  const paged = useMemo(() => rows.slice(page * pageSize, (page + 1) * pageSize), [rows, page, pageSize]);
  const { ref, rowHeight, tableHeight } = useRowHeight(tableTheme, paged.length);
  const view = columns.map((column) => ({
    ...column,
    render: (row) => column.render(row),
  }));

  return (
    <Box>
      <ModuleToolbar
        theme={theme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={searchPlaceholder}
        sort={sort}
        sortOptions={sortOptions}
        onSort={setSort}
        filters={[{
          label: 'نمایش',
          value: onlyWithRecords ? 'with' : 'all',
          options: [{ value: 'all', label: 'همهٔ قراردادها' }, { value: 'with', label: 'فقط دارای سند' }],
          onChange: (value) => setOnlyWithRecords(value === 'with'),
        }]}
        activeChips={onlyWithRecords ? [{ key: 'with', label: 'فقط قراردادهای دارای سند', clear: () => setOnlyWithRecords(false) }] : []}
        activeFilterCount={onlyWithRecords ? 1 : 0}
        onReset={() => { setSearch(''); setOnlyWithRecords(false); setSort(sortOptions[0]?.value || ''); }}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />
      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid', borderColor: theme.cardBorderColor,
        bgcolor: 'background.paper', boxShadow: 'none',
        overflow: 'hidden',
        px: `${theme.cardPadX}px`, py: `${theme.cardPadY}px`,
      }}>
        <ModuleTable
          tableTheme={tableTheme}
          columns={view}
          rows={paged}
          rowKey={(row) => row.contract.id}
          onRowClick={(row) => onSelect(row.contract)}
          containerRef={ref}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          ariaLabel={ariaLabel || 'فهرست قراردادها'}
          emptyText="قراردادی با این مشخصات پیدا نشد."
        />
        <ModulePager
          tableTheme={tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={rows.length}
          pageSize={pageSize}
          unit="قرارداد"
        />
      </Paper>
    </Box>
  );
};

/* اندازه‌گیری ارتفاع ردیف‌ها و صفحه‌بندی مشترک */
export const useRowHeight = (tableTheme, rowCount) => {
  const ref = useRef(null);
  const [rowPx, setRowPx] = useState(0);
  const [headPx, setHeadPx] = useState(0);
  const measure = () => {
    const host = ref.current;
    if (!host) return;
    const rowEl = host.querySelector('tbody tr');
    const headEl = host.querySelector('thead tr');
    const nextRow = rowEl ? Math.round(rowEl.getBoundingClientRect().height) : 0;
    const nextHead = headEl ? Math.round(headEl.getBoundingClientRect().height) : 0;
    setRowPx((previous) => (previous === nextRow ? previous : nextRow));
    setHeadPx((previous) => (previous === nextHead ? previous : nextHead));
  };
  useLayoutEffect(measure, [rowCount, tableTheme.rowHeight, tableTheme.headerHeight]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rowHeight = rowPx > 0 ? rowPx : tableTheme.rowHeight;
  const headHeight = headPx > 0 ? headPx : tableTheme.headerHeight;
  return { ref, rowHeight, tableHeight: Math.round(headHeight + rowHeight * tableTheme.visibleRows) };
};

export const useModuleTableState = (total, pageSize, deps = []) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  React.useEffect(() => { setPage(0); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);
  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
  }, [page, totalPages]);
  return { page, setPage, totalPages, pageNumbers };
};

export const moneyCell = (value, color) => (
  <Typography sx={{
    fontSize: 11.5, fontWeight: 800, color: color || INK,
    fontFamily: 'var(--hrms-table-number-font, inherit)',
  }}>
    {formatPersianNumber(Math.round(Number(value) || 0))}
  </Typography>
);
