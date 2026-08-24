import React from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HRAssistant from '../core/components/ui/HRAssistant';

const AssistantPage = () => (
  <Box>
    {/* Glass header */}
    <Paper sx={{
      mb: 3, p: 2.5,
      display: 'flex', alignItems: 'center', gap: 2,
      background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.05))',
      border: '1px solid rgba(99,102,241,0.2)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 3,
    }}>
      <Avatar sx={{
        width: 56, height: 56,
        background: 'linear-gradient(135deg, #6366f1, #ec4899)',
        boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
      }}>
        <SmartToyIcon sx={{ fontSize: 28, color: '#fff' }} />
      </Avatar>
      <Box>
        <Typography variant="h5" fontWeight={800}>دستیار</Typography>
        <Typography variant="body2" color="textSecondary">دستیار هوشمند منابع انسانی — پاسخ فوری و آفلاین</Typography>
      </Box>
    </Paper>

    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <HRAssistant />
    </Box>
  </Box>
);

export default AssistantPage;