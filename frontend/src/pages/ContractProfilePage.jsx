import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import downloadFile from '../core/utils/downloadUtils';
import {
  Alert, Box, Typography, Button, CircularProgress, Chip, Grid, Stack, Tooltip,
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
import ScheduleIcon from '@mui/icons-material/Schedule';
import HubIcon from '@mui/icons-material/Hub';
import { formatPersianNumber, toPersianDigits, normalizeCurrencyLabel } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { getJalaliParts } from '../core/utils/dateUtils';
import { CONTRACT_STATUS_LABELS as STATUS_LABELS, CONTRACT_STATUS_COLORS as STATUS_COLORS, CONTRACT_TYPE_LABELS as TYPE_LABELS } from '../core/theme/tokens';
import { SectionCard, TimelineList, EmptyState } from './contracts/ContractProfileUI';
import {
  StudioIdentityCard, QuickAccessStrip, ContractFinanceStudioCard, GuaranteeCompactCard,
  CoverageCompactCard, AddendumsStudioCard, TermsStudioCard, RelatedContractsStudioCard,
} from './contracts/ContractProfileStudioUI';
import { contractRateOf, summarizeStatementFinance } from './contracts/contractFinanceSummary';
import { statementDisplayTitle } from './contracts/statementKinds';

const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const ContractProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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
    { label: 'اسناد و بایگانی', path: '/contracts-documents', icon: FolderOpenIcon, color: theme.palette.text.secondary, count: (c.documents || []).length, meta: 'مشاهدهٔ اسناد' },
  ].map((item) => ({ ...item, onClick: () => navigate(`${item.path}?contract=${id}`) }));


  return (
    <Box>
      <PageHeader
        icon={<HandshakeIcon />}
        title={toPersianDigits(c.number || '—')}
        badge={(
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            <Chip size="small" variant="outlined" label={contractTypeLabel} />
            <Chip size="small" label={STATUS_LABELS[c.status] || '—'}
              sx={{ color: '#fff', bgcolor: STATUS_COLORS[c.status] || '#64748b', fontWeight: 700 }} />
          </Stack>
        )}
        actions={(
          <>
            <Button variant="text" startIcon={<ArrowBackIcon />} onClick={() => navigate('/external-contracts')}>بازگشت</Button>
            <Tooltip title="خروجی اکسل کامل این قرارداد: مفاد و شرایط، پروژه‌ها، پیش‌پرداخت‌ها، ضمانت‌ها، تضمین‌ها، فاکتورها، صورت‌وضعیت‌ها، پرداخت‌ها، الحاقیه‌ها و اختلافات">
              <span>
                <Button variant="outlined" disabled={exporting} startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                  onClick={exportContract}>
                  {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
                </Button>
              </span>
            </Tooltip>
            <Button variant="contained" onClick={() => navigate(`/contracts/${id}/edit`)}>ویرایش</Button>
          </>
        )}
      />

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError('')}>{exportError}</Alert>
      )}

      <StudioIdentityCard
        contract={c}
        contractTypeLabel={contractTypeLabel}
        statusLabel={STATUS_LABELS[c.status] || '—'}
        statusColor={STATUS_COLORS[c.status] || '#64748b'}
        currencyLabel={currencyLabel}
        baseAmount={Number(c.amount || 0)}
        amountWithAddendum={amountWithAddendum}
        adjustmentAmount={contractRate > 1 ? adjustmentNetRial / contractRate : adjustmentNetRial}
        adjustedAmount={adjustedContractAmount}
        adjustedAmountRial={adjustedContractAmountRial}
        contractRate={contractRate}
        totalPaid={totalPaid}
        remainingRial={remainingRial}
        progressPercent={progressPercent}
        remainingDays={remainingDays}
        startDate={c.start_date}
        endDate={c.end_date}
        effectiveEndDate={endDateWithAddendum}
        signingDate={c.signing_date}
        signatoryName={c.signatory_name}
        category={c.category}
        warrantyPeriod={c.warranty_period}
        tenderNumber={c.tender_number}
        advanceAmount={advanceWithAddendum}
        guaranteeAmount={guaranteeWithAddendum}
        retentionPercent={retentionWithAddendum}
        addendumCount={addendumCount}
        addendums={c.addendums || []}
        projectAllocations={c.project_allocations_display || []}
        projectName={c.project_title || c.project_name}
        effectiveChanges={effects?.changes || []}
        effectsWarnings={effects?.warnings || []}
        onOpenAddendums={() => navigate(`/contracts-addendums?contract=${id}`)}
      />

      <SectionCard title="دسترسی سریع" icon={HubIcon} color={theme.palette.primary.main} sx={{ mb: 2 }}
        action={<Chip size="small" label="پروندهٔ قرارداد" sx={{ height: 21, fontSize: 11, bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.primary.main }} />}>
        <QuickAccessStrip items={quickLinks} />
      </SectionCard>

      <ContractFinanceStudioCard
        financial={financial}
        contractRate={contractRate}
        currencyLabel={currencyLabel}
        adjustedAmount={adjustedContractAmount}
        adjustedAmountRial={adjustedContractAmountRial}
        totalStatements={totalStatements}
        totalPaid={totalPaid}
        totalInvoices={totalInvoices}
        remainingRial={remainingRial}
        progressPercent={progressPercent}
        adjustmentNetRial={adjustmentNetRial}
        monthlyPayments={paymentMonths}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={5}>
          <SectionCard title="تایم‌لاین قرارداد" icon={ScheduleIcon} color={theme.palette.secondary.main} sx={{ height: '100%' }}
            action={<Chip size="small" label={`${toPersianDigits(timeline.length)} رویداد`}
              sx={{ height: 20, fontSize: 11, bgcolor: alpha(theme.palette.secondary.main, 0.08), color: theme.palette.secondary.main, fontWeight: 700 }} />}>
            {timeline.length === 0 ? (
              <EmptyState icon={ScheduleIcon} text="رویدادی برای این قرارداد ثبت نشده است." />
            ) : (
              <TimelineList events={timeline.slice(0, 14)} maxHeight={390} />
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <GuaranteeCompactCard
            summary={guaranteeSummary}
            items={visibleGuaranteeItems}
            count={guaranteeCount}
            coverage={coveragePercent}
            currencyLabel={currencyLabel}
            onOpen={() => navigate(`/contracts-guarantees?contract=${id}`)}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <CoverageCompactCard
            summary={guaranteeSummary}
            coverage={coveragePercent}
            onOpen={() => navigate(`/contracts-guarantees?contract=${id}`)}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <AddendumsStudioCard addendums={c.addendums || []} onOpen={() => navigate(`/contracts-addendums?contract=${id}`)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TermsStudioCard title="شرایط پرداخت" icon={PaymentsIcon} color={theme.palette.info.main} text={c.payment_terms}
            onOpen={() => navigate(`/contracts/${id}/edit`)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TermsStudioCard title="شرایط تحویل" icon={StorefrontIcon} color={theme.palette.warning.main} text={c.delivery_terms}
            onOpen={() => navigate(`/contracts/${id}/edit`)} />
        </Grid>
      </Grid>

      <RelatedContractsStudioCard
        contracts={relatedContracts}
        onOpen={(contractId) => navigate(`/external-contracts/${contractId}`)}
        statusLabels={STATUS_LABELS}
        statusColors={STATUS_COLORS}
      />
    </Box>
  );
};

export default ContractProfilePage;
