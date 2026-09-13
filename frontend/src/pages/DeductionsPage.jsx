import React, { useState } from 'react';
import { Box, Paper, Typography, Avatar, Tabs, Tab } from '@mui/material';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import DeductionForm from '../modules/dataEntry/DeductionForm';

/* ظ…ط§ظ„غŒ â†گ ع©ط³ظˆط±ط§طھ: ط«ط¨طھ ع©ط³ظˆط±ط§طھ (ظ…ط§ظ„غŒط§طھطŒ ط¨غŒظ…ظ‡طŒ ط§ظ‚ط³ط§ط· ظˆط§ظ… ظˆ ...) */
const DeductionsPage = () => (
  <Box>
    <Paper sx={{
      p: 3, mb: 2.5, borderRadius: '10px',
      background: 'linear-gradient(120deg, rgba(139,92,246,0.10), rgba(59,130,246,0.03), rgba(255,255,255,0.3))',
      border: '1px solid rgba(139,92,246,0.18)',
      display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
        <MoneyOffIcon sx={{ color: '#fff', fontSize: 28 }} />
      </Avatar>
      <Box>
        <Typography variant="h6" fontWeight={800}>ع©ط³ظˆط±ط§طھ</Typography>
        <Typography variant="body2" color="textSecondary">ط«ط¨طھ ع©ط³ظˆط±ط§طھ ط­ظ‚ظˆظ‚غŒ: ظ…ط§ظ„غŒط§طھطŒ ط¨غŒظ…ظ‡طŒ ط§ظ‚ط³ط§ط· ظˆط§ظ…طŒ ظ…ط³ط§ط¹ط¯ظ‡ ظˆ ط¬ط±غŒظ…ظ‡</Typography>
      </Box>
    </Paper>
    <DeductionForm />
  </Box>
);

export default DeductionsPage;