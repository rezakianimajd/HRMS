/**
 * ابزارهای رنگ و تم پنل ورود (بدون وابستگی خارجی).
 *
 * مقادیر رنگ از تنظیمات «ظاهر صفحهٔ ورود» می‌آیند؛ هر مقدار نامعتبر باید بی‌صدا
 * به پیش‌فرض امن برگردد تا استایل صفحه هرگز خراب نشود.
 */
const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;

export const DEFAULT_LOGIN_BRANDING = {
  background_url: '',
  overlay_color: '#07101f',
  overlay_opacity: 72,
  text_color: '#ffffff',
  accent_color: '#a5b4fc',
};

export const isHexColor = (value) => HEX_PATTERN.test(String(value || '').trim());

export const normalizeHexColor = (value, fallback = '') => {
  const match = HEX_PATTERN.exec(String(value || '').trim());
  return match ? `#${match[1].toLowerCase()}` : fallback;
};

export const hexToRgb = (value) => {
  const match = HEX_PATTERN.exec(String(value || '').trim());
  if (!match) return null;
  const hex = match[1];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
};

/** rgba از یک رنگ هگز با آلفای مشخص. */
export const withAlpha = (value, alpha, fallback = DEFAULT_LOGIN_BRANDING.overlay_color) => {
  const rgb = hexToRgb(value) || hexToRgb(fallback);
  const safeAlpha = Math.min(1, Math.max(0, Number(alpha) || 0));
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${Number(safeAlpha.toFixed(3))})`;
};

/** تیره‌کردن تدریجی رنگ (برای محو شدن حرفه‌ای لبه‌های پنل). */
export const darkenHex = (value, ratio = 0.25) => {
  const rgb = hexToRgb(value);
  if (!rgb) return value;
  const safeRatio = Math.min(1, Math.max(0, Number(ratio) || 0));
  const mix = (channel) => Math.round(channel + (0 - channel) * safeRatio);
  return `#${[mix(rgb.r), mix(rgb.g), mix(rgb.b)].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

/** مقدار خام تنظیمات → تم آمادهٔ استفاده در استایل (با پیش‌فرض‌های امن). */
export const resolveLoginBranding = (branding) => {
  const source = branding && typeof branding === 'object' ? branding : {};
  const overlay = normalizeHexColor(source.overlay_color, DEFAULT_LOGIN_BRANDING.overlay_color);
  const text = normalizeHexColor(source.text_color, DEFAULT_LOGIN_BRANDING.text_color);
  const accent = normalizeHexColor(source.accent_color, DEFAULT_LOGIN_BRANDING.accent_color);
  const rawOpacity = Number(source.overlay_opacity);
  const opacity = Number.isFinite(rawOpacity)
    ? Math.min(95, Math.max(0, Math.round(rawOpacity)))
    : DEFAULT_LOGIN_BRANDING.overlay_opacity;
  const backgroundUrl = typeof source.background_url === 'string' ? source.background_url.trim() : '';
  return {
    backgroundUrl,
    overlay,
    opacity,
    text,
    accent,
    muted: withAlpha(text, 0.66),
    faint: withAlpha(text, 0.42),
    overlaySoft: withAlpha(overlay, opacity / 100),
    overlayStrong: withAlpha(darkenHex(overlay, 0.32), Math.min(1, opacity / 100 + 0.18)),
  };
};

/** گرادیان پوشش روی تصویر: از رنگ انتخابی به سمت نسخهٔ تیره‌تر (فید حرفه‌ای). */
export const loginOverlayGradient = (theme) => (
  `linear-gradient(160deg, ${theme.overlaySoft} 0%, ${withAlpha(theme.overlay, Math.min(1, theme.opacity / 100 + 0.05))} 46%, ${theme.overlayStrong} 100%)`
);

/** پس‌زمینهٔ پیش‌فرض (بدون تصویر): همان هویت بصری فعلی سامانه. */
export const LOGIN_PANEL_DEFAULT_BACKGROUND = [
  'radial-gradient(900px 560px at 14% 8%, rgba(79,70,229,0.34), transparent 64%)',
  'radial-gradient(720px 620px at 100% 96%, rgba(14,165,233,0.16), transparent 60%)',
  'linear-gradient(145deg, #07101f 0%, #0c1830 55%, #07101f 100%)',
].join(',');
