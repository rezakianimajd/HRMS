/**
 * کیت مشترک داشبوردهای ماژول‌ها — پنل شماتیک، کاشی شاخص، ردیف آماری، نمودار روند.
 *
 * از داشبورد «مدیریت قراردادها» استخراج شد تا داشبوردهای دیگر (مثل مدیریت خریدها)
 * عیناً همان زبان بصری را داشته باشند؛ رنگ‌ها/شعاع/سایه از تم ماژول می‌آید و
 * هیچ مقدار hard-code جدیدی اضافه نمی‌شود.
 */
import React, { useState } from 'react';
import {
  Box, Button, ButtonBase, Paper, Stack, Typography, alpha,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import {
  CartesianGrid, Legend, Line, LineChart, Tooltip as ReTooltip, XAxis, YAxis,
} from 'recharts';
import { INK, MUTED } from '../accounting/AccountingDashboardUI';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';

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

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

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
export {
  AMBER, BLUE, CYAN, FOREIGN_VIOLET, GREEN, RED, RIAL_BLUE, SLATE, VIOLET,
  CARDS_PER_PAGE, Panel, MetricTile, StatRow, Track, SchematicRow,
  TrendChart, SparkLine, CardPager, EmptyNote,
  compactMoney, daysColor, daysText, daysUntil, money, num,
};
