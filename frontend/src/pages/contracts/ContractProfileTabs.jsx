import React from 'react';
import {
  Box, Button, Divider, Grid, IconButton, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import { resolveTableTheme, tableTypographySx } from '../../core/theme/tableStyles';
import {
  DetailTile, EmptyState, FinancialDonut, INK, KpiCard, MoneyBar, MUTED,
  SectionCard, TimelineList,
} from './ContractProfileUI';
import {
  AddendumsStudioCard, RelatedContractsStudioCard, TermsStudioCard,
} from './ContractProfileStudioUI';
import { statementDisplayTitle } from './statementKinds';

const money = (value, currency = 'ریال') => `${formatPersianNumber(Number(value) || 0)} ${currency}`;
const compactMoney = (value) => {
  const amount = Number(value) || 0;
  const scaled = (unit) => formatPersianNumber(Number((amount / unit).toFixed(1)));
  if (Math.abs(amount) >= 1_000_000_000_000) return `${scaled(1_000_000_000_000)} همت`;
  if (Math.abs(amount) >= 1_000_000_000) return `${scaled(1_000_000_000)} میلیارد`;
  if (Math.abs(amount) >= 1_000_000) return `${scaled(1_000_000)} میلیون`;
  return formatPersianNumber(amount);
};
const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

/* جدول استاندارد داخل تب‌ها — همان توکن‌های استودیوی تم */
const ProfileTable = ({ ariaLabel, columns, rows, emptyText = 'موردی ثبت نشده است.', stickyHeader = false, maxHeight }) => {
  const { tokens } = useDesignTokens();
  const tableTheme = resolveTableTheme(tokens);
  if (!rows.length) {
    return (
      <Box sx={{ p: 3.5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '12px' }}>
        <Typography sx={{ fontSize: 11.5, color: MUTED }}>{emptyText}</Typography>
      </Box>
    );
  }
  return (
    <TableContainer sx={{
      border: '1px solid', borderColor: 'var(--hrms-table-border-color, #e8edf4)',
      borderRadius: '12px',
      overflow: 'hidden',
      maxHeight,
      overflowY: maxHeight ? 'auto' : 'hidden',
    }}>
      <Table size="small" stickyHeader={stickyHeader} aria-label={ariaLabel} sx={{
        width: '100%',
        '& td, & th': {
          px: 1,
          py: `${tableTheme.cellPadding}px`,
          borderBottom: tableTheme.divider,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        '& thead th': {
          backgroundColor: 'var(--hrms-table-header-bg)',
          fontSize: tableTheme.header.fontSize,
          fontWeight: tableTheme.header.fontWeight,
          color: tableTheme.header.color,
          textAlign: 'center',
          height: `${tableTheme.headerHeight}px`,
        },
        '& tbody td': {
          height: `${tableTheme.rowHeight}px`,
          fontSize: tableTheme.cell.fontSize,
          fontWeight: tableTheme.cell.fontWeight,
          color: tableTheme.cell.color,
        },
        '& tbody tr:hover': { backgroundColor: tableTheme.hoverBg },
        ...tableTypographySx(tableTheme),
      }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} sx={{ width: column.width, textAlign: column.align || 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: column.align === 'right' ? 'flex-start' : 'center' }}>
                  {column.label}
                </Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.key ?? index}>
              {columns.map((column) => (
                <TableCell key={column.key} sx={{ textAlign: column.align || 'center' }}>
                  <Box sx={{ display: 'flex', justifyContent: column.align === 'right' ? 'flex-start' : 'center' }}>
                    {column.render ? column.render(row, index) : (row[column.key] ?? '—')}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const CellText = ({ children, strong, color }) => (
  <Typography noWrap sx={{
    fontSize: 11.5, fontWeight: strong ? 800 : 600,
    color: color || (strong ? INK : MUTED),
    fontFamily: 'var(--hrms-table-number-font, inherit)',
  }}>
    {children}
  </Typography>
);


/* ---------- نمای کلی ---------- */
const MetricRow = ({ label, value, hint, percent, color }) => (
  <Box sx={{ py: 0.65 }}>
    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
      <Typography sx={{ fontSize: 11.5, color: MUTED }}>{label}</Typography>
      <Typography noWrap sx={{
        fontSize: 12, fontWeight: 800, color: color || INK,
        fontFamily: 'var(--hrms-table-number-font, inherit)',
      }}>
        {value}
      </Typography>
    </Stack>
    {typeof percent === 'number' ? (
      <Box sx={{ mt: 0.35, height: 5, borderRadius: 3, bgcolor: 'rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <Box sx={{
          width: `${Math.max(0, Math.min(100, percent))}%`, height: '100%', borderRadius: 3,
          bgcolor: color || 'currentColor', opacity: 0.85,
        }} />
      </Box>
    ) : null}
    {hint ? <Typography sx={{ mt: 0.15, fontSize: 10.5, color: MUTED }}>{hint}</Typography> : null}
  </Box>
);

export const OverviewTab = ({ ctx }) => {
  const theme = useTheme();
  const {
    contract, financial, currencyLabel, totalPaid, remainingRial,
    adjustedContractAmount, adjustedContractAmountRial, progressPercent,
    totalStatements, totalInvoices, guaranteeSummary, coveragePercent,
    timeline, effects,
  } = ctx;

  const statements = contract.statements || [];
  const payments = contract.payments || [];
  const documents = contract.documents || [];
  const rial = financial?.rial || {};

  const netStatements = Number(rial.net || 0);
  const paidRatio = netStatements > 0 ? Math.min(100, Math.round((totalPaid / netStatements) * 100)) : 0;
  const approvedCount = statements.filter((row) => row.is_approved).length;
  const pendingNet = statements
    .filter((row) => !row.is_approved)
    .reduce((sum, row) => sum + Number(row.net_amount || 0), 0);
  const avgPayment = payments.length ? Math.round(totalPaid / payments.length) : 0;
  const latestDocuments = [...documents]
    .sort((a, b) => String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || '')))
    .slice(0, 5);
  const coverage = Number(guaranteeSummary?.coverage_percent ?? coveragePercent ?? 0);
  const requiredGuarantee = Number(guaranteeSummary?.required_total || 0);
  const providedGuarantee = Number(guaranteeSummary?.provided_total || 0);
  const scale = Math.max(totalStatements, adjustedContractAmountRial, totalInvoices, totalPaid, 1);

  return (
    <Stack spacing={2}>
      {/* شاخص‌های اصلی */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard icon={HandshakeIcon} label="مبلغ مؤثر قرارداد" value={adjustedContractAmount}
            suffix={currencyLabel} color={theme.palette.warning.main} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard icon={PaymentsIcon} label="پرداخت‌شده" value={totalPaid} suffix="ریال"
            color={theme.palette.success.main} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard icon={AccountBalanceWalletIcon} label="مانده مالی" value={remainingRial} suffix="ریال"
            color={theme.palette.error.main} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard icon={TrendingUpIcon} label="پیشرفت مالی" value={`${toPersianDigits(progressPercent)}٪`}
            color={theme.palette.info.main} progress={progressPercent}
            progressLabel={`${formatPersianNumber(totalPaid)} از ${formatPersianNumber(adjustedContractAmountRial)} ریال`} />
        </Grid>
      </Grid>
      {/* تحلیل مالی + شاخص‌های پرونده */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <SectionCard title="تحلیل مالی" icon={DescriptionIcon} color={theme.palette.info.main}
            contentSx={{ pt: 0.5 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }} useFlexGap flexWrap="wrap">
              <FinancialDonut paid={totalPaid} remaining={remainingRial} />
              <Stack spacing={0.85} sx={{ flex: 1, minWidth: 190 }}>
                <MoneyBar label="خالص صورت‌وضعیت‌ها" value={netStatements} total={scale} color={theme.palette.info.main} />
                <MoneyBar label="پرداخت‌ها" value={totalPaid} total={scale} color={theme.palette.success.main} />
                <MoneyBar label="فاکتورها" value={totalInvoices} total={scale} color={theme.palette.secondary.main} />
                <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                  {toPersianDigits(financial?.normalCount || 0)} صورت‌وضعیت عادی · {toPersianDigits(financial?.adjustments?.count || 0)} تعدیل
                  {financial?.hasForeign ? ` · نرخ ${formatPersianNumber(ctx.contractRate)} ریال` : ''}
                </Typography>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            <Grid container spacing={1}>
              <Grid item xs={6} sm={4}><DetailTile label="کارکرد اجراشده" value={formatPersianNumber(Number(rial.work || 0))} /></Grid>
              <Grid item xs={6} sm={4}><DetailTile label="جمع کسورات" value={formatPersianNumber(Number(rial.deductionsTotal || 0))} /></Grid>
              <Grid item xs={6} sm={4}><DetailTile label="حسن انجام کار" value={formatPersianNumber(Number(rial.retention || 0))} /></Grid>
              <Grid item xs={6} sm={4}><DetailTile label="پیش‌پرداخت کسرشده" value={formatPersianNumber(Number(rial.prepayment || 0))} /></Grid>
              <Grid item xs={6} sm={4}><DetailTile label="بیمه" value={formatPersianNumber(Number(rial.insurance || 0))} /></Grid>
              <Grid item xs={6} sm={4}><DetailTile label="ارزش افزوده" value={formatPersianNumber(Number(rial.vat || 0))} /></Grid>
            </Grid>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <SectionCard title="شاخص‌های پرونده" icon={DescriptionIcon} color={theme.palette.primary.main}>
            <MetricRow label="پوشش تضامین" value={`${toPersianDigits(coverage)}٪`} percent={coverage}
              color={theme.palette.primary.main}
              hint={`تأمین ${formatPersianNumber(providedGuarantee)} از ${formatPersianNumber(requiredGuarantee)} ریال`} />
            <MetricRow label="نسبت پرداخت به صورت‌وضعیت" value={`${toPersianDigits(paidRatio)}٪`} percent={paidRatio}
              color={theme.palette.success.main}
              hint={`خالص صورت‌وضعیت‌ها ${formatPersianNumber(netStatements)} ریال`} />
            <MetricRow label="صورت‌وضعیت‌های تأییدشده"
              value={`${toPersianDigits(approvedCount)} از ${toPersianDigits(statements.length)}`}
              percent={statements.length ? (approvedCount / statements.length) * 100 : 0}
              color={theme.palette.info.main} />
            <MetricRow label="مانده تأییدنشده" value={formatPersianNumber(pendingNet)} color={theme.palette.warning.dark} />
            <MetricRow label="میانگین هر پرداخت" value={formatPersianNumber(avgPayment)}
              hint={`${toPersianDigits(payments.length)} پرداخت ثبت‌شده`} />
            <MetricRow label="مدارک بارگذاری‌شده" value={`${toPersianDigits(documents.length)} مدرک`}
              hint={latestDocuments[0] ? `آخرین: ${dateLabel(latestDocuments[0].uploaded_at)}` : 'بدون مدرک'} />
          </SectionCard>
        </Grid>
      </Grid>
      {/* آخرین رویدادها + آخرین مدارک */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <SectionCard title="آخرین رویدادها" icon={DescriptionIcon} color={theme.palette.secondary.main}>
            {timeline.length ? <TimelineList events={timeline.slice(0, 7)} maxHeight={300} /> : (
              <EmptyState text="رویدادی برای این قرارداد ثبت نشده است." />
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="آخرین مدارک" icon={DescriptionIcon} color={theme.palette.text.secondary}
            action={<Button size="small" variant="text" onClick={ctx.openArchive}>بایگانی کامل</Button>}>
            {latestDocuments.length ? (
              <Stack spacing={0.5}>
                {latestDocuments.map((doc) => (
                  <Box key={doc.id} sx={{
                    px: 1, py: 0.7, borderRadius: '10px',
                    border: '1px solid', borderColor: 'divider',
                    display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0,
                  }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap title={doc.title} sx={{ fontSize: 11.5, fontWeight: 700, color: INK }}>
                        {doc.title || doc.file_name || '—'}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
                        {dateLabel(doc.uploaded_at)}
                        {doc.file_extension ? ` · ${String(doc.file_extension).toUpperCase()}` : ''}
                        {doc.file_size_display ? ` · ${doc.file_size_display}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <EmptyState text="مدرکی برای این قرارداد بارگذاری نشده است." />
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {(effects?.warnings || []).length ? (
        <SectionCard title="هشدارهای پرونده" icon={DescriptionIcon} color={theme.palette.warning.main}>
          <Stack spacing={0.5}>
            {(effects.warnings || []).map((warning) => (
              <Typography key={warning} sx={{ fontSize: 11.5, color: theme.palette.warning.dark }}>• {warning}</Typography>
            ))}
          </Stack>
        </SectionCard>
      ) : null}
    </Stack>
  );
};


/* ---------- تایم‌لاین ---------- */
export const TimelineTab = ({ ctx }) => {
  const theme = useTheme();
  return (
    <SectionCard title="تایم‌لاین پرونده" icon={DescriptionIcon} color={theme.palette.secondary.main}>
      {ctx.timeline.length ? <TimelineList events={ctx.timeline} maxHeight={540} /> : (
        <EmptyState text="رویدادی برای این قرارداد ثبت نشده است." />
      )}
    </SectionCard>
  );
};

/* ---------- مشخصات قرارداد (تمام جزئیات، بدون اقلام مالی) ---------- */
const InfoRow = ({ label, value, ltr, color }) => (
  <Stack
    direction="row"
    spacing={1}
    justifyContent="space-between"
    alignItems="baseline"
    sx={{ py: 0.7, borderBottom: '1px dashed', borderColor: 'divider', minWidth: 0 }}
  >
    <Typography sx={{ fontSize: 11.5, color: MUTED, flexShrink: 0 }}>{label}</Typography>
    <Typography
      noWrap
      title={typeof value === 'string' ? value : undefined}
      sx={{
        fontSize: 12, fontWeight: 800, color: color || INK, minWidth: 0,
        direction: ltr ? 'ltr' : 'rtl', fontFamily: 'var(--hrms-table-number-font, inherit)',
      }}
    >
      {value}
    </Typography>
  </Stack>
);

const AllocationRow = ({ name, percent, color }) => (
  <Box sx={{ px: 1, py: 0.8, borderRadius: '11px', border: '1px solid', borderColor: 'divider', minWidth: 0 }}>
    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="baseline">
      <Typography noWrap title={name} sx={{ fontSize: 12, fontWeight: 800, color: INK, minWidth: 0 }}>{name}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 900, color }}>{toPersianDigits(percent)}٪</Typography>
    </Stack>
    <Box sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: 'rgba(15,23,42,0.06)', overflow: 'hidden' }}>
      <Box sx={{ width: `${Math.max(0, Math.min(100, percent))}%`, height: '100%', borderRadius: 3, bgcolor: color }} />
    </Box>
  </Box>
);

export const IdentityTab = ({ ctx }) => {
  const theme = useTheme();
  const {
    contract, currencyLabel, effectiveEndDate, effects, contractTypeLabel, remainingDays,
  } = ctx;

  const allocations = (contract.project_allocations_display || [])
    .filter((row) => row && (row.project_name || row.percentage));
  const singleProject = contract.project_title || contract.project_name || '';

  const startDate = contract.start_date ? new Date(contract.start_date) : null;
  const endDate = effectiveEndDate ? new Date(effectiveEndDate) : null;
  const totalDays = startDate && endDate ? Math.max(1, Math.round((endDate - startDate) / 86400000)) : null;
  const passedDays = startDate ? Math.max(0, Math.round((Date.now() - startDate.getTime()) / 86400000)) : null;
  const elapsedPercent = totalDays && passedDays !== null
    ? Math.max(0, Math.min(100, Math.round((passedDays / totalDays) * 100)))
    : null;

  const logs = (contract.audit_logs || []).slice(0, 12);

  return (
    <Stack spacing={2}>
      {/* شناسنامه */}
      <SectionCard title="شناسنامهٔ قرارداد" icon={DescriptionIcon} color={theme.palette.primary.main} sx={{ mb: 0 }}>
        <Grid container spacing={{ xs: 0, md: 2 }}>
          <Grid item xs={12} md={6}>
            <InfoRow label="شمارهٔ قرارداد" value={toPersianDigits(contract.number || '—')} />
            <InfoRow label="نوع قرارداد" value={contractTypeLabel} />
            <InfoRow label="طبقه‌بندی" value={contract.category || '—'} />
            <InfoRow label="وضعیت" value={contract.status_display || contract.status || '—'} />
            <InfoRow label="طرف قرارداد" value={contract.party_name || '—'} />
            <InfoRow label="امضاکننده" value={contract.signatory_name || '—'} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoRow label="تاریخ امضا" value={dateLabel(contract.signing_date)} />
            <InfoRow label="شمارهٔ مناقصه" value={contract.tender_number || '—'} />
            <InfoRow label="محل اجرا" value={contract.project_location || '—'} />
            <InfoRow label="دورهٔ گارانتی" value={contract.warranty_period || '—'} />
            <InfoRow label="ارز قرارداد" value={currencyLabel} />
            <InfoRow label="کد ارز" value={contract.currency_code || contract.currency_symbol || '—'} ltr />
          </Grid>
        </Grid>
      </SectionCard>

      {/* زمان‌بندی */}
      <SectionCard title="زمان‌بندی قرارداد" icon={DescriptionIcon} color={theme.palette.info.main} sx={{ mb: 0 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={6} md={3}><DetailTile label="شروع" value={dateLabel(contract.start_date)} /></Grid>
          <Grid item xs={6} md={3}><DetailTile label="پایان پایه" value={dateLabel(contract.end_date)} /></Grid>
          <Grid item xs={6} md={3}><DetailTile label="پایان با الحاقیه" value={dateLabel(effectiveEndDate)} /></Grid>
          <Grid item xs={6} md={3}>
            <DetailTile label="مدت کل"
              value={totalDays ? `${toPersianDigits(totalDays)} روز` : '—'} />
          </Grid>
        </Grid>
        {elapsedPercent !== null ? (
          <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.4 }}>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                سپری‌شده {toPersianDigits(Math.min(passedDays, totalDays))} روز از {toPersianDigits(totalDays)} روز
              </Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: theme.palette.info.main }}>
                {toPersianDigits(elapsedPercent)}٪
              </Typography>
            </Stack>
            <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <Box sx={{
                width: `${elapsedPercent}%`, height: '100%', borderRadius: 4,
                bgcolor: theme.palette.info.main, opacity: 0.9,
              }} />
            </Box>
            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                {remainingDays === null
                  ? 'بدون تاریخ پایان'
                  : remainingDays < 0
                    ? `${toPersianDigits(Math.abs(remainingDays))} روز از پایان گذشته`
                    : `${toPersianDigits(remainingDays)} روز باقی‌مانده`}
              </Typography>
            </Stack>
          </Box>
        ) : null}
      </SectionCard>

      {/* پروژه‌ها و تخصیص درصدی */}
      <SectionCard title="پروژه‌ها و تخصیص درصدی" icon={DescriptionIcon} color={theme.palette.secondary.main} sx={{ mb: 0 }}>
        {allocations.length ? (
          <Grid container spacing={1}>
            {allocations.map((allocation, index) => (
              <Grid item xs={12} sm={6} lg={4} key={`${allocation.project || allocation.project_name}-${index}`}>
                <AllocationRow
                  name={allocation.project_name || `پروژه #${allocation.project || index + 1}`}
                  percent={Number(allocation.percentage || 0)}
                  color={theme.palette.secondary.main}
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Typography sx={{ mt: 0.5, fontSize: 10.5, color: MUTED }}>
                جمع تخصیص: {toPersianDigits(allocations.reduce((sum, row) => sum + Number(row.percentage || 0), 0))}٪
              </Typography>
            </Grid>
          </Grid>
        ) : singleProject ? (
          <AllocationRow name={singleProject} percent={100} color={theme.palette.secondary.main} />
        ) : (
          <EmptyState text="پروژه‌ای به این قرارداد تخصیص نیافته است." />
        )}
      </SectionCard>

      {/* شرایط و تعهدات */}
      <SectionCard title="شرایط و تعهدات" icon={DescriptionIcon} color={theme.palette.warning.main} sx={{ mb: 0 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <TermsStudioCard title="شرایط پرداخت" icon={DescriptionIcon} color={theme.palette.info.main}
              text={contract.payment_terms} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TermsStudioCard title="شرایط تحویل" icon={DescriptionIcon} color={theme.palette.warning.main}
              text={contract.delivery_terms} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TermsStudioCard title="شرایط جریمه" icon={DescriptionIcon} color={theme.palette.error.main}
              text={contract.penalty_terms} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TermsStudioCard title="شرایط بیمه" icon={DescriptionIcon} color={theme.palette.secondary.main}
              text={contract.insurance_terms} />
          </Grid>
        </Grid>
      </SectionCard>
      {/* اثر الحاقیه‌ها */}
      {(effects?.changes || []).length ? (
        <SectionCard title="اثر مؤثر الحاقیه‌ها" icon={DescriptionIcon} color={theme.palette.secondary.main} sx={{ mb: 0 }}>
          <Grid container spacing={1}>
            {(effects.changes || []).map((change, index) => (
              <Grid item xs={12} sm={6} lg={4} key={`${change.field}-${index}`}>
                <DetailTile
                  label={change.source_label || change.field}
                  value={change.field === 'end_date' ? dateLabel(change.to) : formatPersianNumber(change.to || 0)}
                />
              </Grid>
            ))}
          </Grid>
        </SectionCard>
      ) : null}

      {/* توضیحات */}
      {contract.description ? (
        <SectionCard title="توضیحات قرارداد" icon={DescriptionIcon} color={theme.palette.text.secondary} sx={{ mb: 0 }}>
          <Typography sx={{ fontSize: 12, lineHeight: 1.95, color: INK, whiteSpace: 'pre-wrap' }}>
            {contract.description}
          </Typography>
        </SectionCard>
      ) : null}

      {/* سابقهٔ تغییرات */}
      {logs.length ? (
        <SectionCard title="سابقهٔ تغییرات ثبت‌شده" icon={DescriptionIcon} color={theme.palette.text.secondary} sx={{ mb: 0 }}>
          <ProfileTable
            ariaLabel="سابقه تغییرات قرارداد"
            emptyText="تغییری ثبت نشده است."
            rows={logs.map((row) => ({ ...row, key: row.id }))}
            columns={[
              { key: 'created_at', label: 'تاریخ', width: '18%', render: (row) => <CellText>{dateLabel(row.created_at)}</CellText> },
              { key: 'action_display', label: 'اقدام', width: '18%', render: (row) => <CellText strong>{row.action_display || row.action || '—'}</CellText> },
              { key: 'field', label: 'فیلد', width: '18%', render: (row) => <CellText>{row.field || '—'}</CellText> },
              { key: 'old_value', label: 'مقدار قبلی', width: '20%', render: (row) => <CellText>{row.old_value || '—'}</CellText> },
              { key: 'new_value', label: 'مقدار جدید', width: '20%', render: (row) => <CellText>{row.new_value || '—'}</CellText> },
              { key: 'user', label: 'کاربر', width: '6%', render: (row) => <CellText>{row.user || '—'}</CellText> },
            ]}
          />
        </SectionCard>
      ) : null}
    </Stack>
  );
};

/* ---------- مشخصات مالی (کامل) ---------- */
const MoneyTile = ({ label, value, hint, color, emphasize }) => (
  <Box sx={{
    px: 1.2, py: 1, minWidth: 0,
    borderRadius: '12px',
    border: '1px solid',
    borderColor: emphasize ? alpha(color || '#2563eb', 0.35) : 'divider',
    bgcolor: emphasize ? alpha(color || '#2563eb', 0.05) : 'transparent',
  }}>
    <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{label}</Typography>
    <Typography noWrap title={String(value)} sx={{
      mt: 0.3, fontSize: 15, fontWeight: 900, color: color || INK,
      fontFamily: 'var(--hrms-table-number-font, inherit)',
    }}>
      {value}
    </Typography>
    {hint ? <Typography noWrap sx={{ mt: 0.15, fontSize: 10.5, color: MUTED }}>{hint}</Typography> : null}
  </Box>
);

const FinanceRow = ({ label, value, percent, color, sign, strong }) => (
  <Box sx={{ py: 0.55 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
      <Typography sx={{ fontSize: 11.5, color: strong ? INK : MUTED, fontWeight: strong ? 800 : 400 }}>{label}</Typography>
      <Typography noWrap sx={{
        fontSize: strong ? 13 : 12, fontWeight: strong ? 900 : 800,
        color: color || INK, fontFamily: 'var(--hrms-table-number-font, inherit)',
      }}>
        {sign || ''}{formatPersianNumber(Number(value) || 0)}
      </Typography>
    </Stack>
    {typeof percent === 'number' ? (
      <Box sx={{ mt: 0.3, height: 5, borderRadius: 3, bgcolor: 'rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <Box sx={{
          width: `${Math.max(0, Math.min(100, percent))}%`, height: '100%', borderRadius: 3,
          bgcolor: color || '#2563eb', opacity: 0.85,
        }} />
      </Box>
    ) : null}
  </Box>
);

const PaymentBars = ({ data = [], color }) => {
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 132, mt: 1 }}>
      {data.map((item, index) => (
        <Box key={`${item.label}-${index}`} sx={{
          flex: 1, minWidth: 0, height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        }}>
          <Typography noWrap sx={{ fontSize: 9.5, color: MUTED, mb: 0.3 }}>{compactMoney(item.value)}</Typography>
          <Box sx={{
            width: '68%',
            height: `${Math.max(3, (Number(item.value) / max) * 100)}%`,
            bgcolor: alpha(color, Number(item.value) ? 0.75 : 0.15),
            borderRadius: '6px 6px 2px 2px',
          }} />
          <Typography noWrap sx={{ mt: 0.35, fontSize: 10, color: MUTED }}>{item.label}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export const FinanceTab = ({ ctx }) => {
  const theme = useTheme();
  const {
    contract, financial, currencyLabel, contractRate, adjustedContractAmount,
    adjustedContractAmountRial, totalPaid, remainingRial, progressPercent,
    totalInvoices, adjustmentNetRial, paymentMonths, guaranteeSummary, coveragePercent,
  } = ctx;

  const rial = financial?.rial || {};
  const foreign = financial?.foreign || {};
  const netStatements = Number(rial.net || 0);
  const work = Number(rial.work || 0);
  const additions = Number(rial.additionsTotal || 0);
  const deductions = Number(rial.deductionsTotal || 0);
  const baseScale = Math.max(work, 1);
  const paidRatio = netStatements > 0 ? Math.min(100, Math.round((totalPaid / netStatements) * 100)) : 0;
  const deductionRatio = work > 0 ? Math.min(100, Math.round((deductions / work) * 100)) : 0;
  const adjustmentCount = Number(financial?.adjustments?.count || 0);
  const adjustmentNetForeign = Number(financial?.adjustments?.netForeign || 0);
  const hasForeign = Boolean(financial?.hasForeign) || contractRate > 1;
  const coverage = Number(guaranteeSummary?.coverage_percent ?? coveragePercent ?? 0);
  const avgPayment = (contract.payments || []).length
    ? Math.round(totalPaid / contract.payments.length)
    : 0;

  return (
    <Stack spacing={2}>
      {/* جمع‌بندی مالی */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <MoneyTile label="مبلغ پایه" value={money(contract.amount, currencyLabel)} color={theme.palette.text.secondary} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MoneyTile label="مبلغ مؤثر (الحاقیه + تعدیل)" value={money(adjustedContractAmount, currencyLabel)}
            hint={hasForeign ? money(adjustedContractAmountRial, 'ریال') : null}
            color={theme.palette.warning.main} emphasize />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MoneyTile label="پرداخت‌شده" value={money(totalPaid, 'ریال')}
            hint={`${toPersianDigits(progressPercent)}٪ از مبلغ مؤثر`} color={theme.palette.success.main} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MoneyTile label="مانده مالی" value={money(remainingRial, 'ریال')}
            hint={`${toPersianDigits(100 - progressPercent)}٪ باقی‌مانده`} color={theme.palette.error.main} />
        </Grid>
      </Grid>
      {/* مشخصات مالی پایه */}
      <SectionCard title="مشخصات مالی پایه" icon={DescriptionIcon} color={theme.palette.text.secondary} sx={{ mb: 0 }}>
        <Grid container spacing={{ xs: 0, md: 2 }}>
          <Grid item xs={12} md={6}>
            <InfoRow label="مبلغ پایه" value={money(contract.amount, currencyLabel)} />
            <InfoRow label="پیش‌پرداخت" value={money(ctx.advanceAmount, currencyLabel)} />
            <InfoRow label="مبلغ تضمین" value={money(ctx.guaranteeAmount, currencyLabel)} />
            <InfoRow label="درصد نگهداشت"
              value={ctx.retentionPercent ? `${formatPersianNumber(ctx.retentionPercent)}٪` : '—'} />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfoRow label="ارز قرارداد" value={currencyLabel} />
            <InfoRow label="نرخ تبدیل" value={contractRate > 1 ? `${formatPersianNumber(contractRate)} ریال` : '—'} />
            <InfoRow label="مبلغ مؤثر (ریال)" value={formatPersianNumber(adjustedContractAmountRial)} />
            <InfoRow label="جمع فاکتورها" value={money(totalInvoices, 'ریال')} />
          </Grid>
        </Grid>
      </SectionCard>

      <Grid container spacing={2}>
        {/* تفکیک صورت‌وضعیت */}
        <Grid item xs={12} lg={7}>
          <SectionCard title="تفکیک مالی صورت‌وضعیت‌ها" icon={DescriptionIcon} color={theme.palette.info.main} sx={{ mb: 0 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 11, color: MUTED }}>کارکرد</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK }}>{formatPersianNumber(work)}</Typography>
              <Typography sx={{ fontSize: 11, color: MUTED }}>+ اضافات</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: theme.palette.success.dark }}>{formatPersianNumber(additions)}</Typography>
              <Typography sx={{ fontSize: 11, color: MUTED }}>− کسورات</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: theme.palette.error.dark }}>{formatPersianNumber(deductions)}</Typography>
              <Typography sx={{ fontSize: 11, color: MUTED }}>= خالص</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: theme.palette.info.dark }}>{formatPersianNumber(netStatements)}</Typography>
            </Stack>
            <Grid container spacing={{ xs: 0, md: 2 }}>
              <Grid item xs={12} md={6}>
                <FinanceRow label="کارکرد اجراشده" value={rial.work} percent={100} color={theme.palette.info.main} />
                <FinanceRow label="اضافات (به‌جز مالیات)" value={rial.otherAdditions}
                  percent={work ? (Number(rial.otherAdditions || 0) / baseScale) * 100 : 0} color={theme.palette.success.main} sign="+" />
                <FinanceRow label="ارزش افزوده / مالیات" value={rial.vat}
                  percent={work ? (Number(rial.vat || 0) / baseScale) * 100 : 0} color={theme.palette.success.main} sign="+" />
                <FinanceRow label="حسن انجام کار" value={rial.retention}
                  percent={work ? (Number(rial.retention || 0) / baseScale) * 100 : 0} color={theme.palette.error.main} sign="−" />
                <FinanceRow label="پیش‌پرداخت کسرشده" value={rial.prepayment}
                  percent={work ? (Number(rial.prepayment || 0) / baseScale) * 100 : 0} color={theme.palette.error.main} sign="−" />
              </Grid>
              <Grid item xs={12} md={6}>
                <FinanceRow label="بیمه" value={rial.insurance}
                  percent={work ? (Number(rial.insurance || 0) / baseScale) * 100 : 0} color={theme.palette.error.main} sign="−" />
                <FinanceRow label="مصالح" value={rial.materials}
                  percent={work ? (Number(rial.materials || 0) / baseScale) * 100 : 0} color={theme.palette.error.main} sign="−" />
                <FinanceRow label="علی‌الحساب صورت‌وضعیت" value={rial.statementAdvance}
                  percent={work ? (Number(rial.statementAdvance || 0) / baseScale) * 100 : 0} color={theme.palette.error.main} sign="−" />
                <FinanceRow label="سایر علی‌الحساب و کسورات"
                  value={Number(rial.otherAdvances || 0) + Number(rial.otherDeductions || 0)}
                  percent={work ? ((Number(rial.otherAdvances || 0) + Number(rial.otherDeductions || 0)) / baseScale) * 100 : 0}
                  color={theme.palette.error.main} sign="−" />
                <Divider sx={{ my: 0.5 }} />
                <FinanceRow label="خالص قابل پرداخت" value={netStatements} color={theme.palette.info.dark} strong />
              </Grid>
            </Grid>
            <Typography sx={{ mt: 0.75, fontSize: 10.5, color: MUTED }}>
              نسبت کسورات به کارکرد: {toPersianDigits(deductionRatio)}٪ · {toPersianDigits(financial?.count || 0)} صورت‌وضعیت ثبت‌شده
            </Typography>
          </SectionCard>
        </Grid>
        {/* شاخص‌های مالی */}
        <Grid item xs={12} lg={5}>
          <SectionCard title="شاخص‌های مالی" icon={DescriptionIcon} color={theme.palette.primary.main} sx={{ mb: 0 }}>
            <MetricRow label="نسبت پرداخت به خالص صورت‌وضعیت" value={`${toPersianDigits(paidRatio)}٪`}
              percent={paidRatio} color={theme.palette.success.main}
              hint={`${formatPersianNumber(totalPaid)} از ${formatPersianNumber(netStatements)} ریال`} />
            <MetricRow label="نسبت کسورات به کارکرد" value={`${toPersianDigits(deductionRatio)}٪`}
              percent={deductionRatio} color={theme.palette.error.main}
              hint={`${formatPersianNumber(deductions)} ریال کسورات`} />
            <MetricRow label="پوشش تضامین" value={`${toPersianDigits(coverage)}٪`} percent={coverage}
              color={theme.palette.primary.main}
              hint={guaranteeSummary
                ? `تأمین ${formatPersianNumber(guaranteeSummary.provided_total || 0)} از ${formatPersianNumber(guaranteeSummary.required_total || 0)} ریال`
                : null} />
            <MetricRow label="میانگین هر پرداخت" value={formatPersianNumber(avgPayment)}
              hint={`${toPersianDigits((contract.payments || []).length)} پرداخت`} />
            <MetricRow label="جمع فاکتورها" value={formatPersianNumber(totalInvoices)}
              hint={`${toPersianDigits((contract.invoices || []).length)} فاکتور`} />
            <MetricRow label="مانده مالی" value={`${formatPersianNumber(remainingRial)} ریال`}
              color={theme.palette.error.dark} />
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* روند پرداخت */}
        <Grid item xs={12} lg={7}>
          <SectionCard title="روند پرداخت ماهانه" icon={DescriptionIcon} color={theme.palette.success.main} sx={{ mb: 0 }}>
            {(paymentMonths || []).length ? (
              <PaymentBars data={paymentMonths} color={theme.palette.success.main} />
            ) : (
              <EmptyState text="پرداختی برای این قرارداد ثبت نشده است." />
            )}
            <Typography sx={{ mt: 0.5, fontSize: 10.5, color: MUTED }}>
              شش دورهٔ آخر · جمع پرداخت‌ها {formatPersianNumber(totalPaid)} ریال
            </Typography>
          </SectionCard>
        </Grid>

        {/* تعدیل و ارز */}
        <Grid item xs={12} lg={5}>
          <SectionCard title="تعدیل و معادل ارزی" icon={DescriptionIcon} color={theme.palette.secondary.main} sx={{ mb: 0 }}>
            <MoneyTile label="تعدیل خالص (ریال)" value={formatPersianNumber(adjustmentNetRial)}
              color={adjustmentNetRial < 0 ? theme.palette.error.main : theme.palette.success.main} />
            <Box sx={{ mt: 1 }}>
              <InfoRow label="تعداد تعدیل‌ها" value={toPersianDigits(adjustmentCount)} />
              <InfoRow label="تعدیل خالص ارزی" value={hasForeign ? `${formatPersianNumber(adjustmentNetForeign)} ${currencyLabel}` : '—'} />
              <InfoRow label="صورت‌وضعیت عادی" value={toPersianDigits(financial?.normalCount || 0)} />
              <InfoRow label="نرخ تبدیل" value={contractRate > 1 ? `${formatPersianNumber(contractRate)} ریال` : '—'} />
            </Box>
            {hasForeign ? (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 0.75 }} />
                <FinanceRow label={`کارکرد ارزی`} value={Number(foreign.work || 0)} color={theme.palette.info.main} />
                <FinanceRow label={`خالص ارزی صورت‌وضعیت‌ها`} value={Number(foreign.net || 0)} color={theme.palette.info.dark} />
              </Box>
            ) : null}
          </SectionCard>
        </Grid>
      </Grid>
    </Stack>
  );
};

/* ---------- الحاقیه‌ها ---------- */



/* ---------- الحاقیه‌ها ---------- */

export const AddendumsTab = ({ ctx }) => (
  <Stack spacing={2}>
    <AddendumsStudioCard addendums={ctx.contract.addendums || []} onOpen={ctx.openAddendums} />
    <SectionCard title="فهرست الحاقیه‌ها" icon={DescriptionIcon} color={ctx.accent}>
      <ProfileTable
        ariaLabel="فهرست الحاقیه‌ها"
        emptyText="الحاقیه‌ای برای این قرارداد ثبت نشده است."
        rows={(ctx.contract.addendums || []).map((row) => ({ ...row, key: row.id }))}
        columns={[
          { key: 'number', label: 'شماره', width: '12%', render: (row) => <CellText strong>{toPersianDigits(row.number || '—')}</CellText> },
          { key: 'date', label: 'تاریخ', width: '13%', render: (row) => <CellText>{dateLabel(row.date)}</CellText> },
          { key: 'subject_type_display', label: 'موضوع الحاقیه', width: '26%', align: 'right', render: (row) => <CellText strong>{row.subject_type_display || '—'}</CellText> },
          { key: 'amount_change', label: 'اثر مبلغ', width: '18%', render: (row) => <CellText color={Number(row.amount_change) >= 0 ? '#047857' : '#b91c1c'}>{money(row.amount_change, ctx.currencyLabel)}</CellText> },
          { key: 'percent_change', label: 'درصد', width: '10%', render: (row) => <CellText>{row.percent_change ? `${formatPersianNumber(row.percent_change)}٪` : '—'}</CellText> },
          { key: 'new_end_date', label: 'پایان جدید', width: '13%', render: (row) => <CellText>{dateLabel(row.new_end_date)}</CellText> },
        ]}
      />
    </SectionCard>
  </Stack>
);

/* ---------- تضامین ---------- */
const CoverageGauge = ({ percent = 0, size = 132, thickness = 14, color = '#2563eb', label, value }) => {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const dash = (clamped / 100) * circumference;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={alpha(theme.palette.text.primary, 0.07)} strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1.1 }}>
          {toPersianDigits(Math.round(clamped))}٪
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: MUTED }}>{label || 'پوشش'}</Typography>
        {value ? <Typography sx={{ mt: 0.15, fontSize: 10, fontWeight: 700, color: MUTED }}>{value}</Typography> : null}
      </Box>
    </Box>
  );
};

const guaranteeState = (item) => {
  if (item.is_released) return { label: 'آزادشده', color: '#64748b' };
  if (item.days_to_expiry !== null && item.days_to_expiry !== undefined) {
    if (item.days_to_expiry < 0) return { label: 'منقضی', color: '#b91c1c' };
    if (item.days_to_expiry <= 30) return { label: `${toPersianDigits(item.days_to_expiry)} روز تا سررسید`, color: '#b45309' };
  }
  return { label: 'فعال', color: '#047857' };
};
const RequirementCoverage = ({ requirement, currencyLabel }) => {
  const theme = useTheme();
  const percent = Number(requirement.coverage_percent || 0);
  const color = requirement.status === 'provided' ? theme.palette.success.main
    : requirement.status === 'partial' ? theme.palette.warning.main
      : theme.palette.error.main;
  const items = requirement.items || [];
  return (
    <Box sx={{
      p: 1.4, height: '100%', display: 'flex', flexDirection: 'column', gap: 1,
      borderRadius: '14px',
      border: '1px solid',
      borderColor: 'var(--hrms-table-border-color, rgba(15,23,42,0.14))',
      bgcolor: 'background.paper',
    }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
          <Typography noWrap title={requirement.label} sx={{ fontSize: 12.5, fontWeight: 900, color: INK }}>
            {requirement.label}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 12.5, fontWeight: 900, color }}>{toPersianDigits(percent)}٪</Typography>
      </Stack>

      <Box sx={{ height: 9, borderRadius: 5, bgcolor: alpha(theme.palette.text.primary, 0.07), overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.min(100, percent)}%`, height: '100%', bgcolor: color, opacity: 0.9 }} />
      </Box>

      <Grid container spacing={0.75}>
        <Grid item xs={6}>
          <Typography sx={{ fontSize: 10, color: MUTED }}>نیاز</Typography>
          <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>{money(requirement.required, currencyLabel)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography sx={{ fontSize: 10, color: MUTED }}>تأمین‌شده</Typography>
          <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: theme.palette.success.dark }}>{money(requirement.provided, currencyLabel)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography sx={{ fontSize: 10, color: MUTED }}>کمبود</Typography>
          <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: requirement.balance > 0 ? theme.palette.error.dark : MUTED }}>
            {money(requirement.balance, currencyLabel)}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography sx={{ fontSize: 10, color: MUTED }}>آزادشده</Typography>
          <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>{money(requirement.released_total, currencyLabel)}</Typography>
        </Grid>
      </Grid>

      <Divider />
      {items.length ? (
        <Stack spacing={0.35}>
          {items.map((item) => {
            const state = guaranteeState(item);
            return (
              <Stack key={item.id} direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: state.color, flexShrink: 0 }} />
                <Typography noWrap title={`${item.number} · ${item.bank || ''}`}
                  sx={{ fontSize: 11, fontWeight: 700, color: INK, flex: 1, minWidth: 0 }}>
                  {item.number || '—'} · {item.instrument_label || item.type_label || '—'}
                  {item.bank ? ` · ${item.bank}` : ''}
                </Typography>
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: MUTED }}>
                  {money(item.amount, currencyLabel)}
                </Typography>
                <Typography noWrap sx={{ fontSize: 10, color: state.color, minWidth: 62, textAlign: 'left' }}>
                  {state.label}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      ) : (
        <Typography sx={{ fontSize: 10.5, color: MUTED }}>
          {requirement.status === 'missing' ? 'برای این قلم هنوز تضمینی ثبت نشده است.' : 'تضمینی به این قلم وصل نشده است.'}
        </Typography>
      )}
    </Box>
  );
};
export const GuaranteesTab = ({ ctx }) => {
  const theme = useTheme();
  const report = ctx.guaranteeReport;
  const requirements = report?.requirements || [];
  const unrequired = report?.unrequired || [];
  const summary = report?.summary || {};
  const warnings = report?.warnings || [];
  const coverage = Number(summary.coverage_percent ?? ctx.coveragePercent ?? 0);
  const coverageColor = coverage >= 100 ? theme.palette.success.main
    : coverage > 0 ? theme.palette.warning.main : theme.palette.error.main;

  const registered = report
    ? [
      ...requirements.flatMap((requirement) => (requirement.items || []).map((item) => ({
        ...item,
        requirement_label: requirement.label,
        requirement_required: Number(requirement.required || 0),
      }))),
      ...unrequired.map((item) => ({ ...item, requirement_label: 'بدون تعریف', requirement_required: 0 })),
    ]
    : (ctx.guarantees || []).map((row, index) => ({
      id: row.id ?? `g-${index}`,
      number: row.number,
      type_label: row.guarantee_type_display || row.guarantee_type,
      instrument_label: row.instrument_type,
      amount: Number(row.amount || 0),
      bank: row.bank,
      issue_date: row.issue_date,
      expiry_date: row.expiry_date,
      is_released: row.is_released,
      requirement_label: '—',
      requirement_required: 0,
    }));

  const rows = registered.map((item, index) => ({ ...item, key: item.id ?? index }));

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <SectionCard title="پوشش کلی تضامین" icon={DescriptionIcon} color={theme.palette.primary.main} sx={{ mb: 0, height: '100%' }}>
            <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
              <CoverageGauge percent={coverage} color={coverageColor} label="پوشش"
                value={`${toPersianDigits(summary.provided_count || 0)} از ${toPersianDigits(summary.required_count || 0)} قلم`} />
              <Stack spacing={0.75} sx={{ flex: 1, minWidth: 150 }}>
                <MoneyTile label="نیاز کل" value={money(summary.required_total, 'ریال')} />
                <MoneyTile label="تأمین‌شده" value={money(summary.provided_total, 'ریال')} color={theme.palette.success.main} />
              </Stack>
            </Stack>
            <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
              <MoneyTile label="کمبود" value={money(summary.balance_total, 'ریال')}
                color={Number(summary.balance_total || 0) > 0 ? theme.palette.error.main : MUTED} />
              <MoneyTile label="آزادشده" value={money(summary.released_total, 'ریال')} color={MUTED} />
            </Box>
            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                {toPersianDigits(summary.registered_count ?? rows.length)} تضمین ثبت‌شده
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: theme.palette.success.dark }}>
                تأمین‌شده: {toPersianDigits(summary.provided_count || 0)}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: theme.palette.warning.dark }}>
                ناقص: {toPersianDigits(summary.partial_count || 0)}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: theme.palette.error.dark }}>
                تأمین‌نشده: {toPersianDigits(summary.missing_count || 0)}
              </Typography>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={8}>
          <SectionCard title="پوشش هر قلم تضمین" icon={DescriptionIcon} color={theme.palette.info.main} sx={{ mb: 0, height: '100%' }}>
            {requirements.length ? (
              <Grid container spacing={1.5}>
                {requirements.map((requirement, index) => (
                  <Grid item xs={12} md={6} key={`${requirement.type}-${requirement.index ?? index}`}>
                    <RequirementCoverage requirement={requirement} currencyLabel="ریال" />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <EmptyState text="اقلام تضمین برای این قرارداد تعریف نشده است." />
            )}
          </SectionCard>
        </Grid>
      </Grid>
      {/* تضامین ثبت‌شده در قرارداد */}
      <SectionCard title="تضامین ثبت‌شده" icon={DescriptionIcon} color={theme.palette.secondary.main} sx={{ mb: 0 }}
        action={<Button size="small" variant="text" onClick={ctx.openGuarantees}>پروندهٔ تضامین</Button>}>
        <ProfileTable
          ariaLabel="فهرست تضامین ثبت‌شده"
          emptyText="تضمینی برای این قرارداد ثبت نشده است."
          rows={rows}
          stickyHeader
          maxHeight={460}
          columns={[
            {
              key: 'row', label: 'ردیف', width: '6%',
              render: (row, index) => <CellText strong>{toPersianDigits(index + 1)}</CellText>,
            },
            {
              key: 'number', label: 'شماره', width: '12%',
              render: (row) => <CellText strong>{toPersianDigits(row.number || '—')}</CellText>,
            },
            {
              key: 'type_label', label: 'نوع تضمین', width: '16%', align: 'right',
              render: (row) => <CellText strong>{row.type_label || '—'}</CellText>,
            },
            {
              key: 'instrument_label', label: 'ابزار', width: '12%', align: 'right',
              render: (row) => <CellText>{row.instrument_label || '—'}</CellText>,
            },
            {
              key: 'bank', label: 'بانک / صادرکننده', width: '14%', align: 'right',
              render: (row) => <CellText>{row.bank || '—'}</CellText>,
            },
            {
              key: 'amount', label: 'مبلغ', width: '14%',
              render: (row) => <CellText strong>{money(row.amount, 'ریال')}</CellText>,
            },
            {
              key: 'coverage', label: 'پوشش از قلم', width: '12%',
              render: (row) => {
                if (!row.requirement_required) return <CellText>—</CellText>;
                const share = Math.min(100, Math.round((Number(row.amount || 0) / row.requirement_required) * 100));
                return (
                  <Stack spacing={0.3} alignItems="center" sx={{ width: '100%' }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: INK }}>{toPersianDigits(share)}٪</Typography>
                    <Box sx={{ width: '82%', height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.07), overflow: 'hidden' }}>
                      <Box sx={{ width: `${share}%`, height: '100%', bgcolor: theme.palette.primary.main, opacity: 0.85 }} />
                    </Box>
                  </Stack>
                );
              },
            },
            {
              key: 'expiry_date', label: 'سررسید', width: '11%',
              render: (row) => <CellText>{dateLabel(row.expiry_date)}</CellText>,
            },
            {
              key: 'state', label: 'وضعیت', width: '13%',
              render: (row) => {
                const state = guaranteeState(row);
                return (
                  <Stack direction="row" spacing={0.9} alignItems="center" justifyContent="center">
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: state.color }} />
                    <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700, color: state.color }}>{state.label}</Typography>
                  </Stack>
                );
              },
            },
          ]}
        />
      </SectionCard>

      {unrequired.length ? (
        <SectionCard title="تضامین بدون تعریف در قرارداد" icon={DescriptionIcon} color={theme.palette.warning.main} sx={{ mb: 0 }}>
          <Stack spacing={0.6}>
            {unrequired.map((item) => {
              const state = guaranteeState(item);
              return (
                <Stack key={item.id} direction="row" alignItems="center" spacing={1.1}
                  sx={{
                    px: 1, py: 0.7, borderRadius: '10px',
                    border: '1px solid',
                    borderColor: 'var(--hrms-table-border-color, rgba(15,23,42,0.14))',
                  }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: state.color }} />
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: INK, flex: 1, minWidth: 0 }}>
                    {item.number || '—'} · {item.type_label || '—'}{item.bank ? ` · ${item.bank}` : ''}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>{money(item.amount, 'ریال')}</Typography>
                  <Typography noWrap sx={{ fontSize: 10, color: state.color, minWidth: 62, textAlign: 'left' }}>{state.label}</Typography>
                </Stack>
              );
            })}
          </Stack>
        </SectionCard>
      ) : null}

      {warnings.length ? (
        <SectionCard title="هشدارهای تضامین" icon={DescriptionIcon} color={theme.palette.error.main} sx={{ mb: 0 }}>
          <Stack spacing={0.5}>
            {warnings.map((warning) => (
              <Typography key={warning} sx={{ fontSize: 11.5, color: theme.palette.error.dark }}>• {warning}</Typography>
            ))}
          </Stack>
        </SectionCard>
      ) : null}
    </Stack>
  );
};




/* ---------- صورت‌وضعیت‌ها ---------- */
export const StatementsTab = ({ ctx }) => (
  <Stack spacing={2}>
    <Grid container spacing={1.5}>
      <Grid item xs={12} sm={6} md={3}><DetailTile label="جمع صورت‌وضعیت‌ها (ریال)" value={formatPersianNumber(ctx.totalStatements)} /></Grid>
      <Grid item xs={12} sm={6} md={3}><DetailTile label="تعدیل خالص (ریال)" value={formatPersianNumber(ctx.adjustmentNetRial)} /></Grid>
      <Grid item xs={12} sm={6} md={3}><DetailTile label="تعداد صورت‌وضعیت" value={toPersianDigits((ctx.contract.statements || []).length)} /></Grid>
      <Grid item xs={12} sm={6} md={3}><DetailTile label="تأییدشده" value={toPersianDigits((ctx.contract.statements || []).filter((row) => row.is_approved).length)} /></Grid>
    </Grid>
    <SectionCard title="فهرست صورت‌وضعیت‌ها" icon={DescriptionIcon} color={ctx.accent}>
      <ProfileTable
        ariaLabel="فهرست صورت‌وضعیت‌ها"
        emptyText="صورت‌وضعیتی برای این قرارداد ثبت نشده است."
        rows={(ctx.contract.statements || []).map((row) => ({ ...row, key: row.id }))}
        columns={[
          { key: 'number', label: 'شماره / نوع', width: '17%', render: (row) => <CellText strong>{statementDisplayTitle({ kind: row.kind, number: row.number })}</CellText> },
          { key: 'date', label: 'تاریخ', width: '11%', render: (row) => <CellText>{dateLabel(row.date)}</CellText> },
          { key: 'work_done', label: 'کارکرد', width: '15%', render: (row) => <CellText>{formatPersianNumber(row.work_done || 0)}</CellText> },
          { key: 'additions_total', label: 'اضافات', width: '12%', render: (row) => <CellText color="#047857">{formatPersianNumber(row.additions_total || 0)}</CellText> },
          { key: 'deductions_total', label: 'کسورات', width: '12%', render: (row) => <CellText color="#b91c1c">{formatPersianNumber(row.deductions_total || 0)}</CellText> },
          { key: 'net_amount', label: 'خالص', width: '15%', render: (row) => <CellText strong>{formatPersianNumber(row.net_amount || 0)}</CellText> },
          { key: 'is_approved', label: 'وضعیت', width: '13%', render: (row) => <CellText color={row.is_approved ? '#047857' : '#b45309'}>{row.is_approved ? 'تأییدشده' : 'در انتظار'}</CellText> },
        ]}
      />
    </SectionCard>
  </Stack>
);


/* ---------- فاکتورها ---------- */
export const InvoicesTab = ({ ctx }) => (
  <Stack spacing={2}>
    <Grid container spacing={1.5}>
      <Grid item xs={12} sm={4}><DetailTile label="جمع فاکتورها" value={money(ctx.totalInvoices, 'ریال')} /></Grid>
      <Grid item xs={12} sm={4}><DetailTile label="تعداد فاکتور" value={toPersianDigits((ctx.contract.invoices || []).length)} /></Grid>
      <Grid item xs={12} sm={4}><DetailTile label="پرداخت‌های ثبت‌شده" value={money(ctx.totalPaid, 'ریال')} /></Grid>
    </Grid>
    <SectionCard title="فهرست فاکتورها" icon={DescriptionIcon} color={ctx.accent}>
      <ProfileTable
        ariaLabel="فهرست فاکتورها"
        emptyText="فاکتوری برای این قرارداد ثبت نشده است."
        rows={(ctx.contract.invoices || []).map((row) => ({ ...row, key: row.id }))}
        columns={[
          { key: 'number', label: 'شماره', width: '14%', render: (row) => <CellText strong>{toPersianDigits(row.number || '—')}</CellText> },
          { key: 'date', label: 'تاریخ', width: '13%', render: (row) => <CellText>{dateLabel(row.date)}</CellText> },
          { key: 'subject', label: 'موضوع', width: '35%', align: 'right', render: (row) => <CellText strong>{row.subject || '—'}</CellText> },
          { key: 'total', label: 'مبلغ', width: '20%', render: (row) => <CellText strong>{money(row.total, row.currency_name || 'ریال')}</CellText> },
          { key: 'status', label: 'وضعیت', width: '18%', render: (row) => <CellText>{row.status_display || row.status || '—'}</CellText> },
        ]}
      />
    </SectionCard>
  </Stack>
);

/* ---------- پرداخت‌ها ---------- */
export const PaymentsTab = ({ ctx }) => (
  <Stack spacing={2}>
    <Grid container spacing={1.5}>
      <Grid item xs={12} sm={4}><DetailTile label="جمع پرداخت‌ها" value={money(ctx.totalPaid, 'ریال')} /></Grid>
      <Grid item xs={12} sm={4}><DetailTile label="تعداد پرداخت" value={toPersianDigits((ctx.contract.payments || []).length)} /></Grid>
      <Grid item xs={12} sm={4}><DetailTile label="مانده مالی" value={money(ctx.remainingRial, 'ریال')} /></Grid>
    </Grid>
    <SectionCard title="فهرست پرداخت‌ها" icon={DescriptionIcon} color={ctx.accent}>
      <ProfileTable
        ariaLabel="فهرست پرداخت‌ها"
        emptyText="پرداختی برای این قرارداد ثبت نشده است."
        rows={(ctx.contract.payments || []).map((row) => ({ ...row, key: row.id }))}
        columns={[
          { key: 'date', label: 'تاریخ', width: '13%', render: (row) => <CellText>{dateLabel(row.date)}</CellText> },
          { key: 'reference', label: 'مرجع', width: '20%', align: 'right', render: (row) => <CellText strong>{row.reference || '—'}</CellText> },
          { key: 'method', label: 'روش', width: '16%', render: (row) => <CellText>{row.method || '—'}</CellText> },
          { key: 'amount', label: 'مبلغ', width: '22%', render: (row) => <CellText strong>{money(row.amount, 'ریال')}</CellText> },
          { key: 'note', label: 'توضیح', width: '29%', align: 'right', render: (row) => <CellText>{row.note || '—'}</CellText> },
        ]}
      />
    </SectionCard>
  </Stack>
);

/* ---------- قراردادهای هم‌تراز ---------- */
export const RelatedTab = ({ ctx }) => (
  <RelatedContractsStudioCard contracts={ctx.relatedContracts} onOpen={ctx.openRelated}
    statusLabels={ctx.statusLabels} statusColors={ctx.statusColors} />
);

/* ---------- مدارک ---------- */
const documentPlace = (doc) => (
  doc.addendum_number ? 'الحاقیه'
    : doc.guarantee_number ? 'تضمین'
      : doc.statement_number ? 'صورت‌وضعیت' : 'مستندات قرارداد'
);

const fileSizeLabel = (bytes) => {
  const value = Number(bytes) || 0;
  if (!value) return '—';
  if (value >= 1024 * 1024) return `${formatPersianNumber(Number((value / (1024 * 1024)).toFixed(1)))} مگابایت`;
  if (value >= 1024) return `${formatPersianNumber(Math.round(value / 1024))} کیلوبایت`;
  return `${formatPersianNumber(value)} بایت`;
};

export const DocumentsTab = ({ ctx }) => {
  const theme = useTheme();
  const documents = ctx.contract.documents || [];
  const rows = [...documents]
    .sort((a, b) => String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || '')))
    .map((doc) => ({ ...doc, key: doc.id }));
  const totalSize = documents.reduce((sum, doc) => sum + Number(doc.file_size || 0), 0);
  const linkedCount = documents.filter((doc) => doc.addendum_number || doc.guarantee_number).length;
  const statementDocs = documents.filter((doc) => doc.statement_number).length;

  return (
    <Stack spacing={2}>
      <Grid container spacing={1.5}>
        <Grid item xs={6} md={3}>
          <DetailTile label="تعداد مدارک" value={toPersianDigits(documents.length)} />
        </Grid>
        <Grid item xs={6} md={3}>
          <DetailTile label="حجم کل" value={fileSizeLabel(totalSize)} />
        </Grid>
        <Grid item xs={6} md={3}>
          <DetailTile label="پیوست الحاقیه/تضمین" value={toPersianDigits(linkedCount)} />
        </Grid>
        <Grid item xs={6} md={3}>
          <DetailTile label="اسناد صورت‌وضعیت" value={toPersianDigits(statementDocs)} />
        </Grid>
      </Grid>

      <SectionCard title="مدارک قرارداد" icon={DescriptionIcon} color={ctx.accent} sx={{ mb: 0 }}
        action={<Button size="small" variant="text" onClick={ctx.openArchive}>بایگانی کامل</Button>}>
        <ProfileTable
          ariaLabel="فهرست مدارک قرارداد"
          emptyText="مدرکی برای این قرارداد بارگذاری نشده است."
          rows={rows}
          stickyHeader
          maxHeight={520}
          columns={[
            {
              key: 'row', label: 'ردیف', width: '6%',
              render: (row, index) => <CellText strong>{toPersianDigits(index + 1)}</CellText>,
            },
            {
              key: 'title', label: 'عنوان', width: '27%', align: 'right',
              render: (row) => <CellText strong>{row.title || row.file_name || '—'}</CellText>,
            },
            {
              key: 'place', label: 'جایگاه', width: '16%', align: 'right',
              render: (row) => <CellText>{documentPlace(row)}</CellText>,
            },
            {
              key: 'file_extension', label: 'نوع', width: '9%',
              render: (row) => <CellText>{String(row.file_extension || '—').toUpperCase()}</CellText>,
            },
            {
              key: 'file_size', label: 'حجم', width: '11%',
              render: (row) => <CellText>{row.file_size_display || fileSizeLabel(row.file_size)}</CellText>,
            },
            {
              key: 'uploaded_at', label: 'تاریخ بارگذاری', width: '14%',
              render: (row) => <CellText>{dateLabel(row.uploaded_at)}</CellText>,
            },
            {
              key: 'actions', label: 'عملیات', width: '17%',
              render: (row) => (
                <Stack direction="row" spacing={0.25} justifyContent="center">
                  <Tooltip title="مشاهده">
                    <IconButton size="small" aria-label="مشاهده سند" onClick={() => ctx.openDocument(row)}>
                      <VisibilityIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="دانلود">
                    <IconButton size="small" aria-label="دانلود سند" color="primary" onClick={() => ctx.downloadDocument(row)}>
                      <DownloadIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="ویرایش">
                    <IconButton size="small" aria-label="ویرایش سند" onClick={() => ctx.editDocument(row)}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ),
            },
          ]}
        />
        <Typography sx={{ mt: 0.75, fontSize: 10.5, color: MUTED }}>
          مشاهده، فایل را در تب جدید باز می‌کند؛ ویرایش، پنجرهٔ ویرایش سند را در بایگانی همین قرارداد باز می‌کند.
        </Typography>
      </SectionCard>
    </Stack>
  );
};

