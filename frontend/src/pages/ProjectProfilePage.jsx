import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LockIcon from '@mui/icons-material/Lock';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { glassPaper, STATUS_LABELS, STATUS_COLORS, SimpleEntityList } from './projects/ProjectsShared';

const ProjectProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => axiosInstance.get(`/projects/${id}/`).then(r => r.data),
    enabled: !!id,
  });

  const { data: employees } = useQuery({
    queryKey: ['emp-dropdown-proj'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 500 } }).then(r => r.data.results || r.data),
  });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const { data: phases } = useQuery({
    queryKey: ['project-phases', id],
    queryFn: () => axiosInstance.get('/project-phases/', { params: { project: id, page_size: 500 } }).then(r => r.data),
    enabled: !!id,
  });
  const phaseList = Array.isArray(phases) ? phases : phases?.results || [];

  const { data: wbs } = useQuery({
    queryKey: ['project-wbs', id],
    queryFn: () => axiosInstance.get('/wbs-nodes/', { params: { project: id, page_size: 500 } }).then(r => r.data),
    enabled: !!id,
  });
  const wbsList = Array.isArray(wbs) ? wbs : wbs?.results || [];

  const { data: budgets } = useQuery({
    queryKey: ['project-budgets', id],
    queryFn: () => axiosInstance.get('/budget-lines/', { params: { project: id, page_size: 500 } }).then(r => r.data),
    enabled: !!id,
  });
  const budgetList = Array.isArray(budgets) ? budgets : budgets?.results || [];

  const { data: progress } = useQuery({
    queryKey: ['project-progress', id],
    queryFn: () => axiosInstance.get('/progress-statements/', { params: { project: id, page_size: 500 } }).then(r => r.data),
    enabled: !!id,
  });
  const progressList = Array.isArray(progress) ? progress : progress?.results || [];

  const { data: committed } = useQuery({
    queryKey: ['project-committed', id],
    queryFn: () => axiosInstance.get('/committed-costs/', { params: { project: id, page_size: 500 } }).then(r => r.data),
    enabled: !!id,
  });
  const committedList = Array.isArray(committed) ? committed : committed?.results || [];

  const update = useMutation({
    mutationFn: (payload) => axiosInstance.patch(`/projects/${id}/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      setEditOpen(false);
    },
  });

  if (isLoading || !project) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const budgetTotal = budgetList.reduce((s, x) => s + Number(x.amount || 0), 0);
  const committedTotal = committedList.reduce((s, x) => s + Number(x.amount || 0), 0);
  const progressTotal = progressList.reduce((s, x) => s + Number(x.gross || 0), 0);

  const kpi = (title, value, color, icon) => (
    <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
      <Avatar sx={{ width: 42, height: 42, background: `linear-gradient(135deg,${color},${color}99)`, mx: 'auto', mb: 1 }}>{icon}</Avatar>
      <Typography variant="caption" color="textSecondary">{title}</Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color }}>{formatPersianNumber(value)}</Typography>
    </Paper>
  );

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} sx={{ mb: 1 }}>بازگشت به پروژه‌ها</Button>

      <Paper sx={{ p: 2.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.10), rgba(59,130,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 60, height: 60, background: `linear-gradient(135deg,${STATUS_COLORS[project.status] || '#8b5cf6'},#3b82f6)` }}>
          <AccountTreeIcon sx={{ color: '#fff', fontSize: 32 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#7c3aed">{project.name}</Typography>
          <Typography variant="body2" color="textSecondary">
            کد: {project.code} · نوع: {project.project_type_name || '—'} · مدیر: {project.manager_name || '—'}
          </Typography>
        </Box>
        <Chip size="small" label={STATUS_LABELS[project.status] || project.status} sx={{ color: '#fff', bgcolor: STATUS_COLORS[project.status] || '#64748b' }} />
        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => { setForm({ ...project }); setEditOpen(true); }}>ویرایش</Button>
      </Paper>

      <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="textSecondary" display="block">کارفرما</Typography><Typography variant="body2" fontWeight={700}>{project.client || '—'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="textSecondary" display="block">محل اجرا</Typography><Typography variant="body2" fontWeight={700}>{project.location || '—'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="textSecondary" display="block">تاریخ شروع</Typography><Typography variant="body2" fontWeight={700}>{toJalali(project.start_date)}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography variant="caption" color="textSecondary" display="block">تاریخ پایان</Typography><Typography variant="body2" fontWeight={700}>{toJalali(project.end_date)}</Typography></Grid>
          {project.description && (
            <Grid item xs={12}><Typography variant="caption" color="textSecondary" display="block">توضیحات</Typography><Typography variant="body2">{project.description}</Typography></Grid>
          )}
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>{kpi('بودجه', budgetTotal, '#3b82f6', <AccountBalanceWalletIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={6} md={3}>{kpi('تعهدات', committedTotal, '#8b5cf6', <LockIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={6} md={3}>{kpi('ارزش صورت‌وضعیت', progressTotal, '#10b981', <AssessmentIcon sx={{ color: '#fff' }} />)}</Grid>
        <Grid item xs={12} sm={6} md={3}>{kpi('گره‌های WBS', wbsList.length, '#f59e0b', <ReceiptIcon sx={{ color: '#fff' }} />)}</Grid>
      </Grid>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab label={`فازها (${phaseList.length})`} />
        <Tab label={`WBS (${wbsList.length})`} />
        <Tab label={`بودجه (${budgetList.length})`} />
        <Tab label={`صورت‌وضعیت (${progressList.length})`} />
      </Tabs>

      <Box sx={{ ...glassPaper, p: 2 }}>
        {tab === 0 && (
          <SimpleEntityList queryKey={['project-phases', id]} endpoint="/project-phases/" title="فازهای پروژه"
            color="#8b5cf6" icon={<span style={{ fontSize: 14, color: '#fff' }}>F</span>}
            params={{ project: Number(id) }}
            fields={[{ key: 'name', label: 'عنوان فاز' }, { key: 'sequence', label: 'ترتیب' }]} />
        )}
        {tab === 1 && (
          <SimpleEntityList queryKey={['project-wbs', id]} endpoint="/wbs-nodes/" title="ساختار شکست کار (WBS)"
            color="#3b82f6" icon={<span style={{ fontSize: 14, color: '#fff' }}>W</span>}
            params={{ project: Number(id) }}
            fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام' }]} />
        )}
        {tab === 2 && (
          <SimpleEntityList queryKey={['project-budgets', id]} endpoint="/budget-lines/" title="ردیف‌های بودجه"
            color="#0ea5e9" icon={<span style={{ fontSize: 14, color: '#fff' }}>B</span>}
            params={{ project: Number(id) }}
            fields={[{ key: 'description', label: 'شرح' }, { key: 'quantity', label: 'مقدار' }, { key: 'amount', label: 'مبلغ' }]} />
        )}
        {tab === 3 && (
          <SimpleEntityList queryKey={['project-progress', id]} endpoint="/progress-statements/" title="صورت‌وضعیت‌ها"
            color="#10b981" icon={<span style={{ fontSize: 14, color: '#fff' }}>S</span>}
            params={{ project: Number(id) }}
            fields={[{ key: 'number', label: 'شماره' }, { key: 'gross', label: 'ناخالص' }, { key: 'net_payable', label: 'قابل پرداخت' }]} />
        )}
      </Box>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>ویرایش پروژه</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {form && (
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}><TextField size="small" fullWidth label="کد پروژه" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></Grid>
              <Grid item xs={12} md={8}><TextField size="small" fullWidth label="نام پروژه *" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}>
                <FormControl size="small" fullWidth><InputLabel>مدیر پروژه</InputLabel>
                  <Select value={form.manager || ''} label="مدیر پروژه" onChange={e => setForm(p => ({ ...p, manager: e.target.value }))}>
                    {empList.map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl size="small" fullWidth><InputLabel>وضعیت</InputLabel>
                  <Select value={form.status || 'draft'} label="وضعیت" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}><TextField size="small" fullWidth label="کارفرما" value={form.client || ''} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField size="small" fullWidth label="محل اجرا" value={form.location || ''} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><JalaliDatePicker fullWidth label="تاریخ شروع" value={form.start_date} onChange={(g) => setForm(p => ({ ...p, start_date: g }))} /></Grid>
              <Grid item xs={12} md={3}><JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date} onChange={(g) => setForm(p => ({ ...p, end_date: g }))} /></Grid>
              <Grid item xs={12}><TextField size="small" fullWidth label="توضیحات" multiline rows={2} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => update.mutate(form)}
            sx={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectProfilePage;


