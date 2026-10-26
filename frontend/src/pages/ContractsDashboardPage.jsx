import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Divider, Grid,
  InputAdornment, MenuItem, Paper, Skeleton, Stack, TextField, Typography, alpha,
} from '@mui/material';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import DataTable from '../core/components/ui/DataTable';
import { KpiTile, ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import { BarChart, ColumnChart, DonutChart } from '../core/components/charts/Charts';
import { formatPersianNumber, formatPersianPercent, toPersianDigits } from '../core/utils/numberUtils';
import { getJalaliParts, toJalali } from '../core/utils/dateUtils';
import {
  CONTRACT_STATUS_LABELS as STATUS_LABELS,
  CONTRACT_STATUS_COLORS as STATUS_COLORS,
  CONTRACT_TYPE_LABELS as TYPE_LABELS,
  currencyLabel,
} from '../core/theme/tokens';

const AMBER = '#d97706';
const BLUE = '#4f46e5';
const GREEN = '#059669';
const RED = '#be123c';
const CYAN = '#0e7490';
const VIOLET = '#7c3aed';
const PINK = '#be185d';
const SLATE = '#475569';
const PALETTE = [AMBER, GREEN, BLUE, CYAN, VIOLET, PINK, '#ea580c', '#0f766e'];

const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const asArray = (value) => (Array.isArray(value) ? value : []);
const statusLabel = (status) => STATUS_LABELS[status] || status || '—';
const statusColor = (status) => STATUS_COLORS[status] || SLATE;

const compactMoney = (value) => {
  const amount = num(value);
  if (Math.abs(amount) >= 1_000_000_000_000) return `${formatPersianNumber((amount / 1_000_000_000_000).toFixed(1))} هزار میلیارد`;
  if (Math.abs(amount) >= 1_000_000_000) return `${formatPersianNumber((amount / 1_000_000_000).toFixed(1))} میلیارد`;
  if (Math.abs(amount) >= 1_000_000) return `${formatPersianNumber((amount / 1_000_000).toFixed(1))} میلیون`;
  return formatPersianNumber(amount);
};

const effectiveEnd = (contract) => {
  if (contract?.effective_end_date) return contract.effective_end_date;
  const withEnd = asArray(contract?.addendums).filter((addendum) => addendum.new_end_date);
  const last = withEnd.length ? withEnd.reduce((latest, addendum) => (addendum.date > latest.date ? addendum : latest)) : null;
  return last?.new_end_date || contract?.end_date || null;
};

const effectiveAmount = (contract) => {
  if (contract?.effective_amount !== null && contract?.effective_amount !== undefined) return num(contract.effective_amount);
  const base = num(contract?.amount);
  const changes = asArray(contract?.addendums).reduce((sum, addendum) => sum + num(addendum.amount_change), 0);
  return base + changes;
};

const daysUntil = (date) => {
  if (!date) return null;
  const target = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target - today) / 86400000);
};

const daysChip = (days) => {
  if (days === null) return { label: '—', color: MUTED };
  if (days < 0) return { label: `${toPersianDigits(Math.abs(days))} روز گذشته`, color: RED };
  if (days === 0) return { label: 'امروز', color: RED };
  if (days <= 14) return { label: `${toPersianDigits(days)} روز`, color: RED };
  if (days <= 30) return { label: `${toPersianDigits(days)} روز`, color: AMBER };
  return { label: `${toPersianDigits(days)} روز`, color: GREEN };
};

const EmptyState = ({ icon: Icon = HandshakeOutlinedIcon, text, hint, color = MUTED }) => (
  <Box sx={{ py: 4.5, textAlign: 'center' }}>
    <Icon sx={{ fontSize: 30, color: alpha(color, 0.55), mb: 0.7 }} />
    <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{text}</Typography>
    {hint ? <Typography sx={{ mt: 0.35, fontSize: 12, color: MUTED }}>{hint}</Typography> : null}
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
      <Typography sx={{ fontSize: 12, color: MUTED }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: INK, lineHeight: 1.35 }}>
        {value}
        {suffix ? <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: MUTED, mr: 0.4 }}>{suffix}</Box> : null}
      </Typography>
      {hint ? <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{hint}</Typography> : null}
    </Box>
  </Paper>
);

const ActionTile = ({ icon: Icon, label, caption, color, onClick }) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      p: 1.15, borderRadius: '13px', gap: 0.85, justifyContent: 'flex-start',
      bgcolor: 'rgba(255,255,255,0.88)', border: '1px solid #e6ebf3', minWidth: 0,
      transition: 'border-color .18s ease, background-color .18s ease',
      '&:hover': { borderColor: alpha(color, 0.42), bgcolor: alpha(color, 0.04) },
    }}
  >
    <Box sx={{
      width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
      bgcolor: alpha(color, 0.09), color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon sx={{ fontSize: 17 }} />
    </Box>
    <Box sx={{ minWidth: 0, textAlign: 'right' }}>
      <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{label}</Typography>
      <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>{caption}</Typography>
    </Box>
  </ButtonBase>
);

const StatusPanel = ({ data, total }) => (
  <SurfaceCard title="وضعیت قراردادها" icon={InsightsOutlinedIcon} color={AMBER}>
    {!total || !data.length ? (
      <EmptyState icon={HandshakeOutlinedIcon} text="قراردادی ثبت نشده است" color={AMBER} />
    ) : (
      <DonutChart data={data} size={138} thickness={21} centerLabel="قرارداد" />
    )}
  </SurfaceCard>
);

const TypePanel = ({ data }) => (
  <SurfaceCard title="ترکیب انواع قرارداد" icon={DescriptionOutlinedIcon} color={BLUE}>
    {!data.length ? (
      <EmptyState icon={DescriptionOutlinedIcon} text="نوع قراردادی ثبت نشده است" color={BLUE} />
    ) : <BarChart data={data} height={210} />}
  </SurfaceCard>
);

const TrendPanel = ({ data }) => (
  <SurfaceCard title="روند ماهانه قراردادها" icon={TrendingUpOutlinedIcon} color={CYAN}
    action={<Chip size="small" label="۶ ماه اخیر" sx={{ height: 20, fontSize: 12, bgcolor: alpha(CYAN, 0.07), color: CYAN }} />}>
    {!data.some((item) => item.value > 0) ? (
      <EmptyState icon={TrendingUpOutlinedIcon} text="داده‌ای برای روند ثبت نشده است" color={CYAN} />
    ) : <ColumnChart data={data} height={210} />}
  </SurfaceCard>
);


const ExpiringPanel = ({ contracts, navigate }) => (
  <SurfaceCard title="قراردادهای رو به انقضا" icon={EventBusyOutlinedIcon} color={RED}
    action={(
      <Button size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => navigate('/contracts-expiring')}
        sx={{ minWidth: 0, px: 0.8, fontSize: 12 }}>مشاهده همه</Button>
    )}>
    {!contracts.length ? (
      <EmptyState icon={CheckCircleOutlineIcon} text="قرارداد نزدیک به انقضا وجود ندارد"
        hint="همهٔ قراردادهای فعال در وضعیت امن هستند." color={GREEN} />
    ) : (
      <Stack spacing={0.55}>
        {contracts.slice(0, 7).map((contract) => {
          const end = effectiveEnd(contract);
          const days = daysUntil(end);
          const chip = daysChip(days);
          return (
            <ButtonBase
              key={contract.id}
              onClick={() => navigate(`/external-contracts/${contract.id}`)}
              sx={{
                width: '100%', p: 0.8, borderRadius: '10px', gap: 0.8, textAlign: 'right',
                justifyContent: 'flex-start', border: '1px solid #f1e9e9',
                '&:hover': { bgcolor: alpha(chip.color, 0.035), borderColor: alpha(chip.color, 0.22) },
              }}
            >
              <Box sx={{
                width: 29, height: 29, borderRadius: '8px', flexShrink: 0,
                bgcolor: alpha(chip.color, 0.08), color: chip.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <EventBusyOutlinedIcon sx={{ fontSize: 15 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{contract.subject}</Typography>
                <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>
                  {contract.party_name || '—'} · پایان {toJalali(end)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'left', flexShrink: 0 }}>
                <Chip size="small" label={chip.label}
                  sx={{ height: 19, fontSize: 12, fontWeight: 800, bgcolor: alpha(chip.color, 0.08), color: chip.color }} />
                <Typography sx={{ mt: 0.15, fontSize: 12, color: MUTED }}>
                  {compactMoney(effectiveAmount(contract))} {currencyLabel(contract)}
                </Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Stack>
    )}
  </SurfaceCard>
);


const FinancePanel = ({ invoiced, paid, outstanding, collectionRate, guarantees, guaranteeCount, overdue, sourceCount, navigate }) => (
  <SurfaceCard title="سلامت مالی پرونده‌ها" icon={AccountBalanceWalletOutlinedIcon} color={GREEN}
    action={(
      <Button size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => navigate('/external-contracts')}
        sx={{ minWidth: 0, px: 0.8, fontSize: 12 }}>پرونده‌ها</Button>
    )}>
    <Stack spacing={1.2}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.4 }}>
          <Typography sx={{ fontSize: 12, color: MUTED }}>نرخ وصول پرداخت‌ها</Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: collectionRate >= 70 ? GREEN : collectionRate >= 40 ? AMBER : RED }}>
            {formatPersianPercent(collectionRate)}
          </Typography>
        </Stack>
        <ProgressBar value={Math.min(100, collectionRate)} color={collectionRate >= 70 ? GREEN : collectionRate >= 40 ? AMBER : RED} height={7} />
      </Box>
      <Grid container spacing={0.8}>
        <Grid item xs={6}>
          <Box sx={{ p: 0.9, borderRadius: '10px', bgcolor: alpha(BLUE, 0.045), border: `1px solid ${alpha(BLUE, 0.1)}` }}>
            <Typography sx={{ fontSize: 12, color: MUTED }}>صورت‌وضعیت / فاکتور</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: BLUE }}>{compactMoney(invoiced)} <Box component="span" sx={{ fontSize: 12, color: MUTED }}>ریال</Box></Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ p: 0.9, borderRadius: '10px', bgcolor: alpha(GREEN, 0.045), border: `1px solid ${alpha(GREEN, 0.1)}` }}>
            <Typography sx={{ fontSize: 12, color: MUTED }}>پرداخت‌شده</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: GREEN }}>{compactMoney(paid)} <Box component="span" sx={{ fontSize: 12, color: MUTED }}>ریال</Box></Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ p: 0.9, borderRadius: '10px', bgcolor: alpha(AMBER, 0.045), border: `1px solid ${alpha(AMBER, 0.1)}` }}>
            <Typography sx={{ fontSize: 12, color: MUTED }}>مانده تسویه</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: AMBER }}>{compactMoney(outstanding)} <Box component="span" sx={{ fontSize: 12, color: MUTED }}>ریال</Box></Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ p: 0.9, borderRadius: '10px', bgcolor: alpha(VIOLET, 0.045), border: `1px solid ${alpha(VIOLET, 0.1)}` }}>
            <Typography sx={{ fontSize: 12, color: MUTED }}>تضامین فعال</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: VIOLET }}>{compactMoney(guarantees)} <Box component="span" sx={{ fontSize: 12, color: MUTED }}>ریال</Box></Typography>
          </Box>
        </Grid>
      </Grid>
      <Divider />
      <Stack direction="row" alignItems="center" spacing={0.6} useFlexGap flexWrap="wrap">
        <Chip size="small" label={`${formatPersianNumber(guaranteeCount)} تضمین فعال`}
          sx={{ height: 19, fontSize: 12, bgcolor: alpha(VIOLET, 0.07), color: VIOLET }} />
        <Chip size="small" label={`${formatPersianNumber(overdue)} فاکتور معوق`}
          sx={{ height: 19, fontSize: 12, bgcolor: alpha(overdue ? RED : GREEN, 0.07), color: overdue ? RED : GREEN }} />
        <Typography sx={{ fontSize: 12, color: MUTED }}>
          بر پایه {formatPersianNumber(sourceCount)} قرارداد بارگذاری‌شده
        </Typography>
      </Stack>
    </Stack>
  </SurfaceCard>
);


const TopPartiesPanel = ({ data, totalAmount, navigate }) => (
  <SurfaceCard title="پیمانکاران و تأمین‌کنندگان کلیدی" icon={StorefrontOutlinedIcon} color={CYAN}
    action={(
      <Button size="small" endIcon={<ArrowForwardOutlinedIcon />} onClick={() => navigate('/contract-parties')}
        sx={{ minWidth: 0, px: 0.8, fontSize: 12 }}>طرف‌ها</Button>
    )}>
    {!data.length ? (
      <EmptyState icon={StorefrontOutlinedIcon} text="طرف قراردادی ثبت نشده است" color={CYAN} />
    ) : (
      <Stack spacing={0.9}>
        {data.map((party, index) => (
          <Box key={party.name}>
            <Stack direction="row" alignItems="center" spacing={0.7} sx={{ mb: 0.3 }}>
              <Box sx={{
                width: 24, height: 24, borderRadius: '7px', flexShrink: 0,
                bgcolor: alpha(PALETTE[index % PALETTE.length], 0.08),
                color: PALETTE[index % PALETTE.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900,
              }}>{party.name.trim()?.charAt(0) || '?'}</Box>
              <Typography noWrap sx={{ flex: 1, fontSize: 12, fontWeight: 800, color: INK }}>{party.name}</Typography>
              <Typography sx={{ fontSize: 12, color: MUTED }}>{formatPersianNumber(party.count)} قرارداد</Typography>
              <Typography sx={{ fontSize: 12, color: CYAN, fontWeight: 800 }}>{compactMoney(party.amount)}</Typography>
            </Stack>
            <ProgressBar value={totalAmount ? (party.amount / totalAmount) * 100 : 0}
              color={PALETTE[index % PALETTE.length]} height={4} />
          </Box>
        ))}
      </Stack>
    )}
  </SurfaceCard>
);


const ContractTable = ({ contracts, navigate }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = asArray(contracts).filter((contract) => {
      if (status && contract.status !== status) return false;
      if (!query) return true;
      return [contract.subject, contract.party_name, contract.number, contract.contract_type_master_name]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'amount') return effectiveAmount(b) - effectiveAmount(a);
      if (sort === 'end') {
        const aEnd = effectiveEnd(a) ? new Date(effectiveEnd(a)).getTime() : Number.MAX_SAFE_INTEGER;
        const bEnd = effectiveEnd(b) ? new Date(effectiveEnd(b)).getTime() : Number.MAX_SAFE_INTEGER;
        return aEnd - bEnd;
      }
      return new Date(b.created_at || b.signing_date || 0) - new Date(a.created_at || a.signing_date || 0);
    });
  }, [contracts, search, status, sort]);

  const exportCsv = () => {
    const header = ['شماره', 'موضوع', 'طرف قرارداد', 'نوع', 'وضعیت', 'مبلغ مؤثر', 'واحد ارز', 'تاریخ پایان مؤثر'];
    const body = rows.map((contract) => [
      contract.number || '', contract.subject || '', contract.party_name || '',
      contract.contract_type_master_name || TYPE_LABELS[contract.contract_type] || '',
      statusLabel(contract.status), effectiveAmount(contract), currencyLabel(contract),
      effectiveEnd(contract) || '',
    ]);
    const csv = [header, ...body]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contracts-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };


  return (
    <SurfaceCard title="قراردادهای اخیر" icon={HandshakeOutlinedIcon} color={AMBER}
      action={(
        <Button size="small" startIcon={<DownloadOutlinedIcon />} onClick={exportCsv}
          sx={{ minWidth: 0, px: 0.8, fontSize: 12 }}>خروجی</Button>
      )}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} sx={{ mb: 1.1 }}>
        <TextField
          size="small"
          placeholder="جست‌وجوی موضوع، طرف یا شماره…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchOutlinedIcon sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment>,
          }}
          sx={{ width: { xs: '100%', md: 300 }, '& .MuiOutlinedInput-root': { height: 33, borderRadius: '9px', fontSize: 12 } }}
        />
        <TextField select size="small" label="وضعیت" value={status}
          onChange={(event) => setStatus(event.target.value)}
          sx={{ width: { xs: '100%', md: 150 }, '& .MuiOutlinedInput-root': { height: 33, borderRadius: '9px', fontSize: 12 } }}>
          <MenuItem value="">همه وضعیت‌ها</MenuItem>
          {Object.entries(STATUS_LABELS).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="مرتب‌سازی" value={sort}
          onChange={(event) => setSort(event.target.value)}
          sx={{ width: { xs: '100%', md: 160 }, '& .MuiOutlinedInput-root': { height: 33, borderRadius: '9px', fontSize: 12 } }}>
          <MenuItem value="newest">جدیدترین</MenuItem>
          <MenuItem value="end">نزدیک‌ترین پایان</MenuItem>
          <MenuItem value="amount">بیشترین مبلغ</MenuItem>
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12, color: MUTED }}>
          {formatPersianNumber(rows.length)} قرارداد
        </Typography>
      </Stack>

      {!rows.length ? (
        <EmptyState icon={HandshakeOutlinedIcon} text="قراردادی مطابق فیلتر پیدا نشد"
          hint="فیلترها یا عبارت جست‌وجو را تغییر دهید." color={AMBER} />
      ) : (
        <>
          <DataTable
            rows={rows.slice(0, 12)}
            getRowId={(contract) => contract.id}
            onRowClick={(contract) => navigate(`/external-contracts/${contract.id}`)}
            maxHeight={480}
            stickyHeader
            ariaLabel="قراردادهای اخیر"
            paperSx={{
              borderRadius: 'var(--hrms-radius-medium, 10px)',
              border: 'var(--hrms-border-table, 1px solid #eef2f7)',
              boxShadow: 'none',
            }}
            tableSx={{
              '& th': { bgcolor: SOFT_BG, borderBottom: '1px solid #e8edf4', py: 0.75 },
              '& td': { py: 0.75, borderBottom: '1px solid #f2f5f9' },
            }}
            columns={[
              {
                key: 'subject',
                label: 'موضوع / طرف قرارداد',
                render: (contract) => (
                  <>
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{contract.subject}</Typography>
                    <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>
                      {contract.party_name || '—'}{contract.number ? ` · ${contract.number}` : ''}
                    </Typography>
                  </>
                ),
              },
              {
                key: 'type',
                label: 'نوع',
                render: (contract) => (
                  <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>
                    {contract.contract_type_master_name || TYPE_LABELS[contract.contract_type] || '—'}
                  </Typography>
                ),
              },
              {
                key: 'status',
                label: 'وضعیت',
                align: 'center',
                render: (contract) => (
                  <Chip size="small" label={statusLabel(contract.status)}
                    sx={{ height: 19, fontSize: 12, fontWeight: 800, bgcolor: alpha(statusColor(contract.status), 0.08), color: statusColor(contract.status) }} />
                ),
              },
              {
                key: 'amount',
                label: 'مبلغ مؤثر',
                align: 'center',
                render: (contract) => (
                  <>
                    <Typography sx={{ fontSize: 12, color: INK, fontWeight: 800 }}>{compactMoney(effectiveAmount(contract))}</Typography>
                    <Typography sx={{ fontSize: 12, color: MUTED }}>{currencyLabel(contract)}</Typography>
                  </>
                ),
              },
              {
                key: 'end',
                label: 'پایان مؤثر',
                align: 'center',
                render: (contract) => (
                  <Typography sx={{ fontSize: 12, color: INK }}>{toJalali(effectiveEnd(contract))}</Typography>
                ),
              },
              {
                key: 'timing',
                label: 'زمان‌بندی',
                align: 'center',
                render: (contract) => {
                  const days = daysUntil(effectiveEnd(contract));
                  const chip = daysChip(days);
                  const showDays = contract.status === 'active' && days !== null;
                  return showDays ? (
                    <Chip size="small" label={chip.label}
                      sx={{ height: 19, fontSize: 12, fontWeight: 800, bgcolor: alpha(chip.color, 0.07), color: chip.color }} />
                  ) : <Typography sx={{ fontSize: 12, color: MUTED }}>—</Typography>;
                },
              },
            ]}
          />
          {rows.length > 12 ? (
            <Typography sx={{ mt: 0.8, fontSize: 12, color: MUTED, textAlign: 'left' }}>
              نمایش ۱۲ مورد از {formatPersianNumber(rows.length)} قرارداد
            </Typography>
          ) : null}
        </>
      )}
    </SurfaceCard>
  );
};


const ContractsDashboardPage = () => {
  const navigate = useNavigate();

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
  const items = Array.isArray(raw) ? raw : raw?.results || [];
  const stats = statsQuery.data || {};
  const isLoading = contractsQuery.isLoading || statsQuery.isLoading;
  const refreshing = contractsQuery.isFetching || statsQuery.isFetching;
  const hasError = contractsQuery.isError || statsQuery.isError;

  const data = useMemo(() => {
    const localStatus = items.reduce((acc, contract) => {
      const key = contract.status || 'draft';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const statusCounts = Object.keys(stats.status_counts || {}).length ? stats.status_counts : localStatus;
    const statusData = Object.entries(STATUS_LABELS)
      .map(([key, label]) => ({ label, value: num(statusCounts[key]), color: STATUS_COLORS[key] }))
      .filter((entry) => entry.value > 0);

    const localTypes = items.reduce((acc, contract) => {
      const key = contract.contract_type_master_name || TYPE_LABELS[contract.contract_type] || 'سایر';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const typeSource = Object.keys(stats.type_counts || {}).length ? stats.type_counts : localTypes;
    const typeData = Object.entries(typeSource)
      .map(([label, value], index) => ({ label, value: num(value), color: PALETTE[index % PALETTE.length] }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const localProjects = items.reduce((acc, contract) => {
      const key = contract.project_title || contract.project_name || 'بدون پروژه';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const projectSource = Object.keys(stats.project_counts || {}).length ? stats.project_counts : localProjects;
    const projectData = Object.entries(projectSource)
      .map(([label, value], index) => ({ label, value: num(value), color: PALETTE[(index + 2) % PALETTE.length] }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    const invoices = items.flatMap((contract) => asArray(contract.invoices).map((invoice) => ({ ...invoice, contract })));
    const payments = items.flatMap((contract) => asArray(contract.payments).map((payment) => ({ ...payment, contract })));
    const statements = items.flatMap((contract) => asArray(contract.statements).map((statement) => ({ ...statement, contract })));
    const guarantees = items.flatMap((contract) => asArray(contract.guarantees).map((guarantee) => ({ ...guarantee, contract })));
    const activeGuarantees = guarantees.filter((guarantee) => !guarantee.is_released);

    const totalAmount = num(stats.total_amount) || items.reduce((sum, contract) => sum + effectiveAmount(contract), 0);
    const activeAmount = items.filter((contract) => contract.status === 'active')
      .reduce((sum, contract) => sum + effectiveAmount(contract), 0);
    const invoiced = invoices.reduce((sum, invoice) => sum + num(invoice.total ?? invoice.amount), 0);
    const statementAmount = statements.reduce((sum, statement) => sum + num(statement.net_amount ?? statement.amount), 0);
    const paid = payments.reduce((sum, payment) => sum + num(payment.amount), 0);
    const guaranteeAmount = activeGuarantees.reduce((sum, guarantee) => sum + num(guarantee.amount), 0);
    const collectionRate = invoiced > 0 ? (paid / invoiced) * 100 : 0;
    const overdue = invoices.filter((invoice) => (
      !invoice.is_paid && invoice.due_date && num(daysUntil(invoice.due_date)) < 0
    )).length;

    const expiring = items
      .map((contract) => ({ contract, end: effectiveEnd(contract), days: daysUntil(effectiveEnd(contract)) }))
      .filter((entry) => entry.days !== null && entry.days >= 0 && entry.days <= 60)
      .sort((a, b) => a.days - b.days)
      .map((entry) => entry.contract);

    const partyMap = items.reduce((acc, contract) => {
      const name = contract.party_name || 'بدون طرف قرارداد';
      if (!acc[name]) acc[name] = { name, count: 0, amount: 0 };
      acc[name].count += 1;
      acc[name].amount += effectiveAmount(contract);
      return acc;
    }, {});
    const topParties = Object.values(partyMap).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const partyMax = Math.max(...topParties.map((party) => party.amount), 1);

    const monthlyData = [];
    const today = new Date();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const jalali = getJalaliParts(monthDate.toISOString().slice(0, 10));
      const label = jalali ? JALALI_MONTHS[jalali[1] - 1] : key;
      monthlyData.push({
        label,
        value: items.filter((contract) => String(contract.start_date || '').slice(0, 7) === key).length,
        color: PALETTE[(5 - offset) % PALETTE.length],
      });
    }

    return {
      topParties,
      partyMax,
      monthlyData,
      partyCount: Object.keys(partyMap).length,
      statusCounts,
      statusData,
      typeData,
      projectData,
      expiring,
      totalAmount,
      activeAmount,
      averageAmount: items.length ? totalAmount / items.length : 0,
      invoiced,
      statementAmount,
      paid,
      outstanding: Math.max(0, invoiced - paid),
      collectionRate,
      guaranteeAmount,
      guaranteeCount: activeGuarantees.length,
      overdue,
      expiringCount: num(stats.expiring) || expiring.length,
      addendumCount: items.reduce((sum, contract) => sum + asArray(contract.addendums).length, 0),
      documentCount: items.reduce((sum, contract) => sum + asArray(contract.documents).length, 0),
    };
  }, [items, stats]);


  const counters = data.statusCounts;
  const totalCount = num(stats.total) || items.length;

  const refreshAll = () => {
    contractsQuery.refetch();
    statsQuery.refetch();
  };

  const exportSummary = () => {
    const rows = [
      ['شاخص', 'مقدار'],
      ['کل قراردادها', totalCount],
      ['در حال اجرا', num(counters.active)],
      ['تکمیل‌شده', num(counters.completed)],
      ['رو به انقضا (۶۰ روز)', data.expiringCount],
      ['مبلغ کل قراردادها', data.totalAmount],
      ['مبلغ در حال اجرا', data.activeAmount],
      ['صورت‌وضعیت / فاکتور', data.invoiced],
      ['پرداخت‌شده', data.paid],
      ['مانده تسویه', data.outstanding],
      ['تضامین فعال', data.guaranteeAmount],
      [],
      ['موضوع', 'طرف قرارداد', 'وضعیت', 'مبلغ مؤثر', 'پایان مؤثر'],
      ...items.map((contract) => [
        contract.subject || '', contract.party_name || '', statusLabel(contract.status),
        effectiveAmount(contract), effectiveEnd(contract) || '',
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
        <PageHeader icon={<HandshakeOutlinedIcon />} title="داشبورد قراردادها" />
        <Skeleton variant="rounded" height={154} sx={{ borderRadius: '18px', mb: 1.5 }} />
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          {[0, 1, 2, 3].map((item) => (
            <Grid item xs={6} md={3} key={item}><Skeleton variant="rounded" height={132} sx={{ borderRadius: '16px' }} /></Grid>
          ))}
        </Grid>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}><Skeleton variant="rounded" height={280} sx={{ borderRadius: '18px' }} /></Grid>
          <Grid item xs={12} md={8}><Skeleton variant="rounded" height={280} sx={{ borderRadius: '18px' }} /></Grid>
        </Grid>
      </Box>
    );
  }


  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<HandshakeOutlinedIcon />}
        title="داشبورد قراردادها"
        badge={(
          <Chip size="small" label="مرکز کنترل پرتفوی"
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(AMBER, 0.08), color: AMBER }} />
        )}
        actions={(
          <>
            <Button variant="outlined" onClick={refreshAll} disabled={refreshing} sx={{ minWidth: 40, px: 1 }}>
              {refreshing ? <CircularProgress size={17} /> : <RefreshOutlinedIcon fontSize="small" />}
            </Button>
            <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={exportSummary}>خروجی</Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/contracts/new')}
              sx={{ bgcolor: '#b45309', '&:hover': { bgcolor: '#92400e' } }}>
              قرارداد جدید
            </Button>
          </>
        )}
      />

      {hasError ? (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: '11px', fontSize: 12 }}
          action={<Button size="small" onClick={refreshAll}>تلاش دوباره</Button>}>
          بخشی از داده‌های قراردادها دریافت نشد؛ سایر بخش‌ها قابل استفاده هستند.
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{
        p: { xs: 1.6, md: 2 }, mb: 1.5, borderRadius: '18px',
        border: '1px solid #eee7dd', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(217,119,6,0.10), rgba(79,70,229,0.055) 52%, rgba(14,116,144,0.05) 100%), #fff',
        '&::after': {
          content: '""', position: 'absolute', width: 230, height: 230, borderRadius: '50%',
          top: -140, left: -70, bgcolor: alpha(AMBER, 0.055),
        },
      }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 16, md: 19 }, fontWeight: 900, color: INK, letterSpacing: '-0.02em' }}>
              پرتفوی قراردادها در یک نگاه
            </Typography>
            <Typography sx={{ mt: 0.3, fontSize: 12, color: MUTED }}>
              از تعهد و الحاقیه تا صورت‌وضعیت، تضامین و تسویه؛ همه‌چیز قابل پیگیری.
            </Typography>
            <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip size="small" label={`${formatPersianNumber(totalCount)} قرارداد`}
                sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: alpha(AMBER, 0.07), color: AMBER }} />
              <Chip size="small" label={`${formatPersianNumber(num(counters.active))} در حال اجرا`}
                sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: alpha(GREEN, 0.07), color: GREEN }} />
              <Chip size="small" label={`${formatPersianNumber(data.expiringCount)} رو به انقضا`}
                sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: alpha(RED, 0.07), color: RED }} />
              <Chip size="small" label={`${compactMoney(data.totalAmount)} ریال`}
                sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: alpha(BLUE, 0.07), color: BLUE }} />
            </Stack>
          </Box>

          <Box sx={{
            width: { xs: '100%', lg: 468 }, flexShrink: 0,
            display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 0.7,
          }}>
            <ActionTile icon={AddRoundedIcon} label="قرارداد جدید" caption="ثبت پرونده" color={GREEN} onClick={() => navigate('/contracts/new')} />
            <ActionTile icon={HandshakeOutlinedIcon} label="قراردادهای من" caption="فهرست کامل" color={AMBER} onClick={() => navigate('/external-contracts')} />
            <ActionTile icon={EventBusyOutlinedIcon} label="رو به انقضا" caption="۶۰ روز آینده" color={RED} onClick={() => navigate('/contracts-expiring')} />
            <ActionTile icon={VerifiedUserOutlinedIcon} label="تضامین" caption="مدیریت ضمانت‌ها" color={VIOLET} onClick={() => navigate('/contracts-guarantees')} />
            <ActionTile icon={StorefrontOutlinedIcon} label="طرف‌های قرارداد" caption="پیمانکاران" color={CYAN} onClick={() => navigate('/contract-parties')} />
            <ActionTile icon={CalendarMonthOutlinedIcon} label="تقویم قراردادها" caption="زمان‌بندی" color={BLUE} onClick={() => navigate('/contracts-calendar')} />
          </Box>
        </Stack>
      </Paper>


      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={HandshakeOutlinedIcon} label="کل قراردادها" value={formatPersianNumber(totalCount)}
            suffix="قرارداد" hint={`${formatPersianNumber(num(counters.completed))} تکمیل‌شده`} color={AMBER}
            onClick={() => navigate('/external-contracts')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PlayCircleOutlineIcon} label="در حال اجرا" value={formatPersianNumber(num(counters.active))}
            suffix="قرارداد" hint={`${compactMoney(data.activeAmount)} ریال در جریان`} color={GREEN}
            onClick={() => navigate('/external-contracts')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={WarningAmberOutlinedIcon} label="رو به انقضا" value={formatPersianNumber(data.expiringCount)}
            suffix="مورد" hint="در بازهٔ ۶۰ روز آینده" color={RED}
            onClick={() => navigate('/contracts-expiring')} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={AccountBalanceWalletOutlinedIcon} label="ارزش پرتفوی" value={compactMoney(data.totalAmount)}
            suffix="ریال" hint={`میانگین ${compactMoney(data.averageAmount)} ریال`} color={BLUE} />
        </Grid>
      </Grid>

      <Grid container spacing={1} sx={{ mb: 1.5 }}>
        <Grid item xs={6} md={3}><MiniMetric icon={CheckCircleOutlineIcon} label="تکمیل‌شده" value={formatPersianNumber(num(counters.completed))} suffix="مورد" hint="پرونده‌های بسته‌شده" color={BLUE} /></Grid>
        <Grid item xs={6} md={3}><MiniMetric icon={DescriptionOutlinedIcon} label="پیش‌نویس" value={formatPersianNumber(num(counters.draft))} suffix="مورد" hint="نیازمند تکمیل" color={SLATE} /></Grid>
        <Grid item xs={6} md={3}><MiniMetric icon={PauseCircleOutlineIcon} label="متوقف" value={formatPersianNumber(num(counters.suspended))} suffix="مورد" hint="نیازمند بررسی" color={AMBER} /></Grid>
        <Grid item xs={6} md={3}><MiniMetric icon={CancelOutlinedIcon} label="فسخ‌شده" value={formatPersianNumber(num(counters.terminated))} suffix="مورد" hint="پرونده‌های خاتمه‌یافته" color={RED} /></Grid>
        <Grid item xs={6} md={3}><MiniMetric icon={ReceiptLongOutlinedIcon} label="صورت‌وضعیت" value={compactMoney(data.statementAmount)} suffix="ریال" hint="مجموع صورت‌وضعیت‌ها" color={CYAN} /></Grid>
        <Grid item xs={6} md={3}><MiniMetric icon={PaymentsOutlinedIcon} label="پرداخت‌شده" value={compactMoney(data.paid)} suffix="ریال" hint={`نرخ وصول ${formatPersianPercent(data.collectionRate)}`} color={GREEN} /></Grid>
        <Grid item xs={6} md={3}><MiniMetric icon={AccountBalanceWalletOutlinedIcon} label="مانده تسویه" value={compactMoney(data.outstanding)} suffix="ریال" hint={`${formatPersianNumber(data.overdue)} فاکتور معوق`} color={AMBER} /></Grid>
        <Grid item xs={6} md={3}><MiniMetric icon={VerifiedUserOutlinedIcon} label="تضامین فعال" value={compactMoney(data.guaranteeAmount)} suffix="ریال" hint={`${formatPersianNumber(data.guaranteeCount)} تضمین`} color={VIOLET} onClick={() => navigate('/contracts-guarantees')} /></Grid>
      </Grid>


      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} md={4}><StatusPanel data={data.statusData} total={totalCount} /></Grid>
        <Grid item xs={12} md={4}><TypePanel data={data.typeData} /></Grid>
        <Grid item xs={12} md={4}><TrendPanel data={data.monthlyData} /></Grid>
        <Grid item xs={12} lg={7}><ExpiringPanel contracts={data.expiring} navigate={navigate} /></Grid>
        <Grid item xs={12} lg={5}>
          <FinancePanel invoiced={data.invoiced} paid={data.paid} outstanding={data.outstanding}
            collectionRate={data.collectionRate} guarantees={data.guaranteeAmount}
            guaranteeCount={data.guaranteeCount} overdue={data.overdue}
            sourceCount={items.length} navigate={navigate} />
        </Grid>
        <Grid item xs={12}><ContractTable contracts={items} navigate={navigate} /></Grid>
        <Grid item xs={12} lg={7}>
          <SurfaceCard title="توزیع قراردادها در پروژه‌ها" icon={FolderOutlinedIcon} color={CYAN}
            action={<Chip size="small" label={`${formatPersianNumber(data.projectData.length)} پروژه`}
              sx={{ height: 20, fontSize: 12, bgcolor: alpha(CYAN, 0.07), color: CYAN }} />}>
            {!data.projectData.length ? (
              <EmptyState icon={FolderOutlinedIcon} text="قراردادی به پروژه تخصیص نیافته است" color={CYAN} />
            ) : <BarChart data={data.projectData} height={220} />}
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={5}><TopPartiesPanel data={data.topParties} totalAmount={data.partyMax} navigate={navigate} /></Grid>
      </Grid>
    </Box>
  );
};

export default ContractsDashboardPage;
