import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, IconButton, Button, Typography, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';

const DocumentPreviewModal = ({ document: doc, onClose }) => {
  const { t } = useTranslation();

  const renderPreview = () => {
    if (!doc) return null;
    const ext = doc.file_extension?.toLowerCase();

    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <img src={doc.file} alt={doc.title} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
        </Box>
      );
    }

    if (ext === '.pdf') {
      return (
        <iframe
          src={doc.file}
          title={doc.title}
          style={{ width: '100%', height: '70vh', border: 'none' }}
        />
      );
    }

    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="h6" paragraph>{doc.title}</Typography>
        <Typography color="textSecondary" paragraph>
          {t('documents.preview')} برای این نوع فایل در دسترس نیست.
        </Typography>
        <Button variant="contained" component="a" href={doc.file} download startIcon={<DownloadIcon />}>
          {t('documents.download')}
        </Button>
      </Box>
    );
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {doc?.title || t('documents.preview')}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {renderPreview()}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button variant="outlined" component="a" href={doc?.file} download startIcon={<DownloadIcon />}>
            {t('documents.download')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewModal;