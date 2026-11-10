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
  const raw = item?.file_name || item?.name || item?.title || item?.file_url || item?.preview_url || '';
  const clean = String(raw).split('?')[0].split('#')[0];
  const tail = clean.split('/').pop() || clean;
  try {
    return decodeURIComponent(tail);
  } catch (error) {
    return tail;
  }
};

const EXTENSION_RE = /\.([a-z0-9]{1,6})(?=[?#]|$)/i;

/**
 * پسوند فایل از هر نشانه‌ای که در دسترس است.
 *
 * لینک امن دانلود (``?t=…&inline=1``) پسوند ندارد و عنوان فارسی هم معمولاً
 * بدون پسوند است؛ پس همهٔ گزینه‌ها بررسی می‌شوند تا نوع پیش‌نمایش درست انتخاب شود.
 */
const extensionOf = (item) => {
  const candidates = [
    item?.file_name, item?.name, item?.file, item?.file_url, item?.url,
    item?.preview_url, item?.download_url, item?.title,
  ];
  for (let index = 0; index < candidates.length; index += 1) {
    const match = EXTENSION_RE.exec(String(candidates[index] || ''));
    if (match) return match[1].toLowerCase();
  }
  return '';
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

/**
 * آدرس‌های یک پیوست:
 * - ``previewUrl``: اندپوینت امن با توکن و ``inline=1`` (برای iframe/تصویر/تب جدید)
 * - ``downloadUrl``: همان اندپوینت بدون inline (دریافت فایل)
 * - ``fileUrl``: لینک مستقیم رسانه (fallback ماژول‌هایی که توکن ندارند)
 */
export const attachmentUrls = (item) => {
  const preview = String(item?.preview_url || '').trim();
  const direct = String(item?.file_url || item?.url || '').trim();
  const download = String(item?.download_url || '').trim();
  const previewUrl = preview || direct;
  return {
    previewUrl,
    fileUrl: direct || previewUrl,
    downloadUrl: download || direct || previewUrl,
  };
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
    () => (Array.isArray(items)
      ? items.filter((item) => item && (item.file_url || item.url || item.preview_url))
      : []),
    [items],
  );
  const [current, setCurrent] = useState(0);
  const [mediaState, setMediaState] = useState('loading');

  useEffect(() => {
    if (!open) return;
    setCurrent(Math.min(Math.max(Number(index) || 0, 0), Math.max(files.length - 1, 0)));
  }, [open, index, files.length]);

  const safeIndex = Math.min(Math.max(current, 0), Math.max(files.length - 1, 0));
  const activeFile = files[safeIndex] || null;
  const { previewUrl, downloadUrl } = attachmentUrls(activeFile);

  // اگر مرورگر پیش‌نمایش درون‌برنامه‌ای را نتوانست نمایش دهد (مسدود/کند)،
  // راهنمای «باز کردن در تب جدید» را نشان می‌دهیم.
  useEffect(() => {
    if (!open || !previewUrl) return undefined;
    setMediaState('loading');
    const timer = setTimeout(() => setMediaState((state) => (
      state === 'loaded' ? state : 'slow'
    )), 8000);
    return () => clearTimeout(timer);
  }, [open, previewUrl]);

  if (!open || !files.length) return null;

  const active = activeFile;
  const url = previewUrl;
  const name = fileNameOf(active);
  const heading = (active.title || '').trim();
  const kind = previewKindOf(active);
  const size = fileSizeLabel(active.size);
  const kindLabel = active.kind_display || active.document_type || 'پیوست';
  const canNavigate = files.length > 1;
  const showFallbackHint = mediaState === 'slow' || mediaState === 'error';

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
          src={kind === 'pdf' ? `${url}#view=FitH` : url}
          onLoad={() => setMediaState('loaded')}
          onError={() => setMediaState('error')}
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
            onLoad={() => setMediaState('loaded')}
            onError={() => setMediaState('error')}
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

  const renderFallbackHint = () => {
    if (!showFallbackHint || (kind !== 'pdf' && kind !== 'text' && kind !== 'image')) return null;
    return (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center"
        sx={{
          mt: 1, px: 1.25, py: 0.75, borderRadius: '10px',
          bgcolor: alpha('#b45309', 0.07), border: '1px solid', borderColor: alpha('#b45309', 0.28),
        }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#92400e' }}>
          پیش‌نمایش درون‌برنامه‌ای نمایش داده نشد؛ فایل را در تب جدید باز کنید.
        </Typography>
        <Button size="small" variant="outlined" startIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
          component="a" href={url} target="_blank" rel="noopener noreferrer"
          sx={{ height: 24, fontSize: 11, fontWeight: 800, borderColor: alpha('#b45309', 0.4), color: '#92400e' }}>
          باز کردن در تب جدید
        </Button>
      </Stack>
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
        {renderFallbackHint()}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1 }}>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ flex: 1 }}>
          <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />}
            component="a" href={url} target="_blank" rel="noopener noreferrer">
            باز کردن در تب جدید
          </Button>
          <Button size="small" variant="contained" startIcon={<DownloadIcon />}
            component="a" href={downloadUrl} download={name || undefined}
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
