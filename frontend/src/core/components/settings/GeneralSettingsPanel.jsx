import React, { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, TextField, Switch, Chip,
  Alert, Grid, Stack, alpha,
} from '@mui/material';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import AccessTimeFilledOutlinedIcon from '@mui/icons-material/AccessTimeFilledOutlined';
import PublicIcon from '@mui/icons-material/Public';
import StorageArchivePanel from './StorageArchivePanel';
import { SOFT } from './settingsUi';

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
  storage:    { title: 'ذخیره‌سازی و فایل‌ها', color: SOFT.indigo, icon: <CloudOutlinedIcon /> },
  alerts:     { title: 'هشدارها و اعلان‌ها',  color: SOFT.amber, icon: <NotificationsNoneIcon /> },
  leaves:     { title: 'سیاست مرخصی',         color: SOFT.green, icon: <BeachAccessOutlinedIcon /> },
  attendance: { title: 'حضور و کارکرد',       color: SOFT.blue, icon: <AccessTimeFilledOutlinedIcon /> },
  regional:   { title: 'نمایش و واحدها',       color: SOFT.violet, icon: <PublicIcon /> },
};

const GroupHeader = ({ meta }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Avatar variant="rounded" sx={{
      width: 30, height: 30, borderRadius: '9px',
      bgcolor: alpha(meta.color, 0.14), color: meta.color,
    }}>
      {meta.icon ? React.cloneElement(meta.icon, { sx: { fontSize: 17 } }) : null}
    </Avatar>
    <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{meta.title}</Typography>
  </Box>
);

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
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{meta.label}</Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{meta.desc}</Typography>
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
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{meta.label}</Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', display: 'block' }}>{meta.desc}</Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {arr.map(ext => (
            <Chip key={ext} size="small" label={ext}
              sx={{ height: 20, fontSize: 10.5, bgcolor: alpha(SOFT.indigo, 0.1), color: SOFT.indigo, border: '1px solid ' + alpha(SOFT.indigo, 0.22), fontWeight: 700 }} />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{meta.label}</Typography>
      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', display: 'block' }}>{meta.desc}</Typography>
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

  const keys = Object.keys(SETTING_META).filter((k) => SETTING_META[k].group !== 'storage');
  const grouped = {};
  keys.forEach(k => {
    const g = SETTING_META[k].group;
    (grouped[g] = grouped[g] || []).push(k);
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

      {/* ذخیره‌سازی و فایل‌ها — کارت سفید */}
      <Paper sx={{
        p: 1.75, borderRadius: '16px',
        border: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
      }}>
        <GroupHeader meta={GROUP_META.storage} />
        <StorageArchivePanel />
      </Paper>

      {/* گروه‌های کم‌حجم — دو ستون در کنار هم */}
      <Grid container spacing={1.75}>
        {Object.entries(grouped).filter(([g]) => g !== 'storage').map(([g, gKeys]) => {
          const gm = GROUP_META[g] || { title: g, color: SOFT.slate, icon: null };
          return (
            <Grid item xs={12} lg={6} key={g}>
              <Paper sx={{
                p: 1.75, borderRadius: '16px', height: '100%',
                border: '1px solid', borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
              }}>
                <GroupHeader meta={gm} />
                <Grid container spacing={1.5}>
                  {gKeys.map((k) => {
                    const meta = SETTING_META[k];
                    const raw = settings?.[k];
                    const val = String(raw) === '' || raw === undefined
                      ? (meta.type === 'number' ? 0 : meta.type === 'boolean' ? false : meta.type === 'chips' ? [] : '')
                      : raw;
                    return (
                      <Grid key={k} item xs={12} sm={6}>
                        <SettingRow
                          meta={meta}
                          value={meta.type === 'chips'
                            ? (typeof raw === 'string' ? raw.split(',') : raw)
                            : val}
                          onSave={(v) => update.mutate({
                            key: k,
                            value: meta.type === 'chips' ? (Array.isArray(v) ? v.join(',') : v) : v,
                          })}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default GeneralSettingsPanel;
