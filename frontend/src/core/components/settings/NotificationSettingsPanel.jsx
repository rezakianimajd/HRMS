import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, TextField, Switch, Alert, Button, Chip, alpha,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MailIcon from '@mui/icons-material/Mail';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CircularProgress from '@mui/material/CircularProgress';
import { SOFT } from './settingsUi';

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
      setResult({ ok: true, message: 'ذخیره شد ✓' });
      setTimeout(() => setResult(null), 1500);
    },
    onError: () => setResult({ ok: false, message: 'خطا در ذخیره' }),
  });

  const testSend = async (ch) => {
    setSending(true);
    try {
      const res = await axiosInstance.post('/notifications/test-send/', { channel: ch });
      setResult({ ok: true, message: 'ارسال آزمایشی انجام شد ✓', detail: res.data.results });
    } catch (e) {
      setResult({ ok: false, message: e.response?.data?.error || 'خطا در ارسال آزمایشی' });
    } finally {
      setSending(false);
    }
  };


  if (isLoading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}>در حال بارگذاری…</Box>;
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
              ایمیل: {String(result.detail.email)} · بله: {String(result.detail.bale)}
            </Typography>
          )}
        </Alert>
      )}

      {/* Email */}
      <Paper sx={{ p: 1.9, borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 18px rgba(15,23,42,0.04)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: alpha(SOFT.indigo, 0.14), color: SOFT.indigo }}><MailIcon fontSize="small" /></Avatar>
          <Typography sx={{ fontSize: 16, fontWeight: 400 }}>اطلاع‌رسانی ایمیل</Typography>
          <Box sx={{ flex: 1 }} />
          <Switch checked={Boolean(p.notify_email_enabled !== false)} onChange={(e) => setVal('notify_email_enabled', e.target.checked)} />
        </Box>
        <Typography variant="caption" color="textSecondary">
          اعلان‌های جدید (درخواست مرخصی/اداری، انقضای قرارداد/مدرک، اتمام ماندهٔ مرخصی) به ایمیل مدیران و کاربران HR ارسال می‌شود.
        </Typography>
      </Paper>

      {/* Bale */}
      <Paper sx={{ p: 1.9, borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 18px rgba(15,23,42,0.04)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: alpha(SOFT.green, 0.14), color: SOFT.green }}><ChatIcon fontSize="small" /></Avatar>
          <Typography sx={{ fontSize: 16, fontWeight: 400 }}>اطلاع‌رسانی پیام‌رسان بله</Typography>
          <Box sx={{ flex: 1 }} />
          <Switch checked={Boolean(p.notify_bale_enabled)} onChange={(e) => setVal('notify_bale_enabled', e.target.checked)} />
        </Box>
        <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1.5 }}>
          برای ارسال از طریق بله، توکن ربات و chat_id را وارد کنید.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField size="small" label="توکن ربات بله" value={p.bale_token || ''}
            onChange={(e) => setVal('bale_token', e.target.value)} />
          <TextField size="small" label="شناسه گفتگوی دریافت اعلان‌ها (chat_id)" value={p.bale_chat_id || ''}
            helperText="این chat_id فقط برای دریافت اعلان‌های سراسری است و با chat_id پرسنل (برای پیام خصوصی) فرق دارد."
            onChange={(e) => setVal('bale_chat_id', e.target.value)} />
        </Box>
      </Paper>

      {/* Test send */}
      <Paper sx={{ p: 1.9, borderRadius: '16px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 18px rgba(15,23,42,0.04)' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 400, mb: 1 }}>ارسال آزمایشی</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="outlined" size="small" startIcon={<SendIcon />} onClick={() => testSend('email')} disabled={sending}>ایمیل</Button>
          <Button variant="outlined" size="small" startIcon={<SendIcon />} onClick={() => testSend('bale')} disabled={sending}>بله</Button>
          <Button variant="contained" size="small" startIcon={<SendIcon />} onClick={() => testSend('both')} disabled={sending}
            sx={{ bgcolor: SOFT.indigo, boxShadow: 'none', '&:hover': { bgcolor: '#6f7ecb' } }}>
            هر دو
          </Button>
          {sending && <CircularProgress size={18} />}
        </Box>
      </Paper>
    </Box>
  );
};

export default NotificationSettingsPanel;