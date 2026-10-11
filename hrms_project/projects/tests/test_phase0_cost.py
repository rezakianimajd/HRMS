"""تست حذف نرم، حسابرسی و بهینه‌سازی پروندهٔ پروژه (Phase 0)."""
from datetime import date

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from contracts.models import Addendum, ContractItem, Payment
from projects.cost_models import (
    BudgetLine, CommittedCost, CostTransaction, CostTransactionLine, ProgressStatement,
)
from projects.profile_views import build_project_profile
from projects.tests.base import ProjectTestMixin


class SoftDeleteTests(ProjectTestMixin, TestCase):

    def setUp(self):
        self.make_project()
        self.line = BudgetLine.objects.create(
            company=self.company, project=self.project, description='ردیف بودجه', amount=1000,
        )

    def test_delete_is_soft_and_hidden_by_default(self):
        pk = self.line.pk
        self.line.delete()
        self.assertTrue(BudgetLine.all_objects.filter(pk=pk).exists())
        self.assertFalse(BudgetLine.objects.filter(pk=pk).exists())
        self.assertIsNotNone(BudgetLine.all_objects.get(pk=pk).deleted_at)

    def test_restore_brings_record_back(self):
        self.line.delete()
        self.line.restore()
        self.assertTrue(BudgetLine.objects.filter(pk=self.line.pk).exists())
        self.assertIsNone(BudgetLine.objects.get(pk=self.line.pk).deleted_at)

    def test_hard_delete_removes_row(self):
        pk = self.line.pk
        self.line.hard_delete()
        self.assertFalse(BudgetLine.all_objects.filter(pk=pk).exists())


class CurrencyReferenceTests(ProjectTestMixin, TestCase):

    def setUp(self):
        self.make_project()

    def test_currency_code_fallback_when_no_fk(self):
        tx = CostTransaction.objects.create(
            company=self.company, project=self.project, date=date(2026, 4, 10),
            currency_code='IRR',
        )
        self.assertIsNone(tx.currency_id)
        self.assertEqual(tx.currency_code, 'IRR')


class ProfileAggregationTests(ProjectTestMixin, TestCase):

    def setUp(self):
        self.make_project()
        self.contract = self.make_contract(number='C-1', amount=1_000_000, signing_date=date(2026, 4, 1))
        ContractItem.objects.create(
            company=self.company, contract=self.contract, code='1', description='قلم یک', amount=1_000_000,
        )
        Addendum.objects.create(
            company=self.company, contract=self.contract, number='A-1', amount_change=100_000,
            date=date(2026, 5, 1),
        )
        Payment.objects.create(
            company=self.company, contract=self.contract, amount=400_000, date=date(2026, 5, 10),
        )
        tx = CostTransaction.objects.create(
            company=self.company, project=self.project, number='TX-1', date=date(2026, 5, 5),
            currency_code='IRR',
        )
        CostTransactionLine.objects.create(
            company=self.company, transaction=tx, description='هزینهٔ اجرا', net_amount=250_000,
        )
        ProgressStatement.objects.create(
            company=self.company, project=self.project, number='PS-1', date=date(2026, 5, 20),
            gross=500_000, net_payable=460_000,
        )
        CommittedCost.objects.create(
            company=self.company, project=self.project, amount=300_000, date=date(2026, 4, 20),
        )
        BudgetLine.objects.create(
            company=self.company, project=self.project, description='بودجه', amount=2_000_000,
        )

    def test_summary_numbers(self):
        data = build_project_profile(self.project)
        summary = data['summary']
        self.assertEqual(summary['contracts_count'], 1)
        self.assertEqual(summary['contracts_rial'], 1_000_000)
        self.assertEqual(summary['addendum_rial'], 100_000)
        self.assertEqual(summary['items_amount'], 1_000_000)
        self.assertEqual(summary['actual_cost'], 250_000)
        self.assertEqual(summary['committed'], 300_000)
        self.assertEqual(summary['budget'], 2_000_000)
        self.assertEqual(summary['revenue_accrued'], 460_000)
        self.assertEqual(summary['paid_rial'], 400_000)
        self.assertEqual(len(data['contracts'][0]['items']), 1)
        self.assertEqual(len(data['contracts'][0]['addendums']), 1)

    def test_monthly_series_is_jalali(self):
        data = build_project_profile(self.project)
        months = {row['month'] for row in data['charts']['monthly']}
        # اردیبهشت/خرداد ۱۴۰۵ → 1405-02 و 1405-03
        self.assertIn('1405-02', months)
        self.assertIn('1405-03', months)
        for row in data['charts']['monthly']:
            self.assertEqual(len(str(row['month']).split('-')[0]), 4)
            self.assertTrue(row['month_short'])

    def test_no_n_plus_one_when_adding_contracts(self):
        with CaptureQueriesContext(connection) as first:
            build_project_profile(self.project)

        second_contract = self.make_contract(number='C-2', amount=2_000_000)
        ContractItem.objects.create(
            company=self.company, contract=second_contract, code='1', description='قلم', amount=2_000_000,
        )
        Payment.objects.create(
            company=self.company, contract=second_contract, amount=100_000, date=date(2026, 6, 1),
        )

        with CaptureQueriesContext(connection) as second:
            build_project_profile(self.project)

        # افزودن یک قرارداد نباید ۶ کوئری جدید بسازد (N+1 حذف شده است)
        self.assertLessEqual(len(second.captured_queries), len(first.captured_queries) + 2)
