import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Box, Button, Chip, Divider, List, ListItemButton, ListItemText,
  Menu, IconButton, Tooltip, Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../../hooks/useNotifications';
import { toJalali } from '../../utils/dateUtils';
import { toPersianDigits } from '../../utils/numberUtils';

const CATEGORY_LABELS = {
  leave_request: 'درخواست مرخصی',
  hr_request: 'درخواست اداری',
  contract_expiry: 'پایان قرارداد',
  document_expiry: 'انقضای مدرک',
  leave_balance: 'مانده مرخصی',
};

const CATEGORY_COLORS = {
  leave_request: '#f59e0b',
  hr_request: '#6366f1',
  contract_expiry: '#ef4444',
  document_expiry: '#3b82f6',
  leave_balance: '#10b981',
};

const glassOrb = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  cursor: 'pointer',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.35)',
  boxShadow: '0 4px 18px rgba(99,102,241,0.28), inset 0 1px 0 rgba(255,255,255,0.45)',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    background: 'linear-gradient(135deg, rgba(129,140,248,0.22), rgba(236,72,153,0.10))',
    boxShadow: '0 8px 26px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
  },
};

const NotificationBell = ({ glass = false }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const { data: notifications = [] } = useNotifications(20);
  const { data: unread = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const navigateTo = (n) => {
    if (n.entity_type === 'employee' && n.entity_id) {
      navigate(`/employees/${n.entity_id}`);
    } else if (n.entity_type === 'leave_request') {
      navigate('/leaves');
    } else if (n.entity_type === 'hr_request') {
      navigate('/requests');
    } else if (n.entity_type === 'document') {
      navigate('/documents');
    }
    if (!n.is_read) {
      markRead.mutate(n.id);
    }
    handleClose();
  };

  const icon = unread ? (
    <NotificationsActiveIcon sx={{ fontSize: 22, color: 'text.primary' }} />
  ) : (
    <NotificationsIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
  );

  const trigger = glass ? (
    <Box onClick={handleOpen} sx={glassOrb}>
      <Badge
        badgeContent={toPersianDigits(unread)}
        color="error"
        overlap="circular"
        max={99}
        invisible={!unread}
        sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 700, height: 18, minWidth: 18 } }}
      >
        {icon}
      </Badge>
    </Box>
  ) : (
    <Tooltip title="اعلان‌ها">
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={toPersianDigits(unread)} color="error" max={99} invisible={!unread}>
          {icon}
        </Badge>
      </IconButton>
    </Tooltip>
  );

  return (
    <>
      {trigger}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 360, maxHeight: 480, overflow: 'hidden' } }}
      >
        <Box sx={{
          px: 2, py: 1.5, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Typography variant="subtitle1" fontWeight={700}>اعلان‌ها</Typography>
          {notifications.length > 0 && (
            <Button size="small" onClick={markAllRead.mutate} startIcon={<DoneAllIcon />}>
              خواندن همه
            </Button>
          )}
        </Box>

        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="textSecondary">اعلانی وجود ندارد</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((n) => (
                <React.Fragment key={n.id}>
                  <ListItemButton
                    onClick={() => navigateTo(n)}
                    sx={{ px: 2, py: 1.25, bgcolor: n.is_read ? 'transparent' : 'action.hover' }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                        <Chip
                          size="small"
                          label={CATEGORY_LABELS[n.category] || n.category_display}
                          sx={{
                            fontSize: 10.5, height: 20,
                            bgcolor: `${CATEGORY_COLORS[n.category] || '#6366f1'}1a`,
                            color: CATEGORY_COLORS[n.category] || '#6366f1',
                          }}
                        />
                        {!n.is_read && (
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'error.main', flexShrink: 0 }} />
                        )}
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto', flexShrink: 0 }}>
                          {toJalali(String(n.created_at).slice(0, 10))}
                        </Typography>
                      </Box>
                      <ListItemText
                        primary={n.title}
                        secondary={n.body}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: n.is_read ? 500 : 700, noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: false, component: 'div' }}
                      />
                    </Box>
                  </ListItemButton>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;