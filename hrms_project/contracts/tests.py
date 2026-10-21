"""تست خروجی اکسل جامع قراردادها (اجرا روی سرور با PostgreSQL)."""
from datetime import date
from decimal import Decimal

from django.test import TestCase

from contracts.excel_export import build_contracts_workbook
from contracts.models import Addendum, Contract, ContractParty, Guarantee, Invoice, Payment, Statement
from contracts.serializers import StatementSerializer
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
        self.assertEqual(data['اضافهٔ صورت‌وضعیت 1 — عنوان'], 'اضافه: ارزش افزوده')
        self.assertEqual(data['کسور صورت‌وضعیت 1 — عنوان'], 'کسور: بیمه')
        self.assertEqual(data['پرداخت 1 — مبلغ'], 980_000.0)
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

    def test_released_guarantee_does_not_count_as_coverage(self):
        from contracts.guarantee_status import guarantee_compliance

        self._guarantee(guarantee_type='advance', amount=200_000_000, is_released=True,
                        number='AD-0')
        result = guarantee_compliance(self.contract)
        advance = next(r for r in result['requirements'] if r['type'] == 'advance')
        self.assertEqual(advance['provided'], 0.0)
        self.assertEqual(advance['released_total'], 200_000_000.0)
        self.assertEqual(advance['status'], 'missing')
        self.assertEqual(advance['released_count'], 1)
        self.assertEqual(result['summary']['provided_total'], 0.0)

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
