import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Stack, Chip, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SchoolIcon from '@mui/icons-material/School';

/* ۶) صفحهی یکپارچه درونریزی داده
 *    همهی import types را با توضیح کامل (ستونها، الزامیها، نمونه) در یک صفحه فهرست میکند.
 */
const DataImportPage = () => {
  const qc = useQueryClient();
  const [importType, setImportType] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const { data: types, isLoading } = useQuery({
    queryKey: ['import-types'],
    queryFn: () => axiosInstance.get('/import/types/').then(r => r.data),
  });
  const list = Array.isArray(types) ? types : (types?.types || []);

  const selected = list.find(t => t.key === importType);

  const handleDownload = async () => {
    if (!importType) { setError('نوع درونریزی را انتخاب کنید'); return; }
    setError('');
    try {
      const res = await axiosInstance.get(`/import/template/${importType}/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `template_${importType}.xlsx`);
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { setError('خطا در دانلود نمونه فایل'); }
  };

  const handleUpload = async () => {
    if (!importType) { setError('ابتدا نوع درونریزی را انتخاب کنید'); return; }
    if (!file) { setError('فایل اکسل را انتخاب کنید'); return; }
    setUploading(true); setError(''); setResult(null);
    const fd = new FormData();
    fd.append('import_type', importType);
    fd.append('file', file);
    try {
      const res = await axiosInstance.post('/import/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      ['employees', 'departments', 'job-titles', 'work-locations', 'insurance-lists', 'salaries', 'benefits', 'attendance-records', 'leave-requests'].forEach(k =>
        qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      const d = e.response?.data;
      setError(d?.error || 'خطا در درونریزی');
      if (d) setResult(d);
    } finally { setUploading(false); }
  };

  const TYPE_BADGE = (t) => (
    <Chip size="small"
      label={t.required && t.required.length ? ` الزامی: ${t.required.map(r => r.replace(/_/g,' ')).join('، ')} ` : 'بدون الزامی'}
      variant="outlined" sx={{ mt: 1, fontSize: '0.66rem' }} />
  );

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.12), rgba(99,102,241,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.2)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
            <UploadFileIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800}>درونریزی داده از فایل اکسل</Typography>
            <Typography variant="body2" color="textSecondary">
              همهٔ درونریزیهای سیستم اینجا انجام میشوند — نوع را انتخاب، نمونه را دانلود، فایل را بارگذاری کنید.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<InfoOutlinedIcon />} onClick={() => setHelpOpen(true)}>
            راهنمای ستونها
          </Button>
        </Box>
      </Paper>

      {/* Alert feedback */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {result?.imported_count !== undefined && (
        <Alert severity={result.imported_count > 0 ? 'success' : 'warning'} sx={{ mb: 2 }} onClose={() => setResult(null)}>
          {result.imported_count > 0
            ? `✅ ${result.message || 'درونریزی موفق'} — ${result.imported_count} ردیف ثبت شد${result.skipped_count ? `، ${result.skipped_count} رد شد` : ''}`
            : (result.validation_errors?.length
                ? `⚠️ ${result.validation_errors.length} ردیف خطای اعتبارسنجی دارد`
                : `⚠️ ${result.error || 'خطا'}`)}
        </Alert>
      )}
      {result?.validation_errors?.length > 0 && (
        <Paper sx={{ mb: 2, p: 1.5, maxHeight: 130, overflow: 'auto', fontSize: '0.72rem' }}>
          {result.validation_errors.slice(0, 10).map((v, i) => (
            <Typography key={i} variant="caption" color="error" display="block">
              ردیف {v.row}: {v.errors.join(' — ')}
            </Typography>
          ))}
        </Paper>
      )}
      {result?.skipped?.length > 0 && (
        <Paper sx={{ mb: 2, p: 1.5, maxHeight: 100, overflow: 'auto' }}>
          <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>رد شدهها: </Typography>
          <Typography variant="caption">{result.skipped.slice(0, 10).join(' — ')}</Typography>
        </Paper>
      )}

      {/* Card-grid of import types */}
      {isLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 1.5 }}>
          {list.map(t => (
            <Paper
              key={t.key}
              onClick={() => { setImportType(t.key); setResult(null); setError(''); setFile(null); }}
              sx={{
                p: 1.5, borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s',
                border: importType === t.key ? '2px solid #f59e0b' : '1px solid rgba(0,0,0,0.08)',
                background: importType === t.key ? 'rgba(245,158,11,0.10)' : 'rgba(255,255,255,0.6)',
              }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon sx={{ color: '#b45309' }} />
                <Typography variant="subtitle1" fontWeight={700}>{t.label}</Typography>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5, minHeight: 34 }}>
                {t.description || ''}
              </Typography>
              {t.persian_headers && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748b' }} dir="rtl">
                  ستونها: {t.persian_headers.join('، ')}
                </Typography>
              )}
              {TYPE_BADGE(t)}
            </Paper>
          ))}
        </Box>
      )}

      {/* Upload area for selected type */}
      {selected && (
        <Paper sx={{ mt: 2.5, p: 2.5, borderRadius: 2.5, border: '1px dashed rgba(245,158,11,0.4)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>درونریزی: {selected.label}</Typography>
            <Button size="small" variant="outlined" startIcon={<InfoOutlinedIcon />} onClick={() => setHelpOpen(true)}>
              فیلد الزامی {selected.required?.length}
            </Button>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}
              sx={{ borderColor: 'rgba(245,158,11,0.5)', color: '#b45309' }}>
              دانلود نمونه فایل
            </Button>
            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}
              sx={{ borderColor: 'rgba(245,158,11,0.5)', color: '#b45309' }}>
              {file ? `فایل: ${file.name}` : 'انتخاب فایل اکسل (.xlsx / .xls)'}
              <input type="file" hidden accept=".xlsx,.xls" onChange={ev => { setFile(ev.target.files?.[0] || null); setResult(null); }} />
            </Button>
            <Button variant="contained" disabled={!file || uploading} onClick={handleUpload}
              sx={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
              {uploading ? <CircularProgress size={18} color="inherit" /> : 'درونریزی'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Help dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#b45309' }}>راهنمای ستونهای فایل اکسل</DialogTitle>
        <DialogContent dividers>
          {(selected || {}).persian_headers && (
            <>
              <Typography variant="subtitle2" fontWeight={700}>ستونها (به ترتیب):</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {selected.persian_headers.map((h, idx) => (
                  <Chip key={idx} size="small" label={h} sx={{
                    bgcolor: selected.required?.includes(selected.headers?.[idx]) ? 'rgba(245,158,11,0.18)' : 'rgba(100,116,139,0.08)',
                    color: selected.required?.includes(selected.headers?.[idx]) ? '#b45309' : '#475569',
                    fontWeight: selected.required?.includes(selected.headers?.[idx]) ? 700 : 400,
                  }} />
                ))}
              </Stack>
              <Alert severity="info" sx={{ mt: 2 }}>
                فیلدهای با پسزمینه نارنجی الزامیاند. تاریخها را میتوانید بهصورت شمسی (مثال ۱۴۰۴/۰۶/۱۵) یا میلادی بنویسید.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setHelpOpen(false)}>بستن</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataImportPage;