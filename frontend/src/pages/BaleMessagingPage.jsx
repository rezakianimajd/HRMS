import React from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import BaleAudiencePanel from '../core/components/settings/BaleAudiencePanel';

const BaleMessagingPage = () => {
  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(16,185,129,0.10), rgba(59,130,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.16)', borderRadius: 3,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #10b981, #14b8a6)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
          <ChatIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#047857">اطلاع‌رسانی و ارسال پیام بله</Typography>
          <Typography variant="body2" color="textSecondary">قالب‌های پیام، مخاطبان گروهی و ارسال سریع از طریق ربات بله</Typography>
        </Box>
      </Paper>

      <BaleAudiencePanel />
    </Box>
  );
};

export default BaleMessagingPage;