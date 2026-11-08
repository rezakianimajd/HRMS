/**
 * پیش‌نمایش و چاپ سند از موتور چاپ (HTML سرور در iframe).
 */
import React from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import { printHtml } from './printEngine';

const PrintPreviewDialog = ({
  open, title = 'پیش‌نمایش چاپ', html = '', loading = false, error = '',
  onClose, printLabel = 'چاپ', maxWidth = 'md',
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth} PaperProps={{ sx: { height: '92vh' } }}>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
      <PrintIcon fontSize="small" />
      <Box sx={{ flex: 1, fontWeight: 800 }}>{title}</Box>
      <IconButton size="small" onClick={onClose} aria-label="بستن پیش‌نمایش چاپ">
        <CloseIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ p: 0, bgcolor: 'grey.100' }}>
      {loading && (
        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
          <CircularProgress size={28} />
        </Stack>
      )}
      {!loading && error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
      {!loading && !error && html && (
        <Box
          component="iframe"
          title={title}
          srcDoc={html}
          sx={{ width: '100%', height: '100%', border: 0, bgcolor: '#fff' }}
        />
      )}
    </DialogContent>
    <DialogActions sx={{ px: 2, py: 1.5 }}>
      <Button onClick={onClose} color="inherit">بستن</Button>
      <Button
        variant="contained"
        startIcon={<PrintIcon />}
        disabled={!html || loading}
        onClick={() => printHtml(html, { title })}
      >
        {printLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default PrintPreviewDialog;
