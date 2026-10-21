import React from 'react';
import { Avatar } from '@mui/material';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';

/**
 * Employee avatar:
 *  - uploaded photo when available,
 *  - otherwise a blue male icon / pink female icon based on `gender`,
 *  - otherwise colored initials.
 *
 * Props:
 *  - employee: { photo_url, photo, first_name, last_name, gender }
 *  - size: avatar size (width & height)
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

const EmployeeAvatar = ({ employee, size = 40, fontSize, name, gender, sx = {} }) => {
  const fullName = name || employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();
  const photo = employee?.photo_url || employee?.photo || null;
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

  return (
    <Avatar
      src={photo || undefined}
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
};

export { MALE_GRADIENT, FEMALE_GRADIENT };
export default EmployeeAvatar;
