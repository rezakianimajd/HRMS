import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton } from '@mui/material';

export const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
  borderRadius: '10px',
};

export const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'فعال',
  on_hold: 'متوقف',
  completed: 'تکمیل‌شده',
  closed: 'بسته',
};

export const STATUS_COLORS = {
  draft: '#64748b', active: '#10b981', on_hold: '#f59e0b',
  completed: '#3b82f6', closed: '#64748b',
};

/**
 * Reusable colored page header for project sub-pages.
 */
export const PageHeader = ({ icon, title, subtitle, color, gradient = '#8b5cf6,#3b82f6', action }) => (
  <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
    background: 'linear-gradient(120deg, rgba(139,92,246,0.10), rgba(59,130,246,0.05), rgba(255,255,255,0.3))',
    border: '1px solid rgba(139,92,246,0.18)', borderRadius: '10px' }}>
    <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${gradient})`, boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
      {icon}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 200 }}>
      <Typography variant="h6" fontWeight={800} color={color}>{title}</Typography>
      <Typography variant="body2" color="textSecondary">{subtitle}</Typography>
    </Box>
    {action}
  </Paper>
);

/**
 * Generic simple entity manager (used for CBS / Resource / CostSource / ProjectType / OBS ...).
 * Fetches with a high page_size so the full list is shown (no hidden rows).
 */
export const SimpleEntityList = ({ queryKey, endpoint, title, color, icon, fields, params }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ id: null });
  const baseKey = Array.isArray(queryKey) ? queryKey : [queryKey];

  const { data, isLoading } = useQuery({
    queryKey: params ? [...baseKey, params] : baseKey,
    queryFn: () => axiosInstance.get(endpoint, { params: { page_size: 500, ...(params || {}) } }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (payload) => {
      const body = { ...payload };
      if (params) Object.assign(body, params);
      return payload.id
        ? axiosInstance.patch(`${endpoint}${payload.id}/`, body)
        : axiosInstance.post(endpoint, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: baseKey });
      setDialog(false);
      setForm({ id: null });
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${endpoint}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  if (isLoading) return <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>;

  const fieldDefs = fields || [{ key: 'name', label: 'نام' }, { key: 'code', label: 'کد' }];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800} color={color}>{title} ({list.length})</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined"
          onClick={() => { setForm({ id: null }); setDialog(true); }}>افزودن</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.length === 0 && (
          <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>موردی ثبت نشده است.</Typography>
        )}
        {list.map(item => (
          <Paper key={item.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon && <Avatar sx={{ width: 30, height: 30, background: color }}>{icon}</Avatar>}
            <Box sx={{ flex: 1 }}>
              {fieldDefs.map(f => (
                <Typography key={f.key} variant="caption" display="block" color="textSecondary">
                  {f.label}: {item[f.key]}
                </Typography>
              ))}
            </Box>
            <IconButton size="small" onClick={() => { setForm({ ...item }); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف شود؟')) remove.mutate(item.id); }}><DeleteIcon fontSize="small" /></IconButton>
          </Paper>
        ))}
      </Stack>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش' : 'افزودن'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {fieldDefs.map(f => (
            <TextField key={f.key} size="small" label={f.label} value={form[f.key] || ''}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate(form)} sx={{ background: color }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
