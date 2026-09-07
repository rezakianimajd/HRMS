import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, TextField, Button, Chip, CircularProgress, Alert,
  MenuItem, InputLabel, FormControl, Select, Stack, IconButton, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';

const FREQUENCIES = [
  { value: 'once', label: 'یک‌بار' },
  { value: 'daily', label: 'روزانه' },
  { value: 'weekly', label: 'هفتگی' },
  { value: 'monthly', label: 'ماهانه' },
];

const BaleSchedulePanel = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ title: '', text: '', frequency: 'once', scheduled_at: '', template: '' });
  const [result, setResult] = useState(null);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['bale-schedules'],
    queryFn: () => axiosInstance.get('/bale-schedules/').then(r => r.data),
  });
  const list = Array.isArray(schedules) ? schedules : schedules?.results || [];

  const { data: templates } = useQuery({
    queryKey: ['bale-templates'],
    queryFn: () => axiosInstance.get('/bale-templates/').then(r => r.data),
  });
  const templateList = Array.isArray(templates) ? templates : templates?.results || [];

  const save = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`/bale-schedules/${payload.id}/`, payload)
        : axiosInstance.post('/bale-schedules/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bale-schedules'] });
      setDialog(false);
      setForm({ title: '', text: '', frequency: 'once', scheduled_at: '', template: '' });
    },
  });

  const cancel = useMutation({
    mutationFn: (id) => axiosInstance.post(`/bale-schedules/${id}/cancel/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bale-schedules'] }),
  });

  const runNow = useMutation({
    mutationFn: (id) => axiosInstance.post(`/bale-schedules/${id}/run_now/`),
    onSuccess: (data) => {
      setResult({ ok: true, message: `اجرا شد: ${formatPersianNumber(data.sent || 0)} موفق`, id: data.id });
      qc.invalidateQueries({ queryKey: ['bale-schedules'] });
    },
  });

  const deleteS = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/bale-schedules/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bale-schedules'] }),
  });

  const onPickTemplate = (id) => {
    const t = templateList.find(x => x.id === id);
    if (t) setForm(p => ({ ...p, template: t.id, text: t.text, title: t.title }));
  };

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const statusChip = (s) => {
    if (s === 'pending') return <Chip size="small" label="در انتظار" color="warning" />;
    if (s === 'done') return <Chip size="small" label="انجام شد" color="success" />;
    return <Chip size="small" label="لغو شده" color="default" variant="outlined" />;
  };

  return (
    <Box>
      {result && <Alert severity={result.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.message}</Alert>}

      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2, background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(255,255,255,0.3))', border: '1px solid rgba(59,130,246,0.18)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={800}>برنامه‌های زمان‌بندی‌شده</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm({ title: '', text: '', frequency: 'once', scheduled_at: '', template: '' }); setDialog(true); }}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            برنامه جدید
          </Button>
        </Box>

        {list.length === 0 ? (
          <Typography variant="caption" color="textSecondary">
            هنوز زمان‌بندی تعریف نشده است. برای ارسال خودکار (مثلاً تبریک تولد یا یادآوری فیش) برنامه بسازید.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {list.map(s => (
              <Paper key={s.id} sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(59,130,246,0.12)', background: 'rgba(255,255,255,0.5)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{s.title}</Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      تکرار: {s.frequency_display} · زمان: {s.scheduled_at}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {statusChip(s.status)}
                    {s.status !== 'done' && (
                      <>
                        <IconButton size="small" color="primary" title="اجرای فوری" onClick={() => runNow.mutate(s.id)}>
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="warning" title="لغو" onClick={() => cancel.mutate(s.id)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    <IconButton size="small" color="error" title="حذف" onClick={() => deleteS.mutate(s.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>برنامهٔ زمان‌بندی ارسال</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>قالب (اختیاری)</InputLabel>
            <Select value={form.template || ''} label="قالب (اختیاری)" onChange={e => onPickTemplate(e.target.value)}>
              <MenuItem value="">— بدون قالب —</MenuItem>
              {templateList.map(t => <MenuItem key={t.id} value={t.id}>{t.title}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="عنوان برنامه *" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <TextField size="small" label="متن پیام *" value={form.text} multiline rows={3}
            onChange={e => setForm(p => ({ ...p, text: e.target.value }))} />
          <FormControl size="small" fullWidth>
            <InputLabel>تکرار</InputLabel>
            <Select value={form.frequency} label="تکرار"
              onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
              {FREQUENCIES.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small" type="datetime-local" label="زمان اجرا *"
            value={form.scheduled_at}
            InputLabelProps={{ shrink: true }}
            onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
          />
          <Typography variant="caption" color="textSecondary">
            اگر این فیلد خالی بماند، پیام به همهٔ دریافت‌کنندگان ثبت‌شده ارسال می‌شود.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.title || !form.text || !form.scheduled_at}
            onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BaleSchedulePanel;