import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import downloadFile from '../core/utils/downloadUtils';
import {
  Alert, Box, Button, CircularProgress, Divider, Paper, Stack, Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PaymentsIcon from '@mui/icons-material/Payments';
import GavelIcon from '@mui/icons-material/Gavel';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LockIcon from '@mui/icons-material/Lock';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { formatPersianNumber, toPersianDigits, normalizeCurrencyLabel } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { getJalaliParts, toJalali } from '../core/utils/dateUtils';
import { CONTRACT_STATUS_LABELS as STATUS_LABELS, CONTRACT_STATUS_COLORS as STATUS_COLORS, CONTRACT_TYPE_LABELS as TYPE_LABELS } from '../core/theme/tokens';
import { contractRateOf, summarizeStatementFinance } from './contracts/contractFinanceSummary';
import { statementDisplayTitle } from './contracts/statementKinds';
import { INK, MUTED } from './contracts/ContractProfileUI';
import {
  AddendumsTab, DocumentsTab, FinanceTab, GuaranteesTab, IdentityTab, InvoicesTab,
  OverviewTab, PaymentsTab, RelatedTab, StatementsTab, TimelineTab,
} from './contracts/ContractProfileTabs';

const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

/* کاشی مشخصه در کارت قرارداد */
const SpecTile = ({ label, value, color, bg }) => (
  <Box sx={{
    px: 1, py: 0.75,
    minWidth: 0,
    borderRadius: '11px',
    border: '1px solid', borderColor: 'divider',
    bgcolor: bg || 'transparent',
  }}>
    <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{label}</Typography>
    <Typography noWrap title={typeof value === 'string' ? value : undefined} sx={{
      mt: 0.2, fontSize: 12.5, fontWeight: 800,
      color: color || INK,
      fontFamily: 'var(--hrms-table-number-font, inherit)',
    }}>
      {value}
    </Typography>
  </Box>
);

const ContractProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [tab, setTab] = useState(0);

  // خروجی اکسل کامل این قرارداد (تمام آیتم‌های درون قرارداد) — با احراز هویت JWT
  const exportContract = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError('');
    try {
      await downloadFile('/external-contracts/export-excel/', {
        params: { contract: id },
        fallbackName: `contract-${id}.xlsx`,
      });
    } catch (e) {
      setExportError(`خطا در تهیهٔ فایل اکسل: ${e?.message || 'نامشخص'}`);
    } finally {
      setExporting(false);
    }
  };

  const { data: c, isLoading } = useQuery({
    queryKey: ['external-contract', id],
    queryFn: () => axiosInstance.get(`/external-contracts/${id}/`).then(r => r.data),
  });

  const { data: allContracts } = useQuery({
    queryKey: ['external-contracts-all'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 1000 } }).then(r => r.data),
  });
  const allList = Array.isArray(allContracts) ? allContracts : allContracts?.results || [];

  // پروندهٔ مؤثر قرارداد: اثر همهٔ الحاقیه‌ها (مبلغ، پیش‌پرداخت، مدت، تضمین و ...)
  const { data: effects } = useQuery({
    queryKey: ['contract-effects', id],
    queryFn: () => axiosInstance.get(`/external-contracts/${id}/effective/`).then(r => r.data),
    enabled: !!id,
  });

  // وضعیت تأمین تضامین: کدام قلم تضمین اورده شده و کدام نه
  const { data: guaranteeStatus } = useQuery({
    queryKey: ['contract-guarantees-status', id],
    queryFn: () => axiosInstance.get(`/external-contracts/${id}/guarantees-status/`).then(r => r.data),
    enabled: !!id,
  });

  const relatedContracts = useMemo(() => {
    if (!c) return [];
    const projects = new Set((c.project_allocations || []).map(p => p.project).filter(Boolean));
    if (c.project) projects.add(c.project);
    return allList.filter(x => String(x.id) !== String(c.id) && (
      projects.size > 0 && ((x.project_allocations || []).some(p => projects.has(p.project)) || (x.project && projects.has(x.project)))
    )).slice(0, 8);
  }, [allList, c]);

  const timeline = useMemo(() => {
    if (!c) return [];
    const events = [];
    const push = (date, type, title, extra) => { if (date) events.push({ date, type, title, extra }); };
    push(c.created_at?.slice(0, 10), 'created', 'ایجاد قرارداد', `شماره ${c.number || '—'}`);
    push(c.signing_date, 'signing', 'امضای قرارداد', c.signatory_name);
    push(c.start_date, 'start', 'شروع قرارداد', '');
    push(c.end_date, 'end', 'پایان / انقضای قرارداد', '');
    (c.invoices || []).forEach(x => push(x.date, 'invoice', 'ثبت فاکتور', `${x.number || '—'} · ${formatPersianNumber(x.total || 0)} ریال`));
    (c.statements || []).forEach(x => push(x.date, 'statement', 'ثبت صورت‌وضعیت', `${statementDisplayTitle(x) || '—'} · ${formatPersianNumber(x.net_amount ?? x.amount ?? 0)} ریال`));
    (c.addendums || []).forEach(x => push(x.date, 'addendum', 'ثبت الحاقیه', x.subject_type_display || x.number || x.change_description?.slice(0, 40)));
    (c.guarantees || []).forEach(x => push(x.issue_date, 'guarantee', 'صدور تضمین', x.guarantee_type_display));
    (c.guarantees || []).forEach(x => push(x.expiry_date, 'guarantee-expiry', 'انقضای تضمین', x.number || ''));
    (c.payments || []).forEach(x => push(x.date, 'payment', 'پرداخت', `${formatPersianNumber(x.amount || 0)} ریال`));
    (c.documents || []).forEach(x => push(x.uploaded_at?.slice(0, 10), 'document', 'بارگذاری سند', x.title));
    return events.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [c]);

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box>;
  if (!c) return (
    <Box sx={{ textAlign: 'center', p: 6 }}>
      <Typography color="error" variant="h5">قرارداد یافت نشد</Typography>
      <Button onClick={() => navigate('/external-contracts')} sx={{ mt: 2 }}>بازگشت</Button>
    </Box>
  );

  const totalPaid = (c.payments || []).reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalInvoices = (c.invoices || []).reduce((s, x) => s + Number(x.total || 0), 0);
  const addendumTotal = (c.addendums || []).reduce((s, x) => s + Number(x.amount_change || 0), 0);
  // مقادیر مؤثر: اول از موتور بک‌اند، در نبود آن محاسبهٔ محلی
  const effective = effects?.effective || {};
  const amountWithAddendum = Number(effective.amount ?? (Number(c.amount || 0) + addendumTotal));
  const advanceWithAddendum = Number(effective.advance_payment ?? c.advance_payment ?? 0);
  const guaranteeWithAddendum = Number(effective.guarantee_amount ?? c.guarantee_amount ?? 0);
  const retentionWithAddendum = Number(effective.retention_percent ?? c.retention_percent ?? 0);
  const addendumsWithEnd = (c.addendums || []).filter(a => a.new_end_date);
  const lastAddendum = addendumsWithEnd.length ? addendumsWithEnd.reduce((m, a) => (a.date > m.date ? a : m)) : null;
  const endDateWithAddendum = effective.end_date || lastAddendum?.new_end_date || c.end_date;
  const currencyLabel = normalizeCurrencyLabel(c.currency_name || c.currency_symbol);
  const contractRate = contractRateOf(c, c.statements || []);
  const financial = summarizeStatementFinance(c.statements || [], contractRate);
  const amountWithAddendumRial = amountWithAddendum * contractRate;
  const totalStatements = financial.rial.amount;
  const adjustmentNetRial = financial.adjustments.net;
  const adjustedContractAmountRial = amountWithAddendumRial + adjustmentNetRial;
  const adjustedContractAmount = contractRate > 1 ? adjustedContractAmountRial / contractRate : adjustedContractAmountRial;
  const remainingRial = Math.max(0, adjustedContractAmountRial - totalPaid);
  const progressPercent = adjustedContractAmountRial > 0
    ? Math.min(100, Math.round((totalPaid / adjustedContractAmountRial) * 100))
    : 0;
  const remainingDays = endDateWithAddendum
    ? Math.ceil((new Date(`${String(endDateWithAddendum).slice(0, 10)}T00:00:00`) - new Date()) / 86400000)
    : null;
  const contractTypeLabel = c.contract_type_master_name || TYPE_LABELS[c.contract_type] || '—';
  const guaranteeSummary = guaranteeStatus?.summary || null;
  const guaranteeItems = (guaranteeStatus?.requirements || []).flatMap((requirement) => (
    (requirement.items || []).map((item) => ({ ...item, type_label: item.type_label || requirement.label }))
  ));
  const fallbackGuaranteeItems = (c.guarantees || []).map((item) => ({
    ...item,
    type_label: item.instrument_type_display || item.guarantee_type_display,
    expiry_date: item.expiry_date,
  }));
  const visibleGuaranteeItems = guaranteeItems.length ? guaranteeItems : fallbackGuaranteeItems;
  const guaranteeCount = guaranteeSummary?.registered_count ?? (c.guarantees || []).length;
  const coveragePercent = Number(guaranteeSummary?.coverage_percent ?? (
    adjustedContractAmount > 0 && guaranteeWithAddendum > 0
      ? Math.min(100, Math.round((guaranteeWithAddendum / adjustedContractAmount) * 100))
      : 0
  ));
  const addendumCount = (c.addendums || []).length;

  const paidByMonth = new Map();
  (c.payments || []).forEach((payment) => {
    const key = String(payment.date || '').slice(0, 7);
    if (!key) return;
    paidByMonth.set(key, (paidByMonth.get(key) || 0) + Number(payment.amount || 0));
  });
  const paymentMonths = paidByMonth.size
    ? [...paidByMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([key, value]) => {
        const parts = getJalaliParts(`${key}-01`);
        return { label: JALALI_MONTHS[(parts?.[1] || 1) - 1], value };
      })
    : Array.from({ length: 6 }, (_unused, index) => {
      const monthDate = new Date();
      monthDate.setDate(1);
      monthDate.setMonth(monthDate.getMonth() - (5 - index));
      const parts = getJalaliParts(`${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`);
      return { label: JALALI_MONTHS[(parts?.[1] || 1) - 1], value: 0 };
    });

  const quickLinks = [
    { label: 'فاکتورها', path: '/contracts-invoices', icon: ReceiptIcon, color: theme.palette.secondary.main, count: (c.invoices || []).length, meta: `جمع ${formatPersianNumber(totalInvoices)}` },
    { label: 'صورت‌وضعیت‌ها', path: '/contracts-statements', icon: ReceiptLongIcon, color: theme.palette.info.main, count: (c.statements || []).length, meta: `خالص ${formatPersianNumber(totalStatements)}` },
    { label: 'پرداخت‌ها', path: '/contracts-payments', icon: PaymentsIcon, color: theme.palette.success.main, count: (c.payments || []).length, meta: `جمع ${formatPersianNumber(totalPaid)}` },
    { label: 'الحاقیه‌ها', path: '/contracts-addendums', icon: EditNoteIcon, color: theme.palette.warning.main, count: addendumCount, meta: `اثر ${formatPersianNumber(addendumTotal)}` },
    { label: 'تضمین‌ها', path: '/contracts-guarantees', icon: LockIcon, color: theme.palette.primary.main, count: guaranteeCount, meta: `${toPersianDigits(coveragePercent)}٪ پوشش` },
    { label: 'اختلافات', path: '/contracts-disputes', icon: GavelIcon, color: theme.palette.error.main, count: (c.disputes || []).length, meta: 'پیگیری پرونده' },
    { label: 'هم‌تراز', icon: HandshakeIcon, color: theme.palette.primary.main, count: relatedContracts.length, meta: 'قراردادهای هم‌تراز', onClick: () => setTab(9) },
    { label: 'اسناد و بایگانی', path: '/contracts-documents', icon: FolderOpenIcon, color: theme.palette.text.secondary, count: (c.documents || []).length, meta: 'مشاهدهٔ اسناد' },
  ].map((item) => ({
    ...item,
    onClick: item.onClick || (() => navigate(`${item.path}?contract=${id}`)),
  }));

  /* پروژه‌ها (برای تب مشخصات قرارداد) */
  const projectNames = (c.project_allocations_display || [])
    .map((allocation) => allocation.project_name)
    .filter(Boolean);
  if (!projectNames.length) {
    const singleProject = c.project_title || c.project_name;
    if (singleProject) projectNames.push(singleProject);
  }

  const openAddendums = () => navigate(`/contracts-addendums?contract=${id}`);
  const openGuarantees = () => navigate(`/contracts-guarantees?contract=${id}`);
  const openArchive = () => navigate(`/contracts-documents?contract=${id}`);
  const openRelated = (contractId) => navigate(`/external-contracts/${contractId}`);
  const openDocument = (doc) => {
    if (!doc?.file_url) return;
    window.open(doc.file_url, '_blank', 'noopener,noreferrer');
  };
  const downloadDocument = (doc) => {
    if (!doc?.file_url) return;
    const link = document.createElement('a');
    link.href = doc.file_url;
    link.download = doc.file_name || doc.title || 'contract-document';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const editDocument = (doc) => navigate(`/contracts-documents?contract=${id}&document=${doc.id}`);

  const ctx = {
    contract: c,
    accent: theme.palette.primary.main,
    effects,
    relatedContracts,
    timeline,
    currencyLabel,
    contractRate,
    financial,
    adjustedContractAmount,
    adjustedContractAmountRial,
    totalStatements,
    totalPaid,
    totalInvoices,
    remainingRial,
    progressPercent,
    adjustmentNetRial,
    guaranteeSummary,
    guaranteeReport: guaranteeStatus || null,
    guarantees: c.guarantees || [],
    visibleGuaranteeItems,
    guaranteeCount,
    coveragePercent,
    addendumCount,
    paymentMonths,
    remainingDays,
    effectiveEndDate: endDateWithAddendum,
    contractTypeLabel,
    advanceAmount: advanceWithAddendum,
    guaranteeAmount: guaranteeWithAddendum,
    retentionPercent: retentionWithAddendum,
    projectNames,
    statusLabels: STATUS_LABELS,
    statusColors: STATUS_COLORS,
    openAddendums,
    openGuarantees,
    openRelated,
    openArchive,
    openDocument,
    downloadDocument,
    editDocument,
  };

  const tabs = [
    { key: 'overview', label: 'نمای کلی', content: <OverviewTab ctx={ctx} /> },
    { key: 'timeline', label: 'تایم‌لاین', content: <TimelineTab ctx={ctx} /> },
    { key: 'identity', label: 'مشخصات قرارداد', content: <IdentityTab ctx={ctx} /> },
    { key: 'finance', label: 'مشخصات مالی', content: <FinanceTab ctx={ctx} /> },
    { key: 'addendums', label: 'الحاقیه‌ها', content: <AddendumsTab ctx={ctx} /> },
    { key: 'guarantees', label: 'تضامین', content: <GuaranteesTab ctx={ctx} /> },
    { key: 'statements', label: 'صورت‌وضعیت', content: <StatementsTab ctx={ctx} /> },
    { key: 'invoices', label: 'فاکتورها', content: <InvoicesTab ctx={ctx} /> },
    { key: 'payments', label: 'پرداخت‌ها', content: <PaymentsTab ctx={ctx} /> },
    { key: 'related', label: 'قراردادهای هم‌تراز', content: <RelatedTab ctx={ctx} /> },
    { key: 'documents', label: 'مدارک', content: <DocumentsTab ctx={ctx} /> },
  ];




  return (
    <Box>
      <PageHeader
        icon={<HandshakeIcon />}
        title={toPersianDigits(c.number || '—')}
        subtitle={c.subject || 'پروندهٔ قرارداد'}
        actions={(
          <>
            <Button variant="text" startIcon={<ArrowBackIcon />} onClick={() => navigate('/external-contracts')}>بازگشت</Button>
            <Tooltip title="خروجی اکسل کامل پرونده">
              <span>
                <Button variant="outlined" disabled={exporting}
                  startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                  onClick={exportContract}>
                  {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
                </Button>
              </span>
            </Tooltip>
            <Button variant="contained" onClick={() => navigate(`/contracts/${id}/edit`)}>ویرایش</Button>
          </>
        )}
      />

      {exportError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError('')}>{exportError}</Alert>
      ) : null}

      {/* ۱) کارت قرارداد — طرف قرارداد و مشخصات کلی خوانا، بها/پیشرفت بدون چیپ */}
      <Paper elevation={0} sx={{
        p: { xs: 1.5, md: 2.25 },
        mb: 2,
        borderRadius: 'var(--hrms-radius-large, 18px)',
        border: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={{ xs: 2, lg: 2.5 }} alignItems="stretch">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{
                width: 48, height: 48, borderRadius: '14px', flexShrink: 0,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <HandshakeIcon sx={{ fontSize: 25 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap title={c.subject} sx={{ fontSize: 16, fontWeight: 900, color: INK, lineHeight: 1.5 }}>
                  {c.subject || '—'}
                </Typography>
                <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mt: 0.3 }}>
                  <Typography sx={{ fontSize: 11.5, color: MUTED }}>
                    شمارهٔ {toPersianDigits(c.number || '—')}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: MUTED }}>· {contractTypeLabel}</Typography>
                  {c.category ? <Typography sx={{ fontSize: 11.5, color: MUTED }}>· {c.category}</Typography> : null}
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS[c.status] || '#64748b' }} />
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                      {STATUS_LABELS[c.status] || '—'}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>

            {/* طرف قرارداد — برجسته */}
            <Box sx={{
              mt: 1.5, px: 1.1, py: 0.85,
              display: 'flex', alignItems: 'center', gap: 1,
              borderRadius: '12px', border: '1px dashed', borderColor: 'divider',
              bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.05 : 0.015),
            }}>
              <StorefrontIcon sx={{ fontSize: 18, color: theme.palette.primary.main, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>طرف قرارداد</Typography>
              <Typography noWrap title={c.party_name} sx={{ fontSize: 13, fontWeight: 800, color: INK, minWidth: 0 }}>
                {c.party_name || '—'}
              </Typography>
              {c.signatory_name ? (
                <Typography noWrap sx={{ ml: 'auto', fontSize: 10.5, color: MUTED }}>
                  امضاکننده: {c.signatory_name}
                </Typography>
              ) : null}
            </Box>

            {/* مشخصات کلی */}
            <Box sx={{
              mt: 1.2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, minmax(0, 1fr))' },
              gap: 1,
            }}>
              <SpecTile label="شروع قرارداد" value={toJalali(c.start_date)} />
              <SpecTile label="پایان پایه" value={toJalali(c.end_date)} />
              <SpecTile
                label="پایان با الحاقیه"
                value={toJalali(endDateWithAddendum)}
                color={theme.palette.info.dark}
                bg={alpha(theme.palette.info.main, 0.06)}
              />
              <SpecTile
                label="زمان باقی‌مانده"
                value={remainingDays === null
                  ? 'بدون پایان'
                  : remainingDays < 0
                    ? `${toPersianDigits(Math.abs(remainingDays))} روز گذشته`
                    : `${toPersianDigits(remainingDays)} روز`}
                color={remainingDays !== null && remainingDays < 0 ? theme.palette.error.dark : theme.palette.warning.dark}
                bg={alpha(remainingDays !== null && remainingDays < 0 ? theme.palette.error.main : theme.palette.warning.main, 0.06)}
              />
            </Box>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />

          {/* بها و پیشرفت مالی — بدون هیچ چیپ */}
          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', lg: 340 } }}>
            <Typography sx={{ fontSize: 11, color: MUTED }}>مبلغ مؤثر قرارداد با الحاقیه و تعدیل</Typography>
            <Typography sx={{
              mt: 0.2, fontSize: 25, fontWeight: 900, lineHeight: 1.35,
              direction: 'rtl', color: theme.palette.warning.dark,
            }}>
              {formatPersianNumber(adjustedContractAmount)}
              {' '}
              <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: MUTED }}>{currencyLabel}</Box>
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
              <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: alpha(theme.palette.text.primary, 0.07), overflow: 'hidden' }}>
                <Box sx={{
                  width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                  height: '100%', borderRadius: 4,
                  bgcolor: progressPercent >= 100 ? theme.palette.success.main : theme.palette.info.main,
                }} />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: theme.palette.info.main }}>
                {toPersianDigits(progressPercent)}٪
              </Typography>
            </Stack>
            <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
              <SpecTile label="پرداخت‌شده (ریال)" value={formatPersianNumber(totalPaid)} color={theme.palette.success.dark} />
              <SpecTile label="مانده مالی (ریال)" value={formatPersianNumber(remainingRial)} color={theme.palette.error.dark} />
            </Box>
          </Box>
        </Stack>
      </Paper>




      {/* ۲) دسترسی سریع — ردیف کارت‌های تک‌خطی با تعداد موارد */}
      <Box sx={{
        mb: 2,
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: { xs: 'minmax(160px, 1fr)', md: 'minmax(0, 1fr)' },
        gap: 1,
        overflowX: 'auto',
        pb: 0.5,
      }}>
        {quickLinks.map((item) => {
          const Icon = item.icon;
          const accent = item.color || theme.palette.primary.main;
          return (
            <Box
              key={item.label}
              role="button"
              tabIndex={0}
              onClick={item.onClick}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.onClick(); }
              }}
              sx={{
                px: 1.1, py: 0.9, minWidth: 0,
                display: 'flex', alignItems: 'center', gap: 1,
                cursor: 'pointer',
                borderRadius: '12px',
                border: '1px solid', borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: 'border-color .15s ease, transform .15s ease, background-color .15s ease',
                '&:hover': { borderColor: alpha(accent, 0.45), transform: 'translateY(-1px)', bgcolor: alpha(accent, 0.02) },
                '&:focus-visible': { outline: `2px solid ${alpha(accent, 0.5)}`, outlineOffset: 1 },
              }}
            >
              <Box sx={{
                width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(accent, 0.08), color: accent,
              }}>
                <Icon sx={{ fontSize: 16 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>{item.label}</Typography>
                <Typography noWrap sx={{ mt: 0.1, fontSize: 10.5, color: MUTED }}>
                  {item.count ? `${toPersianDigits(item.count)} مورد` : 'بدون مورد'}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ۳) تب‌های پرونده */}
      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-radius-large, 18px)',
        border: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', boxShadow: 'none', overflow: 'hidden',
      }}>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            borderBottom: '1px solid', borderColor: 'divider',
            minHeight: 42,
            '& .MuiTab-root': { minHeight: 42, py: 0.5, fontSize: 12.5, fontWeight: 700, textTransform: 'none' },
          }}
        >
          {tabs.map((item) => <Tab key={item.key} label={item.label} />)}
        </Tabs>
        <Box sx={{ p: { xs: 1.25, md: 2 } }}>
          {tabs[tab]?.content}
        </Box>
      </Paper>
    </Box>
  );
};

export default ContractProfilePage;

