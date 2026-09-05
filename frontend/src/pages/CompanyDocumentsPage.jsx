import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, TextField, IconButton, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, Alert, Stack, Grid, Tooltip, Divider,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArchiveIcon from '@mui/icons-material/Archive';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const CATEGORIES = [
  { value: 'contract', label: 'قرارداد سازمانی', color: '#6366f1' },
  { value: 'agreement', label: 'تفاهم‌نامه', color: '#0ea5e9' },
  { value: 'official', label: 'ابلاغیه/بخشنامه رسمی', color: '#f59e0b' },
  { value: 'license', label: 'مجوز/پروانه', color: '#10b981' },
  { value: 'audit', label: 'گزارش حسابرسی/مالی', color: '#ef4444' },
  { value: 'insurance', label: 'بیمه‌نامه', color: '#8b5cf6' },
  { value: 'certificate', label: 'گواهی/گواهینامه', color: '#14b8a6' },
  { value: 'hr_doc', label: 'مستندات منابع انسانی', color: '#ec4899' },
  { value: 'legal', label: 'اسناد حقوقی', color: '#64748b' },
  { value: 'other', label: 'سایر', color: '#94a3b8' },
];

const emptyForm = {
  id: null,
  title: '',
  category: 'contract',
  reference_number: '',
  issue_date: '',
  expiry_date: '',
  file: null,
  tags: '',
  description: '',
};

const CompanyDocumentsPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['company-documents'],
    queryFn: () => axiosInstance.get('/organization-documents/').then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  const filtered = items.filter(doc => {
    const term = search.trim().toLowerCase();
    const matchTerm = !term || (doc.title || '').toLowerCase().includes(term) ||
      (doc.reference_number || '').toLowerCase().includes(term) ||
      (doc.tags || '').toLowerCase().includes(term);
    const matchCat = !categoryFilter || doc.category === categoryFilter;
    return matchTerm && matchCat;
  });

  const categoryInfo = (v) => CATEGORIES.find(c => c.value === v) || CATEGORIES[CATEGORIES.length - 1];

  const fileIcon = (ext) => {
    if (ext === '.pdf') return <PictureAsPdfIcon />;
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return <ImageIcon />;
    return <InsertDriveFileIcon />;
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const fd = new FormData();
      fd.append('title', payload.title);
      fd.append('category', payload.category);
      fd.append('reference_number', payload.reference_number || '');
      fd.append('issue_date', payload.issue_date || '');
      fd.append('expiry_date', payload.expiry_date || '');
      fd.append('tags', payload.tags || '');
      fd.append('description', payload.description || '');
      if (payload.file) fd.append('file', payload.file);

      if (payload.id) return axiosInstance.patch(`/organization-documents/${payload.id}/`, fd);
      return axiosInstance.post('/organization-documents/', fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      setOpen(false); setError('');
    },
    onError: (e) => setError(e.response?.data?.detail || 'خطا در ذخیره سند'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/organization-documents/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company-documents'] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const openEdit = (doc) => {
    setEditing(doc);
    setForm({
      id: doc.id,
      title: doc.title || '',
      category: doc.category || 'contract',
      reference_number: doc.reference_number || '',
      issue_date: doc.issue_date || '',
      expiry_date: doc.expiry_date || '',
      file: null,
      tags: doc.tags || '',
      description: doc.description || '',
    });
    setError('');
    setOpen(true);
  };

  const expiredCount = items.filter(d => d.is_expired).length;

  return (
    <Box>
      {/* Page header - glass hero */}
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.16)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
              <ArchiveIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#b45309' }}>بایگانی اسناد سازمان</Typography>
              <Typography variant="body2" color="textSecondary">
                مدیریت متمرکز قراردادها، مجوزها، بیمه‌نامه‌ها و اسناد رسمی شرکت
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<FolderIcon />}
              label={`${formatPersianNumber(items.length)} سند`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}
            />
            {expiredCount > 0 && (
              <Chip
                icon={<WarningAmberIcon />}
                label={`${formatPersianNumber(expiredCount)} منقضی`}
                color="error"
                sx={{ fontWeight: 700 }}
              />
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
              sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 2, px: 3 }}>
              بایگانی سند جدید
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Filters row */}
      <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2.5, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            placeholder="جستجو در عنوان، شماره ثبت، برچسب‌ها..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: (
              <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            ) }}
          />
          <FormControl sx={{ minWidth: { xs: '100%', md: 220 } }} size="small">
            <InputLabel>دسته‌بندی</InputLabel>
            <Select value={categoryFilter} label="دسته‌بندی"
              onChange={e => setCategoryFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Documents grid */}
      {isLoading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <ArchiveIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>سندی یافت نشد</Typography>
          <Typography variant="body2" color="textSecondary">
            برای شروع، سند سازمانی جدیدی را بایگانی کنید.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((doc) => {
            const cat = categoryInfo(doc.category);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
                <Paper sx={{
                  height: '100%',
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  border: `1px solid ${doc.is_expired ? 'rgba(239,68,68,0.3)' : `${cat.color}1f`}`,
                  background: `linear-gradient(160deg, ${cat.color}0a, rgba(255,255,255,0.5))`,
                  transition: 'all 0.25s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 32px ${cat.color}24` },
                }}>
                  {/* Card top: colored ribbon */}
                  <Box sx={{
                    height: 5,
                    background: `linear-gradient(90deg, ${cat.color}, ${cat.color}66)`,
                    opacity: doc.is_expired ? 0.8 : 1,
                  }} />

                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: `${cat.color}22`, color: cat.color }}>
                        {fileIcon(doc.file_extension)}
                      </Avatar>
                      <Chip size="small" label={doc.category_display || cat.label} sx={{
                        fontSize: '0.68rem', fontWeight: 700,
                        bgcolor: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}30`,
                      }} />
                    </Box>

                    <Tooltip title={doc.title || ''} placement="top">
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {doc.title || 'بدون عنوان'}
                      </Typography>
                    </Tooltip>

                    {doc.reference_number && (
                      <Typography variant="caption" color="textSecondary" display="flex" alignItems="center" gap={0.5} sx={{ mt: 0.5 }}>
                        <DescriptionIcon sx={{ fontSize: 13 }} /> {doc.reference_number}
                      </Typography>
                    )}

                    <Stack spacing={0.5} sx={{ mt: 1.2 }}>
                      {doc.issue_date && (
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <CalendarTodayIcon sx={{ fontSize: 13 }} />
                          صدور: {toJalali(doc.issue_date)}
                        </Typography>
                      )}
                      {doc.expiry_date && (
                        <Typography variant="caption"
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 0.75,
                            color: doc.is_expired ? 'error.main' : 'text.secondary',
                            fontWeight: doc.is_expired ? 700 : 400,
                          }}>
                          <WarningAmberIcon sx={{ fontSize: 13 }} />
                          انقضا: {toJalali(doc.expiry_date)}
                          {doc.is_expired && ' (منقضی)'}
                        </Typography>
                      )}
                      {!doc.issue_date && !doc.expiry_date && (
                        <Typography variant="caption" color="text.disabled">تاریخی ثبت نشده</Typography>
                      )}
                    </Stack>

                    {doc.tags && (
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {doc.tags.split(',').slice(0, 3).map((tag, i) => (
                          <Chip key={i} size="small" label={tag.trim()} variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem', color: '#64748b', borderColor: '#e2e8f0' }} />
                        ))}
                      </Box>
                    )}

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon fontSize="small" />}
                          onClick={() => openEdit(doc)}
                          sx={{ mr: 0.5, fontSize: '0.7rem' }}
                        >
                          ویرایش
                        </Button>
                        <IconButton size="small" color="error"
                          onClick={() => { if (window.confirm('حذف این سند سازمانی؟')) deleteMutation.mutate(doc.id); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CloudUploadIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />}
                            sx={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}aa)`, fontSize: '0.7rem' }}
                          >
                            دریافت
                          </Button>
                        </a>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#b45309' }}>
          {editing ? 'ویرایش سند سازمانی' : 'بایگانی سند جدید'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="عنوان سند *" required value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <FormControl fullWidth size="small">
            <InputLabel>دسته‌بندی</InputLabel>
            <Select value={form.category} label="دسته‌بندی"
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField fullWidth size="small" label="شماره ثبت/مرجع" value={form.reference_number}
              onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              fullWidth size="small" label="تاریخ صدور" type="date"
              value={form.issue_date}
              inputProps={{ lang: 'fa' }}
              onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth size="small" label="تاریخ انقضا" type="date"
              value={form.expiry_date}
              onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <TextField fullWidth size="small" label="برچسب‌ها (با ویرگول جدا کنید)" value={form.tags}
            onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />

          {editing ? (
            <Typography variant="caption" color="textSecondary">
              برای جایگزینی فایل، فایل جدید انتخاب کنید (خالی = بدون تغییر).
            </Typography>
          ) : null}

          {!editing || !editing.file_extension || editing.file_extension === '' ? (
            /* Always allow picking file on new */
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              sx={{ borderColor: '#f59e0b55', color: '#b45309' }}
            >
              {form.file ? `انتخاب شده: ${form.file.name}` : 'انتخاب فایل (PDF, تصویر, DOCX, XLSX) *'}
              <input type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) setForm(p => ({ ...p, file: f })); }} />
            </Button>
          ) : (
            /* When editing and we have an existing file - we can still pick a new one */
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              sx={{ borderColor: '#f59e0b55', color: '#b45309' }}
            >
              {form.file ? `انتخاب شده: ${form.file.name}` : 'انتخاب فایل جدید'}
              <input type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) setForm(p => ({ ...p, file: f })); }} />
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained"
            sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
            disabled={!form.title || (!editing && !form.file)}
            onClick={() => saveMutation.mutate(form)}>
            {editing ? 'ذخیره تغییرات' : 'بایگانی سند'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyDocumentsPage;