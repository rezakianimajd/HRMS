import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Chip, LinearProgress, Grid,
  CircularProgress, Stack, Tooltip, Divider,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import { formatPersianNumber } from '../core/utils/numberUtils';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';

const CRITERIA_LABELS = {
  performance: 'عملکرد',
  satisfaction: 'رضایت شغلی',
  education: 'تحصیلات',
  experience: 'سابقه و تجربه',
  attendance: 'حضور و کارکرد',
  punctuality: 'وقت‌شناسی (ورود به‌موقع)',
  discipline: 'انضباط (بدون جریمه)',
  financial_behavior: 'رفتار مالی (وام‌ها)',
  insurance: 'بیمه تکمیلی',
  benefits: 'مزایای دریافتی',
  mission: 'مأموریت',
  contract: 'قرارداد',
  shift: 'نوبت کاری',
  distance: 'مسافت',
  salary_growth: 'رشد حقوق',
};

const CRITERIA_ICONS = {
  performance: '🏆',
  satisfaction: '😊',
  education: '🎓',
  experience: '⏳',
  attendance: '📅',
  punctuality: '⏰',
  discipline: '⚖️',
  financial_behavior: '💳',
  insurance: '🛡️',
  benefits: '🎁',
  mission: '✈️',
  contract: '📄',
  shift: '🕒',
  distance: '📍',
  salary_growth: '📈',
};

const ScoringPage = () => {
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employee-scores'],
    queryFn: () => axiosInstance.get('/scoring/employees/').then(r => r.data),
  });

  const scores = data?.results || [];

  const stats = useMemo(() => {
    if (!scores.length) return { avg: 0, max: 0, min: 0, count: 0 };
    const avg = Math.round(scores.reduce((s, x) => s + x.total_score, 0) / scores.length);
    const max = Math.max(...scores.map(x => x.total_score));
    const min = Math.min(...scores.map(x => x.total_score));
    return { avg, max, min, count: scores.length };
  }, [scores]);

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Glass header */}
      <Paper sx={{
        mb: 2.5, p: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.14), rgba(139,92,246,0.07), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '10px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 6px 20px rgba(59,130,246,0.4)' }}>
            <AssessmentIcon sx={{ fontSize: 28, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>ارزیابی و امتیازدهی کارکنان</Typography>
            <Typography variant="body2" color="textSecondary">
              همهٔ معیارها از ۱۰۰ محاسبه شده و امتیاز نهایی وزن‌دار از ۱۰۰ است.
            </Typography>
          </Box>
        </Box>

        {/* Stats */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip icon={<GroupsIcon />} label={`${formatPersianNumber(stats.count)} نفر`} variant="outlined" sx={{ bgcolor: 'rgba(255,255,255,0.5)' }} />
          <Chip icon={<TrendingUpIcon />} label={`میانگین ${formatPersianNumber(stats.avg)}`} color="primary" />
          <Chip label={`بالاترین ${formatPersianNumber(stats.max)}`} color="success" variant="outlined" />
          <Chip label={`پایین‌ترین ${formatPersianNumber(stats.min)}`} color="warning" variant="outlined" />
        </Stack>
      </Paper>

      <Grid container spacing={2.5}>
        {/* Ranked list */}
        <Grid item xs={12} md={7}>
          <Paper sx={{
            p: 2,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.4)', borderRadius: '10px',
          }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>🏅 رتبه‌بندی کارکنان</Typography>
            <Stack spacing={1.25}>
              {scores.map((s, i) => (
                <Paper
                  key={s.employee_id}
                  onClick={() => setSelected(s)}
                  sx={{
                    p: 1.5, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 2,
                    background: selected?.employee_id === s.employee_id
                      ? `linear-gradient(135deg, ${s.grade.color}18, rgba(255,255,255,0.5))`
                      : 'rgba(255,255,255,0.55)',
                    border: selected?.employee_id === s.employee_id
                      ? `1.5px solid ${s.grade.color}`
                      : '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'translateX(-3px)', borderColor: s.grade.color },
                  }}
                >
                  <Avatar sx={{
                    width: 38, height: 38, fontSize: 14, fontWeight: 800, flexShrink: 0,
                    background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'rgba(0,0,0,0.06)',
                    color: i === 0 ? '#fff' : 'text.secondary',
                    boxShadow: i === 0 ? '0 3px 12px rgba(245,158,11,0.45)' : 'none',
                  }}>
                    {i === 0 ? <EmojiEventsIcon fontSize="small" /> : formatPersianNumber(i + 1)}
                  </Avatar>

                  <EmployeeAvatar employee={{ id: s.employee_id, full_name: s.full_name }} size={42} />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{s.full_name}</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap display="block">
                      {s.department} — {s.job_title}
                    </Typography>
                  </Box>

                  <Box sx={{ width: 130 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: s.grade.color }}>{s.grade.label}</Typography>
                      <Typography variant="caption" fontWeight={800}>
                        {formatPersianNumber(s.total_score)} از ۱۰۰
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={s.total_score}
                      sx={{
                        height: 7, borderRadius: '10px',
                        bgcolor: 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${s.grade.color}, ${s.grade.color}bb)`, borderRadius: '10px' },
                      }}
                    />
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Detail breakdown */}
        <Grid item xs={12} md={5}>
          <Paper sx={{
            p: 2, position: 'sticky', top: 24,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.4))',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.4)', borderRadius: '10px',
          }}>
            {selected ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <EmployeeAvatar employee={{ id: selected.employee_id, full_name: selected.full_name }} size={54} />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>{selected.full_name}</Typography>
                    <Chip
                      size="small"
                      label={`${selected.grade.label} — ${formatPersianNumber(selected.total_score)} از ۱۰۰`}
                      sx={{ color: selected.grade.color, borderColor: selected.grade.color, mt: 0.5 }}
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5 }}>
                  تفکیک امتیاز (هر معیار از ۱۰۰) + وزن:
                </Typography>
                <Stack spacing={1.2}>
                  {Object.entries(selected.breakdown || {}).map(([k, v]) => {
                    const weight = selected.weights?.[k] || 0;
                    return (
                      <Box key={k}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Typography component="span" sx={{ fontSize: 15 }}>{CRITERIA_ICONS[k] || '•'}</Typography>
                            <Typography variant="caption" color="textSecondary">{CRITERIA_LABELS[k] || k}</Typography>
                            <Chip size="small" label={`وزن ${formatPersianNumber(weight)}٪`} sx={{ height: 16, fontSize: 10 }} />
                          </Box>
                          <Typography variant="caption" fontWeight={800}>{formatPersianNumber(v)}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, v)}
                          sx={{
                            height: 6, borderRadius: '10px',
                            bgcolor: 'rgba(0,0,0,0.05)',
                            '& .MuiLinearProgress-bar': { background: selected.grade.color, borderRadius: '10px' },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>

                {selected.reasons && selected.reasons.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="textSecondary">نکات تحلیل:</Typography>
                    <Paper variant="outlined" sx={{ p: 1.25, mt: 0.5, borderRadius: '10px', bgcolor: 'rgba(0,0,0,0.02)' }}>
                      <Stack spacing={0.5}>
                        {selected.reasons.map((r, i) => (
                          <Typography key={i} variant="caption" color="textSecondary">• {r}</Typography>
                        ))}
                      </Stack>
                    </Paper>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <AssessmentIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  برای مشاهدهٔ جزئیات امتیاز، روی یک کارمند کلیک کنید.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScoringPage;