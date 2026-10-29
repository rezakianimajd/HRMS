import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, ButtonBase, Divider, Grid, IconButton, Paper, Skeleton,
  Stack, Tooltip, Typography, alpha,
} from '@mui/material';
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
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CurrencyExchangeOutlinedIcon from '@mui/icons-material/CurrencyExchangeOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import {
  CartesianGrid, Legend, Line, LineChart, Tooltip as ReTooltip, XAxis, YAxis,
} from 'recharts';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import { INK, MUTED } from './accounting/AccountingDashboardUI';
import {
  formatPersianNumber, formatPersianPercent, normalizeCurrencyLabel, toPersianDigits,
} from '../core/utils/numberUtils';
import { getJalaliParts, toJalali } from '../core/utils/dateUtils';
import {
  CONTRACT_STATUS_COLORS as STATUS_COLORS,
  CONTRACT_STATUS_LABELS as STATUS_LABELS,
  CONTRACT_TYPE_LABELS as TYPE_LABELS,
} from '../core/theme/tokens';
import { ModuleToolbar, useModuleTheme } from './contracts/contractModuleUi';

const AMBER = '#b45309';
const BLUE = '#2563eb';
const GREEN = '#0f766e';
const RED = '#be123c';
const CYAN = '#0e7490';
const VIOLET = '#7c3aed';
const SLATE = '#475569';
const RIAL_BLUE = '#1d4ed8';
const FOREIGN_VIOLET = '#7c3aed';
const CARDS_PER_PAGE = 6;

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

/* ---- تفکیک ارزی/ریالی با همان منطق بک‌اند (exchange_rate > 1 و کد ارز غیر IRR) ---- */
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
/* ------------------------------------------------------------ اجزای شماتیک */
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

/* کارت پایه: هدر تم‌محور + بدنه */
const Panel = ({ theme, title, hint, icon: Icon, color = AMBER, action, children, sx, ariaLabel }) => (
  <Paper elevation={0} aria-label={ariaLabel} sx={{
    borderRadius: 'var(--hrms-table-radius, 16px)',
    border: '1px solid', borderColor: theme.cardBorderColor,
    bgcolor: 'background.paper', boxShadow: 'none', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', height: '100%',
    transition: 'box-shadow .18s ease, border-color .18s ease', ...sx,
  }}>
    <Stack direction="row" alignItems="center" spacing={1} useFlexGap
      sx={{ px: `${theme.cardPadX}px`, py: 1.1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '9px', flexShrink: 0,
        bgcolor: alpha(color, 0.08), color, border: `1px solid ${alpha(color, 0.16)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 16 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK }}>{title}</Typography>
        {hint ? <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{hint}</Typography> : null}
      </Box>
      {action || null}
    </Stack>
    <Box sx={{ p: `${theme.cardPadX}px`, flex: 1, minHeight: 0 }}>{children}</Box>
  </Paper>
);

const MetricTile = ({ theme, icon: Icon, label, value, suffix, hint, color = AMBER, onClick }) => {
  const content = (
    <Paper elevation={0} sx={{
      p: 1.3, height: '100%', borderRadius: 'var(--hrms-table-radius, 16px)',
      border: '1px solid', borderColor: theme.cardBorderColor,
      bgcolor: 'background.paper', boxShadow: 'none',
      display: 'flex', flexDirection: 'column', gap: 0.55,
      transition: 'border-color .16s ease, box-shadow .16s ease, transform .16s ease',
      '&:hover': onClick ? { borderColor: alpha(color, 0.42), boxShadow: `0 10px 24px ${alpha(color, 0.08)}`, transform: 'translateY(-1px)' } : undefined,
    }}>
      <Stack direction="row" alignItems="center" spacing={0.7}>
        <Box sx={{
          width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
          bgcolor: alpha(color, 0.08), color, border: `1px solid ${alpha(color, 0.14)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 14 }} />
        </Box>
        <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>{label}</Typography>
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 17, fontWeight: 900, color: INK, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
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
  <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ py: 0.3 }}>
    <Typography noWrap sx={{ fontSize: 11.5, color: MUTED }}>{label}</Typography>
    <Typography noWrap sx={{
      fontSize: strong ? 12 : 11.5, fontWeight: strong ? 900 : 700, color,
      fontFamily: 'var(--hrms-table-number-font, inherit)',
    }}>{value}</Typography>
  </Stack>
);


/* نوار شماتیک (بدون چیپ، بدون جدول) */
const Track = ({ value, color, height = 6, track }) => (
  <Box sx={{ width: '100%', height, borderRadius: height / 2, bgcolor: track || 'rgba(148,163,184,0.18)', overflow: 'hidden' }}>
    <Box sx={{
      width: `${Math.max(0, Math.min(100, num(value)))}%`, height: '100%', borderRadius: height / 2,
      background: `linear-gradient(90deg, ${alpha(color, 0.6)}, ${color})`,
      transition: 'width .35s ease',
    }} />
  </Box>
);

const SchematicRow = ({ label, value, share, color = BLUE, hint, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      py: 0.6, px: 0.5, borderRadius: '9px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'background-color .16s ease',
      '&:hover': onClick ? { bgcolor: alpha(color, 0.05) } : undefined,
    }}
  >
    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
      <Typography noWrap title={label} sx={{ fontSize: 11.5, fontWeight: 800, color: INK, flex: 1, minWidth: 0 }}>{label}</Typography>
      <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>{value}</Typography>
    </Stack>
    <Box sx={{ mt: 0.45 }}><Track value={share} color={color} height={5} /></Box>
    {hint ? <Typography noWrap sx={{ mt: 0.3, fontSize: 10, color: MUTED }}>{hint}</Typography> : null}
  </Box>
);

/* نمودار خطی کامل (محور چپ، لجند RTL) */
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

/* اسپارک‌لاین کوچک داخل کارت‌ها */
const SparkLine = ({ data, dataKey, color, height = 46 }) => {
  const hostRef = React.useRef(null);
  const [width, setWidth] = useState(180);
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
      <LineChart width={width} height={height} data={data} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
          dot={false} isAnimationActive={false} />
      </LineChart>
    </Box>
  );
};

const CardPager = ({ page, total, onPage, unit }) => {
  const totalPages = Math.max(1, Math.ceil(total / CARDS_PER_PAGE));
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 1.25 }}>
      <Typography sx={{ fontSize: 11, color: MUTED }}>
        {`${formatPersianNumber(total)} ${unit} • صفحهٔ ${toPersianDigits(page + 1)} از ${toPersianDigits(totalPages)}`}
      </Typography>
      <Stack direction="row" spacing={0.5}>
        <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => onPage(page - 1)}
          startIcon={<ChevronRightIcon sx={{ fontSize: 15 }} />} sx={{ minWidth: 0, fontSize: 11 }}>
          قبلی
        </Button>
        <Button size="small" variant="outlined" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}
          endIcon={<ChevronLeftIcon sx={{ fontSize: 15 }} />} sx={{ minWidth: 0, fontSize: 11 }}>
          بعدی
        </Button>
      </Stack>
    </Stack>
  );
};

const EmptyNote = ({ icon: Icon = InsightsOutlinedIcon, text }) => (
  <Box sx={{ py: 4, textAlign: 'center' }}>
    <Icon sx={{ fontSize: 30, color: '#cbd5e1', mb: 0.75 }} />
    <Typography sx={{ fontSize: 11.5, color: MUTED }}>{text}</Typography>
  </Box>
);


/* کارت قرارداد — نمایش شماتیک جای جدول چندستونه */
const ContractCard = ({ row, theme, onOpen }) => {
  const isForeign = row.group === 'foreign';
  const accent = isForeign ? FOREIGN_VIOLET : RIAL_BLUE;
  const statusTone = statusColor(row.contract.status);
  return (
    <Paper
      elevation={0}
      onClick={onOpen}
      sx={{
        p: 1.25, borderRadius: '14px', height: '100%',
        border: '1px solid', borderColor: theme.cardBorderColor,
        borderRight: `3px solid ${alpha(accent, 0.75)}`,
        bgcolor: 'background.paper', boxShadow: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 0.7,
        transition: 'border-color .18s ease, box-shadow .18s ease, transform .18s ease',
        '&:hover': { borderColor: alpha(accent, 0.45), boxShadow: `0 10px 26px ${alpha(accent, 0.09)}`, transform: 'translateY(-2px)' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography noWrap sx={{
          fontSize: 11.5, fontWeight: 900, color: accent,
          fontFamily: 'var(--hrms-table-number-font, inherit)',
        }}>
          {toPersianDigits(row.contract.number || row.contract.id)}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" alignItems="center" spacing={0.4}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: statusTone }} />
          <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 800, color: statusTone }}>
            {statusLabel(row.contract.status)}
          </Typography>
        </Stack>
      </Stack>

      <Typography
        title={row.contract.subject}
        sx={{
          fontSize: 12, fontWeight: 800, color: INK, lineHeight: 1.6, minHeight: 38,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {row.contract.subject || 'بدون موضوع'}
      </Typography>

      <Typography noWrap title={row.contract.party_name} sx={{ fontSize: 10.5, color: MUTED }}>
        {row.contract.party_name || 'بدون طرف قرارداد'}
      </Typography>

      <Box sx={{ p: 0.9, borderRadius: '10px', bgcolor: alpha(accent, 0.04), border: `1px solid ${alpha(accent, 0.14)}` }}>
        <Typography sx={{ fontSize: 10, color: MUTED }}>{isForeign ? 'مبلغ ارزی' : 'مبلغ مؤثر (ریال)'}</Typography>
        <Typography noWrap sx={{
          fontSize: 14, fontWeight: 900, color: accent, lineHeight: 1.35,
          fontFamily: 'var(--hrms-table-number-font, inherit)',
        }}>
          {isForeign ? `${formatPersianNumber(Math.round(row.amount))} ${row.currency}` : formatPersianNumber(Math.round(row.amount))}
        </Typography>
        {isForeign ? (
          <Typography noWrap sx={{ fontSize: 10, color: MUTED, mt: 0.2 }}>
            {`نرخ ${formatPersianNumber(row.rate)} • معادل ${compactMoney(row.rialAmount)} ریال`}
          </Typography>
        ) : (
          <Typography noWrap sx={{ fontSize: 10, color: MUTED, mt: 0.2 }}>
            {`سهم از پرتفوی ریالی ${formatPersianPercent(num(row.share))}`}
          </Typography>
        )}
      </Box>

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography sx={{ fontSize: 10, color: MUTED }}>سهم از ارزش گروه</Typography>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: accent }}>{formatPersianPercent(num(row.share))}</Typography>
        </Stack>
        <Box sx={{ mt: 0.35 }}><Track value={row.share} color={accent} height={5} /></Box>
      </Box>

      <Divider sx={{ my: 0.1 }} />
      <Stack direction="row" alignItems="center" spacing={0.6}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>پایان مؤثر</Typography>
          <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
            {dateLabel(row.end)}
          </Typography>
        </Box>
        <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 900, color: daysColor(row.days) }}>
          {daysText(row.days)}
        </Typography>
        <Tooltip title="پرونده قرارداد">
          <IconButton size="small" aria-label="پرونده قرارداد"
            onClick={(event) => { event.stopPropagation(); onOpen(); }}>
            <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
};


/* ====================================================================== صفحه */
const ContractsDashboardPage = () => {
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('amount');
  const [rialPage, setRialPage] = useState(0);
  const [foreignPage, setForeignPage] = useState(0);

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
    const withShare = (rows, total) => rows.map((row) => ({ ...row, share: total > 0 ? (row.amount / total) * 100 : 0 }));

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
      const invoiceMonth = items.reduce((sum, contract) => sum + asArray(contract.invoices)
        .filter((invoice) => String(invoice.date || invoice.created_at || '').slice(0, 7) === key)
        .reduce((value, invoice) => value + num(invoice.total ?? invoice.amount), 0), 0);
      const paymentMonth = items.reduce((sum, contract) => sum + asArray(contract.payments)
        .filter((payment) => String(payment.date || payment.created_at || '').slice(0, 7) === key)
        .reduce((value, payment) => value + num(payment.amount), 0), 0);
      monthly.push({
        label: jalali ? JALALI_MONTHS[jalali[1] - 1] : key,
        rial: rialMonth.length,
        foreign: foreignMonth.length,
        rialAmount: rialMonth.reduce((sum, row) => sum + row.amount, 0),
        foreignRialAmount: foreignMonth.reduce((sum, row) => sum + row.rialAmount, 0),
        invoiceAmount: invoiceMonth,
        paymentAmount: paymentMonth,
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
    const partyTop = Math.max(...parties.map((party) => party.amount), 1);

    const types = Object.entries(items.reduce((acc, contract) => {
      const key = contract.contract_type_master_name || TYPE_LABELS[contract.contract_type] || 'سایر';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    const typeTop = Math.max(...types.map((type) => type.count), 1);

    const projects = Object.entries(items.reduce((acc, contract) => {
      const key = contract.project_title || contract.project_name || 'بدون پروژه';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    const projectTop = Math.max(...projects.map((project) => project.count), 1);

    const statusSegments = Object.entries(STATUS_LABELS)
      .map(([key, label]) => ({ key, label, value: num(statusCounts[key]), color: statusColor(key) }))
      .filter((segment) => segment.value > 0);

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
      statusSegments,
      rialRows: withShare(rialRows, rialGroup.amount).sort((a, b) => b.amount - a.amount),
      foreignRows: withShare(foreignRows, foreignGroup.rialAmount)
        .map((row) => ({ ...row, share: foreignGroup.rialAmount > 0 ? (row.rialAmount / foreignGroup.rialAmount) * 100 : 0 }))
        .sort((a, b) => b.rialAmount - a.rialAmount),
      rialGroup,
      foreignGroup,
      byCurrency: Object.values(currencyMap).sort((a, b) => b.rialAmount - a.rialAmount),
      monthly,
      parties,
      partyTop,
      types,
      typeTop,
      projects,
      projectTop,
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

  /* ---- جست‌وجو و مرتب‌سازی کارت‌ها ---- */
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
  const rialCards = useMemo(() => data.rialRows.filter(matched).sort(sorter), [data.rialRows, search, sortBy]);
  const foreignCards = useMemo(() => data.foreignRows.filter(matched).sort(sorter), [data.foreignRows, search, sortBy]);
  const rialSlice = rialCards.slice(rialPage * CARDS_PER_PAGE, (rialPage + 1) * CARDS_PER_PAGE);
  const foreignSlice = foreignCards.slice(foreignPage * CARDS_PER_PAGE, (foreignPage + 1) * CARDS_PER_PAGE);

  const counters = data.statusCounts;
  const shareOf = (value, total) => (total > 0 ? (value / total) * 100 : 0);
  const openContract = (row) => navigate(`/external-contracts/${row.contract.id}`);


  const refreshAll = () => {
    contractsQuery.refetch();
    statsQuery.refetch();
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
            <Skeleton key={item} variant="rounded" height={92} sx={{ borderRadius: '16px' }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <Skeleton variant="rounded" height={252} sx={{ borderRadius: '16px' }} />
          <Skeleton variant="rounded" height={252} sx={{ borderRadius: '16px' }} />
        </Box>
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
        <MetricTile theme={moduleTheme} icon={CurrencyExchangeOutlinedIcon} label="معادل ریالی ارزی"
          value={compactMoney(data.totals.rialEquivalent)} suffix="ریال"
          hint={`${formatPersianNumber(data.byCurrency.length)} ارز فعال`} color={FOREIGN_VIOLET} />
        <MetricTile theme={moduleTheme} icon={WarningAmberOutlinedIcon} label="رو به انقضا"
          value={formatPersianNumber(data.rialGroup.expiring + data.foreignGroup.expiring)} suffix="مورد"
          hint="در بازهٔ ۶۰ روز آینده" color={RED} onClick={() => navigate('/contracts-expiring')} />
      </Box>


      {/* ---- کارت‌های گروه ارزی/ریالی با اسپارک‌لاین ---- */}
      <Box sx={{ display: 'grid', gap: 1.5, mb: 1.5, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
        <Panel theme={moduleTheme} icon={AccountBalanceWalletOutlinedIcon} color={RIAL_BLUE}
          title="پرتفوی ریالی" hint={`${formatPersianNumber(data.rialGroup.count)} قرارداد ریالی`}
          ariaLabel="پرتفوی ریالی"
          action={<Button size="small" variant="text" onClick={() => navigate('/external-contracts')}>فهرست</Button>}>
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 0.5 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>ارزش کل</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: RIAL_BLUE, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {money(data.rialGroup.amount)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>سهم از پرتفوی</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                {formatPersianPercent(shareOf(data.rialGroup.amount, data.totals.portfolioRial))}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>میانگین قرارداد</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                {compactMoney(data.rialGroup.average)}
              </Typography>
            </Box>
          </Stack>
          <SparkLine data={data.monthly} dataKey="rial" color={RIAL_BLUE} height={54} />
          <Grid container spacing={1} sx={{ mt: 0.25 }}>
            <Grid item xs={6}><StatRow label="فاکتور" value={money(data.rialGroup.invoiced)} /></Grid>
            <Grid item xs={6}><StatRow label="پرداخت" value={money(data.rialGroup.paid)} color={GREEN} /></Grid>
            <Grid item xs={6}>
              <StatRow label="مانده" value={money(Math.max(0, data.rialGroup.invoiced - data.rialGroup.paid))} color={AMBER} />
            </Grid>
            <Grid item xs={6}>
              <StatRow label="رو به انقضا" value={`${formatPersianNumber(data.rialGroup.expiring)} مورد`}
                color={data.rialGroup.expiring ? RED : GREEN} />
            </Grid>
          </Grid>
        </Panel>

        <Panel theme={moduleTheme} icon={CurrencyExchangeOutlinedIcon} color={FOREIGN_VIOLET}
          title="پرتفوی ارزی" hint={`${formatPersianNumber(data.foreignGroup.count)} قرارداد · ${formatPersianNumber(data.byCurrency.length)} ارز`}
          ariaLabel="پرتفوی ارزی">
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 0.5 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>معادل ریالی</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: FOREIGN_VIOLET, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {money(data.totals.rialEquivalent)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>سهم از پرتفوی</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                {formatPersianPercent(shareOf(data.totals.rialEquivalent, data.totals.portfolioRial))}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>میانگین (معادل ریالی)</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                {compactMoney(data.foreignGroup.count ? data.totals.rialEquivalent / data.foreignGroup.count : 0)}
              </Typography>
            </Box>
          </Stack>
          <SparkLine data={data.monthly} dataKey="foreign" color={FOREIGN_VIOLET} height={54} />
          <Box sx={{ mt: 0.5 }}>
            {data.byCurrency.length ? data.byCurrency.map((row) => (
              <SchematicRow key={row.currency} color={FOREIGN_VIOLET}
                label={`${row.currency} · ${formatPersianNumber(row.count)} قرارداد`}
                value={compactMoney(row.amount, row.currency)}
                share={shareOf(row.rialAmount, data.totals.rialEquivalent || 1)}
                hint={`معادل ${compactMoney(row.rialAmount)} ریال`} />
            )) : (
              <Typography sx={{ fontSize: 11, color: MUTED }}>قرارداد ارزی ثبت نشده است.</Typography>
            )}
          </Box>
        </Panel>
      </Box>


      {/* ---- نمودارهای خطی ---- */}
      <Box sx={{ display: 'grid', gap: 1.5, mb: 1.5, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
        <Panel theme={moduleTheme} icon={TrendingUpOutlinedIcon} color={BLUE}
          title="روند ماهانه انعقاد قراردادها" hint="شش ماه اخیر — ریالی و ارزی">
          {data.monthly.some((row) => row.rial || row.foreign) ? (
            <TrendChart
              data={data.monthly}
              height={218}
              series={[
                { key: 'rial', name: 'ریالی', color: RIAL_BLUE },
                { key: 'foreign', name: 'ارزی', color: FOREIGN_VIOLET },
              ]}
              tooltipFormatter={(value, name) => [`${formatPersianNumber(value)} قرارداد`, name]}
            />
          ) : <EmptyNote text="در شش ماه اخیر قراردادی منعقد نشده است." />}
        </Panel>
        <Panel theme={moduleTheme} icon={InsightsOutlinedIcon} color={FOREIGN_VIOLET}
          title="روند ارزش قراردادهای منعقدشده" hint="مبلغ ریالی و معادل ریالی ارزی">
          {data.monthly.some((row) => row.rialAmount || row.foreignRialAmount) ? (
            <TrendChart
              data={data.monthly}
              height={218}
              yWidth={78}
              series={[
                { key: 'rialAmount', name: 'مبلغ ریالی', color: RIAL_BLUE },
                { key: 'foreignRialAmount', name: 'معادل ریالی ارزی', color: FOREIGN_VIOLET, dashed: true },
              ]}
              tooltipFormatter={(value, name) => [money(value), name]}
            />
          ) : <EmptyNote text="داده‌ای برای روند مبالغ موجود نیست." />}
        </Panel>
      </Box>

      {/* ---- جست‌وجو و ترتیب کارت‌های قرارداد ---- */}
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

      {/* ---- کارت‌های قراردادهای ریالی ---- */}
      <Panel theme={moduleTheme} icon={HandshakeOutlinedIcon} color={RIAL_BLUE}
        title="قراردادهای ریالی" hint={`${formatPersianNumber(rialCards.length)} قرارداد`}
        ariaLabel="کارت‌های قراردادهای ریالی"
        sx={{ mb: 1.5 }}>
        {rialSlice.length ? (
          <>
            <Box sx={{
              display: 'grid', gap: 1.25,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            }}>
              {rialSlice.map((row) => (
                <ContractCard key={row.contract.id} row={row} theme={moduleTheme} onOpen={() => openContract(row)} />
              ))}
            </Box>
            <CardPager page={rialPage} total={rialCards.length} onPage={setRialPage} unit="قرارداد ریالی" />
          </>
        ) : <EmptyNote text="قرارداد ریالی با این مشخصات پیدا نشد." />}
      </Panel>

      {/* ---- کارت‌های قراردادهای ارزی ---- */}
      <Panel theme={moduleTheme} icon={CurrencyExchangeOutlinedIcon} color={FOREIGN_VIOLET}
        title="قراردادهای ارزی" hint={`${formatPersianNumber(foreignCards.length)} قرارداد · معادل ${money(data.totals.rialEquivalent)}`}
        ariaLabel="کارت‌های قراردادهای ارزی"
        sx={{ mb: 1.5 }}>
        {foreignSlice.length ? (
          <>
            <Box sx={{
              display: 'grid', gap: 1.25,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            }}>
              {foreignSlice.map((row) => (
                <ContractCard key={row.contract.id} row={row} theme={moduleTheme} onOpen={() => openContract(row)} />
              ))}
            </Box>
            <CardPager page={foreignPage} total={foreignCards.length} onPage={setForeignPage} unit="قرارداد ارزی" />
          </>
        ) : <EmptyNote icon={CurrencyExchangeOutlinedIcon} text="قرارداد ارزی با این مشخصات پیدا نشد." />}
      </Panel>


      {/* ---- گرید: سلامت مالی + انقضا + توزیع‌ها ---- */}
      <Box sx={{ display: 'grid', gap: 1.5, mb: 1.5, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
        <Panel theme={moduleTheme} icon={ReceiptLongOutlinedIcon} color={CYAN}
          title="سلامت مالی پرونده‌ها" hint="روند صورت‌وضعیت و پرداخت در شش ماه اخیر">
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 0.4 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>فاکتور / صورت‌وضعیت</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {compactMoney(data.totals.invoiced)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>پرداخت‌شده</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: GREEN, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {compactMoney(data.totals.paid)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>مانده تسویه</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: data.totals.outstanding ? AMBER : GREEN, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {compactMoney(data.totals.outstanding)}
              </Typography>
            </Box>
          </Stack>
          {data.monthly.some((row) => row.invoiceAmount || row.paymentAmount) ? (
            <TrendChart
              data={data.monthly}
              height={196}
              yWidth={74}
              series={[
                { key: 'invoiceAmount', name: 'فاکتور', color: CYAN },
                { key: 'paymentAmount', name: 'پرداخت', color: GREEN },
              ]}
              tooltipFormatter={(value, name) => [money(value), name]}
            />
          ) : <EmptyNote icon={ReceiptLongOutlinedIcon} text="سند مالی در شش ماه اخیر ثبت نشده است." />}
          <Divider sx={{ my: 0.75 }} />
          <Grid container spacing={1}>
            <Grid item xs={6}><StatRow label="نرخ وصول" value={formatPersianPercent(data.totals.collectionRate)} color={GREEN} strong /></Grid>
            <Grid item xs={6}><StatRow label="فاکتور معوق" value={`${formatPersianNumber(data.totals.overdue)} فقره`} color={data.totals.overdue ? RED : GREEN} /></Grid>
            <Grid item xs={6}><StatRow label="تضامین فعال" value={`${formatPersianNumber(data.totals.guaranteeCount)} فقره`} color={VIOLET} /></Grid>
            <Grid item xs={6}><StatRow label="ارزش تضامین" value={compactMoney(data.totals.guarantees)} color={VIOLET} /></Grid>
          </Grid>
        </Panel>

        <Panel theme={moduleTheme} icon={EventBusyOutlinedIcon} color={RED}
          title="قراردادهای رو به انقضا" hint="نزدیک‌ترین پایان‌های مؤثر"
          action={<Button size="small" variant="text" onClick={() => navigate('/contracts-expiring')}>مشاهدهٔ کامل</Button>}>
          {data.expiring.length ? (
            <Box sx={{
              display: 'grid', gap: 1.1,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            }}>
              {data.expiring.slice(0, 4).map((row) => (
                <Box key={row.contract.id} onClick={() => openContract(row)} sx={{
                  p: 1, borderRadius: '11px', cursor: 'pointer',
                  border: '1px solid', borderColor: moduleTheme.cardBorderColor,
                  borderRight: `3px solid ${daysColor(row.days)}`,
                  transition: 'background-color .16s ease, box-shadow .16s ease',
                  '&:hover': { bgcolor: alpha(daysColor(row.days), 0.04), boxShadow: `0 8px 20px ${alpha(daysColor(row.days), 0.08)}` },
                }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 900, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {toPersianDigits(row.contract.number || row.contract.id)}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 900, color: daysColor(row.days) }}>
                      {daysText(row.days)}
                    </Typography>
                  </Stack>
                  <Typography noWrap title={row.contract.subject} sx={{ fontSize: 11.5, fontWeight: 800, color: INK, mt: 0.2 }}>
                    {row.contract.subject || '—'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>{row.contract.party_name || 'بدون طرف'}</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Track value={Math.max(4, 100 - Math.min(100, Math.abs(num(row.days)) / 0.6))} color={daysColor(row.days)} height={4} />
                  </Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.45 }}>
                    <Typography sx={{ fontSize: 10, color: MUTED }}>{dateLabel(row.end)}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: row.group === 'foreign' ? FOREIGN_VIOLET : RIAL_BLUE }}>
                      {row.group === 'foreign' ? `ارزی · ${row.currency}` : 'ریالی'}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Box>
          ) : <EmptyNote icon={EventBusyOutlinedIcon} text="قراردادی در بازهٔ ۶۰ روز آینده منقضی نمی‌شود." />}
        </Panel>
      </Box>


      {/* ---- توزیع‌های شماتیک: وضعیت، طرف‌ها، انواع، پروژه‌ها ---- */}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' } }}>
        <Panel theme={moduleTheme} icon={InsightsOutlinedIcon} color={SLATE}
          title="ترکیب وضعیت‌ها" hint={`${formatPersianNumber(data.total)} پرونده`}>
          <Stack direction="row" spacing={0.35} sx={{ mb: 1 }}>
            {data.statusSegments.map((segment) => (
              <Box key={segment.key} sx={{
                height: 8, borderRadius: 4, bgcolor: segment.color,
                width: `${shareOf(segment.value, data.total)}%`, minWidth: 4,
                transition: 'width .35s ease',
              }} />
            ))}
          </Stack>
          {data.statusSegments.map((segment) => (
            <SchematicRow key={segment.key} label={segment.label} color={segment.color}
              value={`${formatPersianNumber(segment.value)} · ${formatPersianPercent(shareOf(segment.value, data.total))}`}
              share={shareOf(segment.value, data.total)} />
          ))}
          {!data.statusSegments.length ? <EmptyNote text="وضعیتی ثبت نشده است." /> : null}
        </Panel>

        <Panel theme={moduleTheme} icon={StorefrontOutlinedIcon} color={CYAN}
          title="طرف‌های اصلی قرارداد" hint="بر اساس جمع مبلغ مؤثر">
          {data.parties.slice(0, 5).map((party, index) => (
            <SchematicRow key={party.name} color={CYAN}
              label={`${toPersianDigits(index + 1)}. ${party.name}`}
              value={compactMoney(party.amount)}
              share={shareOf(party.amount, data.partyTop)}
              hint={`${formatPersianNumber(party.count)} قرارداد · ${toPersianDigits(party.rialCount)} ریالی / ${toPersianDigits(party.foreignCount)} ارزی`} />
          ))}
          {!data.parties.length ? <EmptyNote icon={StorefrontOutlinedIcon} text="طرف قراردادی ثبت نشده است." /> : null}
        </Panel>

        <Panel theme={moduleTheme} icon={DescriptionOutlinedIcon} color={AMBER}
          title="ترکیب انواع قرارداد" hint="تعداد پرونده به تفکیک نوع">
          {data.types.map((type) => (
            <SchematicRow key={type.label} color={AMBER} label={type.label}
              value={`${formatPersianNumber(type.count)} · ${formatPersianPercent(shareOf(type.count, data.total))}`}
              share={shareOf(type.count, data.typeTop)} />
          ))}
          {!data.types.length ? <EmptyNote icon={DescriptionOutlinedIcon} text="نوع قراردادی ثبت نشده است." /> : null}
        </Panel>

        <Panel theme={moduleTheme} icon={FolderOutlinedIcon} color={VIOLET}
          title="قراردادها در پروژه‌ها" hint="تعداد پرونده به تفکیک پروژه">
          {data.projects.slice(0, 6).map((project) => (
            <SchematicRow key={project.label} color={VIOLET} label={project.label}
              value={`${formatPersianNumber(project.count)} · ${formatPersianPercent(shareOf(project.count, data.total))}`}
              share={shareOf(project.count, data.projectTop)} />
          ))}
          {!data.projects.length ? <EmptyNote icon={FolderOutlinedIcon} text="قراردادی به پروژه تخصیص نیافته است." /> : null}
        </Panel>
      </Box>
    </Box>
  );
};

export default ContractsDashboardPage;