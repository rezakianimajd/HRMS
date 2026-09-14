import React from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import { CompanyProfileTab } from '../core/components/settings/shared';

const CompanyProfilePage = () => (
  <Box>
    <Paper sx={{
      mb: 3, p: 2.5, display: 'flex', alignItems: 'center', gap: 2,
      background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.05))',
      border: '1px solid rgba(99,102,241,0.2)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '10px',
    }}>
      <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}>
        <BusinessIcon sx={{ fontSize: 28, color: '#fff' }} />
      </Avatar>
      <Box>
        <Typography variant="h5" fontWeight={800}>مشخصات شرکت</Typography>
        <Typography variant="body2" color="textSecondary">اطلاعات حقوقی، تماس و لوگوی شرکت</Typography>
      </Box>
    </Paper>

    <Paper sx={{
      p: 3,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '10px',
    }}>
      <CompanyProfileTab />
    </Paper>
  </Box>
);

export default CompanyProfilePage;