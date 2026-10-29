import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl,
  Grid, IconButton, InputLabel, MenuItem, Paper, Select,
  Snackbar, Stack, Table,
  TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import MoneyInput from '../core/components/ui/MoneyInput';
import { INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import { formatPersianNumber, formatStatementNumber, normalizeCurrencyLabel, toPersianDigits } from '../core/utils/numberUtils';
import { getJalaliParts, toJalali } from '../core/utils/dateUtils';
import {
  CONTRACT_STATUS_LABELS as STATUS_LABELS,
  CONTRACT_STATUS_COLORS as STATUS_COLORS,
} from '../core/theme/tokens';
import { contractRateOf } from './contracts/contractFinanceSummary';
import { adjustmentSummaryOf, statementDisplayTitle, statementKindOf } from './contracts/statementKinds';
import {
  ContractPickerLanding, ModulePager, ModuleTable, ModuleToolbar, moneyCell,
  useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

const TEAL = '#0f766e';
const BLUE = '#2563eb';
const VIOLET = '#7c3aed';
const AMBER = '#b45309';
const GREEN = '#15803d';
const RED = '#be123c';
const SLATE = '#475569';
const PALETTE = [TEAL, BLUE, VIOLET, AMBER, '#0e7490', '#be185d', '#4f46e5', '#15803d'];
const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const PAYMENT_TYPES = [
  {
    key: 'normal',
    label: 'پرداخت عادی',
    shortLabel: 'عادی',
    color: TEAL,
    hint: 'پرداخت بر اساس صورت‌وضعیت، فاکتور یا به‌صورت عمومی.',
  },
  {
    key: 'advance',
    label: 'پیش‌پرداخت',
    shortLabel: 'پیش‌پرداخت',
    color: AMBER,
    hint: 'پرداخت قبل از انجام کار یا پیش از ثبت صورت‌وضعیت؛ به صورت‌وضعیت متصل نمی‌شود.',
  },
  {
    key: 'on_account',
    label: 'علی‌الحساب',
    shortLabel: 'علی‌الحساب',
    color: VIOLET,
    hint: 'پرداخت بدون تخصیص به صورت‌وضعیت مشخص؛ برای تسویه/تخصیص در آینده.',
  },
];

const PAYMENT_TYPE_META = PAYMENT_TYPES.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const paymentTypeOf = (row = {}) => (
  PAYMENT_TYPE_META[row?.payment_type] || PAYMENT_TYPE_META.normal
);

const EMPTY = {
  id: null, contract: '', invoice: '', statement: '', date: '', currency: '',
  amount: '', payment_type: 'normal', reference: '', method: '', note: '',
};

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const asArray = (value) => (Array.isArray(value) ? value : []);
const paymentCurrency = (payment, fallback) => normalizeCurrencyLabel(
  payment?.currency_name || payment?.currency_symbol || fallback,
);

/** اطلاعات ارزی صورت‌وضعیت؛ برای صورت‌وضعیت ریالی هیچ معادل ارزی نمایش داده نمی‌شود. */
const statementInfo = (row = {}, fallbackRate = 1, fallbackCurrency = 'ریال') => {
  const raw = String(row?.statement_currency_name || '').trim();
  const isRialStatement = Boolean(row?.statement) && Boolean(raw) && normalizeCurrencyLabel(raw) === 'ریال';
  const ownRate = Number(row?.statement_exchange_rate);
  const fallback = Number(fallbackRate);
  const rate = isRialStatement ? 1 : (ownRate > 1 ? ownRate : (fallback > 1 ? fallback : 1));
  return {
    rate,
    showForeign: rate > 1,
    isRialStatement,
    currency: raw ? normalizeCurrencyLabel(raw) : normalizeCurrencyLabel(fallbackCurrency),
  };
};

const paymentStatementKind = (row = {}) => statementKindOf(row.statement_kind);
const paymentStatementTitle = (row = {}) => statementDisplayTitle(
  { kind: row.statement_kind || 'statement', number: row.statement_number },
);
const paymentStatementNetLabel = (row = {}) => (
  paymentStatementKind(row).isAdjustment ? 'قابل پرداخت تعدیل' : 'قابل پرداخت صورت‌وضعیت'
);
const contractAmountOf = (contract) => num(contract?.effective_amount ?? contract?.amount);
const statusLabel = (status) => STATUS_LABELS[status] || status || '—';
const statusColor = (status) => STATUS_COLORS[status] || SLATE;
const methodColor = (method) => {
  const text = String(method || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash += text.charCodeAt(index);
  return PALETTE[hash % PALETTE.length];
};
const isSameMonth = (value, year, month) => {
  if (!value) return false;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month;
};
const fileSizeLabel = (bytes) => {
  const size = num(bytes);
  if (size >= 1024 * 1024) return `${formatPersianNumber((size / (1024 * 1024)).toFixed(1))} مگابایت`;
  if (size >= 1024) return `${formatPersianNumber((size / 1024).toFixed(0))} کیلوبایت`;
  return `${formatPersianNumber(size)} بایت`;
};

const InfoLine = ({ label, value, strong, ltr, color }) => {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ py: 0.42 }}>
      <Typography sx={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{
        fontSize: strong ? 10.5 : 9.6, fontWeight: strong ? 900 : 700, color: color || INK,
        textAlign: 'left', direction: ltr ? 'ltr' : 'rtl', minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={typeof display === 'string' ? display : undefined}>{display}</Typography>
    </Stack>
  );
};

const SectionHeading = ({ icon: Icon, title, color = TEAL, action }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.9 }}>
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

const PaymentDetailDrawer = ({ payment, currency, contractRate = 1, contract, onClose, onEdit, onDelete }) => {
  const open = Boolean(payment);
  const row = payment || {};
  const info = statementInfo(row, contractRate, currency);
  const rate = info.rate;
  const foreign = info.showForeign ? num(row.amount) / rate : null;
  const statementForeign = info.showForeign && row.statement_amount
    ? (row.statement_foreign_amount != null ? num(row.statement_foreign_amount) : num(row.statement_amount) / rate)
    : null;
  const statementNetForeign = info.showForeign && row.statement_net_amount ? num(row.statement_net_amount) / rate : null;
  const color = methodColor(row.method);
  const typeMeta = paymentTypeOf(row);
  return (
    <Drawer anchor="left" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, bgcolor: '#f8fafc' } }}>
      {payment ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          <Box sx={{
            p: 2.2, color: '#fff', position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${TEAL}, #115e59 62%, #134e4a)`,
            '&::after': { content: '""', position: 'absolute', width: 180, height: 180, borderRadius: '50%', top: -100, left: -60, bgcolor: 'rgba(255,255,255,0.06)' },
          }}>
            <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '11px', bgcolor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PaymentsOutlinedIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>جزئیات پرداخت قرارداد</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 900 }}>{formatPersianNumber(row.amount || 0)} <Box component="span" sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>ریال</Box></Typography>
                {foreign !== null ? <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.68)' }}>≈ {formatPersianNumber(foreign)} {info.currency}</Typography> : null}
                <Typography sx={{ mt: 0.2, fontSize: 12, color: 'rgba(255,255,255,0.58)' }}>{toJalali(row.date)}</Typography>
              </Box>
              <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.8)', mt: -0.4 }}><CloseOutlinedIcon fontSize="small" /></IconButton>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ mt: 1.2, position: 'relative', zIndex: 1 }}>
              <Chip size="small" label={typeMeta.label} sx={{ height: 20, fontSize: 12, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.13)', color: '#fff' }} />
              {row.method ? <Chip size="small" label={row.method} sx={{ height: 20, fontSize: 12, bgcolor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.8)' }} /> : null}
            </Stack>
          </Box>

          <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
            <Box sx={{ mb: 1.8 }}>
              <SectionHeading icon={PaymentsOutlinedIcon} title="اطلاعات پرداخت" color={color} />
              <InfoLine label="مبلغ پرداخت (ریال)" value={`${formatPersianNumber(row.amount || 0)} ریال`} strong color={TEAL} />
              {foreign !== null ? <InfoLine label="معادل ارزی پرداخت" value={`${formatPersianNumber(foreign)} ${info.currency}`} /> : null}
              {info.showForeign ? <InfoLine label="نرخ تسعیر" value={`${formatPersianNumber(rate)} ریال`} /> : null}
              <InfoLine label="تاریخ پرداخت" value={toJalali(row.date)} />
              <InfoLine label="نوع پرداخت" value={typeMeta.label} color={typeMeta.color} />
              <InfoLine label="روش پرداخت" value={row.method || '—'} />
              <InfoLine label="شماره مرجع / سند" value={row.reference || '—'} ltr />
              {info.showForeign ? <InfoLine label="واحد ارز مرجع" value={info.currency} /> : null}
            </Box>
            <Divider />
            <Box sx={{ my: 1.8 }}>
              <SectionHeading icon={LinkOutlinedIcon} title="پیوندهای پرونده" color={VIOLET} />
              <InfoLine label="فاکتور مرتبط" value={row.invoice_number || '—'} />
              <InfoLine label="صورت‌وضعیت / تعدیل مرتبط" value={paymentStatementTitle(row) || '—'} />
              {row.statement_amount ? (
                <InfoLine label={paymentStatementKind(row).isAdjustment ? 'مبلغ تجمعی صورت‌وضعیت (بدون تغییر)' : 'مبلغ تجمعی صورت‌وضعیت (ریال)'} value={`${formatPersianNumber(row.statement_amount)} ریال`} />
              ) : null}
              {row.statement_adjustment_work_done ? (
                <InfoLine label="مبلغ تعدیل این دوره" value={`${formatPersianNumber(row.statement_adjustment_work_done)} ریال`} color={paymentStatementKind(row).color} />
              ) : null}
              {row.statement_adjustment_amount ? (
                <InfoLine label="تعدیل تجمعی" value={`${formatPersianNumber(row.statement_adjustment_amount)} ریال`} color={paymentStatementKind(row).color} />
              ) : null}
              {statementForeign !== null ? (
                <InfoLine label="معادل ارزی مبلغ تجمعی" value={`${formatPersianNumber(statementForeign)} ${info.currency}`} />
              ) : null}
              {row.statement_net_amount ? (
                <InfoLine label={`${paymentStatementNetLabel(row)} (ریال)`} value={`${formatPersianNumber(row.statement_net_amount)} ریال`} strong color={GREEN} />
              ) : null}
              {statementNetForeign !== null ? (
                <InfoLine label="قابل پرداخت ارزی" value={`${formatPersianNumber(statementNetForeign)} ${info.currency}`} color={GREEN} />
              ) : null}
              {info.showForeign ? (
                <InfoLine label="نرخ صورت‌وضعیت" value={`${formatPersianNumber(rate)} ریال`} />
              ) : null}
              <InfoLine label="پرونده قرارداد" value={contract?.number || '—'} ltr />
            </Box>
            <Divider />
            <Box sx={{ my: 1.8 }}>
              <SectionHeading icon={DescriptionOutlinedIcon} title="قرارداد" color={BLUE} />
              <InfoLine label="موضوع" value={contract?.subject || '—'} />
              <InfoLine label="طرف قرارداد" value={contract?.party_name || '—'} />
              <InfoLine label="مبلغ قرارداد" value={`${formatPersianNumber(contractAmountOf(contract))} ${currency}`} />
              {contractRate > 1 ? <InfoLine label="معادل ریالی قرارداد" value={`${formatPersianNumber(contractAmountOf(contract) * contractRate)} ریال`} /> : null}
              <InfoLine label="وضعیت" value={statusLabel(contract?.status)} color={statusColor(contract?.status)} />
            </Box>
            <Divider />
            <Box sx={{ my: 1.8 }}>
              <SectionHeading icon={AttachFileOutlinedIcon} title="فایل‌های پیوست" color={TEAL}
                action={<Chip size="small" label={formatPersianNumber(asArray(row.attachments).length)}
                  sx={{ height: 19, fontSize: 12, bgcolor: alpha(TEAL, 0.07), color: TEAL }} />} />
              {!asArray(row.attachments).length ? (
                <Typography sx={{ fontSize: 12, color: MUTED }}>فایلی پیوست نشده است.</Typography>
              ) : (
                <Stack spacing={0.55}>
                  {asArray(row.attachments).map((attachment) => (
                    <Stack key={attachment.id} direction="row" alignItems="center" spacing={0.6}
                      sx={{ p: 0.65, borderRadius: '9px', border: '1px solid #e6edf1', bgcolor: '#fff' }}>
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: 16, color: TEAL }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, color: INK }}>{attachment.title || attachment.file_name || 'فایل پیوست'}</Typography>
                        <Typography sx={{ fontSize: 12, color: MUTED }}>{fileSizeLabel(attachment.size)}</Typography>
                      </Box>
                      {attachment.file_url ? (
                        <Tooltip title="دانلود">
                          <IconButton size="small" component="a" href={attachment.file_url} target="_blank" rel="noreferrer" sx={{ color: BLUE, p: 0.35 }}>
                            <DownloadOutlinedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
            <Divider />
            <Box sx={{ mt: 1.8 }}>
              <SectionHeading icon={DescriptionOutlinedIcon} title="توضیحات" color={SLATE} />
              <Typography sx={{ fontSize: 12, color: row.note ? INK : MUTED, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                {row.note || 'برای این پرداخت توضیحی ثبت نشده است.'}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={0.8} sx={{ p: 1.6, borderTop: '1px solid #e5ebf0', bgcolor: '#fff' }}>
            <Button fullWidth variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(row)}
              sx={{ fontSize: 12, color: BLUE, borderColor: alpha(BLUE, 0.25) }}>ویرایش</Button>
            <Button fullWidth variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onDelete(row)}
              sx={{ fontSize: 12 }}>حذف</Button>
          </Stack>
        </Box>
      ) : null}
    </Drawer>
  );
};


const PaymentEditorDialog = ({
  open, onClose, form, setForm, invoiceList, statementList, currencyList,
  fallbackCurrency, error, saving, onSave, pendingFiles = [], existingAttachments = [],
  onPickFiles, onRemovePending, onDeleteAttachment, attachmentBusy, contract, uploading,
}) => {
  const selectedCurrency = currencyList.find((item) => String(item.id) === String(form.currency));
  const label = normalizeCurrencyLabel(selectedCurrency?.name || fallbackCurrency);
  const typeMeta = paymentTypeOf(form);
  const isNormalType = typeMeta.key === 'normal';
  const referenceRate = Number(selectedCurrency?.exchange_rate) > 1 ? Number(selectedCurrency.exchange_rate) : 1;
  const selectedStatement = statementList.find((item) => String(item.id) === String(form.statement));
  const selectedKind = statementKindOf(selectedStatement);
  const selectedAdjustmentAmount = Number(selectedStatement?.adjustment_amount || 0);
  const hideReferenceForeign = Boolean(selectedStatement) && statementInfo(
    { ...selectedStatement, statement: selectedStatement.id }, 1, label,
  ).isRialStatement;
  const referenceForeign = referenceRate > 1 && !hideReferenceForeign ? num(form.amount) / referenceRate : null;
  const selectedStatementInfo = statementInfo(
    selectedStatement ? { ...selectedStatement, statement: selectedStatement.id } : null,
    1,
    label,
  );
  const selectedStatementForeign = selectedStatementInfo.showForeign && selectedStatement?.amount
    ? (selectedStatement.foreign_amount != null
      ? num(selectedStatement.foreign_amount)
      : num(selectedStatement.amount) / selectedStatementInfo.rate)
    : null;
  const selectedStatementNetForeign = selectedStatementInfo.showForeign && selectedStatement?.net_amount
    ? num(selectedStatement.net_amount) / selectedStatementInfo.rate
    : null;
  const selectedStatementPayable = selectedStatement?.net_amount ?? selectedStatement?.amount;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.2, px: 2.5, py: 1.7,
        background: 'linear-gradient(120deg, rgba(15,118,110,0.13), rgba(37,99,235,0.06), rgba(255,255,255,0.5))',
        borderBottom: `1px solid ${alpha(TEAL, 0.14)}`,
      }}>
        <Avatar sx={{ width: 42, height: 42, bgcolor: TEAL, color: '#fff' }}><PaymentsOutlinedIcon /></Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>
            {form.id ? `ویرایش ${typeMeta.label}` : `ثبت ${typeMeta.label} جدید`}
          </Typography>
          <Typography sx={{ fontSize: 12, color: MUTED }}>{typeMeta.hint}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseOutlinedIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.8 }}>
        <Box sx={{
          display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr 1fr' }, gap: 0.8,
          p: 1.1, borderRadius: '12px', bgcolor: SOFT_BG, border: '1px solid #e8eef2',
        }}>
          <Box>
            <Typography sx={{ fontSize: 12, color: MUTED }}>قرارداد</Typography>
            <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{contract?.subject || '—'}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, color: MUTED }}>مبلغ پرداخت (ریال)</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: TEAL }}>
              {form.amount ? `${formatPersianNumber(form.amount)} ریال` : '—'}
            </Typography>
            {referenceForeign !== null ? (
              <Typography sx={{ fontSize: 12, color: MUTED }}>≈ {formatPersianNumber(referenceForeign)} {label}</Typography>
            ) : null}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, color: MUTED }}>پیوست‌ها</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK }}>
              {formatPersianNumber(pendingFiles.length + existingAttachments.length)} فایل
            </Typography>
          </Box>
        </Box>

        {error ? <Alert severity="error" sx={{ borderRadius: '10px', fontSize: 12 }}>{error}</Alert> : null}

        <Box>
          <SectionHeading icon={CalendarMonthOutlinedIcon} title="اطلاعات اصلی" color={TEAL} />
          <Grid container spacing={1.4}>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>نوع پرداخت</InputLabel>
                <Select value={form.payment_type || 'normal'} label="نوع پرداخت"
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setForm((previous) => ({
                      ...previous,
                      payment_type: nextType,
                      ...(nextType === 'normal' ? {} : { statement: '' }),
                    }));
                  }}>
                  {PAYMENT_TYPES.map((option) => (
                    <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography sx={{ mt: 0.4, fontSize: 12, color: MUTED }}>{typeMeta.hint}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ پرداخت" value={form.date} onChange={(value) => setForm((previous) => ({ ...previous, date: value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>فاکتور مرتبط</InputLabel>
                <Select value={form.invoice || ''} label="فاکتور مرتبط" onChange={(event) => setForm((previous) => ({ ...previous, invoice: event.target.value }))}>
                  <MenuItem value="">— بدون فاکتور —</MenuItem>
                  {invoiceList.map((invoice) => <MenuItem key={invoice.id} value={invoice.id}>{invoice.number || invoice.subject || `فاکتور ${invoice.id}`}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            {isNormalType ? (
              <Grid item xs={12}>
                <FormControl size="small" fullWidth>
                  <InputLabel>صورت‌وضعیت مرتبط</InputLabel>
                  <Select value={form.statement || ''} label="صورت‌وضعیت مرتبط" onChange={(event) => setForm((previous) => ({ ...previous, statement: event.target.value }))}>
                    <MenuItem value="">— بدون صورت‌وضعیت —</MenuItem>
                    {statementList.map((statement) => {
                      const info = statementInfo({ ...statement, statement: statement.id }, 1, label);
                      const payable = statement.net_amount ?? statement.amount;
                      const cumulativeForeign = info.showForeign && statement.amount
                        ? (statement.foreign_amount != null
                          ? num(statement.foreign_amount)
                          : num(statement.amount) / info.rate)
                        : null;
                      return (
                        <MenuItem key={statement.id} value={statement.id}>
                          {statementDisplayTitle(statement) || `صورت‌وضعیت ${toPersianDigits(statement.id)}`} · قابل پرداخت {formatPersianNumber(payable || 0)} ریال
                          {cumulativeForeign !== null ? ` · ${formatPersianNumber(cumulativeForeign)} ${info.currency}` : ''}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Grid>
            ) : null}
          </Grid>
        </Box>
        {selectedStatement ? (
          <Box sx={{ p: 1.1, borderRadius: '12px', bgcolor: alpha(BLUE, 0.035), border: `1px solid ${alpha(BLUE, 0.13)}` }}>
            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.8 }}>
              <LinkOutlinedIcon sx={{ fontSize: 17, color: BLUE }} />
              <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 900, color: INK }}>
                {statementDisplayTitle(selectedStatement) || toPersianDigits(selectedStatement.id)}
              </Typography>
              <Chip size="small" label={selectedKind.label}
                sx={{ height: 19, fontSize: 12, bgcolor: alpha(selectedKind.color, 0.08), color: selectedKind.color }} />
              <Chip size="small" label={selectedStatementInfo.showForeign ? selectedStatementInfo.currency : 'ریالی'}
                sx={{ height: 19, fontSize: 12, bgcolor: alpha(BLUE, 0.08), color: BLUE }} />
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.9 }}>
              <Box sx={{ p: 0.8, borderRadius: '9px', bgcolor: '#fff', border: '1px solid #e8eef2' }}>
                <Typography sx={{ fontSize: 12, color: MUTED }}>مبلغ تجمعی صورت‌وضعیت {selectedKind.isAdjustment ? '(بدون تغییر)' : ''}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK }}>
                  {formatPersianNumber(selectedStatement.amount || 0)} ریال
                </Typography>
                {selectedStatementForeign !== null ? (
                  <Typography sx={{ fontSize: 12, color: MUTED }}>
                    ≈ {formatPersianNumber(selectedStatementForeign)} {selectedStatementInfo.currency}
                  </Typography>
                ) : null}
                {selectedKind.isAdjustment ? (
                  <Typography sx={{ fontSize: 12, color: selectedKind.color, fontWeight: 800 }}>
                    تعدیل تجمعی: {formatPersianNumber(selectedAdjustmentAmount)} ریال
                  </Typography>
                ) : null}
              </Box>
              <Box sx={{ p: 0.8, borderRadius: '9px', bgcolor: '#fff', border: `1px solid ${alpha(selectedKind.color, 0.2)}` }}>
                <Typography sx={{ fontSize: 12, color: MUTED }}>{selectedKind.isAdjustment ? 'مبلغ قابل پرداخت تعدیل' : 'مبلغ قابل پرداخت این دوره'}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: selectedKind.isAdjustment ? selectedKind.color : GREEN }}>
                  {formatPersianNumber(selectedStatementPayable || 0)} ریال
                </Typography>
                {selectedStatementNetForeign !== null ? (
                  <Typography sx={{ fontSize: 12, color: selectedKind.isAdjustment ? selectedKind.color : GREEN }}>
                    ≈ {formatPersianNumber(selectedStatementNetForeign)} {selectedStatementInfo.currency}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          </Box>
        ) : null}


        <Divider />
        <Box>
          <SectionHeading icon={AccountBalanceWalletOutlinedIcon} title="مبلغ و واحد ارز" color={BLUE}
            action={form.amount ? <Chip size="small" label={`${formatPersianNumber(form.amount)} ریال`} sx={{ height: 20, fontSize: 12, bgcolor: alpha(BLUE, 0.07), color: BLUE }} /> : null} />
          <Grid container spacing={1.4}>
            {hideReferenceForeign ? null : (
              <Grid item xs={12} md={4}>
                <FormControl size="small" fullWidth>
                  <InputLabel>واحد ارز مرجع</InputLabel>
                  <Select value={form.currency || ''} label="واحد ارز مرجع" onChange={(event) => setForm((previous) => ({ ...previous, currency: event.target.value }))}>
                    <MenuItem value="">—</MenuItem>
                    {currencyList.map((currency) => (
                      <MenuItem key={currency.id} value={currency.id}>{normalizeCurrencyLabel(currency.name || currency.symbol)} ({currency.code})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography sx={{ mt: 0.4, fontSize: 12, color: MUTED }}>پرداخت نهایی به ریال ثبت می‌شود؛ این واحد فقط برای نمایش معادل ارزی است.</Typography>
              </Grid>
            )}
            <Grid item xs={12} md={hideReferenceForeign ? 12 : 8}>
              <MoneyInput size="small" fullWidth allowDecimals={false} label="مبلغ پرداخت (ریال)" value={form.amount}
                onChange={(value) => setForm((previous) => ({ ...previous, amount: value }))} />
              {referenceForeign !== null ? (
                <Typography sx={{ mt: 0.4, fontSize: 12, color: MUTED }}>معادل ارزی: {formatPersianNumber(referenceForeign)} {label}</Typography>
              ) : null}
            </Grid>
          </Grid>
        </Box>

        <Divider />
        <Box>
          <SectionHeading icon={LinkOutlinedIcon} title="مرجع و روش پرداخت" color={VIOLET} />
          <Grid container spacing={1.4}>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره مرجع / سند" value={form.reference || ''} onChange={(event) => setForm((previous) => ({ ...previous, reference: event.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="روش پرداخت" placeholder="مثلاً حواله، چک، انتقال بانکی" value={form.method || ''} onChange={(event) => setForm((previous) => ({ ...previous, method: event.target.value }))} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="توضیحات" multiline rows={2} value={form.note || ''} onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))} /></Grid>
          </Grid>
        </Box>

        <Divider />
        <Box>
          <SectionHeading icon={AttachFileOutlinedIcon} title="پیوست فایل‌ها" color={TEAL}
            action={<Chip size="small" label={`${formatPersianNumber(pendingFiles.length + existingAttachments.length)} فایل`}
              sx={{ height: 19, fontSize: 12, bgcolor: alpha(TEAL, 0.07), color: TEAL }} />} />
          <Box component="label" sx={{
            display: 'flex', alignItems: 'center', gap: 1, p: 1.15, borderRadius: '12px',
            border: `1px dashed ${alpha(TEAL, 0.28)}`, bgcolor: alpha(TEAL, 0.025), cursor: 'pointer',
            transition: 'background-color .18s ease, border-color .18s ease',
            '&:hover': { bgcolor: alpha(TEAL, 0.05), borderColor: alpha(TEAL, 0.45) },
          }}>
            <input type="file" hidden multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.zip,.rar"
              onChange={(event) => { onPickFiles(event.target.files); event.target.value = ''; }} />
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px', bgcolor: alpha(TEAL, 0.09), color: TEAL,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AttachFileOutlinedIcon sx={{ fontSize: 19 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>انتخاب فایل پیوست</Typography>
              <Typography sx={{ fontSize: 12, color: MUTED }}>رسید، حواله، سند بانکی، تصویر یا PDF — حداکثر ۱۰ فایل</Typography>
            </Box>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: TEAL, border: `1px solid ${alpha(TEAL, 0.3)}`, borderRadius: '8px', px: 1, py: 0.45 }}>
              انتخاب
            </Typography>
          </Box>

          {existingAttachments.length > 0 ? (
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: MUTED, mb: 0.5 }}>پیوست‌های ذخیره‌شده</Typography>
              <Stack spacing={0.5}>
                {existingAttachments.map((attachment) => (
                  <Stack key={attachment.id} direction="row" alignItems="center" spacing={0.6}
                    sx={{ p: 0.7, borderRadius: '9px', border: '1px solid #e6edf1', bgcolor: '#fff' }}>
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 17, color: TEAL }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, color: INK }}>{attachment.title || attachment.file_name || 'فایل پیوست'}</Typography>
                      <Typography sx={{ fontSize: 12, color: MUTED }}>{fileSizeLabel(attachment.size)}</Typography>
                    </Box>
                    {attachment.file_url ? (
                      <Tooltip title="دانلود">
                        <IconButton size="small" component="a" href={attachment.file_url} target="_blank" rel="noreferrer" sx={{ color: BLUE, p: 0.3 }}>
                          <DownloadOutlinedIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    <Tooltip title="حذف فایل">
                      <span>
                        <IconButton size="small" disabled={attachmentBusy} onClick={() => onDeleteAttachment(attachment)} sx={{ color: RED, p: 0.3 }}>
                          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
            </Box>
          ) : null}

          {pendingFiles.length > 0 ? (
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: MUTED, mb: 0.5 }}>پیوست‌های جدید (پس از ذخیره بارگذاری می‌شوند)</Typography>
              <Stack spacing={0.5}>
                {pendingFiles.map((file, index) => (
                  <Stack key={`${file.name}-${file.size}-${file.lastModified}`} direction="row" alignItems="center" spacing={0.6}
                    sx={{ p: 0.7, borderRadius: '9px', border: `1px solid ${alpha(TEAL, 0.15)}`, bgcolor: alpha(TEAL, 0.025) }}>
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 17, color: TEAL }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, color: INK }}>{file.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: MUTED }}>{fileSizeLabel(file.size)}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => onRemovePending(index)} sx={{ color: RED, p: 0.3 }}>
                      <CloseOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.6, borderTop: '1px solid #e5ebf0' }}>
        <Button onClick={onClose} sx={{ fontSize: 12 }}>انصراف</Button>
        <Button variant="contained" onClick={onSave} disabled={saving} startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <CheckCircleOutlineIcon />}
          sx={{ fontSize: 12, px: 2.5, bgcolor: TEAL, '&:hover': { bgcolor: '#115e59' } }}>
          {uploading ? 'در حال بارگذاری فایل‌ها…' : (saving ? 'در حال ذخیره…' : 'ذخیره پرداخت')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const ContractPaymentsPage = () => {
  const qc = useQueryClient();
  const moduleTheme = useModuleTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const contractsQuery = useQuery({
    queryKey: ['ext-contracts-pay'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const contractList = Array.isArray(contractsQuery.data) ? contractsQuery.data : contractsQuery.data?.results || [];

  const allPaymentsQuery = useQuery({
    queryKey: ['contract-payments-all'],
    queryFn: () => axiosInstance.get('/contract-payments/', { params: { page_size: 500 } }).then((response) => response.data),
    enabled: !contractId,
  });
  const allPayments = Array.isArray(allPaymentsQuery.data) ? allPaymentsQuery.data : allPaymentsQuery.data?.results || [];
  const paymentCountByContract = useMemo(() => allPayments.reduce((acc, payment) => {
    const key = String(payment.contract);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}), [allPayments]);
  const allPaymentsTotal = allPayments.reduce((sum, payment) => sum + num(payment.amount), 0);

  const currenciesQuery = useQuery({
    queryKey: ['currencies-pay'],
    queryFn: () => axiosInstance.get('/currencies/', { params: { page_size: 100 } }).then((response) => response.data),
  });
  const currencyList = Array.isArray(currenciesQuery.data) ? currenciesQuery.data : currenciesQuery.data?.results || [];

  const invoicesQuery = useQuery({
    queryKey: ['invoices-pay', contractId],
    queryFn: () => axiosInstance.get('/contract-invoices/', { params: { contract: contractId, page_size: 500 } }).then((response) => response.data),
    enabled: Boolean(contractId),
  });
  const invoiceList = Array.isArray(invoicesQuery.data) ? invoicesQuery.data : invoicesQuery.data?.results || [];

  const statementsQuery = useQuery({
    queryKey: ['statements-pay', contractId],
    queryFn: () => axiosInstance.get('/contract-statements/', { params: { contract: contractId, page_size: 500 } }).then((response) => response.data),
    enabled: Boolean(contractId),
  });
  const statementList = Array.isArray(statementsQuery.data) ? statementsQuery.data : statementsQuery.data?.results || [];

  const paymentsQuery = useQuery({
    queryKey: ['contract-payments', contractId],
    queryFn: () => axiosInstance.get('/contract-payments/', { params: { contract: contractId, page_size: 500 } }).then((response) => response.data),
    enabled: Boolean(contractId),
  });
  const list = Array.isArray(paymentsQuery.data) ? paymentsQuery.data : paymentsQuery.data?.results || [];


  const selectedContract = contractList.find((contract) => String(contract.id) === String(contractId));
  const contractCurrency = normalizeCurrencyLabel(
    currencyList.find((currency) => String(currency.id) === String(selectedContract?.currency))?.name
      || selectedContract?.currency_name,
  );
  const contractAmount = contractAmountOf(selectedContract);
  const contractRate = contractRateOf(selectedContract, statementList);
  const contractAdjustments = adjustmentSummaryOf(statementList);
  const contractAmountRial = contractAmount * contractRate;

  const methods = useMemo(() => {
    const map = list.reduce((acc, payment) => {
      const key = payment.method || 'نامشخص';
      if (!acc[key]) acc[key] = { name: key, count: 0, amount: 0, color: methodColor(key) };
      acc[key].count += 1;
      acc[key].amount += num(payment.amount);
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [list]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = list.filter((payment) => {
      if (methodFilter && (payment.method || 'نامشخص') !== methodFilter) return false;
      if (typeFilter && (payment.payment_type || 'normal') !== typeFilter) return false;
      if (!query) return true;
      return [payment.reference, payment.method, payment.note, payment.invoice_number, payment.statement_number, formatStatementNumber(payment.statement_number), paymentStatementKind(payment).label, paymentTypeOf(payment).label]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    return [...rows].sort((a, b) => {
      if (sortBy === 'amount') return num(b.amount) - num(a.amount);
      if (sortBy === 'oldest') return new Date(a.date || 0) - new Date(b.date || 0);
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
  }, [list, methodFilter, typeFilter, search, sortBy]);

  const totalPaid = list.reduce((sum, payment) => sum + num(payment.amount), 0);
  const averagePayment = list.length ? totalPaid / list.length : 0;
  const totalPaidForeign = contractRate > 1 ? totalPaid / contractRate : totalPaid;
  const averagePaymentForeign = contractRate > 1 ? averagePayment / contractRate : averagePayment;
  const coverage = contractAmountRial > 0 ? (totalPaid / contractAmountRial) * 100 : 0;
  const lastPayment = [...list].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
  const linkedInvoices = new Set(list.map((payment) => payment.invoice).filter(Boolean)).size;
  const linkedStatements = new Set(list.map((payment) => payment.statement).filter(Boolean)).size;

  /* صفحه‌بندی و اندازه‌گیری جدول تک‌ردیفه (الگوی تضامین) */
  const scopedPageSize = moduleTheme.tableTheme.rowsPerPage;
  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    filtered.length, scopedPageSize, [search, methodFilter, typeFilter, sortBy, contractId, scopedPageSize],
  );
  const pagedPayments = useMemo(
    () => filtered.slice(page * scopedPageSize, (page + 1) * scopedPageSize),
    [filtered, page, scopedPageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedPayments.length);
  const methodOptions = [
    { value: '', label: 'همه روش‌ها' },
    ...methods.map((method) => ({ value: method.name, label: `${method.name} (${formatPersianNumber(method.count)})` })),
  ];
  const typeOptions = [
    { value: '', label: 'همه انواع' },
    ...PAYMENT_TYPES.map((type) => ({ value: type.key, label: type.label })),
  ];
  const activeFilterCount = (methodFilter ? 1 : 0) + (typeFilter ? 1 : 0);
  const activeChips = [
    methodFilter ? { key: 'method', label: `روش: ${methodFilter}`, clear: () => setMethodFilter('') } : null,
    typeFilter ? { key: 'type', label: `نوع: ${typeOptions.find((item) => item.value === typeFilter)?.label || typeFilter}`, clear: () => setTypeFilter('') } : null,
  ].filter(Boolean);
  const scopedMode = Boolean(contractId);

  const monthlyData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 6 }).map((_, index) => {
      const offset = 5 - index;
      const monthDate = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const parts = getJalaliParts(monthDate.toISOString().slice(0, 10));
      return {
        label: parts ? JALALI_MONTHS[parts[1] - 1] : `${monthDate.getMonth() + 1}`,
        value: list.filter((payment) => isSameMonth(payment.date, monthDate.getFullYear(), monthDate.getMonth())).length,
        color: PALETTE[index % PALETTE.length],
      };
    });
  }, [list]);

  const selectContract = (contract) => {
    setContractId(String(contract.id));
    setMethodFilter('');
    setSearch('');
    const next = new URLSearchParams(searchParams);
    next.set('contract', contract.id);
    setSearchParams(next, { replace: true });
  };

  const clearContract = () => {
    setContractId('');
    setDetail(null);
    setMethodFilter('');
    setSearch('');
    const next = new URLSearchParams(searchParams);
    next.delete('contract');
    setSearchParams(next, { replace: true });
  };

  const openNew = () => {
    setForm({
      ...EMPTY,
      contract: contractId,
      date: new Date().toISOString().slice(0, 10),
      currency: selectedContract?.currency || '',
    });
    setError('');
    setPendingFiles([]);
    setExistingAttachments([]);
    setDialog(true);
  };

  const openEdit = (payment) => {
    setForm({
      ...EMPTY,
      ...payment,
      contract: payment.contract || contractId,
      invoice: payment.invoice || '',
      statement: payment.statement || '',
      currency: payment.currency || '',
      amount: payment.amount ?? '',
      payment_type: payment.payment_type || 'normal',
      date: payment.date || '',
      reference: payment.reference || '',
      method: payment.method || '',
      note: payment.note || '',
    });
    setError('');
    setPendingFiles([]);
    setExistingAttachments(asArray(payment.attachments));
    setDetail(null);
    setDialog(true);
  };

  const closeEditor = () => {
    if (save.isPending || uploading) return;
    setDialog(false);
    setForm(EMPTY);
    setPendingFiles([]);
    setExistingAttachments([]);
    setError('');
  };

  const pickFiles = (fileList) => {
    const files = Array.from(fileList || []).slice(0, 10);
    setPendingFiles((previous) => {
      const known = new Set(previous.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const next = files.filter((file) => !known.has(`${file.name}:${file.size}:${file.lastModified}`));
      return [...previous, ...next].slice(0, 10);
    });
  };

  const removePendingFile = (index) => {
    setPendingFiles((previous) => previous.filter((_, current) => current !== index));
  };

  const deleteAttachment = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-payment-attachments/${id}/`),
    onSuccess: (_data, id) => {
      setExistingAttachments((previous) => previous.filter((attachment) => attachment.id !== id));
      qc.invalidateQueries({ queryKey: ['contract-payments'] });
      setToast('فایل پیوست حذف شد');
    },
    onError: () => setError('حذف فایل پیوست ناموفق بود'),
  });

  const removeAttachmentFile = (attachment) => {
    if (window.confirm(`فایل «${attachment.title || attachment.file_name || 'پیوست'}» حذف شود؟`)) {
      deleteAttachment.mutate(attachment.id);
    }
  };


  const sanitize = (payload) => ({
    contract: payload.contract || null,
    invoice: payload.invoice || null,
    statement: payload.statement || null,
    date: payload.date || null,
    currency: payload.currency || null,
    amount: payload.amount === '' || payload.amount == null ? 0 : Number(payload.amount),
    payment_type: payload.payment_type || 'normal',
    reference: payload.reference || '',
    method: payload.method || '',
    note: payload.note || '',
  });

  const save = useMutation({
    mutationFn: (payload) => {
      const clean = sanitize(payload);
      return (payload.id
        ? axiosInstance.patch(`/contract-payments/${payload.id}/`, clean)
        : axiosInstance.post('/contract-payments/', clean)).then((response) => response.data);
    },
    onSuccess: async (saved) => {
      const wasEdit = Boolean(form.id);
      if (pendingFiles.length) {
        setUploading(true);
        const uploaded = [];
        try {
          for (const file of pendingFiles) {
            const body = new FormData();
            body.append('payment', saved.id);
            body.append('title', file.name);
            body.append('file', file, file.name);
            // eslint-disable-next-line no-await-in-loop
            const response = await axiosInstance.post('/contract-payment-attachments/', body);
            uploaded.push(response.data);
          }
        } catch {
          qc.invalidateQueries({ queryKey: ['contract-payments'] });
          setForm((previous) => ({ ...previous, id: saved.id }));
          setExistingAttachments((previous) => [...uploaded, ...previous]);
          setPendingFiles([]);
          setUploading(false);
          setError('پرداخت ذخیره شد، اما بارگذاری برخی فایل‌ها ناموفق بود. فایل‌ها را دوباره انتخاب کنید.');
          return;
        }
        setUploading(false);
      }
      qc.invalidateQueries({ queryKey: ['contract-payments'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setDialog(false);
      setForm(EMPTY);
      setPendingFiles([]);
      setExistingAttachments([]);
      setToast(wasEdit ? 'پرداخت ویرایش شد' : 'پرداخت ثبت شد');
    },
    onError: (requestError) => {
      const body = requestError.response?.data;
      let message = 'خطا در ذخیره پرداخت';
      if (typeof body === 'string') message = body;
      else if (Array.isArray(body)) message = body[0];
      else if (body?.detail) message = body.detail;
      else if (body?.error) message = body.error;
      else if (body?.non_field_errors) message = body.non_field_errors[0];
      else if (body && typeof body === 'object') {
        const first = Object.values(body).flat()[0];
        if (first) message = first;
      }
      setError(message);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-payments/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-payments'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setDeleteTarget(null);
      setDetail(null);
      setToast('پرداخت حذف شد');
    },
    onError: () => setError('حذف پرداخت ناموفق بود'),
  });

  const submit = () => {
    setError('');
    if (!form.contract) { setError('قرارداد را انتخاب کنید'); return; }
    if (!form.date) { setError('تاریخ پرداخت را وارد کنید'); return; }
    if (num(form.amount) <= 0) { setError('مبلغ پرداخت باید بزرگ‌تر از صفر باشد'); return; }
    save.mutate(form);
  };

  const exportCsv = () => {
    const header = ['تاریخ', 'نوع پرداخت', 'مبلغ', 'ارز', 'روش', 'مرجع', 'فاکتور', 'صورت‌وضعیت', 'توضیحات'];
    const body = filtered.map((payment) => [
      payment.date || '', paymentTypeOf(payment).label, payment.amount || 0, paymentCurrency(payment, contractCurrency),
      payment.method || '', payment.reference || '', payment.invoice_number || '',
      payment.statement_number ? paymentStatementTitle(payment) : '', payment.note || '',
    ]);
    const csv = [header, ...body]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contract-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };


  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<PaymentsOutlinedIcon />}
        title="پرداخت‌های قرارداد"
        badge={(
          <Chip size="small" label={contractId ? `${formatPersianNumber(list.length)} پرداخت` : `${formatPersianNumber(allPayments.length)} پرداخت ثبت‌شده`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(TEAL, 0.08), color: TEAL }} />
        )}
        actions={contractId ? (
          <>
            <Button variant="outlined" onClick={() => { paymentsQuery.refetch(); allPaymentsQuery.refetch(); }}
              disabled={paymentsQuery.isFetching} sx={{ minWidth: 40, px: 1 }}>
              {paymentsQuery.isFetching ? <CircularProgress size={16} /> : <RefreshOutlinedIcon fontSize="small" />}
            </Button>
            <Button variant="outlined" startIcon={<DescriptionOutlinedIcon />} onClick={() => navigate(`/external-contracts/${contractId}`)}>پرونده</Button>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>چاپ</Button>
            <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openNew}
              sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#115e59' } }}>پرداخت جدید</Button>
            <Button variant="contained" startIcon={<ChevronRightIcon />} onClick={clearContract}
              sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#115e59' } }}>فهرست قراردادها</Button>
          </>
        ) : (
          <Button variant="outlined" startIcon={<DescriptionOutlinedIcon />} onClick={() => navigate('/external-contracts')}>قراردادها</Button>
        )}
      />

      {contractsQuery.isError ? (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: '11px', fontSize: 12 }}>فهرست قراردادها دریافت نشد.</Alert>
      ) : null}
      {contractId && paymentsQuery.isError ? (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: '11px', fontSize: 12 }}
          action={<Button size="small" onClick={() => paymentsQuery.refetch()}>تلاش دوباره</Button>}>
          پرداخت‌های این قرارداد دریافت نشدند.
        </Alert>
      ) : null}

      {!scopedMode ? (
        <ContractPickerLanding
          theme={moduleTheme}
          contracts={contractList}
          records={allPayments}
          getContractId={(row) => row.contract}
          metrics={(row) => ({ amount: num(row.amount) })}
          onSelect={selectContract}
          ariaLabel="فهرست قراردادها برای پرداخت‌ها"
          sortOptions={[
            { value: 'amount', label: 'بیشترین مبلغ پرداخت' },
            { value: 'count', label: 'بیشترین تعداد پرداخت' },
            { value: 'number', label: 'شماره قرارداد' },
          ]}
          columns={[
            {
              key: 'number',
              label: 'شماره قرارداد',
              width: '10%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {toPersianDigits(row.contract.number || '—')}
                </Typography>
              ),
            },
            {
              key: 'party',
              label: 'طرف قرارداد',
              width: '19%',
              render: (row) => (
                <Typography noWrap title={row.contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                  {row.contract.party_name || '—'}
                </Typography>
              ),
            },
            {
              key: 'subject',
              label: 'موضوع قرارداد',
              width: '25%',
              render: (row) => (
                <Typography noWrap title={row.contract.subject} sx={{ fontSize: 12, fontWeight: 800 }}>
                  {row.contract.subject || '—'}
                </Typography>
              ),
            },
            {
              key: 'count',
              label: 'تعداد پرداخت',
              width: '11%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{formatPersianNumber(row.count || 0)}</Typography>
              ),
            },
            { key: 'amount', label: 'مجموع مبلغ (ریال)', width: '19%', align: 'center', render: (row) => moneyCell(row.amount, TEAL) },
            {
              key: 'average',
              label: 'میانگین',
              width: '16%',
              align: 'center',
              render: (row) => moneyCell(row.count ? row.amount / row.count : 0, BLUE),
            },
          ]}
        />
      ) : (
        <>
          <ModuleToolbar
            theme={moduleTheme}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="جستجو در مرجع، روش، فاکتور و صورت‌وضعیت…"
            sort={sortBy}
            sortOptions={[
              { value: 'newest', label: 'جدیدترین' },
              { value: 'oldest', label: 'قدیمی‌ترین' },
              { value: 'amount', label: 'بیشترین مبلغ' },
            ]}
            onSort={setSortBy}
            filters={[
              { label: 'روش پرداخت', value: methodFilter, options: methodOptions, onChange: setMethodFilter },
              { label: 'نوع پرداخت', value: typeFilter, options: typeOptions, onChange: setTypeFilter },
            ]}
            activeChips={activeChips}
            activeFilterCount={activeFilterCount}
            onReset={() => { setSearch(''); setMethodFilter(''); setTypeFilter(''); setSortBy('newest'); }}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
          />

          <Paper elevation={0} sx={{
            borderRadius: 'var(--hrms-table-radius, 16px)',
            overflow: 'hidden',
            px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
            border: '1px solid', borderColor: moduleTheme.cardBorderColor,
            bgcolor: 'background.paper', boxShadow: 'none',
          }}>
            <ModuleTable
              tableTheme={moduleTheme.tableTheme}
              ariaLabel="فهرست پرداخت‌های قرارداد"
              containerRef={tableRef}
              tableHeight={tableHeight}
              rowHeight={rowHeight}
              dimmed={paymentsQuery.isFetching}
              rows={pagedPayments}
              rowKey={(row) => row.id}
              onRowClick={(row) => setDetail(row)}
              emptyText="پرداختی با این مشخصات ثبت نشده است."
              columns={[
                {
                  key: 'row',
                  label: 'ردیف',
                  width: '4%',
                  align: 'center',
                  render: (_row, index) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                      {toPersianDigits(page * scopedPageSize + index + 1)}
                    </Typography>
                  ),
                },
                {
                  key: 'date',
                  label: 'تاریخ',
                  width: '9%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {row.date ? toJalali(row.date) : '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'amount',
                  label: 'مبلغ (ریال)',
                  width: '13%',
                  align: 'center',
                  render: (row) => moneyCell(row.amount, TEAL),
                },
                {
                  key: 'type',
                  label: 'نوع پرداخت',
                  width: '12%',
                  align: 'center',
                  render: (row) => {
                    const meta = paymentTypeOf(row);
                    return (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip size="small" label={meta.label}
                          sx={{
                            height: 20, fontSize: 10.5, fontWeight: 800,
                            bgcolor: alpha(meta.color, 0.1), color: meta.color,
                            border: `1px solid ${alpha(meta.color, 0.28)}`,
                            '& .MuiChip-label': { px: 0.8 },
                          }} />
                      </Box>
                    );
                  },
                },
                {
                  key: 'method',
                  label: 'روش',
                  width: '12%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap title={row.method} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                      {row.method || '—'}
                    </Typography>
                  ),
                },

                {
                  key: 'reference',
                  label: 'مرجع',
                  width: '14%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap title={row.reference} sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {row.reference || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'linked',
                  label: 'فاکتور / صورت‌وضعیت',
                  width: '19%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11, color: MUTED }}>
                      {row.invoice_number ? `فاکتور ${toPersianDigits(row.invoice_number)}` : '—'}
                      {row.statement_number ? ` · ${statementDisplayTitle(row)}` : ''}
                    </Typography>
                  ),
                },
                {
                  key: 'actions',
                  label: 'عملیات',
                  width: '13%',
                  align: 'center',
                  render: (row) => (
                    <Stack direction="row" spacing={0.15} useFlexGap alignItems="center" justifyContent="center"
                      onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="جزئیات"><IconButton size="small" aria-label="جزئیات" onClick={() => setDetail(row)}><VisibilityOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      <Tooltip title="ویرایش"><IconButton size="small" aria-label="ویرایش" onClick={() => openEdit(row)}><EditOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" aria-label="حذف" color="error" onClick={() => { setDeleteTarget(row); setDetail(null); }}><DeleteOutlineIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    </Stack>
                  ),
                },
              ]}
            />
            <ModulePager
              tableTheme={moduleTheme.tableTheme}
              page={page}
              onPage={setPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              total={filtered.length}
              pageSize={scopedPageSize}
              unit="پرداخت"
            />
            <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
              sx={{ pt: 1.25, mt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Chip size="small" label={`مجموع پرداخت‌ها: ${formatPersianNumber(Math.round(totalPaid))} ریال`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(TEAL, 0.1), color: TEAL }} />
              <Chip size="small" label={`میانگین: ${formatPersianNumber(Math.round(averagePayment))}`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(BLUE, 0.1), color: BLUE }} />
              <Chip size="small" label={`پوشش قرارداد: ${formatPersianNumber(Math.round(coverage))}٪`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(VIOLET, 0.1), color: VIOLET }} />
              <Chip size="small" label={`${formatPersianNumber(linkedInvoices)} فاکتور پیوندی · ${formatPersianNumber(linkedStatements)} صورت‌وضعیت`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(SLATE, 0.1), color: SLATE }} />
            </Stack>
          </Paper>
        </>
      )}

      <PaymentDetailDrawer payment={detail} currency={contractCurrency} contractRate={contractRate} contract={selectedContract}
        onClose={() => setDetail(null)} onEdit={openEdit}
        onDelete={(row) => { setDeleteTarget(row); setDetail(null); }} />

      <PaymentEditorDialog open={dialog} onClose={closeEditor} form={form} setForm={setForm}
        invoiceList={invoiceList} statementList={statementList} currencyList={currencyList}
        fallbackCurrency={contractCurrency} error={error} saving={save.isPending || uploading} onSave={submit}
        contract={selectedContract} pendingFiles={pendingFiles} existingAttachments={existingAttachments}
        onPickFiles={pickFiles} onRemovePending={removePendingFile}
        onDeleteAttachment={removeAttachmentFile} attachmentBusy={deleteAttachment.isPending}
        uploading={uploading} />

      <Dialog open={Boolean(deleteTarget)} onClose={() => { setDeleteTarget(null); setError(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 13, fontWeight: 900, color: INK }}>حذف پرداخت</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12, color: MUTED, lineHeight: 1.9 }}>
            آیا از حذف پرداخت
            <Box component="span" sx={{ mx: 0.5, fontWeight: 900, color: INK }}>
              {formatPersianNumber(deleteTarget?.amount || 0)} ریال
            </Box>
            مطمئن هستید؟ این عملیات قابل بازگشت نیست.
          </Typography>
          {error ? <Alert severity="error" sx={{ mt: 1.2, fontSize: 12 }}>{error}</Alert> : null}
        </DialogContent>
        <DialogActions sx={{ px: 2.2, pb: 2 }}>
          <Button size="small" onClick={() => setDeleteTarget(null)}>انصراف</Button>
          <Button size="small" color="error" variant="contained" onClick={() => remove.mutate(deleteTarget.id)}
            disabled={remove.isPending} startIcon={remove.isPending ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <DeleteOutlineIcon />}>
            حذف پرداخت
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')} sx={{ fontSize: 12 }}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractPaymentsPage;