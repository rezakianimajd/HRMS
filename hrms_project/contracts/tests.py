"""تست خروجی اکسل جامع قراردادها (اجرا روی سرور با PostgreSQL)."""
from datetime import date

from django.test import TestCase

from contracts.excel_export import build_contracts_workbook
from contracts.models import Addendum, Contract, ContractParty, Guarantee, Invoice, Payment, Statement
from core.models import Company


def make_company(schema_name='testco-ctr', name='شرکت تست قرارداد'):
    company = Company(schema_name=schema_name, name=name)
    company.auto_create_schema = False
    company.save()
    return company


class ContractExcelExportTests(TestCase):

    def setUp(self):
        self.company = make_company()
        self.party = ContractParty.objects.create(
            company=self.company, name='شرکت الف', party_type='contractor',
        )
        self.contract = Contract.objects.create(
            company=self.company, number='C-1', subject='قرارداد تست', party=self.party,
            contract_type='construction', status='active', amount=10_000_000,
            start_date=date(2025, 3, 21), end_date=date(2026, 3, 20),
            payment_terms='شرایط پرداخت', penalty_terms='وجه التزام',
            project_allocations=[{'project': 1, 'percentage': 100}],
            advance_payments=[{'step': 'مرحله اول', 'amount': 2_000_000}],
            guarantee_items=[{'type': 'performance', 'amount': 500_000, 'percent': 5}],
        )
        Invoice.objects.create(
            company=self.company, contract=self.contract, number='F-1',
            date=date(2025, 5, 1), amount=1_000_000, vat=90_000, total=1_090_000,
        )
        Statement.objects.create(
            company=self.company, contract=self.contract, number='S-1',
            date=date(2025, 6, 1), amount=2_000_000, work_done=1_000_000,
            net_amount=980_000, additions=[{'title': 'ارزش افزوده', 'amount': 90_000}],
            deductions=[{'title': 'بیمه', 'amount': 110_000}],
        )
        Guarantee.objects.create(
            company=self.company, contract=self.contract, guarantee_type='performance',
            instrument_type='bank_guarantee', number='G-1', amount=500_000,
        )
        Payment.objects.create(
            company=self.company, contract=self.contract, date=date(2025, 7, 1), amount=980_000,
        )
        Addendum.objects.create(
            company=self.company, contract=self.contract, number='A-1',
            date=date(2025, 8, 1), amount_change=1_500_000,
            provisions=[{'title': 'بند یک', 'text': 'متن بند'}],
        )

    def test_workbook_contains_all_contract_items(self):
        workbook = build_contracts_workbook([self.contract])
        titles = workbook.sheetnames
        for expected in (
            'خلاصه', 'قراردادها', 'مفاد و شرایط', 'تخصیص پروژه‌ها', 'پیش‌پرداخت‌های مرحله‌ای',
            'اقلام ضمانت قرارداد', 'تضمین‌ها', 'فاکتورها', 'صورت‌وضعیت‌ها',
            'اضافات و کسورات صورت‌وضعیت', 'پرداخت‌ها', 'الحاقیه‌ها', 'مفاد الحاقیه‌ها',
            'اختلافات و دعاوی',
        ):
            self.assertIn(expected, titles)

    def test_contract_sheet_carries_financial_totals(self):
        workbook = build_contracts_workbook([self.contract])
        ws = workbook['قراردادها']
        headers = [c.value for c in ws[1]]
        row = [c.value for c in ws[2]]
        data = dict(zip(headers, row))
        self.assertEqual(data['شماره قرارداد'], 'C-1')
        self.assertEqual(data['مبلغ قرارداد'], 10_000_000.0)
        self.assertEqual(data['جمع فاکتورها'], 1_090_000.0)
        self.assertEqual(data['جمع صورت‌وضعیت‌ها (قابل پرداخت)'], 980_000.0)
        self.assertEqual(data['جمع پرداخت‌ها'], 980_000.0)
        self.assertEqual(data['مانده پرداخت‌نشده'], 9_020_000.0)
        # تاریخ شمسی
        self.assertRegex(str(data['تاریخ شروع']), r'^\d{4}/\d{2}/\d{2}$')

    def test_item_sheets_have_rows(self):
        workbook = build_contracts_workbook([self.contract])
        self.assertEqual(workbook['فاکتورها'].max_row, 2)
        self.assertEqual(workbook['صورت‌وضعیت‌ها'].max_row, 2)
        self.assertEqual(workbook['پرداخت‌ها'].max_row, 2)
        self.assertEqual(workbook['تضمین‌ها'].max_row, 2)
        self.assertEqual(workbook['الحاقیه‌ها'].max_row, 2)
        # اضافات و کسورات: دو آیتم (یک اضافه + یک کسور)
        self.assertEqual(workbook['اضافات و کسورات صورت‌وضعیت'].max_row, 3)
        # پیش‌پرداخت مرحله‌ای و اقلام ضمانت و مفاد الحاقیه
        self.assertEqual(workbook['پیش‌پرداخت‌های مرحله‌ای'].max_row, 2)
        self.assertEqual(workbook['اقلام ضمانت قرارداد'].max_row, 2)
        self.assertEqual(workbook['مفاد الحاقیه‌ها'].max_row, 2)
