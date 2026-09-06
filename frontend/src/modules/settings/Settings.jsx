import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Tabs, Tab, Button, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl,
  InputLabel, Select, MenuItem, Chip, Avatar, Switch, Grid, Divider,
  Alert, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import TuneIcon from '@mui/icons-material/Tune';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import PaletteIcon from '@mui/icons-material/Palette';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import { useThemeMode, THEME_MODES, NEON_COLOR_OPTIONS } from '../../core/context/ThemeContext';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

const SETTINGS_LABELS = {
  BASE_FILE_STORAGE_PATH: 'مسیر ذخیره‌سازی فایل‌ها',
  MAX_FILE_SIZE: 'حداکثر حجم فایل (مگابایت)',
  ALLOWED_FILE_EXTENSIONS: 'فرمت‌های مجاز فایل',
  EXPIRY_ALERT_DAYS: 'روزهای هشدار انقضای مدرک',
  CONTRACT_ALERT_DAYS: 'روزهای هشدار انقضای قرارداد',
  LEAVE_DEFAULT_TOTAL_DAYS: 'روز مرخصی استحقاقی سالانه',
  LEAVE_CALCULATE_WEEKENDS: 'محاسبه روزهای تعطیل در مرخصی',
  ATTENDANCE_WORK_DAYS_PER_MONTH: 'میانگین روزهای کاری ماه',
  DATE_FORMAT: 'فرمت نمایش تاریخ',
  CURRENCY_SYMBOL: 'نماد واحد پول',
};

/* =============================================================================
 * General Settings Tab
 * ============================================================================= */
const GROUP_META = {
  'ذخیره‌سازی فایل': { color: '#6366f1', icon: '💾' },
  'هشدارها': { color: '#f59e0b', icon: '🔔' },
  'مرخصی': { color: '#10b981', icon: '🏖️' },
  'کارکرد': { color: '#3b82f6', icon: '⏰' },
  'نمایش': { color: '#8b5cf6', icon: '🎨' },
};

const GeneralSettingsTab = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => axiosInstance.get('/settings/').then(r => r.data),
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const grouped = {
    'ذخیره‌سازی فایل': ['BASE_FILE_STORAGE_PATH', 'MAX_FILE_SIZE', 'ALLOWED_FILE_EXTENSIONS'],
    'هشدارها': ['EXPIRY_ALERT_DAYS', 'CONTRACT_ALERT_DAYS'],
    'مرخصی': ['LEAVE_DEFAULT_TOTAL_DAYS', 'LEAVE_CALCULATE_WEEKENDS'],
    'کارکرد': ['ATTENDANCE_WORK_DAYS_PER_MONTH'],
    'نمایش': ['DATE_FORMAT', 'CURRENCY_SYMBOL'],
  };

  return (
    <Box>
      {Object.entries(grouped).map(([group, keys]) => {
        const meta = GROUP_META[group] || { color: '#6366f1', icon: '⚙️' };
        return (
          <Paper key={group} sx={{
            mb: 2.5, p: 2.5,
            background: `linear-gradient(135deg, ${meta.color}0d, ${meta.color}04)`,
            border: `1px solid ${meta.color}20`,
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            borderRadius: 3,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Avatar sx={{ width: 32, height: 32, background: `linear-gradient(135deg, ${meta.color}, ${meta.color}90)`, fontSize: 16, boxShadow: `0 2px 8px ${meta.color}40` }}>
                {meta.icon}
              </Avatar>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: meta.color }}>{group}</Typography>
            </Box>
            <Grid container spacing={2}>
              {keys.map(key => {
                const value = settings?.[key];
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <SettingField keyName={key} value={value} />
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        );
      })}
    </Box>
  );
};

const SettingField = ({ keyName, value }) => {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (newValue) => axiosInstance.put(`/settings/${keyName}/`, { value: newValue }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  const label = SETTINGS_LABELS[keyName] || keyName;

  if (typeof value === 'boolean') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Switch checked={value} onChange={e => mutation.mutate(e.target.checked)} />
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        {saved && <Typography variant="caption" color="success.main">✓</Typography>}
      </Box>
    );
  }

  return (
    <TextField
      fullWidth size="small" label={label} defaultValue={typeof value === 'object' ? JSON.stringify(value) : (value ?? '')}
      type={typeof value === 'number' ? 'number' : 'text'}
      onBlur={e => mutation.mutate(typeof value === 'object' ? JSON.parse(e.target.value) : e.target.value)}
      helperText={saved ? 'ذخیره شد ✓' : ''}
      InputLabelProps={{ shrink: true }}
    />
  );
};

/* =============================================================================
 * User Management Tab
 * ============================================================================= */
const UserManagementTab = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => axiosInstance.get('/users/').then(r => r.data),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => axiosInstance.get('/roles/').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? axiosInstance.put(`/users/${editing.id}/`, payload) : axiosInstance.post('/users/create/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false); setEditing(null); setForm({}); setError('');
    },
    onError: (e) => setError(e.response?.data?.error || 'خطا در ذخیره'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/users/${id}/delete/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const handleOpen = (user = null) => {
    setEditing(user);
    setForm(user ? { username: user.username, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role } : { role: 'employee' });
    setError('');
    setOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="textSecondary">مدیریت کاربران و نقش‌ها</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => handleOpen()}>افزودن کاربر</Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>کاربر</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نقش</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>شرکت‌ها</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>وضعیت</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>آخرین ورود</TableCell>
                <TableCell width={90} sx={{ fontWeight: 700 }}>عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(users || []).map(u => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                        {(u.first_name || u.username).charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{u.first_name} {u.last_name}</Typography>
                        <Typography variant="caption" color="textSecondary">@{u.username}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={u.role_display || u.role} color={u.role === 'super_admin' ? 'primary' : u.role === 'hr_manager' ? 'secondary' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{u.companies?.map(c => c.name).join('، ') || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={u.is_active ? 'فعال' : 'غیرفعال'} color={u.is_active ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{u.last_login ? toJalali(u.last_login.slice(0, 10)) : '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpen(u)}><EditIcon fontSize="small" /></IconButton>
                    {u.is_active && !u.is_superuser && (
                      <IconButton size="small" color="error" onClick={() => deactivateMutation.mutate(u.id)}><DeleteIcon fontSize="small" /></IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <TextField fullWidth size="small" label="نام کاربری" value={form.username || ''} disabled={!!editing}
            onChange={e => setForm(p => ({ ...p, username: e.target.value }))} sx={{ mt: 1.5 }} />
          {!editing && (
            <TextField fullWidth size="small" label="رمز عبور" type="password" value={form.password || ''}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} sx={{ mt: 1.5 }} />
          )}
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><TextField fullWidth size="small" label="نام" value={form.first_name || ''} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="نام خانوادگی" value={form.last_name || ''} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} /></Grid>
          </Grid>
          <TextField fullWidth size="small" label="ایمیل" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} sx={{ mt: 1.5 }} />
          <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
            <InputLabel>نقش</InputLabel>
            <Select value={form.role || ''} label="نقش" onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              {(roles || []).map(r => <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isLoading}>
            {saveMutation.isLoading ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/* =============================================================================
 * Roles & Permissions Tab
 * ============================================================================= */
const RolesTab = () => {
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => axiosInstance.get('/roles/').then(r => r.data),
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>;

  const permissionLabels = {
    can_manage_users: 'مدیریت کاربران',
    can_edit_settings: 'ویرایش تنظیمات',
    can_view_all_employees: 'مشاهده تمام پرسنل',
    can_add_employee: 'افزودن پرسنل',
    can_change_employee: 'ویرایش پرسنل',
    can_delete_employee: 'حذف پرسنل',
    can_view_sensitive_data: 'دیدن داده حساس',
    can_manage_documents: 'مدیریت مدارک',
    can_delete_documents: 'حذف مدارک',
    can_approve_leaves: 'تأیید مرخصی',
    can_view_audit_logs: 'مشاهده لاگ',
  };

  const ROLE_COLORS = {
    super_admin: '#6366f1',
    hr_manager: '#ec4899',
    employee: '#10b981',
    auditor: '#f59e0b',
  };

  return (
    <Stack spacing={2}>
      {(roles || []).map(role => {
        const color = ROLE_COLORS[role.key] || '#64748b';
        return (
          <Paper key={role.key} sx={{
            p: 2.5,
            background: `linear-gradient(135deg, ${color}0d, ${color}04)`,
            border: `1px solid ${color}25`,
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            borderRadius: 3,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
              <Avatar sx={{
                width: 40, height: 40,
                background: `linear-gradient(135deg, ${color}, ${color}90)`,
                color: '#fff', boxShadow: `0 3px 12px ${color}40`,
              }}>
                <SecurityIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={700} sx={{ color }}>{role.label}</Typography>
                <Typography variant="caption" color="textSecondary">{role.description}</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 1.5, borderColor: `${color}25` }} />
            <Grid container spacing={1}>
              {Object.entries(role.permissions || {}).map(([perm, enabled]) => (
                <Grid item xs={6} sm={4} key={perm}>
                  <Chip
                    size="small"
                    label={permissionLabels[perm] || perm}
                    sx={{
                      justifyContent: 'flex-start', width: '100%',
                      bgcolor: enabled ? `${color}18` : 'transparent',
                      color: enabled ? color : 'text.disabled',
                      border: `1px solid ${enabled ? color + '55' : 'rgba(0,0,0,0.12)'}`,
                      fontWeight: enabled ? 600 : 400,
                      opacity: enabled ? 1 : 0.5,
                    }}
                    variant="outlined"
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        );
      })}
    </Stack>
  );
};

/* =============================================================================
 * Import Tab (Excel bulk import)
 * ============================================================================= */
const ImportTab = () => {
  const queryClient = useQueryClient();
  const [importType, setImportType] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const { data: importTypes } = useQuery({
    queryKey: ['import-types'],
    queryFn: () => axiosInstance.get('/import/types/').then(r => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('import_type', importType);
      fd.append('file', file);
      return axiosInstance.post('/import/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      setResult(res.data);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (e) => {
      const data = e.response?.data;
      setError(data?.error || 'خطا در درون‌ریزی');
      setResult(data || null);
    },
  });

  const selectedType = (importTypes || []).find(t => t.key === importType);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setResult(null);
    setError('');
  };

  const handleUpload = () => {
    if (!importType) { setError('نوع درون‌ریزی را انتخاب کنید'); return; }
    if (!file) { setError('فایل اکسل را انتخاب کنید'); return; }
    uploadMutation.mutate();
  };

  const handleDownloadTemplate = async (typeKey) => {
    try {
      const response = await axiosInstance.get(`/import/template/${typeKey}/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_${typeKey}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('خطا در دانلود نمونه فایل');
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        اطلاعات را به‌صورت گروهی از فایل Excel وارد کنید. ابتدا نوع درون‌ریزی را انتخاب و نمونه فایل را دانلود کنید.
      </Typography>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>۱. انتخاب نوع درون‌ریزی</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(importTypes || []).map(t => (
          <Grid item xs={12} sm={6} md={4} key={t.key}>
            <Paper
              variant="outlined"
              onClick={() => { setImportType(t.key); setResult(null); setError(''); }}
              sx={{
                p: 2, cursor: 'pointer', transition: 'all 0.2s',
                borderColor: importType === t.key ? 'primary.main' : 'divider',
                borderWidth: importType === t.key ? 2 : 1,
                bgcolor: importType === t.key ? 'rgba(99,102,241,0.05)' : 'transparent',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Typography variant="body1" fontWeight={700}>{t.label}</Typography>
              <Typography variant="caption" color="textSecondary">{t.description}</Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${t.required.length} فیلد الزامی`} size="small" variant="outlined" />
                <Chip label={`${t.headers.length} ستون`} size="small" variant="outlined" />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {selectedType && (
        <>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>۲. دانلود نمونه فایل</Typography>
          <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined" startIcon={<DownloadIcon />}
              onClick={() => handleDownloadTemplate(importType)}
            >
              دانلود نمونه فایل «{selectedType.label}»
            </Button>
            <Typography variant="caption" color="textSecondary">
              ستون‌ها: {selectedType.headers.join('، ')}
            </Typography>
          </Paper>

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>۳. آپلود فایل اکسل</Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 4, textAlign: 'center', mb: 2, cursor: 'pointer',
              borderStyle: 'dashed', transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(99,102,241,0.03)' },
            }}
            onClick={() => document.getElementById('import-file-input').click()}
          >
            <input id="import-file-input" type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
            <UploadFileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body2" fontWeight={600}>
              {file ? file.name : 'برای انتخاب فایل اکسل کلیک کنید'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {file ? `${(file.size / 1024).toFixed(0)} KB` : 'فرمت‌های مجاز: .xlsx, .xls'}
            </Typography>
          </Paper>

          <Button variant="contained" onClick={handleUpload} disabled={uploadMutation.isLoading} sx={{ mt: 1 }}>
            {uploadMutation.isLoading ? <CircularProgress size={20} /> : 'شروع درون‌ریزی'}
          </Button>

          {error && <Alert severity={result?.imported_count > 0 ? 'warning' : 'error'} sx={{ mt: 2 }}>{error}</Alert>}

          {result && result.imported_count > 0 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              ✅ {result.message} — {formatPersianNumber(result.imported_count)} رکورد از {formatPersianNumber(result.total_rows)} رکورد وارد شد.
              {result.skipped_count > 0 && ` (${formatPersianNumber(result.skipped_count)} ردیف رد شد)`}
            </Alert>
          )}

          {result?.validation_errors && result.validation_errors.length > 0 && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2, maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>خطاهای اعتبارسنجی:</Typography>
              {result.validation_errors.map((err, i) => (
                <Typography key={i} variant="caption" display="block" sx={{ color: 'error.main' }}>
                  ردیف {formatPersianNumber(err.row)}: {err.errors.join('، ')}
                </Typography>
              ))}
            </Paper>
          )}

          {result?.skipped && result.skipped.length > 0 && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2, maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1 }}>ردیف‌های رد شده:</Typography>
              {result.skipped.map((s, i) => (
                <Typography key={i} variant="caption" display="block">{s}</Typography>
              ))}
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

/* =============================================================================
 * Backup Tab (backup / list / restore)
 * ============================================================================= */
const BackupTab = () => {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => axiosInstance.get('/backup/list/').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => axiosInstance.post('/backup/create/'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backups'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (filename) => axiosInstance.post(`/backup/restore/${filename}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleCreate = async () => {
    setMessage('');
    try {
      await createMutation.mutateAsync();
      setMessage('✅ بکاپ با موفقیت ساخته شد');
    } catch (e) {
      setMessage('❌ ' + (e.response?.data?.error || 'خطا در تهیه بکاپ'));
    }
  };

  const handleRestore = async (filename) => {
    if (!window.confirm(`آیا از بازیابی بکاپ «${filename}» مطمئن هستید؟ این کار داده‌های فعلی را بازنویسی می‌کند.`)) return;
    setMessage('');
    try {
      await restoreMutation.mutateAsync(filename);
      setMessage('✅ بکاپ با موفقیت بازیابی شد');
    } catch (e) {
      setMessage('❌ ' + (e.response?.data?.error || 'خطا در بازیابی بکاپ'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 520 }}>
          تهیه بکاپ برای همه کاربران مجاز است؛ اما بازیابی بکاپ فقط برای مدیر ارشد سیستم (super_admin) امکان‌پذیر است.
        </Typography>
        <Button
          variant="contained"
          startIcon={<BackupIcon />}
          size="small"
          onClick={handleCreate}
          disabled={createMutation.isLoading}
        >
          {createMutation.isLoading ? <CircularProgress size={20} /> : 'تهیه بکاپ جدید'}
        </Button>
      </Box>

      {message && <Alert severity={message.startsWith('✅') ? 'success' : 'error'} sx={{ mb: 2 }}>{message}</Alert>}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : backups?.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">هنوز بکاپی ساخته نشده است.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>تاریخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>حجم</TableCell>
                <TableCell width={120} sx={{ fontWeight: 700 }}>عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(backups || []).map(b => (
                <TableRow key={b.filename} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {b.created_at ? toJalali(b.created_at.slice(0, 10)) : b.filename}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">{b.filename}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{formatPersianNumber((b.size / 1024).toFixed(1))} KB</Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="warning"
                      variant="outlined"
                      startIcon={<RestoreIcon />}
                      onClick={() => handleRestore(b.filename)}
                      disabled={restoreMutation.isLoading}
                    >
                      بازیابی
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

/* =============================================================================
 * Appearance Tab (light / dark / fmode)
 * ============================================================================= */
const AppearanceTab = () => {
  const { mode, setMode, neonColor, setNeonColor } = useThemeMode();

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>مد نمایش</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2.5 }}>
        برای تغییر ظاهر کل برنامه، یکی از حالت‌های زیر را انتخاب کنید. تغییر به‌صورت آنی اعمال و ذخیره می‌شود.
      </Typography>

      <Grid container spacing={2}>
        {THEME_MODES.map(m => (
          <Grid item xs={12} sm={4} key={m.key}>
            <Paper
              variant="outlined"
              onClick={() => setMode(m.key)}
              sx={{
                p: 2.5, cursor: 'pointer', textAlign: 'center', transition: 'all 0.25s ease',
                borderColor: mode === m.key ? m.color : 'divider',
                borderWidth: mode === m.key ? 2 : 1,
                background: mode === m.key
                  ? m.key === 'fmode'
                    ? 'linear-gradient(135deg, rgba(57,255,20,0.08), rgba(0,255,255,0.05))'
                    : m.key === 'dark'
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(30,41,59,0.1))'
                      : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(255,255,255,0.4))'
                  : 'transparent',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${m.color}22` },
              }}
            >
              <Typography variant="h3" sx={{ mb: 1 }}>{m.icon}</Typography>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5, color: mode === m.key ? m.color : undefined }}>
                {m.label}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {m.key === 'light' && 'روشن و شفاف'}
                {m.key === 'dark' && 'تیره و آرام'}
                {m.key === 'fmode' && 'سیاه و سفید + سبز نئونی'}
                {m.key === 'fmode_light' && 'سبز نئونی روی زمینه روشن'}
                {m.key === 'kurosawa' && 'کاملاً سیاه و سفید و خاکستری'}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Neon color picker - only visible in fmode */}
      {mode === 'fmode' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>رنگ نئونی F مود</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            رنگ نئونی مورد نظر خود را انتخاب کنید. تغییر بلافاصله در کل برنامه اعمال می‌شود.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {NEON_COLOR_OPTIONS.map(c => (
              <Box
                key={c.key}
                onClick={() => setNeonColor(c.color)}
                sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75,
                  cursor: 'pointer', p: 1.5, borderRadius: 2,
                  border: neonColor === c.color ? `2px solid ${c.color}` : '1px solid rgba(163,163,163,0.3)',
                  background: neonColor === c.color ? `${c.color}14` : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: c.color, background: `${c.color}10` },
                }}
              >
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', background: c.color, boxShadow: `0 0 14px ${c.color}` }} />
                <Typography variant="caption" fontWeight={600} sx={{ color: neonColor === c.color ? c.color : 'textSecondary' }}>
                  {c.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2.5 }}>
        ⚡ «F مود» ظاهری سیاه و سفید و خاکستری با رنگ نئونی قابل‌تنظیم و متن روشن به کل برنامه می‌دهد.
      </Typography>
    </Box>
  );
};

/* =============================================================================
 * Main Settings Page
 * ============================================================================= */
const Settings = () => {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);

  const tabs = [
    { label: 'تنظیمات عمومی', icon: <TuneIcon />, key: 'general', color: '#6366f1', desc: 'پیکربندی ذخیره‌سازی، هشدارها و تنظیمات پایه سیستم' },
    { label: 'پشتیبان‌گیری', icon: <BackupIcon />, key: 'backup', color: '#3b82f6', desc: 'تهیه، مشاهده و بازیابی نسخه‌های پشتیبان داده' },
  ];

  const active = tabs[tabIndex];

  return (
    <Box>
      {/* Glass header */}
      <Paper sx={{
        mb: 3, p: 2.5,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 3,
      }}>
        <Avatar sx={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
        }}>
          <TuneIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>{t('nav.settings')}</Typography>
          <Typography variant="body2" color="textSecondary">تنظیمات سیستم، مدیریت کاربران و ابزارها</Typography>
        </Box>
      </Paper>

      {/* Glass container with colored tabs */}
      <Paper sx={{
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 3,
      }}>
        <Tabs
          value={tabIndex} onChange={(e, v) => setTabIndex(v)}
          variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(255,255,255,0.4)', px: 2 }}
        >
          {tabs.map((tab, i) => (
            <Tab
              key={tab.key}
              label={tab.label}
              sx={{
                fontWeight: 600,
                py: 1.75,
                color: tabIndex === i ? tab.color : 'text.secondary',
              }}
            />
          ))}
        </Tabs>
        <Box sx={{ p: 3 }}>
          <Paper sx={{
            mb: 2, px: 1.5, py: 1,
            background: `linear-gradient(135deg, ${active.color}0d, ${active.color}04)`,
            border: `1px solid ${active.color}20`,
            borderRadius: 2,
          }}>
            <Typography variant="body2" sx={{ color: active.color, fontWeight: 600 }}>{active.desc}</Typography>
          </Paper>

          {tabIndex === 0 && <GeneralSettingsTab />}
          {tabIndex === 1 && <BackupTab />}
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;