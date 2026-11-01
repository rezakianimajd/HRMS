import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert,
  Box, Typography, Chip, Stack, LinearProgress,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import { useUploadDocument, useDocumentTypes } from '../../hooks/useDocuments';

const DEFAULT_MAX_MB = 50;
const DEFAULT_FORMATS = 'PDF، Word، Excel، PowerPoint، تصویر، TXT، CSV، ZIP، RAR';

/** پیام دقیق خطای آپلود از پاسخ DRF (فیلد file یا detail). */
const describeUploadError = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data.slice(0, 300);
  if (data.detail) return String(data.detail);
  const first = Object.values(data)[0];
  if (Array.isArray(first)) return first.join(' ، ');
  if (first) return String(first);
  return fallback;
};

const fileSizeLabel = (size) => (
  size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`
);

const DocumentUploadModal = ({ employeeId, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { data: docTypes } = useDocumentTypes();
  const typeOptions = Array.isArray(docTypes) ? docTypes : (docTypes?.results || []);
  const uploadMutation = useUploadDocument();
  const [form, setForm] = useState({
    title: '', document_type: '', issue_date: '', expiry_date: '',
    document_number: '', description: '',
  });
  const selectedType = typeOptions.find((dt) => String(dt.id) === String(form.document_type));
  const targetFolder = selectedType?.archive_subfolder || '';
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const uploading = progress.total > 0;

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addFiles = useCallback((incoming) => {
    const list = Array.from(incoming || []).filter(Boolean);
    if (!list.length) return;
    const limit = DEFAULT_MAX_MB * 1024 * 1024;
    const tooBig = list.filter((f) => f.size > limit);
    const accepted = list.filter((f) => f.size <= limit);
    setError(tooBig.length
      ? `این فایل‌ها بزرگ‌تر از ${DEFAULT_MAX_MB} مگابایت هستند و انتخاب نشدند: ${tooBig.map(f => f.name).join('، ')}`
      : '');
    if (accepted.length) {
      setFiles(prev => {
        const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
        return [...prev, ...accepted.filter((f) => !existing.has(`${f.name}-${f.size}`))];
      });
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer?.files);
  }, [addFiles]);

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!files.length) { setError('ابتدا حداقل یک فایل انتخاب کنید.'); return; }
    if (!form.document_type) { setError(t('validation.required')); return; }
    setError('');
    const failures = [];
    const succeeded = [];
    setProgress({ done: 0, total: files.length });
    try {
      for (const [index, file] of files.entries()) {
        const fd = new FormData();
        fd.append('employee', employeeId);
        const baseTitle = (form.title || '').trim();
        fd.append(
          'title',
          baseTitle ? (files.length > 1 ? `${baseTitle} (${index + 1})` : baseTitle) : file.name,
        );
        fd.append('document_type', form.document_type);
        if (form.issue_date) fd.append('issue_date', form.issue_date);
        if (form.expiry_date) fd.append('expiry_date', form.expiry_date);
        if (form.document_number) fd.append('document_number', form.document_number);
        if (form.description) fd.append('description', form.description);
        fd.append('file', file);
        try {
          await uploadMutation.mutateAsync(fd);
          succeeded.push(file);
        } catch (uploadError) {
          failures.push(`${file.name}: ${describeUploadError(uploadError, t('documents.upload_error'))}`);
        }
        setProgress({ done: index + 1, total: files.length });
      }
    } finally {
      setProgress({ done: 0, total: 0 });
    }
    if (failures.length) {
      // فایل‌های موفق حذف و ناموفق‌ها برای تلاش دوباره باقی می‌مانند.
      setFiles(prev => prev.filter((file) => !succeeded.includes(file)));
      setError(`این مدارک ذخیره نشدند:\n${failures.join('\n')}`);
      return;
    }
    onSuccess();
  };

  return (
    <Dialog open onClose={uploading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('documents.upload_document')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{error}</Alert>
        )}
        {uploading ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary">
              در حال آپلود {progress.done} از {progress.total}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress.total ? (progress.done / progress.total) * 100 : 0}
              sx={{ mt: 0.5, borderRadius: '6px' }}
            />
          </Box>
        ) : null}

        {/* Drop zone (multi-select) */}
        <Box
          sx={{
            border: `2px dashed ${dragOver ? '#1976d2' : '#ccc'}`,
            borderRadius: '10px', p: 3, textAlign: 'center', mb: 2, cursor: 'pointer',
            backgroundColor: dragOver ? '#e3f2fd' : '#fafafa',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input" type="file" hidden multiple
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          />
          <Typography color="textSecondary">{t('documents.drag_drop')}</Typography>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
            چند فایل را هم‌زمان بکشید یا انتخاب کنید · حداکثر {DEFAULT_MAX_MB} مگابایت برای هر فایل
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
            {DEFAULT_FORMATS}
          </Typography>
        </Box>

        {files.length ? (
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {files.map((file, index) => (
              <Chip
                key={`${file.name}-${index}`}
                label={`${file.name} · ${fileSizeLabel(file.size)}`}
                onDelete={uploading ? undefined : () => removeFile(index)}
                deleteIcon={<DeleteIcon />}
                variant="outlined"
                sx={{ justifyContent: 'space-between' }}
              />
            ))}
          </Stack>
        ) : null}

        <TextField fullWidth size="small" label={t('documents.document_title')} sx={{ mb: 2 }}
          value={form.title} onChange={(e) => handleChange('title', e.target.value)}
          helperText={files.length > 1 ? 'اختیاری؛ برای چند فایل شماره‌گذاری خودکار می‌شود.' : ''} />

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>{t('documents.document_type')}</InputLabel>
          <Select value={form.document_type} label={t('documents.document_type')}
            onChange={(e) => handleChange('document_type', e.target.value)}>
            {typeOptions.map(dt => (
              <MenuItem key={dt.id} value={dt.id}>{dt.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {targetFolder ? (
          <Alert severity="info" icon={<FolderIcon fontSize="small" />} sx={{ mb: 2 }}>
            این مدرک در زیرپوشهٔ «{targetFolder}» داخل پروندهٔ این پرسنل بایگانی می‌شود.
          </Alert>
        ) : null}

        <TextField fullWidth size="small" label={t('documents.issue_date')} type="date" sx={{ mb: 2 }}
          value={form.issue_date} onChange={(e) => handleChange('issue_date', e.target.value)}
          InputLabelProps={{ shrink: true }} />
        <TextField fullWidth size="small" label={t('documents.expiry_date')} type="date" sx={{ mb: 2 }}
          value={form.expiry_date} onChange={(e) => handleChange('expiry_date', e.target.value)}
          InputLabelProps={{ shrink: true }} />
        <TextField fullWidth size="small" label={t('documents.document_number')} sx={{ mb: 2 }}
          value={form.document_number} onChange={(e) => handleChange('document_number', e.target.value)} />
        <TextField fullWidth size="small" label={t('employees.description')} multiline rows={2}
          value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={uploading || !files.length}>
          {uploading
            ? <CircularProgress size={20} />
            : `${t('documents.upload')}${files.length > 1 ? ` (${files.length})` : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUploadModal;