import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, IconButton, Tooltip,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'فعال',
  on_hold: 'متوقف',
  completed: 'تکمیل‌شده',
  closed: 'بسته',
};

const STATUS_COLORS = {
  draft: '#64748b', active: '#10b981', on_hold: '#f59e0b',
  completed: '#3b82f6', closed: '#64748b',
};

const EMPTY_PROJECT = {
  id: null, code: '', name: '', project_type: '', manager: '',
  client: '', location: '', start_date: '', end_date: '', status: 'draft', description: '',
};

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
  borderRadius: 10,
};

/* Generic simple entity manager (used for CBS / Resource / CostSource / ProjectType) */
const SimpleEntityList = ({ queryKey, endpoint, title, color, icon, fields }) => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ id: null });

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => axiosInstance.get(endpoint).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`${endpoint}${payload.id}/`, payload)
        : axiosInstance.post(endpoint, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
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
        <Typography variant="subtitle2" fontWeight={800} color={color}>{title}</Typography>
        <Button size="small" startIcon={<AddIcon />} variant="outlined"
          onClick={() => { setForm({ id: null }); setDialog(true); }}>افزودن</Button>
      </Box>
      <Stack spacing={0.75}>
        {list.map(item => (
          <Paper key={item.id} variant="outlined" sx={{ p: 1, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 26, height: 26, background: color }}>{icon}</Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{item.name}</Typography>
              {item.code && <Typography variant="caption" color="textSecondary">{item.code}</Typography>}
            </Box>
            <IconButton size="small" onClick={() => { setForm(item); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) remove.mutate(item.id); }}><DeleteIcon fontSize="small" /></IconButton>
          </Paper>
        ))}
        {list.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">موردی نیست</Typography>}
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

const ProjectsPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_PROJECT);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => axiosInstance.get('/projects/').then(r => r.data),
  });
  const projects = Array.isArray(data) ? data : data?.results || [];

  const { data: types } = useQuery({
    queryKey: ['project-types'],
    queryFn: () => axiosInstance.get('/project-types/').then(r => r.data),
  });
  const typeList = Array.isArray(types) ? types : types?.results || [];

  const save = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`/projects/${payload.id}/`, payload)
        : axiosInstance.post('/projects/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setDialog(false);
      setForm(EMPTY_PROJECT);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/projects/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.10), rgba(59,130,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.18)', borderRadius: 10 }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
          <AccountTreeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#7c3aed">مدیریت پروژه و بهای تمام‌شده</Typography>
          <Typography variant="body2" color="textSecondary">فاز ۰ — زیرساخت پروژه، WBS، CBS، منابع، OBS و منشأ هزینه</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY_PROJECT); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', borderRadius: 10 }}>
          پروژه جدید
        </Button>
      </Paper>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab label={`پروژه‌ها (${formatPersianNumber(projects.length)})`} />
        <Tab label="WBS / CBS" />
        <Tab label="منابع (RBS)" />
        <Tab label="منشأ هزینه" />
        <Tab label="OBS" />
        <Tab label="انواع پروژه" />
      </Tabs>

      {tab === 0 && (
        <Paper sx={{ ...glassPaper, p: 2 }}>
          {projects.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>پروژه‌ای تعریف نشده است.</Typography>
          ) : (
            <Stack spacing={1.25}>
              {projects.map(p => (
                <Paper key={p.id} variant="outlined" sx={{ p: 1.75, borderRadius: 10, background: 'rgba(255,255,255,0.5)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Avatar sx={{ width: 42, height: 42, background: STATUS_COLORS[p.status] || '#64748b' }}>
                      <AccountTreeIcon sx={{ color: '#fff' }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 180 }}>
                      <Typography variant="body2" fontWeight={800}>{p.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        کد: {p.code} · نوع: {p.project_type_name} · کارفرما: {p.client || '—'}
                      </Typography>
                    </Box>
                    <Chip size="small" label={STATUS_LABELS[p.status]} sx={{ color: '#fff', bgcolor: STATUS_COLORS[p.status] }} />
                    <Typography variant="caption" color="textSecondary">
                      {toJalali(p.start_date)} تا {toJalali(p.end_date)}
                    </Typography>
                    <IconButton size="small" onClick={() => { setForm({ ...p }); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف پروژه؟')) remove.mutate(p.id); }}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ ...glassPaper, p: 2 }}>
              <SimpleEntityList queryKey="cbs-tree" endpoint="/cbs-nodes/" title="ساختار شکست هزینه (CBS)"
                color="#0ea5e9" icon={<span style={{ fontSize: 14, color: '#fff' }}>C</span>}
                fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام' }]} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ ...glassPaper, p: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#8b5cf6" sx={{ mb: 1.5 }}>WBS — ساختار شکست کار</Typography>
              <Typography variant="body2" color="textSecondary">
                WBS بهصورت Project-specific است. پس از انتخاب پروژه، گره‌های آن (در فازهای بعدی UI درختی) مدیریت می‌شوند.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <Paper sx={{ ...glassPaper, p: 2 }}>
          <SimpleEntityList queryKey="resource-categories" endpoint="/resource-categories/" title="دسته منابع"
            color="#10b981" icon={<span style={{ fontSize: 14, color: '#fff' }}>R</span>}
            fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'عنوان' }]} />
        </Paper>
      )}

      {tab === 3 && (
        <Paper sx={{ ...glassPaper, p: 2 }}>
          <SimpleEntityList queryKey="cost-sources" endpoint="/cost-sources/" title="منشأ هزینه"
            color="#f59e0b" icon={<span style={{ fontSize: 14, color: '#fff' }}>$</span>}
            fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'عنوان' }]} />
        </Paper>
      )}

      {tab === 4 && (
        <Paper sx={{ ...glassPaper, p: 2 }}>
          <SimpleEntityList queryKey="obs-nodes" endpoint="/obs-nodes/" title="ساختار شکست سازمانی (OBS)"
            color="#ef4444" icon={<span style={{ fontSize: 14, color: '#fff' }}>O</span>}
            fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام' }]} />
        </Paper>
      )}

      {tab === 5 && (
        <Paper sx={{ ...glassPaper, p: 2 }}>
          <SimpleEntityList queryKey="project-types" endpoint="/project-types/" title="انواع پروژه"
            color="#6366f1" icon={<span style={{ fontSize: 14, color: '#fff' }}>P</span>}
            fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'عنوان' }]} />
        </Paper>
      )}

      {/* Project dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش پروژه' : 'پروژه جدید'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}><TextField size="small" fullWidth label="کد پروژه" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></Grid>
            <Grid item xs={12} md={8}><TextField size="small" fullWidth label="نام پروژه *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth><InputLabel>نوع پروژه</InputLabel>
                <Select value={form.project_type || ''} label="نوع پروژه" onChange={e => setForm(p => ({ ...p, project_type: e.target.value }))}>
                  {typeList.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth><InputLabel>وضعیت</InputLabel>
                <Select value={form.status} label="وضعیت" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}><TextField size="small" fullWidth label="کارفرما" value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="محل اجرا" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><JalaliDatePicker fullWidth label="تاریخ شروع" value={form.start_date} onChange={(g) => setForm(p => ({ ...p, start_date: g }))} /></Grid>
            <Grid item xs={12} md={3}><JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date} onChange={(g) => setForm(p => ({ ...p, end_date: g }))} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="توضیحات" multiline rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.name || !form.code}
            onClick={() => save.mutate(form)} sx={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsPage;