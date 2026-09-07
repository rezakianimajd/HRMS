/**
 * Gregorian ⇄ Jalali (Shamsi) date conversion.
 * Uses the browser-native Persian calendar via Intl.DateTimeFormat for
 * guaranteed-correct forward conversion, plus a symmetric binary search
 * for the reverse conversion. This keeps the form (save) and display
 * (profile) perfectly in sync with no off-by-one drift.
 *
 * All DISPLAY dates (toJalali) are output with Persian digits so the UI is
 * consistently Persian. The raw (English-digit) converter is kept internal
 * for toGregorian's binary search, which must compare ASCII strings.
 */

const JALALI_FORMATTER = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

function pad(n) {
  return String(n).padStart(2, '0');
}

function toPersianDigits(input) {
  if (input == null || input === '') return '';
  return String(input).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);
}

/**
 * Raw Jalali converter — returns ASCII digits (e.g. "1404/06/15").
 * Used internally by toGregorian's binary search.
 */
function toJalaliRaw(gregorianDate) {
  const [y, m, d] = gregorianDate.split('-').map(Number);
  if (!y || !m || !d) return gregorianDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  const parts = JALALI_FORMATTER.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}/${get('month')}/${get('day')}`;
}

/**
 * Convert a Gregorian date string (YYYY-MM-DD) to a Jalali date string.
 * Display output uses Persian digits (e.g. "۱۴۰۴/۰۶/۱۵").
 */
export function toJalali(gregorianDate) {
  if (!gregorianDate) return '—';
  try {
    return toPersianDigits(toJalaliRaw(gregorianDate));
  } catch {
    return gregorianDate;
  }
}

/**
 * Return the Jalali [year, month, day] as NUMBERS for programmatic logic.
 * (toJalali returns Persian digits for display, which breaks Number() parsing.)
 */
export function getJalaliParts(gregorianDate) {
  if (!gregorianDate) return null;
  try {
    return toJalaliRaw(gregorianDate).split('/').map(Number);
  } catch {
    return null;
  }
}

/**
 * Convert a Jalali date string (YYYY/MM/DD) to Gregorian date string (YYYY-MM-DD).
 * Accepts both Persian and English digits on input.
 */
export function toGregorian(jalaliDate) {
  if (!jalaliDate) return '';
  try {
    const normalized = String(jalaliDate)
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    const parts = normalized.split('/');
    if (parts.length !== 3) return jalaliDate;
    const [jy, jm, jd] = parts.map(Number);
    if (!jy || !jm || !jd) return jalaliDate;

    const target = `${jy}/${pad(jm)}/${pad(jd)}`;

    // Search a generous Gregorian range (1800..2300) for the matching Jalali date.
    let lo = Date.UTC(1800, 0, 1);
    let hi = Date.UTC(2300, 0, 1);

    for (let i = 0; i < 40; i++) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate = new Date(mid);
      const iso = candidate.toISOString().slice(0, 10);
      const candidateJalali = toJalaliRaw(iso);

      if (candidateJalali === target) {
        return iso;
      }
      if (candidateJalali < target) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return jalaliDate;
  } catch {
    return jalaliDate;
  }
}

/**
 * Format a date string for display. Returns Jalali for Gregorian input.
 */
export function formatDate(dateStr) {
  return toJalali(dateStr);
}