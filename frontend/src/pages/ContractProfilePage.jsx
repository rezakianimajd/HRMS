import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import downloadFile from '../core/utils/downloadUtils';
import {
  Alert, Box, Typography, Paper, Button, CircularProgress, Chip, Grid, Stack, Tooltip,
} from '@mui/material';
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
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BusinessIcon from '@mui/icons-material/Business';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import InsightsIcon from '@mui/icons-material/Insights';
import HubIcon from '@mui/icons-material/Hub';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { toJalali } from '../core/utils/dateUtils';
import { CONTRACT_STATUS_LABELS as STATUS_LABELS, CONTRACT_STATUS_COLORS as STATUS_COLORS, CONTRACT_TYPE_LABELS as TYPE_LABELS } from '../core/theme/tokens';
import {
  SectionCard, KpiCard, DetailTile, ProgressBar, FinancialDonut, MoneyBar, EffectMetric,
  ActionTile, CountTile, EmptyState, TimelineList, INK, MUTED, CARD_BG, CARD_BORDER, SOFT_BG,
} from './contracts/ContractProfileUI';
import ContractGuarantees from './contracts/ContractGuarantees';

const ContractProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
    (c.invoices || []).forEach(x => push(x.date, 'invoice', 'ثبت فاکتور', `${x.number || '—'} · ${formatPersianNumber(x.total || 0)}`));
    (c.statements || []).forEach(x => push(x.date, 'statement', 'ثبت صورت‌وضعیت', `${x.number || '—'} · ${formatPersianNumber(x.amount || 0)}`));
    (c.addendums || []).forEach(x => push(x.date, 'addendum', 'ثبت الحاقیه', x.subject_type_display || x.number || x.change_description?.slice(0, 40)));
    (c.guarantees || []).forEach(x => push(x.issue_date, 'guarantee', 'صدور تضمین', x.guarantee_type_display));
    (c.guarantees || []).forEach(x => push(x.expiry_date, 'guarantee-expiry', 'انقضای تضمین', x.number || ''));
    (c.payments || []).forEach(x => push(x.date, 'payment', 'پرداخت', `${formatPersianNumber(x.amount || 0)}`));
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
  const totalStatements = (c.statements || []).reduce((s, x) => s + Number(x.amount || 0), 0);
  const addendumTotal = (c.addendums || []).reduce((s, x) => s + Number(x.amount_change || 0), 0);
  // مقادیر مؤثر: اول از موتور بک‌اند، در نبود آن محاسبهٔ محلی
  const effective = effects?.effective || {};
  const effectsChanged = effects?.changed || [];
  const amountWithAddendum = Number(effective.amount ?? (Number(c.amount || 0) + addendumTotal));
  const advanceWithAddendum = Number(effective.advance_payment ?? c.advance_payment ?? 0);
  const guaranteeWithAddendum = Number(effective.guarantee_amount ?? c.guarantee_amount ?? 0);
  const retentionWithAddendum = Number(effective.retention_percent ?? c.retention_percent ?? 0);
  const addendumsWithEnd = (c.addendums || []).filter(a => a.new_end_date);
  const lastAddendum = addendumsWithEnd.length ? addendumsWithEnd.reduce((m, a) => (a.date > m.date ? a : m)) : null;
  const endDateWithAddendum = effective.end_date || lastAddendum?.new_end_date || c.end_date;
  const remaining = Math.max(0, amountWithAddendum - totalPaid);
  const progressPercent = amountWithAddendum > 0 ? Math.min(100, Math.round((totalPaid / amountWithAddendum) * 100)) : 0;
  const remainingDays = endDateWithAddendum
    ? Math.ceil((new Date(`${String(endDateWithAddendum).slice(0, 10)}T00:00:00`) - new Date()) / 86400000)
    : null;
  const currencyLabel = c.currency_name || 'ریال';
  const contractTypeLabel = c.contract_type_master_name || TYPE_LABELS[c.contract_type] || '—';
  const coveragePercent = Number(guaranteeStatus?.summary?.coverage_percent || 0);
  const guaranteeCount = (c.guarantees || []).length;
  const addendumCount = (c.addendums || []).length;

  const quickLinks = [
    { label: 'فاکتورها', path: '/contracts-invoices', icon: ReceiptIcon, color: '#8b5cf6', count: (c.invoices || []).length },
    { label: 'صورت‌وضعیت‌ها', path: '/contracts-statements', icon: ReceiptLongIcon, color: '#3b82f6', count: (c.statements || []).length },
    { label: 'پرداخت‌ها', path: '/contracts-payments', icon: PaymentsIcon, color: '#0891b2', count: (c.payments || []).length },
    { label: 'الحاقیه‌ها', path: '/contracts-addendums', icon: EditNoteIcon, color: '#ec4899', count: addendumCount },
    { label: 'تضمین‌ها', path: '/contracts-guarantees', icon: LockIcon, color: '#f59e0b', count: guaranteeCount },
    { label: 'اختلافات', path: '/contracts-disputes', icon: GavelIcon, color: '#e11d48', count: (c.disputes || []).length },
    { label: 'اسناد و بایگانی', path: '/contracts-documents', icon: FolderOpenIcon, color: '#f97316', count: (c.documents || []).length },
  ];

  const itemsDist = [
    { label: 'فاکتور', value: (c.invoices || []).length, color: '#8b5cf6', icon: ReceiptIcon },
    { label: 'صورت‌وضعیت', value: (c.statements || []).length, color: '#3b82f6', icon: ReceiptLongIcon },
    { label: 'پرداخت', value: (c.payments || []).length, color: '#0891b2', icon: PaymentsIcon },
    { label: 'الحاقیه', value: addendumCount, color: '#ec4899', icon: EditNoteIcon },
    { label: 'تضمین', value: guaranteeCount, color: '#f59e0b', icon: LockIcon },
    { label: 'سند', value: (c.documents || []).length, color: '#f97316', icon: FolderOpenIcon },
  ];
  const itemsTotal = itemsDist.reduce((sum, item) => sum + item.value, 0);

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

      {/* هویت قرارداد و مبلغ */}
      <Paper elevation={0} sx={{
        p: { xs: 1.75, md: 2.25 }, mb: 2, bgcolor: CARD_BG,
        border: `1px solid ${CARD_BORDER}`, borderRadius: '20px', boxShadow: 'none',
      }}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} lg={5}>
            <Stack direction="row" alignItems="flex-start" spacing={1.5} useFlexGap>
              <Box sx={{
                width: 54, height: 54, flexShrink: 0, borderRadius: '16px',
                bgcolor: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BusinessIcon sx={{ fontSize: 26 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 10.5, color: MUTED, mb: 0.35 }}>موضوع قرارداد</Typography>
                <Typography sx={{ fontSize: 17, fontWeight: 900, color: INK, lineHeight: 1.45, wordBreak: 'break-word' }}>
                  {c.subject || '—'}
                </Typography>
                <Typography sx={{ mt: 0.45, fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  طرف قرارداد: {c.party_name || '—'}
                </Typography>
                <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  <Chip size="small" icon={<BusinessIcon />} label={contractTypeLabel} variant="outlined" sx={{ height: 23, fontSize: 10.5 }} />
                  {c.category ? <Chip size="small" label={c.category} variant="outlined" sx={{ height: 23, fontSize: 10.5 }} /> : null}
                  {c.signatory_name ? <Chip size="small" label={`امضاکننده: ${c.signatory_name}`} variant="outlined" sx={{ height: 23, fontSize: 10.5 }} /> : null}
                </Stack>
              </Box>
            </Stack>

            <Box sx={{ mt: 2, p: 1.5, borderRadius: '14px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 9.8, color: MUTED }}>شروع قرارداد</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: INK }}>{toJalali(c.start_date)}</Typography>
                </Box>
                <Box sx={{ flex: 1, position: 'relative', height: 18, mx: 1 }}>
                  <Box sx={{ position: 'absolute', top: 8, left: 0, right: 0, height: 2, bgcolor: '#dbe4ee' }} />
                  <Box sx={{ position: 'absolute', top: 5, right: 0, width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                  <Box sx={{ position: 'absolute', top: 5, left: 0, width: 8, height: 8, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography sx={{ fontSize: 9.8, color: MUTED }}>پایان مؤثر</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: INK }}>{toJalali(endDateWithAddendum)}</Typography>
                </Box>
              </Stack>
              <Box sx={{ mt: 0.9, display: 'flex', justifyContent: 'center' }}>
                <Chip size="small" icon={<CalendarMonthIcon />}
                  label={remainingDays === null ? 'بدون تاریخ پایان'
                    : remainingDays < 0 ? `منقضی — ${toPersianDigits(Math.abs(remainingDays))} روز گذشته`
                      : remainingDays === 0 ? 'آخرین روز قرارداد'
                        : `${toPersianDigits(remainingDays)} روز تا پایان`}
                  sx={{
                    height: 22, fontSize: 10, fontWeight: 700,
                    bgcolor: remainingDays !== null && remainingDays < 0 ? '#fff1f2' : '#eff6ff',
                    color: remainingDays !== null && remainingDays < 0 ? '#be123c' : '#1d4ed8',
                  }} />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Box sx={{ p: 1.75, borderRadius: '16px', bgcolor: '#fff', border: '1px solid #fde9c8' }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5} useFlexGap>
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: '#9a3412', fontWeight: 600 }}>مبلغ قرارداد با اعمال الحاقیه‌ها</Typography>
                  <Typography sx={{ mt: 0.4, fontSize: { xs: 24, sm: 30 }, fontWeight: 900, color: '#b45309', direction: 'ltr', lineHeight: 1.2 }}>
                    {formatPersianNumber(amountWithAddendum)}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: MUTED }}>{currencyLabel} · مبلغ پایه: {formatPersianNumber(c.amount || 0)}</Typography>
                </Box>
                <Chip size="small" label={`${toPersianDigits(progressPercent)}٪ پرداخت‌شده`}
                  sx={{ height: 24, fontSize: 10.5, fontWeight: 800, bgcolor: '#fff', color: '#b45309', border: '1px solid #fcd9a4' }} />
              </Stack>

              <Box sx={{ mt: 1.4 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.55 }}>
                  <Typography sx={{ fontSize: 10, color: '#9a3412' }}>پیشرفت پرداخت</Typography>
                  <Typography sx={{ fontSize: 10, color: '#9a3412', fontWeight: 700 }}>
                    {formatPersianNumber(totalPaid)} از {formatPersianNumber(amountWithAddendum)}
                  </Typography>
                </Stack>
                <ProgressBar value={progressPercent} color="#f59e0b" height={10} track="#fdf1dc" />
              </Box>

              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1, borderRadius: '11px', bgcolor: '#fff', border: '1px solid #f5e6cf' }}>
                    <Typography sx={{ fontSize: 9.5, color: MUTED }}>پرداخت‌شده</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#0f172a', direction: 'ltr' }}>{formatPersianNumber(totalPaid)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1, borderRadius: '11px', bgcolor: '#fff', border: '1px solid #f5e6cf' }}>
                    <Typography sx={{ fontSize: 9.5, color: MUTED }}>مانده پرداخت</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#0f172a', direction: 'ltr' }}>{formatPersianNumber(remaining)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1, borderRadius: '11px', bgcolor: '#fff', border: '1px solid #f5e6cf' }}>
                    <Typography sx={{ fontSize: 9.5, color: MUTED }}>جمع فاکتورها</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#0f172a', direction: 'ltr' }}>{formatPersianNumber(totalInvoices)}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* شاخص‌های کلیدی */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard icon={AccountBalanceIcon} label="مبلغ قرارداد (با الحاقیه)" value={formatPersianNumber(amountWithAddendum)}
            suffix={currencyLabel} color="#f59e0b" hint={`${toPersianDigits(addendumCount)} الحاقیه`} size={17} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard icon={PaymentsIcon} label="پرداخت‌شده" value={formatPersianNumber(totalPaid)}
            suffix={currencyLabel} color="#0891b2" progress={progressPercent} progressLabel={`${toPersianDigits(progressPercent)}٪ از مبلغ قرارداد`} size={17} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard icon={ScheduleIcon} label="مانده پرداخت" value={formatPersianNumber(remaining)}
            suffix={currencyLabel} color="#64748b" progress={100 - progressPercent} progressLabel="باقی‌ماندهٔ تعهد مالی" size={17} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard icon={LockIcon} label="پوشش تضامین" value={coveragePercent} suffix="٪"
            color="#8b5cf6" hint={`${toPersianDigits(guaranteeCount)} فقره`} progress={coveragePercent}
            progressLabel={coveragePercent >= 100 ? 'پوشش کامل' : 'نیازمند تکمیل'} />
        </Grid>
      </Grid>

      {/* دسترسی سریع */}
      <SectionCard title="دسترسی سریع" icon={HubIcon} color="#6366f1" sx={{ mb: 2 }}
        action={<Chip size="small" label="پروندهٔ قرارداد" sx={{ height: 22, fontSize: 10, bgcolor: '#f1f5f9', color: '#475569' }} />}>
        <Grid container spacing={1}>
          {quickLinks.map((a) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={a.label}>
              <ActionTile icon={a.icon} label={a.label} count={a.count} color={a.color}
                onClick={() => navigate(`${a.path}?contract=${id}`)} />
            </Grid>
          ))}
        </Grid>
      </SectionCard>


      {/* پروندهٔ مؤثر قرارداد */}
      <SectionCard title="پروندهٔ مؤثر قرارداد" icon={CompareArrowsIcon} color="#6366f1" sx={{ mb: 2 }}
        action={(
          <Stack direction="row" spacing={0.6} useFlexGap>
            <Chip size="small" label={`${toPersianDigits(effects?.addendum_count ?? addendumCount)} الحاقیه`}
              sx={{ height: 22, fontSize: 10, bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 700 }} />
            <Chip size="small" label={effectsChanged.length ? 'دارای تغییر مؤثر' : 'بدون تغییر'}
              sx={{ height: 22, fontSize: 10, bgcolor: effectsChanged.length ? '#fff7ed' : '#f1f5f9', color: effectsChanged.length ? '#c2410c' : '#475569', fontWeight: 700 }} />
          </Stack>
        )}>
        <Grid container spacing={1.25}>
          <Grid item xs={12} sm={6} lg={3}>
            <EffectMetric icon={AccountBalanceIcon} color="#f59e0b" label="مبلغ قرارداد"
              value={`${formatPersianNumber(amountWithAddendum)} ${currencyLabel}`}
              base={`${formatPersianNumber(c.amount || 0)} ${currencyLabel}`}
              rawValue={amountWithAddendum} rawBase={Number(c.amount || 0)} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <EffectMetric icon={PaymentsIcon} color="#0891b2" label="پیش‌پرداخت"
              value={`${formatPersianNumber(advanceWithAddendum)} ${currencyLabel}`}
              base={`${formatPersianNumber(c.advance_payment || 0)} ${currencyLabel}`}
              rawValue={advanceWithAddendum} rawBase={Number(c.advance_payment || 0)} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <EffectMetric icon={LockIcon} color="#8b5cf6" label="مبلغ تضمین"
              value={`${formatPersianNumber(guaranteeWithAddendum)} ${currencyLabel}`}
              base={`${formatPersianNumber(c.guarantee_amount || 0)} ${currencyLabel}`}
              rawValue={guaranteeWithAddendum} rawBase={Number(c.guarantee_amount || 0)} />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <EffectMetric icon={ScheduleIcon} color="#6366f1" label="تاریخ پایان"
              value={toJalali(endDateWithAddendum)} base={toJalali(c.end_date)} isDate />
          </Grid>
        </Grid>

        {(effects?.changes || []).length > 0 && (
          <Box sx={{ mt: 1.5, p: 1.4, borderRadius: '13px', bgcolor: '#fbfcfe', border: '1px solid #eef2f7' }}>
            <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap sx={{ mb: 1 }}>
              <CompareArrowsIcon sx={{ fontSize: 16, color: '#6366f1' }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>ردیابی تغییرات پرونده</Typography>
              <Chip size="small" label={`${toPersianDigits((effects.changes || []).length)} تغییر`}
                sx={{ height: 19, fontSize: 9.5, bgcolor: '#eef2ff', color: '#4338ca' }} />
            </Stack>
            <Grid container spacing={1}>
              {(effects.changes || []).map((change, index) => (
                <Grid item xs={12} md={6} key={`${change.field}-${index}`}>
                  <Box sx={{ p: 1.1, borderRadius: '10px', bgcolor: '#fff', border: '1px solid #eef2f7' }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#334155', mb: 0.25 }}>{change.label}</Typography>
                    <Typography sx={{ fontSize: 10, color: MUTED, direction: 'rtl' }}>
                      {change.field === 'end_date'
                        ? `${toJalali(change.from)} ← ${toJalali(change.to)}`
                        : `${formatPersianNumber(change.from || 0)} ← ${formatPersianNumber(change.to || 0)}`}
                      <Box component="span" sx={{ color: '#94a3b8' }}>{` (${change.source_label}${change.mode === 'set' ? ' — مقدارگذاری' : ' — جمع/کاهش'})`}</Box>
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {(effects?.warnings || []).map((warning) => (
          <Alert key={warning} severity="warning" sx={{ mt: 1.2, borderRadius: '10px', py: 0 }}>
            <Typography sx={{ fontSize: 10.5 }}>{warning}</Typography>
          </Alert>
        ))}
      </SectionCard>
      {/* اطلاعات و پرونده */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Stack spacing={2}>
            <SectionCard title="مشخصات قرارداد" icon={BusinessIcon} color="#6366f1">
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="طرف قرارداد" value={c.party_name} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="نوع قرارداد" value={contractTypeLabel} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="مبلغ اولیه" value={`${formatPersianNumber(c.amount || 0)} ${currencyLabel}`} ltr />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="مبلغ با الحاقیه" value={`${formatPersianNumber(amountWithAddendum)} ${currencyLabel}`} ltr />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="تاریخ شروع" value={toJalali(c.start_date)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="تاریخ پایان پایه" value={toJalali(c.end_date)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="تاریخ پایان مؤثر" value={toJalali(endDateWithAddendum)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="تاریخ امضا" value={toJalali(c.signing_date)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="امضاکننده" value={c.signatory_name} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="پیش‌پرداخت" value={`${formatPersianNumber(advanceWithAddendum)} ${currencyLabel}`} ltr />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="درصد نگهداشت" value={retentionWithAddendum ? `${formatPersianNumber(retentionWithAddendum)}٪` : null} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="دوره گارانتی" value={c.warranty_period} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DetailTile label="طبقه‌بندی" value={c.category} />
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard title="پروژه‌ها و درصد تخصیص" icon={BusinessIcon} color="#3b82f6"
              action={<Chip size="small" label={`${toPersianDigits((c.project_allocations_display || []).length || (c.project_name ? 1 : 0))} پروژه`}
                sx={{ height: 22, fontSize: 10, bgcolor: '#eff6ff', color: '#1d4ed8' }} />}>
              {(c.project_allocations_display || []).length === 0 ? (
                c.project_name ? (
                  <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap sx={{ mb: 0.75 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{c.project_name}</Typography>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: '#1d4ed8' }}>{toPersianDigits(100)}٪</Typography>
                    </Stack>
                    <ProgressBar value={100} color="#3b82f6" height={7} />
                  </Box>
                ) : <EmptyState icon={BusinessIcon} text="پروژه‌ای به این قرارداد تخصیص نیافته است." />
              ) : (
                <Stack spacing={1.2}>
                  {c.project_allocations_display.map((pa, i) => (
                    <Box key={`${pa.project_name}-${i}`}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap sx={{ mb: 0.55 }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#334155', wordBreak: 'break-word' }}>{pa.project_name || '—'}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 900, color: '#1d4ed8', whiteSpace: 'nowrap' }}>{formatPersianNumber(pa.percentage || 0)}٪</Typography>
                      </Stack>
                      <ProgressBar value={pa.percentage || 0} color={['#3b82f6', '#8b5cf6', '#f59e0b', '#0891b2'][i % 4]} height={6} />
                    </Box>
                  ))}
                </Stack>
              )}
            </SectionCard>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <SectionCard title="شرایط پرداخت" icon={PaymentsIcon} color="#0891b2">
                  <Typography sx={{ fontSize: 11.5, color: '#334155', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                    {c.payment_terms || 'شرایط پرداختی ثبت نشده است.'}
                  </Typography>
                </SectionCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <SectionCard title="شرایط تحویل" icon={StorefrontIcon} color="#f97316">
                  <Typography sx={{ fontSize: 11.5, color: '#334155', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                    {c.delivery_terms || 'شرایط تحویلی ثبت نشده است.'}
                  </Typography>
                </SectionCard>
              </Grid>
            </Grid>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={2}>

            <SectionCard title="تحلیل مالی" icon={InsightsIcon} color="#0ea5e9"
              action={<Chip size="small" label={`${toPersianDigits(progressPercent)}٪ پیشرفت`}
                sx={{ height: 22, fontSize: 10, bgcolor: '#eff6ff', color: '#0369a1', fontWeight: 800 }} />}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" useFlexGap>
                <Box sx={{ display: 'flex', justifyContent: 'center', width: { xs: '100%', sm: 'auto' } }}>
                  <FinancialDonut paid={totalPaid} remaining={remaining} />
                </Box>
                <Stack spacing={1.15} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                  <MoneyBar label="پرداخت‌شده" value={totalPaid} total={amountWithAddendum} color="#0ea5e9" suffix={currencyLabel} />
                  <MoneyBar label="صورت‌وضعیت‌ها" value={totalStatements} total={amountWithAddendum} color="#3b82f6" suffix={currencyLabel} />
                  <MoneyBar label="فاکتورها" value={totalInvoices} total={amountWithAddendum} color="#8b5cf6" suffix={currencyLabel} />
                  <MoneyBar label="پوشش تضامین" value={coveragePercent} total={100} color="#f59e0b" suffix="٪" />
                </Stack>
              </Stack>

              <Box sx={{ mt: 1.75, p: 1.25, borderRadius: '12px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap>
                  <Box>
                    <Typography sx={{ fontSize: 10, color: MUTED }}>ماندهٔ تعهد مالی قرارداد</Typography>
                    <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK, direction: 'ltr', textAlign: 'right' }}>
                      {formatPersianNumber(remaining)} <Box component="span" sx={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>{currencyLabel}</Box>
                    </Typography>
                  </Box>
                  <Chip size="small" label={`${toPersianDigits(100 - progressPercent)}٪ باقی‌مانده`}
                    sx={{ height: 22, fontSize: 9.5, bgcolor: '#fff', color: '#475569', border: '1px solid #e2e8f0' }} />
                </Stack>
              </Box>
            </SectionCard>

            <SectionCard title="تایم‌لاین قرارداد" icon={ScheduleIcon} color="#8b5cf6"
              action={<Chip size="small" label={`${toPersianDigits(timeline.length)} رویداد`}
                sx={{ height: 22, fontSize: 10, bgcolor: '#f5f3ff', color: '#6d28d9', fontWeight: 700 }} />}>
              {timeline.length === 0 ? (
                <EmptyState icon={ScheduleIcon} text="رویدادی برای این قرارداد ثبت نشده است." />
              ) : (
                <TimelineList events={timeline.slice(0, 14)} maxHeight={460} />
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <ContractGuarantees status={guaranteeStatus} currencyLabel={currencyLabel}
          fallbackItems={c.guarantee_items_display || []} fallbackGuarantees={c.guarantees || []} />
      </Box>


      {/* ترکیب پرونده و الحاقیه‌ها */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={6}>
          <SectionCard title="ترکیب پرونده" icon={AccountBalanceIcon} color="#3b82f6"
            action={<Chip size="small" label={`${toPersianDigits(itemsTotal)} قلم`} sx={{ height: 22, fontSize: 10, bgcolor: '#eff6ff', color: '#1d4ed8' }} />}>
            <Grid container spacing={1}>
              {itemsDist.map((item) => (
                <Grid item xs={6} sm={4} key={item.label}>
                  <CountTile icon={item.icon} label={item.label} value={item.value} color={item.color} />
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 1.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap sx={{ mb: 0.6 }}>
                <Typography sx={{ fontSize: 10.5, color: MUTED }}>توزیع اقلام پرونده</Typography>
                <Typography sx={{ fontSize: 10.5, color: INK, fontWeight: 800 }}>{toPersianDigits(itemsTotal)} مورد</Typography>
              </Stack>
              <Box sx={{ display: 'flex', width: '100%', height: 9, borderRadius: 5, overflow: 'hidden', bgcolor: '#eef2f7' }}>
                {itemsDist.filter((item) => item.value > 0).map((item) => (
                  <Box key={item.label} title={`${item.label}: ${item.value}`}
                    sx={{ width: `${(item.value / Math.max(itemsTotal, 1)) * 100}%`, bgcolor: item.color, height: '100%' }} />
                ))}
              </Box>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                {itemsDist.map((item) => (
                  <Stack key={item.label} direction="row" alignItems="center" spacing={0.4} useFlexGap>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: item.color }} />
                    <Typography sx={{ fontSize: 9.5, color: MUTED }}>{item.label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard title="الحاقیه‌ها" icon={EditNoteIcon} color="#ec4899"
            action={<Chip size="small" label={`${toPersianDigits(addendumCount)} الحاقیه`} sx={{ height: 22, fontSize: 10, bgcolor: '#fdf2f8', color: '#be185d' }} />}>
            {addendumCount === 0 ? (
              <EmptyState icon={EditNoteIcon} text="الحاقیه‌ای برای این قرارداد ثبت نشده است." />
            ) : (
              <Box sx={{ maxHeight: 330, overflowY: 'auto', pr: 0.5 }}>
                <Stack spacing={1}>
                  {(c.addendums || []).map((x) => (
                    <Box key={x.id} sx={{ p: 1.25, borderRadius: '12px', bgcolor: '#fbfcfe', border: '1px solid #eef2f7', borderRight: '3px solid #ec4899' }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>{x.number || '—'}</Typography>
                        <Typography sx={{ fontSize: 9.5, color: MUTED }}>{toJalali(x.date)}</Typography>
                      </Stack>
                      {x.subject_type_display ? (
                        <Typography sx={{ mt: 0.25, fontSize: 10, fontWeight: 700, color: '#be185d' }}>
                          {x.subject_type_display}{x.subject ? ` — ${x.subject}` : ''}
                        </Typography>
                      ) : null}
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.6 }}>
                        {x.amount_change != null && x.amount_change !== '' && (
                          <Chip size="small" label={`${Number(x.amount_change) >= 0 ? '+' : ''}${formatPersianNumber(x.amount_change)}`}
                            sx={{ height: 19, fontSize: 9, fontWeight: 700, bgcolor: Number(x.amount_change) >= 0 ? '#eff6ff' : '#fff1f2', color: Number(x.amount_change) >= 0 ? '#1d4ed8' : '#be123c' }} />
                        )}
                        {x.percent_change != null && x.percent_change !== '' && (
                          <Chip size="small" label={`${toPersianDigits(x.percent_change)}٪`}
                            sx={{ height: 19, fontSize: 9, bgcolor: '#f5f3ff', color: '#6d28d9' }} />
                        )}
                        {x.new_end_date && (
                          <Chip size="small" label={`پایان جدید: ${toJalali(x.new_end_date)}`}
                            sx={{ height: 19, fontSize: 9, bgcolor: '#fdf2f8', color: '#be185d' }} />
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* قراردادهای هم‌پروژه */}
      <SectionCard title="قراردادهای هم‌پروژه" icon={HubIcon} color="#3b82f6"
        action={<Chip size="small" label={`${toPersianDigits(relatedContracts.length)} قرارداد`} sx={{ height: 22, fontSize: 10, bgcolor: '#eff6ff', color: '#1d4ed8' }} />}>
        {relatedContracts.length === 0 ? (
          <EmptyState icon={HubIcon} text="قرارداد مرتبطی در همین پروژه‌ها یافت نشد." />
        ) : (
          <Grid container spacing={1.25}>
            {relatedContracts.map((rc) => (
              <Grid item xs={12} sm={6} lg={3} key={rc.id}>
                <Paper elevation={0} onClick={() => navigate(`/external-contracts/${rc.id}`)} sx={{
                  p: 1.5, height: '100%', bgcolor: '#fff', border: '1px solid #e8edf4',
                  borderRadius: '14px', boxShadow: 'none', cursor: 'pointer',
                  '&:hover': { borderColor: '#93c5fd', bgcolor: '#fbfdff' },
                }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75} useFlexGap>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: INK }}>{toPersianDigits(rc.number || '—')}</Typography>
                    <Chip size="small" label={STATUS_LABELS[rc.status] || '—'}
                      sx={{ height: 19, fontSize: 8.5, fontWeight: 700, bgcolor: `${STATUS_COLORS[rc.status] || '#64748b'}18`, color: STATUS_COLORS[rc.status] || '#64748b' }} />
                  </Stack>
                  <Typography sx={{ mt: 0.6, fontSize: 11, fontWeight: 700, color: '#334155', lineHeight: 1.5, minHeight: 33, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {rc.subject || '—'}
                  </Typography>
                  <Typography sx={{ mt: 0.3, fontSize: 9.5, color: MUTED }}>{rc.party_name || '—'}</Typography>
                  <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eef2f7' }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75} useFlexGap>
                      <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#b45309', direction: 'ltr' }}>
                        {formatPersianNumber(rc.effective_amount ?? rc.amount ?? 0)}
                      </Typography>
                      <Typography sx={{ fontSize: 9.5, color: MUTED }}>{toJalali(rc.effective_end_date || rc.end_date)}</Typography>
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </SectionCard>
    </Box>
  );
};

export default ContractProfilePage;

