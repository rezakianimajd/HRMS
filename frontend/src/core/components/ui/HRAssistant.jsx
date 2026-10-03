import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, InputAdornment, IconButton, Chip,
  Avatar, Stack, CircularProgress, Tooltip, Button,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import axiosInstance from '../../api/axiosConfig';

const STORAGE_KEY = 'hr_assistant_chat_v1';

const WELCOME = {
  from: 'bot',
  text: 'سلام! 👋 من دستیار هوشمند منابع انسانی هستم.\nمی‌توانید درباره پرسنل، حقوق، کارکرد، مرخصی، مدارک، تحلیل سازمان و هر سؤال دیگری بپرسید. حتی می‌توانید اطلاعات سازمانی خودتان را در «پایگاه دانش» ثبت کنید تا من از آن‌ها استفاده کنم.',
};

/**
 * دستیار HR — ترکیبی (Hybrid):
 *   - Intent + Entity + SQL برای پاسخ‌های دقیق
 *   - RAG سبک (بازیابی معنایی) برای اسناد و دانش سفارشی
 *   - امتیازدهی ریسک استعفا + نمودار SVG
 * همه‌چیز آفلاین؛ بدون مدل زبانی سنگین و بدون اینترنت.
 */
const HRAssistant = () => {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return [WELCOME];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

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
    if (!question || loading) return;
    setMessages(prev => [...prev, { from: 'user', text: question }]);
    setInput('');
    ask(question);
  };

  const clearChat = () => {
    setMessages([WELCOME]);
  };

  const copyMessage = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch { /* ignore */ }
  };

  const suggestionGroups = [
    {
      title: 'پرسنل',
      items: [
        'تاریخ استخدام علی محمدی کی بوده؟',
        'آدرس رضا احمدی رو بگو',
        'مدارک سارا کریمی چیا هستن؟',
        'مرخصی رضا محمدی چقدر مونده؟',
      ],
    },
    {
      title: 'حقوق و کارکرد',
      items: [
        'کارکرد ماه گذشته مریم حسینی چقدر بوده؟',
        'حقوق رضا محمدی چقدره؟',
        'جرائم مریم حسینی چی بوده؟',
      ],
    },
    {
      title: 'تحلیل سازمان',
      items: [
        'چه کسانی احتمال استعفا دارند؟',
        'نمودار دپارتمان‌ها رو نشون بده',
        'چند پرسنل فعال داریم؟',
        'نرخ ترک خدمت امسال چقدره؟',
      ],
    },
  ];

  return (
    <Paper sx={{
      overflow: 'hidden',
      width: '100%',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.04))',
      border: '1px solid rgba(99,102,241,0.2)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      borderRadius: '14px',
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
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>دستیار منابع انسانی</Typography>
          <Typography variant="caption" color="textSecondary">هوشمند، آفلاین و سریع — پاسخ از داده‌های واقعی سازمان</Typography>
        </Box>
        <Tooltip title="پاک کردن گفتگو">
          <IconButton size="small" onClick={clearChat} sx={{ color: 'text.secondary' }}>
            <DeleteSweepIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Box sx={{ p: 2, minHeight: 320, maxHeight: '55vh', overflowY: 'auto' }}>
        <Stack spacing={1.5}>
          {messages.map((m, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-start' : 'flex-end', gap: 1 }}>
              {m.from === 'bot' ? (
                <>
                  <Paper sx={{
                    px: 1.5, py: 1, maxWidth: '86%',
                    background: 'rgba(255,255,255,0.75)',
                    color: 'text.primary',
                    borderRadius: '14px 14px 4px 14px',
                    border: '1px solid rgba(99,102,241,0.16)',
                  }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{m.text}</Typography>
                    {m.chartUrl && (
                      <Box sx={{ mt: 1 }}>
                        <Box component="img" src={axiosInstance.defaults.baseURL + m.chartUrl} alt="نمودار"
                          sx={{ maxWidth: '100%', borderRadius: '10px', display: 'block' }} />
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                      <Tooltip title={copiedIdx === i ? 'کپی شد!' : 'کپی پاسخ'}>
                        <IconButton size="small" onClick={() => copyMessage(m.text, i)} sx={{ color: 'text.disabled' }}>
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                  <Avatar sx={{ width: 28, height: 28, background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                    <SmartToyIcon sx={{ fontSize: 16, color: '#fff' }} />
                  </Avatar>
                </>
              ) : (
                <>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#6366f1' }}>
                    <PersonIcon sx={{ fontSize: 16, color: '#fff' }} />
                  </Avatar>
                  <Paper sx={{
                    px: 1.5, py: 1, maxWidth: '86%',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.92), rgba(139,92,246,0.92))',
                    color: '#fff',
                    borderRadius: '14px 14px 14px 4px',
                  }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{m.text}</Typography>
                  </Paper>
                </>
              )}
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Paper sx={{ px: 1.5, py: 1, background: 'rgba(255,255,255,0.75)', borderRadius: '14px 14px 4px 14px' }}>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <CircularProgress size={12} /><CircularProgress size={12} /><CircularProgress size={12} />
                  <Typography variant="caption" color="textSecondary" sx={{ mr: 0.5 }}>در حال بررسی…</Typography>
                </Box>
              </Paper>
              <Avatar sx={{ width: 28, height: 28, background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                <SmartToyIcon sx={{ fontSize: 16, color: '#fff' }} />
              </Avatar>
            </Box>
          )}
          <div ref={endRef} />
        </Stack>
      </Box>

      {/* Suggestions */}
      <Box sx={{ px: 2, pb: 1 }}>
        {suggestionGroups.map(g => (
          <Box key={g.title} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.25 }}>{g.title}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {g.items.map(s => (
                <Chip key={s} label={s} size="small" variant="outlined" clickable onClick={() => send(s)}
                  sx={{ borderColor: 'rgba(99,102,241,0.35)', color: '#6366f1' }} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, pt: 1, borderTop: '1px solid rgba(99,102,241,0.12)' }}>
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder="سؤال خود را بنویسید… (Enter برای ارسال، Shift+Enter برای خط جدید)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" color="primary" onClick={() => send()} disabled={loading}>
                  <SendIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
          <Button size="small" onClick={clearChat} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            شروع گفتگوی جدید
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default HRAssistant;

