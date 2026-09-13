import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, TextField, Switch, Alert, Button, Chip, Divider,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MailIcon from '@mui/icons-material/Mail';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CircularProgress from '@mui/material/CircularProgress';

const NotificationSettingsPanel = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data),
  });

  const update = useMutation({
    mutationFn: (data) => axiosInstance.put('/settings/company-profile/update/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      qc.invalidateQueries({ queryKey: ['company-profile-layout'] });
      setResult({ ok: true, message: 'ط°ط®غŒط±ظ‡ ط´ط¯ âœ“' });
      setTimeout(() => setResult(null), 1500);
    },
    onError: () => setResult({ ok: false, message: 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡' }),
  });

  const testSend = async (ch) => {
    setSending(true);
    try {
      const res = await axiosInstance.post('/notifications/test-send/', { channel: ch });
      setResult({ ok: true, message: 'ط§ط±ط³ط§ظ„ ط¢ط²ظ…ط§غŒط´غŒ ط§ظ†ط¬ط§ظ… ط´ط¯ âœ“', detail: res.data.results });
    } catch (e) {
      setResult({ ok: false, message: e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط§ط±ط³ط§ظ„ ط¢ط²ظ…ط§غŒط´غŒ' });
    } finally {
      setSending(false);
    }
  };


  if (isLoading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}>ط¯ط± ط­ط§ظ„ ط¨ط§ط±ع¯ط°ط§ط±غŒâ€¦</Box>;
  }

  const p = profile || {};

  const setVal = (key, val) => update.mutate({ [key]: val });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {result && (
        <Alert severity={result.ok ? 'success' : 'error'} onClose={() => setResult(null)}>
          {result.message}
          {result.detail && (
            <Typography variant="caption" display="block">
              ط§غŒظ…غŒظ„: {String(result.detail.email)} آ· ط¨ظ„ظ‡: {String(result.detail.bale)}
            </Typography>
          )}
        </Alert>
      )}

      {/* Email */}
      <Paper sx={{ p: 2.5, borderRadius: '10px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(255,255,255,0.3))', border: '1px solid rgba(99,102,241,0.2)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#6366f1' }}><MailIcon fontSize="small" /></Avatar>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#6366f1' }}>ط§ط·ظ„ط§ط¹â€Œط±ط³ط§ظ†غŒ ط§غŒظ…غŒظ„</Typography>
          <Box sx={{ flex: 1 }} />
          <Switch checked={Boolean(p.notify_email_enabled !== false)} onChange={(e) => setVal('notify_email_enabled', e.target.checked)} />
        </Box>
        <Typography variant="caption" color="textSecondary">
          ط§ط¹ظ„ط§ظ†â€Œظ‡ط§غŒ ط¬ط¯غŒط¯ (ط¯ط±ط®ظˆط§ط³طھ ظ…ط±ط®طµغŒ/ط§ط¯ط§ط±غŒطŒ ط§ظ†ظ‚ط¶ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯/ظ…ط¯ط±ع©طŒ ط§طھظ…ط§ظ… ظ…ط§ظ†ط¯ظ‡ظ” ظ…ط±ط®طµغŒ) ط¨ظ‡ ط§غŒظ…غŒظ„ ظ…ط¯غŒط±ط§ظ† ظˆ ع©ط§ط±ط¨ط±ط§ظ† HR ط§ط±ط³ط§ظ„ ظ…غŒâ€Œط´ظˆط¯.
        </Typography>
      </Paper>

      {/* Bale */}
      <Paper sx={{ p: 2.5, borderRadius: '10px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(255,255,255,0.3))', border: '1px solid rgba(16,185,129,0.2)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#10b981' }}><ChatIcon fontSize="small" /></Avatar>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#10b981' }}>ط§ط·ظ„ط§ط¹â€Œط±ط³ط§ظ†غŒ ظ¾غŒط§ظ…â€Œط±ط³ط§ظ† ط¨ظ„ظ‡</Typography>
          <Box sx={{ flex: 1 }} />
          <Switch checked={Boolean(p.notify_bale_enabled)} onChange={(e) => setVal('notify_bale_enabled', e.target.checked)} />
        </Box>
        <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1.5 }}>
          ط¨ط±ط§غŒ ط§ط±ط³ط§ظ„ ط§ط² ط·ط±غŒظ‚ ط¨ظ„ظ‡طŒ طھظˆع©ظ† ط±ط¨ط§طھ ظˆ chat_id ط±ط§ ظˆط§ط±ط¯ ع©ظ†غŒط¯.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField size="small" label="طھظˆع©ظ† ط±ط¨ط§طھ ط¨ظ„ظ‡" value={p.bale_token || ''}
            onChange={(e) => setVal('bale_token', e.target.value)} />
          <TextField size="small" label="ط´ظ†ط§ط³ظ‡ ع¯ظپطھع¯ظˆغŒ ط¯ط±غŒط§ظپطھ ط§ط¹ظ„ط§ظ†â€Œظ‡ط§ (chat_id)" value={p.bale_chat_id || ''}
            helperText="ط§غŒظ† chat_id ظپظ‚ط· ط¨ط±ط§غŒ ط¯ط±غŒط§ظپطھ ط§ط¹ظ„ط§ظ†â€Œظ‡ط§غŒ ط³ط±ط§ط³ط±غŒ ط§ط³طھ ظˆ ط¨ط§ chat_id ظ¾ط±ط³ظ†ظ„ (ط¨ط±ط§غŒ ظ¾غŒط§ظ… ط®طµظˆطµغŒ) ظپط±ظ‚ ط¯ط§ط±ط¯."
            onChange={(e) => setVal('bale_chat_id', e.target.value)} />
        </Box>
      </Paper>

      {/* Test send */}
      <Paper sx={{ p: 2.5, borderRadius: '10px', background: 'rgba(100,116,139,0.04)' }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>ط§ط±ط³ط§ظ„ ط¢ط²ظ…ط§غŒط´غŒ</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="outlined" size="small" startIcon={<SendIcon />} onClick={() => testSend('email')} disabled={sending}>ط§غŒظ…غŒظ„</Button>
          <Button variant="outlined" size="small" startIcon={<SendIcon />} onClick={() => testSend('bale')} disabled={sending}>ط¨ظ„ظ‡</Button>
          <Button variant="contained" size="small" startIcon={<SendIcon />} onClick={() => testSend('both')} disabled={sending}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            ظ‡ط± ط¯ظˆ
          </Button>
          {sending && <CircularProgress size={18} />}
        </Box>
      </Paper>
    </Box>
  );
};

export default NotificationSettingsPanel;