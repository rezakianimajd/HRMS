/**
 * ابزارهای خالص تقویم شمسی برنامه‌ریزی (قابل تست بدون React).
 *
 * هفته از شنبه شروع می‌شود و تبدیل‌ها از همان `dateUtils` سراسری استفاده می‌کنند
 * تا با فرم‌ها/فهرست‌ها هم‌خوان باشد.
 */
import { getJalaliParts, toGregorian } from '../../core/utils/dateUtils';
import { toPersianDigits } from '../../core/utils/numberUtils';

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const pad = (value) => String(value).padStart(2, '0');
const isoOf = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

export const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const isJalaliDay = (iso, jy, jm, day) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return false;
  const parts = getJalaliParts(iso);
  return Boolean(parts) && parts[0] === jy && parts[1] === jm && parts[2] === day;
};

/** طول ماه شمسی (۲۹/۳۰/۳۱) با بررسی معتبر بودن تبدیل روز ۳۱ و ۳۰. */
export const jalaliMonthLength = (jy, jm) => {
  if (isJalaliDay(toGregorian(`${jy}/${pad(jm)}/31`), jy, jm, 31)) return 31;
  if (isJalaliDay(toGregorian(`${jy}/${pad(jm)}/30`), jy, jm, 30)) return 30;
  return 29;
};

/** شبکهٔ ماه شمسی: خانه‌های قبل/بعد ماه هم برای تراز هفته‌ها برمی‌گردند. */
export const jalaliMonthGrid = (jy, jm, today = todayIso()) => {
  const firstIso = toGregorian(`${jy}/${pad(jm)}/01`);
  const firstDate = new Date(`${firstIso}T00:00:00Z`);
  const offset = (firstDate.getUTCDay() + 1) % 7;
  const length = jalaliMonthLength(jy, jm);
  const total = Math.ceil((offset + length) / 7) * 7;
  const start = addDays(firstDate, -offset);
  const cells = Array.from({ length: total }, (_value, index) => {
    const date = addDays(start, index);
    const iso = isoOf(date);
    const parts = getJalaliParts(iso) || [jy, jm, 0];
    return {
      iso,
      jy: parts[0],
      jm: parts[1],
      jd: parts[2],
      inMonth: parts[0] === jy && parts[1] === jm,
      isFriday: date.getUTCDay() === 5,
      isToday: iso === today,
    };
  });
  return {
    cells,
    start: cells[0].iso,
    end: cells[cells.length - 1].iso,
    title: `${JALALI_MONTHS[jm - 1]} ${jy}`,
  };
};

export const shiftJalaliMonth = (jy, jm, delta) => {
  let year = jy;
  let month = jm + delta;
  while (month < 1) { month += 12; year -= 1; }
  while (month > 12) { month -= 12; year += 1; }
  return { jy: year, jm: month };
};

export const jalaliToday = () => {
  const parts = getJalaliParts(todayIso());
  return parts ? { jy: parts[0], jm: parts[1], jd: parts[2] } : null;
};

export const jalaliDayLabel = (iso) => {
  const parts = getJalaliParts(iso);
  if (!parts) return '';
  return toPersianDigits(`${parts[2]} ${JALALI_MONTHS[parts[1] - 1]} ${parts[0]}`);
};

/** گروه‌بندی ردیف‌ها بر اساس تاریخ ISO (کلید: `YYYY-MM-DD`). */
export const groupByDate = (rows, getDate) => rows.reduce((acc, row) => {
  const value = String(getDate(row) || '').slice(0, 10);
  if (!value) return acc;
  if (!acc[value]) acc[value] = [];
  acc[value].push(row);
  return acc;
}, {});
