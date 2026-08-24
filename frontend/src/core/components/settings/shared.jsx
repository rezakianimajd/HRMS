import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Button, IconButton, TextField, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl,
  InputLabel, Select, MenuItem, Chip, Grid, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

export const ENDPOINTS = {
  departments: '/departments/',
  workLocations: '/work-locations/',
  jobTitles: '/job-titles/',
  insuranceLists: '/insurance-lists/',
  documentTypes: '/documents/types/',
  contractTypes: '/contract-types/',
  organizations: '/organizations/',
};

export const FIELD_LABELS = {
  name: 'نام',
  code: 'کد',
  description: 'توضیحات',
  level: 'سطح',
};

export const fieldLabel = (f) => FIELD_LABELS[f] || f;

/* =============================================================================
 * Generic Entity Manager (CRUD) - departments, titles, locations, insurance, docs
 * ============================================================================= */
export const EntityManager = ({ endpoint, fields = ['name', 'code'], extraFields = {}, defaultForm = {}, title }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => axiosInstance.get(endpoint).then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? axiosInstance.patch(`${endpoint}${editing.id}/`, payload) : axiosInstance.post(endpoint, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setOpen(false); setEditing(null); setForm({}); setError('');
    },
    onError: (e) => setError(e.response?.data?.detail || 'خطا در ذخیره'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${endpoint}${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [endpoint] }),
  });

  const handleOpen = (item = null) => {
    setEditing(item);
    setForm(item ? { ...item } : { ...defaultForm });
    setError('');
    setOpen(true);
  };

  const items = Array.isArray(data) ? data : data?.results || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="textSecondary">{title}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => handleOpen()}>افزودن</Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="textSecondary">داده‌ای وجود ندارد</Typography></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                {fields.map(f => <TableCell key={f} sx={{ fontWeight: 700 }}>{fieldLabel(f)}</TableCell>)}
                {Object.keys(extraFields).map(f => {
                  const extra = extraFields[f];
                  const headerLabel = (extra && typeof extra === 'object') ? extra.label : extra;
                  return <TableCell key={f} sx={{ fontWeight: 700 }}>{headerLabel}</TableCell>;
                })}
                <TableCell width={90} sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id} hover>
                  {fields.map(f => <TableCell key={f}>{item[f]}</TableCell>)}
                  {Object.keys(extraFields).map(f => (
                    <TableCell key={f}>
                      {f === 'level' ? (
                        <Chip size="small" label={
                          item[f] === 'executive' ? 'مدیریتی' : item[f] === 'expert' ? 'کارشناسی' : item[f] === 'operational' ? 'عملیاتی' : item[f]
                        } />
                      ) : item[f]}
                    </TableCell>
                  ))}
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpen(item)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(item.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'ویرایش' : 'افزودن'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {fields.map(f => (
            <TextField key={f} fullWidth size="small" label={fieldLabel(f)} value={form[f] || ''}
              onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} sx={{ mt: 1.5 }} />
          ))}
          {Object.keys(extraFields).map(f => {
            const extra = extraFields[f];
            // Support select field via { label, options } object
            if (extra && typeof extra === 'object' && extra.options) {
              return (
                <FormControl key={f} fullWidth size="small" sx={{ mt: 1.5 }}>
                  <InputLabel>{extra.label}</InputLabel>
                  <Select value={form[f] || ''} label={extra.label} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}>
                    {extra.options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
              );
            }
            const label = typeof extra === 'string' ? extra : extra.label;
            if (f === 'level') {
              return (
                <FormControl key={f} fullWidth size="small" sx={{ mt: 1.5 }}>
                  <InputLabel>{label}</InputLabel>
                  <Select value={form[f] || ''} label={label} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}>
                    <MenuItem value="executive">مدیریتی</MenuItem>
                    <MenuItem value="expert">کارشناسی</MenuItem>
                    <MenuItem value="operational">عملیاتی</MenuItem>
                  </Select>
                </FormControl>
              );
            }
            return (
              <TextField key={f} fullWidth size="small" label={label} value={form[f] || ''}
                onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} sx={{ mt: 1.5 }} multiline />
            );
          })}
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
 * Company Profile (full form)
 * ============================================================================= */
export const CompanyProfileTab = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data),
  });

  React.useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data) => axiosInstance.put('/settings/company-profile/update/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      queryClient.invalidateQueries({ queryKey: ['company-profile-layout'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const logoUploadMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('logo', file);
      return axiosInstance.post('/settings/company-profile/logo/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      setForm(p => ({ ...p, logo_url: res.data.logo_url, logo: res.data.logo }));
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      queryClient.invalidateQueries({ queryKey: ['company-profile-layout'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setUploadingLogo(false);
    },
    onError: () => setUploadingLogo(false),
  });

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingLogo(true);
      logoUploadMutation.mutate(file);
    }
  };

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      {saved && <Alert severity="success" sx={{ mb: 2 }}>مشخصات شرکت با موفقیت ذخیره شد</Alert>}

      {/* Logo upload section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'rgba(99,102,241,0.04)', borderRadius: 2 }}>
        {form.logo_url ? (
          <Avatar src={form.logo_url} sx={{ width: 72, height: 72, boxShadow: '0 4px 16px rgba(99,102,241,0.25)' }} />
        ) : (
          <Avatar sx={{ width: 72, height: 72, background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
            <BusinessIcon sx={{ fontSize: 36, color: '#fff' }} />
          </Avatar>
        )}
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>لوگوی شرکت</Typography>
          <input
            id="company-logo-input"
            type="file"
            accept="image/*"
            hidden
            onChange={handleLogoUpload}
          />
          <Button
            variant="outlined" size="small" startIcon={<PhotoCameraIcon />}
            onClick={() => document.getElementById('company-logo-input').click()}
            disabled={uploadingLogo}
          >
            {uploadingLogo ? <CircularProgress size={16} /> : (form.logo_url ? 'تغییر لوگو' : 'آپلود لوگو')}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="نام حقوقی شرکت" value={form.legal_name || ''} onChange={e => setForm(p => ({ ...p, legal_name: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="شماره ثبت" value={form.registration_number || ''} onChange={e => setForm(p => ({ ...p, registration_number: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="شناسه ملی" value={form.national_id || ''} onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="کد اقتصادی" value={form.economic_code || ''} onChange={e => setForm(p => ({ ...p, economic_code: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="شناسه مالیاتی" value={form.tax_id || ''} onChange={e => setForm(p => ({ ...p, tax_id: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="تاریخ تأسیس" type="date" InputLabelProps={{ shrink: true }} value={form.established_date || ''} onChange={e => setForm(p => ({ ...p, established_date: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="تلفن" value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="ایمیل" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="وب‌سایت" value={form.website || ''} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="کد پستی" value={form.postal_code || ''} onChange={e => setForm(p => ({ ...p, postal_code: e.target.value }))} /></Grid>
        <Grid item xs={12}><TextField fullWidth size="small" label="آدرس" multiline rows={2} value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></Grid>
        <Grid item xs={12}><TextField fullWidth size="small" label="توضیحات" multiline rows={3} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
      </Grid>
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={() => updateMutation.mutate(form)}>
          {updateMutation.isLoading ? <CircularProgress size={20} /> : t('common.save')}
        </Button>
      </Box>
    </Box>
  );
};