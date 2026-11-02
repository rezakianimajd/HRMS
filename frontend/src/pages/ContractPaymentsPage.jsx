import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Drawer,
  IconButton, Paper,
  Snackbar, Stack,
  Tooltip, Typography, alpha,
} from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
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
import { INK, MUTED } from './accounting/AccountingDashboardUI';
import { formatPersianNumber, formatStatementNumber, normalizeCurrencyLabel, toPersianDigits } from '../core/utils/numberUtils';
import { getJalaliParts, toJalali } from '../core/utils/dateUtils';
import {
  CONTRACT_STATUS_LABELS as STATUS_LABELS,
  CONTRACT_STATUS_COLORS as STATUS_COLORS,
} from '../core/theme/tokens';
import { contractRateOf } from './contracts/contractFinanceSummary';
import { adjustmentSummaryOf, statementDisplayTitle, statementKindOf } from './contracts/statementKinds';
import ContractPaymentEditorDialog from './contracts/ContractPaymentEditorDialog';
import { PAYMENT_TYPES, paymentTypeOf } from './contracts/paymentTypes';
import { allocationsFromPayment, allocationsPayload, bucketMeta, numOf } from './contracts/paymentAllocations';
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
const SLATE = '#475569';
const PALETTE = [TEAL, BLUE, VIOLET, AMBER, '#0e7490', '#be185d', '#4f46e5', '#15803d'];
const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const EMPTY = {
  id: null, contract: '', invoice: '', statement: '', date: '', currency: '',
  amount: '', payment_type: 'normal', reference: '', method: '', note: '', allocations: [],
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
              {asArray(row.allocations).length ? (
                <Box sx={{ mb: 0.9 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.4 }}>
                    <Typography sx={{ fontSize: 11.5, color: MUTED }}>تخصیص این پرداخت</Typography>
                    <Chip
                      size="small"
                      label={`${formatPersianNumber(asArray(row.allocations).length)} سند`}
                      sx={{ height: 19, fontSize: 10, fontWeight: 800, bgcolor: alpha(VIOLET, 0.1), color: VIOLET }}
                    />
                  </Stack>
                  <Stack spacing={0.4}>
                    {asArray(row.allocations).map((allocation) => {
                      const bucket = bucketMeta(allocation.kind);
                      return (
                        <Stack
                          key={allocation.id}
                          direction="row"
                          alignItems="center"
                          spacing={0.7}
                          sx={{ p: 0.55, px: 0.8, borderRadius: '9px', border: '1px solid #e6edf1', bgcolor: '#fff' }}
                        >
                          <Chip
                            size="small"
                            label={allocation.kind_display || bucket.label}
                            sx={{
                              height: 18, fontSize: 9.5, fontWeight: 800,
                              bgcolor: alpha(bucket.color, 0.09), color: bucket.color,
                            }}
                          />
                          <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 700, color: INK }}>
                            {allocation.title || '—'}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: VIOLET, direction: 'rtl' }}>
                            {formatPersianNumber(allocation.amount || 0)}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Box>
              ) : null}
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
      allocations: [],
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
      allocations: allocationsFromPayment(payment),
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


  const sanitize = (payload) => {
    const isAdvance = (payload.payment_type || 'normal') === 'advance';
    const allocationRows = isAdvance ? [] : (payload.allocations || []);
    const allocations = allocationsPayload(allocationRows);
    const firstStatement = allocations.find((row) => row.statement)?.statement || null;
    const firstInvoice = allocations.find((row) => row.invoice)?.invoice || null;
    return {
      contract: payload.contract || null,
      // کلیدهای تک‌مقداری برای سازگاری با نسخه‌های قدیمی؛ منبع اصلی `allocations` است.
      invoice: firstInvoice,
      statement: firstStatement,
      date: payload.date || null,
      currency: payload.currency || null,
      amount: payload.amount === '' || payload.amount == null ? 0 : Number(payload.amount),
      payment_type: payload.payment_type || 'normal',
      reference: payload.reference || '',
      method: payload.method || '',
      note: payload.note || '',
      allocations,
    };
  };

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
      // ماندهٔ صورت‌وضعیت‌ها و فاکتورها پس از ثبت پرداخت باید پویا تازه شود.
      qc.invalidateQueries({ queryKey: ['statements-pay'] });
      qc.invalidateQueries({ queryKey: ['invoices-pay'] });
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
    const amount = num(form.amount);
    if (amount <= 0) { setError('مبلغ پرداخت باید بزرگ‌تر از صفر باشد'); return; }
    if ((form.payment_type || 'normal') !== 'advance') {
      const allocations = allocationsPayload(form.allocations || []);
      const allocated = allocations.reduce((sum, row) => sum + numOf(row.amount), 0);
      if (allocated > amount) {
        setError('جمع مبالغ تخصیص‌یافته از مبلغ پرداخت بیشتر است');
        return;
      }
    }
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
                  render: (row) => {
                    const allocations = asArray(row.allocations);
                    if (allocations.length > 1) {
                      return (
                        <Stack direction="row" spacing={0.4} justifyContent="center" alignItems="center" useFlexGap>
                          <Chip
                            size="small"
                            label={`${formatPersianNumber(allocations.length)} سند`}
                            sx={{ height: 19, fontSize: 10, fontWeight: 800, bgcolor: alpha(VIOLET, 0.09), color: VIOLET }}
                          />
                          <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
                            {formatPersianNumber(row.allocated_amount || row.amount || 0)}
                          </Typography>
                        </Stack>
                      );
                    }
                    return (
                      <Typography noWrap sx={{ fontSize: 11, color: MUTED }}>
                        {row.invoice_number ? `فاکتور ${toPersianDigits(row.invoice_number)}` : '—'}
                        {row.statement_number ? ` · ${statementDisplayTitle(row)}` : ''}
                      </Typography>
                    );
                  },
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

      <ContractPaymentEditorDialog open={dialog} onClose={closeEditor} form={form} setForm={setForm}
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
