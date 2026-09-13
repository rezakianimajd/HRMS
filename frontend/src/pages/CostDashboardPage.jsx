import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Chip, Divider,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LockIcon from '@mui/icons-material/Lock';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '10px',
};

const CostDashboardPage = () => {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [tab, setTab] = useState(0);

  const { data: projects } = useQuery({ queryKey: ['projects-cost'], queryFn: () => axiosInstance.get('/projects/').then(r => r.data) });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  const { data: budgets } = useQuery({ queryKey: ['budget-lines', projectId], queryFn: () => axiosInstance.get('/budget-lines/', { params: { project: projectId } }).then(r => r.data), enabled: !!projectId });
  const budgetList = Array.isArray(budgets) ? budgets : budgets?.results || [];

  const { data: committed } = useQuery({ queryKey: ['committed-costs', projectId], queryFn: () => axiosInstance.get('/committed-costs/', { params: { project: projectId } }).then(r => r.data), enabled: !!projectId });
  const committedList = Array.isArray(committed) ? committed : committed?.results || [];

  const { data: transactions } = useQuery({ queryKey: ['cost-transactions', projectId], queryFn: () => axiosInstance.get('/cost-transactions/', { params: { project: projectId } }).then(r => r.data), enabled: !!projectId });
  const txList = Array.isArray(transactions) ? transactions : transactions?.results || [];

  const { data: progress } = useQuery({ queryKey: ['progress-statements', projectId], queryFn: () => axiosInstance.get('/progress-statements/', { params: { project: projectId } }).then(r => r.data), enabled: !!projectId });
  const progressList = Array.isArray(progress) ? progress : progress?.results || [];

  const totals = useMemo(() => {
    const sum = (arr, field) => arr.reduce((s, x) => s + Number(x[field] || 0), 0);
    return {
      budget: sum(budgetList, 'amount'),
      committed: sum(committedList, 'amount'),
      actual: sum(txList, 'total_amount'),
      progress: sum(progressList, 'gross'),
    };
  }, [budgetList, committedList, txList, progressList]);

  const card = (title, value, color, icon) => (
    <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
      <Avatar sx={{ width: 42, height: 42, background: `linear-gradient(135deg,${color},${color}99)`, mx: 'auto', mb: 1 }}>{icon}</Avatar>
      <Typography variant="caption" color="textSecondary">{title}</Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color }}>{formatPersianNumber(value)}</Typography>
    </Paper>
  );

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(16,185,129,0.10), rgba(59,130,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#10b981,#3b82f6)', boxShadow: '0 8px 24px rgba(16,185,129,0.4)' }}>
          <AssessmentIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#047857">ع©ظ†طھط±ظ„ ظ¾ط±ظˆعکظ‡ ظˆ ط¨ظ‡ط§غŒ طھظ…ط§ظ…â€Œط´ط¯ظ‡</Typography>
          <Typography variant="body2" color="textSecondary">ظپط§ط² غ² â€” ط¯ط§ط´ط¨ظˆط±ط¯ ظ‡ط²غŒظ†ظ‡طŒ ط¨ظˆط¯ط¬ظ‡طŒ طھط¹ظ‡ط¯طŒ ظ‡ط²غŒظ†ظ‡ ظˆط§ظ‚ط¹غŒ ظˆ طµظˆط±طھâ€Œظˆط¶ط¹غŒطھ</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>ظ¾ط±ظˆعکظ‡</InputLabel>
          <Select value={projectId || ''} label="ظ¾ط±ظˆعکظ‡" onChange={e => setProjectId(e.target.value)}>
            {projectList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {projectId ? (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>{card('ط¨ظˆط¯ط¬ظ‡', totals.budget, '#3b82f6', <AccountBalanceWalletIcon sx={{ color: '#fff' }} />)}</Grid>
            <Grid item xs={12} sm={6} md={3}>{card('طھط¹ظ‡ط¯', totals.committed, '#8b5cf6', <LockIcon sx={{ color: '#fff' }} />)}</Grid>
            <Grid item xs={12} sm={6} md={3}>{card('ظ‡ط²غŒظ†ظ‡ ظˆط§ظ‚ط¹غŒ', totals.actual, '#ef4444', <ReceiptIcon sx={{ color: '#fff' }} />)}</Grid>
            <Grid item xs={12} sm={6} md={3}>{card('ط§ط±ط²ط´ ظ¾غŒط´ط±ظپطھ', totals.progress, '#10b981', <AssessmentIcon sx={{ color: '#fff' }} />)}</Grid>
          </Grid>

          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="ظ‡ط²غŒظ†ظ‡â€Œظ‡ط§" />
            <Tab label="ط¨ظˆط¯ط¬ظ‡" />
            <Tab label="طھط¹ظ‡ط¯ط§طھ" />
            <Tab label="طµظˆط±طھâ€Œظˆط¶ط¹غŒطھâ€Œظ‡ط§" />
          </Tabs>

          {tab === 0 && <CostTransactionsManager projectId={projectId} />}
          {tab === 1 && <BudgetManager projectId={projectId} />}
          {tab === 2 && <CommittedManager projectId={projectId} />}
          {tab === 3 && <ProgressManager projectId={projectId} />}
        </>
      ) : (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">غŒع© ظ¾ط±ظˆعکظ‡ ط¨ط±ط§غŒ ظ…ط´ط§ظ‡ط¯ظ‡ ع©ظ†طھط±ظ„ ظ‡ط²غŒظ†ظ‡ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯.</Typography>
        </Paper>
      )}
    </Box>
  );
};

/* ---- actual cost transactions ---- */
const CostTransactionsManager = ({ projectId }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ number: '', date: '', cost_source: '', description: '' });

  const { data: sources } = useQuery({ queryKey: ['cost-sources'], queryFn: () => axiosInstance.get('/cost-sources/').then(r => r.data) });
  const sourceList = Array.isArray(sources) ? sources : sources?.results || [];

  const { data: raw } = useQuery({ queryKey: ['cost-transactions', projectId], queryFn: () => axiosInstance.get('/cost-transactions/', { params: { project: projectId } }).then(r => r.data) });
  const list = Array.isArray(raw) ? raw : raw?.results || [];

  const create = useMutation({
    mutationFn: (p) => axiosInstance.post('/cost-transactions/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cost-transactions'] }); setDialog(false); setForm({ number: '', date: '', cost_source: '', description: '' }); },
  });

  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>طھط±ط§ع©ظ†ط´â€Œظ‡ط§غŒ ظ‡ط²غŒظ†ظ‡</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setDialog(true)}>ط§ظپط²ظˆط¯ظ†</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(t => (
          <Paper key={t.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
            <Typography variant="body2" fontWeight={700}>{t.number || 'â”€â”€'} آ· {toJalali(t.date)} آ· {formatPersianNumber(t.total_amount)}</Typography>
            <Typography variant="caption" color="textSecondary">{t.description}</Typography>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">ظ‡ط²غŒظ†ظ‡â€Œط§غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>طھط±ط§ع©ظ†ط´ ظ‡ط²غŒظ†ظ‡</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="ط´ظ…ط§ط±ظ‡ ط³ظ†ط¯" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
          <JalaliDatePicker fullWidth label="طھط§ط±غŒط®" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} />
          <FormControl size="small" fullWidth><InputLabel>ظ…ظ†ط´ط£ ظ‡ط²غŒظ†ظ‡</InputLabel>
            <Select value={form.cost_source || ''} label="ظ…ظ†ط´ط£ ظ‡ط²غŒظ†ظ‡" onChange={e => setForm(p => ({ ...p, cost_source: e.target.value }))}>
              {sourceList.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="طھظˆط¶غŒط­" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" onClick={() => create.mutate({ ...form, project: projectId })}
            sx={{ background: 'linear-gradient(135deg,#ef4444,#8b5cf6)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

/* ---- budget ---- */
const BudgetManager = ({ projectId }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});

  const { data: wbs } = useQuery({ queryKey: ['wbs-budget', projectId], queryFn: () => axiosInstance.get('/wbs-nodes/', { params: { project: projectId } }).then(r => r.data) });
  const wbsList = Array.isArray(wbs) ? wbs : wbs?.results || [];

  const { data: cbs } = useQuery({ queryKey: ['cbs-budget'], queryFn: () => axiosInstance.get('/cbs-nodes/').then(r => r.data) });
  const cbsList = Array.isArray(cbs) ? cbs : cbs?.results || [];

  const { data: raw } = useQuery({ queryKey: ['budget-lines', projectId], queryFn: () => axiosInstance.get('/budget-lines/', { params: { project: projectId } }).then(r => r.data) });
  const list = Array.isArray(raw) ? raw : raw?.results || [];

  const create = useMutation({
    mutationFn: (p) => axiosInstance.post('/budget-lines/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-lines'] }); setDialog(false); setForm({}); },
  });

  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>ط¨ظˆط¯ط¬ظ‡</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setDialog(true)}>ط§ظپط²ظˆط¯ظ†</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(b => (
          <Paper key={b.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
            <Typography variant="body2" fontWeight={700}>{b.description || 'â”€â”€'} آ· {formatPersianNumber(b.amount)}</Typography>
            <Typography variant="caption" color="textSecondary">{b.wbs_name} آ· {b.cbs_name}</Typography>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">ط¨ظˆط¯ط¬ظ‡â€Œط§غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ط±ط¯غŒظپ ط¨ظˆط¯ط¬ظ‡</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth><InputLabel>WBS</InputLabel>
            <Select value={form.wbs || ''} label="WBS" onChange={e => setForm(p => ({ ...p, wbs: e.target.value }))}>
              {wbsList.map(w => <MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth><InputLabel>CBS</InputLabel>
            <Select value={form.cbs || ''} label="CBS" onChange={e => setForm(p => ({ ...p, cbs: e.target.value }))}>
              {cbsList.map(c => <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Grid container spacing={1.5}>
            <Grid item xs={4}><TextField size="small" label="ظ…ظ‚ط¯ط§ط±" type="number" value={form.quantity ?? ''} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="ظˆط§ط­ط¯" value={form.unit || ''} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="ظ†ط±ط®" type="number" value={form.unit_cost ?? ''} onChange={e => setForm(p => ({ ...p, unit_cost: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" onClick={() => create.mutate({ ...form, project: projectId, amount: (Number(form.quantity) || 0) * (Number(form.unit_cost) || 0) })}
            sx={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

/* ---- committed ---- */
const CommittedManager = ({ projectId }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});

  const { data: raw } = useQuery({ queryKey: ['committed-costs', projectId], queryFn: () => axiosInstance.get('/committed-costs/', { params: { project: projectId } }).then(r => r.data) });
  const list = Array.isArray(raw) ? raw : raw?.results || [];

  const create = useMutation({
    mutationFn: (p) => axiosInstance.post('/committed-costs/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['committed-costs'] }); setDialog(false); setForm({}); },
  });

  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>طھط¹ظ‡ط¯ط§طھ</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setDialog(true)}>ط§ظپط²ظˆط¯ظ†</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(c => (
          <Paper key={c.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
            <Typography variant="body2" fontWeight={700}>{c.description || 'â”€â”€'} آ· {formatPersianNumber(c.amount)}</Typography>
            <Typography variant="caption" color="textSecondary">{c.reference}</Typography>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">طھط¹ظ‡ط¯غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>طھط¹ظ‡ط¯ ظ‡ط²غŒظ†ظ‡</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="ط´ط±ط­" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <TextField size="small" label="ظ…ط¨ظ„ط؛" type="number" value={form.amount ?? ''} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
          <TextField size="small" label="ظ…ط±ط¬ط¹" value={form.reference || ''} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" onClick={() => create.mutate({ ...form, project: projectId, amount: Number(form.amount) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#8b5cf6,#10b981)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

/* ---- progress ---- */
const ProgressManager = ({ projectId }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});

  const { data: raw } = useQuery({ queryKey: ['progress-statements', projectId], queryFn: () => axiosInstance.get('/progress-statements/', { params: { project: projectId } }).then(r => r.data) });
  const list = Array.isArray(raw) ? raw : raw?.results || [];

  const create = useMutation({
    mutationFn: (p) => axiosInstance.post('/progress-statements/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['progress-statements'] }); setDialog(false); setForm({}); },
  });

  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={800}>طµظˆط±طھâ€Œظˆط¶ط¹غŒطھâ€Œظ‡ط§</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setDialog(true)}>ط§ظپط²ظˆط¯ظ†</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(s => (
          <Paper key={s.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
            <Typography variant="body2" fontWeight={700}>{s.number || 'â”€â”€'} آ· {toJalali(s.date)} آ· {formatPersianNumber(s.gross)}</Typography>
            <Typography variant="caption" color="textSecondary">ظ‚ط§ط¨ظ„ ظ¾ط±ط¯ط§ط®طھ: {formatPersianNumber(s.net_payable)}</Typography>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">طµظˆط±طھâ€Œظˆط¶ط¹غŒطھغŒ ط«ط¨طھ ظ†ط´ط¯ظ‡</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>طµظˆط±طھâ€Œظˆط¶ط¹غŒطھ</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="ط´ظ…ط§ط±ظ‡" value={form.number || ''} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
          <JalaliDatePicker fullWidth label="طھط§ط±غŒط®" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} />
          <TextField size="small" label="ظ…ط¨ظ„ط؛ ظ†ط§ط®ط§ظ„طµ" type="number" value={form.gross ?? ''} onChange={e => setForm(p => ({ ...p, gross: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" onClick={() => create.mutate({ ...form, project: projectId, gross: Number(form.gross) || 0, net_payable: Number(form.gross) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CostDashboardPage;