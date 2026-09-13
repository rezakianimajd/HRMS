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
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GeneralSettingsPanel from '../../core/components/settings/GeneralSettingsPanel';
import NotificationSettingsPanel from '../../core/components/settings/NotificationSettingsPanel';
import ManagementSettingsPanel from '../../core/components/settings/ManagementSettingsPanel';
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
    try { await axiosInstance.post('/backup/create/'); setMessage('âœ… ط¨ع©ط§ظ¾ ط¨ط§ ظ…ظˆظپظ‚غŒطھ ط³ط§ط®طھظ‡ ط´ط¯'); load(); }
    catch (e) { setMessage('â‌Œ ' + (e.response?.data?.error || 'ط®ط·ط§ ط¯ط± طھظ‡غŒظ‡ ط¨ع©ط§ظ¾')); }
    finally { setCreating(false); }
  };

  const handleRestore = async (filename) => {
    if (!window.confirm(`ط¢غŒط§ ط§ط² ط¨ط§ط²غŒط§ط¨غŒ ط¨ع©ط§ظ¾ آ«${filename}آ» ظ…ط·ظ…ط¦ظ† ظ‡ط³طھغŒط¯طں`)) return;
    setMessage('');
    try { await axiosInstance.post(`/backup/restore/${filename}/`); setMessage('âœ… ط¨ع©ط§ظ¾ ط¨ط§ ظ…ظˆظپظ‚غŒطھ ط¨ط§ط²غŒط§ط¨غŒ ط´ط¯'); }
    catch (e) { setMessage('â‌Œ ' + (e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط¨ط§ط²غŒط§ط¨غŒ ط¨ع©ط§ظ¾')); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 520 }}>
          طھظ‡غŒظ‡ ط¨ع©ط§ظ¾ ط¨ط±ط§غŒ ظ‡ظ…ظ‡ ع©ط§ط±ط¨ط±ط§ظ† ظ…ط¬ط§ط² ط§ط³طھط› ط§ظ…ط§ ط¨ط§ط²غŒط§ط¨غŒ ظپظ‚ط· ط¨ط±ط§غŒ ظ…ط¯غŒط± ط§ط±ط´ط¯ ط³غŒط³طھظ… ط§ظ…ع©ط§ظ†ظ¾ط°غŒط± ط§ط³طھ.
        </Typography>
        <Button variant="contained" startIcon={<BackupIcon />} size="small" onClick={handleCreate} disabled={creating}>
          {creating ? <CircularProgress size={20} /> : 'طھظ‡غŒظ‡ ط¨ع©ط§ظ¾ ط¬ط¯غŒط¯'}
        </Button>
      </Box>

      {message && <Alert severity={message.startsWith('âœ…') ? 'success' : 'error'} sx={{ mb: 2 }}>{message}</Alert>}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : backupsArr.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">ظ‡ظ†ظˆط² ط¨ع©ط§ظ¾غŒ ط³ط§ط®طھظ‡ ظ†ط´ط¯ظ‡ ط§ط³طھ.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>طھط§ط±غŒط®</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ط­ط¬ظ…</TableCell>
                <TableCell width={120} sx={{ fontWeight: 700 }}>ط¹ظ…ظ„غŒط§طھ</TableCell>
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
                      ط¨ط§ط²غŒط§ط¨غŒ
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
    { label: 'طھظ†ط¸غŒظ…ط§طھ ط¹ظ…ظˆظ…غŒ', icon: <TuneIcon />, key: 'general', color: '#6366f1', desc: 'ظ¾غŒع©ط±ط¨ظ†ط¯غŒ ط°ط®غŒط±ظ‡â€Œط³ط§ط²غŒطŒ ظ‡ط´ط¯ط§ط±ظ‡ط§ ظˆ طھظ†ط¸غŒظ…ط§طھ ظ¾ط§غŒظ‡ ط³غŒط³طھظ…' },
    { label: 'طھظ†ط¸غŒظ…ط§طھ ظ…ط¯غŒط±غŒطھغŒ', icon: <AdminPanelSettingsIcon />, key: 'management', color: '#f97316', desc: 'طµط§ط­ط¨ط§ظ† ط§ظ…ط¶ط§ + ظ…ط³غŒط±ظ‡ط§غŒ ط°ط®غŒط±ظ‡â€Œط³ط§ط²غŒ ظپط§غŒظ„â€Œظ‡ط§ â€” ظپظ‚ط· ظ…ط¯غŒط± ط³غŒط³طھظ…/HR' },
    { label: 'ط§ط·ظ„ط§ط¹â€Œط±ط³ط§ظ†غŒ', icon: <NotificationsActiveIcon />, key: 'notifications', color: '#10b981', desc: 'ط§ط±ط³ط§ظ„ ط§ط¹ظ„ط§ظ†â€Œظ‡ط§ ط§ط² ط·ط±غŒظ‚ ط§غŒظ…غŒظ„ ظˆ ظ¾غŒط§ظ…â€Œط±ط³ط§ظ† ط¨ظ„ظ‡' },
    { label: 'ظ¾ط´طھغŒط¨ط§ظ†â€Œع¯غŒط±غŒ', icon: <BackupIcon />, key: 'backup', color: '#3b82f6', desc: 'طھظ‡غŒظ‡طŒ ظ…ط´ط§ظ‡ط¯ظ‡ ظˆ ط¨ط§ط²غŒط§ط¨غŒ ظ†ط³ط®ظ‡â€Œظ‡ط§غŒ ظ¾ط´طھغŒط¨ط§ظ† ط¯ط§ط¯ظ‡' },
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
        borderRadius: '10px',
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
          <Typography variant="body2" color="textSecondary">طھظ†ط¸غŒظ…ط§طھ ط¹ظ…ظˆظ…غŒ ظˆ ط§ط¨ط²ط§ط±ظ‡ط§غŒ ظ†ع¯ظ‡ط¯ط§ط±غŒ ط³غŒط³طھظ…</Typography>
        </Box>
      </Paper>

      <Paper sx={{
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: '10px',
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
            borderRadius: '10px',
          }}>
            <Typography variant="body2" sx={{ color: active.color, fontWeight: 600 }}>{active.desc}</Typography>
          </Paper>
          {tabIndex === 0 && <GeneralSettingsPanel />}
          {tabIndex === 1 && <ManagementSettingsPanel />}
          {tabIndex === 2 && <NotificationSettingsPanel />}
          {tabIndex === 3 && <BackupTab />}
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;