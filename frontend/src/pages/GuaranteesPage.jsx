import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, FormControl, FormHelperText,
  Grid, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select,
  Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import EventBusyIcon from '@mui/icons-material/EventBusy';
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
import TableRowsIcon from '@mui/icons-material/TableRows';
import UndoIcon from '@mui/icons-material/Undo';
import UpdateIcon from '@mui/icons-material/Update';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
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
import { KpiTile, ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import { AttachmentLinks, AttachmentPicker } from './contracts/AddendumWorkspaceUI';
import { useDesignTokens } from '../core/context/DesignTokenContext';
import { resolveTableTheme, tableTypographySx } from '../core/theme/tableStyles';
import { resolveToolbarTheme } from '../core/theme/toolbarStyles';

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
  currencyFor, contractNumberFor, onView, onEdit, onDelete, onAction,
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
          <TableCell align="center" sx={{ width: '5%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>ردیف</Box>
          </TableCell>
          <TableCell align="center" sx={{ width: '17%' }}>شماره / نوع</TableCell>
          <TableCell align="center" sx={{ width: '13%' }}>ابزار</TableCell>
          <TableCell align="center" sx={{ width: '13%' }}>بانک</TableCell>
          <TableCell align="center" sx={{ width: '19%' }}>قرارداد</TableCell>
          <TableCell align="center" sx={{ width: '13%' }}>مبلغ</TableCell>
          <TableCell align="center" sx={{ width: '10%' }}>سررسید</TableCell>
          <TableCell align="center" sx={{ width: '10%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>وضعیت</Box>
          </TableCell>
          <TableCell align="center" sx={{ width: '12%' }}>
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
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>
                  {toPersianDigits(numberFor(row))}
                </Typography>
                <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
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
                <Typography noWrap sx={{ fontSize: 11.5 }}>{row.bank || row.check_bank || '—'}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700 }}>
                  {toPersianDigits(row.contract_number || contractNumberFor(row) || row.contract || '—')}
                </Typography>
                <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{row.contract_subject || '—'}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {money(row.amount, currencyFor(row))}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {dateLabel(due)}
                </Typography>
                {remaining !== null ? (
                  <Typography noWrap sx={{ fontSize: 10.5, color: remaining < 0 ? '#be123c' : remaining <= 30 ? '#b45309' : MUTED }}>
                    {remaining < 0
                      ? `${toPersianDigits(Math.abs(remaining))} روز گذشته`
                      : `${toPersianDigits(remaining)} روز مانده`}
                  </Typography>
                ) : null}
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

/* ---------- اجزای استاندارد (همان الگوی صفحهٔ بایگانی اسناد) ---------- */
const GUARANTEE_SORT_OPTIONS = [
  { value: 'due', label: 'نزدیک‌ترین سررسید' },
  { value: 'newest', label: 'جدیدترین' },
  { value: 'amount', label: 'بیشترین مبلغ' },
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

const GuaranteePager = ({ tableTheme, page, onPage, totalPages, pageNumbers, total, pageSize }) => {
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
            {toPersianDigits(total)} تضمین
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


const GuaranteeCard = ({ row, currency, accent, onView, onEdit, onDelete, onAction }) => {
  const theme = useTheme();
  const meta = instrumentMeta(row);
  const Icon = meta.icon;
  const status = statusOf(row);
  const due = dueOf(row);
  const days = daysUntil(due);
  const documents = row.documents || [];
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: 1.5, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', gap: 1,
      borderTop: `3px solid ${meta.color}`,
      transition: 'box-shadow .18s ease, border-color .18s ease',
      '&:hover': { borderColor: alpha(meta.color, 0.35), boxShadow: `0 10px 24px ${alpha(meta.color, 0.06)}` },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
          bgcolor: alpha(meta.color, 0.08), color: meta.color,
          border: `1px solid ${alpha(meta.color, 0.16)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 12, fontWeight: 900, color: INK }}>
            {numberFor(row)}
          </Typography>
          <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>
            {row.guarantee_type_display || TYPE_LABELS[row.guarantee_type] || '—'}
          </Typography>
        </Box>
        <StatusChip row={row} />
      </Stack>

      <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap">
        <InstrumentPill row={row} />
        {row.contract_guarantee_label ? (
          <Chip size="small" label={row.contract_guarantee_label}
            sx={{ height: 21, fontSize: 12, maxWidth: 190, bgcolor: alpha(accent, 0.06), color: accent }} />
        ) : null}
        {documents.length ? (
          <Chip component="a" href={documents[0].file_url || documents[0].file}
            target="_blank" rel="noreferrer" clickable size="small"
            icon={<PictureAsPdfIcon sx={{ fontSize: 12 }} />}
            label={`${formatPersianNumber(documents.length)} پیوست`}
            sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: alpha('#be123c', 0.06), color: '#be123c' }} />
        ) : null}
      </Stack>

      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography sx={{ fontSize: 12, color: MUTED }}>مبلغ تضمین</Typography>
          <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: INK, direction: 'rtl' }}>
            {money(row.amount, currency)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography sx={{ fontSize: 12, color: MUTED }}>سررسید / انقضا</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: days !== null && days < 0 ? '#be123c' : INK }}>
            {dateLabel(due)}
          </Typography>
        </Box>
      </Stack>

      {days !== null && status.key !== 'returned' && status.key !== 'canceled' ? (
        <Box sx={{ p: 0.75, borderRadius: '9px', bgcolor: alpha(status.color, 0.045), border: `1px solid ${alpha(status.color, 0.12)}` }}>
          <Stack direction="row" alignItems="center" spacing={0.6}>
            <ScheduleIcon sx={{ fontSize: 13, color: status.color }} />
            <Typography sx={{ fontSize: 12, color: status.color, fontWeight: 800 }}>
              {days < 0 ? `${toPersianDigits(Math.abs(days))} روز از انقضا گذشته` : days === 0 ? 'امروز منقضی می‌شود' : `${toPersianDigits(days)} روز تا انقضا`}
            </Typography>
          </Stack>
        </Box>
      ) : null}

      <Box sx={{ flex: 1 }} />
      <Divider />
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{row.bank || 'بدون بانک'}</Typography>
          <Typography sx={{ fontSize: 12, color: MUTED }}>صدور: {dateLabel(row.issue_date)}</Typography>
        </Box>
        <Stack direction="row" spacing={0.1} alignItems="center">
          <LifecycleActions row={row} onAction={onAction} compact />
          <Tooltip title="جزئیات">
            <IconButton size="small" aria-label="جزئیات تضمین" onClick={() => onView(row)}><VisibilityIcon sx={{ fontSize: 17 }} /></IconButton>
          </Tooltip>
          <Tooltip title="ویرایش">
            <IconButton size="small" onClick={() => onEdit(row)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
          </Tooltip>
          <Tooltip title="حذف">
            <IconButton size="small" color="error" onClick={() => onDelete(row)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
};


const GuaranteeTable = ({ rows, currency, onView, onEdit, onDelete, onAction }) => (
  <DataTable
    rows={rows}
    getRowId={(row) => row.id}
    maxHeight="calc(100vh - 330px)"
    stickyHeader
    ariaLabel="فهرست ضمانت‌ها"
    tableSx={{ '& td, & th': { px: 1.25, py: 0.85 } }}
    columns={[
      {
        key: 'instrument',
        label: 'ابزار / نوع',
        render: (row) => {
          const meta = instrumentMeta(row);
          const Icon = meta.icon;
          return (
            <Stack direction="row" alignItems="center" spacing={0.6}>
              <Box sx={{
                width: 25, height: 25, borderRadius: '7px', color: meta.color,
                bgcolor: alpha(meta.color, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon sx={{ fontSize: 14 }} /></Box>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{meta.label}</Typography>
                <Typography sx={{ fontSize: 12, color: MUTED }}>{row.guarantee_type_display || TYPE_LABELS[row.guarantee_type] || '—'}</Typography>
              </Box>
            </Stack>
          );
        },
      },
      {
        key: 'number',
        label: 'شماره',
        cellSx: { fontSize: 12, fontWeight: 800 },
        render: (row) => numberFor(row),
      },
      {
        key: 'amount',
        label: 'مبلغ',
        cellSx: { fontSize: 12, direction: 'ltr', textAlign: 'right' },
        render: (row) => money(row.amount, currency),
      },
      {
        key: 'contract',
        label: 'ضمانت قرارداد',
        cellSx: { maxWidth: 210 },
        render: (row) => (
          <Typography noWrap title={row.contract_guarantee_label || ''} sx={{ fontSize: 12, color: MUTED }}>
            {row.contract_guarantee_label || '—'}
          </Typography>
        ),
      },
      {
        key: 'due',
        label: 'سررسید',
        render: (row) => (
          <>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{dateLabel(dueOf(row))}</Typography>
            <Typography sx={{ fontSize: 12, color: statusOf(row).color }}>
              {statusOf(row).key === 'expiring' ? `${toPersianDigits(daysUntil(dueOf(row)))} روز` : ''}
            </Typography>
          </>
        ),
      },
      {
        key: 'status',
        label: 'وضعیت',
        align: 'center',
        render: (row) => <StatusChip row={row} />,
      },
      {
        key: 'actions',
        label: 'عملیات',
        align: 'center',
        cellSx: { whiteSpace: 'nowrap' },
        render: (row) => (
          <Stack direction="row" spacing={0.1} justifyContent="center">
            <LifecycleActions row={row} onAction={onAction} compact />
            <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
            <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)}><EditIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
            <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(row)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
          </Stack>
        ),
      },
    ]}
  />
);

const ContractSnapshotCard = ({ contract, accent, onBack, currency, guaranteeCount = 0 }) => (
  <SurfaceCard title="قرارداد" icon={DescriptionIcon} color={accent}
    action={<Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ minWidth: 0, fontSize: 12 }}>تغییر</Button>}>
    <Stack spacing={0.75}>
      <Box>
        <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK, lineHeight: 1.6 }}>
          {contract?.subject || 'قرارداد'}
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.3 }}>
          <Chip size="small" label={contract?.number || 'بدون شماره'}
            sx={{ height: 20, fontSize: 12, fontWeight: 800, bgcolor: alpha(accent, 0.07), color: accent }} />
          {contract?.status_display ? (
            <Chip size="small" label={contract.status_display}
              sx={{ height: 20, fontSize: 12, bgcolor: SOFT_BG, color: MUTED }} />
          ) : null}
        </Stack>
      </Box>
      <Divider />
      <InfoLine label="طرف قرارداد" value={contract?.party_name} />
      <InfoLine label="مبلغ قرارداد" value={money(contract?.amount, currency)} ltr />
      <InfoLine label="تاریخ پایان" value={dateLabel(contract?.end_date)} />
      <InfoLine label="تعداد تضامین" value={formatPersianNumber(guaranteeCount)} />
    </Stack>
  </SurfaceCard>
);

const CoveragePanel = ({ status, accent, isLoading }) => {
  const summary = status?.summary || {};
  const coverage = Math.max(0, Math.min(100, Number(summary.coverage_percent) || 0));
  const coverageColor = coverage >= 100 ? '#0f766e' : coverage >= 50 ? '#b45309' : '#be123c';
  const requirements = status?.requirements || [];
  return (
    <SurfaceCard title="پوشش تضامین" icon={VerifiedUserIcon} color={accent}
      action={<Chip size="small" label={`${toPersianDigits(coverage)}٪`}
        sx={{ height: 21, fontSize: 12, fontWeight: 900, bgcolor: alpha(coverageColor, 0.08), color: coverageColor }} />}>
      {isLoading ? <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={20} /></Box> : (
        <Stack spacing={1}>
          <Box>
            <Typography sx={{ fontSize: 30, fontWeight: 900, color: coverageColor, lineHeight: 1.1 }}>
              {toPersianDigits(coverage)}٪
            </Typography>
            <Box sx={{ mt: 0.75 }}><ProgressBar value={coverage} color={coverageColor} height={7} /></Box>
          </Box>
          <Grid container spacing={0.7}>
            {[
              ['مورد نیاز', summary.required_total, INK],
              ['تأمین‌شده', summary.provided_total, '#0f766e'],
              ['کمبود', summary.balance_total, Number(summary.balance_total) > 0 ? '#be123c' : INK],
              ['آزادشده', summary.released_total, MUTED],
            ].map(([label, value, color]) => (
              <Grid item xs={6} key={label}>
                <Box sx={{ p: 0.8, borderRadius: '9px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
                  <Typography sx={{ fontSize: 12, color: MUTED }}>{label}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 900, color, direction: 'ltr', textAlign: 'right' }}>
                    {formatPersianNumber(value || 0)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`${toPersianDigits(summary.provided_count || 0)} تأمین‌شده`}
              sx={{ height: 19, fontSize: 12, bgcolor: '#ecfdf5', color: '#0f766e' }} />
            {Number(summary.partial_count) > 0 ? <Chip size="small" label={`${toPersianDigits(summary.partial_count)} ناقص`} sx={{ height: 19, fontSize: 12, bgcolor: '#fffbeb', color: '#b45309' }} /> : null}
            {Number(summary.missing_count) > 0 ? <Chip size="small" label={`${toPersianDigits(summary.missing_count)} تأمین‌نشده`} sx={{ height: 19, fontSize: 12, bgcolor: '#fff1f2', color: '#be123c' }} /> : null}
          </Stack>
          {requirements.length ? (
            <Box sx={{ pt: 0.3 }}>
              <Typography sx={{ fontSize: 12, color: MUTED, mb: 0.5 }}>اقلام تضمین قرارداد</Typography>
              <Stack spacing={0.55}>
                {requirements.slice(0, 4).map((req) => (
                  <Box key={`${req.index}-${req.type}`}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography noWrap sx={{ fontSize: 12, color: '#475569' }}>{req.label}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: req.status === 'provided' ? '#0f766e' : req.status === 'partial' ? '#b45309' : '#be123c' }}>
                        {toPersianDigits(req.coverage_percent || 0)}٪
                      </Typography>
                    </Stack>
                    <Box sx={{ mt: 0.25 }}><ProgressBar value={req.coverage_percent || 0} color={req.status === 'provided' ? '#0f766e' : req.status === 'partial' ? '#b45309' : '#be123c'} height={4} /></Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      )}
    </SurfaceCard>
  );
};



const StatusNav = ({ counts, active, onChange, accent }) => {
  const theme = useTheme();
  const items = [
    ['all', 'همهٔ تضامین', '#64748b'],
    ['active', 'معتبر', STATUS_META.active.color],
    ['expiring', 'نزدیک انقضا', STATUS_META.expiring.color],
    ['expired', 'منقضی', STATUS_META.expired.color],
    ['returned', 'استرداد شده', STATUS_META.returned.color],
    ['executed', 'اجرا / ضبط شده', STATUS_META.executed.color],
    ['canceled', 'ابطال شده', STATUS_META.canceled.color],
  ];
  return (
    <SurfaceCard title="وضعیت‌ها" icon={FilterListIcon} color={accent}>
      <Stack spacing={0.2}>
        {items.map(([key, label, color]) => (
          <ButtonBase key={key} onClick={() => onChange(key)} sx={{
            width: '100%', p: 0.7, borderRadius: '9px', justifyContent: 'space-between',
            bgcolor: active === key ? alpha(color, 0.07) : 'transparent',
            border: `1px solid ${active === key ? alpha(color, 0.18) : 'transparent'}`,
          }}>
            <Stack direction="row" alignItems="center" spacing={0.65}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
              <Typography sx={{ fontSize: 12, fontWeight: active === key ? 900 : 700, color: active === key ? color : theme.palette.text.primary }}>
                {label}
              </Typography>
            </Stack>
            <Chip size="small" label={formatPersianNumber(counts[key] || 0)}
              sx={{ height: 18, fontSize: 12, bgcolor: theme.palette.action.hover }} />
          </ButtonBase>
        ))}
      </Stack>
    </SurfaceCard>
  );
};


const LandingContent = ({
  contractList, list, expiringRows, activeCount, totalAmount, currencyLabel, accent,
  onSelect, onSelectContract,
}) => {
  const contractsWithGuarantees = new Set(list.map((row) => String(row.contract))).size;
  const guaranteeCounts = list.reduce((counts, row) => {
    const key = String(row.contract);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  return (
    <>
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={DescriptionIcon} label="کل قراردادها" value={formatPersianNumber(contractList.length)}
            suffix="قرارداد" color={accent} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={LockIcon} label="دارای تضمین" value={formatPersianNumber(contractsWithGuarantees)}
            suffix="قرارداد" color="#2563eb" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={CheckCircleIcon} label="تضامین معتبر" value={formatPersianNumber(activeCount)}
            suffix="مورد" color="#0f766e" />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PaymentsIcon} label="مجموع مبلغ تضامین" value={formatPersianNumber(totalAmount)}
            suffix={currencyLabel} color="#b45309" size={16} />
        </Grid>
      </Grid>
      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={8}>
          <SurfaceCard title="انتخاب قرارداد" icon={LockIcon} color={accent}>
            <ContractListPicker
              contracts={contractList}
              onSelect={onSelect}
              height={540}
              accent={accent}
              countLabel="تضمین"
              countHeaderLabel="تعداد تضمین‌ها"
              getCount={(contract) => guaranteeCounts[String(contract.id)] || 0}
            />
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="تضامین نزدیک انقضا" icon={EventBusyIcon} color="#b45309"
            action={<Chip size="small" label={formatPersianNumber(expiringRows.length)}
              sx={{ height: 21, fontSize: 12, bgcolor: '#fffbeb', color: '#b45309', fontWeight: 900 }} />}>
            {expiringRows.length ? (
              <Stack spacing={0.55}>
                {expiringRows.map((row) => {
                  const days = daysUntil(dueOf(row));
                  return (
                    <ButtonBase key={row.id} onClick={() => onSelectContract(row.contract)}
                      sx={{
                        width: '100%', p: 0.85, borderRadius: '10px', justifyContent: 'flex-start',
                        border: '1px solid #f1f5f9', bgcolor: '#fff', textAlign: 'right',
                        '&:hover': { bgcolor: '#fffbeb', borderColor: '#fde68a' },
                      }}>
                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ width: '100%' }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: '8px', bgcolor: '#fffbeb', color: '#b45309',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}><ScheduleIcon sx={{ fontSize: 15 }} /></Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>
                            {numberFor(row)} · {instrumentMeta(row).label}
                          </Typography>
                          <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>
                            {row.contract_subject || 'قرارداد'} · {dateLabel(dueOf(row))}
                          </Typography>
                        </Box>
                        <Chip size="small" label={days === 0 ? 'امروز' : `${toPersianDigits(days)} روز`}
                          sx={{ height: 19, fontSize: 12, bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 800 }} />
                      </Stack>
                    </ButtonBase>
                  );
                })}
              </Stack>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 30, color: '#0f766e', mb: 0.6 }} />
                <Typography sx={{ fontSize: 12, color: MUTED }}>تضمینی در ۳۰ روز آینده منقضی نمی‌شود.</Typography>
              </Box>
            )}
          </SurfaceCard>
        </Grid>
      </Grid>
    </>
  );
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
  const [page, setPage] = useState(0);
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
  const { tokens } = useDesignTokens();
  const tableTheme = resolveTableTheme(tokens);
  const toolbar = resolveToolbarTheme(tokens);
  const cardPadX = Math.max(12, Number(tableTheme.frameX) || 0);
  const cardPadY = Math.max(12, Number(tableTheme.frameY) || 0);
  const cardBorderColor = alpha(theme.palette.text.primary, 0.14);

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
  useLayoutEffect(measureRows, [pagedRows.length, tableTheme.rowHeight, tableTheme.headerHeight]);
  useEffect(() => {
    const onResize = () => measureRows();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const effectiveRowPx = measuredRowPx > 0 ? measuredRowPx : tableTheme.rowHeight;
  const effectiveHeadPx = measuredHeadPx > 0 ? measuredHeadPx : tableTheme.headerHeight;
  const tableHeight = Math.round(effectiveHeadPx + effectiveRowPx * tableTheme.visibleRows);

  /* ---- فیلترها، چیپ‌ها و گزینه‌ها ---- */
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
  const activeFilterCount = (contractId ? 1 : 0)
    + (instrumentFilter !== 'all' ? 1 : 0)
    + (statusFilter !== 'all' ? 1 : 0);
  const activeChips = [
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
  ].filter(Boolean);
  const activeChipSx = toolbar.chipStyle === 'outlined'
    ? { bgcolor: 'transparent', border: `1px solid ${toolbar.chipBorder}`, color: toolbar.primary, fontWeight: 700 }
    : { bgcolor: toolbar.chipBg, color: toolbar.primary, fontWeight: 700, border: `1px solid ${toolbar.chipBorder}` };
  const filtersExpanded = filtersOpen;
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setInstrumentFilter('all');
    setSortBy('due');
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
    const headers = ['نوع تضمین', 'ابزار', 'شماره', 'مبلغ', 'بانک', 'تاریخ صدور', 'سررسید', 'وضعیت', 'ضمانت قرارداد'];
    const rows = filtered.map((row) => [
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
            placeholder="جستجو در شماره، بانک، قرارداد…"
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
            {GUARANTEE_SORT_OPTIONS.map((option) => (
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
              onClick={() => { resetFilters(); clearContract(); }}
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
              {toolbar.showReset ? (
                <Button
                  variant="text" size="small" onClick={() => { resetFilters(); clearContract(); }}
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
            contractNumberFor={(row) => contractNumberById.get(String(row.contract)) || ''}
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
