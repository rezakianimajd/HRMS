import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Grid, TextField, Button, FormControl,
  InputLabel, Select, MenuItem, Alert, CircularProgress, Avatar,
  Chip, Divider, List, ListItem, ListItemText, ListItemIcon,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { MONTHS } from './SalaryForm';

const SalaryBulkImport = ({ onSuccess }) => {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(1404);
  const [month, setMonth] = useState('6');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setResult(null);
    setError('');
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axiosInstance.get('/import/template/salary_bulk/', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_salary_bulk.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('خطا در دانلود نمونه فایل');
    }
  };

  const handleUpload = async () => {
    if (!year || !month) { setError('سال و ماه را انتخاب کنید'); return; }
    if (!file) { setError('فایل اکسل را انتخاب کنید'); return; }

    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('import_type', 'salary_bulk');
      fd.append('file', file);
      fd.append('year', year);
      fd.append('month', month);
      const res = await axiosInstance.post('/import/upload/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      queryClient.invalidateQueries({ queryKey: ['salary-years'] });
      queryClient.invalidateQueries({ queryKey: ['employee-salary-records'] });
      if (onSuccess) onSuccess();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || 'خطا در درون‌ریزی');
      setResult(data || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: '#f59e0b' }}>
        درون‌ریزی گروهی فیش حقوقی
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        برای یک سال و ماه مشخص، فایل اکسل حاوی فیش حقوقی همه پرسنل را بارگذاری کنید. اطلاعات در جای خود برای هر پرسنل ثبت می‌شود.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Step 1: Year/Month */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>۱. انتخاب سال و ماه</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={4}>
          <TextField fullWidth size="small" label="سال" type="number" value={year || ''}
            onChange={e => setYear(e.target.value)} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>ماه</InputLabel>
            <Select value={month || ''} label="ماه" onChange={e => setMonth(e.target.value)}>
              {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Step 2: Download template */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>۲. دانلود نمونه فایل</Typography>
      <Button
        variant="outlined" size="small" startIcon={<DownloadIcon />}
        onClick={handleDownloadTemplate}
        sx={{ mb: 2 }}
      >
        دانلود نمونه فایل گروهی
      </Button>

      {/* Step 3: Upload */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>۳. بارگذاری فایل</Typography>
      <Paper
        variant="outlined"
        onClick={() => document.getElementById('bulk-file-input').click()}
        sx={{
          p: 3, mb: 2, textAlign: 'center', cursor: 'pointer',
          borderStyle: 'dashed', transition: 'all 0.2s',
          '&:hover': { borderColor: '#f59e0b', bgcolor: 'rgba(245,158,11,0.03)' },
        }}
      >
        <input id="bulk-file-input" type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
        <CloudUploadIcon sx={{ fontSize: 40, color: '#f59e0b', mb: 1 }} />
        <Typography variant="body2" fontWeight={600}>
          {file ? file.name : 'برای انتخاب فایل اکسل کلیک کنید'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {file ? `${(file.size / 1024).toFixed(0)} KB` : 'فرمت‌های مجاز: .xlsx, .xls'}
        </Typography>
      </Paper>

      <Button variant="contained" onClick={handleUpload} disabled={uploading} startIcon={<UploadFileIcon />}>
        {uploading ? <CircularProgress size={20} /> : 'شروع درون‌ریزی گروهی'}
      </Button>

      {/* Result */}
      {result && (
        <Box sx={{ mt: 3 }}>
          {result.imported_count > 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
              {formatPersianNumber(result.imported_count)} فیش حقوقی برای {toPersianDigits(year)}/{MONTHS.find(m => m.value === String(month))?.label} ثبت شد.
            </Alert>
          ) : (
            <Alert severity="warning" icon={<ErrorIcon />} sx={{ mb: 2 }}>
              هیچ فیشی ثبت نشد.
            </Alert>
          )}

          {result.skipped && result.skipped.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1 }}>
                ردیف‌های رد شده ({toPersianDigits(result.skipped.length)}):
              </Typography>
              <List dense disablePadding>
                {result.skipped.map((s, i) => (
                  <ListItem key={i} disableGutters>
                    <ListItemIcon sx={{ minWidth: 28 }}><ErrorIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText primary={<Typography variant="body2">{s}</Typography>} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default SalaryBulkImport;