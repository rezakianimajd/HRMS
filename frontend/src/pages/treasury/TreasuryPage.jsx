import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Paper, Stack, Typography,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddLinkIcon from '@mui/icons-material/AddLink';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import InsightsIcon from '@mui/icons-material/Insights';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { chipSx, moneyLabel, useTreasuryTheme } from './treasuryMasterUi';

const KpiTile = ({ label, value, hint, color, onClick }) => (
  <Paper
    elevation={0}
    onClick={onClick}
    sx={{
      p: 1.1,
      borderRadius: 'var(--hrms-info-card-radius, 14px)',
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      minWidth: 0,
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75 }}>{label}</Typography>
    <Typography noWrap sx={{
      fontSize: 16, fontWeight: 900, color,
      fontFamily: 'var(--hrms-table-number-font, inherit)',
    }}>
      {value}
    </Typography>
    {hint ? <Typography noWrap sx={{ fontSize: 9.5, opacity: 0.65 }}>{hint}</Typography> : null}
  </Paper>
);

const QuickTile = ({ icon: Icon, title, subtitle, color, onClick }) => (
  <Paper
    elevation={0}
    onClick={onClick}
    sx={{
      p: 1.1,
      borderRadius: 'var(--hrms-info-card-radius, 14px)',
      border: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      cursor: 'pointer',
      '&:hover': { borderColor: color },
    }}
  >
    <Box sx={{
      width: 32, height: 32, borderRadius: '10px', display: 'grid', placeItems: 'center',
      bgcolor: `${color}14`, color,
    }}>
      <Icon sx={{ fontSize: 17 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{title}</Typography>
      <Typography noWrap sx={{ fontSize: 9.5, opacity: 0.7 }}>{subtitle}</Typography>
    </Box>
  </Paper>
);

const TreasuryPage = () => {
  const navigate = useNavigate();
  const moduleTheme = useTreasuryTheme();

  const dashboardQuery = useQuery({
    queryKey: ['treasury-dashboard'],
    queryFn: () => axiosInstance.get('/treasury/dashboard/').then((response) => response.data),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  if (dashboardQuery.isLoading) {
    return (
      <Box sx={{ py: 9, textAlign: 'center' }}>
        <CircularProgress size={22} sx={{ color: moduleTheme.accent }} />
      </Box>
    );
  }

  const data = dashboardQuery.data || {};
  const liquidity = data.liquidity || {};
  const receivables = data.receivables || {};
  const payables = data.payables || {};
  const dueSoon = data.due_soon_7d || {};
  const forecast = data.forecast_30d || {};
  const trend = data.trend || [];

  const kpis = [
    {
      label: 'موجودی بانک‌ها',
      value: moneyLabel(liquidity.banks),
      hint: 'جمع ماندهٔ حساب‌های بانکی',
      color: '#0ea5e9',
      onClick: () => navigate('/treasury/accounts'),
    },
    {
      label: 'موجودی صندوق‌ها',
      value: moneyLabel(liquidity.cashboxes),
      hint: 'نقد در دست صندوق‌ها',
      color: '#14b8a6',
      onClick: () => navigate('/treasury/cashboxes'),
    },
    {
      label: 'اسناد دریافتنی',
      value: moneyLabel(receivables.received_checks?.amount),
      hint: `${toPersianDigits(receivables.received_checks?.count || 0)} چک باز`,
      color: '#0f766e',
      onClick: () => navigate('/treasury/received-checks'),
    },
    {
      label: 'اسناد پرداختنی',
      value: moneyLabel(payables.issued_checks?.amount),
      hint: `${toPersianDigits(payables.issued_checks?.count || 0)} چک صادرشده`,
      color: '#be123c',
      onClick: () => navigate('/treasury/issued-checks'),
    },
    {
      label: 'در انتظار پرداخت',
      value: moneyLabel(data.pending_payments?.amount),
      hint: `${toPersianDigits(data.pending_payments?.count || 0)} درخواست`,
      color: '#f59e0b',
      onClick: () => navigate('/treasury/payment-requests'),
    },
    {
      label: 'سررسید ۷ روز آینده',
      value: moneyLabel(
        Number(dueSoon.received_checks?.amount || 0) + Number(dueSoon.issued_checks?.amount || 0),
      ),
      hint: `${toPersianDigits(dueSoon.issued_checks?.count || 0)} چک پرداختی`,
      color: '#b45309',
      onClick: () => navigate('/treasury/issued-checks'),
    },
    {
      label: 'در جریان وصول',
      value: moneyLabel(receivables.receipts_in_clearing?.amount),
      hint: `${toPersianDigits(receivables.receipts_in_clearing?.count || 0)} دریافت`,
      color: '#0284c7',
      onClick: () => navigate('/treasury/receipts'),
    },
    {
      label: 'پیش‌بینی ۳۰ روزه',
      value: moneyLabel(forecast.projected_balance),
      hint: `تعهدات: ${moneyLabel(forecast.upcoming_payments)}`,
      color: '#7c3aed',
      onClick: () => navigate('/treasury/forecast'),
    },
  ];


  return (
    <Box>
      <PageHeader
        icon={<AccountBalanceWalletIcon />}
        title="داشبورد خزانه‌داری"
        subtitle="ماندهٔ نقدینگی، صف پرداخت، سررسیدها و پیش‌بینی جریان نقد"
        badge={(
          <Chip size="small" label={`تا ${data.as_of || '—'}`}
            sx={chipSx(moduleTheme.accent)} />
        )}
        actions={(
          <>
            <Button size="small" variant="outlined"
              startIcon={<SwapHorizIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate('/treasury/transfers')}>
              انتقال وجه
            </Button>
            <Button size="small" variant="contained"
              startIcon={<AddLinkIcon sx={{ fontSize: 16 }} />}
              onClick={() => navigate('/treasury/receipts')}>
              ثبت دریافت
            </Button>
          </>
        )}
      />

      <Box sx={{
        display: 'grid',
        gap: 1,
        mb: 1.25,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
          lg: 'repeat(8, minmax(0, 1fr))',
        },
      }}>
        {kpis.map((item) => <KpiTile key={item.label} {...item} />)}
      </Box>

      <Box sx={{
        display: 'grid',
        gap: 1.25,
        gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' },
      }}>
        <Paper elevation={0} sx={{
          p: 1.25,
          borderRadius: 'var(--hrms-table-radius, 16px)',
          border: '1px solid',
          borderColor: moduleTheme.cardBorderColor,
        }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
            <AccountBalanceIcon sx={{ fontSize: 17, color: moduleTheme.accent }} />
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>ماندهٔ حساب‌ها و صندوق‌ها</Typography>
          </Stack>
          <Stack spacing={0.5}>
            {(data.entities || []).map((entity) => (
              <Stack key={entity.id} direction="row" alignItems="center" spacing={0.75}
                sx={{ px: 0.5, py: 0.35, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Chip size="small"
                  label={entity.entity_type === 'cash' ? 'صندوق' : 'بانک'}
                  sx={chipSx(entity.entity_type === 'cash' ? '#14b8a6' : '#0ea5e9')} />
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, flex: 1 }}>
                  {entity.name}
                </Typography>
                <Typography sx={{ fontSize: 11.5, fontWeight: 900 }}>
                  {moneyLabel(entity.balance)}
                </Typography>
              </Stack>
            ))}
            {(data.entities || []).length === 0 ? (
              <Typography sx={{ fontSize: 11, opacity: 0.7 }}>
                بانک یا صندوقی تعریف نشده است.
              </Typography>
            ) : null}
          </Stack>
        </Paper>

        <Stack spacing={1.25}>
          <Paper elevation={0} sx={{
            p: 1.25,
            borderRadius: 'var(--hrms-table-radius, 16px)',
            border: '1px solid',
            borderColor: moduleTheme.cardBorderColor,
          }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
              <InsightsIcon sx={{ fontSize: 17, color: moduleTheme.accent }} />
              <Typography sx={{ fontSize: 12, fontWeight: 800 }}>ورودی/خروجی نقد (۶ ماه)</Typography>
            </Stack>
            <Stack spacing={0.6}>
              {trend.map((row) => {
                const inflow = Number(row.in || 0);
                const outflow = Number(row.out || 0);
                const peak = Math.max(inflow, outflow, 1);
                return (
                  <Box key={row.month}>
                    <Typography sx={{ fontSize: 10, mb: 0.2 }}>
                      {`${row.month} — وارد ${formatPersianNumber(Math.round(inflow))}`}
                    </Typography>
                    <Box sx={{ height: 4, bgcolor: 'divider', borderRadius: 2, overflow: 'hidden', mb: 0.3 }}>
                      <Box sx={{ width: `${(inflow / peak) * 100}%`, height: '100%', bgcolor: '#0f766e' }} />
                    </Box>
                    <Box sx={{ height: 4, bgcolor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                      <Box sx={{ width: `${(outflow / peak) * 100}%`, height: '100%', bgcolor: '#be123c' }} />
                    </Box>
                  </Box>
                );
              })}
              {trend.length === 0 ? (
                <Typography sx={{ fontSize: 11, opacity: 0.7 }}>گردشی ثبت نشده است.</Typography>
              ) : null}
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{
            p: 1.25,
            borderRadius: 'var(--hrms-table-radius, 16px)',
            border: '1px solid',
            borderColor: moduleTheme.cardBorderColor,
          }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 0.75 }}>دسترسی سریع</Typography>
            <Stack spacing={0.6}>
              <QuickTile icon={ReceiptLongIcon} title="فیش‌های دریافت"
                subtitle="ثبت و چاپ رسید" color="#0ea5e9"
                onClick={() => navigate('/treasury/receipts')} />
              <QuickTile icon={EventAvailableIcon} title="دستور پرداخت"
                subtitle="درخواست، تأیید و اجرا" color="#8b5cf6"
                onClick={() => navigate('/treasury/payment-requests')} />
              <QuickTile icon={WarningAmberIcon} title="چک‌های نزدیک سررسید"
                subtitle="پیگیری و جلوگیری از برگشت" color="#b45309"
                onClick={() => navigate('/treasury/issued-checks')} />
              <QuickTile icon={InsightsIcon} title="مغایرت و پیش‌بینی"
                subtitle="نقدینگی و تطبیق بانکی" color="#14b8a6"
                onClick={() => navigate('/treasury/forecast')} />
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
};

export default TreasuryPage;

