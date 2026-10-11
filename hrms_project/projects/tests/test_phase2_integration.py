"""تست‌های یکپارچگی فاز ۲ (نیازمند دیتابیس): اعمال تغییر و اتصال خرید→پروژه."""
from datetime import date

from django.test import TestCase

from contracts.models import Payment, Statement
from projects.change_models import ChangeOrder, ChangeOrderLine
from projects.change_service import apply_change_order, decide, submit
from projects.cost_models import BudgetLine, CommittedCost, CostTransaction
from projects.phase2_models import CostAllocation, MeasurementSheet, MeasurementSheetLine
from projects.phase2_service import (
    approve_sheet, check_sheet, create_certificate, issue_certificate, post_allocation,
    recalculate_sheet, register_certificate_payment, submit_sheet,
)
from projects.tests.base import ProjectTestMixin


class ChangeOrderApplyTests(ProjectTestMixin, TestCase):

    def setUp(self):
        self.make_project()
        self.project.start_date = date(2026, 4, 1)
        self.project.end_date = date(2026, 12, 30)
        self.project.save()
        self.co = ChangeOrder.objects.create(
            company=self.company, project=self.project, number='CO-01',
            title='افزودن سقف کاذب', cost_impact=500_000_000, time_impact_days=10,
            request_date=date(2026, 5, 1),
        )
        ChangeOrderLine.objects.create(
            company=self.company, change_order=self.co, description='سقف کاذب',
            unit='متر مربع', quantity=200, unit_price=2_500_000, amount=500_000_000,
        )

    def test_full_workflow_creates_budget_and_extends_project(self):
        submit(self.co, None, 'ارسال برای تأیید')
        decide(self.co, None, 'تأیید کارفرما', approve=True)
        self.co.refresh_from_db()
        self.assertEqual(self.co.status, 'approved')

        result = apply_change_order(self.co, None)
        self.assertEqual(result['budget_lines'], 1)

        self.assertTrue(BudgetLine.objects.filter(
            project=self.project, description='سقف کاذب',
        ).exists())
        self.project.refresh_from_db()
        self.assertEqual(self.project.end_date, date(2027, 1, 9))
        self.co.refresh_from_db()
        self.assertTrue(self.co.applied)
        self.assertEqual(self.co.status, 'applied')
        self.assertEqual(self.co.approvals.count(), 3)

    def test_cannot_apply_twice(self):
        submit(self.co, None)
        decide(self.co, None, approve=True)
        apply_change_order(self.co, None)
        with self.assertRaises(ValueError):
            apply_change_order(self.co, None)

    def test_cannot_apply_before_approval(self):
        with self.assertRaises(ValueError):
            apply_change_order(self.co, None)

    def test_addendum_is_created_for_linked_contract(self):
        contract = self.make_contract(number='C-77', amount=1_000_000)
        self.co.contract = contract
        self.co.save(update_fields=['contract'])
        submit(self.co, None)
        decide(self.co, None, approve=True)
        apply_change_order(self.co, None)
        self.co.refresh_from_db()
        self.assertIsNotNone(self.co.created_addendum_id)
        self.assertEqual(self.co.created_addendum.amount_change, 500_000_000)


class PurchaseIntegrationTests(ProjectTestMixin, TestCase):

    def setUp(self):
        self.make_project()

    def _po(self, **kwargs):
        from procurement.models import PurchaseOrder, Supplier

        supplier = Supplier.objects.create(company=self.company, name='تأمین‌کنندهٔ تست')
        payload = {
            'company': self.company, 'supplier': supplier, 'date': date(2026, 5, 1),
            'number': 'PO-1', 'total': 100_000_000, 'project': self.project,
        }
        payload.update(kwargs)
        return PurchaseOrder.objects.create(**payload)

    def test_po_commitment_is_created_once(self):
        from projects.integration import sync_po_commitment

        po = self._po()
        first = sync_po_commitment(po, None)
        second = sync_po_commitment(po, None)
        self.assertIsNotNone(first)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(CommittedCost.objects.filter(project=self.project).count(), 1)
        self.assertEqual(first.amount, 100_000_000)

    def test_po_without_project_is_ignored(self):
        from projects.integration import sync_po_commitment

        po = self._po(project=None)
        self.assertIsNone(sync_po_commitment(po, None))
        self.assertEqual(CommittedCost.objects.count(), 0)

    def test_grn_creates_cost_transaction(self):
        from procurement.models import GoodsReceiptNote, GoodsReceiptNoteLine, PurchaseOrderLine, UnitOfMeasure
        from procurement.models import ItemCategory, Item
        from projects.integration import sync_grn_costs

        po = self._po()
        category = ItemCategory.objects.create(company=self.company, name='مصالح', code='MAT')
        unit = UnitOfMeasure.objects.create(company=self.company, name='متر', code='m')
        item = Item.objects.create(
            company=self.company, category=category, code='IT-1', name='سیمان', unit=unit,
        )
        PurchaseOrderLine.objects.create(
            company=self.company, order=po, line_no=1, item=item, quantity=100,
            unit=unit, unit_price=1_000_000, amount=100_000_000,
        )
        grn = GoodsReceiptNote.objects.create(
            company=self.company, order=po, number='GRN-1', date=date(2026, 5, 10),
        )
        GoodsReceiptNoteLine.objects.create(
            company=self.company, receipt=grn, line_no=1, item=item, quantity=100, unit=unit,
        )
        tx = sync_grn_costs(grn, None)
        self.assertIsNotNone(tx)
        self.assertEqual(CostTransaction.objects.filter(project=self.project).count(), 1)
        self.assertEqual(tx.lines.count(), 1)
        self.assertEqual(float(tx.lines.first().net_amount), 100_000_000)

        # idempotent
        self.assertEqual(sync_grn_costs(grn, None).pk, tx.pk)
        self.assertEqual(CostTransaction.objects.filter(project=self.project).count(), 1)


class CertificationWorkflowTests(ProjectTestMixin, TestCase):
    """صورتجلسهٔ اندازه‌گیری → تأیید مشاور/کارفرما → گواهی پرداخت → پرداخت."""

    def setUp(self):
        self.make_project()
        self.contract = self.make_contract(number='C-100')
        self.sheet = MeasurementSheet.objects.create(
            company=self.company, project=self.project, contract=self.contract,
            number='MS-01', title='کارکرد دورهٔ اول', date=date(2026, 5, 1),
            retention_percent=10, insurance_amount=1000, tax_amount=500,
        )
        MeasurementSheetLine.objects.create(
            company=self.company, sheet=self.sheet, line_no=1, description='بتن‌ریزی',
            unit='متر مکعب', unit_price=1_000_000, previous_quantity=0,
            current_quantity=10, cumulative_quantity=10, amount=10_000_000,
        )

    def test_recalculate_totals_and_deductions(self):
        recalculate_sheet(self.sheet)
        self.sheet.refresh_from_db()
        self.assertEqual(float(self.sheet.gross_amount), 10_000_000)
        self.assertEqual(float(self.sheet.retention_amount), 1_000_000)   # ۱۰٪
        self.assertEqual(float(self.sheet.net_amount), 8_998_500)          # ۱۰م − (۱م + ۱۰۰۰ + ۵۰۰)

    def test_full_workflow_creates_certificate_statement_and_payment(self):
        submit_sheet(self.sheet, None)
        self.assertEqual(self.sheet.status, 'submitted')
        check_sheet(self.sheet, None)
        self.assertEqual(self.sheet.status, 'checked')
        approve_sheet(self.sheet, None)
        self.assertEqual(self.sheet.status, 'approved')

        certificate = create_certificate(self.sheet, None)
        self.sheet.refresh_from_db()
        self.assertEqual(self.sheet.status, 'certified')
        self.assertEqual(certificate.number, 'PC-MS-01')
        self.assertEqual(float(certificate.net_payable), 8_998_500)
        self.assertIsNotNone(certificate.statement_id)
        self.assertEqual(Statement.objects.filter(contract=self.contract, number='PC-MS-01').count(), 1)
        self.assertTrue(Statement.objects.get(pk=certificate.statement_id).is_approved)

        issue_certificate(certificate, None)
        register_certificate_payment(certificate, None)
        certificate.refresh_from_db()
        self.assertEqual(certificate.status, 'paid')
        self.assertIsNotNone(certificate.contract_payment_id)
        self.assertEqual(Payment.objects.filter(contract=self.contract).count(), 1)
        self.assertEqual(float(certificate.paid_amount), 8_998_500)

    def test_cannot_certify_before_employer_approval(self):
        with self.assertRaises(ValueError):
            create_certificate(self.sheet, None)

    def test_cannot_skip_workflow_steps(self):
        with self.assertRaises(ValueError):
            approve_sheet(self.sheet, None)     # از پیش‌نویس نمی‌توان تأیید کارفرما گرفت
        submit_sheet(self.sheet, None)
        with self.assertRaises(ValueError):
            approve_sheet(self.sheet, None)     # نیاز به تأیید مشاور

    def test_cannot_pay_more_than_remaining(self):
        submit_sheet(self.sheet, None)
        check_sheet(self.sheet, None)
        approve_sheet(self.sheet, None)
        certificate = create_certificate(self.sheet, None)
        with self.assertRaises(ValueError):
            register_certificate_payment(certificate, None, amount=9_000_000)

    def test_allocation_posts_cost_transaction_once(self):
        allocation = CostAllocation.objects.create(
            company=self.company, project=self.project, kind='labor',
            title='دستمزد اردیبهشت', date=date(2026, 4, 25),
            quantity=10, unit='روز', rate=2_000_000, amount=20_000_000,
        )
        tx = post_allocation(allocation, None)
        allocation.refresh_from_db()
        self.assertEqual(allocation.cost_transaction_id, tx.pk)
        self.assertEqual(tx.lines.count(), 1)
        self.assertEqual(float(tx.lines.first().net_amount), 20_000_000)
        self.assertEqual(tx.number, 'ALLOC-1405-02')

        self.assertEqual(post_allocation(allocation, None).pk, tx.pk)   # idempotent
        self.assertEqual(CostTransaction.objects.filter(project=self.project).count(), 1)

