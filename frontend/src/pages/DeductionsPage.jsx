import React, { useState } from 'react';
import { Box, Paper, Typography, Avatar, Tabs, Tab } from '@mui/material';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import DeductionForm from '../modules/dataEntry/DeductionForm';

/* مالی ← کسورات: ثبت کسورات (مالیات، بیمه، اقساط وام و ...) */
const DeductionsPage = () => (
  <Box>
    <Paper sx={{
      p: 3, mb: 2.5, borderRadius: 3,
      background: 'linear-gradient(120deg, rgba(139,92,246,0.10), rgba(59,130,246,0.03), rgba(255,255,255,0.3))',
      border: '1px solid rgba(139,92,246,0.18)',
      display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
        <MoneyOffIcon sx={{ color: '#fff', fontSize: 28 }} />
      </Avatar>
      <Box>
        <Typography variant="h6" fontWeight={800}>کسورات</Typography>
        <Typography variant="body2" color="textSecondary">ثبت کسورات حقوقی: مالیات، بیمه، اقساط وام، مساعده و جریمه</Typography>
      </Box>
    </Paper>
    <DeductionForm />
  </Box>
);

export default DeductionsPage;