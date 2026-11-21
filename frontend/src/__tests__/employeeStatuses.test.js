import { EMPLOYEE_STATUS_OPTIONS, EMPLOYEE_STATUS_MAP } from '../core/constants/employeeStatuses';

test('employee statuses cover resignation, contract end and other HR exits', () => {
  const values = EMPLOYEE_STATUS_OPTIONS.map((option) => option.value);
  expect(values).toEqual(expect.arrayContaining([
    'active', 'leave', 'retired', 'terminated', 'resigned',
    'contract_ended', 'suspended', 'transferred', 'abandoned', 'deceased',
  ]));
  expect(EMPLOYEE_STATUS_MAP.resigned.labelKey).toBe('employees.resigned');
  expect(EMPLOYEE_STATUS_MAP.contract_ended.labelKey).toBe('employees.contract_ended');
});
