import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Avatar, Grid, CircularProgress, Button,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import DescriptionIcon from '@mui/icons-material/Description';
import PaymentsIcon from '@mui/icons-material/Payments';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useApplication } from '../core/context/ApplicationContext';
import { toPersianDigits } from '../core/utils/numberUtils';

const ICON_MAP = {
  hrms: <BusinessIcon sx={{ fontSize: 32, color: '#fff' }} />,
  contracts: <DescriptionIcon sx={{ fontSize: 32, color: '#fff' }} />,
  payroll: <PaymentsIcon sx={{ fontSize: 32, color: '#fff' }} />,
  inventory: <InventoryIcon sx={{ fontSize: 32, color: '#fff' }} />,
};

const AppSelectPage = () => {
  const navigate = useNavigate();
  const { applications, currentApp, loadApplications, switchApplication } = useApplication();

  useEffect(() => {
    loadApplications();
  }, []);

  // If user already picked an app and saved it, go straight in.
  useEffect(() => {
    if (currentApp) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentApp]);

  const pick = async (app) => {
    await switchApplication(app);
    navigate('/dashboard', { replace: true });
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a, #312e81, #7c3aed)',
      p: 2,
    }}>
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight={900} color="#fff">ط§ظ†طھط®ط§ط¨ ط³ط§ظ…ط§ظ†ظ‡</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
            ط³ط§ظ…ط§ظ†ظ‡ظ” ظ…ظˆط±ط¯ ظ†ط¸ط± ط®ظˆط¯ ط±ط§ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯ â€” ط¨ط¹ط¯ط§ظ‹ ط§ط² ظ†ظˆط§ط± ط¨ط§ظ„ط§ ظ‡ظ… ظ‚ط§ط¨ظ„ ط¬ط§ط¨ظ‡â€Œط¬ط§غŒغŒ ط§ط³طھ.
          </Typography>
        </Box>

        {applications.length === 0 ? (
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={30} sx={{ color: '#fff' }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 2 }}>
              ط¯ط± ط­ط§ظ„ ط¨ط§ط±ع¯ط°ط§ط±غŒ ط³ط§ظ…ط§ظ†ظ‡â€Œظ‡ط§â€¦
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {applications.map((app) => (
              <Grid item xs={12} sm={6} key={app.id}>
                <Paper
                  onClick={() => pick(app)}
                  sx={{
                    p: 3, cursor: 'pointer', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(16px)',
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'translateY(-4px)', borderColor: 'rgba(129,140,248,0.7)' },
                  }}
                >
                  <Avatar sx={{ width: 56, height: 56, mb: 1.5, background: app.color, boxShadow: `0 8px 24px ${app.color}55` }}>
                    {app.icon ? <img src={app.icon} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} /> : (ICON_MAP[app.slug] || <BusinessIcon sx={{ color: '#fff' }} />)}
                  </Avatar>
                  <Typography variant="h6" fontWeight={800} color="#fff">{app.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{app.description}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default AppSelectPage;