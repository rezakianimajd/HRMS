import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Grid, Box, Paper, Button, ButtonGroup, TextField, Divider,
  FormControlLabel, Checkbox,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import {
  COLOR_DARK, BLUE, GREEN, CYAN, glass,
  ReportHeader, StatCard, Loading, EmptyState, StatGrid,
} from './reportHelpers';
import { formatPersianNumber, toPersianDigits, toEnglishDigits } from '../../../core/utils/numberUtils';

/*
 * گزارش تراز حساب‌ها (ماتریس سلسله‌مراتبی) — مطابق نمونهٔ نرم‌افزار حسابداری:
 *   • نوار عمودی سمت راست  : سطح تراز → گروه ← کل ← معین ← تفصیلی ۴ ← تفصیلی ۵ ← تفصیلی ۶
 *   • نوار افقی بالای جدول : «ریز» همان سطح (نمایش زیرسطح به‌صورت تورفته زیر هر سطر)
 *   • قالب ستون‌ها          : چهار ستونی (گردش بدهکار/بستانکار + مانده بدهکار/بستانکار) و سه ستونی
 *   • سطر نخست «جمع کل»، سطر پایانی «جمع ستونی»؛ به‌همراه محدودهٔ کد حساب.
 */
const LEVELS = [
  { value: 0, label: 'گروه', title: 'تراز گروه', detail: 'ریز گروه' },
  { value: 1, label: 'کل', title: 'تراز کل', detail: 'ریز کل' },
  { value: 2, label: 'معین', title: 'تراز معین', detail: 'ریز معین' },
  { value: 3, label: 'تفصیلی ۴', title: 'تراز تفصیلی ۴', detail: 'ریز تفصیلی ۴' },
  { value: 4, label: 'تفصیلی ۵', title: 'تراز تفصیلی ۵', detail: 'ریز تفصیلی ۵' },
  { value: 5, label: 'تفصیلی ۶', title: 'تراز تفصیلی ۶', detail: 'ریز تفصیلی ۶' },
];

const COLUMN_MODES = [
  { value: '4', label: 'چهار ستونی' },
  { value: '3', label: 'سه ستونی' },
];

const normCode = (v) => toEnglishDigits(String(v ?? '')).replace(/\s/g, '');

const MatrixReportPage = () => {
  const navigate = useNavigate();
  const [level, setLevel] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [columnMode, setColumnMode] = useState('4');
  const [onlyWithActivity, setOnlyWithActivity] = useState(true);
  const [fromCode, setFromCode] = useState('');
  const [toCode, setToCode] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-matrix'],
    queryFn: () => axiosInstance.get('/accounting/reports/matrix/').then((r) => r.data),
  });

  // پهن‌کردن درخت حساب‌ها به یک فهرست مسطح (نیاز به پیمایش بازگشتی)
  const flat = useMemo(() => {
    const out = [];
    const walk = (nodes) => {
      (nodes || []).forEach((n) => {
        out.push(n);
        if (n.children && n.children.length) walk(n.children);
      });
    };
    walk(data?.tree || []);
    return out;
  }, [data]);

  // سطرهای سطح انتخاب‌شده؛ در حالت «ریز» زیرسطح نیز تورفته زیر هر سطر می‌آید
  const rows = useMemo(() => {
    const levelNodes = flat.filter((n) => (n.level ?? -1) === level);
    if (!expanded) return levelNodes.map((n) => ({ ...n, __detail: false }));
    const out = [];
    levelNodes.forEach((n) => {
      out.push({ ...n, __detail: false });
      (n.children || [])
        .filter((c) => (c.level ?? -1) === level + 1)
        .forEach((c) => out.push({ ...c, __detail: true }));
    });
    return out;
  }, [flat, level, expanded]);

  const visibleRows = useMemo(() => rows.filter((r) => {
    if (onlyWithActivity && !(r.debit || r.credit)) return false;
    const code = normCode(r.code);
    if (fromCode && code < normCode(fromCode)) return false;
    if (toCode && code > normCode(toCode)) return false;
    return true;
  }), [rows, onlyWithActivity, fromCode, toCode]);

  // جمع ستونی = جمع سطرهای سطح اصلی (زیرسطح‌ها دوباره‌شماری نمی‌شوند)
  const columnTotals = useMemo(() => {
    const t = { debit: 0, credit: 0, balance_debit: 0, balance_credit: 0 };
    visibleRows.forEach((r) => {
      if (r.__detail) return;
      t.debit += r.debit || 0;
      t.credit += r.credit || 0;
      t.balance_debit += r.balance_debit || 0;
      t.balance_credit += r.balance_credit || 0;
    });
    return t;
  }, [visibleRows]);

  const total = data?.total || { debit: 0, credit: 0, balance_debit: 0, balance_credit: 0 };
  const current = LEVELS.find((l) => l.value === level) || LEVELS[1];

  if (isLoading) return <Loading />;

  const netBalance = (n) => (n.balance_debit || 0) - (n.balance_credit || 0);
  const isFlat = (v) => Math.abs(v || 0) < 0.005;

  const numCell = (value, color, bold, sub) => (
    <Box>
      <Typography
        variant="body2"
        fontWeight={bold ? 900 : 600}
        sx={{ color, direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap' }}
      >
        {formatPersianNumber(value)}
      </Typography>
      {sub ? (
        <Typography variant="caption" sx={{ color, display: 'block', textAlign: 'right' }}>
          {sub}
        </Typography>
      ) : null}
    </Box>
  );

  const headCell = (label, extra = {}) => (
    <TableCell
      key={label}
      sx={{ fontWeight: 800, whiteSpace: 'nowrap', bgcolor: 'rgba(139,92,246,0.08)', ...extra }}
    >
      {label}
    </TableCell>
  );

  // ستون‌های مبلغ بر اساس قالب انتخاب‌شده (سه / چهار ستونی)
  const renderAmountCells = (row, bold) => {
    if (columnMode === '4') {
      return (
        <>
          <TableCell>{numCell(row.debit || 0, isFlat(row.debit) ? 'text.disabled' : BLUE, bold)}</TableCell>
          <TableCell>{numCell(row.credit || 0, isFlat(row.credit) ? 'text.disabled' : GREEN, bold)}</TableCell>
          <TableCell>{numCell(row.balance_debit || 0, isFlat(row.balance_debit) ? 'text.disabled' : BLUE, bold)}</TableCell>
          <TableCell>{numCell(row.balance_credit || 0, isFlat(row.balance_credit) ? 'text.disabled' : GREEN, bold)}</TableCell>
        </>
      );
    }
    const net = netBalance(row);
    return (
      <>
        <TableCell>{numCell(row.debit || 0, isFlat(row.debit) ? 'text.disabled' : BLUE, bold)}</TableCell>
        <TableCell>{numCell(row.credit || 0, isFlat(row.credit) ? 'text.disabled' : GREEN, bold)}</TableCell>
        <TableCell>
          {numCell(
            Math.abs(net),
            isFlat(net) ? 'text.disabled' : (net >= 0 ? BLUE : GREEN),
            bold,
            isFlat(net) ? '' : (net >= 0 ? 'بدهکار' : 'بستانکار'),
          )}
        </TableCell>
      </>
    );
  };

  const renderRow = (row, index) => {
    const detail = row.__detail;
    return (
      <TableRow
        key={`${row.kind}-${row.id}-${index}`}
        hover
        sx={{ bgcolor: detail ? 'rgba(6,182,212,0.05)' : undefined }}
      >
        <TableCell sx={{ width: 56 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {toPersianDigits(index + 1)}
          </Typography>
        </TableCell>
        <TableCell sx={{ pr: detail ? 4 : 1 }}>
          <Typography
            variant="body2"
            fontWeight={detail ? 500 : 800}
            sx={{ color: detail ? 'text.secondary' : COLOR_DARK, whiteSpace: 'nowrap' }}
          >
            {detail ? '↳ ' : ''}{row.code}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography
            variant="body2"
            fontWeight={detail ? 400 : 700}
            sx={{ color: detail ? 'text.secondary' : 'text.primary' }}
          >
            {row.name}
          </Typography>
        </TableCell>
        {renderAmountCells(row, !detail)}
      </TableRow>
    );
  };

  return (
    <>
      <ReportHeader
        icon={<GridViewIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="گزارش تراز حساب‌ها"
        subtitle="تراز سلسله‌مراتبی: گروه ← کل ← معین ← تفصیلی ۴/۵/۶ — سطح تراز در نوار کنار و ریز زیرسطح در نوار بالا"
        color={CYAN}
        dark="#0891b2"
      />

      <StatGrid>
        <Grid item xs={6} sm={3}><StatCard label="گردش بدهکار" value={total.debit} color={BLUE} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="گردش بستانکار" value={total.credit} color={GREEN} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="مانده بدهکار" value={total.balance_debit} color={BLUE} /></Grid>
        <Grid item xs={6} sm={3}><StatCard label="مانده بستانکار" value={total.balance_credit} color={GREEN} /></Grid>
      </StatGrid>

      {isError ? (
        <EmptyState message="خطا در بارگذاری تراز حساب‌ها. دوباره تلاش کنید." />
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', '@media print': { display: 'block' } }}>
          {/* نوار سطح تراز — در چیدمان راست‌به‌چپ در سمت راست قرار می‌گیرد */}
          <Paper
            sx={{
              ...glass, p: 1.25, minWidth: 172, display: 'flex', flexDirection: 'column', gap: 0.75,
              '@media print': { display: 'none' },
            }}
          >
            <Typography variant="caption" fontWeight={900} sx={{ color: COLOR_DARK, mb: 0.5 }}>
              سطح تراز
            </Typography>
            {LEVELS.map((l) => (
              <Button
                key={l.value}
                size="small"
                variant={!expanded && level === l.value ? 'contained' : 'outlined'}
                onClick={() => { setLevel(l.value); setExpanded(false); }}
                sx={{ justifyContent: 'flex-start' }}
              >
                {l.title}
              </Button>
            ))}
          </Paper>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* نوار ریز سطح + قالب ستون + محدودهٔ کد + چاپ */}
            <Paper
              sx={{
                ...glass, p: 1.25, mb: 1.5, display: 'flex', flexWrap: 'wrap',
                gap: 1, alignItems: 'center', '@media print': { display: 'none' },
              }}
            >
              <Typography variant="caption" fontWeight={900} sx={{ color: COLOR_DARK }}>ریز سطح</Typography>
              <ButtonGroup size="small" variant="outlined">
                {LEVELS.map((l) => (
                  <Button
                    key={l.value}
                    variant={expanded && level === l.value ? 'contained' : 'outlined'}
                    onClick={() => { setLevel(l.value); setExpanded(true); }}
                  >
                    {l.detail}
                  </Button>
                ))}
              </ButtonGroup>

              <Divider orientation="vertical" flexItem />

              <Typography variant="caption" fontWeight={900} sx={{ color: COLOR_DARK }}>قالب</Typography>
              <ButtonGroup size="small">
                {COLUMN_MODES.map((m) => (
                  <Button
                    key={m.value}
                    variant={columnMode === m.value ? 'contained' : 'outlined'}
                    onClick={() => setColumnMode(m.value)}
                  >
                    {m.label}
                  </Button>
                ))}
              </ButtonGroup>

              <Divider orientation="vertical" flexItem />

              <TextField
                label="از کد" size="small" value={fromCode}
                onChange={(e) => setFromCode(e.target.value)} sx={{ width: 108 }}
              />
              <TextField
                label="تا کد" size="small" value={toCode}
                onChange={(e) => setToCode(e.target.value)} sx={{ width: 108 }}
              />
              <FormControlLabel
                control={<Checkbox size="small" checked={onlyWithActivity}
                  onChange={(e) => setOnlyWithActivity(e.target.checked)} />}
                label={<Typography variant="caption">فقط دارای گردش</Typography>}
              />

              <Button size="small" variant="outlined"
                onClick={() => { setFromCode(''); setToCode(''); setExpanded(false); setLevel(1); }}>
                بازنشانی
              </Button>

              <Box sx={{ flex: 1 }} />
              <Button size="small" startIcon={<PrintIcon />} onClick={() => window.print()}>چاپ</Button>
              <Button size="small" color="inherit" startIcon={<CloseIcon />}
                onClick={() => navigate('/accounting/reports')}>خروج</Button>
            </Paper>

            <Paper sx={{ ...glass, p: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                نمایش: <b>{expanded ? current.detail : current.title}</b>
                {' — '}سطرها: <b>{toPersianDigits(visibleRows.length)}</b>
                {' — '}سطر نخست «جمع کل» و سطر پایانی «جمع ستونی» است.
              </Typography>
            </Paper>

            {visibleRows.length === 0 ? (
              <EmptyState message="گردشی برای این سطح و بازهٔ کد وجود ندارد" />
            ) : (
              <div style={{ ...glass, padding: 12, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 620, overflowX: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {headCell('ردیف', { width: 56 })}
                        {headCell('کد حساب')}
                        {headCell('شرح حساب', { minWidth: 200 })}
                        {headCell('گردش بدهکار', { color: BLUE, bgcolor: 'rgba(37,99,235,0.08)' })}
                        {headCell('گردش بستانکار', { color: GREEN, bgcolor: 'rgba(5,150,105,0.08)' })}
                        {columnMode === '4'
                          ? headCell('مانده بدهکار', { color: BLUE, bgcolor: 'rgba(37,99,235,0.08)' })
                          : null}
                        {columnMode === '4'
                          ? headCell('مانده بستانکار', { color: GREEN, bgcolor: 'rgba(5,150,105,0.08)' })
                          : headCell('مانده', { bgcolor: 'rgba(139,92,246,0.08)' })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* سطر جمع کل (کل دفاتر) */}
                      <TableRow sx={{ bgcolor: 'rgba(250,204,21,0.24)' }}>
                        <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>—</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>—</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: COLOR_DARK }}>جمع کل</TableCell>
                        {renderAmountCells(total, true)}
                      </TableRow>

                      {visibleRows.map(renderRow)}

                      {/* سطر جمع ستونی (سطرهای نمایش‌داده‌شده) */}
                      <TableRow sx={{ bgcolor: 'rgba(139,92,246,0.14)' }}>
                        <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>—</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>—</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: COLOR_DARK }}>جمع ستونی</TableCell>
                        {renderAmountCells(columnTotals, true)}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </Box>
        </Box>
      )}
    </>
  );
};

export default MatrixReportPage;
