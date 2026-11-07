import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton,
  Stack, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';

const INK = '#0f172a';
const MUTED = '#64748b';
const ACCENT = '#0369a1';

const fileNameOf = (item) => {
  const raw = item?.file_name || item?.name || item?.title || item?.file_url || '';
  const clean = String(raw).split('?')[0].split('#')[0];
  const tail = clean.split('/').pop() || clean;
  try {
    return decodeURIComponent(tail);
  } catch (error) {
    return tail;
  }
};

const extensionOf = (item) => {
  const match = /\.([a-z0-9]{1,6})$/i.exec(fileNameOf(item));
  return (match ? match[1] : '').toLowerCase();
};

const previewKindOf = (item) => {
  const extension = extensionOf(item);
  const hint = String(item?.mime_type || item?.content_type || '').toLowerCase();
  if (extension === 'pdf' || hint.includes('pdf')) return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(extension) || hint.startsWith('image/')) {
    return 'image';
  }
  if (['txt', 'csv', 'log', 'json', 'xml'].includes(extension) || hint.startsWith('text/')) return 'text';
  return 'other';
};

export const fileSizeLabel = (bytes) => {
  const value = Number(bytes) || 0;
  if (!value) return '';
  if (value >= 1024 * 1024) return `${formatPersianNumber(Number((value / (1024 * 1024)).toFixed(1)))} مگابایت`;
  if (value >= 1024) return `${formatPersianNumber(Math.round(value / 1024))} کیلوبایت`;
  return `${formatPersianNumber(value)} بایت`;
};


/**
 * پیش‌نمایش پیوست‌ها داخل خود برنامه (بدون دانلود).
 *
 * PDF، تصویر و فایل متنی همان‌جا نمایش داده می‌شوند؛ برای بقیهٔ انواع لینک
 * باز کردن در تب جدید و دریافت فایل گذاشته می‌شود. بین چند پیوستِ یک نامه هم
 * می‌توان با دکمه‌های قبلی/بعدی جابه‌جا شد.
 */
const AttachmentPreviewDialog = ({
  open = false, items = [], index = 0, title = '', onClose, accent = ACCENT,
}) => {
  const files = useMemo(
    () => (Array.isArray(items) ? items.filter((item) => item && (item.file_url || item.url)) : []),
    [items],
  );
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!open) return;
    setCurrent(Math.min(Math.max(Number(index) || 0, 0), Math.max(files.length - 1, 0)));
  }, [open, index, files.length]);

  if (!open || !files.length) return null;

  const safeIndex = Math.min(Math.max(current, 0), files.length - 1);
  const active = files[safeIndex];
  const url = active.file_url || active.url;
  const name = fileNameOf(active);
  const heading = (active.title || '').trim();
  const kind = previewKindOf(active);
  const size = fileSizeLabel(active.size);
  const kindLabel = active.kind_display || active.document_type || 'پیوست';
  const canNavigate = files.length > 1;

  const go = (step) => setCurrent((previous) => {
    const next = previous + step;
    return Math.min(Math.max(next, 0), files.length - 1);
  });


  const renderBody = () => {
    if (kind === 'pdf' || kind === 'text') {
      return (
        <Box
          component="iframe"
          title={name || 'پیش‌نمایش پیوست'}
          src={`${url}#view=FitH`}
          sx={{
            width: '100%', height: { xs: '60vh', md: '70vh' }, border: 0,
            borderRadius: '12px', bgcolor: '#fff', display: 'block',
          }}
        />
      );
    }
    if (kind === 'image') {
      return (
        <Box sx={{ textAlign: 'center', bgcolor: '#f8fafc', borderRadius: '12px', p: 1 }}>
          <Box
            component="img"
            src={url}
            alt={name || 'پیش‌نمایش تصویر'}
            sx={{
              maxWidth: '100%', maxHeight: { xs: '58vh', md: '68vh' },
              objectFit: 'contain', borderRadius: '8px',
            }}
          />
        </Box>
      );
    }
    return (
      <Box sx={{
        py: 5, px: 2, textAlign: 'center', borderRadius: '12px',
        border: '1px dashed', borderColor: 'divider', bgcolor: alpha(accent, 0.03),
      }}>
        <InsertDriveFileOutlinedIcon sx={{ fontSize: 38, color: MUTED, mb: 0.6 }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: INK, mb: 0.4 }}>
          پیش‌نمایش این نوع فایل در مرورگر ممکن نیست
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: MUTED }}>
          فایل را در تب جدید باز کنید یا دریافت کنید.
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 0.75, display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap title={heading || name} sx={{ fontSize: 13, fontWeight: 900, color: INK }}>
            {heading || name || title || 'پیش‌نمایش پیوست'}
          </Typography>
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mt: 0.35 }}>
            <Chip
              size="small"
              icon={kind === 'pdf' ? <PictureAsPdfIcon sx={{ fontSize: 13 }} /> : undefined}
              label={kindLabel}
              sx={{ height: 19, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(accent, 0.09), color: accent }}
            />
            {size ? <Typography sx={{ fontSize: 10.5, color: MUTED }}>{size}</Typography> : null}
            {name && name !== heading ? (
              <Typography noWrap title={name} sx={{ fontSize: 10.5, color: MUTED, maxWidth: 220 }}>· {name}</Typography>
            ) : null}
            {title && title !== heading ? (
              <Typography noWrap sx={{ fontSize: 10.5, color: MUTED, maxWidth: 260 }}>· {title}</Typography>
            ) : null}
            {canNavigate ? (
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                · پیوست {toPersianDigits(safeIndex + 1)} از {toPersianDigits(files.length)}
              </Typography>
            ) : null}
          </Stack>
        </Box>
        {canNavigate ? (
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="پیوست قبلی">
              <span>
                <IconButton size="small" aria-label="پیوست قبلی" disabled={safeIndex === 0}
                  onClick={() => go(-1)}>
                  <NavigateNextIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="پیوست بعدی">
              <span>
                <IconButton size="small" aria-label="پیوست بعدی"
                  disabled={safeIndex >= files.length - 1} onClick={() => go(1)}>
                  <NavigateBeforeIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ) : null}
        <IconButton size="small" aria-label="بستن پیش‌نمایش" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#f1f5f9' }}>
        {renderBody()}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1 }}>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ flex: 1 }}>
          <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />}
            component="a" href={url} target="_blank" rel="noopener noreferrer">
            باز کردن در تب جدید
          </Button>
          <Button size="small" variant="contained" startIcon={<DownloadIcon />}
            component="a" href={url} download={name || undefined}
            sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}>
            دریافت فایل
          </Button>
        </Stack>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Button size="small" onClick={onClose}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AttachmentPreviewDialog;
