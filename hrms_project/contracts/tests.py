"""تست خروجی اکسل جامع قراردادها (اجرا روی سرور با PostgreSQL)."""
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase

from contracts.excel_export import build_contracts_workbook
from contracts.models import Addendum, Contract, ContractParty, Guarantee, Invoice, Payment, Statement
from contracts.numbering import display_statement_number, display_statement_title, normalize_statement_number
from contracts.serializers import StatementSerializer
from core.models import Company
from settings_app.models import Currency, Signatory


class StatementNumberingTests(SimpleTestCase):
    """استانداردسازی دو رقمی و نمایش فارسی شمارهٔ صورت‌وضعیت."""

    def test_numeric_numbers_are_padded_to_two_digits(self):
        self.assertEqual(normalize_statement_number('3'), '03')
        self.assertEqual(normalize_statement_number('۰۳'), '03')
        self.assertEqual(normalize_statement_number('٠٧'), '07')
        self.assertEqual(normalize_statement_number('003'), '03')
        self.assertEqual(normalize_statement_number('103'), '103')

    def test_non_numeric_numbers_are_preserved_and_displayed_in_persian(self):
        self.assertEqual(normalize_statement_number('S-3'), 'S-3')
        self.assertEqual(display_statement_number('3'), '۰۳')
        self.assertEqual(display_statement_number('S-1'), 'S-۱')
        self.assertEqual(
            display_statement_title(SimpleNamespace(kind='increase', number='3')),
            'تعدیل افزایشی ۰۳',
        )
        self.assertEqual(
            display_statement_title(SimpleNamespace(kind='decrease', number='S-2')),
            'تعدیل کاهشی S-۲',
        )


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
        self.statement = Statement.objects.create(
            company=self.company, contract=self.contract, number='S-1',
            date=date(2025, 6, 1), amount=2_000_000, work_done=1_000_000,
            net_amount=980_000, additions=[{'title': 'ارزش افزوده', 'amount': 90_000}],
            deductions=[{'title': 'بیمه', 'amount': 110_000}],
        )
        Guarantee.objects.create(
            company=self.company, contract=self.contract, guarantee_type='performance',
            instrument_type='bank_guarantee', number='G-1', amount=500_000,
        )
        self.payment = Payment.objects.create(
            company=self.company, contract=self.contract, statement=self.statement,
            date=date(2025, 7, 1), amount=980_000,
        )
        Addendum.objects.create(
            company=self.company, contract=self.contract, number='A-1',
            date=date(2025, 8, 1), amount_change=1_500_000,
            subject='تمدید شش ماه',
            subjects=[
                {'type': 'amount', 'fields': {'amount_change': 1_500_000, 'percent_change': 15}},
                {'type': 'payment', 'fields': {'advance_change': 500_000}},
                {'type': 'duration', 'fields': {'new_end_date': '2026-09-20'}},
            ],
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
        self.assertEqual(data['صورت‌وضعیت 1 — شماره'], 'S-۱')
        self.assertEqual(data['اضافهٔ صورت‌وضعیت 1 — عنوان'], 'اضافه: ارزش افزوده')
        self.assertEqual(data['کسور صورت‌وضعیت 1 — عنوان'], 'کسور: بیمه')
        self.assertEqual(data['پرداخت 1 — مبلغ'], 980_000.0)
        self.assertEqual(data['پرداخت 1 — نوع'], 'پرداخت عادی')
        self.assertEqual(data['تضمین 1 — شماره'], 'G-1')
        self.assertEqual(data['الحاقیه 1 — تغییر مبلغ'], 1_500_000.0)
        self.assertEqual(
            data['الحاقیه 1 — موضوع‌های الحاقیه'],
            'تغییر مبلغ، بهای قرارداد و تعدیل قیمت، تغییر شرایط پرداخت، پیش‌پرداخت و تسویه‌حساب، '
            'تغییر مدت، تمدید و اصلاح برنامه زمانی قرارداد',
        )
        self.assertEqual(data['الحاقیه 1 — تغییر پیش‌پرداخت'], 500_000.0)
        self.assertEqual(data['الحاقیه 1 — شرح موضوع'], 'تمدید شش ماه')
        # ---- مقادیر مؤثر پروندهٔ قرارداد (اثر الحاقیه) ----
        self.assertEqual(data['مبلغ (با الحاقیه)'], 11_500_000.0)
        self.assertEqual(data['جمع تغییر مبلغ الحاقیه‌ها'], 1_500_000.0)
        self.assertEqual(data['پیش‌پرداخت (با الحاقیه)'], 2_500_000.0)
        self.assertEqual(data['جمع تغییر پیش‌پرداخت الحاقیه‌ها'], 500_000.0)
        self.assertEqual(data['درصد حسن انجام کار (با الحاقیه)'], 5.0)
        self.assertNotEqual(data['تاریخ پایان (با الحاقیه)'], data['تاریخ پایان'])
        self.assertRegex(str(data['تاریخ پایان (با الحاقیه)']), r'^\d{4}/\d{2}/\d{2}$')
        self.assertEqual(data['مفاد الحاقیه 1 — عنوان'], 'بند یک')
        self.assertEqual(data['تخصیص پروژه 1 — درصد'], 100.0)
        self.assertEqual(data['پیش‌پرداخت مرحله‌ای 1 — مبلغ'], 2_000_000.0)
        self.assertEqual(data['قلم ضمانت قرارداد 1 — درصد'], 5.0)
        # ستون خالی برای آیتم دوم ساخته نشده (بیشترین تعداد = ۱)
        self.assertNotIn('فاکتور 2 — شماره', headers)

    def test_payment_type_is_exposed_and_advance_clears_statement_link(self):
        from contracts.serializers import PaymentSerializer

        data = PaymentSerializer(self.payment).data
        self.assertEqual(data['payment_type'], Payment.Type.NORMAL)
        self.assertEqual(data['payment_type_display'], 'پرداخت عادی')

        serializer = PaymentSerializer(
            self.payment,
            data={'payment_type': Payment.Type.ADVANCE},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.payment_type, Payment.Type.ADVANCE)
        self.assertIsNone(self.payment.statement_id)

    def test_addendum_serializer_exposes_multiple_subjects(self):
        from contracts.serializers import AddendumSerializer

        addendum = self.contract.addendums.first()
        data = AddendumSerializer(addendum).data
        self.assertEqual([item['type'] for item in data['subjects']],
                         ['amount', 'payment', 'duration'])
        # «موضوع اصلی» با اولین موضوع هم‌گام می‌شود
        self.assertEqual(data['subject_type'], 'amount')
        self.assertEqual(len(data['subjects_detail']), 3)
        payment = [item for item in data['subjects_detail'] if item['type'] == 'payment'][0]
        self.assertEqual(payment['label'], 'تغییر شرایط پرداخت، پیش‌پرداخت و تسویه‌حساب')
        self.assertEqual(payment['filled'][0]['key'], 'advance_change')
        self.assertEqual(payment['filled'][0]['value'], 500_000)
        self.assertTrue(data['effect']['has_effect'])
        fields = {change['field'] for change in data['effect']['changes']}
        self.assertIn('advance_payment', fields)
        self.assertIn('amount', fields)
        self.assertIn('end_date', fields)

    def test_addendum_documents_are_nested_and_pdf_only(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from contracts.models import ContractDocument
        from contracts.serializers import AddendumSerializer, ContractDocumentSerializer

        addendum = self.contract.addendums.first()
        pdf = SimpleUploadedFile(
            'addendum.pdf', b'%PDF-1.4\n%%EOF\n',
            content_type='application/pdf',
        )
        document = ContractDocument.objects.create(
            company=self.company, contract=self.contract, addendum=addendum,
            title='PDF الحاقیه', file=pdf,
        )
        data = AddendumSerializer(addendum).data
        self.assertEqual(len(data['documents']), 1)
        self.assertEqual(data['documents'][0]['title'], 'PDF الحاقیه')
        self.assertTrue(data['documents'][0]['file_url'])

        bad = SimpleUploadedFile('addendum.txt', b'not-pdf', content_type='text/plain')
        invalid = ContractDocumentSerializer(data={
            'contract': self.contract.pk,
            'addendum': addendum.pk,
            'title': 'فایل غیرمجاز',
            'file': bad,
        })
        self.assertFalse(invalid.is_valid())
        self.assertIn('file', invalid.errors)
        document.file.delete(save=False)

    def test_guarantee_documents_are_nested_and_pdf_only(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from contracts.models import ContractDocument
        from contracts.serializers import GuaranteeSerializer, ContractDocumentSerializer

        guarantee = self.contract.guarantees.first()
        pdf = SimpleUploadedFile(
            'guarantee.pdf', b'%PDF-1.4\n%%EOF\n',
            content_type='application/pdf',
        )
        document = ContractDocument.objects.create(
            company=self.company, contract=self.contract, guarantee=guarantee,
            title='PDF تضمین', file=pdf,
        )
        data = GuaranteeSerializer(guarantee).data
        self.assertEqual(len(data['documents']), 1)
        self.assertEqual(data['documents'][0]['title'], 'PDF تضمین')
        self.assertTrue(data['documents'][0]['file_url'])

        bad = SimpleUploadedFile('guarantee.txt', b'not-pdf', content_type='text/plain')
        invalid = ContractDocumentSerializer(data={
            'contract': self.contract.pk,
            'guarantee': guarantee.pk,
            'title': 'فایل غیرمجاز',
            'file': bad,
        })
        self.assertFalse(invalid.is_valid())
        self.assertIn('file', invalid.errors)
        document.file.delete(save=False)

    def test_addendum_date_is_optional(self):
        from contracts.serializers import AddendumSerializer

        addendum = Addendum.objects.create(
            company=self.company, contract=self.contract, number='A-ND',
            date=None, amount_change=100_000,
            subjects=[{'type': 'amount', 'fields': {'amount_change': 100_000}}],
        )
        data = AddendumSerializer(addendum).data
        self.assertIsNone(data['date'])
        self.assertEqual(data['number'], 'A-ND')

    def test_contract_effective_engine_applies_all_addendums(self):
        from contracts.addendum_effects import contract_effects

        result = contract_effects(self.contract)
        self.assertEqual(result['effective']['amount'], 11_500_000.0)
        self.assertEqual(result['effective']['advance_payment'], 2_500_000.0)
        self.assertEqual(result['effective']['end_date'], '2026-09-20')
        self.assertEqual(result['deltas']['amount'], 1_500_000.0)
        self.assertEqual(result['deltas']['advance_payment'], 500_000.0)
        self.assertEqual(result['addendum_count'], 1)
        self.assertEqual(result['changed'],
                         ['advance_payment', 'amount', 'end_date'])
        # دادهٔ اصلی قرارداد دست‌نخورده می‌ماند
        self.contract.refresh_from_db()
        self.assertEqual(float(self.contract.amount), 10_000_000.0)
        self.assertEqual(float(self.contract.advance_payment), 2_000_000.0)

    def test_addendum_subject_validation_rejects_unknown(self):
        from django.core.exceptions import ValidationError

        from contracts.models import Addendum as AddendumModel

        broken = AddendumModel(
            company=self.company, contract=self.contract,
            subjects=[{'type': 'not-a-subject', 'fields': {}}],
        )
        with self.assertRaises(ValidationError):
            broken.clean()


class ContractListEffectiveFieldsTests(TestCase):
    """فیلدهای «مبلغ/پایان مؤثر با الحاقیه» برای فهرست قراردادها."""

    def setUp(self):
        self.company = make_company(schema_name='testco-eff', name='شرکت تست فهرست')
        self.party = ContractParty.objects.create(
            company=self.company, name='شرکت پیمانکار', party_type='contractor',
        )
        self.currency = Currency.objects.create(
            company=self.company, code='IRR', name='ریال ایران', symbol='﷼', exchange_rate=1,
        )
        self.contract = Contract.objects.create(
            company=self.company, number='C-EFF-1', subject='قرارداد آزمایشی',
            party=self.party, contract_type='construction', status='active',
            amount=10_000_000, currency=self.currency,
            start_date=date(2025, 3, 21), end_date=date(2026, 3, 20),
        )

    def test_effective_fields_equal_base_without_addendum(self):
        from contracts.serializers import ContractSerializer

        payload = ContractSerializer(self.contract).data
        self.assertEqual(payload['effective_amount'], 10_000_000.0)
        self.assertEqual(payload['effective_end_date'], '2026-03-20')
        self.assertFalse(payload['has_addendum'])
        self.assertEqual(payload['currency_code'], 'IRR')
        self.assertEqual(payload['currency_name'], 'ریال ایران')

    def test_effective_fields_follow_addendum(self):
        from contracts.serializers import ContractSerializer

        Addendum.objects.create(
            company=self.company, contract=self.contract, number='A-EFF-1',
            date=date(2025, 8, 1), amount_change=1_500_000, subject='افزایش مبلغ و تمدید',
            subjects=[
                {'type': 'amount', 'fields': {'amount_change': 1_500_000}},
                {'type': 'duration', 'fields': {'new_end_date': '2026-09-20'}},
            ],
        )
        payload = ContractSerializer(self.contract).data
        self.assertEqual(payload['effective_amount'], 11_500_000.0)
        self.assertEqual(payload['effective_end_date'], '2026-09-20')
        self.assertTrue(payload['has_addendum'])
        # مبلغ پایهٔ قرارداد دست‌نخورده می‌ماند (اثر الحاقیه فقط محاسباتی است)
        self.contract.refresh_from_db()
        self.assertEqual(float(self.contract.amount), 10_000_000.0)


class ContractGuaranteeStatusTests(TestCase):
    """وضعیت تأمین تضامین قرارداد (تضمین‌های اورده‌شده در برابر اقلام مورد نیاز قرارداد)."""

    def setUp(self):
        self.company = make_company(schema_name='testco-gst', name='شرکت تست تضامین')
        self.party = ContractParty.objects.create(
            company=self.company, name='پیمانکار ب', party_type='contractor',
        )
        self.contract = Contract.objects.create(
            company=self.company, number='C-G1', subject='قرارداد تضامین', party=self.party,
            contract_type='construction', status='active', amount=1_000_000_000,
            guarantee_type='insurance', guarantee_amount=20_000_000,
            guarantee_items=[
                {'type': 'performance', 'percent': 5, 'note': 'حسن انجام کار'},
                {'type': 'advance', 'amount': 200_000_000, 'note': 'پیش‌پرداخت'},
                {'type': 'bid', 'amount': 50_000_000, 'note': 'شرکت در مناقصه'},
            ],
        )

    def _guarantee(self, **kwargs):
        payload = {
            'company': self.company, 'contract': self.contract,
            'guarantee_type': 'performance', 'instrument_type': 'bank_guarantee',
            'amount': 0,
        }
        payload.update(kwargs)
        return Guarantee.objects.create(**payload)

    def test_percent_requirement_uses_effective_contract_amount(self):
        from contracts.guarantee_status import guarantee_compliance

        result = guarantee_compliance(self.contract)
        performance = next(r for r in result['requirements'] if r['type'] == 'performance')
        # ۵٪ از مبلغ مؤثر ۱٬۰۰۰٬۰۰۰٬۰۰۰ = ۵۰٬۰۰۰٬۰۰۰
        self.assertEqual(performance['required'], 50_000_000.0)
        self.assertEqual(performance['status'], 'missing')

    def test_addendum_increases_percent_requirement(self):
        from contracts.guarantee_status import guarantee_compliance

        Addendum.objects.create(
            company=self.company, contract=self.contract, number='A-G1',
            date=date(2025, 9, 1), amount_change=200_000_000,
            subject='افزایش مبلغ',
            subjects=[{'type': 'amount', 'fields': {'amount_change': 200_000_000}}],
        )
        result = guarantee_compliance(self.contract)
        performance = next(r for r in result['requirements'] if r['type'] == 'performance')
        # ۵٪ از ۱٬۲۰۰٬۰۰۰٬۰۰۰ = ۶۰٬۰۰۰٬۰۰۰
        self.assertEqual(performance['required'], 60_000_000.0)

    def test_partial_and_provided_statuses(self):
        from contracts.guarantee_status import guarantee_compliance

        self._guarantee(guarantee_type='performance', amount=50_000_000, number='PG-1')
        self._guarantee(guarantee_type='advance', amount=120_000_000, number='AD-1')
        result = guarantee_compliance(self.contract)
        by_type = {row['type']: row for row in result['requirements']}
        self.assertEqual(by_type['performance']['status'], 'provided')
        self.assertEqual(by_type['performance']['coverage_percent'], 100.0)
        self.assertEqual(by_type['advance']['status'], 'partial')
        self.assertEqual(by_type['advance']['balance'], 80_000_000.0)
        self.assertEqual(by_type['bid']['status'], 'missing')
        self.assertEqual(result['summary']['required_count'], 4)  # + تضمین اصلی قرارداد
        self.assertTrue(any('کامل تأمین نشده' in w for w in result['warnings']))
        self.assertTrue(any('هنوز اورده/ثبت نشده' in w for w in result['warnings']))

    def test_released_guarantee_counts_as_fulfilled_without_shortage(self):
        from contracts.guarantee_status import guarantee_compliance

        self._guarantee(guarantee_type='advance', amount=200_000_000, is_released=True,
                        number='AD-0')
        result = guarantee_compliance(self.contract)
        advance = next(r for r in result['requirements'] if r['type'] == 'advance')
        # آزادسازی یعنی تعهد انجام شده؛ پوشش فعال صفر است اما کمبود گزارش نمی‌شود.
        self.assertEqual(advance['provided'], 0.0)
        self.assertEqual(advance['released_total'], 200_000_000.0)
        self.assertEqual(advance['fulfilled'], 200_000_000.0)
        self.assertEqual(advance['status'], 'released')
        self.assertEqual(advance['status_label'], 'آزادشده پس از انجام تعهدات')
        self.assertEqual(advance['balance'], 0.0)
        self.assertEqual(advance['coverage_percent'], 100.0)
        self.assertEqual(advance['released_count'], 1)
        self.assertEqual(result['summary']['provided_total'], 0.0)
        self.assertEqual(result['summary']['released_count'], 1)
        self.assertFalse(any('هنوز اورده/ثبت نشده' in w for w in result['warnings']))
        self.assertFalse(any('کامل تأمین نشده' in w for w in result['warnings']))

    def test_released_guarantee_is_not_a_shortage_in_partial_case(self):
        from contracts.guarantee_status import guarantee_compliance

        self._guarantee(guarantee_type='advance', amount=100_000_000, number='AD-A')
        self._guarantee(guarantee_type='advance', amount=50_000_000, is_released=True, number='AD-B')
        result = guarantee_compliance(self.contract)
        advance = next(r for r in result['requirements'] if r['type'] == 'advance')
        self.assertEqual(advance['provided'], 100_000_000.0)
        self.assertEqual(advance['released_total'], 50_000_000.0)
        self.assertEqual(advance['status'], 'partial')
        self.assertEqual(advance['balance'], 50_000_000.0)
        self.assertTrue(any('کامل تأمین نشده' in w for w in result['warnings']))

    def test_extra_guarantee_is_listed_as_unrequired(self):
        from contracts.guarantee_status import guarantee_compliance

        self._guarantee(guarantee_type='other', amount=5_000_000, number='X-1')
        result = guarantee_compliance(self.contract)
        self.assertEqual([row['number'] for row in result['unrequired']], ['X-1'])
        self.assertEqual(result['summary']['unrequired_count'], 1)

    def test_guarantee_items_are_linked_to_their_requirement(self):
        from contracts.guarantee_status import guarantee_compliance

        self._guarantee(guarantee_type='advance', amount=100_000_000, number='AD-2')
        self._guarantee(guarantee_type='advance', amount=50_000_000, number='AD-3',
                        is_released=True)
        result = guarantee_compliance(self.contract)
        advance = next(r for r in result['requirements'] if r['type'] == 'advance')
        self.assertEqual([row['number'] for row in advance['items']], ['AD-2', 'AD-3'])
        self.assertEqual(advance['provided_count'], 1)
        self.assertEqual(advance['items'][0]['amount'], 100_000_000.0)

    def test_linked_guarantee_stays_under_its_contract_item(self):
        """تضمینی که به ردیف مشخصی از اقلام وصل شده، نباید زیر قلم هم‌نوع قبلی برود."""
        from contracts.guarantee_status import guarantee_compliance

        linked_contract = Contract.objects.create(
            company=self.company, number='C-G4', subject='قرارداد با دو قلم هم‌نوع', party=self.party,
            amount=1_000_000_000,
            guarantee_items=[
                {'type': 'advance', 'amount': 100_000_000, 'note': 'قلم اول'},
                {'type': 'advance', 'amount': 200_000_000, 'note': 'قلم دوم'},
            ],
        )
        self._guarantee(contract=linked_contract, guarantee_type='advance', amount=200_000_000,
                        number='AD-L2', contract_guarantee_index=1)
        self._guarantee(contract=linked_contract, guarantee_type='advance', amount=100_000_000,
                        number='AD-L1')

        result = guarantee_compliance(linked_contract)
        first, second = result['requirements']
        self.assertEqual([row['number'] for row in first['items']], ['AD-L1'])
        self.assertEqual([row['number'] for row in second['items']], ['AD-L2'])
        self.assertEqual(second['items'][0]['contract_guarantee_index'], 1)
        self.assertEqual(result['summary']['unrequired_count'], 0)

    def test_guarantees_status_endpoint_url_resolves(self):
        from django.urls import resolve

        match = resolve(f'/api/external-contracts/{self.contract.pk}/guarantees-status/')
        self.assertEqual(match.func.cls.__name__, 'ContractViewSet')
        self.assertEqual(match.func.actions['get'], 'guarantees_status')

    def test_contract_without_requirements(self):
        from contracts.guarantee_status import guarantee_compliance

        bare = Contract.objects.create(
            company=self.company, number='C-G2', subject='قرارداد بدون تضمین', party=self.party,
        )
        self._guarantee(contract=bare, guarantee_type='other', amount=1_000_000, number='X-2')
        result = guarantee_compliance(bare)
        self.assertEqual(result['summary']['required_count'], 0)
        self.assertEqual(result['summary']['unrequired_count'], 1)
        self.assertEqual(result['requirements'], [])

    def test_persian_label_requirement_matches_code(self):
        """داده‌های قدیمی که نوع قلم را با برچسب فارسی ذخیره کرده‌اند هم تطبیق داده شود."""
        from contracts.guarantee_status import guarantee_compliance

        legacy = Contract.objects.create(
            company=self.company, number='C-G3', subject='قرارداد قدیمی', party=self.party,
            amount=100_000_000,
            guarantee_items=[{'type': 'ضمانت حسن انجام کار', 'amount': 5_000_000}],
        )
        self._guarantee(contract=legacy, guarantee_type='performance', amount=5_000_000,
                        number='PG-L1')
        result = guarantee_compliance(legacy)
        self.assertEqual(result['requirements'][0]['type'], 'performance')
        self.assertEqual(result['requirements'][0]['status'], 'provided')
        self.assertEqual(result['summary']['unrequired_count'], 0)


class GuaranteeKindOptionsTests(TestCase):
    """یکسانی گزینه‌های «نوع ضمانت» قرارداد و «نوع تضمین» تضامین در همهٔ لایه‌ها."""

    NEW_KINDS = [
        'deduction_refund',
        'warranty_period',
        'maintenance_period',
        'funds_refund',
        'insurance_social',
        'materials_supply',
    ]

    def test_contract_and_guarantee_use_the_same_choices(self):
        from contracts.models import Contract, Guarantee

        self.assertIs(Contract.GuaranteeKind, Guarantee.GuaranteeType)
        self.assertEqual(list(Contract.GuaranteeKind.choices),
                         list(Guarantee.GuaranteeType.choices))

    def test_field_choices_of_both_models_match(self):
        from contracts.models import Contract, Guarantee

        contract_field = Contract._meta.get_field('guarantee_type')
        guarantee_field = Guarantee._meta.get_field('guarantee_type')
        self.assertEqual(list(contract_field.choices), list(guarantee_field.choices))

    def test_new_kinds_are_available_and_other_is_last(self):
        from contracts.models import Contract

        codes = [code for code, _label in Contract.GuaranteeKind.choices]
        for kind in self.NEW_KINDS:
            self.assertIn(kind, codes)
        self.assertEqual(codes[-1], 'other')  # «سایر» همیشه آخر
        self.assertEqual(len(codes), len(set(codes)))

    def test_codes_fit_the_field_max_length(self):
        from contracts.models import Contract

        longest = max(len(code) for code, _label in Contract.GuaranteeKind.choices)
        self.assertLessEqual(longest, Contract._meta.get_field('guarantee_type').max_length)

    def test_addendum_schema_uses_the_same_options(self):
        from contracts.addendum_schema import SUBJECTS
        from contracts.models import Contract

        expected = [(code, str(label)) for code, label in Contract.GuaranteeKind.choices]
        field = None
        for subject in SUBJECTS:
            for row in subject.get('fields', []):
                if row.get('key') == 'guarantee_kind':
                    field = row
        self.assertIsNotNone(field, 'فیلد guarantee_kind در طرح الحاقیه پیدا نشد.')
        self.assertEqual([(c['value'], c['label']) for c in field['choices']], expected)

    def _frontend_file(self, filename):
        from django.conf import settings

        path = settings.BASE_DIR.parent / 'frontend' / 'src' / 'core' / 'constants' / filename
        if not path.exists():
            self.skipTest(f'فایل فرانت‌اند در دسترس نیست: {path}')
        return path.read_text(encoding='utf-8')

    def test_frontend_guarantee_types_matches_backend(self):
        """فایل ثابت‌های فرانت‌اند باید همان گزینه‌ها و همان ترتیب بک‌اند را داشته باشد."""
        import re

        from contracts.models import Contract

        text = self._frontend_file('guaranteeTypes.js')
        pairs = re.findall(r"value: '([a-z_]+)', label: '([^']+)'", text)
        self.assertTrue(pairs, 'جفت‌های value/label در guaranteeTypes.js خوانده نشد.')
        self.assertEqual(pairs, [(code, str(label)) for code, label in Contract.GuaranteeKind.choices])

    def test_frontend_addendum_choices_match_backend(self):
        """گزینه‌های «نوع تضمین» فیلد الحاقیه در فایل تولیدشدهٔ فرانت‌اند هم هم‌خوان باشد."""
        import re

        from contracts.models import Contract

        text = self._frontend_file('addendumSubjects.js')
        start = text.index('"key": "guarantee_kind"')
        tail = text[start:]
        block = tail[:tail.index('"key":', 10)]  # فقط بدنهٔ همین فیلد تا فیلد بعدی
        pairs = re.findall(r'"value": "([a-z_]+)",\s*"label": "([^"]+)"', block)
        self.assertTrue(pairs, 'گزینه‌های guarantee_kind در addendumSubjects.js خوانده نشد.')
        self.assertEqual(pairs, [(code, str(label)) for code, label in Contract.GuaranteeKind.choices])


class StatementCalculationTests(TestCase):
    """محاسبهٔ خودکار کارکرد دوره و آیتم‌های درصدی صورت‌وضعیت."""

    def setUp(self):
        self.company = make_company(schema_name='testco-stmt', name='شرکت تست صورت‌وضعیت')
        self.party = ContractParty.objects.create(
            company=self.company, name='پیمانکار تست', party_type='contractor',
        )
        self.currency = Currency.objects.create(
            company=self.company, code='IRR', name='ریال', symbol='﷼', exchange_rate=1,
        )
        self.contract = Contract.objects.create(
            company=self.company, number='C-STMT', subject='قرارداد محاسبه صورت‌وضعیت',
            party=self.party, contract_type='construction', status='active', amount=10_000_000,
            currency=self.currency, start_date=date(2025, 3, 21), end_date=date(2026, 3, 20),
        )

    def _payload(self, **overrides):
        payload = {
            'contract': self.contract.pk,
            'number': 'S-TEST',
            'date': '2025-08-01',
            'amount': 5_000_000,
        }
        payload.update(overrides)
        return payload

    def test_statement_number_is_normalized_to_two_digits(self):
        serializer = StatementSerializer(data=self._payload(number='۳'))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        statement = serializer.save(company=self.company)
        self.assertEqual(statement.number, '03')
        self.assertEqual(Statement.objects.get(pk=statement.pk).number, '03')

        longer = StatementSerializer(data=self._payload(number='۱۰۳', amount=6_000_000))
        self.assertTrue(longer.is_valid(), longer.errors)
        self.assertEqual(longer.save(company=self.company).number, '103')

    def test_adjustments_have_independent_signed_chain(self):
        Statement.objects.create(
            company=self.company, contract=self.contract, number='01',
            date=date(2025, 7, 1), amount=2_000_000, work_done=2_000_000,
            net_amount=2_000_000,
        )
        increase = StatementSerializer(data=self._payload(
            number='', kind='increase', amount=0, adjustment_work_done=500_000,
        ))
        self.assertTrue(increase.is_valid(), increase.errors)
        increase_row = increase.save(company=self.company)

        decrease = StatementSerializer(data=self._payload(
            number='', kind='decrease', amount=0, adjustment_work_done=200_000,
        ))
        self.assertTrue(decrease.is_valid(), decrease.errors)
        decrease_row = decrease.save(company=self.company)

        normal = StatementSerializer(data=self._payload(number='02', amount=5_000_000))
        self.assertTrue(normal.is_valid(), normal.errors)
        normal_row = normal.save(company=self.company)

        from contracts.statement_totals import recalculate_contract_statements
        recalculate_contract_statements(self.contract)
        increase_row.refresh_from_db()
        decrease_row.refresh_from_db()
        normal_row.refresh_from_db()

        self.assertEqual(increase_row.number, '01')
        self.assertEqual(increase_row.amount, Decimal('2000000'))
        self.assertEqual(increase_row.cumulative_previous_amount, Decimal('2000000'))
        self.assertEqual(increase_row.work_done, Decimal('500000'))
        self.assertEqual(increase_row.adjustment_amount, Decimal('500000'))
        self.assertEqual(increase_row.net_amount, Decimal('500000'))

        self.assertEqual(decrease_row.number, '02')
        self.assertEqual(decrease_row.amount, Decimal('2000000'))
        self.assertEqual(decrease_row.work_done, Decimal('-200000'))
        self.assertEqual(decrease_row.adjustment_amount, Decimal('300000'))
        self.assertEqual(decrease_row.net_amount, Decimal('-200000'))

        self.assertEqual(normal_row.cumulative_previous_amount, Decimal('2000000'))
        self.assertEqual(normal_row.work_done, Decimal('3000000'))
        self.assertEqual(normal_row.adjustment_amount, Decimal('300000'))

    def test_adjustment_additions_and_deductions_affect_only_its_net_payable(self):
        Statement.objects.create(
            company=self.company, contract=self.contract, number='01',
            date=date(2025, 7, 1), amount=2_000_000, work_done=2_000_000,
            net_amount=2_000_000,
        )
        serializer = StatementSerializer(data=self._payload(
            number='',
            kind='increase',
            amount=0,
            adjustment_work_done=500_000,
            additions=[{'description': 'اضافه تعدیل', 'amount': 50_000, 'mode': 'amount'}],
            deductions=[{'title': 'کسور تعدیل', 'amount': 20_000, 'mode': 'amount'}],
            value_added_tax=10_000,
            other_additions=5_000,
        ))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        adjustment = serializer.save(company=self.company)
        adjustment.refresh_from_db()

        self.assertEqual(adjustment.work_done, Decimal('500000'))
        self.assertEqual(adjustment.additions_total, Decimal('65000'))
        self.assertEqual(adjustment.deductions_total, Decimal('20000'))
        self.assertEqual(adjustment.net_amount, Decimal('545000'))
        # تجمعی تعدیل فقط مبلغ تعدیل را نگه می‌دارد؛ اضافات/کسورات در مانده قابل پرداخت اثر دارند.
        self.assertEqual(adjustment.adjustment_amount, Decimal('500000'))

        normal = StatementSerializer(data=self._payload(number='02', amount=5_000_000))
        self.assertTrue(normal.is_valid(), normal.errors)
        normal_row = normal.save(company=self.company)
        normal_row.refresh_from_db()
        # صورت‌وضعیت عادی بعدی از مبنای عادی قبلی محاسبه می‌شود، نه از تعدیل.
        self.assertEqual(normal_row.cumulative_previous_amount, Decimal('2000000'))
        self.assertEqual(normal_row.work_done, Decimal('3000000'))
        self.assertEqual(normal_row.adjustment_amount, Decimal('500000'))

        from contracts.statement_totals import recalculate_contract_statements
        recalculate_contract_statements(self.contract)
        adjustment.refresh_from_db()
        normal_row.refresh_from_db()
        self.assertEqual(adjustment.additions_total, Decimal('65000'))
        self.assertEqual(adjustment.deductions_total, Decimal('20000'))
        self.assertEqual(adjustment.net_amount, Decimal('545000'))
        self.assertEqual(normal_row.cumulative_previous_amount, Decimal('2000000'))

    def test_percentage_items_use_current_period_work(self):
        Statement.objects.create(
            company=self.company, contract=self.contract, number='S-PRIOR',
            date=date(2025, 7, 1), amount=2_000_000,
        )
        serializer = StatementSerializer(data=self._payload(
            additions=[{'code': 'vat', 'description': 'ارزش افزوده', 'percent': 10, 'amount': 0, 'mode': 'percent'}],
            deductions=[{'title': 'پیش‌پرداخت', 'percent': 5, 'amount': 0, 'mode': 'percent'}],
        ))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        validated = serializer.validated_data
        self.assertEqual(validated['work_done'], Decimal('3000000'))
        self.assertEqual(validated['additions'][0]['amount'], 300_000.0)
        self.assertEqual(validated['deductions'][0]['amount'], 150_000.0)
        self.assertEqual(validated['additions_total'], Decimal('300000'))
        self.assertEqual(validated['deductions_total'], Decimal('150000'))
        self.assertEqual(validated['net_amount'], Decimal('3150000'))

    def test_reported_amount_is_kept_when_item_is_entered_as_amount(self):
        serializer = StatementSerializer(data=self._payload(
            additions=[{'code': 'other', 'description': 'سایر', 'percent': 10, 'amount': 123_456, 'mode': 'amount'}],
        ))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['additions'][0]['amount'], 123_456.0)
        self.assertEqual(serializer.validated_data['additions_total'], Decimal('123456'))

    def test_amount_cannot_be_less_than_previous_statement(self):
        Statement.objects.create(
            company=self.company, contract=self.contract, number='S-OLD',
            date=date(2025, 7, 1), amount=6_000_000,
        )
        serializer = StatementSerializer(data=self._payload(number='S-NEW', amount=5_000_000))
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_exchange_rate_accepts_six_decimals_and_rejects_zero(self):
        serializer = StatementSerializer(data=self._payload(exchange_rate='2097200.123456'))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['exchange_rate'], Decimal('2097200.123456'))

        invalid = StatementSerializer(data=self._payload(exchange_rate='0'))
        self.assertFalse(invalid.is_valid())
        self.assertIn('exchange_rate', invalid.errors)

    def test_rial_amounts_do_not_accept_fractional_values(self):
        serializer = StatementSerializer(data=self._payload(amount='5000000.5'))
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_date_edit_falls_back_to_registration_order(self):
        first = Statement.objects.create(
            company=self.company, contract=self.contract, number='S-1',
            date=date(2025, 8, 1), amount=2_000_000,
        )
        second = Statement.objects.create(
            company=self.company, contract=self.contract, number='S-2',
            date=date(2025, 9, 1), amount=5_000_000,
        )
        serializer = StatementSerializer(
            second,
            data={'date': '2025-01-01', 'amount': 5_000_000},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['cumulative_previous_amount'], Decimal('2000000'))
        self.assertEqual(serializer.validated_data['work_done'], Decimal('3000000'))

    def test_chain_recalculation_updates_later_statements(self):
        first = Statement.objects.create(
            company=self.company, contract=self.contract, number='S-CHAIN-1',
            date=date(2025, 7, 1), amount=2_000_000,
        )
        second = Statement.objects.create(
            company=self.company, contract=self.contract, number='S-CHAIN-2',
            date=date(2025, 8, 1), amount=5_000_000,
        )
        first.date = date(2025, 1, 1)
        first.save(update_fields=['date'])
        from contracts.statement_totals import recalculate_contract_statements
        recalculate_contract_statements(self.contract)
        second.refresh_from_db()
        self.assertEqual(second.cumulative_previous_amount, Decimal('2000000'))
        self.assertEqual(second.work_done, Decimal('3000000'))

    def test_multi_level_statement_keeps_independent_cumulative_chains(self):
        """سند چند سطحی = صورت‌وضعیت عادی (کارکرد می‌تواند صفر باشد) + سطوح مستقل.

        تیک «شامل اضافات و کسورات» فقط کارکرد همان سطح را به مبنای درصد
        اضافات/کسورات سطح سند اضافه می‌کند؛ محاسبهٔ جداگانه‌ای ندارد.
        """
        first = StatementSerializer(data=self._payload(
            amount=0, number='01', kind='multi',
            additions=[{
                'code': 'vat', 'description': 'ارزش افزوده',
                'percent': 10, 'amount': 0, 'mode': 'percent',
            }],
            levels=[
                {'title': 'خرید', 'amount': 1_000_000, 'includes_charges': True},
                {'title': 'بند الف', 'amount': 500_000},
            ],
        ))
        self.assertTrue(first.is_valid(), first.errors)
        first_row = first.save(company=self.company)
        self.assertEqual(first_row.kind, Statement.Kind.MULTI)
        # تجمعی و کارکرد سطح سند مستقل از سطوح است
        self.assertEqual(first_row.amount, Decimal('0'))
        self.assertEqual(first_row.work_done, Decimal('0'))
        # مبنای VAT = کارکرد سطح اصلی (۰) + سطح تیک‌خورده (۱٬۰۰۰٬۰۰۰)
        self.assertEqual(first_row.additions_total, Decimal('100000'))
        # خالص قابل پرداخت = سطح اصلی + همهٔ سطوح + اضافات − کسورات
        self.assertEqual(first_row.net_amount, Decimal('1600000'))
        levels = {level['title']: level for level in first_row.levels}
        self.assertEqual(levels['خرید']['work'], 1_000_000.0)
        self.assertTrue(levels['خرید']['includes_charges'])
        self.assertEqual(levels['بند الف']['work'], 500_000.0)
        self.assertFalse(levels['بند الف']['includes_charges'])

        second = StatementSerializer(data=self._payload(
            amount=0, number='02', kind='multi', date='2025-09-01',
            additions=[{
                'code': 'vat', 'description': 'ارزش افزوده',
                'percent': 10, 'amount': 0, 'mode': 'percent',
            }],
            levels=[
                {'title': 'خرید', 'amount': 1_600_000, 'includes_charges': True},
                {'title': 'بند الف', 'amount': 900_000},
            ],
        ))
        self.assertTrue(second.is_valid(), second.errors)
        second_row = second.save(company=self.company)

        from contracts.statement_totals import recalculate_contract_statements
        recalculate_contract_statements(self.contract)
        second_row.refresh_from_db()
        self.assertEqual(second_row.cumulative_previous_amount, Decimal('0'))
        self.assertEqual(second_row.work_done, Decimal('0'))
        works = {level['title']: level['work'] for level in second_row.levels}
        self.assertEqual(works['خرید'], 600_000.0)
        self.assertEqual(works['بند الف'], 400_000.0)
        # مبنا فقط کارکرد سطح تیک‌خورده است: ۱۰٪ × ۶۰۰٬۰۰۰
        self.assertEqual(second_row.additions_total, Decimal('60000'))
        # خالص = سطح اصلی (۰) + سطوح (۱٬۰۰۰٬۰۰۰) + اضافات (۶۰٬۰۰۰)
        self.assertEqual(second_row.net_amount, Decimal('1060000'))

    def test_multi_level_splits_additions_and_deductions_bases(self):
        """تیک‌های «شامل اضافات» و «شامل کسورات» مستقل‌اند و مبنای هر کدام جداست."""
        serializer = StatementSerializer(data=self._payload(
            amount=0, number='01', kind='multi',
            additions=[{
                'code': 'vat', 'description': 'ارزش افزوده',
                'percent': 10, 'amount': 0, 'mode': 'percent',
            }],
            deductions=[{
                'title': 'حسن انجام کار', 'percent': 5, 'amount': 0, 'mode': 'percent',
            }],
            levels=[
                {'title': 'خرید', 'amount': 2_000_000,
                 'includes_additions': True, 'includes_deductions': False},
                {'title': 'بند الف', 'amount': 1_000_000,
                 'includes_additions': False, 'includes_deductions': True},
                {'title': 'بند ب', 'amount': 500_000},
            ],
        ))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        row = serializer.save(company=self.company)

        levels = {level['title']: level for level in row.levels}
        self.assertTrue(levels['خرید']['includes_additions'])
        self.assertFalse(levels['خرید']['includes_deductions'])
        self.assertFalse(levels['خرید']['includes_charges'])
        self.assertFalse(levels['بند الف']['includes_additions'])
        self.assertTrue(levels['بند الف']['includes_deductions'])
        self.assertFalse(levels['بند ب']['includes_additions'])
        self.assertFalse(levels['بند ب']['includes_deductions'])

        # مبنای اضافات = سطح اصلی (۰) + «خرید» (۲٬۰۰۰٬۰۰۰) ⇒ ۱۰٪ = ۲۰۰٬۰۰۰
        self.assertEqual(row.additions_total, Decimal('200000'))
        # مبنای کسورات = سطح اصلی (۰) + «بند الف» (۱٬۰۰۰٬۰۰۰) ⇒ ۵٪ = ۵۰٬۰۰۰
        self.assertEqual(row.deductions_total, Decimal('50000'))
        # خالص = کارکرد کل سطوح (۳٬۵۰۰٬۰۰۰) + اضافات − کسورات
        self.assertEqual(row.net_amount, Decimal('3650000'))

    def test_legacy_includes_charges_keeps_both_bases(self):
        """اسناد قدیمی با یک تیک «شامل اضافات و کسورات» هر دو مبنا را شامل می‌شوند."""
        serializer = StatementSerializer(data=self._payload(
            amount=0, number='01', kind='multi',
            additions=[{
                'code': 'vat', 'description': 'ارزش افزوده',
                'percent': 10, 'amount': 0, 'mode': 'percent',
            }],
            deductions=[{
                'title': 'حسن انجام کار', 'percent': 5, 'amount': 0, 'mode': 'percent',
            }],
            levels=[{'title': 'خرید', 'amount': 2_000_000, 'includes_charges': True}],
        ))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        row = serializer.save(company=self.company)
        level = row.levels[0]
        self.assertTrue(level['includes_additions'])
        self.assertTrue(level['includes_deductions'])
        self.assertTrue(level['includes_charges'])
        self.assertEqual(row.additions_total, Decimal('200000'))
        self.assertEqual(row.deductions_total, Decimal('100000'))
        self.assertEqual(row.net_amount, Decimal('2100000'))

    def test_multi_level_adds_own_work_to_level_work(self):
        """کارکرد دورهٔ سند مستقل از سطوح است؛ جمع آن‌ها در مبلغ پرداختی می‌آید."""
        serializer = StatementSerializer(data=self._payload(
            amount=2_000_000, number='01', kind='multi',
            levels=[{'title': 'خرید', 'amount': 1_000_000}],
        ))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        row = serializer.save(company=self.company)
        self.assertEqual(row.amount, Decimal('2000000'))
        self.assertEqual(row.cumulative_previous_amount, Decimal('0'))
        # کارکرد دوره فقط از زنجیرهٔ سطح اصلی (بدون سطوح)
        self.assertEqual(row.work_done, Decimal('2000000'))
        self.assertEqual(row.levels[0]['work'], 1_000_000.0)
        # خالص قابل پرداخت = سطح اصلی + سطوح
        self.assertEqual(row.net_amount, Decimal('3000000'))

    def test_multi_level_blocks_simple_statements_afterwards(self):
        """پس از ثبت سند چند سطحی، سند عادی جدید برای همان قرارداد مجاز نیست."""
        created = StatementSerializer(data=self._payload(
            amount=0, number='01', kind='multi',
            levels=[{'title': 'خرید', 'amount': 400_000}],
        ))
        self.assertTrue(created.is_valid(), created.errors)
        created.save(company=self.company)

        simple = StatementSerializer(data=self._payload(
            amount=5_000_001, number='02', kind='statement',
        ))
        self.assertFalse(simple.is_valid())
        self.assertIn('kind', simple.errors)

    def test_multi_level_rejects_lower_level_cumulative(self):
        created = StatementSerializer(data=self._payload(
            amount=0, number='01', kind='multi',
            levels=[{'title': 'خرید', 'amount': 1_000_000}],
        ))
        self.assertTrue(created.is_valid(), created.errors)
        created.save(company=self.company)

        invalid = StatementSerializer(data=self._payload(
            amount=0, number='02', kind='multi',
            levels=[{'title': 'خرید', 'amount': 900_000}],
        ))
        self.assertFalse(invalid.is_valid())
        self.assertIn('levels', invalid.errors)


class ContractApprovalDecideTests(SimpleTestCase):
    """اقدام «تأیید/رد» مرحلهٔ گردش‌کار قرارداد.

    رگرسیون: پیش‌تر در `ContractApprovalViewSet.decide` فراخوانی `save`/`return` جا افتاده
    بود؛ وضعیت تغییر می‌کرد ولی چیزی ذخیره نمی‌شد و endpoint مقدار None برمی‌گرداند.
    """

    def _decide(self, decision, comment=''):
        from contracts.models import ContractApproval, ContractDraft
        from contracts.views import ContractApprovalViewSet

        approval = ContractApproval(
            step=2, approver='مدیر قراردادها', draft=ContractDraft(title='پیش‌نویس تست'),
        )
        view = ContractApprovalViewSet()
        view.request = SimpleNamespace(data={'decision': decision, 'comment': comment})
        view.kwargs = {'pk': 1}
        view.get_object = lambda: approval  # نمونهٔ ساخته‌شده (بدون کوئری دیتابیس)
        with patch.object(ContractApproval, 'save') as save_mock:
            response = view.decide(view.request, pk=1)
        return approval, response, save_mock

    def test_approve_persists_status_and_returns_payload(self):
        from contracts.models import ContractApproval

        approval, response, save_mock = self._decide('approve', comment='تأیید می‌شود')
        self.assertEqual(approval.status, ContractApproval.Status.APPROVED)
        self.assertEqual(approval.comment, 'تأیید می‌شود')
        self.assertIsNotNone(approval.acted_at)
        save_mock.assert_called_once()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], ContractApproval.Status.APPROVED)
        self.assertEqual(response.data['comment'], 'تأیید می‌شود')

    def test_reject_persists_status_and_returns_payload(self):
        from contracts.models import ContractApproval

        approval, response, save_mock = self._decide('reject')
        self.assertEqual(approval.status, ContractApproval.Status.REJECTED)
        save_mock.assert_called_once()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], ContractApproval.Status.REJECTED)

    def test_invalid_decision_is_rejected_without_saving(self):
        _, response, save_mock = self._decide('maybe')
        save_mock.assert_not_called()
        self.assertEqual(response.status_code, 400)


class ContractSerializerFieldContractTests(SimpleTestCase):
    """قرارداد API: `category`، `project_title` و `disputes` باید وجود داشته باشند و
    `project_name` باید متن مدل و قابل نوشتن باشد (پیش‌تر read_only و map شده به نام پروژه بود).
    """

    def test_declared_fields(self):
        from contracts.serializers import ContractSerializer

        fields = ContractSerializer().fields
        self.assertIn('category', fields)
        self.assertIn('project_title', fields)
        self.assertIn('disputes', fields)
        self.assertFalse(fields['project_name'].read_only)
        self.assertTrue(fields['project_title'].read_only)
        self.assertTrue(fields['disputes'].read_only)

    def test_category_and_project_name_are_writable(self):
        from contracts.serializers import ContractSerializer

        serializer = ContractSerializer(
            data={'category': 'پیمانی', 'project_name': 'فاز ۲ توسعه'}, partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['category'], 'پیمانی')
        self.assertEqual(serializer.validated_data['project_name'], 'فاز ۲ توسعه')


class PaymentAllocationLogicTests(SimpleTestCase):
    """منطق تخصیص پرداخت به چند صورت‌وضعیت/فاکتور و محاسبهٔ مانده (بدون دیتابیس)."""

    @staticmethod
    def _statement(pk=1, contract_id=7):
        return Statement(pk=pk, contract_id=contract_id, amount=10_000_000, net_amount=9_000_000)

    @staticmethod
    def _invoice(pk=2, contract_id=7):
        return Invoice(pk=pk, contract_id=contract_id, amount=4_000_000, total=4_400_000)

    def test_allocation_requires_exactly_one_target(self):
        from rest_framework.serializers import ValidationError
        from contracts.serializers import PaymentSerializer

        with self.assertRaises(ValidationError):
            PaymentSerializer._validate_allocations(
                [{'statement': self._statement(), 'invoice': self._invoice(), 'amount': 1000}], None,
            )
        with self.assertRaises(ValidationError):
            PaymentSerializer._validate_allocations([{'statement': None, 'invoice': None, 'amount': 1000}], None)

    def test_duplicate_and_negative_rows_are_rejected(self):
        from rest_framework.serializers import ValidationError
        from contracts.serializers import PaymentSerializer

        statement = self._statement()
        with self.assertRaises(ValidationError):
            PaymentSerializer._validate_allocations(
                [
                    {'statement': statement, 'invoice': None, 'amount': 100},
                    {'statement': statement, 'invoice': None, 'amount': 200},
                ],
                None,
            )
        with self.assertRaises(ValidationError):
            PaymentSerializer._validate_allocations([{'statement': statement, 'invoice': None, 'amount': -5}], None)

    def test_target_must_belong_to_same_contract(self):
        from rest_framework.serializers import ValidationError
        from contracts.serializers import PaymentSerializer

        contract = SimpleNamespace(pk=7)
        foreign = self._statement(pk=9, contract_id=99)
        with self.assertRaises(ValidationError):
            PaymentSerializer._validate_allocations([{'statement': foreign, 'invoice': None, 'amount': 1}], contract)

    def test_valid_rows_are_cleaned_and_amounts_are_decimal(self):
        from contracts.serializers import PaymentSerializer

        contract = SimpleNamespace(pk=7)
        cleaned = PaymentSerializer._validate_allocations(
            [
                {'statement': self._statement(), 'invoice': None, 'amount': '1500000'},
                {'statement': None, 'invoice': self._invoice(), 'amount': 500000},
            ],
            contract,
        )
        self.assertEqual(len(cleaned), 2)
        self.assertEqual(cleaned[0]['amount'], Decimal('1500000'))
        self.assertEqual(cleaned[0]['statement'].pk, 1)
        self.assertIsNone(cleaned[0]['invoice'])
        self.assertEqual(cleaned[1]['invoice'].pk, 2)

    def test_payable_amounts_fall_back_to_gross_values(self):
        from contracts.serializers import invoice_payable_amount, statement_payable_amount

        self.assertEqual(statement_payable_amount(self._statement()), Decimal('9000000'))
        self.assertEqual(
            statement_payable_amount(Statement(pk=3, contract_id=7, amount=5_000_000, net_amount=0)),
            Decimal('5000000'),
        )
        self.assertEqual(invoice_payable_amount(self._invoice()), Decimal('4400000'))
        self.assertEqual(invoice_payable_amount(Invoice(pk=4, contract_id=7, amount=900, total=0)), Decimal('900'))

    def test_calculated_zero_payable_stays_zero(self):
        """کسر کامل پیش‌پرداخت/علی‌الحساب → قابل پرداخت صفر (نه مبلغ تجمعی)."""
        from contracts.serializers import statement_payable_amount

        fully_deducted = Statement(
            pk=5, contract_id=7, amount=10_000_000, net_amount=0,
            work_done=2_000_000, cumulative_previous_amount=8_000_000,
            deductions=[
                {'title': 'کسر پیش‌پرداخت', 'amount': 1_000_000},
                {'title': 'کسر علی‌الحساب', 'amount': 1_500_000},
            ],
            deductions_total=2_500_000,
        )
        fully_deducted._prefetched_objects_cache = {'payment_allocations': []}
        self.assertEqual(statement_payable_amount(fully_deducted), Decimal('0'))

        from contracts.serializers import StatementSerializer
        serializer = StatementSerializer()
        self.assertEqual(serializer.get_payable_amount(fully_deducted), Decimal('0'))
        self.assertEqual(serializer.get_remaining_amount(fully_deducted), Decimal('0'))
        self.assertEqual(serializer.get_payment_status(fully_deducted), 'paid')

    def test_zero_payable_status_can_be_treated_as_paid(self):
        from contracts.serializers import payment_status_of

        self.assertEqual(payment_status_of(0, 0, zero_payable_is_paid=True), 'paid')
        self.assertEqual(payment_status_of(0, 0), 'unpaid')
        self.assertEqual(payment_status_of(0, 500), 'paid')

    def test_allocated_amount_uses_prefetch_cache(self):
        from contracts.serializers import _allocated_amount

        statement = self._statement()
        statement._prefetched_objects_cache = {
            'payment_allocations': [
                SimpleNamespace(amount=Decimal('1000')),
                SimpleNamespace(amount=Decimal('2500')),
            ],
        }
        self.assertEqual(_allocated_amount(statement), Decimal('3500'))

    def test_serializers_expose_allocation_and_remaining_fields(self):
        from contracts.serializers import InvoiceSerializer, PaymentAllocationSerializer, PaymentSerializer, StatementSerializer

        self.assertIn('allocations', PaymentSerializer().fields)
        self.assertIn('allocated_amount', PaymentSerializer().fields)
        for field in ('kind', 'kind_display'):
            self.assertIn(field, PaymentAllocationSerializer().fields)
        for field in ('payable_amount', 'paid_amount', 'remaining_amount'):
            self.assertIn(field, StatementSerializer().fields)
            self.assertIn(field, InvoiceSerializer().fields)
        for bucket in ('retention', 'insurance'):
            for suffix in ('amount', 'paid_amount', 'remaining_amount'):
                self.assertIn(f'{bucket}_{suffix}', StatementSerializer().fields)

    def test_deductions_are_split_into_retention_and_insurance_buckets(self):
        from contracts.serializers import statement_deduction_amount

        statement = Statement(pk=11, contract_id=7, deductions=[
            {'title': 'حسن انجام کار', 'amount': 5_000_000},
            {'title': 'سپرده حسن انجام كار', 'amount': 1_000_000},
            {'title': 'بیمه', 'amount': 2_000_000},
            {'title': 'مالیات', 'amount': 900_000},
        ])
        self.assertEqual(statement_deduction_amount(statement, 'retention'), Decimal('6000000'))
        self.assertEqual(statement_deduction_amount(statement, 'insurance'), Decimal('2000000'))
        self.assertEqual(statement_deduction_amount(statement, 'net'), Decimal('0'))
        self.assertEqual(statement_deduction_amount(None, 'retention'), Decimal('0'))

    def test_allocation_kind_is_validated(self):
        from rest_framework.serializers import ValidationError
        from contracts.serializers import PaymentSerializer

        statement = self._statement()
        invoice = self._invoice()

        cleaned = PaymentSerializer._validate_allocations(
            [{'statement': statement, 'invoice': None, 'kind': 'retention', 'amount': 10}], None,
        )
        self.assertEqual(cleaned[0]['kind'], 'retention')

        # فاکتور تنها سبد «خالص» دارد.
        invoice_row = PaymentSerializer._validate_allocations(
            [{'statement': None, 'invoice': invoice, 'kind': 'insurance', 'amount': 10}], None,
        )
        self.assertEqual(invoice_row[0]['kind'], 'net')

        with self.assertRaises(ValidationError):
            PaymentSerializer._validate_allocations(
                [{'statement': statement, 'invoice': None, 'kind': 'bogus', 'amount': 1}], None,
            )

    def test_same_statement_allowed_only_in_different_buckets(self):
        from rest_framework.serializers import ValidationError
        from contracts.serializers import PaymentSerializer

        statement = self._statement()
        cleaned = PaymentSerializer._validate_allocations(
            [
                {'statement': statement, 'invoice': None, 'kind': 'net', 'amount': 1000},
                {'statement': statement, 'invoice': None, 'kind': 'retention', 'amount': 200},
                {'statement': statement, 'invoice': None, 'kind': 'insurance', 'amount': 300},
            ],
            None,
        )
        self.assertEqual([row['kind'] for row in cleaned], ['net', 'retention', 'insurance'])
        with self.assertRaises(ValidationError):
            PaymentSerializer._validate_allocations(
                [
                    {'statement': statement, 'invoice': None, 'kind': 'net', 'amount': 1000},
                    {'statement': statement, 'invoice': None, 'amount': 500},
                ],
                None,
            )

    def test_advance_payment_type_clears_allocations(self):
        from contracts.serializers import PaymentSerializer

        serializer = PaymentSerializer(data={'payment_type': Payment.Type.ADVANCE}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['allocations'], [])
        self.assertIsNone(serializer.validated_data['statement'])


class PaymentAllocationExcelTests(SimpleTestCase):
    """خروجی اکسل قرارداد هم باید تقسیم پرداخت بین اسناد/سپرده‌ها را نشان دهد."""

    class _Manager:
        def __init__(self, rows):
            self.rows = rows

        def all(self):
            return self.rows

    def _payment(self, **overrides):
        base = {
            'id': 1, 'amount': 1000, 'statement_id': 5, 'invoice_id': None,
            'allocations': self._Manager([]),
            'payment_type': 'normal', 'reference': 'R-1', 'date': None, 'method': 'حواله', 'note': '',
        }
        base.update(overrides)
        return SimpleNamespace(**base)

    def test_allocations_drive_excel_links(self):
        from contracts.excel_export import _payment_allocations

        payment = self._payment(allocations=self._Manager([
            SimpleNamespace(statement_id=5, invoice_id=None, kind='net', amount=600),
            SimpleNamespace(statement_id=6, invoice_id=None, kind='retention', amount=400),
        ]))
        rows = _payment_allocations(payment)
        self.assertEqual([row['kind'] for row in rows], ['net', 'retention'])
        self.assertEqual([row['id'] for row in rows], [5, 6])
        self.assertEqual(rows[1]['amount'], 400.0)

    def test_legacy_payment_falls_back_to_single_link(self):
        from contracts.excel_export import _payment_allocations

        legacy = self._payment(id=2, amount=700, statement_id=7)
        self.assertEqual(
            _payment_allocations(legacy),
            [{'target': 'statement', 'id': 7, 'kind': 'net', 'amount': 700.0}],
        )

    def test_payment_slots_describe_allocation_split(self):
        from contracts.excel_export import _payment_slots

        payment = self._payment(allocations=self._Manager([
            SimpleNamespace(statement_id=5, invoice_id=None, kind='net', amount=600),
            SimpleNamespace(statement_id=5, invoice_id=None, kind='insurance', amount=400),
        ]))
        bundle = {'payments': [payment], 'invoice_numbers': {}, 'statement_numbers': {5: '05'}}
        slots = _payment_slots(bundle)
        self.assertEqual(len(slots), 1)
        self.assertEqual(slots[0]['amount'], 1000)
        self.assertIn('خالص', slots[0]['linked'])
        self.assertIn('سپرده حق بیمه', slots[0]['linked'])




class PaymentFlowFieldsTests(SimpleTestCase):
    """پویایی پرداخت: وضعیت پرداخت و مبالغ مشتق‌شده در همهٔ خروجی‌ها."""

    def test_serializers_expose_payment_status_fields(self):
        from contracts.serializers import ContractSerializer, InvoiceSerializer

        invoice_fields = InvoiceSerializer().fields
        for name in ('payable_amount', 'paid_amount', 'remaining_amount',
                     'payment_status', 'last_payment_date'):
            self.assertIn(name, invoice_fields)

        statement_fields = StatementSerializer().fields
        for name in ('payable_amount', 'paid_amount', 'remaining_amount',
                     'retention_paid_amount', 'insurance_paid_amount',
                     'payment_status', 'last_payment_date'):
            self.assertIn(name, statement_fields)

        contract_fields = ContractSerializer().fields
        for name in ('total_payable', 'total_paid', 'total_remaining'):
            self.assertIn(name, contract_fields)

    def test_payment_status_transitions(self):
        from contracts.serializers import payment_status_of

        self.assertEqual(payment_status_of(1000, 0), 'unpaid')
        self.assertEqual(payment_status_of(1000, 400), 'partial')
        self.assertEqual(payment_status_of(1000, 1000), 'paid')
        self.assertEqual(payment_status_of(1000, 1500), 'paid')
        self.assertEqual(payment_status_of(0, 0), 'unpaid')

    def test_last_payment_date_uses_allocation_rows(self):
        from contracts.serializers import invoice_last_payment_date

        class FakePayment:
            def __init__(self, date_value):
                self.date = date_value

        class FakeAllocation:
            payment_id = 1

            def __init__(self, date_value):
                self.payment = FakePayment(date_value)

        class FakeInvoice:
            payment_allocations = None

            def __init__(self, rows):
                self._prefetched_objects_cache = {'payment_allocations': rows}

        invoice = FakeInvoice([
            FakeAllocation(date(2026, 2, 10)),
            FakeAllocation(date(2026, 3, 5)),
        ])
        self.assertEqual(invoice_last_payment_date(invoice), '2026-03-05')

        empty = FakeInvoice([])
        self.assertIsNone(invoice_last_payment_date(empty))


    def test_remaining_amount_is_clamped_and_overpayment_is_reported(self):
        from decimal import Decimal
        from types import SimpleNamespace

        from contracts.serializers import InvoiceSerializer, StatementSerializer

        class Row:
            kind = 'net'
            amount = Decimal('1200')

        class FakeInvoice:
            amount = Decimal('1000')
            vat = Decimal('0')
            total = Decimal('1000')
            due_date = None
            is_paid = False
            _prefetched_objects_cache = {'payment_allocations': [Row()]}

        class FakeStatement:
            amount = Decimal('1000')
            net_amount = Decimal('1000')
            deductions = []
            _prefetched_objects_cache = {'payment_allocations': [Row()]}

        invoice_serializer = InvoiceSerializer()
        self.assertEqual(invoice_serializer.get_remaining_amount(FakeInvoice()), 0)
        self.assertEqual(invoice_serializer.get_overpaid_amount(FakeInvoice()), Decimal('200'))
        self.assertEqual(invoice_serializer.get_payment_status(FakeInvoice()), 'paid')

        statement_serializer = StatementSerializer()
        self.assertEqual(statement_serializer.get_remaining_amount(FakeStatement()), 0)
        self.assertEqual(statement_serializer.get_overpaid_amount(FakeStatement()), Decimal('200'))
        self.assertEqual(statement_serializer.get_payment_status(FakeStatement()), 'paid')




class GuaranteeLifecycleTests(SimpleTestCase):
    """ضمانت‌نامهٔ تعهدی، تقلیل و تاریخچهٔ اقدامات تضامین."""

    def test_instrument_types_include_undertaking_guarantee(self):
        from contracts.models import Guarantee

        values = {choice[0] for choice in Guarantee.InstrumentType.choices}
        self.assertIn('bank_guarantee', values)
        self.assertIn('undertaking_guarantee', values)
        labels = dict(Guarantee.InstrumentType.choices)
        self.assertEqual(labels['undertaking_guarantee'], 'ضمانت‌نامه تعهدی')

    def test_release_action_and_reasons_are_available(self):
        from contracts.guarantee_actions import RELEASE_REASONS, compose_release_note, release_reason_label
        from contracts.models import Guarantee, GuaranteeAction

        lifecycle = dict(Guarantee.LifecycleAction.choices)
        self.assertEqual(lifecycle.get('released'), 'آزادسازی')
        self.assertIn('released', {choice[0] for choice in GuaranteeAction.Action.choices})
        self.assertEqual(release_reason_label('advance_settled'), 'تسویه پیش‌پرداخت')
        self.assertEqual(release_reason_label('contract_closed'), 'اختتام قرارداد')
        self.assertIn('advance_settled', RELEASE_REASONS)
        note = compose_release_note('contract_closed', 'پس از صورت‌وضعیت نهایی')
        self.assertIn('اختتام قرارداد', note)
        self.assertIn('پس از صورت‌وضعیت نهایی', note)
        self.assertEqual(compose_release_note(None, ''), '')

    def test_lifecycle_actions_include_reduction(self):
        from contracts.models import Guarantee

        values = {choice[0] for choice in Guarantee.LifecycleAction.choices}
        self.assertIn('extended', values)
        self.assertIn('reduced', values)
        self.assertEqual(dict(Guarantee.LifecycleAction.choices)['reduced'], 'تقلیل')

    def test_guarantee_action_model_has_history_fields(self):
        from contracts.models import GuaranteeAction

        fields = {field.name for field in GuaranteeAction._meta.get_fields()}
        for name in ('guarantee', 'action', 'date', 'previous_amount', 'new_amount',
                     'previous_expiry_date', 'new_expiry_date',
                     'previous_number', 'new_number', 'note'):
            self.assertIn(name, fields)
        self.assertEqual(GuaranteeAction._meta.ordering, ['-date', '-id'])
        action_values = {choice[0] for choice in GuaranteeAction.Action.choices}
        for name in ('registered', 'extended', 'reduced', 'returned', 'executed',
                     'canceled', 'number_changed', 'updated'):
            self.assertIn(name, action_values)

    def test_serializer_exposes_history_and_counts(self):
        from contracts.serializers import GuaranteeActionSerializer, GuaranteeSerializer

        fields = GuaranteeSerializer().fields
        for name in ('actions', 'action_count', 'extension_count', 'reduction_count',
                     'last_extension_date', 'last_reduction_date'):
            self.assertIn(name, fields)

        action_fields = GuaranteeActionSerializer().fields
        for name in ('action', 'action_display', 'previous_amount', 'new_amount',
                     'previous_number', 'new_number', 'date'):
            self.assertIn(name, action_fields)

    def test_reduction_amount_resolution(self):
        from decimal import Decimal

        from contracts.guarantee_actions import GuaranteeActionError, resolve_reduced_amount

        self.assertEqual(resolve_reduced_amount(1000, reduction_amount=250), Decimal('750'))
        self.assertEqual(resolve_reduced_amount(1000, new_amount=400), Decimal('400'))
        self.assertEqual(resolve_reduced_amount('1000', new_amount='0'), Decimal('0'))

        with self.assertRaises(GuaranteeActionError):
            resolve_reduced_amount(1000)
        with self.assertRaises(GuaranteeActionError):
            resolve_reduced_amount(1000, reduction_amount=0)
        with self.assertRaises(GuaranteeActionError):
            resolve_reduced_amount(1000, reduction_amount=1500)
        with self.assertRaises(GuaranteeActionError):
            resolve_reduced_amount(1000, new_amount=1000)
        with self.assertRaises(GuaranteeActionError):
            resolve_reduced_amount(1000, new_amount=-5)
        with self.assertRaises(GuaranteeActionError):
            resolve_reduced_amount(1000, new_amount='abc')

    def test_reduction_is_allowed_for_bank_and_undertaking_guarantees(self):
        from contracts.guarantee_actions import (
            action_expiry_field, action_number_field, supports_extension, supports_reduction,
        )

        for instrument in ('bank_guarantee', 'undertaking_guarantee'):
            self.assertTrue(supports_reduction(instrument))
            self.assertTrue(supports_extension(instrument))
            self.assertEqual(action_number_field(instrument), 'guarantee_number')
            self.assertEqual(action_expiry_field(instrument), 'guarantee_expiry_date')

        self.assertFalse(supports_reduction('check'))
        self.assertEqual(action_number_field('check'), 'check_number')
        self.assertEqual(action_expiry_field('promissory'), 'promissory_due_date')

    def test_viewset_exposes_history_and_lifecycle_actions(self):
        from contracts.views import GuaranteeViewSet

        for name in ('history', 'lifecycle', 'release'):
            self.assertTrue(hasattr(GuaranteeViewSet, name))


class GuaranteeReleaseCoverageTests(SimpleTestCase):
    """آزادسازی تضمین نباید به‌عنوان کمبود پوشش گزارش شود (بدون نیاز به دیتابیس)."""

    class FakeContract:
        amount = 1_000_000_000
        guarantee_type = 'other'
        guarantee_amount = 0
        guarantee_items = [
            {'type': 'advance', 'amount': 200_000_000},
            {'type': 'performance', 'percent': 5},
        ]

    class FakeGuarantee:
        def __init__(self, **kwargs):
            self.id = kwargs.get('id')
            self.contract_guarantee_index = kwargs.get('contract_guarantee_index')
            self.number = kwargs.get('number', '')
            self.guarantee_type = kwargs.get('guarantee_type', 'other')
            self.instrument_type = kwargs.get('instrument_type', 'bank_guarantee')
            self.amount = kwargs.get('amount', 0)
            self.is_released = kwargs.get('is_released', False)
            self.expiry_date = kwargs.get('expiry_date')
            self.issue_date = None
            self.release_date = kwargs.get('release_date')
            self.note = ''
            self.bank = ''

    def test_fully_released_requirement_is_not_a_shortage(self):
        from contracts.guarantee_status import guarantee_compliance

        guarantees = [
            self.FakeGuarantee(id=1, number='AD-1', guarantee_type='advance',
                               amount=200_000_000, is_released=True),
        ]
        result = guarantee_compliance(
            self.FakeContract(), guarantees=guarantees, effective_amount=1_000_000_000,
        )
        advance = next(r for r in result['requirements'] if r['type'] == 'advance')
        self.assertEqual(advance['provided'], 0.0)
        self.assertEqual(advance['released_total'], 200_000_000.0)
        self.assertEqual(advance['fulfilled'], 200_000_000.0)
        self.assertEqual(advance['status'], 'released')
        self.assertEqual(advance['status_label'], 'آزادشده پس از انجام تعهدات')
        self.assertEqual(advance['balance'], 0.0)
        self.assertEqual(advance['coverage_percent'], 100.0)
        self.assertEqual(result['summary']['released_count'], 1)
        # هیچ هشدار کمبودی برای قلم آزادشده («پیش‌پرداخت») نباید صادر شود.
        advance_warnings = [w for w in result["warnings"] if "پیش‌پرداخت" in w]
        self.assertEqual(advance_warnings, [])
        # قلم «حسن انجام کار» هنوز تأمین نشده؛ فقط همان کمبود گزارش می‌شود.
        self.assertEqual(result['summary']['missing_count'], 1)
        self.assertTrue(any('حسن انجام کار' in w for w in result['warnings']))

    def test_partial_release_still_shows_real_shortage(self):
        from contracts.guarantee_status import guarantee_compliance

        guarantees = [
            self.FakeGuarantee(id=2, number='AD-2', guarantee_type='advance', amount=100_000_000),
            self.FakeGuarantee(id=3, number='AD-3', guarantee_type='advance',
                               amount=50_000_000, is_released=True),
        ]
        result = guarantee_compliance(
            self.FakeContract(), guarantees=guarantees, effective_amount=1_000_000_000,
        )
        advance = next(r for r in result['requirements'] if r['type'] == 'advance')
        self.assertEqual(advance['provided'], 100_000_000.0)
        self.assertEqual(advance['released_total'], 50_000_000.0)
        self.assertEqual(advance['status'], 'partial')
        self.assertEqual(advance['balance'], 50_000_000.0)
        self.assertTrue(any('کامل تأمین نشده' in w for w in result['warnings']))


class GuaranteeOverviewTests(SimpleTestCase):
    """نمای کلی پایش تضامین قراردادها (بدون نیاز به دیتابیس)."""

    @staticmethod
    def _compliance():
        return {
            'effective_amount': 1_000_000_000,
            'requirements': [
                {
                    'type': 'advance',
                    'items': [{'is_released': False, 'days_to_expiry': 12, 'expiry_date': '2026-11-15'}],
                },
                {
                    'type': 'performance',
                    'items': [{'is_released': True, 'days_to_expiry': 4, 'expiry_date': '2026-11-07'}],
                },
            ],
            'summary': {
                'required_total': 250_000_000.0,
                'provided_total': 200_000_000.0,
                'fulfilled_total': 200_000_000.0,
                'released_total': 50_000_000.0,
                'balance_total': 50_000_000.0,
                'coverage_percent': 80.0,
                'required_count': 2,
                'provided_count': 1,
                'released_count': 1,
                'partial_count': 1,
                'missing_count': 0,
                'registered_count': 2,
            },
            'warnings': ['تضمین «ضمانت پیش‌پرداخت» کامل تأمین نشده است.'],
        }

    @staticmethod
    def _contract():
        class FakeParty:
            name = 'شرکت پیمانکار'

        class FakeContract:
            id = 7
            number = 'C-MON-1'
            subject = 'قرارداد پایش'
            status = 'active'
            party = FakeParty()

        return FakeContract()

    def test_contract_row_uses_compliance_and_skips_released_for_next_expiry(self):
        from contracts.guarantee_overview import contract_overview_row

        row = contract_overview_row(self._contract(), self._compliance())
        self.assertEqual(row['contract'], 7)
        self.assertEqual(row['contract_number'], 'C-MON-1')
        self.assertEqual(row['party_name'], 'شرکت پیمانکار')
        self.assertEqual(row['required_total'], 250_000_000.0)
        self.assertEqual(row['provided_total'], 200_000_000.0)
        self.assertEqual(row['released_total'], 50_000_000.0)
        self.assertEqual(row['balance_total'], 50_000_000.0)
        self.assertEqual(row['coverage_percent'], 80.0)
        self.assertEqual(row['guarantee_count'], 2)
        self.assertEqual(row['warnings_count'], 1)
        # نزدیک‌ترین سررسید فقط از تضامین آزادنشده گرفته می‌شود.
        self.assertEqual(row['next_expiry'], '2026-11-15')
        self.assertEqual(row['next_expiry_days'], 12)

    def test_summary_aggregates_contracts_and_flags(self):
        from contracts.guarantee_overview import contract_overview_row, summarize

        row = contract_overview_row(self._contract(), self._compliance())
        totals = summarize([row])
        self.assertEqual(totals['contracts'], 1)
        self.assertEqual(totals['guarantees'], 2)
        self.assertEqual(totals['required_total'], 250_000_000.0)
        self.assertEqual(totals['fulfilled_total'], 200_000_000.0)
        self.assertEqual(totals['balance_total'], 50_000_000.0)
        self.assertEqual(totals['coverage_percent'], 80.0)
        self.assertEqual(totals['partial_contracts'], 1)
        self.assertEqual(totals['expiring_30'], 1)
        self.assertEqual(totals['missing_contracts'], 0)

    def test_summary_marks_expired_and_missing_contracts(self):
        from contracts.guarantee_overview import summarize

        rows = [
            {'next_expiry_days': -3, 'missing_count': 1, 'required_count': 2, 'guarantee_count': 1,
             'required_total': 100.0, 'fulfilled_total': 40.0, 'balance_total': 60.0},
            {'next_expiry_days': 90, 'partial_count': 0, 'missing_count': 0, 'required_count': 1,
             'guarantee_count': 2, 'required_total': 100.0, 'fulfilled_total': 100.0,
             'balance_total': 0.0},
        ]
        totals = summarize(rows)
        self.assertEqual(totals['expired'], 1)
        self.assertEqual(totals['expiring_30'], 0)
        self.assertEqual(totals['missing_contracts'], 1)
        self.assertEqual(totals['covered_contracts'], 1)
        self.assertEqual(totals['coverage_percent'], 70.0)

    def test_guarantee_serializer_exposes_contract_context(self):
        from contracts.serializers import GuaranteeSerializer

        fields = GuaranteeSerializer().fields
        for name in ('contract_number', 'contract_party', 'contract_status_display'):
            self.assertIn(name, fields)

    def test_overview_endpoint_is_registered(self):
        from contracts.views import ContractViewSet

        self.assertTrue(hasattr(ContractViewSet, 'guarantees_overview'))


