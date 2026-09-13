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
  { value: 'once', label: 'غŒع©â€Œط¨ط§ط±' },
  { value: 'daily', label: 'ط±ظˆط²ط§ظ†ظ‡' },
  { value: 'weekly', label: 'ظ‡ظپطھع¯غŒ' },
  { value: 'monthly', label: 'ظ…ط§ظ‡ط§ظ†ظ‡' },
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
      setResult({ ok: true, message: `ط§ط¬ط±ط§ ط´ط¯: ${formatPersianNumber(data.sent || 0)} ظ…ظˆظپظ‚`, id: data.id });
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
    if (s === 'pending') return <Chip size="small" label="ط¯ط± ط§ظ†طھط¸ط§ط±" color="warning" />;
    if (s === 'done') return <Chip size="small" label="ط§ظ†ط¬ط§ظ… ط´ط¯" color="success" />;
    return <Chip size="small" label="ظ„ط؛ظˆ ط´ط¯ظ‡" color="default" variant="outlined" />;
  };

  return (
    <Box>
      {result && <Alert severity={result.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.message}</Alert>}

      <Paper sx={{ p: 2.5, borderRadius: '10px', mb: 2, background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(255,255,255,0.3))', border: '1px solid rgba(59,130,246,0.18)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={800}>ط¨ط±ظ†ط§ظ…ظ‡â€Œظ‡ط§غŒ ط²ظ…ط§ظ†â€Œط¨ظ†ط¯غŒâ€Œط´ط¯ظ‡</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm({ title: '', text: '', frequency: 'once', scheduled_at: '', template: '' }); setDialog(true); }}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            ط¨ط±ظ†ط§ظ…ظ‡ ط¬ط¯غŒط¯
          </Button>
        </Box>

        {list.length === 0 ? (
          <Typography variant="caption" color="textSecondary">
            ظ‡ظ†ظˆط² ط²ظ…ط§ظ†â€Œط¨ظ†ط¯غŒ طھط¹ط±غŒظپ ظ†ط´ط¯ظ‡ ط§ط³طھ. ط¨ط±ط§غŒ ط§ط±ط³ط§ظ„ ط®ظˆط¯ع©ط§ط± (ظ…ط«ظ„ط§ظ‹ طھط¨ط±غŒع© طھظˆظ„ط¯ غŒط§ غŒط§ط¯ط¢ظˆط±غŒ ظپغŒط´) ط¨ط±ظ†ط§ظ…ظ‡ ط¨ط³ط§ط²غŒط¯.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {list.map(s => (
              <Paper key={s.id} sx={{ p: 1.5, borderRadius: '10px', border: '1px solid rgba(59,130,246,0.12)', background: 'rgba(255,255,255,0.5)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{s.title}</Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      طھع©ط±ط§ط±: {s.frequency_display} آ· ط²ظ…ط§ظ†: {s.scheduled_at}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {statusChip(s.status)}
                    {s.status !== 'done' && (
                      <>
                        <IconButton size="small" color="primary" title="ط§ط¬ط±ط§غŒ ظپظˆط±غŒ" onClick={() => runNow.mutate(s.id)}>
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="warning" title="ظ„ط؛ظˆ" onClick={() => cancel.mutate(s.id)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    <IconButton size="small" color="error" title="ط­ط°ظپ" onClick={() => deleteS.mutate(s.id)}>
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
        <DialogTitle>ط¨ط±ظ†ط§ظ…ظ‡ظ” ط²ظ…ط§ظ†â€Œط¨ظ†ط¯غŒ ط§ط±ط³ط§ظ„</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>ظ‚ط§ظ„ط¨ (ط§ط®طھغŒط§ط±غŒ)</InputLabel>
            <Select value={form.template || ''} label="ظ‚ط§ظ„ط¨ (ط§ط®طھغŒط§ط±غŒ)" onChange={e => onPickTemplate(e.target.value)}>
              <MenuItem value="">â€” ط¨ط¯ظˆظ† ظ‚ط§ظ„ط¨ â€”</MenuItem>
              {templateList.map(t => <MenuItem key={t.id} value={t.id}>{t.title}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="ط¹ظ†ظˆط§ظ† ط¨ط±ظ†ط§ظ…ظ‡ *" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <TextField size="small" label="ظ…طھظ† ظ¾غŒط§ظ… *" value={form.text} multiline rows={3}
            onChange={e => setForm(p => ({ ...p, text: e.target.value }))} />
          <FormControl size="small" fullWidth>
            <InputLabel>طھع©ط±ط§ط±</InputLabel>
            <Select value={form.frequency} label="طھع©ط±ط§ط±"
              onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
              {FREQUENCIES.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small" type="datetime-local" label="ط²ظ…ط§ظ† ط§ط¬ط±ط§ *"
            value={form.scheduled_at}
            InputLabelProps={{ shrink: true }}
            onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
          />
          <Typography variant="caption" color="textSecondary">
            ط§ع¯ط± ط§غŒظ† ظپغŒظ„ط¯ ط®ط§ظ„غŒ ط¨ظ…ط§ظ†ط¯طŒ ظ¾غŒط§ظ… ط¨ظ‡ ظ‡ظ…ظ‡ظ” ط¯ط±غŒط§ظپطھâ€Œع©ظ†ظ†ط¯ع¯ط§ظ† ط«ط¨طھâ€Œط´ط¯ظ‡ ط§ط±ط³ط§ظ„ ظ…غŒâ€Œط´ظˆط¯.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!form.title || !form.text || !form.scheduled_at}
            onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            ط°ط®غŒط±ظ‡
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BaleSchedulePanel;