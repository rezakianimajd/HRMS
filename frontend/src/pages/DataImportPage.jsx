import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Stack, Chip, Alert, Button, Grid,
  CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/* P5b: درونریزی داده — انتخاب نوع، دانلود Template، آپلود (اکسل) */
const DataImportPage = () => {
  const queryClient = useQueryClient();
  const [importType, setImportType] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: types, isLoading } = useQuery({
    queryKey: ['import-types'],
    queryFn: () => axiosInstance.get('/import/types/').then(r => r.data),
  });
  const list = Array.isArray(types) ? types : (types?.types || []);

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
    if (!importType) { setError('نوع درونریزی را انتخاب کنید'); return; }
    if (!file) { setError('فایل را انتخاب کنید'); return; }
    setUploading(true); setError(''); setResult(null);
    const fd = new FormData();
    fd.append('import_type', importType);
    fd.append('file', file);
    try {
      const res = await axiosInstance.post('/import/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      // invalidate caches of all reloadable modules so data appears instantly
      ['employees', 'departments', 'salaries', 'benefits'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      const d = e.response?.data;
      setError(d?.error || 'خطا در درونریزی');
      if (d?.skipped) setResult(d);
    } finally { setUploading(false); }
  };

  return (
    <Box>
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(99,102,241,0.03), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.18)',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
          <UploadFileIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800}>درونریزی داده از فایل اکسل</Typography>
          <Typography variant="body2" color="textSecondary">
            نوع داده را انتخاب، نمونه فایل را دانلود و فایل نهایی را بارگذاری کنید
          </Typography>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {result?.imported_count !== undefined && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {result.imported_count} ردیف ثبت شد
          {result.skipped_count ? ` — ${result.skipped_count} ردیف رد شد` : ''}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 1.5 }}>
          {list.map((t) => (
            <Paper key={t.key}
              onClick={() => { setImportType(t.key); setResult(null); setError(''); }}
              sx={{
                p: 1.5, borderRadius: 2, cursor: 'pointer',
                border: importType === t.key ? '2px solid #f59e0b' : '1px solid rgba(0,0,0,0.08)',
                background: importType === t.key ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.15s',
              }}>
              <Chip size="small" label={t.label} color={importType === t.key ? 'warning' : 'default'}
                sx={{ mb: 0.5, fontWeight: 700 }} />
              <Typography variant="caption" color="textSecondary">{t.description}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {importType && (
        <Paper sx={{ mt: 2, p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{list.find(t => t.key === importType)?.label}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}
              sx={{ color: '#b45309', borderColor: 'rgba(245,158,11,0.4)' }}>دانلود نمونه</Button>
            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}
              sx={{ color: '#b45309', borderColor: 'rgba(245,158,11,0.4)' }}>
              {file ? `فایل: ${file.name}` : 'انتخاب فایل اکسل'}
              <input type="file" hidden accept=".xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); }} />
            </Button>
            <Button variant="contained" disabled={!file || uploading} onClick={handleUpload}
              sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
              {uploading ? <CircularProgress size={18} color="inherit" /> : 'درونریزی'}
            </Button>
          </Stack>
        </Paper>
      )}

      {result?.skipped?.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {result.skipped.slice(0, 10).join(' — ')}
        </Alert>
      )}
    </Box>
  );
};

export default DataImportPage;