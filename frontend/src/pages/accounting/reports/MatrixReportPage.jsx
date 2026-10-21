import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Box, Button, Checkbox, Chip, Divider, FormControlLabel, IconButton, InputAdornment,
  Paper, Popover, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import PrintIcon from '@mui/icons-material/Print';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageHeader from '../../../core/components/ui/PageHeader';
import JalaliDatePicker from '../../../core/components/ui/JalaliDatePicker';
import LedgerDrillDialog from './LedgerDrillDialog';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import {
  LEVELS, LEVEL_LABEL, buildCatalog, flattenTree, norm, pathLabel, scopeRows, searchCatalog,
} from './matrixHelpers';
import { BLUE, COLOR_DARK, CYAN, GREEN, EmptyState, Loading } from './reportHelpers';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const MAX_SEARCH_CARDS = 24;
const EMPTY_TOTAL = {
  debit: 0, credit: 0, balance_debit: 0, balance_credit: 0,
  opening_balance_debit: 0, opening_balance_credit: 0,
  closing_balance_debit: 0, closing_balance_credit: 0,
};
const COLUMN_MODES = [
  { value: '3', label: '۳ ستونه' },
  { value: '4', label: '۴ ستونه' },
  { value: '6', label: '۶ ستونه' },
];
const headSx = {
  fontWeight: 800, whiteSpace: 'nowrap', bgcolor: '#f8fafc', fontSize: 12,
  color: 'text.secondary', textAlign: 'center !important',
};
const cellSx = { py: 0.55, px: 1 };
const levelLabel = (value) => LEVEL_LABEL[Number(value)] || '—';
const isFlat = (value) => Math.abs(Number(value) || 0) < 0.005;
const formatMoney = (value) => formatPersianNumber(value || 0);

const statusChip = (label, count, color = CYAN) => (
  <Chip size="small" label={`${label} ${toPersianDigits(count)}`}
    sx={{ height: 20, fontSize: 12, fontFamily: FONT, bgcolor: `${color}14`, color, fontWeight: 700 }} />
);

const MatrixReportPage = () => {
  const [level, setLevel] = useState(1);
  const [focus, setFocus] = useState(null);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [columnMode, setColumnMode] = useState('4');
  const [onlyWithActivity, setOnlyWithActivity] = useState(true);
  const [fromCode, setFromCode] = useState('');
  const [toCode, setToCode] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [ledgerNode, setLedgerNode] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-matrix', dateFrom, dateTo],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: () => axiosInstance.get('/accounting/reports/matrix/', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined },
    }).then((response) => response.data),
  });

  const { flat, byKey } = useMemo(() => flattenTree(data?.tree || []), [data]);
  const catalog = useMemo(() => buildCatalog(flat), [flat]);

  const focusOccurrences = useMemo(() => {
    if (!focus) return null;
    if (focus.type === 'nodes') {
      return (focus.keys || []).map((key) => byKey.get(key)).filter(Boolean);
    }
    const entry = catalog.find((item) => item.key === focus.key);
    return entry?.occurrences || null;
  }, [focus, byKey, catalog]);

  const focusEntry = useMemo(() => {
    if (!focus) return null;
    if (focus.type === 'catalog') {
      return catalog.find((item) => item.key === focus.key) || null;
    }
    const first = focusOccurrences?.[0];
    if (!first) return null;
    return {
      key: focus.key || first.__key,
      name: focus.label || first.name,
      code: focus.code || first.code,
      level: first.level,
      pathText: focus.pathText || pathLabel(first),
      occurrences: focusOccurrences,
      levels: [...new Set(focusOccurrences.map((item) => Number(item.level)))],
    };
  }, [focus, catalog, focusOccurrences]);

  const ladderCounts = useMemo(() => {
    const counts = {};
    LEVELS.forEach((item) => {
      counts[item.value] = scopeRows(flat, focusOccurrences, item.value).length;
    });
    return counts;
  }, [flat, focusOccurrences]);

  const baseRows = useMemo(
    () => scopeRows(flat, focusOccurrences, level),
    [flat, focusOccurrences, level],
  );

  const selectedRow = useMemo(
    () => baseRows.find((row) => row.key === selectedRowKey) || null,
    [baseRows, selectedRowKey],
  );


  const visibleRows = useMemo(() => baseRows.filter((row) => {
    const code = String(row.code ?? '');
    if (fromCode && code.localeCompare(fromCode, undefined, { numeric: true }) < 0) return false;
    if (toCode && code.localeCompare(toCode, undefined, { numeric: true }) > 0) return false;
    if (onlyWithActivity && !(row.debit || row.credit || row.opening_balance_debit || row.opening_balance_credit)) {
      return false;
    }
    // وقتی دامنه از یک طرف حساب/سطح انتخاب شده، جستجوی بالای صفحه برای انتخاب
    // دامنه است و نباید ردیف‌های همان دامنه را دوباره حذف کند.
    const query = focusEntry ? '' : search.trim();
    if (!query) return true;
    const hay = [row.code, row.name, row.pathText].join(' ');
    return hay.toLowerCase().includes(query.toLowerCase()) || norm(hay).includes(norm(query));
  }), [baseRows, fromCode, toCode, onlyWithActivity, focusEntry, search]);

  const pageRows = useMemo(
    () => visibleRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage),
    [visibleRows, page, rowsPerPage],
  );

  const columnTotals = useMemo(() => visibleRows.reduce((totals, row) => {
    Object.keys(EMPTY_TOTAL).forEach((key) => {
      totals[key] += Number(row[key] || 0);
    });
    return totals;
  }, { ...EMPTY_TOTAL }), [visibleRows]);

  const matches = useMemo(() => searchCatalog(catalog, search), [catalog, search]);
  const currentLevel = LEVELS.find((item) => item.value === level) || LEVELS[1];

  useEffect(() => { setPage(0); }, [level, focus, fromCode, toCode, onlyWithActivity, search, dateFrom, dateTo]);
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(visibleRows.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [visibleRows.length, page, rowsPerPage]);
  useEffect(() => {
    if (focus && !focusOccurrences?.length) setFocus(null);
  }, [focus, focusOccurrences]);

  const clearFocus = () => {
    setFocus(null);
    setSelectedRowKey(null);
    setPage(0);
  };
  const resetAll = () => {
    setLevel(1);
    setFocus(null);
    setSelectedRowKey(null);
    setColumnMode('4');
    setOnlyWithActivity(true);
    setFromCode('');
    setToCode('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setFilterAnchor(null);
    setPage(0);
  };
  const chooseLevel = (nextLevel) => {
    if (nextLevel === null || nextLevel === undefined) return;
    if (selectedRow) {
      const focusSource = selectedRow.sources?.find((item) => item.name !== selectedRow.name)
        || selectedRow.sources?.[0];
      setFocus({
        type: 'nodes',
        keys: [...new Set(selectedRow.sources.map((item) => item.__key))],
        label: focusSource?.name || selectedRow.name,
        code: focusSource?.code || selectedRow.code,
      });
    }
    setLevel(Number(nextLevel));
    setSelectedRowKey(null);
    setPage(0);
  };
  const chooseSearchResult = (entry) => {
    if (focus?.type === 'catalog' && focus.key === entry.key) {
      clearFocus();
      return;
    }
    setFocus({ type: 'catalog', key: entry.key });
    setLevel(Number(entry.level));
    setSelectedRowKey(null);
    setPage(0);
  };
  const openLedger = (row) => {
    const node = row.sources?.[0] || row.node;
    if (node) setLedgerNode(node);
  };

  if (isLoading) return <Loading />;


  const money = (value, color, bold = false) => (
    <Typography variant="body2" fontWeight={bold ? 900 : 600}
      sx={{
        color: isFlat(value) ? 'text.disabled' : color,
        direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 12,
      }}>
      {formatMoney(value)}
    </Typography>
  );

  const moneyHead = (label, color, bg = '#f8fafc') => (
    <TableCell align="center" sx={{ ...headSx, bgcolor: bg, borderBottom: `2px solid ${color}33` }}>
      {label}
    </TableCell>
  );

  const renderAmountCells = (row, bold = false) => {
    if (columnMode === '6') {
      return (
        <>
          <TableCell sx={cellSx}>{money(row.opening_balance_debit, '#7c3aed', bold)}</TableCell>
          <TableCell sx={cellSx}>{money(row.opening_balance_credit, '#7c3aed', bold)}</TableCell>
          <TableCell sx={cellSx}>{money(row.debit, BLUE, bold)}</TableCell>
          <TableCell sx={cellSx}>{money(row.credit, GREEN, bold)}</TableCell>
          <TableCell sx={cellSx}>{money(row.closing_balance_debit, BLUE, bold)}</TableCell>
          <TableCell sx={cellSx}>{money(row.closing_balance_credit, GREEN, bold)}</TableCell>
        </>
      );
    }
    if (columnMode === '4') {
      return (
        <>
          <TableCell sx={cellSx}>{money(row.debit, BLUE, bold)}</TableCell>
          <TableCell sx={cellSx}>{money(row.credit, GREEN, bold)}</TableCell>
          <TableCell sx={cellSx}>{money(row.balance_debit, BLUE, bold)}</TableCell>
          <TableCell sx={cellSx}>{money(row.balance_credit, GREEN, bold)}</TableCell>
        </>
      );
    }
    const net = (row.balance_debit || 0) - (row.balance_credit || 0);
    return (
      <>
        <TableCell sx={cellSx}>{money(row.debit, BLUE, bold)}</TableCell>
        <TableCell sx={cellSx}>{money(row.credit, GREEN, bold)}</TableCell>
        <TableCell sx={cellSx}>
          <Typography variant="body2" fontWeight={bold ? 900 : 600}
            sx={{ color: isFlat(net) ? 'text.disabled' : (net < 0 ? GREEN : BLUE), direction: 'ltr',
              textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 12 }}>
            {isFlat(net) ? '—' : (net < 0 ? `(${formatMoney(Math.abs(net))})` : formatMoney(Math.abs(net)))}
          </Typography>
        </TableCell>
      </>
    );
  };

  const renderRow = (row, index) => {
    const selected = row.key === selectedRowKey;
    const sourceCount = row.sources?.length || 0;
    const sourceName = row.sources?.[0]?.name;
    return (
      <TableRow key={row.key} hover selected={selected}
        onClick={() => setSelectedRowKey(selected ? null : row.key)}
        onDoubleClick={(event) => { event.stopPropagation(); openLedger(row); }}
        title="دوبار کلیک برای ریز گردش همین مسیر"
        sx={{
          cursor: 'pointer', height: 34,
          bgcolor: selected ? 'rgba(6,182,212,0.10)' : undefined,
          boxShadow: selected ? `inset 3px 0 0 ${CYAN}` : undefined,
          '&:hover': { bgcolor: selected ? 'rgba(6,182,212,0.14)' : 'rgba(15,23,42,0.025)' },
        }}>
        <TableCell sx={{ ...cellSx, width: 42, color: 'text.secondary', fontSize: 12 }}>
          {toPersianDigits(index + 1)}
        </TableCell>
        <TableCell sx={{ ...cellSx, whiteSpace: 'nowrap' }}>
          <Typography sx={{ color: COLOR_DARK, fontFamily: FONT, fontSize: 12, fontWeight: 800 }}>
            {toPersianDigits(row.code)}
          </Typography>
        </TableCell>
        <TableCell sx={{ ...cellSx, maxWidth: 390, overflow: 'hidden' }}>
          <Stack spacing={0.1} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={800}
                sx={{ fontFamily: FONT, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.name}
              </Typography>
              <Chip size="small" label={levelLabel(row.level)}
                sx={{ height: 18, fontSize: 12, flexShrink: 0, bgcolor: 'rgba(8,145,178,0.08)', color: '#0e7490' }} />
              {sourceCount > 1 ? (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12, flexShrink: 0 }}>
                  از {toPersianDigits(sourceCount)} مسیر
                </Typography>
              ) : null}
            </Stack>
            <Typography variant="caption" sx={{
              color: 'text.secondary', fontFamily: FONT, fontSize: 12, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {row.pathText || (sourceName && sourceName !== row.name ? sourceName : 'بدون مسیر والد')}
            </Typography>
          </Stack>
        </TableCell>
        {renderAmountCells(row)}
      </TableRow>
    );
  };


  return (
    <>
      <PageHeader
        icon={<GridViewIcon sx={{ fontSize: 20 }} />}
        title="مرور ترکیبی (ماتریس)"
        badge={<Chip size="small" label="گزارش تعاملی" sx={{ height: 22, fontSize: 12, bgcolor: `${CYAN}12`, color: '#0e7490' }} />}
        actions={(
          <>
            <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={resetAll}
              sx={{ fontFamily: FONT }}>بازنشانی</Button>
            <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}
              sx={{ fontFamily: FONT }}>چاپ</Button>
          </>
        )}
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری تراز حساب‌ها. دوباره تلاش کنید." />
      ) : (
        <Stack spacing={1}>
          <Paper variant="outlined" sx={{ p: 1, borderRadius: '12px', '@media print': { display: 'none' } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems={{ xs: 'stretch', lg: 'center' }}>
              <TextField
                size="small"
                placeholder="جستجوی طرف حساب، کد یا شرح حساب…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ flex: 1, minWidth: { xs: 0, md: 260 } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')} aria-label="پاک کردن جستجو">
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
              <Stack direction="row" spacing={0.75} alignItems="center">
                <JalaliDatePicker noHelper label="از تاریخ" value={dateFrom} onChange={setDateFrom} sx={{ width: 142 }} />
                <JalaliDatePicker noHelper label="تا تاریخ" value={dateTo} onChange={setDateTo} sx={{ width: 142 }} />
              </Stack>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={columnMode}
                onChange={(event, value) => { if (value) setColumnMode(value); }}
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 1.1, py: 0.35, fontFamily: FONT, fontSize: 12, whiteSpace: 'nowrap',
                    borderColor: 'rgba(148,163,184,0.35)',
                  },
                  '& .MuiToggleButton-root.Mui-selected': { bgcolor: `${CYAN}16`, color: '#0e7490' },
                }}
              >
                {COLUMN_MODES.map((item) => <ToggleButton key={item.value} value={item.value}>{item.label}</ToggleButton>)}
              </ToggleButtonGroup>
              <FormControlLabel
                control={<Checkbox size="small" checked={onlyWithActivity}
                  onChange={(event) => setOnlyWithActivity(event.target.checked)} />}
                label={<Typography sx={{ fontFamily: FONT, fontSize: 12 }}>فقط دارای گردش</Typography>}
                sx={{ mr: 0 }}
              />
              <Tooltip title="فیلتر بازهٔ کد حساب">
                <IconButton size="small" onClick={(event) => setFilterAnchor(event.currentTarget)}
                  sx={{ border: '1px solid rgba(148,163,184,0.35)', borderRadius: '9px',
                    color: (fromCode || toCode) ? '#0e7490' : 'text.secondary' }}>
                  <FilterAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Paper>


          <Popover
            open={Boolean(filterAnchor)}
            anchorEl={filterAnchor}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ p: 1.5, width: 245 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, mb: 1 }}>بازهٔ کد حساب</Typography>
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="از کد" value={fromCode}
                  onChange={(event) => setFromCode(event.target.value)} sx={{ flex: 1 }} />
                <TextField size="small" label="تا کد" value={toCode}
                  onChange={(event) => setToCode(event.target.value)} sx={{ flex: 1 }} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" fullWidth
                  onClick={() => { setFromCode(''); setToCode(''); setFilterAnchor(null); }}>پاک کردن</Button>
                <Button size="small" variant="contained" fullWidth onClick={() => setFilterAnchor(null)}>اعمال</Button>
              </Stack>
            </Box>
          </Popover>

          {search.trim() ? (
            <Paper variant="outlined" sx={{ p: 1, borderRadius: '12px', '@media print': { display: 'none' } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <SearchIcon sx={{ fontSize: 18, color: '#0e7490' }} />
                <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 800 }}>نتایج جستجو</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary' }}>
                  {toPersianDigits(matches.length)} مورد
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Button size="small" onClick={() => setSearch('')} sx={{ fontFamily: FONT, fontSize: 12 }}>پاک کردن</Button>
              </Stack>
              {matches.length === 0 ? (
                <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary', py: 0.5 }}>
                  موردی با این کد یا نام پیدا نشد. نام طرف حساب یا بخشی از کد را وارد کنید.
                </Typography>
              ) : (
                <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto', pb: 0.25 }}>
                  {matches.slice(0, MAX_SEARCH_CARDS).map((entry) => {
                    const active = focus?.type === 'catalog' && focus.key === entry.key;
                    return (
                      <Paper
                        key={entry.key}
                        variant="outlined"
                        onClick={() => chooseSearchResult(entry)}
                        sx={{
                          minWidth: 230, maxWidth: 270, p: 0.75, cursor: 'pointer', flexShrink: 0,
                          borderRadius: '10px', borderColor: active ? CYAN : 'rgba(148,163,184,0.30)',
                          bgcolor: active ? `${CYAN}0d` : 'background.paper',
                          '&:hover': { borderColor: CYAN },
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 900, color: COLOR_DARK }}>
                            {toPersianDigits(entry.code)}
                          </Typography>
                          <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, minWidth: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.name}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <Chip size="small" label={levelLabel(entry.level)}
                            sx={{ height: 18, fontSize: 12, flexShrink: 0, bgcolor: `${CYAN}12`, color: '#0e7490' }} />
                        </Stack>
                        <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary', mt: 0.25,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entry.pathText || 'بدون مسیر والد'}
                        </Typography>
                        <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                          {[2, 1, 0].filter((lv) => entry.counts[lv]).map((lv) => (
                            <React.Fragment key={lv}>{statusChip(levelLabel(lv), entry.counts[lv])}</React.Fragment>
                          ))}
                          <Chip size="small" label={`${toPersianDigits(entry.occurrences.length)} مسیر`}
                            sx={{ height: 20, fontSize: 12, fontFamily: FONT, bgcolor: 'rgba(15,23,42,0.05)', color: 'text.secondary' }} />
                        </Stack>
                      </Paper>
                    );
                  })}
                  {matches.length > MAX_SEARCH_CARDS ? (
                    <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary', alignSelf: 'center', px: 1 }}>
                      +{toPersianDigits(matches.length - MAX_SEARCH_CARDS)} نتیجهٔ دیگر
                    </Typography>
                  ) : null}
                </Stack>
              )}
            </Paper>
          ) : null}


          {focusEntry ? (
            <Paper variant="outlined" sx={{ px: 1.25, py: 0.85, borderRadius: '12px',
              borderColor: `${CYAN}44`, bgcolor: `${CYAN}06`, '@media print': { display: 'none' } }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <AccountTreeIcon sx={{ fontSize: 18, color: '#0e7490' }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 900, color: COLOR_DARK }}>
                    تمرکز: {focusEntry.name} {focusEntry.code ? `(${toPersianDigits(focusEntry.code)})` : ''}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary',
                    maxWidth: 520, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {focusEntry.pathText || 'مسیر انتخاب‌شده'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap">
                  {statusChip('معین', ladderCounts[2])}
                  {statusChip('کل', ladderCounts[1])}
                  <Chip size="small" label={`${toPersianDigits(focusEntry.occurrences?.length || 0)} مسیر`}
                    sx={{ height: 20, fontSize: 12, fontFamily: FONT, bgcolor: 'rgba(15,23,42,0.05)', color: 'text.secondary' }} />
                </Stack>
                <Box sx={{ flex: 1 }} />
                <Button size="small" startIcon={<ArrowBackIcon />} onClick={clearFocus}
                  sx={{ fontFamily: FONT, fontSize: 12 }}>نمایش همه</Button>
              </Stack>
            </Paper>
          ) : null}

          <Paper variant="outlined" sx={{ px: 1.25, py: 0.75, borderRadius: '12px', '@media print': { display: 'none' } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.75} alignItems={{ xs: 'stretch', md: 'center' }}>
              <Box sx={{ minWidth: 130 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 900, color: COLOR_DARK }}>پلکان سطح‌ها (ریز)</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary' }}>
                  {selectedRow ? `ردیف انتخابی: ${selectedRow.name}` : 'سطح نمایش را انتخاب کنید؛ اعداد در دامنهٔ فعلی هستند.'}
                </Typography>
              </Box>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={level}
                onChange={(event, value) => chooseLevel(value)}
                sx={{
                  flexWrap: 'wrap', gap: 0.4,
                  '& .MuiToggleButton-root': {
                    border: '1px solid rgba(148,163,184,0.28) !important', borderRadius: '9px !important',
                    px: 0.9, py: 0.35, fontFamily: FONT, fontSize: 12, gap: 0.4,
                  },
                  '& .MuiToggleButton-root.Mui-selected': { bgcolor: `${CYAN}14`, color: '#0e7490' },
                }}
              >
                {LEVELS.map((item) => (
                  <ToggleButton key={item.value} value={item.value}>
                    {item.label}
                    <Chip size="small" label={toPersianDigits(ladderCounts[item.value] || 0)}
                      sx={{ height: 17, fontSize: 12, fontFamily: FONT,
                        bgcolor: level === item.value ? `${CYAN}22` : 'rgba(148,163,184,0.14)', color: 'text.secondary' }} />
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </Paper>


          <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.25, py: 0.7 }}>
              <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 900, color: COLOR_DARK }}>
                {currentLevel.label}
              </Typography>
              <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary' }}>
                {toPersianDigits(visibleRows.length)} ردیف قابل نمایش
                {visibleRows.length !== baseRows.length ? ` از ${toPersianDigits(baseRows.length)}` : ''}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Chip size="small" label={`گردش ${formatMoney(columnTotals.debit)}`}
                sx={{ height: 20, fontSize: 12, fontFamily: FONT, bgcolor: `${BLUE}10`, color: BLUE }} />
              <Chip size="small" label={`مانده ${formatMoney((columnTotals.balance_debit || 0) - (columnTotals.balance_credit || 0))}`}
                sx={{ height: 20, fontSize: 12, fontFamily: FONT, bgcolor: `${GREEN}10`, color: GREEN }} />
              <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary', '@media print': { display: 'none' } }}>
                دوبار کلیک: ریز گردش
              </Typography>
            </Stack>
            <Divider />
            {visibleRows.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary' }}>
                  {search.trim() && !focusEntry
                    ? 'ابتدا از نتایج جستجو یک طرف حساب یا حساب را انتخاب کنید.'
                    : 'گردشی برای این سطح و فیلترهای انتخابی وجود ندارد.'}
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer sx={{
                  maxHeight: { xs: 420, md: 'calc(100vh - 335px)' }, minHeight: 260,
                  '@media print': { maxHeight: 'none', overflow: 'visible' },
                }}>
                  <Table size="small" stickyHeader sx={{ tableLayout: 'auto' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headSx, width: 42 }}>#</TableCell>
                        <TableCell sx={{ ...headSx, width: 92 }}>کد</TableCell>
                        <TableCell sx={{ ...headSx, minWidth: 260 }}>حساب / مسیر</TableCell>
                        {columnMode === '6' ? (
                          <>
                            {moneyHead('ابتدا بدهکار', '#7c3aed', '#f5f3ff')}
                            {moneyHead('ابتدا بستانکار', '#7c3aed', '#f5f3ff')}
                            {moneyHead('گردش بدهکار', BLUE, '#eff6ff')}
                            {moneyHead('گردش بستانکار', GREEN, '#ecfdf5')}
                            {moneyHead('پایان بدهکار', '#7c3aed', '#f5f3ff')}
                            {moneyHead('پایان بستانکار', '#7c3aed', '#f5f3ff')}
                          </>
                        ) : columnMode === '4' ? (
                          <>
                            {moneyHead('گردش بدهکار', BLUE, '#eff6ff')}
                            {moneyHead('گردش بستانکار', GREEN, '#ecfdf5')}
                            {moneyHead('مانده بدهکار', '#7c3aed', '#f5f3ff')}
                            {moneyHead('مانده بستانکار', '#7c3aed', '#f5f3ff')}
                          </>
                        ) : (
                          <>
                            {moneyHead('گردش بدهکار', BLUE, '#eff6ff')}
                            {moneyHead('گردش بستانکار', GREEN, '#ecfdf5')}
                            {moneyHead('مانده', '#7c3aed', '#f5f3ff')}
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pageRows.map((row, index) => renderRow(row, page * rowsPerPage + index))}
                      <TableRow sx={{
                        height: 34,
                        '& .MuiTableCell-root': {
                          position: 'sticky', bottom: 0, zIndex: 3,
                          bgcolor: '#f8fafc', borderTop: '2px solid rgba(8,145,178,0.25)', fontWeight: 900,
                        },
                      }}>
                        <TableCell colSpan={3} sx={{ fontFamily: FONT, fontSize: 12, color: 'text.secondary' }}>
                          جمع ستونی ({toPersianDigits(visibleRows.length)} ردیف)
                        </TableCell>
                        {renderAmountCells(columnTotals, true)}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={visibleRows.length}
                  page={page}
                  onPageChange={(event, next) => setPage(next)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[50, 100, 200, 500]}
                  labelRowsPerPage="ردیف در صفحه"
                  labelDisplayedRows={({ from, to, count }) => `${toPersianDigits(from)}–${toPersianDigits(to)} از ${toPersianDigits(count)}`}
                  sx={{
                    borderTop: '1px solid rgba(148,163,184,0.22)',
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontFamily: FONT, fontSize: 12 },
                  }}
                />
              </>
            )}
          </Paper>
        </Stack>
      )}

      <LedgerDrillDialog node={ledgerNode} dateFrom={dateFrom} dateTo={dateTo}
        onClose={() => setLedgerNode(null)} />
    </>
  );
};

export default MatrixReportPage;
