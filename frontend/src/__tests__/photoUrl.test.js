import {
  PHOTO_MAX_PIXELS,
  PHOTO_PREVIEW_PIXELS,
  employeePhotoOriginal,
  employeePhotoPreview,
  employeePhotoSrc,
  employeePhotoSrcSet,
  photoPixelSize,
} from '../core/utils/photoUrl';

describe('photoUrl', () => {
  const signed =
    'http://hrms.local/api/employees/7/photo/?size=256&v=abc123&t=token.sig';

  it('اندازهٔ نمایشی را برای آواتارهای رتینا دو برابر می‌کند', () => {
    expect(employeePhotoSrc(signed, 64)).toContain('size=128');
    expect(employeePhotoSrc(signed, 64, { scale: 1 })).toContain('size=64');
  });

  it('توکن و نسخهٔ کش را حفظ می‌کند', () => {
    const src = employeePhotoSrc(signed, 64);
    expect(src).toContain('v=abc123');
    expect(src).toContain('t=token.sig');
    expect(src.startsWith('http://hrms.local/api/employees/7/photo/?')).toBe(true);
  });

  it('اندازه را در بازهٔ مجاز نگه می‌دارد', () => {
    expect(photoPixelSize(4, 1)).toBe(48);
    expect(photoPixelSize(2000, 2)).toBe(PHOTO_MAX_PIXELS);
    expect(PHOTO_MAX_PIXELS).toBe(2048);
    expect(employeePhotoSrc(signed, 1200)).toContain(`size=${PHOTO_MAX_PIXELS}`);
  });

  it('آواتارهای بدون عکس و آدرس‌های غیرمرتبط را دست نمی‌زند', () => {
    expect(employeePhotoSrc('', 40)).toBe('');
    expect(employeePhotoSrc(null, 40)).toBe('');
    const media = 'http://hrms.local/media/legacy/photo.jpg';
    expect(employeePhotoSrc(media, 40)).toBe(media);
  });

  it('srcSet برای 1x تا 3x ساخته می‌شود', () => {
    const srcSet = employeePhotoSrcSet(signed, 64);
    expect(srcSet).toContain('size=64&');
    expect(srcSet).toContain(' 1x, ');
    expect(srcSet).toContain('size=96&');
    expect(srcSet).toContain(' 1.5x, ');
    expect(srcSet).toContain('size=128&');
    expect(srcSet).toContain(' 2x, ');
    expect(srcSet).toContain('size=192&');
    expect(srcSet.endsWith(' 3x')).toBe(true);
    expect(employeePhotoSrcSet('http://hrms.local/media/x.jpg', 40)).toBeUndefined();
  });

  it('نسخهٔ تمام‌کیفیت و فایل اصلی را می‌سازد', () => {
    const preview = employeePhotoPreview(signed);
    expect(preview).toContain(`size=${PHOTO_PREVIEW_PIXELS}`);
    expect(preview).toContain('v=abc123');
    expect(preview).toContain('t=token.sig');
    const original = employeePhotoOriginal(signed);
    expect(original).toContain('full=1');
    expect(original).not.toContain('size=');
  });
});
