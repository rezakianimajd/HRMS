import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Chip, CircularProgress, Paper, Avatar, Divider,
} from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MailIcon from '@mui/icons-material/Mail';
import CampaignIcon from '@mui/icons-material/Campaign';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BusinessIcon from '@mui/icons-material/Business';
import { toJalali } from '../../utils/dateUtils';
import { toPersianDigits } from '../../utils/numberUtils';

const TYPE_META = {
  hire: { color: '#10b981', label: 'استخدام', icon: <BadgeIcon fontSize="small" /> },
  employment_change: { color: '#6366f1', label: 'تغییر شغلی', icon: <HistoryIcon fontSize="small" /> },
  work_experience: { color: '#8b5cf6', label: 'سابقه قبلی', icon: <WorkIcon fontSize="small" /> },
  contract: { color: '#f59e0b', label: 'قرارداد', icon: <AssignmentIcon fontSize="small" /> },
  leave: { color: '#3b82f6', label: 'مرخصی', icon: <EventBusyIcon fontSize="small" /> },
  document: { color: '#14b8a6', label: 'مدرک', icon: <DescriptionIcon fontSize="small" /> },
  penalty: { color: '#ef4444', label: 'جریمه', icon: <AccountBalanceWalletIcon fontSize="small" /> },
  incoming_letter: { color: '#06b6d4', label: 'نامه وارده', icon: <MailIcon fontSize="small" /> },
  outgoing_letter: { color: '#0ea5e9', label: 'نامه صادره', icon: <MailIcon fontSize="small" /> },
  announcement: { color: '#ec4899', label: 'ابلاغ', icon: <CampaignIcon fontSize="small" /> },
};

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

// Convert a Jalali "YYYY/MM/DD" string to a "ماه سال" group key.
const monthKey = (jalali) => {
  const [y, m] = jalali.split('/').map(Number);
  return `${y}/${m}`;
};
const monthLabel = (jalali) => {
  const [y, m] = jalali.split('/').map(Number);
  return `${JALALI_MONTHS[(m || 1) - 1]} ${toPersianDigits(y)}`;
};

const TimelineTab = ({ employeeId }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['employee-timeline', employeeId],
    queryFn: () =>
      axiosInstance.get(`/employees/${employeeId}/timeline/`).then((r) => r.data),
    enabled: !!employeeId,
  });

  const grouped = useMemo(() => {
    const events = data?.events || [];
    const map = {};
    events.forEach((ev) => {
      const j = toJalali(ev.date);
      const key = monthKey(j);
      if (!map[key]) map[key] = { label: monthLabel(j), items: [] };
      map[key].items.push(ev);
    });
    // Keep insertion order, newest-first (backend already sorts desc).
    return Object.values(map);
  }, [data]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
        <CircularProgress size={36} thickness={4} />
        <Typography variant="body2" color="textSecondary">در حال بارگذاری پروندهٔ زمانی…</Typography>
      </Box>
    );
  }
  if (isError || !data) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
        <Typography color="error" fontWeight={700}>خطا در دریافت تایملاین</Typography>
      </Paper>
    );
  }

  if (!grouped.length) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.25)' }}>
        <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="textSecondary">هنوز رویدادی در پرونده ثبت نشده است</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={800}>تایملاین ۳۶۰°</Typography>
          <Chip size="small" sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700 }}>
            {toPersianDigits(data.total)} رویداد
          </Chip>
        </Box>
        <Typography variant="caption" color="textSecondary">
          نمایهٔ یکپارچهٔ سوابق: استخدام، تغییرات، مرخصی، مدارک و مکاتبات
        </Typography>
      </Box>

      {grouped.map((group, gi) => (
        <Box key={group.label}>
          {/* Month label */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2 }}>
            <Box sx={{
              px: 1.75, py: 0.5, borderRadius: 50,
              background: `linear-gradient(135deg, ${'#6366f1'}18, ${'#ec4899'}14)`,
              border: '1px solid rgba(99,102,241,0.2)',
              boxShadow: '0 2px 10px rgba(99,102,241,0.12)',
            }}>
              <Typography variant="caption" fontWeight={800} sx={{ color: '#6366f1' }}>
                {group.label}
              </Typography>
            </Box>
            <Divider sx={{ flex: 1, borderColor: 'rgba(99,102,241,0.12)' }} />
          </Box>

          {/* Timeline column */}
          <Box sx={{ position: 'relative', pr: 3, pb: gi === grouped.length - 1 ? 0 : 2 }}>
            {/* Vertical gradient rail */}
            <Box sx={{
              position: 'absolute', top: 6, bottom: 6, right: 13,
              width: 2.5, borderRadius: 2,
              background: 'linear-gradient(180deg, rgba(99,102,241,0.55), rgba(236,72,153,0.25))',
            }} />

            {group.items.map((ev, idx) => {
              const meta = TYPE_META[ev.type] || { color: '#94a3b8', label: ev.type, icon: <HistoryIcon fontSize="small" /> };
              const day = toJalali(ev.date).split('/')[2];
              return (
                <Box key={`${ev.type}-${ev.date}-${idx}`} sx={{ position: 'relative', pr: 4, pb: 2.25 }}>
                  {/* Node */}
                  <Avatar sx={{
                    position: 'absolute', right: 0, top: 2,
                    width: 30, height: 30,
                    bgcolor: meta.color,
                    boxShadow: `0 0 0 4px ${meta.color}26, 0 4px 12px ${meta.color}40`,
                    zIndex: 1,
                    transition: 'transform 0.2s ease',
                    '&:hover': { transform: 'scale(1.12)' },
                  }}>
                    {meta.icon}
                  </Avatar>

                  {/* Event card */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.75, ml: 0,
                      borderRadius: 2.5,
                      background: `linear-gradient(135deg, ${meta.color}0e, ${meta.color}05)`,
                      border: `1px solid ${meta.color}22`,
                      boxShadow: `0 3px 14px ${meta.color}14`,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 22px ${meta.color}24`,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={meta.label}
                        sx={{
                          height: 20, fontSize: 11, fontWeight: 700,
                          bgcolor: `${meta.color}20`, color: meta.color,
                        }}
                      />
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                        {toPersianDigits(day)} {group.label.split(' ')[0]}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={800} sx={{ mt: 0.75 }}>
                      {ev.title}
                    </Typography>
                    {ev.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.25, lineHeight: 1.6 }}>
                        {ev.description}
                      </Typography>
                    )}
                  </Paper>
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default TimelineTab;