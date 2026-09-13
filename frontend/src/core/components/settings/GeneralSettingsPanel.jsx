import React, { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, TextField, Switch, Chip, Divider,
  Alert, Grid, Tooltip, Stack,
} from '@mui/material';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import AccessTimeFilledOutlinedIcon from '@mui/icons-material/AccessTimeFilledOutlined';
import PublicIcon from '@mui/icons-material/Public';

const SETTING_META = {
  BASE_FILE_STORAGE_PATH: { label: 'ظ…ط³غŒط± ط°ط®غŒط±ظ‡ط³ط§ط²غŒ ظپط§غŒظ„ظ‡ط§', desc: 'ظ…ط­ظ„ ظ¾غŒط´ظپط±ط¶ ط°ط®غŒط±ظ‡ ط§ط³ظ†ط§ط¯ ط±ظˆغŒ ط³ط±ظˆط±', group: 'storage', type: 'text' },
  MAX_FILE_SIZE: { label: 'ط­ط¯ط§ع©ط«ط± ط­ط¬ظ… ظپط§غŒظ„ (MB)', desc: 'طھط¹غŒغŒظ† ط³ظ‚ظپ ط¨ط§ط±ع¯ط°ط§ط±غŒ ظ‡ط± ظ…ط¯ط±ع©', group: 'storage', type: 'number', unit: 'MB' },
  ALLOWED_FILE_EXTENSIONS: { label: 'ظپط±ظ…طھظ‡ط§غŒ ظ…ط¬ط§ط² ظپط§غŒظ„', desc: 'ظ„غŒط³طھ ظ¾ط³ظˆظ†ط¯ ظ‚ط§ط¨ظ„ ط¨ط§ط±ع¯ط°ط§ط±غŒ', group: 'storage', type: 'chips' },
  EXPIRY_ALERT_DAYS: { label: 'ظ‡ط´ط¯ط§ط± ط§ظ†ظ‚ط¶ط§غŒ ظ…ط¯ط±ع© (ط±ظˆط²)', desc: 'ع†ظ†ط¯ ط±ظˆط² ظ‚ط¨ظ„ ط§ط² ط§ظ†ظ‚ط¶ط§ ظ‡ط´ط¯ط§ط± ط¯ط§ط¯ظ‡ ط´ظˆط¯', group: 'alerts', type: 'number', unit: 'ط±ظˆط²' },
  CONTRACT_ALERT_DAYS: { label: 'ظ‡ط´ط¯ط§ط± ظ¾ط§غŒط§ظ† ظ‚ط±ط§ط±ط¯ط§ط¯ (ط±ظˆط²)', desc: 'ع†ظ†ط¯ ط±ظˆط² ظ‚ط¨ظ„ ط§ط² ظ¾ط§غŒط§ظ† ظ‚ط±ط§ط±ط¯ط§ط¯ ظ‡ط´ط¯ط§ط±', group: 'alerts', type: 'number', unit: 'ط±ظˆط²' },
  LEAVE_DEFAULT_TOTAL_DAYS: { label: 'ظ…ط±ط®طµغŒ ط§ط³طھط­ظ‚ط§ظ‚غŒ ط³ط§ظ„ط§ظ†ظ‡', desc: 'ط³ظ‡ظ… ط³ط§ظ„ط§ظ†ظ‡ ظ‡ط± ظ†ظپط± â€” ط¯ط± آ«ظ…ط§ظ†ط¯ظ‡ ظ…ط±ط®طµغŒآ» ظˆط§ظ‚ط¹ط§ظ‹ ط§ط¹ظ…ط§ظ„ ظ…غŒط´ظˆط¯', group: 'leaves', type: 'number', unit: 'ط±ظˆط²' },
  LEAVE_CALCULATE_WEEKENDS: { label: 'ظ„ط­ط§ط¸ طھط¹ط·غŒظ„ ط¯ط± ظ…ط±ط®طµغŒ', desc: 'ط¢غŒط§ ط±ظˆط²ظ‡ط§غŒ طھط¹ط·غŒظ„ ط§ط² ظ…ط¯طھ ظ…ط±ط®طµغŒ ع©ط³ط± ط´ظˆط¯', group: 'leaves', type: 'boolean' },
  ATTENDANCE_WORK_DAYS_PER_MONTH: { label: 'ط±ظˆط² ع©ط§ط±غŒ ظ…ط§ظ‡ط§ظ†ظ‡', desc: 'ظ…ط¨ظ†ط§غŒ ظ…ط­ط§ط³ط¨ط§طھ ع©ط§ط±ع©ط±ط¯ ط­ط¶ظˆط±', group: 'attendance', type: 'number', unit: 'ط±ظˆط²' },
  DATE_FORMAT: { label: 'ظپط±ظ…طھ ظ†ظ…ط§غŒط´ طھط§ط±غŒط®', desc: 'طھط±طھغŒط¨ ظ†ظ…ط§غŒط´ طھط§ط±غŒط®ظ‡ط§غŒ ط´ظ…ط³غŒ', group: 'regional', type: 'select', options: ['Y/m/d', 'm/d/Y', 'd/m/Y', 'Y - m - d'] },
  CURRENCY_SYMBOL: { label: 'ظ†ظ…ط§ط¯ ظˆط§ط­ط¯ ظ¾ظˆظ„', desc: 'ظ†ظ…ط§ط¯ ظ†ظ…ط§غŒط´ ط±غŒط§ظ„ ط¯ط± طµظپط­ط§طھ ظ…ط§ظ„غŒ', group: 'regional', type: 'text', unit: 'ظ†ظ…ط§ط¯' },
};

const GROUP_META = {
  storage:    { title: 'ط°ط®غŒط±ظ‡ط³ط§ط²غŒ ظˆ ظپط§غŒظ„ظ‡ط§', color: '#6366f1', icon: <CloudOutlinedIcon sx={{ fontSize: 20, color: '#fff' }} /> },
  alerts:     { title: 'ظ‡ط´ط¯ط§ط±ظ‡ط§ ظˆ ط§ط¹ظ„ط§ظ†ظ‡ط§',  color: '#f59e0b', icon: <NotificationsNoneIcon sx={{ fontSize: 20, color: '#fff' }} /> },
  leaves:     { title: 'ط³غŒط§ط³طھ ظ…ط±ط®طµغŒ',         color: '#10b981', icon: <BeachAccessOutlinedIcon sx={{ fontSize: 20, color: '#fff' }} /> },
  attendance: { title: 'ط­ط¶ظˆط± ظˆ ع©ط§ط±ع©ط±ط¯',       color: '#3b82f6', icon: <AccessTimeFilledOutlinedIcon sx={{ fontSize: 20, color: '#fff' }} /> },
  regional:   { title: 'ظ†ظ…ط§غŒط´ ظˆ ظˆط§ط­ط¯ظ‡ط§',       color: '#8b5cf6', icon: <PublicIcon sx={{ fontSize: 20, color: '#fff' }} /> },
};

const SettingRow = ({ meta, value, onSave }) => {
  const [savedTick, setTick] = useState(false);
  const handle = (val) => {
    onSave(val);
    setTick(true);
    setTimeout(() => setTick(false), 1300);
  };

  if (meta.type === 'boolean') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="body1" fontWeight={600}>{meta.label}</Typography>
          <Typography variant="caption" color="textSecondary">{meta.desc}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {savedTick && <Chip size="small" label="ط«ط¨طھ ط´ط¯ âœ“" color="success" />}
          <Switch checked={Boolean(value)} onChange={e => handle(e.target.checked)} />
        </Box>
      </Box>
    );
  }

  if (meta.type === 'chips') {
    // value is array of strings
    const arr = (Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean));
    return (
      <Box>
        <Typography variant="body1" fontWeight={600}>{meta.label}</Typography>
        <Typography variant="caption" color="textSecondary" display="block">{meta.desc}</Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {arr.map(ext => (
            <Chip key={ext} size="small" label={ext}
              sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid #6366f133', fontWeight: 600 }} />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body1" fontWeight={600}>{meta.label}</Typography>
      <Typography variant="caption" color="textSecondary" display="block">{meta.desc}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        <TextField
          size="small" fullWidth
          type={meta.type === 'number' ? 'number' : 'text'}
          value={value ?? ''}
          onChange={e => {
            const raw = meta.type === 'number' ? Number(e.target.value) : e.target.value;
            // save on Enter / blur
            e.target.dataset.live = raw;
          }}
          onBlur={e => { handle(meta.type === 'number' ? Number(e.target.value || 0) : e.target.value); }}
          InputProps={{ endAdornment: meta.unit ? <Typography variant="caption" sx={{ ml: 0.5 }}>{meta.unit}</Typography> : undefined }}
        />
        {savedTick && <Chip size="small" label="âœ“" color="success" />}
      </Stack>
    </Box>
  );
};

const GeneralSettingsPanel = () => {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => axiosInstance.get('/settings/').then(r => r.data),
  });
  const [error, setError] = useState('');

  const update = useMutation({
    mutationFn: ({ key, value }) => axiosInstance.put(`/settings/${key}/`, { value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      // clear effective-settings cache used by backend
      qc.invalidateQueries({ queryKey: ['leave-balance'] });
    },
    onError: () => setError('ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡ طھظ†ط¸غŒظ….'),
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}>ط¯ط± ط­ط§ظ„ ط¨ط§ط±ع¯ط°ط§ط±غŒâ€¦</Box>;

  const keys = Object.keys(SETTING_META);
  const grouped = {};
  keys.forEach(k => {
    const g = SETTING_META[k].group;
    (grouped[g] = grouped[g] || []).push(k);
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* info banner */}
      <Paper sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'rgba(99,102,241,0.05)', border: '1px dashed #6366f133' }}>
        <Typography variant="body2" color="text.secondary">
          ًں’، طھظ†ط¸غŒظ…ط§طھ ط°ط®غŒط±ظ‡ط´ط¯ظ‡ ط¯ط± ط§غŒظ† طµظپط­ظ‡ ط¨ظ‡طµظˆط±طھ **ظˆط§ظ‚ط¹غŒ** ط¯ط± ط³ط±ظˆط± ط§ط¹ظ…ط§ظ„ ظ…غŒط´ظˆط¯ط› ظ…ط«ظ„ط§ظ‹ آ«ط³ظ‡ظ… ظ…ط±ط®طµغŒ ط³ط§ظ„ط§ظ†ظ‡آ» ط¯ط± ظ…ط­ط§ط³ط¨ظ‡ ظ…ط§ظ†ط¯ظ‡ ظ…ط±ط®طµغŒ ظ‡ط± ظ¾ط±ط³ظ†ظ„ ط§ط³طھظپط§ط¯ظ‡ ظ…غŒع¯ط±ط¯ط¯.
        </Typography>
      </Paper>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {Object.entries(grouped).map(([g, gKeys]) => {
        const gm = GROUP_META[g] || { title: g, color: '#6366f1', icon: null };
        return (
          <Paper key={g} sx={{ p: 2.5, borderRadius: '10px', background: `linear-gradient(135deg, ${gm.color}08, rgba(255,255,255,0.3))`, border: `1px solid ${gm.color}1c` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: gm.color, boxShadow: `0 4px 14px ${gm.color}40` }}>{gm.icon}</Avatar>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: gm.color }}>{gm.title}</Typography>
            </Box>
            <Grid container spacing={3}>
              {gKeys.map(k => {
                const meta = SETTING_META[k];
                const raw = settings?.[k];
                const val = String(raw) === '' || raw === undefined
                  ? (meta.type === 'number' ? 0 : meta.type === 'boolean' ? false : meta.type === 'chips' ? [] : '')
                  : raw;
                return (
                  <Grid key={k} item xs={12} md={6} lg={4}>
                    <SettingRow meta={meta} value={
                      meta.type === 'chips' ? (typeof raw === 'string' ? raw.split(',') : raw) : val
                    }
                    onSave={v => update.mutate({ key: k, value: meta.type === 'chips' ? (Array.isArray(v) ? v.join(',') : v) : v })} />
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        );
      })}
    </Box>
  );
};

export default GeneralSettingsPanel;
