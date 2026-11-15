/**
 * تم و متادیتای مشترک صفحهٔ «یادداشت‌ها و وظایف».
 *
 * همهٔ رنگ‌ها/شعاع/سایه از استودیو تم و پالت ماژول می‌آید؛ هیچ مقدار hard-code
 * جدیدی برای رابط تعریف نمی‌شود و fallbackها همان پیش‌فرض‌های توکن هستند.
 */
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { useModuleTheme } from '../contracts/contractModuleUi';
import { toJalali } from '../../core/utils/dateUtils';
import { toPersianDigits } from '../../core/utils/numberUtils';

export const FALLBACK_ACCENT = '#6366f1';

export const TASK_STATUS_META = {
  todo: { key: 'todo', label: 'انجام‌نشده', tone: 'neutral' },
  doing: { key: 'doing', label: 'در حال انجام', tone: 'info' },
  done: { key: 'done', label: 'انجام‌شده', tone: 'success' },
  cancelled: { key: 'cancelled', label: 'لغو‌شده', tone: 'danger' },
};
export const TASK_STATUS_ORDER = ['todo', 'doing', 'done', 'cancelled'];

export const TASK_PRIORITY_META = {
  low: { key: 'low', label: 'کم', tone: 'neutral' },
  normal: { key: 'normal', label: 'معمولی', tone: 'info' },
  high: { key: 'high', label: 'زیاد', tone: 'warning' },
  urgent: { key: 'urgent', label: 'فوری', tone: 'danger' },
};
export const TASK_PRIORITY_ORDER = ['urgent', 'high', 'normal', 'low'];

export const NOTE_SORT_OPTIONS = [
  { value: '-updated_at', label: 'آخرین ویرایش' },
  { value: '-created_at', label: 'جدیدترین' },
  { value: 'title', label: 'عنوان (الف تا ی)' },
  { value: 'created_at', label: 'قدیمی‌ترین' },
];

export const TASK_SORT_OPTIONS = [
  { value: 'default', label: 'سررسید (نزدیک‌ترین)' },
  { value: '-due_date', label: 'سررسید (دورترین)' },
  { value: 'priority', label: 'اولویت (فوری تا کم)' },
  { value: '-created_at', label: 'جدیدترین' },
  { value: 'title', label: 'عنوان (الف تا ی)' },
];

export const TASK_STATUS_FILTERS = [
  { value: 'open', label: 'بازها' },
  { value: 'todo', label: 'انجام‌نشده' },
  { value: 'doing', label: 'در حال انجام' },
  { value: 'today', label: 'سررسید امروز' },
  { value: 'overdue', label: 'معوق' },
  { value: 'done', label: 'انجام‌شده' },
  { value: 'all', label: 'همه' },
];

export const EMPTY_NOTE = {
  id: null, title: '', body: '', color: '', tags: [], checklist: [], is_pinned: false,
};

export const EMPTY_TASK = {
  id: null, title: '', description: '', status: 'todo', priority: 'normal',
  due_date: '', due_time: '', tags: [], checklist: [], is_pinned: false,
  assigneeIds: [], groupIds: [], assignMode: 'me',
};

/** توکن‌های تم + رنگ‌های معنایی + شعاع/سایهٔ آمادهٔ استفاده. */
export const usePlanningTheme = () => {
  const module = useModuleTheme();
  const { tokens } = useDesignTokens();
  const { getPalette, typography } = useModulePalette();
  const colors = tokens.colors || {};
  const accent = getPalette('planning')?.accent
    || getPalette('chat')?.accent
    || colors.primary
    || FALLBACK_ACCENT;
  const tones = {
    accent,
    neutral: colors.textSecondary || '#64748b',
    info: colors.info || '#0ea5e9',
    success: colors.success || '#10b981',
    warning: colors.warning || '#f59e0b',
    danger: colors.danger || '#be123c',
    text: colors.textPrimary || '#0f172a',
    muted: colors.textSecondary || '#64748b',
    border: colors.border || colors.divider || '#e2e8f0',
    surface: tokens.surfaces?.card?.background || '#ffffff',
  };
  return {
    ...module,
    tokens,
    typography,
    accent,
    tones,
    radii: {
      small: 'var(--hrms-radius-small, 10px)',
      medium: 'var(--hrms-radius, 12px)',
      large: 'var(--hrms-radius-large, 16px)',
    },
    shadows: {
      card: 'var(--hrms-shadow-card, 0 4px 18px rgba(15,23,42,0.05))',
      dialog: 'var(--hrms-shadow-dialog, 0 24px 60px rgba(15,23,42,0.18))',
    },
  };
};

export const toneColor = (theme, tone) => theme.tones[tone] || theme.tones.neutral;

/** پالت رنگ یادداشت‌ها از رنگ‌های معنایی تم (بدون رنگ hard-code جدید). */
export const notePalette = (theme) => ([
  { key: 'accent', color: theme.tones.accent },
  { key: 'info', color: theme.tones.info },
  { key: 'success', color: theme.tones.success },
  { key: 'warning', color: theme.tones.warning },
  { key: 'danger', color: theme.tones.danger },
  { key: 'neutral', color: theme.tones.neutral },
]);

/** برچسب‌ها: آرایه یا رشتهٔ جداشده با کاما/ویرگول فارسی. */
export const tagsFrom = (value) => {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[,،]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
};

export const normalizeChecklist = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({ text: String(row?.text || '').trim(), done: Boolean(row?.done) }))
    .filter((row) => row.text);
};

export const checklistStats = (value) => {
  const rows = normalizeChecklist(value);
  const total = rows.length;
  const done = rows.filter((row) => row.done).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
};

export const formatJalali = (iso) => {
  if (!iso) return '—';
  const text = String(iso).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? toJalali(text) : '—';
};

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

/** وضعیت سررسید: معوق/امروز/نزدیک/عادی + برچسب فارسی و تُن رنگی. */
export const dueInfo = (iso) => {
  if (!iso) return { days: null, label: 'بدون سررسید', tone: 'neutral', short: '—' };
  const target = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return { days: null, label: 'بدون سررسید', tone: 'neutral', short: '—' };
  }
  const days = Math.round((target - startOfToday()) / 86400000);
  if (days < 0) {
    return {
      days, tone: 'danger', short: 'معوق',
      label: `${toPersianDigits(Math.abs(days))} روز گذشته`,
    };
  }
  if (days === 0) return { days, tone: 'warning', label: 'امروز', short: 'امروز' };
  if (days === 1) return { days, tone: 'warning', label: 'فردا', short: 'فردا' };
  if (days <= 7) {
    return { days, tone: 'info', label: `${toPersianDigits(days)} روز مانده`, short: 'نزدیک' };
  }
  return { days, tone: 'neutral', label: formatJalali(iso), short: formatJalali(iso) };
};

export const initialsOf = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`;
};

export const timeLabel = (value) => {
  const text = String(value || '');
  if (!text) return '';
  const [hour, minute] = text.split(':');
  return `${toPersianDigits(hour)}:${toPersianDigits(minute)}`;
};
