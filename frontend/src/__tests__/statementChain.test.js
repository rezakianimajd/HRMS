/**
 * تست زنجیرهٔ دوره‌ای صورت‌وضعیت (رفع خطای «مبلغ تجمعی کمتر از دوره قبل»).
 *
 * سناریوی واقعی: قرارداد C-KPSMI-05-073 سند شمارهٔ ۱۴ با مبلغ تجمعی
 * ۱۱۹٬۴۱۸٬۷۴۹٬۴۲۰ ریال داشت و ثبت سند شمارهٔ ۱ باید بدون محدودیت انجام شود.
 */
import {
  adjustmentCumulativeFor,
  contractHasMultiLevels,
  foreignCumulativeFor,
  previousCumulativeFor,
  previousPeriodRows,
  seedLevelsFrom,
  statementNumberValue,
} from '../pages/contracts/statementChain';

const row = (id, number, amount, extra = {}) => ({
  id,
  number,
  date: '2026-01-01',
  kind: 'statement',
  amount,
  cumulative_previous_amount: 0,
  work_done: amount,
  additions: [],
  deductions: [],
  ...extra,
});

test('statement numbers are read as numbers only when numeric', () => {
  expect(statementNumberValue('01')).toBe(1);
  expect(statementNumberValue('14')).toBe(14);
  expect(statementNumberValue(' S-3 ')).toBeNull();
  expect(statementNumberValue('')).toBeNull();
});

test('first period after number 14 has no previous cumulative', () => {
  const rows = [row(548, '14', 119418749420)];
  expect(previousCumulativeFor(rows, { number: '01' })).toBeNull();
  expect(previousPeriodRows(rows, { number: '1' })).toEqual([]);
});

test('later period sees only smaller numbers (not insertion order)', () => {
  const rows = [
    row(11, '03', 300, { work_done: 100 }),
    row(10, '02', 200, { work_done: 100 }),
    row(9, '01', 100, { work_done: 100 }),
  ];
  expect(previousCumulativeFor(rows, { number: '04' })).toBe(300);
  expect(previousPeriodRows(rows, { number: '04' }).map((item) => item.number))
    .toEqual(['01', '02', '03']);
});

test('editing a row excludes itself from the chain', () => {
  const rows = [row(9, '01', 100, { work_done: 100 }), row(10, '02', 200, { work_done: 100 })];
  expect(previousCumulativeFor(rows, { excludeId: 10, number: '02' })).toBe(100);
});

test('mixed or duplicate numbers keep the previous insertion order behaviour', () => {
  const mixed = [row(5, '', 900, { work_done: 900 }), row(2, '02', 200, { work_done: 200 })];
  // بدون شمارهٔ عددی یکتا برای همه، ترتیب ثبت ملاک است: همهٔ ردیف‌ها «دورهٔ قبل»اند
  // و مبنا = بیشترِ «آخرین مبلغ تجمعی» و «جمع کارکردهای قبلی».
  expect(previousCumulativeFor(mixed, { number: '03' })).toBe(1100);
  const duplicate = [row(5, '02', 200, { work_done: 200 }), row(2, '02', 100, { work_done: 100 })];
  expect(previousPeriodRows(duplicate, { number: '03' }).map((item) => item.id)).toEqual([2, 5]);
});

test('previous cumulative falls back to sum of prior works when amounts are lower', () => {
  const rows = [
    row(9, '01', 100, { work_done: 100 }),
    row(10, '02', 150, { work_done: 400 }),
  ];
  expect(previousCumulativeFor(rows, { number: '03' })).toBe(500);
});

test('adjustment and foreign chains follow the period order too', () => {
  const rows = [
    row(548, '14', 1000, { work_done: 1000 }),
    row(600, '01', 100, { work_done: 100 }),
    row(601, '', 50, { kind: 'increase', work_done: 0, adjustment_work_done: 50 }),
  ];
  expect(previousCumulativeFor(rows, { number: '02' })).toBe(100);
  expect(foreignCumulativeFor(rows, { number: '02' })).toBe(100);
  expect(adjustmentCumulativeFor(rows, { number: '02' })).toBe(50);
});

test('seedLevels and multi detection follow the contract documents', () => {
  const rows = [
    row(548, '14', 1000, { kind: 'multi', levels: [{ title: 'حق الزحمه', amount: 500 }] }),
    row(600, '01', 100, { kind: 'multi', levels: [{ title: 'حق الزحمه', amount: 200 }] }),
  ];
  expect(contractHasMultiLevels(rows)).toBe(true);
  expect(contractHasMultiLevels([row(1, '01', 100)])).toBe(false);
  expect(seedLevelsFrom(rows, '15')[0]).toMatchObject({ title: 'حق الزحمه', amount: 500 });
});
