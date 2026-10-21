/**
 * پیش‌فرض‌های ظاهر سراسری (پالت ماژول‌ها + تایپوگرافی).
 * مقادیر واقعی از API `/settings/appearance/` خوانده می‌شوند.
 */
export const FONT_OPTIONS = [
  { key: 'vazirmatn', label: 'وزیرمتن (پیش‌فرض)', stack: "'Vazirmatn', 'IRANSans', 'Tahoma', sans-serif" },
  { key: 'iransans', label: 'ایران‌سنس', stack: "'IRANSans', 'Vazirmatn', 'Tahoma', sans-serif" },
  { key: 'tahoma', label: 'تاهوما', stack: "Tahoma, 'Vazirmatn', sans-serif" },
  { key: 'system', label: 'فونت سیستم', stack: "system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif" },
];

export const DEFAULT_TYPOGRAPHY = {
  family: 'vazirmatn',
  headerSize: 20,
  headerWeight: 500,
  cardSize: 16,
  cardWeight: 400,
  bodySize: 13,
  bodyWeight: 400,
  buttonSize: 13,
  buttonWeight: 500,
  statSize: 14,
  statWeight: 500,
};

export const MIN_FONT_SIZE = 12;
export const MIN_TYPOGRAPHY_SIZES = {
  headerSize: 14,
  cardSize: 12,
  bodySize: 12,
  buttonSize: 12,
  statSize: 12,
};

export const SIZE_RANGES = {
  headerSize: { min: 14, max: 32 },
  cardSize: { min: 12, max: 24 },
  bodySize: { min: 12, max: 18 },
  buttonSize: { min: 12, max: 18 },
  statSize: { min: 12, max: 24 },
};

export const WEIGHT_OPTIONS = [300, 400, 500, 600, 700];

export const fontStack = (key) => (
  FONT_OPTIONS.find((option) => option.key === key) || FONT_OPTIONS[0]
).stack;
