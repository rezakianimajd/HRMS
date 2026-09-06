import React from 'react';
import {
  Box, Typography, Paper, Avatar, Grid, Chip, Stack,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import { useThemeMode, THEME_MODES, NEON_COLOR_OPTIONS } from '../core/context/ThemeContext';

const ModeIcon = {
  light: '☀️',
  dark: '🌙',
  system: '🖥️',
};

const AppearancePage = () => {
  const { mode, setMode, neonColor, setNeonColor } = useThemeMode();

  return (
    <Box>
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(139,92,246,0.10), rgba(139,92,246,0.03), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.18)',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
          <PaletteIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800}>ظاهر و پوسته</Typography>
          <Typography variant="body2" color="textSecondary">
            انتخاب حالت نمایش و رنگ نئون برنامه
          </Typography>
        </Box>
      </Paper>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>حالت نمایش</Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {(THEME_MODES || []).map(m => (
          <Grid item xs={12} sm={4} key={m.key}>
            <Paper
              onClick={() => setMode(m.key)}
              sx={{
                p: 2, borderRadius: 2.5, cursor: 'pointer', textAlign: 'center',
                border: mode === m.key ? `2px solid ${m.color || '#8b5cf6'}` : '1px solid rgba(0,0,0,0.08)',
                background: mode === m.key ? `${m.color || '#8b5cf6'}0d` : 'rgba(255,255,255,0.6)',
              }}>
              <Box sx={{ fontSize: 34, mb: 0.5 }}>{ModeIcon[m.key] || '🎨'}</Box>
              <Typography variant="body1" fontWeight={700}>{m.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>رنگ نئون</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
        {(NEON_COLOR_OPTIONS || []).map(c => (
          <Chip key={c.value} label={c.label}
            onClick={() => setNeonColor(c.value)}
            sx={{
              fontWeight: 700,
              bgcolor: neonColor === c.value ? c.value : 'transparent',
              color: neonColor === c.value ? '#fff' : 'inherit',
              border: `1px solid ${c.value}`,
              cursor: 'pointer',
            }} />
        ))}
      </Stack>
    </Box>
  );
};

export default AppearancePage;