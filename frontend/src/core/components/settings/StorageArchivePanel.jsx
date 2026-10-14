import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Alert, Grid, Divider, LinearProgress,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { formatPersianNumber } from '../../utils/numberUtils';

const COLOR = '#6366f1';

export const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (!n) return '۰';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const val = n / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const StatCard = ({ icon, label, value, sub, color }) => (
  <Paper sx={{
    p: 2, borderRadius: '14px', height: '100%',
    background: `linear-gradient(135deg, ${color}0f, rgba(255,255,255,0.4))`,
    border: `1px solid ${color}26`,
  }}>
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Avatar sx={{ width: 40, height: 40, bgcolor: color, boxShadow: `0 4px 14px ${color}44` }}>{icon}</Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="textSecondary">{label}</Typography>
        <Typography variant="h6" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
        {sub && <Typography variant="caption" color="textSecondary">{sub}</Typography>}
      </Box>
    </Stack>
  </Paper>
);

const EMPTY_PROFILE = {
  module_key: '', module_name: '', root_folder: '',
  entity_folder_pattern: '{code}_{name}', subfolders: [],
  allowed_extensions: [], max_file_size_mb: 10, include_company: true,
  color: '#6366f1', sort_order: 0, description: '', is_active: true,
};

const ChipsField = ({ label, value, onChange, placeholder, helper }) => {
  const [draft, setDraft] = useState('');
  const items = Array.isArray(value) ? value : [];
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <Box>
      <Typography variant="caption" color="textSecondary">{label}</Typography>
      {helper && <Typography variant="caption" display="block" sx={{ opacity: 0.7, mb: 0.5 }}>{helper}</Typography>}
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.75 }}>
        {items.map((it, i) => (
          <Chip key={`${it}-${i}`} label={it} size="small"
            onDelete={() => onChange(items.filter((_, idx) => idx !== i))}
            sx={{ bgcolor: `${COLOR}14`, color: COLOR, fontWeight: 600 }} />
        ))}
        {items.length === 0 && <Typography variant="caption" color="textSecondary">موردی ثبت نشده</Typography>}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField size="small" fullWidth value={draft} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <Button size="small" variant="outlined" onClick={add}>افزودن</Button>
      </Stack>
    </Box>
  );
};



const StorageArchivePanel = () => {
  const qc = useQueryClient();
  const [msg, setMsg] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [foldersProfile, setFoldersProfile] = useState(null);
  const [newFolder, setNewFolder] = useState('');

  const { data: overview, isLoading } = useQuery({
    queryKey: ['storage-overview'],
    queryFn: () => axiosInstance.get('/storage/overview/').then(r => r.data),
  });
  const { data: media } = useQuery({
    queryKey: ['storage-media-info'],
    queryFn: () => axiosInstance.get('/storage/media-info/').then(r => r.data),
  });
  const { data: folderData, isLoading: foldersLoading } = useQuery({
    queryKey: ['storage-folders', foldersProfile?.id],
    queryFn: () => axiosInstance.get(`/storage/profiles/${foldersProfile.id}/folders/`).then(r => r.data),
    enabled: !!foldersProfile,
  });

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 3500); };
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['storage-overview'] });
    qc.invalidateQueries({ queryKey: ['storage-media-info'] });
    qc.invalidateQueries({ queryKey: ['storage-folders'] });
  };

  const saveProfile = useMutation({
    mutationFn: (payload) => editing
      ? axiosInstance.patch(`/storage/profiles/${editing.id}/`, payload)
      : axiosInstance.post('/storage/profiles/', payload),
    onSuccess: () => { invalidate(); setFormOpen(false); setEditing(null); setForm(EMPTY_PROFILE); flash(true, 'پروفایل ذخیره شد'); },
    onError: (e) => flash(false, e.response?.data?.error || 'خطا در ذخیره پروفایل'),
  });

  const removeProfile = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/storage/profiles/${id}/`),
    onSuccess: () => { invalidate(); flash(true, 'پروفایل حذف شد'); },
    onError: (e) => flash(false, e.response?.data?.error || 'خطا در حذف'),
  });

  const buildStructure = useMutation({
    mutationFn: (id) => axiosInstance.post(`/storage/profiles/${id}/build/`),
    onSuccess: (res) => { invalidate(); flash(true, `ساختار ساخته شد (${res.data.created_subfolders?.length || 0} زیرپوشه)`); },
    onError: (e) => flash(false, e.response?.data?.error || 'خطا در ساخت ساختار'),
  });

  const createFolder = useMutation({
    mutationFn: ({ id, label }) => axiosInstance.post(`/storage/profiles/${id}/folders/`, { label }),
    onSuccess: () => { invalidate(); setNewFolder(''); flash(true, 'پوشه ساخته شد'); },
    onError: (e) => flash(false, e.response?.data?.error || 'خطا در ساخت پوشه'),
  });

  const deleteFolder = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/storage/folders/${id}/?force=1`),
    onSuccess: () => { invalidate(); flash(true, 'پوشه حذف شد'); },
    onError: (e) => flash(false, e.response?.data?.error || 'خطا در حذف پوشه'),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_PROFILE); setFormOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...EMPTY_PROFILE, ...p, subfolders: p.subfolders || [], allowed_extensions: p.allowed_extensions || [] });
    setFormOpen(true);
  };


  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={26} /></Box>;

  const profiles = overview?.profiles || [];
  const disk = media?.disk;
  const entityFolders = folderData?.folders || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color="#6366f1" icon={<StorageIcon sx={{ color: '#fff' }} />}
            label="حجم کل بایگانی" value={formatBytes(overview?.total_size)}
            sub={`${formatPersianNumber(overview?.total_files || 0)} فایل`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color="#10b981" icon={<FolderOpenIcon sx={{ color: '#fff' }} />}
            label="ماژول‌های بایگانی" value={formatPersianNumber(overview?.module_count || 0)}
            sub={`${formatPersianNumber(profiles.reduce((s, p) => s + (p.folder_count || 0), 0))} پوشهٔ موجودیت`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color="#f59e0b" icon={<InsertDriveFileIcon sx={{ color: '#fff' }} />}
            label="وضعیت پوشهٔ مدیا" value={media?.writable ? 'قابل نوشتن' : 'بدون دسترسی'}
            sub={media?.archive_root} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color="#3b82f6" icon={<StorageIcon sx={{ color: '#fff' }} />}
            label="فضای آزاد دیسک" value={disk ? formatBytes(disk.free) : '—'}
            sub={disk ? `${formatPersianNumber(disk.percent_used)}٪ استفاده` : ''} />
        </Grid>
      </Grid>

      {disk && (
        <Paper sx={{ p: 2, borderRadius: '12px' }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="textSecondary">مصرف دیسک</Typography>
            <Typography variant="caption" fontWeight={700}>{formatBytes(disk.used)} از {formatBytes(disk.total)}</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={Math.min(disk.percent_used, 100)}
            sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(99,102,241,0.12)',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#6366f1,#ec4899)' } }} />
        </Paper>
      )}


      <Paper sx={{ p: 2, borderRadius: '14px', border: `1px solid ${COLOR}1f` }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={2} flexWrap="wrap">
          <Avatar sx={{ width: 34, height: 34, bgcolor: COLOR }}><StorageIcon sx={{ fontSize: 19, color: '#fff' }} /></Avatar>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR }}>پوشه‌های بایگانی ماژول‌ها</Typography>
            <Typography variant="caption" color="textSecondary">
              برای هر ماژول یک پوشه در مدیای سرور ساخته می‌شود و اسناد هر موجودیت در پوشهٔ اختصاصی خود بایگانی می‌گردد.
            </Typography>
          </Box>
          <Button size="small" startIcon={<RefreshIcon />} onClick={invalidate}>به‌روزرسانی</Button>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: COLOR, borderRadius: '10px' }}>ماژول جدید</Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ماژول</TableCell>
                <TableCell>پوشهٔ ماژول</TableCell>
                <TableCell>الگوی نام موجودیت</TableCell>
                <TableCell>پوشه‌ها</TableCell>
                <TableCell>فایل‌ها</TableCell>
                <TableCell>حجم</TableCell>
                <TableCell align="center">عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>ماژولی ثبت نشده است</TableCell></TableRow>
              ) : profiles.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color || COLOR }} />
                      <Typography variant="body2" fontWeight={700}>{p.module_name}</Typography>
                    </Stack>
                    <Typography variant="caption" color="textSecondary">{p.module_key}</Typography>
                  </TableCell>
                  <TableCell><Chip size="small" label={p.root_folder} sx={{ fontFamily: 'monospace' }} /></TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.entity_folder_pattern || '—'}</Typography></TableCell>
                  <TableCell>{formatPersianNumber(p.folder_count || 0)}</TableCell>
                  <TableCell>{formatPersianNumber(p.file_count || 0)}</TableCell>
                  <TableCell>{formatBytes(p.total_size)}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="ساخت ساختار پوشه‌ها"><IconButton size="small" color="primary" onClick={() => buildStructure.mutate(p.id)}><CreateNewFolderIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="مشاهدهٔ پوشه‌ها"><IconButton size="small" color="info" onClick={() => setFoldersProfile(p)}><FolderOpenIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="ویرایش"><IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این پروفایل؟')) removeProfile.mutate(p.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>


      {/* دیالوگ پروفایل ماژول */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
          {editing ? `ویرایش پروفایل: ${editing.module_name}` : 'افزودن ماژول بایگانی'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="کلید ماژول" value={form.module_key}
                onChange={e => setForm({ ...form, module_key: e.target.value })}
                placeholder="hr.employees" helperText="شناسهٔ یکتا برای استفاده در سایر ماژول‌ها" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="نام ماژول" value={form.module_name}
                onChange={e => setForm({ ...form, module_name: e.target.value })} placeholder="پرسنل" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="نام پوشهٔ ماژول" value={form.root_folder}
                onChange={e => setForm({ ...form, root_folder: e.target.value })}
                placeholder="employees" helperText="نام پوشه روی سرور (لاتین پیشنهاد می‌شود)" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="الگوی نام پوشهٔ موجودیت"
                value={form.entity_folder_pattern}
                onChange={e => setForm({ ...form, entity_folder_pattern: e.target.value })}
                placeholder="{code}_{last_name}"
                helperText="متغیرها: {code} {name} {last_name} {number} {id} {national_id}" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" type="number" label="حداکثر حجم فایل (MB)"
                value={form.max_file_size_mb}
                onChange={e => setForm({ ...form, max_file_size_mb: Number(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" type="number" label="ترتیب نمایش"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="رنگ" value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })} placeholder="#6366f1" />
            </Grid>
            <Grid item xs={12} md={6}>
              <ChipsField label="زیرپوشه‌های پیش‌فرض" value={form.subfolders}
                onChange={(v) => setForm({ ...form, subfolders: v })}
                placeholder="مثلاً: مدارک هویتی" />
            </Grid>
            <Grid item xs={12} md={6}>
              <ChipsField label="فرمت‌های مجاز (اختیاری)" value={form.allowed_extensions}
                onChange={(v) => setForm({ ...form, allowed_extensions: v })}
                placeholder="pdf" helper="اگر خالی باشد از تنظیم عمومی استفاده می‌شود" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="توضیحات" multiline rows={2}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={
                <Switch checked={!!form.include_company}
                  onChange={e => setForm({ ...form, include_company: e.target.checked })} />
              } label="تفکیک بر اساس شرکت (ایجاد پوشهٔ company_{id})" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={
                <Switch checked={form.is_active !== false}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              } label="فعال" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setFormOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => saveProfile.mutate(form)}
            disabled={!form.module_key || !form.module_name || !form.root_folder}
            sx={{ bgcolor: COLOR }}>
            {editing ? 'به‌روزرسانی' : 'ذخیره و ساخت پوشه'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* دیالوگ مرور پوشه‌های موجودیت‌ها */}
      <Dialog open={!!foldersProfile} onClose={() => setFoldersProfile(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
          پوشه‌های بایگانی — {foldersProfile?.module_name}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            مسیر: <b style={{ fontFamily: 'monospace' }}>{folderData?.module_path || '—'}</b>
          </Alert>

          <Stack direction="row" spacing={1} mb={2}>
            <TextField size="small" fullWidth label="نام پوشهٔ جدید"
              value={newFolder} onChange={e => setNewFolder(e.target.value)}
              placeholder="مثلاً 1001_احمدی یا شمارهٔ قرارداد" />
            <Button variant="contained" onClick={() => createFolder.mutate({ id: foldersProfile.id, label: newFolder })}
              disabled={!newFolder.trim()} sx={{ bgcolor: COLOR, whiteSpace: 'nowrap' }}>ساخت پوشه</Button>
          </Stack>

          {foldersLoading ? <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box> : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>نام پوشه</TableCell>
                    <TableCell>مسیر</TableCell>
                    <TableCell>فایل‌ها</TableCell>
                    <TableCell>حجم</TableCell>
                    <TableCell align="center">عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entityFolders.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>پوشه‌ای وجود ندارد</TableCell></TableRow>
                  ) : entityFolders.map(f => (
                    <TableRow key={f.relative_path} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <FolderOpenIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                          <Typography variant="body2" fontWeight={700}>{f.folder}</Typography>
                          {f.is_standard_subfolder && <Chip size="small" label="زیرپوشهٔ استاندارد" sx={{ fontSize: 10 }} />}
                        </Stack>
                      </TableCell>
                      <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{f.relative_path}</Typography></TableCell>
                      <TableCell>{formatPersianNumber(f.file_count)}</TableCell>
                      <TableCell>{formatBytes(f.size_bytes)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title={f.record_id ? 'حذف پوشه' : 'این پوشه در سامانه ثبت نشده است'}>
                          <span>
                            <IconButton size="small" color="error" disabled={!f.record_id}
                              onClick={() => { if (f.record_id && window.confirm(`حذف پوشهٔ «${f.folder}» و همهٔ محتویات؟`)) deleteFolder.mutate(f.record_id); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setFoldersProfile(null)}>بستن</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StorageArchivePanel;

