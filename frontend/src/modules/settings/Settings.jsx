import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import {
  PageHeader, StatGrid, SOFT,
} from '../../core/components/settings/settingsUi';
import useAuth from '../../core/hooks/useAuth';
import useSystemStatus from '../../core/hooks/useSystemStatus';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
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

const SECTIONS = {
  general: { title: 'تنظیمات عمومی', icon: <TuneIcon />, color: SOFT.indigo },
  management: { title: 'تنظیمات مدیریتی', icon: <AdminPanelSettingsIcon />, color: SOFT.orange },
  notifications: { title: 'اطلاع‌رسانی', icon: <NotificationsActiveIcon />, color: SOFT.green },
  backup: { title: 'پشتیبان‌گیری و بازیابی', icon: <BackupIcon />, color: SOFT.blue },
  updates: { title: 'به‌روزرسانی سیستم', icon: <SystemUpdateAltIcon />, color: SOFT.violet },
};

const Settings = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { info: systemInfo, updateAvailable } = useSystemStatus();

  const canManageUpdates = Boolean(
    user?.permissions?.can_manage_updates || user?.is_superuser
  );

  const requested = (searchParams.get('tab') || 'general').toLowerCase();
  const sectionKey = SECTIONS[requested] ? requested : 'general';
  const section = SECTIONS[sectionKey];
  const isGeneral = sectionKey === 'general';

  if (sectionKey === 'updates' && !canManageUpdates) {
    return (
      <Box>
        <PageHeader
          icon={<SystemUpdateAltIcon />}
          title="به‌روزرسانی سیستم"
          color={SOFT.violet}
        />
        <Alert severity="warning">دسترسی به بخش به‌روزرسانی فقط برای مدیر ارشد سیستم مجاز است.</Alert>
      </Box>
    );
  }

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
      label: 'نسخهٔ سامانه', value: toPersianDigits(systemInfo?.version) || '—',
      sub: systemInfo?.product_name_fa || 'Kian ERP',
      icon: <SystemUpdateAltIcon />, color: SOFT.indigo,
    },
    {
      label: 'کاربر جاری', value: displayName,
      sub: user?.is_superuser ? 'مدیر ارشد سیستم' : 'کاربر سازمان',
      icon: <PersonIcon />, color: SOFT.blue,
    },
    {
      label: 'بخش‌های تنظیمات', value: formatPersianNumber(Object.keys(SECTIONS).length),
      sub: 'در دسترس این حساب',
      icon: <LayersIcon />, color: SOFT.violet,
    },
    {
      label: 'وضعیت سامانه', value: systemInfo ? 'آنلاین' : 'در حال بررسی',
      sub: updateAvailable ? 'نسخهٔ جدید آماده است' : 'ارتباط با سرور',
      icon: <VerifiedIcon />, color: systemInfo ? SOFT.green : SOFT.amber,
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={section.icon}
        title={section.title}
        color={section.color}
        actions={isGeneral && updateAvailable ? (
          <Chip size="small" label="نسخهٔ جدید آماده است"
            sx={{ bgcolor: alpha(SOFT.amber, 0.14), color: SOFT.amber, fontWeight: 800 }} />
        ) : null}
      />

      {isGeneral ? <StatGrid stats={stats} /> : null}

      {panels[sectionKey]}
    </Box>
  );
};

export default Settings;
