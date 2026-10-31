import React, { useMemo } from 'react';
import {
  Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Paper, Select,
  Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import { toJalali } from '../../../core/utils/dateUtils';

const INK = '#0f172a';
const MUTED = '#64748b';
const PERSON_LABELS = { legal: 'حقوقی', natural: 'حقیقی', foreign: 'خارجی', aggregate: 'تجمیعی' };
const num = (value) => Number(value) || 0;
const amountOf = (row) => num(String(row.amount ?? '').replace(/[^\d.-]/g, ''));
const vatOf = (row) => num(String(row.vat ?? '').replace(/[^\d.-]/g, ''));

const matchesFilters = (row, filters = {}) => {
  if (filters.kind && filters.kind !== 'all' && String(row.kind) !== String(filters.kind)) return false;
  if (filters.status && filters.status !== 'all'
    && (row.status === 'registered' ? 'registered' : 'pending') !== filters.status) return false;
  if (filters.personType && filters.personType !== 'all' && (row.personType || 'legal') !== filters.personType) return false;
  const term = String(filters.search || '').trim().toLowerCase();
  if (term) {
    const haystack = [row.name, row.firstName, row.lastName, row.nationalId, row.invoiceNo]
      .map((value) => String(value ?? '')).join(' ').toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  return true;
};

const columnOf = (row, dimension) => {
  if (dimension === 'month') {
    const label = row.invoiceDate ? String(toJalali(row.invoiceDate)).slice(0, 7) : 'بدون تاریخ';
    return { key: label, label, order: label };
  }
  if (dimension === 'moadian_status') {
    const status = row.status === 'registered' ? 'registered' : 'pending';
    return {
      key: status,
      label: status === 'registered' ? 'درج‌شده در سامانه' : 'درج‌نشده در سامانه',
      order: status,
    };
  }
  if (dimension === 'person_type') {
    const type = row.personType || 'unknown';
    return { key: type, label: PERSON_LABELS[type] || 'نامشخص', order: type };
  }
  const kind = Number(row.kind) || 1;
  return { key: `kind_${kind}`, label: `نوع ${toPersianDigits(kind)}`, order: `kind_${String(kind).padStart(2, '0')}` };
};

/* پیوت محلی (وقتی سرور در دسترس نیست) با همان شکل پاسخ API */
const buildLocalPivot = (rows, filters, dimension) => {
  const filled = (rows || []).filter(
    (row) => (String(row.amount ?? '').trim() || String(row.name ?? '').trim()) && matchesFilters(row, filters),
  );
  const columns = new Map();
  const parties = new Map();
  filled.forEach((row) => {
    const column = columnOf(row, dimension);
    if (!columns.has(column.key)) columns.set(column.key, column);
    const name = String(row.name || '').trim() || 'بدون نام';
    const key = `${name}|${row.personType || 'legal'}`;
    const entry = parties.get(key) || {
      name, person_type: row.personType || 'legal', national_id: row.nationalId || '',
      count: 0, amount: 0, vat: 0, values: {},
    };
    entry.count += 1;
    entry.amount += amountOf(row);
    entry.vat += vatOf(row);
    entry.values[column.key] = (entry.values[column.key] || 0) + amountOf(row);
    if (!entry.national_id && row.nationalId) entry.national_id = row.nationalId;
    parties.set(key, entry);
  });
  const columnList = [...columns.values()].sort((a, b) => String(a.order).localeCompare(String(b.order)));
  const ordered = [...parties.values()].sort((a, b) => b.amount - a.amount);
  const totalAmount = ordered.reduce((sum, entry) => sum + entry.amount, 0);
  const totalVat = ordered.reduce((sum, entry) => sum + entry.vat, 0);
  let cumulative = 0;
  const payloadRows = ordered.map((entry, index) => {
    cumulative += entry.amount;
    return {
      rank: index + 1,
      name: entry.name,
      person_type: entry.person_type,
      person_type_label: PERSON_LABELS[entry.person_type] || 'نامشخص',
      national_id: entry.national_id,
      count: entry.count,
      amount: entry.amount,
      vat: entry.vat,
      total: entry.amount + entry.vat,
      share: totalAmount ? entry.amount / totalAmount : 0,
      cumulative_share: totalAmount ? cumulative / totalAmount : 0,
      values: Object.fromEntries(columnList.map((column) => [column.key, entry.values[column.key] || 0])),
    };
  });
  return {
    offline: true,
    dimension,
    dimension_label: 'پیوت محلی',
    columns: columnList,
    rows: payloadRows,
    column_totals: Object.fromEntries(columnList.map((column) => [
      column.key, ordered.reduce((sum, entry) => sum + (entry.values[column.key] || 0), 0),
    ])),
    totals: {
      count: filled.length,
      parties: ordered.length,
      amount: totalAmount,
      vat: totalVat,
      total: totalAmount + totalVat,
    },
  };
};


const DIMENSIONS = [
  { value: 'kind', label: 'نوع معامله' },
  { value: 'month', label: 'ماه شمسی' },
  { value: 'moadian_status', label: 'وضعیت سامانه مودیان' },
  { value: 'person_type', label: 'نوع طرف معامله' },
];

const SeasonalPartyPivot = ({
  pivot, rows, filters, dimension, onDimensionChange, onExport, exporting = false, loading = false,
}) => {
  const data = useMemo(
    () => pivot || buildLocalPivot(rows || [], filters, dimension),
    [pivot, rows, filters, dimension],
  );
  const offline = Boolean(data.offline);
  const columns = data.columns || [];
  const rows_ = data.rows || [];
  const totals = data.totals || {};

  return (
    <Paper elevation={0} sx={{
      borderRadius: '12px', border: '1px solid var(--hrms-table-border-color, #e2e8f0)',
      bgcolor: 'background.paper', overflow: 'hidden',
    }}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', px: 1.4, py: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>
          جدول پیوت طرف حساب
        </Typography>
        <Typography sx={{ fontSize: 10, color: MUTED }}>
          جمع مبلغ هر طرف حساب، تفکیک‌شده بر اساس ستون انتخابی
        </Typography>
        <Box sx={{ flex: 1 }} />
        <FormControl size="small" sx={{ minWidth: 175 }}>
          <InputLabel id="pivot-dimension-label" sx={{ fontSize: 11 }}>تفکیک ستون‌ها</InputLabel>
          <Select
            labelId="pivot-dimension-label"
            label="تفکیک ستون‌ها"
            value={dimension || data.dimension || 'kind'}
            onChange={(event) => onDimensionChange?.(event.target.value)}
            sx={{ fontSize: 11, height: 30 }}
          >
            {DIMENSIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ fontSize: 11 }}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => onExport?.()}
          disabled={exporting || offline || !onExport}
          sx={{ fontSize: 10.5 }}
          title={offline ? 'خروجی اکسل پیوت پس از استقرار بک‌اند فعال می‌شود' : 'خروجی اکسل جدول پیوت'}
        >
          خروجی اکسل پیوت
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={20} />
        </Box>
      ) : null}

      <TableContainer sx={{ maxHeight: 430 }}>
        <Table size="small" stickyHeader aria-label="جدول پیوت طرف حساب">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontSize: 10.5, fontWeight: 800, minWidth: 44 }}>ردیف</TableCell>
              <TableCell sx={{ fontSize: 10.5, fontWeight: 800, minWidth: 190 }}>طرف حساب</TableCell>
              <TableCell align="center" sx={{ fontSize: 10.5, fontWeight: 800 }}>تعداد</TableCell>
              {columns.map((column) => (
                <TableCell key={column.key} align="center" sx={{ fontSize: 10.5, fontWeight: 800, minWidth: 96 }}>
                  {column.label}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontSize: 10.5, fontWeight: 800 }}>جمع مبلغ</TableCell>
              <TableCell align="center" sx={{ fontSize: 10.5, fontWeight: 800 }}>مالیات</TableCell>
              <TableCell align="center" sx={{ fontSize: 10.5, fontWeight: 800 }}>جمع کل</TableCell>
              <TableCell align="center" sx={{ fontSize: 10.5, fontWeight: 800 }}>سهم</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows_.map((row) => (
              <TableRow key={`${row.rank}-${row.name}`} hover>
                <TableCell align="center" sx={{ fontSize: 10, color: MUTED }}>
                  {toPersianDigits(row.rank)}
                </TableCell>
                <TableCell sx={{ fontSize: 10.5 }}>
                  <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700, color: INK }}>{row.name}</Typography>
                  <Typography noWrap sx={{ fontSize: 9, color: MUTED }}>
                    {`${row.person_type_label}${row.national_id ? ` · ${toPersianDigits(row.national_id)}` : ''}`}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ fontSize: 10 }}>{toPersianDigits(row.count)}</TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key} align="center" sx={{ fontSize: 10 }}>
                    {row.values?.[column.key] ? formatPersianNumber(row.values[column.key]) : '—'}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontSize: 10, fontWeight: 800 }}>
                  {formatPersianNumber(row.amount)}
                </TableCell>
                <TableCell align="center" sx={{ fontSize: 10 }}>{formatPersianNumber(row.vat)}</TableCell>
                <TableCell align="center" sx={{ fontSize: 10 }}>{formatPersianNumber(row.total)}</TableCell>
                <TableCell align="center" sx={{ fontSize: 10, color: MUTED }}>
                  {`${toPersianDigits(Math.round(num(row.share) * 100))}٪`}
                </TableCell>
              </TableRow>
            ))}
            {!rows_.length ? (
              <TableRow>
                <TableCell colSpan={columns.length + 7} align="center" sx={{ fontSize: 11, py: 3, color: MUTED }}>
                  ردیفی با این فیلتر برای پیوت وجود ندارد.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} sx={{ fontSize: 10.5, fontWeight: 800 }}>
                {`جمع کل — ${toPersianDigits(totals.parties || 0)} طرف حساب`}
              </TableCell>
              <TableCell align="center" sx={{ fontSize: 10, fontWeight: 800 }}>
                {toPersianDigits(totals.count || 0)}
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.key} align="center" sx={{ fontSize: 10, fontWeight: 800 }}>
                  {formatPersianNumber(data.column_totals?.[column.key] || 0)}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontSize: 10, fontWeight: 900 }}>
                {formatPersianNumber(totals.amount || 0)}
              </TableCell>
              <TableCell align="center" sx={{ fontSize: 10, fontWeight: 800 }}>
                {formatPersianNumber(totals.vat || 0)}
              </TableCell>
              <TableCell align="center" sx={{ fontSize: 10, fontWeight: 800 }}>
                {formatPersianNumber(totals.total || 0)}
              </TableCell>
              <TableCell align="center" sx={{ fontSize: 10, fontWeight: 800 }}>۱۰۰٪</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      {offline ? (
        <Typography sx={{ fontSize: 9.5, color: '#92400e', bgcolor: '#fef3c7', px: 1.4, py: 0.5 }}>
          پیوت محلی (سرور در دسترس نیست) — خروجی اکسل پس از استقرار بک‌اند فعال می‌شود.
        </Typography>
      ) : null}
      {data.truncated ? (
        <Typography sx={{ fontSize: 9.5, color: MUTED, px: 1.4, py: 0.5 }}>
          {`فقط ${toPersianDigits(data.limit || 0)} طرف نخست نمایش داده شد؛ جمع‌ها برای همهٔ طرف‌ها است.`}
        </Typography>
      ) : null}
    </Paper>
  );
};

export default SeasonalPartyPivot;

