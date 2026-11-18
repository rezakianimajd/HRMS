import React from 'react';
import { Badge, Box, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useUnreadNotificationsCount } from '../../hooks/useNotifications';
import { useWorkspaceDock } from './WorkspaceDock';
import { toPersianDigits } from '../../utils/numberUtils';

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
};

/** زنگ اعلان: شمارندهٔ خوانده‌نشده + باز کردن پنجرهٔ کاری اعلان‌ها. */
const NotificationBell = ({ glass = false, compact = false, iconColor }) => {
  const { data: unread = 0 } = useUnreadNotificationsCount();
  const { openNotifications } = useWorkspaceDock();
  const bellColor = iconColor || (unread ? 'text.primary' : 'text.secondary');
  const icon = unread ? (
    <NotificationsActiveIcon sx={{ fontSize: compact ? 20 : 22, color: bellColor }} />
  ) : (
    <NotificationsIcon sx={{ fontSize: compact ? 20 : 22, color: bellColor }} />
  );

  if (glass) {
    return (
      <Box onClick={() => openNotifications()} sx={glassOrb} role="button" aria-label="اعلان‌ها">
        <Badge badgeContent={toPersianDigits(unread)} color="error" overlap="circular" max={99} invisible={!unread}
          sx={{ '& .MuiBadge-badge': { fontSize: 12, fontWeight: 700, height: 18, minWidth: 18 } }}>
          {icon}
        </Badge>
      </Box>
    );
  }

  return (
    <Tooltip title="اعلان‌ها">
      <IconButton color="inherit" onClick={() => openNotifications()} size={compact ? 'small' : 'medium'} aria-label="اعلان‌ها">
        <Badge badgeContent={toPersianDigits(unread)} color="error" max={99} invisible={!unread}>
          {icon}
        </Badge>
      </IconButton>
    </Tooltip>
  );
};

export default NotificationBell;
