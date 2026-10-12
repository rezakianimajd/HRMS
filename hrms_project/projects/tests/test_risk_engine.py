"""تست موتور و سرویس ریسک (فاز ۳) — بدون دیتابیس (SimpleTestCase)."""
from datetime import date
from types import SimpleNamespace

from django.test import SimpleTestCase

from projects import risk_engine, risk_service

TODAY = date(2026, 1, 15)


def _rows():
    return [
        {'id': 1, 'number': 'R-1', 'title': 'تأخیر تأمین کالا', 'probability': 4, 'impact': 5,
         'score': 20, 'level': 'critical', 'status': 'mitigating', 'risk_type': 'threat',
         'cost_impact': 1_000_000_000, 'residual_probability': 2,
         'due_date': date(2026, 1, 1)},
        {'id': 2, 'number': 'R-2', 'title': 'نوسان نرخ ارز', 'probability': 3, 'impact': 3,
         'score': 9, 'level': 'medium', 'status': 'closed', 'risk_type': 'threat',
         'cost_impact': 500_000_000, 'residual_probability': 0,
         'due_date': date(2026, 2, 1)},
        {'id': 3, 'number': 'R-3', 'title': 'کوتاه‌شدن زمان اجرا', 'probability': 2, 'impact': 2,
         'score': 4, 'level': 'low', 'status': 'open', 'risk_type': 'opportunity',
         'cost_impact': 100_000_000, 'residual_probability': 1,
         'due_date': date(2025, 12, 1)},
    ]


def _actions():
    return [
        {'id': 1, 'status': 'done', 'due_date': date(2026, 1, 1), 'cost': 10_000_000},
        {'id': 2, 'status': 'planned', 'due_date': date(2026, 1, 1), 'cost': 5_000_000},
        {'id': 3, 'status': 'cancelled', 'due_date': date(2026, 1, 1), 'cost': 0},
        {'id': 4, 'status': 'in_progress', 'due_date': date(2026, 2, 1), 'cost': 0},
    ]


class RiskScoringTests(SimpleTestCase):

    def test_clamp_scale_bounds(self):
        self.assertEqual(risk_engine.clamp_scale(0), 1)
        self.assertEqual(risk_engine.clamp_scale(-3), 1)
        self.assertEqual(risk_engine.clamp_scale(9), 5)
        self.assertEqual(risk_engine.clamp_scale('4'), 4)
        self.assertEqual(risk_engine.clamp_scale(None, 0), 0)
        self.assertEqual(risk_engine.clamp_scale('x', 3), 3)

    def test_score_is_probability_times_impact(self):
        self.assertEqual(risk_engine.score_of(1, 1), 1)
        self.assertEqual(risk_engine.score_of(4, 5), 20)
        self.assertEqual(risk_engine.score_of(5, 5), 25)
        self.assertEqual(risk_engine.score_of(9, 9), 25)   # محدود به مقیاس ۵

    def test_level_thresholds(self):
        self.assertEqual(risk_engine.level_of(1), 'low')
        self.assertEqual(risk_engine.level_of(4), 'low')
        self.assertEqual(risk_engine.level_of(5), 'medium')
        self.assertEqual(risk_engine.level_of(9), 'medium')
        self.assertEqual(risk_engine.level_of(10), 'high')
        self.assertEqual(risk_engine.level_of(14), 'high')
        self.assertEqual(risk_engine.level_of(15), 'critical')
        self.assertEqual(risk_engine.level_of(25), 'critical')
        self.assertEqual(risk_engine.level_of(None), 'low')

    def test_worst_impact_picks_max_and_ignores_empty(self):
        self.assertEqual(risk_engine.worst_impact(3, 1, 1, 1), 3)
        self.assertEqual(risk_engine.worst_impact(2, 5, 1, 1), 5)
        self.assertEqual(risk_engine.worst_impact(0, None, '', 0), 1)   # پیش‌فرض ۱
        self.assertEqual(risk_engine.worst_impact(1, 2, 3, 4), 4)

    def test_effective_score_uses_worst_dimension(self):
        # احتمال ۴، بیشترین شدت ۵ → ۲۰
        self.assertEqual(risk_engine.effective_score(4, [1, 5, 2, 1]), 20)
        self.assertEqual(risk_engine.effective_score(2, [3, 3, 3, 3]), 6)

    def test_expected_cost_is_emv(self):
        self.assertEqual(risk_engine.expected_cost(1_000_000_000, 4), 800_000_000.0)
        self.assertEqual(risk_engine.expected_cost(1_000_000_000, 5), 1_000_000_000.0)
        self.assertEqual(risk_engine.expected_cost(0, 5), 0.0)
        self.assertEqual(risk_engine.expected_cost('1200000', 1), 240_000.0)

    def test_residual_expected_cost_falls_back_to_original_probability(self):
        self.assertEqual(
            risk_engine.residual_expected_cost(1_000_000_000, 4, 2), 400_000_000.0,
        )
        # اگر احتمال باقی‌مانده ثبت نشده باشد، همان ارزش اولیه برمی‌گردد
        self.assertEqual(
            risk_engine.residual_expected_cost(1_000_000_000, 4, 0), 800_000_000.0,
        )

    def test_score_reduction_and_percent(self):
        self.assertEqual(risk_engine.score_reduction(20, 6), 14)
        self.assertEqual(risk_engine.score_reduction(5, 9), 0)      # منفی نمی‌شود
        self.assertEqual(risk_engine.reduction_percent(20, 6), 70.0)
        self.assertEqual(risk_engine.reduction_percent(0, 0), 0.0)

    def test_is_overdue(self):
        self.assertTrue(risk_engine.is_overdue(date(2026, 1, 1), TODAY))
        self.assertFalse(risk_engine.is_overdue(date(2026, 1, 15), TODAY))
        self.assertFalse(risk_engine.is_overdue(None, TODAY))
        self.assertFalse(risk_engine.is_overdue(date(2026, 1, 1), None))


class RiskMatrixTests(SimpleTestCase):

    def test_grid_has_25_cells_and_counts(self):
        grid = risk_engine.matrix_grid(_rows())
        self.assertEqual(len(grid['cells']), 25)
        self.assertEqual(grid['total'], 3)
        self.assertEqual(grid['max_count'], 1)
        by_key = {(c['probability'], c['impact']): c for c in grid['cells']}
        self.assertEqual(by_key[(4, 5)]['count'], 1)
        self.assertEqual(by_key[(4, 5)]['score'], 20)
        self.assertEqual(by_key[(4, 5)]['level'], 'critical')
        self.assertEqual(by_key[(4, 5)]['risks'][0]['number'], 'R-1')
        self.assertEqual(by_key[(3, 3)]['count'], 1)
        self.assertEqual(by_key[(2, 2)]['level'], 'low')
        self.assertEqual(by_key[(1, 1)]['count'], 0)
        self.assertEqual(by_key[(1, 1)]['risks'], [])

    def test_empty_grid(self):
        grid = risk_engine.matrix_grid([])
        self.assertEqual(grid['total'], 0)
        self.assertEqual(grid['max_count'], 0)
        self.assertTrue(all(c['count'] == 0 for c in grid['cells']))

    def test_grid_accepts_impact_cost_key(self):
        grid = risk_engine.matrix_grid([{'probability': 3, 'impact_cost': 4, 'number': 'X-1'}])
        by_key = {(c['probability'], c['impact']): c for c in grid['cells']}
        self.assertEqual(by_key[(3, 4)]['count'], 1)

    def test_action_stats(self):
        stats = risk_engine.action_stats(_actions(), TODAY)
        self.assertEqual(stats['total'], 4)
        self.assertEqual(stats['done'], 1)
        self.assertEqual(stats['in_progress'], 1)
        self.assertEqual(stats['planned'], 1)
        self.assertEqual(stats['cancelled'], 1)
        self.assertEqual(stats['overdue'], 1)      # فقط اقدام بازِ گذشته از سررسید
        self.assertEqual(stats['percent'], 33.3)   # ۱ از ۳ اقدام فعال
        self.assertEqual(stats['cost'], 15_000_000.0)

    def test_action_stats_empty(self):
        stats = risk_engine.action_stats([], TODAY)
        self.assertEqual(stats['total'], 0)
        self.assertEqual(stats['percent'], 0.0)


class RiskKpiTests(SimpleTestCase):

    def test_kpis_of_register(self):
        kpis = risk_engine.risk_kpis(_rows(), today=TODAY, actions=_actions())
        self.assertEqual(kpis['total'], 3)
        self.assertEqual(kpis['active'], 2)
        self.assertEqual(kpis['closed'], 1)
        self.assertEqual(kpis['by_level'], {'low': 1, 'medium': 1, 'high': 0, 'critical': 1})
        self.assertEqual(kpis['by_status'], {'open': 1, 'mitigating': 1, 'closed': 1})
        self.assertEqual(kpis['by_type'], {'threat': 2, 'opportunity': 1})
        self.assertEqual(kpis['average_score'], 11.0)
        self.assertEqual(kpis['gross_exposure'], 1_600_000_000.0)
        self.assertEqual(kpis['exposure'], 1_140_000_000.0)
        self.assertEqual(kpis['residual_exposure'], 720_000_000.0)
        self.assertEqual(kpis['exposure_reduction_percent'], 36.8)
        self.assertEqual(kpis['overdue_risks'], 2)
        self.assertEqual(kpis['top_risks'][0]['number'], 'R-1')
        self.assertEqual(kpis['top_risks'][0]['level'], 'critical')
        self.assertEqual(kpis['actions']['percent'], 33.3)

    def test_kpis_of_empty_register(self):
        kpis = risk_engine.risk_kpis([], today=TODAY, actions=[])
        self.assertEqual(kpis['total'], 0)
        self.assertEqual(kpis['average_score'], 0.0)
        self.assertEqual(kpis['exposure'], 0.0)
        self.assertEqual(kpis['exposure_reduction_percent'], 0.0)
        self.assertEqual(kpis['by_level'], {'low': 0, 'medium': 0, 'high': 0, 'critical': 0})
        self.assertEqual(kpis['top_risks'], [])


class RiskStateMachineTests(SimpleTestCase):

    def test_open_transitions(self):
        self.assertTrue(risk_service.can_transition('open', 'mitigating'))
        self.assertTrue(risk_service.can_transition('open', 'closed'))
        self.assertFalse(risk_service.can_transition('open', 'unknown'))

    def test_closed_only_reopens(self):
        self.assertEqual(risk_service.next_statuses('closed'), ['open'])
        self.assertFalse(risk_service.can_transition('closed', 'mitigating'))

    def test_next_statuses_are_sorted(self):
        self.assertEqual(
            risk_service.next_statuses('open'),
            ['accepted', 'closed', 'mitigating', 'monitoring', 'occurred'],
        )
        self.assertEqual(
            risk_service.next_statuses('occurred'), ['closed', 'mitigating', 'monitoring'],
        )

    def test_unknown_status_has_no_transition(self):
        self.assertEqual(risk_service.next_statuses('nonsense'), [])
        self.assertFalse(risk_service.can_transition('nonsense', 'open'))

    def test_action_state_machine(self):
        self.assertEqual(
            risk_service.action_next_statuses('planned'), ['cancelled', 'done', 'in_progress'],
        )
        self.assertTrue(risk_service.can_transition_action('planned', 'done'))
        self.assertFalse(risk_service.can_transition_action('planned', 'planned'))
        self.assertEqual(risk_service.action_next_statuses('done'), ['in_progress'])
        self.assertEqual(risk_service.action_next_statuses('cancelled'), ['planned'])


class RiskRecalculateTests(SimpleTestCase):
    """بازمحاسبهٔ ریسک روی آبجکت ساده (بدون ذخیره در دیتابیس)."""

    def _risk(self, **kwargs):
        data = {
            'probability': 4, 'impact_cost': 5, 'impact_time': 1,
            'impact_quality': 1, 'impact_hse': 1,
            'residual_probability': 2, 'residual_impact': 2,
            'cost_impact': 1_000_000_000,
        }
        data.update(kwargs)
        return SimpleNamespace(**data)

    def test_recalculate_fills_scores(self):
        risk = risk_service.recalculate_risk(self._risk(), save=False)
        self.assertEqual(risk.score, 20)
        self.assertEqual(risk.level, 'critical')
        self.assertEqual(float(risk.expected_cost), 800_000_000.0)
        self.assertEqual(risk.residual_score, 4)
        self.assertEqual(float(risk.residual_cost), 400_000_000.0)

    def test_recalculate_clears_residual_when_not_assessed(self):
        risk = risk_service.recalculate_risk(
            self._risk(residual_probability=0, residual_impact=0), save=False,
        )
        self.assertEqual(risk.residual_score, 0)
        self.assertEqual(float(risk.residual_cost), 800_000_000.0)   # بدون کاهش مالی

    def test_recalculate_uses_worst_dimension(self):
        risk = risk_service.recalculate_risk(self._risk(impact_hse=5, probability=3), save=False)
        self.assertEqual(risk.score, 15)
        self.assertEqual(risk.level, 'critical')
