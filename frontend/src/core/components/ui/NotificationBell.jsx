import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, IconButton, Menu, Box, Typography, List, ListItem,
  ListItemButton, ListItemText, Divider, Button, CircularProgress,
  Chip, Tooltip,
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

const NotificationBell = () => {
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
    } else {
      // no specific route: just mark read
    }
    if (!n.is_read) {
      markRead.mutate(n.id);
    }
    handleClose();
  };

  const handleMarkAll = () => {
    markAllRead.mutate();
  };

  return (
    <>
      <Tooltip title="اعلان‌ها">
        <IconButton color="inherit" onClick={handleOpen} sx={{ mr: 0.5 }}>
          <Badge
            badgeContent={toPersianDigits(unread)}
            color="error"
            overlap="circular"
            max={99}
            invisible={!unread}
          >
            {unread ? (
              <NotificationsActiveIcon sx={{ color: 'text.primary' }} />
            ) : (
              <NotificationsIcon sx={{ color: 'text.primary' }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 360, maxHeight: 480, overflow: 'hidden' } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={700}>اعلان‌ها</Typography>
          {notifications.length > 0 && (
            <Button size="small" onClick={handleMarkAll} startIcon={<DoneAllIcon />}>
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
                    sx={{
                      px: 2, py: 1.25,
                      bgcolor: n.is_read ? 'transparent' : 'action.hover',
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                        <Chip
                          size="small"
                          label={CATEGORY_LABELS[n.category] || n.category_display}
                          sx={{
                            fontSize: 10.5,
                            height: 20,
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