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
  BASE_FILE_STORAGE_PATH: { label: 'مسیر ذخیرهسازی فایلها', desc: 'محل پیشفرض ذخیره اسناد روی سرور', group: 'storage', type: 'text' },
  MAX_FILE_SIZE: { label: 'حداکثر حجم فایل (MB)', desc: 'تعیین سقف بارگذاری هر مدرک', group: 'storage', type: 'number', unit: 'MB' },
  ALLOWED_FILE_EXTENSIONS: { label: 'فرمتهای مجاز فایل', desc: 'لیست پسوند قابل بارگذاری', group: 'storage', type: 'chips' },
  EXPIRY_ALERT_DAYS: { label: 'هشدار انقضای مدرک (روز)', desc: 'چند روز قبل از انقضا هشدار داده شود', group: 'alerts', type: 'number', unit: 'روز' },
  CONTRACT_ALERT_DAYS: { label: 'هشدار پایان قرارداد (روز)', desc: 'چند روز قبل از پایان قرارداد هشدار', group: 'alerts', type: 'number', unit: 'روز' },
  LEAVE_DEFAULT_TOTAL_DAYS: { label: 'مرخصی استحقاقی سالانه', desc: 'سهم سالانه هر نفر — در «مانده مرخصی» واقعاً اعمال میشود', group: 'leaves', type: 'number', unit: 'روز' },
  LEAVE_CALCULATE_WEEKENDS: { label: 'لحاظ تعطیل در مرخصی', desc: 'آیا روزهای تعطیل از مدت مرخصی کسر شود', group: 'leaves', type: 'boolean' },
  ATTENDANCE_WORK_DAYS_PER_MONTH: { label: 'روز کاری ماهانه', desc: 'مبنای محاسبات کارکرد حضور', group: 'attendance', type: 'number', unit: 'روز' },
  DATE_FORMAT: { label: 'فرمت نمایش تاریخ', desc: 'ترتیب نمایش تاریخهای شمسی', group: 'regional', type: 'select', options: ['Y/m/d', 'm/d/Y', 'd/m/Y', 'Y - m - d'] },
  CURRENCY_SYMBOL: { label: 'نماد واحد پول', desc: 'نماد نمایش ریال در صفحات مالی', group: 'regional', type: 'text', unit: 'نماد' },
};

const GROUP_META = {
  storage:    { title: 'ذخیرهسازی و فایلها', color: '#6366f1', icon: <CloudOutlinedIcon sx={{ fontSize: 20, color: '#fff' }} /> },
  alerts:     { title: 'هشدارها و اعلانها',  color: '#f59e0b', icon: <NotificationsNoneIcon sx={{ fontSize: 20, color: '#fff' }} /> },
  leaves:     { title: 'سیاست مرخصی',         color: '#10b981', icon: <BeachAccessOutlinedIcon sx={{ fontSize: 20, color: '#fff' }} /> },
  attendance: { title: 'حضور و کارکرد',       color: '#3b82f6', icon: <AccessTimeFilledOutlinedIcon sx={{ fontSize: 20, color: '#fff' }} /> },
  regional:   { title: 'نمایش و واحدها',       color: '#8b5cf6', icon: <PublicIcon sx={{ fontSize: 20, color: '#fff' }} /> },
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
          {savedTick && <Chip size="small" label="ثبت شد ✓" color="success" />}
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
        {savedTick && <Chip size="small" label="✓" color="success" />}
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
    onError: () => setError('خطا در ذخیره تنظیم.'),
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}>در حال بارگذاری…</Box>;

  const keys = Object.keys(SETTING_META);
  const grouped = {};
  keys.forEach(k => {
    const g = SETTING_META[k].group;
    (grouped[g] = grouped[g] || []).push(k);
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* info banner */}
      <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.05)', border: '1px dashed #6366f133' }}>
        <Typography variant="body2" color="text.secondary">
          💡 تنظیمات ذخیرهشده در این صفحه بهصورت **واقعی** در سرور اعمال میشود؛ مثلاً «سهم مرخصی سالانه» در محاسبه مانده مرخصی هر پرسنل استفاده میگردد.
        </Typography>
      </Paper>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {Object.entries(grouped).map(([g, gKeys]) => {
        const gm = GROUP_META[g] || { title: g, color: '#6366f1', icon: null };
        return (
          <Paper key={g} sx={{ p: 2.5, borderRadius: 3, background: `linear-gradient(135deg, ${gm.color}08, rgba(255,255,255,0.3))`, border: `1px solid ${gm.color}1c` }}>
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
