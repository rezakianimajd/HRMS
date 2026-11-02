/** منطق خالص بخش «خانواده» پروندهٔ پرسنلی — مستقل از UI و قابل تست. */
import { toJalali } from './dateUtils';

export const FAMILY_RELATIONS = [
  { value: 'spouse', label: 'همسر', color: '#be185d' },
  { value: 'child', label: 'فرزند', color: '#2563eb' },
  { value: 'father', label: 'پدر', color: '#0f766e' },
  { value: 'mother', label: 'مادر', color: '#b45309' },
  { value: 'sibling', label: 'خواهر / برادر', color: '#7c3aed' },
  { value: 'other', label: 'سایر', color: '#64748b' },
];

export const FAMILY_RELATION_LABELS = FAMILY_RELATIONS.reduce((labels, item) => {
  labels[item.value] = item.label;
  return labels;
}, {});

export const FAMILY_RELATION_COLORS = FAMILY_RELATIONS.reduce((colors, item) => {
  colors[item.value] = item.color;
  return colors;
}, {});

export const FAMILY_SOURCES = {
  manual: { label: 'ثبت دستی', color: '#475569' },
  supplementary_insurance: { label: 'بیمه تکمیلی', color: '#7c3aed' },
};

export const relationLabel = (value) => FAMILY_RELATION_LABELS[value] || '—';
export const relationColor = (value) => FAMILY_RELATION_COLORS[value] || '#64748b';
export const sourceLabel = (value) => (FAMILY_SOURCES[value]?.label || 'ثبت دستی');
export const sourceColor = (value) => (FAMILY_SOURCES[value]?.color || '#475569');

export const familyFullName = (member = {}) => (
  member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'بدون نام'
);

export const familyBirthDateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

export const familyAgeOf = (value) => {
  if (!value) return null;
  const birth = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

export const familySearchText = (member = {}) => [
  member.first_name, member.last_name, member.full_name, member.national_id,
  member.phone, member.notes, relationLabel(member.relation), sourceLabel(member.source),
].filter(Boolean).join(' ').toLowerCase();

export const familySummary = (members = []) => ({
  total: members.length,
  dependents: members.filter((member) => member.is_dependent !== false).length,
  fromInsurance: members.filter((member) => member.source === 'supplementary_insurance').length,
  manual: members.filter((member) => member.source !== 'supplementary_insurance').length,
});
