import React, { useState } from 'react';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HistoryIcon from '@mui/icons-material/History';
import BaleAudiencePanel from '../core/components/settings/BaleAudiencePanel';
import BaleSchedulePanel from '../core/components/settings/BaleSchedulePanel';
import BaleHistoryPanel from '../core/components/settings/BaleHistoryPanel';

const BaleMessagingPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(16,185,129,0.10), rgba(59,130,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.16)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #10b981, #14b8a6)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
          <ChatIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#047857">اطلاع‌رسانی و ارسال پیام بله</Typography>
          <Typography variant="body2" color="textSecondary">قالب‌های پیام، مخاطبان گروهی، زمان‌بندی و تاریخچهٔ ارسال</Typography>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<SendIcon />} iconPosition="start" label="ارسال و قالب‌ها" />
          <Tab icon={<ScheduleIcon />} iconPosition="start" label="زمان‌بندی" />
          <Tab icon={<HistoryIcon />} iconPosition="start" label="تاریخچه" />
        </Tabs>
      </Paper>

      {tab === 0 && <BaleAudiencePanel />}
      {tab === 1 && <BaleSchedulePanel />}
      {tab === 2 && <BaleHistoryPanel />}
    </Box>
  );
};

export default BaleMessagingPage;