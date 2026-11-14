import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Paper, Stack, TextField,
  Typography, alpha,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import SpeedIcon from '@mui/icons-material/Speed';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import HistoryIcon from '@mui/icons-material/History';
import PrintButton from '../../core/print/PrintButton';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import PageHeader from '../../core/components/ui/PageHeader';
import { useModuleTheme } from '../contracts/contractModuleUi';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import {
  EmptyNote, MetricTile, Panel, SchematicRow, StatRow, Track, TrendChart, money, compactMoney,
} from '../contracts/contractsDashboardKit';
import { toPersianDigits } from '../../core/utils/numberUtils';

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  submitted: 'در انتظار تأیید',
  approved: 'تأییدشده',
  posted: 'ثبت‌شده',
  rejected: 'برگشت‌خورده',
  edited: 'ویرایش‌شده',
};

const filterPaper = {
  p: 1.25,
  display: 'grid',
  gap: 1,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(180px,1.2fr) repeat(2, minmax(150px,1fr)) auto' },
  alignItems: 'center',
  borderRadius: 'var(--hrms-radius-large, 16px)',
  bgcolor: 'var(--hrms-region-card-bg, #fff)',
  border: '1px solid',
  borderColor: 'divider',
};

const PettyCashDashboard = () => {
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();
  const { tokens } = useDesignTokens();
  const { getPalette } = useModulePalette();
  const printRef = useRef(null);

  const colors = tokens.colors || {};
  const ACCENT = getPalette('pettycash')?.accent || colors.warning || '#f59e0b';
  const OK = colors.success || '#10b981';
  const DANGER = colors.danger || '#ef4444';
  const INFO = colors.info || '#3b82f6';
  const VIOLET = '#8b5cf6';
  const MUTED = colors.textSecondary || 'text.secondary';

  const [fund, setFund] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params = useMemo(() => {
    const next = {};
    if (fund) next.fund = fund;
    if (dateFrom) next.date_from = dateFrom;
    if (dateTo) next.date_to = dateTo;
    return next;
  }, [fund, dateFrom, dateTo]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['petty-dashboard', params],
    queryFn: () => axiosInstance.get('/petty-cash-funds/dashboard/', { params }).then((response) => response.data),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  const { data: fundsData } = useQuery({
    queryKey: ['pc-expense-funds'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/', { params: { status: 'active' } }).then((response) => response.data),
    staleTime: 60000,
  });

  const d = data || {};
  const funds = Array.isArray(fundsData) ? fundsData : fundsData?.results || [];
  const trend = (d.monthly_trend || []).map((row) => ({
    label: `${toPersianDigits(row.month)}/${toPersianDigits(String(row.year).slice(-2))}`,
    total: row.total,
  }));
  const maxCategory = Math.max(1, ...(d.by_category || []).map((row) => row.total));
  const maxCustodian = Math.max(1, ...(d.by_custodian || []).map((row) => row.total));
  const maxAccount = Math.max(1, ...(d.by_account || []).map((row) => row.total));
  const statusCounts = d.status_counts || {};
  const statusTotal = Math.max(1, Object.values(statusCounts).reduce((sum, value) => sum + Number(value || 0), 0));
  const noFunds = !isLoading && !fund && Number(d.funds_count || 0) === 0;

  const header = (
    <PageHeader
      icon={<AccountBalanceWalletIcon />}
      title="داشبورد تنخواه"
      subtitle="نمای تحلیلی مانده، مصرف، تنخواه‌داران و وضعیت صورت‌های هزینه"
      badge={(
        <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
          <Chip size="small" label={`${toPersianDigits(d.funds_count || 0)} تنخواه`}
            sx={{ height: 24, fontWeight: 800, bgcolor: alpha(ACCENT, 0.10), color: ACCENT }} />
          {d.overdue_count ? (
            <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
              label={`${toPersianDigits(d.overdue_count)} معوق`}
              sx={{ height: 24, fontWeight: 800, bgcolor: alpha(DANGER, 0.10), color: DANGER }} />
          ) : null}
        </Stack>
      )}
      sx={{ mb: 1.5, py: 1 }}
      actions={(
        <>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon />}
            onClick={() => refetch()} disabled={isFetching}>
            به‌روزرسانی
          </Button>
          <PrintButton target={printRef} title="داشبورد تنخواه" orientation="landscape" />
          <Button size="small" variant="outlined" startIcon={<ListAltIcon />}
            onClick={() => navigate('/petty-cash/expenses')}>
            صورت‌ها
          </Button>
          <Button size="small" variant="contained" startIcon={<AddIcon />}
            onClick={() => navigate('/petty-cash/expenses/new')}>
            صورت هزینه جدید
          </Button>
        </>
      )}
    />
  );

  if (isLoading) {
    return (
      <Box>
        {header}
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 'var(--hrms-radius-large, 16px)' }}>
          <CircularProgress size={26} />
          <Typography sx={{ mt: 1.5, fontSize: 12.5, color: MUTED }}>در حال بارگذاری داشبورد…</Typography>
        </Paper>
      </Box>
    );
  }


  return (
    <Box sx={{ pb: 2 }}>
      {header}

      <Paper elevation={0} sx={{ ...filterPaper, mb: 1.5 }}>
        <Autocomplete
          size="small"
          options={funds}
          value={funds.find((row) => String(row.id) === String(fund)) || null}
          onChange={(_event, option) => setFund(option ? option.id : '')}
          getOptionLabel={(option) => `${option.code || ''} — ${option.title || ''}`}
          isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{option.code} — {option.title}</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                  تنخواه‌دار: {option.custodian_name || '—'}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => <TextField {...params} size="small" label="تنخواه (کد یا عنوان)" />}
          sx={{ minWidth: 0 }}
        />
        <JalaliDatePicker noHelper label="از تاریخ" value={dateFrom} onChange={setDateFrom} sx={{ width: '100%' }} />
        <JalaliDatePicker noHelper label="تا تاریخ" value={dateTo} onChange={setDateTo} sx={{ width: '100%' }} />
        <Button size="small" variant="text" onClick={() => { setFund(''); setDateFrom(''); setDateTo(''); }}>
          پاک کردن فیلترها
        </Button>
      </Paper>

      <Box ref={printRef}>
        {(d.alerts || []).length ? (
          <Stack spacing={0.75} sx={{ mb: 1.5 }}>
            {(d.alerts || []).map((alert, index) => (
              <Alert key={index} severity={alert.level === 'error' ? 'error' : alert.level === 'warning' ? 'warning' : 'info'}
                sx={{ borderRadius: 'var(--hrms-radius, 10px)', fontSize: 12.5 }}>
                {alert.title}
              </Alert>
            ))}
          </Stack>
        ) : null}

        {noFunds ? (
          <Paper elevation={0} sx={{
            p: 4, textAlign: 'center', borderRadius: 'var(--hrms-radius-large, 16px)',
            bgcolor: 'var(--hrms-region-card-bg, #fff)', border: '1px solid', borderColor: 'divider',
          }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 40, color: ACCENT, mb: 1 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 900, mb: 0.75 }}>تنخواهی برای نمایش وجود ندارد</Typography>
            <Typography sx={{ fontSize: 12.5, color: MUTED, maxWidth: 560, mx: 'auto' }}>
              در «تنظیمات ← تعاریف اولیه ← تنخواه‌داران» برای شما تنخواهی تعریف نشده است؛
              داشبورد فقط تنخواه‌های مجاز شما را نمایش می‌دهد.
            </Typography>
          </Paper>
        ) : (
          <>
            <Box sx={{
              display: 'grid', gap: 1,
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' },
              mb: 1.5,
            }}>
              <MetricTile theme={moduleTheme} icon={AccountBalanceWalletIcon} label="مانده کل تنخواه‌ها"
                value={compactMoney(d.total_balance)} color={OK}
                hint={`${toPersianDigits(d.active_funds || 0)} تنخواه فعال`} />
              <MetricTile theme={moduleTheme} icon={SpeedIcon} label="سقف کل"
                value={compactMoney(d.total_limit)} color={INFO} />
              <MetricTile theme={moduleTheme} icon={PaymentsIcon} label="مصرف این ماه"
                value={compactMoney(d.monthly_spend)} color={ACCENT} />
              <MetricTile theme={moduleTheme} icon={CheckCircleIcon} label="ثبت‌شده در تنخواه"
                value={compactMoney(d.posted_total)} color={VIOLET} />
              <MetricTile theme={moduleTheme} icon={PendingActionsIcon} label="در انتظار"
                value={compactMoney(d.pending_total)} color={DANGER}
                hint={`${toPersianDigits(d.unsettled_count || 0)} تسویه‌نشده`} />
            </Box>

            <Box sx={{
              display: 'grid', gap: 1.5,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2.1fr) minmax(280px, 1fr)' },
              mb: 1.5,
            }}>
              <Panel theme={moduleTheme} title="روند مصرف ۶ ماه اخیر" icon={TrendingUpIcon}
                hint="مصرف ماهانه بر اساس تراکنش‌های تنخواه" color={ACCENT}>
                {trend.length ? (
                  <TrendChart data={trend} height={230}
                    series={[{ key: 'total', name: 'مصرف', color: ACCENT }]}
                    tooltipFormatter={(value) => money(value)} />
                ) : <EmptyNote icon={TrendingUpIcon} text="تراکنشی برای نمایش نیست" />}
              </Panel>

              <Panel theme={moduleTheme} title="وضعیت صورت‌های هزینه" icon={ReceiptLongIcon}
                hint={`${toPersianDigits(d.total_statements || 0)} صورت`} color={INFO}>
                {Object.keys(statusCounts).length ? (
                  <Stack spacing={0.9}>
                    {Object.entries(statusCounts).map(([key, value]) => {
                      const color = key === 'posted' ? OK : key === 'draft' ? VIOLET : key === 'rejected' ? DANGER : ACCENT;
                      return (
                        <Box key={key}>
                          <StatRow label={STATUS_LABELS[key] || key}
                            value={`${toPersianDigits(value)} · ${toPersianDigits(Math.round((Number(value) / statusTotal) * 100))}٪`}
                            color={color} strong />
                          <Box sx={{ mt: 0.3 }}>
                            <Track value={(Number(value) / statusTotal) * 100} color={color} height={5} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                ) : <EmptyNote icon={ReceiptLongIcon} text="صورت هزینه‌ای ثبت نشده است" />}
              </Panel>
            </Box>


            <Box sx={{
              display: 'grid', gap: 1.5,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
              mb: 1.5,
            }}>
              <Panel theme={moduleTheme} title="مصرف بر اساس دسته‌بندی" icon={CategoryIcon} color={OK}>
                {(d.by_category || []).length ? (
                  <Stack spacing={0.25}>
                    {(d.by_category || []).slice(0, 7).map((row, index) => (
                      <SchematicRow key={index} label={row.category} value={compactMoney(row.total)}
                        share={(row.total / maxCategory) * 100} color={OK}
                        hint={`سهم از مصرف: ${toPersianDigits(Math.round((row.total / Math.max(1, d.monthly_spend || 1)) * 100))}٪`} />
                    ))}
                  </Stack>
                ) : <EmptyNote icon={CategoryIcon} text="داده‌ای ثبت نشده" />}
              </Panel>

              <Panel theme={moduleTheme} title="مصرف بر اساس تنخواه‌دار" icon={PeopleIcon} color={ACCENT}>
                {(d.by_custodian || []).length ? (
                  <Stack spacing={0.25}>
                    {(d.by_custodian || []).slice(0, 7).map((row, index) => (
                      <SchematicRow key={index} label={row.name || 'نامشخص'} value={compactMoney(row.total)}
                        share={(row.total / maxCustodian) * 100} color={ACCENT} />
                    ))}
                  </Stack>
                ) : <EmptyNote icon={PeopleIcon} text="داده‌ای ثبت نشده" />}
              </Panel>

              <Panel theme={moduleTheme} title="سرفصل‌های هزینه (معین)" icon={AccountTreeIcon} color={INFO}>
                {(d.by_account || []).length ? (
                  <Stack spacing={0.25}>
                    {(d.by_account || []).slice(0, 7).map((row, index) => (
                      <SchematicRow key={index} label={`${row.code} — ${row.account}`}
                        value={compactMoney(row.total)} share={(row.total / maxAccount) * 100} color={INFO} />
                    ))}
                  </Stack>
                ) : <EmptyNote icon={AccountTreeIcon} text="سرفصلی ثبت نشده" />}
              </Panel>
            </Box>

            <Box sx={{
              display: 'grid', gap: 1.5,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.6fr) minmax(280px, 1fr)' },
            }}>
              <Panel theme={moduleTheme} title="آخرین فعالیت‌ها" icon={HistoryIcon} color={VIOLET}>
                {(d.recent_activity || []).length ? (
                  <Stack spacing={0.35}>
                    {(d.recent_activity || []).slice(0, 8).map((row) => (
                      <Stack key={`${row.type}-${row.id}`} direction="row" spacing={1} alignItems="center"
                        sx={{
                          py: 0.55, px: 0.5, borderRadius: '9px',
                          '&:hover': { bgcolor: alpha(VIOLET, 0.05) },
                        }}>
                        <ReceiptLongIcon sx={{ fontSize: 15, color: row.entry_type === 'debit' ? DANGER : OK }} />
                        <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 700 }}>
                          {row.title}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>{row.fund}</Typography>
                        <Typography noWrap sx={{
                          fontSize: 11, fontWeight: 800,
                          color: row.entry_type === 'debit' ? DANGER : OK,
                          fontFamily: 'var(--hrms-table-number-font, inherit)',
                        }}>
                          {compactMoney(row.amount)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                ) : <EmptyNote icon={HistoryIcon} text="فعالیتی ثبت نشده است" />}
              </Panel>

              <Stack spacing={1.5}>
                <Panel theme={moduleTheme} title="تنخواه‌های نزدیک به سقف" icon={WarningAmberIcon} color={DANGER}>
                  {(d.near_limit || []).length ? (
                    <Stack spacing={0.6}>
                      {(d.near_limit || []).map((row) => (
                        <Box key={row.id}>
                          <StatRow label={row.title} value={`${toPersianDigits(Math.round(row.percent || 0))}٪`}
                            color={DANGER} strong />
                          <Box sx={{ mt: 0.3 }}>
                            <Track value={row.percent || 0} color={DANGER} height={5} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  ) : <EmptyNote icon={WarningAmberIcon} text="همهٔ تنخواه‌ها در محدودهٔ مجاز هستند" />}
                </Panel>

                <Panel theme={moduleTheme} title="صورت‌های معوق" icon={PendingActionsIcon} color={ACCENT}>
                  {(d.overdue || []).length ? (
                    <Stack spacing={0.25}>
                      {(d.overdue || []).slice(0, 5).map((row, index) => (
                        <StatRow key={index} label={`${row.number || row.id} — ${row.fund || ''}`}
                          value={money(row.total)} color={DANGER} />
                      ))}
                    </Stack>
                  ) : <EmptyNote icon={CheckCircleIcon} text="صورت معوقی وجود ندارد" />}
                </Panel>
              </Stack>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default PettyCashDashboard;

