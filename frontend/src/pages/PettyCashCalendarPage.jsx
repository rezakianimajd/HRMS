import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Stack, Chip,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const COLOR = '#ec4899';
const COLOR_DARK = '#db2777';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 14px 40px rgba(236,72,153,0.12)', borderRadius: '16px',
};

const STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار', color: '#f59e0b' },
  approved: { label: 'تأیید', color: '#10b981' },
  posted: { label: 'ثبت', color: '#3b82f6' },
  rejected: { label: 'برگشت', color: '#ef4444' },
  edited: { label: 'ویرایش', color: '#8b5cf6' },
};

const PettyCashCalendarPage = () => {
  const { data, isLoading } = useQuery({ queryKey: ['petty-calendar'], queryFn: () => axiosInstance.get('/petty-cash-expense-statements/calendar/').then(r => r.data) });
  const events = Array.isArray(data) ? data : [];

  // گروه‌بندی بر اساس ماه
  const groups = {};
  events.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  const grouped = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <CalendarMonthIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>تقویم هزینه‌ها</Typography>
          <Typography variant="body2" color="textSecondary">نمای ماهانهٔ صورت هزینه‌های تنخواه با رنگ‌بندی وضعیت</Typography>
        </Box>
        <Chip label={`${events.length} صورت`} sx={{ fontWeight: 700 }} />
      </Paper>

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : grouped.length === 0 ? (
        <Paper sx={{ ...glass, p: 4, textAlign: 'center' }}><Typography color="textSecondary">هزینه‌ای ثبت نشده است</Typography></Paper>
      ) : (
        <Stack spacing={2}>
          {grouped.map(([key, items]) => {
            const [y, m] = key.split('-');
            const first = items[0];
            const monthLabel = toJalali(first.date).split('/').slice(0, 2).join('/');
            return (
              <Paper key={key} sx={{ ...glass, p: 2 }}>
                <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} mb={1.5}>{monthLabel}</Typography>
                <Stack spacing={0.75}>
                  {items.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                    <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: '10px', background: 'rgba(255,255,255,0.55)' }}>
                      <Typography variant="caption" sx={{ minWidth: 60, fontWeight: 700 }}>{toJalali(e.date)}</Typography>
                      <Chip size="small" label={e.number} sx={{ bgcolor: 'rgba(236,72,153,0.1)', color: COLOR_DARK, fontWeight: 700 }} />
                      <Typography variant="body2" sx={{ flex: 1 }}>{e.title}</Typography>
                      <Typography variant="body2" fontWeight={700}>{formatPersianNumber(e.total)} ریال</Typography>
                      <Chip size="small" label={STATUS[e.status]?.label || e.status} sx={{ bgcolor: `${STATUS[e.status]?.color || '#64748b'}18`, color: STATUS[e.status]?.color || '#64748b', fontWeight: 700 }} />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default PettyCashCalendarPage;