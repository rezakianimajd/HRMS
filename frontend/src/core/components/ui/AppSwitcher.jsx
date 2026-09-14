import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Menu, MenuItem, Avatar, Typography, ListItemIcon, Divider, Button } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import BusinessIcon from '@mui/icons-material/Business';
import DescriptionIcon from '@mui/icons-material/Description';
import ConstructionIcon from '@mui/icons-material/Construction';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useApplication } from '../../context/ApplicationContext';

const ICON_MAP = {
  hrms: <BusinessIcon sx={{ fontSize: 20, color: '#fff' }} />,
  contracts: <DescriptionIcon sx={{ fontSize: 20, color: '#fff' }} />,
  pettycash: <AccountBalanceWalletIcon sx={{ fontSize: 20, color: '#fff' }} />,
};

// مسیر ورودی هر ماژول (هنگام انتخاب).
const LANDING_PATH = {
  hrms: '/dashboard',
  contracts: '/contracts-dashboard',
  settings: '/settings',
  projects: '/projects',
  pettycash: '/petty-cash',
};

const AppSwitcher = () => {
  const navigate = useNavigate();
  const { applications, currentApp, loadApplications, switchApplication } = useApplication();
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const activeApps = applications.filter((a) => !a.is_coming_soon);
  const comingSoonApps = applications.filter((a) => a.is_coming_soon);

  const pick = async (app) => {
    if (app.is_coming_soon) return;
    setAnchor(null);
    await switchApplication(app);
    navigate(LANDING_PATH[app.slug] || '/dashboard');
  };

  if (applications.length <= 1) return null;

  const renderIcon = (app, size) => {
    if (app.icon && app.icon.length <= 4) {
      return <Typography sx={{ fontSize: size * 0.6, lineHeight: 1 }}>{app.icon}</Typography>;
    }
    if (app.icon) {
      return <img src={app.icon} width={size} height={size} alt="" />;
    }
    return ICON_MAP[app.slug] || <BusinessIcon sx={{ fontSize: size * 0.6, color: '#fff' }} />;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Button
        fullWidth
        onClick={(e) => setAnchor(e.currentTarget)}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.75,
          minHeight: 40,
          textTransform: 'none',
          borderRadius: '12px',
          border: '1px solid rgba(99,102,241,0.25)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(236,72,153,0.05))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 14px rgba(99,102,241,0.12)',
          '&:hover': {
            borderColor: 'rgba(99,102,241,0.5)',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(236,72,153,0.08))',
          },
          transition: 'all 0.2s ease',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Avatar
            src={currentApp?.icon && currentApp?.icon.length > 4 ? currentApp.icon : undefined}
            sx={{
              width: 26,
              height: 26,
              background: currentApp?.color || '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 3px 8px ${currentApp?.color || '#6366f1'}55`,
              flexShrink: 0,
            }}
          >
            {currentApp ? renderIcon(currentApp, 16) : <BusinessIcon sx={{ fontSize: 14, color: '#fff' }} />}
          </Avatar>
          <Box sx={{ textAlign: 'right', minWidth: 0 }}>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', lineHeight: 1, fontSize: 10 }}>
              سامانهٔ فعال
            </Typography>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.3, fontSize: 13 }}>
              {currentApp?.title || 'انتخاب ماژول'}
            </Typography>
          </Box>
        </Box>
      </Button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: {
          sx: {
            mt: 1,
            borderRadius: '14px',
            minWidth: 240,
            background: 'linear-gradient(160deg, #ffffff, #f8faff)',
            border: '1px solid rgba(99,102,241,0.15)',
            boxShadow: '0 18px 50px rgba(99,102,241,0.22)',
            overflow: 'hidden',
          },
        } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="textSecondary">انتخاب سامانه</Typography>
        </Box>
        {activeApps.map((app) => (
          <MenuItem
            key={app.id}
            onClick={() => pick(app)}
            selected={currentApp?.id === app.id}
            sx={{ py: 1, px: 1.5, mx: 1, borderRadius: '10px', mb: 0.25 }}
          >
            <ListItemIcon>
              <Avatar sx={{ width: 28, height: 28, background: app.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 8px ${app.color}55` }}>
                {renderIcon(app, 16)}
              </Avatar>
            </ListItemIcon>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={currentApp?.id === app.id ? 700 : 500}>{app.title}</Typography>
            </Box>
            {currentApp?.id === app.id && <CheckRoundedIcon sx={{ fontSize: 18, color: app.color }} />}
          </MenuItem>
        ))}

        {comingSoonApps.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Divider sx={{ my: 0.5, mx: 1 }} />
            <Box sx={{ px: 2, py: 0.5 }}>
              <Typography variant="caption" color="textSecondary">در حال بهسازی و ساخت</Typography>
            </Box>
            {comingSoonApps.map((app) => (
              <MenuItem key={app.id} disabled sx={{ opacity: 0.55, py: 1, px: 1.5, mx: 1, borderRadius: '10px' }}>
                <ListItemIcon>
                  <Avatar sx={{ width: 28, height: 28, background: app.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderIcon(app, 16)}
                  </Avatar>
                </ListItemIcon>
                <Typography variant="body2" sx={{ flex: 1 }}>{app.title}</Typography>
                <ConstructionIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default AppSwitcher;