import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Tabs, Tab, Avatar, Chip, Button, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import GeneralSettingsPanel from '../../core/components/settings/GeneralSettingsPanel';
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

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
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
  const [tabIndex, setTabIndex] = useState(0);

  const tabs = [
    { label: 'تنظیمات عمومی', icon: <TuneIcon />, key: 'general', color: '#6366f1', desc: 'پیکربندی ذخیرهسازی، هشدارها و تنظیمات پایه سیستم' },
    { label: 'پشتیبانگیری', icon: <BackupIcon />, key: 'backup', color: '#3b82f6', desc: 'تهیه، مشاهده و بازیابی نسخههای پشتیبان داده' },
  ];

  const active = tabs[tabIndex];

  return (
    <Box>
      {/* Glass header */}
      <Paper sx={{
        mb: 3, p: 2.5,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 3,
      }}>
        <Avatar sx={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
        }}>
          <TuneIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>{t('nav.settings')}</Typography>
          <Typography variant="body2" color="textSecondary">تنظیمات عمومی و ابزارهای نگهداری سیستم</Typography>
        </Box>
      </Paper>

      <Paper sx={{
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 3,
      }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(225,225,225,0.5)', px: 2 }}>
          {tabs.map((tab, i) => (
            <Tab key={tab.key} label={tab.label}
              sx={{ fontWeight: 600, py: 1.75, color: tabIndex === i ? tab.color : 'text.secondary' }} />
          ))}
        </Tabs>
        <Box sx={{ p: 3 }}>
          <Paper sx={{
            mb: 2, px: 1.5, py: 1,
            background: `linear-gradient(135deg, ${active.color}0d, ${active.color}04)`,
            border: `1px solid ${active.color}20`,
            borderRadius: 2,
          }}>
            <Typography variant="body2" sx={{ color: active.color, fontWeight: 600 }}>{active.desc}</Typography>
          </Paper>
          {tabIndex === 0 && <GeneralSettingsPanel />}
          {tabIndex === 1 && <BackupTab />}
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;