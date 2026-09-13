import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, InputAdornment, IconButton, Chip,
  Avatar, Stack, CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import axiosInstance from '../../api/axiosConfig';

/**
 * ط¯ط³طھغŒط§ط± HR â€” طھط±ع©غŒط¨غŒ (Hybrid):
 *   - Intent + Entity + SQL ط¨ط±ط§غŒ ظ¾ط§ط³ط®â€Œظ‡ط§غŒ ط¯ظ‚غŒظ‚
 *   - RAG ط³ط¨ع© (ط¨ط§ط²غŒط§ط¨غŒ ظ…ط¹ظ†ط§غŒغŒ) ط¨ط±ط§غŒ ط§ط³ظ†ط§ط¯
 *   - ط§ظ…طھغŒط§ط²ط¯ظ‡غŒ ط±غŒط³ع© ط§ط³طھط¹ظپط§ + ظ†ظ…ظˆط¯ط§ط± SVG
 * ظ‡ظ…ظ‡â€Œع†غŒط² ط¢ظپظ„ط§غŒظ†ط› ط¨ط¯ظˆظ† ظ…ط¯ظ„ ط²ط¨ط§ظ†غŒ ط³ظ†ع¯غŒظ† ظˆ ط¨ط¯ظˆظ† ط§غŒظ†طھط±ظ†طھ.
 */
const HRAssistant = () => {
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: 'ط³ظ„ط§ظ…! ًں‘‹ ظ…ظ† ط¯ط³طھغŒط§ط± ظ…ظ†ط§ط¨ط¹ ط§ظ†ط³ط§ظ†غŒ ظ‡ط³طھظ….\nظ…غŒâ€Œطھظˆط§ظ†غŒط¯ ط¯ط±ط¨ط§ط±ظ‡ ظ‡ط± ظ¾ط±ط³ظ†ظ„طŒ طھط§ط±غŒط® ط§ط³طھط®ط¯ط§ظ…طŒ ط¢ط¯ط±ط³طŒ ظ…ط¯ط§ط±ع©طŒ ع©ط§ط±ع©ط±ط¯طŒ ط­ظ‚ظˆظ‚طŒ ظ…ط±ط®طµغŒطŒ ط¬ط±ط§ط¦ظ… ظˆ ط­طھغŒ آ«ط§ط­طھظ…ط§ظ„ ط§ط³طھط¹ظپط§آ» ظˆ آ«ظ†ظ…ظˆط¯ط§ط±آ» ط¨ظ¾ط±ط³غŒط¯.',
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
      const answer = res.data?.answer || 'ظ…طھط£ط³ظپط§ظ†ظ‡ ظ¾ط§ط³ط®غŒ ظ¾غŒط¯ط§ ظ†ع©ط±ط¯ظ….';
      const chartUrl = res.data?.chart_url || null;
      setMessages(prev => [...prev, { from: 'bot', text: answer, chartUrl }]);
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: 'ط®ط·ط§ ط¯ط± ط¯ط±غŒط§ظپطھ ظ¾ط§ط³ط®. ظ„ط·ظپط§ظ‹ ط¯ظˆط¨ط§ط±ظ‡ طھظ„ط§ط´ ع©ظ†غŒط¯.', chartUrl: null }]);
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
    'طھط§ط±غŒط® ط§ط³طھط®ط¯ط§ظ… ط¹ظ„غŒ ظ…ط­ظ…ط¯غŒ ع©غŒ ط¨ظˆط¯ظ‡طں',
    'ط¢ط¯ط±ط³ ط±ط¶ط§ ط§ط­ظ…ط¯غŒ ط±ظˆ ط¨ع¯ظˆ',
    'ع©ط§ط±ع©ط±ط¯ ظ…ط§ظ‡ ع¯ط°ط´طھظ‡ ظ…ط±غŒظ… ط­ط³غŒظ†غŒ ع†ظ‚ط¯ط± ط¨ظˆط¯ظ‡طں',
    'ظ…ط¯ط§ط±ع© ط³ط§ط±ط§ ع©ط±غŒظ…غŒ ع†غŒط§ ظ‡ط³طھظ†طں',
    'ظ…ط±ط®طµغŒ ط±ط¶ط§ ظ…ط­ظ…ط¯غŒ ع†ظ‚ط¯ط± ظ…ظˆظ†ط¯ظ‡طں',
    'ط¬ط±ط§ط¦ظ… ظ…ط±غŒظ… ط­ط³غŒظ†غŒ ع†غŒ ط¨ظˆط¯ظ‡طں',
    'ع†ظ‡ ع©ط³ط§ظ†غŒ ط§ط­طھظ…ط§ظ„ ط§ط³طھط¹ظپط§ ط¯ط§ط±ظ†ط¯طں',
    'ظ†ظ…ظˆط¯ط§ط± ط¯ظ¾ط§ط±طھظ…ط§ظ†â€Œظ‡ط§ ط±ظˆ ظ†ط´ظˆظ† ط¨ط¯ظ‡',
  ];

  return (
    <Paper sx={{
      overflow: 'hidden',
      maxWidth: 720,
      width: '100%',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.04))',
      border: '1px solid rgba(99,102,241,0.2)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      borderRadius: '10px',
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
          <Typography variant="subtitle1" fontWeight={700}>ط¯ط³طھغŒط§ط± ظ…ظ†ط§ط¨ط¹ ط§ظ†ط³ط§ظ†غŒ</Typography>
          <Typography variant="caption" color="textSecondary">ظ‡ظˆط´ظ…ظ†ط¯طŒ ط¢ظپظ„ط§غŒظ† ظˆ ط³ط±غŒط¹ â€” ظ¾ط§ط³ط® ط§ط² ط¯ط§ط¯ظ‡â€Œظ‡ط§غŒ ظˆط§ظ‚ط¹غŒ ط³ط§ط²ظ…ط§ظ†</Typography>
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
                      alt="ظ†ظ…ظˆط¯ط§ط±"
                      sx={{ maxWidth: '100%', borderRadius: '10px', display: 'block' }}
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
          placeholder="ظ…ط«ظ„ط§ظ‹: ع©ط§ط±ع©ط±ط¯ ظ…ط§ظ‡ ع¯ط°ط´طھظ‡ ط±ط¶ط§ ظ…ط­ظ…ط¯غŒ ع†ظ‚ط¯ط± ط¨ظˆط¯ظ‡طں"
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