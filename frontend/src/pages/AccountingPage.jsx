import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Grid, Button, Stack, Chip, Autocomplete, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip,
  CircularProgress,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DescriptionIcon from '@mui/icons-material/Description';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HubIcon from '@mui/icons-material/Hub';
import InsightsIcon from '@mui/icons-material/Insights';
import LockIcon from '@mui/icons-material/Lock';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PaymentsIcon from '@mui/icons-material/Payments';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PieChartIcon from '@mui/icons-material/PieChart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, PieChart, Pie, Cell,
} from 'recharts';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import {
  SurfaceCard, KpiTile, ProgressBar, RatioRow, QuickTile,
  INK, MUTED, CARD_BG, CARD_BORDER, SOFT_BG,
} from './accounting/AccountingDashboardUI';

const BLUE = '#2563eb';
const CYAN = '#0891b2';
const VIOLET = '#8b5cf6';
const GREEN = '#0f766e';
const RED = '#e11d48';
const AMBER = '#d97706';

const STATUS_COLORS = {
  draft: '#64748b', submitted: '#f59e0b', approved: '#2563eb',
  posted: '#0f766e', locked: '#6366f1', reversed: '#e11d48',
};
const STATUS_LABELS = {
  draft: 'پیش‌نویس', submitted: 'در انتظار تأیید', approved: 'تأییدشده',
  posted: 'ثبت‌شده', locked: 'قفل‌شده', reversed: 'برگشت‌خورده',
};

const CATEGORY_COLORS = {
  asset: BLUE, liability: RED, equity: VIOLET, revenue: GREEN,
  expense: AMBER, cost_of_sales: CYAN, memorandum: '#64748b',
};

const tableHeadSx = {
  px: 1, py: 1, fontSize: 10.5, fontWeight: 800, color: '#334155',
  bgcolor: '#f1f5f9', borderBottom: '1px solid #dbe4ee', whiteSpace: 'nowrap',
  textAlign: 'center',
};
const tableCellSx = {
  px: 1, py: 0.8, fontSize: 10.5, color: '#334155',
  borderBottom: '1px solid #eef2f7', whiteSpace: 'nowrap',
  textAlign: 'center', fontVariantNumeric: 'tabular-nums',
};

const QUICK_ACTIONS = [
  { label: 'سند جدید', description: 'ثبت سند حسابداری', icon: AddIcon, path: '/accounting/document-new', color: BLUE },
  { label: 'اسناد حسابداری', description: 'مشاهده و ویرایش دفاتر', icon: DescriptionIcon, path: '/accounting/documents', color: CYAN },
  { label: 'تراز آزمایشی', description: 'تراز درختی حساب‌ها', icon: AccountTreeIcon, path: '/accounting/reports/tree-trial-balance', color: VIOLET },
  { label: 'ترازنامه', description: 'وضعیت دارایی و بدهی', icon: AccountBalanceIcon, path: '/accounting/reports/balance-sheet', color: BLUE },
  { label: 'سود و زیان', description: 'عملکرد درآمد و هزینه', icon: TrendingUpIcon, path: '/accounting/reports/income-statement', color: GREEN },
  { label: 'جریان نقد', description: 'گردش وجه نقد', icon: PaymentsIcon, path: '/accounting/reports/cash-flow', color: CYAN },
  { label: 'معاملات فصلی', description: 'گزارش فصلی مالیات', icon: ReceiptLongIcon, path: '/accounting/tax/seasonal', color: AMBER },
  { label: 'دفتر ارزش افزوده', description: 'مالیات خرید و فروش', icon: MenuBookIcon, path: '/accounting/tax/vat-ledger', color: VIOLET },
  { label: 'کنترل اسناد', description: 'بررسی و تأیید نهایی', icon: FactCheckIcon, path: '/accounting/documents/control', color: RED },
  { label: 'مغایرت بانکی', description: 'تطبیق صورت‌حساب', icon: CompareArrowsIcon, path: '/accounting/reconciliation', color: CYAN },
  { label: 'نگاشت داده', description: 'ایمپورت اطلاعات مالی', icon: UploadFileIcon, path: '/accounting/datamapping', color: VIOLET },
  { label: 'قالب‌های ثبت', description: 'اتصال سیستم‌های دیگر', icon: HubIcon, path: '/accounting/integration', color: BLUE },
];

const AccountingPage = () => {
  const navigate = useNavigate();
  const [year, setYear] = useState(null);

  const { data: yearsData, isLoading: yearsLoading } = useQuery({
    queryKey: ['accounting-fiscal-years-dashboard'],
    queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then((response) => response.data),
  });
  const years = Array.isArray(yearsData) ? yearsData : yearsData?.results || [];

  useEffect(() => {
    if (!years.length || year) return;
    setYear(years.find((item) => item.is_current) || years[0]);
  }, [years, year]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['accounting-dashboard-rich', year?.id],
    queryFn: () => axiosInstance.get('/accounting/reports/dashboard-rich/', {
      params: year?.id ? { fiscal_year: year.id } : {},
    }).then((response) => response.data),
    enabled: Boolean(year?.id),
  });

  const k = data?.kpis || {};
  const eq = data?.accounting_equation || {};
  const deltas = data?.deltas || {};
  const vat = data?.vat_summary || {};
  const aging = data?.aging || { receivable: {}, payable: {} };
  const recentDocs = data?.recent_documents || [];
  const topAccounts = data?.top_accounts || [];
  const categories = data?.category_breakdown || [];
  const trend = (data?.monthly_trend || []).map((month) => ({
    ...month,
    label: `${toPersianDigits(month.month.slice(5))}/${toPersianDigits(month.month.slice(2, 4))}`,
  }));
  const statusData = Object.entries(data?.status_counts || {})
    .map(([key, value]) => ({ key, name: STATUS_LABELS[key] || key, value }))
    .filter((item) => item.value > 0);
  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);

  const totalAssets = Number(k.total_assets || 0);
  const totalLiabilities = Number(k.total_liabilities || 0);
  const totalEquity = Number(k.total_equity || 0);
  const revenueMonth = Number(k.revenue_month || 0);
  const expenseMonth = Number(k.expense_month || 0);
  const netMonth = Number(k.net_profit_month || 0);
  const totalDocuments = Number(k.total_documents || 0);
  const postedDocuments = Number(k.posted_documents || 0);
  const pendingDocuments = Number(k.pending_documents || 0);
  const postingRate = totalDocuments > 0 ? (postedDocuments / totalDocuments) * 100 : 0;
  const netMargin = revenueMonth > 0 ? (netMonth / revenueMonth) * 100 : 0;
  const expenseRatio = revenueMonth > 0 ? (expenseMonth / revenueMonth) * 100 : 0;
  const equityRatio = totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0;
  const liabilityRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const categoryMax = Math.max(...categories.map((item) => Math.abs(Number(item.value || 0))), 1);
  const topTurnoverMax = Math.max(...topAccounts.map((item) => Number(item.turnover || 0)), 1);
  const vatNet = Number(vat.net || 0);

  const yearLabel = year?.name || year?.title || 'سال مالی';
  const loading = yearsLoading || (year && isLoading);

  return (
    <Box>
      <PageHeader
        icon={<CalculateIcon />}
        title="داشبورد حسابداری"
        badge={<Chip size="small" label={yearLabel} sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 800 }} />}
        actions={(
          <>
            <Autocomplete
              size="small"
              options={years}
              value={year}
              onChange={(_, value) => setYear(value)}
              getOptionLabel={(option) => option.name || option.title || '—'}
              isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
              renderInput={(params) => <TextField {...params} label="سال مالی" />}
              sx={{ width: 190 }}
            />
            <Tooltip title="به‌روزرسانی داشبورد">
              <span>
                <Button variant="outlined" startIcon={isFetching ? <CircularProgress size={15} /> : <RefreshIcon />}
                  onClick={() => refetch()} disabled={!year || isFetching}>
                  به‌روزرسانی
                </Button>
              </span>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/accounting/document-new')}>
              سند جدید
            </Button>
          </>
        )}
      />
      {loading ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: '18px' }}>
          <CircularProgress size={30} sx={{ color: BLUE }} />
        </Paper>
      ) : !data ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: '18px' }}>
          <AccountBalanceIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
          <Typography sx={{ fontSize: 12, color: MUTED }}>داده‌ای برای سال مالی انتخاب‌شده یافت نشد.</Typography>
        </Paper>
      ) : (
        <>
          {/* نبض مالی */}
          <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: '20px', boxShadow: 'none' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} lg={4}>
                <Stack direction="row" alignItems="flex-start" spacing={1.35} useFlexGap>
                  <Box sx={{
                    width: 52, height: 52, flexShrink: 0, borderRadius: '15px',
                    bgcolor: '#eff6ff', border: '1px solid #bfdbfe', color: BLUE,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <InsightsIcon sx={{ fontSize: 25 }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 900, color: INK }}>نبض مالی سازمان</Typography>
                    <Typography sx={{ mt: 0.25, fontSize: 10.5, color: MUTED, lineHeight: 1.8 }}>
                      جمع‌بندی وضعیت دفتر کل، عملکرد ماه جاری و سلامت اسناد
                    </Typography>
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                      <Chip size="small" label={eq.balanced ? 'دفاتر تراز است' : 'اختلاف تراز'}
                        sx={{ height: 21, fontSize: 9.5, fontWeight: 800, bgcolor: eq.balanced ? '#eff6ff' : '#fff1f2', color: eq.balanced ? '#1d4ed8' : '#be123c' }} />
                      <Chip size="small" label={`${toPersianDigits(Math.round(postingRate))}٪ ثبت نهایی`}
                        sx={{ height: 21, fontSize: 9.5, bgcolor: '#f8fafc', color: '#475569' }} />
                    </Stack>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} lg={8}>
                <Grid container spacing={1.25}>
                  {[
                    { key: 'revenue', label: 'درآمد ماه', value: revenueMonth, delta: deltas.revenue, color: GREEN, icon: TrendingUpIcon },
                    { key: 'expense', label: 'هزینه ماه', value: expenseMonth, delta: deltas.expense, color: RED, icon: TrendingDownIcon, inverse: true },
                    { key: 'net', label: 'سود / زیان ماه', value: netMonth, delta: deltas.net, color: netMonth >= 0 ? BLUE : RED, icon: ShowChartIcon },
                  ].map((item) => (
                    <Grid item xs={12} sm={4} key={item.key}>
                      <Box sx={{ p: 1.35, height: '100%', borderRadius: '13px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5} useFlexGap>
                          <Stack direction="row" alignItems="center" spacing={0.55} useFlexGap>
                            <Box sx={{ width: 26, height: 26, borderRadius: '8px', bgcolor: '#fff', color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e8edf4' }}>
                              <item.icon sx={{ fontSize: 15 }} />
                            </Box>
                            <Typography sx={{ fontSize: 9.5, color: MUTED }}>{item.label}</Typography>
                          </Stack>
                          <Chip size="small"
                            label={item.delta == null ? '—' : `${Number(item.delta) >= 0 ? '+' : ''}${toPersianDigits(item.delta)}٪`}
                            sx={{
                              height: 19, fontSize: 9, fontWeight: 800,
                              bgcolor: item.delta == null ? '#fff' : (item.inverse ? Number(item.delta) <= 0 : Number(item.delta) >= 0) ? '#eff6ff' : '#fff1f2',
                              color: item.delta == null ? MUTED : (item.inverse ? Number(item.delta) <= 0 : Number(item.delta) >= 0) ? '#1d4ed8' : '#be123c',
                            }} />
                        </Stack>
                        <Typography sx={{ mt: 0.75, fontSize: 15, fontWeight: 900, color: item.color, direction: 'rtl' }}>
                          {formatPersianNumber(item.value)}
                        </Typography>
                        <Typography sx={{ fontSize: 9, color: MUTED }}>ریال</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Paper>


          {/* شاخص‌های کلیدی */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} md={4} lg={2}>
              <KpiTile icon={AccountBalanceIcon} label="مجموع دارایی‌ها" value={formatPersianNumber(totalAssets)} suffix="ریال"
                color={BLUE} hint="ترازنامه" onClick={() => navigate('/accounting/reports/balance-sheet')} size={16} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiTile icon={AccountBalanceWalletIcon} label="مجموع بدهی‌ها" value={formatPersianNumber(totalLiabilities)} suffix="ریال"
                color={RED} hint={`${toPersianDigits(Math.round(liabilityRatio))}٪ از دارایی‌ها`} onClick={() => navigate('/accounting/reports/balance-sheet')} size={16} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiTile icon={TrendingUpIcon} label="حقوق مالکانه" value={formatPersianNumber(totalEquity)} suffix="ریال"
                color={VIOLET} hint={`${toPersianDigits(Math.round(equityRatio))}٪ از دارایی‌ها`} onClick={() => navigate('/accounting/reports/balance-sheet')} size={16} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiTile icon={ReceiptLongIcon} label="کل اسناد" value={toPersianDigits(totalDocuments)} suffix="سند"
                color={CYAN} hint="در سال مالی" onClick={() => navigate('/accounting/documents')} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiTile icon={LockIcon} label="ثبت‌شده / قفل" value={toPersianDigits(postedDocuments)} suffix="سند"
                color={GREEN} progress={postingRate} progressLabel={`${toPersianDigits(Math.round(postingRate))}٪ تکمیل`} onClick={() => navigate('/accounting/documents')} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <KpiTile icon={PendingActionsIcon} label="در انتظار تأیید" value={toPersianDigits(pendingDocuments)} suffix="سند"
                color={AMBER} hint="نیازمند بررسی" onClick={() => navigate('/accounting/documents', { state: { status: 'submitted' } })} />
            </Grid>
          </Grid>


          {/* دسترسی سریع */}
          <SurfaceCard title="میز کار حسابداری" icon={HubIcon} color={VIOLET} sx={{ mb: 2 }}
            action={<Chip size="small" label={`${toPersianDigits(QUICK_ACTIONS.length)} میان‌بر`}
              sx={{ height: 22, fontSize: 10, bgcolor: '#f5f3ff', color: '#6d28d9' }} />}>
            <Grid container spacing={1}>
              {QUICK_ACTIONS.map((action) => (
                <Grid item xs={12} sm={6} md={4} lg={2} key={action.label}>
                  <QuickTile icon={action.icon} label={action.label} description={action.description}
                    color={action.color} onClick={() => navigate(action.path)} />
                </Grid>
              ))}
            </Grid>
          </SurfaceCard>

          {/* روند و وضعیت اسناد */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} lg={8}>
              <SurfaceCard title="روند درآمد و هزینه" icon={ShowChartIcon} color={BLUE}
                action={(
                  <Stack direction="row" spacing={0.5} useFlexGap>
                    <Chip size="small" label={`درآمد: ${formatPersianNumber(revenueMonth)}`} sx={{ height: 21, fontSize: 9.5, bgcolor: '#eff6ff', color: '#1d4ed8' }} />
                    <Chip size="small" label={`هزینه: ${formatPersianNumber(expenseMonth)}`} sx={{ height: 21, fontSize: 9.5, bgcolor: '#fff1f2', color: '#be123c' }} />
                  </Stack>
                )}>
                {trend.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <ShowChartIcon sx={{ fontSize: 42, color: '#cbd5e1', mb: 1 }} />
                    <Typography sx={{ fontSize: 11.5, color: MUTED }}>داده‌ای برای روند ماهانه ثبت نشده است.</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={310}>
                    <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="accRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GREEN} stopOpacity={0.24} />
                          <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="accExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={RED} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={RED} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="label" reversed tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis orientation="right" tick={{ fontSize: 9.5, fill: '#64748b' }} tickFormatter={(value) => formatPersianNumber(value)} axisLine={false} tickLine={false} width={74} />
                      <ReTooltip formatter={(value) => formatPersianNumber(value)} contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: 10, border: '1px solid #e8edf4', fontSize: 11 }} />
                      <Area type="monotone" dataKey="revenue" name="درآمد" stroke={GREEN} fill="url(#accRevenue)" strokeWidth={2.2} />
                      <Area type="monotone" dataKey="expense" name="هزینه" stroke={RED} fill="url(#accExpense)" strokeWidth={2.2} />
                      <Line type="monotone" dataKey="net" name="سود خالص" stroke={AMBER} strokeWidth={2} dot={{ r: 2.5, fill: AMBER }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </SurfaceCard>
            </Grid>


            <Grid item xs={12} lg={4}>
              <SurfaceCard title="وضعیت اسناد" icon={PieChartIcon} color={CYAN}
                action={<Chip size="small" label={`${toPersianDigits(totalDocuments)} سند`} sx={{ height: 22, fontSize: 10, bgcolor: '#ecfeff', color: '#0e7490' }} />}>
                <Box sx={{ position: 'relative', height: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90}
                        paddingAngle={3} startAngle={90} endAngle={450}>
                        {statusData.map((item) => <Cell key={item.key} fill={STATUS_COLORS[item.key] || '#64748b'} />)}
                      </Pie>
                      <ReTooltip formatter={(value) => formatPersianNumber(value)} contentStyle={{ direction: 'rtl', textAlign: 'right', borderRadius: 10, border: '1px solid #e8edf4', fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, color: INK }}>{toPersianDigits(statusTotal)}</Typography>
                    <Typography sx={{ fontSize: 9.5, color: MUTED }}>کل اسناد</Typography>
                  </Box>
                </Box>
                <Stack spacing={0.65} sx={{ mt: 1 }}>
                  {statusData.map((item) => (
                    <Stack key={item.key} direction="row" alignItems="center" spacing={0.7} useFlexGap
                      onClick={() => navigate('/accounting/documents', { state: { status: item.key } })}
                      sx={{ cursor: 'pointer', p: 0.5, borderRadius: '7px', '&:hover': { bgcolor: '#f8fafc' } }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: STATUS_COLORS[item.key] || '#64748b' }} />
                      <Typography sx={{ flex: 1, fontSize: 10, color: '#475569' }}>{item.name}</Typography>
                      <Typography sx={{ fontSize: 10, fontWeight: 800, color: INK }}>{toPersianDigits(item.value)}</Typography>
                      <Typography sx={{ width: 34, textAlign: 'left', fontSize: 9, color: MUTED }}>
                        {toPersianDigits(Math.round((item.value / Math.max(statusTotal, 1)) * 100))}٪
                      </Typography>
                    </Stack>
                  ))}
                  {statusData.length === 0 ? <Typography sx={{ fontSize: 10.5, color: MUTED, textAlign: 'center' }}>سندی ثبت نشده است.</Typography> : null}
                </Stack>
              </SurfaceCard>
            </Grid>
          </Grid>


          {/* معادله، طبقات و ارزش افزوده */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} lg={4}>
              <SurfaceCard title="معادلهٔ حسابداری" icon={AccountBalanceIcon} color={BLUE}>
                <Box sx={{ p: 1.4, borderRadius: '13px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
                  <Stack direction="row" alignItems="center" spacing={1} useFlexGap>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 9.5, color: MUTED }}>دارایی‌ها</Typography>
                      <Typography sx={{ mt: 0.25, fontSize: 14, fontWeight: 900, color: BLUE }}>{formatPersianNumber(eq.assets)}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 20, color: '#94a3b8', fontWeight: 300 }}>=</Typography>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 9.5, color: MUTED }}>بدهی + حقوق مالکانه</Typography>
                      <Typography sx={{ mt: 0.25, fontSize: 14, fontWeight: 900, color: VIOLET }}>{formatPersianNumber(eq.liabilities_equity)}</Typography>
                    </Box>
                  </Stack>
                </Box>
                <Box sx={{ mt: 1.2 }}>
                  <ProgressBar value={eq.assets > 0 ? (eq.liabilities_equity / eq.assets) * 100 : 0} color={eq.balanced ? BLUE : RED} height={7} />
                </Box>
                <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap sx={{ mt: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: eq.balanced ? BLUE : RED }} />
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: eq.balanced ? '#1d4ed8' : '#be123c' }}>
                    {eq.balanced ? 'دفاتر تراز است' : `اختلاف تراز: ${formatPersianNumber(eq.difference)}`}
                  </Typography>
                </Stack>
                <Typography sx={{ mt: 1, fontSize: 9.5, color: MUTED, lineHeight: 1.8 }}>
                  نسبت حقوق مالکانه به دارایی‌ها: {toPersianDigits(Math.round(equityRatio))}٪ · نسبت بدهی: {toPersianDigits(Math.round(liabilityRatio))}٪
                </Typography>
              </SurfaceCard>
            </Grid>

            <Grid item xs={12} sm={6} lg={4}>
              <SurfaceCard title="ترکیب طبقات حساب" icon={AccountTreeIcon} color={VIOLET}>
                <Stack spacing={1.15}>
                  {categories.map((item) => {
                    const color = CATEGORY_COLORS[item.key] || '#64748b';
                    const value = Number(item.value || 0);
                    return (
                      <Box key={item.key}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap sx={{ mb: 0.4 }}>
                          <Stack direction="row" alignItems="center" spacing={0.55} useFlexGap>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color }} />
                            <Typography sx={{ fontSize: 10, color: '#475569' }}>{item.label}</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: INK }}>{formatPersianNumber(value)}</Typography>
                        </Stack>
                        <ProgressBar value={(Math.abs(value) / categoryMax) * 100} color={color} height={5} />
                      </Box>
                    );
                  })}
                  {categories.length === 0 ? <Typography sx={{ fontSize: 10.5, color: MUTED, textAlign: 'center', py: 3 }}>طبقه‌ای ثبت نشده است.</Typography> : null}
                </Stack>
              </SurfaceCard>
            </Grid>

            <Grid item xs={12} sm={6} lg={4}>
              <SurfaceCard title="ارزش افزوده" icon={ReceiptLongIcon} color={AMBER}
                action={<Chip size="small" label={vatNet >= 0 ? 'قابل پرداخت' : 'قابل استرداد'}
                  sx={{ height: 21, fontSize: 9.5, bgcolor: vatNet >= 0 ? '#fff1f2' : '#eff6ff', color: vatNet >= 0 ? '#be123c' : '#1d4ed8' }} />}>
                <Box sx={{ p: 1.4, borderRadius: '13px', bgcolor: SOFT_BG, border: '1px solid #eef2f7', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 9.5, color: MUTED }}>خالص ارزش افزوده دوره</Typography>
                  <Typography sx={{ mt: 0.3, fontSize: 20, fontWeight: 900, color: vatNet >= 0 ? '#be123c' : '#1d4ed8' }}>{formatPersianNumber(Math.abs(vatNet))}</Typography>
                  <Typography sx={{ fontSize: 9, color: MUTED }}>ریال · {vatNet >= 0 ? 'بدهی مالیاتی' : 'اعتبار مالیاتی'}</Typography>
                </Box>
                <Stack spacing={0.9} sx={{ mt: 1.2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap>
                    <Typography sx={{ fontSize: 10, color: MUTED }}>قابل پرداخت (فروش)</Typography>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#be123c' }}>{formatPersianNumber(vat.payable || 0)}</Typography>
                  </Stack>
                  <ProgressBar value={(Number(vat.payable || 0) / Math.max(Number(vat.payable || 0) + Number(vat.receivable || 0), 1)) * 100} color={RED} height={5} />
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap>
                    <Typography sx={{ fontSize: 10, color: MUTED }}>قابل استرداد (خرید)</Typography>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#1d4ed8' }}>{formatPersianNumber(vat.receivable || 0)}</Typography>
                  </Stack>
                  <ProgressBar value={(Number(vat.receivable || 0) / Math.max(Number(vat.payable || 0) + Number(vat.receivable || 0), 1)) * 100} color={BLUE} height={5} />
                </Stack>
              </SurfaceCard>
            </Grid>
          </Grid>


          {/* حساب‌های پرگردش، کهنگی و نسبت‌ها */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} lg={5}>
              <SurfaceCard title="حساب‌های پرگردش" icon={AssessmentIcon} color={VIOLET}
                action={<Chip size="small" label="۵ حساب برتر" sx={{ height: 21, fontSize: 9.5, bgcolor: '#f5f3ff', color: '#6d28d9' }} />}>
                {topAccounts.length === 0 ? (
                  <Typography sx={{ fontSize: 10.5, color: MUTED, textAlign: 'center', py: 4 }}>گردشی ثبت نشده است.</Typography>
                ) : (
                  <Stack spacing={1.1}>
                    {topAccounts.map((account, index) => (
                      <Box key={account.id}>
                        <Stack direction="row" alignItems="center" spacing={0.8} useFlexGap>
                          <Box sx={{
                            width: 22, height: 22, flexShrink: 0, borderRadius: '7px',
                            bgcolor: index === 0 ? '#eff6ff' : '#f8fafc', color: index === 0 ? BLUE : MUTED,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9.5, fontWeight: 800,
                          }}>{toPersianDigits(index + 1)}</Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: INK }} noWrap>{account.name}</Typography>
                            <Typography sx={{ fontSize: 9, color: MUTED }}>{toPersianDigits(account.code || '—')}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: '#b45309', whiteSpace: 'nowrap' }}>
                            {formatPersianNumber(account.turnover || 0)}
                          </Typography>
                        </Stack>
                        <Box sx={{ mr: 3.4, mt: 0.45 }}>
                          <ProgressBar value={(Number(account.turnover || 0) / topTurnoverMax) * 100} color={VIOLET} height={4} />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </SurfaceCard>
            </Grid>

            <Grid item xs={12} sm={6} lg={4}>
              <SurfaceCard title="کهنگی مانده" icon={CompareArrowsIcon} color={CYAN}>
                {['receivable', 'payable'].map((side) => {
                  const config = side === 'receivable'
                    ? { label: 'دریافتنی‌ها', color: BLUE }
                    : { label: 'پرداختنی‌ها', color: RED };
                  const bucket = aging[side] || {};
                  const total = Number(bucket.total || 0);
                  const buckets = [
                    ['جاری', bucket.current],
                    ['۱ تا ۳۰ روز', bucket.d30],
                    ['۳۱ تا ۶۰ روز', bucket.d60],
                    ['بیش از ۶۰ / معوق', bucket.d90],
                  ];
                  return (
                    <Box key={side} sx={{ mb: side === 'receivable' ? 1.5 : 0 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap sx={{ mb: 0.6 }}>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: config.color }}>{config.label}</Typography>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: INK }}>{formatPersianNumber(total)}</Typography>
                      </Stack>
                      {buckets.map(([label, value]) => (
                        <Stack key={label} direction="row" alignItems="center" spacing={0.75} useFlexGap sx={{ mb: 0.45 }}>
                          <Typography sx={{ width: 84, fontSize: 9, color: MUTED }}>{label}</Typography>
                          <Box sx={{ flex: 1 }}><ProgressBar value={total > 0 ? (Number(value || 0) / total) * 100 : 0} color={config.color} height={4} /></Box>
                          <Typography sx={{ width: 62, textAlign: 'left', fontSize: 9, fontWeight: 700, color: INK }}>{formatPersianNumber(value || 0)}</Typography>
                        </Stack>
                      ))}
                    </Box>
                  );
                })}
              </SurfaceCard>
            </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <SurfaceCard title="نسبت‌های مدیریتی" icon={InsightsIcon} color={AMBER}>
                <Stack spacing={1.3}>
                  <RatioRow label="حاشیه سود خالص" value={toPersianDigits(Math.round(netMargin))} color={netMargin >= 0 ? GREEN : RED} />
                  <RatioRow label="نسبت هزینه به درآمد" value={toPersianDigits(Math.round(expenseRatio))} color={RED} />
                  <RatioRow label="نسبت حقوق مالکانه" value={toPersianDigits(Math.round(equityRatio))} color={VIOLET} />
                  <RatioRow label="تکمیل ثبت اسناد" value={toPersianDigits(Math.round(postingRate))} color={CYAN} />
                </Stack>
              </SurfaceCard>
            </Grid>
          </Grid>


          {/* اسناد اخیر */}
          <SurfaceCard title="اسناد اخیر" icon={DescriptionIcon} color={BLUE}
            action={(
              <Button size="small" variant="text" endIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
                onClick={() => navigate('/accounting/documents')}
                sx={{ fontSize: 10, fontWeight: 700, textTransform: 'none' }}>
                مشاهدهٔ همهٔ اسناد
              </Button>
            )}>
            <TableContainer sx={{ maxHeight: 460, border: '1px solid #e8edf4', borderRadius: '12px', bgcolor: '#fff' }}>
              <Table size="small" stickyHeader sx={{ minWidth: 920 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...tableHeadSx, width: 85 }}>شماره</TableCell>
                    <TableCell sx={{ ...tableHeadSx, width: 95 }}>تاریخ</TableCell>
                    <TableCell sx={{ ...tableHeadSx, textAlign: 'right', minWidth: 230 }}>شرح سند</TableCell>
                    <TableCell sx={{ ...tableHeadSx, width: 120 }}>روزنامه</TableCell>
                    <TableCell sx={{ ...tableHeadSx, width: 130 }}>بدهکار</TableCell>
                    <TableCell sx={{ ...tableHeadSx, width: 130 }}>بستانکار</TableCell>
                    <TableCell sx={{ ...tableHeadSx, width: 105 }}>وضعیت</TableCell>
                    <TableCell sx={{ ...tableHeadSx, width: 55 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentDocs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ ...tableCellSx, py: 3, color: MUTED }}>
                        سندی برای این سال مالی ثبت نشده است.
                      </TableCell>
                    </TableRow>
                  ) : recentDocs.map((document) => (
                    <TableRow key={document.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' }, cursor: 'pointer' }}
                      onClick={() => navigate(`/accounting/documents/${document.id}/edit`)}>
                      <TableCell sx={{ ...tableCellSx, fontWeight: 800, color: INK }}>{toPersianDigits(document.number || '—')}</TableCell>
                      <TableCell sx={tableCellSx}>{toJalali(document.date)}</TableCell>
                      <TableCell sx={{ ...tableCellSx, textAlign: 'right', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{document.description || '—'}</TableCell>
                      <TableCell sx={tableCellSx}>{document.journal_name || '—'}</TableCell>
                      <TableCell sx={{ ...tableCellSx, fontWeight: 700, color: '#1d4ed8' }}>{formatPersianNumber(document.total_debit || 0)}</TableCell>
                      <TableCell sx={{ ...tableCellSx, fontWeight: 700, color: GREEN }}>{formatPersianNumber(document.total_credit || 0)}</TableCell>
                      <TableCell sx={tableCellSx}>
                        <Chip size="small" label={document.status_display || STATUS_LABELS[document.status] || '—'}
                          sx={{
                            height: 20, fontSize: 9, fontWeight: 700,
                            bgcolor: `${STATUS_COLORS[document.status] || '#64748b'}18`,
                            color: STATUS_COLORS[document.status] || '#64748b',
                          }} />
                      </TableCell>
                      <TableCell sx={tableCellSx}>
                        <Tooltip title="مشاهده / ویرایش">
                          <OpenInNewIcon sx={{ fontSize: 16, color: BLUE }} />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SurfaceCard>
        </>
      )}
    </Box>
  );
};

export default AccountingPage;

