/**
 * Persian number utilities - convert digits to Persian (Farsi) numerals.
 */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Convert Arabic/Persian numerals in a string to English digits.
 */
export function toEnglishDigits(str) {
  if (str == null) return str;
  return String(str)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/**
 * Convert any number-like string to Persian digits.
 * Handles decimals and negative signs.
 */
export function toPersianDigits(input) {
  if (input == null || input === '') return '';
  const str = String(input);
  return str.replace(/\d/g, (d) => FA_DIGITS[parseInt(d, 10)]);
}

/**
 * شماره صورت‌وضعیت را استاندارد می‌کند: ارقام فارسی/عربی به لاتین تبدیل
 * و شماره‌های عددی به حداقل دو رقم با صفر پیشرو (مثلاً 3 → 03) تبدیل می‌شوند.
 */
export function normalizeStatementNumber(value) {
  if (value == null) return '';
  const text = toEnglishDigits(String(value)).trim();
  if (!text) return '';
  if (/^\d+$/.test(text)) {
    const digits = text.replace(/^0+(?=\d)/, '');
    return digits.padStart(2, '0');
  }
  return text;
}

/**
 * نمایش شماره صورت‌وضعیت با ارقام فارسی و استاندارد دو رقمی.
 */
export function formatStatementNumber(value) {
  const normalized = normalizeStatementNumber(value);
  return normalized ? toPersianDigits(normalized) : '';
}

/**
 * Format a number with thousands separators and Persian digits.
 * Example: 1234567 -> "۱٬۲۳۴٬۵۶۷"
 */
export function formatPersianNumber(number) {
  if (number == null || isNaN(number)) return '—';
  const [intPart, decPart] = String(number).split('.');
  const withSeparator = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  const result = decPart != null ? `${withSeparator}.${decPart}` : withSeparator;
  return toPersianDigits(result);
}

/**
 * نام ارز را برای نمایش یکدست می‌کند.
 * «ریال ایران»، نماد ﷼ و کد IRR همیشه به «ریال» تبدیل می‌شوند.
 */
export function normalizeCurrencyLabel(currency) {
  const raw = typeof currency === 'string'
    ? currency
    : currency?.name || currency?.currency_name || currency?.symbol || currency?.currency_symbol || '';
  const label = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!label) return 'ریال';
  if (label === 'ریال ایران' || label === 'ریالایران' || label === '﷼' || label.toUpperCase() === 'IRR') {
    return 'ریال';
  }
  return label;
}

/**
 * مبلغ و واحد پول را همیشه به شکل «۱۲۳ ریال» برمی‌گرداند؛
 * در متن راست‌به‌چپ، واحد پول سمت چپ عدد و با یک فاصله نمایش داده می‌شود.
 */
export function formatPersianMoney(number, currency = 'ریال') {
  return `${formatPersianNumber(number)} ${normalizeCurrencyLabel(currency)}`;
}

/**
 * Format a percentage with Persian digits.
 */
export function formatPersianPercent(number) {
  if (number == null || isNaN(number)) return '—';
  const rounded = Math.round(number * 10) / 10;
  return `${toPersianDigits(rounded)}٪`;
}