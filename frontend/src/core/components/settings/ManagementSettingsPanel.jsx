import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, TextField, Button, Chip, CircularProgress, Alert,
  Grid, Avatar, IconButton, Divider, Stack, Switch, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import SignaturesIcon from '@mui/icons-material/EditNote';
import StorageIcon from '@mui/icons-material/Storage';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { toPersianDigits } from '../../utils/numberUtils';

const StorageManager = () => {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
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

  React.useEffect(() => {
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
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    },
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const row = (label, key, icon, desc) => (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Avatar sx={{ width: 26, height: 26, bgcolor: 'rgba(59,130,246,0.15)' }}>{icon}</Avatar>
        <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
      </Box>
      {desc && <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>{desc}</Typography>}
      <TextField fullWidth size="small" value={storage[key]} placeholder="مثال: /var/hr_data/employee_docs"
        onChange={e => setStorage(p => ({ ...p, [key]: e.target.value }))} dir="ltr" sx={{ '& input': { textAlign: 'left' } }} />
    </Box>
  );

  return (
    <Box>
      {saved && <Alert severity="success" sx={{ mb: 2 }}>مسیرهای ذخیره‌سازی ذخیره شد ✓</Alert>}
      {row('مسیر پایهٔ ذخیره‌سازی (ریشه)', 'base_storage_path', <StorageIcon sx={{ fontSize: 16 }} />, 'همهٔ فایل‌ها زیر این پوشه ذخیره می‌شوند.')}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          {row('مدارک پرسنل', 'storage_path_employees', <PeopleOutlineIcon sx={{ fontSize: 16 }} />, 'زیرپوشه برای فایل‌های پروندهٔ پرسنل.')}
        </Grid>
        <Grid item xs={12} md={6}>
          {row('مکاتبات و نامه‌ها', 'storage_path_correspondences', <LibraryBooksIcon sx={{ fontSize: 16 }} />, 'زیرپوشه برای فایل‌های نامه/مکاتبات.')}
        </Grid>
      </Grid>
      {row('بایگانی اسناد سازمان (سندهای عمومی)', 'storage_path_documents', <FolderIcon sx={{ fontSize: 16 }} />, 'زیرپوشه برای اسناد عمومی/بایگانی.')}
      <Button variant="contained" startIcon={<StorageIcon />} size="small"
        onClick={() => saveStorage.mutate(storage)}
        sx={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
        ذخیره مسیرها
      </Button>
    </Box>
  );
};

const SignatoryManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ full_name: '', position: '', national_id: '', signature_image: null, id: null });

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
      setForm({ full_name: '', position: '', national_id: '', signature_image: null, id: null });
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/signatories/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signatories'] }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => axiosInstance.patch(`/signatories/${id}/`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signatories'] }),
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="textSecondary">
          این افراد هنگام ثبت امضای قرارداد یا سند قابل انتخاب هستند (حداقل ۳ نفر پیشنهاد می‌شود).
        </Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />}
          onClick={() => { setForm({ full_name: '', position: '', national_id: '', signature_image: null, id: null }); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          افزودن صاحب امضا
        </Button>
      </Box>

      {list.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
          <SignaturesIcon sx={{ fontSize: 42, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="textSecondary">هنوز صاحب اَمضایی تعریف نشده است.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {list.map(s => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <Paper sx={{ p: 1.5, borderRadius: 2.5, background: 'rgba(255,255,255,0.6)', position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  {s.signature_image_url ? (
                    <img src={s.signature_image_url} alt="امضا" style={{ width: 70, height: 40, objectFit: 'contain', background: '#f8fafc', borderRadius: 6, padding: 2 }} />
                  ) : (
                    <Avatar sx={{ width: 70, height: 40, bgcolor: 'rgba(16,185,129,0.12)', borderRadius: 2 }}>
                      <SignaturesIcon sx={{ color: '#10b981', fontSize: 22 }} />
                    </Avatar>
                  )}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>{s.full_name}</Typography>
                    <Typography variant="caption" color="textSecondary">{s.position || '—'}</Typography>
                    {s.national_id && <Typography variant="caption" display="block" color="textSecondary">کد ملی: {toPersianDigits(s.national_id)}</Typography>}
                  </Box>
                </Box>
                <Switch size="small" checked={Boolean(s.is_active !== false)} onChange={e => toggleActive.mutate({ id: s.id, is_active: e.target.checked })} />
                <IconButton size="small" color="primary" onClick={() => { setForm({ full_name: s.full_name, position: s.position, national_id: s.national_id, id: s.id }); setDialog(true); }}>
                  ویرایش
                </IconButton>
                <IconButton size="small" color="error" onClick={() => remove.mutate(s.id)}><DeleteIcon fontSize="small" /></IconButton>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'ویرایش صاحب امضا' : 'افزودن صاحب امضا'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="نام و نام خانوادگی *" value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          <TextField fullWidth size="small" label="سمت / عنوان" value={form.position}
            onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
          <TextField fullWidth size="small" label="کد ملی" value={form.national_id}
            onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))} />
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            {form.signature_image ? form.signature_image.name : 'آپلود نمونه امضا (تصویر)'}
            <input type="file" hidden accept="image/*"
              onChange={e => setForm(p => ({ ...p, signature_image: e.target.files?.[0] || null }))} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.full_name}
            onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
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
      <Paper sx={{ p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, rgba(59,130,246,0.07), rgba(255,255,255,0.3))', border: '1px solid rgba(59,130,246,0.18)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#3b82f6' }}><FolderIcon sx={{ fontSize: 18 }} /></Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#3b82f6' }}>مدیریت مسیر ذخیره‌سازی فایل‌ها</Typography>
            <Typography variant="caption" color="textSecondary">تعیین پوشهٔ هر نوع فایل (مدارک پرسنل، مکاتبات، بایگانی اسناد)</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <StorageManager />
      </Paper>

      {/* Signatories */}
      <Paper sx={{ p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(255,255,255,0.3))', border: '1px solid rgba(16,185,129,0.18)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#10b981' }}><SignaturesIcon sx={{ fontSize: 18 }} /></Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#10b981' }}>صاحبان امضا (امضای مجاز)</Typography>
            <Typography variant="caption" color="textSecondary">افراد دارای حق امضای قرارداد/سند + نمونه امضای آپلودی</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <SignatoryManager />
      </Paper>
    </Box>
  );
};

export default ManagementSettingsPanel;