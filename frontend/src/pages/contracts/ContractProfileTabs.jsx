import React from 'react';
import {
  Box, Button, Grid, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DescriptionIcon from '@mui/icons-material/Description';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import { resolveTableTheme, tableTypographySx } from '../../core/theme/tableStyles';
import {
  DetailTile, EmptyState, FinancialDonut, INK, KpiCard, MoneyBar, MUTED,
  SectionCard, TimelineList,
} from './ContractProfileUI';
import {
  AddendumsStudioCard, ContractFinanceStudioCard, CoverageCompactCard,
  GuaranteeCompactCard, RelatedContractsStudioCard, TermsStudioCard,
} from './ContractProfileStudioUI';
import { statementDisplayTitle } from './statementKinds';

const money = (value, currency = 'ریال') => `${formatPersianNumber(Number(value) || 0)} ${currency}`;
const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

/* جدول استاندارد داخل تب‌ها — همان توکن‌های استودیوی تم */
const ProfileTable = ({ ariaLabel, columns, rows, emptyText = 'موردی ثبت نشده است.' }) => {
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
    <TableContainer sx={{ border: '1px solid', borderColor: 'var(--hrms-table-border-color, #e8edf4)', borderRadius: '12px', overflow: 'hidden' }}>
      <Table size="small" aria-label={ariaLabel} sx={{
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
        },
        '& tbody td': {
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
export const OverviewTab = ({ ctx }) => {
  const theme = useTheme();
  const {
    contract, currencyLabel, adjustedContractAmount, adjustedContractAmountRial,
    totalPaid, remainingRial, progressPercent, totalStatements, totalInvoices,
    timeline, effects,
  } = ctx;
  const counts = {
    addendum: (contract.addendums || []).length,
    guarantee: (contract.guarantees || []).length,
    statement: (contract.statements || []).length,
    invoice: (contract.invoices || []).length,
    payment: (contract.payments || []).length,
    document: (contract.documents || []).length,
    dispute: (contract.disputes || []).length,
  };
  return (
    <Stack spacing={2}>
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={DescriptionIcon} label="مبلغ مؤثر قرارداد" value={adjustedContractAmount}
            suffix={currencyLabel} color={theme.palette.warning.main} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={DescriptionIcon} label="پرداخت‌شده" value={totalPaid} suffix="ریال"
            color={theme.palette.success.main} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={DescriptionIcon} label="مانده مالی" value={remainingRial} suffix="ریال"
            color={theme.palette.error.main} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={DescriptionIcon} label="پیشرفت مالی" value={`${toPersianDigits(progressPercent)}٪`}
            color={theme.palette.info.main} progress={progressPercent}
            progressLabel={`${formatPersianNumber(totalPaid)} از ${formatPersianNumber(adjustedContractAmountRial)} ریال`} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={5}>
          <SectionCard title="ترکیب مالی" icon={DescriptionIcon} color={theme.palette.info.main}
            contentSx={{ pt: 0.5 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
              <FinancialDonut paid={totalPaid} remaining={remainingRial} />
              <Stack spacing={0.75} sx={{ flex: 1, minWidth: 180 }}>
                <MoneyBar label="صورت‌وضعیت‌های ثبت‌شده" value={totalStatements}
                  total={Math.max(totalStatements, adjustedContractAmountRial, 1)} color={theme.palette.info.main} />
                <MoneyBar label="پرداخت‌ها" value={totalPaid}
                  total={Math.max(totalStatements, adjustedContractAmountRial, 1)} color={theme.palette.success.main} />
                <MoneyBar label="فاکتورها" value={totalInvoices}
                  total={Math.max(totalInvoices, totalStatements, adjustedContractAmountRial, 1)} color={theme.palette.secondary.main} />
              </Stack>
            </Stack>
            <Grid container spacing={1}>
              <Grid item xs={6}><DetailTile label="صورت‌وضعیت" value={toPersianDigits(counts.statement)} /></Grid>
              <Grid item xs={6}><DetailTile label="فاکتور" value={toPersianDigits(counts.invoice)} /></Grid>
              <Grid item xs={6}><DetailTile label="پرداخت" value={toPersianDigits(counts.payment)} /></Grid>
              <Grid item xs={6}><DetailTile label="الحاقیه" value={toPersianDigits(counts.addendum)} /></Grid>
              <Grid item xs={6}><DetailTile label="تضمین" value={toPersianDigits(counts.guarantee)} /></Grid>
              <Grid item xs={6}><DetailTile label="مدرک" value={toPersianDigits(counts.document)} /></Grid>
              <Grid item xs={6}><DetailTile label="اختلاف" value={toPersianDigits(counts.dispute)} /></Grid>
              <Grid item xs={6}>
                <DetailTile label="صورت‌وضعیت تأییدشده"
                  value={toPersianDigits((contract.statements || []).filter((row) => row.is_approved).length)} />
              </Grid>
            </Grid>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={7}>
          <SectionCard title="آخرین رویدادها" icon={DescriptionIcon} color={theme.palette.secondary.main}>
            {timeline.length ? <TimelineList events={timeline.slice(0, 9)} maxHeight={330} /> : (
              <EmptyState text="رویدادی برای این قرارداد ثبت نشده است." />
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

/* ---------- مشخصات قرارداد (کامل) ---------- */
export const IdentityTab = ({ ctx }) => {
  const theme = useTheme();
  const {
    contract, currencyLabel, contractRate, effectiveEndDate, effects, contractTypeLabel,
    advanceAmount, guaranteeAmount, retentionPercent, projectNames,
  } = ctx;
  return (
    <Stack spacing={2}>
      <SectionCard title="شناسنامهٔ قرارداد" icon={DescriptionIcon} color={theme.palette.primary.main}>
        <Grid container spacing={1}>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="شمارهٔ قرارداد" value={toPersianDigits(contract.number || '—')} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="نوع قرارداد" value={contractTypeLabel} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="طبقه‌بندی" value={contract.category || '—'} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="امضاکننده" value={contract.signatory_name || '—'} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="طرف قرارداد" value={contract.party_name || '—'} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="تاریخ امضا" value={dateLabel(contract.signing_date)} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="تاریخ شروع" value={dateLabel(contract.start_date)} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="پایان پایه" value={dateLabel(contract.end_date)} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="پایان مؤثر (با الحاقیه)" value={dateLabel(effectiveEndDate)} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="دورهٔ گارانتی" value={contract.warranty_period || '—'} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="شمارهٔ مناقصه" value={contract.tender_number || '—'} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="محل اجرا" value={contract.project_location || '—'} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="مبلغ پایه" value={money(contract.amount, currencyLabel)} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="پیش‌پرداخت" value={money(advanceAmount, currencyLabel)} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="مبلغ تضمین" value={money(guaranteeAmount, currencyLabel)} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="درصد نگهداشت" value={retentionPercent ? `${formatPersianNumber(retentionPercent)}٪` : '—'} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="ارز قرارداد" value={currencyLabel} /></Grid>
          <Grid item xs={6} sm={4} lg={3}><DetailTile label="نرخ تبدیل" value={contractRate > 1 ? formatPersianNumber(contractRate) : '—'} /></Grid>
          <Grid item xs={12} sm={8} lg={6}><DetailTile label="پروژه‌ها" value={projectNames.length ? projectNames.join('، ') : '—'} /></Grid>
        </Grid>
      </SectionCard>

      <Grid container spacing={2}>
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

      {contract.description ? (
        <SectionCard title="توضیحات قرارداد" icon={DescriptionIcon} color={theme.palette.text.secondary}>
          <Typography sx={{ fontSize: 12, lineHeight: 1.9, color: INK, whiteSpace: 'pre-wrap' }}>
            {contract.description}
          </Typography>
        </SectionCard>
      ) : null}

      {(effects?.changes || []).length ? (
        <SectionCard title="اثر مؤثر الحاقیه‌ها" icon={DescriptionIcon} color={theme.palette.secondary.main}>
          <Grid container spacing={1}>
            {(effects.changes || []).map((change, index) => (
              <Grid item xs={12} sm={6} lg={4} key={`${change.field}-${index}`}>
                <DetailTile label={change.source_label || change.field}
                  value={change.field === 'end_date' ? dateLabel(change.to) : formatPersianNumber(change.to || 0)} />
              </Grid>
            ))}
          </Grid>
        </SectionCard>
      ) : null}
    </Stack>
  );
};

/* ---------- مشخصات مالی (کامل) ---------- */
export const FinanceTab = ({ ctx }) => (
  <ContractFinanceStudioCard
    financial={ctx.financial}
    contractRate={ctx.contractRate}
    currencyLabel={ctx.currencyLabel}
    adjustedAmount={ctx.adjustedContractAmount}
    adjustedAmountRial={ctx.adjustedContractAmountRial}
    totalStatements={ctx.totalStatements}
    totalPaid={ctx.totalPaid}
    totalInvoices={ctx.totalInvoices}
    remainingRial={ctx.remainingRial}
    progressPercent={ctx.progressPercent}
    adjustmentNetRial={ctx.adjustmentNetRial}
    monthlyPayments={ctx.paymentMonths}
  />
);


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
export const GuaranteesTab = ({ ctx }) => (
  <Grid container spacing={2}>
    <Grid item xs={12} lg={7}>
      <GuaranteeCompactCard summary={ctx.guaranteeSummary} items={ctx.visibleGuaranteeItems}
        count={ctx.guaranteeCount} coverage={ctx.coveragePercent} currencyLabel="ریال"
        onOpen={ctx.openGuarantees} />
    </Grid>
    <Grid item xs={12} lg={5}>
      <CoverageCompactCard summary={ctx.guaranteeSummary} coverage={ctx.coveragePercent}
        onOpen={ctx.openGuarantees} />
    </Grid>
  </Grid>
);

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

export const DocumentsTab = ({ ctx }) => (
  <Stack spacing={2}>
    <Grid container spacing={1.5}>
      <Grid item xs={12} sm={4}><DetailTile label="تعداد مدارک" value={toPersianDigits((ctx.contract.documents || []).length)} /></Grid>
      <Grid item xs={12} sm={4}><DetailTile label="پیوست الحاقیه/تضمین" value={toPersianDigits((ctx.contract.documents || []).filter((doc) => doc.addendum_number || doc.guarantee_number).length)} /></Grid>
      <Grid item xs={12} sm={4}><DetailTile label="اسناد صورت‌وضعیت" value={toPersianDigits((ctx.contract.documents || []).filter((doc) => doc.statement_number).length)} /></Grid>
    </Grid>
    <SectionCard title="مدارک قرارداد" icon={DescriptionIcon} color={ctx.accent}
      action={<Button size="small" variant="text" onClick={ctx.openArchive}>بایگانی کامل</Button>}>
      <ProfileTable
        ariaLabel="فهرست مدارک قرارداد"
        emptyText="مدرکی برای این قرارداد بارگذاری نشده است."
        rows={(ctx.contract.documents || []).map((row) => ({ ...row, key: row.id }))}
        columns={[
          { key: 'title', label: 'عنوان', width: '30%', align: 'right', render: (row) => <CellText strong>{row.title || row.file_name || '—'}</CellText> },
          { key: 'place', label: 'جایگاه', width: '18%', render: (row) => <CellText>{documentPlace(row)}</CellText> },
          { key: 'file_extension', label: 'نوع', width: '10%', render: (row) => <CellText>{String(row.file_extension || '—').toUpperCase()}</CellText> },
          { key: 'file_size_display', label: 'حجم', width: '12%', render: (row) => <CellText>{row.file_size_display || '—'}</CellText> },
          { key: 'uploaded_at', label: 'تاریخ بارگذاری', width: '16%', render: (row) => <CellText>{dateLabel(row.uploaded_at)}</CellText> },
          {
            key: 'open', label: 'عملیات', width: '14%',
            render: (row) => (
              <Tooltip title="بازکردن در بایگانی">
                <Button size="small" variant="text" onClick={() => ctx.openDocument(row)}>مشاهده</Button>
              </Tooltip>
            ),
          },
        ]}
      />
    </SectionCard>
  </Stack>
);

