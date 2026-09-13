import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Chip, IconButton,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '10px',
};

const RECOMMENDATIONS = {
  approved: { label: 'طھط£غŒغŒط¯ط´ط¯ظ‡', color: '#10b981' },
  conditional: { label: 'طھط£غŒغŒط¯ ظ…ط´ط±ظˆط·', color: '#f59e0b' },
  suspended: { label: 'طھط¹ظ„غŒظ‚', color: '#f97316' },
  blacklisted: { label: 'ظ„غŒط³طھ ط³غŒط§ظ‡', color: '#ef4444' },
};

const ContractSettingsPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(100,116,139,0.10), rgba(139,92,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(100,116,139,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#64748b,#8b5cf6)', boxShadow: '0 8px 24px rgba(100,116,139,0.4)' }}>
          <CategoryIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#475569">ظ¾غŒع©ط±ط¨ظ†ط¯غŒ ظ‚ط±ط§ط±ط¯ط§ط¯</Typography>
          <Typography variant="body2" color="textSecondary">ط§ظ†ظˆط§ط¹ ظ‚ط±ط§ط±ط¯ط§ط¯ ظˆ ط§ط±ط²غŒط§ط¨غŒ طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ع¯ط§ظ†</Typography>
        </Box>
      </Paper>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<CategoryIcon />} label="ط§ظ†ظˆط§ط¹ ظ‚ط±ط§ط±ط¯ط§ط¯" />
        <Tab icon={<AssessmentIcon />} label="ط§ط±ط²غŒط§ط¨غŒ طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ع¯ط§ظ†" />
      </Tabs>
      {tab === 0 && <ContractTypesManager />}
      {tab === 1 && <EvaluationsManager />}
    </Box>
  );
};

const ContractTypesManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data, isLoading } = useQuery({ queryKey: ['contract-types-master'], queryFn: () => axiosInstance.get('/contract-types-master/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-types-master/${p.id}/`, p) : axiosInstance.post('/contract-types-master/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-types-master'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-types-master/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-types-master'] }) });
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>ط§ظ†ظˆط§ط¹ ظ‚ط±ط§ط±ط¯ط§ط¯</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => { setForm({}); setDialog(true); }}>ط§ظپط²ظˆط¯ظ†</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(t => (
          <Paper key={t.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={700}>{t.name}</Typography><Typography variant="caption" color="textSecondary">{t.code}</Typography></Box>
            <IconButton size="small" onClick={() => { setForm({ ...t }); setDialog(true); }}><EditNoteIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => { if (window.confirm('ط­ط°ظپطں')) del.mutate(t.id); }}><DeleteIcon fontSize="small" /></IconButton>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">ظ†ظˆط¹غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>ظ†ظˆط¹ ظ‚ط±ط§ط±ط¯ط§ط¯</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="ع©ط¯" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
          <TextField size="small" label="ط¹ظ†ظˆط§ظ†" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <TextField size="small" label="طھظˆط¶غŒط­ط§طھ" multiline rows={2} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!form.name || !form.code} onClick={() => save.mutate(form)} sx={{ background: 'linear-gradient(135deg,#64748b,#8b5cf6)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const EvaluationsManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data: parties } = useQuery({ queryKey: ['parties-eval'], queryFn: () => axiosInstance.get('/contract-parties/').then(r => r.data) });
  const partyList = Array.isArray(parties) ? parties : parties?.results || [];
  const { data, isLoading } = useQuery({ queryKey: ['supplier-evaluations'], queryFn: () => axiosInstance.get('/supplier-evaluations/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/supplier-evaluations/${p.id}/`, p) : axiosInstance.post('/supplier-evaluations/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-evaluations'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/supplier-evaluations/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-evaluations'] }) });
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  const scoreField = (key, label) => (
    <TextField size="small" type="number" label={label} value={form[key] ?? ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
  );
  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>ط§ط±ط²غŒط§ط¨غŒ طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ع¯ط§ظ†</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => { setForm({}); setDialog(true); }}>ط§ظپط²ظˆط¯ظ†</Button>
      </Box>
      {list.length === 0 ? <Typography variant="caption" color="textSecondary" textAlign="center">ط§ط±ط²غŒط§ط¨غŒâ€Œط§غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡</Typography> : (
        <Grid container spacing={2}>
          {list.map(ev => (
            <Grid item xs={12} md={6} key={ev.id}>
              <Paper sx={{ ...glassPaper, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AssessmentIcon sx={{ color: RECOMMENDATIONS[ev.recommendation]?.color }} />
                  <Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={800}>{ev.party_name}</Typography><Typography variant="caption" color="textSecondary">ط¯ظˆط±ظ‡: {ev.period || 'â€”'} آ· {toJalali(ev.evaluation_date)}</Typography></Box>
                  <Chip size="small" label={RECOMMENDATIONS[ev.recommendation]?.label} sx={{ bgcolor: `${RECOMMENDATIONS[ev.recommendation]?.color}22`, color: RECOMMENDATIONS[ev.recommendation]?.color }} />
                </Box>
                <Chip size="small" label={`ط§ظ…طھغŒط§ط² ع©ظ„: ${formatPersianNumber(ev.total_score || 0)}`} sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => { setForm({ ...ev }); setDialog(true); }}><EditNoteIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('ط­ط°ظپطں')) del.mutate(ev.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ط§ط±ط²غŒط§ط¨غŒ طھط£ظ…غŒظ†â€Œع©ظ†ظ†ط¯ظ‡</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth><InputLabel>ط·ط±ظپ ظ‚ط±ط§ط±ط¯ط§ط¯ *</InputLabel>
            <Select value={form.party || ''} label="ط·ط±ظپ ظ‚ط±ط§ط±ط¯ط§ط¯ *" onChange={e => setForm(p => ({ ...p, party: e.target.value }))}>
              {partyList.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Grid container spacing={1.5}>
            <Grid item xs={6}><TextField size="small" label="ط¯ظˆط±ظ‡" value={form.period || ''} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} /></Grid>
            <Grid item xs={6}><JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط§ط±ط²غŒط§ط¨غŒ" value={form.evaluation_date} onChange={(g) => setForm(p => ({ ...p, evaluation_date: g }))} /></Grid>
            <Grid item xs={6}>{scoreField('quality_score', 'ع©غŒظپغŒطھ (غ°-غ±غ°غ°)')}</Grid>
            <Grid item xs={6}>{scoreField('delivery_score', 'طھط­ظˆغŒظ„ (غ°-غ±غ°غ°)')}</Grid>
            <Grid item xs={6}>{scoreField('price_score', 'ظ‚غŒظ…طھ (غ°-غ±غ°غ°)')}</Grid>
            <Grid item xs={6}>{scoreField('cooperation_score', 'ظ‡ظ…ع©ط§ط±غŒ (غ°-غ±غ°غ°)')}</Grid>
            <Grid item xs={6}>{scoreField('safety_score', 'ط§غŒظ…ظ†غŒ (غ°-غ±غ°غ°)')}</Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>ظ†طھغŒط¬ظ‡</InputLabel>
                <Select value={form.recommendation || 'approved'} label="ظ†طھغŒط¬ظ‡" onChange={e => setForm(p => ({ ...p, recommendation: e.target.value }))}>
                  {Object.entries(RECOMMENDATIONS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <TextField size="small" label="ظ†ظ‚ط§ط· ظ‚ظˆطھ" multiline rows={2} value={form.strengths || ''} onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))} />
          <TextField size="small" label="ظ†ظ‚ط§ط· ط¶ط¹ظپ" multiline rows={2} value={form.weaknesses || ''} onChange={e => setForm(p => ({ ...p, weaknesses: e.target.value }))} />
          <TextField size="small" label="ط§ط±ط²غŒط§ط¨" value={form.evaluator || ''} onChange={e => setForm(p => ({ ...p, evaluator: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!form.party} onClick={() => save.mutate({ ...form, quality_score: Number(form.quality_score) || 0, delivery_score: Number(form.delivery_score) || 0, price_score: Number(form.price_score) || 0, cooperation_score: Number(form.cooperation_score) || 0, safety_score: Number(form.safety_score) || 0 })} sx={{ background: 'linear-gradient(135deg,#64748b,#8b5cf6)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ContractSettingsPage;
