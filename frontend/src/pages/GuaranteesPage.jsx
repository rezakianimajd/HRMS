import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, FormControl, FormHelperText,
  Grid, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select,
  Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import GavelIcon from '@mui/icons-material/Gavel';
import LastPageIcon from '@mui/icons-material/LastPage';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import PaymentsIcon from '@mui/icons-material/Payments';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import UndoIcon from '@mui/icons-material/Undo';
import UpdateIcon from '@mui/icons-material/Update';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import ContractListPicker from '../core/components/ui/ContractListPicker';
import MoneyInput from '../core/components/ui/MoneyInput';
import PageHeader from '../core/components/ui/PageHeader';
import DataTable from '../core/components/ui/DataTable';
import { GUARANTEE_TYPES, GUARANTEE_TYPE_LABELS as TYPE_LABELS } from '../core/constants/guaranteeTypes';
import { INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import { AttachmentLinks, AttachmentPicker } from './contracts/AddendumWorkspaceUI';
import { useDesignTokens } from '../core/context/DesignTokenContext';
import { resolveTableTheme, tableTypographySx } from '../core/theme/tableStyles';
import { resolveToolbarTheme } from '../core/theme/toolbarStyles';
import { CONTRACT_STATUS_LABELS } from '../core/theme/tokens';

const EMPTY = {
  id: null, contract: '', contract_guarantee_index: null,
  guarantee_type: 'performance', instrument_type: 'check',
  number: '', amount: '', issue_date: '', expiry_date: '', bank: '',
  check_number: '', check_bank: '', check_due_date: '',
  promissory_number: '', promissory_due_date: '',
  guarantee_number: '', guarantee_expiry_date: '', note: '',
  pendingFiles: [], documents: [],
};

const INSTRUMENT_META = {
  check: { label: 'چک', color: '#b45309', icon: ReceiptLongIcon },
  promissory: { label: 'سفته', color: '#7c3aed', icon: NoteAltIcon },
  bank_guarantee: { label: 'ضمانت‌نامه بانکی', color: '#0f766e', icon: AccountBalanceIcon },
  check_and_guarantee: { label: 'چک + ضمانت‌نامه', color: '#2563eb', icon: AccountBalanceWalletIcon },
  promissory_and_guarantee: { label: 'سفته + ضمانت‌نامه', color: '#be185d', icon: AccountBalanceWalletIcon },
};

const STATUS_META = {
  active: { label: 'معتبر', color: '#0f766e', bg: '#ecfdf5' },
  expiring: { label: 'نزدیک انقضا', color: '#b45309', bg: '#fffbeb' },
  expired: { label: 'منقضی', color: '#be123c', bg: '#fff1f2' },
  returned: { label: 'استرداد شده', color: '#475569', bg: '#f1f5f9' },
  executed: { label: 'اجرا / ضبط شده', color: '#be123c', bg: '#fff1f2' },
  canceled: { label: 'ابطال شده', color: '#7c3aed', bg: '#f5f3ff' },
};

const ACTION_META = {
  returned: { label: 'استرداد', color: '#0f766e', icon: UndoIcon },
  executed: { label: 'اجرا / ضبط', color: '#be123c', icon: GavelIcon },
  canceled: { label: 'ابطال', color: '#b45309', icon: BlockIcon },
  extended: { label: 'تمدید', color: '#2563eb', icon: UpdateIcon },
};

const dateLabel = (value) => (value ? toJalali(value) : '—');
const money = (value, currency = 'ریال') => `${formatPersianNumber(Number(value) || 0)} ${currency}`;
const dueOf = (row) => row.guarantee_expiry_date || row.check_due_date || row.promissory_due_date || row.expiry_date;
const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target - new Date()) / 86400000);
};

const statusOf = (row) => {
  if (row.last_action === 'returned' || (!row.last_action && row.is_released)) {
    return { key: 'returned', ...STATUS_META.returned };
  }
  if (row.last_action === 'executed') return { key: 'executed', ...STATUS_META.executed };
  if (row.last_action === 'canceled') return { key: 'canceled', ...STATUS_META.canceled };
  const days = daysUntil(dueOf(row));
  if (days !== null && days < 0) return { key: 'expired', ...STATUS_META.expired };
  if (days !== null && days <= 30) return { key: 'expiring', ...STATUS_META.expiring };
  return { key: 'active', ...STATUS_META.active };
};

const canAct = (row) => !row.is_released && !['returned', 'executed', 'canceled'].includes(row.last_action);
const numberFor = (row) => row.number || row.check_number || row.promissory_number || row.guarantee_number || '—';

/* جدول استاندارد تضامین — همان چیدمان و توکن‌های صفحهٔ بایگانی اسناد */
const GuaranteeArchiveTable = ({
  rows, rowOffset = 0, tableTheme, containerRef, tableHeight, rowHeight, dimmed,
  currencyFor, onView, onEdit, onDelete, onAction,
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
      aria-label="فهرست تضامین قراردادها"
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
          textAlign: `${tableTheme.headerTextAlign} !important`,
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
        ...tableTypographySx(tableTheme),
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell align="center" sx={{ width: '4%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>ردیف</Box>
          </TableCell>
          <TableCell align="center" sx={{ width: '13%' }}>شماره تضمین</TableCell>
          <TableCell align="center" sx={{ width: '15%' }}>نوع تضمین</TableCell>
          <TableCell align="center" sx={{ width: '12%' }}>ابزار</TableCell>
          <TableCell align="center" sx={{ width: '11%' }}>بانک</TableCell>
          <TableCell align="center" sx={{ width: '14%' }}>مبلغ</TableCell>
          <TableCell align="center" sx={{ width: '11%' }}>سررسید</TableCell>
          <TableCell align="center" sx={{ width: '10%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>وضعیت</Box>
          </TableCell>
          <TableCell align="center" sx={{ width: '10%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>عملیات</Box>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => {
          const instrument = INSTRUMENT_META[row.instrument_type]
            || { label: row.instrument_type_display || '—', color: '#475569', icon: ReceiptLongIcon };
          const InstrumentIcon = instrument.icon;
          const status = statusOf(row);
          const due = dueOf(row);
          const remaining = daysUntil(due);
          return (
            <TableRow key={row.id} hover onClick={() => onView(row)} sx={{ cursor: 'pointer' }}>
              <TableCell align="center">
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                    {toPersianDigits(rowOffset + index + 1)}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right">
                <Typography noWrap title={numberFor(row)} sx={{ fontSize: 12, fontWeight: 800 }}>
                  {toPersianDigits(numberFor(row))}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography noWrap title={row.contract_guarantee_label || row.guarantee_type_display}
                  sx={{ fontSize: 11.5, fontWeight: 700 }}>
                  {row.contract_guarantee_label || row.guarantee_type_display || '—'}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                  <InstrumentIcon sx={{ fontSize: 15, color: instrument.color, flexShrink: 0 }} />
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700 }}>{instrument.label}</Typography>
                </Box>
              </TableCell>
              <TableCell align="right">
                <Typography noWrap title={row.bank || row.check_bank} sx={{ fontSize: 11.5 }}>
                  {row.bank || row.check_bank || '—'}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {money(row.amount, currencyFor(row))}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography noWrap sx={{
                  fontSize: 11.5,
                  fontFamily: 'var(--hrms-table-number-font, inherit)',
                  color: remaining !== null && remaining < 0 ? '#be123c' : remaining !== null && remaining <= 30 ? '#b45309' : 'inherit',
                }}>
                  {dateLabel(due)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Chip
                    size="small"
                    label={status.label}
                    sx={{
                      height: 20, fontSize: 10.5, fontWeight: 800,
                      bgcolor: status.bg, color: status.color,
                      border: `1px solid ${alpha(status.color, 0.28)}`,
                      '& .MuiChip-label': { px: 0.8 },
                    }}
                  />
                </Box>
              </TableCell>
              <TableCell align="center">
                <Stack direction="row" spacing={0.15} useFlexGap alignItems="center" justifyContent="center"
                  onClick={(event) => event.stopPropagation()}>
                  <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                  <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)}><EditIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                  <LifecycleActions row={row} compact onAction={({ action }) => onAction(row, action)} />
                  <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(row)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>

    </Table>
  </TableContainer>
);

/* جدول قراردادها در صفحهٔ اول تضامین — همان الگوی جدول قراردادهای بایگانی اسناد */
const GuaranteeContractTable = ({
  rows, tableTheme, containerRef, tableHeight, rowHeight, dimmed,
  guaranteeCounts, guaranteeAmounts, currencyFor, onOpen,
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
      aria-label="فهرست قراردادهای تضامین"
      sx={{
        width: '100%',
        minWidth: 720,
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
          textAlign: `${tableTheme.headerTextAlign} !important`,
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
          <TableCell align="center" sx={{ width: '14%' }}>شماره قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '24%' }}>طرف قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '32%' }}>موضوع قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '14%' }} className="hrms-cell-center">تعداد تضمین</TableCell>
          <TableCell align="center" sx={{ width: '16%' }} className="hrms-cell-center">مبلغ تضمین</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((contract) => (
          <TableRow key={contract.id} hover onClick={() => onOpen(contract)} sx={{ cursor: 'pointer' }}>
            <TableCell align="center">
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {toPersianDigits(contract.number || '—')}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography noWrap title={contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                {contract.party_name || '—'}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography noWrap title={contract.subject} sx={{ fontSize: 12, fontWeight: 800 }}>
                {contract.subject || '—'}
              </Typography>
            </TableCell>
            <TableCell align="center" className="hrms-cell-center">
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {formatPersianNumber(guaranteeCounts[String(contract.id)] || 0)}
                </Typography>
              </Box>
            </TableCell>
            <TableCell align="center" className="hrms-cell-center">
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {money(guaranteeAmounts[String(contract.id)] || 0, currencyFor(contract))}
                </Typography>
              </Box>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

/* ---------- اجزای استاندارد (همان الگوی صفحهٔ بایگانی اسناد) ---------- */

const GUARANTEE_SORT_OPTIONS = [
  { value: 'due', label: 'نزدیک‌ترین سررسید' },
  { value: 'newest', label: 'جدیدترین' },
  { value: 'amount', label: 'بیشترین مبلغ' },
];
const GUARANTEE_CONTRACT_SORT_OPTIONS = [
  { value: 'guaranteeCount', label: 'بیشترین تضمین' },
  { value: 'amount', label: 'بیشترین مبلغ' },
  { value: 'number', label: 'شماره قرارداد' },
];

const SortArrow = ({ className, ...rest }) => (
  <ExpandMoreIcon
    {...rest}
    sx={{
      position: 'absolute', left: 8, top: 'calc(50% - 10px)',
      fontSize: 20, color: 'text.secondary', pointerEvents: 'none',
    }}
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

const GuaranteePager = ({ tableTheme, page, onPage, totalPages, pageNumbers, total, pageSize, unit = 'تضمین' }) => {
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
            {toPersianDigits(Math.min((page + 1) * pageSize, total))} از{' '}
            {toPersianDigits(total)} {unit}
            {' · '}
            {toPersianDigits(tableTheme.visibleRows)} ردیف در نما
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

const InfoLine = ({ label, value, strong, ltr }) => {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ py: 0.38 }}>
      <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{
        fontSize: strong ? 10.6 : 9.8, fontWeight: strong ? 900 : 700, color: INK,
        textAlign: 'left', direction: ltr ? 'ltr' : 'rtl', minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={typeof display === 'string' ? display : undefined}>
        {display}
      </Typography>
    </Stack>
  );
};

const SectionHeading = ({ icon: Icon, title, color = '#2563eb', action }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.8 }}>
    {Icon ? (
      <Box sx={{
        width: 27, height: 27, borderRadius: '8px', color, bgcolor: alpha(color, 0.08),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 15 }} />
      </Box>
    ) : null}
    <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 900, color: INK }}>{title}</Typography>
    {action || null}
  </Stack>
);

const StatusChip = ({ row }) => {
  const status = statusOf(row);
  return (
    <Chip size="small" label={status.label}
      sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
  );
};

const InstrumentPill = ({ row }) => {
  const meta = instrumentMeta(row);
  const Icon = meta.icon;
  return (
    <Chip size="small" icon={<Icon sx={{ fontSize: 12 }} />} label={meta.label}
      sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: alpha(meta.color, 0.07), color: meta.color }} />
  );
};

const LifecycleActions = ({ row, onAction, compact = false }) => {
  if (!canAct(row)) return null;
  const actions = row.instrument_type === 'check' || row.instrument_type === 'promissory'
    ? ['returned', 'executed']
    : row.instrument_type === 'bank_guarantee'
      ? ['canceled', 'extended', 'executed']
      : ['returned', 'executed', 'canceled', 'extended'];
  return (
    <Stack direction="row" spacing={0.15}>
      {actions.map((action) => {
        const meta = ACTION_META[action];
        const Icon = meta.icon;
        return (
          <Tooltip key={action} title={meta.label}>
            <IconButton size="small" onClick={() => onAction({ row, action })}
              sx={{ color: meta.color, p: compact ? 0.35 : 0.5 }}>
              <Icon sx={{ fontSize: compact ? 15 : 17 }} />
            </IconButton>
          </Tooltip>
        );
      })}
    </Stack>
  );
};

const instrumentMeta = (row) => INSTRUMENT_META[row.instrument_type] || {
  label: row.instrument_type_display || 'تضمین', color: '#64748b', icon: LockIcon,
};

const uploadGuaranteeFiles = async (guaranteeId, contractId, files = []) => {
  await Promise.all(files.map((file) => {
    const body = new FormData();
    body.append('contract', contractId);
    body.append('guarantee', guaranteeId);
    body.append('title', (file.name.replace(/\.pdf$/i, '') || 'PDF تضمین').slice(0, 200));
    body.append('file', file);
    return axiosInstance.post('/contract-documents/', body);
  }));
};


const GuaranteeDetailDrawer = ({ row, onClose, onEdit, onDelete, onAction, currency, accent }) => {
  const theme = useTheme();
  if (!row) return null;
  const meta = instrumentMeta(row);
  const Icon = meta.icon;
  const status = statusOf(row);
  const days = daysUntil(dueOf(row));
  return (
    <Drawer anchor="left" open={Boolean(row)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 430 }, bgcolor: SOFT_BG } }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 1.75, bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
              bgcolor: alpha(meta.color, 0.08), color: meta.color,
              border: `1px solid ${alpha(meta.color, 0.16)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon sx={{ fontSize: 21 }} /></Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{numberFor(row)}</Typography>
              <Typography sx={{ fontSize: 12, color: MUTED }}>{row.guarantee_type_display || TYPE_LABELS[row.guarantee_type] || '—'}</Typography>
            </Box>
            <StatusChip row={row} />
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <InstrumentPill row={row} />
            {row.contract_guarantee_label ? <Chip size="small" label={row.contract_guarantee_label} sx={{ height: 21, fontSize: 12, bgcolor: alpha(accent, 0.06), color: accent }} /> : null}
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1.5}>
            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={PaymentsIcon} title="مشخصات مالی" color={meta.color} />
              <InfoLine label="مبلغ تضمین" value={money(row.amount, currency)} strong ltr />
              <InfoLine label="بانک صادرکننده" value={row.bank} />
              <InfoLine label="قرارداد" value={row.contract_subject} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={ScheduleIcon} title="زمان‌بندی" color={status.color} />
              <InfoLine label="تاریخ صدور" value={dateLabel(row.issue_date)} />
              <InfoLine label="تاریخ انقضا / سررسید" value={dateLabel(dueOf(row))} strong />
              {days !== null ? (
                <InfoLine label="مانده تا انقضا"
                  value={days < 0 ? `${toPersianDigits(Math.abs(days))} روز گذشته` : days === 0 ? 'امروز' : `${toPersianDigits(days)} روز`} />
              ) : null}
              <InfoLine label="آخرین اقدام" value={row.last_action_display || '—'} />
              <InfoLine label="تاریخ آخرین اقدام" value={dateLabel(row.last_action_date)} />
              {row.is_released ? <InfoLine label="تاریخ آزادسازی" value={dateLabel(row.release_date)} /> : null}
            </Paper>

  );
};

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={DescriptionIcon} title="شناسه‌های ابزار" color="#64748b" />
              <InfoLine label="شماره اصلی" value={numberFor(row)} strong />
              {row.check_number ? <InfoLine label="شماره چک" value={row.check_number} /> : null}
              {row.check_bank ? <InfoLine label="بانک چک" value={row.check_bank} /> : null}
              {row.promissory_number ? <InfoLine label="شماره سفته" value={row.promissory_number} /> : null}
              {row.guarantee_number ? <InfoLine label="شماره ضمانت‌نامه" value={row.guarantee_number} /> : null}
              {row.guarantee_expiry_date ? <InfoLine label="انقضای ضمانت‌نامه" value={dateLabel(row.guarantee_expiry_date)} /> : null}
            </Paper>

            {row.note ? (
              <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeading icon={NoteAltIcon} title="یادداشت" color="#7c3aed" />
                <Typography sx={{ fontSize: 12, color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{row.note}</Typography>
              </Paper>
            ) : null}

            {(row.documents || []).length ? (
              <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeading icon={PictureAsPdfIcon} title="پیوست‌های PDF" color="#be123c" />
                <AttachmentLinks documents={row.documents} />
              </Paper>
            ) : null}

            {canAct(row) ? (
              <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeading icon={LockOpenIcon} title="اقدامات چرخهٔ عمر" color="#2563eb" />
                <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap">
                  {Object.entries(ACTION_META).map(([key, action]) => {
                    const ActionIcon = action.icon;
                    const allowed = row.instrument_type === 'check' || row.instrument_type === 'promissory'
                      ? ['returned', 'executed'].includes(key)
                      : row.instrument_type === 'bank_guarantee'
                        ? ['canceled', 'extended', 'executed'].includes(key)
                        : true;
                    if (!allowed) return null;
                    return (
                      <Button key={key} size="small" variant="outlined" startIcon={<ActionIcon />}
                        onClick={() => onAction({ row, action: key })}
                        sx={{ fontSize: 12, borderColor: alpha(action.color, 0.35), color: action.color }}>
                        {action.label}
                      </Button>
                    );
                  })}
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        </Box>

        <Divider />
        <Stack direction="row" spacing={1} sx={{ p: 1.25, bgcolor: theme.palette.background.paper }}>
          <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(row)}>ویرایش</Button>
          <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(row)}>حذف</Button>
        </Stack>
      </Stack>
    </Drawer>
  );
};



const GuaranteeEditorDialog = ({
  open, onClose, form, setForm, contractList, contractGuaranteeItems,
  guaranteeItemLabel, applyGuaranteeLink, needsInstrument, needsPromissory,
  needsGuarantee, onSave, saving, error, setError, accent, currencyLabel,
  onAddFiles, onRemovePending,
}) => {
  const theme = useTheme();
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', boxShadow: 'none' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.2, px: 2.25, py: 1.6,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
        <Box sx={{
          width: 37, height: 37, borderRadius: '11px', flexShrink: 0,
          bgcolor: alpha(accent, 0.08), color: accent, border: `1px solid ${alpha(accent, 0.16)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <LockIcon sx={{ fontSize: 19 }} />
        </Box>
        <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 900, color: INK }}>
          {form.id ? 'ویرایش تضمین' : 'ثبت تضمین جدید'}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.25 }}>
        <Stack spacing={2}>
          <Box>
            <SectionHeading icon={DescriptionIcon} title="قرارداد و نوع تضمین" color={accent} />
            <Grid container spacing={1.25}>
              <Grid item xs={12} md={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>قرارداد مرتبط *</InputLabel>
                  <Select value={form.contract || ''} label="قرارداد مرتبط *"
                    onChange={(event) => setForm((previous) => ({
                      ...previous, contract: event.target.value, contract_guarantee_index: null,
                    }))}>
                    {contractList.map((contract) => (
                      <MenuItem key={contract.id} value={String(contract.id)}>{contract.subject || contract.number}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl size="small" fullWidth disabled={!contractGuaranteeItems.length}>
                  <InputLabel>ضمانت قرارداد</InputLabel>
                  <Select value={form.contract_guarantee_index ?? ''} label="ضمانت قرارداد"
                    onChange={(event) => applyGuaranteeLink(event.target.value)}>
                    <MenuItem value="">بدون اتصال</MenuItem>
                    {contractGuaranteeItems.map((item, index) => (
                      <MenuItem key={index} value={index}>{guaranteeItemLabel(item, index)}</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText sx={{ mx: 0 }}>
                    {contractGuaranteeItems.length ? 'اتصال به قلم تضمین قرارداد' : 'قلمی تعریف نشده است'}
                  </FormHelperText>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>نوع تضمین</InputLabel>
                  <Select value={form.guarantee_type} label="نوع تضمین" onChange={(event) => update('guarantee_type', event.target.value)}>
                    {GUARANTEE_TYPES.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography sx={{ fontSize: 12, color: MUTED, mb: 0.6 }}>نوع ابزار تضمین</Typography>
                <Box sx={{ display: 'flex', gap: 0.65, flexWrap: 'wrap' }}>
                  {Object.entries(INSTRUMENT_META).map(([key, meta]) => {
                    const active = form.instrument_type === key;
                    const Icon = meta.icon;
                    return (
                      <Chip key={key} icon={<Icon sx={{ fontSize: 13 }} />} label={meta.label}
                        onClick={() => update('instrument_type', key)}
                        sx={{
                          cursor: 'pointer', borderRadius: '9px', fontWeight: 800, fontSize: 12,
                          bgcolor: active ? meta.color : alpha(meta.color, 0.07),
                          color: active ? '#fff' : meta.color,
                          border: `1px solid ${active ? meta.color : alpha(meta.color, 0.25)}`,
                          '& .MuiChip-icon': { color: active ? '#fff' : meta.color },
                        }} />
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Divider />
          <Box>
            <SectionHeading icon={PaymentsIcon} title="مشخصات مالی و زمانی" color="#2563eb" />
            <Grid container spacing={1.25}>
              <Grid item xs={12} md={4}><MoneyInput size="small" fullWidth label={`مبلغ (${currencyLabel})`} value={form.amount} onChange={(value) => update('amount', value)} /></Grid>
              <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ صدور" value={form.issue_date} onChange={(value) => update('issue_date', value)} /></Grid>
              <Grid item xs={12} md={4}><TextField size="small" fullWidth label="بانک صادرکننده" value={form.bank} onChange={(event) => update('bank', event.target.value)} /></Grid>
              <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره / مرجع" value={form.number} onChange={(event) => update('number', event.target.value)} /></Grid>
              <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ انقضا / سررسید" value={form.expiry_date} onChange={(value) => update('expiry_date', value)} /></Grid>
            </Grid>
          </Box>

          {needsInstrument(form.instrument_type) ? (
            <>
              <Divider />
              <Box>
                <SectionHeading icon={ReceiptLongIcon} title="اطلاعات چک" color="#b45309" />
                <Grid container spacing={1.25}>
                  <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره چک" value={form.check_number} onChange={(event) => update('check_number', event.target.value)} /></Grid>
                  <Grid item xs={12} md={4}><TextField size="small" fullWidth label="بانک چک" value={form.check_bank} onChange={(event) => update('check_bank', event.target.value)} /></Grid>
                  <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ سررسید چک" value={form.check_due_date} onChange={(value) => update('check_due_date', value)} /></Grid>
                </Grid>
              </Box>
            </>
          ) : null}

          {needsPromissory(form.instrument_type) ? (
            <>
              <Divider />
              <Box>
                <SectionHeading icon={NoteAltIcon} title="اطلاعات سفته" color="#7c3aed" />
                <Grid container spacing={1.25}>
                  <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره سفته" value={form.promissory_number} onChange={(event) => update('promissory_number', event.target.value)} /></Grid>
                  <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ سررسید سفته" value={form.promissory_due_date} onChange={(value) => update('promissory_due_date', value)} /></Grid>
                </Grid>
              </Box>
            </>
          ) : null}

          {needsGuarantee(form.instrument_type) ? (
            <>
              <Divider />
              <Box>
                <SectionHeading icon={AccountBalanceIcon} title="اطلاعات ضمانت‌نامه" color="#0f766e" />
                <Grid container spacing={1.25}>
                  <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره ضمانت‌نامه" value={form.guarantee_number} onChange={(event) => update('guarantee_number', event.target.value)} /></Grid>
                  <Grid item xs={12} md={6}><JalaliDatePicker fullWidth label="تاریخ انقضای ضمانت‌نامه" value={form.guarantee_expiry_date} onChange={(value) => update('guarantee_expiry_date', value)} /></Grid>
                </Grid>
              </Box>
            </>
          ) : null}

          <Divider />
          <Box>
            <SectionHeading icon={PictureAsPdfIcon} title="پیوست PDF تضمین" color="#be123c" />
            <AttachmentPicker
              documents={form.documents || []}
              pendingFiles={form.pendingFiles || []}
              onAdd={onAddFiles}
              onRemovePending={onRemovePending}
              accent={accent}
              buttonLabel="افزودن PDF تضمین"
              emptyText="فایل PDF تضمین را اینجا پیوست کنید."
              documentLabel="تضمین"
            />
          </Box>

          <Divider />
          <TextField size="small" fullWidth multiline rows={2} label="یادداشت" value={form.note}
            onChange={(event) => update('note', event.target.value)} />

          {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.25, py: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" disabled={saving || !form.contract || !form.guarantee_type} onClick={onSave}>
          {saving ? <CircularProgress size={18} color="inherit" /> : 'ذخیره تضمین'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const GuaranteesPage = () => {
  const qc = useQueryClient();
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [instrumentFilter, setInstrumentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due');
  const [contractSort, setContractSort] = useState('guaranteeCount');
  const [contractStatusFilter, setContractStatusFilter] = useState('');
  const [onlyWithGuarantees, setOnlyWithGuarantees] = useState(false);
  const [page, setPage] = useState(0);
  const [contractPage, setContractPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [actionDialog, setActionDialog] = useState(null);
  const [newExpiry, setNewExpiry] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const { data: raw, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contract-guarantees'],
    queryFn: () => axiosInstance.get('/contract-guarantees/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const list = Array.isArray(raw) ? raw : raw?.results || [];

  const { data: contracts } = useQuery({
    queryKey: ['external-contracts-all'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];
  const selectedContract = contractList.find((c) => String(c.id) === String(contractId)) || null;
  const formContract = contractList.find((c) => String(c.id) === String(form.contract)) || null;
  const currencyLabel = normalizeCurrencyLabel(
    (formContract || selectedContract)?.currency_name
    || (formContract || selectedContract)?.currency_symbol
    || 'ریال',
  );

  const { data: guaranteeStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['contract-guarantees-status', contractId],
    queryFn: () => axiosInstance.get(`/external-contracts/${contractId}/guarantees-status/`).then((r) => r.data),
    enabled: Boolean(contractId),
  });

  const { data: contractDetail } = useQuery({
    queryKey: ['contract-detail-guarantee', form.contract],
    queryFn: () => axiosInstance.get(`/external-contracts/${form.contract}/`).then((r) => r.data),
    enabled: dialog && Boolean(form.contract),
  });
  const contractGuaranteeItems = Array.isArray(contractDetail?.guarantee_items)
    ? contractDetail.guarantee_items
    : (Array.isArray(formContract?.guarantee_items) ? formContract.guarantee_items : []);

  useEffect(() => {
    setContractId(urlContract);
  }, [urlContract]);

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setInstrumentFilter('all');
    setSortBy('due');
    setDetail(null);
  }, [contractId]);

  const selectContract = (contract) => {
    const next = String(contract.id);
    setContractId(next);
    setSearchParams({ contract: next });
  };
  const clearContract = () => {
    setContractId('');
    setSearchParams({});
  };

  const scopedList = useMemo(() => (
    contractId ? list.filter((row) => String(row.contract) === String(contractId)) : list
  ), [list, contractId]);

  const statusCounts = useMemo(() => {
    const counts = { all: scopedList.length };
    scopedList.forEach((row) => {
      const key = statusOf(row).key;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [scopedList]);

  /* ---- توکن‌های استودیو تم (پیش از هر محاسبهٔ جدول) ---- */
  const { tokens } = useDesignTokens();
  const tableTheme = resolveTableTheme(tokens);
  const toolbar = resolveToolbarTheme(tokens);
  const cardPadX = Math.max(12, Number(tableTheme.frameX) || 0);
  const cardPadY = Math.max(12, Number(tableTheme.frameY) || 0);
  const cardBorderColor = alpha(theme.palette.text.primary, 0.14);

  /* ---- دادهٔ صفحهٔ اول: فهرست قراردادها با شمار و مبلغ تضامین ---- */
  const guaranteeCountByContract = useMemo(() => list.reduce((counts, row) => {
    const key = String(row.contract);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}), [list]);
  const guaranteeAmountByContract = useMemo(() => list.reduce((totals, row) => {
    const key = String(row.contract);
    totals[key] = (totals[key] || 0) + Number(row.amount || 0);
    return totals;
  }, {}), [list]);
  const nextDueByContract = useMemo(() => list.reduce((latest, row) => {
    const key = String(row.contract);
    const due = String(dueOf(row) || '');
    if (!due) return latest;
    if (!latest[key] || due < latest[key]) latest[key] = due;
    return latest;
  }, {}), [list]);
  const expiringRows = useMemo(() => (
    [...list]
      .filter((row) => statusOf(row).key === 'expiring')
      .sort((a, b) => (daysUntil(dueOf(a)) ?? 9999) - (daysUntil(dueOf(b)) ?? 9999))
      .slice(0, 8)
  ), [list]);
  /* فهرست قراردادها فوراً از خود تضامین ساخته می‌شود تا جدول منتظر پاسخ
   * سنگین /external-contracts/ نماند و سپس با اطلاعات کامل ادغام می‌شود. */
  const contractDirectory = useMemo(() => {
    const map = new Map();
    list.forEach((row) => {
      const key = String(row.contract ?? '');
      if (!key || key === 'null' || map.has(key)) return;
      map.set(key, {
        id: row.contract,
        number: row.contract_number || '',
        subject: row.contract_subject || '',
        party_name: row.contract_party_name || '',
        status: '',
      });
    });
    contractList.forEach((contract) => {
      const key = String(contract.id);
      const row = map.get(key);
      map.set(key, row ? { ...row, ...contract } : contract);
    });
    return Array.from(map.values());
  }, [list, contractList]);
  const contractRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = contractDirectory.filter((contract) => {
      if (onlyWithGuarantees && !guaranteeCountByContract[String(contract.id)]) return false;
      if (contractStatusFilter && contract.status !== contractStatusFilter) return false;
      if (!term) return true;
      return [contract.number, contract.subject, contract.party_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
    return [...rows].sort((a, b) => {
      if (contractSort === 'amount') {
        return (guaranteeAmountByContract[String(b.id)] || 0) - (guaranteeAmountByContract[String(a.id)] || 0);
      }
      if (contractSort === 'number') {
        return String(a.number || '').localeCompare(String(b.number || ''), 'fa');
      }
      return (guaranteeCountByContract[String(b.id)] || 0) - (guaranteeCountByContract[String(a.id)] || 0);
    });
  }, [
    contractDirectory, search, onlyWithGuarantees, contractStatusFilter, contractSort,
    guaranteeCountByContract, guaranteeAmountByContract,
  ]);
  const contractPageSize = tableTheme.rowsPerPage;
  const contractTotalPages = Math.max(1, Math.ceil(contractRows.length / contractPageSize));
  useEffect(() => {
    setContractPage(0);
  }, [search, onlyWithGuarantees, contractStatusFilter, contractSort, contractPageSize]);
  useEffect(() => {
    if (contractPage > contractTotalPages - 1) setContractPage(Math.max(0, contractTotalPages - 1));
  }, [contractPage, contractTotalPages]);
  const pagedContracts = useMemo(
    () => contractRows.slice(contractPage * contractPageSize, (contractPage + 1) * contractPageSize),
    [contractRows, contractPage, contractPageSize],
  );
  const contractPageNumbers = (() => {
    const size = 5;
    const start = Math.max(0, Math.min(contractPage - 2, contractTotalPages - size));
    const end = Math.min(contractTotalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
  })();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = scopedList.filter((row) => {
      if (statusFilter !== 'all' && statusOf(row).key !== statusFilter) return false;
      if (instrumentFilter !== 'all' && row.instrument_type !== instrumentFilter) return false;
      if (!q) return true;
      return [
        row.number, row.bank, row.contract_subject, row.check_number,
        row.promissory_number, row.guarantee_number, row.contract_guarantee_label,
      ].some((value) => String(value || '').toLowerCase().includes(q));
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'amount') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === 'newest') return String(b.issue_date || '').localeCompare(String(a.issue_date || ''));
      const aDays = daysUntil(dueOf(a));
      const bDays = daysUntil(dueOf(b));
      return (aDays ?? 999999) - (bDays ?? 999999);
    });
    return result;
  }, [scopedList, search, statusFilter, instrumentFilter, sortBy]);

  /* ---- توکن‌های استودیو تم + صفحه‌بندی + اندازه‌گیری ارتفاع ردیف‌ها ---- */
  const pageSize = tableTheme.rowsPerPage;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, instrumentFilter, sortBy, contractId, pageSize]);
  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);
  const pagedRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );
  const pageNumbers = (() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
  })();

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
  useLayoutEffect(measureRows, [pagedRows.length, pagedContracts.length, tableTheme.rowHeight, tableTheme.headerHeight]);
  useEffect(() => {
    const onResize = () => measureRows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const effectiveRowPx = measuredRowPx > 0 ? measuredRowPx : tableTheme.rowHeight;
  const effectiveHeadPx = measuredHeadPx > 0 ? measuredHeadPx : tableTheme.headerHeight;
  const tableHeight = Math.round(effectiveHeadPx + effectiveRowPx * tableTheme.visibleRows);

  /* ---- فیلترها، چیپ‌ها و گزینه‌ها: صفحهٔ ورود روی قراردادها، نمای قرارداد روی تضامین ---- */
  const scopedMode = Boolean(contractId);
  const sortOptions = scopedMode ? GUARANTEE_SORT_OPTIONS : GUARANTEE_CONTRACT_SORT_OPTIONS;
  const sortValue = scopedMode ? sortBy : contractSort;
  const setSortValue = scopedMode ? setSortBy : setContractSort;
  const contractOptions = useMemo(() => [
    { value: '', label: 'همهٔ قراردادها' },
    ...contractList.map((contract) => ({
      value: String(contract.id),
      label: `${toPersianDigits(contract.number || '—')} — ${contract.subject || ''}`,
    })),
  ], [contractList]);
  const instrumentOptions = [
    { value: 'all', label: 'همه' },
    ...Object.entries(INSTRUMENT_META).map(([key, meta]) => ({ value: key, label: meta.label })),
  ];
  const statusOptions = [
    { value: 'all', label: 'همه' },
    ...Object.entries(STATUS_META).map(([key, meta]) => ({
      value: key,
      label: `${meta.label} (${toPersianDigits(statusCounts[key] || 0)})`,
    })),
  ];
  const contractStatusOptions = [
    { value: '', label: 'همه' },
    ...Object.entries(CONTRACT_STATUS_LABELS).map(([key, label]) => ({ value: key, label })),
  ];
  const guaranteesToggleOptions = [
    { value: 'all', label: 'همهٔ قراردادها' },
    { value: 'withGuarantees', label: 'فقط دارای تضمین' },
  ];
  const activeFilterCount = scopedMode
    ? (contractId ? 1 : 0) + (instrumentFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)
    : (contractStatusFilter ? 1 : 0) + (onlyWithGuarantees ? 1 : 0);
  const activeChips = (scopedMode
    ? [
      contractId
        ? {
          key: 'contract',
          label: `قرارداد: ${toPersianDigits(selectedContract?.number || contractId)}`,
          clear: clearContract,
        }
        : null,
      instrumentFilter !== 'all'
        ? {
          key: 'instrument',
          label: `نوع: ${INSTRUMENT_META[instrumentFilter]?.label || instrumentFilter}`,
          clear: () => setInstrumentFilter('all'),
        }
        : null,
      statusFilter !== 'all'
        ? {
          key: 'status',
          label: `وضعیت: ${STATUS_META[statusFilter]?.label || statusFilter}`,
          clear: () => setStatusFilter('all'),
        }
        : null,
    ]
    : [
      contractStatusFilter
        ? {
          key: 'contractStatus',
          label: `وضعیت قرارداد: ${CONTRACT_STATUS_LABELS[contractStatusFilter] || contractStatusFilter}`,
          clear: () => setContractStatusFilter(''),
        }
        : null,
      onlyWithGuarantees
        ? {
          key: 'withGuarantees',
          label: 'فقط قراردادهای دارای تضمین',
          clear: () => setOnlyWithGuarantees(false),
        }
        : null,
    ]).filter(Boolean);
  const activeChipSx = toolbar.chipStyle === 'outlined'
    ? { bgcolor: 'transparent', border: `1px solid ${toolbar.chipBorder}`, color: toolbar.primary, fontWeight: 700 }
    : { bgcolor: toolbar.chipBg, color: toolbar.primary, fontWeight: 700, border: `1px solid ${toolbar.chipBorder}` };
  const filtersExpanded = filtersOpen;
  const resetFilters = () => {
    setSearch('');
    if (scopedMode) {
      setStatusFilter('all');
      setInstrumentFilter('all');
      setSortBy('due');
    } else {
      setContractStatusFilter('');
      setOnlyWithGuarantees(false);
      setContractSort('guaranteeCount');
    }
  };
  const refreshAll = () => {
    refetch();
    if (contractId) qc.invalidateQueries({ queryKey: ['contract-guarantees-status', contractId] });
  };
  const openLifecycle = (row, action) => {
    setActionDialog({ id: row.id, action, instrument: row.instrument_type });
    setNewExpiry('');
  };
  const currencyByContract = useMemo(() => {
    const map = new Map();
    contractList.forEach((contract) => {
      map.set(
        String(contract.id),
        normalizeCurrencyLabel(contract.currency_name || contract.currency_symbol || 'ریال'),
      );
    });
    return map;
  }, [contractList]);
  const contractNumberById = useMemo(() => {
    const map = new Map();
    contractList.forEach((contract) => map.set(String(contract.id), contract.number || ''));
    return map;
  }, [contractList]);

  const warnings = guaranteeStatus?.warnings || [];



  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['contract-guarantees'] });
    qc.invalidateQueries({ queryKey: ['external-contracts'] });
    qc.invalidateQueries({ queryKey: ['contract-guarantees-status'] });
    qc.invalidateQueries({ queryKey: ['contract-detail-guarantee'] });
  };

  const sanitizeGuarantee = (payload) => ({
    contract: payload.contract || null,
    contract_guarantee_index: payload.contract_guarantee_index === '' || payload.contract_guarantee_index == null
      ? null : Number(payload.contract_guarantee_index),
    guarantee_type: payload.guarantee_type || 'performance',
    instrument_type: payload.instrument_type || 'check',
    number: payload.number || '',
    amount: payload.amount === '' || payload.amount == null ? 0 : Number(payload.amount),
    issue_date: payload.issue_date || null,
    expiry_date: payload.expiry_date || null,
    bank: payload.bank || '',
    check_number: payload.check_number || '',
    check_bank: payload.check_bank || '',
    check_due_date: payload.check_due_date || null,
    promissory_number: payload.promissory_number || '',
    promissory_due_date: payload.promissory_due_date || null,
    guarantee_number: payload.guarantee_number || '',
    guarantee_expiry_date: payload.guarantee_expiry_date || null,
    note: payload.note || '',
  });

  const save = useMutation({
    mutationFn: async (payload) => {
      const clean = sanitizeGuarantee(payload);
      const response = payload.id
        ? await axiosInstance.patch(`/contract-guarantees/${payload.id}/`, clean)
        : await axiosInstance.post('/contract-guarantees/', clean);
      const guaranteeId = response.data?.id || payload.id;
      let uploadError = '';
      if (payload.pendingFiles?.length) {
        try {
          await uploadGuaranteeFiles(guaranteeId, clean.contract, payload.pendingFiles);
        } catch (event) {
          const detail = event.response?.data;
          uploadError = typeof detail === 'string'
            ? detail
            : (detail?.file?.[0] || detail?.detail || 'بارگذاری پیوست PDF انجام نشد');
        }
      }
      return { response, uploadError };
    },
    onSuccess: ({ uploadError }) => {
      invalidateAll();
      setDialog(false);
      setForm(EMPTY);
      setError('');
      setToast(uploadError
        ? `تضمین ذخیره شد اما پیوست بارگذاری نشد: ${uploadError}`
        : 'تضمین و پیوست‌های PDF ذخیره شدند');
    },
    onError: (event) => {
      const data = event.response?.data;
      const first = typeof data === 'string'
        ? data
        : Array.isArray(data)
          ? data[0]
          : data && Object.values(data).flat()[0];
      setError(typeof first === 'string' ? first : 'ذخیرهٔ تضمین انجام نشد.');
    },
  });

  const applyLifecycle = useMutation({
    mutationFn: ({ id, action, new_expiry_date }) =>
      axiosInstance.post(`/contract-guarantees/${id}/lifecycle/`, { action, new_expiry_date }),
    onSuccess: () => {
      invalidateAll();
      setActionDialog(null);
      setNewExpiry('');
      setDetail(null);
      setToast('وضعیت تضمین به‌روزرسانی شد');
    },
    onError: () => setToast('به‌روزرسانی وضعیت انجام نشد'),
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-guarantees/${id}/`),
    onSuccess: () => {
      invalidateAll();
      setConfirmDelete(null);
      setDetail(null);
      setToast('تضمین حذف شد');
    },
    onError: () => setToast('حذف تضمین انجام نشد'),
  });

  const openNew = () => {
    setDetail(null);
    setForm({
      ...EMPTY,
      contract: contractId || '',
      contract_guarantee_index: null,
      pendingFiles: [],
      documents: [],
    });
    setError('');
    setDialog(true);
  };
  const openEdit = (row) => {
    setDetail(null);
    setForm({
      ...EMPTY,
      ...row,
      contract: String(row.contract || ''),
      contract_guarantee_index: row.contract_guarantee_index ?? null,
      pendingFiles: [],
      documents: row.documents || [],
    });
    setError('');
    setDialog(true);
  };
  const closeEditor = () => {
    setDialog(false);
    setForm(EMPTY);
    setError('');
  };

  const addGuaranteeFiles = (files) => {
    const accepted = [];
    let rejection = '';
    (files || []).forEach((file) => {
      const isPdf = file.name?.toLowerCase().endsWith('.pdf')
        && (!file.type || ['application/pdf', 'application/x-pdf'].includes(file.type));
      if (!isPdf) {
        rejection = 'فقط فایل PDF برای پیوست تضمین مجاز است.';
        return;
      }
      if (Number(file.size) > 25 * 1024 * 1024) {
        rejection = 'حجم هر پیوست PDF نباید بیشتر از ۲۵ مگابایت باشد.';
        return;
      }
      accepted.push(file);
    });
    if (accepted.length) {
      setForm((previous) => ({
        ...previous,
        pendingFiles: [...(previous.pendingFiles || []), ...accepted],
      }));
    }
    setError(rejection);
  };

  const removePendingFile = (index) => setForm((previous) => ({
    ...previous,
    pendingFiles: (previous.pendingFiles || []).filter((_, fileIndex) => fileIndex !== index),
  }));

  const guaranteeItemLabel = (item = {}, index = null) => {
    const type = TYPE_LABELS[item.type] || item.type || 'ضمانت';
    const amount = item.amount
      ? `${formatPersianNumber(item.amount)} ریال`
      : item.percent ? `${toPersianDigits(item.percent)}٪ از قرارداد` : '';
    const rowLabel = index != null ? `ردیف ${toPersianDigits(index + 1)}` : '';
    return [rowLabel, type, amount, item.note].filter(Boolean).join(' — ');
  };

  const applyGuaranteeLink = (value) => {
    if (value === '') {
      setForm((previous) => ({ ...previous, contract_guarantee_index: null }));
      return;
    }
    const index = Number(value);
    const item = contractGuaranteeItems[index] || {};
    const contractAmount = Number(contractDetail?.amount || formContract?.amount || 0);
    const amount = item.amount || (item.percent && contractAmount
      ? Math.round((contractAmount * Number(item.percent)) / 100) : null);
    setForm((previous) => ({
      ...previous,
      contract_guarantee_index: index,
      guarantee_type: item.type || previous.guarantee_type,
      ...(amount ? { amount } : {}),
    }));
  };

  const submit = () => {
    if (!form.contract) {
      setError('قرارداد مرتبط را انتخاب کنید.');
      return;
    }
    if (!form.guarantee_type) {
      setError('نوع تضمین را انتخاب کنید.');
      return;
    }
    setError('');
    save.mutate(form);
  };

  const needsInstrument = (type) => type === 'check' || type === 'check_and_guarantee';
  const needsPromissory = (type) => type === 'promissory' || type === 'promissory_and_guarantee';
  const needsGuarantee = (type) => type === 'bank_guarantee' || type === 'check_and_guarantee' || type === 'promissory_and_guarantee';

  const exportCsv = () => {
    const headers = ['شماره قرارداد', 'موضوع قرارداد', 'نوع تضمین', 'ابزار', 'شماره', 'مبلغ', 'بانک', 'تاریخ صدور', 'سررسید', 'وضعیت', 'ضمانت قرارداد'];
    const rows = filtered.map((row) => [
      contractNumberById.get(String(row.contract)) || row.contract_number || '',
      row.contract_subject || '',
      row.guarantee_type_display || TYPE_LABELS[row.guarantee_type] || '',
      instrumentMeta(row).label,
      numberFor(row),
      Number(row.amount || 0),
      row.bank || '',
      row.issue_date || '',
      dueOf(row) || '',
      statusOf(row).label,
      row.contract_guarantee_label || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `guarantees-${contractId || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const accent = '#b45309';

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<LockIcon />}
        title="تضامین و ضمانت‌نامه‌ها"
        badge={(
          <Chip size="small" label={`${formatPersianNumber(list.length)} تضمین`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" onClick={refreshAll} disabled={isFetching} sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            {contractId ? (
              <Button variant="outlined" startIcon={<DescriptionIcon />}
                onClick={() => navigate(`/external-contracts/${contractId}`)}>پرونده قرارداد</Button>
            ) : null}
            {contractId ? (
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>چاپ</Button>
            ) : null}
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>تضمین جدید</Button>
          </>
        )}
      />

      {/* نوار استاندارد جستجو، ترتیب و فیلترها — همان الگوی صفحهٔ بایگانی اسناد */}
      <Paper sx={{ p: 1.25, mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            size="small"
            placeholder={scopedMode ? 'جستجو در شماره، بانک، قرارداد…' : 'جستجو در شماره، موضوع و طرف قرارداد…'}
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
            value={sortValue}
            onChange={(event) => setSortValue(event.target.value)}
            sx={{
              flex: '0 0 auto',
              minWidth: { xs: '100%', sm: 168 },
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
            onClick={() => setFiltersOpen(!filtersExpanded)}
            startIcon={toolbar.filtersIconPosition === 'start' ? <FilterListIcon fontSize="small" /> : null}
            endIcon={toolbar.filtersIconPosition === 'end' ? <FilterListIcon fontSize="small" /> : null}
            aria-expanded={filtersExpanded}
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
              <Chip
                size="small"
                label={toPersianDigits(activeFilterCount)}
                sx={{
                  ml: 0.75, height: 18, fontSize: 11, fontWeight: 800,
                  bgcolor: toolbar.filtersVariant === 'contained' ? 'rgba(255,255,255,0.24)' : toolbar.chipBg,
                  color: toolbar.filtersVariant === 'contained' ? '#fff' : toolbar.primary,
                }}
              />
            ) : null}
          </Button>
          {toolbar.showReset && (activeFilterCount > 0 || search) ? (
            <Button
              size="small" variant="text"
              onClick={() => { resetFilters(); if (scopedMode) clearContract(); }}
              sx={{
                height: `${toolbar.searchHeight}px`,
                minHeight: `${toolbar.searchHeight}px`,
                alignSelf: 'center', py: 0,
                fontSize: 12.5, whiteSpace: 'nowrap',
              }}
            >
              {toolbar.resetLabel}
            </Button>
          ) : null}
        </Stack>

        <Collapse in={filtersExpanded} timeout={180} unmountOnExit>
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
              {scopedMode ? (
                <>
                  <FilterSelect
                    label="قرارداد" value={contractId} options={contractOptions}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={(value) => {
                      if (value) {
                        selectContract({ id: value });
                      } else {
                        clearContract();
                      }
                    }}
                  />
                  <FilterSelect
                    label="نوع ابزار" value={instrumentFilter} options={instrumentOptions}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={setInstrumentFilter}
                  />
                  <FilterSelect
                    label="وضعیت" value={statusFilter} options={statusOptions}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={setStatusFilter}
                  />
                </>
              ) : (
                <>
                  <FilterSelect
                    label="وضعیت قرارداد" value={contractStatusFilter} options={contractStatusOptions}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={setContractStatusFilter}
                  />
                  <FilterSelect
                    label="نمایش" value={onlyWithGuarantees ? 'withGuarantees' : 'all'} options={guaranteesToggleOptions}
                    labelsPosition={toolbar.labelsPosition} radius={toolbar.filtersRadius}
                    onChange={(value) => setOnlyWithGuarantees(value === 'withGuarantees')}
                  />
                </>
              )}
              {toolbar.showReset ? (
                <Button
                  variant="text" size="small" onClick={() => { resetFilters(); if (scopedMode) clearContract(); }}
                  sx={{ fontSize: 12.5, justifySelf: 'start', height: `${toolbar.searchHeight - 6}px` }}
                >
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

      {scopedMode ? (
        <>
          {warnings.length ? (
            <Stack spacing={0.75} useFlexGap sx={{ mb: 1.25 }}>
              {warnings.slice(0, 3).map((warning) => (
                <Alert key={warning} severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: '11px', py: 0.2 }}>
                  <Typography sx={{ fontSize: 12 }}>{warning}</Typography>
                </Alert>
              ))}
            </Stack>
          ) : null}

          {!filtered.length ? (
            <Paper elevation={0} sx={{
              p: 5, borderRadius: '16px', border: '1px dashed', borderColor: 'divider',
              textAlign: 'center', bgcolor: 'background.paper',
            }}>
              <LockIcon sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>تضمینی با این مشخصات پیدا نشد.</Typography>
              <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.3 }}>فیلترها را تغییر دهید یا تضمین جدید ثبت کنید.</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ mt: 1.5 }}>ثبت تضمین جدید</Button>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{
              borderRadius: 'var(--hrms-table-radius, 16px)',
              overflow: 'hidden',
              px: `${cardPadX}px`, py: `${cardPadY}px`,
              border: '1px solid', borderColor: cardBorderColor,
              bgcolor: 'background.paper', boxShadow: 'none',
            }}>
              <GuaranteeArchiveTable
                rows={pagedRows}
                rowOffset={page * pageSize}
                tableTheme={tableTheme}
                containerRef={tableScrollRef}
                tableHeight={tableHeight}
                rowHeight={effectiveRowPx}
                dimmed={isFetching || statusLoading}
                currencyFor={(row) => currencyByContract.get(String(row.contract)) || currencyLabel}
                onView={setDetail}
                onEdit={openEdit}
                onDelete={setConfirmDelete}
                onAction={openLifecycle}
              />
              <GuaranteePager
                tableTheme={tableTheme}
                page={page}
                onPage={setPage}
                totalPages={totalPages}
                pageNumbers={pageNumbers}
                total={filtered.length}
                pageSize={pageSize}
              />
            </Paper>
          )}
        </>
      ) : (
        <Grid container spacing={2} alignItems="stretch">
          {/* جدول قراردادها — کارت استاندارد با فاصلهٔ داخلی */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{
              borderRadius: 'var(--hrms-table-radius, 16px)',
              border: '1px solid', borderColor: cardBorderColor,
              bgcolor: 'background.paper', boxShadow: 'none',
              overflow: 'hidden',
              px: `${cardPadX}px`, py: `${cardPadY}px`,
            }}>
              {!contractRows.length ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <LockIcon sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>قراردادی با این مشخصات پیدا نشد.</Typography>
                  <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.3 }}>عبارت جستجو یا فیلترها را تغییر دهید.</Typography>
                </Box>
              ) : (
                <>
                  <GuaranteeContractTable
                    rows={pagedContracts}
                    tableTheme={tableTheme}
                    containerRef={tableScrollRef}
                    tableHeight={tableHeight}
                    rowHeight={effectiveRowPx}
                    dimmed={isFetching}
                    guaranteeCounts={guaranteeCountByContract}
                    guaranteeAmounts={guaranteeAmountByContract}
                    currencyFor={(contract) => currencyByContract.get(String(contract.id)) || 'ریال'}
                    onOpen={selectContract}
                  />
                  <GuaranteePager
                    tableTheme={tableTheme}
                    page={contractPage}
                    onPage={setContractPage}
                    totalPages={contractTotalPages}
                    pageNumbers={contractPageNumbers}
                    total={contractRows.length}
                    pageSize={contractPageSize}
                    unit="قرارداد"
                  />
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      <GuaranteeDetailDrawer row={detail} onClose={() => setDetail(null)}
        onEdit={openEdit} onDelete={setConfirmDelete}
        onAction={({ row, action }) => { setActionDialog({ id: row.id, action, instrument: row.instrument_type }); setNewExpiry(''); }}
        currency={currencyLabel} accent={accent} />

      <GuaranteeEditorDialog
        open={dialog} onClose={closeEditor} form={form} setForm={setForm}
        contractList={contractList} contractGuaranteeItems={contractGuaranteeItems}
        guaranteeItemLabel={guaranteeItemLabel} applyGuaranteeLink={applyGuaranteeLink}
        needsInstrument={needsInstrument} needsPromissory={needsPromissory} needsGuarantee={needsGuarantee}
        onSave={submit} saving={save.isLoading} error={error} setError={setError} accent={accent}
        currencyLabel={currencyLabel} onAddFiles={addGuaranteeFiles} onRemovePending={removePendingFile}
      />

      <Dialog open={Boolean(actionDialog)} onClose={() => { setActionDialog(null); setNewExpiry(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>
          {ACTION_META[actionDialog?.action]?.label || 'اقدام'}
        </DialogTitle>
        <DialogContent>
          {actionDialog?.action === 'extended' ? (
            <JalaliDatePicker fullWidth label="تاریخ انقضای جدید" value={newExpiry} onChange={setNewExpiry} />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActionDialog(null); setNewExpiry(''); }}>انصراف</Button>
          <Button variant="contained" disabled={applyLifecycle.isLoading}
            color={actionDialog?.action === 'executed' ? 'error' : actionDialog?.action === 'canceled' ? 'warning' : 'primary'}
            onClick={() => applyLifecycle.mutate({ id: actionDialog.id, action: actionDialog.action, new_expiry_date: newExpiry || null })}>
            {applyLifecycle.isLoading ? <CircularProgress size={18} color="inherit" /> : 'تأیید'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف تضمین</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            تضمین {confirmDelete ? numberFor(confirmDelete) : 'انتخاب‌شده'} حذف شود؟
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={remove.isLoading} onClick={() => remove.mutate(confirmDelete.id)}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3200} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default GuaranteesPage;