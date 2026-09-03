import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Chip, Avatar,
} from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import menuConfig from '../core/config/menuConfig';

/**
 * Professional "under development" placeholder page.
 * Smartly uses the menuConfig label for the active route so we never show
 * an untranslated path.
 */
const ComingSoonPage = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  let activeTitle = 'این بخش';
  menuConfig.forEach((group) => {
    group.items.forEach((item) => {
      if (item.path === pathname || pathname.startsWith(`${item.path}/`)) {
        activeTitle = item.title;
      }
    });
  });

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 620,
          width: '100%',
          mx: 4,
          textAlign: 'center',
          p: { xs: 4, md: 7 },
          borderRadius: 4,
          border: '1px solid rgba(99,102,241,0.15)',
          background:
            'linear-gradient(160deg, rgba(99,102,241,0.05), rgba(236,72,153,0.03), rgba(255,255,255,0.6))',
        }}
      >
        <Avatar
          sx={{
            width: 94,
            height: 94,
            mx: 'auto',
            mb: 3,
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            boxShadow: '0 10px 34px rgba(99,102,241,0.35)',
          }}
        >
          <ConstructionIcon sx={{ fontSize: 46, color: '#fff' }} />
        </Avatar>

        <Chip
          icon={<RocketLaunchIcon sx={{ fontSize: 16 }} />}
          label="به‌زودی"
          size="small"
          sx={{
            mb: 2,
            bgcolor: 'rgba(99,102,241,0.1)',
            color: '#6366f1',
            border: '1px solid rgba(99,102,241,0.25)',
            fontWeight: 700,
          }}
        />

        <Typography variant="h4" fontWeight={800} sx={{ mb: 1.5 }}>
          {activeTitle}
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 4, lineHeight: 2 }}>
          این بخش در حال توسعه است. تیم محصول در حال تکمیل امکانات حرفه‌ای آن
          مطابق با نیازهای سازمانی می‌باشد و به‌زودی در دسترس شما قرار خواهد گرفت.
        </Typography>

        <Button
          variant="contained"
          startIcon={<ArrowForwardIcon sx={{ transform: 'scaleX(-1)' }} />}
          onClick={() => navigate('/dashboard')}
          sx={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            px: 4,
            py: 1.2,
            borderRadius: 2,
            boxShadow: '0 6px 20px rgba(99,102,241,0.3)',
          }}
        >
          بازگشت به داشبورد
        </Button>
      </Paper>
    </Box>
  );
};

export default ComingSoonPage;