import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, IconButton, Tooltip, InputAdornment, Pagination,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { useNavigate } from 'react-router-dom';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { glassPaper, STATUS_LABELS, STATUS_COLORS } from './projects/ProjectsShared';

const EMPTY_PROJECT = {
  id: null, code: '', name: '', project_type: '', manager: '',
  client: '', location: '', start_date: '', end_date: '', status: 'draft', description: '',
};

const ProjectsPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_PROJECT);
  const PAGE_SIZE = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, search],
    queryFn: () => axiosInstance.get('/projects/', { params: { page, page_size: PAGE_SIZE, search: search || undefined } }).then(r => r.data),
  });
  const projects = Array.isArray(data) ? data : data?.results || [];
  const total = data?.count || projects.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: types } = useQuery({
    queryKey: ['project-types'],
    queryFn: () => axiosInstance.get('/project-types/', { params: { page_size: 500 } }).then(r => r.data),
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
        border: '1px solid rgba(139,92,246,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
          <AccountTreeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#7c3aed">پروژه‌ها ({formatPersianNumber(total)})</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت پروژه‌ها، ساختارها و منابع</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY_PROJECT); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', borderRadius: '10px' }}>
          پروژه جدید
        </Button>
      </Paper>

      <TextField size="small" fullWidth sx={{ mb: 2 }} placeholder="جستجوی پروژه (کد، نام، کارفرما)..."
        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        }} />

      <Paper sx={{ ...glassPaper, p: 2 }}>
        <Stack spacing={1.25}>
          {projects.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>پروژه‌ای تعریف نشده است.</Typography>
          ) : (
            projects.map(p => (
              <Paper key={p.id} variant="outlined" sx={{ p: 1.75, borderRadius: '10px', background: 'rgba(255,255,255,0.5)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Avatar sx={{ width: 42, height: 42, background: STATUS_COLORS[p.status] || '#64748b' }}>
                    <AccountTreeIcon sx={{ color: '#fff' }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography variant="body2" fontWeight={800}>{p.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      کد: {p.code} · نوع: {p.project_type_name || '—'} · کارفرما: {p.client || '—'}
                    </Typography>
                  </Box>
                  <Chip size="small" label={STATUS_LABELS[p.status] || p.status} sx={{ color: '#fff', bgcolor: STATUS_COLORS[p.status] || '#64748b' }} />
                  <Typography variant="caption" color="textSecondary">
                    {toJalali(p.start_date)} تا {toJalali(p.end_date)}
                  </Typography>
                  <Tooltip title="پرونده پروژه">
                    <IconButton size="small" color="primary" onClick={() => navigate(`/projects/${p.id}`)}><FolderOpenIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => { setForm({ ...p }); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف پروژه؟')) remove.mutate(p.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Paper>
            ))
          )}
        </Stack>

        {pageCount > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination count={pageCount} page={page} onChange={(e, v) => setPage(v)} color="primary" />
          </Box>
        )}
      </Paper>

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
