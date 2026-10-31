import React, { useMemo } from 'react';
import { Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from 'recharts';

import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import { toJalali } from '../../../core/utils/dateUtils';

const INK = '#0f172a';
const MUTED = '#64748b';
const COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6'];
const LEVEL_COLORS = { error: '#dc2626', warning: '#d97706', info: '#0284c7' };
const PERSON_LABELS = { legal: 'حقوقی', natural: 'حقیقی', foreign: 'خارجی', aggregate: 'تجمیعی' };

const num = (value) => Number(value) || 0;
const percent = (value) => `${toPersianDigits(Math.round(num(value) * 100))}٪`;
const amountOf = (row) => num(String(row.amount ?? '').replace(/[^\d.-]/g, ''));
const vatOf = (row) => num(String(row.vat ?? '').replace(/[^\d.-]/g, ''));

/* تحلیل محلی (وقتی سرور در دسترس نیست): همان شکل پاسخ API */
const buildLocalAnalytics = (rows) => {
  const filled = (rows || []).filter((row) => String(row.amount ?? '').trim() || String(row.name ?? '').trim());
  const amount = filled.reduce((sum, row) => sum + amountOf(row), 0);
  const vat = filled.reduce((sum, row) => sum + vatOf(row), 0);
  const registered = filled.filter((row) => row.status === 'registered').length;
  const personTypes = new Map();
  const kinds = new Map();
  const months = new Map();
  const parties = new Map();

  filled.forEach((row) => {
    const type = row.personType || 'unknown';
    const typeEntry = personTypes.get(type) || { key: type, count: 0, amount: 0 };
    typeEntry.count += 1;
    typeEntry.amount += amountOf(row);
    personTypes.set(type, typeEntry);

    const kindKey = Number(row.kind) || 1;
    const kindEntry = kinds.get(kindKey) || { key: kindKey, count: 0, amount: 0 };
    kindEntry.count += 1;
    kindEntry.amount += amountOf(row);
    kinds.set(kindKey, kindEntry);

    const monthKey = row.invoiceDate ? String(toJalali(row.invoiceDate)).slice(0, 7) : 'بدون تاریخ';
    const monthEntry = months.get(monthKey) || { key: monthKey, label: monthKey, count: 0, amount: 0 };
    monthEntry.count += 1;
    monthEntry.amount += amountOf(row);
    months.set(monthKey, monthEntry);

    const name = String(row.name || '').trim() || 'بدون نام';
    const key = `${name}|${type}`;
    const partyEntry = parties.get(key) || { name, person_type: type, count: 0, amount: 0 };
    partyEntry.count += 1;
    partyEntry.amount += amountOf(row);
    parties.set(key, partyEntry);
  });

  const ranked = [...parties.values()].sort((a, b) => b.amount - a.amount);
  const shares = ranked.map((party) => (amount ? party.amount / amount : 0));
  let running = 0;
  let pareto = 0;
  shares.forEach((share) => {
    if (running < 0.8) {
      running += share;
      pareto += 1;
    }
  });

  let cumulative = 0;
  const topParties = ranked.slice(0, 12).map((party, index) => {
    cumulative += party.amount;
    return {
      rank: index + 1,
      name: party.name,
      person_type: party.person_type,
      person_type_label: PERSON_LABELS[party.person_type] || 'نامشخص',
      count: party.count,
      amount: party.amount,
      share: amount ? party.amount / amount : 0,
      cumulative_share: amount ? cumulative / amount : 0,
    };
  });

  return {
    offline: true,
    totals: {
      count: filled.length,
      amount,
      vat,
      total: amount + vat,
      average_invoice: filled.length ? amount / filled.length : 0,
      registered,
      pending: filled.length - registered,
      registered_ratio: filled.length ? registered / filled.length : 0,
      vat_ratio: amount ? vat / amount : 0,
    },
    by_person_type: [...personTypes.values()]
      .map((entry) => ({
        ...entry,
        label: PERSON_LABELS[entry.key] || 'نامشخص',
        share: amount ? entry.amount / amount : 0,
      }))
      .sort((a, b) => b.amount - a.amount),
    by_kind: [...kinds.values()].map((entry) => ({ ...entry, label: `نوع ${entry.key}` })),
    by_month: [...months.values()].sort((a, b) => String(a.key).localeCompare(String(b.key))),
    top_parties: topParties,
    concentration: {
      parties: ranked.length,
      top1_share: shares[0] || 0,
      top5_share: shares.slice(0, 5).reduce((sum, share) => sum + share, 0),
      pareto_parties: pareto,
    },
    quality: {
      missing_postal_code: filled.filter((row) => !String(row.postalCode ?? '').trim()).length,
      missing_invoice_date: filled.filter((row) => !row.invoiceDate).length,
      missing_invoice_no: filled.filter((row) => !String(row.invoiceNo ?? '').trim()).length,
      aggregate_rows: filled.filter((row) => row.personType === 'aggregate').length,
      foreign_rows: filled.filter((row) => row.personType === 'foreign').length,
    },
    insights: [],
  };
};


const KpiCard = ({ label, value, hint, color = INK }) => (
  <Paper
    elevation={0}
    sx={{
      flex: '1 1 150px', minWidth: 148, px: 1.4, py: 1.1, borderRadius: '12px',
      border: '1px solid var(--hrms-table-border-color, #e2e8f0)', bgcolor: 'background.paper',
    }}
  >
    <Typography sx={{ fontSize: 10.5, color: MUTED }}>{label}</Typography>
    <Typography noWrap sx={{ fontSize: 15.5, fontWeight: 900, color, mt: 0.25 }}>{value}</Typography>
    {hint ? <Typography sx={{ fontSize: 10, color: MUTED }}>{hint}</Typography> : null}
  </Paper>
);

const SectionPaper = ({ title, subtitle, children }) => (
  <Paper
    elevation={0}
    sx={{
      flex: '1 1 320px', minWidth: 300, px: 1.4, py: 1.2, borderRadius: '12px',
      border: '1px solid var(--hrms-table-border-color, #e2e8f0)', bgcolor: 'background.paper',
    }}
  >
    <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.75 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{title}</Typography>
      {subtitle ? <Typography sx={{ fontSize: 10, color: MUTED }}>{subtitle}</Typography> : null}
    </Stack>
    {children}
  </Paper>
);

const SeasonalAnalyticsPanel = ({ analytics, rows, loading, error }) => {
  const data = useMemo(() => analytics || buildLocalAnalytics(rows || []), [analytics, rows]);

  if (loading && !analytics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  const totals = data.totals || {};
  const monthData = (data.by_month || []).map((entry) => ({
    name: entry.label,
    مبلغ: Math.round(num(entry.amount) / 1000),
  }));
  const personData = (data.by_person_type || []).map((entry) => ({
    name: entry.label,
    value: num(entry.amount),
  }));
  const topData = (data.top_parties || []).slice(0, 10).map((party) => ({
    name: party.name.length > 20 ? `${party.name.slice(0, 20)}…` : party.name,
    مبلغ: Math.round(num(party.amount) / 1000),
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {error ? (
        <Typography sx={{ fontSize: 11, color: '#b45309' }}>
          تحلیل سرور در دسترس نبود؛ نمودارها از داده‌های همین صفحه ساخته شد.
        </Typography>
      ) : null}
      {data.offline ? (
        <Chip
          size="small"
          label="تحلیل محلی (سرور در دسترس نیست)"
          sx={{ alignSelf: 'flex-start', fontSize: 10, height: 22, bgcolor: '#fef3c7', color: '#92400e' }}
        />
      ) : null}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <KpiCard label="جمع مبلغ خرید" value={formatPersianNumber(totals.amount)} hint="ریال" />
        <KpiCard label="مالیات بر ارزش افزوده" value={formatPersianNumber(totals.vat)}
                 hint={`نرخ مؤثر ${percent(totals.vat_ratio)}`} color="#b45309" />
        <KpiCard label="جمع کل" value={formatPersianNumber(totals.total)} hint="مبلغ + مالیات" />
        <KpiCard label="تعداد ردیف" value={toPersianDigits(totals.count || 0)}
                 hint={`میانگین فاکتور ${formatPersianNumber(Math.round(num(totals.average_invoice)))}`} />
        <KpiCard label="درج در سامانه مودیان"
                 value={`${toPersianDigits(totals.registered || 0)} از ${toPersianDigits(totals.count || 0)}`}
                 hint={percent(totals.registered_ratio)} color="#15803d" />
        <KpiCard label="تمرکز خرید (پارتو)"
                 value={`${toPersianDigits(data.concentration?.pareto_parties || 0)} طرف`}
                 hint={`سهم بزرگ‌ترین طرف ${percent(data.concentration?.top1_share)}`} color="#7c3aed" />
      </Box>

      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
        <SectionPaper title="روند ماهانه خرید" subtitle="ارقام به هزار ریال">
          <Box sx={{ height: 185 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <ChartTooltip contentStyle={{ fontSize: 11, direction: 'rtl' }} />
                <Bar dataKey="مبلغ" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </SectionPaper>

        <SectionPaper title="ترکیب بر اساس نوع طرف معامله">
          <Box sx={{ height: 185 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={personData} dataKey="value" nameKey="name" innerRadius={36} outerRadius={62}
                     paddingAngle={2}>
                  {personData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ChartTooltip
                  contentStyle={{ fontSize: 11, direction: 'rtl' }}
                  formatter={(value) => formatPersianNumber(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </SectionPaper>

        <SectionPaper title="بیشترین خرید از طرف‌ها" subtitle="۱۰ طرف نخست (هزار ریال)">
          <Box sx={{ height: 185 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topData} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={105} />
                <ChartTooltip contentStyle={{ fontSize: 11, direction: 'rtl' }} />
                <Bar dataKey="مبلغ" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </SectionPaper>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
        <SectionPaper title="یافته‌ها و کیفیت داده" subtitle="قابل اقدام">
          <Stack spacing={0.6}>
            {(data.insights || []).length ? data.insights.map((insight) => (
              <Box key={`${insight.title}-${insight.detail}`} sx={{ display: 'flex', gap: 0.75 }}>
                <Box sx={{
                  width: 6, minWidth: 6, borderRadius: 2, mt: 0.4,
                  bgcolor: LEVEL_COLORS[insight.level] || '#0284c7',
                }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: INK }}>{insight.title}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: MUTED, lineHeight: 1.7 }}>{insight.detail}</Typography>
                </Box>
              </Box>
            )) : (
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                یافتهٔ خودکاری برای این فصل ثبت نشد (تحلیل محلی یافته تولید نمی‌کند).
              </Typography>
            )}
          </Stack>
        </SectionPaper>

        <SectionPaper title="نقاط ضعف داده" subtitle="پیش از ارسال تکمیل شود">
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <KpiCard label="بدون کد پستی" value={toPersianDigits(data.quality?.missing_postal_code || 0)} color="#b45309" />
            <KpiCard label="بدون شمارهٔ فاکتور" value={toPersianDigits(data.quality?.missing_invoice_no || 0)} />
            <KpiCard label="بدون تاریخ فاکتور" value={toPersianDigits(data.quality?.missing_invoice_date || 0)} />
            <KpiCard label="ردیف تجمیعی" value={toPersianDigits(data.quality?.aggregate_rows || 0)} />
            <KpiCard label="فروشندهٔ خارجی" value={toPersianDigits(data.quality?.foreign_rows || 0)} />
          </Box>
        </SectionPaper>
      </Box>
    </Box>
  );
};

export default SeasonalAnalyticsPanel;




