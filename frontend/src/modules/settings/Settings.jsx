import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Chip, Button, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Stack,
  alpha,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import PersonIcon from '@mui/icons-material/Person';
import LayersIcon from '@mui/icons-material/Layers';
import VerifiedIcon from '@mui/icons-material/Verified';
import GeneralSettingsPanel from '../../core/components/settings/GeneralSettingsPanel';
import NotificationSettingsPanel from '../../core/components/settings/NotificationSettingsPanel';
import ManagementSettingsPanel from '../../core/components/settings/ManagementSettingsPanel';
import UpdatePanel from '../../core/components/settings/UpdatePanel';
import SettingsShell from '../../core/components/settings/SettingsShell';
import useAuth from '../../core/hooks/useAuth';
import useSystemStatus from '../../core/hooks/useSystemStatus';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

/* Backup tab */
const BackupTab = () => {
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [backups, setBackups] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const res = await axiosInstance.get('/backup/list/');
      setBackups(res.data || []);
    } catch { setBackups([]); } finally { setIsLoading(false); }
  };

  React.useEffect(() => { load(); }, []);

  const backupsArr = Array.isArray(backups) ? backups : [];

  const handleCreate = async () => {
    setCreating(true); setMessage('');
    try { await axiosInstance.post('/backup/create/'); setMessage('✅ بکاپ با موفقیت ساخته شد'); load(); }
    catch (e) { setMessage('❌ ' + (e.response?.data?.error || 'خطا در تهیه بکاپ')); }
    finally { setCreating(false); }
  };

  const handleRestore = async (filename) => {
    if (!window.confirm(`آیا از بازیابی بکاپ «${filename}» مطمئن هستید؟`)) return;
    setMessage('');
    try { await axiosInstance.post(`/backup/restore/${filename}/`); setMessage('✅ بکاپ با موفقیت بازیابی شد'); }
    catch (e) { setMessage('❌ ' + (e.response?.data?.error || 'خطا در بازیابی بکاپ')); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 520 }}>
          تهیه بکاپ برای همه کاربران مجاز است؛ اما بازیابی فقط برای مدیر ارشد سیستم امکانپذیر است.
        </Typography>
        <Button variant="contained" startIcon={<BackupIcon />} size="small" onClick={handleCreate} disabled={creating}>
          {creating ? <CircularProgress size={20} /> : 'تهیه بکاپ جدید'}
        </Button>
      </Box>

      {message && <Alert severity={message.startsWith('✅') ? 'success' : 'error'} sx={{ mb: 2 }}>{message}</Alert>}

      <TableContainer component={Paper} variant="outlined"
        sx={{ borderRadius: '16px', '& th': { fontWeight: 800, bgcolor: alpha('#3b82f6', 0.05) } }}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : backupsArr.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">هنوز بکاپی ساخته نشده است.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>تاریخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>حجم</TableCell>
                <TableCell width={120} sx={{ fontWeight: 700 }}>عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {backupsArr.map(b => (
                <TableRow key={b.filename || b} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {b.created_at ? toJalali(b.created_at.slice(0, 10)) : (b.filename || b)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">{b.filename || ''}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{formatPersianNumber(((b.size || 0) / 1024).toFixed(1))} KB</Typography>
                  </TableCell>
                  <TableCell>
                    <Button size="small" color="warning" variant="outlined" startIcon={<RestoreIcon />}
                      onClick={() => handleRestore(b.filename)}>
                      بازیابی
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

const Settings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { info: systemInfo, updateAvailable } = useSystemStatus();
  const [activeKey, setActiveKey] = useState('general');

  const canManageUpdates = Boolean(
    user?.permissions?.can_manage_updates || user?.is_superuser
  );

  const nav = [
    {
      key: 'general', label: 'تنظیمات عمومی', icon: <TuneIcon />, color: '#6366f1',
      group: 'پیکربندی سیستم', desc: 'ذخیره‌سازی، هشدارها و تنظیمات پایه',
    },
    {
      key: 'management', label: 'تنظیمات مدیریتی', icon: <AdminPanelSettingsIcon />, color: '#f97316',
      group: 'پیکربندی سیستم', desc: 'صاحبان امضا و مسیر ذخیرهٔ فایل‌ها',
    },
    {
      key: 'notifications', label: 'اطلاع‌رسانی', icon: <NotificationsActiveIcon />, color: '#10b981',
      group: 'پیکربندی سیستم', desc: 'ایمیل و پیام‌رسان بله',
    },
    {
      key: 'backup', label: 'پشتیبان‌گیری', icon: <BackupIcon />, color: '#3b82f6',
      group: 'نگهداری و امنیت', desc: 'تهیه، مشاهده و بازیابی نسخه‌های پشتیبان',
    },
    ...(canManageUpdates ? [{
      key: 'updates', label: 'به‌روزرسانی سیستم', icon: <SystemUpdateAltIcon />, color: '#8b5cf6',
      group: 'نگهداری و امنیت', desc: 'بسته‌های به‌روزرسانی Kian ERP',
    }] : []),
  ];

  const active = nav.find((item) => item.key === activeKey) || nav[0];

  const panels = {
    general: <GeneralSettingsPanel />,
    management: <ManagementSettingsPanel />,
    notifications: <NotificationSettingsPanel />,
    backup: <BackupTab />,
    updates: <UpdatePanel />,
  };

  const displayName = user?.full_name || user?.username || 'کاربر';

  const stats = [
    {
      label: 'نسخهٔ سامانه', value: systemInfo?.version || '—',
      sub: systemInfo?.product_name_fa || 'Kian ERP',
      icon: <SystemUpdateAltIcon />, color: '#6366f1',
    },
    {
      label: 'کاربر جاری', value: displayName,
      sub: user?.is_superuser ? 'مدیر ارشد سیستم' : 'کاربر سازمان',
      icon: <PersonIcon />, color: '#0ea5e9',
    },
    {
      label: 'بخش‌های تنظیمات', value: formatPersianNumber(nav.length),
      sub: 'در دسترس این حساب',
      icon: <LayersIcon />, color: '#8b5cf6',
    },
    {
      label: 'وضعیت سامانه', value: systemInfo ? 'آنلاین' : 'در حال بررسی',
      sub: updateAvailable ? 'نسخهٔ جدید آماده است' : 'ارتباط با سرور',
      icon: <VerifiedIcon />, color: systemInfo ? '#10b981' : '#f59e0b',
    },
  ];

  return (
    <SettingsShell
      brand="Kian ERP"
      brandSub="مرکز تنظیمات و پیکربندی"
      icon={<TuneIcon />}
      title={t('nav.settings')}
      subtitle="پیکربندی سیستم، اطلاع‌رسانی و ابزارهای نگهداری — تغییرات بلافاصله اعمال می‌شوند."
      badge={(
        <Chip
          size="small" variant="outlined"
          label={`نسخه ${systemInfo?.version || '—'}`}
          sx={{ fontWeight: 800 }}
        />
      )}
      nav={nav}
      activeKey={active.key}
      onSelect={setActiveKey}
      stats={stats}
      actions={updateAvailable ? (
        <Chip size="small" color="warning" label="نسخهٔ جدید آماده است" sx={{ fontWeight: 800 }} />
      ) : null}
      footer={(
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 800, bgcolor: alpha('#6366f1', 0.14), color: '#6366f1' }}>
            {String(displayName).trim().charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800 }} noWrap>{displayName}</Typography>
            <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }} noWrap>
              {user?.is_superuser ? 'مدیر ارشد سیستم' : 'کاربر سازمان'}
            </Typography>
          </Box>
        </Stack>
      )}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap',
        p: 1.5, mb: 1.75, borderRadius: '16px',
        background: `linear-gradient(135deg, ${alpha(active.color, 0.13)}, ${alpha(active.color, 0.02)})`,
        border: `1px solid ${alpha(active.color, 0.18)}`,
      }}>
        <Avatar variant="rounded" sx={{
          width: 38, height: 38, borderRadius: '11px',
          bgcolor: alpha(active.color, 0.15), color: active.color,
        }}>
          {React.cloneElement(active.icon, { sx: { fontSize: 19 } })}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 160 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 13.5 }}>{active.label}</Typography>
          <Typography variant="caption" color="text.secondary">{active.desc}</Typography>
        </Box>
        <Chip
          size="small" label="فعال"
          sx={{
            fontWeight: 800, bgcolor: alpha(active.color, 0.12), color: active.color,
            '& .MuiChip-label': { px: 1 },
          }}
        />
      </Box>

      {panels[active.key]}
    </SettingsShell>
  );
};

export default Settings;
