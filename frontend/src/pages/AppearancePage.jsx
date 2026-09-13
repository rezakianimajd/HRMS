import React from 'react';
import {
  Box, Typography, Paper, Avatar, Grid, Chip, Stack, Divider, Alert,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useThemeMode, THEME_MODES, NEON_COLOR_OPTIONS } from '../core/context/ThemeContext';

/* =========================================================================
 * ط¸ط§ظ‡ط± ظˆ ظ¾ظˆط³طھظ‡ (2026)
 *  - ط§ظ†طھط®ط§ط¨ state visual (طھظ…) ط¨ط§ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ط²ظ†ط¯ظ‡ + طھظˆط¶غŒط­
 *  - ط§ظ†طھط®ط§ط¨ ط±ظ†ع¯ ظ†ط¦ظˆظ† ط¨ط±ط§غŒ F ظ…ظˆط¯
 *  - ط°ط®غŒط±ظ‡ظ” ط®ظˆط¯ع©ط§ط± (localStorage ط§ط² ThemeContext)
 * ========================================================================= */

const MODE_DESC = {
  light: {
    title: 'ط±ظˆط´ظ†',
    desc: 'طھظ… ط±ظˆط´ظ† ظˆ ط´ظپط§ظپ ط¨ط±ط§غŒ ظ…ط­غŒط· ع©ط§ط± ط±ظˆط²ط§ظ†ظ‡ط› ع©ظ…طھط±غŒظ† ط®ط³طھع¯غŒ ع†ط´ظ… ظˆ ط­ط¯ط§ع©ط«ط± ط®ظˆط§ظ†ط§غŒغŒ.',
    tagline: 'ط¨ظ‡طھط±غŒظ† ط§ظ†طھط®ط§ط¨ ط¨ط±ط§غŒ ط§ط³طھظپط§ط¯ظ‡ ط¯ط± ط±ظˆط²',
    swatch: ['#f8fafc', '#ffffff', '#6366f1', '#ec4899'],
  },
  dark: {
    title: 'طھط§ط±غŒع©',
    desc: 'طھظ… طھغŒط±ظ‡ ظˆ ط¢ط±ط§ظ… ط¨ط±ط§غŒ ع©ط§ط± ط¯ط± ط´ط¨ ظˆ ع©ط§ظ‡ط´ ظ†ظˆط± ط¢ط¨غŒط› ظ…ظ†ط§ط³ط¨ طھظ…ط±ع©ط² ط¯ط± ظ…ط­غŒط· ع©ظ…â€Œظ†ظˆط±.',
    tagline: 'ظ…ظ†ط§ط³ط¨ ع©ط§ط± ط¯ط± ط´ط¨',
    swatch: ['#0f172a', '#1e293b', '#818cf8', '#f472b6'],
  },
  fmode: {
    title: 'F ظ…ظˆط¯',
    desc: 'ط¸ط§ظ‡ط± ط³غŒط§ظ‡â€Œظˆط³ظپغŒط¯ ط¨ط§ طھط§غŒظ¾ظˆع¯ط±ط§ظپغŒ ظ†ط¦ظˆظ†غŒ â€” طھط±ع©غŒط¨ ط³ط¨ع© طھط±ظ…غŒظ†ط§ظ„ ظˆ ظ…ط¯ط±ظ† ط¨ط±ط§غŒ ط¹ظ„ط§ظ‚ظ‡â€Œظ…ظ†ط¯ط§ظ† ط¨ظ‡ ط±ط§ط¨ط·â€Œظ‡ط§غŒ ط³ط§غŒط¨ط±غŒ.',
    tagline: 'ط³ط¨ع© ظ†ط¦ظˆظ†غŒ ط³ط§غŒط¨ط±غŒ',
    swatch: ['#050505', '#0d0d0d', '#39ff14', '#00ffff'],
  },
  fmode_light: {
    title: 'F ظ…ظˆط¯ ط±ظˆط´ظ†',
    desc: 'ظ†ط³ط®ظ‡ظ” ط±ظˆط´ظ† F ظ…ظˆط¯ط› ظ¾ط³â€Œط²ظ…غŒظ†ظ‡ظ” ط±ظˆط´ظ† ط¨ط§ ظ‡ظ…ط§ظ† ط±ظ†ع¯â€Œظ‡ط§غŒ ظ†ط¦ظˆظ†غŒ â€” ط­ط³ طھط§ط²ع¯غŒ ط¨ط§ ظˆط¶ظˆط­ ط¨ط§ظ„ط§.',
    tagline: 'ظ†ط¦ظˆظ†غŒ ط±ظˆغŒ ط²ظ…غŒظ†ظ‡ ط±ظˆط´ظ†',
    swatch: ['#f1fdf7', '#ffffff', '#00c853', '#00bfa5'],
  },
  kurosawa: {
    title: 'ع©ظˆط±ط§ط³ط§ظˆط§',
    desc: 'طھظ… ظ…ظˆظ†ظˆع©ط±ظˆظ… طھع©â€Œط±ظ†ع¯ (ط³غŒط§ظ‡/ط³ظپغŒط¯/ط®ط§ع©ط³طھط±غŒ) ط¨ط§ ط§ظ„ظ‡ط§ظ… ط§ط² ط³غŒظ†ظ…ط§غŒ ط¢ع©غŒط±ط§ ع©ظˆط±ظˆط³ط§ظˆط§ط› ط¨ط±ط§غŒ ط²غŒط¨ط§غŒغŒ ظ…غŒظ†غŒظ…ط§ظ„ ظˆ ط¨غŒâ€Œظ†ظ‚ط·ظ‡ظ” ط­ظˆط§ط³â€Œظ¾ط±طھغŒ.',
    tagline: 'ظ…غŒظ†غŒظ…ط§ظ„ ظˆ ط³غŒظ†ظ…ط§غŒغŒ',
    swatch: ['#f3f4f6', '#ffffff', '#111827', '#4b5563'],
  },
};

/* Live mini-preview mock of the final app for a theme */
const LivePreview = ({ mode, neonColor }) => {
  const isDark = ['dark', 'fmode'].includes(mode);
  const isF = mode === 'fmode';
  const kuro = mode === 'kurosawa';
  const fLight = mode === 'fmode_light';

  const bg = kuro ? '#e5e7eb' : fLight ? '#f1fdf7' : isF ? '#0a0a0a' : isDark ? '#0f172a' : '#f0f4ff';
  const panel = kuro ? '#ffffff' : fLight ? '#ffffff' : isF ? 'rgba(0,0,0,0.75)' : isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.85)';
  const accent = isF ? (neonColor || '#39ff14') : fLight ? '#00c853' : kuro ? '#111827' : isDark ? '#818cf8' : '#6366f1';
  const text = kuro ? '#111111' : isDark ? '#e2e8f0' : '#1e293b';

  return (
    <Box sx={{
      background: bg,
      p: 1.5,
      borderRadius: '10px',
      border: `1px solid ${accent}40`,
      transition: 'all 0.3s ease',
    }}>
      {/* fake sidebar + content */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box sx={{
          width: 52, borderRadius: '10px', p: 1,
          background: panel,
          display: 'flex', flexDirection: 'column', gap: 0.8,
        }}>
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{
              height: 8, borderRadius: '10px',
              background: i === 0 ? accent : 'rgba(128,128,128,0.25)',
            }} />
          ))}
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          <Box sx={{
            height: 18, borderRadius: '10px', p: 0.5,
            background: panel,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <Box sx={{ width: '55%', height: 10, borderRadius: '10px', background: accent }} />
            <Box sx={{ width: 22, height: 10, borderRadius: '10px', background: 'rgba(128,128,128,0.3)' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.8 }}>
            {[0, 1, 2].map(i => (
              <Box key={i} sx={{
                height: 40, flex: 1, borderRadius: '10px',
                background: panel,
                borderTop: `2px solid ${i === 0 ? accent : 'transparent'}`,
              }} />
            ))}
          </Box>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: text, mt: 0.5, display: 'block', opacity: 0.7 }}>
        ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ طھظ… {MODE_DESC[mode]?.title || 'â€”'}
      </Typography>
    </Box>
  );
};

const AppearancePage = () => {
  const { mode, setMode, neonColor, setNeonColor } = useThemeMode();

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: '10px',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.12), rgba(139,92,246,0.03), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.18)',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Avatar sx={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
        }}>
          <PaletteIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800}>ط¸ط§ظ‡ط± ظˆ ظ¾ظˆط³طھظ‡</Typography>
          <Typography variant="body2" color="textSecondary">
            ط§ظ†طھط®ط§ط¨ طھظ…طŒ ظ¾غŒط´â€Œظ†ظ…ط§غŒط´ ط²ظ†ط¯ظ‡ ظˆ ط´ط®طµغŒâ€Œط³ط§ط²غŒ ط±ظ†ع¯ ظ†ط¦ظˆظ† ط¨ط±ظ†ط§ظ…ظ‡
          </Typography>
        </Box>
      </Paper>

      {/* Theme cards with live preview */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>طھظ… ظ†ظ…ط§غŒط´</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        غŒع© طھظ… ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯ â€” طھط؛غŒغŒط±ط§طھ ط¨ظ„ط§ظپط§طµظ„ظ‡ ط¯ط± ع©ظ„ ط¨ط±ظ†ط§ظ…ظ‡ ط§ط¹ظ…ط§ظ„ ظˆ ط¯ط± ظ…ط±ظˆط±ع¯ط± ط°ط®غŒط±ظ‡ ظ…غŒâ€Œط´ظˆط¯.
      </Typography>

      <Grid container spacing={2}>
        {THEME_MODES.map(m => {
          const active = mode === m.key;
          return (
            <Grid item xs={12} sm={6} md={4} key={m.key}>
              <Paper
                onClick={() => setMode(m.key)}
                sx={{
                  p: 2, cursor: 'pointer', borderRadius: '10px', height: '100%',
                  border: active ? `2px solid ${m.color}` : '1px solid rgba(0,0,0,0.08)',
                  background: active ? `${m.color}0d` : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.25s ease',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 28px ${m.color}22` },
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ fontSize: 26 }}>{m.icon}</Box>
                  <Typography variant="subtitle1" fontWeight={700}>{m.label}</Typography>
                  {active && <CheckCircleIcon sx={{ color: m.color, ml: 'auto', fontSize: 22 }} />}
                </Box>

                <LivePreview mode={m.key} neonColor={neonColor} />

                <Typography variant="body2" color="textSecondary" sx={{ mt: 1.2 }}>
                  {MODE_DESC[m.key]?.desc || ''}
                </Typography>
                <Chip size="small" label={MODE_DESC[m.key]?.tagline || ''} variant="outlined" sx={{ mt: 0.8 }} />
                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                  {(MODE_DESC[m.key]?.swatch || []).map((c, idx) => (
                    <Box key={idx} sx={{ width: 16, height: 16, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.12)' }} />
                  ))}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Neon color picker â€” only for Neon modes */}
      {['fmode', 'fmode_light'].includes(mode) && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>ط±ظ†ع¯ ظ†ط¦ظˆظ†</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            ط±ظ†ع¯ ظ†ط¦ظˆظ†غŒ طھظ… ط³ط¨ط² ظ…ظˆط±ط¯ ظ†ط¸ط± ط±ط§ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯ â€” ط¨ظ„ط§ظپط§طµظ„ظ‡ ط¯ط± ط³ط±ط§ط³ط± ط¨ط±ظ†ط§ظ…ظ‡ ط§ط¹ظ…ط§ظ„ ظ…غŒâ€Œط´ظˆط¯.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {NEON_COLOR_OPTIONS.map(c => (
              <Chip
                key={c.key}
                label={c.label}
                onClick={() => setNeonColor(c.color)}
                sx={{
                  fontWeight: 700,
                  cursor: 'pointer',
                  bgcolor: neonColor === c.color ? c.color : 'transparent',
                  color: neonColor === c.color ? '#000' : 'inherit',
                  border: `1px solid ${c.color}`,
                  '&:hover': { background: `${c.color}22` },
                }}
              />
            ))}
          </Stack>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">ط±ظ†ع¯ ظپط¹ظ„غŒ:</Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', background: neonColor, boxShadow: `0 0 16px ${neonColor}` }} />
            <Typography variant="caption" color="textSecondary">{neonColor}</Typography>
          </Box>
        </>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        طھظ†ط¸غŒظ…ط§طھ ط¸ط§ظ‡ط± ط¨ظ‡â€Œطµظˆط±طھ ط®ظˆط¯ع©ط§ط± ط°ط®غŒط±ظ‡ ظ…غŒâ€Œط´ظˆط¯ ظˆ ط¯ط± ط¯ظپط¹ط§طھ ط¨ط¹ط¯غŒ ظˆط±ظˆط¯ ط¨ظ‡ ظ‡ظ…ط§ظ† ط´ع©ظ„ ط¨ط§ظ‚غŒ ظ…غŒâ€Œظ…ط§ظ†ط¯.
      </Alert>
    </Box>
  );
};

export default AppearancePage;