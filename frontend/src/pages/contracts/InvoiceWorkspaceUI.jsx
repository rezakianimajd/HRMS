import React from 'react';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, FormControl, FormControlLabel,
  Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SaveIcon from '@mui/icons-material/Save';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TableRowsIcon from '@mui/icons-material/TableRows';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import ContractListPicker from '../../core/components/ui/ContractListPicker';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import MoneyInput from '../../core/components/ui/MoneyInput';
import { KpiTile, ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from '../accounting/AccountingDashboardUI';
import { InfoLine, MetricBox, SectionHeading, dateLabel, money } from './StatementWorkspaceUI';

export const INVOICE_ACCENT = '#8b5cf6';
const INVOICE_DARK = '#6d28d9';
const GREEN = '#0f766e';
const AMBER = '#b45309';
const RED = '#be123c';
const BLUE = '#2563eb';
const n = (value) => Number(value) || 0;
const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
const today = () => new Date().toISOString().slice(0, 10);

export const invoiceMetrics = (row, linkedPaid = 0) => {
  const amount = Math.max(0, n(row.amount));
  const vat = Math.max(0, n(row.vat));
  const total = Math.max(0, n(row.total) || amount + vat);
  const paid = row.is_paid && !linkedPaid ? total : Math.max(0, n(linkedPaid));
  const outstanding = Math.max(0, total - paid);
  return { amount, vat, total, paid, outstanding, progress: total > 0 ? clamp((paid / total) * 100) : 0 };
};

export const invoiceStatus = (row, linkedPaid = 0) => {
  const metrics = invoiceMetrics(row, linkedPaid);
  if (row.is_paid || (metrics.total > 0 && metrics.outstanding === 0)) {
    return { key: 'paid', label: 'پرداخت شده', color: GREEN, bg: '#ecfdf5', icon: CheckCircleIcon };
  }
  if (row.due_date && String(row.due_date).slice(0, 10) < today()) {
    return { key: 'overdue', label: 'سررسید گذشته', color: RED, bg: '#fff1f2', icon: EventBusyIcon };
  }
  return { key: 'pending', label: 'در انتظار پرداخت', color: AMBER, bg: '#fffbeb', icon: ScheduleIcon };
};

export const invoiceCurrency = (row, contract) => normalizeCurrencyLabel(
  row?.currency_name || row?.currency_symbol || contract?.currency_name || contract?.currency_symbol || 'ریال',
);

export const InvoiceStatusChip = ({ row, paidAmount = 0 }) => {
  const status = invoiceStatus(row, paidAmount);
  return <Chip size="small" label={status.label} sx={{ height: 21, fontSize: 8.6, fontWeight: 800, bgcolor: status.bg, color: status.color }} />;
};

export const InvoiceCard = ({
  row, currency, paidAmount = 0, onView, onEdit, onDelete, onTogglePaid,
}) => {
  const theme = useTheme();
  const metrics = invoiceMetrics(row, paidAmount);
  const status = invoiceStatus(row, paidAmount);
  return (
    <Paper elevation={0} sx={{
      height: '100%', p: 1.4, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper, display: 'flex', flexDirection: 'column', gap: 0.85,
      borderTop: `3px solid ${status.color}`,
      transition: 'box-shadow .18s ease, border-color .18s ease',
      '&:hover': { borderColor: alpha(INVOICE_ACCENT, 0.3), boxShadow: `0 10px 24px ${alpha(INVOICE_ACCENT, 0.06)}` },
    }}>
      <Stack direction="row" alignItems="flex-start" spacing={0.8}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
          bgcolor: alpha(INVOICE_ACCENT, 0.08), color: INVOICE_ACCENT,
          border: `1px solid ${alpha(INVOICE_ACCENT, 0.14)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><ReceiptLongIcon sx={{ fontSize: 19 }} /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 10.6, fontWeight: 900, color: INK }}>{row.number || `فاکتور #${row.id}`}</Typography>
          <Typography noWrap sx={{ fontSize: 8.3, color: MUTED }}>{row.subject || row.contract_subject || 'فاکتور قرارداد'}</Typography>
        </Box>
        <Chip size="small" label={status.label} sx={{ height: 21, fontSize: 8.4, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
      </Stack>

      <Box sx={{ borderRadius: '11px', p: 0.9, bgcolor: alpha(status.color, 0.035), border: `1px solid ${alpha(status.color, 0.13)}` }}>
        <Typography sx={{ fontSize: 8.1, color: MUTED }}>مبلغ کل فاکتور</Typography>
        <Typography noWrap sx={{ fontSize: 14.5, fontWeight: 900, color: status.color, lineHeight: 1.4 }}>{money(metrics.total, currency)}</Typography>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.25 }}>
          <Typography sx={{ fontSize: 7.8, color: MUTED }}>پرداخت‌شده: {money(metrics.paid, currency)}</Typography>
          <Typography sx={{ fontSize: 7.8, color: metrics.outstanding ? RED : GREEN }}>مانده: {money(metrics.outstanding, currency)}</Typography>
        </Stack>
      </Box>

      <Grid container spacing={0.55}>
        <Grid item xs={6}><MetricBox label="مبلغ" value={money(metrics.amount, currency)} color={INVOICE_DARK} /></Grid>
        <Grid item xs={6}><MetricBox label="مالیات" value={money(metrics.vat, currency)} color={BLUE} /></Grid>
      </Grid>

      <Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.35 }}>
          <Typography sx={{ fontSize: 7.9, color: MUTED }}>پیشرفت پرداخت</Typography>
          <Typography sx={{ fontSize: 8, fontWeight: 800, color: status.color }}>{toPersianDigits(metrics.progress.toFixed(0))}٪</Typography>
        </Stack>
        <ProgressBar value={metrics.progress} color={status.color} height={5} />
      </Box>

      <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap">
        <Chip size="small" icon={<CalendarMonthIcon sx={{ fontSize: '12px !important' }} />}
          label={`تاریخ ${dateLabel(row.date)}`} sx={{ height: 18, fontSize: 7.4, bgcolor: SOFT_BG, color: MUTED, '& .MuiChip-icon': { color: MUTED } }} />
        {row.due_date ? <Chip size="small" icon={<EventBusyIcon sx={{ fontSize: '12px !important' }} />}
          label={`سررسید ${dateLabel(row.due_date)}`} sx={{ height: 18, fontSize: 7.4, bgcolor: alpha(status.color, 0.06), color: status.color, '& .MuiChip-icon': { color: status.color } }} /> : null}
      </Stack>

      <Divider sx={{ mt: 'auto' }} />
      <Stack direction="row" alignItems="center" spacing={0.2}>
        <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => onView(row)} sx={{ fontSize: 8.2, minWidth: 0 }}>جزئیات</Button>
        <Tooltip title={row.is_paid ? 'لغو پرداخت' : 'ثبت به‌عنوان پرداخت‌شده'}>
          <IconButton size="small" onClick={() => onTogglePaid(row)} sx={{ color: row.is_paid ? GREEN : AMBER, p: 0.35 }}>
            {row.is_paid ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <TaskAltIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="ویرایش"><IconButton size="small" onClick={() => onEdit(row)} sx={{ color: MUTED, p: 0.35 }}><EditOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="حذف"><IconButton size="small" onClick={() => onDelete(row)} sx={{ color: RED, p: 0.35 }}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
      </Stack>
    </Paper>
  );
};

export const InvoiceTable = ({ rows, currency, paidByInvoice, onView, onEdit, onDelete, onTogglePaid }) => {
  const theme = useTheme();
  const headSx = { fontWeight: 800, fontSize: 8.6, color: '#334155', bgcolor: '#f8fafc', whiteSpace: 'nowrap', py: 1 };
  const cellSx = { fontSize: 8.8, whiteSpace: 'nowrap', py: 0.8, borderBottom: '1px solid #eef2f7' };
  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 560 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {['شماره', 'شرح', 'تاریخ', 'سررسید', 'مبلغ', 'مالیات', 'کل', 'پرداخت‌شده', 'وضعیت', 'اقدام'].map((label) => (
                <TableCell key={label} sx={headSx} align={label === 'اقدام' ? 'center' : 'right'}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const paid = paidByInvoice[String(row.id)] || 0;
              const metrics = invoiceMetrics(row, paid);
              const status = invoiceStatus(row, paid);
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ ...cellSx, fontWeight: 800 }}>{row.number || '—'}</TableCell>
                  <TableCell sx={{ ...cellSx, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.subject || row.contract_subject || '—'}</TableCell>
                  <TableCell sx={cellSx}>{dateLabel(row.date)}</TableCell>
                  <TableCell sx={cellSx}>{dateLabel(row.due_date)}</TableCell>
                  <TableCell sx={cellSx}>{formatPersianNumber(metrics.amount)}</TableCell>
                  <TableCell sx={cellSx}>{formatPersianNumber(metrics.vat)}</TableCell>
                  <TableCell sx={{ ...cellSx, fontWeight: 900, color: status.color }}>{money(metrics.total, currency)}</TableCell>
                  <TableCell sx={{ ...cellSx, color: metrics.paid ? GREEN : MUTED }}>{money(metrics.paid, currency)}</TableCell>
                  <TableCell sx={cellSx}><InvoiceStatusChip row={row} paidAmount={paid} /></TableCell>
                  <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                    <Tooltip title="جزئیات"><IconButton size="small" onClick={() => onView(row)} sx={{ p: 0.25, color: BLUE }}><VisibilityOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    <Tooltip title={row.is_paid ? 'لغو پرداخت' : 'پرداخت شد'}><IconButton size="small" onClick={() => onTogglePaid(row)} sx={{ p: 0.25, color: row.is_paid ? GREEN : AMBER }}>{row.is_paid ? <CheckCircleIcon sx={{ fontSize: 15 }} /> : <TaskAltIcon sx={{ fontSize: 15 }} />}</IconButton></Tooltip>
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

export const InvoiceContractCard = ({ contract, currency, invoiceCount = 0, onBack }) => (
  <SurfaceCard title="قرارداد" icon={DescriptionIcon} color={INVOICE_ACCENT}
    action={<Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ minWidth: 0, fontSize: 9 }}>تغییر</Button>}>
    <Stack spacing={0.75}>
      <Box>
        <Typography sx={{ fontSize: 12.2, fontWeight: 900, color: INK, lineHeight: 1.6 }}>{contract?.subject || 'قرارداد'}</Typography>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.3 }}>
          <Chip size="small" label={contract?.number || 'بدون شماره'}
            sx={{ height: 20, fontSize: 8.5, fontWeight: 800, bgcolor: alpha(INVOICE_ACCENT, 0.07), color: INVOICE_ACCENT }} />
          {contract?.status_display ? <Chip size="small" label={contract.status_display} sx={{ height: 20, fontSize: 8.5, bgcolor: SOFT_BG, color: MUTED }} /> : null}
        </Stack>
      </Box>
      <Divider />
      <InfoLine label="طرف قرارداد" value={contract?.party_name} />
      <InfoLine label="مبلغ قرارداد" value={money(contract?.amount, currency)} ltr />
      <InfoLine label="تاریخ شروع" value={dateLabel(contract?.start_date)} />
      <InfoLine label="تاریخ پایان" value={dateLabel(contract?.end_date)} />
      <InfoLine label="تعداد فاکتور" value={formatPersianNumber(invoiceCount)} strong />
    </Stack>
  </SurfaceCard>
);

export const InvoiceFinancialCard = ({ totals, currency, isLoading }) => {
  const coverage = totals.total > 0 ? clamp((totals.paid / totals.total) * 100) : 0;
  const color = coverage >= 100 ? GREEN : coverage >= 50 ? AMBER : RED;
  return (
    <SurfaceCard title="پوشش مالی فاکتورها" icon={PaymentsIcon} color={INVOICE_ACCENT}
      action={<Chip size="small" label={`${toPersianDigits(coverage.toFixed(0))}٪`}
        sx={{ height: 21, fontSize: 8.8, fontWeight: 900, bgcolor: alpha(color, 0.08), color }} />}>
      {isLoading ? <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={20} /></Box> : (
        <Stack spacing={1}>
          <Box>
            <Typography sx={{ fontSize: 27, fontWeight: 900, color, lineHeight: 1.1 }}>{toPersianDigits(coverage.toFixed(0))}٪</Typography>
            <Typography sx={{ fontSize: 8.2, color: MUTED, mt: 0.2 }}>نسبت مبالغ پرداخت‌شده به کل فاکتورها</Typography>
            <Box sx={{ mt: 0.7 }}><ProgressBar value={coverage} color={color} height={7} /></Box>
          </Box>
          <Grid container spacing={0.6}>
            <Grid item xs={6}><MetricBox label="کل فاکتورها" value={money(totals.total, currency)} color={INVOICE_ACCENT} /></Grid>
            <Grid item xs={6}><MetricBox label="پرداخت‌شده" value={money(totals.paid, currency)} color={GREEN} /></Grid>
            <Grid item xs={6}><MetricBox label="مانده" value={money(totals.outstanding, currency)} color={totals.outstanding ? RED : INK} /></Grid>
            <Grid item xs={6}><MetricBox label="مالیات" value={money(totals.vat, currency)} color={BLUE} /></Grid>
          </Grid>
          <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`${formatPersianNumber(totals.paidCount)} پرداخت‌شده`} sx={{ height: 19, fontSize: 8.1, bgcolor: '#ecfdf5', color: GREEN }} />
            <Chip size="small" label={`${formatPersianNumber(totals.pendingCount)} در انتظار`} sx={{ height: 19, fontSize: 8.1, bgcolor: '#fffbeb', color: AMBER }} />
            {totals.overdueCount ? <Chip size="small" label={`${formatPersianNumber(totals.overdueCount)} سررسید گذشته`} sx={{ height: 19, fontSize: 8.1, bgcolor: '#fff1f2', color: RED }} /> : null}
          </Stack>
        </Stack>
      )}
    </SurfaceCard>
  );
};

export const InvoiceStatusNav = ({ counts, active, onChange }) => {
  const items = [
    { key: 'all', label: 'همه فاکتورها', icon: ReceiptLongIcon, color: INVOICE_ACCENT },
    { key: 'paid', label: 'پرداخت‌شده', icon: CheckCircleIcon, color: GREEN },
    { key: 'pending', label: 'در انتظار پرداخت', icon: ScheduleIcon, color: AMBER },
    { key: 'overdue', label: 'سررسید گذشته', icon: EventBusyIcon, color: RED },
  ];
  return (
    <SurfaceCard title="وضعیت فاکتورها" icon={TaskAltIcon} color={INVOICE_ACCENT}>
      <Stack spacing={0.45}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <ButtonBase key={item.key} onClick={() => onChange(item.key)}
              sx={{
                width: '100%', p: 0.72, borderRadius: '10px', justifyContent: 'flex-start', textAlign: 'right',
                border: `1px solid ${selected ? alpha(item.color, 0.3) : '#eef2f7'}`,
                bgcolor: selected ? alpha(item.color, 0.05) : '#fff',
                '&:hover': { bgcolor: alpha(item.color, 0.04) },
              }}>
              <Stack direction="row" alignItems="center" spacing={0.65} sx={{ width: '100%' }}>
                <Box sx={{ width: 27, height: 27, borderRadius: '8px', bgcolor: alpha(item.color, 0.08), color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon sx={{ fontSize: 15 }} />
                </Box>
                <Typography sx={{ flex: 1, fontSize: 8.7, fontWeight: selected ? 900 : 700, color: INK }}>{item.label}</Typography>
                <Chip size="small" label={formatPersianNumber(counts[item.key] || 0)} sx={{ height: 19, fontSize: 8, bgcolor: alpha(item.color, 0.08), color: item.color, fontWeight: 900 }} />
              </Stack>
            </ButtonBase>
          );
        })}
      </Stack>
    </SurfaceCard>
  );
};

export const InvoiceLanding = ({
  contractList, invoices, dueRows, paidByInvoice, totalAmount, currency,
  onSelect, onSelectContract,
}) => {
  const invoiceCounts = invoices.reduce((acc, row) => {
    const key = String(row.contract);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const withInvoices = Object.keys(invoiceCounts).length;
  const paidCount = invoices.filter((row) => invoiceStatus(row, paidByInvoice[String(row.id)]).key === 'paid').length;
  return (
    <>
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}><KpiTile icon={DescriptionIcon} label="کل قراردادها" value={formatPersianNumber(contractList.length)} suffix="قرارداد" color={INVOICE_ACCENT} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={ReceiptLongIcon} label="دارای فاکتور" value={formatPersianNumber(withInvoices)} suffix="قرارداد" color={BLUE} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={CheckCircleIcon} label="فاکتور پرداخت‌شده" value={formatPersianNumber(paidCount)} suffix="مورد" color={GREEN} /></Grid>
        <Grid item xs={6} md={3}><KpiTile icon={PaymentsIcon} label="مجموع مبالغ" value={formatPersianNumber(totalAmount)} suffix={currency} color={AMBER} size={16} /></Grid>
      </Grid>
      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={8}>
          <SurfaceCard title="انتخاب قرارداد" icon={ReceiptLongIcon} color={INVOICE_ACCENT}>
            <ContractListPicker
              contracts={contractList}
              onSelect={onSelect}
              height={540}
              accent={INVOICE_ACCENT}
              countLabel="فاکتور"
              countHeaderLabel="تعداد فاکتورها"
              getCount={(contract) => invoiceCounts[String(contract.id)] || 0}
            />
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="در انتظار پرداخت" icon={EventBusyIcon} color={AMBER}
            action={<Chip size="small" label={formatPersianNumber(dueRows.length)} sx={{ height: 21, fontSize: 8.8, bgcolor: '#fffbeb', color: AMBER, fontWeight: 900 }} />}>
            {dueRows.length ? (
              <Stack spacing={0.55}>
                {dueRows.map((row) => {
                  const status = invoiceStatus(row, paidByInvoice[String(row.id)]);
                  const StatusIcon = status.icon;
                  return (
                    <ButtonBase key={row.id} onClick={() => onSelectContract(row.contract)}
                      sx={{
                        width: '100%', p: 0.85, borderRadius: '10px', justifyContent: 'flex-start',
                        border: '1px solid #f1f5f9', bgcolor: '#fff', textAlign: 'right',
                        '&:hover': { bgcolor: '#fffbeb', borderColor: '#fde68a' },
                      }}>
                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ width: '100%' }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: alpha(status.color, 0.08), color: status.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <StatusIcon sx={{ fontSize: 15 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: 9.4, fontWeight: 800, color: INK }}>{row.number || `فاکتور #${row.id}`} · {row.subject || 'فاکتور'}</Typography>
                          <Typography noWrap sx={{ fontSize: 8.2, color: MUTED }}>{dateLabel(row.due_date || row.date)} · {money(invoiceMetrics(row, paidByInvoice[String(row.id)]).total, currency)}</Typography>
                        </Box>
                        <Chip size="small" label={status.label} sx={{ height: 19, fontSize: 7.9, bgcolor: status.bg, color: status.color, fontWeight: 800 }} />
                      </Stack>
                    </ButtonBase>
                  );
                })}
              </Stack>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 30, color: GREEN, mb: 0.6 }} />
                <Typography sx={{ fontSize: 9.5, color: MUTED }}>فاکتور در انتظار پرداختی وجود ندارد.</Typography>
              </Box>
            )}
          </SurfaceCard>
        </Grid>
      </Grid>
    </>
  );
};

export const InvoiceDetailDrawer = ({
  row, contract, currency, paidAmount = 0, payments = [],
  onClose, onEdit, onDelete, onTogglePaid,
}) => {
  const theme = useTheme();
  if (!row) return null;
  const metrics = invoiceMetrics(row, paidAmount);
  const status = invoiceStatus(row, paidAmount);
  const StatusIcon = status.icon;
  const linkedPayments = payments.filter((payment) => String(payment.invoice) === String(row.id));
  const daysToDue = row.due_date
    ? Math.ceil((new Date(`${String(row.due_date).slice(0, 10)}T00:00:00`) - new Date(`${today()}T00:00:00`)) / 86400000)
    : null;
  return (
    <Drawer anchor="left" open={Boolean(row)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 445 }, bgcolor: SOFT_BG } }}>
      <Stack sx={{ height: '100%' }}>
        <Box sx={{ p: 1.75, bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
              bgcolor: alpha(status.color, 0.08), color: status.color,
              border: `1px solid ${alpha(status.color, 0.16)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><StatusIcon sx={{ fontSize: 21 }} /></Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{row.number || `فاکتور #${row.id}`}</Typography>
              <Typography noWrap sx={{ fontSize: 9.3, color: MUTED }}>{row.subject || row.contract_subject || 'فاکتور قرارداد'} · {dateLabel(row.date)}</Typography>
            </Box>
            <Chip size="small" label={status.label} sx={{ height: 21, fontSize: 8.5, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
          <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={money(metrics.total, currency)} sx={{ height: 21, fontSize: 8.5, fontWeight: 900, bgcolor: alpha(status.color, 0.08), color: status.color }} />
            {row.due_date ? <Chip size="small" label={`سررسید ${dateLabel(row.due_date)}`} sx={{ height: 21, fontSize: 8.2, bgcolor: alpha(status.color, 0.06), color: status.color }} /> : null}
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1.4}>
            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={PaymentsIcon} title="مشخصات مالی" color={status.color} />
              <Box sx={{ p: 1, borderRadius: '11px', bgcolor: alpha(status.color, 0.04), border: `1px solid ${alpha(status.color, 0.12)}`, mb: 0.8 }}>
                <Typography sx={{ fontSize: 8.2, color: MUTED }}>مبلغ کل فاکتور</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 900, color: status.color, lineHeight: 1.4 }}>{money(metrics.total, currency)}</Typography>
                <Box sx={{ mt: 0.6 }}><ProgressBar value={metrics.progress} color={status.color} height={6} /></Box>
              </Box>
              <InfoLine label="مبلغ پایه" value={money(metrics.amount, currency)} ltr />
              <InfoLine label="مالیات / ارزش افزوده" value={money(metrics.vat, currency)} ltr color={BLUE} />
              <InfoLine label="پرداخت‌شده" value={money(metrics.paid, currency)} ltr color={GREEN} />
              <InfoLine label="مانده پرداخت" value={money(metrics.outstanding, currency)} ltr color={metrics.outstanding ? RED : GREEN} />
              <InfoLine label="وضعیت پرداخت" value={row.is_paid ? 'پرداخت شده' : 'در انتظار پرداخت'} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={CalendarMonthIcon} title="تاریخ‌ها" color={BLUE} />
              <InfoLine label="تاریخ فاکتور" value={dateLabel(row.date)} />
              <InfoLine label="تاریخ سررسید" value={dateLabel(row.due_date)} strong />
              <InfoLine label="مانده تا سررسید"
                value={daysToDue === null ? '—' : daysToDue < 0 ? `${toPersianDigits(Math.abs(daysToDue))} روز گذشته` : daysToDue === 0 ? 'امروز' : `${toPersianDigits(daysToDue)} روز`} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={DescriptionIcon} title="قرارداد" color={INVOICE_ACCENT} />
              <InfoLine label="قرارداد" value={row.contract_subject || contract?.subject} />
              <InfoLine label="شماره قرارداد" value={contract?.number} />
              <InfoLine label="طرف قرارداد" value={contract?.party_name} />
            </Paper>

            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={PaymentsIcon} title="پرداخت‌های مرتبط" color={GREEN}
                action={<Chip size="small" label={formatPersianNumber(linkedPayments.length)} sx={{ height: 19, fontSize: 7.8, bgcolor: '#ecfdf5', color: GREEN }} />} />
              {linkedPayments.length ? (
                <Stack spacing={0.5}>
                  {linkedPayments.map((payment) => (
                    <Stack key={payment.id} direction="row" alignItems="center" spacing={0.6} sx={{ p: 0.6, borderRadius: '9px', bgcolor: '#fff', border: '1px solid #eef2f7' }}>
                      <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: '#ecfdf5', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PaymentsIcon sx={{ fontSize: 14 }} /></Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 8.8, fontWeight: 800, color: INK }}>{payment.reference || payment.method || 'پرداخت'}</Typography>
                        <Typography sx={{ fontSize: 7.8, color: MUTED }}>{dateLabel(payment.date)}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 8.8, fontWeight: 900, color: GREEN }}>{money(payment.amount, currency)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : <Typography sx={{ fontSize: 8.5, color: MUTED }}>پرداختی به این فاکتور پیوند نشده است.</Typography>}
            </Paper>

            {row.description ? (
              <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeading icon={DescriptionIcon} title="توضیحات" color={MUTED} />
                <Typography sx={{ fontSize: 8.9, color: INK, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{row.description}</Typography>
              </Paper>
            ) : null}
          </Stack>
        </Box>

        <Divider />
        <Stack direction="row" spacing={0.6} sx={{ p: 1.4, bgcolor: theme.palette.background.paper }}>
          <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(row)} sx={{ flex: 1 }}>ویرایش</Button>
          <Tooltip title={row.is_paid ? 'لغو پرداخت' : 'پرداخت شد'}>
            <Button variant="outlined" onClick={() => onTogglePaid(row)} sx={{ minWidth: 40, px: 1 }}>{row.is_paid ? <CheckCircleIcon fontSize="small" /> : <TaskAltIcon fontSize="small" />}</Button>
          </Tooltip>
          <Tooltip title="حذف"><Button color="error" variant="outlined" onClick={() => onDelete(row)} sx={{ minWidth: 40, px: 1 }}><DeleteOutlineIcon fontSize="small" /></Button></Tooltip>
        </Stack>
      </Stack>
    </Drawer>
  );
};

export const InvoiceEditorDialog = ({
  open, onClose, form, setForm, currencyList, contract, paidAmount = 0,
  error, setError, saving, onSave,
}) => {
  const selectedCurrency = currencyList.find((item) => String(item.id) === String(form.currency));
  const currencyLabel = normalizeCurrencyLabel(selectedCurrency?.name || selectedCurrency?.symbol || contract?.currency_name || 'ریال');
  const total = n(form.amount) + n(form.vat);
  const effectivePaid = form.is_paid ? total : n(paidAmount);
  const outstanding = Math.max(0, total - effectivePaid);
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.2, px: 2.5, py: 1.7,
        background: 'linear-gradient(120deg, rgba(139,92,246,0.13), rgba(99,102,241,0.06), rgba(255,255,255,0.5))',
        borderBottom: `1px solid ${alpha(INVOICE_ACCENT, 0.14)}`,
      }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: INVOICE_ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ReceiptLongIcon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{form.id ? 'ویرایش فاکتور' : 'ثبت فاکتور جدید'}</Typography>
          <Typography noWrap sx={{ fontSize: 8.8, color: MUTED }}>{contract?.subject || 'قرارداد'} · {form.number || 'شماره‌گذاری خودکار'}</Typography>
        </Box>
        <Chip size="small" label={form.is_paid ? 'پرداخت شده' : 'در انتظار پرداخت'}
          sx={{ height: 22, fontSize: 8.3, fontWeight: 800, bgcolor: form.is_paid ? '#ecfdf5' : '#fffbeb', color: form.is_paid ? GREEN : AMBER }} />
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.3, display: 'flex', flexDirection: 'column', gap: 1.6 }}>
        {error ? <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px', fontSize: 10 }}>{error}</Alert> : null}

        <Box sx={{
          display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr 1fr 1fr' }, gap: 0.7,
          p: 1, borderRadius: '12px', bgcolor: SOFT_BG, border: '1px solid #e8eef2',
        }}>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>قرارداد</Typography><Typography noWrap sx={{ fontSize: 9.2, fontWeight: 800, color: INK }}>{contract?.subject || '—'}</Typography></Box>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>مبلغ کل</Typography><Typography noWrap sx={{ fontSize: 9.8, fontWeight: 900, color: INVOICE_ACCENT }}>{money(total, currencyLabel)}</Typography></Box>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>پرداخت‌شده</Typography><Typography noWrap sx={{ fontSize: 9.8, fontWeight: 900, color: GREEN }}>{money(effectivePaid, currencyLabel)}</Typography></Box>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>مانده</Typography><Typography sx={{ fontSize: 9.8, fontWeight: 900, color: outstanding ? RED : GREEN }}>{money(outstanding, currencyLabel)}</Typography></Box>
        </Box>

        <Box>
          <SectionHeading icon={DescriptionIcon} title="اطلاعات پایه" color={INVOICE_ACCENT} />
          <Grid container spacing={1.1}>
            <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="شماره فاکتور" value={form.number || ''} onChange={(event) => update('number', event.target.value)} /></Grid>
            <Grid item xs={12} sm={8}><TextField size="small" fullWidth label="شرح فاکتور" value={form.subject || ''} onChange={(event) => update('subject', event.target.value)} /></Grid>
            <Grid item xs={12} sm={6}><JalaliDatePicker fullWidth label="تاریخ فاکتور" value={form.date || ''} onChange={(value) => update('date', value)} /></Grid>
            <Grid item xs={12} sm={6}><JalaliDatePicker fullWidth label="تاریخ سررسید" value={form.due_date || ''} onChange={(value) => update('due_date', value)} /></Grid>
          </Grid>
        </Box>

        <Divider />
        <Box>
          <SectionHeading icon={PaymentsIcon} title="مبالغ و ارز" color={GREEN} />
          <Grid container spacing={1.1}>
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>واحد ارز</InputLabel>
                <Select value={form.currency || ''} label="واحد ارز" onChange={(event) => update('currency', event.target.value)}>
                  <MenuItem value="">—</MenuItem>
                  {currencyList.map((currency) => <MenuItem key={currency.id} value={currency.id}>{normalizeCurrencyLabel(currency.name || currency.symbol)} ({currency.code})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}><MoneyInput size="small" fullWidth label={`مبلغ (${currencyLabel})`} value={form.amount ?? 0} onChange={(value) => update('amount', value)} /></Grid>
            <Grid item xs={12} sm={4}><MoneyInput size="small" fullWidth label={`مالیات (${currencyLabel})`} value={form.vat ?? 0} onChange={(value) => update('vat', value)} /></Grid>
            <Grid item xs={12}>
              <Box sx={{ p: 1.15, borderRadius: '12px', bgcolor: alpha(GREEN, 0.05), border: `1px solid ${alpha(GREEN, 0.16)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box><Typography sx={{ fontSize: 8.4, color: MUTED }}>مبلغ کل فاکتور</Typography><Typography sx={{ fontSize: 16, fontWeight: 900, color: GREEN }}>{money(total, currencyLabel)}</Typography></Box>
                <Box sx={{ textAlign: 'left' }}><Typography sx={{ fontSize: 8.4, color: MUTED }}>مانده پرداخت</Typography><Typography sx={{ fontSize: 12, fontWeight: 900, color: outstanding ? RED : GREEN }}>{money(outstanding, currencyLabel)}</Typography></Box>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
          <FormControlLabel control={<Switch checked={Boolean(form.is_paid)} onChange={(event) => update('is_paid', event.target.checked)} />}
            label={<Typography sx={{ fontSize: 9.5, fontWeight: 800, color: INK }}>این فاکتور پرداخت شده است</Typography>} />
          <Box sx={{ flex: 1 }} />
          <TextField size="small" sx={{ minWidth: { xs: '100%', sm: 360 } }} label="توضیحات" value={form.description || ''}
            onChange={(event) => update('description', event.target.value)} />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.4, py: 1.4, borderTop: '1px solid #e5ebf0' }}>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" onClick={onSave} disabled={saving || !form.contract || total <= 0}
          startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <SaveIcon />}
          sx={{ px: 2.5, bgcolor: INVOICE_ACCENT, '&:hover': { bgcolor: '#7c3aed' } }}>
          {saving ? 'در حال ذخیره…' : 'ذخیره فاکتور'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
