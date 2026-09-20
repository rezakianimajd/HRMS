import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, Button, CircularProgress,
  Stack, TextField, Chip, Alert, Switch, FormControlLabel, Divider,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';

const COLOR = '#64748b';
const COLOR_DARK = '#475569';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42))',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 18px 50px rgba(100,116,139,0.14)',
  borderRadius: '20px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.6)',
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(100,116,139,0.12)' },
  },
};

const LEVELS = [
  { value: 'account_type', label: 'نوع حساب' },
  { value: 'group', label: 'گروه حساب' },
  { value: 'general', label: 'حساب کل' },
  { value: 'subsidiary', label: 'حساب معین' },
  { value: 'auxiliary', label: 'حساب تفصیلی' },
  { value: 'cost_center', label: 'مرکز هزینه' },
];

const CodingPanel = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['coding-configs'], queryFn: () => axiosInstance.get('/accounting/coding-configs/').then(r => r.data) });
  const configs = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (cfg) => cfg.id
      ? axiosInstance.patch(`/accounting/coding-configs/${cfg.id}/`, cfg)
      : axiosInstance.post('/accounting/coding-configs/', cfg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coding-configs'] }),
  });

  const get = (level) => configs.find(c => c.level === level);

  const upsert = (level, patch) => {
    const existing = get(level);
    if (existing) {
      save.mutate({ ...existing, ...patch });
    } else {
      save.mutate({ level, prefix: '', start_number: 1, end_number: 99, min_length: 1, max_length: 10, is_active: true, ...patch });
    }
  };

  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  return (
    <Stack spacing={2}>
      {LEVELS.map(level => {
        const c = get(level);
        return (
          <Paper key={level.value} sx={{ ...glass, p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK}>{level.label}</Typography>
              <Chip size="small" label={c?.is_active ? 'فعال' : 'غیرفعال'} color={c?.is_active ? 'success' : 'default'} />
            </Stack>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <TextField size="small" label="پیشوند" value={c?.prefix || ''} onChange={e => upsert(level.value, { prefix: e.target.value })} sx={{ width: 110, ...fieldSx }} />
              <TextField size="small" label="شروع از" type="number" value={c?.start_number ?? 1} onChange={e => upsert(level.value, { start_number: Number(e.target.value) || 1 })} sx={{ width: 100, ...fieldSx }} />
              <TextField size="small" label="پایان تا" type="number" value={c?.end_number ?? 99} onChange={e => upsert(level.value, { end_number: Number(e.target.value) || 99 })} sx={{ width: 100, ...fieldSx }} />
              <TextField size="small" label="حداقل طول" type="number" value={c?.min_length ?? 1} onChange={e => upsert(level.value, { min_length: Number(e.target.value) || 1 })} sx={{ width: 100, ...fieldSx }} />
              <TextField size="small" label="حداکثر طول" type="number" value={c?.max_length ?? 10} onChange={e => upsert(level.value, { max_length: Number(e.target.value) || 10 })} sx={{ width: 100, ...fieldSx }} />
              <FormControlLabel control={<Switch size="small" checked={c?.is_active ?? true} onChange={e => upsert(level.value, { is_active: e.target.checked })} />} label="" />
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};

const AccountingSettingsPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '20px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 28px ${COLOR}55` }}>
          <TuneIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>تعاریف اولیهٔ حسابداری</Typography>
          <Typography variant="body2" color="textSecondary">استانداردسازی کدینگ سطوح مختلف حساب</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: '1px solid rgba(255,255,255,0.5)', px: 2 }}>
          <Tab icon={<CategoryIcon />} iconPosition="start" label="کدینگ" sx={{ fontWeight: 700, color: tab === 0 ? COLOR_DARK : undefined }} />
        </Tabs>
      </Paper>

      {tab === 0 && <CodingPanel />}
    </Box>
  );
};

export default AccountingSettingsPage;