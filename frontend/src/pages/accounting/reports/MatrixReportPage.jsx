import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Grid, Box, Paper, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import {
  COLOR_DARK, BLUE, GREEN, CYAN,
  glass, ReportHeader, StatCard, Loading, EmptyState, StatGrid,
} from './reportHelpers';
import { formatPersianNumber } from '../../../core/utils/numberUtils';

// قالب‌های تراز: سه / چهار / شش ستونی
const COLUMN_MODES = [
  { value: '6', label: 'شش ستونی' },
  { value: '4', label: 'چهار ستونی' },
  { value: '3', label: 'سه ستونی' },
];

// رنگ بر اساس ماهیت: مانده بدهکار/بستانکار
const balanceColor = (net, nature) => {
  if (net === 0) return 'text.disabled';
  const positiveIsCredit = nature === 'credit';
  const isCredit = net >= 0 ? positiveIsCredit : !positiveIsCredit;
  return isCredit ? GREEN : BLUE;
};

const MatrixReportPage = () => {
  const [columnMode, setColumnMode] = useState('6');
  const [maxLevel, setMaxLevel] = useState(5);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-matrix'],
    queryFn: () => axiosInstance.get('/accounting/reports/matrix/').then((r) => r.data),
  });

  const levels = data?.levels || [];
  const total = data?.total || { debit: 0, credit: 0, balance_debit: 0, balance_credit: 0 };

  // پهن‌کردن درخت به سطرهای مسطح و فیلتر بر اساس سطح تفکیک انتخاب‌شده
  const rows = useMemo(() => {
    const tree = data?.tree || [];
    const flat = [];
    const walk = (nodes, depth) => {
      for (const n of nodes) {
        flat.push({ ...n, __depth: depth });
        if (n.children && n.children.length) walk(n.children, depth + 1);
      }
    };
    walk(tree, 0);
    return flat.filter((r) => (r.level ?? 0) <= maxLevel);
  }, [data, maxLevel]);

  if (isLoading) return <Loading />;

  const netTurnover = (n) => (n.debit || 0) + (n.credit || 0);
  const netBalance = (n) => (n.balance_debit || 0) - (n.balance_credit || 0);

  const renderCode = (n) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 130 }}>
      <Typography
        variant="body2"
        fontWeight={n.kind === 'group' ? 900 : n.kind === 'account' ? 700 : 500}
        sx={{ color: n.kind === 'group' ? CYAN : n.kind === 'account' ? COLOR_DARK : 'text.secondary' }}
      >
        {n.code}
      </Typography>
    </Box>
  );

  const renderName = (n) => (
    <Typography
      variant="body2"
      fontWeight={n.kind === 'group' ? 800 : 500}
      sx={{ color: n.kind === 'group' ? 'text.primary' : n.kind === 'account' ? 'text.primary' : 'text.secondary' }}
    >
      {n.name}
    </Typography>
  );

  const num = (v, color = 'text.primary', bold = false, sub = null) => (
    <Box>
      <Typography variant="body2" fontWeight={bold ? 800 : 500} sx={{ color, textAlign: 'left' }}>
        {formatPersianNumber(v)}
      </Typography>
      {sub && <Typography variant="caption" sx={{ color, textAlign: 'left', display: 'block' }}>{sub}</Typography>}
    </Box>
  );

  const indent = (n) => ({ paddingRight: `${(n.__depth || 0) * 18}px` });

  const renderRowCells = (n) => {
    if (columnMode === '6') {
      return (
        <>
          <TableCell sx={indent(n)}>{renderCode(n)}</TableCell>
          <TableCell>{renderName(n)}</TableCell>
          <TableCell>{num(n.debit, n.debit ? BLUE : 'text.disabled', false, 'بدهکار')}</TableCell>
          <TableCell>{num(n.credit, n.credit ? GREEN : 'text.disabled', false, 'بستانکار')}</TableCell>
          <TableCell>{num(n.balance_debit, n.balance_debit ? BLUE : 'text.disabled', false, 'بدهکار')}</TableCell>
          <TableCell>{num(n.balance_credit, n.balance_credit ? GREEN : 'text.disabled', false, 'بستانکار')}</TableCell>
        </>
      );
    }
    if (columnMode === '4') {
      return (
        <>
          <TableCell sx={indent(n)}>{renderCode(n)}</TableCell>
          <TableCell>{renderName(n)}</TableCell>
          <TableCell>{num(netTurnover(n), netTurnover(n) ? 'text.primary' : 'text.disabled', false, 'گردش')}</TableCell>
          <TableCell>
            {num(Math.abs(netBalance(n)), balanceColor(netBalance(n), n.nature), false,
              netBalance(n) >= 0 ? 'بدهکار' : 'بستانکار')}
          </TableCell>
        </>
      );
    }
    return (
      <>
        <TableCell sx={indent(n)}>
          {renderCode(n)}
          {renderName(n)}
        </TableCell>
        <TableCell>{num(netTurnover(n), netTurnover(n) ? 'text.primary' : 'text.disabled', false, 'گردش')}</TableCell>
        <TableCell>
          {num(Math.abs(netBalance(n)), balanceColor(netBalance(n), n.nature), false,
            netBalance(n) >= 0 ? 'بدهکار' : 'بستانکار')}
        </TableCell>
      </>
    );
  };

  const renderHeaderCells = () => {
    if (columnMode === '6') {
      return (
        <>
          <TableCell sx={{ minWidth: 130, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>کد حساب</TableCell>
          <TableCell sx={{ minWidth: 180, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>شرح حساب</TableCell>
          <TableCell sx={{ minWidth: 120, fontWeight: 800, color: BLUE, bgcolor: 'rgba(37,99,235,0.06)' }}>گردش بدهکار</TableCell>
          <TableCell sx={{ minWidth: 120, fontWeight: 800, color: GREEN, bgcolor: 'rgba(5,150,105,0.06)' }}>گردش بستانکار</TableCell>
          <TableCell sx={{ minWidth: 120, fontWeight: 800, color: BLUE, bgcolor: 'rgba(37,99,235,0.06)' }}>مانده بدهکار</TableCell>
          <TableCell sx={{ minWidth: 120, fontWeight: 800, color: GREEN, bgcolor: 'rgba(5,150,105,0.06)' }}>مانده بستانکار</TableCell>
        </>
      );
    }
    if (columnMode === '4') {
      return (
        <>
          <TableCell sx={{ minWidth: 130, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>کد حساب</TableCell>
          <TableCell sx={{ minWidth: 180, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>شرح حساب</TableCell>
          <TableCell sx={{ minWidth: 130, fontWeight: 800, bgcolor: 'rgba(6,182,212,0.06)' }}>گردش</TableCell>
          <TableCell sx={{ minWidth: 130, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.06)' }}>مانده</TableCell>
        </>
      );
    }
    return (
      <>
        <TableCell sx={{ minWidth: 260, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>کد و شرح حساب</TableCell>
        <TableCell sx={{ minWidth: 130, fontWeight: 800, bgcolor: 'rgba(6,182,212,0.06)' }}>گردش</TableCell>
        <TableCell sx={{ minWidth: 130, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.06)' }}>مانده</TableCell>
      </>
    );
  };

  const renderTotalRow = () => {
    if (columnMode === '6') {
      return (
        <>
          <TableCell colSpan={2} sx={{ fontWeight: 900, bgcolor: 'rgba(139,92,246,0.06)' }}>جمع کل</TableCell>
          <TableCell sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>{num(total.debit, BLUE, true)}</TableCell>
          <TableCell sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>{num(total.credit, GREEN, true)}</TableCell>
          <TableCell sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>{num(total.balance_debit, BLUE, true)}</TableCell>
          <TableCell sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>{num(total.balance_credit, GREEN, true)}</TableCell>
        </>
      );
    }
    if (columnMode === '4') {
      return (
        <>
          <TableCell colSpan={2} sx={{ fontWeight: 900, bgcolor: 'rgba(139,92,246,0.06)' }}>جمع کل</TableCell>
          <TableCell sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>{num(total.debit + total.credit, 'text.primary', true)}</TableCell>
          <TableCell sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>{num(Math.abs(total.balance_debit - total.balance_credit), COLOR_DARK, true)}</TableCell>
        </>
      );
    }
    return (
      <>
        <TableCell sx={{ fontWeight: 900, bgcolor: 'rgba(139,92,246,0.06)' }}>جمع کل</TableCell>
        <TableCell sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>{num(total.debit + total.credit, 'text.primary', true)}</TableCell>
        <TableCell sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>{num(Math.abs(total.balance_debit - total.balance_credit), COLOR_DARK, true)}</TableCell>
      </>
    );
  };
  return (
    <>
      <ReportHeader
        icon={<GridViewIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="مرور ترکیبی (ماتریس)"
        subtitle="سلسله‌مراتب حساب (گروه ← کل ← معین ← تفصیل) در ردیف، سطح تفکیک در ستون؛ تراز سه/چهار/شش ستونی"
        color={CYAN}
        dark="#0891b2"
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری ماتریس. دوباره تلاش کنید." />
      ) : (
        <>
          <StatGrid>
            <Grid item xs={6} sm={3}><StatCard label="گردش بدهکار" value={total.debit} color={BLUE} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="گردش بستانکار" value={total.credit} color={GREEN} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="مانده بدهکار" value={total.balance_debit} color={BLUE} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="مانده بستانکار" value={total.balance_credit} color={GREEN} /></Grid>
          </StatGrid>

          <Paper sx={{ ...glass, p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <InputLabel>سطح تفکیک (ستون افقی)</InputLabel>
              <Select value={maxLevel} label="سطح تفکیک (ستون افقی)" onChange={(e) => setMaxLevel(e.target.value)}>
                {levels.map((l) => (
                  <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>قالب تراز</InputLabel>
              <Select value={columnMode} label="قالب تراز" onChange={(e) => setColumnMode(e.target.value)}>
                {COLUMN_MODES.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="textSecondary">
              ستون عمودی: گروه ← کل ← معین ← تفصیل ۱ ← تفصیل ۲ ← تفصیل ۳
            </Typography>
          </Paper>

          {rows.length === 0 ? (
            <EmptyState message="گردش ثبت‌شده‌ای برای این سطح تفکیک وجود ندارد" />
          ) : (
            <div style={{ ...glass, padding: 16, overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 640, overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>{renderHeaderCells()}</TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((n, idx) => (
                      <TableRow key={idx} hover sx={{ bgcolor: n.kind === 'group' ? 'rgba(6,182,212,0.04)' : undefined }}>
                        {renderRowCells(n)}
                      </TableRow>
                    ))}
                    <TableRow>{renderTotalRow()}</TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default MatrixReportPage;