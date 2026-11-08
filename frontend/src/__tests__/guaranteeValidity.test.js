import {
  CHECK_VALIDITY_YEARS, addYears, daysUntil, guaranteeDueDate, guaranteeValidity,
  isCheckInstrument,
} from '../core/utils/guaranteeValidity';

const yearsAgo = (years) => {
  const day = new Date();
  day.setFullYear(day.getFullYear() - years);
  return day.toISOString().slice(0, 10);
};

const daysAgo = (days) => {
  const day = new Date();
  day.setDate(day.getDate() - days);
  return day.toISOString().slice(0, 10);
};

const daysAhead = (days) => {
  const day = new Date();
  day.setDate(day.getDate() + days);
  return day.toISOString().slice(0, 10);
};

test('check instrument detection covers combined instruments', () => {
  expect(isCheckInstrument('check')).toBe(true);
  expect(isCheckInstrument('check_and_guarantee')).toBe(true);
  expect(isCheckInstrument('bank_guarantee')).toBe(false);
  expect(isCheckInstrument('')).toBe(false);
});

test('addYears keeps ISO format and handles leap day', () => {
  expect(addYears('2020-02-29', 1)).toBe('2021-02-28');
  expect(addYears('2024-03-01', 5)).toBe('2029-03-01');
  expect(addYears('', 5)).toBe(null);
});

test('daysUntil returns sign-aware day counts', () => {
  expect(daysUntil(daysAhead(10))).toBeGreaterThanOrEqual(9);
  expect(daysUntil(daysAgo(5))).toBeLessThan(0);
  expect(daysUntil(null)).toBe(null);
});

test('a check whose due date has passed is still valid (5 years from issue)', () => {
  const validity = guaranteeValidity({
    instrument_type: 'check',
    issue_date: yearsAgo(2),
    check_due_date: daysAgo(300),
    expiry_date: daysAgo(300),
  });
  expect(validity.isCheck).toBe(true);
  expect(validity.expired).toBe(false);
  expect(validity.expiryKind).toBe('validity');
  expect(validity.validUntil).toBe(addYears(yearsAgo(2), CHECK_VALIDITY_YEARS));
  expect(validity.days).toBeGreaterThan(900);
});

test('a check older than five years is reported as expired', () => {
  const validity = guaranteeValidity({
    instrument_type: 'check',
    issue_date: yearsAgo(6),
    check_due_date: yearsAgo(6),
  });
  expect(validity.expired).toBe(true);
  expect(validity.days).toBeLessThan(0);
});

test('a check without issue date falls back to its due date', () => {
  const due = daysAgo(100);
  const validity = guaranteeValidity({ instrument_type: 'check', check_due_date: due });
  expect(validity.expired).toBe(false);
  expect(validity.validUntil).toBe(addYears(due, CHECK_VALIDITY_YEARS));
});

test('bank guarantees keep expiring on their guarantee_expiry_date', () => {
  const expired = guaranteeValidity({
    instrument_type: 'bank_guarantee',
    guarantee_expiry_date: daysAgo(4),
  });
  expect(expired.expired).toBe(true);
  expect(expired.expiryKind).toBe('expiry');

  const active = guaranteeValidity({
    instrument_type: 'bank_guarantee',
    guarantee_expiry_date: daysAhead(60),
  });
  expect(active.expired).toBe(false);
  expect(active.days).toBeGreaterThanOrEqual(59);
});

test('backend-provided validity fields win over local computation', () => {
  const validity = guaranteeValidity({
    instrument_type: 'check',
    check_due_date: daysAgo(400),
    expiry_kind: 'validity',
    is_check: true,
    valid_until: daysAhead(1000),
    days_to_expiry: 1000,
    is_expired: false,
    due_date: daysAgo(400),
  });
  expect(validity.days).toBe(1000);
  expect(validity.expired).toBe(false);
  expect(validity.validUntil).toBeTruthy();
  expect(validity.dueDate).toBeTruthy();
});

test('guaranteeDueDate prefers the backend due date', () => {
  expect(guaranteeDueDate({ due_date: '2026-01-01', check_due_date: '2025-01-01' }))
    .toBe('2026-01-01');
  expect(guaranteeDueDate({ check_due_date: '2025-01-01' })).toBe('2025-01-01');
  expect(guaranteeDueDate({})).toBe(null);
});
