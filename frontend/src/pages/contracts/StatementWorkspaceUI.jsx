import React from 'react';
import {
  Box, Button, ButtonBase, Chip, CircularProgress, Divider, Drawer, Grid,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import TableRowsIcon from '@mui/icons-material/TableRows';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import ContractListPicker from '../../core/components/ui/ContractListPicker';
import { KpiTile, ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from '../accounting/AccountingDashboardUI';
import { AttachmentLinks } from './AddendumWorkspaceUI';
import {
  RIAL_LABEL, displayAmount, hasForeignAmount, isRialCurrency, rateOfStatement,
} from './statementCurrency';
import {
  statementDisplayTitle, statementKindOf, statementNumberLabel,
} from './statementKinds';

export const STATEMENT_ACCENT = '#6366f1';
export const STATEMENT_DARK = '#4f46e5';
const GREEN = '#0f766e';
const AMBER = '#b45309';
const RED = '#be123c';
const BLUE = '#2563eb';

const n = (value) => Number(value) || 0;
const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export const dateLabel = (value) => (value ? toJalali(value) : '—');
export const money = (value, currency = 'ریال') => `${formatPersianNumber(n(value))} ${currency}`;

/**
 * نمایش مبلغ یک صورت‌وضعیت:
 *  - برای قرارداد ارزی، معادل ارزی (بر اساس نرخ همان دوره) نمایش داده می‌شود.
 *  - مبلغ ذخیره‌شده در دیتابیس همیشه ریالی است.
 */
export const statementMoney = (row, rialValue, currency = RIAL_LABEL, fallbackRate = 1) => {
  const rate = rateOfStatement(row, fallbackRate);
  if (rate > 1 && !isRialCurrency(currency)) {
    return money(displayAmount(row, rialValue, fallbackRate), currency);
  }
  return money(rialValue, RIAL_LABEL);
};

export const statementAmount = (row, rialValue, fallbackRate = 1) => (
  displayAmount(row, rialValue, fallbackRate)
);

/** نمایش مبلغ با معادل ارزیِ ذخیره‌شده (برای مبالغ تجمعی و کارکرد دوره). */
export const statementMoneyFor = (row, rialValue, foreignValue, currency = RIAL_LABEL, fallbackRate = 1) => {
  const rate = rateOfStatement(row, fallbackRate);
  const foreign = Number(foreignValue);
  if (rate > 1 && !isRialCurrency(currency) && Number.isFinite(foreign)) {
    return money(foreign, currency);
  }
  return statementMoney(row, rialValue, currency, fallbackRate);
};

export const currencyFor = (row, contract) => normalizeCurrencyLabel(
  row?.currency_name || row?.currency_symbol || contract?.currency_name
  || contract?.currency_symbol || 'ریال',
);

export const statementStatus = (row) => (row?.is_approved
  ? { key: 'approved', label: 'تأیید شده', color: GREEN, bg: '#ecfdf5', icon: CheckCircleIcon }
  : { key: 'pending', label: 'در انتظار تأیید', color: AMBER, bg: '#fffbeb', icon: PendingActionsIcon });

export const rowMetrics = (row = {}) => {
  const amount = Math.max(0, n(row.amount));
  const previous = Math.max(0, n(row.cumulative_previous_amount));
  const work = n(row.work_done) || Math.max(0, amount - previous);
  const additions = Array.isArray(row.additions) ? row.additions : [];
  const deductions = Array.isArray(row.deductions) ? row.deductions : [];
  const additionsTotal = n(row.additions_total)
    || additions.reduce((sum, item) => sum + n(item.amount), 0) + n(row.value_added_tax) + n(row.other_additions);
  const deductionsTotal = n(row.deductions_total) || deductions.reduce((sum, item) => sum + n(item.amount), 0);
  const net = n(row.net_amount) || work + additionsTotal - deductionsTotal;
  return { amount, previous, work, additions, deductions, additionsTotal, deductionsTotal, net };
};

export const contractAmountOf = (contract) => {
  if (!contract) return 0;
  const addendumChange = (Array.isArray(contract.addendums) ? contract.addendums : [])
    .reduce((sum, item) => sum + n(item.amount_change), 0);
  return Math.max(0, n(contract.amount) + addendumChange);
};

export const InfoLine = ({ label, value, strong, color, ltr }) => (
  <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ py: 0.3 }}>
    <Typography sx={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{label}</Typography>
    <Typography noWrap sx={{
      fontSize: 12, fontWeight: strong ? 900 : 700, color: color || INK,
      direction: ltr ? 'ltr' : 'rtl', textAlign: 'right', minWidth: 0,
    }}>{value === null || value === undefined || value === '' ? '—' : value}</Typography>
  </Stack>
);

export const SectionHeading = ({ icon: Icon, title, color = STATEMENT_ACCENT, action }) => (
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

export const StatusChip = ({ row }) => {
  const status = statementStatus(row);
  return <Chip size="small" label={status.label} sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: status.bg, color: status.color }} />;
};

export const MetricBox = ({ label, value, color = INK, hint }) => (
  <Box sx={{ p: 0.8, borderRadius: '9px', bgcolor: SOFT_BG, border: '1px solid #eef2f7', minWidth: 0 }}>
    <Typography sx={{ fontSize: 12, color: MUTED }}>{label}</Typography>
    <Typography noWrap sx={{ fontSize: 12, fontWeight: 900, color, direction: 'ltr', textAlign: 'right' }}>{value}</Typography>
    {hint ? <Typography sx={{ fontSize: 12, color: MUTED }}>{hint}</Typography> : null}
  </Box>
);

export const StatementCard = ({
  row, contractAmount, currency, fallbackRate = 1, accent = STATEMENT_ACCENT,
  onView, onEdit, onDelete, onPrint, onApprove,
}) => {
  const theme = useTheme();
  const metrics = rowMetrics(row);
  const status = statementStatus(row);
  const kind = statementKindOf(row);
  const isAdjustment = kind.isAdjustment;
  const accentColor = isAdjustment ? kind.color : status.color;
  const rate = rateOfStatement(row, fallbackRate);
  const cumulativeForeign = row.foreign_amount != null
    ? n(row.foreign_amount)
    : (rate > 1 ? metrics.amount / rate : metrics.amount);
  const progress = n(contractAmount) > 0 ? clamp((cumulativeForeign / n(contractAmount)) * 100) : 0;
  const foreign = hasForeignAmount(row, fallbackRate);
  const documents = Array.isArray(row.documents) ? row.documents : [];
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: 1.4, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', gap: 0.85,
      borderTop: `3px solid ${accentColor}`,
      transition: 'box-shadow .18s ease, border-color .18s ease',
      '&:hover': { borderColor: alpha(accent, 0.3), boxShadow: `0 10px 24px ${alpha(accent, 0.06)}` },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={0.8}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
          bgcolor: alpha(accentColor, 0.08), color: accentColor, border: `1px solid ${alpha(accentColor, 0.14)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><ReceiptLongIcon sx={{ fontSize: 19 }} /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 12, fontWeight: 900, color: INK }}>{statementDisplayTitle(row, { fallbackId: true })}</Typography>
          <Typography sx={{ fontSize: 12, color: MUTED }}>{dateLabel(row.date)} · {row.contract_subject || 'قرارداد'}</Typography>
        </Box>
        <StatusChip row={row} />
      </Stack>

      <Box sx={{ borderRadius: '11px', p: 0.9, bgcolor: alpha(accentColor, 0.035), border: `1px solid ${alpha(accentColor, 0.13)}` }}>
        <Typography sx={{ fontSize: 12, color: MUTED }}>{isAdjustment ? 'مبلغ تعدیل قابل پرداخت' : 'مبلغ قابل پرداخت این دوره'}</Typography>
        <Typography noWrap sx={{ fontSize: 14.5, fontWeight: 900, color: accentColor, lineHeight: 1.4 }}>{statementMoney(row, metrics.net, currency, fallbackRate)}</Typography>
        {foreign ? (
          <Typography noWrap sx={{ fontSize: 11, color: MUTED }}>معادل ریالی: {money(metrics.net, RIAL_LABEL)}</Typography>
        ) : null}
      </Box>

      <Grid container spacing={0.55}>
        <Grid item xs={6}><MetricBox label={isAdjustment ? 'تعدیل این دوره' : 'کارکرد دوره'} value={statementMoneyFor(row, metrics.work, row.foreign_work_done, currency, fallbackRate)} color={isAdjustment ? kind.color : BLUE} /></Grid>
        <Grid item xs={6}><MetricBox label={isAdjustment ? 'تعدیل تجمعی' : 'جمع کسورات'} value={isAdjustment
          ? statementMoneyFor(row, row.adjustment_amount, row.adjustment_foreign_amount, currency, fallbackRate)
          : statementMoney(row, metrics.deductionsTotal, currency, fallbackRate)}
          color={isAdjustment ? kind.color : (metrics.deductionsTotal ? RED : INK)} /></Grid>
      </Grid>

      <Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.35 }}>
          <Typography sx={{ fontSize: 12, color: MUTED }}>پیشرفت تجمعی صورت‌وضعیت</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: accent }}>{toPersianDigits(progress.toFixed(1))}٪</Typography>
        </Stack>
        <ProgressBar value={progress} color={accent} height={5} />
      </Box>

      <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap">
        {isAdjustment ? <Chip size="small" label={kind.shortLabel} sx={{ height: 18, fontSize: 12, bgcolor: alpha(kind.color, 0.08), color: kind.color }} /> : null}
        {!isAdjustment && metrics.additionsTotal > 0 ? <Chip size="small" label={`اضافات ${formatPersianNumber(statementAmount(row, metrics.additionsTotal, fallbackRate))} ${foreign ? currency : RIAL_LABEL}`} sx={{ height: 18, fontSize: 12, bgcolor: '#ecfdf5', color: GREEN }} /> : null}
        {documents.length ? <Chip size="small" label={`${formatPersianNumber(documents.length)} پیوست`} sx={{ height: 18, fontSize: 12, bgcolor: alpha(BLUE, 0.07), color: BLUE }} /> : null}
        {!isAdjustment && !metrics.additionsTotal && !documents.length ? <Chip size="small" label="بدون پیوست" sx={{ height: 18, fontSize: 12, bgcolor: SOFT_BG, color: MUTED }} /> : null}
      </Stack>

      <Divider sx={{ mt: 'auto' }} />
      <Stack direction="row" alignItems="center" spacing={0.2}>
        <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => onView(row)} sx={{ fontSize: 12, minWidth: 0 }}>جزئیات</Button>
        <Tooltip title={row.is_approved ? 'لغو تأیید' : 'تأیید صورت‌وضعیت'}>
          <IconButton size="small" onClick={() => onApprove(row)} sx={{ color: row.is_approved ? GREEN : AMBER, p: 0.35 }}>
            {row.is_approved ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <TaskAltIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="چاپ"><IconButton size="small" onClick={() => onPrint(row)} sx={{ color: BLUE, p: 0.35 }}><PrintOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)} sx={{ color: MUTED, p: 0.35 }}><EditOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="حذف"><IconButton size="small" onClick={() => onDelete(row)} sx={{ color: RED, p: 0.35 }}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
      </Stack>
    </Paper>
  );
};

export const StatementTable = ({ rows, contractAmount, currency, fallbackRate = 1, onView, onEdit, onDelete, onPrint, onApprove }) => {
  const theme = useTheme();
  const headSx = { fontWeight: 800, fontSize: 12, color: '#334155', bgcolor: '#f8fafc', whiteSpace: 'nowrap', py: 1 };
  const cellSx = { fontSize: 12, whiteSpace: 'nowrap', py: 0.8, borderBottom: '1px solid #eef2f7' };
  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {['سند', 'تاریخ', 'کارکرد / تعدیل', 'اضافات', 'کسورات', 'قابل پرداخت', 'پیشرفت', 'وضعیت', 'پیوست', 'اقدام'].map((label) => (
                <TableCell key={label} sx={headSx} align={label === 'اقدام' ? 'center' : 'right'}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const metrics = rowMetrics(row);
              const status = statementStatus(row);
              const rate = rateOfStatement(row, fallbackRate);
              const kind = statementKindOf(row);
              const cumulativeForeign = row.foreign_amount != null
                ? n(row.foreign_amount)
                : (rate > 1 ? metrics.amount / rate : metrics.amount);
              const progress = n(contractAmount) > 0 ? clamp((cumulativeForeign / n(contractAmount)) * 100) : 0;
              const documents = Array.isArray(row.documents) ? row.documents : [];
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ ...cellSx, fontWeight: 800 }}>
                    <Stack spacing={0.2} alignItems="flex-start">
                      <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{statementNumberLabel(row) || '—'}</Typography>
                      <Chip size="small" label={kind.shortLabel}
                        sx={{ height: 16, fontSize: 10, bgcolor: alpha(kind.color, 0.08), color: kind.color }} />
                    </Stack>
                  </TableCell>
                  <TableCell sx={cellSx}>{dateLabel(row.date)}</TableCell>
                  <TableCell sx={cellSx} title={`${money(metrics.work, RIAL_LABEL)}`}>{statementMoneyFor(row, metrics.work, row.foreign_work_done, currency, fallbackRate)}</TableCell>
                  <TableCell sx={{ ...cellSx, color: kind.isAdjustment ? MUTED : GREEN }}>{kind.isAdjustment ? '—' : statementMoney(row, metrics.additionsTotal, currency, fallbackRate)}</TableCell>
                  <TableCell sx={{ ...cellSx, color: kind.isAdjustment ? MUTED : (metrics.deductionsTotal ? RED : MUTED) }}>{kind.isAdjustment ? '—' : statementMoney(row, metrics.deductionsTotal, currency, fallbackRate)}</TableCell>
                  <TableCell sx={{ ...cellSx, color: kind.isAdjustment ? kind.color : status.color, fontWeight: 900 }} title={`${money(metrics.net, RIAL_LABEL)}`}>{statementMoney(row, metrics.net, currency, fallbackRate)}</TableCell>
                  <TableCell sx={cellSx}>
                    <Stack direction="row" alignItems="center" spacing={0.45}>
                      <Box sx={{ width: 48 }}><ProgressBar value={progress} color={kind.isAdjustment ? kind.color : status.color} height={4} /></Box>
                      <Typography sx={{ fontSize: 12, color: MUTED }}>{toPersianDigits(progress.toFixed(0))}٪</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={cellSx}><StatusChip row={row} /></TableCell>
                  <TableCell sx={cellSx}>
                    <Chip size="small" label={formatPersianNumber(documents.length)} sx={{ height: 18, fontSize: 12, bgcolor: documents.length ? alpha(BLUE, 0.07) : SOFT_BG, color: documents.length ? BLUE : MUTED }} />
                  </TableCell>
                  <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                    <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)} sx={{ p: 0.25, color: BLUE }}><VisibilityOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title={row.is_approved ? 'لغو تأیید' : 'تأیید'}><IconButton size="small" onClick={() => onApprove(row)} sx={{ p: 0.25, color: row.is_approved ? GREEN : AMBER }}>{row.is_approved ? <CheckCircleIcon sx={{ fontSize: 15 }} /> : <TaskAltIcon sx={{ fontSize: 15 }} />}</IconButton></Tooltip>
                    <Tooltip title="چاپ"><IconButton size="small" onClick={() => onPrint(row)} sx={{ p: 0.25, color: BLUE }}><PrintOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)} sx={{ p: 0.25 }}><EditOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title="حذف"><IconButton size="small" onClick={() => onDelete(row)} sx={{ p: 0.25, color: RED }}><DeleteOutlineIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export const ContractSnapshotCard = ({
  contract, currency, accent = STATEMENT_ACCENT, onBack, statementCount = 0, adjustments = null,
}) => (
  <SurfaceCard title="قرارداد" icon={DescriptionIcon} color={accent}
    action={<Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ minWidth: 0, fontSize: 12 }}>تغییر</Button>}>
    <Stack spacing={0.75}>
      <Box>
        <Typography sx={{ fontSize: 12.2, fontWeight: 900, color: INK, lineHeight: 1.6 }}>
          {contract?.subject || 'قرارداد'}
        </Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.3 }}>
          <Chip size="small" label={contract?.number || 'بدون شماره'}
            sx={{ height: 20, fontSize: 12, fontWeight: 800, bgcolor: alpha(accent, 0.07), color: accent }} />
          {contract?.status_display ? <Chip size="small" label={contract.status_display} sx={{ height: 20, fontSize: 12, bgcolor: SOFT_BG, color: MUTED }} /> : null}
        </Stack>
      </Box>
      <Divider />
      <InfoLine label="طرف قرارداد" value={contract?.party_name} />
      <InfoLine label="مبلغ قرارداد" value={money(contractAmountOf(contract), currency)} ltr />
      {adjustments?.count ? (
        <>
          <InfoLine label="تعدیل افزایشی" value={money(adjustments.increase, 'ریال')} color={GREEN} />
          <InfoLine label="تعدیل کاهشی" value={money(adjustments.decrease, 'ریال')} color={RED} />
          <InfoLine label="اثر خالص تعدیلات" value={money(adjustments.net, 'ریال')} strong color={adjustments.net >= 0 ? GREEN : RED} />
        </>
      ) : null}
      <InfoLine label="تاریخ شروع" value={dateLabel(contract?.start_date)} />
      <InfoLine label="تاریخ پایان" value={dateLabel(contract?.end_date)} />
      <InfoLine label="تعداد صورت‌وضعیت" value={formatPersianNumber(statementCount)} strong />
    </Stack>
  </SurfaceCard>
);

export const FinancialCoverageCard = ({ totals, currency, isLoading, accent = STATEMENT_ACCENT }) => {
  const coverage = totals.net > 0 ? clamp((totals.paid / totals.net) * 100) : 0;
  const coverageColor = coverage >= 100 ? GREEN : coverage >= 50 ? AMBER : RED;
  return (
    <SurfaceCard title="پوشش مالی صورت‌وضعیت‌ها" icon={PaymentsIcon} color={accent}
      action={<Chip size="small" label={`${toPersianDigits(coverage.toFixed(0))}٪`}
        sx={{ height: 21, fontSize: 12, fontWeight: 900, bgcolor: alpha(coverageColor, 0.08), color: coverageColor }} />}>
      {isLoading ? <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={20} /></Box> : (
        <Stack spacing={1}>
          <Box>
            <Typography sx={{ fontSize: 27, fontWeight: 900, color: coverageColor, lineHeight: 1.1 }}>{toPersianDigits(coverage.toFixed(0))}٪</Typography>
            <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.2 }}>نسبت پرداخت‌های ثبت‌شده به مبلغ قابل پرداخت</Typography>
            <Box sx={{ mt: 0.7 }}><ProgressBar value={coverage} color={coverageColor} height={7} /></Box>
          </Box>
          <Grid container spacing={0.6}>
            <Grid item xs={6}><MetricBox label="قابل پرداخت" value={money(totals.net, currency)} color={accent} /></Grid>
            <Grid item xs={6}><MetricBox label="پرداخت‌شده" value={money(totals.paid, currency)} color={GREEN} /></Grid>
            <Grid item xs={6}><MetricBox label="مانده پرداخت" value={money(totals.outstanding, currency)} color={totals.outstanding > 0 ? RED : INK} /></Grid>
            <Grid item xs={6}><MetricBox label="کارکرد تجمعی" value={money(totals.cumulative, currency)} color={BLUE} /></Grid>
          </Grid>
          <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`${formatPersianNumber(totals.approvedCount)} تأییدشده`} sx={{ height: 19, fontSize: 12, bgcolor: '#ecfdf5', color: GREEN }} />
            <Chip size="small" label={`${formatPersianNumber(totals.pendingCount)} در انتظار`} sx={{ height: 19, fontSize: 12, bgcolor: '#fffbeb', color: AMBER }} />
            {totals.adjustments?.increase ? <Chip size="small" label={`تعدیل افزایشی ${money(totals.adjustments.increase, 'ریال')}`} sx={{ height: 19, fontSize: 12, bgcolor: '#ecfdf5', color: '#15803d' }} /> : null}
            {totals.adjustments?.decrease ? <Chip size="small" label={`تعدیل کاهشی ${money(totals.adjustments.decrease, 'ریال')}`} sx={{ height: 19, fontSize: 12, bgcolor: '#fff1f2', color: RED }} /> : null}
            {totals.overContract > 0 ? <Chip size="small" label="تجاوز از مبلغ قرارداد" icon={<WarningAmberIcon sx={{ fontSize: '12px !important' }} />} sx={{ height: 19, fontSize: 12, bgcolor: '#fff1f2', color: RED, '& .MuiChip-icon': { color: RED } }} /> : null}
          </Stack>
        </Stack>
      )}
    </SurfaceCard>
  );
};

export const StatusNav = ({ counts, active, onChange, accent = STATEMENT_ACCENT }) => {
  const items = [
    { key: 'all', label: 'همه صورت‌وضعیت‌ها', icon: ReceiptLongIcon, color: accent },
    { key: 'approved', label: 'تأییدشده', icon: CheckCircleIcon, color: GREEN },
    { key: 'pending', label: 'در انتظار تأیید', icon: PendingActionsIcon, color: AMBER },
  ];
  return (
    <SurfaceCard title="وضعیت تأیید" icon={TaskAltIcon} color={accent}>
      <Stack spacing={0.5}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <ButtonBase key={item.key} onClick={() => onChange(item.key)}
              sx={{
                width: '100%', p: 0.75, borderRadius: '10px', justifyContent: 'flex-start', textAlign: 'right',
                border: `1px solid ${selected ? alpha(item.color, 0.3) : '#eef2f7'}`,
                bgcolor: selected ? alpha(item.color, 0.05) : '#fff',
                '&:hover': { bgcolor: alpha(item.color, 0.04) },
              }}>
              <Stack direction="row" alignItems="center" spacing={0.65} sx={{ width: '100%' }}>
                <Box sx={{ width: 27, height: 27, borderRadius: '8px', bgcolor: alpha(item.color, 0.08), color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon sx={{ fontSize: 15 }} />
                </Box>
                <Typography sx={{ flex: 1, fontSize: 12, fontWeight: selected ? 900 : 700, color: INK }}>{item.label}</Typography>
                <Chip size="small" label={formatPersianNumber(counts[item.key] || 0)} sx={{ height: 19, fontSize: 12, bgcolor: alpha(item.color, 0.08), color: item.color, fontWeight: 900 }} />
              </Stack>
            </ButtonBase>
          );
        })}
      </Stack>
    </SurfaceCard>
  );
};

export const StatementLanding = ({
  contractList, list, pendingRows, counts, totalNet, currency, accent = STATEMENT_ACCENT,
  onSelect, onSelectContract,
}) => {
  const withStatements = new Set(list.map((row) => String(row.contract))).size;
  const countsByContract = list.reduce((acc, row) => {
    const key = String(row.contract);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return (
    <>
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}><KpiTile icon={DescriptionIcon} label="کل قراردادها" value={formatPersianNumber(contractList.length)} suffix="قرارداد" color={accent} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={ReceiptLongIcon} label="دارای صورت‌وضعیت" value={formatPersianNumber(withStatements)} suffix="قرارداد" color={BLUE} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={CheckCircleIcon} label="تأییدشده" value={formatPersianNumber(counts.approved || 0)} suffix="مورد" color={GREEN} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={PaymentsIcon} label="مجموع قابل پرداخت" value={formatPersianNumber(totalNet)} suffix={currency} color={AMBER} size={16} /></Grid>
      </Grid>
      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={8}>
          <SurfaceCard title="انتخاب قرارداد" icon={ReceiptLongIcon} color={accent}>
            <ContractListPicker
              contracts={contractList}
              onSelect={onSelect}
              height={540}
              accent={accent}
              countLabel="صورت‌وضعیت"
              countHeaderLabel="تعداد صورت‌وضعیت‌ها"
              getCount={(contract) => countsByContract[String(contract.id)] || 0}
            />
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="در انتظار تأیید" icon={PendingActionsIcon} color={AMBER}
            action={<Chip size="small" label={formatPersianNumber(pendingRows.length)} sx={{ height: 21, fontSize: 12, bgcolor: '#fffbeb', color: AMBER, fontWeight: 900 }} />}>
            {pendingRows.length ? (
              <Stack spacing={0.55}>
                {pendingRows.map((row) => (
                  <ButtonBase key={row.id} onClick={() => onSelectContract(row.contract)}
                    sx={{
                      width: '100%', p: 0.85, borderRadius: '10px', justifyContent: 'flex-start',
                      border: '1px solid #f1f5f9', bgcolor: '#fff', textAlign: 'right',
                      '&:hover': { bgcolor: '#fffbeb', borderColor: '#fde68a' },
                    }}>
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ width: '100%' }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#fffbeb', color: AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ScheduleIcon sx={{ fontSize: 15 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{statementDisplayTitle(row, { fallbackId: true })} · {row.contract_subject || 'قرارداد'}</Typography>
                        <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{dateLabel(row.date)} · {statementMoney(row, rowMetrics(row).net, row.currency_name || row.currency_symbol || currency)}</Typography>
                      </Box>
                      <Chip size="small" label="در انتظار" sx={{ height: 19, fontSize: 12, bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 800 }} />
                    </Stack>
                  </ButtonBase>
                ))}
              </Stack>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 30, color: GREEN, mb: 0.6 }} />
                <Typography sx={{ fontSize: 12, color: MUTED }}>صورت‌وضعیت در انتظار تأییدی وجود ندارد.</Typography>
              </Box>
            )}
          </SurfaceCard>
        </Grid>
      </Grid>
    </>
  );
};

export const StatementDetailDrawer = ({
  row, contract, currency, fallbackRate = 1, accent = STATEMENT_ACCENT,
  onClose, onEdit, onDelete, onPrint, onApprove,
}) => {
  const theme = useTheme();
  if (!row) return null;
  const metrics = rowMetrics(row);
  const status = statementStatus(row);
  const kind = statementKindOf(row);
  const isAdjustment = kind.isAdjustment;
  const accentColor = isAdjustment ? kind.color : status.color;
  const StatusIcon = status.icon;
  const rate = rateOfStatement(row, fallbackRate);
  const foreign = hasForeignAmount(row, fallbackRate);
  const documents = Array.isArray(row.documents) ? row.documents : [];
  return (
    <Drawer anchor="left" open={Boolean(row)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 445 }, bgcolor: SOFT_BG } }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 1.75, bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
              bgcolor: alpha(accentColor, 0.08), color: accentColor,
              border: `1px solid ${alpha(accentColor, 0.16)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><StatusIcon sx={{ fontSize: 21 }} /></Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{statementDisplayTitle(row, { fallbackId: true })}</Typography>
              <Typography sx={{ fontSize: 12, color: MUTED }}>{row.contract_subject || contract?.subject || '—'} · {dateLabel(row.date)}</Typography>
            </Box>
            <StatusChip row={row} />
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
          <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={statementMoney(row, metrics.net, currency, fallbackRate)} sx={{ height: 21, fontSize: 12, fontWeight: 900, bgcolor: alpha(accentColor, 0.08), color: accentColor }} />
            <Chip size="small" label={kind.label} sx={{ height: 21, fontSize: 12, bgcolor: alpha(kind.color, 0.08), color: kind.color }} />
            {documents.length ? <Chip size="small" label={`${formatPersianNumber(documents.length)} پیوست`} sx={{ height: 21, fontSize: 12, bgcolor: alpha(BLUE, 0.07), color: BLUE }} /> : null}
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1.4}>
            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={PaymentsIcon} title="مشخصات مالی" color={accentColor} />
              <Box sx={{ p: 1, borderRadius: '11px', bgcolor: alpha(accentColor, 0.04), border: `1px solid ${alpha(accentColor, 0.12)}`, mb: 0.8 }}>
                <Typography sx={{ fontSize: 12, color: MUTED }}>{isAdjustment ? 'مبلغ تعدیل قابل پرداخت' : 'مبلغ قابل پرداخت این دوره'}</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 900, color: accentColor, lineHeight: 1.4 }}>{statementMoney(row, metrics.net, currency, fallbackRate)}</Typography>
                {foreign ? <Typography sx={{ fontSize: 11, color: MUTED }}>معادل ریالی: {money(metrics.net, RIAL_LABEL)}</Typography> : null}
              </Box>
              <InfoLine label="نوع سند" value={kind.label} />
              <InfoLine label="مبلغ تجمعی صورت‌وضعیت (بدون تغییر)" value={statementMoneyFor(row, metrics.amount, row.foreign_amount, currency, fallbackRate)} ltr />
              <InfoLine label="مبلغ تجمعی دوره قبل" value={statementMoneyFor(row, metrics.previous, row.foreign_previous_amount, currency, fallbackRate)} ltr />
              {isAdjustment ? (
                <>
                  <InfoLine label="تعدیل تجمعی دوره قبل" value={statementMoneyFor(row, row.adjustment_previous_amount, row.adjustment_foreign_previous_amount, currency, fallbackRate)} ltr color={MUTED} />
                  <InfoLine label="تعدیل این دوره" value={statementMoneyFor(row, metrics.work, row.foreign_work_done, currency, fallbackRate)} ltr strong color={kind.color} />
                  <InfoLine label="تعدیل تجمعی" value={statementMoneyFor(row, row.adjustment_amount, row.adjustment_foreign_amount, currency, fallbackRate)} ltr strong color={kind.color} />
                </>
              ) : (
                <>
                  <InfoLine label="کارکرد این دوره" value={statementMoneyFor(row, metrics.work, row.foreign_work_done, currency, fallbackRate)} ltr strong />
                  <InfoLine label="جمع اضافات" value={statementMoney(row, metrics.additionsTotal, currency, fallbackRate)} ltr color={GREEN} />
                  <InfoLine label="جمع کسورات" value={statementMoney(row, metrics.deductionsTotal, currency, fallbackRate)} ltr color={metrics.deductionsTotal ? RED : INK} />
                </>
              )}
              <InfoLine label="نرخ ارز" value={rate > 1 ? `${formatPersianNumber(rate)} ریال` : '—'} />
            </Paper>

            {!isAdjustment ? (
            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={TrendingUpIcon} title="اضافات و کسورات" color={accent} />
              <Typography sx={{ fontSize: 12, color: GREEN, fontWeight: 800, mb: 0.35 }}>اضافات</Typography>
              {metrics.additions.length ? metrics.additions.map((item, index) => (
                <InfoLine key={`add-${index}`} label={item.description || item.title || 'اضافه'} value={statementMoney(row, item.amount, currency, fallbackRate)} ltr color={GREEN} />
              )) : <Typography sx={{ fontSize: 12, color: MUTED, mb: 0.6 }}>اضافه‌ای ثبت نشده است.</Typography>}
              {n(row.value_added_tax) ? <InfoLine label="ارزش افزوده" value={statementMoney(row, row.value_added_tax, currency, fallbackRate)} ltr color={GREEN} /> : null}
              {n(row.other_additions) ? <InfoLine label="سایر اضافات" value={statementMoney(row, row.other_additions, currency, fallbackRate)} ltr color={GREEN} /> : null}
              <Divider sx={{ my: 0.6 }} />
              <Typography sx={{ fontSize: 12, color: RED, fontWeight: 800, mb: 0.35 }}>کسورات</Typography>
              {metrics.deductions.length ? metrics.deductions.map((item, index) => (
                <InfoLine key={`ded-${index}`} label={item.title || item.description || 'کسور'} value={statementMoney(row, item.amount, currency, fallbackRate)} ltr color={RED} />
              )) : <Typography sx={{ fontSize: 12, color: MUTED }}>کسوری ثبت نشده است.</Typography>}
            </Paper>
            ) : null}

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={DescriptionIcon} title="قرارداد و تاریخ‌ها" color={BLUE} />
              <InfoLine label="قرارداد" value={row.contract_subject || contract?.subject} />
              <InfoLine label="شماره قرارداد" value={contract?.number || row.contract_number} />
              <InfoLine label="طرف قرارداد" value={contract?.party_name} />
              <InfoLine label="تاریخ ثبت" value={dateLabel(row.date)} />
              <InfoLine label="مبلغ قرارداد" value={money(contractAmountOf(contract), currency)} ltr />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={InsertDriveFileIcon} title="مدارک و پیوست‌ها" color={BLUE}
                action={<Chip size="small" label={formatPersianNumber(documents.length)} sx={{ height: 19, fontSize: 12, bgcolor: alpha(BLUE, 0.07), color: BLUE }} />} />
              {documents.length ? <AttachmentLinks documents={documents} icon={InsertDriveFileIcon} documentLabel="مدرک صورت‌وضعیت" /> : (
                <Typography sx={{ fontSize: 12, color: MUTED }}>مدرکی به این صورت‌وضعیت پیوست نشده است.</Typography>
              )}
            </Paper>

            {row.description ? (
              <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeading icon={DescriptionIcon} title="توضیحات" color={MUTED} />
                <Typography sx={{ fontSize: 12, color: INK, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{row.description}</Typography>
              </Paper>
            ) : null}
          </Stack>
        </Box>

        <Divider />
        <Stack direction="row" spacing={0.6} sx={{ p: 1.4, bgcolor: theme.palette.background.paper }}>
          <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(row)} sx={{ flex: 1 }}>ویرایش</Button>
          <Tooltip title={row.is_approved ? 'لغو تأیید' : 'تأیید'}><Button variant="outlined" onClick={() => onApprove(row)} sx={{ minWidth: 40, px: 1 }}>{row.is_approved ? <CheckCircleIcon fontSize="small" /> : <TaskAltIcon fontSize="small" />}</Button></Tooltip>
          <Tooltip title="چاپ"><Button variant="outlined" onClick={() => onPrint(row)} sx={{ minWidth: 40, px: 1 }}><PrintOutlinedIcon fontSize="small" /></Button></Tooltip>
          <Tooltip title="حذف"><Button color="error" variant="outlined" onClick={() => onDelete(row)} sx={{ minWidth: 40, px: 1 }}><DeleteOutlineIcon fontSize="small" /></Button></Tooltip>
        </Stack>
      </Stack>
    </Drawer>
  );
};

// __APPEND__
