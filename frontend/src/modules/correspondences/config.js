export const PRIORITIES = [
  { value: 'low', label: 'کم', color: '#10b981' },
  { value: 'normal', label: 'عادی', color: '#3b82f6' },
  { value: 'high', label: 'زیاد', color: '#f59e0b' },
  { value: 'urgent', label: 'فوری', color: '#ef4444' },
];

export const ANNOUNCEMENT_TYPES = [
  { value: 'appointment', label: 'انتصاب', color: '#6366f1' },
  { value: 'promotion', label: 'ارتقا', color: '#10b981' },
  { value: 'warning', label: 'تذکر', color: '#ef4444' },
  { value: 'appreciation', label: 'تقدیر', color: '#f59e0b' },
  { value: 'general', label: 'عمومی', color: '#3b82f6' },
];

export const PRIORITY_LABELS = PRIORITIES.reduce((a, p) => { a[p.value] = p.label; return a; }, {});
export const PRIORITY_COLORS = PRIORITIES.reduce((a, p) => { a[p.value] = p.color; return a; }, {});
export const TYPE_LABELS = ANNOUNCEMENT_TYPES.reduce((a, t) => { a[t.value] = t.label; return a; }, {});
export const TYPE_COLORS = ANNOUNCEMENT_TYPES.reduce((a, t) => { a[t.value] = t.color; return a; }, {});