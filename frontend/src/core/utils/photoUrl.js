/**
 * آدرس عکس پرسنلی با کیفیت نمایشی.
 *
 * بک‌اند عکس را از مسیر `/api/employees/{id}/photo/?size=…` (WebP شارپ) می‌دهد؛
 * این ماژول اندازه را بر اساس اندازهٔ نمایشی و ضریب رتینا تنظیم می‌کند تا آواتار
 * در نمایشگرهای High-DPI هم واضح بماند. برای آدرس‌های دیگر (media قدیمی) بدون
 * تغییر برگردانده می‌شود.
 */
export const EMPLOYEE_PHOTO_URL = /\/api\/employees\/\d+\/photo\/?/;

export const PHOTO_MIN_PIXELS = 48;
export const PHOTO_MAX_PIXELS = 2048;
/* اندازهٔ نمایش «تمام‌کیفیت» برای دیالوگ عکس/چاپ (سرور تا ۲۰۴۸px رندر می‌کند) */
export const PHOTO_PREVIEW_PIXELS = 2048;

export const photoPixelSize = (size, scale = 1) => {
  const base = Number(size) || 40;
  const factor = Number(scale) || 1;
  return Math.min(PHOTO_MAX_PIXELS, Math.max(PHOTO_MIN_PIXELS, Math.round(base * factor)));
};

const withPhotoParams = (url, mutate) => {
  if (!url || typeof url !== 'string') return '';
  if (!EMPLOYEE_PHOTO_URL.test(url)) return url;
  const [base, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  mutate(params);
  return `${base}?${params.toString()}`;
};

export const employeePhotoSrc = (url, size, { scale = 2 } = {}) => withPhotoParams(url, (params) => {
  params.set('size', String(photoPixelSize(size, scale)));
  params.delete('full');
});

/** srcSet برای نمایشگرهای 1x تا 3x (اعداد تکراری حذف می‌شوند). */
export const employeePhotoSrcSet = (url, size) => {
  const candidates = [1, 1.5, 2, 3]
    .map((scale) => ({ scale, src: employeePhotoSrc(url, size, { scale }) }))
    .filter((item) => Boolean(item.src));
  const unique = new Map();
  candidates.forEach((item) => {
    if (!unique.has(item.src)) unique.set(item.src, item.scale);
  });
  if (unique.size <= 1) return undefined;
  return [...unique.entries()].map(([src, scale]) => `${src} ${scale}x`).join(', ');
};

/** نسخهٔ تمام‌کیفیت (WebP تا 2048px) برای نمایش بزرگ/چاپ. */
export const employeePhotoPreview = (url) => withPhotoParams(url, (params) => {
  params.set('size', String(PHOTO_PREVIEW_PIXELS));
  params.delete('full');
});

/** فایل اصلی آپلودی (بدون تغییر کیفیت) برای دانلود یا باز کردن در تب جدید. */
export const employeePhotoOriginal = (url) => withPhotoParams(url, (params) => {
  params.delete('size');
  params.set('full', '1');
});

export default employeePhotoSrc;
