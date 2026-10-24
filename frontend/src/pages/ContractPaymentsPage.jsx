import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Avatar, Box, Button, ButtonBase, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl,
  Grid, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select,
  Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, alpha,
} from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import ContractListPicker from '../core/components/ui/ContractListPicker';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import MoneyInput from '../core/components/ui/MoneyInput';
import { KpiTile, ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import { ColumnChart } from '../core/components/charts/Charts';
import { formatPersianNumber, formatPersianPercent, formatStatementNumber, normalizeCurrencyLabel, toPersianDigits } from '../core/utils/numberUtils';
import { getJalaliParts, toJalali } from '../core/utils/dateUtils';
import {
  CONTRACT_STATUS_LABELS as STATUS_LABELS,
  CONTRACT_STATUS_COLORS as STATUS_COLORS,
  CONTRACT_TYPE_LABELS as TYPE_LABELS,
} from '../core/theme/tokens';
import { contractRateOf } from './contracts/contractFinanceSummary';

const TEAL = '#0f766e';
const BLUE = '#2563eb';
const VIOLET = '#7c3aed';
const AMBER = '#b45309';
const GREEN = '#15803d';
const RED = '#be123c';
const SLATE = '#475569';
const PALETTE = [TEAL, BLUE, VIOLET, AMBER, '#0e7490', '#be185d', '#4f46e5', '#15803d'];
const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const EMPTY = {
  id: null, contract: '', invoice: '', statement: '', date: '', currency: '',
  amount: '', reference: '', method: '', note: '',
};

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const asArray = (value) => (Array.isArray(value) ? value : []);
const compactMoney = (value) => {
  const amount = num(value);
  if (Math.abs(amount) >= 1_000_000_000_000) return `${formatPersianNumber((amount / 1_000_000_000_000).toFixed(1))} هزار میلیارد`;
  if (Math.abs(amount) >= 1_000_000_000) return `${formatPersianNumber((amount / 1_000_000_000).toFixed(1))} میلیارد`;
  if (Math.abs(amount) >= 1_000_000) return `${formatPersianNumber((amount / 1_000_000).toFixed(1))} میلیون`;
  return formatPersianNumber(amount);
};
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

const EmptyState = ({ icon: Icon = PaymentsOutlinedIcon, title, hint, color = TEAL, action }) => (
  <Paper elevation={0} sx={{ p: 4.5, borderRadius: '16px', border: '1px dashed #dbe5ea', textAlign: 'center', bgcolor: '#fbfdfd' }}>
    <Icon sx={{ fontSize: 34, color: alpha(color, 0.55), mb: 1 }} />
    <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK }}>{title}</Typography>
    {hint ? <Typography sx={{ mt: 0.35, fontSize: 12, color: MUTED }}>{hint}</Typography> : null}
    {action ? <Box sx={{ mt: 1.4 }}>{action}</Box> : null}
  </Paper>
);


const ContractSnapshotCard = ({ contract, currency, contractRate = 1, navigate, onBack }) => {
  if (!contract) return null;
  return (
    <SurfaceCard title="پرونده قرارداد" icon={DescriptionOutlinedIcon} color={TEAL}
      action={<Chip size="small" label={contract.number || '—'} sx={{ height: 20, fontSize: 12, bgcolor: alpha(TEAL, 0.07), color: TEAL }} />}>
      <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK, lineHeight: 1.6 }}>{contract.subject}</Typography>
      <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 0.7, mb: 1 }}>
        <Chip size="small" label={statusLabel(contract.status)}
          sx={{ height: 19, fontSize: 12, fontWeight: 800, bgcolor: alpha(statusColor(contract.status), 0.08), color: statusColor(contract.status) }} />
        <Chip size="small" label={contract.contract_type_master_name || TYPE_LABELS[contract.contract_type] || 'قرارداد'}
          sx={{ height: 19, fontSize: 12, bgcolor: SOFT_BG, color: MUTED }} />
      </Stack>
      <Divider />
      <Box sx={{ py: 0.5 }}>
        <InfoLine label="طرف قرارداد" value={contract.party_name || '—'} />
        <InfoLine label="مبلغ قرارداد" value={`${formatPersianNumber(contractAmountOf(contract))} ${currency}`} strong />
        {contractRate > 1 ? (
          <InfoLine label="معادل ریالی" value={`${formatPersianNumber(contractAmountOf(contract) * contractRate)} ریال`} />
        ) : null}
        <InfoLine label="تاریخ شروع" value={toJalali(contract.start_date)} />
        <InfoLine label="تاریخ پایان" value={toJalali(contract.end_date)} />
      </Box>
      <Divider />
      <Stack direction="row" spacing={0.7} sx={{ mt: 1 }}>
        <Button size="small" variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={onBack} sx={{ flex: 1, fontSize: 12 }}>تغییر</Button>
        <Button size="small" variant="contained" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => navigate(`/external-contracts/${contract.id}`)}
          sx={{ flex: 1, fontSize: 12, bgcolor: TEAL, '&:hover': { bgcolor: '#115e59' } }}>پرونده</Button>
      </Stack>
    </SurfaceCard>
  );
};

const CoverageCard = ({
  totalPaid, contractAmount, contractRate = 1, paymentCount, invoiceCount,
  statementCount, currency, averagePayment, lastPayment,
}) => {
  const contractAmountRial = contractAmount * contractRate;
  const coverage = contractAmountRial > 0 ? (totalPaid / contractAmountRial) * 100 : 0;
  const remainingRial = Math.max(0, contractAmountRial - totalPaid);
  const remainingForeign = contractRate > 1 ? remainingRial / contractRate : remainingRial;
  const paidForeign = contractRate > 1 ? totalPaid / contractRate : totalPaid;
  const averageForeign = contractRate > 1 ? averagePayment / contractRate : averagePayment;
  return (
    <SurfaceCard title="پوشش مالی پرداخت‌ها" icon={AccountBalanceWalletOutlinedIcon} color={BLUE}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 12, color: MUTED }}>نسبت پرداخت‌شده به مبلغ قرارداد</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 900, color: coverage >= 70 ? GREEN : coverage >= 40 ? AMBER : BLUE }}>
          {formatPersianPercent(coverage)}
        </Typography>
      </Stack>
      <ProgressBar value={Math.min(100, coverage)} color={coverage >= 70 ? GREEN : coverage >= 40 ? AMBER : BLUE} height={8} />
      <Box sx={{ mt: 1.2 }}>
        <InfoLine label="مبلغ قرارداد" value={`${compactMoney(contractAmount)} ${currency}`} />
        {contractRate > 1 ? <InfoLine label="معادل ریالی قرارداد" value={`${compactMoney(contractAmountRial)} ریال`} /> : null}
        <InfoLine label="مجموع پرداخت‌شده" value={`${compactMoney(totalPaid)} ریال`} strong color={TEAL} />
        {contractRate > 1 ? <InfoLine label="معادل ارزی پرداخت‌ها" value={`${compactMoney(paidForeign)} ${currency}`} /> : null}
        <InfoLine label="مانده پرداخت" value={`${compactMoney(remainingRial)} ریال`} color={remainingRial > 0 ? AMBER : GREEN} />
        {contractRate > 1 ? <InfoLine label="معادل ارزی مانده" value={`${compactMoney(remainingForeign)} ${currency}`} /> : null}
        <InfoLine label="تعداد پرداخت" value={`${formatPersianNumber(paymentCount)} فقره`} />
        <InfoLine label="میانگین پرداخت" value={`${compactMoney(averagePayment)} ریال`} />
        {contractRate > 1 ? <InfoLine label="میانگین ارزی" value={`${compactMoney(averageForeign)} ${currency}`} /> : null}
        <InfoLine label="آخرین پرداخت" value={lastPayment ? toJalali(lastPayment.date) : '—'} />
      </Box>
      <Divider sx={{ my: 0.6 }} />
      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
        <Chip size="small" label={`${formatPersianNumber(invoiceCount)} فاکتور پیوندی`}
          sx={{ height: 19, fontSize: 12, bgcolor: alpha(VIOLET, 0.07), color: VIOLET }} />
        <Chip size="small" label={`${formatPersianNumber(statementCount)} صورت‌وضعیت پیوندی`}
          sx={{ height: 19, fontSize: 12, bgcolor: alpha(BLUE, 0.07), color: BLUE }} />
      </Stack>
    </SurfaceCard>
  );
};

const MethodsCard = ({ methods, activeMethod, onSelect, accent = TEAL }) => {
  const maxCount = Math.max(...methods.map((item) => item.count), 1);
  return (
    <SurfaceCard title="روش‌های پرداخت" icon={PaymentsOutlinedIcon} color={accent}
      action={activeMethod ? (
        <Button size="small" onClick={() => onSelect('')} sx={{ minWidth: 0, px: 0.6, fontSize: 12 }}>همه</Button>
      ) : null}>
      {!methods.length ? (
        <Typography sx={{ py: 2, textAlign: 'center', fontSize: 12, color: MUTED }}>روشی ثبت نشده است</Typography>
      ) : (
        <Stack spacing={0.75}>
          {methods.slice(0, 4).map((item) => (
            <ButtonBase key={item.name} onClick={() => onSelect(activeMethod === item.name ? '' : item.name)}
              sx={{
                width: '100%', display: 'block', textAlign: 'right', p: 0.65, borderRadius: '9px',
                bgcolor: activeMethod === item.name ? alpha(item.color, 0.07) : 'transparent',
                border: `1px solid ${activeMethod === item.name ? alpha(item.color, 0.18) : 'transparent'}`,
              }}>
              <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.35 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: item.color }} />
                <Typography noWrap sx={{ flex: 1, fontSize: 12, fontWeight: 700, color: INK }}>{item.name || 'نامشخص'}</Typography>
                <Typography sx={{ fontSize: 12, color: MUTED }}>{formatPersianNumber(item.count)}</Typography>
              </Stack>
              <ProgressBar value={(item.count / maxCount) * 100} color={item.color} height={4} />
            </ButtonBase>
          ))}
        </Stack>
      )}
    </SurfaceCard>
  );
};


const PaymentCard = ({ row, currency, contractRate = 1, onView, onEdit, onDelete }) => {
  const color = methodColor(row.method);
  const info = statementInfo(row, contractRate, currency);
  const rate = info.rate;
  const foreign = info.showForeign ? num(row.amount) / rate : null;
  const statementForeign = info.showForeign && row.statement_amount
    ? (row.statement_foreign_amount != null ? num(row.statement_foreign_amount) : num(row.statement_amount) / rate)
    : null;
  const statementNetForeign = info.showForeign && row.statement_net_amount ? num(row.statement_net_amount) / rate : null;
  return (
    <Paper
      elevation={0}
      role="button"
      tabIndex={0}
      onClick={() => onView(row)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onView(row); }}
      sx={{
        p: 1.6, height: '100%', borderRadius: '16px', border: '1px solid #e7edf2', bgcolor: '#fff',
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color .18s ease, transform .18s ease',
        '&:hover': { borderColor: alpha(color, 0.32), transform: 'translateY(-1px)' },
      }}
    >
      <Box sx={{
        position: 'absolute', width: 120, height: 120, borderRadius: '50%', top: -58, left: -48,
        background: `radial-gradient(circle, ${alpha(color, 0.11)}, transparent 70%)`, pointerEvents: 'none',
      }} />
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ position: 'relative' }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(color, 0.1), color, border: `1px solid ${alpha(color, 0.16)}` }}>
          <PaymentsOutlinedIcon sx={{ fontSize: 20 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: TEAL, lineHeight: 1.35 }}>
            {formatPersianNumber(row.amount || 0)}
            <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: MUTED, mr: 0.4 }}>ریال</Box>
          </Typography>
          {foreign !== null ? (
            <Typography sx={{ fontSize: 12, color: MUTED }}>≈ {formatPersianNumber(foreign)} {info.currency}</Typography>
          ) : null}
          {row.statement_amount ? (
            <Typography sx={{ mt: 0.2, fontSize: 12, color: BLUE }}>
              مبلغ صورت‌وضعیت: {formatPersianNumber(row.statement_amount)} ریال
              {statementForeign !== null ? ` · ≈ ${formatPersianNumber(statementForeign)} ${info.currency}` : ''}
            </Typography>
          ) : null}
          {row.statement_net_amount ? (
            <Typography sx={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>
              قابل پرداخت صورت‌وضعیت: {formatPersianNumber(row.statement_net_amount)} ریال
              {statementNetForeign !== null ? ` · ≈ ${formatPersianNumber(statementNetForeign)} ${info.currency}` : ''}
            </Typography>
          ) : null}
          <Typography sx={{ mt: 0.15, fontSize: 12, color: MUTED }}>
            تاریخ پرداخت: {toJalali(row.date)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.1}>
          <Tooltip title="ویرایش">
            <IconButton size="small" onClick={(event) => { event.stopPropagation(); onEdit(row); }} sx={{ color: BLUE, p: 0.4 }}>
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="حذف">
            <IconButton size="small" onClick={(event) => { event.stopPropagation(); onDelete(row); }} sx={{ color: RED, p: 0.4 }}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
        {row.method ? (
          <Chip size="small" label={row.method}
            sx={{ height: 20, fontSize: 12, fontWeight: 800, bgcolor: alpha(color, 0.07), color }} />
        ) : null}
        {row.reference ? (
          <Chip size="small" icon={<LinkOutlinedIcon sx={{ fontSize: '12px !important' }} />} label={row.reference}
            sx={{ height: 20, fontSize: 12, bgcolor: SOFT_BG, color: SLATE, '& .MuiChip-icon': { color: SLATE } }} />
        ) : null}
        {row.invoice_number ? (
          <Chip size="small" label={`فاکتور ${row.invoice_number}`}
            sx={{ height: 20, fontSize: 12, bgcolor: alpha(VIOLET, 0.07), color: VIOLET }} />
        ) : null}
        {row.statement_number ? (
          <Chip size="small" label={`صورت‌وضعیت ${formatStatementNumber(row.statement_number)}`}
            sx={{ height: 20, fontSize: 12, bgcolor: alpha(BLUE, 0.07), color: BLUE }} />
        ) : null}
        {num(row.attachment_count ?? asArray(row.attachments).length) > 0 ? (
          <Chip size="small" icon={<AttachFileOutlinedIcon sx={{ fontSize: '12px !important' }} />}
            label={`${formatPersianNumber(row.attachment_count ?? asArray(row.attachments).length)} فایل`}
            sx={{ height: 20, fontSize: 12, bgcolor: alpha(TEAL, 0.07), color: TEAL, '& .MuiChip-icon': { color: TEAL } }} />
        ) : null}
      </Stack>

      <Typography sx={{
        mt: 0.8, fontSize: 12, color: row.note ? MUTED : '#cbd5e1', lineHeight: 1.8,
        minHeight: 30, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {row.note || 'بدون توضیحات'}
      </Typography>

      <Stack direction="row" alignItems="center" spacing={0.35} sx={{ mt: 0.8, color: TEAL }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>مشاهده جزئیات</Typography>
        <ArrowForwardOutlinedIcon sx={{ fontSize: 13 }} />
      </Stack>
    </Paper>
  );
};


const PaymentTable = ({ rows, currency, contractRate = 1, onView, onEdit, onDelete }) => (
  <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '15px', border: '1px solid #e7edf2', overflow: 'hidden' }}>
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow sx={{ '& th': { bgcolor: SOFT_BG, borderBottom: '1px solid #e8edf4', py: 0.9 } }}>
          <TableCell>تاریخ</TableCell>
          <TableCell>مبلغ (ریال)</TableCell>
          <TableCell>روش / مرجع</TableCell>
          <TableCell>پیوندها</TableCell>
          <TableCell>توضیحات</TableCell>
          <TableCell align="center">عملیات</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const color = methodColor(row.method);
          const info = statementInfo(row, contractRate, currency);
          const rate = info.rate;
          const foreign = info.showForeign ? num(row.amount) / rate : null;
          const statementForeign = info.showForeign && row.statement_amount
            ? (row.statement_foreign_amount != null ? num(row.statement_foreign_amount) : num(row.statement_amount) / rate)
            : null;
          const statementNetForeign = info.showForeign && row.statement_net_amount ? num(row.statement_net_amount) / rate : null;
          return (
            <TableRow key={row.id} hover onClick={() => onView(row)}
              sx={{ cursor: 'pointer', '& td': { py: 0.8, borderBottom: '1px solid #f2f5f9' } }}>
              <TableCell>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: INK }}>{toJalali(row.date)}</Typography>
              </TableCell>
              <TableCell>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: TEAL }}>
                  {formatPersianNumber(row.amount || 0)}
                  <Box component="span" sx={{ fontSize: 12, color: MUTED, mr: 0.35 }}>ریال</Box>
                </Typography>
                {foreign !== null ? (
                  <Typography sx={{ fontSize: 12, color: MUTED }}>≈ {formatPersianNumber(foreign)} {info.currency}</Typography>
                ) : null}
                {row.statement_amount ? (
                  <Typography sx={{ fontSize: 12, color: BLUE }}>
                    مبلغ صورت‌وضعیت: {formatPersianNumber(row.statement_amount)} ریال
                    {statementForeign !== null ? ` · ≈ ${formatPersianNumber(statementForeign)} ${info.currency}` : ''}
                  </Typography>
                ) : null}
                {row.statement_net_amount ? (
                  <Typography sx={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>
                    قابل پرداخت: {formatPersianNumber(row.statement_net_amount)} ریال
                    {statementNetForeign !== null ? ` · ≈ ${formatPersianNumber(statementNetForeign)} ${info.currency}` : ''}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={0.45}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 12, color: INK }}>{row.method || '—'}</Typography>
                  <Typography sx={{ fontSize: 12, color: MUTED }}>{row.reference ? `· ${row.reference}` : ''}</Typography>
                </Stack>
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap">
                  {row.invoice_number ? <Chip size="small" label={`فاکتور ${row.invoice_number}`} sx={{ height: 18, fontSize: 12, bgcolor: alpha(VIOLET, 0.07), color: VIOLET }} /> : null}
                  {row.statement_number ? <Chip size="small" label={`صورت‌وضعیت ${formatStatementNumber(row.statement_number)}`} sx={{ height: 18, fontSize: 12, bgcolor: alpha(BLUE, 0.07), color: BLUE }} /> : null}
                  {num(row.attachment_count ?? asArray(row.attachments).length) > 0 ? (
                    <Chip size="small" label={`${formatPersianNumber(row.attachment_count ?? asArray(row.attachments).length)} فایل`} sx={{ height: 18, fontSize: 12, bgcolor: alpha(TEAL, 0.07), color: TEAL }} />
                  ) : null}
                  {!row.invoice_number && !row.statement_number && !num(row.attachment_count ?? asArray(row.attachments).length) ? <Typography sx={{ fontSize: 12, color: MUTED }}>—</Typography> : null}
                </Stack>
              </TableCell>
              <TableCell>
                <Typography noWrap sx={{ maxWidth: 180, fontSize: 12, color: MUTED }}>{row.note || '—'}</Typography>
              </TableCell>
              <TableCell align="center">
                <IconButton size="small" onClick={(event) => { event.stopPropagation(); onEdit(row); }} sx={{ color: BLUE, p: 0.35 }}>
                  <EditOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={(event) => { event.stopPropagation(); onDelete(row); }} sx={{ color: RED, p: 0.35 }}>
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </TableContainer>
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
              <Chip size="small" label="پرداخت ثبت‌شده" sx={{ height: 20, fontSize: 12, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.13)', color: '#fff' }} />
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
              <InfoLine label="روش پرداخت" value={row.method || '—'} />
              <InfoLine label="شماره مرجع / سند" value={row.reference || '—'} ltr />
              {info.showForeign ? <InfoLine label="واحد ارز مرجع" value={info.currency} /> : null}
            </Box>
            <Divider />
            <Box sx={{ my: 1.8 }}>
              <SectionHeading icon={LinkOutlinedIcon} title="پیوندهای پرونده" color={VIOLET} />
              <InfoLine label="فاکتور مرتبط" value={row.invoice_number || '—'} />
              <InfoLine label="صورت‌وضعیت مرتبط" value={formatStatementNumber(row.statement_number) || '—'} />
              {row.statement_amount ? (
                <InfoLine label="مبلغ تجمعی صورت‌وضعیت (ریال)" value={`${formatPersianNumber(row.statement_amount)} ریال`} />
              ) : null}
              {statementForeign !== null ? (
                <InfoLine label="معادل ارزی مبلغ تجمعی" value={`${formatPersianNumber(statementForeign)} ${info.currency}`} />
              ) : null}
              {row.statement_net_amount ? (
                <InfoLine label="قابل پرداخت صورت‌وضعیت (ریال)" value={`${formatPersianNumber(row.statement_net_amount)} ریال`} strong color={GREEN} />
              ) : null}
              {statementNetForeign !== null ? (
                <InfoLine label="قابل پرداخت ارزی صورت‌وضعیت" value={`${formatPersianNumber(statementNetForeign)} ${info.currency}`} color={GREEN} />
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
  const referenceRate = Number(selectedCurrency?.exchange_rate) > 1 ? Number(selectedCurrency.exchange_rate) : 1;
  const selectedStatement = statementList.find((item) => String(item.id) === String(form.statement));
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
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{form.id ? 'ویرایش پرداخت' : 'ثبت پرداخت جدید'}</Typography>
          <Typography sx={{ fontSize: 12, color: MUTED }}>مبلغ، ارز، تاریخ، پیوندهای پرونده و مدارک پیوست را تکمیل کنید.</Typography>
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
            <Grid item xs={12} md={4}>
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
                        {formatStatementNumber(statement.number) || `صورت‌وضعیت ${toPersianDigits(statement.id)}`} · قابل پرداخت {formatPersianNumber(payable || 0)} ریال
                        {cumulativeForeign !== null ? ` · ${formatPersianNumber(cumulativeForeign)} ${info.currency}` : ''}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
        {selectedStatement ? (
          <Box sx={{ p: 1.1, borderRadius: '12px', bgcolor: alpha(BLUE, 0.035), border: `1px solid ${alpha(BLUE, 0.13)}` }}>
            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 0.8 }}>
              <LinkOutlinedIcon sx={{ fontSize: 17, color: BLUE }} />
              <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 900, color: INK }}>
                صورت‌وضعیت {formatStatementNumber(selectedStatement.number) || toPersianDigits(selectedStatement.id)}
              </Typography>
              <Chip size="small" label={selectedStatementInfo.showForeign ? selectedStatementInfo.currency : 'ریالی'}
                sx={{ height: 19, fontSize: 12, bgcolor: alpha(BLUE, 0.08), color: BLUE }} />
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.9 }}>
              <Box sx={{ p: 0.8, borderRadius: '9px', bgcolor: '#fff', border: '1px solid #e8eef2' }}>
                <Typography sx={{ fontSize: 12, color: MUTED }}>مبلغ تجمعی صورت‌وضعیت</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK }}>
                  {formatPersianNumber(selectedStatement.amount || 0)} ریال
                </Typography>
                {selectedStatementForeign !== null ? (
                  <Typography sx={{ fontSize: 12, color: MUTED }}>
                    ≈ {formatPersianNumber(selectedStatementForeign)} {selectedStatementInfo.currency}
                  </Typography>
                ) : null}
              </Box>
              <Box sx={{ p: 0.8, borderRadius: '9px', bgcolor: '#fff', border: `1px solid ${alpha(GREEN, 0.2)}` }}>
                <Typography sx={{ fontSize: 12, color: MUTED }}>مبلغ قابل پرداخت این دوره</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: GREEN }}>
                  {formatPersianNumber(selectedStatementPayable || 0)} ریال
                </Typography>
                {selectedStatementNetForeign !== null ? (
                  <Typography sx={{ fontSize: 12, color: GREEN }}>
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('cards');
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
      if (!query) return true;
      return [payment.reference, payment.method, payment.note, payment.invoice_number, payment.statement_number, formatStatementNumber(payment.statement_number)]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    return [...rows].sort((a, b) => {
      if (sortBy === 'amount') return num(b.amount) - num(a.amount);
      if (sortBy === 'oldest') return new Date(a.date || 0) - new Date(b.date || 0);
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
  }, [list, methodFilter, search, sortBy]);

  const totalPaid = list.reduce((sum, payment) => sum + num(payment.amount), 0);
  const averagePayment = list.length ? totalPaid / list.length : 0;
  const totalPaidForeign = contractRate > 1 ? totalPaid / contractRate : totalPaid;
  const averagePaymentForeign = contractRate > 1 ? averagePayment / contractRate : averagePayment;
  const coverage = contractAmountRial > 0 ? (totalPaid / contractAmountRial) * 100 : 0;
  const lastPayment = [...list].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
  const linkedInvoices = new Set(list.map((payment) => payment.invoice).filter(Boolean)).size;
  const linkedStatements = new Set(list.map((payment) => payment.statement).filter(Boolean)).size;

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
    const header = ['تاریخ', 'مبلغ', 'ارز', 'روش', 'مرجع', 'فاکتور', 'صورت‌وضعیت', 'توضیحات'];
    const body = filtered.map((payment) => [
      payment.date || '', payment.amount || 0, paymentCurrency(payment, contractCurrency),
      payment.method || '', payment.reference || '', payment.invoice_number || '',
      payment.statement_number ? formatStatementNumber(payment.statement_number) : '', payment.note || '',
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

      {!contractId ? (
        <>
          <Paper elevation={0} sx={{
            p: { xs: 1.8, md: 2.2 }, mb: 1.5, borderRadius: '18px',
            border: '1px solid #deeceb', position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(15,118,110,0.12), rgba(37,99,235,0.055) 55%, rgba(124,58,237,0.045) 100%), #fff',
            '&::after': { content: '""', position: 'absolute', width: 240, height: 240, borderRadius: '50%', top: -150, left: -85, bgcolor: alpha(TEAL, 0.05) },
          }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: { xs: 16, md: 20 }, fontWeight: 900, color: INK, letterSpacing: '-0.025em' }}>
                  پرداخت‌ها را دقیق، قابل پیگیری و متصل به پرونده مدیریت کنید.
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 12, color: MUTED, lineHeight: 1.9 }}>
                  مبلغ، ارز، تاریخ، روش و مرجع هر پرداخت را ثبت کنید و آن را به فاکتور و صورت‌وضعیت مرتبط پیوند دهید.
                </Typography>
                <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 1.1 }}>
                  <Chip size="small" icon={<LinkOutlinedIcon sx={{ fontSize: '13px !important' }} />} label="پیوند فاکتور و صورت‌وضعیت"
                    sx={{ height: 22, fontSize: 12, fontWeight: 700, bgcolor: alpha(TEAL, 0.07), color: TEAL, '& .MuiChip-icon': { color: TEAL } }} />
                  <Chip size="small" icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: '13px !important' }} />} label="پوشش مالی قرارداد"
                    sx={{ height: 22, fontSize: 12, fontWeight: 700, bgcolor: alpha(BLUE, 0.07), color: BLUE, '& .MuiChip-icon': { color: BLUE } }} />
                  <Chip size="small" icon={<TrendingUpOutlinedIcon sx={{ fontSize: '13px !important' }} />} label="روند و تحلیل پرداخت‌ها"
                    sx={{ height: 22, fontSize: 12, fontWeight: 700, bgcolor: alpha(VIOLET, 0.07), color: VIOLET, '& .MuiChip-icon': { color: VIOLET } }} />
                </Stack>
              </Box>
              <Box sx={{
                width: { xs: '100%', md: 360 }, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.75,
              }}>
                <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.84)', border: '1px solid #e5edf1' }}>
                  <Typography sx={{ fontSize: 12, color: MUTED }}>پرداخت‌های ثبت‌شده</Typography>
                  <Typography sx={{ mt: 0.1, fontSize: 17, fontWeight: 900, color: TEAL }}>{formatPersianNumber(allPayments.length)}</Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.84)', border: '1px solid #e5edf1' }}>
                  <Typography sx={{ fontSize: 12, color: MUTED }}>مجموع مبالغ</Typography>
                  <Typography sx={{ mt: 0.1, fontSize: 14, fontWeight: 900, color: BLUE }}>{compactMoney(allPaymentsTotal)} ریال</Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>

          <SurfaceCard title="انتخاب قرارداد" icon={DescriptionOutlinedIcon} color={TEAL}
            action={<Chip size="small" label={`${formatPersianNumber(contractList.length)} قرارداد`}
              sx={{ height: 20, fontSize: 12, bgcolor: alpha(TEAL, 0.07), color: TEAL }} />}>
            {contractsQuery.isLoading ? (
              <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={29} /></Box>
            ) : (
              <ContractListPicker
                contracts={contractList}
                onSelect={selectContract}
                selectedId={contractId}
                countLabel="پرداخت"
                countByContract={paymentCountByContract}
                getCount={(contract) => Number(paymentCountByContract[String(contract.id)] || 0)}
                height={520}
                accent={TEAL}
              />
            )}
          </SurfaceCard>
        </>
      ) : (
        <>
        <Grid container spacing={1.5}>
          <Grid item xs={12} lg={3}>
            <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
              <ContractSnapshotCard contract={selectedContract} currency={contractCurrency} contractRate={contractRate} navigate={navigate} onBack={clearContract} />
              <CoverageCard totalPaid={totalPaid} contractAmount={contractAmount} contractRate={contractRate} paymentCount={list.length}
                invoiceCount={linkedInvoices} statementCount={linkedStatements} currency={contractCurrency}
                averagePayment={averagePayment} lastPayment={lastPayment} />
              <MethodsCard methods={methods} activeMethod={methodFilter} onSelect={setMethodFilter} />
            </Stack>
          </Grid>

          <Grid item xs={12} lg={9}>
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid item xs={6} md={3}>
                <KpiTile icon={PaymentsOutlinedIcon} label="مجموع پرداخت‌ها (ریال)" value={compactMoney(totalPaid)} suffix="ریال"
                  hint={contractRate > 1 ? `≈ ${compactMoney(totalPaidForeign)} ${contractCurrency} · ${formatPersianNumber(list.length)} فقره` : `${formatPersianNumber(list.length)} فقره پرداخت`} color={TEAL} />
              </Grid>
              <Grid item xs={6} md={3}>
                <KpiTile icon={CheckCircleOutlineIcon} label="تعداد پرداخت" value={formatPersianNumber(list.length)} suffix="فقره" hint={`${formatPersianNumber(linkedInvoices)} فاکتور پیوندی`} color={GREEN} />
              </Grid>
              <Grid item xs={6} md={3}>
                <KpiTile icon={AccountBalanceWalletOutlinedIcon} label="میانگین پرداخت (ریال)" value={compactMoney(averagePayment)} suffix="ریال"
                  hint={contractRate > 1 ? `≈ ${compactMoney(averagePaymentForeign)} ${contractCurrency} · پوشش ${formatPersianPercent(coverage)}` : `پوشش ${formatPersianPercent(coverage)}`} color={BLUE} />
              </Grid>
              <Grid item xs={6} md={3}>
                <KpiTile icon={CalendarMonthOutlinedIcon} label="آخرین پرداخت" value={lastPayment ? toJalali(lastPayment.date) : '—'} hint={lastPayment?.method || 'بدون پرداخت'} color={AMBER} />
              </Grid>
            </Grid>

            <Paper elevation={0} sx={{ p: 1.2, mb: 1.5, borderRadius: '14px', border: '1px solid #e5edf1', bgcolor: '#fff' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                <TextField size="small" placeholder="جست‌وجو در مرجع، روش، فاکتور یا توضیحات…" value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment> }}
                  sx={{ flex: 1, '& .MuiOutlinedInput-root': { height: 35, borderRadius: '9px', fontSize: 12 } }} />
                <FormControl size="small" sx={{ minWidth: 145 }}>
                  <InputLabel>روش پرداخت</InputLabel>
                  <Select label="روش پرداخت" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} sx={{ height: 35, borderRadius: '9px', fontSize: 12 }}>
                    <MenuItem value="">همه روش‌ها</MenuItem>
                    {methods.map((item) => <MenuItem key={item.name} value={item.name}>{item.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 135 }}>
                  <InputLabel>ترتیب</InputLabel>
                  <Select label="ترتیب" value={sortBy} onChange={(event) => setSortBy(event.target.value)} sx={{ height: 35, borderRadius: '9px', fontSize: 12 }}>
                    <MenuItem value="newest">جدیدترین</MenuItem>
                    <MenuItem value="oldest">قدیمی‌ترین</MenuItem>
                    <MenuItem value="amount">بیشترین مبلغ</MenuItem>
                  </Select>
                </FormControl>
                <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => value && setView(value)}>
                  <ToggleButton value="cards" aria-label="نمای کارت" sx={{ px: 1 }}><Tooltip title="کارت"><ViewModuleOutlinedIcon fontSize="small" /></Tooltip></ToggleButton>
                  <ToggleButton value="table" aria-label="نمای جدول" sx={{ px: 1 }}><Tooltip title="جدول"><TableRowsOutlinedIcon fontSize="small" /></Tooltip></ToggleButton>
                </ToggleButtonGroup>
                <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openNew}
                  sx={{ display: { xs: 'none', md: 'flex' }, bgcolor: TEAL, '&:hover': { bgcolor: '#115e59' } }}>پرداخت جدید</Button>
              </Stack>
            </Paper>

            {paymentsQuery.isLoading ? (
              <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress size={30} /></Box>
            ) : !filtered.length ? (
              <EmptyState icon={PaymentsOutlinedIcon} title={list.length ? 'پرداختی با این مشخصات پیدا نشد' : 'پرداختی برای این قرارداد ثبت نشده است'}
                hint={list.length ? 'فیلترها یا عبارت جست‌وجو را تغییر دهید.' : 'اولین پرداخت را ثبت کنید تا پوشش مالی و روند شکل بگیرد.'}
                action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openNew} sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#115e59' } }}>ثبت پرداخت جدید</Button>} />
            ) : view === 'cards' ? (
              <Grid container spacing={1.5}>
                {filtered.map((payment) => (
                  <Grid item xs={12} sm={6} lg={4} xl={3} key={payment.id}>
                    <PaymentCard row={payment} currency={contractCurrency} contractRate={contractRate} onView={setDetail}
                      onEdit={openEdit} onDelete={(row) => { setDeleteTarget(row); setDetail(null); }} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <PaymentTable rows={filtered} currency={contractCurrency} contractRate={contractRate} onView={setDetail}
                onEdit={openEdit} onDelete={(row) => { setDeleteTarget(row); setDetail(null); }} />
            )}

            <Box sx={{ mt: 1.5 }}>
              <SurfaceCard title="روند پرداخت‌ها" icon={TrendingUpOutlinedIcon} color={VIOLET}
                action={<Chip size="small" label={`${formatPersianNumber(list.length)} پرداخت در ${formatPersianNumber(monthlyData.filter((item) => item.value > 0).length)} ماه`}
                  sx={{ height: 20, fontSize: 12, bgcolor: alpha(VIOLET, 0.07), color: VIOLET }} />}>
                {!monthlyData.some((item) => item.value > 0) ? (
                  <Box sx={{ py: 3, textAlign: 'center', color: MUTED, fontSize: 12 }}>پرداختی در ۶ ماه اخیر ثبت نشده است.</Box>
                ) : <ColumnChart data={monthlyData} height={160} />}
              </SurfaceCard>
            </Box>
          </Grid>
        </Grid>
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
