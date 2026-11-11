import React from 'react';
import { Avatar } from '@mui/material';
import ManOutlinedIcon from '@mui/icons-material/ManOutlined';
import WomanOutlinedIcon from '@mui/icons-material/WomanOutlined';
import { employeePhotoSrc, employeePhotoSrcSet } from '../../utils/photoUrl';

const initialsOf = (user) => {
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.trim();
  if (initials) return initials;
  return user?.username?.[0] || '؟';
};

/**
 * آواتار کاربر بر اساس پروندهٔ پرسنلی متصل:
 *  ۱) اگر کاربر به پرسنل وصل باشد و عکس پرسنلی داشته باشد → همان عکس
 *  ۲) اگر وصل باشد ولی عکس نداشته باشد → آواتار آقا/خانم بر اساس جنسیت
 *  ۳) اگر به پرسنلی وصل نباشد → آواتار آقا/خانم (اگر در پرونده جنسیت باشد)
 *     و در نهایت حرف اول نام و نام خانوادگی
 */
const UserAvatar = ({ user, size = 34, sx, ...rest }) => {
  const rawPhoto = user?.employee_photo || null;
  const photo = employeePhotoSrc(rawPhoto, size);
  const srcSet = employeePhotoSrcSet(rawPhoto, size);
  const gender = String(user?.employee_gender || '').toLowerCase();
  const iconSize = Math.max(14, Math.round(size * 0.55));
  const fallback = gender === 'male'
    ? <ManOutlinedIcon sx={{ fontSize: iconSize }} />
    : gender === 'female'
      ? <WomanOutlinedIcon sx={{ fontSize: iconSize }} />
      : initialsOf(user);

  return (
    <Avatar
      src={photo || undefined}
      srcSet={srcSet}
      imgProps={{ loading: 'lazy', decoding: 'async' }}
      alt={user?.employee_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || ''}
      sx={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)), fontWeight: 800, ...sx }}
      {...rest}
    >
      {photo ? null : fallback}
    </Avatar>
  );
};

export default UserAvatar;
