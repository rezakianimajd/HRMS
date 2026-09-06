import React from 'react';
import {
  Box, Typography, Paper, Avatar, Grid, Chip, Stack, Divider, Alert,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useThemeMode, THEME_MODES, NEON_COLOR_OPTIONS } from '../core/context/ThemeContext';

/* =========================================================================
 * ظاهر و پوسته (2026)
 *  - انتخاب state visual (تم) با پیش‌نمایش زنده + توضیح
 *  - انتخاب رنگ نئون برای F مود
 *  - ذخیرهٔ خودکار (localStorage از ThemeContext)
 * ========================================================================= */

const MODE_DESC = {
  light: {
    title: 'روشن',
    desc: 'تم روشن و شفاف برای محیط کار روزانه؛ کمترین خستگی چشم و حداکثر خوانایی.',
    tagline: 'بهترین انتخاب برای استفاده در روز',
    swatch: ['#f8fafc', '#ffffff', '#6366f1', '#ec4899'],
  },
  dark: {
    title: 'تاریک',
    desc: 'تم تیره و آرام برای کار در شب و کاهش نور آبی؛ مناسب تمرکز در محیط کم‌نور.',
    tagline: 'مناسب کار در شب',
    swatch: ['#0f172a', '#1e293b', '#818cf8', '#f472b6'],
  },
  fmode: {
    title: 'F مود',
    desc: 'ظاهر سیاه‌وسفید با تایپوگرافی نئونی — ترکیب سبک ترمینال و مدرن برای علاقه‌مندان به رابط‌های سایبری.',
    tagline: 'سبک نئونی سایبری',
    swatch: ['#050505', '#0d0d0d', '#39ff14', '#00ffff'],
  },
  fmode_light: {
    title: 'F مود روشن',
    desc: 'نسخهٔ روشن F مود؛ پس‌زمینهٔ روشن با همان رنگ‌های نئونی — حس تازگی با وضوح بالا.',
    tagline: 'نئونی روی زمینه روشن',
    swatch: ['#f1fdf7', '#ffffff', '#00c853', '#00bfa5'],
  },
  kurosawa: {
    title: 'کوراساوا',
    desc: 'تم مونوکروم تک‌رنگ (سیاه/سفید/خاکستری) با الهام از سینمای آکیرا کوروساوا؛ برای زیبایی مینیمال و بی‌نقطهٔ حواس‌پرتی.',
    tagline: 'مینیمال و سینمایی',
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
      borderRadius: 3,
      border: `1px solid ${accent}40`,
      transition: 'all 0.3s ease',
    }}>
      {/* fake sidebar + content */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box sx={{
          width: 52, borderRadius: 2, p: 1,
          background: panel,
          display: 'flex', flexDirection: 'column', gap: 0.8,
        }}>
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{
              height: 8, borderRadius: 5,
              background: i === 0 ? accent : 'rgba(128,128,128,0.25)',
            }} />
          ))}
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          <Box sx={{
            height: 18, borderRadius: 2, p: 0.5,
            background: panel,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <Box sx={{ width: '55%', height: 10, borderRadius: 5, background: accent }} />
            <Box sx={{ width: 22, height: 10, borderRadius: 5, background: 'rgba(128,128,128,0.3)' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.8 }}>
            {[0, 1, 2].map(i => (
              <Box key={i} sx={{
                height: 40, flex: 1, borderRadius: 2,
                background: panel,
                borderTop: `2px solid ${i === 0 ? accent : 'transparent'}`,
              }} />
            ))}
          </Box>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: text, mt: 0.5, display: 'block', opacity: 0.7 }}>
        پیش‌نمایش تم {MODE_DESC[mode]?.title || '—'}
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
        p: 3, mb: 2.5, borderRadius: 3,
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
          <Typography variant="h6" fontWeight={800}>ظاهر و پوسته</Typography>
          <Typography variant="body2" color="textSecondary">
            انتخاب تم، پیش‌نمایش زنده و شخصی‌سازی رنگ نئون برنامه
          </Typography>
        </Box>
      </Paper>

      {/* Theme cards with live preview */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>تم نمایش</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        یک تم انتخاب کنید — تغییرات بلافاصله در کل برنامه اعمال و در مرورگر ذخیره می‌شود.
      </Typography>

      <Grid container spacing={2}>
        {THEME_MODES.map(m => {
          const active = mode === m.key;
          return (
            <Grid item xs={12} sm={6} md={4} key={m.key}>
              <Paper
                onClick={() => setMode(m.key)}
                sx={{
                  p: 2, cursor: 'pointer', borderRadius: 3, height: '100%',
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

      {/* Neon color picker — only for Neon modes */}
      {['fmode', 'fmode_light'].includes(mode) && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>رنگ نئون</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            رنگ نئونی تم سبز مورد نظر را انتخاب کنید — بلافاصله در سراسر برنامه اعمال می‌شود.
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
            <Typography variant="body2">رنگ فعلی:</Typography>
            <Box sx={{ width: 34, height: 34, borderRadius: '50%', background: neonColor, boxShadow: `0 0 16px ${neonColor}` }} />
            <Typography variant="caption" color="textSecondary">{neonColor}</Typography>
          </Box>
        </>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        تنظیمات ظاهر به‌صورت خودکار ذخیره می‌شود و در دفعات بعدی ورود به همان شکل باقی می‌ماند.
      </Alert>
    </Box>
  );
};

export default AppearancePage;