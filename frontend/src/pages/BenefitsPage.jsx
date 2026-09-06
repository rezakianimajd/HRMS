import React from 'react';
import { Box, Paper, Typography, Avatar } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import BenefitTab from '../modules/dataEntry/BenefitTab';

/* مالی ← مزایا: ثبت/درونریزی/لیست مزایای رفاهی */
const BenefitsPage = () => (
  <Box>
    <Paper sx={{
      p: 3, mb: 2.5, borderRadius: 3,
      background: 'linear-gradient(120deg, rgba(16,185,129,0.10), rgba(16,185,129,0.03), rgba(255,255,255,0.3))',
      border: '1px solid rgba(16,185,129,0.18)',
      display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #10b981, #0ea5e9)', boxShadow: '0 8px 24px rgba(16,185,129,0.4)' }}>
        <CardGiftcardIcon sx={{ color: '#fff', fontSize: 28 }} />
      </Avatar>
      <Box>
        <Typography variant="h6" fontWeight={800}>مزایا و کارانه</Typography>
        <Typography variant="body2" color="textSecondary">ثبت، درونریزی و لیست مزایای رفاهی (ایدی، بنکارت، کمک هزینه و ...)</Typography>
      </Box>
    </Paper>
    <BenefitTab />
  </Box>
);

export default BenefitsPage;