"""تست سرویس تقویم پروژه‌ها (Phase 0)."""
from datetime import date

from django.test import TestCase

from contracts.models import Guarantee, Payment
from projects.calendar_service import build_calendar_events
from projects.cost_models import CostTransaction, CostTransactionLine, ProgressStatement
from projects.models import ProjectPhase
from projects.tests.base import ProjectTestMixin


class FakeRequest:
    """درخواست ساده برای فراخوانی سرویس تقویم بدون لایهٔ HTTP."""

    def __init__(self, company, **params):
        self.tenant = company
        self.company = None
        self.query_params = params


class CalendarServiceTests(ProjectTestMixin, TestCase):

    def setUp(self):
        self.make_project()
        self.project.start_date = date(2026, 4, 1)
        self.project.end_date = date(2026, 12, 20)
        self.project.save()
        ProjectPhase.objects.create(
            company=self.company, project=self.project, name='فاز طراحی', sequence=1,
            start_date=date(2026, 4, 5), end_date=date(2026, 6, 5),
        )
        self.contract = self.make_contract(
            number='C-9', amount=500_000, signing_date=date(2026, 4, 2),
            start_date=date(2026, 4, 10), end_date=date(2026, 10, 10),
        )
        Payment.objects.create(
            company=self.company, contract=self.contract, amount=50_000, date=date(2026, 5, 15),
        )
        tx = CostTransaction.objects.create(
            company=self.company, project=self.project, number='TX-7',
            date=date(2026, 5, 20), currency_code='IRR',
        )
        CostTransactionLine.objects.create(
            company=self.company, transaction=tx, net_amount=10_000,
        )
        ProgressStatement.objects.create(
            company=self.company, project=self.project, number='PS-7',
            date=date(2026, 6, 1), gross=100_000, net_payable=90_000,
        )

    def test_builds_expected_event_kinds(self):
        data = build_calendar_events(FakeRequest(self.company))
        kinds = {e['kind'] for e in data['events']}
        for expected in (
            'project_start', 'project_end', 'phase_start', 'phase_end',
            'cost', 'revenue', 'signing', 'start', 'end', 'payment',
        ):
            self.assertIn(expected, kinds)
        self.assertGreaterEqual(data['count'], 10)

    def test_events_carry_jalali_labels(self):
        data = build_calendar_events(FakeRequest(self.company))
        row = [e for e in data['events'] if e['kind'] == 'project_start'][0]
        self.assertEqual(row['date'], '2026-04-01')
        self.assertTrue(str(row['month']).startswith('1405'))
        self.assertTrue(row['month_short'])
        self.assertTrue(row['month_label'])
        self.assertEqual(row['project']['code'], self.project.code)

    def test_filter_by_kind(self):
        data = build_calendar_events(FakeRequest(self.company, kinds='payment'))
        self.assertTrue(data['events'])
        self.assertEqual({e['kind'] for e in data['events']}, {'payment'})

    def test_filter_by_date_range(self):
        data = build_calendar_events(
            FakeRequest(self.company, date_from='2026-05-01', date_to='2026-05-31'),
        )
        self.assertTrue(data['events'])
        for event in data['events']:
            self.assertTrue('2026-05-01' <= event['date'] <= '2026-05-31')

    def test_limit(self):
        data = build_calendar_events(FakeRequest(self.company, limit='3'))
        self.assertEqual(data['count'], 3)
        self.assertTrue(data['counts'])

    def test_guarantee_events_use_issue_date(self):
        """رگرسیون: مدل Guarantee فیلد `date` ندارد و نباید با آن مرتب شود (قبلاً ۵۰۰ می‌داد)."""
        Guarantee.objects.create(
            company=self.company, contract=self.contract, guarantee_type='performance',
            amount=25_000, issue_date=date(2026, 4, 20), expiry_date=date(2027, 4, 20),
        )
        data = build_calendar_events(FakeRequest(self.company))
        kinds = {e['kind'] for e in data['events']}
        self.assertIn('guarantee', kinds)
        titles = [e['title'] for e in data['events'] if e['kind'] == 'guarantee']
        self.assertTrue(any('صدور تضمین' in t for t in titles))

    def test_program_projects_are_excluded_by_default(self):
        self.project.is_program = True
        self.project.save()
        data = build_calendar_events(FakeRequest(self.company))
        self.assertEqual(data['count'], 0)
