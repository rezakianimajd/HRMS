import {
  adjustmentSummaryOf, isAdjustmentKind, latestNormalStatement, statementDisplayTitle, statementKindOf,
} from '../pages/contracts/statementKinds';

test('recognizes statement and adjustment kinds', () => {
  expect(statementKindOf({}).key).toBe('statement');
  expect(isAdjustmentKind({ kind: 'increase' })).toBe(true);
  expect(isAdjustmentKind({ kind: 'decrease' })).toBe(true);
  expect(isAdjustmentKind({ kind: 'statement' })).toBe(false);
  expect(statementDisplayTitle({ kind: 'increase', number: '3' })).toBe('تعدیل افزایشی ۰۳');
  expect(statementDisplayTitle({ kind: 'decrease', number: '03' })).toBe('تعدیل کاهشی ۰۳');
});

test('summarizes increase and decrease adjustments independently', () => {
  const rows = [
    { id: 1, kind: 'statement', amount: 200000000, net_amount: 200000000 },
    { id: 2, kind: 'increase', work_done: 50000000, adjustment_work_done: 50000000, adjustment_foreign_work_done: 25 },
    { id: 3, kind: 'decrease', work_done: -20000000, adjustment_work_done: -20000000, adjustment_foreign_work_done: -10 },
  ];
  const summary = adjustmentSummaryOf(rows);
  expect(summary.count).toBe(2);
  expect(summary.increase).toBe(50000000);
  expect(summary.decrease).toBe(20000000);
  expect(summary.net).toBe(30000000);
  expect(summary.increaseForeign).toBe(25);
  expect(summary.decreaseForeign).toBe(10);
  expect(summary.netForeign).toBe(15);
  expect(latestNormalStatement(rows)?.id).toBe(1);
});
