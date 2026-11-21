/**
 * گزینه‌های وضعیت استخدامی — منبع مشترک فرم ورود اطلاعات، فیلتر فهرست
 * و نشان وضعیت پرونده. هر گزینه یک کلید ترجمه و رنگ MUI دارد.
 */
export const EMPLOYEE_STATUS_OPTIONS = [
  { value: 'active', labelKey: 'employees.active', color: 'success' },
  { value: 'leave', labelKey: 'employees.on_leave', color: 'warning' },
  { value: 'retired', labelKey: 'employees.retired', color: 'default' },
  { value: 'terminated', labelKey: 'employees.terminated', color: 'error' },
  { value: 'resigned', labelKey: 'employees.resigned', color: 'warning' },
  { value: 'contract_ended', labelKey: 'employees.contract_ended', color: 'default' },
  { value: 'suspended', labelKey: 'employees.suspended', color: 'warning' },
  { value: 'transferred', labelKey: 'employees.transferred', color: 'info' },
  { value: 'abandoned', labelKey: 'employees.abandoned', color: 'error' },
  { value: 'deceased', labelKey: 'employees.deceased', color: 'error' },
];

export const EMPLOYEE_STATUS_MAP = Object.fromEntries(
  EMPLOYEE_STATUS_OPTIONS.map((option) => [option.value, option]),
);

export default EMPLOYEE_STATUS_OPTIONS;
