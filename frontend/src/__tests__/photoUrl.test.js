import {
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
    expect(photoPixelSize(2000, 2)).toBe(1024);
    expect(employeePhotoSrc(signed, 1200)).toContain('size=1024');
  });

  it('آواتارهای بدون عکس و آدرس‌های غیرمرتبط را دست نمی‌زند', () => {
    expect(employeePhotoSrc('', 40)).toBe('');
    expect(employeePhotoSrc(null, 40)).toBe('');
    const media = 'http://hrms.local/media/legacy/photo.jpg';
    expect(employeePhotoSrc(media, 40)).toBe(media);
  });

  it('srcSet برای 1x و 2x ساخته می‌شود', () => {
    const srcSet = employeePhotoSrcSet(signed, 64);
    expect(srcSet).toContain('size=64&');
    expect(srcSet).toContain(' 1x, ');
    expect(srcSet).toContain('size=128&');
    expect(srcSet.endsWith(' 2x')).toBe(true);
    expect(employeePhotoSrcSet('http://hrms.local/media/x.jpg', 40)).toBeUndefined();
  });
});
