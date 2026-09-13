import React from 'react';
import { Box, Paper, Typography, Avatar, Divider } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import SalaryTab from '../modules/dataEntry/SalaryTab';

/* P4: ظپغŒط´ ط­ظ‚ظˆظ‚ â€” ظ¾ط§غŒظ‡ ط§ط² SalaryTab (ظ„غŒط³طھ + ط¯ط±ظˆظ†ط±غŒط²غŒ ط§ع©ط³ظ„) */
const PayslipsPage = () => (
  <Box>
    <Paper sx={{
      p: 3, mb: 2.5, borderRadius: '10px',
      background: 'linear-gradient(120deg, rgba(59,130,246,0.09), rgba(59,130,246,0.02), rgba(255,255,255,0.3))',
      border: '1px solid rgba(59,130,246,0.18)',
      display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}>
        <PaymentsIcon sx={{ color: '#fff', fontSize: 28 }} />
      </Avatar>
      <Box>
        <Typography variant="h6" fontWeight={800}>ظپغŒط´ ط­ظ‚ظˆظ‚</Typography>
        <Typography variant="body2" color="textSecondary">
          ظ…ط´ط§ظ‡ط¯ظ‡طŒ ط«ط¨طھ ظˆ ط¯ط±ظˆظ†ط±غŒط²غŒ ع¯ط±ظˆظ‡غŒ ظپغŒط´ظ‡ط§غŒ ط­ظ‚ظˆظ‚غŒ ظ…ط§ظ‡ط§ظ†ظ‡
        </Typography>
      </Box>
    </Paper>
    <SalaryTab />
  </Box>
);

export default PayslipsPage;