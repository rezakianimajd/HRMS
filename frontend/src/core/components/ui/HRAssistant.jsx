import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, InputAdornment, IconButton, Chip,
  Avatar, Stack, CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import axiosInstance from '../../api/axiosConfig';

/**
 * دستیار HR — ترکیبی (Hybrid):
 *   - Intent + Entity + SQL برای پاسخ‌های دقیق
 *   - RAG سبک (بازیابی معنایی) برای اسناد
 *   - امتیازدهی ریسک استعفا + نمودار SVG
 * همه‌چیز آفلاین؛ بدون مدل زبانی سنگین و بدون اینترنت.
 */
const HRAssistant = () => {
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: 'سلام! 👋 من دستیار منابع انسانی هستم.\nمی‌توانید درباره هر پرسنل، تاریخ استخدام، آدرس، مدارک، کارکرد، حقوق، مرخصی، جرائم و حتی «احتمال استعفا» و «نمودار» بپرسید.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (text) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/assistant/query/', { question: text });
      const answer = res.data?.answer || 'متأسفانه پاسخی پیدا نکردم.';
      const chartUrl = res.data?.chart_url || null;
      setMessages(prev => [...prev, { from: 'bot', text: answer, chartUrl }]);
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: 'خطا در دریافت پاسخ. لطفاً دوباره تلاش کنید.', chartUrl: null }]);
    } finally {
      setLoading(false);
    }
  };

  const send = (text) => {
    const question = (text || input).trim();
    if (!question) return;
    setMessages(prev => [...prev, { from: 'user', text: question }]);
    setInput('');
    ask(question);
  };

  const suggestions = [
    'تاریخ استخدام علی محمدی کی بوده؟',
    'آدرس رضا احمدی رو بگو',
    'کارکرد ماه گذشته مریم حسینی چقدر بوده؟',
    'مدارک سارا کریمی چیا هستن؟',
    'مرخصی رضا محمدی چقدر مونده؟',
    'جرائم مریم حسینی چی بوده؟',
    'چه کسانی احتمال استعفا دارند؟',
    'نمودار دپارتمان‌ها رو نشون بده',
  ];

  return (
    <Paper sx={{
      overflow: 'hidden',
      maxWidth: 720,
      width: '100%',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.04))',
      border: '1px solid rgba(99,102,241,0.2)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      borderRadius: 3,
    }}>
      {/* Header */}
      <Box sx={{
        px: 2.5, py: 1.5,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(236,72,153,0.08))',
        borderBottom: '1px solid rgba(99,102,241,0.16)',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 3px 12px rgba(99,102,241,0.4)' }}>
          <SmartToyIcon sx={{ color: '#fff', fontSize: 22 }} />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>دستیار منابع انسانی</Typography>
          <Typography variant="caption" color="textSecondary">هوشمند، آفلاین و سریع — پاسخ از داده‌های واقعی سازمان</Typography>
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ p: 2, minHeight: 320, maxHeight: 55 + 'vh', overflowY: 'auto' }}>
        <Stack spacing={1.5}>
          {messages.map((m, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-start' : 'flex-end' }}>
              <Paper sx={{
                px: 1.5, py: 1, maxWidth: '86%',
                background: m.from === 'user'
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.9))'
                  : 'rgba(255,255,255,0.65)',
                color: m.from === 'user' ? '#fff' : 'text.primary',
                borderRadius: '14px 14px 4px 14px',
                border: m.from === 'user' ? 'none' : '1px solid rgba(99,102,241,0.16)',
              }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{m.text}</Typography>
                {m.chartUrl && (
                  <Box sx={{ mt: 1 }}>
                    <Box
                      component="img"
                      src={axiosInstance.defaults.baseURL + m.chartUrl}
                      alt="نمودار"
                      sx={{ maxWidth: '100%', borderRadius: 1.5, display: 'block' }}
                    />
                  </Box>
                )}
              </Paper>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Paper sx={{ px: 1.5, py: 1, background: 'rgba(255,255,255,0.65)', borderRadius: '14px 14px 4px 14px' }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <CircularProgress size={12} /><CircularProgress size={12} /><CircularProgress size={12} />
                </Box>
              </Paper>
            </Box>
          )}
          <div ref={endRef} />
        </Stack>
      </Box>

      {/* Suggestions */}
      <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {suggestions.map(s => (
          <Chip key={s} label={s} size="small" variant="outlined" clickable onClick={() => send(s)}
            sx={{ borderColor: 'rgba(99,102,241,0.35)', color: '#6366f1' }} />
        ))}
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, pt: 1, borderTop: '1px solid rgba(99,102,241,0.12)' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="مثلاً: کارکرد ماه گذشته رضا محمدی چقدر بوده؟"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" color="primary" onClick={() => send()}>
                  <SendIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Paper>
  );
};

export default HRAssistant;