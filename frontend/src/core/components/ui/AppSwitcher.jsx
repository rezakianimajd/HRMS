import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Menu, MenuItem, Avatar, Typography, Chip, ListItemIcon, Divider, Tooltip } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import BusinessIcon from '@mui/icons-material/Business';
import DescriptionIcon from '@mui/icons-material/Description';
import ConstructionIcon from '@mui/icons-material/Construction';
import { useApplication } from '../../context/ApplicationContext';

const ICON_MAP = {
  hrms: <BusinessIcon sx={{ fontSize: 20, color: '#fff' }} />,
  contracts: <DescriptionIcon sx={{ fontSize: 20, color: '#fff' }} />,
};

const AppSwitcher = () => {
  const navigate = useNavigate();
  const { applications, currentApp, loadApplications, switchApplication } = useApplication();
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const activeApps = applications.filter(a => !a.is_coming_soon);
  const comingSoonApps = applications.filter(a => a.is_coming_soon);

  const pick = async (app) => {
    if (app.is_coming_soon) return;
    setAnchor(null);
    await switchApplication(app);
    navigate('/dashboard');
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
    <Box>
      <Chip
        onClick={(e) => setAnchor(e.currentTarget)}
        avatar={
          <Avatar sx={{ width: 22, height: 22, background: currentApp?.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentApp ? renderIcon(currentApp, 14) : <BusinessIcon sx={{ fontSize: 14, color: '#fff' }} />}
          </Avatar>
        }
        label={currentApp?.title || 'انتخاب ماژول'}
        onDelete={() => {}}
        deleteIcon={<KeyboardArrowDownIcon />}
        size="small"
        variant="outlined"
        sx={{ maxWidth: 210, '& .MuiChip-label': { fontSize: 12 } }}
      />
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} sx={{ maxHeight: 460 }}>
        {activeApps.map((app) => (
          <MenuItem key={app.id} onClick={() => pick(app)} selected={currentApp?.id === app.id}>
            <ListItemIcon>
              <Avatar sx={{ width: 26, height: 26, background: app.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderIcon(app, 16)}
              </Avatar>
            </ListItemIcon>
            <Typography variant="body2">{app.title}</Typography>
          </MenuItem>
        ))}

        {comingSoonApps.length > 0 && (
          <Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ px: 2, py: 0.5 }}>
              <Typography variant="caption" color="textSecondary">
                در حال بهسازی و ساخت
              </Typography>
            </Box>
            {comingSoonApps.map((app) => (
              <MenuItem key={app.id} disabled sx={{ opacity: 0.55 }}>
                <ListItemIcon>
                  <Avatar sx={{ width: 26, height: 26, background: app.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderIcon(app, 16)}
                  </Avatar>
                </ListItemIcon>
                <Typography variant="body2">{app.title}</Typography>
                <Tooltip title="در حال بهسازی و ساخت" placement="left">
                  <ConstructionIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 'auto' }} />
                </Tooltip>
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default AppSwitcher;