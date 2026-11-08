/**
 * آیکن تب مرورگر (favicon) از لوگوی شرکت در «تنظیمات → مشخصات شرکت».
 *
 * مرورگر favicon را بدون هدر JWT درخواست می‌کند (و صفحهٔ ورود هم باید لوگو را
 * نشان دهد)، بنابراین از اندپوینت عمومی `/api/company/branding/` استفاده می‌شود
 * که همان نام/لوگوی نمایش‌داده‌شده در صفحهٔ ورود را برمی‌گرداند.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import axiosInstance from '../../api/axiosConfig';

export const FAVICON_LINK_ID = 'hrms-company-favicon';

const ICON_TYPES = [
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
];

/** نوع MIME آیکن از پسوند فایل (بدون query string). */
export const faviconMimeType = (url) => {
  const clean = String(url || '').split('?')[0].toLowerCase();
  const found = ICON_TYPES.find(([extension]) => clean.endsWith(extension));
  return found ? found[1] : undefined;
};

/** `<link rel="icon">` را با آدرس داده‌شده می‌سازد/به‌روزرسانی می‌کند؛ خالی = حذف. */
export const applyFavicon = (url) => {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(FAVICON_LINK_ID);
  if (!url) {
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    return;
  }
  const link = existing || document.createElement('link');
  link.id = FAVICON_LINK_ID;
  link.rel = 'icon';
  const type = faviconMimeType(url);
  if (type) link.type = type;
  else link.removeAttribute('type');
  link.href = url;
  if (!existing) document.head.appendChild(link);
};

const FaviconSync = () => {
  const { data } = useQuery({
    queryKey: ['company-branding'],
    queryFn: () => axiosInstance.get('/company/branding/')
      .then((response) => response.data)
      .catch(() => null),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    applyFavicon(data?.favicon_url || null);
  }, [data?.favicon_url]);

  return null;
};

export default FaviconSync;
