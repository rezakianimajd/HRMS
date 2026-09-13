import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Chip, IconButton,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
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

const DISPUTE_TYPES = {
  financial: 'ظ…ط§ظ„غŒ', technical: 'ظپظ†غŒ', timeline: 'ط²ظ…ط§ظ†â€Œط¨ظ†ط¯غŒ / طھط£ط®غŒط±',
  quality: 'ع©غŒظپغŒطھ', legal: 'ط­ظ‚ظˆظ‚غŒ', other: 'ط³ط§غŒط±',
};

const DISPUTE_STATUS = {
  open: { label: 'ط¨ط§ط²', color: '#ef4444' },
  under_review: { label: 'ط¯ط± ط­ط§ظ„ ط¨ط±ط±ط³غŒ', color: '#f59e0b' },
  resolved: { label: 'ط­ظ„â€Œط´ط¯ظ‡', color: '#10b981' },
  escalated: { label: 'ط§ط±ط¬ط§ط¹ ط¨ط§ظ„ط§طھط±', color: '#8b5cf6' },
  closed: { label: 'ط¨ط³طھظ‡', color: '#64748b' },
};

const SEVERITY = {
  low: { label: 'ع©ظ…', color: '#10b981' },
  medium: { label: 'ظ…طھظˆط³ط·', color: '#f59e0b' },
  high: { label: 'ط²غŒط§ط¯', color: '#f97316' },
  critical: { label: 'ط¨ط­ط±ط§ظ†غŒ', color: '#ef4444' },
};

const ContractRiskPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(239,68,68,0.10), rgba(245,158,11,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#ef4444,#f59e0b)', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
          <WarningIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b91c1c">ظ…ط¯غŒط±غŒطھ ط±غŒط³ع© ظ‚ط±ط§ط±ط¯ط§ط¯</Typography>
          <Typography variant="body2" color="textSecondary">ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§غŒ ط±ظˆ ط¨ظ‡ ط§ظ†ظ‚ط¶ط§طŒ ظ‡ط´ط¯ط§ط±ظ‡ط§ ظˆ ط§ط®طھظ„ط§ظپط§طھ/ط¯ط¹ط§ظˆغŒ</Typography>
        </Box>
      </Paper>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<NotificationsActiveIcon />} label="ط±ظˆ ط¨ظ‡ ط§ظ†ظ‚ط¶ط§" />
        <Tab icon={<GavelIcon />} label="ط§ط®طھظ„ط§ظپط§طھ ظˆ ط¯ط¹ط§ظˆغŒ" />
      </Tabs>
      {tab === 0 && <ExpiringContracts />}
      {tab === 1 && <DisputesManager />}
    </Box>
  );
};

const ExpiringContracts = () => {
  const { data, isLoading } = useQuery({ queryKey: ['ext-contracts-risk'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const buckets = useMemo(() => {
    const now = new Date();
    const days = (d) => Math.ceil((new Date(d) - now) / 86400000);
    const withEnd = list.filter(c => c.end_date);
    return {
      expired: withEnd.filter(c => days(c.end_date) < 0),
      soon30: withEnd.filter(c => days(c.end_date) >= 0 && days(c.end_date) <= 30),
      soon60: withEnd.filter(c => days(c.end_date) > 30 && days(c.end_date) <= 60),
      soon90: withEnd.filter(c => days(c.end_date) > 60 && days(c.end_date) <= 90),
    };
  }, [list]);
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  const Section = ({ title, color, items }) => (
    <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <Typography variant="subtitle2" fontWeight={800}>{title}</Typography>
        <Chip size="small" label={formatPersianNumber(items.length)} sx={{ bgcolor: `${color}22`, color }} />
      </Box>
      {items.length === 0 ? <Typography variant="caption" color="textSecondary">ظ…ظˆط±ط¯غŒ ظ†غŒط³طھ</Typography> : (
        <Stack spacing={0.75}>
          {items.map(c => {
            const d = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
            return (
              <Paper key={c.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>{c.subject}</Typography>
                  <Typography variant="caption" color="textSecondary">{c.party_name}</Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">ظ¾ط§غŒط§ظ†: {toJalali(c.end_date)}</Typography>
                <Chip size="small" label={d < 0 ? `${formatPersianNumber(Math.abs(d))} ط±ظˆط² ع¯ط°ط´طھظ‡` : `${formatPersianNumber(d)} ط±ظˆط² ظ…ط§ظ†ط¯ظ‡`} sx={{ bgcolor: `${color}22`, color }} />
              </Paper>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
  return (
    <Box>
      <Section title="ظ…ظ†ظ‚ط¶غŒâ€Œط´ط¯ظ‡" color="#ef4444" items={buckets.expired} />
      <Section title="ط§ظ†ظ‚ط¶ط§ طھط§ غ³غ° ط±ظˆط²" color="#f97316" items={buckets.soon30} />
      <Section title="ط§ظ†ظ‚ط¶ط§ طھط§ غ¶غ° ط±ظˆط²" color="#f59e0b" items={buckets.soon60} />
      <Section title="ط§ظ†ظ‚ط¶ط§ طھط§ غ¹غ° ط±ظˆط²" color="#eab308" items={buckets.soon90} />
    </Box>
  );
};

const DisputesManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const { data: contracts } = useQuery({ queryKey: ['ext-contracts-disp'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];
  const { data, isLoading } = useQuery({ queryKey: ['contract-disputes'], queryFn: () => axiosInstance.get('/contract-disputes/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({ mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-disputes/${p.id}/`, p) : axiosInstance.post('/contract-disputes/', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-disputes'] }); setDialog(false); setForm({}); } });
  const del = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-disputes/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-disputes'] }) });
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>ط§ط®طھظ„ط§ظپط§طھ ظˆ ط¯ط¹ط§ظˆغŒ</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => { setForm({}); setDialog(true); }}>ط§ظپط²ظˆط¯ظ†</Button>
      </Box>
      {list.length === 0 ? <Typography variant="caption" color="textSecondary" textAlign="center">ط§ط®طھظ„ط§ظپغŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ</Typography> : (
        <Grid container spacing={2}>
          {list.map(d => (
            <Grid item xs={12} md={6} key={d.id}>
              <Paper sx={{ ...glassPaper, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <GavelIcon sx={{ color: SEVERITY[d.severity]?.color }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800}>{d.title}</Typography>
                    <Typography variant="caption" color="textSecondary">{d.contract_subject}</Typography>
                  </Box>
                  <Chip size="small" label={DISPUTE_STATUS[d.status]?.label} sx={{ bgcolor: `${DISPUTE_STATUS[d.status]?.color}22`, color: DISPUTE_STATUS[d.status]?.color }} />
                  <Chip size="small" label={SEVERITY[d.severity]?.label} sx={{ bgcolor: `${SEVERITY[d.severity]?.color}22`, color: SEVERITY[d.severity]?.color }} />
                </Box>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="textSecondary">ظ†ظˆط¹: {DISPUTE_TYPES[d.dispute_type]} آ· طھط§ط±غŒط®: {toJalali(d.opened_date)}</Typography>
                  {d.claim_amount ? <Typography variant="caption">ظ…ط¨ظ„ط؛ ط§ط¯ط¹ط§: {formatPersianNumber(d.claim_amount)} ط±غŒط§ظ„</Typography> : null}
                </Stack>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  <IconButton size="small" onClick={() => { setForm({ ...d }); setDialog(true); }}><EditNoteIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('ط­ط°ظپطں')) del.mutate(d.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'ظˆغŒط±ط§غŒط´ ط§ط®طھظ„ط§ظپ' : 'ط§ط®طھظ„ط§ظپ ط¬ط¯غŒط¯'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth><InputLabel>ظ‚ط±ط§ط±ط¯ط§ط¯ *</InputLabel>
            <Select value={form.contract || ''} label="ظ‚ط±ط§ط±ط¯ط§ط¯ *" onChange={e => setForm(p => ({ ...p, contract: e.target.value }))}>
              {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="ظ…ظˆط¶ظˆط¹ *" value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>ظ†ظˆط¹</InputLabel>
                <Select value={form.dispute_type || 'other'} label="ظ†ظˆط¹" onChange={e => setForm(p => ({ ...p, dispute_type: e.target.value }))}>
                  {Object.entries(DISPUTE_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>ط´ط¯طھ</InputLabel>
                <Select value={form.severity || 'medium'} label="ط´ط¯طھ" onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                  {Object.entries(SEVERITY).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl size="small" fullWidth><InputLabel>ظˆط¶ط¹غŒطھ</InputLabel>
                <Select value={form.status || 'open'} label="ظˆط¶ط¹غŒطھ" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {Object.entries(DISPUTE_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField size="small" label="ظ…ط¨ظ„ط؛ ط§ط¯ط¹ط§" type="number" value={form.claim_amount ?? ''} onChange={e => setForm(p => ({ ...p, claim_amount: e.target.value }))} /></Grid>
          </Grid>
          <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط·ط±ط­" value={form.opened_date} onChange={(g) => setForm(p => ({ ...p, opened_date: g }))} />
          <TextField size="small" label="ط´ط±ط­" multiline rows={2} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <TextField size="small" label="ط§ظ‚ط¯ط§ظ… / ظ†طھغŒط¬ظ‡" multiline rows={2} value={form.resolution || ''} onChange={e => setForm(p => ({ ...p, resolution: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!form.title || !form.contract} onClick={() => save.mutate({ ...form, claim_amount: Number(form.claim_amount) || null })} sx={{ background: 'linear-gradient(135deg,#ef4444,#f59e0b)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ContractRiskPage;
