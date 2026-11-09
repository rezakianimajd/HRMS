/**
 * ابزار شماره‌گذاری نامه‌ها — آینهٔ ``hrms_project/correspondences/numbering.py``.
 *
 * قالب شماره از توکن‌ها و متن فارسی ساخته می‌شود:
 * ``{prefix}`` پیشوند گروه، ``{seq}`` شمارهٔ سری، ``{year}``/``{yy}`` سال شمسی،
 * ``{month}`` و ``{day}``. می‌تواند تک‌قسمتی (``{seq}``) یا چندقسمتی باشد و
 * حروف فارسی هم داخل آن بیاید (مثلاً ``موسسه/{year}/{seq}``).
 */
import { getJalaliParts } from '../../core/utils/dateUtils';

export const NUMBER_TOKENS = [
  { value: '{prefix}', label: 'پیشوند گروه', hint: 'متن پیشوند ثبت‌شده در همان گروه' },
  { value: '{seq}', label: 'شماره سری', hint: 'شمارهٔ خودکار (با تعداد رقم)' },
  { value: '{year}', label: 'سال شمسی', hint: 'مثل ۱۴۰۵' },
  { value: '{yy}', label: 'سال دو رقمی', hint: 'مثل ۰۵' },
  { value: '{month}', label: 'ماه شمسی', hint: 'دو رقمی' },
  { value: '{day}', label: 'روز ماه', hint: 'دو رقمی' },
];

export const TOKEN_VALUES = NUMBER_TOKENS.map((token) => token.value);

export const DEFAULT_TEMPLATE = '{prefix}/{year}/{seq}';

/** نمونه‌های آماده برای شروع سریع (تک‌قسمتی و چندقسمتی) */
export const TEMPLATE_PRESETS = [
  { value: '{prefix}/{year}/{seq}', label: 'پیشوند / سال / شماره' },
  { value: '{prefix}-{yy}-{seq}', label: 'پیشوند - سال دو رقمی - شماره' },
  { value: '{seq}', label: 'فقط شماره (تک‌قسمتی)' },
  { value: '{prefix}/{seq}', label: 'پیشوند / شماره' },
  { value: '{year}/{seq}', label: 'سال / شماره' },
  { value: 'موسسه/{year}/{seq}', label: 'متن ثابت فارسی / سال / شماره' },
  { value: '{prefix}/{year}/{month}/{seq}', label: 'پیشوند / سال / ماه / شماره' },
];

export const SEPARATORS = ['/', '-', '.', '_', ' '];

/** توکن‌های استفاده‌شده در قالب (فقط توکن‌های شناخته‌شده) */
export const templateTokens = (template) => (
  (String(template || '').match(/\{(\w+)\}/g) || [])
    .map((token) => token.replace(/[{}]/g, ''))
    .filter((token) => TOKEN_VALUES.includes(`{${token}}`))
);

/** اعتبارسنجی قالب: باید ``{seq}`` داشته باشد و توکن ناشناخته نداشته باشد */
export const validateTemplate = (template) => {
  const text = String(template || '').trim();
  if (!text) return 'قالب شماره خالی است.';
  const unknown = (text.match(/\{(\w+)\}/g) || [])
    .map((token) => token.replace(/[{}]/g, ''))
    .filter((token) => !TOKEN_VALUES.includes(`{${token}}`));
  if (unknown.length) return `توکن ناشناخته در قالب: ${unknown.join(', ')}`;
  if (!templateTokens(text).includes('seq')) return 'قالب شماره باید شامل {seq} باشد.';
  return '';
};

const cleanSeparators = (text) => {
  let out = String(text || '');
  SEPARATORS.filter((sep) => sep.trim()).forEach((sep) => {
    const escaped = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`${escaped}{2,}`, 'g'), sep);
  });
  out = out.trim();
  SEPARATORS.filter((sep) => sep.trim()).forEach((sep) => {
    while (out.startsWith(sep)) out = out.slice(sep.length);
    while (out.endsWith(sep)) out = out.slice(0, -sep.length);
    out = out.split(` ${sep}`).join(sep).split(`${sep} `).join(sep);
  });
  return out.replace(/\s{2,}/g, ' ').trim();
};

/** رندر شماره از قالب (هم‌رفتار با بک‌اند) */
export const renderNumber = (template, {
  prefix = '', seq = 1, padding = 3, year, month, day, date,
} = {}) => {
  const parts = getJalaliParts(date || new Date().toISOString()) || [];
  const jy = year || parts[0] || 1400;
  const jm = month || parts[1] || 1;
  const jd = day || parts[2] || 1;
  const safeSeq = Number.isFinite(Number(seq)) ? Number(seq) : 1;
  const pad = Math.max(0, Math.min(Number(padding) || 0, 10));
  const number = String(template || DEFAULT_TEMPLATE)
    .replace(/\{prefix\}/g, String(prefix || '').trim())
    .replace(/\{seq\}/g, String(safeSeq).padStart(pad, '0'))
    .replace(/\{year\}/g, String(jy))
    .replace(/\{yy\}/g, String(jy).slice(-2))
    .replace(/\{month\}/g, String(jm).padStart(2, '0'))
    .replace(/\{day\}/g, String(jd).padStart(2, '0'));
  return cleanSeparators(number);
};

/** شمارهٔ بعدی یک گروه (fallback محلی وقتی پاسخ سرور در دسترس نیست) */
export const localPreview = (series, { date } = {}) => {
  if (!series) return '';
  const start = Math.max(1, Number(series.start_number) || 1);
  const next = Math.max(start, Number(series.next_number) || start);
  return renderNumber(series.template || DEFAULT_TEMPLATE, {
    prefix: series.prefix || '',
    seq: next,
    padding: series.padding,
    date,
  });
};

/** شمارهٔ سری موجود در یک شمارهٔ ثبت‌شده (برای هم‌گام‌سازی شمارنده) */
export const extractSequence = (number, template = '') => {
  const text = String(number || '').trim();
  if (!text) return null;
  if (template) {
    const escaped = template
      .split(/(\{\w+\})/)
      .filter(Boolean)
      .map((part) => {
        if (part === '{seq}') return '(?<seq>\\d+)';
        if (/^\{\w+\}$/.test(part)) return '[^/\\-._\\s]+';
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    try {
      const match = new RegExp(`^${escaped}$`).exec(text);
      if (match?.groups?.seq) return Number(match.groups.seq);
    } catch {
      /* قالب نامعتبر — ادامه با روش پیش‌فرض */
    }
  }
  const groups = text.match(/\d+/g);
  return groups ? Number(groups[groups.length - 1]) : null;
};

/** نمایش انسانی وضعیت شماره‌گذاری یک گروه */
export const seriesStatus = (series) => {
  if (!series) return '';
  const start = Math.max(1, Number(series.start_number) || 1);
  const next = Math.max(start, Number(series.next_number) || start);
  const lastUsed = next - 1;
  if (!series.letter_count && lastUsed < start) return 'هنوز شماره‌ای صادر نشده';
  return `تا شماره ${lastUsed} مصرف شده؛ بعدی ${next}`;
};
