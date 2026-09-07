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
import BaleAudiencePanel from './BaleAudiencePanel';

const NotificationSettingsPanel = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [customText, setCustomText] = useState('');

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

  const sendCustom = async (ch) => {
    setSending(true);
    try {
      const res = await axiosInstance.post('/notifications/send/', {
        channel: ch,
        subject: customSubject,
        text: customText,
      });
      setResult({ ok: true, message: 'پیام ارسال شد ✓', detail: res.data.results });
      setCustomText('');
      setCustomSubject('');
    } catch (e) {
      setResult({ ok: false, message: e.response?.data?.error || 'خطا در ارسال پیام' });
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
      <Paper sx={{ p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(255,255,255,0.3))', border: '1px solid rgba(99,102,241,0.2)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#6366f1' }}><MailIcon fontSize="small" /></Avatar>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#6366f1' }}>اطلاع‌رسانی ایمیل</Typography>
          <Box sx={{ flex: 1 }} />
          <Switch checked={Boolean(p.notify_email_enabled !== false)} onChange={(e) => setVal('notify_email_enabled', e.target.checked)} />
        </Box>
        <Typography variant="caption" color="textSecondary">
          اعلان‌های جدید (درخواست مرخصی/اداری، انقضای قرارداد/مدرک، اتمام ماندهٔ مرخصی) به ایمیل مدیران و کاربران HR ارسال می‌شود.
        </Typography>
      </Paper>

      {/* Bale */}
      <Paper sx={{ p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(255,255,255,0.3))', border: '1px solid rgba(16,185,129,0.2)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#10b981' }}><ChatIcon fontSize="small" /></Avatar>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#10b981' }}>اطلاع‌رسانی پیام‌رسان بله</Typography>
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

      {/* Custom message */}
      <Paper sx={{ p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(255,255,255,0.3))', border: '1px solid rgba(236,72,153,0.18)' }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ color: '#ec4899' }}>ارسال پیام دلخواه</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField size="small" label="عنوان / موضوع" value={customSubject}
            placeholder="مثلاً اطلاعیه مهم"
            onChange={(e) => setCustomSubject(e.target.value)} />
          <TextField size="small" label="متن پیام" value={customText} multiline rows={3}
            placeholder="هر متنی که می‌خواهید برای مدیران ارسال شود…"
            onChange={(e) => setCustomText(e.target.value)} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="outlined" size="small" startIcon={<SendIcon />} disabled={sending || !customText}
              onClick={() => sendCustom('email')}>ایمیل</Button>
            <Button variant="outlined" size="small" startIcon={<SendIcon />} disabled={sending || !customText}
              onClick={() => sendCustom('bale')}>بله</Button>
            <Button variant="contained" size="small" startIcon={<SendIcon />} disabled={sending || !customText}
              onClick={() => sendCustom('both')}
              sx={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
              ارسال به هر دو
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Bale audience (bulk + recipients + contacts) */}
      <Divider />
      <Typography variant="h6" fontWeight={800} sx={{ color: '#10b981' }}>مخاطبان و ارسال گروهی بله</Typography>
      <BaleAudiencePanel />

      {/* Test send */}
      <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(100,116,139,0.04)' }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>ارسال آزمایشی</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="outlined" size="small" startIcon={<SendIcon />} onClick={() => testSend('email')} disabled={sending}>ایمیل</Button>
          <Button variant="outlined" size="small" startIcon={<SendIcon />} onClick={() => testSend('bale')} disabled={sending}>بله</Button>
          <Button variant="contained" size="small" startIcon={<SendIcon />} onClick={() => testSend('both')} disabled={sending}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            هر دو
          </Button>
          {sending && <CircularProgress size={18} />}
        </Box>
      </Paper>
    </Box>
  );
};

export default NotificationSettingsPanel;