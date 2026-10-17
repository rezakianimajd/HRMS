import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Button, IconButton, TextField, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl,
  InputLabel, Select, MenuItem, Chip, Grid, Alert, InputAdornment, alpha, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SearchIcon from '@mui/icons-material/Search';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { formatPersianNumber } from '../../utils/numberUtils';

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
const ACCENT = '#6366f1';

export const EntityManager = ({ endpoint, fields = ['name', 'code'], extraFields = {}, defaultForm = {}, title }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => axiosInstance.get(endpoint).then((r) => r.data),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [endpoint] });
    queryClient.invalidateQueries({ queryKey: ['definition-counts'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? axiosInstance.patch(`${endpoint}${editing.id}/`, payload) : axiosInstance.post(endpoint, payload),
    onSuccess: () => {
      refresh();
      setOpen(false); setEditing(null); setForm({}); setError('');
    },
    onError: (e) => setError(e.response?.data?.detail || 'خطا در ذخیره'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${endpoint}${id}/`),
    onSuccess: refresh,
  });

  const handleOpen = (item = null) => {
    setEditing(item);
    setForm(item ? { ...item } : { ...defaultForm });
    setError('');
    setOpen(true);
  };

  const items = Array.isArray(data) ? data : data?.results || [];
  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    const extraKeys = Object.keys(extraFields);
    return items.filter((item) => (
      [item.name, item.code, ...extraKeys.map((key) => item[key])]
        .some((value) => String(value ?? '').toLowerCase().includes(term))
    ));
  }, [items, search, extraFields]);

  return (
    <Paper elevation={0} sx={{
      borderRadius: '18px', overflow: 'hidden',
      border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
    }}>
      <Box sx={{
        px: { xs: 1.5, md: 2 }, py: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
        background: `linear-gradient(135deg, ${alpha(ACCENT, 0.09)}, transparent)`,
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            <Avatar variant="rounded" sx={{
              width: 34, height: 34, borderRadius: '10px',
              bgcolor: alpha(ACCENT, 0.12), color: ACCENT,
            }}>
              <CategoryOutlinedIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 900 }} noWrap>{title}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }} noWrap>
                {formatPersianNumber(items.length)} رکورد ثبت‌شده
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو…"
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 17 }} /></InputAdornment>) }}
              sx={{ width: { xs: '100%', sm: 190 }, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12.5 } }}
            />
            <Button
              variant="contained" size="small" startIcon={<AddIcon />} onClick={() => handleOpen()}
              sx={{
                borderRadius: '10px', fontWeight: 800, whiteSpace: 'nowrap',
                background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)`,
                boxShadow: `0 8px 18px ${alpha(ACCENT, 0.3)}`,
              }}
            >
              افزودن
            </Button>
          </Stack>
        </Stack>
      </Box>
      {isLoading ? (
        <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress size={26} /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: alpha(ACCENT, 0.1), color: ACCENT }}>
            <InboxOutlinedIcon />
          </Avatar>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>داده‌ای برای نمایش نیست</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            {items.length === 0 ? 'با دکمهٔ «افزودن» اولین رکورد را ثبت کنید.' : 'عبارت جستجو را تغییر دهید.'}
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small" sx={{
            '& th': {
              fontSize: 11, fontWeight: 900, color: 'text.secondary',
              bgcolor: alpha(ACCENT, 0.04),
              borderBottom: '1px solid', borderColor: 'divider',
            },
            '& td': { py: 1.05, borderColor: 'divider' },
          }}>
            <TableHead>
              <TableRow>
                {fields.map((f) => (
                  <TableCell key={f}>{fieldLabel(f)}</TableCell>
                ))}
                {Object.keys(extraFields).map((f) => {
                  const extra = extraFields[f];
                  const headerLabel = (extra && typeof extra === 'object') ? extra.label : extra;
                  return <TableCell key={f}>{headerLabel}</TableCell>;
                })}
                <TableCell align="left" width={90}>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  {fields.map((f) => (
                    <TableCell key={f}>
                      {f === 'name' ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{
                            width: 28, height: 28, fontSize: 11, fontWeight: 800,
                            bgcolor: alpha(ACCENT, 0.12), color: ACCENT,
                          }}>
                            {String(item.name || '?').trim().charAt(0)}
                          </Avatar>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{item.name}</Typography>
                        </Stack>
                      ) : f === 'code' ? (
                        <Chip size="small" label={item.code} sx={{
                          height: 20, fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700,
                          bgcolor: alpha(ACCENT, 0.08), color: ACCENT,
                        }} />
                      ) : item[f]}
                    </TableCell>
                  ))}
                  {Object.keys(extraFields).map((f) => {
                    const value = item[f];
                    const extra = extraFields[f];
                    const isOptions = extra && typeof extra === 'object' && Array.isArray(extra.options);
                    const optionLabel = isOptions
                      ? (extra.options.find((o) => o.value === value) || {}).label
                      : null;
                    return (
                      <TableCell key={f}>
                        {f === 'level' ? (
                          <Chip size="small" label={
                            value === 'executive' ? 'مدیریتی' : value === 'expert' ? 'کارشناسی'
                              : value === 'operational' ? 'عملیاتی' : (value || '—')
                          } sx={{ height: 20, fontSize: 10.5, fontWeight: 700 }} />
                        ) : f === 'archive_folder' ? (
                          value ? (
                            <Chip size="small" variant="outlined" label={value}
                              sx={{ height: 20, fontSize: 10.5, color: '#7c3aed', borderColor: alpha('#7c3aed', 0.45), fontWeight: 700 }} />
                          ) : '—'
                        ) : isOptions ? (
                          <Chip size="small" label={optionLabel || value || '—'}
                            sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }} />
                        ) : (
                          <Typography sx={{ fontSize: 11.5, color: value ? 'text.primary' : 'text.disabled' }} noWrap>
                            {value || '—'}
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell align="left">
                    <IconButton size="small" onClick={() => handleOpen(item)}
                      sx={{ color: ACCENT, '&:hover': { bgcolor: alpha(ACCENT, 0.1) } }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(item.id)}
                      sx={{ '&:hover': { bgcolor: alpha('#ef4444', 0.1) } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filtered.length > 0 ? (
        <Box sx={{
          px: 2, py: 1, display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid', borderColor: 'divider',
        }}>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            نمایش {formatPersianNumber(filtered.length)} از {formatPersianNumber(items.length)} رکورد
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }} noWrap>{endpoint}</Typography>
        </Box>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25, fontWeight: 900, fontSize: 15 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(ACCENT, 0.12), color: ACCENT }}>
            {editing ? <EditIcon sx={{ fontSize: 18 }} /> : <AddIcon sx={{ fontSize: 18 }} />}
          </Avatar>
          {editing ? 'ویرایش رکورد' : 'افزودن رکورد جدید'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>{title}</Typography>
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
          {fields.map((f) => (
            <TextField key={f} fullWidth size="small" label={fieldLabel(f)} value={form[f] || ''}
              onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} sx={{ mt: 1.5 }} />
          ))}
          {Object.keys(extraFields).map((f) => {
            const extra = extraFields[f];
            if (extra && typeof extra === 'object' && extra.options) {
              return (
                <FormControl key={f} fullWidth size="small" sx={{ mt: 1.5 }}>
                  <InputLabel>{extra.label}</InputLabel>
                  <Select value={form[f] || ''} label={extra.label}
                    onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}>
                    {extra.options.map((o) => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );
            }
            const label = typeof extra === 'string' ? extra : extra.label;
            const helper = (extra && typeof extra === 'object') ? extra.helper : '';
            const singleLine = !!(extra && typeof extra === 'object' && extra.single);
            if (f === 'level') {
              return (
                <FormControl key={f} fullWidth size="small" sx={{ mt: 1.5 }}>
                  <InputLabel>{label}</InputLabel>
                  <Select value={form[f] || ''} label={label}
                    onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}>
                    <MenuItem value="executive">مدیریتی</MenuItem>
                    <MenuItem value="expert">کارشناسی</MenuItem>
                    <MenuItem value="operational">عملیاتی</MenuItem>
                  </Select>
                </FormControl>
              );
            }
            return (
              <TextField key={f} fullWidth size="small" label={label} value={form[f] || ''}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} sx={{ mt: 1.5 }}
                helperText={helper || undefined} multiline={!singleLine} />
            );
          })}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isLoading}
            sx={{ borderRadius: '10px', fontWeight: 800, background: `linear-gradient(135deg, ${ACCENT}, #8b5cf6)` }}>
            {saveMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'rgba(99,102,241,0.04)', borderRadius: '10px' }}>
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
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="نام نماینده حقوقی / مدیرعامل" value={form.employer_rep_name || ''} onChange={e => setForm(p => ({ ...p, employer_rep_name: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="سمت نماینده" value={form.employer_rep_title || ''} onChange={e => setForm(p => ({ ...p, employer_rep_title: e.target.value }))} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="کد ملی نماینده" value={form.employer_rep_national_id || ''} onChange={e => setForm(p => ({ ...p, employer_rep_national_id: e.target.value }))} /></Grid>
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