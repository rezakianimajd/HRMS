import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert,
  Box, Typography
} from '@mui/material';
import { useUploadDocument, useDocumentTypes } from '../../hooks/useDocuments';

const DocumentUploadModal = ({ employeeId, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { data: docTypes } = useDocumentTypes();
  const uploadMutation = useUploadDocument();
  const [form, setForm] = useState({
    title: '', document_type: '', issue_date: '', expiry_date: '',
    document_number: '', description: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) setFile(f);
  }, []);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!file) { setError(t('documents.file_too_large')); return; }
    if (!form.document_type) { setError(t('validation.required')); return; }
    setError('');
    const fd = new FormData();
    fd.append('employee', employeeId);
    fd.append('title', form.title || file.name);
    fd.append('document_type', form.document_type);
    if (form.issue_date) fd.append('issue_date', form.issue_date);
    if (form.expiry_date) fd.append('expiry_date', form.expiry_date);
    if (form.document_number) fd.append('document_number', form.document_number);
    if (form.description) fd.append('description', form.description);
    fd.append('file', file);

    try {
      await uploadMutation.mutateAsync(fd);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || t('documents.upload_error'));
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('documents.upload_document')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Drop zone */}
        <Box
          sx={{
            border: `2px dashed ${dragOver ? '#1976d2' : '#ccc'}`,
            borderRadius: 2, p: 4, textAlign: 'center', mb: 2, cursor: 'pointer',
            backgroundColor: dragOver ? '#e3f2fd' : '#fafafa',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input id="file-input" type="file" hidden onChange={(e) => setFile(e.target.files[0])} />
          {file ? (
            <Typography>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</Typography>
          ) : (
            <Typography color="textSecondary">{t('documents.drag_drop')}</Typography>
          )}
        </Box>

        <TextField fullWidth size="small" label={t('documents.document_title')} sx={{ mb: 2 }}
          value={form.title} onChange={(e) => handleChange('title', e.target.value)} />

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>{t('documents.document_type')}</InputLabel>
          <Select value={form.document_type} label={t('documents.document_type')}
            onChange={(e) => handleChange('document_type', e.target.value)}>
            {Array.isArray(docTypes) && docTypes.map(dt => (
              <MenuItem key={dt.id} value={dt.id}>{dt.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

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
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={uploadMutation.isLoading}>
          {uploadMutation.isLoading ? <CircularProgress size={20} /> : t('documents.upload')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUploadModal;