import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Chip, LinearProgress, Grid,
  CircularProgress, Stack, Tooltip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { formatPersianNumber } from '../core/utils/numberUtils';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';

const CRITERIA_LABELS = {
  performance: 'عملکرد',
  satisfaction: 'رضایت شغلی',
  education: 'تحصیلات',
  attendance: 'حضور و کارکرد',
  discipline: 'انضباط (بدون جریمه)',
  distance: 'مسافت',
  experience: 'سابقه',
  salary_growth: 'افزایش حقوق',
  benefits: 'مزایای دریافتی',
  mission: 'مأموریت',
  contract: 'قرارداد',
  shift: 'نوبت کاری',
};

const ScoringPage = () => {
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employee-scores'],
    queryFn: () => axiosInstance.get('/scoring/employees/').then(r => r.data),
  });

  const scores = data?.results || [];

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box>;

  const avg = scores.length
    ? Math.round(scores.reduce((s, x) => s + x.total_score, 0) / scores.length)
    : 0;

  return (
    <Box>
      {/* Glass header */}
      <Paper sx={{
        mb: 3, p: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.06))',
        border: '1px solid rgba(59,130,246,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 6px 20px rgba(59,130,246,0.4)' }}>
            <AssessmentIcon sx={{ fontSize: 28, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>ارزیابی و امتیازدهی کارکنان</Typography>
            <Typography variant="body2" color="textSecondary">
              امتیاز کل از ۱۲ معیار وزنی محاسبه شده است — میانگین: {formatPersianNumber(avg)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2.5}>
        {/* Ranked list */}
        <Grid item xs={12} md={7}>
          <Paper sx={{
            p: 2,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.32))',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.4)', borderRadius: 3,
          }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>رتبه‌بندی کارکنان</Typography>
            <Stack spacing={1.5}>
              {scores.map((s, i) => (
                <Paper
                  key={s.employee_id}
                  onClick={() => setSelected(s)}
                  sx={{
                    p: 1.5, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 2,
                    background: selected?.employee_id === s.employee_id
                      ? `linear-gradient(135deg, ${s.grade.color}18, rgba(255,255,255,0.4))`
                      : 'rgba(255,255,255,0.5)',
                    border: selected?.employee_id === s.employee_id
                      ? `1.5px solid ${s.grade.color}`
                      : '1px solid rgba(0,0,0,0.06)',
                    borderRadius: 2.5,
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'translateX(-3px)', borderColor: s.grade.color },
                  }}
                >
                  {/* Rank */}
                  <Avatar sx={{
                    width: 34, height: 34, fontSize: 14, fontWeight: 800, flexShrink: 0,
                    background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'rgba(0,0,0,0.06)',
                    color: i === 0 ? '#fff' : 'text.secondary',
                    boxShadow: i === 0 ? '0 3px 10px rgba(245,158,11,0.4)' : 'none',
                  }}>
                    {i === 0 ? <EmojiEventsIcon fontSize="small" /> : formatPersianNumber(i + 1)}
                  </Avatar>

                  <EmployeeAvatar employee={{ id: s.employee_id, full_name: s.full_name }} size={40} />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{s.full_name}</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap display="block">
                      {s.department} — {s.job_title}
                    </Typography>
                  </Box>

                  <Box sx={{ width: 120 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: s.grade.color }}>{s.grade.label}</Typography>
                      <Typography variant="caption" fontWeight={800}>{formatPersianNumber(s.total_score)}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={s.total_score}
                      sx={{
                        height: 7, borderRadius: 4,
                        bgcolor: 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { background: s.grade.color, borderRadius: 4 },
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
            background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.32))',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.4)', borderRadius: 3,
          }}>
            {selected ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <EmployeeAvatar employee={{ id: selected.employee_id, full_name: selected.full_name }} size={52} />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>{selected.full_name}</Typography>
                    <Chip
                      size="small"
                      label={`${selected.grade.label} — ${formatPersianNumber(selected.total_score)}`}
                      sx={{ color: selected.grade.color, borderColor: selected.grade.color, mt: 0.5 }}
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5 }}>
                  تفکیک امتیاز بر اساس معیارها (از ۱۰۰):
                </Typography>
                <Stack spacing={1}>
                  {Object.entries(selected.breakdown || {}).map(([k, v]) => (
                    <Box key={k}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography variant="caption" color="textSecondary">{CRITERIA_LABELS[k] || k}</Typography>
                        <Typography variant="caption" fontWeight={700}>{formatPersianNumber(v)}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (v / 20) * 100)}
                        sx={{
                          height: 6, borderRadius: 3,
                          bgcolor: 'rgba(0,0,0,0.05)',
                          '& .MuiLinearProgress-bar': { background: selected.grade.color, borderRadius: 3 },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>

                {selected.reasons && selected.reasons.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="textSecondary">نکات:</Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {selected.reasons.map((r, i) => (
                        <Typography key={i} variant="caption" color="textSecondary">• {r}</Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
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