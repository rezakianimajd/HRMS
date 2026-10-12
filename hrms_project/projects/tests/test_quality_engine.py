"""تست موتور کیفیت و HSE (فاز ۳ بخش دوم) — بدون دیتابیس."""
from datetime import date

from django.test import SimpleTestCase

from projects import quality_engine, quality_service

TODAY = date(2026, 5, 20)


def _inspections():
    return [
        {'id': 1, 'status': 'done', 'result': 'pass'},
        {'id': 2, 'status': 'done', 'result': 'pass'},
        {'id': 3, 'status': 'done', 'result': 'fail'},
        {'id': 4, 'status': 'done', 'result': 'conditional'},
        {'id': 5, 'status': 'planned', 'result': None},
    ]


def _plan_items():
    return [
        {'id': 1, 'status': 'passed', 'point_type': 'hold'},
        {'id': 2, 'status': 'not_started', 'point_type': 'hold'},
        {'id': 3, 'status': 'failed', 'point_type': 'witness'},
        {'id': 4, 'status': 'waived', 'point_type': 'review'},
        {'id': 5, 'status': 'in_progress', 'point_type': 'witness'},
    ]


def _ncrs():
    return [
        {'id': 1, 'status': 'open', 'severity': 'major', 'due_date': date(2026, 5, 10),
         'detected_date': date(2026, 5, 1), 'closed_date': None, 'cost_impact': 5_000_000},
        {'id': 2, 'status': 'closed', 'severity': 'critical', 'due_date': date(2026, 5, 15),
         'detected_date': date(2026, 5, 1), 'closed_date': date(2026, 5, 11),
         'cost_impact': 2_000_000},
        {'id': 3, 'status': 'correcting', 'severity': 'minor', 'due_date': date(2026, 6, 1),
         'detected_date': date(2026, 5, 12), 'closed_date': None, 'cost_impact': 0},
    ]


def _punch():
    return [
        {'id': 1, 'status': 'verified', 'priority': 'high', 'due_date': date(2026, 5, 1),
         'cost': 1_000_000},
        {'id': 2, 'status': 'open', 'priority': 'medium', 'due_date': date(2026, 5, 10),
         'cost': 2_000_000},
        {'id': 3, 'status': 'rejected', 'priority': 'low', 'due_date': date(2026, 5, 1), 'cost': 0},
        {'id': 4, 'status': 'fixed', 'priority': 'high', 'due_date': date(2026, 6, 1),
         'cost': 500_000},
    ]


def _incidents():
    return [
        {'id': 1, 'status': 'closed', 'incident_type': 'near_miss', 'date': date(2026, 3, 1),
         'lost_days': 0, 'man_hours': 100_000, 'cost_impact': 0},
        {'id': 2, 'status': 'closed', 'incident_type': 'lost_time', 'date': date(2026, 4, 20),
         'lost_days': 5, 'man_hours': 200_000, 'cost_impact': 10_000_000},
        {'id': 3, 'status': 'open', 'incident_type': 'environmental', 'date': date(2026, 5, 10),
         'lost_days': 0, 'man_hours': 100_000, 'cost_impact': 1_000_000},
    ]


class QualityStateMachineTests(SimpleTestCase):

    def test_ncr_flow(self):
        self.assertTrue(quality_engine.can_transition_ncr('open', 'correcting'))
        self.assertFalse(quality_engine.can_transition_ncr('open', 'closed'))
        self.assertTrue(quality_engine.can_transition_ncr('verifying', 'closed'))
        self.assertEqual(
            quality_engine.ncr_next_statuses('verifying'),
            ['cancelled', 'closed', 'correcting'],
        )
        self.assertEqual(quality_engine.ncr_next_statuses('closed'), ['verifying'])
        self.assertEqual(quality_engine.ncr_next_statuses('unknown'), [])

    def test_punch_flow(self):
        self.assertTrue(quality_engine.can_transition_punch('open', 'fixed'))
        self.assertTrue(quality_engine.can_transition_punch('fixed', 'verified'))
        self.assertFalse(quality_engine.can_transition_punch('verified', 'fixed'))
        self.assertTrue(quality_engine.can_transition_punch('rejected', 'fixed'))
        self.assertEqual(quality_engine.punch_next_statuses('fixed'), ['in_progress', 'rejected', 'verified'])

    def test_hse_flow(self):
        self.assertTrue(quality_engine.can_transition_hse('open', 'closed'))
        self.assertTrue(quality_engine.can_transition_hse('closed', 'investigating'))
        self.assertFalse(quality_engine.can_transition_hse('closed', 'open'))
        self.assertEqual(quality_engine.hse_next_statuses('investigating'), ['closed', 'open'])

    def test_plan_item_flow(self):
        self.assertTrue(quality_engine.can_transition_plan_item('not_started', 'passed'))
        self.assertTrue(quality_engine.can_transition_plan_item('failed', 'passed'))
        self.assertFalse(quality_engine.can_transition_plan_item('passed', 'not_started'))
        self.assertEqual(
            quality_engine.plan_item_next_statuses('not_started'),
            ['failed', 'in_progress', 'passed', 'waived'],
        )

    def test_service_reexports(self):
        self.assertTrue(quality_service.can_transition_ncr('open', 'correcting'))
        self.assertEqual(quality_service.punch_next_statuses('open'), ['fixed', 'in_progress', 'rejected'])


class InspectionAndPlanStatsTests(SimpleTestCase):

    def test_inspection_stats(self):
        stats = quality_engine.inspection_stats(_inspections())
        self.assertEqual(stats['total'], 5)
        self.assertEqual(stats['done'], 4)
        self.assertEqual(stats['planned'], 1)
        self.assertEqual(stats['passed'], 2)
        self.assertEqual(stats['failed'], 1)
        self.assertEqual(stats['conditional'], 1)
        self.assertEqual(stats['na'], 0)
        self.assertEqual(stats['pass_rate'], 50.0)

    def test_inspection_stats_empty(self):
        stats = quality_engine.inspection_stats([])
        self.assertEqual(stats['total'], 0)
        self.assertEqual(stats['pass_rate'], 0.0)

    def test_plan_progress(self):
        stats = quality_engine.plan_progress(_plan_items())
        self.assertEqual(stats['total'], 5)
        self.assertEqual(stats['passed'], 1)
        self.assertEqual(stats['failed'], 1)
        self.assertEqual(stats['in_progress'], 1)
        self.assertEqual(stats['not_started'], 1)
        self.assertEqual(stats['waived'], 1)
        self.assertEqual(stats['closed'], 3)
        self.assertEqual(stats['percent'], 60.0)
        self.assertEqual(stats['pending_hold_points'], 1)   # فقط ردیف not_started با نقطهٔ توقف

    def test_plan_progress_empty(self):
        stats = quality_engine.plan_progress([])
        self.assertEqual(stats['total'], 0)
        self.assertEqual(stats['percent'], 0.0)
        self.assertEqual(stats['pending_hold_points'], 0)


class NcrStatsTests(SimpleTestCase):

    def test_ncr_stats(self):
        stats = quality_engine.ncr_stats(_ncrs(), today=TODAY)
        self.assertEqual(stats['total'], 3)
        self.assertEqual(stats['open'], 2)
        self.assertEqual(stats['closed'], 1)
        self.assertEqual(stats['cancelled'], 0)
        self.assertEqual(stats['critical'], 1)
        self.assertEqual(stats['major'], 1)
        self.assertEqual(stats['overdue'], 1)          # فقط NCR باز با سررسید گذشته
        self.assertEqual(stats['cost_impact'], 7_000_000.0)
        self.assertEqual(stats['avg_close_days'], 10.0)
        self.assertEqual(stats['by_status'], {'open': 1, 'correcting': 1, 'closed': 1})

    def test_ncr_stats_empty(self):
        stats = quality_engine.ncr_stats([], today=TODAY)
        self.assertEqual(stats['total'], 0)
        self.assertEqual(stats['avg_close_days'], 0.0)
        self.assertEqual(stats['overdue'], 0)


class PunchStatsTests(SimpleTestCase):

    def test_punch_stats(self):
        stats = quality_engine.punch_stats(_punch(), today=TODAY)
        self.assertEqual(stats['total'], 4)
        self.assertEqual(stats['verified'], 1)
        self.assertEqual(stats['rejected'], 1)
        self.assertEqual(stats['open'], 2)
        self.assertEqual(stats['fixed'], 1)
        self.assertEqual(stats['overdue'], 1)
        self.assertEqual(stats['cost'], 3_500_000.0)
        self.assertEqual(stats['percent'], 33.3)        # ۱ از ۳ مورد فعال
        self.assertEqual(stats['by_priority'], {'high': 2, 'medium': 1, 'low': 1})

    def test_punch_stats_empty(self):
        stats = quality_engine.punch_stats([], today=TODAY)
        self.assertEqual(stats['total'], 0)
        self.assertEqual(stats['percent'], 0.0)


class HseStatsTests(SimpleTestCase):

    def test_hse_stats(self):
        stats = quality_engine.hse_stats(_incidents(), today=TODAY)
        self.assertEqual(stats['total'], 3)
        self.assertEqual(stats['open'], 1)
        self.assertEqual(stats['closed'], 2)
        self.assertEqual(stats['near_miss'], 1)
        self.assertEqual(stats['lti'], 1)
        self.assertEqual(stats['lost_days'], 5)
        self.assertEqual(stats['man_hours'], 400_000)
        self.assertEqual(stats['ltifr'], 2.5)
        self.assertEqual(stats['last_incident_date'], '2026-05-10')
        self.assertEqual(stats['days_since_last_incident'], 10)
        self.assertEqual(stats['last_lti_date'], '2026-04-20')
        self.assertEqual(stats['days_since_last_lti'], 30)
        self.assertEqual(stats['cost_impact'], 11_000_000.0)

    def test_hse_stats_without_man_hours_or_dates(self):
        stats = quality_engine.hse_stats([{'id': 1, 'incident_type': 'other'}], today=TODAY)
        self.assertEqual(stats['total'], 1)
        self.assertEqual(stats['ltifr'], 0.0)
        self.assertEqual(stats['days_since_last_incident'], '')
        self.assertEqual(stats['last_incident_date'], '')


class QualityKpiAggregateTests(SimpleTestCase):

    def test_quality_kpis_combines_all_sections(self):
        kpis = quality_engine.quality_kpis(
            plans=_plan_items(), inspections=_inspections(), ncrs=_ncrs(),
            punch_items=_punch(), incidents=_incidents(), today=TODAY,
        )
        self.assertEqual(kpis['plans']['total'], 5)
        self.assertEqual(kpis['inspections']['pass_rate'], 50.0)
        self.assertEqual(kpis['ncr']['open'], 2)
        self.assertEqual(kpis['punch']['verified'], 1)
        self.assertEqual(kpis['hse']['ltifr'], 2.5)

    def test_quality_kpis_empty(self):
        kpis = quality_engine.quality_kpis(today=TODAY)
        self.assertEqual(kpis['plans']['total'], 0)
        self.assertEqual(kpis['inspections']['total'], 0)
        self.assertEqual(kpis['ncr']['total'], 0)
        self.assertEqual(kpis['punch']['total'], 0)
        self.assertEqual(kpis['hse']['total'], 0)
