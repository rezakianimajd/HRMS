/**
 * Gregorian ⇄ Jalali (Shamsi) date conversion.
 * Uses the browser-native Persian calendar via Intl.DateTimeFormat for
 * guaranteed-correct forward conversion, plus a symmetric binary search
 * for the reverse conversion. This keeps the form (save) and display
 * (profile) perfectly in sync with no off-by-one drift.
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

/**
 * Convert a Gregorian date string (YYYY-MM-DD) to Jalali date string (YYYY/MM/DD).
 */
export function toJalali(gregorianDate) {
  if (!gregorianDate) return '—';
  try {
    const [y, m, d] = gregorianDate.split('-').map(Number);
    if (!y || !m || !d) return gregorianDate;
    const date = new Date(Date.UTC(y, m - 1, d));
    const parts = JALALI_FORMATTER.formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}/${get('month')}/${get('day')}`;
  } catch {
    return gregorianDate;
  }
}

/**
 * Convert a Jalali date string (YYYY/MM/DD) to Gregorian date string (YYYY-MM-DD).
 * Uses the same Intl-based forward function (toJalali) via binary search so the
 * two directions are guaranteed to be exact inverses.
 */
export function toGregorian(jalaliDate) {
  if (!jalaliDate) return '';
  try {
    const parts = String(jalaliDate).split('/');
    if (parts.length !== 3) return jalaliDate;
    const [jy, jm, jd] = parts.map(Number);
    if (!jy || !jm || !jd) return jalaliDate;

    const target = `${jy}/${pad(jm)}/${pad(jd)}`;

    // Search a generous Gregorian range (1800..2300) for the matching Jalali date.
    // This covers Jalali years ~1179..1679, including common modern dates (1400s).
    let lo = Date.UTC(1800, 0, 1);
    let hi = Date.UTC(2300, 0, 1);

    for (let i = 0; i < 40; i++) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate = new Date(mid);
      const iso = candidate.toISOString().slice(0, 10);
      const candidateJalali = toJalali(iso);

      if (candidateJalali === target) {
        return iso;
      }
      // String compare works because both are zero-padded YYYY/MM/DD.
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