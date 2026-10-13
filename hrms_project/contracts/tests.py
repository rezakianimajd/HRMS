"""تست خروجی اکسل جامع قراردادها (اجرا روی سرور با PostgreSQL)."""
from datetime import date

from django.test import TestCase

from contracts.excel_export import build_contracts_workbook
from contracts.models import Addendum, Contract, ContractParty, Guarantee, Invoice, Payment, Statement
from core.models import Company
from settings_app.models import Currency, Signatory


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
        # «امضاکننده» در مدل Signatory فیلد full_name دارد (نه name) و «ارز» فیلد name
        self.signatory = Signatory.objects.create(
            company=self.company, full_name='مدیرعامل تست', position='مدیرعامل',
        )
        self.currency = Currency.objects.create(
            company=self.company, code='IRR', name='ریال', symbol='﷼', exchange_rate=1,
        )
        self.contract = Contract.objects.create(
            company=self.company, number='C-1', subject='قرارداد تست', party=self.party,
            contract_type='construction', status='active', amount=10_000_000,
            signatory=self.signatory, currency=self.currency,
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
            subject_type='duration', subject='تمدید شش ماه',
            provisions=[{'title': 'بند یک', 'text': 'متن بند'}],
        )

    def test_workbook_has_single_sheet(self):
        workbook = build_contracts_workbook([self.contract])
        self.assertEqual(workbook.sheetnames, ['قراردادها'])

    def test_one_row_per_contract(self):
        second = Contract.objects.create(
            company=self.company, number='C-2', subject='قرارداد دوم', party=self.party,
            amount=1_000_000,
        )
        workbook = build_contracts_workbook([self.contract, second])
        self.assertEqual(workbook.sheetnames, ['قراردادها'])
        ws = workbook['قراردادها']
        headers = [c.value for c in ws[1]]
        number_col = headers.index('شماره قرارداد') + 1
        numbers = [ws.cell(row=r, column=number_col).value for r in range(2, ws.max_row + 1)]
        # هر قرارداد فقط یک ردیف (هیچ آیتمی ردیف جداگانه نمی‌گیرد)
        self.assertEqual(numbers, ['C-1', 'C-2'])
        self.assertEqual(ws.max_row, 3)

    def test_contract_row_carries_financial_totals(self):
        workbook = build_contracts_workbook([self.contract])
        ws = workbook['قراردادها']
        headers = [c.value for c in ws[1]]
        data = dict(zip(headers, [c.value for c in ws[2]]))
        self.assertEqual(data['شماره قرارداد'], 'C-1')
        self.assertEqual(data['مبلغ'], 10_000_000.0)
        self.assertEqual(data['تعداد فاکتورها'], 1)
        self.assertEqual(data['جمع مبلغ فاکتورها'], 1_090_000.0)
        self.assertEqual(data['جمع مبلغ صورت‌وضعیت‌ها'], 980_000.0)
        self.assertEqual(data['جمع مبلغ پرداخت‌ها'], 980_000.0)
        self.assertEqual(data['مانده پرداخت‌نشده'], 9_020_000.0)
        self.assertEqual(data['درصد پرداخت‌شده'], 9.8)
        # «امضاکننده» (full_name) و «ارز» درست خوانده شوند — رگرسیون خطای 500
        self.assertEqual(data['امضاکننده'], 'مدیرعامل تست')
        self.assertEqual(data['ارز'], 'ریال')
        self.assertRegex(str(data['تاریخ شروع']), r'^\d{4}/\d{2}/\d{2}$')

    def test_all_items_are_columns_of_the_same_row(self):
        workbook = build_contracts_workbook([self.contract])
        ws = workbook['قراردادها']
        headers = [c.value for c in ws[1]]
        data = dict(zip(headers, [c.value for c in ws[2]]))
        self.assertEqual(data['فاکتور 1 — شماره'], 'F-1')
        self.assertEqual(data['فاکتور 1 — مبلغ کل'], 1_090_000.0)
        self.assertEqual(data['صورت‌وضعیت 1 — مبلغ کل / قابل پرداخت'], 980_000.0)
        self.assertEqual(data['اضافهٔ صورت‌وضعیت 1 — عنوان'], 'اضافه: ارزش افزوده')
        self.assertEqual(data['کسور صورت‌وضعیت 1 — عنوان'], 'کسور: بیمه')
        self.assertEqual(data['پرداخت 1 — مبلغ'], 980_000.0)
        self.assertEqual(data['تضمین 1 — شماره'], 'G-1')
        self.assertEqual(data['الحاقیه 1 — تغییر مبلغ'], 1_500_000.0)
        self.assertEqual(data['الحاقیه 1 — موضوع الحاقیه'],
                         'تغییر مدت، تمدید و اصلاح برنامه زمانی قرارداد')
        self.assertEqual(data['الحاقیه 1 — شرح موضوع'], 'تمدید شش ماه')
        self.assertEqual(data['مفاد الحاقیه 1 — عنوان'], 'بند یک')
        self.assertEqual(data['تخصیص پروژه 1 — درصد'], 100.0)
        self.assertEqual(data['پیش‌پرداخت مرحله‌ای 1 — مبلغ'], 2_000_000.0)
        self.assertEqual(data['قلم ضمانت قرارداد 1 — درصد'], 5.0)
        # ستون خالی برای آیتم دوم ساخته نشده (بیشترین تعداد = ۱)
        self.assertNotIn('فاکتور 2 — شماره', headers)
