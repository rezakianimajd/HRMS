import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Divider,
  Grid, InputAdornment, LinearProgress, Paper, Skeleton, Stack,
  Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Tabs, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import { KpiTile, ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import { BarChart, ColumnChart, DonutChart, MultiLineChart } from '../core/components/charts/Charts';
import { formatPersianNumber, formatPersianPercent, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const BLUE = '#6366f1';
const TEAL = '#0f766e';
const AMBER = '#b45309';
const RED = '#be123c';
const PINK = '#be185d';
const VIOLET = '#7c3aed';
const GREEN = '#15803d';
const CYAN = '#0e7490';

const TABS = [
  { key: 'overview', label: 'نمای کلی', icon: DashboardOutlinedIcon },
  { key: 'people', label: 'سرمایه انسانی', icon: PeopleAltOutlinedIcon },
  { key: 'finance', label: 'مالی و رفاه', icon: AccountBalanceWalletOutlinedIcon },
];

const QUICK_ACTIONS = [
  { label: 'ثبت پرسنل', path: '/employees/new', icon: PersonAddAltOutlinedIcon, color: BLUE },
  { label: 'حضور و غیاب', path: '/attendance', icon: AccessTimeOutlinedIcon, color: CYAN },
  { label: 'مرخصی', path: '/leaves', icon: BeachAccessOutlinedIcon, color: TEAL },
  { label: 'فیش حقوق', path: '/payslips', icon: ReceiptLongOutlinedIcon, color: VIOLET },
];

const asArray = (value) => (Array.isArray(value) ? value : []);
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const EmptyState = ({ icon: Icon = CheckCircleOutlineIcon, text, hint, color = MUTED }) => (
  <Box sx={{ py: 4.5, textAlign: 'center' }}>
    <Icon sx={{ fontSize: 30, color: alpha(color, 0.55), mb: 0.7 }} />
    <Typography sx={{ fontSize: 10.4, fontWeight: 800, color: INK }}>{text}</Typography>
    {hint ? <Typography sx={{ mt: 0.35, fontSize: 9.2, color: MUTED }}>{hint}</Typography> : null}
  </Box>
);

const MiniMetric = ({ icon: Icon, label, value, suffix, hint, color, onClick }) => (
  <Paper
    elevation={0}
    onClick={onClick}
    sx={{
      p: 1.3, borderRadius: '13px', border: '1px solid #e8edf4', bgcolor: '#fff',
      display: 'flex', alignItems: 'center', gap: 0.9, minHeight: 74,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color .18s ease, transform .18s ease',
      '&:hover': onClick ? { borderColor: alpha(color, 0.35), transform: 'translateY(-1px)' } : {},
    }}
  >
    <Box sx={{
      width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: alpha(color, 0.08), color,
    }}>
      <Icon sx={{ fontSize: 17 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 8.9, color: MUTED }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: INK, lineHeight: 1.35 }}>
        {value}
        {suffix ? <Box component="span" sx={{ fontSize: 8.8, fontWeight: 700, color: MUTED, mr: 0.4 }}>{suffix}</Box> : null}
      </Typography>
      {hint ? <Typography noWrap sx={{ fontSize: 8.2, color: MUTED }}>{hint}</Typography> : null}
    </Box>
  </Paper>
);

const QuickAction = ({ action, onClick }) => {
  const Icon = action.icon;
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        px: 1.3, py: 0.9, borderRadius: '11px', gap: 0.7, minWidth: 0, justifyContent: 'flex-start',
        bgcolor: '#fff', border: '1px solid #e6ebf3', color: INK,
        '&:hover': { borderColor: alpha(action.color, 0.45), bgcolor: alpha(action.color, 0.035) },
      }}
    >
      <Box sx={{
        width: 27, height: 27, borderRadius: '8px', flexShrink: 0,
        bgcolor: alpha(action.color, 0.09), color: action.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 15 }} />
      </Box>
      <Typography noWrap sx={{ fontSize: 9.4, fontWeight: 800 }}>{action.label}</Typography>
    </ButtonBase>
  );
};


const alertDays = (days) => {
  if (days <= 3) return { label: days === 0 ? 'امروز' : `${toPersianDigits(days)} روز`, color: RED };
  if (days <= 14) return { label: `${toPersianDigits(days)} روز`, color: AMBER };
  return { label: `${toPersianDigits(days)} روز`, color: TEAL };
};

const AlertCenter = ({ alerts, navigate }) => {
  const [kind, setKind] = useState('documents');
  const documents = asArray(alerts?.expiring_documents);
  const contracts = asArray(alerts?.expiring_contracts);
  const items = kind === 'documents' ? documents : contracts;
  const total = num(alerts?.total_alerts) || documents.length + contracts.length;

  return (
    <SurfaceCard
      title="مرکز هشدارها"
      icon={WarningAmberOutlinedIcon}
      color={AMBER}
      action={<Chip size="small" label={`${formatPersianNumber(total)} مورد`}
        sx={{ height: 21, fontSize: 8.8, fontWeight: 800, bgcolor: alpha(AMBER, 0.08), color: AMBER }} />}
    >
      <Tabs value={kind} onChange={(_event, value) => setKind(value)} variant="fullWidth"
        sx={{ minHeight: 30, mb: 1, '& .MuiTab-root': { minHeight: 30, py: 0.3, fontSize: 9, fontWeight: 800 } }}>
        <Tab value="documents" label={`مدارک (${toPersianDigits(documents.length)})`} />
        <Tab value="contracts" label={`قراردادها (${toPersianDigits(contracts.length)})`} />
      </Tabs>

      {!items.length ? (
        <EmptyState icon={CheckCircleOutlineIcon} text="هشدار فعالی وجود ندارد"
          hint="مدارک و قراردادها در بازهٔ هشدار نیستند." color={GREEN} />
      ) : (
        <Stack spacing={0.55}>
          {items.map((item) => {
            const days = alertDays(num(item.days_left));
            return (
              <ButtonBase
                key={`${kind}-${item.id}`}
                onClick={() => navigate(kind === 'documents' ? '/employees' : '/contracts-expiring')}
                sx={{
                  width: '100%', p: 0.8, borderRadius: '10px', gap: 0.8, textAlign: 'right',
                  justifyContent: 'flex-start', border: '1px solid #eef2f7',
                  '&:hover': { bgcolor: alpha(days.color, 0.035), borderColor: alpha(days.color, 0.22) },
                }}
              >
                <Box sx={{
                  width: 29, height: 29, borderRadius: '8px', flexShrink: 0,
                  bgcolor: alpha(days.color, 0.08), color: days.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {kind === 'documents' ? <DescriptionOutlinedIcon sx={{ fontSize: 15 }} /> : <AssignmentOutlinedIcon sx={{ fontSize: 15 }} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 9.5, fontWeight: 800, color: INK }}>
                    {kind === 'documents' ? item.title : item.full_name}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 8.2, color: MUTED }}>
                    {kind === 'documents'
                      ? `${item.employee_name || '—'} · انقضا ${toJalali(item.expiry_date)}`
                      : `قرارداد · پایان ${toJalali(item.contract_end_date)}`}
                  </Typography>
                </Box>
                <Chip size="small" label={days.label}
                  sx={{ height: 19, fontSize: 7.7, fontWeight: 800, bgcolor: alpha(days.color, 0.08), color: days.color }} />
              </ButtonBase>
            );
          })}
        </Stack>
      )}
    </SurfaceCard>
  );
};

const formatWhen = (timestamp) => {
  if (!timestamp) return '—';
  const iso = String(timestamp).slice(0, 10);
  let time = '';
  try {
    time = new Date(timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    time = '';
  }
  return `${toJalali(iso)}${time ? ` · ${time}` : ''}`;
};

const ActivityFeed = ({ activities }) => (
  <SurfaceCard title="فعالیت‌های اخیر" icon={HistoryOutlinedIcon} color={TEAL}
    action={<Chip size="small" label={formatPersianNumber(asArray(activities).length)}
      sx={{ height: 20, fontSize: 8, bgcolor: alpha(TEAL, 0.07), color: TEAL }} />}>
    {!asArray(activities).length ? (
      <EmptyState icon={HistoryOutlinedIcon} text="فعالیتی ثبت نشده است" color={TEAL} />
    ) : (
      <Stack spacing={0.35}>
        {asArray(activities).slice(0, 7).map((activity) => (
          <Stack key={activity.id} direction="row" spacing={0.8} sx={{ py: 0.55, borderBottom: '1px solid #f3f6fa' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: TEAL, mt: 0.8, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 9.3, fontWeight: 700, color: INK }}>
                {activity.description || activity.action}
              </Typography>
              <Typography noWrap sx={{ fontSize: 8, color: MUTED }}>
                {activity.user} · {activity.action} · {formatWhen(activity.timestamp)}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    )}
  </SurfaceCard>
);


const AttendancePanel = ({ months }) => {
  const list = asArray(months);
  const latest = list[list.length - 1] || {};
  const hasData = list.some((month) => num(month.total) > 0);
  const series = [
    { key: 'present', label: 'نرخ حضور', color: GREEN, data: list.map((month) => num(month.present_rate)) },
    { key: 'absent', label: 'نرخ غیبت', color: RED, data: list.map((month) => num(month.absenteeism_rate)) },
  ];

  return (
    <SurfaceCard title="روند حضور و غیاب" icon={AccessTimeOutlinedIcon} color={CYAN}
      action={hasData ? (
        <Stack direction="row" spacing={0.5}>
          <Chip size="small" label={`حضور ${formatPersianPercent(latest.present_rate)}`}
            sx={{ height: 20, fontSize: 7.8, bgcolor: alpha(GREEN, 0.08), color: GREEN }} />
          <Chip size="small" label={`غیبت ${formatPersianPercent(latest.absenteeism_rate)}`}
            sx={{ height: 20, fontSize: 7.8, bgcolor: alpha(RED, 0.08), color: RED }} />
        </Stack>
      ) : null}>
      {!hasData ? (
        <EmptyState icon={AccessTimeOutlinedIcon} text="داده‌ای برای حضور و غیاب ثبت نشده است" color={CYAN} />
      ) : (
        <MultiLineChart series={series} labels={list.map((month) => month.label)} height={220} />
      )}
    </SurfaceCard>
  );
};

const LeavePanel = ({ leave, navigate }) => {
  const data = leave || {};
  const details = asArray(data.detail);
  const utilization = num(data.utilization_rate);

  return (
    <SurfaceCard title="مانده و مصرف مرخصی" icon={BeachAccessOutlinedIcon} color={TEAL}
      action={(
        <Button size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => navigate('/leaves')}
          sx={{ minWidth: 0, px: 0.8, fontSize: 8.8 }}>
          مدیریت مرخصی
        </Button>
      )}>
      {!num(data.total_employees) ? (
        <EmptyState icon={BeachAccessOutlinedIcon} text="اطلاعات مرخصی در دسترس نیست" color={TEAL} />
      ) : (
        <Stack spacing={1.2}>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.4 }}>
              <Typography sx={{ fontSize: 9.5, color: MUTED }}>نرخ مصرف مرخصی</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: TEAL }}>{formatPersianPercent(utilization)}</Typography>
            </Stack>
            <ProgressBar value={Math.min(100, utilization)} color={TEAL} height={7} />
            <Stack direction="row" spacing={1.2} sx={{ mt: 0.7 }} useFlexGap flexWrap="wrap">
              <Typography sx={{ fontSize: 8.5, color: MUTED }}>استحقاق: {formatPersianNumber(data.entitlement)} روز</Typography>
              <Typography sx={{ fontSize: 8.5, color: MUTED }}>مصرف: {formatPersianNumber(data.total_used)} روز</Typography>
              <Typography sx={{ fontSize: 8.5, color: MUTED }}>مانده: {formatPersianNumber(data.total_remaining)} روز</Typography>
            </Stack>
          </Box>
          <Divider />
          <Stack spacing={0.45}>
            {details.slice(0, 6).map((item) => (
              <Stack key={item.employee_id} direction="row" alignItems="center" spacing={0.6}>
                <Typography noWrap sx={{ flex: 1, fontSize: 9.2, fontWeight: 700, color: INK }}>{item.employee}</Typography>
                <Typography noWrap sx={{ fontSize: 8, color: MUTED, maxWidth: 86 }}>{item.department || '—'}</Typography>
                <Chip size="small" label={`${formatPersianNumber(item.remaining)} روز`}
                  sx={{
                    height: 18, fontSize: 7.5, fontWeight: 800,
                    bgcolor: alpha(item.remaining <= 5 ? RED : TEAL, 0.07),
                    color: item.remaining <= 5 ? RED : TEAL,
                  }} />
              </Stack>
            ))}
          </Stack>
        </Stack>
      )}
    </SurfaceCard>
  );
};


const LoansPanel = ({ loans, navigate }) => {
  const data = loans || {};
  return (
    <SurfaceCard title="وام و تسهیلات" icon={PaymentsOutlinedIcon} color={VIOLET}
      action={<Button size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => navigate('/loans')}
        sx={{ minWidth: 0, px: 0.8, fontSize: 8.8 }}>مدیریت وام‌ها</Button>}>
      <Grid container spacing={1}>
        <Grid item xs={6}><MiniMetric icon={RequestQuoteOutlinedIcon} label="وام فعال" value={formatPersianNumber(data.active_count)} suffix="مورد" color={VIOLET} /></Grid>
        <Grid item xs={6}><MiniMetric icon={PaymentsOutlinedIcon} label="مانده کل" value={formatPersianNumber(data.total_amount)} suffix="ریال" color={AMBER} /></Grid>
        <Grid item xs={6}><MiniMetric icon={AccountBalanceWalletOutlinedIcon} label="قسط ماهانه" value={formatPersianNumber(data.total_monthly_installments)} suffix="ریال" color={TEAL} /></Grid>
        <Grid item xs={6}><MiniMetric icon={FactCheckOutlinedIcon} label="تسویه‌شده" value={formatPersianNumber(data.paid_count)} suffix="مورد" color={GREEN} /></Grid>
      </Grid>
    </SurfaceCard>
  );
};

const AssetsPanel = ({ assets }) => {
  const data = assets || {};
  const byType = asArray(data.by_type).map((item, index) => ({
    label: item.type || 'نامشخص',
    value: num(item.count),
    color: [BLUE, GREEN, AMBER, CYAN, VIOLET, PINK][index % 6],
  }));
  const byStatus = asArray(data.by_status);

  return (
    <SurfaceCard title="اموال و تجهیزات" icon={Inventory2OutlinedIcon} color={GREEN}
      action={<Chip size="small" label={`${formatPersianNumber(data.total)} دارایی`}
        sx={{ height: 20, fontSize: 8, bgcolor: alpha(GREEN, 0.08), color: GREEN }} />}>
      {!byType.length ? (
        <EmptyState icon={Inventory2OutlinedIcon} text="دارایی فعالی ثبت نشده است" color={GREEN} />
      ) : (
        <Stack spacing={1.2}>
          <DonutChart data={byType} size={128} thickness={20} centerLabel="دارایی" />
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            {byStatus.map((item) => (
              <Chip key={item.status} size="small" label={`${item.status}: ${formatPersianNumber(item.count)}`}
                sx={{ height: 19, fontSize: 7.7, bgcolor: SOFT_BG, color: MUTED }} />
            ))}
          </Stack>
        </Stack>
      )}
    </SurfaceCard>
  );
};


const DepartmentTable = ({ rows }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'headcount', dir: 'desc' });

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = asArray(rows).filter((row) => !q || String(row.department || '').toLowerCase().includes(q));
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const direction = sort.dir === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
      return String(av || '').localeCompare(String(bv || ''), 'fa') * direction;
    });
  }, [rows, query, sort]);

  const handleSort = (key) => {
    setSort((previous) => ({
      key,
      dir: previous.key === key && previous.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const exportCsv = () => {
    const header = ['دپارتمان', 'تعداد نفرات', 'میانگین حقوق', 'میانگین عملکرد', 'رضایت شغلی', 'میانگین سن', 'میانگین سابقه'];
    const body = data.map((row) => [
      row.department, row.headcount, row.avg_salary, row.avg_performance,
      row.avg_satisfaction, row.avg_age, row.avg_tenure_years,
    ]);
    const csv = [header, ...body]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hr-departments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const sortLabel = (key, label) => (
    <TableSortLabel
      active={sort.key === key}
      direction={sort.key === key ? sort.dir : 'desc'}
      onClick={() => handleSort(key)}
      sx={{ '&.MuiTableSortLabel-root': { color: '#475569', fontSize: 9, fontWeight: 800 } }}
    >
      {label}
    </TableSortLabel>
  );


  return (
    <SurfaceCard title="تحلیل دپارتمان‌ها" icon={AccountTreeOutlinedIcon} color={BLUE}
      action={(
        <Button size="small" startIcon={<DownloadOutlinedIcon />} onClick={exportCsv}
          sx={{ minWidth: 0, px: 0.8, fontSize: 8.6 }}>خروجی</Button>
      )}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 1.1 }}>
        <TextField
          size="small"
          placeholder="جست‌وجوی دپارتمان…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchOutlinedIcon sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment>,
          }}
          sx={{ width: { xs: '100%', sm: 250 }, '& .MuiOutlinedInput-root': { height: 32, borderRadius: '9px', fontSize: 10 } }}
        />
        <Typography sx={{ fontSize: 8.6, color: MUTED }}>
          {formatPersianNumber(data.length)} دپارتمان
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 8.2, color: MUTED }}>برای مرتب‌سازی روی عنوان ستون بزنید</Typography>
      </Stack>

      {!data.length ? (
        <EmptyState icon={AccountTreeOutlinedIcon} text="دپارتمانی پیدا نشد" color={BLUE} />
      ) : (
        <TableContainer sx={{ maxHeight: 430, borderRadius: '10px', border: '1px solid #eef2f7' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: SOFT_BG, borderBottom: '1px solid #e8edf4', py: 0.7 } }}>
                <TableCell>{sortLabel('department', 'دپارتمان')}</TableCell>
                <TableCell align="center">{sortLabel('headcount', 'نفرات')}</TableCell>
                <TableCell align="center">{sortLabel('avg_salary', 'میانگین حقوق')}</TableCell>
                <TableCell align="center">{sortLabel('avg_performance', 'عملکرد')}</TableCell>
                <TableCell align="center">{sortLabel('avg_satisfaction', 'رضایت')}</TableCell>
                <TableCell align="center">{sortLabel('avg_age', 'سن')}</TableCell>
                <TableCell align="center">{sortLabel('avg_tenure_years', 'سابقه')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, index) => {
                const performance = num(row.avg_performance);
                const performanceColor = performance >= 85 ? GREEN : performance >= 70 ? BLUE : performance >= 50 ? AMBER : RED;
                const accent = [BLUE, PINK, GREEN, AMBER, VIOLET, CYAN][index % 6];
                return (
                  <TableRow key={row.department} hover sx={{ '& td': { py: 0.7, borderBottom: '1px solid #f2f5f9' } }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.7}>
                        <Box sx={{
                          width: 24, height: 24, borderRadius: '7px', color: accent,
                          bgcolor: alpha(accent, 0.08),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900,
                        }}>
                          {(row.department || '?').trim().charAt(0)}
                        </Box>
                        <Typography sx={{ fontSize: 9.4, fontWeight: 800, color: INK }}>{row.department}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={formatPersianNumber(row.headcount)}
                        sx={{ height: 19, fontSize: 7.8, fontWeight: 800, bgcolor: alpha(BLUE, 0.06), color: BLUE }} />
                    </TableCell>
                    <TableCell align="center">
                      <Typography sx={{ fontSize: 8.8, color: INK, direction: 'ltr' }}>{formatPersianNumber(row.avg_salary)}</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ minWidth: 105 }}>
                      <Stack direction="row" alignItems="center" spacing={0.6}>
                        <Box sx={{ flex: 1, minWidth: 45 }}>
                          <ProgressBar value={Math.min(100, performance)} color={performanceColor} height={5} />
                        </Box>
                        <Typography sx={{ fontSize: 8, color: performanceColor, fontWeight: 800 }}>{formatPersianNumber(performance)}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="center"><Typography sx={{ fontSize: 8.8, color: INK }}>{formatPersianNumber(row.avg_satisfaction)}</Typography></TableCell>
                    <TableCell align="center"><Typography sx={{ fontSize: 8.8, color: MUTED }}>{formatPersianNumber(row.avg_age)}</Typography></TableCell>
                    <TableCell align="center"><Typography sx={{ fontSize: 8.8, color: MUTED }}>{formatPersianNumber(row.avg_tenure_years)}</Typography></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SurfaceCard>
  );
};


const GenderPanel = ({ data, total }) => (
  <SurfaceCard title="ترکیب جنسیتی" icon={PeopleAltOutlinedIcon} color={PINK}>
    {!total ? (
      <EmptyState icon={PeopleAltOutlinedIcon} text="داده‌ای ثبت نشده است" color={PINK} />
    ) : (
      <DonutChart data={data} size={132} thickness={20} centerLabel="نفر" />
    )}
  </SurfaceCard>
);

const BirthdayPanel = ({ birthdays, navigate }) => {
  const list = asArray(birthdays);
  return (
    <SurfaceCard title="تولدهای ۷ روز آینده" icon={CakeOutlinedIcon} color={PINK}
      action={<Chip size="small" label={formatPersianNumber(list.length)}
        sx={{ height: 20, fontSize: 8, fontWeight: 800, bgcolor: alpha(PINK, 0.07), color: PINK }} />}>
      {!list.length ? (
        <EmptyState icon={CakeOutlinedIcon} text="در ۷ روز آینده تولدی نیست"
          hint="با ثبت تاریخ تولد پرسنل، این کارت فعال می‌شود." color={PINK} />
      ) : (
        <Stack spacing={0.5} sx={{ maxHeight: 274, overflowY: 'auto', pr: 0.25 }}>
          {list.slice(0, 8).map((birthday) => (
            <ButtonBase
              key={birthday.id}
              onClick={() => navigate(`/employees/${birthday.id}`)}
              sx={{
                width: '100%', p: 0.7, borderRadius: '10px', gap: 0.8, textAlign: 'right',
                justifyContent: 'flex-start', border: '1px solid #f3e8ee',
                bgcolor: birthday.is_today ? alpha(PINK, 0.04) : '#fff',
                '&:hover': { bgcolor: alpha(PINK, 0.06), borderColor: alpha(PINK, 0.28) },
              }}
            >
              <Box sx={{
                width: 29, height: 29, borderRadius: '50%', flexShrink: 0,
                bgcolor: alpha(PINK, 0.09), color: PINK, fontSize: 10, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {birthday.full_name?.trim()?.charAt(0) || '—'}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 9.5, fontWeight: 800, color: INK }}>{birthday.full_name}</Typography>
                <Typography noWrap sx={{ fontSize: 8.2, color: MUTED }}>
                  {birthday.department_name || 'بدون دپارتمان'}
                  {birthday.birth_jalali ? ` · ${toPersianDigits(birthday.birth_jalali)}` : ''}
                </Typography>
              </Box>
              <Chip size="small"
                label={birthday.is_today ? 'امروز 🎂' : `${toPersianDigits(birthday.days_until)} روز`}
                sx={{
                  height: 19, fontSize: 7.7, fontWeight: 800,
                  bgcolor: alpha(PINK, birthday.is_today ? 0.13 : 0.07), color: PINK,
                }} />
            </ButtonBase>
          ))}
        </Stack>
      )}
    </SurfaceCard>
  );
};

const DepartmentDistribution = ({ data, navigate }) => (
  <SurfaceCard title="توزیع نیرو در دپارتمان‌ها" icon={AccountTreeOutlinedIcon} color={BLUE}
    action={<Button size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => navigate('/dashboard?tab=people')}
      sx={{ minWidth: 0, px: 0.8, fontSize: 8.7 }}>جدول کامل</Button>}>
    {!data.length ? (
      <EmptyState icon={AccountTreeOutlinedIcon} text="دپارتمانی ثبت نشده است" color={BLUE} />
    ) : (
      <BarChart data={data} height={220} />
    )}
  </SurfaceCard>
);

const PerformancePanel = ({ data }) => (
  <SurfaceCard title="توزیع عملکرد" icon={TrendingUpOutlinedIcon} color={AMBER}>
    {!data.length ? <EmptyState icon={TrendingUpOutlinedIcon} text="امتیاز عملکردی ثبت نشده است" color={AMBER} />
      : <ColumnChart data={data} height={200} />}
  </SurfaceCard>
);

const EducationPanel = ({ data }) => (
  <SurfaceCard title="سطح تحصیلات" icon={SchoolOutlinedIcon} color={VIOLET}>
    {!data.length ? <EmptyState icon={SchoolOutlinedIcon} text="اطلاعات تحصیلی ثبت نشده است" color={VIOLET} />
      : <BarChart data={data} height={200} />}
  </SurfaceCard>
);

const CityPanel = ({ data }) => (
  <SurfaceCard title="پراکندگی جغرافیایی" icon={LocationCityOutlinedIcon} color={CYAN}>
    {!data.length ? <EmptyState icon={LocationCityOutlinedIcon} text="اطلاعات شهری ثبت نشده است" color={CYAN} />
      : <BarChart data={data} height={200} />}
  </SurfaceCard>
);

const PayrollPanel = ({ months, navigate }) => {
  const list = asArray(months);
  const latest = list[list.length - 1] || {};
  const hasData = list.some((month) => num(month.net) || num(month.benefits) || num(month.deductions) || num(month.employer_insurance));
  const series = [
    { key: 'net', label: 'خالص پرداختی', color: BLUE, data: list.map((month) => num(month.net)) },
    { key: 'benefits', label: 'مزایا', color: GREEN, data: list.map((month) => num(month.benefits)) },
    { key: 'deductions', label: 'کسورات', color: RED, data: list.map((month) => num(month.deductions)) },
    { key: 'insurance', label: 'بیمه کارفرما', color: AMBER, data: list.map((month) => num(month.employer_insurance)) },
  ];
  const latestItems = [
    { label: 'خالص پرداختی', value: latest.net, color: BLUE },
    { label: 'مزایا', value: latest.benefits, color: GREEN },
    { label: 'کسورات', value: latest.deductions, color: RED },
    { label: 'بیمه کارفرما', value: latest.employer_insurance, color: AMBER },
  ];

  return (
    <SurfaceCard title="روند هزینه حقوق و دستمزد" icon={ReceiptLongOutlinedIcon} color={BLUE}
      action={(
        <Stack direction="row" spacing={0.5} alignItems="center">
          {latest.label ? <Chip size="small" label={`آخرین ماه: ${latest.label}`}
            sx={{ height: 20, fontSize: 7.8, bgcolor: alpha(BLUE, 0.07), color: BLUE }} /> : null}
          <Button size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => navigate('/payslips')}
            sx={{ minWidth: 0, px: 0.6, fontSize: 8.6 }}>فیش‌ها</Button>
        </Stack>
      )}>
      {!hasData ? (
        <EmptyState icon={ReceiptLongOutlinedIcon} text="داده‌ای برای حقوق و دستمزد ثبت نشده است" color={BLUE} />
      ) : (
        <Stack spacing={1.2}>
          <Grid container spacing={1}>
            {latestItems.map((item) => (
              <Grid item xs={6} md={3} key={item.label}>
                <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha(item.color, 0.045), border: `1px solid ${alpha(item.color, 0.1)}` }}>
                  <Typography sx={{ fontSize: 8.2, color: MUTED }}>{item.label}</Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 900, color: item.color, direction: 'rtl' }}>
                    {formatPersianNumber(item.value)}
                    <Box component="span" sx={{ fontSize: 7.3, color: MUTED, mr: 0.3 }}>ریال</Box>
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <MultiLineChart series={series} labels={list.map((month) => month.label)} height={265} />
        </Stack>
      )}
    </SurfaceCard>
  );
};


const DashboardSkeleton = () => (
  <Box>
    <PageHeader icon={<DashboardOutlinedIcon />} title="داشبورد منابع انسانی"
      badge={<Chip size="small" label="نمای جامع مدیریتی" sx={{ height: 23, fontWeight: 800, bgcolor: alpha(BLUE, 0.08), color: BLUE }} />} />
    <Skeleton variant="rounded" height={154} sx={{ borderRadius: '18px', mb: 1.5 }} />
    <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
      {[0, 1, 2, 3].map((item) => (
        <Grid item xs={6} md={3} key={item}><Skeleton variant="rounded" height={132} sx={{ borderRadius: '16px' }} /></Grid>
      ))}
    </Grid>
    <Grid container spacing={1} sx={{ mb: 1.5 }}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
        <Grid item xs={6} md={3} key={item}><Skeleton variant="rounded" height={74} sx={{ borderRadius: '13px' }} /></Grid>
      ))}
    </Grid>
    <Skeleton variant="rounded" height={52} sx={{ borderRadius: '14px', mb: 1.5 }} />
    <Grid container spacing={1.5}>
      <Grid item xs={12} lg={7}><Skeleton variant="rounded" height={300} sx={{ borderRadius: '18px' }} /></Grid>
      <Grid item xs={12} lg={5}><Skeleton variant="rounded" height={300} sx={{ borderRadius: '18px' }} /></Grid>
      <Grid item xs={12}><Skeleton variant="rounded" height={260} sx={{ borderRadius: '18px' }} /></Grid>
    </Grid>
  </Box>
);


const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statsQ = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => axiosInstance.get('/dashboard/stats/').then((response) => response.data),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  const alertsQ = useQuery({ queryKey: ['dashboard-alerts'], queryFn: () => axiosInstance.get('/dashboard/alerts/').then((response) => response.data), staleTime: 60 * 1000 });
  const activitiesQ = useQuery({ queryKey: ['dashboard-activities'], queryFn: () => axiosInstance.get('/dashboard/recent-activities/').then((response) => response.data), staleTime: 60 * 1000 });
  const genderQ = useQuery({ queryKey: ['dashboard-gender'], queryFn: () => axiosInstance.get('/reports/employees-by-gender/').then((response) => response.data), staleTime: 60 * 1000 });
  const birthdaysQ = useQuery({ queryKey: ['dashboard-birthdays'], queryFn: () => axiosInstance.get('/reports/upcoming-birthdays/').then((response) => response.data), staleTime: 60 * 1000 });
  const kpisQ = useQuery({ queryKey: ['mgmt-kpis'], queryFn: () => axiosInstance.get('/management/kpis/').then((response) => response.data), staleTime: 60 * 1000 });
  const deptQ = useQuery({ queryKey: ['mgmt-dept'], queryFn: () => axiosInstance.get('/management/department-analytics/').then((response) => response.data), staleTime: 60 * 1000 });
  const costQ = useQuery({ queryKey: ['mgmt-cost'], queryFn: () => axiosInstance.get('/management/payroll-cost-trend/').then((response) => response.data), staleTime: 60 * 1000 });
  const eduQ = useQuery({ queryKey: ['mgmt-edu'], queryFn: () => axiosInstance.get('/management/education-distribution/').then((response) => response.data), staleTime: 60 * 1000 });
  const cityQ = useQuery({ queryKey: ['mgmt-city'], queryFn: () => axiosInstance.get('/management/city-distribution/').then((response) => response.data), staleTime: 60 * 1000 });
  const perfQ = useQuery({ queryKey: ['mgmt-perf'], queryFn: () => axiosInstance.get('/management/performance-distribution/').then((response) => response.data), staleTime: 60 * 1000 });
  const leaveQ = useQuery({ queryKey: ['mgmt-leave'], queryFn: () => axiosInstance.get('/management/leave-utilization/').then((response) => response.data), staleTime: 60 * 1000 });
  const assetsQ = useQuery({ queryKey: ['mgmt-assets'], queryFn: () => axiosInstance.get('/management/asset-inventory/').then((response) => response.data), staleTime: 60 * 1000 });
  const loansQ = useQuery({ queryKey: ['mgmt-loans'], queryFn: () => axiosInstance.get('/management/loan-summary/').then((response) => response.data), staleTime: 60 * 1000 });
  const absQ = useQuery({ queryKey: ['mgmt-abs'], queryFn: () => axiosInstance.get('/management/absenteeism-summary/').then((response) => response.data), staleTime: 60 * 1000 });

  const allQueries = [statsQ, alertsQ, activitiesQ, genderQ, birthdaysQ, kpisQ, deptQ, costQ, eduQ, cityQ, perfQ, leaveQ, assetsQ, loansQ, absQ];
  const initialLoading = statsQ.isLoading || kpisQ.isLoading || deptQ.isLoading;
  const refreshing = allQueries.some((query) => query.isFetching);
  const queryError = allQueries.find((query) => query.isError);


  const stats = statsQ.data || {};
  const kpis = kpisQ.data || {};
  const alerts = alertsQ.data || {};
  const activities = asArray(activitiesQ.data);
  const birthdays = asArray(birthdaysQ.data);
  const departments = asArray(deptQ.data);
  const costMonths = asArray(costQ.data?.months);
  const absMonths = asArray(absQ.data?.months);
  const leave = leaveQ.data || {};
  const loans = loansQ.data || {};
  const assets = assetsQ.data || {};

  const totalActive = num(kpis.total_active ?? stats.total_active);
  const newThisMonth = num(kpis.new_this_month ?? stats.new_this_month);
  const onLeave = num(stats.on_leave);
  const pendingApprovals = num(stats.pending_leave_requests) + num(stats.pending_hr_requests);
  const alertsTotal = num(alerts.total_alerts);
  const expiringContracts = num(stats.expiring_contracts);
  const expiredDocuments = num(stats.expired_documents);
  const totalDocuments = num(stats.total_documents);
  const turnover = num(kpis.turnover_ytd);
  const avgSalary = num(kpis.avg_salary);
  const avgPerformance = num(kpis.avg_performance);
  const avgSatisfaction = num(kpis.avg_satisfaction);
  const avgAge = num(kpis.avg_age);
  const avgTenure = num(kpis.avg_tenure_years);
  const activeLoans = num(loans.active_count);

  const genderRows = asArray(genderQ.data);
  const genderData = genderRows.length
    ? genderRows.map((row, index) => ({
      label: row.gender === 'male' ? 'مرد' : row.gender === 'female' ? 'زن' : (row.gender || 'نامشخص'),
      value: num(row.count),
      color: row.gender === 'male' ? '#3b82f6' : row.gender === 'female' ? '#ec4899' : [BLUE, PINK, TEAL, AMBER][index % 4],
    }))
    : (() => {
      const male = Math.round(totalActive * num(kpis.male_ratio) / 100);
      return [{ label: 'مرد', value: male, color: '#3b82f6' }, { label: 'زن', value: Math.max(0, totalActive - male), color: '#ec4899' }];
    })();
  const genderTotal = genderData.reduce((sum, item) => sum + num(item.value), 0);

  const departmentData = departments.slice(0, 6).map((row, index) => ({
    label: row.department,
    value: num(row.headcount),
    color: [BLUE, PINK, GREEN, AMBER, VIOLET, CYAN][index % 6],
  }));
  const performanceData = asArray(perfQ.data).map((row) => ({ label: row.label, value: num(row.count), color: row.color || BLUE }));
  const educationData = asArray(eduQ.data).map((row, index) => ({
    label: row.education,
    value: num(row.count),
    color: [BLUE, VIOLET, CYAN, GREEN, AMBER, PINK][index % 6],
  }));
  const cityData = asArray(cityQ.data).slice(0, 6).map((row, index) => ({
    label: row.city || 'نامشخص',
    value: num(row.count),
    color: [CYAN, BLUE, TEAL, VIOLET, GREEN, AMBER][index % 6],
  }));

  const tabParam = searchParams.get('tab');
  const activeTab = TABS.some((tab) => tab.key === tabParam) ? tabParam : 'overview';
  const changeTab = (_event, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'overview') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const refreshAll = () => {
    allQueries.forEach((query) => query.refetch());
  };

  const exportSummary = () => {
    const rows = [
      ['شاخص', 'مقدار'],
      ['پرسنل فعال', totalActive],
      ['استخدام این ماه', newThisMonth],
      ['در مرخصی', onLeave],
      ['در انتظار تأیید', pendingApprovals],
      ['هشدارهای فعال', alertsTotal],
      ['قراردادهای رو به انقضا', expiringContracts],
      ['مدارک منقضی', expiredDocuments],
      ['میانگین حقوق', avgSalary],
      ['میانگین عملکرد', avgPerformance],
      ['رضایت شغلی', avgSatisfaction],
      ['ترک خدمت سال', turnover],
      ['میانگین سن', avgAge],
      ['میانگین سابقه', avgTenure],
      ['وام فعال', activeLoans],
      [],
      ['دپارتمان', 'نفرات', 'میانگین حقوق', 'عملکرد', 'رضایت', 'سن', 'سابقه'],
      ...departments.map((row) => [row.department, row.headcount, row.avg_salary, row.avg_performance, row.avg_satisfaction, row.avg_age, row.avg_tenure_years]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hr-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  if (initialLoading) return <DashboardSkeleton />;


  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<DashboardOutlinedIcon />}
        title="داشبورد منابع انسانی"
        badge={(
          <Chip size="small" label="نمای جامع مدیریتی"
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(BLUE, 0.08), color: BLUE }} />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی همهٔ داده‌ها">
              <span>
                <Button variant="outlined" onClick={refreshAll} disabled={refreshing} sx={{ minWidth: 40, px: 1 }}>
                  {refreshing ? <CircularProgress size={17} /> : <RefreshOutlinedIcon fontSize="small" />}
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={exportSummary}>خروجی</Button>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>چاپ</Button>
          </>
        )}
      />

      {refreshing ? <LinearProgress sx={{ height: 2.5, borderRadius: 2, mb: 1, bgcolor: alpha(BLUE, 0.08) }} /> : null}
      {queryError ? (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: '11px', fontSize: 11 }}
          action={<Button size="small" onClick={refreshAll}>تلاش دوباره</Button>}>
          بخشی از داده‌های داشبورد دریافت نشد؛ سایر بخش‌ها قابل استفاده هستند.
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{
        p: { xs: 1.6, md: 2 }, mb: 1.5, borderRadius: '18px',
        border: '1px solid #e6ebf5', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(236,72,153,0.055) 45%, rgba(14,116,144,0.055) 100%), #fff',
        '&::after': {
          content: '""', position: 'absolute', width: 230, height: 230, borderRadius: '50%',
          top: -140, left: -70, bgcolor: alpha(BLUE, 0.055),
        },
      }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 16, md: 19 }, fontWeight: 900, color: INK, letterSpacing: '-0.02em' }}>
              سرمایه انسانی در یک نگاه
            </Typography>
            <Typography sx={{ mt: 0.3, fontSize: 9.8, color: MUTED }}>
              وضعیت جاری پرسنل، درخواست‌ها و هشدارهای سازمان.
            </Typography>
            <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip size="small" label={`${formatPersianNumber(totalActive)} نفر فعال`}
                sx={{ height: 21, fontSize: 8, fontWeight: 800, bgcolor: alpha(BLUE, 0.07), color: BLUE }} />
              <Chip size="small" label={`${formatPersianNumber(onLeave)} در مرخصی`}
                sx={{ height: 21, fontSize: 8, fontWeight: 800, bgcolor: alpha(AMBER, 0.07), color: AMBER }} />
              <Chip size="small" label={`${formatPersianNumber(pendingApprovals)} در انتظار تأیید`}
                sx={{ height: 21, fontSize: 8, fontWeight: 800, bgcolor: alpha(VIOLET, 0.07), color: VIOLET }} />
              <Chip size="small" label={`${formatPersianNumber(alertsTotal)} هشدار فعال`}
                sx={{ height: 21, fontSize: 8, fontWeight: 800, bgcolor: alpha(RED, 0.07), color: RED }} />
            </Stack>
          </Box>

          <Box sx={{
            width: { xs: '100%', lg: 324 }, flexShrink: 0,
            display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.7,
          }}>
            {QUICK_ACTIONS.map((action) => (
              <QuickAction key={action.path} action={action} onClick={() => navigate(action.path)} />
            ))}
          </Box>
        </Stack>
      </Paper>


      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PeopleAltOutlinedIcon} label="پرسنل فعال" value={formatPersianNumber(totalActive)}
            suffix="نفر" hint={`${formatPersianNumber(onLeave)} نفر در مرخصی`} color={BLUE}
            onClick={() => navigate('/employees')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PersonAddAltOutlinedIcon} label="استخدام این ماه" value={formatPersianNumber(newThisMonth)}
            suffix="نفر" hint={`${formatPersianNumber(turnover)} ترک خدمت از ابتدای سال`} color={GREEN}
            onClick={() => navigate('/employees')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PendingActionsOutlinedIcon} label="در انتظار تأیید" value={formatPersianNumber(pendingApprovals)}
            suffix="درخواست" hint="مرخصی و درخواست‌های اداری" color={AMBER}
            onClick={() => navigate('/leaves')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={WarningAmberOutlinedIcon} label="هشدارهای نیازمند اقدام" value={formatPersianNumber(alertsTotal)}
            suffix="مورد" hint={`${formatPersianNumber(expiredDocuments)} مدرک منقضی`} color={RED}
            onClick={() => navigate('/documents')} />
        </Grid>
      </Grid>

      <Grid container spacing={1} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <MiniMetric icon={PaymentsOutlinedIcon} label="میانگین حقوق" value={formatPersianNumber(avgSalary)}
            suffix="ریال" hint="آخرین فیش ثبت‌شده" color={TEAL} onClick={() => navigate('/payslips')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <MiniMetric icon={TrendingUpOutlinedIcon} label="میانگین عملکرد" value={formatPersianNumber(avgPerformance)}
            suffix="/ ۱۰۰" hint="امتیاز عملکرد پرسنل" color={AMBER} onClick={() => navigate('/appraisal')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <MiniMetric icon={FactCheckOutlinedIcon} label="رضایت شغلی" value={formatPersianNumber(avgSatisfaction)}
            suffix="/ ۱۰۰" hint="میانگین رضایت ثبت‌شده" color={VIOLET} />
        </Grid>
        <Grid item xs={6} md={3}>
          <MiniMetric icon={TrendingDownOutlinedIcon} label="ترک خدمت سال" value={formatPersianNumber(turnover)}
            suffix="نفر" hint="خروج و بازنشستگی امسال" color={RED} />
        </Grid>
        <Grid item xs={6} md={3}>
          <MiniMetric icon={CakeOutlinedIcon} label="میانگین سن" value={formatPersianNumber(avgAge)}
            suffix="سال" hint="سن نیروی انسانی فعال" color={CYAN} />
        </Grid>
        <Grid item xs={6} md={3}>
          <MiniMetric icon={WorkOutlineOutlinedIcon} label="میانگین سابقه" value={formatPersianNumber(avgTenure)}
            suffix="سال" hint="سابقهٔ کارکنان فعال" color={BLUE} />
        </Grid>
        <Grid item xs={6} md={3}>
          <MiniMetric icon={AccountBalanceWalletOutlinedIcon} label="وام فعال" value={formatPersianNumber(activeLoans)}
            suffix="مورد" hint={`${formatPersianNumber(loans.total_amount)} ریال مانده`} color={PINK} onClick={() => navigate('/loans')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <MiniMetric icon={FolderOutlinedIcon} label="مدارک سازمان" value={formatPersianNumber(totalDocuments)}
            suffix="سند" hint={`${formatPersianNumber(expiringContracts)} قرارداد رو به انقضا`} color={GREEN} onClick={() => navigate('/documents')} />
        </Grid>
      </Grid>


      <Paper elevation={0} sx={{ p: 0.65, mb: 1.5, borderRadius: '14px', border: '1px solid #e8edf4', bgcolor: '#fff' }}>
        <Tabs
          value={activeTab}
          onChange={changeTab}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 38,
            '& .MuiTabs-indicator': { height: 2.5, borderRadius: 2, bgcolor: BLUE },
            '& .MuiTab-root': {
              minHeight: 38, py: 0.35, px: 1.5, fontSize: 10.2, fontWeight: 800,
              color: MUTED, gap: 0.5,
              '&.Mui-selected': { color: BLUE },
            },
            '& .MuiTab-iconWrapper': { mb: '0 !important' },
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return <Tab key={tab.key} value={tab.key} icon={<Icon sx={{ fontSize: 17 }} />} iconPosition="start" label={tab.label} />;
          })}
        </Tabs>
      </Paper>

      {activeTab === 'overview' ? (
        <Grid container spacing={1.5}>
          <Grid item xs={12} lg={7}><AlertCenter alerts={alerts} navigate={navigate} /></Grid>
          <Grid item xs={12} lg={5}><ActivityFeed activities={activities} /></Grid>
          <Grid item xs={12} md={5}><BirthdayPanel birthdays={birthdays} navigate={navigate} /></Grid>
          <Grid item xs={12} md={7}><GenderPanel data={genderData} total={genderTotal} /></Grid>
          <Grid item xs={12}><DepartmentDistribution data={departmentData} navigate={navigate} /></Grid>
          <Grid item xs={12}><AttendancePanel months={absMonths} /></Grid>
        </Grid>
      ) : null}

      {activeTab === 'people' ? (
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}><PerformancePanel data={performanceData} /></Grid>
          <Grid item xs={12} md={4}><EducationPanel data={educationData} /></Grid>
          <Grid item xs={12} md={4}><CityPanel data={cityData} /></Grid>
          <Grid item xs={12}><DepartmentTable rows={departments} /></Grid>
        </Grid>
      ) : null}

      {activeTab === 'finance' ? (
        <Grid container spacing={1.5}>
          <Grid item xs={12}><PayrollPanel months={costMonths} navigate={navigate} /></Grid>
          <Grid item xs={12} md={5}><LoansPanel loans={loans} navigate={navigate} /></Grid>
          <Grid item xs={12} md={7}><LeavePanel leave={leave} navigate={navigate} /></Grid>
          <Grid item xs={12}><AssetsPanel assets={assets} /></Grid>
        </Grid>
      ) : null}
    </Box>
  );
};

export default DashboardPage;
