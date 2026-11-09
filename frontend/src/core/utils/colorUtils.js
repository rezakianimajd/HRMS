/**
 * ابزارهای رنگ و تم پنل ورود (بدون وابستگی خارجی).
 *
 * مقادیر رنگ از تنظیمات «ظاهر صفحهٔ ورود» می‌آیند؛ هر مقدار نامعتبر باید بی‌صدا
 * به پیش‌فرض امن برگردد تا استایل صفحه هرگز خراب نشود.
 */
const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;

export const DEFAULT_LOGIN_BRANDING = {
  background_kind: 'image',
  background_url: '',
  gradient: { preset: 'linear-three', angle: 135, colors: ['#4f46e5', '#0ea5e9', '#0f766e'] },
  logo_size: 176,
  logo_panel_color: '#ffffff',
  overlay_color: '#07101f',
  overlay_opacity: 72,
  overlay_blur: 8,
  text_color: '#ffffff',
  accent_color: '#a5b4fc',
};

/**
 * گرادیانت‌های آماده برای پس‌زمینهٔ صفحهٔ ورود (به‌جای تصویر).
 * `stops` = تعداد رنگ‌هایی که کاربر انتخاب می‌کند؛ شناسه‌ها با بک‌اند یکسان‌اند.
 */
export const LOGIN_GRADIENT_PRESETS = [
  { id: 'linear-two', label: 'دو رنگ', stops: 2 },
  { id: 'linear-three', label: 'سه رنگ', stops: 3 },
  { id: 'linear-four', label: 'چهار رنگ', stops: 4 },
  { id: 'radial', label: 'شعاعی', stops: 3 },
  { id: 'conic-rainbow', label: 'رنگین‌کمان', stops: 3 },
  { id: 'mesh', label: 'مش رنگی', stops: 3 },
];

export const DEFAULT_LOGIN_GRADIENT = DEFAULT_LOGIN_BRANDING.gradient;

const RAINBOW_STOPS = ['#f43f5e', '#f59e0b', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#f43f5e'];

export const gradientColorCount = (preset) => (
  LOGIN_GRADIENT_PRESETS.find((item) => item.id === preset)?.stops || 3
);

/** محدودهٔ مجاز اندازهٔ لوگوی پنل ورود (px). */
export const LOGIN_LOGO_SIZE = { min: 80, max: 320, default: DEFAULT_LOGIN_BRANDING.logo_size };

/** اندازهٔ لوگو → عدد معتبر داخل محدوده. */
export const clampLogoSize = (value, fallback = LOGIN_LOGO_SIZE.default) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(LOGIN_LOGO_SIZE.max, Math.max(LOGIN_LOGO_SIZE.min, Math.round(number)));
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

/** مقدار خام گرادیانت → { preset, angle, colors[2..4] } معتبر. */
export const normalizeLoginGradient = (gradient) => {
  const source = gradient && typeof gradient === 'object' ? gradient : {};
  const preset = LOGIN_GRADIENT_PRESETS.some((item) => item.id === source.preset)
    ? source.preset
    : DEFAULT_LOGIN_GRADIENT.preset;
  const rawColors = Array.isArray(source.colors) ? source.colors : [];
  const colors = rawColors
    .map((value) => normalizeHexColor(value, ''))
    .filter(Boolean)
    .slice(0, 4);
  const rawAngle = Number(source.angle);
  const angle = Number.isFinite(rawAngle)
    ? ((Math.round(rawAngle) % 360) + 360) % 360
    : DEFAULT_LOGIN_GRADIENT.angle;
  return {
    preset,
    angle,
    colors: colors.length >= 2 ? colors : [...DEFAULT_LOGIN_GRADIENT.colors],
  };
};

/** CSS پس‌زمینهٔ گرادیانت بر اساس پریست/زاویه/رنگ‌ها. */
export const loginGradientCss = (gradient) => {
  const { preset, angle, colors } = normalizeLoginGradient(gradient);
  const stops = colors.map((color, index) => (
    `${color} ${Math.round((index / Math.max(1, colors.length - 1)) * 100)}%`
  ));

  if (preset === 'radial') {
    return `radial-gradient(1200px 820px at 30% 20%, ${stops.join(', ')})`;
  }
  if (preset === 'conic-rainbow') {
    return `conic-gradient(from ${angle}deg at 50% 50%, ${RAINBOW_STOPS.join(', ')})`;
  }
  if (preset === 'mesh') {
    return [
      `radial-gradient(760px 620px at 12% 10%, ${withAlpha(colors[0], 0.95)}, transparent 62%)`,
      `radial-gradient(720px 640px at 88% 18%, ${withAlpha(colors[1] || colors[0], 0.85)}, transparent 60%)`,
      `radial-gradient(900px 720px at 50% 100%, ${withAlpha(colors[2] || colors[0], 0.8)}, transparent 64%)`,
      `linear-gradient(${angle}deg, ${colors[0]} 0%, ${colors[colors.length - 1]} 100%)`,
    ].join(', ');
  }
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
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
  const rawBlur = Number(source.overlay_blur);
  const blur = Number.isFinite(rawBlur)
    ? Math.min(24, Math.max(0, Math.round(rawBlur)))
    : DEFAULT_LOGIN_BRANDING.overlay_blur;
  const backgroundUrl = typeof source.background_url === 'string' ? source.background_url.trim() : '';
  const backgroundKind = source.background_kind === 'gradient' ? 'gradient' : 'image';
  const gradient = normalizeLoginGradient(source.gradient);
  const logoSize = clampLogoSize(source.logo_size, DEFAULT_LOGIN_BRANDING.logo_size);
  const logoPanelColor = normalizeHexColor(
    source.logo_panel_color, DEFAULT_LOGIN_BRANDING.logo_panel_color,
  );
  return {
    backgroundKind,
    backgroundUrl,
    gradient,
    gradientCss: loginGradientCss(gradient),
    useGradient: backgroundKind === 'gradient',
    logoSize,
    logoPanelColor,
    overlay,
    opacity,
    blur,
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
