import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Alert, Grid, Divider, LinearProgress,
  Breadcrumbs, Link, InputAdornment, alpha,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import HomeIcon from '@mui/icons-material/Home';
import { formatPersianNumber } from '../../utils/numberUtils';
import InfoCard from '../ui/InfoCard';
import { formatDate } from '../../utils/dateUtils';
import { SOFT } from './settingsUi';

const COLOR = SOFT.indigo;

export const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (!n) return '۰';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const val = n / Math.pow(1024, i);
  return `${formatPersianNumber(val.toFixed(i === 0 ? 0 : 1))} ${units[i]}`;
};

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const SHEET_EXT = ['xls', 'xlsx', 'csv'];
const DOC_EXT = ['doc', 'docx', 'rtf', 'txt'];

const fileExtension = (name) => {
  const parts = String(name || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

const FileGlyph = ({ name, size = 20 }) => {
  const ext = fileExtension(name);
  if (ext === 'pdf') return <PictureAsPdfIcon sx={{ fontSize: size, color: '#ef4444' }} />;
  if (IMAGE_EXT.includes(ext)) return <ImageIcon sx={{ fontSize: size, color: '#8b5cf6' }} />;
  if (SHEET_EXT.includes(ext)) return <DescriptionIcon sx={{ fontSize: size, color: '#16a34a' }} />;
  if (DOC_EXT.includes(ext)) return <DescriptionIcon sx={{ fontSize: size, color: '#2563eb' }} />;
  return <InsertDriveFileIcon sx={{ fontSize: size, color: '#64748b' }} />;
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const StatCard = ({ label, value, sub, color }) => (
  <InfoCard label={label} value={value} suffix={sub} color={color} />
);

const EmptyState = ({ icon, title, hint }) => (
  <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
    <Box sx={{ fontSize: 48, lineHeight: 1, mb: 1, opacity: 0.35 }}>{icon}</Box>
    <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
    {hint && <Typography variant="caption">{hint}</Typography>}
  </Box>
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


const ArchiveBrowser = ({ profile, open, onClose, flash, onChanged }) => {
  const qc = useQueryClient();
  const [path, setPath] = useState('');
  const [filter, setFilter] = useState('');
  const [newFolder, setNewFolder] = useState('');

  const modulePath = (profile?.path_preview || '').replace(/\\/g, '/').replace(/\/+$/, '');

  useEffect(() => {
    if (!open) return;
    setPath(modulePath);
    setFilter('');
    setNewFolder('');
  }, [open, modulePath]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['storage-browse', path],
    queryFn: () => axiosInstance.get('/storage/browse/', { params: { path } }).then(r => r.data),
    enabled: open,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['storage-browse'] });
    onChanged?.();
  };

  const createFolder = useMutation({
    mutationFn: (label) => axiosInstance.post(`/storage/profiles/${profile.id}/folders/`, { label }),
    onSuccess: () => { setNewFolder(''); refresh(); flash(true, 'پوشه ساخته شد'); },
    onError: (e) => flash(false, e.response?.data?.error || 'خطا در ساخت پوشه'),
  });

  const deleteFolder = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/storage/folders/${id}/?force=1`),
    onSuccess: () => { refresh(); flash(true, 'پوشه حذف شد'); },
    onError: (e) => flash(false, e.response?.data?.error || 'خطا در حذف پوشه'),
  });

  const deleteFile = useMutation({
    mutationFn: (p) => axiosInstance.delete('/storage/files/', { params: { path: p } }),
    onSuccess: () => { refresh(); flash(true, 'فایل حذف شد'); },
    onError: (e) => flash(false, e.response?.data?.error || 'خطا در حذف فایل'),
  });

  const segments = path ? path.split('/').filter(Boolean) : [];
  const dirs = data?.dirs || [];
  const files = data?.files || [];

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const match = (row) => !term || row.name.toLowerCase().includes(term);
    return { dirs: dirs.filter(match), files: files.filter(match) };
  }, [dirs, files, filter]);

  const atModuleRoot = path === modulePath;
  const goTo = (index) => setPath(segments.slice(0, index + 1).join('/'));
  const openFolder = (p) => { setPath(p); setFilter(''); };


  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: `${COLOR}1a`, color: COLOR }}>
            <FolderOpenIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={800} sx={{ color: COLOR }}>
              مرور بایگانی — {profile?.module_name}
            </Typography>
            <Typography variant="caption" color="textSecondary"
              sx={{ fontFamily: 'monospace', direction: 'ltr', display: 'block' }}>
              {data?.prefix ? `${data.prefix}/${path}` : path}
            </Typography>
          </Box>
          <Tooltip title="کپی مسیر">
            <IconButton size="small" onClick={async () => {
              const ok = await copyText(`${data?.prefix || 'archive'}/${path}`);
              flash(ok, ok ? 'مسیر کپی شد' : 'کپی مسیر ممکن نشد');
            }}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="به‌روزرسانی">
            <span><IconButton size="small" onClick={refresh} disabled={isFetching}><RefreshIcon fontSize="small" /></IconButton></span>
          </Tooltip>
        </Stack>
      </DialogTitle>

      <Divider />

      <Box sx={{ px: 3, py: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'action.hover' }}>
        <Breadcrumbs separator="‹" sx={{ fontSize: 13, flex: 1, minWidth: 200 }}>
          <Link component="button" underline="hover" color="inherit" onClick={() => setPath('')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 13 }}>
            <HomeIcon sx={{ fontSize: 16 }} /> بایگانی
          </Link>
          {segments.map((seg, i) => (
            <Link key={`${seg}-${i}`} component="button" underline="hover" color="inherit"
              onClick={() => goTo(i)}
              sx={{ fontSize: 13, fontWeight: i === segments.length - 1 ? 700 : 400 }}>
              {seg}
            </Link>
          ))}
        </Breadcrumbs>
        <Button size="small" startIcon={<ArrowUpwardIcon />}
          onClick={() => setPath(segments.slice(0, -1).join('/'))} disabled={!path}>
          بالاتر
        </Button>
        <TextField size="small" placeholder="جستجو در این پوشه…" value={filter}
          onChange={(e) => setFilter(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ width: 220 }} />
      </Box>

      {atModuleRoot && (
        <Box sx={{ px: 3, py: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap',
          borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField size="small" label="نام پوشهٔ موجودیت جدید" value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            placeholder="مثلاً 1001_احمدی یا شمارهٔ قرارداد"
            onKeyDown={(e) => { if (e.key === 'Enter' && newFolder.trim()) createFolder.mutate(newFolder.trim()); }}
            sx={{ minWidth: 280, flex: 1 }} />
          <Button variant="contained" startIcon={<CreateNewFolderIcon />}
            disabled={!newFolder.trim() || createFolder.isPending}
            onClick={() => createFolder.mutate(newFolder.trim())}
            sx={{ bgcolor: COLOR, whiteSpace: 'nowrap' }}>
            ساخت پوشه
          </Button>
        </Box>
      )}


      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress size={26} /></Box>
        ) : (filtered.dirs.length + filtered.files.length) === 0 ? (
          <EmptyState icon="📂" title="این پوشه خالی است"
            hint={atModuleRoot ? 'با «ساخت پوشه» اولین پوشهٔ موجودیت را بسازید.' : 'فایلی در این مسیر ثبت نشده است.'} />
        ) : (
          <TableContainer sx={{ maxHeight: 460 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>نام</TableCell>
                  <TableCell width={90}>نوع</TableCell>
                  <TableCell width={100}>حجم</TableCell>
                  <TableCell width={110}>محتوا</TableCell>
                  <TableCell width={120}>تاریخ</TableCell>
                  <TableCell width={130} align="center">عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.dirs.map((dir) => (
                  <TableRow key={`d-${dir.path}`} hover sx={{ cursor: 'pointer' }}
                    onClick={() => openFolder(dir.path)}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" useFlexGap>
                        <FolderIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                        <Typography variant="body2" fontWeight={700}>{dir.name}</Typography>
                        {dir.record_id && <Chip size="small" label="ثبت‌شده" sx={{ height: 18, fontSize: 12 }} />}
                      </Stack>
                    </TableCell>
                    <TableCell><Chip size="small" label="پوشه" /></TableCell>
                    <TableCell>{formatBytes(dir.size)}</TableCell>
                    <TableCell>{formatPersianNumber(dir.file_count)} فایل</TableCell>
                    <TableCell>{formatDate(String(dir.modified || '').slice(0, 10))}</TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="باز کردن">
                        <IconButton size="small" onClick={() => openFolder(dir.path)}>
                          <FolderOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {dir.record_id && (
                        <Tooltip title="حذف پوشه">
                          <IconButton size="small" color="error" onClick={() => {
                            if (window.confirm(`حذف پوشهٔ «${dir.name}» و همهٔ محتویات آن؟`)) deleteFolder.mutate(dir.record_id);
                          }}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.files.map((file) => (
                  <TableRow key={`f-${file.path}`} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" useFlexGap>
                        <FileGlyph name={file.name} />
                        <Typography variant="body2" noWrap sx={{ maxWidth: 320 }}>{file.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={(fileExtension(file.name) || '—').toUpperCase()} />
                    </TableCell>
                    <TableCell>{formatBytes(file.size)}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{formatDate(String(file.modified || '').slice(0, 10))}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="پیش‌نمایش / باز کردن">
                        <IconButton size="small" component="a" href={file.url} target="_blank" rel="noopener noreferrer">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="دانلود">
                        <IconButton size="small" component="a" href={file.url} download>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف فایل">
                        <IconButton size="small" color="error" onClick={() => {
                          if (window.confirm(`فایل «${file.name}» حذف شود؟`)) deleteFile.mutate(file.path);
                        }}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.25, justifyContent: 'space-between' }}>
        <Typography variant="caption" color="textSecondary">
          {formatPersianNumber(data?.dir_count || 0)} پوشه · {formatPersianNumber(data?.file_count || 0)} فایل · {formatBytes(data?.total_size)}
        </Typography>
        <Button onClick={onClose}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
};


const StorageArchivePanel = () => {
  const qc = useQueryClient();
  const [msg, setMsg] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [browser, setBrowser] = useState(null);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['storage-overview'],
    queryFn: () => axiosInstance.get('/storage/overview/').then(r => r.data),
  });
  const { data: media } = useQuery({
    queryKey: ['storage-media-info'],
    queryFn: () => axiosInstance.get('/storage/media-info/').then(r => r.data),
  });

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 3500); };
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['storage-overview'] });
    qc.invalidateQueries({ queryKey: ['storage-media-info'] });
    qc.invalidateQueries({ queryKey: ['storage-browse'] });
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
    onSuccess: (res) => {
      invalidate();
      flash(true, `ساختار ساخته شد (${res.data.created_subfolders?.length || 0} زیرپوشه)`);
    },
    onError: (e) => flash(false, e.response?.data?.error || 'خطا در ساخت ساختار'),
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
  const totalSize = Number(overview?.total_size || 0);
  const totalFolders = profiles.reduce((sum, p) => sum + (p.folder_count || 0), 0);


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Grid container spacing={1.25}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color={SOFT.indigo}
            label="حجم کل بایگانی" value={formatBytes(totalSize)}
            sub={`${formatPersianNumber(overview?.total_files || 0)} فایل`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color={SOFT.green}
            label="ماژول‌های بایگانی" value={formatPersianNumber(overview?.module_count || 0)}
            sub={`${formatPersianNumber(totalFolders)} پوشهٔ موجودیت`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color={SOFT.amber}
            label="وضعیت پوشهٔ مدیا" value={media?.writable ? 'قابل نوشتن' : 'بدون دسترسی'}
            sub={media?.archive_root} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard color={SOFT.blue}
            label="فضای آزاد دیسک" value={disk ? formatBytes(disk.free) : '—'}
            sub={disk ? `${formatPersianNumber(disk.percent_used)}٪ استفاده` : ''} />
        </Grid>
      </Grid>

      {disk && (
        <Paper sx={{
          p: 1.6, borderRadius: '12px', bgcolor: 'background.paper',
          border: '1px solid', borderColor: 'divider',
        }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>مصرف دیسک سرور</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
              {formatBytes(disk.used)} از {formatBytes(disk.total)}
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={Math.min(disk.percent_used, 100)}
            sx={{ height: 7, borderRadius: 4, bgcolor: alpha(COLOR, 0.12),
              '& .MuiLinearProgress-bar': { bgcolor: COLOR } }} />
        </Paper>
      )}

      <Paper sx={{
        p: 1.75, borderRadius: '16px', bgcolor: 'background.paper',
        border: '1px solid', borderColor: 'divider',
        boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
      }}>
        <Stack direction="row" alignItems="center" spacing={1.25} mb={1.5} flexWrap="wrap" useFlexGap>
          <Avatar variant="rounded" sx={{
            width: 30, height: 30, borderRadius: '9px',
            bgcolor: alpha(COLOR, 0.14), color: COLOR,
          }}>
            <StorageIcon sx={{ fontSize: 17 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Typography variant="h6">پوشه‌های بایگانی ماژول‌ها</Typography>
          </Box>
          <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />} onClick={invalidate}
            sx={{ fontSize: 12 }}>به‌روزرسانی</Button>
          <Button size="small" variant="contained" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={openCreate}
            sx={{
              bgcolor: COLOR, borderRadius: '9px', fontSize: 12, boxShadow: 'none',
              '&:hover': { bgcolor: '#6f7ecb' },
            }}>ماژول جدید</Button>
        </Stack>

        <TableContainer>
          <Table size="small" sx={{
            '& th': { fontSize: 12, fontWeight: 800, color: 'text.secondary', bgcolor: alpha(COLOR, 0.04) },
            '& td': { fontSize: 12, py: 1 },
          }}>
            <TableHead>
              <TableRow>
                <TableCell>ماژول</TableCell>
                <TableCell>مسیر پوشه</TableCell>
                <TableCell>الگوی نام</TableCell>
                <TableCell>پوشه‌ها</TableCell>
                <TableCell>فایل‌ها</TableCell>
                <TableCell>حجم</TableCell>
                <TableCell align="center">عملیات</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState icon="🗂" title="ماژولی ثبت نشده است"
                      hint="با «ماژول جدید» یک پروفایل بایگانی بسازید." />
                  </TableCell>
                </TableRow>
              ) : profiles.map((p) => {
                const share = totalSize > 0 ? Math.round(((p.total_size || 0) / totalSize) * 100) : 0;
                const accent = p.color || COLOR;
                const relPath = (p.path_preview || p.root_folder || '').replace(/\\/g, '/');
                return (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.75} alignItems="center" useFlexGap>
                        <Box sx={{
                          width: 9, height: 9, borderRadius: '50%', bgcolor: accent,
                          boxShadow: `0 0 0 3px ${accent}1f`, flexShrink: 0,
                        }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 700 }} noWrap>
                          {p.module_name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="کپی مسیر کامل روی سرور">
                        <Chip size="small" icon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                          label={relPath || '—'}
                          onClick={async () => {
                            const ok = await copyText(`${media?.archive_root || 'archive'}/${relPath}`);
                            flash(ok, ok ? 'مسیر کپی شد' : 'کپی مسیر ممکن نشد');
                          }}
                          sx={{ fontFamily: 'monospace', direction: 'ltr', maxWidth: 220 }} />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {p.entity_folder_pattern || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatPersianNumber(p.folder_count || 0)}</TableCell>
                    <TableCell>{formatPersianNumber(p.file_count || 0)}</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" fontWeight={700}>{formatBytes(p.total_size)}</Typography>
                        <Tooltip title={`${formatPersianNumber(share)}٪ از کل بایگانی`}>
                          <LinearProgress variant="determinate" value={share}
                            sx={{ height: 5, borderRadius: 3, bgcolor: `${accent}1f`,
                              '& .MuiLinearProgress-bar': { bgcolor: accent } }} />
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="ساخت ساختار پوشه‌ها">
                        <IconButton size="small" color="primary" onClick={() => buildStructure.mutate(p.id)}>
                          <CreateNewFolderIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="مرور و دانلود فایل‌ها">
                        <IconButton size="small" color="info" onClick={() => setBrowser(p)}>
                          <FolderOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ویرایش">
                        <IconButton size="small" onClick={() => openEdit(p)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error"
                          onClick={() => { if (window.confirm('حذف این پروفایل؟')) removeProfile.mutate(p.id); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>


      <ArchiveBrowser profile={browser} open={!!browser} onClose={() => setBrowser(null)}
        flash={flash} onChanged={invalidate} />

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
                placeholder="مثلاً: مدارک هویتی"
                helper="برای بایگانی مدارک افراد تحت تکفل، زیرپوشهٔ «افراد تحت تکفل» را اضافه کنید." />
              {form.module_key === 'hr.employees' && !(form.subfolders || []).includes('افراد تحت تکفل') && (
                <Button size="small" startIcon={<AddIcon />} sx={{ mt: 0.5, color: '#7c3aed' }}
                  onClick={() => setForm((p) => ({
                    ...p, subfolders: [...(p.subfolders || []), 'افراد تحت تکفل'],
                  }))}>
                  افزودن «افراد تحت تکفل»
                </Button>
              )}
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
    </Box>
  );
};

export default StorageArchivePanel;

