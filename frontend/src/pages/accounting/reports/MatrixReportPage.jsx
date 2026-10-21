import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Box, Button, Checkbox, Chip, FormControlLabel, InputAdornment, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import PrintIcon from '@mui/icons-material/Print';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { BLUE, COLOR_DARK, CYAN, GREEN, EmptyState, Loading, ReportHeader, glass } from './reportHelpers';
import JalaliDatePicker from '../../../core/components/ui/JalaliDatePicker';
import LedgerDrillDialog from './LedgerDrillDialog';
import { formatPersianNumber, toEnglishDigits, toPersianDigits } from '../../../core/utils/numberUtils';

/*
 * گزارش ماتریس تراز حساب‌ها — کارت‌های «سطح تراز»، «زیر سطح» (ریزِ سطوح پایین‌تر) و
 * «ستون‌ها» (سه/چهار/شش‌ستونی) + جستجوی همه‌چیز + کلیک برای انتخاب و دوبار کلیک برای ریز گردش.
 */
const FONT = 'Vazirmatn, IRANSans, sans-serif';

const LEVELS = [
  { value: 0, label: 'گروه' },
  { value: 1, label: 'کل' },
  { value: 2, label: 'معین' },
  { value: 3, label: 'تفصیلی ۴' },
  { value: 4, label: 'تفصیلی ۵' },
  { value: 5, label: 'تفصیلی ۶' },
];

const COLUMN_MODES = [
  { value: '3', label: 'سه ستونی' },
  { value: '4', label: 'چهار ستونی' },
  { value: '6', label: 'شش ستونی' },
];

const EMPTY_TOTAL = {
  debit: 0, credit: 0, balance_debit: 0, balance_credit: 0,
  opening_balance_debit: 0, opening_balance_credit: 0,
  closing_balance_debit: 0, closing_balance_credit: 0,
};

const norm = (v) => toEnglishDigits(String(v ?? '')).replace(/\s/g, '').toLowerCase();

/** مقایسهٔ کد حساب‌ها به‌صورت عددی (۱۰۰ < ۹۹ درست مقایسه شود) */
const byCode = (a, b) => String(a?.code ?? '').localeCompare(String(b?.code ?? ''), undefined, { numeric: true });

const HEAD_H = 46; // ارتفاع ثابت ردیف هدر (برای هدر چسبان)
const ROW_H = 36; // ارتفاع ثابت هر ردیف داده
const FOOTER_H = 42; // ارتفاع ردیف «جمع ستونی» (چسبان در پایین)
const BODY_ROWS = 13; // تعداد ردیف قابل‌نمایش پیش از اسکرول (تک‌صفحه‌ای)
const TABLE_MAX_H = HEAD_H + BODY_ROWS * ROW_H + FOOTER_H; // ۱۳ ردیف + هدر + سطر جمع

/** همهٔ زیرمجموعه‌های یک گره */
const descendantsOf = (node) => {
  const out = [];
  const walk = (n) => (n?.children || []).forEach((c) => { out.push(c); walk(c); });
  walk(node);
  return out;
};

/** فیلدهای مبلغی که هنگام تجمیع کدها جمع زده می‌شوند */
const AMOUNT_KEYS = [
  'debit', 'credit', 'balance_debit', 'balance_credit',
  'opening_balance_debit', 'opening_balance_credit',
  'closing_balance_debit', 'closing_balance_credit',
];

/** گره‌های هم‌کد یک سطح را در «یک ردیف» جمع می‌زند — هر کد فقط یک بار */
const rowsFromNodes = (nodes, lv) => {
  const bucket = new Map();
  (nodes || []).forEach((n) => {
    if ((n.level ?? -1) !== lv) return;
    const code = String(n.code ?? '');
    const prev = bucket.get(code);
    if (!prev) {
      const row = { code, name: n.name, level: lv, kind: n.kind, nodes: [n] };
      AMOUNT_KEYS.forEach((k) => { row[k] = n[k] || 0; });
      bucket.set(code, row);
    } else {
      prev.nodes.push(n);
      AMOUNT_KEYS.forEach((k) => { prev[k] += n[k] || 0; });
    }
  });
  return [...bucket.values()];
};

/** گره‌های سطح lv که به ردیف تجمیع‌شدهٔ انتخاب‌شده وصل‌اند (والد، خودِ کد، یا زیرمجموعه) */
const scopeNodes = (row, lv) => {
  const out = [];
  row.nodes.forEach((n) => {
    const nl = n.level ?? -1;
    if (lv > nl) {
      descendantsOf(n).forEach((d) => { if ((d.level ?? -1) === lv) out.push(d); });
    } else if (lv < nl) {
      (n.__parents || []).forEach((p) => { if ((p.level ?? -1) === lv) out.push(p); });
    } else {
      out.push(n);
    }
  });
  return out;
};

/**
 * ردیف‌های یک سطح (هر کد یک ردیف، ارقام شاخه‌ها جمع‌شده):
 *   بدون انتخاب کد → همهٔ کدهای آن سطح
 *   با انتخاب کد    → فقط کدهای همان «شاخه» (والدها / خود / زیرمجموعه‌ها)
 */
const levelRows = (allNodes, lv, row = null) => (
  row ? rowsFromNodes(scopeNodes(row, lv), lv) : rowsFromNodes(allNodes, lv)
);

/** هدف «ریز گردش» برای دابل‌کلیک: گرهٔ تک‌شاخه، یا گره بدون والد تا جمع همهٔ شاخه‌ها بیاید */
const drillNodeOf = (row) => {
  if (!row || !row.nodes || !row.nodes.length) return null;
  if (row.nodes.length === 1) return row.nodes[0];
  return { ...row.nodes[0], __parents: [], __agg: true };
};

const MatrixReportPage = () => {
  const [level, setLevel] = useState(1);
  const [subLevel, setSubLevel] = useState(null);
  const [selected, setSelected] = useState(null); // { level, code } — ردیف تجمیع‌شدهٔ انتخاب‌شده
  const [columnMode, setColumnMode] = useState('4');
  const [onlyWithActivity, setOnlyWithActivity] = useState(true);
  const [fromCode, setFromCode] = useState('');
  const [toCode, setToCode] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [ledgerNode, setLedgerNode] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-matrix', dateFrom, dateTo],
    queryFn: () => axiosInstance.get('/accounting/reports/matrix/', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined },
    }).then((r) => r.data),
  });
  // درخت تخت‌شده: کلید یکتا و فهرست والدها روی خود گره نوشته می‌شود
  // (تا زیرمجموعه‌ها هم هنگام فیلتر «زیر سطح» همان کلید و والدها را داشته باشند)
  const flat = useMemo(() => {
    const out = [];
    const walk = (nodes, ancestors, prefix) => {
      (nodes || []).forEach((n) => {
        const key = `${prefix}/${n.kind}-${n.id}`;
        n.__key = key;
        n.__parents = ancestors;
        out.push(n);
        walk(n.children, [...ancestors, n], key);
      });
    };
    walk(data?.tree || [], [], '');
    return out;
  }, [data]);

  const selectedRow = useMemo(() => {
    if (!selected) return null;
    return levelRows(flat, selected.level).find((r) => r.code === selected.code) || null;
  }, [flat, selected]);

  // ردیف‌های پایه: هر کد فقط یک ردیف (جمعِ شاخه‌ها) و ترتیب بر اساس کد
  const baseRows = useMemo(() => {
    const target = subLevel === null ? level : subLevel;
    const rows = levelRows(flat, target, subLevel === null ? null : selectedRow);
    return [...rows].sort(byCode);
  }, [flat, level, subLevel, selectedRow]);

  // نوار جستجو: کد و شرح خود ردیف + کد و شرح والدها + بازهٔ کد + فقط دارای گردش
  const visibleRows = useMemo(() => baseRows.filter((r) => {
    const code = norm(r.code);
    if (fromCode && code < norm(fromCode)) return false;
    if (toCode && code > norm(toCode)) return false;
    if (onlyWithActivity && !(r.debit || r.credit || r.opening_balance_debit || r.opening_balance_credit)) return false;
    const q = search.trim();
    if (q) {
      const parents = r.nodes.flatMap((n) => (n.__parents || []).flatMap((p) => [p.code, p.name]));
      const hay = [r.code, r.name, ...parents].join(' ');
      if (!hay.toLowerCase().includes(q.toLowerCase()) && !norm(hay).includes(norm(q))) return false;
    }
    return true;
  }), [baseRows, fromCode, toCode, onlyWithActivity, search]);

  const columnTotals = useMemo(() => visibleRows.reduce((t, r) => {
    t.debit += r.debit || 0;
    t.credit += r.credit || 0;
    t.balance_debit += r.balance_debit || 0;
    t.balance_credit += r.balance_credit || 0;
    t.opening_balance_debit += r.opening_balance_debit || 0;
    t.opening_balance_credit += r.opening_balance_credit || 0;
    t.closing_balance_debit += r.closing_balance_debit || 0;
    t.closing_balance_credit += r.closing_balance_credit || 0;
    return t;
  }, { ...EMPTY_TOTAL }), [visibleRows]);

  const subLevels = LEVELS; // ثابت — همهٔ سطوح (پایین و بالای سطح تراز) تا گزارش هر سطح گرفته شود
  const currentLevel = LEVELS.find((l) => l.value === level) || LEVELS[1];
  const currentSub = subLevels.find((l) => l.value === subLevel) || null;

  const resetAll = () => {
    setLevel(1); setSubLevel(null); setSelected(null); setColumnMode('4');
    setOnlyWithActivity(true); setFromCode(''); setToCode('');
    setDateFrom(''); setDateTo(''); setSearch('');
  };
  if (isLoading) return <Loading />;

  const isFlat = (v) => Math.abs(v || 0) < 0.005;
  // توجه: قاعدهٔ سراسری index.css (`[dir="rtl"] .MuiTableCell-root { text-align: right }`)
  // از کلاس sx قوی‌تر است، پس برای وسط‌چین‌کردن عناوین هدر از !important استفاده می‌کنیم.
  const headSx = {
    fontWeight: 800, whiteSpace: 'nowrap', bgcolor: '#f8fafc', fontSize: 12.5,
    textAlign: 'center !important',
  };

  const numCell = (value, color, bold, sub) => (
    <Box>
      <Typography variant="body2" fontWeight={bold ? 900 : 600}
        sx={{ color, direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT }}>
        {formatPersianNumber(value)}
      </Typography>
      {sub ? (
        <Typography variant="caption" sx={{ color, display: 'block', textAlign: 'right', fontFamily: FONT }}>{sub}</Typography>
      ) : null}
    </Box>
  );

  const money = (v, color, bold) => numCell(v || 0, isFlat(v) ? 'text.disabled' : color, bold);
  // سلول هدر مبلغ: خط بالایی = گروه (رنگی)، خط پایینی = ستون؛
  // در یک ردیف چسبان قرار می‌گیرد تا هنگام اسکرول «گردش دوره / مانده …» هم دیده شود.
  const moneyHead = (group, label, color, bg) => (
    <TableCell align="center" sx={{ ...headSx, bgcolor: bg, height: HEAD_H, borderBottom: `2px solid ${color}55` }}>
      <Typography variant="caption" display="block" sx={{ color, fontWeight: 800, lineHeight: 1.25, textAlign: 'center !important' }}>{group}</Typography>
      <Typography variant="caption" display="block" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.25, textAlign: 'center !important' }}>{label}</Typography>
    </TableCell>
  );

  // ستون‌های مبلغ بر اساس قالب انتخاب‌شده
  const renderAmountCells = (row, bold) => {
    if (columnMode === '6') {
      return (
        <>
          <TableCell>{money(row.opening_balance_debit, '#7c3aed', bold)}</TableCell>
          <TableCell>{money(row.opening_balance_credit, '#7c3aed', bold)}</TableCell>
          <TableCell>{money(row.debit, BLUE, bold)}</TableCell>
          <TableCell>{money(row.credit, GREEN, bold)}</TableCell>
          <TableCell>{money(row.closing_balance_debit, BLUE, bold)}</TableCell>
          <TableCell>{money(row.closing_balance_credit, GREEN, bold)}</TableCell>
        </>
      );
    }
    if (columnMode === '4') {
      return (
        <>
          <TableCell>{money(row.debit, BLUE, bold)}</TableCell>
          <TableCell>{money(row.credit, GREEN, bold)}</TableCell>
          <TableCell>{money(row.balance_debit, BLUE, bold)}</TableCell>
          <TableCell>{money(row.balance_credit, GREEN, bold)}</TableCell>
        </>
      );
    }
    const net = (row.balance_debit || 0) - (row.balance_credit || 0);
    const isCredit = net < 0;
    return (
      <>
        <TableCell>{money(row.debit, BLUE, bold)}</TableCell>
        <TableCell>{money(row.credit, GREEN, bold)}</TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={bold ? 900 : 600}
            sx={{ color: isFlat(net) ? 'text.disabled' : (isCredit ? GREEN : BLUE),
              direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT }}>
            {isFlat(net) ? '—' : (isCredit ? `(${formatPersianNumber(Math.abs(net))})` : formatPersianNumber(Math.abs(net)))}
          </Typography>
        </TableCell>
      </>
    );
  };

  const renderRow = (row, index) => {
    const isSelected = Boolean(selectedRow && selectedRow.code === row.code && selectedRow.level === row.level);
    const parents = (row.nodes[0] && row.nodes[0].__parents) || [];
    const merged = row.nodes.length > 1;
    const path = (!merged && parents.length > 1) ? parents.slice(-2).map((p) => p.name).join(' ‹ ') : '';
    return (
      <TableRow key={`${row.level}-${row.code}`} hover selected={isSelected}
        onClick={() => setSelected(isSelected ? null : { level: row.level, code: row.code })}
        onDoubleClick={() => setLedgerNode(drillNodeOf(row))}
        sx={{ cursor: 'pointer', height: ROW_H, bgcolor: isSelected ? 'rgba(6,182,212,0.14)' : undefined,
          boxShadow: isSelected ? `inset 3px 0 0 ${CYAN}` : undefined }}>
        <TableCell sx={{ width: 56, color: 'text.secondary' }}>{toPersianDigits(index + 1)}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Typography variant="body2" fontWeight={800} sx={{ color: COLOR_DARK, fontFamily: FONT }}>{toPersianDigits(row.code)}</Typography>
        </TableCell>
        <TableCell sx={{ maxWidth: 380, overflow: 'hidden' }}>
          <Typography variant="caption" fontWeight={700}
            sx={{ fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {row.name}
            {path ? <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400, fontSize: 12, ml: 1 }}>‹ {path}</Box> : null}
            {merged ? (
              <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400, fontSize: 12, ml: 1 }}>
                ({toPersianDigits(String(row.nodes.length))} شاخه)
              </Box>
            ) : null}
          </Typography>
        </TableCell>
        {renderAmountCells(row, true)}
      </TableRow>
    );
  };
  return (
    <>
      <ReportHeader
        icon={<GridViewIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="گزارش ماتریس تراز حساب‌ها"
        subtitle={`سطح: ${currentLevel.label}${currentSub ? ` · ریز: ${currentSub.label}` : ''} — برای انتخاب روی ردیف کلیک کنید و برای ریز گردش حساب دوبار کلیک کنید`}
        color={CYAN}
        dark="#0891b2"
        actions={(
          <>
            <Button size="small" variant="outlined" startIcon={<RestartAltIcon />} onClick={resetAll}
              sx={{ borderRadius: '12px', fontFamily: FONT }}>بازنشانی</Button>
            <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}
              sx={{ borderRadius: '12px', fontFamily: FONT, background: `linear-gradient(135deg,${CYAN},#0891b2)`,
                boxShadow: `0 8px 18px ${CYAN}44` }}>چاپ</Button>
          </>
        )}
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری تراز حساب‌ها. دوباره تلاش کنید." />
      ) : (
        <>
        {/* نوار جستجو و فیلترها — تمام عرض */}
        <Paper sx={{ ...glass, p: 1.25, mb: 1, '@media print': { display: 'none' } }}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField size="small" placeholder="جستجو در همه‌چیز: کد، شرح و والدها…" value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 260, flex: 1 }}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }} />
            <TextField size="small" label="از کد" value={fromCode} onChange={(e) => setFromCode(e.target.value)} sx={{ width: 108 }} />
            <TextField size="small" label="تا کد" value={toCode} onChange={(e) => setToCode(e.target.value)} sx={{ width: 108 }} />
            <JalaliDatePicker noHelper label="از تاریخ" value={dateFrom} onChange={setDateFrom} sx={{ width: 148 }} />
            <JalaliDatePicker noHelper label="تا تاریخ" value={dateTo} onChange={setDateTo} sx={{ width: 148 }} />
            <FormControlLabel control={<Checkbox size="small" checked={onlyWithActivity}
              onChange={(e) => setOnlyWithActivity(e.target.checked)} />}
              label={<Typography variant="caption" sx={{ fontFamily: FONT }}>فقط دارای گردش</Typography>} />
            <Tooltip title="پاک کردن جستجو و فیلترها">
              <Button size="small" variant="outlined" startIcon={<CloseIcon />}
                onClick={() => { setSearch(''); setFromCode(''); setToCode(''); setDateFrom(''); setDateTo(''); setOnlyWithActivity(true); }}
                sx={{ borderRadius: '12px', fontFamily: FONT }}>پاک کردن</Button>
            </Tooltip>
          </Stack>
        </Paper>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', '@media print': { display: 'block' } }}>
          {/* ستون کنار: سطح تراز / ستون‌ها */}
          <Stack spacing={1.5} sx={{ width: 216, flexShrink: 0, '@media print': { display: 'none' } }}>
            <Paper sx={{ ...glass, p: 1.25 }}>
              <Stack spacing={0.75}>
                {LEVELS.map((l) => {
                  const count = flat.filter((n) => (n.level ?? -1) === l.value).length;
                  const active = level === l.value;
                  return (
                    <Button key={l.value} fullWidth size="small" variant={active ? 'contained' : 'outlined'}
                      onClick={() => { setLevel(l.value); setSubLevel(null); setSelected(null); }}
                      sx={{ justifyContent: 'space-between', borderRadius: '12px', fontFamily: FONT, px: 1.25,
                        borderColor: active ? undefined : 'rgba(148,163,184,0.45)',
                        background: active ? `linear-gradient(135deg,${CYAN},#0891b2)` : 'rgba(255,255,255,0.55)',
                        color: active ? '#fff' : 'text.primary',
                        boxShadow: active ? `0 8px 18px ${CYAN}44` : 'none' }}>
                      <span>{l.label}</span>
                      <Chip size="small" label={toPersianDigits(String(count))}
                        sx={{ height: 18, fontSize: 12, fontFamily: FONT,
                          bgcolor: active ? 'rgba(255,255,255,0.28)' : 'rgba(148,163,184,0.18)',
                          color: active ? '#fff' : 'text.secondary' }} />
                    </Button>
                  );
                })}
              </Stack>
            </Paper>
            <Paper sx={{ ...glass, p: 1.25 }}>
              <Stack spacing={0.75}>
                {COLUMN_MODES.map((m) => {
                  const active = columnMode === m.value;
                  return (
                    <Button key={m.value} fullWidth size="small" variant={active ? 'contained' : 'outlined'}
                      onClick={() => setColumnMode(m.value)}
                      sx={{ justifyContent: 'flex-start', borderRadius: '12px', fontFamily: FONT, px: 1.25,
                        borderColor: active ? undefined : 'rgba(148,163,184,0.45)',
                        background: active ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.55)',
                        color: active ? '#fff' : 'text.primary',
                        boxShadow: active ? '0 8px 18px rgba(16,185,129,0.35)' : 'none' }}>
                      {m.label}
                    </Button>
                  );
                })}
              </Stack>
            </Paper>
          </Stack>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* ریز سطح — ثابت: همهٔ سطوح */}
            <Paper sx={{ ...glass, p: 1, mb: 1, '@media print': { display: 'none' } }}>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {subLevels.map((l) => {
                  const active = (subLevel === null ? level : subLevel) === l.value;
                  const count = levelRows(flat, l.value, selectedRow).length;
                  return (
                    <Button key={l.value} size="small" variant={active ? 'contained' : 'outlined'}
                      onClick={() => setSubLevel(active ? null : l.value)}
                      sx={{ borderRadius: '12px', fontFamily: FONT, px: 1.5, gap: 1, minWidth: 125,
                        borderColor: active ? undefined : 'rgba(148,163,184,0.45)',
                        background: active ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,0.6)',
                        color: active ? '#fff' : 'text.primary',
                        boxShadow: active ? '0 8px 18px rgba(245,158,11,0.35)' : 'none' }}>
                      <span>{`ریز ${l.label}`}</span>
                      <Chip size="small" label={toPersianDigits(String(count))}
                        sx={{ height: 18, fontSize: 12, fontFamily: FONT,
                          bgcolor: active ? 'rgba(255,255,255,0.28)' : 'rgba(148,163,184,0.18)',
                          color: active ? '#fff' : 'text.secondary' }} />
                    </Button>
                  );
                })}
              </Stack>
            </Paper>

            {visibleRows.length === 0 ? (
              <EmptyState message="گردشی برای این سطح و فیلترهای انتخابی وجود ندارد" />
            ) : (
              <div style={{ ...glass, padding: 8, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: TABLE_MAX_H, overflowX: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headSx, bgcolor: '#eef2ff', color: COLOR_DARK }}>ردیف</TableCell>
                        <TableCell sx={{ ...headSx, bgcolor: '#eef2ff', color: COLOR_DARK }}>کد حساب</TableCell>
                        <TableCell sx={{ ...headSx, bgcolor: '#eef2ff', color: COLOR_DARK }}>شرح حساب</TableCell>
                        {columnMode === '6' ? (
                          <>
                            {moneyHead('مانده ابتدای دوره', 'بدهکار', '#7c3aed', '#f3e8ff')}
                            {moneyHead('مانده ابتدای دوره', 'بستانکار', '#7c3aed', '#f3e8ff')}
                            {moneyHead('گردش دوره', 'بدهکار', BLUE, '#dbeafe')}
                            {moneyHead('گردش دوره', 'بستانکار', BLUE, '#dbeafe')}
                            {moneyHead('مانده پایان دوره', 'بدهکار', GREEN, '#d1fae5')}
                            {moneyHead('مانده پایان دوره', 'بستانکار', GREEN, '#d1fae5')}
                          </>
                        ) : columnMode === '4' ? (
                          <>
                            {moneyHead('گردش دوره', 'بدهکار', BLUE, '#dbeafe')}
                            {moneyHead('گردش دوره', 'بستانکار', BLUE, '#dbeafe')}
                            {moneyHead('مانده', 'بدهکار', '#7c3aed', '#ede9fe')}
                            {moneyHead('مانده', 'بستانکار', '#7c3aed', '#ede9fe')}
                          </>
                        ) : (
                          <>
                            {moneyHead('گردش دوره', 'بدهکار', BLUE, '#dbeafe')}
                            {moneyHead('گردش دوره', 'بستانکار', BLUE, '#dbeafe')}
                            <TableCell align="center" sx={{ ...headSx, bgcolor: '#ede9fe', height: HEAD_H, borderBottom: '2px solid #7c3aed55' }}>
                              <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 900, textAlign: 'center !important' }}>مانده</Typography>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleRows.map(renderRow)}
                      {/* سطر جمع ستونی — همیشه چسبان در پایینِ ناحیهٔ اسکرول */}
                      <TableRow sx={{
                        height: FOOTER_H,
                        '& .MuiTableCell-root': {
                          position: 'sticky', bottom: 0, zIndex: 3,
                          bgcolor: '#ede9fe', borderTop: '2px solid rgba(124,58,237,0.4)',
                        },
                      }}>
                        <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>—</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>—</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: COLOR_DARK, fontFamily: FONT }}>جمع ستونی</TableCell>
                        {renderAmountCells(columnTotals, true)}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            )}
          </Box>
        </Box>
        </>
      )}

      <LedgerDrillDialog node={ledgerNode} dateFrom={dateFrom} dateTo={dateTo}
        onClose={() => setLedgerNode(null)} />
    </>
  );
};

export default MatrixReportPage;
