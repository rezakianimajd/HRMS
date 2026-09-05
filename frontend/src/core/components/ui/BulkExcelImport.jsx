import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Button, Alert, CircularProgress, Stack, Chip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * Reusable Excel bulk-import panel (2026).
 * Props:
 *  - importType: 'attendance_bulk' | 'leave_bulk'
 *  - title / description / accent color
 *  - invalidateKeys: array of react-query keys to refresh
 */
const BulkExcelImport = ({
  importType,
  title = 'درون‌ریزی گروهی اکسل',
  description = 'فایل نمونه را دانلود، تکمیل و بارگذاری کنید.',
  accent = '#0ea5e9',
  invalidateKeys = [],
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      setError('');
      const response = await axiosInstance.get(`/import/template/${importType}/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_${importType}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('خطا در دانلود نمونه فایل');
    }
  };

  const handleUpload = async () => {
    if (!file) { setError('فایل را انتخاب کنید'); return; }
    setUploading(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('import_type', importType);
      fd.append('file', file);
      const res = await axiosInstance.post('/import/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      invalidateKeys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    } catch (err) {
      const data = err.response?.data;
      if (data?.validation_errors?.length) {
        setResult({
          error: data?.error || 'خطا',
          imported_count: 0,
          total_rows: data?.total_rows || 0,
          validation_errors: data?.validation_errors || [],
        });
      } else {
        setError(data?.error || 'خطا در درون‌ریزی');
      }
    } finally {
      setUploading(false);
    }
  };

  const previewErrorCount = result?.validation_errors?.length || 0;

  return (
    <Paper sx={{
      p: 2.5, mt: 3, borderRadius: 2.5, mb: 2,
      background: `linear-gradient(120deg, ${accent}0a, rgba(255,255,255,0.5))`,
      border: `1px solid ${accent}22`,
    }}>
      <Typography variant="h6" fontWeight={700} sx={{ color: accent, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{description}</Typography>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

      {result && result.imported_count > 0 && (
        <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mb: 1.5 }}>
          درون‌ریزی موفق: {result.imported_count} ردیف ثبت شد
          {result.skipped_count > 0 && ` — ${result.skipped_count} ردیف رد شد`}
        </Alert>
      )}
      {previewErrorCount > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          <b>{result?.error || 'برخی ردیف‌ها خطا دارند'}</b>
          {' '}({previewErrorCount} ردیف)
        </Alert>
      )}
      {result?.validation_errors?.length > 0 && (
        <Box sx={{ maxHeight: 140, overflow: 'auto', mb: 1.5, p: 1, bgcolor: 'rgba(255,255,255,0.6)', borderRadius: 1, fontSize: '0.75rem' }}>
          {result.validation_errors.slice(0, 10).map((v, i) => (
            <Typography key={i} variant="caption" display="block" color="error" sx={{ py: 0.25 }}>
              ردیف {v.row}: {v.errors.join('، ')}
            </Typography>
          ))}
        </Box>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
        <Button
          variant="outlined" size="small" startIcon={<DownloadIcon />}
          onClick={handleDownloadTemplate}
          sx={{ color: accent, borderColor: `${accent}66` }}
        >
          دانلود نمونه فایل
        </Button>

        <Button
          component="label" variant="outlined" size="small" startIcon={<CloudUploadIcon />}
          sx={{ color: accent, borderColor: `${accent}66` }}
        >
          {file ? `انتخاب شده: ${file.name}` : 'انتخاب فایل اکسل'}
          <input type="file" hidden accept=".xlsx,.xls" onChange={e => {
            setFile(e.target.files?.[0] || null);
            setResult(null); setError('');
          }} />
        </Button>

        <Button
          variant="contained" size="small" disabled={!file || uploading}
          onClick={handleUpload}
          sx={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
        >
          {uploading ? <CircularProgress size={18} color="inherit" /> : 'درون‌ریزی'}
        </Button>
      </Stack>
    </Paper>
  );
};

export default BulkExcelImport;