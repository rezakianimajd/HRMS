import {
  FAMILY_RELATIONS, FAMILY_SOURCES, familyAgeOf, familyBirthDateLabel, familyFullName,
  familySearchText, familySummary, relationColor, relationLabel, sourceColor, sourceLabel,
} from '../core/utils/familyMembers';

test('maps every family relation to a Persian label and color', () => {
  expect(FAMILY_RELATIONS.map((item) => item.value)).toEqual(
    ['spouse', 'child', 'father', 'mother', 'sibling', 'other'],
  );
  expect(relationLabel('spouse')).toBe('همسر');
  expect(relationLabel('child')).toBe('فرزند');
  expect(relationLabel('sibling')).toBe('خواهر / برادر');
  expect(relationLabel('unknown')).toBe('—');
  expect(relationColor('child')).toMatch(/^#/);
  expect(relationColor('unknown')).toBe('#64748b');
});

test('labels the registration source (manual vs supplementary insurance)', () => {
  expect(sourceLabel('supplementary_insurance')).toBe('بیمه تکمیلی');
  expect(sourceLabel('manual')).toBe('ثبت دستی');
  expect(sourceLabel(undefined)).toBe('ثبت دستی');
  expect(sourceColor('supplementary_insurance')).toBe(FAMILY_SOURCES.supplementary_insurance.color);
});

test('builds a full name and a Jalali birth date label', () => {
  expect(familyFullName({ first_name: 'سارا', last_name: 'احمدی' })).toBe('سارا احمدی');
  expect(familyFullName({ full_name: 'نیما رضایی' })).toBe('نیما رضایی');
  expect(familyFullName({})).toBe('بدون نام');
  expect(familyBirthDateLabel('2016-03-20')).toBe('۱۳۹۵/۰۱/۰۱');
  expect(familyBirthDateLabel(null)).toBe('—');
});

test('computes age from the birth date', () => {
  const today = new Date();
  const before = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate(), 12);
  expect(familyAgeOf(before.toISOString().slice(0, 10))).toBe(12);
  expect(familyAgeOf('')).toBeNull();
  expect(familyAgeOf('not-a-date')).toBeNull();
});

test('searches across name, national id, phone, relation and source', () => {
  const member = {
    first_name: 'نیما', last_name: 'رضایی', national_id: '0012345678',
    phone: '09121234567', relation: 'child', source: 'supplementary_insurance',
    notes: 'دانش‌آموز',
  };
  expect(familySearchText(member)).toContain('نیما');
  expect(familySearchText(member)).toContain('0012345678');
  expect(familySearchText(member)).toContain('فرزند');
  expect(familySearchText(member)).toContain('بیمه تکمیلی');
  expect(familySearchText(member)).toContain('دانش‌آموز');
});

test('summarizes members by dependency and source', () => {
  const summary = familySummary([
    { is_dependent: true, source: 'supplementary_insurance' },
    { is_dependent: true, source: 'manual' },
    { is_dependent: false, source: 'manual' },
  ]);
  expect(summary).toEqual({ total: 3, dependents: 2, fromInsurance: 1, manual: 2 });
  expect(familySummary()).toEqual({ total: 0, dependents: 0, fromInsurance: 0, manual: 0 });
});
