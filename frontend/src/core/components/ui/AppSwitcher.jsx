import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Menu, MenuItem, Avatar, Typography, Chip, ListItemIcon } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import BusinessIcon from '@mui/icons-material/Business';
import DescriptionIcon from '@mui/icons-material/Description';
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

  const pick = async (app) => {
    setAnchor(null);
    await switchApplication(app);
    navigate('/dashboard');
  };

  if (applications.length <= 1) return null;

  return (
    <Box>
      <Chip
        onClick={(e) => setAnchor(e.currentTarget)}
        avatar={
          <Avatar sx={{ width: 22, height: 22, background: currentApp?.color || '#6366f1' }}>
            {currentApp ? (ICON_MAP[currentApp.slug] || <BusinessIcon sx={{ fontSize: 14, color: '#fff' }} />) : <BusinessIcon sx={{ fontSize: 14, color: '#fff' }} />}
          </Avatar>
        }
        label={currentApp?.title || 'انتخاب سامانه'}
        onDelete={() => {}}
        deleteIcon={<KeyboardArrowDownIcon />}
        size="small"
        variant="outlined"
        sx={{ maxWidth: 210, '& .MuiChip-label': { fontSize: 12 } }}
      />
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {applications.map((app) => (
          <MenuItem key={app.id} onClick={() => pick(app)} selected={currentApp?.id === app.id}>
            <ListItemIcon>
              <Avatar sx={{ width: 26, height: 26, background: app.color }}>
                {app.icon ? <img src={app.icon} width={18} height={18} alt="" /> : (ICON_MAP[app.slug] || <BusinessIcon sx={{ fontSize: 16, color: '#fff' }} />)}
              </Avatar>
            </ListItemIcon>
            <Typography variant="body2">{app.title}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default AppSwitcher;