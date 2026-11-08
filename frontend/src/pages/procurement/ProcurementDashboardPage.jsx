/**
 * داشبورد «مدیریت خریدها» — هم‌ساخت با داشبورد مدیریت قراردادها.
 *
 * از همان کیت بصری (`pages/contracts/contractsDashboardKit`) استفاده می‌کند:
 * نوار شاخص، پرتفوی ریالی/ارزی، نمودار روند، کارت سفارش‌ها و توزیع‌های شماتیک.
 * داده از یک اندپوینت تجمیعی `GET /api/procurement/dashboard/` می‌آید (بدون N+1).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Divider, Grid, IconButton, Paper, Skeleton,
  Stack, Tooltip, Typography, alpha,
} from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CurrencyExchangeOutlinedIcon from '@mui/icons-material/CurrencyExchangeOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { INK, MUTED } from '../accounting/AccountingDashboardUI';
import {
  formatPersianNumber, formatPersianPercent, toPersianDigits,
} from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { ModuleToolbar, useModuleTheme } from '../contracts/contractModuleUi';
import {
  AMBER, BLUE, CARDS_PER_PAGE, CYAN, CardPager, EmptyNote, FOREIGN_VIOLET, GREEN, MetricTile,
  Panel, RED, RIAL_BLUE, SLATE, SchematicRow, SparkLine, StatRow, TrendChart, VIOLET,
  compactMoney, daysColor, daysText, money, num,
} from '../contracts/contractsDashboardKit';

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const ORDER_STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#b45309' },
  approved: { label: 'تأییدشده', color: '#0e7490' },
  sent: { label: 'ارسال به تأمین‌کننده', color: '#2563eb' },
  partial: { label: 'تحویل جزئی', color: VIOLET },
  received: { label: 'تحویل کامل', color: GREEN },
  invoiced: { label: 'صورتحساب شده', color: CYAN },
  closed: { label: 'بسته', color: '#334155' },
  cancelled: { label: 'لغو', color: RED },
};

const statusOf = (status) => ORDER_STATUS[status] || { label: status || '—', color: SLATE };

const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

/** برچسب فارسی ماه از کلید `YYYY-MM` (میلادی → جلالی). */
const monthLabel = (key, index = 0, total = 6) => {
  const parts = String(key || '').split('-').map(Number);
  if (!parts[0] || !parts[1]) return key || '';
  const jalali = String(toJalali(`${parts[0]}-${String(parts[1]).padStart(2, '0')}-01`) || '');
  const [jYear, jMonth] = jalali.split('/');
  const monthName = JALALI_MONTHS[(Number(jMonth) || parts[1]) - 1] || '';
  return (index === 0 || index === total - 1)
    ? `${monthName} ${toPersianDigits(jYear || '')}`.trim()
    : monthName;
};

const shareOf = (value, total) => (total > 0 ? (num(value) / num(total)) * 100 : 0);

/* کارت سفارش خرید — جای جدول چندستونه */
const OrderCard = ({ row, theme, share, onOpen }) => {
  const isForeign = row.group === 'foreign';
  const accent = isForeign ? FOREIGN_VIOLET : RIAL_BLUE;
  const status = statusOf(row.status);
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
        '&:hover': {
          borderColor: alpha(accent, 0.45),
          boxShadow: `0 10px 26px ${alpha(accent, 0.09)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography noWrap sx={{
          fontSize: 11.5, fontWeight: 900, color: accent,
          fontFamily: 'var(--hrms-table-number-font, inherit)',
        }}>
          {row.number ? toPersianDigits(row.number) : `سفارش ${toPersianDigits(row.id)}`}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" alignItems="center" spacing={0.4}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: status.color }} />
          <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 800, color: status.color }}>
            {status.label}
          </Typography>
        </Stack>
      </Stack>

      <Typography
        title={row.supplier}
        sx={{
          fontSize: 12, fontWeight: 800, color: INK, lineHeight: 1.6, minHeight: 38,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {row.supplier || 'بدون تأمین‌کننده'}
      </Typography>

      <Box sx={{
        p: 0.9, borderRadius: '10px', bgcolor: alpha(accent, 0.04),
        border: `1px solid ${alpha(accent, 0.14)}`,
      }}>
        <Typography sx={{ fontSize: 10, color: MUTED }}>
          {isForeign ? 'مبلغ ارزی سفارش' : 'مبلغ سفارش'}
        </Typography>
        <Typography noWrap sx={{
          fontSize: 13, fontWeight: 900, color: accent,
          fontFamily: 'var(--hrms-table-number-font, inherit)',
        }}>
          {isForeign
            ? `${money(row.amount)} ${row.currency || ''}`.trim()
            : `${money(row.amount)} ریال`}
        </Typography>
        {isForeign ? (
          <Typography noWrap sx={{ fontSize: 10, color: MUTED, mt: 0.2 }}>
            {`نرخ ${formatPersianNumber(row.rate)} • معادل ${compactMoney(row.rial_amount)} ریال`}
          </Typography>
        ) : (
          <Typography noWrap sx={{ fontSize: 10, color: MUTED, mt: 0.2 }}>
            {`تاریخ سفارش ${dateLabel(row.date)}`}
          </Typography>
        )}
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography sx={{ fontSize: 10, color: MUTED }}>سهم از ارزش گروه</Typography>
        <Typography sx={{ fontSize: 10, fontWeight: 800, color: accent }}>
          {formatPersianPercent(num(share))}
        </Typography>
      </Stack>

      <Divider sx={{ my: 0.1 }} />
      <Stack direction="row" alignItems="center" spacing={0.6}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>تاریخ تحویل</Typography>
          <Typography noWrap sx={{
            fontSize: 10.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)',
          }}>
            {dateLabel(row.expected_date)}
          </Typography>
        </Box>
        <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 900, color: daysColor(row.days) }}>
          {daysText(row.days)}
        </Typography>
        <Tooltip title="سفارش خرید">
          <IconButton size="small" aria-label="سفارش خرید"
            onClick={(event) => { event.stopPropagation(); onOpen(); }}>
            <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
};

const ORDER_SORTERS = {
  amount: (a, b) => num(b.rial_amount) - num(a.rial_amount),
  days: (a, b) => (a.days ?? 9999) - (b.days ?? 9999),
  number: (a, b) => String(a.number || '').localeCompare(String(b.number || '')),
  date: (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
};

/* ====================================================================== صفحه */
const ProcurementDashboardPage = () => {
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('amount');
  const [rialPage, setRialPage] = useState(0);
  const [foreignPage, setForeignPage] = useState(0);

  const dashboardQuery = useQuery({
    queryKey: ['procurement-dashboard'],
    queryFn: () => axiosInstance.get('/procurement/dashboard/').then((response) => response.data),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = useMemo(() => {
    const raw = dashboardQuery.data || {};
    const groups = raw.groups || { rial: {}, foreign: {} };
    const monthly = (raw.monthly || []).map((row, index, all) => ({
      ...row, label: monthLabel(row.month, index, all.length),
    }));
    const term = search.trim().toLowerCase();
    const cards = (raw.orders || [])
      .map((row) => ({
        ...row,
        share: shareOf(row.rial_amount, (groups[row.group || 'rial'] || {}).amount),
      }))
      .filter((row) => (!term
        ? true
        : `${row.number} ${row.supplier} ${row.currency}`.toLowerCase().includes(term)))
      .sort(ORDER_SORTERS[sortBy] || ORDER_SORTERS.amount);

    return {
      counts: raw.counts || {},
      totals: raw.totals || {},
      groups,
      monthly,
      byCurrency: raw.by_currency || [],
      orderStatus: raw.order_status || [],
      inquiryStatus: raw.inquiry_status || [],
      topSuppliers: raw.top_suppliers || [],
      projects: raw.projects || [],
      dueOrders: raw.due_orders || [],
      guarantees: raw.guarantees || { kinds: [] },
      rialCards: cards.filter((row) => row.group !== 'foreign'),
      foreignCards: cards.filter((row) => row.group === 'foreign'),
    };
  }, [dashboardQuery.data, search, sortBy]);

  const { counts, totals, groups, guarantees } = data;
  const rialSlice = data.rialCards.slice(rialPage * CARDS_PER_PAGE, (rialPage + 1) * CARDS_PER_PAGE);
  const foreignSlice = data.foreignCards
    .slice(foreignPage * CARDS_PER_PAGE, (foreignPage + 1) * CARDS_PER_PAGE);
  const openOrder = (row) => navigate(`/procurement/orders?order=${row.id}`);

  if (dashboardQuery.isLoading) {
    return (
      <Box>
        <PageHeader icon={<ShoppingCartOutlinedIcon />} title="داشبورد خریدها"
          subtitle="چرخهٔ خرید به تفکیک ریالی و ارزی، روند سفارش‌ها و سلامت مالی پرداخت‌ها" />
        <Box sx={{
          display: 'grid', gap: 1.25, mb: 1.5,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
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
        icon={<ShoppingCartOutlinedIcon />}
        title="داشبورد خریدها"
        subtitle="چرخهٔ خرید به تفکیک ریالی و ارزی، روند سفارش‌ها و سلامت مالی پرداخت‌ها"
        badge={(
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>
            {`${formatPersianNumber(totals.rial_count || 0)} ریالی · ${formatPersianNumber(totals.foreign_count || 0)} ارزی`}
          </Typography>
        )}
      />

      {dashboardQuery.isError ? (
        <Alert severity="warning" sx={{ mb: 1.25, borderRadius: '12px', fontSize: 12 }}
          action={<Button size="small" onClick={() => dashboardQuery.refetch()}>تلاش دوباره</Button>}>
          دادهٔ داشبورد خرید دریافت نشد؛ پس از رفع خطا دوباره تلاش کنید.
        </Alert>
      ) : null}


      {/* ---- نوار شاخص‌ها ---- */}
      <Box sx={{
        display: 'grid', gap: 1.25, mb: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(5, minmax(0, 1fr))',
        },
      }}>
        <MetricTile theme={moduleTheme} icon={ShoppingCartOutlinedIcon} label="کل سفارش‌ها"
          value={formatPersianNumber(counts.orders || 0)} suffix="سفارش"
          hint={`${formatPersianNumber(counts.suppliers || 0)} تأمین‌کننده · ${formatPersianNumber(counts.inquiries || 0)} استعلام`}
          color={AMBER} onClick={() => navigate('/procurement/orders')} />
        <MetricTile theme={moduleTheme} icon={RequestQuoteOutlinedIcon} label="استعلام‌های باز"
          value={formatPersianNumber(totals.open_inquiries || 0)} suffix="استعلام"
          hint={`${formatPersianNumber(totals.open_orders || 0)} سفارش در جریان`} color={GREEN}
          onClick={() => navigate('/procurement/inquiries')} />
        <MetricTile theme={moduleTheme} icon={AccountBalanceWalletOutlinedIcon} label="ارزش سفارش‌ها"
          value={compactMoney(totals.order_amount)} suffix="ریال"
          hint={`میانگین ${compactMoney(groups.rial.average)} ریال`} color={RIAL_BLUE}
          onClick={() => navigate('/procurement/orders')} />
        <MetricTile theme={moduleTheme} icon={CurrencyExchangeOutlinedIcon} label="معادل ریالی خرید ارزی"
          value={compactMoney(totals.foreign_rial_amount)} suffix="ریال"
          hint={`${formatPersianNumber(data.byCurrency.length)} ارز · ${formatPersianNumber(totals.foreign_count || 0)} سفارش`}
          color={FOREIGN_VIOLET} />
        <MetricTile theme={moduleTheme} icon={ReceiptLongOutlinedIcon} label="ماندهٔ پرداخت"
          value={compactMoney(totals.outstanding)} suffix="ریال"
          hint={`نرخ تسویه ${formatPersianPercent(totals.collection_rate || 0)} · ${formatPersianNumber(totals.overdue_invoices || 0)} فاکتور معوق`}
          color={num(totals.outstanding) > 0 ? AMBER : GREEN}
          onClick={() => navigate('/procurement/invoices')} />
      </Box>


      {/* ---- پرتفوی ریالی و ارزی خرید ---- */}
      <Box sx={{
        display: 'grid', gap: 1.5, mb: 1.5,
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
      }}>
        <Panel theme={moduleTheme} icon={AccountBalanceWalletOutlinedIcon} color={RIAL_BLUE}
          title="خرید ریالی" hint={`${formatPersianNumber(groups.rial.count || 0)} سفارش ریالی`}
          ariaLabel="خرید ریالی"
          action={<Button size="small" variant="text" onClick={() => navigate('/procurement/orders')}>فهرست</Button>}>
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 0.5 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>ارزش کل</Typography>
              <Typography sx={{
                fontSize: 15, fontWeight: 900, color: RIAL_BLUE,
                fontFamily: 'var(--hrms-table-number-font, inherit)',
              }}>
                {money(groups.rial.amount)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>سهم از خرید</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                {formatPersianPercent(shareOf(groups.rial.amount, totals.order_amount))}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>میانگین سفارش</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                {compactMoney(groups.rial.average)}
              </Typography>
            </Box>
          </Stack>
          <SparkLine data={data.monthly} dataKey="rial_amount" color={RIAL_BLUE} height={54} />
          <Grid container spacing={1} sx={{ mt: 0.25 }}>
            <Grid item xs={6}>
              <StatRow label="سفارش" value={`${formatPersianNumber(groups.rial.count || 0)} فقره`} />
            </Grid>
            <Grid item xs={6}>
              <StatRow label="در جریان" value={`${formatPersianNumber(groups.rial.active || 0)} سفارش`} color={GREEN} />
            </Grid>
            <Grid item xs={6}><StatRow label="صورتحساب" value={money(groups.rial.invoiced)} /></Grid>
            <Grid item xs={6}><StatRow label="پرداخت" value={money(groups.rial.paid)} color={GREEN} /></Grid>
            <Grid item xs={6}><StatRow label="مانده" value={money(groups.rial.outstanding)} color={AMBER} /></Grid>
            <Grid item xs={6}>
              <StatRow label="فاکتور معوق" value={`${formatPersianNumber(groups.rial.overdue || 0)} فقره`}
                color={groups.rial.overdue ? RED : GREEN} />
            </Grid>
          </Grid>
        </Panel>

        <Panel theme={moduleTheme} icon={CurrencyExchangeOutlinedIcon} color={FOREIGN_VIOLET}
          title="خرید ارزی"
          hint={`${formatPersianNumber(groups.foreign.count || 0)} سفارش · ${formatPersianNumber(data.byCurrency.length)} ارز`}
          ariaLabel="خرید ارزی">
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 0.5 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>معادل ریالی</Typography>
              <Typography sx={{
                fontSize: 15, fontWeight: 900, color: FOREIGN_VIOLET,
                fontFamily: 'var(--hrms-table-number-font, inherit)',
              }}>
                {money(groups.foreign.amount)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>سهم از خرید</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                {formatPersianPercent(shareOf(groups.foreign.amount, totals.order_amount))}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>میانگین (معادل ریالی)</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                {compactMoney(groups.foreign.average)}
              </Typography>
            </Box>
          </Stack>
          <SparkLine data={data.monthly} dataKey="foreign_amount" color={FOREIGN_VIOLET} height={54} />
          <Box sx={{ mt: 0.5 }}>
            {data.byCurrency.length ? data.byCurrency.map((row) => (
              <SchematicRow key={row.currency} color={FOREIGN_VIOLET}
                label={`${row.currency} · ${formatPersianNumber(row.count)} سفارش`}
                value={compactMoney(row.amount, row.currency)}
                share={shareOf(row.rial_amount, groups.foreign.amount || 1)}
                hint={`معادل ${compactMoney(row.rial_amount)} ریال`} />
            )) : (
              <Typography sx={{ fontSize: 11, color: MUTED }}>سفارش ارزی ثبت نشده است.</Typography>
            )}
          </Box>
        </Panel>
      </Box>


      {/* ---- نمودارهای خطی ---- */}
      <Box sx={{
        display: 'grid', gap: 1.5, mb: 1.5,
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
      }}>
        <Panel theme={moduleTheme} icon={TrendingUpOutlinedIcon} color={BLUE}
          title="روند ماهانهٔ سفارش‌های خرید" hint="شش ماه اخیر — ریالی و ارزی">
          {data.monthly.some((row) => row.rial_orders || row.foreign_orders) ? (
            <TrendChart
              data={data.monthly}
              height={218}
              series={[
                { key: 'rial_orders', name: 'ریالی', color: RIAL_BLUE },
                { key: 'foreign_orders', name: 'ارزی', color: FOREIGN_VIOLET },
              ]}
              tooltipFormatter={(value, name) => [`${formatPersianNumber(value)} سفارش`, name]}
            />
          ) : <EmptyNote text="در شش ماه اخیر سفارشی ثبت نشده است." />}
        </Panel>
        <Panel theme={moduleTheme} icon={InsightsOutlinedIcon} color={FOREIGN_VIOLET}
          title="روند ارزش سفارش‌های خرید" hint="معادل ریالی سفارش‌های ریالی و ارزی">
          {data.monthly.some((row) => row.rial_amount || row.foreign_amount) ? (
            <TrendChart
              data={data.monthly}
              height={218}
              yWidth={78}
              series={[
                { key: 'rial_amount', name: 'مبلغ ریالی', color: RIAL_BLUE },
                { key: 'foreign_amount', name: 'معادل ریالی ارزی', color: FOREIGN_VIOLET, dashed: true },
              ]}
              tooltipFormatter={(value, name) => [money(value), name]}
            />
          ) : <EmptyNote text="داده‌ای برای روند مبالغ موجود نیست." />}
        </Panel>
      </Box>

      {/* ---- جست‌وجو و ترتیب کارت‌های سفارش ---- */}
      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جستجو در شماره سفارش، تأمین‌کننده یا ارز…"
        sort={sortBy}
        sortOptions={[
          { value: 'amount', label: 'بیشترین معادل ریالی' },
          { value: 'date', label: 'جدیدترین سفارش' },
          { value: 'days', label: 'نزدیک‌ترین تحویل' },
          { value: 'number', label: 'شماره سفارش' },
        ]}
        onSort={setSortBy}
        onReset={() => { setSearch(''); setSortBy('amount'); }}
      />

      {/* ---- کارت سفارش‌های ریالی ---- */}
      <Panel theme={moduleTheme} icon={ShoppingCartOutlinedIcon} color={RIAL_BLUE}
        title="سفارش‌های ریالی" hint={`${formatPersianNumber(data.rialCards.length)} سفارش`}
        ariaLabel="کارت‌های سفارش‌های ریالی"
        sx={{ mb: 1.5 }}>
        {rialSlice.length ? (
          <>
            <Box sx={{
              display: 'grid', gap: 1.25,
              gridTemplateColumns: {
                xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))',
              },
            }}>
              {rialSlice.map((row) => (
                <OrderCard key={row.id} row={row} share={row.share} theme={moduleTheme}
                  onOpen={() => openOrder(row)} />
              ))}
            </Box>
            <CardPager page={rialPage} total={data.rialCards.length} onPage={setRialPage}
              unit="سفارش ریالی" />
          </>
        ) : <EmptyNote text="سفارش ریالی با این مشخصات پیدا نشد." />}
      </Panel>

      {/* ---- کارت سفارش‌های ارزی ---- */}
      <Panel theme={moduleTheme} icon={CurrencyExchangeOutlinedIcon} color={FOREIGN_VIOLET}
        title="سفارش‌های ارزی"
        hint={`${formatPersianNumber(data.foreignCards.length)} سفارش · معادل ${money(groups.foreign.amount)}`}
        ariaLabel="کارت‌های سفارش‌های ارزی"
        sx={{ mb: 1.5 }}>
        {foreignSlice.length ? (
          <>
            <Box sx={{
              display: 'grid', gap: 1.25,
              gridTemplateColumns: {
                xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))',
              },
            }}>
              {foreignSlice.map((row) => (
                <OrderCard key={row.id} row={row} share={row.share} theme={moduleTheme}
                  onOpen={() => openOrder(row)} />
              ))}
            </Box>
            <CardPager page={foreignPage} total={data.foreignCards.length} onPage={setForeignPage}
              unit="سفارش ارزی" />
          </>
        ) : <EmptyNote icon={CurrencyExchangeOutlinedIcon} text="سفارش ارزی با این مشخصات پیدا نشد." />}
      </Panel>


      {/* ---- سلامت مالی، سررسید تحویل و تضامین ---- */}
      <Box sx={{
        display: 'grid', gap: 1.5, mb: 1.5,
        gridTemplateColumns: {
          xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))',
        },
      }}>
        <Panel theme={moduleTheme} icon={ReceiptLongOutlinedIcon} color={CYAN}
          title="سلامت مالی خریدها" hint="روند صورتحساب و پرداخت در شش ماه اخیر">
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 0.4 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>صورتحساب</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {compactMoney(totals.invoiced)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>پرداخت‌شده</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: GREEN, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                {compactMoney(totals.paid)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>ماندهٔ تسویه</Typography>
              <Typography sx={{
                fontSize: 15, fontWeight: 900, fontFamily: 'var(--hrms-table-number-font, inherit)',
                color: num(totals.outstanding) > 0 ? AMBER : GREEN,
              }}>
                {compactMoney(totals.outstanding)}
              </Typography>
            </Box>
          </Stack>
          {data.monthly.some((row) => row.invoice_amount || row.payment_amount) ? (
            <TrendChart
              data={data.monthly}
              height={196}
              yWidth={74}
              series={[
                { key: 'invoice_amount', name: 'صورتحساب', color: CYAN },
                { key: 'payment_amount', name: 'پرداخت', color: GREEN },
              ]}
              tooltipFormatter={(value, name) => [money(value), name]}
            />
          ) : <EmptyNote icon={ReceiptLongOutlinedIcon} text="سند مالی در شش ماه اخیر ثبت نشده است." />}
          <Divider sx={{ my: 0.75 }} />
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <StatRow label="نرخ تسویه" value={formatPersianPercent(totals.collection_rate || 0)} color={GREEN} strong />
            </Grid>
            <Grid item xs={6}>
              <StatRow label="فاکتور معوق" value={`${formatPersianNumber(totals.overdue_invoices || 0)} فقره`}
                color={totals.overdue_invoices ? RED : GREEN} />
            </Grid>
            <Grid item xs={6}>
              <StatRow label="صورتحساب‌ها" value={`${formatPersianNumber(counts.invoices || 0)} فقره`} />
            </Grid>
            <Grid item xs={6}>
              <StatRow label="پرداخت‌ها" value={`${formatPersianNumber(counts.payments || 0)} فقره`} />
            </Grid>
          </Grid>
        </Panel>


        <Panel theme={moduleTheme} icon={EventBusyOutlinedIcon} color={RED}
          title="سررسید تحویل سفارش‌ها" hint="۱۴ روز آینده و سفارش‌های معوق">
          {data.dueOrders.length ? (
            <Box sx={{ maxHeight: 268, overflowY: 'auto' }}>
              {data.dueOrders.map((row) => {
                const status = statusOf(row.status);
                return (
                  <Box key={row.id}
                    onClick={() => openOrder(row)}
                    sx={{
                      py: 0.6, px: 0.5, borderRadius: '9px', cursor: 'pointer',
                      '&:hover': { bgcolor: alpha(RED, 0.04) },
                    }}>
                    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
                      <Typography noWrap title={row.supplier}
                        sx={{ fontSize: 11.5, fontWeight: 800, color: INK, flex: 1, minWidth: 0 }}>
                        {row.number ? `${toPersianDigits(row.number)} · ` : ''}{row.supplier || '—'}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: daysColor(row.days) }}>
                        {daysText(row.days)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.2 }}>
                      <Typography sx={{ fontSize: 10, color: MUTED }}>{dateLabel(row.expected_date)}</Typography>
                      <Box sx={{ flex: 1 }} />
                      <Typography sx={{ fontSize: 10, fontWeight: 800, color: status.color }}>
                        {status.label}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          ) : <EmptyNote icon={EventBusyOutlinedIcon} text="سفارشی در ۱۴ روز آینده سررسید ندارد." />}
        </Panel>

        <Panel theme={moduleTheme} icon={VerifiedUserOutlinedIcon} color={AMBER}
          title="تضامین خرید" hint="اعتبار چک‌ها بر اساس ۵ سال از تاریخ صدور">
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 0.4 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>تضامین فعال</Typography>
              <Typography sx={{
                fontSize: 15, fontWeight: 900, color: AMBER,
                fontFamily: 'var(--hrms-table-number-font, inherit)',
              }}>
                {compactMoney(guarantees.active_amount)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>نزدیک انقضا</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: guarantees.expiring ? RED : GREEN }}>
                {`${formatPersianNumber(guarantees.expiring || 0)} مورد`}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>آزادشده</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                {`${formatPersianNumber(guarantees.released || 0)} مورد`}
              </Typography>
            </Box>
          </Stack>
          <Divider sx={{ my: 0.75 }} />
          {(guarantees.kinds || []).length ? (guarantees.kinds || []).map((row) => (
            <SchematicRow key={row.key} color={AMBER} label={row.label}
              value={`${formatPersianNumber(row.count)} · ${compactMoney(row.amount)}`}
              share={shareOf(row.amount, guarantees.active_amount || guarantees.total_amount || 1)} />
          )) : <EmptyNote icon={VerifiedUserOutlinedIcon} text="تضمینی ثبت نشده است." />}
        </Panel>
      </Box>


      {/* ---- توزیع‌های شماتیک: وضعیت‌ها، تأمین‌کنندگان، پروژه‌ها ---- */}
      <Box sx={{
        display: 'grid', gap: 1.5,
        gridTemplateColumns: {
          xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))',
        },
      }}>
        <Panel theme={moduleTheme} icon={InsightsOutlinedIcon} color={SLATE}
          title="ترکیب وضعیت سفارش‌ها" hint={`${formatPersianNumber(counts.orders || 0)} سفارش`}>
          <Stack direction="row" spacing={0.35} sx={{ mb: 1 }}>
            {data.orderStatus.map((segment) => (
              <Box key={segment.key} sx={{
                height: 8, borderRadius: 4, width: `${segment.percent}%`, minWidth: 4,
                bgcolor: statusOf(segment.key).color, transition: 'width .35s ease',
              }} />
            ))}
          </Stack>
          {data.orderStatus.map((segment) => (
            <SchematicRow key={segment.key} label={segment.label} color={statusOf(segment.key).color}
              value={`${formatPersianNumber(segment.count)} · ${formatPersianPercent(segment.percent)}`}
              share={segment.percent} />
          ))}
          {!data.orderStatus.length ? <EmptyNote text="سفارشی ثبت نشده است." /> : null}
        </Panel>

        <Panel theme={moduleTheme} icon={RequestQuoteOutlinedIcon} color={CYAN}
          title="وضعیت استعلام‌ها" hint={`${formatPersianNumber(counts.inquiries || 0)} استعلام`}>
          {data.inquiryStatus.map((row) => (
            <SchematicRow key={row.key} color={CYAN} label={row.label}
              value={`${formatPersianNumber(row.count)} · ${formatPersianPercent(row.percent)}`}
              share={row.percent} />
          ))}
          {!data.inquiryStatus.length ? (
            <EmptyNote icon={RequestQuoteOutlinedIcon} text="استعلامی ثبت نشده است." />
          ) : null}
        </Panel>

        <Panel theme={moduleTheme} icon={StorefrontOutlinedIcon} color={AMBER}
          title="تأمین‌کنندگان برتر" hint="بر اساس معادل ریالی سفارش‌ها">
          {data.topSuppliers.slice(0, 5).map((supplier, index) => (
            <SchematicRow key={supplier.name} color={AMBER}
              label={`${toPersianDigits(index + 1)}. ${supplier.name}`}
              value={compactMoney(supplier.amount)}
              share={shareOf(supplier.amount, (data.topSuppliers[0] || {}).amount || 1)}
              hint={`${formatPersianNumber(supplier.count)} سفارش`} />
          ))}
          {!data.topSuppliers.length ? (
            <EmptyNote icon={StorefrontOutlinedIcon} text="تأمین‌کننده‌ای ثبت نشده است." />
          ) : null}
        </Panel>

        <Panel theme={moduleTheme} icon={FolderOutlinedIcon} color={VIOLET}
          title="خرید در پروژه‌ها" hint="معادل ریالی سفارش‌ها به تفکیک پروژه">
          {data.projects.slice(0, 6).map((project) => (
            <SchematicRow key={project.label} color={VIOLET} label={project.label}
              value={compactMoney(project.amount)}
              share={shareOf(project.amount, (data.projects[0] || {}).amount || 1)}
              hint={`${formatPersianNumber(project.count)} سفارش`} />
          ))}
          {!data.projects.length ? (
            <EmptyNote icon={FolderOutlinedIcon} text="سفارشی به پروژه تخصیص نیافته است." />
          ) : null}
        </Panel>
      </Box>
    </Box>
  );
};

export default ProcurementDashboardPage;

