import {
  DEFAULT_TEMPLATE, NUMBER_TOKENS, TEMPLATE_PRESETS, extractSequence, localPreview,
  renderNumber, seriesStatus, templateTokens, validateTemplate,
} from '../pages/correspondence/correspondenceNumbering';

test('renders multi-part numbers with a Persian prefix', () => {
  expect(renderNumber('{prefix}/{year}/{seq}', {
    prefix: 'ص م', seq: 7, padding: 3, year: 1405,
  })).toBe('ص م/1405/007');
});

test('renders single-part numbers', () => {
  expect(renderNumber('{seq}', { seq: 12, padding: 4, year: 1405 })).toBe('0012');
});

test('supports short year, month and free Persian text parts', () => {
  expect(renderNumber('{prefix}-{yy}-{month}-{seq}', {
    prefix: 'دانشگاه', seq: 3, padding: 2, year: 1405, month: 7,
  })).toBe('دانشگاه-05-07-03');
  expect(renderNumber('موسسه/{year}/{seq}', { seq: 5, padding: 3, year: 1405 }))
    .toBe('موسسه/1405/005');
});

test('drops empty prefix and duplicate separators', () => {
  expect(renderNumber('{prefix}/{year}/{seq}', { prefix: '', seq: 1, padding: 3, year: 1405 }))
    .toBe('1405/001');
});

test('template validation requires the sequence token', () => {
  expect(validateTemplate('{prefix}/{year}/{seq}')).toBe('');
  expect(validateTemplate('{prefix}/{year}')).toContain('{seq}');
  expect(validateTemplate('{nope}/{seq}')).toContain('nope');
  expect(validateTemplate('   ')).toContain('خالی');
});

test('token helpers expose the known tokens', () => {
  expect(templateTokens('{prefix}/{yy}/{seq}')).toEqual(['prefix', 'yy', 'seq']);
  expect(NUMBER_TOKENS.map((token) => token.value)).toContain('{seq}');
  expect(TEMPLATE_PRESETS.some((preset) => preset.value === '{seq}')).toBe(true);
  expect(DEFAULT_TEMPLATE).toBe('{prefix}/{year}/{seq}');
});

test('extract sequence from a registered number', () => {
  expect(extractSequence('ص م/1405/012', '{prefix}/{year}/{seq}')).toBe(12);
  expect(extractSequence('012/1405', '{seq}/{year}')).toBe(12);
  expect(extractSequence('نامه 1405/457')).toBe(457);
  expect(extractSequence('')).toBeNull();
});

test('local preview respects start number and counter', () => {
  const series = {
    template: '{prefix}-{seq}', prefix: 'دانشگاه', padding: 3,
    start_number: 500, next_number: 505,
  };
  expect(localPreview(series, { date: '2026-11-09' })).toBe('دانشگاه-505');
  expect(localPreview({ ...series, next_number: 10 }, { date: '2026-11-09' })).toBe('دانشگاه-500');
  expect(localPreview(null)).toBe('');
});

test('series status describes the counter position', () => {
  expect(seriesStatus({ start_number: 1, next_number: 4, letter_count: 3 }))
    .toBe('تا شماره 3 مصرف شده؛ بعدی 4');
  expect(seriesStatus({ start_number: 10, next_number: 10, letter_count: 0 }))
    .toContain('هنوز');
});
