import React from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Drawer, FormControl, FormControlLabel,
  Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Switch,
  TextField,
  Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
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
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../../core/utils/numberUtils';
import ContractListPicker from '../../core/components/ui/ContractListPicker';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import MoneyInput from '../../core/components/ui/MoneyInput';
import { ProgressBar, INK, MUTED, SOFT_BG } from '../accounting/AccountingDashboardUI';
import { InfoLine, SectionHeading, dateLabel, money } from './StatementWorkspaceUI';

export const INVOICE_ACCENT = '#8b5cf6';
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
  return <Chip size="small" label={status.label} sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: status.bg, color: status.color }} />;
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
              <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{row.subject || row.contract_subject || 'فاکتور قرارداد'} · {dateLabel(row.date)}</Typography>
            </Box>
            <Chip size="small" label={status.label} sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
          <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={money(metrics.total, currency)} sx={{ height: 21, fontSize: 12, fontWeight: 900, bgcolor: alpha(status.color, 0.08), color: status.color }} />
            {row.due_date ? <Chip size="small" label={`سررسید ${dateLabel(row.due_date)}`} sx={{ height: 21, fontSize: 12, bgcolor: alpha(status.color, 0.06), color: status.color }} /> : null}
          </Stack>
        </Box>

        <Box sx={{ p: 1.5, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={1.4}>
            <Paper elevation={0} sx={{ p: 1.4, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionHeading icon={PaymentsIcon} title="مشخصات مالی" color={status.color} />
              <Box sx={{ p: 1, borderRadius: '11px', bgcolor: alpha(status.color, 0.04), border: `1px solid ${alpha(status.color, 0.12)}`, mb: 0.8 }}>
                <Typography sx={{ fontSize: 12, color: MUTED }}>مبلغ کل فاکتور</Typography>
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
                action={<Chip size="small" label={formatPersianNumber(linkedPayments.length)} sx={{ height: 19, fontSize: 12, bgcolor: '#ecfdf5', color: GREEN }} />} />
              {linkedPayments.length ? (
                <Stack spacing={0.5}>
                  {linkedPayments.map((payment) => (
                    <Stack key={payment.id} direction="row" alignItems="center" spacing={0.6} sx={{ p: 0.6, borderRadius: '9px', bgcolor: '#fff', border: '1px solid #eef2f7' }}>
                      <Box sx={{ width: 26, height: 26, borderRadius: '7px', bgcolor: '#ecfdf5', color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PaymentsIcon sx={{ fontSize: 14 }} /></Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{payment.reference || payment.method || 'پرداخت'}</Typography>
                        <Typography sx={{ fontSize: 12, color: MUTED }}>{dateLabel(payment.date)}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 900, color: GREEN }}>{money(payment.amount, currency)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : <Typography sx={{ fontSize: 12, color: MUTED }}>پرداختی به این فاکتور پیوند نشده است.</Typography>}
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
          <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{contract?.subject || 'قرارداد'} · {form.number || 'شماره‌گذاری خودکار'}</Typography>
        </Box>
        <Chip size="small" label={form.is_paid ? 'پرداخت شده' : 'در انتظار پرداخت'}
          sx={{ height: 22, fontSize: 12, fontWeight: 800, bgcolor: form.is_paid ? '#ecfdf5' : '#fffbeb', color: form.is_paid ? GREEN : AMBER }} />
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.3, display: 'flex', flexDirection: 'column', gap: 1.6 }}>
        {error ? <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px', fontSize: 12 }}>{error}</Alert> : null}

        <Box sx={{
          display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr 1fr 1fr' }, gap: 0.7,
          p: 1, borderRadius: '12px', bgcolor: SOFT_BG, border: '1px solid #e8eef2',
        }}>
          <Box><Typography sx={{ fontSize: 12, color: MUTED }}>قرارداد</Typography><Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{contract?.subject || '—'}</Typography></Box>
          <Box><Typography sx={{ fontSize: 12, color: MUTED }}>مبلغ کل</Typography><Typography noWrap sx={{ fontSize: 12, fontWeight: 900, color: INVOICE_ACCENT }}>{money(total, currencyLabel)}</Typography></Box>
          <Box><Typography sx={{ fontSize: 12, color: MUTED }}>پرداخت‌شده</Typography><Typography noWrap sx={{ fontSize: 12, fontWeight: 900, color: GREEN }}>{money(effectivePaid, currencyLabel)}</Typography></Box>
          <Box><Typography sx={{ fontSize: 12, color: MUTED }}>مانده</Typography><Typography sx={{ fontSize: 12, fontWeight: 900, color: outstanding ? RED : GREEN }}>{money(outstanding, currencyLabel)}</Typography></Box>
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
                <Box><Typography sx={{ fontSize: 12, color: MUTED }}>مبلغ کل فاکتور</Typography><Typography sx={{ fontSize: 16, fontWeight: 900, color: GREEN }}>{money(total, currencyLabel)}</Typography></Box>
                <Box sx={{ textAlign: 'left' }}><Typography sx={{ fontSize: 12, color: MUTED }}>مانده پرداخت</Typography><Typography sx={{ fontSize: 12, fontWeight: 900, color: outstanding ? RED : GREEN }}>{money(outstanding, currencyLabel)}</Typography></Box>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
          <FormControlLabel control={<Switch checked={Boolean(form.is_paid)} onChange={(event) => update('is_paid', event.target.checked)} />}
            label={<Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>این فاکتور پرداخت شده است</Typography>} />
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