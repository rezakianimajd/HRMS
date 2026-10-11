"""تست‌های EVM و منحنی S (فاز ۱) — بدون نیاز به دیتابیس."""
from datetime import date

from django.test import SimpleTestCase

from projects.scheduling.evm import (
    budget_at_completion, compute_metrics, earned_value, monthly_last_points,
    physical_percent, planned_value_at, s_curve,
)


class EvmEngineTests(SimpleTestCase):

    ITEMS = [
        {'id': 1, 'planned_cost': 100, 'early_start': date(2026, 4, 1),
         'early_finish': date(2026, 4, 10), 'percent_complete': 100},
        {'id': 2, 'planned_cost': 200, 'early_start': date(2026, 4, 11),
         'early_finish': date(2026, 4, 20), 'percent_complete': 25},
    ]

    def test_planned_value_linear_spread(self):
        self.assertEqual(planned_value_at(self.ITEMS, date(2026, 4, 5)), 50.0)
        self.assertEqual(planned_value_at(self.ITEMS, date(2026, 4, 10)), 100.0)
        self.assertEqual(planned_value_at(self.ITEMS, date(2026, 4, 1)), 10.0)
        self.assertEqual(planned_value_at(self.ITEMS, date(2026, 3, 20)), 0.0)

    def test_planned_value_accumulates_second_activity(self):
        self.assertEqual(planned_value_at(self.ITEMS, date(2026, 4, 12)), 140.0)
        self.assertEqual(planned_value_at(self.ITEMS, date(2026, 4, 25)), 300.0)

    def test_earned_value_and_bac(self):
        self.assertEqual(earned_value(self.ITEMS), 150.0)
        self.assertEqual(budget_at_completion(self.ITEMS), 300.0)

    def test_physical_percent_is_cost_weighted(self):
        self.assertEqual(physical_percent(self.ITEMS), 50.0)

    def test_metrics_indices(self):
        metrics = compute_metrics(bac=300, pv=140, ev=150, ac=120)
        self.assertEqual(metrics['sv'], 10.0)
        self.assertEqual(metrics['cv'], 30.0)
        self.assertEqual(metrics['spi'], 1.0714)
        self.assertEqual(metrics['cpi'], 1.25)
        self.assertEqual(metrics['eac'], 240.0)
        self.assertEqual(metrics['etc'], 120.0)
        self.assertEqual(metrics['vac'], 60.0)
        self.assertEqual(metrics['tcpi'], 0.8333)
        self.assertEqual(metrics['percent_complete'], 50.0)
        self.assertEqual(metrics['performance'], 'ahead')

    def test_metrics_are_safe_with_zero_actuals(self):
        metrics = compute_metrics(bac=100, pv=50, ev=40, ac=0)
        self.assertIsNone(metrics['cpi'])
        self.assertIsNone(metrics['eac'])
        self.assertEqual(metrics['cv'], 40.0)

    def test_metrics_behind_schedule_flag(self):
        metrics = compute_metrics(bac=100, pv=80, ev=50, ac=50)
        self.assertEqual(metrics['performance'], 'behind')
        self.assertEqual(metrics['spi'], 0.625)

    def test_s_curve_points(self):
        progress = [
            {'activity_id': 1, 'date': date(2026, 4, 10), 'percent_complete': 100},
            {'activity_id': 2, 'date': date(2026, 4, 15), 'percent_complete': 25},
        ]
        actuals = [
            {'date': date(2026, 4, 5), 'amount': 60},
            {'date': date(2026, 4, 15), 'amount': 50},
        ]
        series = s_curve(self.ITEMS, progress, actuals)
        self.assertEqual(series[0]['date'], date(2026, 4, 1))
        self.assertEqual(series[-1]['date'], date(2026, 4, 20))
        by_date = {row['date']: row for row in series}
        self.assertEqual(by_date[date(2026, 4, 5)]['pv'], 50.0)
        self.assertEqual(by_date[date(2026, 4, 5)]['ac'], 60.0)
        self.assertEqual(by_date[date(2026, 4, 10)]['ev'], 100.0)
        self.assertEqual(by_date[date(2026, 4, 15)]['pv'], 200.0)
        self.assertEqual(by_date[date(2026, 4, 15)]['ev'], 150.0)
        self.assertEqual(by_date[date(2026, 4, 15)]['ac'], 110.0)
        self.assertEqual(series[-1]['pv'], 300.0)

    def test_s_curve_is_monotonic_cumulative(self):
        series = s_curve(self.ITEMS, [], [])
        pvs = [row['pv'] for row in series]
        self.assertEqual(pvs, sorted(pvs))

    def test_s_curve_without_dates_is_empty(self):
        self.assertEqual(s_curve([{'id': 1, 'planned_cost': 10}], [], []), [])

    def test_monthly_last_points(self):
        series = s_curve(self.ITEMS, [], [])
        points = monthly_last_points(series)
        self.assertEqual(len(points), 1)
        self.assertEqual(points[0]['date'], date(2026, 4, 20))
