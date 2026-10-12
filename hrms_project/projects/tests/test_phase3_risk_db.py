"""تست دیتابیسی رجیستر ریسک (فاز ۳) — اجرا روی سرور (PostgreSQL).

این تست‌ها روی موتور خالص `risk_engine` سوار شده‌اند و رفتار ORM/سرویس را
(بازمحاسبه، بازنگری، چرخهٔ وضعیت، اقدام‌ها و KPI) بررسی می‌کنند.
"""
from datetime import timedelta

from django.db.utils import IntegrityError
from django.test import TestCase
from django.utils import timezone

from projects.risk_models import Risk, RiskAction, RiskCategory, RiskReview
from projects.risk_service import (
    add_review, complete_action, project_risk_kpis, recalculate_risk, set_action_status, set_status,
)
from projects.tests.base import ProjectTestMixin


class RiskFlowTests(ProjectTestMixin, TestCase):

    def setUp(self):
        self.make_project()
        self.category = RiskCategory.objects.create(
            company=self.company, name='فنی', code='TEC',
        )
        self.risk = Risk.objects.create(
            company=self.company, project=self.project, category=self.category,
            number='RISK-001', title='تأخیر تأمین تجهیزات', probability=4,
            impact_cost=5, impact_time=3, impact_quality=1, impact_hse=1,
            cost_impact=1_000_000_000,
            due_date=timezone.localdate() - timedelta(days=3),
        )

    def test_recalculate_sets_score_level_and_exposure(self):
        recalculate_risk(self.risk)
        self.risk.refresh_from_db()
        self.assertEqual(self.risk.score, 20)
        self.assertEqual(self.risk.level, 'critical')
        self.assertEqual(float(self.risk.expected_cost), 800_000_000)
        self.assertEqual(self.risk.residual_score, 0)
        self.assertEqual(float(self.risk.residual_cost), 800_000_000)

    def test_review_updates_scores_and_logs_history(self):
        recalculate_risk(self.risk)
        review = add_review(
            self.risk, None, note='بازنگری ماهانه', probability=3, impact=4,
            residual_probability=2, residual_impact=2,
        )
        self.risk.refresh_from_db()
        self.assertEqual(self.risk.score, 12)
        self.assertEqual(self.risk.level, 'high')
        self.assertEqual(self.risk.residual_score, 4)
        self.assertEqual(float(self.risk.residual_cost), 400_000_000)
        self.assertEqual(review.score, 12)
        self.assertEqual(RiskReview.objects.filter(risk=self.risk).count(), 1)

    def test_status_flow_and_closed_date(self):
        recalculate_risk(self.risk)
        set_status(self.risk, None, 'mitigating', note='اقدام آغاز شد')
        self.assertEqual(Risk.objects.get(pk=self.risk.pk).status, 'mitigating')
        set_status(self.risk, None, 'closed')
        fresh = Risk.objects.get(pk=self.risk.pk)
        self.assertEqual(fresh.status, 'closed')
        self.assertEqual(fresh.closed_date, timezone.localdate())
        self.assertEqual(RiskReview.objects.filter(risk=self.risk).count(), 2)

    def test_invalid_transition_raises(self):
        with self.assertRaises(ValueError):
            set_status(self.risk, None, 'nonsense')

    def test_closed_can_only_reopen(self):
        set_status(self.risk, None, 'closed')
        with self.assertRaises(ValueError):
            set_status(self.risk, None, 'mitigating')
        set_status(self.risk, None, 'open')
        self.assertEqual(Risk.objects.get(pk=self.risk.pk).status, 'open')

    def test_action_lifecycle(self):
        action = RiskAction.objects.create(
            company=self.company, risk=self.risk, title='خرید از منبع دوم',
            due_date=timezone.localdate() - timedelta(days=1),
        )
        complete_action(action, None)
        action.refresh_from_db()
        self.assertEqual(action.status, 'done')
        self.assertEqual(action.completed_at, timezone.localdate())
        with self.assertRaises(ValueError):
            complete_action(action, None)      # done → done مجاز نیست
        set_action_status(action, None, 'in_progress')
        action.refresh_from_db()
        self.assertEqual(action.status, 'in_progress')
        self.assertIsNone(action.completed_at)

    def test_kpis_end_to_end(self):
        recalculate_risk(self.risk)
        RiskAction.objects.create(
            company=self.company, risk=self.risk, title='اقدام ۱', status='done', cost=5_000_000,
        )
        RiskAction.objects.create(
            company=self.company, risk=self.risk, title='اقدام ۲', status='planned',
        )
        kpis = project_risk_kpis(self.project)
        self.assertEqual(kpis['total'], 1)
        self.assertEqual(kpis['by_level']['critical'], 1)
        self.assertEqual(kpis['overdue_risks'], 1)
        self.assertEqual(kpis['actions']['total'], 2)
        self.assertEqual(kpis['actions']['done'], 1)
        self.assertEqual(kpis['actions']['percent'], 50.0)
        self.assertEqual(kpis['top_risks'][0]['number'], 'RISK-001')

    def test_number_is_unique_per_project(self):
        with self.assertRaises(IntegrityError):
            Risk.objects.create(
                company=self.company, project=self.project, number='RISK-001', title='تکراری',
            )
