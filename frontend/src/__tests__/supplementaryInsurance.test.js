import {
  INSURANCE_STATUS, dependentHasAttachment, dependentName, insuranceSearchText,
  matchesInsurance, periodLabel, statusOf, summarizeInsurances,
} from '../pages/supplementaryInsuranceHelpers';

const shiftDate = (days) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

test('classifies insurance coverage by start and expiry dates', () => {
  expect(statusOf({ start_date: shiftDate(-30), end_date: shiftDate(100) }).key).toBe(INSURANCE_STATUS.active.key);
  expect(statusOf({ start_date: shiftDate(-30), end_date: shiftDate(10) }).key).toBe('expiring');
  expect(statusOf({ start_date: shiftDate(-60), end_date: shiftDate(-2) }).key).toBe('expired');
  expect(statusOf({ start_date: shiftDate(7), end_date: shiftDate(90) }).key).toBe('upcoming');
  expect(periodLabel({ start_date: shiftDate(-1), end_date: null })).toContain('تا');
});

test('summarizes policies, dependents and attachment coverage', () => {
  const rows = [
    {
      employee: 1, monthly_amount: 1000,
      dependents: [
        { first_name: 'سارا', last_name: 'احمدی', attachment_url: '/media/a.pdf' },
        { first_name: 'علی', last_name: 'احمدی' },
      ],
      start_date: shiftDate(-10), end_date: shiftDate(100),
    },
    { employee: 2, monthly_amount: 500, dependents: [], start_date: shiftDate(-10), end_date: shiftDate(5) },
  ];
  const summary = summarizeInsurances(rows);
  expect(summary.total).toBe(2);
  expect(summary.employees).toBe(2);
  expect(summary.dependents).toBe(2);
  expect(summary.dependentAttachments).toBe(1);
  expect(summary.monthlyTotal).toBe(1500);
  expect(summary.statusCounts.active).toBe(1);
  expect(summary.statusCounts.expiring).toBe(1);
});

test('searches employee, plan and dependent names', () => {
  const row = {
    employee_name: 'مریم رضایی', employee_code: '1002', insurance_name: 'درمان تکمیلی',
    plan: 'طرح خانواده', dependents: [{ first_name: 'نیما', last_name: 'رضایی' }],
  };
  expect(matchesInsurance(row, 'مریم')).toBe(true);
  expect(matchesInsurance(row, 'نیما')).toBe(true);
  expect(matchesInsurance(row, '1002')).toBe(true);
  expect(matchesInsurance(row, 'ناموجود')).toBe(false);
  expect(insuranceSearchText(row)).toContain('طرح خانواده');
});

test('normalizes dependent names and attachment presence', () => {
  expect(dependentName({ first_name: 'رضا', last_name: 'کیانی' })).toBe('رضا کیانی');
  expect(dependentHasAttachment({ attachment_url: '/media/a.pdf' })).toBe(true);
  expect(dependentHasAttachment({ has_attachment: true })).toBe(true);
  expect(dependentHasAttachment({})).toBe(false);
});
