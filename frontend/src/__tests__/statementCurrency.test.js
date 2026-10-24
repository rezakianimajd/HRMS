import {
  displayAmount, fromRial, hasForeignAmount, isRialCurrency,
  normalizeRate, rateOfStatement, toRial,
} from '../pages/contracts/statementCurrency';

test('normalizes exchange rates and keeps decimal precision', () => {
  expect(normalizeRate(0)).toBe(1);
  expect(normalizeRate('')).toBe(1);
  expect(normalizeRate('2097200.123456')).toBe(2097200.123456);
  expect(isRialCurrency('ریال ایران')).toBe(true);
  expect(isRialCurrency('EUR')).toBe(false);
});

test('converts foreign amounts to integer rial and back', () => {
  const rate = 2097200.5;
  const rial = toRial(1234.5678, rate);
  expect(Number.isInteger(rial)).toBe(true);
  expect(rial).toBe(2589136207);
  expect(fromRial(rial, rate)).toBeCloseTo(1234.5678, 4);
  expect(toRial(150.25, 1)).toBe(150);
  expect(toRial(150.75, 1)).toBe(151);
});

test('uses the historical rate first and contract rate as fallback', () => {
  expect(rateOfStatement({ exchange_rate: '2100000', currency_name: 'یورو' })).toBe(2100000);
  expect(rateOfStatement({ exchange_rate: 1, currency_name: 'یورو' }, 2000000)).toBe(2000000);
  expect(rateOfStatement({ exchange_rate: 1, currency_name: 'ریال' }, 2000000)).toBe(1);
  expect(rateOfStatement({ currency_name: 'یورو' }, 2000000)).toBe(2000000);
});

test('displays rial values in the statement currency', () => {
  const row = { currency_name: 'یورو', exchange_rate: 2000000 };
  expect(displayAmount(row, 20000000)).toBe(10);
  expect(hasForeignAmount(row)).toBe(true);
  expect(hasForeignAmount({ currency_name: 'ریال' })).toBe(false);
});
