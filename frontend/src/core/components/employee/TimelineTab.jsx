import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Chip, CircularProgress, Avatar,
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

const TimelineTab = ({ employeeId }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['employee-timeline', employeeId],
    queryFn: () =>
      axiosInstance.get(`/employees/${employeeId}/timeline/`).then((r) => r.data),
    enabled: !!employeeId,
  });

  if (isLoading) {
    return <Box sx={{ textAlign: 'center', p: 4 }}><CircularProgress /></Box>;
  }
  if (isError || !data) {
    return <Typography color="error">خطا در دریافت تایملاین</Typography>;
  }

  const events = data.events || [];

  if (events.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>
        <BusinessIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
        <Typography variant="body2">رویدادی برای نمایش وجود ندارد</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>تایملاین ۳۶۰°</Typography>
        <Chip size="small" color="primary" label={`${toPersianDigits(data.total)} رویداد`} />
      </Box>

      <Box sx={{ position: 'relative', pr: 2 }}>
        {/* vertical connector line */}
        <Box sx={{
          position: 'absolute', top: 8, bottom: 8, right: 15,
          width: 2, bgcolor: 'divider',
        }} />

        {events.map((ev, i) => {
          const meta = TYPE_META[ev.type] || { color: '#94a3b8', label: ev.type, icon: <HistoryIcon fontSize="small" /> };
          return (
            <Box key={i} sx={{ position: 'relative', pr: 4, pb: 2.5 }}>
              <Avatar sx={{
                position: 'absolute', right: 0, top: 0,
                width: 32, height: 32,
                bgcolor: meta.color,
                boxShadow: `0 0 0 4px ${meta.color}22`,
                zIndex: 1,
              }}>
                {meta.icon}
              </Avatar>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={meta.label}
                  sx={{ bgcolor: `${meta.color}1a`, color: meta.color, height: 20, fontSize: 11 }}
                />
                <Typography variant="caption" color="textSecondary">
                  {toJalali(ev.date)}
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                {ev.title}
              </Typography>
              {ev.description && (
                <Typography variant="body2" color="textSecondary">
                  {ev.description}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default TimelineTab;