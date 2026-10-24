import { formatStatementNumber, normalizeStatementNumber } from '../core/utils/numberUtils';

test('normalizes statement numbers to at least two digits', () => {
  expect(normalizeStatementNumber('3')).toBe('03');
  expect(normalizeStatementNumber('۰۳')).toBe('03');
  expect(normalizeStatementNumber('٠٧')).toBe('07');
  expect(normalizeStatementNumber('003')).toBe('03');
  expect(normalizeStatementNumber('103')).toBe('103');
  expect(normalizeStatementNumber(' 7 ')).toBe('07');
  expect(normalizeStatementNumber('S-3')).toBe('S-3');
  expect(normalizeStatementNumber('')).toBe('');
  expect(normalizeStatementNumber(null)).toBe('');
});

test('formats statement numbers with Persian digits', () => {
  expect(formatStatementNumber('3')).toBe('۰۳');
  expect(formatStatementNumber('103')).toBe('۱۰۳');
  expect(formatStatementNumber('S-3')).toBe('S-۳');
  expect(formatStatementNumber('')).toBe('');
});
