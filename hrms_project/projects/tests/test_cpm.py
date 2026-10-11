"""تست‌های موتور CPM و تقویم کاری (فاز ۱) — بدون دیتابیس."""
from datetime import date

from django.test import SimpleTestCase

from projects.scheduling.cpm import (
    CpmActivity, ScheduleCycleError, ScheduleValidationError, compute_cpm,
)
from projects.scheduling.workcal import CalendarSpec, IRAN_HALF_DAYS, IRAN_WORKING_DAYS

ALL_DAYS = CalendarSpec(working_days=[0, 1, 2, 3, 4, 5, 6], hours_per_day=8)


class CalendarSpecTests(SimpleTestCase):

    def test_iranian_week_skips_friday(self):
        cal = CalendarSpec()
        # ۲۰۲۶-۰۴-۰۱ چهارشنبه است و ۲۰۲۶-۰۴-۰۳ جمعه (تعطیل)
        self.assertTrue(cal.is_working(date(2026, 4, 1)))
        self.assertFalse(cal.is_working(date(2026, 4, 3)))
        self.assertEqual(cal.next_working(date(2026, 4, 3)), date(2026, 4, 4))

    def test_iranian_week_duration_counts_working_days(self):
        cal = CalendarSpec()
        # چهارشنبه ۱ فروردین + ۵ روز کاری = دوشنبه ۶ فروردین (جمعه حذف می‌شود)
        self.assertEqual(cal.finish_from(date(2026, 4, 1), 5), date(2026, 4, 6))

    def test_half_day_hours(self):
        cal = CalendarSpec(half_days=IRAN_HALF_DAYS, hours_per_day=8)
        self.assertEqual(cal.hours(date(2026, 4, 2)), 4)
        self.assertEqual(cal.hours(date(2026, 4, 1)), 8)
        self.assertEqual(cal.hours(date(2026, 4, 3)), 0)

    def test_exception_turns_working_day_off(self):
        cal = CalendarSpec(exceptions={date(2026, 4, 1): {'is_working': False, 'hours': 0}})
        self.assertFalse(cal.is_working(date(2026, 4, 1)))
        self.assertEqual(cal.next_working(date(2026, 4, 1)), date(2026, 4, 2))

    def test_add_working_days_backwards(self):
        self.assertEqual(ALL_DAYS.add_working_days(date(2026, 4, 10), -3), date(2026, 4, 7))

    def test_defaults(self):
        self.assertEqual(set(CalendarSpec().working_days), set(IRAN_WORKING_DAYS))


class CpmEngineTests(SimpleTestCase):

    def _activities(self):
        # A(3) → B(4) → D(5)  و  A(3) → C(2) → D
        return [
            CpmActivity(id=1, code='A', duration=3, calendar=ALL_DAYS),
            CpmActivity(id=2, code='B', duration=4, calendar=ALL_DAYS, predecessors=[(1, 'fs', 0)]),
            CpmActivity(id=3, code='C', duration=2, calendar=ALL_DAYS, predecessors=[(1, 'fs', 0)]),
            CpmActivity(id=4, code='D', duration=5, calendar=ALL_DAYS,
                        predecessors=[(2, 'fs', 0), (3, 'fs', 0)]),
        ]

    def test_forward_and_backward_pass(self):
        result = compute_cpm(self._activities(), date(2026, 4, 1))
        rows = result['results']
        self.assertEqual(rows[1]['es'], date(2026, 4, 1))
        self.assertEqual(rows[1]['ef'], date(2026, 4, 3))
        self.assertEqual(rows[2]['es'], date(2026, 4, 4))
        self.assertEqual(rows[2]['ef'], date(2026, 4, 7))
        self.assertEqual(rows[3]['ef'], date(2026, 4, 5))
        self.assertEqual(rows[4]['es'], date(2026, 4, 8))
        self.assertEqual(result['project_finish'], date(2026, 4, 12))
        self.assertEqual(rows[4]['ls'], date(2026, 4, 8))

    def test_total_float_and_critical_path(self):
        result = compute_cpm(self._activities(), date(2026, 4, 1))
        rows = result['results']
        self.assertEqual(rows[1]['total_float'], 0)
        self.assertEqual(rows[2]['total_float'], 0)
        self.assertEqual(rows[3]['total_float'], 2)
        self.assertTrue(rows[1]['is_critical'])
        self.assertFalse(rows[3]['is_critical'])
        self.assertEqual(result['critical_path'], [1, 2, 4])

    def test_fs_lag_pushes_successor(self):
        activities = [
            CpmActivity(id=1, code='A', duration=2, calendar=ALL_DAYS),
            CpmActivity(id=2, code='B', duration=1, calendar=ALL_DAYS, predecessors=[(1, 'fs', 2)]),
        ]
        result = compute_cpm(activities, date(2026, 4, 1))
        self.assertEqual(result['results'][1]['ef'], date(2026, 4, 2))
        self.assertEqual(result['results'][2]['es'], date(2026, 4, 5))

    def test_ss_relationship_starts_together(self):
        activities = [
            CpmActivity(id=1, code='A', duration=5, calendar=ALL_DAYS),
            CpmActivity(id=2, code='B', duration=2, calendar=ALL_DAYS, predecessors=[(1, 'ss', 0)]),
        ]
        result = compute_cpm(activities, date(2026, 4, 1))
        self.assertEqual(result['results'][2]['es'], date(2026, 4, 1))

    def test_ff_relationship_aligns_finishes(self):
        activities = [
            CpmActivity(id=1, code='A', duration=5, calendar=ALL_DAYS),
            CpmActivity(id=2, code='B', duration=2, calendar=ALL_DAYS, predecessors=[(1, 'ff', 0)]),
        ]
        result = compute_cpm(activities, date(2026, 4, 1))
        self.assertEqual(result['results'][1]['ef'], date(2026, 4, 5))
        self.assertEqual(result['results'][2]['ef'], date(2026, 4, 5))

    def test_milestone_has_zero_duration(self):
        activities = [
            CpmActivity(id=1, code='M1', duration=0, activity_type='milestone', calendar=ALL_DAYS),
        ]
        result = compute_cpm(activities, date(2026, 4, 1))
        self.assertEqual(result['results'][1]['es'], result['results'][1]['ef'])

    def test_snet_constraint_delays_start(self):
        activities = [
            CpmActivity(id=1, code='A', duration=1, calendar=ALL_DAYS,
                        constraint_type='snet', constraint_date=date(2026, 4, 10)),
        ]
        result = compute_cpm(activities, date(2026, 4, 1))
        self.assertEqual(result['results'][1]['es'], date(2026, 4, 10))

    def test_cycle_is_detected(self):
        activities = [
            CpmActivity(id=1, code='A', duration=1, calendar=ALL_DAYS, predecessors=[(2, 'fs', 0)]),
            CpmActivity(id=2, code='B', duration=1, calendar=ALL_DAYS, predecessors=[(1, 'fs', 0)]),
        ]
        with self.assertRaises(ScheduleCycleError):
            compute_cpm(activities, date(2026, 4, 1))

    def test_unknown_predecessor_is_rejected(self):
        activities = [
            CpmActivity(id=1, code='A', duration=1, calendar=ALL_DAYS, predecessors=[(99, 'fs', 0)]),
        ]
        with self.assertRaises(ScheduleValidationError):
            compute_cpm(activities, date(2026, 4, 1))

    def test_empty_network(self):
        result = compute_cpm([], date(2026, 4, 1))
        self.assertEqual(result['results'], {})
        self.assertEqual(result['critical_path'], [])

