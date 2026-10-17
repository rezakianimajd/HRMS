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
import {
  PageHeader, StatGrid, TabsCard, SectionNote, SOFT,
} from '../../core/components/settings/settingsUi';
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
  const [tabIndex, setTabIndex] = useState(0);

  const canManageUpdates = Boolean(
    user?.permissions?.can_manage_updates || user?.is_superuser
  );

  const tabs = [
    {
      label: 'تنظیمات عمومی', icon: <TuneIcon />, key: 'general', color: SOFT.indigo,
      desc: 'پیکربندی ذخیره‌سازی، هشدارها و تنظیمات پایه سیستم',
    },
    {
      label: 'تنظیمات مدیریتی', icon: <AdminPanelSettingsIcon />, key: 'management', color: SOFT.orange,
      desc: 'صاحبان امضا و مسیرهای ذخیره‌سازی فایل‌ها — فقط مدیر سیستم/HR',
    },
    {
      label: 'اطلاع‌رسانی', icon: <NotificationsActiveIcon />, key: 'notifications', color: SOFT.green,
      desc: 'ارسال اعلان‌ها از طریق ایمیل و پیام‌رسان بله',
    },
    {
      label: 'پشتیبان‌گیری', icon: <BackupIcon />, key: 'backup', color: SOFT.blue,
      desc: 'تهیه، مشاهده و بازیابی نسخه‌های پشتیبان داده',
    },
    ...(canManageUpdates ? [{
      label: 'به‌روزرسانی سیستم', icon: <SystemUpdateAltIcon />, key: 'updates', color: SOFT.violet,
      desc: 'بارگذاری، تأیید و پیگیری بسته‌های به‌روزرسانی Kian ERP',
    }] : []),
  ];

  const safeIndex = Math.min(tabIndex, tabs.length - 1);
  const active = tabs[safeIndex];

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
      icon: <SystemUpdateAltIcon />, color: SOFT.indigo,
    },
    {
      label: 'کاربر جاری', value: displayName,
      sub: user?.is_superuser ? 'مدیر ارشد سیستم' : 'کاربر سازمان',
      icon: <PersonIcon />, color: SOFT.blue,
    },
    {
      label: 'بخش‌های تنظیمات', value: formatPersianNumber(tabs.length),
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
        icon={<TuneIcon />}
        title={t('nav.settings')}
        subtitle="پیکربندی سیستم، اطلاع‌رسانی و ابزارهای نگهداری — تغییرات بلافاصله اعمال می‌شوند."
        color={SOFT.indigo}
        badge={(
          <Chip size="small" variant="outlined" label={`نسخه ${systemInfo?.version || '—'}`}
            sx={{ fontWeight: 800 }} />
        )}
        actions={updateAvailable ? (
          <Chip size="small" label="نسخهٔ جدید آماده است"
            sx={{ bgcolor: alpha(SOFT.amber, 0.14), color: SOFT.amber, fontWeight: 800 }} />
        ) : null}
      />

      <TabsCard tabs={tabs} value={safeIndex} onChange={setTabIndex} activeColor={active.color} />

      <StatGrid stats={stats} />

      <SectionNote icon={active.icon} desc={active.desc} color={active.color} />

      {panels[active.key]}
    </Box>
  );
};

export default Settings;
