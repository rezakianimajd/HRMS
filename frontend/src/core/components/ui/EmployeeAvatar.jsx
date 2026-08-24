import React from 'react';
import { Avatar } from '@mui/material';

/**
 * Employee avatar that shows the uploaded photo if available,
 * otherwise falls back to colored initials.
 * Props:
 *  - employee: employee object with photo_url, first_name, last_name
 *  - size: avatar size (width & height)
 *  - fontSize: font size for initials
 *  - gradient: [fromColor, toColor]
 */
const colors = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #ec4899, #f472b6)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #3b82f6, #60a5fa)',
  'linear-gradient(135deg, #8b5cf6, #a78bfa)',
];

const hashColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const EmployeeAvatar = ({ employee, size = 40, fontSize, name, sx = {} }) => {
  const fullName = name || employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();
  const photo = employee?.photo_url || employee?.photo || null;
  const initials = fullName ? `${fullName.charAt(0) || ''}${(fullName.split(' ')[1] || '').charAt(0) || ''}`.toUpperCase() : '؟';

  return (
    <Avatar
      src={photo || undefined}
      alt={fullName}
      sx={{
        width: size,
        height: size,
        fontSize: fontSize || Math.max(13, Math.round(size * 0.4)),
        fontWeight: 700,
        background: photo ? undefined : hashColor(fullName),
        flexShrink: 0,
        ...sx,
      }}
    >
      {!photo && initials}
    </Avatar>
  );
};

export default EmployeeAvatar;