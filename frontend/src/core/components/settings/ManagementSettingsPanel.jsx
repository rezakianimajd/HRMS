import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, TextField, Button, Chip, CircularProgress, Alert,
  Grid, Avatar, IconButton, Divider, Stack, Switch, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress, Tooltip,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import StorageIcon from '@mui/icons-material/Storage';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import { toPersianDigits } from '../../utils/numberUtils';

/* =============================================================================
 * مدیریت مسیرهای ذخیره‌سازی — گلسمورفیسم ۲۰۲۶
 * ============================================================================= */
const StorageManager = () => {
  const qc = useQueryClient();
  const [message, setMessage] = useState(null);
  const [storage, setStorage] = useState({
    base_storage_path: '',
    storage_path_employees: '',
    storage_path_correspondences: '',
    storage_path_documents: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data),
  });

  useEffect(() => {
    if (profile) {
      setStorage({
        base_storage_path: profile.base_storage_path || '',
        storage_path_employees: profile.storage_path_employees || '',
        storage_path_correspondences: profile.storage_path_correspondences || '',
        storage_path_documents: profile.storage_path_documents || '',
      });
    }
  }, [profile]);

  const saveStorage = useMutation({
    mutationFn: (data) => axiosInstance.put('/settings/company-profile/update/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      setMessage({ ok: true, text: 'مسیرهای ذخیره‌سازی با موفقیت ذخیره شد ✓' });
    },
    onError: (e) => {
      setMessage({ ok: false, text: e.response?.data?.error || 'خطا در ذخیره مسیرها' });
    },
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const field = (key, label, sub, icon) => (
    <Box sx={{
      p: 1.5, borderRadius: 2.5, mb: 1.5,
      background: 'rgba(59,130,246,0.05)',
      border: '1px solid rgba(59,130,246,0.15)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Avatar sx={{ width: 28, height: 28, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff' }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight={800}>{label}</Typography>
          {sub && <Typography variant="caption" color="textSecondary" display="block">{sub}</Typography>}
        </Box>
      </Box>
      <TextField
        fullWidth size="small" variant="outlined" value={storage[key]}
        placeholder="/var/hr_data/..."
        onChange={e => setStorage(p => ({ ...p, [key]: e.target.value }))}
        dir="ltr"
        sx={{ '& input': { textAlign: 'left', fontFamily: 'monospace' } }}
      />
    </Box>
  );

  return (
    <Box>
      {message && (
        <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          {field('base_storage_path', 'مسیر پایهٔ ذخیره‌سازی', 'ریشهٔ همهٔ فایل‌های آپلودی (مثال: /var/hr_data)', <StorageIcon sx={{ fontSize: 16 }} />)}
        </Grid>
        <Grid item xs={12} md={4}>
          {field('storage_path_employees', 'مدارک پرسنل', 'پرونده‌های کارکنان', <PeopleOutlineIcon sx={{ fontSize: 16 }} />)}
        </Grid>
        <Grid item xs={12} md={4}>
          {field('storage_path_correspondences', 'مکاتبات', 'نامه‌ها و ابلاغ‌ها', <LibraryBooksOutlinedIcon sx={{ fontSize: 16 }} />)}
        </Grid>
        <Grid item xs={12} md={4}>
          {field('storage_path_documents', 'بایگانی اسناد', 'اسناد عمومی سازمان', <FolderOpenIcon sx={{ fontSize: 16 }} />)}
        </Grid>
      </Grid>

      <Button
        variant="contained"
        startIcon={<CheckCircleIcon />}
        onClick={() => saveStorage.mutate(storage)}
        disabled={saveStorage.isLoading}
        sx={{ mt: 1, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', borderRadius: 2, px: 2.5 }}
      >
        {saveStorage.isLoading ? 'در حال ذخیره...' : 'ذخیره مسیرها'}
      </Button>
    </Box>
  );
};

/* =============================================================================
 * صاحبان امضا — با نمونه امضای قابل آپلود
 * ============================================================================= */
const SignatoryManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ id: null, full_name: '', position: '', national_id: '', signature_image: null });

  const { data, isLoading } = useQuery({
    queryKey: ['signatories'],
    queryFn: () => axiosInstance.get('/signatories/').then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (payload) => {
      const fd = new FormData();
      fd.append('full_name', payload.full_name || '');
      fd.append('position', payload.position || '');
      fd.append('national_id', payload.national_id || '');
      if (payload.signature_image) fd.append('signature_image', payload.signature_image);
      return payload.id
        ? axiosInstance.patch(`/signatories/${payload.id}/`, fd)
        : axiosInstance.post('/signatories/', fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatories'] });
      setDialog(false);
      setMessage({ ok: true, text: 'صاحب امضا ذخیره شد ✓' });
      setForm({ id: null, full_name: '', position: '', national_id: '', signature_image: null });
    },
    onError: (e) => {
      setMessage({ ok: false, text: e.response?.data?.error || 'خطا در ذخیره صاحب امضا' });
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/signatories/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatories'] });
      setMessage({ ok: true, text: 'حذف شد' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => axiosInstance.patch(`/signatories/${id}/`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signatories'] }),
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      {message && (
        <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 460 }}>
          افرادی که حق امضای قرارداد/سند دارند. حداقل ۳ نفر پیشنهاد می‌شود؛ هنگام امضای قرارداد از همین فهرست انتخاب می‌شوند.
        </Typography>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => { setForm({ id: null, full_name: '', position: '', national_id: '', signature_image: null }); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: 2, px: 2 }}
        >
          افزودن صاحب امضا
        </Button>
      </Box>

      {list.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <ShieldIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="textSecondary">هنوز صاحب اَمضایی تعریف نشده است.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {list.map(s => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <Paper sx={{
                p: 2, borderRadius: 3, position: 'relative',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(255,255,255,0.4))',
                border: '1px solid rgba(16,185,129,0.18)',
                transition: 'all .2s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 26px rgba(16,185,129,0.15)' },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  {s.signature_image_url ? (
                    <img
                      src={s.signature_image_url} alt="امضا"
                      style={{ width: 88, height: 46, objectFit: 'contain', background: '#f8fafc', borderRadius: 8, padding: 4 }}
                    />
                  ) : (
                    <Avatar sx={{ width: 88, height: 46, background: 'rgba(16,185,129,0.12)', borderRadius: 2 }}>
                      <EditNoteIcon sx={{ color: '#10b981', fontSize: 28 }} />
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap>{s.full_name}</Typography>
                    <Typography variant="caption" color="textSecondary" display="block">{s.position || '—'}</Typography>
                    {s.national_id && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        کد ملی: {toPersianDigits(s.national_id)}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Divider sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Switch
                      size="small"
                      checked={Boolean(s.is_active !== false)}
                      onChange={e => toggleActive.mutate({ id: s.id, is_active: e.target.checked })}
                    />
                    <Chip size="small" label={s.is_active !== false ? 'فعال' : 'غیرفعال'} color={s.is_active !== false ? 'success' : 'default'} variant="outlined" />
                  </Box>
                  <Box>
                    <Tooltip title="ویرایش">
                      <IconButton size="small" color="primary"
                        onClick={() => { setForm({ id: s.id, full_name: s.full_name, position: s.position, national_id: s.national_id, signature_image: null }); setDialog(true); }}>
                        <EditNoteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small" color="error" onClick={() => remove.mutate(s.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#10b981' }}>{form.id ? 'ویرایش صاحب امضا' : 'افزودن صاحب امضا'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="نام و نام خانوادگی *" value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          <TextField fullWidth size="small" label="سمت / عنوان" value={form.position}
            onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
          <TextField fullWidth size="small" label="کد ملی" value={form.national_id}
            onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))} />
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} fullWidth>
            {form.signature_image ? form.signature_image.name : 'آپلود نمونه امضا (تصویر)'}
            <input type="file" hidden accept="image/*"
              onChange={e => setForm(p => ({ ...p, signature_image: e.target.files?.[0] || null }))} />
          </Button>
          {save.isLoading && <LinearProgress sx={{ borderRadius: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.full_name || save.isLoading}
            onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ManagementSettingsPanel = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Storage paths */}
      <Paper sx={{
        p: 2.5, borderRadius: 3,
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.2)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <StorageIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#1d4ed8' }}>مدیریت مسیر ذخیره‌سازی فایل‌ها</Typography>
            <Typography variant="caption" color="textSecondary">هر نوع فایل در پوشهٔ مخصوص خود ذخیره می‌شود — قابل مسیردهی دقیق</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <StorageManager />
      </Paper>

      {/* Signatories */}
      <Paper sx={{
        p: 2.5, borderRadius: 3,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.2)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <EditNoteIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#047857' }}>صاحبان امضا (امضای مجاز)</Typography>
            <Typography variant="caption" color="textSecondary">افراد دارای حق امضای قرارداد + نمونه امضای آپلودی</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <SignatoryManager />
      </Paper>
    </Box>
  );
};

export default ManagementSettingsPanel;