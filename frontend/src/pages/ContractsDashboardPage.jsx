import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, ButtonBase, CircularProgress, Divider, Grid, IconButton, Paper, Skeleton,
  Stack, Tooltip, Typography, alpha,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CurrencyExchangeOutlinedIcon from '@mui/icons-material/CurrencyExchangeOutlined';
import {
  CartesianGrid, Legend, Line, LineChart, Tooltip as ReTooltip, XAxis, YAxis,
} from 'recharts';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import { INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import {
  formatPersianNumber, formatPersianPercent, normalizeCurrencyLabel, toPersianDigits,
} from '../core/utils/numberUtils';
import { getJalaliParts, toJalali } from '../core/utils/dateUtils';
import {
  CONTRACT_STATUS_COLORS as STATUS_COLORS,
  CONTRACT_STATUS_LABELS as STATUS_LABELS,
  CONTRACT_TYPE_LABELS as TYPE_LABELS,
} from '../core/theme/tokens';
import {
  ModulePager, ModuleTable, ModuleToolbar,
  useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';

const AMBER = '#b45309';
const BLUE = '#2563eb';
const GREEN = '#0f766e';
const RED = '#be123c';
const CYAN = '#0e7490';
const VIOLET = '#7c3aed';
const SLATE = '#475569';
const RIAL_BLUE = '#1d4ed8';
const FOREIGN_VIOLET = '#7c3aed';

const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const asArray = (value) => (Array.isArray(value) ? value : []);
const statusLabel = (status) => STATUS_LABELS[status] || status || '—';
const statusColor = (status) => STATUS_COLORS[status] || SLATE;
const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const money = (value, currency = 'ریال') => `${formatPersianNumber(Math.round(num(value)))} ${currency}`.trim();

const compactMoney = (value, currency = '') => {
  const amount = num(value);
  const label = Math.abs(amount) >= 1e9
    ? `${formatPersianNumber((amount / 1e9).toFixed(1))} میلیارد`
    : Math.abs(amount) >= 1e6
      ? `${formatPersianNumber((amount / 1e6).toFixed(1))} میلیون`
      : formatPersianNumber(amount);
  return `${label} ${currency}`.trim();
};

const effectiveEnd = (contract) => {
  const dated = asArray(contract?.addendums).filter((item) => item.new_end_date);
  const last = dated.length
    ? dated.reduce((latest, item) => (String(item.date || '') > String(latest.date || '') ? item : latest), dated[0])
    : null;
  return last?.new_end_date || contract?.effective_end_date || contract?.end_date || null;
};
const effectiveAmount = (contract) => num(contract?.effective_amount) || num(contract?.amount);
const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 86400000);
};
const daysText = (days) => {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `${toPersianDigits(Math.abs(days))} روز گذشته`;
  if (days === 0) return 'امروز';
  return `${toPersianDigits(days)} روز مانده`;
};
const daysColor = (days) => {
  if (days === null || days === undefined) return MUTED;
  if (days < 0) return RED;
  if (days <= 30) return '#ea580c';
  if (days <= 60) return AMBER;
  if (days <= 90) return '#a16207';
  return GREEN;
};

/* ---- تفکیک ارزی/ریالی: مبنای تشخیص همان منطق بک‌اند (exchange_rate > 1 و کد ارز غیر IRR) ---- */
const RIAL_CODES = ['IRR', 'IRT'];
const RIAL_NAMES = ['ریال', 'ریال ایران', 'تومان'];
const currencyGroupOf = (contract) => {
  const code = String(contract?.currency_code || '').toUpperCase();
  const name = normalizeCurrencyLabel(contract?.currency_name || contract?.currency_symbol || '');
  const rate = num(contract?.exchange_rate);
  if (RIAL_CODES.includes(code) || RIAL_NAMES.includes(name)) return 'rial';
  if (code || name) return 'foreign';
  return rate > 1 ? 'foreign' : 'rial';
};
const currencyLabelOf = (contract) => normalizeCurrencyLabel(
  contract?.currency_name || contract?.currency_symbol || 'ریال',
);
const rateOf = (contract) => {
  const rate = num(contract?.exchange_rate);
  return rate > 1 ? rate : 1;
};

/* ---------------------------------------------------------------- اجزای مشترک */
const chartGrid = { stroke: 'rgba(148,163,184,0.26)', strokeDasharray: '4 4', vertical: true };
const chartTick = { fill: '#475569', fontSize: 11, fontFamily: 'inherit' };
const chartTooltip = {
  contentStyle: {
    borderRadius: 10, border: '1px solid rgba(148,163,184,0.35)', direction: 'rtl',
    fontSize: 12, fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
  },
  itemStyle: { fontFamily: 'inherit', fontSize: 11 },
  cursor: { stroke: 'rgba(148,163,184,0.5)', strokeDasharray: '4 3' },
};
const yTick = ({ x, y, payload }) => (
  <text x={x} y={y} dx={-8} dy={4} textAnchor="end" direction="ltr" fill="#475569" fontSize={11} fontFamily="inherit">
    {toPersianDigits(formatPersianNumber(Math.round(num(payload?.value))).replace(/,/g, ''))}
  </text>
);

const Panel = ({ theme, title, hint, icon: Icon, color = AMBER, action, children, sx }) => (
  <Paper elevation={0} sx={{
    borderRadius: 'var(--hrms-table-radius, 16px)',
    border: '1px solid', borderColor: theme.cardBorderColor,
    bgcolor: 'background.paper', boxShadow: 'none', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', height: '100%', ...sx,
  }}>
    <Stack direction="row" alignItems="center" spacing={1} useFlexGap
      sx={{ px: `${theme.cardPadX}px`, py: 1.15, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
        bgcolor: alpha(color, 0.08), color, border: `1px solid ${alpha(color, 0.16)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 17 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK }}>{title}</Typography>
        {hint ? <Typography sx={{ fontSize: 10.5, color: MUTED }}>{hint}</Typography> : null}
      </Box>
      {action || null}
    </Stack>
    <Box sx={{ p: `${theme.cardPadX}px ${theme.cardPadX}px ${theme.cardPadY}px`, flex: 1, minHeight: 0 }}>
      {children}
    </Box>
  </Paper>
);

const MetricTile = ({ theme, icon: Icon, label, value, suffix, hint, color = AMBER, onClick }) => {
  const content = (
    <Paper elevation={0} sx={{
      p: 1.35, height: '100%', borderRadius: 'var(--hrms-table-radius, 16px)',
      border: '1px solid', borderColor: theme.cardBorderColor,
      bgcolor: 'background.paper', boxShadow: 'none',
      display: 'flex', flexDirection: 'column', gap: 0.6,
      transition: 'border-color .16s ease, box-shadow .16s ease',
      '&:hover': onClick ? { borderColor: alpha(color, 0.4), boxShadow: `0 8px 22px ${alpha(color, 0.07)}` } : undefined,
    }}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{
          width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
          bgcolor: alpha(color, 0.08), color, border: `1px solid ${alpha(color, 0.14)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 15 }} />
        </Box>
        <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>{label}</Typography>
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 18, fontWeight: 900, color: INK, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
          {value}
        </Typography>
        {suffix ? <Typography sx={{ fontSize: 10.5, color: MUTED, flexShrink: 0 }}>{suffix}</Typography> : null}
      </Box>
      {hint ? <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{hint}</Typography> : null}
    </Paper>
  );
  return onClick
    ? <ButtonBase onClick={onClick} sx={{ width: '100%', height: '100%', borderRadius: '16px', display: 'block', textAlign: 'inherit' }}>{content}</ButtonBase>
    : content;
};

const StatRow = ({ label, value, color = INK, strong = false }) => (
  <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ py: 0.32 }}>
    <Typography noWrap sx={{ fontSize: 11.5, color: MUTED }}>{label}</Typography>
    <Typography noWrap sx={{
      fontSize: strong ? 12 : 11.5, fontWeight: strong ? 900 : 700, color,
      fontFamily: 'var(--hrms-table-number-font, inherit)',
    }}>{value}</Typography>
  </Stack>
);

const TrendChart = ({ data, series, height = 240, yWidth = 62, tooltipFormatter }) => {
  const hostRef = React.useRef(null);
  const [width, setWidth] = useState(760);
  React.useLayoutEffect(() => {
    const measure = () => {
      const node = hostRef.current;
      if (!node) return;
      const next = Math.round(node.getBoundingClientRect().width);
      if (next > 0) setWidth((previous) => (previous === next ? previous : next));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (
    <Box ref={hostRef} sx={{ width: '100%', height, direction: 'ltr' }}>
      <LineChart width={width} height={height} data={data} margin={{ top: 12, right: 14, left: 4, bottom: 4 }}>
        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="label" reversed tick={chartTick} tickMargin={8}
          axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
        <YAxis orientation="left" width={yWidth} tick={yTick}
          axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
        <ReTooltip {...chartTooltip} formatter={tooltipFormatter} />
        <Legend align="right" iconType="circle" iconSize={8}
          wrapperStyle={{ fontSize: 11, fontFamily: 'inherit', direction: 'rtl', paddingTop: 4 }} />
        {series.map((item) => (
          <Line key={item.key} type="monotone" dataKey={item.key} name={item.name}
            stroke={item.color} strokeWidth={2.4} dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
            strokeDasharray={item.dashed ? '5 3' : undefined} />
        ))}
      </LineChart>
    </Box>
  );
};

const EmptyNote = ({ icon: Icon = InsightsOutlinedIcon, text }) => (
  <Box sx={{ py: 4, textAlign: 'center' }}>
    <Icon sx={{ fontSize: 30, color: '#cbd5e1', mb: 0.75 }} />
    <Typography sx={{ fontSize: 11.5, color: MUTED }}>{text}</Typography>
  </Box>
);


/* ====================================================================== صفحه */
const ContractsDashboardPage = () => {
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('amount');

  const contractsQuery = useQuery({
    queryKey: ['external-contracts'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((response) => response.data),
    staleTime: 60 * 1000,
  });
  const statsQuery = useQuery({
    queryKey: ['external-contracts-stats'],
    queryFn: () => axiosInstance.get('/external-contracts/stats/').then((response) => response.data),
    staleTime: 60 * 1000,
  });

  const raw = contractsQuery.data;
  const items = useMemo(() => (Array.isArray(raw) ? raw : raw?.results || []), [raw]);
  const stats = statsQuery.data || {};
  const isLoading = contractsQuery.isLoading || statsQuery.isLoading;
  const refreshing = contractsQuery.isFetching || statsQuery.isFetching;
  const hasError = contractsQuery.isError || statsQuery.isError;

  const data = useMemo(() => {
    const statusCounts = Object.keys(stats.status_counts || {}).length
      ? stats.status_counts
      : items.reduce((acc, contract) => {
        const key = contract.status || 'draft';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    const withMetrics = items.map((contract) => {
      const end = effectiveEnd(contract);
      const days = daysUntil(end);
      const group = currencyGroupOf(contract);
      const amount = effectiveAmount(contract);
      const rate = rateOf(contract);
      const invoices = asArray(contract.invoices);
      const payments = asArray(contract.payments);
      return {
        contract,
        end,
        days,
        group,
        amount,
        rate,
        currency: currencyLabelOf(contract),
        rialAmount: amount * rate,
        invoiced: invoices.reduce((sum, invoice) => sum + num(invoice.total ?? invoice.amount), 0),
        paid: payments.reduce((sum, payment) => sum + num(payment.amount), 0),
        overdue: invoices.filter((invoice) => !invoice.is_paid && invoice.due_date && num(daysUntil(invoice.due_date)) < 0).length,
        guarantees: asArray(contract.guarantees).filter((guarantee) => !guarantee.is_released),
      };
    });

    const groupOf = (rows) => ({
      count: rows.length,
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
      rialAmount: rows.reduce((sum, row) => sum + row.rialAmount, 0),
      active: rows.filter((row) => row.contract.status === 'active').length,
      activeAmount: rows.filter((row) => row.contract.status === 'active').reduce((sum, row) => sum + row.amount, 0),
      average: rows.length ? rows.reduce((sum, row) => sum + row.amount, 0) / rows.length : 0,
      expiring: rows.filter((row) => row.days !== null && row.days >= 0 && row.days <= 60).length,
      invoiced: rows.reduce((sum, row) => sum + row.invoiced, 0),
      paid: rows.reduce((sum, row) => sum + row.paid, 0),
      overdue: rows.reduce((sum, row) => sum + row.overdue, 0),
      guarantees: rows.reduce(
        (sum, row) => sum + row.guarantees.reduce((value, guarantee) => value + num(guarantee.amount), 0), 0,
      ),
      guaranteeCount: rows.reduce((sum, row) => sum + row.guarantees.length, 0),
    });

    const rialRows = withMetrics.filter((row) => row.group === 'rial');
    const foreignRows = withMetrics.filter((row) => row.group === 'foreign');
    const rialGroup = groupOf(rialRows);
    const foreignGroup = groupOf(foreignRows);


    const currencyMap = foreignRows.reduce((acc, row) => {
      const key = row.currency;
      if (!acc[key]) acc[key] = { currency: key, count: 0, amount: 0, rialAmount: 0 };
      acc[key].count += 1;
      acc[key].amount += row.amount;
      acc[key].rialAmount += row.rialAmount;
      return acc;
    }, {});

    const today = new Date();
    const monthly = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const jalali = getJalaliParts(monthDate.toISOString().slice(0, 10));
      const sameMonth = withMetrics.filter((row) => String(row.contract.start_date || '').slice(0, 7) === key);
      const rialMonth = sameMonth.filter((row) => row.group === 'rial');
      const foreignMonth = sameMonth.filter((row) => row.group === 'foreign');
      monthly.push({
        label: jalali ? JALALI_MONTHS[jalali[1] - 1] : key,
        rial: rialMonth.length,
        foreign: foreignMonth.length,
        rialAmount: rialMonth.reduce((sum, row) => sum + row.amount, 0),
        foreignRialAmount: foreignMonth.reduce((sum, row) => sum + row.rialAmount, 0),
      });
    }

    const parties = Object.values(items.reduce((acc, contract) => {
      const name = contract.party_name || 'بدون طرف قرارداد';
      if (!acc[name]) acc[name] = { name, count: 0, amount: 0, rialCount: 0, foreignCount: 0 };
      acc[name].count += 1;
      acc[name].amount += effectiveAmount(contract);
      if (currencyGroupOf(contract) === 'foreign') acc[name].foreignCount += 1;
      else acc[name].rialCount += 1;
      return acc;
    }, {})).sort((a, b) => b.amount - a.amount);

    const types = Object.entries(items.reduce((acc, contract) => {
      const key = contract.contract_type_master_name || TYPE_LABELS[contract.contract_type] || 'سایر';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

    const projects = Object.entries(items.reduce((acc, contract) => {
      const key = contract.project_title || contract.project_name || 'بدون پروژه';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

    const expiring = withMetrics
      .filter((row) => row.days !== null && row.days <= 60)
      .sort((a, b) => a.days - b.days);

    const totalInvoiced = withMetrics.reduce((sum, row) => sum + row.invoiced, 0);
    const totalPaid = withMetrics.reduce((sum, row) => sum + row.paid, 0);
    const totalGuarantees = withMetrics.reduce(
      (sum, row) => sum + row.guarantees.reduce((value, guarantee) => value + num(guarantee.amount), 0), 0,
    );

    return {
      total: num(stats.total) || items.length,
      statusCounts,
      rialRows,
      foreignRows,
      rialGroup,
      foreignGroup,
      byCurrency: Object.values(currencyMap).sort((a, b) => b.rialAmount - a.rialAmount),
      monthly,
      parties,
      types,
      projects,
      expiring,
      totals: {
        invoiced: totalInvoiced,
        paid: totalPaid,
        outstanding: Math.max(0, totalInvoiced - totalPaid),
        collectionRate: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
        guarantees: totalGuarantees,
        guaranteeCount: withMetrics.reduce((sum, row) => sum + row.guarantees.length, 0),
        overdue: withMetrics.reduce((sum, row) => sum + row.overdue, 0),
        portfolioRial: rialGroup.amount + foreignGroup.rialAmount,
        rialEquivalent: foreignGroup.rialAmount,
        addendums: items.reduce((sum, contract) => sum + asArray(contract.addendums).length, 0),
        documents: items.reduce((sum, contract) => sum + asArray(contract.documents).length, 0),
      },
    };
  }, [items, stats]);


  /* ---- جست‌وجو و مرتب‌سازی مشترک دو جدول ریالی/ارزی ---- */
  const matched = (row) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const contract = row.contract;
    return [contract.number, contract.subject, contract.party_name, row.currency]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  };
  const sorter = (a, b) => {
    if (sortBy === 'days') return (a.days ?? 99999) - (b.days ?? 99999);
    if (sortBy === 'number') return String(a.contract.number || '').localeCompare(String(b.contract.number || ''), 'fa');
    if (sortBy === 'rial') return b.rialAmount - a.rialAmount;
    return b.amount - a.amount;
  };
  const rialList = useMemo(() => data.rialRows.filter(matched).sort(sorter), [data.rialRows, search, sortBy]);
  const foreignList = useMemo(() => data.foreignRows.filter(matched).sort(sorter), [data.foreignRows, search, sortBy]);

  const rialPageSize = moduleTheme.tableTheme.rowsPerPage;
  const rialState = useModuleTableState(rialList.length, rialPageSize, [search, sortBy, rialPageSize]);
  const foreignState = useModuleTableState(foreignList.length, rialPageSize, [search, sortBy, rialPageSize]);
  const rialPaged = useMemo(
    () => rialList.slice(rialState.page * rialPageSize, (rialState.page + 1) * rialPageSize),
    [rialList, rialState.page, rialPageSize],
  );
  const foreignPaged = useMemo(
    () => foreignList.slice(foreignState.page * rialPageSize, (foreignState.page + 1) * rialPageSize),
    [foreignList, foreignState.page, rialPageSize],
  );
  const rialHeight = useRowHeight(moduleTheme.tableTheme, rialPaged.length);
  const foreignHeight = useRowHeight(moduleTheme.tableTheme, foreignPaged.length);
  const expiringHeight = useRowHeight(moduleTheme.tableTheme, Math.min(data.expiring.length, 8));

  const counters = data.statusCounts;
  const shareOf = (value, total) => (total > 0 ? (value / total) * 100 : 0);
  const partyMax = Math.max(...data.parties.map((party) => party.amount), 1);

  const openContract = (row) => navigate(`/external-contracts/${row.contract.id}`);

  const refreshAll = () => {
    contractsQuery.refetch();
    statsQuery.refetch();
  };

  const exportCsv = () => {
    const rows = [
      ['شاخص', 'مقدار'],
      ['کل قراردادها', data.total],
      ['قراردادهای ریالی', data.rialGroup.count],
      ['قراردادهای ارزی', data.foreignGroup.count],
      ['ارزش ریالی پرتفوی', data.rialGroup.amount],
      ['معادل ریالی قراردادهای ارزی', data.totals.rialEquivalent],
      ['صورت‌وضعیت / فاکتور', data.totals.invoiced],
      ['پرداخت‌شده', data.totals.paid],
      ['مانده تسویه', data.totals.outstanding],
      ['تضامین فعال', data.totals.guarantees],
      [],
      ['گروه ارزی', 'شماره', 'موضوع', 'طرف قرارداد', 'ارز', 'مبلغ مؤثر', 'نرخ ارز', 'معادل ریالی', 'وضعیت', 'پایان مؤثر'],
      ...[...data.rialRows, ...data.foreignRows].map((row) => [
        row.group === 'rial' ? 'ریالی' : 'ارزی',
        row.contract.number || '', row.contract.subject || '', row.contract.party_name || '',
        row.currency, row.amount, row.rate, row.rialAmount,
        statusLabel(row.contract.status), row.end || '',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contracts-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  if (isLoading) {
    return (
      <Box>
        <PageHeader icon={<HandshakeOutlinedIcon />} title="داشبورد قراردادها"
          subtitle="پرتفوی قراردادها به تفکیک ارز، روند انعقاد و سلامت مالی پرونده‌ها" />
        <Box sx={{
          display: 'grid', gap: 1.25, mb: 1.5,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
        }}>
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} variant="rounded" height={96} sx={{ borderRadius: '16px' }} />
          ))}
        </Box>
        <Grid container spacing={1.5}>
          <Grid item xs={12} lg={7}><Skeleton variant="rounded" height={292} sx={{ borderRadius: '16px' }} /></Grid>
          <Grid item xs={12} lg={5}><Skeleton variant="rounded" height={292} sx={{ borderRadius: '16px' }} /></Grid>
        </Grid>
      </Box>
    );
  }


  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<HandshakeOutlinedIcon />}
        title="داشبورد قراردادها"
        subtitle="پرتفوی قراردادها به تفکیک ارز و ریال، روند انعقاد و سلامت مالی پرونده‌ها"
        badge={(
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>
            {`${formatPersianNumber(data.rialGroup.count)} ریالی · ${formatPersianNumber(data.foreignGroup.count)} ارزی`}
          </Typography>
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" onClick={refreshAll} disabled={refreshing} sx={{ minWidth: 40, px: 1 }}>
                  {refreshing ? <CircularProgress size={16} /> : <RefreshOutlinedIcon fontSize="small" />}
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={exportCsv}>خروجی</Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/contracts/new')}
              sx={{ bgcolor: AMBER, '&:hover': { bgcolor: '#92400e' } }}>
              قرارداد جدید
            </Button>
          </>
        )}
      />

      {hasError ? (
        <Alert severity="warning" sx={{ mb: 1.25, borderRadius: '12px', fontSize: 12 }}
          action={<Button size="small" onClick={refreshAll}>تلاش دوباره</Button>}>
          بخشی از داده‌های قراردادها دریافت نشد؛ سایر بخش‌ها قابل استفاده هستند.
        </Alert>
      ) : null}

      {/* ---- نوار شاخص‌ها ---- */}
      <Box sx={{
        display: 'grid', gap: 1.25, mb: 1.5,
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
      }}>
        <MetricTile theme={moduleTheme} icon={HandshakeOutlinedIcon} label="کل قراردادها"
          value={formatPersianNumber(data.total)} suffix="قرارداد"
          hint={`${formatPersianNumber(data.totals.addendums)} الحاقیه ثبت‌شده`} color={AMBER}
          onClick={() => navigate('/external-contracts')} />
        <MetricTile theme={moduleTheme} icon={PlayCircleOutlineIcon} label="در حال اجرا"
          value={formatPersianNumber(num(counters.active))} suffix="قرارداد"
          hint={`${formatPersianNumber(data.rialGroup.active)} ریالی · ${formatPersianNumber(data.foreignGroup.active)} ارزی`}
          color={GREEN} />
        <MetricTile theme={moduleTheme} icon={AccountBalanceWalletOutlinedIcon} label="ارزش پرتفوی ریالی"
          value={compactMoney(data.rialGroup.amount)} suffix="ریال"
          hint={`میانگین ${compactMoney(data.rialGroup.average)} ریال`} color={RIAL_BLUE} />
        <MetricTile theme={moduleTheme} icon={CurrencyExchangeOutlinedIcon} label="معادل ریالی قراردادهای ارزی"
          value={compactMoney(data.totals.rialEquivalent)} suffix="ریال"
          hint={`${formatPersianNumber(data.byCurrency.length)} ارز فعال`} color={FOREIGN_VIOLET} />
        <MetricTile theme={moduleTheme} icon={WarningAmberOutlinedIcon} label="رو به انقضا"
          value={formatPersianNumber(data.rialGroup.expiring + data.foreignGroup.expiring)} suffix="مورد"
          hint="در بازهٔ ۶۰ روز آینده" color={RED} onClick={() => navigate('/contracts-expiring')} />
      </Box>


      {/* ---- تفکیک ارزی / ریالی + روند انعقاد ---- */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} lg={5}>
          <Panel theme={moduleTheme} icon={CurrencyExchangeOutlinedIcon} color={FOREIGN_VIOLET}
            title="تفکیک قراردادها بر اساس ارز" hint="پایهٔ محاسبات: کد ارز و نرخ تبدیل ثبت‌شده">
            <Grid container spacing={1.25}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 1.15, borderRadius: '12px', border: '1px solid', borderColor: alpha(RIAL_BLUE, 0.22), bgcolor: alpha(RIAL_BLUE, 0.035) }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: RIAL_BLUE, mb: 0.5 }}>قراردادهای ریالی</Typography>
                  <StatRow label="تعداد" value={`${formatPersianNumber(data.rialGroup.count)} قرارداد`} strong />
                  <StatRow label="ارزش کل" value={money(data.rialGroup.amount)} color={RIAL_BLUE} strong />
                  <StatRow label="میانگین هر قرارداد" value={money(data.rialGroup.average)} />
                  <StatRow label="در حال اجرا" value={`${formatPersianNumber(data.rialGroup.active)} قرارداد`} />
                  <StatRow label="سهم از پرتفوی" value={formatPersianPercent(shareOf(data.rialGroup.amount, data.totals.portfolioRial))} />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 1.15, borderRadius: '12px', border: '1px solid', borderColor: alpha(FOREIGN_VIOLET, 0.22), bgcolor: alpha(FOREIGN_VIOLET, 0.035) }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: FOREIGN_VIOLET, mb: 0.5 }}>قراردادهای ارزی</Typography>
                  <StatRow label="تعداد" value={`${formatPersianNumber(data.foreignGroup.count)} قرارداد`} strong />
                  <StatRow label="معادل ریالی" value={money(data.totals.rialEquivalent)} color={FOREIGN_VIOLET} strong />
                  <StatRow label="میانگین (معادل ریالی)"
                    value={money(data.foreignGroup.count ? data.totals.rialEquivalent / data.foreignGroup.count : 0)} />
                  <StatRow label="در حال اجرا" value={`${formatPersianNumber(data.foreignGroup.active)} قرارداد`} />
                  <StatRow label="سهم از پرتفوی" value={formatPersianPercent(shareOf(data.totals.rialEquivalent, data.totals.portfolioRial))} />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 0.25 }} />
                {data.byCurrency.length ? (
                  <Box sx={{ mt: 0.75 }}>
                    {data.byCurrency.map((row) => (
                      <StatRow key={row.currency} label={`${row.currency} · ${formatPersianNumber(row.count)} قرارداد`}
                        value={`${compactMoney(row.amount, row.currency)} (≈ ${compactMoney(row.rialAmount)} ریال)`} />
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{ mt: 0.5, fontSize: 11, color: MUTED }}>قرارداد ارزی ثبت نشده است.</Typography>
                )}
              </Grid>
            </Grid>
          </Panel>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Panel theme={moduleTheme} icon={TrendingUpOutlinedIcon} color={BLUE}
            title="روند ماهانه انعقاد قراردادها" hint="شش ماه اخیر — تفکیک ریالی و ارزی">
            {data.monthly.some((row) => row.rial || row.foreign) ? (
              <TrendChart
                data={data.monthly}
                height={246}
                series={[
                  { key: 'rial', name: 'ریالی', color: RIAL_BLUE },
                  { key: 'foreign', name: 'ارزی', color: FOREIGN_VIOLET },
                ]}
                tooltipFormatter={(value, name) => [`${formatPersianNumber(value)} قرارداد`, name]}
              />
            ) : <EmptyNote text="در شش ماه اخیر قراردادی منعقد نشده است." />}
          </Panel>
        </Grid>
      </Grid>


      {/* ---- نمودار ارزش + سلامت مالی ---- */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} lg={7}>
          <Panel theme={moduleTheme} icon={InsightsOutlinedIcon} color={BLUE}
            title="روند ارزش قراردادهای منعقدشده" hint="مبلغ مؤثر در هر ماه">
            {data.monthly.some((row) => row.rialAmount || row.foreignRialAmount) ? (
              <TrendChart
                data={data.monthly}
                height={232}
                yWidth={78}
                series={[
                  { key: 'rialAmount', name: 'مبلغ ریالی', color: RIAL_BLUE },
                  { key: 'foreignRialAmount', name: 'معادل ریالی ارزی', color: FOREIGN_VIOLET, dashed: true },
                ]}
                tooltipFormatter={(value, name) => [money(value), name]}
              />
            ) : <EmptyNote text="داده‌ای برای روند مبالغ موجود نیست." />}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Panel theme={moduleTheme} icon={ReceiptLongOutlinedIcon} color={CYAN}
            title="سلامت مالی پرونده‌ها" hint="جمع صورت‌وضعیت، فاکتور و پرداخت">
            <StatRow label="صورت‌وضعیت و فاکتورها" value={money(data.totals.invoiced)} strong />
            <StatRow label="پرداخت‌شده" value={money(data.totals.paid)} color={GREEN} />
            <StatRow label="مانده تسویه" value={money(data.totals.outstanding)}
              color={data.totals.outstanding ? AMBER : GREEN} strong />
            <StatRow label="نرخ وصول" value={formatPersianPercent(data.totals.collectionRate)} color={GREEN} />
            <Divider sx={{ my: 0.5 }} />
            <StatRow label="تضامین فعال"
              value={`${money(data.totals.guarantees)} · ${formatPersianNumber(data.totals.guaranteeCount)} فقره`} color={VIOLET} />
            <StatRow label="فاکتورهای معوق"
              value={`${formatPersianNumber(data.totals.overdue)} فقره`} color={data.totals.overdue ? RED : GREEN} />
            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" onClick={() => navigate('/contract-invoices')}>فاکتورها</Button>
              <Button size="small" variant="outlined" onClick={() => navigate('/contracts-guarantees')}>تضامین</Button>
            </Stack>
          </Panel>
        </Grid>
      </Grid>

      {/* ---- نوار جست‌وجو و مرتب‌سازی جداول ارزی/ریالی ---- */}
      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جستجو در شماره، موضوع، طرف قرارداد یا ارز…"
        sort={sortBy}
        sortOptions={[
          { value: 'amount', label: 'بیشترین مبلغ' },
          { value: 'rial', label: 'بیشترین معادل ریالی' },
          { value: 'days', label: 'نزدیک‌ترین پایان' },
          { value: 'number', label: 'شماره قرارداد' },
        ]}
        onSort={setSortBy}
        onReset={() => { setSearch(''); setSortBy('amount'); }}
      />


      {/* ---- جدول قراردادهای ریالی ---- */}
      <Box sx={{ mb: 1.5 }}>
        <Panel theme={moduleTheme} icon={HandshakeOutlinedIcon} color={RIAL_BLUE}
          title="قراردادهای ریالی" hint={`${formatPersianNumber(rialList.length)} قرارداد · ارزش ${money(data.rialGroup.amount)}`}>
          <Box sx={{ mt: -0.5 }}>
            <ModuleTable
              tableTheme={moduleTheme.tableTheme}
              ariaLabel="فهرست قراردادهای ریالی داشبورد"
              containerRef={rialHeight.ref}
              tableHeight={rialHeight.tableHeight}
              rowHeight={rialHeight.rowHeight}
              dimmed={refreshing}
              rows={rialPaged}
              rowKey={(row) => row.contract.id}
              onRowClick={openContract}
              emptyText="قرارداد ریالی با این مشخصات پیدا نشد."
              columns={[
                {
                  key: 'row',
                  label: 'ردیف',
                  width: '5%',
                  align: 'center',
                  render: (_row, index) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                      {toPersianDigits(rialState.page * rialPageSize + index + 1)}
                    </Typography>
                  ),
                },
                {
                  key: 'number',
                  label: 'شماره',
                  width: '10%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {toPersianDigits(row.contract.number || row.contract.id)}
                    </Typography>
                  ),
                },
                {
                  key: 'subject',
                  label: 'موضوع قرارداد',
                  width: '25%',
                  render: (row) => (
                    <Typography noWrap title={row.contract.subject} sx={{ fontSize: 12, fontWeight: 800 }}>
                      {row.contract.subject || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'party',
                  label: 'طرف قرارداد',
                  width: '15%',
                  render: (row) => (
                    <Typography noWrap title={row.contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                      {row.contract.party_name || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'status',
                  label: 'وضعیت',
                  width: '9%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: statusColor(row.contract.status) }}>
                      {statusLabel(row.contract.status)}
                    </Typography>
                  ),
                },
                {
                  key: 'amount',
                  label: 'مبلغ مؤثر',
                  width: '13%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: RIAL_BLUE, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {formatPersianNumber(Math.round(row.amount))}
                    </Typography>
                  ),
                },
                {
                  key: 'end',
                  label: 'پایان مؤثر',
                  width: '10%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {dateLabel(row.end)}
                    </Typography>
                  ),
                },
                {
                  key: 'days',
                  label: 'روز مانده',
                  width: '10%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: daysColor(row.days) }}>
                      {daysText(row.days)}
                    </Typography>
                  ),
                },
                {
                  key: 'actions',
                  label: 'عملیات',
                  width: '5%',
                  align: 'center',
                  render: (row) => (
                    <Tooltip title="پرونده قرارداد">
                      <IconButton size="small" aria-label="پرونده قرارداد"
                        onClick={(event) => { event.stopPropagation(); openContract(row); }}>
                        <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  ),
                },
              ]}
            />
            <ModulePager
              tableTheme={moduleTheme.tableTheme}
              page={rialState.page}
              onPage={rialState.setPage}
              totalPages={rialState.totalPages}
              pageNumbers={rialState.pageNumbers}
              total={rialList.length}
              pageSize={rialPageSize}
              unit="قرارداد ریالی"
            />
            <Divider sx={{ my: 0.75 }} />
            <Stack direction="row" spacing={2.5} useFlexGap flexWrap="wrap" sx={{ pt: 0.25 }}>
              {[
                ['جمع مبلغ مؤثر', money(data.rialGroup.amount), RIAL_BLUE],
                ['فاکتور', money(data.rialGroup.invoiced), INK],
                ['پرداخت', money(data.rialGroup.paid), GREEN],
                ['مانده', money(Math.max(0, data.rialGroup.invoiced - data.rialGroup.paid)), AMBER],
              ].map(([label, value, color]) => (
                <Box key={label}>
                  <Typography sx={{ fontSize: 10.5, color: MUTED }}>{label}</Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 900, color, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Panel>
      </Box>


      {/* ---- جدول قراردادهای ارزی ---- */}
      <Box sx={{ mb: 1.5 }}>
        <Panel theme={moduleTheme} icon={CurrencyExchangeOutlinedIcon} color={FOREIGN_VIOLET}
          title="قراردادهای ارزی" hint={`${formatPersianNumber(foreignList.length)} قرارداد · معادل ${money(data.totals.rialEquivalent)}`}>
          <Box sx={{ mt: -0.5 }}>
            <ModuleTable
              tableTheme={moduleTheme.tableTheme}
              ariaLabel="فهرست قراردادهای ارزی داشبورد"
              containerRef={foreignHeight.ref}
              tableHeight={foreignHeight.tableHeight}
              rowHeight={foreignHeight.rowHeight}
              dimmed={refreshing}
              rows={foreignPaged}
              rowKey={(row) => row.contract.id}
              onRowClick={openContract}
              emptyText="قرارداد ارزی با این مشخصات پیدا نشد."
              columns={[
                {
                  key: 'row',
                  label: 'ردیف',
                  width: '4%',
                  align: 'center',
                  render: (_row, index) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                      {toPersianDigits(foreignState.page * rialPageSize + index + 1)}
                    </Typography>
                  ),
                },
                {
                  key: 'number',
                  label: 'شماره',
                  width: '8%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {toPersianDigits(row.contract.number || row.contract.id)}
                    </Typography>
                  ),
                },
                {
                  key: 'subject',
                  label: 'موضوع قرارداد',
                  width: '18%',
                  render: (row) => (
                    <Typography noWrap title={row.contract.subject} sx={{ fontSize: 12, fontWeight: 800 }}>
                      {row.contract.subject || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'party',
                  label: 'طرف قرارداد',
                  width: '13%',
                  render: (row) => (
                    <Typography noWrap title={row.contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                      {row.contract.party_name || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'currency',
                  label: 'ارز',
                  width: '7%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: FOREIGN_VIOLET }}>
                      {row.currency}
                    </Typography>
                  ),
                },
                {
                  key: 'amount',
                  label: 'مبلغ ارزی',
                  width: '11%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {formatPersianNumber(Math.round(row.amount))}
                    </Typography>
                  ),
                },
                {
                  key: 'rate',
                  label: 'نرخ تبدیل',
                  width: '8%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {formatPersianNumber(row.rate)}
                    </Typography>
                  ),
                },

                {
                  key: 'rial',
                  label: 'معادل ریالی',
                  width: '12%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 900, color: FOREIGN_VIOLET, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {formatPersianNumber(Math.round(row.rialAmount))}
                    </Typography>
                  ),
                },
                {
                  key: 'end',
                  label: 'پایان مؤثر',
                  width: '9%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {dateLabel(row.end)}
                    </Typography>
                  ),
                },
                {
                  key: 'days',
                  label: 'روز مانده',
                  width: '10%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: daysColor(row.days) }}>
                      {daysText(row.days)}
                    </Typography>
                  ),
                },
              ]}
            />
            <ModulePager
              tableTheme={moduleTheme.tableTheme}
              page={foreignState.page}
              onPage={foreignState.setPage}
              totalPages={foreignState.totalPages}
              pageNumbers={foreignState.pageNumbers}
              total={foreignList.length}
              pageSize={rialPageSize}
              unit="قرارداد ارزی"
            />
          </Box>
        </Panel>
      </Box>


      {/* ---- قراردادهای رو به انقضا ---- */}
      <Box sx={{ mb: 1.5 }}>
        <Panel theme={moduleTheme} icon={EventBusyOutlinedIcon} color={RED}
          title="قراردادهای رو به انقضا" hint="بر اساس تاریخ پایان مؤثر با احتساب الحاقیه‌ها"
          action={<Button size="small" variant="text" onClick={() => navigate('/contracts-expiring')}>مشاهدهٔ کامل</Button>}>
          <Box sx={{ mt: -0.5 }}>
            <ModuleTable
              tableTheme={moduleTheme.tableTheme}
              ariaLabel="فهرست قراردادهای رو به انقضا داشبورد"
              containerRef={expiringHeight.ref}
              tableHeight={expiringHeight.tableHeight}
              rowHeight={expiringHeight.rowHeight}
              rows={data.expiring.slice(0, 8)}
              rowKey={(row) => row.contract.id}
              onRowClick={openContract}
              emptyText="قرارداد رو به انقضا در بازهٔ ۶۰ روز آینده وجود ندارد."
              columns={[
                {
                  key: 'number',
                  label: 'شماره',
                  width: '10%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {toPersianDigits(row.contract.number || row.contract.id)}
                    </Typography>
                  ),
                },
                {
                  key: 'subject',
                  label: 'موضوع قرارداد',
                  width: '26%',
                  render: (row) => (
                    <Typography noWrap title={row.contract.subject} sx={{ fontSize: 12, fontWeight: 800 }}>
                      {row.contract.subject || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'party',
                  label: 'طرف قرارداد',
                  width: '18%',
                  render: (row) => (
                    <Typography noWrap title={row.contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                      {row.contract.party_name || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'group',
                  label: 'گروه ارزی',
                  width: '11%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: row.group === 'foreign' ? FOREIGN_VIOLET : RIAL_BLUE }}>
                      {row.group === 'foreign' ? `ارزی · ${row.currency}` : 'ریالی'}
                    </Typography>
                  ),
                },
                {
                  key: 'end',
                  label: 'پایان مؤثر',
                  width: '11%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {dateLabel(row.end)}
                    </Typography>
                  ),
                },
                {
                  key: 'days',
                  label: 'روز مانده',
                  width: '11%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 900, color: daysColor(row.days) }}>
                      {daysText(row.days)}
                    </Typography>
                  ),
                },
                {
                  key: 'amount',
                  label: 'مبلغ مؤثر',
                  width: '13%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {formatPersianNumber(Math.round(row.amount))}
                    </Typography>
                  ),
                },
              ]}
            />
          </Box>
        </Panel>
      </Box>


      {/* ---- طرف‌های قرارداد، انواع و پروژه‌ها ---- */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={5}>
          <Panel theme={moduleTheme} icon={StorefrontOutlinedIcon} color={CYAN}
            title="طرف‌های اصلی قرارداد" hint="بر اساس جمع مبلغ مؤثر">
            <Box sx={{ mt: -0.5 }}>
              <ModuleTable
                tableTheme={moduleTheme.tableTheme}
                ariaLabel="فهرست طرف‌های قرارداد داشبورد"
                rows={data.parties.slice(0, 6)}
                rowKey={(row) => row.name}
                emptyText="طرف قراردادی ثبت نشده است."
                columns={[
                  {
                    key: 'rank',
                    label: 'رتبه',
                    width: '8%',
                    align: 'center',
                    render: (_row, index) => (
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>
                        {toPersianDigits(index + 1)}
                      </Typography>
                    ),
                  },
                  {
                    key: 'name',
                    label: 'طرف قرارداد',
                    width: '36%',
                    render: (row) => (
                      <Typography noWrap title={row.name} sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.name}</Typography>
                    ),
                  },
                  {
                    key: 'count',
                    label: 'قرارداد',
                    width: '11%',
                    align: 'center',
                    render: (row) => (
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>
                        {formatPersianNumber(row.count)}
                      </Typography>
                    ),
                  },
                  {
                    key: 'split',
                    label: 'ریالی / ارزی',
                    width: '14%',
                    align: 'center',
                    render: (row) => (
                      <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: MUTED }}>
                        {`${toPersianDigits(row.rialCount)} / ${toPersianDigits(row.foreignCount)}`}
                      </Typography>
                    ),
                  },
                  {
                    key: 'amount',
                    label: 'مبلغ مؤثر',
                    width: '17%',
                    align: 'center',
                    render: (row) => (
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: CYAN, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                        {compactMoney(row.amount)}
                      </Typography>
                    ),
                  },
                  {
                    key: 'share',
                    label: 'سهم',
                    width: '14%',
                    align: 'center',
                    render: (row) => (
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                        {formatPersianPercent(shareOf(row.amount, partyMax))}
                      </Typography>
                    ),
                  },
                ]}
              />
            </Box>
          </Panel>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Panel theme={moduleTheme} icon={DescriptionOutlinedIcon} color={AMBER}
            title="ترکیب انواع قرارداد" hint="تعداد پرونده به تفکیک نوع">
            <Box sx={{ mt: -0.5 }}>
              <ModuleTable
                tableTheme={moduleTheme.tableTheme}
                ariaLabel="ترکیب انواع قرارداد داشبورد"
                rows={data.types}
                rowKey={(row) => row.label}
                emptyText="نوع قراردادی ثبت نشده است."
                columns={[
                  {
                    key: 'label',
                    label: 'نوع قرارداد',
                    width: '55%',
                    render: (row) => (
                      <Typography noWrap title={row.label} sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.label}</Typography>
                    ),
                  },
                  {
                    key: 'count',
                    label: 'تعداد',
                    width: '20%',
                    align: 'center',
                    render: (row) => (
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>
                        {formatPersianNumber(row.count)}
                      </Typography>
                    ),
                  },
                  {
                    key: 'share',
                    label: 'سهم',
                    width: '25%',
                    align: 'center',
                    render: (row) => (
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                        {formatPersianPercent(shareOf(row.count, data.total))}
                      </Typography>
                    ),
                  },
                ]}
              />
            </Box>
          </Panel>
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <Panel theme={moduleTheme} icon={FolderOutlinedIcon} color={VIOLET}
            title="توزیع قراردادها در پروژه‌ها" hint="تعداد پرونده به تفکیک پروژه">
            <Box sx={{ mt: -0.5 }}>
              <ModuleTable
                tableTheme={moduleTheme.tableTheme}
                ariaLabel="توزیع قراردادها در پروژه‌ها داشبورد"
                rows={data.projects}
                rowKey={(row) => row.label}
                emptyText="قراردادی به پروژه تخصیص نیافته است."
                columns={[
                  {
                    key: 'label',
                    label: 'پروژه',
                    width: '58%',
                    render: (row) => (
                      <Typography noWrap title={row.label} sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.label}</Typography>
                    ),
                  },
                  {
                    key: 'count',
                    label: 'تعداد',
                    width: '18%',
                    align: 'center',
                    render: (row) => (
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>
                        {formatPersianNumber(row.count)}
                      </Typography>
                    ),
                  },
                  {
                    key: 'share',
                    label: 'سهم',
                    width: '24%',
                    align: 'center',
                    render: (row) => (
                      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                        {formatPersianPercent(shareOf(row.count, data.total))}
                      </Typography>
                    ),
                  },
                ]}
              />
            </Box>
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContractsDashboardPage;

const rialEquivalentOf = (contract) => effectiveAmount(contract) * rateOf(contract);