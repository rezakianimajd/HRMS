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
import PageHeader from '../core/components/ui/PageHeader';

const BaleMessagingPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
            <PageHeader
        icon={<ChatIcon />}
        title="اطلاع‌رسانی و ارسال پیام بله"
      />

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