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


/* یک ردیف مستقل و memo‌شده: با تغییر یک ردیف، بقیهٔ ردیف‌ها دوباره رندر نمی‌شوند */
const ModuleTableRow = React.memo(function ModuleTableRow({
  row, index, columns, onRowClick, rowAttributes,
}) {
  const attrs = rowAttributes ? rowAttributes(row) : undefined;
  return (
    <TableRow
      {...attrs}
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
  );
});

/* ردیف فاصله‌گذار برای حالت مجازی‌سازی (ارتفاع ثابت، بدون حاشیه و پدینگ) */
const spacerRow = (height, colSpan) => (
  <TableRow data-spacer="true" aria-hidden>
    <TableCell colSpan={colSpan} style={{ height, padding: 0, border: 0 }} />
  </TableRow>
);

/* جدول استاندارد (هدر چسبان + توکن‌های تم)
   با ``virtualize`` فقط ردیف‌های دیده‌شدنی رندر می‌شوند؛ برای جدول‌های چندصد/چندهزار ردیفی. */
export const ModuleTable = ({
  tableTheme, columns, rows, rowKey, onRowClick, containerRef, tableHeight, rowHeight,
  dimmed, emptyText, ariaLabel, virtualize = false, overscan = 6, rowAttributes,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef(0);
  const pendingScrollRef = useRef(0);

  const handleScroll = (event) => {
    pendingScrollRef.current = event.currentTarget.scrollTop;
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      setScrollTop(pendingScrollRef.current);
    });
  };
  React.useEffect(() => () => {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
  }, []);

  const total = rows.length;
  const windowing = Boolean(virtualize) && rowHeight > 0 && tableHeight > 0 && total > overscan * 3;
  let start = 0;
  let end = total;
  if (windowing) {
    const visible = Math.ceil(tableHeight / rowHeight);
    start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    end = Math.min(total, start + visible + overscan * 2);
  }
  const windowed = windowing && (start > 0 || end < total);
  const visibleRows = windowed ? rows.slice(start, end) : rows;

  return (
    <TableContainer
      ref={containerRef}
      onScroll={handleScroll}
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
          {total ? [
            windowed && start > 0 ? spacerRow(start * rowHeight, columns.length) : null,
            ...visibleRows.map((row, offset) => {
              const index = start + offset;
              return (
                <ModuleTableRow
                  key={rowKey ? rowKey(row, index) : index}
                  row={row}
                  index={index}
                  columns={columns}
                  onRowClick={onRowClick}
                  rowAttributes={rowAttributes}
                />
              );
            }),
            windowed && end < total ? spacerRow((total - end) * rowHeight, columns.length) : null,
          ] : (
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
};


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
    /* ردیف‌های فاصله‌گذار (حالت مجازی‌سازی) نباید در اندازه‌گیری دخالت کنند */
    const rowEl = host.querySelector('tbody tr:not([data-spacer])');
    const headEl = host.querySelector('thead tr');
    const nextRow = rowEl ? Math.round(rowEl.getBoundingClientRect().height) : 0;
    const nextHead = headEl ? Math.round(headEl.getBoundingClientRect().height) : 0;
    setRowPx((previous) => (previous === nextRow ? previous : nextRow));
    setHeadPx((previous) => (previous === nextHead ? previous : nextHead));
  };
  useLayoutEffect(measure, [rowCount, tableTheme.rowHeight, tableTheme.headerHeight]);
  React.useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const rowHeight = rowPx > 0 ? rowPx : tableTheme.rowHeight;
  const headHeight = headPx > 0 ? headPx : tableTheme.headerHeight;
  return { ref, rowHeight, tableHeight: Math.round(headHeight + rowHeight * tableTheme.visibleRows) };
};

export const useModuleTableState = (total, pageSize, deps = []) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  React.useEffect(() => { setPage(0); }, deps);
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

/* نوار ابزار استاندارد ماژول‌های مالی قرارداد */
export const ModuleToolbar = ({
  theme, search, onSearch, searchPlaceholder, sort, sortOptions, onSort,
  filters = [], activeChips = [], activeFilterCount = 0, onReset, filtersOpen, setFiltersOpen, children,
}) => {
  const toolbar = theme.toolbar;
  const chipsSx = toolbar.chipStyle === 'outlined'
    ? { bgcolor: 'transparent', border: `1px solid ${toolbar.chipBorder}`, color: toolbar.primary, fontWeight: 700 }
    : { bgcolor: toolbar.chipBg, color: toolbar.primary, fontWeight: 700, border: `1px solid ${toolbar.chipBorder}` };
  return (
    <Paper sx={{
      p: 1.25, mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider',
      bgcolor: 'background.paper', boxShadow: 'none',
    }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          sx={{
            flex: toolbar.searchWidth === '100%' ? 1 : '0 0 auto',
            width: toolbar.searchWidth === '100%' ? { xs: '100%', sm: 'auto' } : `${toolbar.searchWidth}px`,
            '& .MuiOutlinedInput-root': {
              height: `${toolbar.searchHeight}px`,
              borderRadius: `${toolbar.searchRadius}px`,
              bgcolor: toolbar.searchBg,
              fontSize: 12.5,
            },
          }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <TextField
          select
          size="small"
          value={sort}
          onChange={(event) => onSort(event.target.value)}
          sx={{
            flex: '0 0 auto',
            minWidth: { xs: '100%', sm: 176 },
            '& .MuiOutlinedInput-root': {
              height: `${toolbar.searchHeight}px`,
              borderRadius: `${toolbar.searchRadius}px`,
              fontSize: 12.5,
            },
            '& .MuiSelect-select': { paddingLeft: '30px !important', paddingRight: '10px !important' },
          }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SortIcon fontSize="small" /></InputAdornment> }}
          SelectProps={{ inputProps: { 'aria-label': 'ترتیب نمایش' }, IconComponent: SortArrow }}
        >
          {sortOptions.map((option) => (
            <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12.5 }}>{option.label}</MenuItem>
          ))}
        </TextField>
        <Button
          variant={toolbar.filtersVariant}
          onClick={() => setFiltersOpen(!filtersOpen)}
          startIcon={toolbar.filtersIconPosition === 'start' ? <FilterListIcon fontSize="small" /> : null}
          endIcon={toolbar.filtersIconPosition === 'end' ? <FilterListIcon fontSize="small" /> : null}
          aria-expanded={filtersOpen}
          sx={{
            height: `${toolbar.searchHeight}px !important`,
            minHeight: `${toolbar.searchHeight}px !important`,
            maxHeight: `${toolbar.searchHeight}px !important`,
            alignSelf: 'center', py: 0, boxSizing: 'border-box',
            borderRadius: `${toolbar.filtersRadius}px`,
            fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 'auto', px: 2,
          }}
        >
          {toolbar.filtersLabel}
          {toolbar.showFiltersCount && activeFilterCount > 0 ? (
            <Chip size="small" label={toPersianDigits(activeFilterCount)}
              sx={{
                ml: 0.75, height: 18, fontSize: 11, fontWeight: 800,
                bgcolor: toolbar.filtersVariant === 'contained' ? 'rgba(255,255,255,0.24)' : toolbar.chipBg,
                color: toolbar.filtersVariant === 'contained' ? '#fff' : toolbar.primary,
              }} />
          ) : null}
        </Button>
        {toolbar.showReset && (activeFilterCount > 0 || search) ? (
          <Button size="small" variant="text" onClick={onReset}
            sx={{ height: `${toolbar.searchHeight}px`, minHeight: `${toolbar.searchHeight}px`, alignSelf: 'center', py: 0, fontSize: 12.5, whiteSpace: 'nowrap' }}>
            {toolbar.resetLabel}
          </Button>
        ) : null}
        {children}
      </Stack>

      <Collapse in={filtersOpen} timeout={180} unmountOnExit>
        <Box sx={{
          mt: 1.25, pt: 1.25, borderTop: '1px dashed', borderColor: 'divider',
          bgcolor: toolbar.panelBg,
          borderRadius: `${toolbar.panelRadius}px`,
          p: `${toolbar.panelPadding}px`,
        }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: toolbar.panelGrid },
            gap: `${toolbar.panelGap}px`,
            alignItems: 'end',
          }}>
            {filters.map((filter) => (
              <FilterSelect
                key={filter.label}
                label={filter.label}
                value={filter.value}
                options={filter.options}
                onChange={filter.onChange}
                labelsPosition={toolbar.labelsPosition}
                radius={toolbar.filtersRadius}
              />
            ))}
            {toolbar.showReset ? (
              <Button variant="text" size="small" onClick={onReset}
                sx={{ fontSize: 12.5, justifySelf: 'start', height: `${toolbar.searchHeight - 6}px` }}>
                بازنشانی فیلترها
              </Button>
            ) : null}
          </Box>
        </Box>
      </Collapse>

      {toolbar.showActiveChips && activeChips.length > 0 ? (
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
          {activeChips.map((chip) => (
            <Chip key={chip.key} size="small" label={chip.label} onDelete={chip.clear} sx={chipsSx} />
          ))}
        </Stack>
      ) : null}
    </Paper>
  );
};