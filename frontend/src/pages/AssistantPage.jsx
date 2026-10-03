import React from 'react';
import { Box, Typography, Paper, Avatar, Grid, Stack, Chip, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PeopleIcon from '@mui/icons-material/People';
import CakeIcon from '@mui/icons-material/Cake';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DescriptionIcon from '@mui/icons-material/Description';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import HRAssistant from '../core/components/ui/HRAssistant';
import KnowledgePanel from '../core/components/ui/KnowledgePanel';
import axiosInstance from '../core/api/axiosConfig';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';

const KpiCard = ({ icon, iconBg, label, value, sub }) => (
  <Paper sx={{ p: 1.5, borderRadius: '12px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(99,102,241,0.14)', display: 'flex', alignItems: 'center', gap: 1.25 }}>
    <Avatar sx={{ width: 40, height: 40, background: iconBg, flexShrink: 0 }}>{icon}</Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="textSecondary" display="block" noWrap>{label}</Typography>
      <Typography variant="h6" fontWeight={800} color="#4338ca" noWrap>{value}</Typography>
      {sub && <Typography variant="caption" color="textSecondary" noWrap>{sub}</Typography>}
    </Box>
  </Paper>
);

const AssistantPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['assistant-data'],
    queryFn: () => axiosInstance.get('/assistant/data/').then(r => r.data),
  });

  const empCount = data?.employees?.length ?? 0;
  const turnover = data?.turnover?.rate ?? 0;
  const birthdays = data?.birthdays ?? [];
  const contracts = data?.contracts_expiring ?? [];
  const docs = data?.documents?.total ?? 0;
  const corr = data?.correspondences ?? {};

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(99,102,241,0.14), rgba(236,72,153,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
          <SmartToyIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#4338ca">دستیار هوشمند منابع انسانی</Typography>
          <Typography variant="body2" color="textSecondary">پرسش و پاسخ هوشمند از داده‌های واقعی + پایگاه دانش سفارشی سازمان شما</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Chip label={`${toPersianDigits(empCount)} پرسنل`} icon={<PeopleIcon fontSize="small" />} sx={{ fontWeight: 700, bgcolor: 'rgba(99,102,241,0.1)', color: '#4338ca' }} />
          <Chip label={`نرخ ترک خدمت: ${toPersianDigits(turnover)}٪`} icon={<TrendingDownIcon fontSize="small" />} sx={{ fontWeight: 700, bgcolor: 'rgba(239,68,68,0.1)', color: '#dc2626' }} />
        </Stack>
      </Paper>

      {/* KPI cards */}
      {!isLoading && data && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={4} md={2.4}>
            <KpiCard icon={<PeopleIcon sx={{ color: '#fff', fontSize: 20 }} />} iconBg="linear-gradient(135deg,#6366f1,#8b5cf6)"
              label="پرسنل فعال" value={formatPersianNumber(empCount)} />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <KpiCard icon={<CakeIcon sx={{ color: '#fff', fontSize: 20 }} />} iconBg="linear-gradient(135deg,#f59e0b,#f43f5e)"
              label="تولدهای پیش رو" value={formatPersianNumber(birthdays.length)} sub="۷ روز آینده" />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <KpiCard icon={<TrendingDownIcon sx={{ color: '#fff', fontSize: 20 }} />} iconBg="linear-gradient(135deg,#ef4444,#f97316)"
              label="قرارداد رو به اتمام" value={formatPersianNumber(contracts.length)} sub="۹۰ روز آینده" />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <KpiCard icon={<DescriptionIcon sx={{ color: '#fff', fontSize: 20 }} />} iconBg="linear-gradient(135deg,#10b981,#14b8a6)"
              label="مدارک" value={formatPersianNumber(docs)} sub={`${formatPersianNumber(data?.documents?.expired ?? 0)} منقضی`} />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <KpiCard icon={<MarkEmailReadIcon sx={{ color: '#fff', fontSize: 20 }} />} iconBg="linear-gradient(135deg,#3b82f6,#0ea5e9)"
              label="مکاتبات" value={formatPersianNumber((corr.incoming || 0) + (corr.outgoing || 0))} sub={`${formatPersianNumber(corr.incoming || 0)} وارده`} />
          </Grid>
        </Grid>
      )}

      {/* Main grid: chat + side panels */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <HRAssistant />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={2}>
            <KnowledgePanel />
            {!isLoading && data && birthdays.length > 0 && (
              <Paper sx={{ p: 2, borderRadius: '14px', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(244,63,94,0.04))', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Typography variant="subtitle2" fontWeight={800} color="#b45309" sx={{ mb: 1 }}>🎂 تولدهای پیش رو</Typography>
                <Stack spacing={0.75}>
                  {birthdays.slice(0, 5).map(b => (
                    <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip size="small" label={b.is_today ? 'امروز' : `${toPersianDigits(b.days_until)} روز`}
                        sx={{ bgcolor: b.is_today ? '#f43f5e' : '#f59e0b18', color: b.is_today ? '#fff' : '#b45309', fontWeight: 700, fontSize: 10, height: 20 }} />
                      <Typography variant="body2" fontWeight={700} noWrap>{b.full_name}</Typography>
                      {b.department_name && <Typography variant="caption" color="textSecondary" noWrap>({b.department_name})</Typography>}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AssistantPage;

