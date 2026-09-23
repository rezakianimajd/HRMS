import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, Switch, FormControlLabel,
} from '@mui/material';
import RuleIcon from '@mui/icons-material/Rule';
import SaveIcon from '@mui/icons-material/Save';
import { formatPersianNumber } from '../core/utils/numberUtils';

const COLOR = '#8b5cf6';
const COLOR_DARK = '#7c3aed';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(139,92,246,0.12)', borderRadius: '16px',
};

const AccountingApprovalPolicyPage = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', single_level_limit: '0' });
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['acc-approval-policies'], queryFn: () => axiosInstance.get('/accounting/approval-policies/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (p) => editing ? axiosInstance.patch(`/accounting/approval-policies/${editing.id}/`, p) : axiosInstance.post('/accounting/approval-policies/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['acc-approval-policies'] }); setEditing(null); setForm({ name: '', single_level_limit: '0' }); },
  });

  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, single_level_limit: String(p.single_level_limit) }); };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <RuleIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>سیاست تأیید اسناد</Typography>
          <Typography variant="body2" color="textSecondary">تعیین سقف مبلغی برای تأیید تک‌مرحله در مقابل چندمرحله</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, p: 2.5, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} mb={2}>{editing ? 'ویرایش سیاست' : 'سیاست جدید'}</Typography>
        <Stack spacing={2}>
          <TextField size="small" label="عنوان سیاست" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} fullWidth />
          <TextField size="small" label="سقف تأیید تک‌مرحله (ریال)" type="number" value={form.single_level_limit} onChange={e => setForm(p => ({ ...p, single_level_limit: e.target.value }))} fullWidth />
          <FormControlLabel control={<Switch checked={form.is_active ?? true} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />} label="فعال" />
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={() => save.mutate({ ...form, single_level_limit: Number(form.single_level_limit) || 0 })}
              sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
              {editing ? 'به‌روزرسانی' : 'افزودن سیاست'}
            </Button>
            {editing && <Button variant="outlined" onClick={() => { setEditing(null); setForm({ name: '', single_level_limit: '0' }); }}>انصراف</Button>}
          </Stack>
        </Stack>
      </Paper>

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <Stack spacing={1}>
          {list.length === 0 ? <Paper sx={{ ...glass, p: 4, textAlign: 'center' }}><Typography color="textSecondary">سیاستی ثبت نشده است</Typography></Paper> :
          list.map(p => (
            <Paper key={p.id} sx={{ ...glass, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: COLOR }}><RuleIcon /></Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" fontWeight={800}>{p.name}</Typography>
                <Typography variant="caption" color="textSecondary">سقف تک‌مرحله: {formatPersianNumber(p.single_level_limit)} ریال</Typography>
              </Box>
              <Chip size="small" label={p.is_active ? 'فعال' : 'غیرفعال'} color={p.is_active ? 'success' : 'default'} />
              <Button size="small" onClick={() => openEdit(p)}>ویرایش</Button>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default AccountingApprovalPolicyPage;