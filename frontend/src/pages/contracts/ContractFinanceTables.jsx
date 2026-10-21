import React from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  Typography, Chip, Stack,
} from '@mui/material';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { formatPersianNumber, toPersianDigits, normalizeCurrencyLabel } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { EmptyState, INK, MUTED } from './ContractProfileUI';

export const toNum = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const titleOf = (row) => String(row?.title || row?.description || '').replace(/\s+/g, ' ').trim();

const addAmount = (items, predicate) => (Array.isArray(items) ? items : [])
  .filter((item) => predicate(titleOf(item)))
  .reduce((sum, item) => sum + toNum(item.amount), 0);

/**
 * اقلام مالی هر صورت‌وضعیت را به ستون‌های همان فایل اکسل تبدیل می‌کند.
 * اگر عنوان کسورات با عنوان‌های استاندارد تطبیق نداشته باشد، در «سایر کسورات» می‌آید.
 */
export const statementMetrics = (row, fallbackRate = 0) => {
  const additions = Array.isArray(row?.additions) ? row.additions : [];
  const deductions = Array.isArray(row?.deductions) ? row.deductions : [];
  const buckets = {
    retention: 0,
    insurance: 0,
    prepayment: 0,
    materials: 0,
    statementAdvance: 0,
    otherAdvance: 0,
    other: 0,
  };

  deductions.forEach((item) => {
    const title = titleOf(item);
    const amount = toNum(item.amount);
    if (title.includes('حسن')) buckets.retention += amount;
    else if (title.includes('بیمه')) buckets.insurance += amount;
    else if (title.includes('پیش پرداخت') || title.includes('پیشپرداخت')) buckets.prepayment += amount;
    else if (title.includes('مصالح')) buckets.materials += amount;
    else if (title.includes('علی الحساب') && title.includes('صورت وضعیت')) buckets.statementAdvance += amount;
    else if (title.includes('علی الحساب') || title.includes('علیالحساب')) buckets.otherAdvance += amount;
    else buckets.other += amount;
  });

  const categorized = Object.values(buckets).reduce((sum, value) => sum + value, 0);
  const reportedDeductions = toNum(row?.deductions_total) || categorized;
  if (reportedDeductions > categorized) buckets.other += reportedDeductions - categorized;
  const deductionsTotal = Math.max(reportedDeductions, categorized);

  const additionsTotal = toNum(row?.additions_total)
    || additions.reduce((sum, item) => sum + toNum(item.amount), 0);
  const vatFromAdditions = addAmount(additions, (title) => title.includes('ارزش افزوده') || title.includes('مالیات'));
  const vat = toNum(row?.value_added_tax) || vatFromAdditions;
  const gross = toNum(row?.work_done)
    || Math.max(0, toNum(row?.amount) - toNum(row?.cumulative_previous_amount));
  const rate = toNum(row?.exchange_rate) || toNum(fallbackRate) || 0;
  const foreign = Boolean(row?.currency_name) && normalizeCurrencyLabel(row.currency_name) !== 'ریال';
  const foreignGross = foreign && rate > 0 ? gross / rate : null;
  const net = row?.net_amount !== null && row?.net_amount !== undefined && row?.net_amount !== ''
    ? toNum(row.net_amount)
    : gross + additionsTotal - deductionsTotal;

  return {
    gross,
    foreignGross,
    rate,
    vat,
    additionsTotal,
    deductionsTotal,
    net: Math.max(0, net),
    buckets,
  };
};

const headSx = {
  px: 0.8, py: 1, fontSize: 12, fontWeight: 800, color: '#334155',
  bgcolor: '#f1f5f9', borderBottom: '1px solid #dbe4ee', whiteSpace: 'nowrap',
  textAlign: 'center', verticalAlign: 'middle',
};
const cellSx = {
  px: 0.8, py: 0.75, fontSize: 12, color: '#334155',
  borderBottom: '1px solid #eef2f7', whiteSpace: 'nowrap', textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
};
const moneySx = { ...cellSx, fontWeight: 700, color: INK };

const money = (value) => formatPersianNumber(value || 0);
export const StatementsTable = ({ statements = [], currencyLabel = 'ریال', fallbackRate = 0 }) => {
  const rows = statements.map((row, index) => ({
    row,
    index,
    metrics: statementMetrics(row, fallbackRate),
  }));

  const totals = rows.reduce((sum, item) => {
    sum.foreign += item.metrics.foreignGross || 0;
    sum.gross += item.metrics.gross;
    sum.vat += item.metrics.vat;
    sum.deductions += item.metrics.deductionsTotal;
    sum.net += item.metrics.net;
    Object.keys(sum.buckets).forEach((key) => { sum.buckets[key] += item.metrics.buckets[key]; });
    return sum;
  }, {
    foreign: 0, gross: 0, vat: 0, deductions: 0, net: 0,
    buckets: { retention: 0, insurance: 0, prepayment: 0, materials: 0, statementAdvance: 0, otherAdvance: 0, other: 0 },
  });

  if (!rows.length) {
    return <EmptyState icon={TableRowsIcon} text="برای این قرارداد هنوز صورت‌وضعیتی ثبت نشده است." />;
  }

  const deductionColumns = [
    ['retention', 'حسن انجام کار'],
    ['insurance', 'بیمه'],
    ['prepayment', 'پیش‌پرداخت'],
    ['materials', 'علی‌الحساب خرید مصالح'],
    ['statementAdvance', 'علی‌الحساب صورت‌وضعیت'],
    ['otherAdvance', 'علی‌الحساب'],
    ['other', 'سایر کسورات'],
  ];

  return (
    <TableContainer sx={{ maxHeight: 560, border: '1px solid #e8edf4', borderRadius: '12px', bgcolor: '#fff' }}>
      <Table size="small" stickyHeader sx={{ minWidth: 1580, '& td, & th': { fontFamily: 'inherit' } }}>
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2} sx={{ ...headSx, minWidth: 44 }}>ردیف</TableCell>
            <TableCell rowSpan={2} sx={{ ...headSx, minWidth: 210, textAlign: 'right' }}>عنوان صورت‌وضعیت</TableCell>
            <TableCell rowSpan={2} sx={{ ...headSx, minWidth: 105 }}>ناخالص ارزی</TableCell>
            <TableCell rowSpan={2} sx={{ ...headSx, minWidth: 100 }}>نرخ تبدیل</TableCell>
            <TableCell rowSpan={2} sx={{ ...headSx, minWidth: 145 }}>مبلغ ناخالص (ریال)</TableCell>
            <TableCell rowSpan={2} sx={{ ...headSx, minWidth: 140 }}>مالیات بر ارزش افزوده</TableCell>
            <TableCell colSpan={7} sx={{ ...headSx, bgcolor: '#eef2ff', borderLeft: '1px solid #dbe4ee', borderRight: '1px solid #dbe4ee' }}>کسورات</TableCell>
            <TableCell rowSpan={2} sx={{ ...headSx, minWidth: 135 }}>جمع کسورات</TableCell>
            <TableCell rowSpan={2} sx={{ ...headSx, minWidth: 150, bgcolor: '#fff7ed' }}>خالص قابل پرداخت</TableCell>
          </TableRow>
          <TableRow>
            {deductionColumns.map(([key, label]) => (
              <TableCell key={key} sx={{ ...headSx, minWidth: 100, fontSize: 12 }}>{label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ row, index, metrics }) => (
            <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
              <TableCell sx={cellSx}>{toPersianDigits(index + 1)}</TableCell>
              <TableCell sx={{ ...cellSx, textAlign: 'right', minWidth: 210, whiteSpace: 'normal' }}>
                <Stack direction="row" alignItems="center" spacing={0.6} useFlexGap flexWrap="wrap">
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{row.number || `صورت‌وضعیت ${toPersianDigits(index + 1)}`}</Typography>
                  {row.is_approved ? <Chip size="small" label="تأییدشده" sx={{ height: 17, fontSize: 12, bgcolor: '#eff6ff', color: '#1d4ed8' }} /> : null}
                </Stack>
                <Typography sx={{ fontSize: 12, color: MUTED, mt: 0.2 }}>{toJalali(row.date)}</Typography>
              </TableCell>
              <TableCell sx={cellSx}>{metrics.foreignGross != null ? money(metrics.foreignGross) : '—'}</TableCell>
              <TableCell sx={cellSx}>{metrics.rate > 1 ? money(metrics.rate) : '—'}</TableCell>
              <TableCell sx={moneySx}>{money(metrics.gross)}</TableCell>
              <TableCell sx={moneySx}>{money(metrics.vat)}</TableCell>
              {deductionColumns.map(([key]) => (
                <TableCell key={key} sx={cellSx}>{metrics.buckets[key] ? money(metrics.buckets[key]) : '—'}</TableCell>
              ))}
              <TableCell sx={{ ...moneySx, color: '#be123c' }}>{money(metrics.deductionsTotal)}</TableCell>
              <TableCell sx={{ ...moneySx, color: '#1d4ed8', bgcolor: '#fffaf3' }}>{money(metrics.net)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow sx={{ bgcolor: '#f8fafc' }}>
            <TableCell colSpan={2} sx={{ ...cellSx, fontWeight: 900, color: INK, textAlign: 'right' }}>جمع کل</TableCell>
            <TableCell sx={{ ...cellSx, fontWeight: 800 }}>{totals.foreign ? money(totals.foreign) : '—'}</TableCell>
            <TableCell sx={cellSx}>—</TableCell>
            <TableCell sx={moneySx}>{money(totals.gross)}</TableCell>
            <TableCell sx={moneySx}>{money(totals.vat)}</TableCell>
            {deductionColumns.map(([key]) => (
              <TableCell key={key} sx={{ ...moneySx, fontSize: 12 }}>{money(totals.buckets[key])}</TableCell>
            ))}
            <TableCell sx={{ ...moneySx, color: '#be123c' }}>{money(totals.deductions)}</TableCell>
            <TableCell sx={{ ...moneySx, color: '#1d4ed8', bgcolor: '#fff7ed' }}>{money(totals.net)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
};

export const SimpleTable = ({
  columns = [], rows = [], renderRow, rowKey, emptyText = 'داده‌ای ثبت نشده است.',
  emptyIcon, minWidth = 720, maxHeight = 430,
}) => {
  if (!rows.length) return <EmptyState icon={emptyIcon} text={emptyText} />;
  return (
    <TableContainer sx={{ maxHeight, border: '1px solid #e8edf4', borderRadius: '12px', bgcolor: '#fff' }}>
      <Table size="small" stickyHeader sx={{ minWidth }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} sx={{ ...headSx, minWidth: column.width, textAlign: column.align || 'center' }}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const cells = renderRow(row, index);
            return (
              <TableRow key={rowKey(row, index)} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                {cells.map((content, cellIndex) => (
                  <TableCell key={`${columns[cellIndex]?.key || cellIndex}`} sx={{ ...cellSx, textAlign: columns[cellIndex]?.align || 'center', whiteSpace: 'normal' }}>
                    {content}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export const AdvanceTable = ({ rows = [], total = 0, amortized = 0, remaining = 0, currency = 'ریال' }) => (
  <Stack spacing={1.5}>
    <SimpleTable
      columns={[
        { key: 'index', label: 'ردیف', width: 45 },
        { key: 'description', label: 'شرح پیش‌پرداخت', width: 220, align: 'right' },
        { key: 'amount', label: 'مبلغ', width: 140 },
      ]}
      rows={rows}
      rowKey={(row, index) => row.id || `advance-${index}`}
      emptyText="پیش‌پرداختی ثبت نشده است."
      minWidth={430}
      maxHeight={260}
      renderRow={(row, index) => [
        toPersianDigits(index + 1),
        <Box key="desc">
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: INK }}>{row.step || row.description || `مرحله ${toPersianDigits(index + 1)}`}</Typography>
          {row.note ? <Typography sx={{ fontSize: 12, color: MUTED }}>{row.note}</Typography> : null}
        </Box>,
        <Typography key="amount" sx={{ fontSize: 12, fontWeight: 800, color: INK }}>
          {money(row.amount)} <Box component="span" sx={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{currency}</Box>
        </Typography>,
      ]}
    />

    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 1 }}>
      {[
        { label: 'کل پیش‌پرداخت', value: total, color: '#0f172a' },
        { label: 'مستهلک‌شده', value: amortized, color: '#b45309' },
        { label: 'باقی‌مانده', value: remaining, color: '#1d4ed8' },
      ].map((item) => (
        <Box key={item.label} sx={{ p: 1, borderRadius: '10px', bgcolor: '#f8fafc', border: '1px solid #eef2f7' }}>
          <Typography sx={{ fontSize: 12, color: MUTED }}>{item.label}</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 900, color: item.color }}>{money(item.value)}</Typography>
          <Typography sx={{ fontSize: 12, color: MUTED }}>{currency}</Typography>
        </Box>
      ))}
    </Box>
  </Stack>
);

export const InvoicesTable = ({ invoices = [], currency = 'ریال' }) => (
  <SimpleTable
    columns={[
      { key: 'number', label: 'شماره', width: 100 },
      { key: 'subject', label: 'موضوع', width: 190, align: 'right' },
      { key: 'date', label: 'تاریخ', width: 95 },
      { key: 'due', label: 'سررسید', width: 95 },
      { key: 'amount', label: 'مبلغ', width: 130 },
      { key: 'vat', label: 'مالیات', width: 120 },
      { key: 'total', label: 'جمع', width: 140 },
      { key: 'status', label: 'وضعیت', width: 90 },
    ]}
    rows={invoices}
    rowKey={(row) => row.id}
    emptyText="فاکتوری برای این قرارداد ثبت نشده است."
    minWidth={1080}
    renderRow={(row) => [
      <Typography key="number" sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{toPersianDigits(row.number || '—')}</Typography>,
      <Typography key="subject" sx={{ fontSize: 12, color: '#334155', textAlign: 'right' }}>{row.subject || '—'}</Typography>,
      <Typography key="date" sx={{ fontSize: 12 }}>{toJalali(row.date)}</Typography>,
      <Typography key="due" sx={{ fontSize: 12, color: MUTED }}>{toJalali(row.due_date)}</Typography>,
      <Typography key="amount" sx={{ fontSize: 12, fontWeight: 700 }}>{money(row.amount)} <Box component="span" sx={{ fontSize: 12, color: MUTED }}>{currency}</Box></Typography>,
      <Typography key="vat" sx={{ fontSize: 12 }}>{money(row.vat)}</Typography>,
      <Typography key="total" sx={{ fontSize: 12, fontWeight: 900, color: INK }}>{money(row.total)}</Typography>,
      <Chip key="status" size="small" label={row.is_paid ? 'پرداخت‌شده' : 'باز'}
        sx={{ height: 20, fontSize: 12, bgcolor: row.is_paid ? '#eff6ff' : '#fffbeb', color: row.is_paid ? '#1d4ed8' : '#b45309' }} />,
    ]}
  />
);

export const PaymentsTable = ({ payments = [], currency = 'ریال' }) => (
  <SimpleTable
    columns={[
      { key: 'date', label: 'تاریخ', width: 95 },
      { key: 'amount', label: 'مبلغ', width: 145 },
      { key: 'method', label: 'روش پرداخت', width: 110 },
      { key: 'reference', label: 'شماره پیگیری', width: 120 },
      { key: 'invoice', label: 'فاکتور', width: 110 },
      { key: 'statement', label: 'صورت‌وضعیت', width: 120 },
      { key: 'note', label: 'توضیحات', width: 200, align: 'right' },
    ]}
    rows={payments}
    rowKey={(row) => row.id}
    emptyText="پرداختی برای این قرارداد ثبت نشده است."
    minWidth={980}
    renderRow={(row) => [
      <Typography key="date" sx={{ fontSize: 12 }}>{toJalali(row.date)}</Typography>,
      <Typography key="amount" sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{money(row.amount)} <Box component="span" sx={{ fontSize: 12, color: MUTED }}>{currency}</Box></Typography>,
      <Typography key="method" sx={{ fontSize: 12 }}>{row.method || '—'}</Typography>,
      <Typography key="ref" sx={{ fontSize: 12, color: MUTED }}>{row.reference || '—'}</Typography>,
      <Typography key="invoice" sx={{ fontSize: 12 }}>{row.invoice_number || '—'}</Typography>,
      <Typography key="statement" sx={{ fontSize: 12 }}>{row.statement_number || '—'}</Typography>,
      <Typography key="note" sx={{ fontSize: 12, color: MUTED, textAlign: 'right' }}>{row.note || '—'}</Typography>,
    ]}
  />
);

export const AddendumsTable = ({ addendums = [], currency = 'ریال' }) => (
  <SimpleTable
    columns={[
      { key: 'number', label: 'شماره', width: 95 },
      { key: 'date', label: 'تاریخ', width: 95 },
      { key: 'subject', label: 'موضوع الحاقیه', width: 230, align: 'right' },
      { key: 'amount', label: 'تغییر مبلغ', width: 135 },
      { key: 'newAmount', label: 'مبلغ جدید', width: 145 },
      { key: 'newEnd', label: 'پایان جدید', width: 100 },
    ]}
    rows={addendums}
    rowKey={(row) => row.id}
    emptyText="الحاقیه‌ای برای این قرارداد ثبت نشده است."
    minWidth={880}
    renderRow={(row) => [
      <Typography key="number" sx={{ fontSize: 12, fontWeight: 800 }}>{toPersianDigits(row.number || '—')}</Typography>,
      <Typography key="date" sx={{ fontSize: 12 }}>{toJalali(row.date)}</Typography>,
      <Box key="subject" sx={{ textAlign: 'right' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{row.subject_type_display || row.subject || '—'}</Typography>
        {row.subject && row.subject_type_display ? <Typography sx={{ fontSize: 12, color: MUTED }}>{row.subject}</Typography> : null}
      </Box>,
      <Typography key="amount" sx={{ fontSize: 12, fontWeight: 800, color: toNum(row.amount_change) >= 0 ? '#1d4ed8' : '#be123c' }}>
        {toNum(row.amount_change) >= 0 ? '+' : ''}{money(row.amount_change)} <Box component="span" sx={{ fontSize: 12, color: MUTED }}>{currency}</Box>
      </Typography>,
      <Typography key="newAmount" sx={{ fontSize: 12, fontWeight: 800 }}>{money(row.new_amount)}</Typography>,
      <Typography key="newEnd" sx={{ fontSize: 12 }}>{row.new_end_date ? toJalali(row.new_end_date) : '—'}</Typography>,
    ]}
  />
);

export const GuaranteesTable = ({ guarantees = [], currency = 'ریال' }) => (
  <SimpleTable
    columns={[
      { key: 'type', label: 'نوع تضمین', width: 120 },
      { key: 'instrument', label: 'ابزار', width: 110 },
      { key: 'number', label: 'شماره', width: 110 },
      { key: 'amount', label: 'مبلغ', width: 140 },
      { key: 'issue', label: 'صدور', width: 100 },
      { key: 'expiry', label: 'انقضا', width: 100 },
      { key: 'bank', label: 'بانک', width: 120 },
      { key: 'status', label: 'وضعیت', width: 90 },
    ]}
    rows={guarantees}
    rowKey={(row) => row.id}
    emptyText="تضمینی برای این قرارداد ثبت نشده است."
    minWidth={980}
    renderRow={(row) => [
      <Typography key="type" sx={{ fontSize: 12, fontWeight: 700 }}>{row.guarantee_type_display || '—'}</Typography>,
      <Typography key="instrument" sx={{ fontSize: 12 }}>{row.instrument_type_display || '—'}</Typography>,
      <Typography key="number" sx={{ fontSize: 12 }}>{toPersianDigits(row.number || '—')}</Typography>,
      <Typography key="amount" sx={{ fontSize: 12, fontWeight: 800 }}>{money(row.amount)} <Box component="span" sx={{ fontSize: 12, color: MUTED }}>{currency}</Box></Typography>,
      <Typography key="issue" sx={{ fontSize: 12 }}>{toJalali(row.issue_date)}</Typography>,
      <Typography key="expiry" sx={{ fontSize: 12 }}>{toJalali(row.expiry_date)}</Typography>,
      <Typography key="bank" sx={{ fontSize: 12 }}>{row.bank || '—'}</Typography>,
      <Chip key="status" size="small" label={row.is_released ? 'آزادشده' : (row.last_action_display || 'فعال')}
        sx={{ height: 20, fontSize: 12, bgcolor: row.is_released ? '#f1f5f9' : '#eff6ff', color: row.is_released ? '#475569' : '#1d4ed8' }} />,
    ]}
  />
);

