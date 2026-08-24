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
 * Format a percentage with Persian digits.
 */
export function formatPersianPercent(number) {
  if (number == null || isNaN(number)) return '—';
  const rounded = Math.round(number * 10) / 10;
  return `${toPersianDigits(rounded)}٪`;
}