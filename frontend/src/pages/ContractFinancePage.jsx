import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, Table, TableBody,
  TableCell, TableContainer, TableFooter, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis,
} from 'recharts';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import InsightsIcon from '@mui/icons-material/Insights';
import LastPageIcon from '@mui/icons-material/LastPage';
import LockIcon from '@mui/icons-material/Lock';
import PaymentsIcon from '@mui/icons-material/Payments';
import PieChartIcon from '@mui/icons-material/PieChart';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axiosInstance from '../core/api/axiosConfig';
import fetchAllPages from '../core/api/fetchAllPages';
import downloadFile from '../core/utils/downloadUtils';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { useDesignTokens } from '../core/context/DesignTokenContext';
import { resolveTableTheme, tableTypographySx } from '../core/theme/tableStyles';
import { resolveToolbarTheme } from '../core/theme/toolbarStyles';
import { CONTRACT_STATUS_LABELS } from '../core/theme/tokens';
import { EmptyState, ProgressBar, INK, MUTED } from './contracts/ContractProfileUI';
import {
  AddendumsTable, GuaranteesTable, InvoicesTable, PaymentsTable, statementMetrics, toNum,
} from './contracts/ContractFinanceTables';
import { statementDisplayTitle, statementKindOf } from './contracts/statementKinds';

/* ---------- پالت معنایی تحلیل مالی ---------- */
const CLR = {
  contract: '#b45309',
  work: '#1d4ed8',
  add: '#15803d',
  addSoft: '#ecfdf5',
  ded: '#be123c',
  dedSoft: '#fff1f2',
  net: '#0f766e',
  paid: '#2563eb',
  balance: '#b45309',
  risk: '#be123c',
  ok: '#0f766e',
  warn: '#b45309',
  rate: '#7c3aed',
};

const DEDUCTION_KEYS = [
  ['retention', 'حسن انجام کار'],
  ['insurance', 'بیمه'],
  ['prepayment', 'پیش‌پرداخت'],
  ['materials', 'مصالح'],
  ['statementAdvance', 'علی‌الحساب صورت‌وضعیت'],
  ['otherAdvance', 'سایر علی‌الحساب‌ها'],
  ['other', 'سایر کسورات'],
];

const CONTRACT_SORT_OPTIONS = [
  { value: 'remaining', label: 'بیشترین مانده مالی' },
  { value: 'work', label: 'بیشترین کارکرد' },
  { value: 'amount', label: 'بیشترین مبلغ قرارداد' },
  { value: 'number', label: 'شماره قرارداد' },
];

const titleOf = (item) => String(item?.title || item?.description || item?.name || '').replace(/\s+/g, ' ').trim();
const isVatTitle = (title) => title.includes('ارزش افزوده') || title.includes('مالیات');
const shortTitle = (title, max = 22) => (title.length > max ? `${title.slice(0, max)}…` : title);
const money = (value, currency = 'ریال') => `${formatPersianNumber(Math.round(toNum(value)))} ${currency}`;
const ratio = (part, whole) => (toNum(whole) > 0 ? Math.max(0, Math.min(100, (toNum(part) / toNum(whole)) * 100)) : 0);
const dayDiff = (from, to) => {
  if (!from || !to) return 0;
  const start = new Date(`${String(from).slice(0, 10)}T00:00:00`);
  const end = new Date(`${String(to).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end - start) / 86400000));
};
const faPercent = (value) => `${toPersianDigits(String(Math.round(toNum(value) * 10) / 10))}٪`;


/* فلش بازشوی «ترتیب» — هم‌الگو با صفحه‌های بایگانی و تضامین */
const SortArrow = ({ className, ...rest }) => (
  <ExpandMoreIcon
    {...rest}
    sx={{ position: 'absolute', left: 8, top: 'calc(50% - 10px)', fontSize: 20, color: 'text.secondary', pointerEvents: 'none' }}
  />
);

const FilterSelect = ({ label, value, options, onChange, labelsPosition, radius = 8 }) => (
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

const ArchivePager = ({ tableTheme, page, onPage, totalPages, pageNumbers, total, pageSize, unit = 'قرارداد' }) => {
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
            نمایش {toPersianDigits(page * pageSize + 1)} تا {toPersianDigits(Math.min((page + 1) * pageSize, total))} از{' '}
            {toPersianDigits(total)} {unit} · {toPersianDigits(tableTheme.visibleRows)} ردیف در نما
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

/* ---------- جدول فهرست قراردادها (صفحهٔ اول تحلیل مالی) ---------- */
const FinanceLandingTable = ({
  rows, tableTheme, containerRef, tableHeight, rowHeight, dimmed, onOpen,
}) => (
  <TableContainer
    ref={containerRef}
    data-visible-rows={tableTheme.visibleRows}
    data-row-height={rowHeight}
    data-table-height={`${tableHeight}px`}
    sx={{
      height: { xs: 'auto', sm: `${tableHeight}px` },
      maxHeight: { xs: 'none', sm: `${tableHeight}px` },
      overflowY: 'auto',
      opacity: dimmed ? 0.6 : 1,
      transition: 'opacity .15s ease',
    }}
  >
    <Table
      size="small"
      stickyHeader
      aria-label="فهرست قراردادها برای تحلیل مالی"
      sx={{
        width: '100%',
        minWidth: 980,
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
          ...(tableTheme.cellTextAlign ? { textAlign: `${tableTheme.cellTextAlign} !important` } : null),
        },
        '& tbody tr.MuiTableRow-hover:hover': { backgroundColor: tableTheme.hoverBg },
        '& th.hrms-cell-center, & td.hrms-cell-center': { textAlign: 'center !important' },
        ...tableTypographySx(tableTheme),
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={{ width: '4%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>ردیف</Box>
          </TableCell>
          <TableCell align="center" sx={{ width: '10%' }}>شماره قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '17%' }}>طرف قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '21%' }}>موضوع قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '13%' }} className="hrms-cell-center">مبلغ قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '7%' }} className="hrms-cell-center">صورت‌وضعیت</TableCell>
          <TableCell align="center" sx={{ width: '10%' }} className="hrms-cell-center">کارکرد</TableCell>
          <TableCell align="center" sx={{ width: '9%' }} className="hrms-cell-center">پرداختی</TableCell>
          <TableCell align="center" sx={{ width: '9%' }} className="hrms-cell-center">مانده</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.contract.id} hover onClick={() => onOpen(row.contract)} sx={{ cursor: 'pointer' }}>
            <TableCell align="center">
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {toPersianDigits(row.offset + index + 1)}
                </Typography>
              </Box>
            </TableCell>
            <TableCell align="center">
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {toPersianDigits(row.contract.number || '—')}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography noWrap title={row.contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                {row.contract.party_name || '—'}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography noWrap title={row.contract.subject} sx={{ fontSize: 12, fontWeight: 800 }}>
                {row.contract.subject || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center" className="hrms-cell-center">
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {row.amountLoaded ? money(row.amount, row.currency) : '—'}
                </Typography>
              </Box>
            </TableCell>
            <TableCell align="center" className="hrms-cell-center">
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700 }}>{toPersianDigits(row.statements)}</Typography>
              </Box>
            </TableCell>
            <TableCell align="center" className="hrms-cell-center">
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: CLR.work, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {formatPersianNumber(Math.round(row.workDone))}
                </Typography>
              </Box>
            </TableCell>
            <TableCell align="center" className="hrms-cell-center">
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: CLR.paid, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {formatPersianNumber(Math.round(row.paid))}
                </Typography>
              </Box>
            </TableCell>
            <TableCell align="center" className="hrms-cell-center">
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Typography noWrap sx={{
                  fontSize: 11.5, fontWeight: 800,
                  color: row.remaining > 0 ? CLR.balance : CLR.ok,
                  fontFamily: 'var(--hrms-table-number-font, inherit)',
                }}>
                  {formatPersianNumber(Math.round(row.remaining))}
                </Typography>
              </Box>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);


/* ---------- جدول تفصیلی مالی با سرستون‌های گروه‌بندی‌شده ---------- */
const finHeadBase = {
  px: 0.8, py: 0.65, fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap',
  textAlign: 'center', verticalAlign: 'middle',
  borderBottom: '1px solid var(--hrms-table-border-color, #e8edf4)',
};
const finCellBase = {
  px: 0.8, py: 0.6, fontSize: 11.5, whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--hrms-table-border-color, #e8edf4)',
  fontVariantNumeric: 'tabular-nums',
  fontFamily: 'var(--hrms-table-number-font, inherit)',
};

const FinanceGroupHeader = ({ label, color, colSpan }) => (
  <TableCell align="center" colSpan={colSpan} sx={{
    ...finHeadBase,
    bgcolor: alpha(color, 0.07),
    color,
    fontWeight: 900,
    borderBottom: `1px solid ${alpha(color, 0.22)}`,
  }}>
    {label}
  </TableCell>
);

const FinanceBreakdownTable = ({
  rows, additionColumns, deductionColumns, hasOtherAddition, hasOtherDeduction,
  totals, currencyLabel, tableTheme, maxHeight = 460,
}) => {
  const subHead = (label, tint) => (
    <TableCell align="center" sx={{ ...finHeadBase, color: tint, bgcolor: 'var(--hrms-table-header-bg)' }}>{label}</TableCell>
  );
  return (
    <TableContainer sx={{
      maxHeight,
      overflow: 'auto',
      borderRadius: '12px',
      border: '1px solid var(--hrms-table-border-color, #e8edf4)',
    }}>
      <Table
        size="small"
        stickyHeader
        aria-label="جدول تفصیلی مالی قرارداد"
        sx={{
          width: '100%',
          minWidth: 1180,
          tableLayout: 'auto',
          '& tbody tr:hover': { backgroundColor: tableTheme.hoverBg },
          ...tableTypographySx(tableTheme),
          '& thead th': { textAlign: 'center !important', verticalAlign: 'middle' },
          '& thead th .MuiBox-root': { display: 'flex', justifyContent: 'center', width: '100%' },
          '& thead th .MuiTypography-root, & thead th .MuiBox-root, & thead th span': {
            textAlign: 'center !important',
            marginInline: 'auto',
          },
        }}
      >
        <TableHead>
          <TableRow>
            <FinanceGroupHeader label="مشخصات قرارداد" color={CLR.contract} colSpan={3} />
            <FinanceGroupHeader label="کارکرد" color={CLR.work} colSpan={1} />
            <FinanceGroupHeader label="اضافات" color={CLR.add} colSpan={1 + additionColumns.length + (hasOtherAddition ? 1 : 0)} />
            <FinanceGroupHeader label="کسورات" color={CLR.ded} colSpan={deductionColumns.length + (hasOtherDeduction ? 1 : 0)} />
            <FinanceGroupHeader label="جمع" color={CLR.net} colSpan={5} />
          </TableRow>
          <TableRow>
            {subHead('صورت‌وضعیت', CLR.contract)}
            {subHead('ناخالص ارزی', CLR.contract)}
            {subHead('نرخ تبدیل', CLR.contract)}
            {subHead('مبلغ ناخالص (ریال)', CLR.work)}
            {subHead('مالیات بر ارزش افزوده', CLR.add)}
            {additionColumns.map((column) => (
              <TableCell key={`add-${column.key}`} align="center" sx={{ ...finHeadBase, color: CLR.add, bgcolor: 'var(--hrms-table-header-bg)' }}>
                <Tooltip title={column.label}><Box component="span">{shortTitle(column.label, 18)}</Box></Tooltip>
              </TableCell>
            ))}
            {hasOtherAddition ? subHead('سایر اضافات', CLR.add) : null}
            {deductionColumns.map((column) => (
              <TableCell key={`ded-${column.key}`} align="center" sx={{ ...finHeadBase, color: CLR.ded, bgcolor: 'var(--hrms-table-header-bg)' }}>
                <Tooltip title={column.label}><Box component="span">{shortTitle(column.label, 18)}</Box></Tooltip>
              </TableCell>
            ))}
            {hasOtherDeduction ? subHead('سایر کسورات', CLR.ded) : null}
            {subHead('جمع اضافات', CLR.add)}
            {subHead('جمع کسورات', CLR.ded)}
            {subHead('خالص قابل پرداخت', CLR.net)}
            {subHead('پرداخت‌شده', CLR.paid)}
            {subHead('مانده', CLR.balance)}
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map(({ row, metrics, paid, balance, additions, deductions }) => {
            const kind = statementKindOf(row);
            return (
              <TableRow key={row.id} hover>
                <TableCell align="right" sx={{ ...finCellBase, textAlign: 'right' }}>
                  <Tooltip title={statementDisplayTitle(row, { fallbackId: true })}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: kind.color, flexShrink: 0 }} />
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                        {statementDisplayTitle(row, { fallbackId: true })}
                      </Typography>
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="center" sx={{ ...finCellBase, color: MUTED }}>
                  {metrics.foreignGross !== null && metrics.foreignGross !== undefined
                    ? formatPersianNumber(Math.round(metrics.foreignGross))
                    : '—'}
                </TableCell>
                <TableCell align="center" sx={{ ...finCellBase, color: CLR.rate, fontWeight: 700 }}>
                  {metrics.rate > 1 ? formatPersianNumber(metrics.rate) : '—'}
                </TableCell>
                <TableCell align="center" sx={{ ...finCellBase, color: CLR.work, fontWeight: 700 }}>
                  {formatPersianNumber(Math.round(metrics.gross))}
                </TableCell>
                <TableCell align="center" sx={{ ...finCellBase, color: CLR.add }}>
                  {metrics.vat ? formatPersianNumber(Math.round(metrics.vat)) : '—'}
                </TableCell>
                {additionColumns.map((column) => (
                  <TableCell key={`add-${column.key}`} align="center" sx={{ ...finCellBase, color: CLR.add }}>
                    {additions[column.key] ? formatPersianNumber(Math.round(additions[column.key])) : '—'}
                  </TableCell>
                ))}
                {hasOtherAddition ? (
                  <TableCell align="center" sx={{ ...finCellBase, color: CLR.add }}>
                    {additions.__other ? formatPersianNumber(Math.round(additions.__other)) : '—'}
                  </TableCell>
                ) : null}
                {deductionColumns.map((column) => (
                  <TableCell key={`ded-${column.key}`} align="center" sx={{ ...finCellBase, color: CLR.ded }}>
                    {deductions[column.key] ? formatPersianNumber(Math.round(deductions[column.key])) : '—'}
                  </TableCell>
                ))}
                {hasOtherDeduction ? (
                  <TableCell align="center" sx={{ ...finCellBase, color: CLR.ded }}>
                    {deductions.__other ? formatPersianNumber(Math.round(deductions.__other)) : '—'}
                  </TableCell>
                ) : null}
                <TableCell align="center" sx={{ ...finCellBase, color: CLR.add, fontWeight: 700 }}>
                  {formatPersianNumber(Math.round(metrics.additionsTotal))}
                </TableCell>
                <TableCell align="center" sx={{ ...finCellBase, color: CLR.ded, fontWeight: 700 }}>
                  {formatPersianNumber(Math.round(metrics.deductionsTotal))}
                </TableCell>
                <TableCell align="center" sx={{ ...finCellBase, color: CLR.net, fontWeight: 800 }}>
                  {formatPersianNumber(Math.round(metrics.net))}
                </TableCell>
                <TableCell align="center" sx={{ ...finCellBase, color: CLR.paid, fontWeight: 700 }}>
                  {formatPersianNumber(Math.round(paid))}
                </TableCell>
                <TableCell align="center" sx={{
                  ...finCellBase,
                  fontWeight: 800,
                  color: balance > 0 ? CLR.balance : CLR.ok,
                }}>
                  {formatPersianNumber(Math.round(balance))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>

        <TableFooter>
          <TableRow sx={{ '& td': { borderTop: '2px solid var(--hrms-table-border-color, #e8edf4)', bgcolor: alpha(CLR.net, 0.04) } }}>
            <TableCell align="right" sx={{ ...finCellBase, textAlign: 'right', fontWeight: 900, color: INK }}>
              جمع کل ({toPersianDigits(rows.length)} سند)
            </TableCell>
            <TableCell align="center" sx={{ ...finCellBase, fontWeight: 800, color: MUTED }}>—</TableCell>
            <TableCell align="center" sx={{ ...finCellBase, fontWeight: 800, color: MUTED }}>—</TableCell>
            <TableCell align="center" sx={{ ...finCellBase, fontWeight: 900, color: CLR.work }}>
              {formatPersianNumber(Math.round(totals.gross))}
            </TableCell>
            <TableCell align="center" sx={{ ...finCellBase, fontWeight: 900, color: CLR.add }}>
              {formatPersianNumber(Math.round(totals.vat))}
            </TableCell>
            {additionColumns.map((column) => (
              <TableCell key={`tadd-${column.key}`} align="center" sx={{ ...finCellBase, fontWeight: 800, color: CLR.add }}>
                {totals.additions[column.key] ? formatPersianNumber(Math.round(totals.additions[column.key])) : '—'}
              </TableCell>
            ))}
            {hasOtherAddition ? (
              <TableCell align="center" sx={{ ...finCellBase, fontWeight: 800, color: CLR.add }}>
                {totals.additions.__other ? formatPersianNumber(Math.round(totals.additions.__other)) : '—'}
              </TableCell>
            ) : null}
            {deductionColumns.map((column) => (
              <TableCell key={`tded-${column.key}`} align="center" sx={{ ...finCellBase, fontWeight: 800, color: CLR.ded }}>
                {totals.deductions[column.key] ? formatPersianNumber(Math.round(totals.deductions[column.key])) : '—'}
              </TableCell>
            ))}
            {hasOtherDeduction ? (
              <TableCell align="center" sx={{ ...finCellBase, fontWeight: 800, color: CLR.ded }}>
                {totals.deductions.__other ? formatPersianNumber(Math.round(totals.deductions.__other)) : '—'}
              </TableCell>
            ) : null}
            <TableCell align="center" sx={{ ...finCellBase, fontWeight: 900, color: CLR.add }}>
              {formatPersianNumber(Math.round(totals.additionsTotal))}
            </TableCell>
            <TableCell align="center" sx={{ ...finCellBase, fontWeight: 900, color: CLR.ded }}>
              {formatPersianNumber(Math.round(totals.deductionsTotal))}
            </TableCell>
            <TableCell align="center" sx={{ ...finCellBase, fontWeight: 900, color: CLR.net }}>
              {formatPersianNumber(Math.round(totals.net))}
            </TableCell>
            <TableCell align="center" sx={{ ...finCellBase, fontWeight: 900, color: CLR.paid }}>
              {formatPersianNumber(Math.round(totals.paid))}
            </TableCell>
            <TableCell align="center" sx={{ ...finCellBase, fontWeight: 900, color: totals.balance > 0 ? CLR.balance : CLR.ok }}>
              {formatPersianNumber(Math.round(totals.balance))}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
};

/* کاشی کوچک آمار — محتوا همیشه دقیقاً وسط کادر */
const StatBox = ({ label, value, color = CLR.net, dense = false }) => (
  <Box sx={{
    p: dense ? 0.7 : 0.9,
    borderRadius: dense ? '9px' : '10px',
    bgcolor: alpha(color, 0.05),
    border: `1px solid ${alpha(color, 0.16)}`,
    minWidth: 0,
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  }}>
    <Typography sx={{
      width: '100%', textAlign: 'center', fontSize: dense ? 10 : 10.5,
      color: MUTED, lineHeight: 1.5,
    }}>
      {label}
    </Typography>
    <Typography title={String(value)} sx={{
      width: '100%', textAlign: 'center', fontSize: dense ? 11 : 12,
      fontWeight: 900, color, mt: 0.2, lineHeight: 1.6, wordBreak: 'break-word',
    }}>
      {value}
    </Typography>
  </Box>
);

/* ---------- کارت تحلیل ---------- */
const AnalysisCard = ({ icon: Icon, title, color = CLR.net, action, children, sx }) => (
  <Paper elevation={0} sx={{
    height: '100%',
    borderRadius: 'var(--hrms-table-radius, 16px)',
    border: '1px solid var(--hrms-table-border-color, #e8edf4)',
    bgcolor: 'background.paper',
    boxShadow: 'none',
    p: 1.5,
    ...sx,
  }}>
    <Stack direction="row" alignItems="center" spacing={1} useFlexGap sx={{ mb: 1.25 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '9px', flexShrink: 0,
        bgcolor: alpha(color, 0.08), color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 16 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK }}>{title}</Typography>
      </Box>
      {action || null}
    </Stack>
    {children}
  </Paper>
);

const chartTooltipStyle = {
  direction: 'rtl',
  fontSize: 12,
  fontFamily: 'inherit',
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.35)',
  backgroundColor: 'rgba(255,255,255,0.98)',
  boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
};
const chartAxisTick = { fontSize: 11, fontFamily: 'inherit', fill: '#475569' };
const legendStyle = { fontSize: 11, fontFamily: 'inherit', paddingTop: 4 };
const chartMoney = (value) => formatPersianNumber(Math.round(toNum(value)));
/* اعداد محور به‌صورت فشرده تا در ستون کنار نمودار جا شوند */
const chartAxisMoney = (value) => {
  const number = Math.abs(toNum(value));
  if (number >= 1e9) return `${toPersianDigits(String(Math.round(number / 1e9)))} میلیارد`;
  if (number >= 1e6) return `${toPersianDigits(String(Math.round(number / 1e6)))} میلیون`;
  if (number >= 1e3) return `${toPersianDigits(String(Math.round(number / 1e3)))} هزار`;
  return toPersianDigits(String(Math.round(number)));
};
/* خطوط افقی و عمودی شبکه + محورهای قاب‌دار */
const chartGrid = { stroke: 'rgba(148,163,184,0.28)', strokeDasharray: '4 4', vertical: true };
const chartXAxisProps = {
  axisLine: { stroke: '#cbd5e1', strokeWidth: 1 },
  tickLine: { stroke: '#cbd5e1' },
  tick: chartAxisTick,
  tickMargin: 8,
};
/* برچسب محور عمودی: با direction=ltr و textAnchor=end همیشه سمت چپ خط محور می‌نشیند */
const ChartYAxisTick = ({ x, y, payload }) => (
  <text
    x={x}
    y={y}
    dx={-10}
    dy={4}
    textAnchor="end"
    direction="ltr"
    fill="#475569"
    fontSize={11}
    fontFamily="inherit"
  >
    {chartAxisMoney(payload?.value)}
  </text>
);

const chartYAxisProps = {
  orientation: 'left',
  width: 86,
  axisLine: { stroke: '#cbd5e1', strokeWidth: 1 },
  tickLine: { stroke: '#cbd5e1' },
  tick: <ChartYAxisTick />,
};
const chartTooltipProps = {
  contentStyle: chartTooltipStyle,
  itemStyle: { fontFamily: 'inherit' },
  cursor: { fill: 'rgba(148,163,184,0.08)' },
};
const chartLegendProps = { align: 'right', iconType: 'circle', iconSize: 8, wrapperStyle: legendStyle };
/* رنگ‌های حرفه‌ای برای اقلام کسورات/اضافات */
const SERIES_COLORS = ['#be123c', '#f97316', '#7c3aed', '#0e7490', '#f59e0b', '#15803d', '#64748b'];


/* =======================================================================
   صفحهٔ تحلیل مالی قرارداد: صفحهٔ اول فهرست قراردادها، سپس تحلیل هر قرارداد
   ======================================================================= */
const ContractFinancePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const contractId = searchParams.get('contract') || '';

  /* توکن‌های استودیو تم */
  const { tokens } = useDesignTokens();
  const tableTheme = resolveTableTheme(tokens);
  const toolbar = resolveToolbarTheme(tokens);
  const cardPadX = Math.max(12, Number(tableTheme.frameX) || 0);
  const cardPadY = Math.max(12, Number(tableTheme.frameY) || 0);
  const cardBorderColor = alpha(theme.palette.text.primary, 0.14);

  /* وضعیت صفحهٔ فهرست */
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('remaining');
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyWithFinance, setOnlyWithFinance] = useState(false);
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [docsTab, setDocsTab] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState(null);

  const asList = (data) => (Array.isArray(data) ? data : []);

  const contractsQuery = useQuery({
    queryKey: ['contracts-finance-list'],
    queryFn: () => fetchAllPages('/external-contracts/'),
    staleTime: 3 * 60 * 1000,
  });
  /* دو فهرست سبک‌تر که جدول را سریع می‌سازند؛ پاسخ سنگین قراردادها بعداً آن را کامل می‌کند */
  const statementsQuery = useQuery({
    queryKey: ['contracts-finance-statements'],
    queryFn: () => fetchAllPages('/contract-statements/'),
    staleTime: 2 * 60 * 1000,
  });
  const paymentsQuery = useQuery({
    queryKey: ['contracts-finance-payments'],
    queryFn: () => fetchAllPages('/contract-payments/'),
    staleTime: 2 * 60 * 1000,
  });

  const contractList = useMemo(
    () => asList(contractsQuery.data).filter((row) => row && row.id),
    [contractsQuery.data],
  );
  const statementsAll = useMemo(
    () => asList(statementsQuery.data).filter((row) => row && row.contract),
    [statementsQuery.data],
  );
  const paymentsAll = useMemo(
    () => asList(paymentsQuery.data).filter((row) => row && row.contract),
    [paymentsQuery.data],
  );

  const detailQuery = useQuery({
    queryKey: ['contract-finance-detail', contractId],
    queryFn: () => axiosInstance.get(`/external-contracts/${contractId}/`).then((response) => response.data),
    enabled: Boolean(contractId),
  });
  const contract = detailQuery.data || null;
  const scoped = Boolean(contractId);

  const selectContract = (row) => {
    if (!row?.id) return;
    setMsg(null);
    setDocsTab(0);
    setSearchParams({ contract: String(row.id) });
  };
  const clearContract = () => {
    setMsg(null);
    setSearchParams({});
  };
  const refresh = () => {
    contractsQuery.refetch();
    statementsQuery.refetch();
    paymentsQuery.refetch();
    if (scoped) detailQuery.refetch();
  };

  /* ---- فهرست قراردادها: ابتدا از اسناد ساخته می‌شود و با پاسخ قراردادها کامل می‌گردد ---- */
  const contractDirectory = useMemo(() => {
    const map = new Map();
    statementsAll.forEach((row) => {
      const key = String(row.contract ?? '');
      if (!key || key === 'null' || map.has(key)) return;
      map.set(key, {
        id: row.contract,
        number: row.contract_number || '',
        subject: row.contract_subject || '',
        party_name: '',
      });
    });
    paymentsAll.forEach((row) => {
      const key = String(row.contract ?? '');
      if (!key || key === 'null' || map.has(key)) return;
      map.set(key, { id: row.contract, number: '', subject: row.contract_subject || '', party_name: '' });
    });
    contractList.forEach((row) => {
      const key = String(row.id);
      const partial = map.get(key);
      map.set(key, partial ? { ...partial, ...row } : row);
    });
    return Array.from(map.values());
  }, [statementsAll, paymentsAll, contractList]);

  const selectedContract = contractDirectory.find((row) => String(row.id) === String(contractId)) || null;

  /* ---- جمع‌های مالی هر قرارداد برای صفحهٔ اول ---- */
  const landingAggregates = useMemo(() => {
    const map = new Map();
    const ensure = (key) => {
      if (!map.has(key)) map.set(key, { statements: 0, workDone: 0, net: 0, paid: 0 });
      return map.get(key);
    };
    statementsAll.forEach((row) => {
      const entry = ensure(String(row.contract));
      const metrics = statementMetrics(row, 0);
      entry.statements += 1;
      entry.workDone += metrics.gross;
      entry.net += metrics.net;
    });
    paymentsAll.forEach((row) => {
      ensure(String(row.contract)).paid += toNum(row.amount);
    });
    return map;
  }, [statementsAll, paymentsAll]);

  const contractRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = contractDirectory
      .filter((row) => {
        if (statusFilter && row.status !== statusFilter) return false;
        const agg = landingAggregates.get(String(row.id));
        if (onlyWithFinance && (!agg || (!agg.statements && !agg.paid))) return false;
        if (!term) return true;
        return [row.number, row.subject, row.party_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .map((row) => {
        const agg = landingAggregates.get(String(row.id)) || { statements: 0, workDone: 0, net: 0, paid: 0 };
        return {
          contract: row,
          statements: agg.statements,
          workDone: agg.workDone,
          paid: agg.paid,
          remaining: Math.max(agg.net - agg.paid, 0),
          amountLoaded: row.amount !== undefined && row.amount !== null,
          amount: toNum(row.effective_amount ?? row.amount),
          currency: normalizeCurrencyLabel(row.currency_name || row.currency_symbol),
        };
      });
    return [...rows].sort((a, b) => {
      if (sortBy === 'work') return b.workDone - a.workDone;
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'number') return String(a.contract.number || '').localeCompare(String(b.contract.number || ''), 'fa');
      return b.remaining - a.remaining;
    });
  }, [contractDirectory, landingAggregates, search, statusFilter, onlyWithFinance, sortBy]);


  const landingPageSize = tableTheme.rowsPerPage;
  const landingTotalPages = Math.max(1, Math.ceil(contractRows.length / landingPageSize));
  useEffect(() => { setPage(0); }, [search, statusFilter, onlyWithFinance, sortBy, landingPageSize]);
  useEffect(() => {
    if (page > landingTotalPages - 1) setPage(Math.max(0, landingTotalPages - 1));
  }, [page, landingTotalPages]);

  const pagedContracts = useMemo(
    () => contractRows
      .slice(page * landingPageSize, (page + 1) * landingPageSize)
      .map((row) => ({ ...row, offset: page * landingPageSize })),
    [contractRows, page, landingPageSize],
  );
  const landingPageNumbers = (() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, landingTotalPages - size));
    const end = Math.min(landingTotalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
  })();

  /* اندازه‌گیری ارتفاع ردیف‌های جدول فهرست */
  const tableScrollRef = useRef(null);
  const [measuredRowPx, setMeasuredRowPx] = useState(0);
  const [measuredHeadPx, setMeasuredHeadPx] = useState(0);
  const measureRows = () => {
    const host = tableScrollRef.current;
    if (!host) return;
    const rowEl = host.querySelector('tbody tr');
    const headEl = host.querySelector('thead tr');
    const rowPx = rowEl ? Math.round(rowEl.getBoundingClientRect().height) : 0;
    const headPx = headEl ? Math.round(headEl.getBoundingClientRect().height) : 0;
    setMeasuredRowPx((previous) => (previous === rowPx ? previous : rowPx));
    setMeasuredHeadPx((previous) => (previous === headPx ? previous : headPx));
  };
  useLayoutEffect(measureRows, [pagedContracts.length, tableTheme.rowHeight, tableTheme.headerHeight, scoped]);
  useEffect(() => {
    const onResize = () => measureRows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const effectiveRowPx = measuredRowPx > 0 ? measuredRowPx : tableTheme.rowHeight;
  const effectiveHeadPx = measuredHeadPx > 0 ? measuredHeadPx : tableTheme.headerHeight;
  const tableHeight = Math.round(effectiveHeadPx + effectiveRowPx * tableTheme.visibleRows);

  /* ---- فیلترهای صفحهٔ اول ---- */
  const contractStatusOptions = [
    { value: '', label: 'همه' },
    ...Object.entries(CONTRACT_STATUS_LABELS).map(([key, label]) => ({ value: key, label })),
  ];
  const financeToggleOptions = [
    { value: 'all', label: 'همهٔ قراردادها' },
    { value: 'withFinance', label: 'فقط دارای سند مالی' },
  ];
  const activeFilterCount = (statusFilter ? 1 : 0) + (onlyWithFinance ? 1 : 0);
  const activeChips = [
    statusFilter
      ? {
        key: 'status',
        label: `وضعیت: ${CONTRACT_STATUS_LABELS[statusFilter] || statusFilter}`,
        clear: () => setStatusFilter(''),
      }
      : null,
    onlyWithFinance
      ? { key: 'withFinance', label: 'فقط قراردادهای دارای سند مالی', clear: () => setOnlyWithFinance(false) }
      : null,
  ].filter(Boolean);
  const activeChipSx = toolbar.chipStyle === 'outlined'
    ? { bgcolor: 'transparent', border: `1px solid ${toolbar.chipBorder}`, color: toolbar.primary, fontWeight: 700 }
    : { bgcolor: toolbar.chipBg, color: toolbar.primary, fontWeight: 700, border: `1px solid ${toolbar.chipBorder}` };
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setOnlyWithFinance(false);
    setSortBy('remaining');
  };

  /* ---- دادهٔ قرارداد انتخاب‌شده ---- */
  const statements = useMemo(() => [...(contract?.statements || [])].sort((a, b) => (
    String(a.date || '').localeCompare(String(b.date || '')) || Number(a.id || 0) - Number(b.id || 0)
  )), [contract]);
  const invoices = contract?.invoices || [];
  const payments = contract?.payments || [];
  const addendums = contract?.addendums || [];
  const guarantees = contract?.guarantees || [];

  const baseAmount = toNum(contract?.amount);
  const contractAmount = toNum(contract?.effective_amount ?? contract?.amount);
  const addendumAmount = contractAmount - baseAmount;
  const currencyLabel = normalizeCurrencyLabel(contract?.currency_name || contract?.currency_symbol);
  const statementRate = [...statements]
    .reverse()
    .map((row) => toNum(row.exchange_rate))
    .find((value) => value > 1) || 0;
  const displayRate = toNum(contract?.exchange_rate) > 1
    ? toNum(contract.exchange_rate)
    : (statementRate || 1);
  const amountRial = contractAmount * displayRate;

  const paidByStatement = useMemo(() => payments.reduce((map, row) => {
    const key = String(row.statement ?? '');
    if (!key || key === 'null') return map;
    map[key] = (map[key] || 0) + toNum(row.amount);
    return map;
  }, {}), [payments]);


  /* ---- ستون‌های پویا: هر اضافه/کسورات موجود در صورت‌وضعیت‌ها یک ستون ---- */
  const additionColumns = useMemo(() => {
    const titles = [];
    statements.forEach((row) => (Array.isArray(row.additions) ? row.additions : []).forEach((item) => {
      const title = titleOf(item);
      if (!title || isVatTitle(title) || titles.includes(title)) return;
      titles.push(title);
    }));
    return titles.slice(0, 8).map((title) => ({ key: title, label: title }));
  }, [statements]);

  const deductionColumns = useMemo(() => {
    const titles = [];
    statements.forEach((row) => (Array.isArray(row.deductions) ? row.deductions : []).forEach((item) => {
      const title = titleOf(item);
      if (!title || titles.includes(title)) return;
      titles.push(title);
    }));
    return titles.slice(0, 10).map((title) => ({ key: title, label: title }));
  }, [statements]);

  const breakdownRows = useMemo(() => statements.map((row) => {
    const metrics = statementMetrics(row, contract?.exchange_rate);
    const additions = {};
    let listedAdditions = 0;
    (Array.isArray(row.additions) ? row.additions : []).forEach((item) => {
      const title = titleOf(item);
      if (!title || isVatTitle(title)) return;
      if (additionColumns.some((column) => column.key === title)) {
        additions[title] = (additions[title] || 0) + toNum(item.amount);
        listedAdditions += toNum(item.amount);
      }
    });
    additions.__other = Math.max(0, metrics.additionsTotal - listedAdditions - toNum(metrics.vat));

    const deductions = {};
    let listedDeductions = 0;
    (Array.isArray(row.deductions) ? row.deductions : []).forEach((item) => {
      const title = titleOf(item);
      if (!title) return;
      if (deductionColumns.some((column) => column.key === title)) {
        deductions[title] = (deductions[title] || 0) + toNum(item.amount);
        listedDeductions += toNum(item.amount);
      }
    });
    deductions.__other = Math.max(0, metrics.deductionsTotal - listedDeductions);

    const paid = paidByStatement[String(row.id)] || 0;
    return { row, metrics, additions, deductions, paid, balance: metrics.net - paid };
  }), [statements, additionColumns, deductionColumns, paidByStatement, contract?.exchange_rate]);

  const hasOtherAddition = breakdownRows.some((item) => item.additions.__other > 0.5);
  const hasOtherDeduction = breakdownRows.some((item) => item.deductions.__other > 0.5);

  const totals = useMemo(() => {
    const base = {
      gross: 0, vat: 0, additionsTotal: 0, deductionsTotal: 0, net: 0, paid: 0, balance: 0,
      additions: {}, deductions: {}, buckets: {},
    };
    DEDUCTION_KEYS.forEach(([key]) => { base.buckets[key] = 0; });
    breakdownRows.forEach(({ metrics, additions, deductions, paid, balance }) => {
      base.gross += metrics.gross;
      base.vat += metrics.vat;
      base.additionsTotal += metrics.additionsTotal;
      base.deductionsTotal += metrics.deductionsTotal;
      base.net += metrics.net;
      base.paid += paid;
      base.balance += balance;
      Object.entries(additions).forEach(([key, value]) => { base.additions[key] = (base.additions[key] || 0) + value; });
      Object.entries(deductions).forEach(([key, value]) => { base.deductions[key] = (base.deductions[key] || 0) + value; });
      Object.entries(metrics.buckets).forEach(([key, value]) => { base.buckets[key] = (base.buckets[key] || 0) + value; });
    });
    return base;
  }, [breakdownRows]);

  const totalPaidAll = payments.reduce((sum, row) => sum + toNum(row.amount), 0);
  const payableRemaining = Math.max(totals.net - totals.paid, 0);
  const contractRemaining = Math.max(amountRial - totals.gross, 0);
  const workRatio = ratio(totals.gross, amountRial || 1);
  const paidRatio = ratio(totals.paid, totals.net || 1);

  /* ---- روند و جریان نقدی ---- */
  const timeline = useMemo(() => {
    let cumWork = 0;
    let cumNet = 0;
    let cumPaid = 0;
    return breakdownRows.map(({ row, metrics, paid }) => {
      cumWork += metrics.gross;
      cumNet += metrics.net;
      cumPaid += paid;
      return {
        label: toPersianDigits(row.number || row.id),
        title: statementDisplayTitle(row, { fallbackId: true }),
        date: toJalali(row.date),
        gross: Math.round(metrics.gross),
        additions: Math.round(metrics.additionsTotal),
        deductions: Math.round(metrics.deductionsTotal),
        net: Math.round(metrics.net),
        paid: Math.round(paid),
        cumWork: Math.round(cumWork),
        cumNet: Math.round(cumNet),
        cumPaid: Math.round(cumPaid),
      };
    });
  }, [breakdownRows]);

  const monthlyPayments = useMemo(() => {
    const map = new Map();
    [...payments]
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
      .forEach((row) => {
        const month = toJalali(row.date).slice(0, 7) || '—';
        map.set(month, (map.get(month) || 0) + toNum(row.amount));
      });
    return Array.from(map.entries()).map(([month, amount]) => ({ month, amount: Math.round(amount) }));
  }, [payments]);

  const paymentTypeRows = useMemo(() => {
    const map = new Map();
    payments.forEach((row) => {
      const label = row.payment_type_display || row.payment_type || 'سایر';
      map.set(label, (map.get(label) || 0) + toNum(row.amount));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [payments]);


  /* ---- پیش‌پرداخت، تضامین، تخصیص پروژه‌ها و پیش‌بینی ---- */
  const stagedAdvance = (contract?.advance_payments || []).reduce((sum, row) => sum + toNum(row.amount), 0);
  const prepaymentTotal = Math.max(toNum(contract?.advance_payment), stagedAdvance);
  const prepaymentAmortized = Math.min(totals.buckets.prepayment || 0, prepaymentTotal);
  const prepaymentRemaining = Math.max(prepaymentTotal - prepaymentAmortized, 0);

  const guaranteeItems = useMemo(() => {
    const display = Array.isArray(contract?.guarantee_items_display) ? contract.guarantee_items_display : [];
    const raw = Array.isArray(contract?.guarantee_items) ? contract.guarantee_items : [];
    const items = display.length ? display : raw;
    return items.map((item, index) => {
      const required = toNum(item.amount) || ((toNum(item.percent) * contractAmount) / 100);
      const provided = guarantees
        .filter((row) => !row.is_released && Number(row.contract_guarantee_index) === index)
        .reduce((sum, row) => sum + toNum(row.amount), 0);
      return {
        name: item.type_label || item.type || `تعهد ${index + 1}`,
        required: Math.round(required),
        provided: Math.round(provided),
      };
    });
  }, [contract, contractAmount, guarantees]);

  const guaranteeProvidedTotal = guarantees
    .filter((row) => !row.is_released)
    .reduce((sum, row) => sum + toNum(row.amount), 0);
  const guaranteeRequiredTotal = guaranteeItems.reduce((sum, item) => sum + item.required, 0)
    || Math.round(contractAmount * 0.1);
  const guaranteeCoverage = ratio(guaranteeProvidedTotal, guaranteeRequiredTotal || 1);
  const guaranteeChart = guaranteeItems.length
    ? guaranteeItems
    : [{ name: 'کل تعهدات', required: guaranteeRequiredTotal, provided: Math.round(guaranteeProvidedTotal) }];

  const allocationRows = useMemo(() => {
    const display = Array.isArray(contract?.project_allocations_display) ? contract.project_allocations_display : [];
    const raw = Array.isArray(contract?.project_allocations) ? contract.project_allocations : [];
    const list = display.length ? display : raw;
    if (!list.length) {
      return [{
        name: contract?.project_title || contract?.project_name || contract?.subject || 'کل قرارداد',
        percent: 100,
        amount: Math.round(contractAmount),
      }];
    }
    return list.map((item) => ({
      name: item.project_name || `پروژه #${item.project}`,
      percent: toNum(item.percentage),
      amount: Math.round((contractAmount * toNum(item.percentage)) / 100),
    }));
  }, [contract, contractAmount]);

  const periodStart = contract?.start_date;
  const periodEnd = contract?.effective_end_date || contract?.end_date;
  const totalDays = dayDiff(periodStart, periodEnd);
  const todayIso = new Date().toISOString().slice(0, 10);
  const elapsedDays = totalDays > 0 ? Math.min(totalDays, Math.max(1, dayDiff(periodStart, todayIso))) : 0;
  const burnPerDay = elapsedDays > 0 ? totals.gross / elapsedDays : 0;
  const forecastTotal = Math.max(totals.gross, Math.round(burnPerDay * Math.max(totalDays, 1)));
  const forecastDeviation = amountRial > 0 ? ((forecastTotal - amountRial) / amountRial) * 100 : 0;
  const deviationRows = [
    { name: 'مبلغ پایه', value: Math.round(baseAmount * displayRate) },
    { name: 'الحاقیه‌ها', value: Math.round(addendumAmount * displayRate) },
    { name: 'کارکرد تا امروز', value: Math.round(totals.gross) },
    { name: 'پیش‌بینی هزینه نهایی', value: forecastTotal },
  ];

  const deductionBuckets = DEDUCTION_KEYS.map(([key, label]) => ({
    key,
    label,
    short: shortTitle(label, 11),
    value: Math.round(totals.buckets[key] || 0),
  }));


  /* ---- کنترل‌ها و مغایرت‌ها ---- */
  const checks = useMemo(() => {
    const out = [];
    const push = (key, label, status, detail, value = 0) => out.push({ key, label, status, detail, value });

    const netMismatch = breakdownRows.filter(({ metrics }) => (
      Math.abs(metrics.net - (metrics.gross + metrics.additionsTotal - metrics.deductionsTotal)) > 1000
    ));
    push('net', 'تطابق خالص صورت‌وضعیت', netMismatch.length ? 'danger' : 'ok',
      netMismatch.length
        ? `${toPersianDigits(netMismatch.length)} سند: خالص ≠ کارکرد + اضافات − کسورات`
        : 'خالص همهٔ اسناد هم‌خوان است', netMismatch.length);

    const unapproved = statements.filter((row) => !row.is_approved);
    push('approved', 'صورت‌وضعیت‌های تأییدنشده', unapproved.length ? 'warn' : 'ok',
      unapproved.length
        ? `${toPersianDigits(unapproved.length)} صورت‌وضعیت در انتظار تأیید`
        : 'همهٔ صورت‌وضعیت‌ها تأیید شده‌اند', unapproved.length);

    const overpaid = breakdownRows.filter(({ metrics, paid }) => paid > metrics.net + 1);
    push('overpaid', 'پرداخت مازاد بر خالص صورت‌وضعیت', overpaid.length ? 'danger' : 'ok',
      overpaid.length
        ? `${toPersianDigits(overpaid.length)} سند: پرداختی بیش از خالص`
        : 'پرداختی از خالص پیشی نگرفته است', overpaid.length);

    const unlinked = payments.filter((row) => !row.statement);
    const unlinkedSum = unlinked.reduce((sum, row) => sum + toNum(row.amount), 0);
    push('unlinked', 'پرداخت‌های بدون اتصال به صورت‌وضعیت', unlinked.length ? 'warn' : 'ok',
      unlinked.length
        ? `${toPersianDigits(unlinked.length)} پرداخت — ${money(unlinkedSum, currencyLabel)}`
        : 'همهٔ پرداخت‌ها به صورت‌وضعیت متصل است', unlinked.length);

    const overrun = Math.max(0, totals.gross - amountRial);
    push('overrun', 'کارکرد بیش از مبلغ قرارداد', overrun > 1 ? 'danger' : 'ok',
      overrun > 1 ? `${money(overrun, currencyLabel)} بیش از سقف قرارداد` : 'کارکرد در سقف قرارداد است', overrun);

    const badRate = statements.filter((row) => (
      normalizeCurrencyLabel(row.currency_name || row.currency_symbol) !== 'ریال' && toNum(row.exchange_rate) <= 1
    ));
    push('rate', 'نرخ تبدیل ارز صورت‌وضعیت‌ها', badRate.length ? 'warn' : 'ok',
      badRate.length
        ? `${toPersianDigits(badRate.length)} سند بدون نرخ تبدیل معتبر`
        : 'نرخ تبدیل همهٔ اسناد ثبت شده است', badRate.length);

    push('advance', 'تسویهٔ پیش‌پرداخت', prepaymentRemaining > 1 ? 'warn' : 'ok',
      prepaymentRemaining > 1
        ? `${money(prepaymentRemaining, currencyLabel)} پیش‌پرداخت تسویه‌نشده`
        : 'پیش‌پرداخت کامل تسویه شده است', prepaymentRemaining);

    const retentionPercent = toNum(contract?.retention_percent);
    const expectedRetention = (totals.gross * retentionPercent) / 100;
    const retentionGap = Math.abs((totals.buckets.retention || 0) - expectedRetention);
    push('retention', 'کنترل کسورات حسن انجام کار',
      retentionPercent > 0 && retentionGap > Math.max(1000, expectedRetention * 0.05) ? 'warn' : 'ok',
      retentionPercent > 0
        ? `انتظار ${money(expectedRetention, currencyLabel)} · ثبت‌شده ${money(totals.buckets.retention || 0, currencyLabel)}`
        : 'درصد حسن انجام کار برای قرارداد ثبت نشده است',
      retentionGap);

    const guaranteeGap = Math.max(0, guaranteeRequiredTotal - guaranteeProvidedTotal);
    push('guarantee', 'پوشش تضامین و تعهدات', guaranteeGap > 1 ? 'warn' : 'ok',
      guaranteeGap > 1
        ? `${money(guaranteeGap, currencyLabel)} کسری پوشش تضامین`
        : 'تضامین ثبت‌شده پوشش کامل دارد', guaranteeGap);

    return out;
  }, [
    breakdownRows, statements, payments, totals, amountRial, prepaymentRemaining,
    contract?.retention_percent, guaranteeRequiredTotal, guaranteeProvidedTotal, currencyLabel,
  ]);

  const warningCount = checks.filter((item) => item.status !== 'ok').length;

  const exportExcel = async () => {
    if (!contractId || exporting) return;
    setExporting(true);
    setMsg(null);
    try {
      await downloadFile('/external-contracts/export-excel/', {
        params: { contract: contractId },
        fallbackName: `contract-${selectedContract?.number || contractId}-finance.xlsx`,
      });
      setMsg({ ok: true, text: 'فایل اکسل این قرارداد آماده شد.' });
    } catch (error) {
      setMsg({ ok: false, text: `خطا در تهیهٔ فایل اکسل: ${error?.message || 'نامشخص'}` });
    } finally {
      setExporting(false);
    }
  };

  const loading = (contractsQuery.isLoading || statementsQuery.isLoading) && !contractDirectory.length;


  return (
    <Box>
      <PageHeader
        icon={<InsightsIcon />}
        title="تحلیل مالی قرارداد"
        badge={scoped ? (
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            <Chip size="small" variant="outlined"
              label={`قرارداد ${toPersianDigits(contract?.number || selectedContract?.number || contractId)}`} />
            {contract?.status_display || contract?.status ? (
              <Chip size="small" label={contract.status_display || contract.status}
                sx={{ bgcolor: alpha(theme.palette.text.primary, 0.06), color: 'text.secondary', fontWeight: 700 }} />
            ) : null}
            <Chip size="small" label={currencyLabel}
              sx={{ bgcolor: alpha(CLR.contract, 0.1), color: CLR.contract, fontWeight: 800 }} />
          </Stack>
        ) : (
          <Chip size="small" label={`${toPersianDigits(contractRows.length)} قرارداد`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(CLR.contract, 0.1), color: CLR.contract }} />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" onClick={refresh}
                  disabled={contractsQuery.isFetching || detailQuery.isFetching}
                  sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            {scoped ? (
              <Button variant="outlined" disabled={exporting} startIcon={<DownloadIcon />} onClick={exportExcel}>
                {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
              </Button>
            ) : null}
            {scoped ? (
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>چاپ</Button>
            ) : null}
            {scoped ? (
              <Button variant="outlined" startIcon={<BusinessIcon />}
                onClick={() => navigate(`/external-contracts/${contractId}`)}>پرونده قرارداد</Button>
            ) : null}
            {scoped ? (
              <Button variant="contained" startIcon={<ChevronRightIcon />} onClick={clearContract}>
                فهرست قراردادها
              </Button>
            ) : null}
          </>
        )}
      />

      {msg ? (
        <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      ) : null}

      {!scoped ? (
        <>
          {/* نوار استاندارد جستجو، ترتیب و فیلترها */}
          <Paper sx={{
            p: 1.25, mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider',
            bgcolor: 'background.paper', boxShadow: 'none',
          }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                size="small"
                placeholder="جستجو در شماره، موضوع و طرف قرارداد…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                }}
              />
              <TextField
                select
                size="small"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                sx={{
                  flex: '0 0 auto',
                  minWidth: { xs: '100%', sm: 180 },
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
                {CONTRACT_SORT_OPTIONS.map((option) => (
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
                <Button size="small" variant="text" onClick={resetFilters}
                  sx={{ height: `${toolbar.searchHeight}px`, minHeight: `${toolbar.searchHeight}px`, alignSelf: 'center', py: 0, fontSize: 12.5, whiteSpace: 'nowrap' }}>
                  {toolbar.resetLabel}
                </Button>
              ) : null}
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
                  <FilterSelect
                    label="وضعیت قرارداد" value={statusFilter} options={contractStatusOptions}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={setStatusFilter}
                  />
                  <FilterSelect
                    label="نمایش" value={onlyWithFinance ? 'withFinance' : 'all'} options={financeToggleOptions}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={(value) => setOnlyWithFinance(value === 'withFinance')}
                  />
                  {toolbar.showReset ? (
                    <Button variant="text" size="small" onClick={resetFilters}
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
                  <Chip key={chip.key} size="small" label={chip.label} onDelete={chip.clear} sx={activeChipSx} />
                ))}
              </Stack>
            ) : null}
          </Paper>

          {/* جدول قراردادها — تمام عرض */}
          <Grid container spacing={2} alignItems="stretch">
            <Grid item xs={12}>
              <Paper elevation={0} sx={{
                borderRadius: 'var(--hrms-table-radius, 16px)',
                border: '1px solid', borderColor: cardBorderColor,
                bgcolor: 'background.paper', boxShadow: 'none',
                overflow: 'hidden',
                px: `${cardPadX}px`, py: `${cardPadY}px`,
              }}>
                {!contractRows.length ? (
                  loading ? (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                      <CircularProgress size={26} />
                      <Typography sx={{ fontSize: 11, color: MUTED, mt: 1 }}>در حال آماده‌سازی فهرست قراردادها…</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ p: 5, textAlign: 'center' }}>
                      <AccountBalanceWalletIcon sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>قراردادی با این مشخصات پیدا نشد.</Typography>
                      <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.3 }}>عبارت جستجو یا فیلترها را تغییر دهید.</Typography>
                    </Box>
                  )
                ) : (
                  <>
                    <FinanceLandingTable
                      rows={pagedContracts}
                      tableTheme={tableTheme}
                      containerRef={tableScrollRef}
                      tableHeight={tableHeight}
                      rowHeight={effectiveRowPx}
                      dimmed={contractsQuery.isFetching || statementsQuery.isFetching || paymentsQuery.isFetching}
                      onOpen={selectContract}
                    />
                    <ArchivePager
                      tableTheme={tableTheme}
                      page={page}
                      onPage={setPage}
                      totalPages={landingTotalPages}
                      pageNumbers={landingPageNumbers}
                      total={contractRows.length}
                      pageSize={landingPageSize}
                      unit="قرارداد"
                    />
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : null}


      {scoped ? (
        detailQuery.isLoading && !contract ? (
          <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'background.paper', border: '1px solid', borderColor: cardBorderColor, borderRadius: '16px' }}>
            <CircularProgress size={28} />
          </Paper>
        ) : !contract ? (
          <Paper elevation={0} sx={{ p: 6, bgcolor: 'background.paper', border: '1px solid', borderColor: cardBorderColor, borderRadius: '16px' }}>
            <EmptyState icon={AccountBalanceWalletIcon} text="برای این قرارداد دادهٔ مالی پیدا نشد." />
          </Paper>
        ) : (
          <>
            {/* ---- سربرگ مشخصات کمی قرارداد ---- */}
            <Paper elevation={0} sx={{
              p: 1.75, mb: 2,
              borderRadius: 'var(--hrms-table-radius, 16px)',
              border: '1px solid', borderColor: cardBorderColor,
              bgcolor: 'background.paper', boxShadow: 'none',
            }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} lg={5}>
                  <Stack direction="row" alignItems="flex-start" spacing={1.25} useFlexGap>
                    <Box sx={{
                      width: 46, height: 46, flexShrink: 0, borderRadius: '14px',
                      bgcolor: alpha(CLR.contract, 0.08), border: `1px solid ${alpha(CLR.contract, 0.2)}`, color: CLR.contract,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <BusinessIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 900, color: INK, lineHeight: 1.6 }}>
                        {contract.subject || '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.2 }}>
                        طرف قرارداد: <Box component="span" sx={{ fontWeight: 800, color: INK }}>{contract.party_name || '—'}</Box>
                        {' · '}
                        شماره: <Box component="span" sx={{ fontWeight: 800, color: INK }}>{toPersianDigits(contract.number || '—')}</Box>
                      </Typography>
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.8 }}>
                        <Chip size="small" label={contract.contract_type_master_name || contract.contract_type_display || '—'}
                          variant="outlined" sx={{ height: 21, fontSize: 10.5 }} />
                        <Chip size="small" label={contract.status_display || contract.status || '—'}
                          sx={{ height: 21, fontSize: 10.5, bgcolor: alpha(theme.palette.text.primary, 0.06), color: 'text.secondary' }} />
                        <Chip size="small"
                          icon={<CalendarMonthIcon sx={{ fontSize: 13 }} />}
                          label={`${toJalali(periodStart) || '—'} تا ${toJalali(periodEnd) || '—'}`}
                          variant="outlined" sx={{ height: 21, fontSize: 10.5 }} />
                        <Chip size="small"
                          label={`${toPersianDigits(totalDays)} روز`}
                          sx={{ height: 21, fontSize: 10.5, bgcolor: alpha(CLR.rate, 0.1), color: CLR.rate, fontWeight: 800 }} />
                      </Stack>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} lg={7}>
                  <Grid container spacing={1}>
                    <Grid item xs={6} sm={3}>
                      <StatBox label="مبلغ پایه" value={`${formatPersianNumber(baseAmount)} ${currencyLabel}`} color={CLR.contract} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatBox label="الحاقیه‌ها" value={`${formatPersianNumber(addendumAmount)} ${currencyLabel}`} color={CLR.rate} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatBox label="مبلغ مؤثر" value={`${formatPersianNumber(contractAmount)} ${currencyLabel}`} color={CLR.contract} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatBox label="نرخ تبدیل" value={displayRate > 1 ? formatPersianNumber(displayRate) : '—'} color={CLR.rate} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatBox label="کارکرد (ریال)" value={formatPersianNumber(Math.round(totals.gross))} color={CLR.work} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatBox label="خالص قابل پرداخت" value={formatPersianNumber(Math.round(totals.net))} color={CLR.net} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatBox label="پرداخت‌شده" value={formatPersianNumber(Math.round(totals.paid))} color={CLR.paid} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatBox label="مانده مالی" value={formatPersianNumber(Math.round(payableRemaining))} color={CLR.balance} />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>


            {/* ---- جدول تفصیلی مالی صورت‌وضعیت‌ها ---- */}
            <Paper elevation={0} sx={{
              mb: 2,
              borderRadius: 'var(--hrms-table-radius, 16px)',
              border: '1px solid', borderColor: cardBorderColor,
              bgcolor: 'background.paper', boxShadow: 'none',
              p: 1.5,
            }}>
              <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '9px', flexShrink: 0,
                  bgcolor: alpha(CLR.work, 0.08), color: CLR.work,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ReceiptLongIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK, flex: 1 }}>
                  جدول تفصیلی مالی صورت‌وضعیت‌ها
                </Typography>
              </Stack>

              {breakdownRows.length ? (
                <FinanceBreakdownTable
                  rows={breakdownRows}
                  additionColumns={additionColumns}
                  deductionColumns={deductionColumns}
                  hasOtherAddition={hasOtherAddition}
                  hasOtherDeduction={hasOtherDeduction}
                  totals={totals}
                  currencyLabel={currencyLabel}
                  tableTheme={tableTheme}
                />
              ) : (
                <EmptyState icon={ReceiptLongIcon} text="برای این قرارداد صورت‌وضعیتی ثبت نشده است." />
              )}
            </Paper>


            {/* ---- هشت تحلیل مالی ---- */}
            <Grid container spacing={2}>
              {/* ۱) وضعیت مالی کل */}
              <Grid item xs={12} lg={6}>
                <AnalysisCard icon={AssessmentIcon} title="تحلیل وضعیت مالی کل قرارداد"
                  color={CLR.net}
                  action={<Chip size="small" label={`کارکرد ${faPercent(workRatio)}`}
                    sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(CLR.work, 0.1), color: CLR.work }} />}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1, mb: 1.25 }}>
                    {[
                      ['مبلغ قرارداد', `${formatPersianNumber(contractAmount)} ${currencyLabel}`, CLR.contract],
                      ['کارکرد', formatPersianNumber(Math.round(totals.gross)), CLR.work],
                      ['خالص قابل پرداخت', formatPersianNumber(Math.round(totals.net)), CLR.net],
                      ['مانده مالی', formatPersianNumber(Math.round(payableRemaining)), CLR.balance],
                    ].map(([label, value, color]) => (
                      <StatBox key={label} label={label} value={value} color={color} />
                    ))}
                  </Box>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ height: 176 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'پرداخت‌شده', value: Math.round(totals.paid) },
                                { name: 'مانده', value: Math.round(payableRemaining) },
                              ]}
                              dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}
                              startAngle={90} endAngle={450} stroke="#fff" strokeWidth={2} cornerRadius={4}
                            >
                              <Cell fill={CLR.paid} />
                              <Cell fill={CLR.balance} />
                            </Pie>
                            <ReTooltip {...chartTooltipProps} formatter={chartMoney} />
                            <Legend {...chartLegendProps} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {[
                        ['پیشرفت کارکرد نسبت به مبلغ قرارداد', workRatio, CLR.work],
                        ['نسبت پرداخت به خالص صورت‌وضعیت‌ها', paidRatio, CLR.paid],
                        ['ماندهٔ قرارداد (کارکردنشده)', ratio(contractRemaining, amountRial || 1), CLR.balance],
                      ].map(([label, value, color]) => (
                        <Box key={label} sx={{ mb: 1.1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} useFlexGap>
                            <Typography sx={{ fontSize: 11, color: MUTED }}>{label}</Typography>
                            <Typography sx={{ fontSize: 11, fontWeight: 800, color }}>{faPercent(value)}</Typography>
                          </Stack>
                          <ProgressBar value={value} color={color} height={6} />
                        </Box>
                      ))}
                    </Grid>
                  </Grid>
                </AnalysisCard>
              </Grid>


              {/* ۲) صورت‌وضعیت‌ها و پرداخت‌ها */}
              <Grid item xs={12} lg={6}>
                <AnalysisCard icon={ReceiptLongIcon} title="تحلیل صورت‌وضعیت‌ها و پرداخت‌ها"
                  color={CLR.work}
                  action={<Chip size="small" label={`${toPersianDigits(breakdownRows.length)} سند`}
                    sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(CLR.work, 0.1), color: CLR.work }} />}>
                  {timeline.length ? (
                    <Box sx={{ height: 268 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeline} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
                          <CartesianGrid {...chartGrid} />
                          <XAxis {...chartXAxisProps} dataKey="label" />
                          <YAxis {...chartYAxisProps} />
                          <ReTooltip
                            {...chartTooltipProps}
                            formatter={chartMoney}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label}
                          />
                          <Legend {...chartLegendProps} />
                          <Line type="monotone" dataKey="gross" name="کارکرد" stroke={CLR.work} strokeWidth={2.4}
                            dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="net" name="خالص" stroke={CLR.net} strokeWidth={2.4}
                            dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="paid" name="پرداختی" stroke={CLR.paid} strokeWidth={2.4}
                            dot={false} activeDot={{ r: 4, strokeWidth: 0 }} strokeDasharray="5 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : <EmptyState icon={ReceiptLongIcon} text="صورت‌وضعیتی برای تحلیل ثبت نشده است." />}
                  <Typography sx={{ mt: 0.75, fontSize: 10.5, color: MUTED }}>
                    جمع پرداخت‌ها {money(totalPaidAll, currencyLabel)} · از این مبلغ {money(totals.paid, currencyLabel)} به صورت‌وضعیت‌ها متصل است.
                  </Typography>
                </AnalysisCard>
              </Grid>

              {/* ۳) تخصیص مالی بین پروژه‌ها */}
              <Grid item xs={12} lg={6}>
                <AnalysisCard icon={PieChartIcon} title="تحلیل تخصیص مالی بین پروژه‌ها"
                  color={CLR.rate}>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ height: 190 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={allocationRows} dataKey="amount" nameKey="name" innerRadius={44} outerRadius={70}
                              paddingAngle={3} startAngle={90} endAngle={450} stroke="#fff" strokeWidth={2} cornerRadius={4}>
                              {allocationRows.map((row, index) => (
                                <Cell key={row.name} fill={['#2563eb', '#7c3aed', '#0f766e', '#b45309', '#be123c', '#0891b2'][index % 6]} />
                              ))}
                            </Pie>
                            <ReTooltip {...chartTooltipProps} formatter={chartMoney} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={0.9} useFlexGap>
                        {allocationRows.map((row, index) => (
                          <Box key={row.name}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} useFlexGap>
                              <Stack direction="row" spacing={0.5} useFlexGap alignItems="center" sx={{ minWidth: 0 }}>
                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, bgcolor: ['#2563eb', '#7c3aed', '#0f766e', '#b45309', '#be123c', '#0891b2'][index % 6] }} />
                                <Typography noWrap title={row.name} sx={{ fontSize: 11, color: INK, fontWeight: 700 }}>{row.name}</Typography>
                              </Stack>
                              <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: CLR.rate }}>{faPercent(row.percent)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" spacing={1} useFlexGap alignItems="center">
                              <Box sx={{ flex: 1, minWidth: 0 }}><ProgressBar value={row.percent} color="#7c3aed" height={5} /></Box>
                              <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>{formatPersianNumber(row.amount)}</Typography>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                </AnalysisCard>
              </Grid>


              {/* ۴) پیش‌پرداخت و کسورات */}
              <Grid item xs={12} lg={6}>
                <AnalysisCard icon={LockIcon} title="تحلیل پیش‌پرداخت و کسورات"
                  color={CLR.ded}
                  action={<Chip size="small" label={`جمع کسورات ${formatPersianNumber(Math.round(totals.deductionsTotal))}`}
                    sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(CLR.ded, 0.1), color: CLR.ded }} />}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 1.25 }}>
                    {[
                      ['پیش‌پرداخت قرارداد', formatPersianNumber(Math.round(prepaymentTotal)), CLR.contract],
                      ['تسویه‌شده (کسورات)', formatPersianNumber(Math.round(prepaymentAmortized)), CLR.ok],
                      ['مانده پیش‌پرداخت', formatPersianNumber(Math.round(prepaymentRemaining)), CLR.warn],
                    ].map(([label, value, color]) => (
                      <StatBox key={label} label={label} value={value} color={color} dense />
                    ))}
                  </Box>
                  <Box sx={{ height: 226 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deductionBuckets} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barCategoryGap="26%">
                        <CartesianGrid {...chartGrid} />
                        <XAxis {...chartXAxisProps} dataKey="short" interval={0} height={40} />
                        <YAxis {...chartYAxisProps} />
                        <ReTooltip {...chartTooltipProps} formatter={chartMoney} />
                        <Bar dataKey="value" name="مبلغ کسورات" radius={[6, 6, 0, 0]} maxBarSize={30}>
                          {deductionBuckets.map((row, index) => (
                            <Cell key={row.key} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Typography sx={{ mt: 0.5, fontSize: 10.5, color: MUTED }}>
                    پیش‌پرداخت تسویه‌شده: {faPercent(ratio(prepaymentAmortized, prepaymentTotal || 1))}
                    {' · '}
                    جمع مالیات بر ارزش افزوده: {money(totals.vat, currencyLabel)}
                  </Typography>
                </AnalysisCard>
              </Grid>


              {/* ۵) ضمانت‌نامه‌ها و ریسک مالی */}
              <Grid item xs={12} lg={6}>
                <AnalysisCard icon={LockIcon} title="تحلیل ضمانت‌نامه‌ها و ریسک مالی"
                  color={CLR.risk}
                  action={<Chip size="small"
                    label={guaranteeCoverage >= 100 ? 'ریسک پایین' : guaranteeCoverage >= 60 ? 'ریسک متوسط' : 'ریسک بالا'}
                    sx={{
                      height: 20, fontSize: 10.5, fontWeight: 800,
                      bgcolor: alpha(guaranteeCoverage >= 100 ? CLR.ok : guaranteeCoverage >= 60 ? CLR.warn : CLR.risk, 0.1),
                      color: guaranteeCoverage >= 100 ? CLR.ok : guaranteeCoverage >= 60 ? CLR.warn : CLR.risk,
                    }} />}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 1.25 }}>
                    {[
                      ['تعهدات تضامین', formatPersianNumber(Math.round(guaranteeRequiredTotal)), CLR.contract],
                      ['تضامین ثبت‌شده', formatPersianNumber(Math.round(guaranteeProvidedTotal)), CLR.ok],
                      ['کسری پوشش', formatPersianNumber(Math.round(Math.max(0, guaranteeRequiredTotal - guaranteeProvidedTotal))), CLR.risk],
                    ].map(([label, value, color]) => (
                      <StatBox key={label} label={label} value={value} color={color} dense />
                    ))}
                  </Box>
                  <Box sx={{ height: 210 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={guaranteeChart} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barCategoryGap="28%">
                        <CartesianGrid {...chartGrid} />
                        <XAxis {...chartXAxisProps} dataKey="name" interval={0} height={44} />
                        <YAxis {...chartYAxisProps} />
                        <ReTooltip {...chartTooltipProps} formatter={chartMoney} />
                        <Legend {...chartLegendProps} />
                        <Bar dataKey="required" name="تعهد" fill={CLR.contract} radius={[6, 6, 0, 0]} maxBarSize={24} />
                        <Bar dataKey="provided" name="ثبت‌شده" fill={CLR.ok} radius={[6, 6, 0, 0]} maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1} useFlexGap sx={{ mt: 0.75 }}>
                    <Typography sx={{ fontSize: 10.5, color: MUTED }}>پوشش تضامین</Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}><ProgressBar value={guaranteeCoverage} color={CLR.ok} height={6} /></Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: CLR.ok }}>{faPercent(guaranteeCoverage)}</Typography>
                  </Stack>
                </AnalysisCard>
              </Grid>


              {/* ۶) انحراف مبلغ و پیش‌بینی هزینه */}
              <Grid item xs={12} lg={6}>
                <AnalysisCard icon={TrendingUpIcon} title="تحلیل انحراف مبلغ قرارداد و پیش‌بینی هزینه نهایی"
                  color={CLR.contract}
                  action={<Chip size="small"
                    label={`انحراف ${faPercent(Math.abs(forecastDeviation))} ${forecastDeviation >= 0 ? 'بیش‌برآورد' : 'کم‌برآورد'}`}
                    sx={{
                      height: 20, fontSize: 10.5, fontWeight: 800,
                      bgcolor: alpha(forecastDeviation > 5 ? CLR.risk : CLR.ok, 0.1),
                      color: forecastDeviation > 5 ? CLR.risk : CLR.ok,
                    }} />}>
                  <Box sx={{ height: 206 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deviationRows} margin={{ top: 8, right: 12, left: 4, bottom: 4 }} barCategoryGap="30%">
                        <CartesianGrid {...chartGrid} />
                        <XAxis {...chartXAxisProps} dataKey="name" interval={0} height={44} />
                        <YAxis {...chartYAxisProps} />
                        <ReTooltip {...chartTooltipProps} formatter={chartMoney} />
                        <Bar dataKey="value" name="مبلغ (ریال)" radius={[6, 6, 0, 0]} maxBarSize={32}>
                          {deviationRows.map((row, index) => (
                            <Cell
                              key={row.name}
                              fill={[CLR.contract, CLR.rate, CLR.work, forecastDeviation > 5 ? CLR.risk : CLR.net][index]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mt: 1 }}>
                    {[
                      ['مدت قرارداد', `${toPersianDigits(totalDays)} روز`],
                      ['سپری‌شده', `${toPersianDigits(elapsedDays)} روز`],
                      ['آهنگ کارکرد روزانه', formatPersianNumber(Math.round(burnPerDay))],
                    ].map(([label, value]) => (
                      <StatBox key={label} label={label} value={value} color={CLR.contract} dense />
                    ))}
                  </Box>
                </AnalysisCard>
              </Grid>


              {/* ۷) جریان نقدی قرارداد */}
              <Grid item xs={12} lg={7}>
                <AnalysisCard icon={TimelineIcon} title="تحلیل جریان نقدی قرارداد"
                  color={CLR.paid}>
                  {timeline.length ? (
                    <Box sx={{ height: 262 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeline} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
                          <defs>
                            <linearGradient id="cashWork" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={CLR.work} stopOpacity={0.28} />
                              <stop offset="100%" stopColor={CLR.work} stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="cashPaid" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={CLR.paid} stopOpacity={0.28} />
                              <stop offset="100%" stopColor={CLR.paid} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid {...chartGrid} />
                          <XAxis {...chartXAxisProps} dataKey="label" />
                          <YAxis {...chartYAxisProps} />
                          <ReTooltip
                            {...chartTooltipProps}
                            formatter={chartMoney}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label}
                          />
                          <Legend {...chartLegendProps} />
                          <Area type="monotone" dataKey="cumWork" name="کارکرد تجمعی" stroke={CLR.work} strokeWidth={2.4}
                            fill="url(#cashWork)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                          <Area type="monotone" dataKey="cumNet" name="خالص تجمعی" stroke={CLR.net} strokeWidth={2}
                            fillOpacity={0} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                          <Area type="monotone" dataKey="cumPaid" name="پرداخت تجمعی" stroke={CLR.paid} strokeWidth={2.4}
                            fill="url(#cashPaid)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : <EmptyState icon={TimelineIcon} text="دادهٔ جریان نقدی موجود نیست." />}
                </AnalysisCard>
              </Grid>

              {/* پرداخت‌های ماهانه */}
              <Grid item xs={12} lg={5}>
                <AnalysisCard icon={PaymentsIcon} title="پرداخت‌های ماهانه"
                  color={CLR.paid}
                  action={<Chip size="small" label={money(totalPaidAll, currencyLabel)}
                    sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(CLR.paid, 0.1), color: CLR.paid }} />}>
                  {monthlyPayments.length ? (
                    <Box sx={{ height: 262 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyPayments} margin={{ top: 10, right: 12, left: 4, bottom: 4 }} barCategoryGap="24%">
                          <CartesianGrid {...chartGrid} />
                          <XAxis {...chartXAxisProps} dataKey="month" />
                          <YAxis {...chartYAxisProps} />
                          <ReTooltip {...chartTooltipProps} formatter={chartMoney} />
                          <Bar dataKey="amount" name="پرداخت" radius={[6, 6, 0, 0]} maxBarSize={26}>
                            {monthlyPayments.map((row) => (
                              <Cell key={row.month} fill={CLR.paid} fillOpacity={0.9} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : <EmptyState icon={PaymentsIcon} text="پرداختی ثبت نشده است." />}
                </AnalysisCard>
              </Grid>


              {/* ۸) مغایرت‌ها و کنترل‌های مالی */}
              <Grid item xs={12}>
                <AnalysisCard icon={ErrorOutlineIcon} title="تحلیل مغایرت‌ها و کنترل‌های مالی"
                  color={warningCount ? CLR.warn : CLR.ok}
                  action={<Chip size="small"
                    label={warningCount ? `${toPersianDigits(warningCount)} هشدار` : 'بدون مغایرت'}
                    sx={{
                      height: 20, fontSize: 10.5, fontWeight: 800,
                      bgcolor: alpha(warningCount ? CLR.warn : CLR.ok, 0.1),
                      color: warningCount ? CLR.warn : CLR.ok,
                    }} />}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }, gap: 1 }}>
                    {checks.map((item) => {
                      const color = item.status === 'ok' ? CLR.ok : item.status === 'warn' ? CLR.warn : CLR.risk;
                      const Icon = item.status === 'ok' ? CheckCircleIcon : item.status === 'warn' ? WarningAmberIcon : ErrorOutlineIcon;
                      return (
                        <Box key={item.key} sx={{
                          p: 1, borderRadius: '10px',
                          border: `1px solid ${alpha(color, 0.2)}`,
                          bgcolor: alpha(color, 0.04),
                          display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0,
                        }}>
                          <Icon sx={{ fontSize: 16, color, flexShrink: 0, mt: 0.15 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>{item.label}</Typography>
                            <Typography sx={{ fontSize: 10.5, color: MUTED, mt: 0.2 }}>{item.detail}</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </AnalysisCard>
              </Grid>
            </Grid>

            {/* ---- اسناد مالی قرارداد ---- */}
            <Paper elevation={0} sx={{
              mt: 2,
              borderRadius: 'var(--hrms-table-radius, 16px)',
              border: '1px solid', borderColor: cardBorderColor,
              bgcolor: 'background.paper', boxShadow: 'none',
              p: 1.5,
            }}>
              <Stack direction="row" alignItems="center" spacing={1} useFlexGap sx={{ mb: 1 }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '9px', flexShrink: 0,
                  bgcolor: alpha(CLR.rate, 0.08), color: CLR.rate,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ReceiptLongIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK, flex: 1 }}>اسناد مالی قرارداد</Typography>
                <Chip size="small"
                  label={`${toPersianDigits(invoices.length + payments.length + addendums.length + guarantees.length)} سند`}
                  sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(CLR.rate, 0.1), color: CLR.rate }} />
              </Stack>
              <Tabs value={docsTab} onChange={(_event, value) => setDocsTab(value)} variant="scrollable" allowScrollButtonsMobile
                sx={{
                  minHeight: 34, borderBottom: '1px solid', borderColor: 'divider', mb: 1.25,
                  '& .MuiTab-root': { minHeight: 34, minWidth: 104, fontSize: 11.5, fontWeight: 700, textTransform: 'none' },
                  '& .Mui-selected': { color: CLR.rate },
                  '& .MuiTabs-indicator': { bgcolor: CLR.rate, height: 2.5 },
                }}>
                <Tab label={`فاکتورها (${toPersianDigits(invoices.length)})`} />
                <Tab label={`پرداخت‌ها (${toPersianDigits(payments.length)})`} />
                <Tab label={`الحاقیه‌ها (${toPersianDigits(addendums.length)})`} />
                <Tab label={`تضامین (${toPersianDigits(guarantees.length)})`} />
              </Tabs>
              {docsTab === 0 ? <InvoicesTable invoices={invoices} currency={currencyLabel} /> : null}
              {docsTab === 1 ? <PaymentsTable payments={payments} currency={currencyLabel} /> : null}
              {docsTab === 2 ? <AddendumsTable addendums={addendums} currency={currencyLabel} /> : null}
              {docsTab === 3 ? <GuaranteesTable guarantees={guarantees} currency={currencyLabel} /> : null}
            </Paper>
          </>
        )
      ) : null}
    </Box>
  );
};

export default ContractFinancePage;
