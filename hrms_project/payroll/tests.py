"""تست‌های واحد ماژول مالی/مزایا (بدون نیاز به دیتابیس)."""
from datetime import date

from django.test import SimpleTestCase


class BenefitScheduleTests(SimpleTestCase):
    """تاریخ پیشنهادی انواع مزایا: تکرار سالانهٔ شمسی و روزهای باقی‌مانده."""

    @staticmethod
    def _jdate(year, month, day):
        from jdatetime import date as jdate

        return jdate(year, month, day).togregorian()

    def test_next_occurrence_rolls_to_next_jalali_year(self):
        from payroll.benefit_dates import next_occurrence

        today = self._jdate(1405, 2, 30)
        past_this_year = self._jdate(1405, 1, 15)
        upcoming = next_occurrence(past_this_year, today)
        self.assertEqual(upcoming, self._jdate(1406, 1, 15))

        later_this_year = self._jdate(1405, 9, 1)
        self.assertEqual(next_occurrence(later_this_year, today), later_this_year)

    def test_days_remaining_and_urgency(self):
        from payroll.benefit_dates import days_remaining, urgency_of

        today = self._jdate(1405, 1, 10)
        tomorrow = self._jdate(1405, 1, 11)
        self.assertEqual(days_remaining(tomorrow, today), (tomorrow - today).days)
        self.assertEqual(days_remaining(today, today), 0)
        self.assertEqual(urgency_of(0), 'today')
        self.assertEqual(urgency_of(5), 'soon')
        self.assertEqual(urgency_of(40), 'upcoming')
        self.assertEqual(urgency_of(120), 'later')
        self.assertEqual(urgency_of(None), 'unset')

    def test_schedule_payload(self):
        from payroll.benefit_dates import benefit_schedule

        today = date.today()
        payload = benefit_schedule(None, today)
        self.assertIsNone(payload['next_date'])
        self.assertIsNone(payload['days_remaining'])
        self.assertEqual(payload['urgency'], 'unset')
        self.assertEqual(payload['next_date_jalali'], '')

        payload = benefit_schedule(self._jdate(1405, 6, 1), today)
        self.assertIsNotNone(payload['next_date'])
        self.assertGreaterEqual(payload['days_remaining'], 0)
        self.assertIn(payload['urgency'], ('today', 'soon', 'upcoming', 'later'))
        self.assertRegex(payload['next_date_jalali'], r'^\d{4}/\d{2}/\d{2}$')

    def test_default_benefit_types_are_unique_and_complete(self):
        from payroll.benefit_defaults import DEFAULT_BENEFIT_TYPES

        codes = [code for code, _title in DEFAULT_BENEFIT_TYPES]
        self.assertEqual(len(codes), len(set(codes)))
        self.assertGreaterEqual(len(codes), 15)
        self.assertIn('performance', codes)
        self.assertIn('nowruz_basket', codes)
