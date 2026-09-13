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
          <Typography variant="h6" fontWeight={800} color="#047857">کنترل پروژه و بهای تمام‌شده</Typography>
          <Typography variant="body2" color="textSecondary">فاز ۲ — داشبورد هزینه، بودجه، تعهد، هزینه واقعی و صورت‌وضعیت</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>پروژه</InputLabel>
          <Select value={projectId || ''} label="پروژه" onChange={e => setProjectId(e.target.value)}>
            {projectList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {projectId ? (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>{card('بودجه', totals.budget, '#3b82f6', <AccountBalanceWalletIcon sx={{ color: '#fff' }} />)}</Grid>
            <Grid item xs={12} sm={6} md={3}>{card('تعهد', totals.committed, '#8b5cf6', <LockIcon sx={{ color: '#fff' }} />)}</Grid>
            <Grid item xs={12} sm={6} md={3}>{card('هزینه واقعی', totals.actual, '#ef4444', <ReceiptIcon sx={{ color: '#fff' }} />)}</Grid>
            <Grid item xs={12} sm={6} md={3}>{card('ارزش پیشرفت', totals.progress, '#10b981', <AssessmentIcon sx={{ color: '#fff' }} />)}</Grid>
          </Grid>

          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="هزینه‌ها" />
            <Tab label="بودجه" />
            <Tab label="تعهدات" />
            <Tab label="صورت‌وضعیت‌ها" />
          </Tabs>

          {tab === 0 && <CostTransactionsManager projectId={projectId} />}
          {tab === 1 && <BudgetManager projectId={projectId} />}
          {tab === 2 && <CommittedManager projectId={projectId} />}
          {tab === 3 && <ProgressManager projectId={projectId} />}
        </>
      ) : (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">یک پروژه برای مشاهده کنترل هزینه انتخاب کنید.</Typography>
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
        <Typography variant="subtitle2" fontWeight={800}>تراکنش‌های هزینه</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setDialog(true)}>افزودن</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(t => (
          <Paper key={t.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
            <Typography variant="body2" fontWeight={700}>{t.number || '──'} · {toJalali(t.date)} · {formatPersianNumber(t.total_amount)}</Typography>
            <Typography variant="caption" color="textSecondary">{t.description}</Typography>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">هزینه‌ای ثبت نشده</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تراکنش هزینه</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="شماره سند" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
          <JalaliDatePicker fullWidth label="تاریخ" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} />
          <FormControl size="small" fullWidth><InputLabel>منشأ هزینه</InputLabel>
            <Select value={form.cost_source || ''} label="منشأ هزینه" onChange={e => setForm(p => ({ ...p, cost_source: e.target.value }))}>
              {sourceList.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="توضیح" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => create.mutate({ ...form, project: projectId })}
            sx={{ background: 'linear-gradient(135deg,#ef4444,#8b5cf6)' }}>ذخیره</Button>
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
        <Typography variant="subtitle2" fontWeight={800}>بودجه</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setDialog(true)}>افزودن</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(b => (
          <Paper key={b.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
            <Typography variant="body2" fontWeight={700}>{b.description || '──'} · {formatPersianNumber(b.amount)}</Typography>
            <Typography variant="caption" color="textSecondary">{b.wbs_name} · {b.cbs_name}</Typography>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">بودجه‌ای ثبت نشده</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ردیف بودجه</DialogTitle>
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
            <Grid item xs={4}><TextField size="small" label="مقدار" type="number" value={form.quantity ?? ''} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="واحد" value={form.unit || ''} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="نرخ" type="number" value={form.unit_cost ?? ''} onChange={e => setForm(p => ({ ...p, unit_cost: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => create.mutate({ ...form, project: projectId, amount: (Number(form.quantity) || 0) * (Number(form.unit_cost) || 0) })}
            sx={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>ذخیره</Button>
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
        <Typography variant="subtitle2" fontWeight={800}>تعهدات</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setDialog(true)}>افزودن</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(c => (
          <Paper key={c.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
            <Typography variant="body2" fontWeight={700}>{c.description || '──'} · {formatPersianNumber(c.amount)}</Typography>
            <Typography variant="caption" color="textSecondary">{c.reference}</Typography>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">تعهدی ثبت نشده</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تعهد هزینه</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="شرح" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <TextField size="small" label="مبلغ" type="number" value={form.amount ?? ''} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
          <TextField size="small" label="مرجع" value={form.reference || ''} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => create.mutate({ ...form, project: projectId, amount: Number(form.amount) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#8b5cf6,#10b981)' }}>ذخیره</Button>
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
        <Typography variant="subtitle2" fontWeight={800}>صورت‌وضعیت‌ها</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setDialog(true)}>افزودن</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(s => (
          <Paper key={s.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
            <Typography variant="body2" fontWeight={700}>{s.number || '──'} · {toJalali(s.date)} · {formatPersianNumber(s.gross)}</Typography>
            <Typography variant="caption" color="textSecondary">قابل پرداخت: {formatPersianNumber(s.net_payable)}</Typography>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">صورت‌وضعیتی ثبت نشده</Typography>}
      </Stack>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>صورت‌وضعیت</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="شماره" value={form.number || ''} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
          <JalaliDatePicker fullWidth label="تاریخ" value={form.date} onChange={(g) => setForm(p => ({ ...p, date: g }))} />
          <TextField size="small" label="مبلغ ناخالص" type="number" value={form.gross ?? ''} onChange={e => setForm(p => ({ ...p, gross: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => create.mutate({ ...form, project: projectId, gross: Number(form.gross) || 0, net_payable: Number(form.gross) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CostDashboardPage;