/**
 * پروندهٔ خرید — هم‌ساخت با «پروندهٔ قرارداد» در مدیریت قراردادها.
 *
 * ساختار: کارت هویت تأمین‌کننده + کاشی‌های مالی + دسترسی سریع + تب‌های اسناد
 * (نمای کلی، سفارش، پیشنهاد، پیش‌فاکتور، صورتحساب، پرداخت، تضامین، اسناد، تایم‌لاین).
 * داده از یک اندپوینت تجمیعی می‌آید: `GET /api/procurement/suppliers/{id}/profile/`.
 */
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, CircularProgress, Divider, MenuItem, Paper, Stack, Tab, Table,
  TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TimelineIcon from '@mui/icons-material/Timeline';
import InsightsIcon from '@mui/icons-material/Insights';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { INK, MUTED } from '../accounting/AccountingDashboardUI';
import { formatPersianNumber, formatPersianPercent, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { useModuleTheme } from '../contracts/contractModuleUi';
import {
  AMBER, CYAN, EmptyNote, FOREIGN_VIOLET, GREEN, MetricTile, Panel, RED, RIAL_BLUE, SLATE,
  SchematicRow, SparkLine, StatRow, VIOLET, compactMoney, daysColor, daysText, money,
} from '../contracts/contractsDashboardKit';

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const SUPPLIER_STATUS = {
  active: { label: 'فعال', color: GREEN },
  inactive: { label: 'غیرفعال', color: SLATE },
  blacklisted: { label: 'لیست سیاه', color: RED },
};

const PAYMENT_STATUS = {
  unpaid: { label: 'پرداخت‌نشده', color: RED },
  partial: { label: 'پرداخت جزئی', color: AMBER },
  paid: { label: 'تسویه‌شده', color: GREEN },
};

const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const monthLabel = (key) => {
  const parts = String(key || '').split('-').map(Number);
  if (!parts[0] || !parts[1]) return key || '';
  const jalali = String(toJalali(`${parts[0]}-${String(parts[1]).padStart(2, '0')}-01`) || '');
  const [, jMonth] = jalali.split('/');
  return JALALI_MONTHS[(Number(jMonth) || parts[1]) - 1] || '';
};

const recentMonths = (count = 6) => {
  const keys = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  for (let index = 0; index < count; index += 1) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
    month -= 1;
    if (month === 0) { month = 12; year -= 1; }
  }
  return keys.reverse();
};

const rowMoney = (row) => money(row?.rial_amount ?? row?.amount ?? 0);

/* کاشی مشخصه در کارت هویت */
const SpecTile = ({ label, value, color }) => (
  <Box sx={{
    px: 1, py: 0.75, minWidth: 0, borderRadius: '11px',
    border: '1px solid', borderColor: 'divider',
  }}>
    <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{label}</Typography>
    <Typography noWrap title={typeof value === 'string' ? value : undefined} sx={{
      mt: 0.2, fontSize: 12.5, fontWeight: 800, color: color || INK,
      fontFamily: 'var(--hrms-table-number-font, inherit)',
    }}>
      {value || '—'}
    </Typography>
  </Box>
);

/* چیپ ریز وضعیت */
const StatusChip = ({ label, color }) => (
  <Box sx={{
    px: 0.8, height: 21, borderRadius: '999px', display: 'inline-flex', alignItems: 'center',
    fontSize: 10.5, fontWeight: 800, color, bgcolor: alpha(color, 0.1),
    border: `1px solid ${alpha(color, 0.24)}`,
  }}>
    {label}
  </Box>
);

const DocumentsTable = ({ columns, rows, emptyText, footer }) => (
  <Box sx={{ overflowX: 'auto' }}>
    <Table size="small" sx={{
      '& .MuiTableCell-root': {
        fontSize: 12, borderColor: 'divider', py: 0.7, color: INK, whiteSpace: 'nowrap',
      },
      '& .MuiTableCell-head': { fontSize: 11.5, fontWeight: 800, color: MUTED, bgcolor: 'transparent' },
    }}>
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableCell key={column.key} align={column.align || 'right'}>{column.label}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} hover>
            {columns.map((column) => (
              <TableCell key={`${row.id}-${column.key}`} align={column.align || 'right'}>
                {column.render ? column.render(row) : (row[column.key] ?? '—')}
              </TableCell>
            ))}
          </TableRow>
        ))}
        {!rows.length ? (
          <TableRow>
            <TableCell colSpan={Math.max(columns.length, 1)} align="center" sx={{ py: 3, color: MUTED }}>
              {emptyText}
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
      {footer ? <TableHead><TableRow>{footer}</TableRow></TableHead> : null}
    </Table>
  </Box>
);


/* ====================================================================== صفحه */
const ProcurementSupplierProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const moduleTheme = useModuleTheme();
  const supplierId = searchParams.get('supplier') || '';
  const [tab, setTab] = useState(0);

  const suppliersQuery = useQuery({
    queryKey: ['procurement-suppliers-lookup'],
    queryFn: () => axiosInstance.get('/procurement/suppliers/', { params: { page_size: 500 } })
      .then((response) => (Array.isArray(response.data) ? response.data : response.data?.results || [])),
    staleTime: 5 * 60 * 1000,
  });

  const profileQuery = useQuery({
    queryKey: ['procurement-supplier-profile', supplierId],
    queryFn: () => axiosInstance.get(`/procurement/suppliers/${supplierId}/profile/`)
      .then((response) => response.data),
    enabled: Boolean(supplierId),
    staleTime: 30 * 1000,
  });

  const profile = profileQuery.data || null;
  const supplier = profile?.supplier || null;
  const summary = profile?.summary || {};
  const { orders, invoices, payments, guarantees, proformas, quotations, documents, timeline } = useMemo(() => ({
    orders: profile?.orders || [],
    invoices: profile?.invoices || [],
    payments: profile?.payments || [],
    guarantees: profile?.guarantees || [],
    proformas: profile?.proformas || [],
    quotations: profile?.quotations || [],
    documents: profile?.documents || [],
    timeline: profile?.timeline || [],
  }), [profile]);

  const orderStats = summary.orders || {};
  const invoiceStats = summary.invoices || {};
  const paymentStats = summary.payments || {};
  const guaranteeStats = summary.guarantees || {};

  const monthly = useMemo(() => {
    const keys = recentMonths(6);
    const buckets = keys.map((key) => ({ month: key, label: monthLabel(key), orders: 0, ordered: 0, invoiced: 0 }));
    const byKey = {};
    buckets.forEach((bucket) => { byKey[bucket.month] = bucket; });
    orders.forEach((row) => {
      const bucket = byKey[String(row.date || '').slice(0, 7)];
      if (!bucket) return;
      bucket.orders += 1;
      bucket.ordered += Number(row.rial_amount || 0);
    });
    invoices.forEach((row) => {
      const bucket = byKey[String(row.date || '').slice(0, 7)];
      if (!bucket) return;
      bucket.invoiced += Number(row.rial_amount || 0);
    });
    return buckets;
  }, [orders, invoices]);

  const recentDocuments = useMemo(() => {
    const rows = [
      ...orders.map((row) => ({ ...row, kindLabel: 'سفارش خرید', tone: RIAL_BLUE, when: row.date })),
      ...invoices.map((row) => ({ ...row, kindLabel: 'صورتحساب', tone: CYAN, when: row.date })),
      ...payments.map((row) => ({ ...row, kindLabel: 'پرداخت', tone: GREEN, when: row.date })),
      ...proformas.map((row) => ({ ...row, kindLabel: 'پیش‌فاکتور', tone: VIOLET, when: row.date })),
      ...guarantees.map((row) => ({ ...row, kindLabel: 'تضمین', tone: AMBER, when: row.issue_date })),
    ].filter((row) => row.when);
    rows.sort((a, b) => String(b.when).localeCompare(String(a.when)));
    return rows.slice(0, 6);
  }, [orders, invoices, payments, proformas, guarantees]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const statusMeta = SUPPLIER_STATUS[supplier?.status] || SUPPLIER_STATUS.active;
  const suppliers = suppliersQuery.data || [];
  const picker = (
    <TextField size="small" select label="طرف حساب" value={supplierId}
      onChange={(event) => setParam('supplier', event.target.value)} sx={{ minWidth: 250 }}>
      <MenuItem value="">انتخاب طرف حساب…</MenuItem>
      {suppliers.map((row) => (
        <MenuItem key={row.id} value={String(row.id)}>{row.name}</MenuItem>
      ))}
    </TextField>
  );


  if (profileQuery.isLoading) {
    return (
      <Box>
        <PageHeader icon={<BusinessIcon />} title="پرونده خرید" actions={picker} />
        <Stack alignItems="center" sx={{ py: 10 }}><CircularProgress /></Stack>
      </Box>
    );
  }

  if (!supplierId) {
    return (
      <Box>
        <PageHeader icon={<BusinessIcon />} title="پرونده خرید"
          subtitle="همهٔ اسناد خرید یک طرف حساب: استعلام، پیشنهاد، سفارش، پیش‌فاکتور، صورتحساب، پرداخت و تضامین"
          actions={picker} />
        <Paper elevation={0} sx={{
          p: 4, textAlign: 'center', borderRadius: 'var(--hrms-radius-large, 16px)',
          border: '1px dashed', borderColor: 'divider',
        }}>
          <BusinessIcon sx={{ fontSize: 38, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: INK }}>
            برای مشاهدهٔ پرونده، یک طرف حساب انتخاب کنید
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 11.5, color: MUTED }}>
            فهرست کامل پرونده‌ها در «پرونده‌های خرید» قابل مشاهده است.
          </Typography>
          <Button size="small" variant="outlined" sx={{ mt: 1.5 }}
            onClick={() => { window.location.assign('/procurement/profiles'); }}>
            فهرست پرونده‌های خرید
          </Button>
        </Paper>
      </Box>
    );
  }

  if (profileQuery.isError || !supplier) {
    return (
      <Box>
        <PageHeader icon={<BusinessIcon />} title="پرونده خرید" actions={picker} />
        <Alert severity="error" sx={{ borderRadius: '12px', fontSize: 12 }}
          action={(
            <Button size="small" onClick={() => profileQuery.refetch()}>تلاش دوباره</Button>
          )}>
          پروندهٔ این طرف حساب دریافت نشد.
        </Alert>
      </Box>
    );
  }

  const quickLinks = [
    { label: 'سفارش‌ها', count: orders.length, icon: ShoppingCartIcon, color: RIAL_BLUE, tab: 1 },
    { label: 'پیشنهادها', count: quotations.length, icon: RequestQuoteIcon, color: VIOLET, tab: 2 },
    { label: 'پیش‌فاکتورها', count: proformas.length, icon: ReceiptLongIcon, color: CYAN, tab: 3 },
    { label: 'صورتحساب‌ها', count: invoices.length, icon: ReceiptLongIcon, color: AMBER, tab: 4 },
    { label: 'پرداخت‌ها', count: payments.length, icon: PaymentsIcon, color: GREEN, tab: 5 },
    { label: 'تضامین', count: guarantees.length, icon: VerifiedUserIcon, color: AMBER, tab: 6 },
    { label: 'اسناد', count: documents.length, icon: FolderOpenIcon, color: SLATE, tab: 7 },
    { label: 'خط زمانی', count: timeline.length, icon: TimelineIcon, color: RIAL_BLUE, tab: 8 },
  ];

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<BusinessIcon />}
        title="پرونده خرید"
        subtitle="کارت اعتباری و سابقهٔ کامل خرید یک طرف حساب"
        badge={(
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" alignItems="center">
            <StatusChip label={statusMeta.label} color={statusMeta.color} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: MUTED }}>
              {`${formatPersianNumber(orders.length)} سفارش · ${formatPersianNumber(invoices.length)} صورتحساب`}
            </Typography>
          </Stack>
        )}
        actions={(
          <>
            {picker}
            <Button size="small" variant="text" startIcon={<ArrowBackIcon />}
              onClick={() => { window.location.assign('/procurement/profiles'); }}>
              فهرست
            </Button>
          </>
        )}
      />

      {/* ---- کارت هویت طرف حساب ---- */}
      <Paper elevation={0} sx={{
        mb: 1.5, p: `${moduleTheme.cardPadX}px`, borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        borderRight: `3px solid ${alpha(statusMeta.color, 0.75)}`,
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
          <Box sx={{ minWidth: { md: 260 }, maxWidth: { md: 340 } }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{
                width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
                display: 'grid', placeItems: 'center',
                bgcolor: alpha(statusMeta.color, 0.1), color: statusMeta.color,
              }}>
                <BusinessIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap title={supplier.name} sx={{ fontSize: 14.5, fontWeight: 900, color: INK }}>
                  {supplier.name}
                </Typography>
                <Typography noWrap sx={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>
                  {`کد ${toPersianDigits(supplier.code || '—')}`}
                  {supplier.category_name ? ` · ${supplier.category_name}` : ''}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.1 }}>
              <Box>
                <Typography sx={{ fontSize: 10, color: MUTED }}>امتیاز</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: AMBER }}>
                  {`${formatPersianNumber(supplier.rating || 0)} / ۵`}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography sx={{ fontSize: 10, color: MUTED }}>سقف اعتبار</Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: INK }}>
                  {supplier.credit_limit ? compactMoney(supplier.credit_limit) : '—'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{
            flex: 1, display: 'grid', gap: 1,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
          }}>
            <SpecTile label="شناسه ملی / کد ثبت" value={toPersianDigits(supplier.national_id || '')} />
            <SpecTile label="کد اقتصادی" value={toPersianDigits(supplier.economic_code || '')} />
            <SpecTile label="شناسه مالیاتی" value={toPersianDigits(supplier.tax_id || '')} />
            <SpecTile label="شماره ثبت" value={toPersianDigits(supplier.registration_number || '')} />
            <SpecTile label="تلفن / موبایل" value={supplier.mobile || supplier.phone || ''} />
            <SpecTile label="شخص رابط" value={supplier.contact_person || ''} />
            <SpecTile label="شماره شبا" value={supplier.sheba_number
              ? `IR${toPersianDigits(String(supplier.sheba_number).replace(/^IR/i, ''))}` : ''} />
            <SpecTile label="شرایط پرداخت" value={supplier.payment_terms || ''} />
          </Box>

      {/* ---- کاشی‌های مالی ---- */}
      <Box sx={{
        display: 'grid', gap: 1.25, mb: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          xl: 'repeat(6, minmax(0, 1fr))',
        },
      }}>
        <MetricTile theme={moduleTheme} icon={ShoppingCartIcon} label="ارزش سفارش‌ها"
          value={compactMoney(orderStats.amount)} suffix="ریال"
          hint={`${formatPersianNumber(orderStats.count || 0)} سفارش · میانگین ${compactMoney(orderStats.average)}`}
          color={RIAL_BLUE} onClick={() => setTab(1)} />
        <MetricTile theme={moduleTheme} icon={TimelineIcon} label="سفارش در جریان"
          value={formatPersianNumber(orderStats.open_count || 0)} suffix="سفارش"
          hint={compactMoney(orderStats.open_amount)} color={GREEN} onClick={() => setTab(1)} />
        <MetricTile theme={moduleTheme} icon={ReceiptLongIcon} label="صورتحساب‌شده"
          value={compactMoney(invoiceStats.invoiced)} suffix="ریال"
          hint={`${formatPersianNumber(invoiceStats.count || 0)} فقره`} color={CYAN}
          onClick={() => setTab(4)} />
        <MetricTile theme={moduleTheme} icon={PaymentsIcon} label="پرداخت‌شده"
          value={compactMoney(invoiceStats.paid)} suffix="ریال"
          hint={`نرخ تسویه ${formatPersianPercent(summary.collection_rate || 0)}`} color={GREEN}
          onClick={() => setTab(5)} />
        <MetricTile theme={moduleTheme} icon={ReceiptLongIcon} label="ماندهٔ تسویه"
          value={compactMoney(invoiceStats.balance)} suffix="ریال"
          hint={`${formatPersianNumber(invoiceStats.overdue_count || 0)} فاکتور معوق`}
          color={Number(invoiceStats.balance || 0) > 0 ? AMBER : GREEN} onClick={() => setTab(4)} />
        <MetricTile theme={moduleTheme} icon={VerifiedUserIcon} label="تضامین فعال"
          value={compactMoney(guaranteeStats.active_amount)} suffix="ریال"
          hint={`${formatPersianNumber(guaranteeStats.active_count || 0)} فقره · ${formatPersianNumber(guaranteeStats.expiring_count || 0)} نزدیک انقضا`}
          color={AMBER} onClick={() => setTab(6)} />
      </Box>

      {/* ---- دسترسی سریع ---- */}
      <Box sx={{
        mb: 1.5,
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: { xs: 'minmax(150px, 1fr)', md: 'minmax(0, 1fr)' },
        gap: 1,
        overflowX: 'auto',
        pb: 0.5,
      }}>
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Box
              key={item.label}
              role="button"
              tabIndex={0}
              onClick={() => setTab(item.tab)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setTab(item.tab);
                }
              }}
              sx={{
                px: 1.1, py: 0.9, minWidth: 0,
                display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                borderRadius: '12px', border: '1px solid', borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: 'border-color .15s ease, transform .15s ease, background-color .15s ease',
                '&:hover': {
                  borderColor: alpha(item.color, 0.45), transform: 'translateY(-1px)',
                  bgcolor: alpha(item.color, 0.02),
                },
              }}
            >
              <Box sx={{
                width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(item.color, 0.08), color: item.color,
              }}>
                <Icon sx={{ fontSize: 16 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                  {item.label}
                </Typography>
                <Typography noWrap sx={{ mt: 0.1, fontSize: 10.5, color: MUTED }}>
                  {item.count ? `${toPersianDigits(item.count)} مورد` : 'بدون مورد'}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

        </Stack>
      </Paper>


      {/* ---- تب‌های پرونده ---- */}
      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-radius-large, 18px)',
        border: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', boxShadow: 'none', overflow: 'hidden',
      }}>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1, borderBottom: '1px solid', borderColor: 'divider', minHeight: 42,
            '& .MuiTab-root': {
              minHeight: 42, py: 0.5, fontSize: 12.5, fontWeight: 700, textTransform: 'none',
            },
          }}
        >
          {[
            'نمای کلی', 'سفارش‌ها', 'پیشنهادها (RFQ)', 'پیش‌فاکتورها', 'صورتحساب‌ها',
            'پرداخت‌ها', 'تضامین', 'اسناد', 'خط زمانی',
          ].map((label, index) => (
            <Tab key={label} value={index} label={label} />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 1.25, md: 1.75 } }}>
          {tab === 0 ? (
            <Box sx={{
              display: 'grid', gap: 1.5,
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
            }}>
              <Panel theme={moduleTheme} icon={InsightsIcon} color={RIAL_BLUE}
                title="جریان خرید در شش ماه" hint="تعداد سفارش و ارزش ریالی">
                <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mb: 0.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: MUTED }}>ارزش سفارش‌ها</Typography>
                    <Typography sx={{
                      fontSize: 15, fontWeight: 900, color: RIAL_BLUE,
                      fontFamily: 'var(--hrms-table-number-font, inherit)',
                    }}>
                      {money(orderStats.amount)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: MUTED }}>سهم ارزی</Typography>
                    <Typography sx={{ fontSize: 15, fontWeight: 900, color: FOREIGN_VIOLET }}>
                      {formatPersianPercent(orderStats.amount
                        ? (Number(orderStats.foreign_amount || 0) / Number(orderStats.amount)) * 100 : 0)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 10.5, color: MUTED }}>میانگین سفارش</Typography>
                    <Typography sx={{ fontSize: 15, fontWeight: 900, color: INK }}>
                      {compactMoney(orderStats.average)}
                    </Typography>
                  </Box>
                </Stack>
                <SparkLine data={monthly} dataKey="ordered" color={RIAL_BLUE} height={54} />
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.5 }}>
                  <StatRow label="نرخ تسویه" value={formatPersianPercent(summary.collection_rate || 0)} color={GREEN} strong />
                  <StatRow label="فاکتور معوق" value={`${formatPersianNumber(invoiceStats.overdue_count || 0)} فقره`}
                    color={invoiceStats.overdue_count ? RED : GREEN} />
                  <StatRow label="پرداخت‌ها" value={`${formatPersianNumber(paymentStats.count || 0)} فقره`} />
                  <StatRow label="پیشنهادها"
                    value={`${formatPersianNumber((summary.quotations || {}).count || 0)} فقره`} color={VIOLET} />
                  <StatRow label="سفارش ریالی" value={`${formatPersianNumber(orderStats.rial_count || 0)} فقره`} />
                  <StatRow label="سفارش ارزی" value={`${formatPersianNumber(orderStats.foreign_count || 0)} فقره`}
                    color={FOREIGN_VIOLET} />
                </Box>
                {(orderStats.by_currency || []).length ? (
                  <Box sx={{ mt: 0.75 }}>
                    {(orderStats.by_currency || []).map((row) => (
                      <SchematicRow key={row.currency} color={FOREIGN_VIOLET}
                        label={`${row.currency} · ${formatPersianNumber(row.count)} سفارش`}
                        value={compactMoney(row.amount, row.currency)}
                        share={orderStats.foreign_amount
                          ? (Number(row.rial_amount || 0) / Number(orderStats.foreign_amount)) * 100 : 0}
                        hint={`معادل ${compactMoney(row.rial_amount)} ریال`} />
                    ))}
                  </Box>
                ) : null}
              </Panel>


              <Panel theme={moduleTheme} icon={TimelineIcon} color={CYAN}
                title="آخرین اسناد پرونده" hint="تازه‌ترین رویدادهای خرید">
                {recentDocuments.length ? recentDocuments.map((row) => (
                  <Box key={`${row.kindLabel}-${row.id}`} sx={{
                    py: 0.6, px: 0.5, borderBottom: '1px dashed', borderColor: 'divider',
                  }}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <StatusChip label={row.kindLabel} color={row.tone} />
                      <Typography noWrap sx={{
                        fontSize: 11.5, fontWeight: 800, color: INK, flex: 1, minWidth: 0,
                      }}>
                        {row.number || row.title || `#${toPersianDigits(row.id)}`}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: row.tone }}>
                        {row.amount != null || row.total != null ? compactMoney(rowMoney(row)) : '—'}
                      </Typography>
                    </Stack>
                    <Typography sx={{ mt: 0.2, fontSize: 10, color: MUTED }}>
                      {dateLabel(row.when)}
                      {row.status_label ? ` · ${row.status_label}` : ''}
                    </Typography>
                  </Box>
                )) : <EmptyNote icon={TimelineIcon} text="سندی برای این طرف حساب ثبت نشده است." />}
              </Panel>
            </Box>
          ) : null}

          {tab === 1 ? (
            <DocumentsTable
              emptyText="سفارش خریدی برای این طرف حساب ثبت نشده است."
              rows={orders}
              columns={[
                { key: 'number', label: 'شماره', render: (row) => toPersianDigits(row.number || row.id) },
                { key: 'date', label: 'تاریخ سفارش', render: (row) => dateLabel(row.date) },
                { key: 'amount', label: 'مبلغ', render: (row) => (row.group === 'foreign'
                  ? `${money(row.amount)} ${row.currency || ''}`.trim() : `${money(row.amount)} ریال`) },
                { key: 'rial', label: 'معادل ریالی', render: (row) => money(row.rial_amount) },
                { key: 'status_label', label: 'وضعیت', render: (row) => (
                  <StatusChip label={row.status_label || '—'}
                    color={row.status === 'closed' ? SLATE : (row.status === 'cancelled' ? RED : RIAL_BLUE)} />
                ) },
                { key: 'expected_date', label: 'تحویل', render: (row) => (
                  <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                    <Typography sx={{ fontSize: 11.5 }}>{dateLabel(row.expected_date)}</Typography>
                    {row.expected_date ? (
                      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: daysColor(row.days ?? null) }}>
                        {daysText(row.days ?? null)}
                      </Typography>
                    ) : null}
                  </Stack>
                ) },
              ]}
            />
          ) : null}


          {tab === 2 ? (
            <DocumentsTable
              emptyText="پیشنهادی از این تأمین‌کننده ثبت نشده است."
              rows={quotations}
              columns={[
                { key: 'number', label: 'شماره', render: (row) => toPersianDigits(row.number || row.id) },
                { key: 'inquiry_number', label: 'استعلام', render: (row) => toPersianDigits(row.inquiry_number || '—') },
                { key: 'date', label: 'تاریخ', render: (row) => dateLabel(row.date) },
                { key: 'total', label: 'مبلغ', render: (row) => money(row.total) },
                { key: 'delivery_days', label: 'تحویل (روز)', render: (row) => formatPersianNumber(row.delivery_days || 0) },
                { key: 'status_label', label: 'وضعیت', render: (row) => (
                  <StatusChip label={row.status_label || '—'} color={VIOLET} />
                ) },
                { key: 'is_winner', label: 'برنده', render: (row) => (row.is_winner
                  ? <StatusChip label="برندهٔ استعلام" color={GREEN} />
                  : <Typography sx={{ fontSize: 11, color: MUTED }}>—</Typography>) },
              ]}
            />
          ) : null}

          {tab === 3 ? (
            <DocumentsTable
              emptyText="پیش‌فاکتوری برای این طرف حساب ثبت نشده است."
              rows={proformas}
              columns={[
                { key: 'number', label: 'شماره', render: (row) => toPersianDigits(row.number || row.id) },
                { key: 'date', label: 'تاریخ', render: (row) => dateLabel(row.date) },
                { key: 'total', label: 'مبلغ', render: (row) => (row.group === 'foreign'
                  ? `${money(row.amount)} ${row.currency || ''}`.trim() : money(row.amount)) },
                { key: 'rial', label: 'معادل ریالی', render: (row) => money(row.rial_amount) },
                { key: 'status_label', label: 'وضعیت', render: (row) => (
                  <StatusChip label={row.status_label || '—'} color={CYAN} />
                ) },
              ]}
            />
          ) : null}

          {tab === 4 ? (
            <DocumentsTable
              emptyText="صورتحسابی برای این طرف حساب ثبت نشده است."
              rows={invoices}
              columns={[
                { key: 'number', label: 'شماره', render: (row) => toPersianDigits(row.number || row.id) },
                { key: 'date', label: 'تاریخ', render: (row) => dateLabel(row.date) },
                { key: 'due_date', label: 'سررسید', render: (row) => dateLabel(row.due_date) },
                { key: 'total', label: 'مبلغ', render: (row) => money(row.rial_amount) },
                { key: 'paid', label: 'پرداخت‌شده', render: (row) => money(row.paid_amount) },
                { key: 'balance', label: 'مانده', render: (row) => money(
                  Math.max(0, Number(row.rial_amount || 0) - Number(row.paid_amount || 0)),
                ) },
                { key: 'payment_status', label: 'وضعیت پرداخت', render: (row) => {
                  const meta = PAYMENT_STATUS[row.payment_status] || PAYMENT_STATUS.unpaid;
                  return (
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                      <StatusChip label={meta.label} color={meta.color} />
                      {row.overdue ? <StatusChip label="معوق" color={RED} /> : null}
                    </Stack>
                  );
                } },
              ]}
            />
          ) : null}


          {tab === 5 ? (
            <DocumentsTable
              emptyText="پرداختی برای این طرف حساب ثبت نشده است."
              rows={payments}
              columns={[
                { key: 'date', label: 'تاریخ', render: (row) => dateLabel(row.date) },
                { key: 'invoice_number', label: 'صورتحساب', render: (row) => toPersianDigits(row.invoice_number || row.invoice_id || '—') },
                { key: 'amount', label: 'مبلغ', render: (row) => money(row.amount) },
                { key: 'method_label', label: 'روش', render: (row) => row.method_label || '—' },
                { key: 'reference', label: 'شماره مرجع', render: (row) => toPersianDigits(row.reference || '—') },
                { key: 'bank', label: 'بانک', render: (row) => row.bank || '—' },
              ]}
            />
          ) : null}

          {tab === 6 ? (
            <DocumentsTable
              emptyText="تضمینی برای این طرف حساب ثبت نشده است."
              rows={guarantees}
              columns={[
                { key: 'number', label: 'شماره', render: (row) => toPersianDigits(row.number || row.id) },
                { key: 'kind_label', label: 'نوع', render: (row) => row.kind_label || '—' },
                { key: 'instrument_type', label: 'ابزار', render: (row) => (row.instrument_type === 'check'
                  ? 'چک' : row.instrument_type === 'bank_guarantee' ? 'ضمانت‌نامه'
                    : row.instrument_type === 'promissory' ? 'سفته'
                      : row.instrument_type === 'cash_deposit' ? 'وجه نقد' : '—') },
                { key: 'amount', label: 'مبلغ', render: (row) => money(row.amount) },
                { key: 'issue_date', label: 'صدور', render: (row) => dateLabel(row.issue_date) },
                { key: 'valid_until', label: 'اعتبار تا', render: (row) => dateLabel(row.valid_until) },
                { key: 'state', label: 'وضعیت', align: 'center', render: (row) => {
                  if (row.is_released) return <StatusChip label="آزادشده" color={SLATE} />;
                  if (row.is_expired) return <StatusChip label="منقضی" color={RED} />;
                  const days = row.days_to_expiry;
                  if (days != null && days <= 30) {
                    return <StatusChip label={`${formatPersianNumber(days)} روز`} color={AMBER} />;
                  }
                  return <StatusChip label="معتبر" color={GREEN} />;
                } },
              ]}
            />
          ) : null}


          {tab === 7 ? (
            <DocumentsTable
              emptyText="سندی برای این طرف حساب بارگذاری نشده است."
              rows={documents}
              columns={[
                { key: 'title', label: 'عنوان', render: (row) => row.title || '—' },
                { key: 'kind_label', label: 'نوع سند', render: (row) => row.kind_label || '—' },
                { key: 'size', label: 'حجم', render: (row) => (row.size
                  ? `${toPersianDigits(Math.max(1, Math.round(row.size / 1024)))} کیلوبایت` : '—') },
                { key: 'created_at', label: 'تاریخ', render: (row) => dateLabel(row.created_at) },
                { key: 'actions', label: 'عملیات', align: 'center', render: (row) => (
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="باز کردن">
                      <span>
                        <Button size="small" disabled={!row.file_url} sx={{ minWidth: 0, px: 0.75 }}
                          onClick={() => window.open(row.file_url, '_blank', 'noopener,noreferrer')}>
                          <OpenInNewIcon sx={{ fontSize: 15 }} />
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="دانلود">
                      <span>
                        <Button size="small" disabled={!row.file_url} sx={{ minWidth: 0, px: 0.75 }}
                          component="a" href={row.file_url || '#'} download>
                          <DownloadIcon sx={{ fontSize: 15 }} />
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                ) },
              ]}
            />
          ) : null}

          {tab === 8 ? (
            timeline.length ? (
              <Stack spacing={0.75}>
                {timeline.map((event, index) => (
                  <Stack key={`${event.kind}-${index}`} direction="row" spacing={1}
                    sx={{ p: 0.9, borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', mt: 0.7, flex: '0 0 auto',
                      bgcolor: event.tone || SLATE,
                    }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" alignItems="baseline" spacing={0.75}>
                        <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                          {event.title}
                        </Typography>
                        <StatusChip label={event.label} color={event.tone || SLATE} />
                        <Box sx={{ flex: 1 }} />
                        {event.amount != null ? (
                          <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, color: event.tone || INK }}>
                            {compactMoney(event.amount)}
                          </Typography>
                        ) : null}
                      </Stack>
                      <Typography sx={{ mt: 0.2, fontSize: 10.5, color: MUTED }}>
                        {dateLabel(event.date)}
                        {event.detail ? ` · ${event.detail}` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            ) : <EmptyNote icon={TimelineIcon} text="رویدادی برای این پرونده ثبت نشده است." />
          ) : null}
        </Box>
      </Paper>
    </Box>
  );
};

export default ProcurementSupplierProfilePage;

