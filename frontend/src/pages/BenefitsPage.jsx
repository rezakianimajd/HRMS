import React from 'react';
import { Box, Paper, Typography, Avatar } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import BenefitTab from '../modules/dataEntry/BenefitTab';

/* ظ…ط§ظ„غŒ â†گ ظ…ط²ط§غŒط§: ط«ط¨طھ/ط¯ط±ظˆظ†ط±غŒط²غŒ/ظ„غŒط³طھ ظ…ط²ط§غŒط§غŒ ط±ظپط§ظ‡غŒ */
const BenefitsPage = () => (
  <Box>
    <Paper sx={{
      p: 3, mb: 2.5, borderRadius: '10px',
      background: 'linear-gradient(120deg, rgba(16,185,129,0.10), rgba(16,185,129,0.03), rgba(255,255,255,0.3))',
      border: '1px solid rgba(16,185,129,0.18)',
      display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #10b981, #0ea5e9)', boxShadow: '0 8px 24px rgba(16,185,129,0.4)' }}>
        <CardGiftcardIcon sx={{ color: '#fff', fontSize: 28 }} />
      </Avatar>
      <Box>
        <Typography variant="h6" fontWeight={800}>ظ…ط²ط§غŒط§ ظˆ ع©ط§ط±ط§ظ†ظ‡</Typography>
        <Typography variant="body2" color="textSecondary">ط«ط¨طھطŒ ط¯ط±ظˆظ†ط±غŒط²غŒ ظˆ ظ„غŒط³طھ ظ…ط²ط§غŒط§غŒ ط±ظپط§ظ‡غŒ (ط§غŒط¯غŒطŒ ط¨ظ†ع©ط§ط±طھطŒ ع©ظ…ع© ظ‡ط²غŒظ†ظ‡ ظˆ ...)</Typography>
      </Box>
    </Paper>
    <BenefitTab />
  </Box>
);

export default BenefitsPage;