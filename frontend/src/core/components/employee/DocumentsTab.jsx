import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  IconButton, Tooltip, Chip, Button, CircularProgress, Paper, Avatar
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadIcon from '@mui/icons-material/Upload';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import axiosInstance from '../../api/axiosConfig';
import { useDocuments, useDeleteDocument } from '../../hooks/useDocuments';
import { useEmployee } from '../../hooks/useEmployees';
import DocumentUploadModal from './DocumentUploadModal';
import DocumentPreviewModal from './DocumentPreviewModal';
import EmployeeAvatar from '../ui/EmployeeAvatar';
import { toJalali } from '../../utils/dateUtils';
import FolderSharedIcon from '@mui/icons-material/FolderShared';

// Render company-archive documents that are linked to this employee.
const CompanyLinkedDocs = ({ employeeId }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['company-documents', employeeId],
    queryFn: () => axiosInstance.get(`/organization-documents/?employee_id=${employeeId}`).then(r => r.data),
  });
  const linked = Array.isArray(data) ? data : data?.results || [];

  if (isLoading) return <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={26} /></Box>;

  if (linked.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2, borderColor: 'rgba(245,158,11,0.2)' }}>
        <Typography variant="body2" color="textSecondary">
          سند سازمانی به این پرسنل متصل نشده است. از «بایگانی اسناد سازمان» میتوانید سند مرتبط را به او اتصال دهید.
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {linked.map(doc => (
        <Grid item xs={12} sm={6} md={4} key={doc.id}>
          <Card variant="outlined" sx={{
            position: 'relative',
            borderColor: 'rgba(245,158,11,0.25)',
            background: 'linear-gradient(160deg, rgba(245,158,11,0.06), rgba(255,255,255,0.5))',
            transition: 'all 0.2s ease',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(245,158,11,0.15)' },
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(245,158,11,0.15)', color: '#b45309' }}>
                    <FolderSharedIcon sx={{ fontSize: 17 }} />
                  </Avatar>
                  <Typography variant="subtitle2" noWrap sx={{ maxWidth: 160 }}>{doc.title}</Typography>
                </Box>
                {archiveStatusChip(doc)}
              </Box>
              {doc.category_display && (
                <Chip label={doc.category_display} size="small" variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem', color: '#b45309', borderColor: 'rgba(245,158,11,0.3)', mb: 1 }} />
              )}
              {doc.reference_number && (
                <Typography variant="caption" color="textSecondary" display="block">
                  ثبت: {doc.reference_number}
                </Typography>
              )}
              {doc.issue_date && (
                <Typography variant="caption" color="textSecondary" display="block">
                  صدور: {toJalali(doc.issue_date)}
                </Typography>
              )}
              {doc.file_url && (
                <Box sx={{ mt: 1 }}>
                  <Button size="small" component="a" href={doc.file_url} target="_blank" rel="noreferrer"
                    startIcon={<DownloadIcon fontSize="small" />}
                    sx={{ color: '#b45309', fontSize: '0.72rem' }}>
                    دریافت
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

const fileIcon = (ext) => {
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) return <ImageIcon />;
  if (ext === '.pdf') return <PictureAsPdfIcon />;
  return <DescriptionIcon />;
};

const archiveStatusChip = (doc) => {
  if (!doc.expiry_date) return <Chip label="بدون انقضا" color="default" size="small" variant="outlined" />;
  if (doc.is_expired) return <Chip label="منقضی" color="error" size="small" />;
  return <Chip label="معتبر" color="success" size="small" variant="outlined" />;
};

const expiryChip = (doc, t) => {
  if (!doc.days_until_expiry && doc.days_until_expiry !== 0) return null;
  if (doc.is_expired) return <Chip label={t('documents.expired')} color="error" size="small" />;
  if (doc.days_until_expiry <= 30) return <Chip label={t('documents.expiring_soon')} color="warning" size="small" />;
  return <Chip label={t('documents.valid')} color="success" size="small" variant="outlined" />;
};

const DocumentsTab = ({ employeeId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useDocuments(employeeId);
  const { data: employee } = useEmployee(employeeId);
  const deleteMutation = useDeleteDocument();
  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      await axiosInstance.patch(`/employees/${employeeId}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Invalidate ALL employee queries (profile uses string id from route,
      // other lists use numeric id, so we must not tie to a single key type).
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['phonebook'] });
    } catch (err) {
      // ignore
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 3 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Employee photo upload */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <EmployeeAvatar employee={employee} size={72} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>عکس پرسنلی</Typography>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
            عکس در تمام بخش‌ها (لیست پرسنل، دفترچه تلفن، پرونده) نمایش داده می‌شود.
          </Typography>
          <input id="employee-photo-input" type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
          <Button
            variant="outlined" size="small" startIcon={<PhotoCameraIcon />}
            onClick={() => document.getElementById('employee-photo-input').click()}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? <CircularProgress size={16} /> : (employee?.photo_url ? 'تغییر عکس پرسنلی' : 'آپلود عکس پرسنلی')}
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{t('documents.title')}</Typography>
        <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setShowUpload(true)}>
          {t('documents.upload_document')}
        </Button>
      </Box>

      {(!documents || documents.length === 0) ? (
        <Typography color="textSecondary" sx={{ textAlign: 'center', p: 4 }}>{t('documents.no_documents')}</Typography>
      ) : (
        <Grid container spacing={2}>
          {documents.map(doc => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card variant="outlined" sx={{ position: 'relative' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {fileIcon(doc.file_extension)}
                    <Typography variant="subtitle2" noWrap>{doc.title}</Typography>
                  </Box>
                  <Chip label={doc.document_type_name} size="small" variant="outlined" sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {expiryChip(doc, t)}
                    {doc.days_until_expiry != null && doc.days_until_expiry > 0 && (
                      <Typography variant="caption" color="textSecondary">
                        {t('documents.days_left', { days: doc.days_until_expiry })}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                    {doc.file_size_display}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Tooltip title={t('documents.preview')}>
                    <IconButton size="small" onClick={() => setPreviewDoc(doc)}><VisibilityIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('documents.download')}>
                    <IconButton size="small" component="a" href={doc.file} download><DownloadIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={t('documents.delete')}>
                    <IconButton size="small" color="error" onClick={() => {
                      if (window.confirm(t('documents.delete_confirm'))) deleteMutation.mutate(doc.id);
                    }}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ===== Related company-archive documents ===== */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ color: '#b45309' }}>
            اسناد سازمانی مرتبط
          </Typography>
          <Button size="small" variant="outlined"
            onClick={() => {
              if (window.location.pathname !== '/documents') {
                window.location.href = '/documents';
              }
            }}
            sx={{ color: '#b45309', borderColor: 'rgba(245,158,11,0.4)' }}
          >
            مشاهده بایگانی کامل ←
          </Button>
        </Box>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5 }}>
          اسنادی که در بایگانی سازمان به ‌این پرسنل متصل شده‌اند
        </Typography>

        <CompanyLinkedDocs employeeId={employeeId} />
      </Box>

      {showUpload && (
        <DocumentUploadModal
          employeeId={employeeId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => setShowUpload(false)}
        />
      )}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </Box>
  );
};

export default DocumentsTab;