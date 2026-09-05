import React from 'react';
import { Box, Paper, Typography, Avatar, Divider } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import SalaryTab from '../modules/dataEntry/SalaryTab';

/* P4: فیش حقوق — پایه از SalaryTab (لیست + درونریزی اکسل) */
const PayslipsPage = () => (
  <Box>
    <Paper sx={{
      p: 3, mb: 2.5, borderRadius: 3,
      background: 'linear-gradient(120deg, rgba(59,130,246,0.09), rgba(59,130,246,0.02), rgba(255,255,255,0.3))',
      border: '1px solid rgba(59,130,246,0.18)',
      display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}>
        <PaymentsIcon sx={{ color: '#fff', fontSize: 28 }} />
      </Avatar>
      <Box>
        <Typography variant="h6" fontWeight={800}>فیش حقوق</Typography>
        <Typography variant="body2" color="textSecondary">
          مشاهده، ثبت و درونریزی گروهی فیشهای حقوقی ماهانه
        </Typography>
      </Box>
    </Paper>
    <SalaryTab />
  </Box>
);

export default PayslipsPage;