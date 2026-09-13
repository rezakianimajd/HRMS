import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Avatar, Chip,
  CircularProgress, LinearProgress, Stack, Divider,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PaymentsIcon from '@mui/icons-material/Payments';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import GavelIcon from '@mui/icons-material/Gavel';
import ShieldIcon from '@mui/icons-material/Shield';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';
import { toJalali } from '../../utils/dateUtils';

const SectionHeader = ({ title, icon, color, count }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Avatar sx={{ width: 30, height: 30, background: `linear-gradient(135deg, ${color}, ${color}90)`, color: '#fff' }}>
      {icon}
    </Avatar>
    <Typography variant="subtitle1" fontWeight={800} sx={{ color }}>{title}</Typography>
    {count != null && (
      <Chip size="small" label={toPersianDigits(count)} sx={{ bgcolor: `${color}18`, color, fontWeight: 700 }} />
    )}
    <Divider sx={{ flex: 1 }} />
  </Box>
);

const EmptyHint = ({ text }) => (
  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: '10px', bgcolor: 'rgba(100,116,139,0.04)' }}>
    <Typography variant="caption" color="textSecondary">{text}</Typography>
  </Paper>
);

const OverviewTab = ({ employeeId }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['employee-summary', employeeId],
    queryFn: () => axiosInstance.get(`/employees/${employeeId}/summary/`).then(r => r.data),
    enabled: !!employeeId,
  });

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 4 }}><CircularProgress size={28} /></Box>;
  if (isError || !data) return <Typography color="error">خطا در دریافت نمای کلی</Typography>;

  const assets = data.assets || [];
  const loans = data.loans || [];
  const checklists = data.checklists || [];
  const penalties = data.penalties || [];
  const insurance = data.insurance || [];
  const contracts = data.contracts || [];

  return (
    <Grid container spacing={2.5}>
      {/* قراردادها */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="قراردادها" icon={<HistoryEduIcon sx={{ fontSize: 16 }} />} color="#f59e0b" count={contracts.length} />
          {contracts.length === 0 ? <EmptyHint text="هیچ نسخه قراردادی ثبت نشده است" /> : (
            <Stack spacing={1}>
              {contracts.map(c => (
                <Card key={c.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>
                        نسخه {toPersianDigits(c.version)} ({toPersianDigits(c.year)})
                      </Typography>
                      {c.signed_by ? (
                        <Chip size="small" color="success" label={`امضا: ${c.signed_by}`} />
                      ) : (
                        <Chip size="small" color="default" label="بدون امضا" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {c.contract_type || '—'} · {toJalali(c.start_date)} تا {c.end_date ? toJalali(c.end_date) : 'اکنون'}
                    </Typography>
                    {c.base_salary > 0 && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.25 }}>
                        حقوق پایه: {formatPersianNumber(c.base_salary)} ریال
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* اموال */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="اموال و تجهیزات" icon={<Inventory2Icon sx={{ fontSize: 16 }} />} color="#10b981" count={assets.length} />
          {assets.length === 0 ? <EmptyHint text="هیچ تجهیزی به این پرسنل واگذار نشده است" /> : (
            <Stack spacing={1}>
              {assets.map(a => (
                <Card key={a.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={700}>{a.name}</Typography>
                      <Chip size="small" label={a.status} variant="outlined" color={a.status === 'واگذارشده' ? 'success' : 'default'} />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {a.asset_type}{a.serial_number ? ` · ${toPersianDigits(a.serial_number)}` : ''}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* وام‌ها */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="وام و تسهیلات" icon={<PaymentsIcon sx={{ fontSize: 16 }} />} color="#3b82f6" count={loans.length} />
          {loans.length === 0 ? <EmptyHint text="هیچ وامی ثبت نشده است" /> : (
            <Stack spacing={1}>
              {loans.map(l => (
                <Card key={l.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>{l.loan_type}</Typography>
                      <Chip size="small" label={l.status} variant="outlined" color={l.status === 'فعال' ? 'info' : 'success'} />
                    </Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      مبلغ: {formatPersianNumber(l.amount)} ریال · {toPersianDigits(l.installment_count)} قسط
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* چک‌لیست ورود/خروج */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="چک‌لیست ورود / خروج" icon={<PlaylistAddCheckIcon sx={{ fontSize: 16 }} />} color="#8b5cf6" count={checklists.length} />
          {checklists.length === 0 ? <EmptyHint text="چک‌لیستی ثبت نشده است" /> : (
            <Stack spacing={1.25}>
              {checklists.map(c => (
                <Box key={c.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={700}>{c.kind_display}</Typography>
                    <Typography variant="caption" color="textSecondary">{toPersianDigits(c.completed)}/{toPersianDigits(c.total)}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={c.progress} sx={{ height: 6, borderRadius: '10px', bgcolor: 'rgba(139,92,246,0.12)', '& .MuiLinearProgress-bar': { bgcolor: '#8b5cf6' } }} />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* جرائم */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="جرائم انضباطی" icon={<GavelIcon sx={{ fontSize: 16 }} />} color="#ef4444" count={penalties.length} />
          {penalties.length === 0 ? <EmptyHint text="جریمه‌ای ثبت نشده است" /> : (
            <Stack spacing={1}>
              {penalties.map(p => (
                <Card key={p.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>{formatPersianNumber(p.amount)} ریال</Typography>
                      <Typography variant="caption" color="textSecondary">{toJalali(p.date)}</Typography>
                    </Box>
                    {p.reason && <Typography variant="caption" color="textSecondary">{p.reason}</Typography>}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* بیمه تکمیلی */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="بیمه تکمیلی" icon={<ShieldIcon sx={{ fontSize: 16 }} />} color="#0ea5e9" count={insurance.length} />
          {insurance.length === 0 ? <EmptyHint text="بیمه تکمیلی ثبت نشده است" /> : (
            <Stack spacing={1}>
              {insurance.map(i => (
                <Card key={i.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>{i.insurance_name}</Typography>
                      <Chip size="small" label={`${toPersianDigits(i.dependents_count)} تحت تکفل`} variant="outlined" />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {i.plan || i.insurance_type || ''} · ماهانه {formatPersianNumber(i.monthly_amount)} ریال
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default OverviewTab;