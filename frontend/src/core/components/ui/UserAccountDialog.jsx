import React from 'react';
import {
  Avatar, Box, Button, ButtonBase, Chip, Dialog, DialogContent, Divider, IconButton, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { employeePhotoPreview } from '../../utils/photoUrl';
import UserAvatar from './UserAvatar';

const Action = ({ icon: Icon, title, subtitle, onClick, color = '#6366f1', danger = false }) => (
  <ButtonBase
    onClick={onClick}
    sx={{
      display: 'block', width: '100%', textAlign: 'right', p: 1.1, borderRadius: '12px',
      border: '1px solid', borderColor: danger ? alpha('#ef4444', 0.25) : alpha(color, 0.2),
      bgcolor: danger ? alpha('#ef4444', 0.035) : alpha(color, 0.035),
      '&:hover': { borderColor: danger ? alpha('#ef4444', 0.45) : alpha(color, 0.45) },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center',
        color: danger ? '#ef4444' : color, bgcolor: danger ? alpha('#ef4444', 0.1) : alpha(color, 0.1),
        flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 17 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 900 }}>{title}</Typography>
        {subtitle ? <Typography sx={{ fontSize: 9.8, color: 'text.secondary', mt: 0.15 }}>{subtitle}</Typography> : null}
      </Box>
    </Box>
  </ButtonBase>
);

const UserAccountDialog = ({
  open, user, onClose, onLogout, onNavigate, onWorkdesk, onDocuments, onSettings,
}) => {
  const name = user?.full_name
    || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    || user?.username
    || 'کاربر';
  const photo = employeePhotoPreview(user?.employee_photo);
  const employeeId = user?.employee_id || user?.employee?.id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden' } }}>
      <Box sx={{
        px: 1.5, py: 1.1, display: 'flex', alignItems: 'center', gap: 1,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'var(--hrms-region-header-bg, #ffffff)',
      }}>
        <BadgeOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 900, flex: 1 }}>حساب کاربری</Typography>
        <IconButton size="small" onClick={onClose} aria-label="بستن"><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
      </Box>
      <DialogContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.25 }}>
          {photo ? (
            <Avatar
              src={photo}
              alt={name}
              sx={{
                width: 82, height: 82, border: '3px solid',
                borderColor: 'background.paper', boxShadow: '0 8px 24px rgba(15,23,42,0.16)',
              }}
            />
          ) : (
            <UserAvatar
              user={user}
              size={82}
              sx={{
                border: '3px solid', borderColor: 'background.paper',
                boxShadow: '0 8px 24px rgba(15,23,42,0.16)',
              }}
            />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 900 }}>{name}</Typography>
            <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.2 }}>
              @{user?.username}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.45, mt: 0.6, flexWrap: 'wrap' }}>
              {user?.is_superuser || user?.is_full_access ? (
                <Chip size="small" label="دسترسی کامل" sx={{ height: 20, fontSize: 9.5, color: '#6366f1', bgcolor: alpha('#6366f1', 0.1) }} />
              ) : null}
              {user?.employee_code ? (
                <Chip size="small" label={`کد پرسنلی ${user.employee_code}`} sx={{ height: 20, fontSize: 9.5 }} />
              ) : null}
            </Box>
          </Box>
        </Box>
        {(user?.employee_department || user?.employee_position) ? (
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mb: 1 }}>
            {[user.employee_department, user.employee_position].filter(Boolean).join(' · ')}
          </Typography>
        ) : null}
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ display: 'grid', gap: 0.65 }}>
          <Action icon={MoveToInboxOutlinedIcon} title="کارتابل من" subtitle="ارجاعات و درخواست‌های در انتظار اقدام" color="#0f766e" onClick={onWorkdesk} />
          <Action icon={FolderSharedOutlinedIcon} title="اسناد سازمانی" subtitle="مدارک و مستندات شرکت" color="#2563eb" onClick={onDocuments} />
          {employeeId ? (
            <Action icon={BadgeOutlinedIcon} title="پروندهٔ پرسنلی" subtitle="مشاهدهٔ مشخصات و مدارک پرسنلی" color="#ec4899" onClick={() => onNavigate?.(`/employees/${employeeId}`)} />
          ) : null}
          <Action icon={SettingsOutlinedIcon} title="تنظیمات" subtitle="تنظیمات عمومی و ماژول‌های مجاز" color="#64748b" onClick={onSettings} />
          <Action icon={LogoutIcon} title="خروج از حساب" subtitle="پایان نشست جاری" danger onClick={onLogout} />
        </Box>
        <Button fullWidth size="small" onClick={onClose} sx={{ mt: 1.1, fontSize: 11 }}>بستن</Button>
      </DialogContent>
    </Dialog>
  );
};

export default UserAccountDialog;
