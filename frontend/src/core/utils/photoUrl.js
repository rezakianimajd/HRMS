/**
 * آدرس عکس پرسنلی با کیفیت نمایشی.
 *
 * بک‌اند عکس را از مسیر `/api/employees/{id}/photo/?size=…` (WebP شارپ) می‌دهد؛
 * این ماژول اندازه را بر اساس اندازهٔ نمایشی و ضریب رتینا تنظیم می‌کند تا آواتار
 * در نمایشگرهای High-DPI هم واضح بماند. برای آدرس‌های دیگر (media قدیمی) بدون
 * تغییر برگردانده می‌شود.
 */
export const EMPLOYEE_PHOTO_URL = /\/api\/employees\/\d+\/photo\/?/;

export const photoPixelSize = (size, scale = 1) => {
  const base = Number(size) || 40;
  const factor = Number(scale) || 1;
  return Math.min(1024, Math.max(48, Math.round(base * factor)));
};

export const employeePhotoSrc = (url, size, { scale = 2 } = {}) => {
  if (!url || typeof url !== 'string') return '';
  if (!EMPLOYEE_PHOTO_URL.test(url)) return url;
  const pixels = photoPixelSize(size, scale);
  const [base, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  params.set('size', String(pixels));
  return `${base}?${params.toString()}`;
};

/** srcSet برای نمایشگرهای 1x/2x (اگر آدرس قابل تغییر نباشد undefined). */
export const employeePhotoSrcSet = (url, size) => {
  const one = employeePhotoSrc(url, size, { scale: 1 });
  const two = employeePhotoSrc(url, size, { scale: 2 });
  if (!one || one === two) return undefined;
  return `${one} 1x, ${two} 2x`;
};

export default employeePhotoSrc;
