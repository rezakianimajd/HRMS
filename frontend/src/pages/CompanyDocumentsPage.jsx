import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, TextField, IconButton, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, Alert, Stack, Grid, Tooltip, Divider,
  InputAdornment, Tabs, Tab,
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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArchiveIcon from '@mui/icons-material/Archive';
import RecapIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useEmployees } from '../core/hooks/useEmployees';

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
  employee: '',
  reference_number: '',
  issue_date: '',
  expiry_date: '',
  file: null,
  tags: '',
  description: '',
};

const fileIcon = (ext) => {
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return <ImageIcon />;
  if (ext === '.pdf') return <PictureAsPdfIcon />;
  return <InsertDriveFileIcon />;
};

const CompanyDocumentsPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0); // 0=Organisation archive, 1=Employee documents
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // selected employee when viewing employee-documents tab
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  // ---- Organisation documents ----
  const { data, isLoading } = useQuery({
    queryKey: ['company-documents'],
    queryFn: () => axiosInstance.get('/organization-documents/').then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  // ---- Employee documents (lazy: only when a person is chosen) ----
  const { data: empDocsData, isLoading: empDocLoading } = useQuery({
    queryKey: ['employee-docs-archive', selectedEmployeeId],
    queryFn: () => axiosInstance.get('/documents/', { params: { employee_id: selectedEmployeeId } }).then(r => r.data),
    enabled: !!selectedEmployeeId,
  });
  const empDocs = Array.isArray(empDocsData) ? empDocsData : empDocsData?.results || [];

  const docEmployee = empList.find(x => String(x.id) === String(selectedEmployeeId));

  const filtered = items.filter(doc => {
    const term = search.trim().toLowerCase();
    const matchTerm = !term || (doc.title || '').toLowerCase().includes(term) ||
      (doc.reference_number || '').toLowerCase().includes(term) ||
      (doc.tags || '').toLowerCase().includes(term) ||
      (doc.employee_name || '').toLowerCase().includes(term);
    const matchCat = !categoryFilter || doc.category === categoryFilter;
    return matchTerm && matchCat;
  });

  const categoryInfo = (v) => CATEGORIES.find(c => c.value === v) || CATEGORIES[CATEGORIES.length - 1];

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const fd = new FormData();
      fd.append('title', payload.title || '');
      fd.append('category', payload.category || 'contract');
      fd.append('reference_number', payload.reference_number || '');
      fd.append('issue_date', payload.issue_date || '');
      fd.append('expiry_date', payload.expiry_date || '');
      fd.append('tags', payload.tags || '');
      fd.append('description', payload.description || '');
      if (payload.employee) fd.append('employee', payload.employee);
      if (payload.file) fd.append('file', payload.file);

      if (payload.id) return axiosInstance.patch(`/organization-documents/${payload.id}/`, fd);
      return axiosInstance.post('/organization-documents/', fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-documents'] });
      setOpen(false); setError('');
    },
    onError: (e) => {
      console.error('Archive save error:', e.response?.data || e);
      setError(e.response?.data?.detail || e.response?.data?.file?.[0] || 'خطا در ذخیره سند');
    },
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
      employee: doc.employee || '',
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
      {/* ============ Page header ============ */}
      <Paper sx={{
        p: 3, mb: 2, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.16)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
              <ArchiveIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#b45309' }}>بایگانی اسناد</Typography>
              <Typography variant="body2" color="textSecondary">
                اسناد سازمانی و مدارک پرسنلی در یک‌جا — به تفکیک دو بخش
              </Typography>
            </Box>
          </Box>
          {activeTab === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
              sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 2, px: 3 }}>
              بایگانی سند سازمانی جدید
            </Button>
          )}
        </Box>
      </Paper>

      {/* ============ Tabs: Organisation / Employee ============ */}
      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<ArchiveIcon />} iconPosition="start" label="اسناد سازمانی" />
        <Tab icon={<PersonSearchIcon />} iconPosition="start" label="مدارک پرسنلی" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ============ TAB 0: Organisation documents ============ */}
      {activeTab === 0 && (
        <>
          <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2.5, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                fullWidth size="small"
                placeholder="جستجو در عنوان، پرسنل، شماره ثبت، برچسب‌ها..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
              />
              <FormControl sx={{ minWidth: { xs: '100%', md: 200 } }} size="small">
                <InputLabel>دسته‌بندی</InputLabel>
                <Select value={categoryFilter} label="دسته‌بندی" onChange={e => setCategoryFilter(e.target.value)}>
                  <MenuItem value="">همه</MenuItem>
                  {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Paper>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Chip icon={<FolderIcon />} label={`${formatPersianNumber(items.length)} سند سازمانی`} sx={{ fontWeight: 700, bgcolor: 'rgba(245,158,11,0.1)', color: '#b45309' }} />
            {expiredCount > 0 && <Chip icon={<WarningAmberIcon />} label={`${formatPersianNumber(expiredCount)} منقضی`} color="error" sx={{ fontWeight: 700 }} />}
          </Box>

          {isLoading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
              <ArchiveIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">سندی یافت نشد</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {filtered.map((doc) => {
                const cat = categoryInfo(doc.category);
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
                    <Paper sx={{
                      height: '100%', borderRadius: 2.5, overflow: 'hidden',
                      border: `1px solid ${doc.is_expired ? 'rgba(239,68,68,0.3)' : `${cat.color}1f`}`,
                      background: `linear-gradient(160deg, ${cat.color}0a, rgba(255,255,255,0.5))`,
                      transition: 'all 0.25s ease',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 32px ${cat.color}24` },
                    }}>
                      <Box sx={{ height: 5, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}66)` }} />
                      <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: `${cat.color}22`, color: cat.color }}>
                            {fileIcon(doc.file_extension)}
                          </Avatar>
                          <Chip size="small" label={doc.category_display || cat.label}
                            sx={{ fontSize: '0.68rem', fontWeight: 700, bgcolor: `${cat.color}18`, color: cat.color }} />
                        </Box>
                        <Tooltip title={doc.title || ''}>
                          <Typography variant="subtitle1" fontWeight={700} noWrap>{doc.title || 'بدون عنوان'}</Typography>
                        </Tooltip>
                        {doc.employee_name && (
                          <Typography variant="caption" color="#8b5cf6" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 13 }} /> {doc.employee_name}
                          </Typography>
                        )}
                        {doc.reference_number && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.25 }}>{doc.reference_number}</Typography>
                        )}
                        {doc.issue_date && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.25 }}>
                            صدور: {toJalali(doc.issue_date)}
                          </Typography>
                        )}
                        {doc.expiry_date && (
                          <Typography variant="caption" color={doc.is_expired ? 'error.main' : 'text.secondary'}
                            sx={{ display: 'block', fontWeight: doc.is_expired ? 700 : 400 }}>
                            انقضا: {toJalali(doc.expiry_date)} {doc.is_expired && ' (منقضی)'}
                          </Typography>
                        )}
                        <Divider sx={{ my: 1.5 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <IconButton size="small" onClick={() => openEdit(doc)} sx={{ color: cat.color }}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error"
                              onClick={() => { if (window.confirm('حذف این سند سازمانی؟')) deleteMutation.mutate(doc.id); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {doc.file_url && (
                            <Button size="small" component="a" href={doc.file_url} target="_blank" rel="noreferrer"
                              sx={{ color: cat.color, fontSize: '0.7rem' }}>دریافت</Button>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}

      {/* ============ TAB 1: Employee documents (two-way archive) ============ */}
      {activeTab === 1 && (
        <Box>
          <Paper sx={{ p: 2.5, mb: 2, borderRadius: 2.5, border: '1px solid rgba(139,92,246,0.18)' }}>
            <Typography variant="subtitle1" fontWeight={700} color="#7c3aed" sx={{ mb: 1.5 }}>
              مدارک ثبت‌شده در پرونده پرسنلی
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
              یک پرسنل را انتخاب کن تا تمام مدارکش (که در پرونده بارگذاری شده) با عنوان و نوع در این بایگانی نمایش داده شود.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
              <FormControl sx={{ minWidth: { xs: '100%', md: 280 } }} size="small">
                <InputLabel>پرسنل</InputLabel>
                <Select value={selectedEmployeeId || ''} label="پرسنل" onChange={e => setSelectedEmployeeId(e.target.value)}>
                  <MenuItem value=""><em>— انتخاب پرسنل —</em></MenuItem>
                  {empList.map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</MenuItem>)}
                </Select>
              </FormControl>
              {selectedEmployeeId && (
                <>
                  <Button variant="outlined" color="secondary" startIcon={<PersonIcon />}
                    onClick={() => navigate(`/employees/${selectedEmployeeId}`)}>
                    مشاهده پرونده
                  </Button>
                  <Button variant="contained" startIcon={<RecapIcon />}
                    onClick={() => navigate(`/employees/${selectedEmployeeId}/edit`)}
                    sx={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                    بارگذاری مدرک در پرونده
                  </Button>
                </>
              )}
            </Stack>
          </Paper>

          {!selectedEmployeeId ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
              <PersonSearchIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography color="textSecondary">برای مشاهده مدارک، ابتدا پرسنل را انتخاب کنید</Typography>
            </Paper>
          ) : empDocLoading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : !empDocs || empDocs.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
              <Typography color="textSecondary">مدرکی در پرونده «{docEmployee?.full_name || ''}» ثبت نشده است</Typography>
            </Paper>
          ) : (
            <>
              <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={`${formatPersianNumber(empDocs.length)} مدرک برای ${docEmployee?.full_name || ''}`} color="secondary" sx={{ fontWeight: 700 }} />
              </Box>
              <Grid container spacing={2}>
                {empDocs.map(doc => {
                  const typeColor = '#8b5cf6';
                  return (
                    <Grid item xs={12} sm={6} md={4} key={doc.id}>
                      <Paper sx={{
                        p: 2, height: '100%', borderRadius: 2.5,
                        border: `1px solid ${typeColor}22`,
                        background: `linear-gradient(160deg, ${typeColor}08, rgba(255,255,255,0.5))`,
                        transition: 'all 0.2s ease',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 10px 24px ${typeColor}18` },
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 34, height: 34, bgcolor: `${typeColor}20`, color: typeColor }}>
                              {fileIcon(doc.file_extension)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: 160 }}>{doc.title}</Typography>
                              <Typography variant="caption" color="textSecondary" display="block">{doc.employee_name}</Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Chip label={doc.document_type_name} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', color: typeColor, borderColor: `${typeColor}40` }} />
                        {doc.issue_date && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.75 }}>
                            صدور: {toJalali(doc.issue_date)}
                          </Typography>
                        )}
                        {doc.expiry_date && doc.days_until_expiry != null && (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip size="small"
                              label={doc.is_expired ? 'منقضی' : doc.days_until_expiry <= 30 ? 'در آستانه انقضا' : 'معتبر'}
                              color={doc.is_expired ? 'error' : doc.days_until_expiry <= 30 ? 'warning' : 'success'}
                              variant={doc.is_expired || doc.days_until_expiry <= 30 ? 'filled' : 'outlined'}
                              sx={{ height: 20, fontSize: '0.65rem' }} />
                          </Box>
                        )}
                        <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${typeColor}15`, display: 'flex', justifyContent: 'flex-end' }}>
                          {doc.file && (
                            <Button size="small" component="a" href={doc.file} target="_blank" rel="noreferrer"
                              sx={{ color: typeColor, fontSize: '0.7rem' }}>دریافت / مشاهده</Button>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </>
          )}
        </Box>
      )}

      {/* ============ Add / Edit Organisation doc dialog (Jalali dates) ============ */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#b45309' }}>
          {editing ? 'ویرایش سند سازمانی' : 'بایگانی سند سازمانی جدید'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.6, mt: 1 }}>
          <TextField fullWidth size="small" label="عنوان سند *" required value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <FormControl fullWidth size="small">
            <InputLabel>دسته‌بندی</InputLabel>
            <Select value={form.category} label="دسته‌بندی" onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>پرسنل مرتبط (اختیاری)</InputLabel>
            <Select value={form.employee || ''} label="پرسنل مرتبط (اختیاری)"
              onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}>
              <MenuItem value="">— بدون پرسنل —</MenuItem>
              {empList.map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="شماره ثبت/مرجع" value={form.reference_number}
            onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} />

          <JalaliDatePicker fullWidth label="تاریخ صدور (شمسی)" value={form.issue_date}
            onChange={g => setForm(p => ({ ...p, issue_date: g }))} />
          <JalaliDatePicker fullWidth label="تاریخ انقضا (شمسی)" value={form.expiry_date}
            onChange={g => setForm(p => ({ ...p, expiry_date: g }))} />

          <TextField fullWidth size="small" label="برچسب‌ها (با ویرگول)" value={form.tags}
            onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />

          <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}
            sx={{ borderColor: '#f59e0b55', color: '#b45309' }}>
            {form.file ? `فایل: ${form.file.name}` : (editing ? 'انتخاب فایل جدید (اختیاری)' : 'انتخاب فایل (PDF, تصویر, DOCX, XLSX) *')}
            <input type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) setForm(p => ({ ...p, file: f })); }} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
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