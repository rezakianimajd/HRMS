"""تست خروجی اکسل جامع قراردادها (اجرا روی سرور با PostgreSQL)."""
from datetime import date

from django.test import TestCase

from contracts.excel_export import ROW_TYPES, build_contracts_workbook
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
            provisions=[{'title': 'بند یک', 'text': 'متن بند'}],
        )

    def test_workbook_has_single_sheet(self):
        workbook = build_contracts_workbook([self.contract])
        self.assertEqual(workbook.sheetnames, ['قراردادها'])

    def test_contract_row_carries_financial_totals(self):
        workbook = build_contracts_workbook([self.contract])
        ws = workbook['قراردادها']
        headers = [c.value for c in ws[1]]
        data = dict(zip(headers, [c.value for c in ws[2]]))
        self.assertEqual(data['نوع ردیف'], ROW_TYPES['contract'])
        self.assertEqual(data['شماره قرارداد'], 'C-1')
        self.assertEqual(data['مبلغ'], 10_000_000.0)
        self.assertEqual(data['جمع فاکتورها'], 1_090_000.0)
        self.assertEqual(data['جمع صورت‌وضعیت‌ها (قابل پرداخت)'], 980_000.0)
        self.assertEqual(data['جمع پرداخت‌ها'], 980_000.0)
        self.assertEqual(data['مانده پرداخت‌نشده'], 9_020_000.0)
        self.assertEqual(data['درصد پرداخت‌شده'], 9.8)
        # «امضاکننده» (full_name) و «ارز» درست خوانده شوند — رگرسیون خطای 500
        self.assertEqual(data['امضاکننده'], 'مدیرعامل تست')
        self.assertEqual(data['ارز'], 'ریال')
        self.assertIn('فاکتور: 1', str(data['تعداد و جمع آیتم‌ها']))
        # تاریخ شمسی
        self.assertRegex(str(data['تاریخ']), r'^\d{4}/\d{2}/\d{2}$')

    def test_all_items_are_rows_of_the_same_sheet(self):
        workbook = build_contracts_workbook([self.contract])
        ws = workbook['قراردادها']
        headers = [c.value for c in ws[1]]
        kind_col = headers.index('نوع ردیف') + 1
        amount_col = headers.index('مبلغ آیتم') + 1
        kinds = [ws.cell(row=r, column=kind_col).value for r in range(2, ws.max_row + 1)]
        for key in ('contract', 'invoice', 'statement', 'statement_addition', 'statement_deduction',
                    'payment', 'guarantee', 'addendum', 'addendum_provision',
                    'project_allocation', 'advance_payment', 'guarantee_item'):
            self.assertIn(ROW_TYPES[key], kinds)
        # یک قرارداد + ۱۱ آیتم (بدون اختلاف)
        self.assertEqual(len(kinds), 12)
        amounts = {ws.cell(row=r, column=kind_col).value: ws.cell(row=r, column=amount_col).value
                   for r in range(2, ws.max_row + 1)}
        self.assertEqual(amounts[ROW_TYPES['invoice']], 1_000_000.0)
        self.assertEqual(amounts[ROW_TYPES['payment']], 980_000.0)
        self.assertEqual(amounts[ROW_TYPES['guarantee']], 500_000.0)
