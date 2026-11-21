import { routeTitleMeta } from '../core/config/routeTitles';

test('route titles cover the English fallback paths used by the open tabs', () => {
  expect(routeTitleMeta('/employees/42').title).toBe('پروندهٔ پرسنلی');
  expect(routeTitleMeta('/employees/42/edit').title).toBe('ویرایش پروندهٔ پرسنلی');
  expect(routeTitleMeta('/external-contracts/7').title).toBe('پروندهٔ قرارداد');
  expect(routeTitleMeta('/treasury/accounts').title).toBe('حساب‌های بانکی');
  expect(routeTitleMeta('/treasury/received-checks').title).toBe('چک‌های دریافتی');
  expect(routeTitleMeta('/projects/12').title).toBe('پروندهٔ پروژه');
  expect(routeTitleMeta('/payroll/attendance-import').title).toBe('دریافت کارکرد');
  expect(routeTitleMeta('/contracts-payment-report').title).toBe('گزارش پرداخت و مطالبات');
});

test('route titles use Persian names for query-stripped and trailing-slash paths', () => {
  expect(routeTitleMeta('/tReasury/accounts/?tab=1')).toBeNull();
  expect(routeTitleMeta('/treasury/accounts/?tab=1').title).toBe('حساب‌های بانکی');
  expect(routeTitleMeta('/unknown-route')).toBeNull();
});
