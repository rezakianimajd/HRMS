import React from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Divider,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useThemeMode, THEME_MODES, NEON_COLOR_OPTIONS } from '../core/context/ThemeContext';
import { PageHeader, SOFT } from '../core/components/settings/settingsUi';

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
        پیش‌نمایش تم {MODE_DESC[mode]?.title || '—'}
      </Typography>
    </Box>
  );
};

const AppearancePage = () => {
  const { mode, setMode, neonColor, setNeonColor } = useThemeMode();

  return (
    <Box>
      <PageHeader
        icon={<PaletteIcon />}
        title="ظاهر و پوسته"
        color={SOFT.violet}
        badge={(
          <Chip
            size="small" variant="outlined"
            label={MODE_DESC[mode]?.title || ''}
            sx={{ fontWeight: 800 }}
          />
        )}
      />

      {/* Theme cards with live preview */}
      <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1.25 }}>تم نمایش</Typography>

      <Grid container spacing={2}>
        {THEME_MODES.map(m => {
          const active = mode === m.key;
          return (
            <Grid item xs={12} sm={6} md={4} key={m.key}>
              <Paper
                onClick={() => setMode(m.key)}
                sx={{
                  p: 1.5, cursor: 'pointer', borderRadius: '14px', height: '100%',
                  border: '1px solid',
                  borderColor: active ? `${m.color}80` : 'divider',
                  bgcolor: active ? `${m.color}0d` : 'background.paper',
                  boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
                  transition: 'all .2s ease',
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ fontSize: 26 }}>{m.icon}</Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{m.label}</Typography>
                  {active && <CheckCircleIcon sx={{ color: m.color, ml: 'auto', fontSize: 19 }} />}
                </Box>

                <LivePreview mode={m.key} neonColor={neonColor} />

                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 1 }}>
                  {MODE_DESC[m.key]?.desc || ''}
                </Typography>
                <Chip size="small" label={MODE_DESC[m.key]?.tagline || ''} variant="outlined" sx={{ mt: 0.8, height: 20, fontSize: 9.5 }} />
                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} useFlexGap>
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

    </Box>
  );
};

export default AppearancePage;