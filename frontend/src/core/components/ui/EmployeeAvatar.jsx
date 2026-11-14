import React, { useState } from 'react';
import { Avatar, Box, Dialog, IconButton, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import {
  employeePhotoOriginal, employeePhotoPreview, employeePhotoSrc, employeePhotoSrcSet,
} from '../../utils/photoUrl';

/**
 * Employee avatar:
 *  - uploaded photo when available,
 *  - otherwise a blue male icon / pink female icon based on `gender`,
 *  - otherwise colored initials.
 *
 * Props:
 *  - employee: { photo_url, photo, first_name, last_name, gender }
 *  - size: avatar size (width & height)
 *  - previewable: click/focus opens the full-quality photo dialog (2048px WebP + original)
 *  - fontSize: font size for initials
 *  - gender: explicit override ('male' | 'female')
 *  - sx: extra styles
 */
const colors = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #ec4899, #f472b6)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #3b82f6, #60a5fa)',
  'linear-gradient(135deg, #8b5cf6, #a78bfa)',
];

const MALE_GRADIENT = 'linear-gradient(135deg, #2563eb, #60a5fa)';
const FEMALE_GRADIENT = 'linear-gradient(135deg, #db2777, #f472b6)';

const hashColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const EmployeeAvatar = ({
  employee, size = 40, fontSize, name, gender, sx = {}, previewable = false,
}) => {
  const [open, setOpen] = useState(false);
  const fullName = name || employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();
  const rawPhoto = employee?.photo_url || employee?.photo || null;
  const photo = employeePhotoSrc(rawPhoto, size);
  const srcSet = employeePhotoSrcSet(rawPhoto, size);
  const initials = fullName ? `${fullName.charAt(0) || ''}${(fullName.split(' ')[1] || '').charAt(0) || ''}`.toUpperCase() : '؟';

  const genderValue = gender || employee?.gender || '';
  const isMale = !photo && genderValue === 'male';
  const isFemale = !photo && genderValue === 'female';
  const iconSize = Math.max(16, Math.round(size * 0.56));

  const background = photo
    ? undefined
    : isMale
      ? MALE_GRADIENT
      : isFemale
        ? FEMALE_GRADIENT
        : hashColor(fullName);

  const avatar = (
    <Avatar
      src={photo || undefined}
      srcSet={srcSet}
      imgProps={{ loading: 'lazy', decoding: 'async' }}
      alt={fullName || (isMale ? 'پرسنل مرد' : isFemale ? 'پرسنل زن' : 'پرسنل')}
      sx={{
        width: size,
        height: size,
        fontSize: Math.max(12, fontSize || Math.round(size * 0.4)),
        fontWeight: 700,
        background,
        flexShrink: 0,
        ...sx,
      }}
    >
      {!photo && (isMale
        ? <MaleIcon sx={{ fontSize: iconSize, color: '#fff' }} />
        : isFemale
          ? <FemaleIcon sx={{ fontSize: iconSize, color: '#fff' }} />
          : initials)}
    </Avatar>
  );

  if (!photo || !previewable) return avatar;

  const previewSrc = employeePhotoPreview(rawPhoto);
  const originalSrc = employeePhotoOriginal(rawPhoto);
  const openPreview = (event) => {
    event?.stopPropagation?.();
    setOpen(true);
  };

  return (
    <>
      <Tooltip title="نمایش عکس در کیفیت کامل">
        <Box
          role="button"
          tabIndex={0}
          aria-label={`نمایش عکس ${fullName || 'پرسنل'}`}
          data-testid="employee-photo-open"
          onClick={openPreview}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openPreview(event);
            }
          }}
          sx={{
            display: 'inline-flex',
            borderRadius: '50%',
            cursor: 'zoom-in',
            outline: 'none',
            transition: 'transform .18s ease, box-shadow .18s ease',
            '&:hover, &:focus-visible': {
              transform: 'translateY(-1px)',
              boxShadow: '0 10px 26px rgba(15,23,42,0.22)',
            },
          }}
        >
          {avatar}
        </Box>
      </Tooltip>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        onClick={(event) => event.stopPropagation()}
        PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden', bgcolor: '#0b1220' } }}
      >
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25,
          bgcolor: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
        }}>
          <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 800, flex: 1 }}>
            {fullName || 'عکس پرسنلی'}
          </Typography>
          {originalSrc ? (
            <Tooltip title="دریافت فایل اصلی">
              <IconButton size="small" component="a" href={originalSrc} download
                aria-label="دریافت فایل اصلی عکس" sx={{ color: '#cbd5e1' }}>
                <DownloadIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          {originalSrc ? (
            <Tooltip title="باز کردن در تب جدید">
              <IconButton size="small" component="a" href={originalSrc} target="_blank"
                rel="noreferrer" aria-label="باز کردن عکس در تب جدید" sx={{ color: '#cbd5e1' }}>
                <OpenInNewIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          <IconButton size="small" onClick={() => setOpen(false)} aria-label="بستن"
            sx={{ color: '#cbd5e1' }}>
            <CloseIcon sx={{ fontSize: 19 }} />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#0b1220' }}>
          <Box
            component="img"
            src={previewSrc}
            alt={fullName || 'عکس پرسنلی'}
            data-testid="employee-photo-full"
            sx={{
              display: 'block', width: '100%', maxHeight: '80vh', objectFit: 'contain',
              imageRendering: 'auto',
            }}
          />
        </Box>
      </Dialog>
    </>
  );
};

export { MALE_GRADIENT, FEMALE_GRADIENT };
export default EmployeeAvatar;
