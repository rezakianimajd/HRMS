"""تست‌های خزانه‌داری (بدون دیتابیس — SimpleTestCase).

پوشش: مبلغ به حروف، شماره‌گذاری اسناد، کنترل‌های عملیاتی، توکن اعتبارسنجی
فیش، و قرارداد مدل/سریال‌ایزر برای Master Data و اسناد.
"""
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from treasury.amount_words import amount_in_words, integer_to_words


class AmountInWordsTests(SimpleTestCase):
    """مبلغ به حروف فارسی (§14)."""

    def test_zero_and_small_numbers(self):
        self.assertEqual(integer_to_words(0), 'صفر')
        self.assertEqual(integer_to_words(7), 'هفت')
        self.assertEqual(integer_to_words(13), 'سیزده')
        self.assertEqual(integer_to_words(40), 'چهل')
        self.assertEqual(integer_to_words(105), 'یکصد و پنج')

    def test_billion_rial_amount(self):
        self.assertEqual(
            amount_in_words(1250000000),
            'یک میلیارد و دویست و پنجاه میلیون ریال',
        )

    def test_thousand_with_unit(self):
        self.assertEqual(amount_in_words(1050, unit='دلار'), 'یک هزار و پنجاه دلار')

    def test_fraction_uses_second_unit(self):
        self.assertEqual(
            amount_in_words('1234.50'),
            'یک هزار و دویست و سی و چهار ریال و پنجاه دینار',
        )

    def test_negative_amount(self):
        self.assertTrue(amount_in_words(-2500).startswith('منفی '))

    def test_string_with_separators(self):
        self.assertEqual(amount_in_words('2,000,000'), 'دو میلیون ریال')


class TreasuryNumberingTests(SimpleTestCase):
    """شماره‌گذاری اسناد خزانه (§15)."""

    def test_render_number_uses_prefix_year_and_padding(self):
        from treasury.numbering import render_number

        self.assertEqual(render_number('RC', 7, year=1405), 'RC-1405-000007')
        self.assertEqual(render_number('PY', 12, year=1404, padding=3), 'PY-1404-012')
        self.assertEqual(render_number('TR', 1, year=1405, separator='/'), 'TR/1405/000001')

    def test_render_number_without_year(self):
        from treasury.numbering import render_number

        self.assertEqual(
            render_number('RC', 5, year=1405, include_year=False), 'RC-000005',
        )

    def test_number_stem_matches_settings(self):
        from treasury.numbering import number_stem

        self.assertEqual(number_stem('RC', year=1404), 'RC-1404-')
        self.assertEqual(number_stem('RC', year=1404, separator='/'), 'RC/1404/')
        self.assertEqual(number_stem('RC', year=1404, include_year=False), 'RC-')

    def test_jalali_year_of_gregorian_date(self):
        from treasury.numbering import jalali_year

        self.assertEqual(jalali_year(date(2025, 10, 11)), 1404)

    def test_default_setting_prefixes_and_padding(self):
        from treasury.numbering import DOC_KINDS, TreasuryNumberingSetting

        setting = TreasuryNumberingSetting()
        self.assertEqual(setting.prefix_for('receipt'), 'RC')
        self.assertEqual(setting.prefix_for('payment'), 'PY')
        self.assertEqual(setting.prefix_for('transfer'), 'TR')
        self.assertEqual(setting.prefix_for('request'), 'PR')
        self.assertEqual(setting.prefix_for('order'), 'PO')
        self.assertEqual(setting.padding, 6)
        self.assertEqual(set(setting.summary['prefixes']), set(DOC_KINDS))


class TreasuryGuardTests(SimpleTestCase):
    """کنترل‌های جلوگیری از خطا (§39)."""

    def test_amount_must_be_positive(self):
        from treasury.guards import ensure_amount

        self.assertEqual(ensure_amount('1,000'), Decimal('1000'))
        for value in (0, '0', None, -5):
            with self.assertRaises(ValidationError):
                ensure_amount(value)

    def test_party_is_required(self):
        from treasury.guards import ensure_party

        with self.assertRaises(ValidationError):
            ensure_party('', None)
        self.assertTrue(ensure_party('', 'آقای احمدی'))

    def test_foreign_currency_needs_exchange_rate(self):
        from treasury.guards import ensure_currency

        self.assertEqual(ensure_currency('IRR', 1), Decimal('1'))
        with self.assertRaises(ValidationError):
            ensure_currency('USD', 0)
        self.assertEqual(ensure_currency('USD', 250000), Decimal('250000'))

    def test_entity_direction_rules(self):
        from treasury.guards import ensure_entity_direction

        entity = SimpleNamespace(is_active=True, allow_receipt=True, allow_payment=False)
        self.assertTrue(ensure_entity_direction(entity, 'receipt'))
        with self.assertRaises(ValidationError):
            ensure_entity_direction(entity, 'payment')
        with self.assertRaises(ValidationError):
            ensure_entity_direction(None, 'receipt')
        inactive = SimpleNamespace(is_active=False)
        with self.assertRaises(ValidationError):
            ensure_entity_direction(inactive, 'receipt')

    def test_balance_policy_matrix(self):
        from treasury.guards import balance_decision

        blocked = balance_decision(100, 150, policy='block')
        self.assertTrue(blocked['blocked'])
        self.assertFalse(blocked['warn'])
        self.assertEqual(blocked['shortfall'], Decimal('50'))

        warned = balance_decision(100, 150, policy='warn')
        self.assertFalse(warned['blocked'])
        self.assertTrue(warned['warn'])

        approved = balance_decision(100, 150, policy='approve')
        self.assertFalse(approved['blocked'])
        self.assertTrue(approved['warn'])

        fine = balance_decision(200, 150, policy='block')
        self.assertFalse(fine['blocked'])
        self.assertFalse(fine['warn'])

    def test_min_balance_reduces_available_funds(self):
        from treasury.guards import balance_decision

        decision = balance_decision(1000, 950, policy='block', min_balance=100)
        self.assertTrue(decision['blocked'])
        self.assertEqual(decision['available'], Decimal('900'))

    def test_payment_limit(self):
        from treasury.guards import ensure_payment_limit

        entity = SimpleNamespace(payment_limit=Decimal('1000000'))
        self.assertTrue(ensure_payment_limit(entity, 500000))
        with self.assertRaises(ValidationError):
            ensure_payment_limit(entity, 1500000)
        self.assertTrue(ensure_payment_limit(SimpleNamespace(payment_limit=None), 10 ** 12))

    def test_duplicate_helpers_skip_without_company(self):
        from treasury.guards import ensure_unique_check_number, ensure_unique_reference

        self.assertTrue(ensure_unique_reference(None, object, '123'))
        self.assertTrue(ensure_unique_check_number(None, object, '123'))



def fake_receipt(**overrides):
    data = {
        'pk': 12,
        'number': 'RC-1405-000012',
        'company_id': 1,
        'amount': Decimal('2500000'),
        'currency': 'IRR',
        'exchange_rate': Decimal('1'),
        'received_date': date(2025, 10, 11),
        'received_time': None,
        'received_from': 'آقای احمدی',
        'purpose': 'فروش خدمات',
        'description': 'دریافت بخشی از مطالبات',
        'reference_no': 'REF-1',
        'tracking_no': 'TRK-9',
        'bank_reference': '',
        'party': None,
        'terminal': None,
        'received_check': None,
        'project': None,
        'contract': None,
        'payment_method': None,
        'entity': SimpleNamespace(
            code='101', name='بانک ملت', is_cash=False, bank=SimpleNamespace(name='بانک ملت'),
            branch_name='مرکزی', branch_code='001', account_number='1234567890',
            sheba_number='IR000000000000000000000000', card_number='', currency='IRR',
        ),
        'company': SimpleNamespace(name='شرکت آزمون', code='T1', phone='', address=''),
    }
    data.update(overrides)
    obj = SimpleNamespace(**data)
    obj.get_method_display = lambda: 'نقدی'
    obj.get_status_display = lambda: 'دریافت‌شده'
    return obj


class TreasuryVoucherTests(SimpleTestCase):
    """فیش دریافت/پرداخت: توکن اعتبارسنجی، مبلغ به حروف و ساختار چاپ."""

    def test_signed_token_round_trip(self):
        from treasury.vouchers import sign_voucher, verify_voucher

        receipt = fake_receipt()
        token = sign_voucher('receipt', receipt)
        payload = verify_voucher(token)
        self.assertEqual(payload['k'], 'receipt')
        self.assertEqual(payload['i'], 12)
        self.assertEqual(payload['n'], 'RC-1405-000012')

    def test_tampered_token_is_rejected(self):
        from treasury.vouchers import sign_voucher, verify_voucher

        token = sign_voucher('receipt', fake_receipt())
        with self.assertRaises(Exception):
            verify_voucher(token + 'x')

    def test_verification_block_contains_code_and_url(self):
        from treasury.vouchers import build_verification

        verification = build_verification('receipt', fake_receipt())
        self.assertEqual(verification['code'], 'RECEIPT-RC-1405-000012')
        self.assertTrue(verification['url'].startswith('/treasury/verify?token='))
        self.assertTrue(verification['token'])

    def test_receipt_voucher_payload(self):
        from treasury.vouchers import build_receipt_voucher

        voucher = build_receipt_voucher(fake_receipt())
        self.assertEqual(voucher['title'], 'فیش دریافت وجه')
        self.assertEqual(voucher['number'], 'RC-1405-000012')
        self.assertEqual(voucher['amount_words'], 'دو میلیون و پانصد هزار ریال')
        self.assertEqual(voucher['received_from'], 'آقای احمدی')
        self.assertEqual(voucher['account']['bank_name'], 'بانک ملت')
        self.assertEqual(voucher['date'], '۱۴۰۴/۰۷/۱۹')
        self.assertTrue(voucher['verification']['token'])
        self.assertIn('معتبر است', voucher['footer'])
        self.assertEqual(len(voucher['signatures']), 4)

    def test_payment_voucher_payload(self):
        from treasury.vouchers import build_payment_voucher

        request_obj = SimpleNamespace(
            number='PR-1405-000003', title='پرداخت صورت‌وضعیت ۲',
            description='تسویه پیمانکار', party=SimpleNamespace(name='شرکت پیمانکار'),
            project=SimpleNamespace(name='پروژه الف'), contract=SimpleNamespace(subject='قرارداد ۱'),
        )
        order = SimpleNamespace(
            pk=7, number='PY-1405-000007', company_id=1, amount=Decimal('15000000'),
            currency='IRR', exchange_rate=Decimal('1'),
            execution_date=date(2025, 10, 12), request=request_obj,
            entity=None, payment_method=None, issued_check=None, reference='R-1',
            tracking_number='T-1', bank_reference='', accounting_document=None,
            company=SimpleNamespace(name='شرکت آزمون', code='T1', phone='', address=''),
            get_instrument_display=lambda: 'انتقال بانکی',
            get_status_display=lambda: 'اجراشده',
        )
        voucher = build_payment_voucher(order)
        self.assertEqual(voucher['title'], 'فیش پرداخت وجه')
        self.assertEqual(voucher['beneficiary'], 'شرکت پیمانکار')
        self.assertEqual(voucher['request_number'], 'PR-1405-000003')
        self.assertEqual(voucher['amount_words'], 'پانزده میلیون ریال')
        self.assertEqual(voucher['instrument']['tracking_no'], 'T-1')



class TreasuryModelContractTests(SimpleTestCase):
    """قرارداد مدل/سریال‌ایزر: Master Data، روش‌ها، فیش و چرخهٔ چک."""

    def test_master_data_models_exist(self):
        from treasury.models import Bank, BankBranch, POSTerminal, TreasuryNumberingSetting

        for model in (Bank, BankBranch, POSTerminal, TreasuryNumberingSetting):
            self.assertTrue(model._meta.db_table)
        bank_fields = {field.name for field in Bank._meta.get_fields()}
        for name in ('name', 'name_en', 'code', 'swift_code', 'is_active', 'sort_order'):
            self.assertIn(name, bank_fields)
        terminal_fields = {field.name for field in POSTerminal._meta.get_fields()}
        for name in ('terminal_number', 'merchant_number', 'entity', 'bank', 'project', 'cost_center'):
            self.assertIn(name, terminal_fields)

    def test_entity_has_account_and_policy_fields(self):
        from treasury.models import TreasuryEntity

        field_names = {field.name for field in TreasuryEntity._meta.get_fields()}
        for name in ('bank', 'branch', 'card_number', 'account_type', 'currency', 'opened_on',
                     'allow_receipt', 'allow_payment', 'allow_transfer', 'payment_limit',
                     'min_balance', 'max_balance', 'negative_balance_policy', 'responsible'):
            self.assertIn(name, field_names)
        self.assertEqual(
            TreasuryEntity._meta.get_field('negative_balance_policy').default, 'block',
        )
        self.assertEqual(
            TreasuryEntity._meta.get_field('currency').default, 'IRR',
        )
        self.assertIn('IRR', TreasuryEntity.Currency.values)

    def test_payment_method_requirements(self):
        from treasury.payment_models import TreasuryPaymentMethod

        method = TreasuryPaymentMethod(code='CHEQUE', requires_cheque=True)
        requirements = method.requirements
        self.assertTrue(requirements['cheque'])
        self.assertFalse(requirements['card'])
        self.assertEqual(
            set(requirements),
            {'bank', 'cheque', 'card', 'terminal', 'reference', 'tracking', 'foreign_currency'},
        )
        self.assertIn('receipt', TreasuryPaymentMethod.Category.values)

    def test_receipt_supports_all_payment_methods(self):
        from treasury.operation_models import Receipt

        values = dict(Receipt.Method.choices)
        for key in ('cash', 'bank', 'transfer', 'internal_transfer', 'cheque',
                    'guarantee_cheque', 'card_to_card', 'pos', 'draft',
                    'foreign_currency', 'other'):
            self.assertIn(key, values)
        field_names = {field.name for field in Receipt._meta.get_fields()}
        for name in ('payment_method', 'terminal', 'reference_no', 'tracking_no',
                     'bank_reference', 'currency', 'exchange_rate', 'purpose',
                     'project', 'contract', 'cost_center', 'accounting_document',
                     'received_time'):
            self.assertIn(name, field_names)

    def test_check_lifecycle_statuses(self):
        from treasury.models import IssuedCheck, ReceivedCheck

        received = set(ReceivedCheck.Status.values)
        for key in ('registered', 'in_custody', 'deposited', 'clearing', 'cleared',
                    'bounced', 'returned_to_customer', 'transferred', 'guarantee_held',
                    'cancelled'):
            self.assertIn(key, received)
        issued = set(IssuedCheck.Status.values)
        for key in ('draft', 'issued', 'delivered', 'cleared', 'bounced', 'returned',
                    'cancelled'):
            self.assertIn(key, issued)

    def test_payment_order_has_treasury_references(self):
        from treasury.payment_models import PaymentOrder

        field_names = {field.name for field in PaymentOrder._meta.get_fields()}
        for name in ('payment_method', 'tracking_number', 'bank_reference',
                     'currency', 'exchange_rate', 'accounting_document', 'printed_at'):
            self.assertIn(name, field_names)

    def test_serializers_expose_new_fields(self):
        from treasury.operation_serializers import ReceiptSerializer
        from treasury.payment_serializers import (
            PaymentOrderSerializer, TreasuryPaymentMethodSerializer,
        )
        from treasury.serializers import (
            IssuedCheckSerializer, ReceivedCheckSerializer, TreasuryEntitySerializer,
        )

        receipt_fields = ReceiptSerializer().fields
        for name in ('amount_base', 'accounting_document_number', 'payment_method_name',
                     'terminal_number', 'received_from', 'entity_code'):
            self.assertIn(name, receipt_fields)

        order_fields = PaymentOrderSerializer().fields
        for name in ('beneficiary_name', 'accounting_document_number', 'tracking_number'):
            self.assertIn(name, order_fields)

        self.assertIn('requirements', TreasuryPaymentMethodSerializer().fields)
        for serializer in (ReceivedCheckSerializer, IssuedCheckSerializer):
            self.assertIn('is_open', serializer().fields)
        self.assertIn('is_cash', TreasuryEntitySerializer().fields)

    def test_treasury_permissions_are_registered(self):
        from core.engines.permission_engine import ALL_PERMISSIONS

        for permission in ('treasury_view', 'treasury_request', 'treasury_execute',
                           'treasury_approve', 'treasury_manage_config'):
            self.assertIn(permission, ALL_PERMISSIONS)



class BarcodeTests(SimpleTestCase):
    """بارکد اعتبارسنجی Code 39 (§۱۱/§۳۳)."""

    def test_encodable_and_cleaning(self):
        from treasury.barcode import is_encodable

        self.assertTrue(is_encodable('RC-1405-000001'))
        self.assertTrue(is_encodable('rc 1405'))  # حروف کوچک → بزرگ
        self.assertFalse(is_encodable(''))
        self.assertFalse(is_encodable('فارسی'))

    def test_svg_structure(self):
        from treasury.barcode import barcode_svg

        svg = barcode_svg('RC-1405-000001')
        self.assertTrue(svg.startswith('<svg'))
        self.assertIn('<rect', svg)
        self.assertIn('RC-1405-000001', svg)
        self.assertEqual(barcode_svg(''), '')

    def test_data_uri(self):
        from treasury.barcode import barcode_data_uri

        uri = barcode_data_uri('PY-1405-000002')
        self.assertTrue(uri.startswith('data:image/svg+xml;base64,'))


class IbanTests(SimpleTestCase):
    """اعتبارسنجی شبا (mod 97) و تشخیص بانک."""

    @staticmethod
    def _build_iban(bank_code='057', account='1234567890123456789'):
        bban = f'{bank_code}{account}'
        check = 98 - (int(bban + '182700') % 97)
        return f'IR{check:02d}{bban}'

    def test_valid_iban_round_trip(self):
        from treasury.iban import is_valid, normalize

        iban = self._build_iban()
        self.assertEqual(len(normalize(iban)), 26)
        self.assertTrue(is_valid(iban))

    def test_invalid_iban_is_rejected(self):
        from treasury.iban import is_valid

        iban = self._build_iban()
        broken = iban[:10] + ('0' if iban[10] != '0' else '1') + iban[11:]
        self.assertFalse(is_valid(broken))
        self.assertFalse(is_valid('IR000000000000000000000000'))
        self.assertFalse(is_valid(''))

    def test_bank_code_and_name(self):
        from treasury.iban import bank_code, bank_name

        iban = self._build_iban('057')
        self.assertEqual(bank_code(iban), '057')
        self.assertEqual(bank_name(iban), 'بانک پاسارگاد')
        self.assertEqual(
            bank_name(iban, [{'code': '057', 'name': 'بانک تست'}]),
            'بانک تست',
        )

    def test_pretty_format(self):
        from treasury.iban import format_pretty

        self.assertEqual(
            format_pretty('IR123456789012345678901234'),
            'IR12 3456 7890 1234 5678 9012 34',
        )


class PrintTemplateTests(SimpleTestCase):
    """قالب چاپ با جای‌نگهدار و درج امن مقادیر."""

    def _payload(self):
        return {
            'number': 'RC-1405-000009',
            'date': '۱۴۰۵/۰۸/۱۶',
            'amount': '2,500,000',
            'amount_words': 'دو میلیون و پانصد هزار ریال',
            'received_from': '<script>alert(1)</script>',
            'company': {'name': 'شرکت آزمون', 'code': 'T1'},
            'account': {'name': 'بانک ملت', 'account_number': '123'},
            'verification': {'code': 'RECEIPT-RC-1405-000009', 'url': '/verify'},
        }

    def test_render_substitutes_and_escapes(self):
        from types import SimpleNamespace

        from treasury.print_templates import build_context, render_template

        template = SimpleNamespace(body='<b>{{number}}</b> — {{received_from}} — {{amount_words}}')
        html = render_template(template, build_context(self._payload()))
        self.assertIn('RC-1405-000009', html)
        self.assertIn('دو میلیون و پانصد هزار ریال', html)
        self.assertNotIn('<script>', html)  # مقادیر escape می‌شوند

    def test_barcode_slot_is_raw(self):
        from types import SimpleNamespace

        from treasury.print_templates import build_context, render_template

        template = SimpleNamespace(body='{{barcode}}')
        html = render_template(template, build_context(self._payload()))
        self.assertIn('<svg', html)

    def test_placeholders_include_common_keys(self):
        from treasury.print_templates import placeholders_for

        keys = {row['key'] for row in placeholders_for('receipt')}
        for key in ('company_name', 'number', 'amount_words', 'barcode', 'received_from'):
            self.assertIn(key, keys)



class DeductionMathTests(SimpleTestCase):
    """محاسبهٔ مبلغ خالص پرداخت با کسورات (§۲۰)."""

    @staticmethod
    def _request(rows, amount='1000000', approved=None):
        from treasury.payment_models import PaymentRequest

        class FakeManager:
            def __init__(self, items):
                self.items = items

            def all(self):
                return self.items

        obj = SimpleNamespace(
            amount=Decimal(amount),
            approved_amount=Decimal(approved) if approved else None,
            deductions=FakeManager(rows),
        )
        obj.deductions_total = PaymentRequest.deductions_total.fget(obj)
        obj.net_amount = PaymentRequest.net_amount.fget(obj)
        return obj

    def test_net_amount_with_deductions(self):
        rows = [
            SimpleNamespace(kind='tax', amount=Decimal('100000')),
            SimpleNamespace(kind='insurance', amount=Decimal('50000')),
        ]
        obj = self._request(rows)
        self.assertEqual(obj.deductions_total, Decimal('150000'))
        self.assertEqual(obj.net_amount, Decimal('850000'))

    def test_net_amount_never_negative(self):
        obj = self._request([SimpleNamespace(kind='tax', amount=Decimal('2000000'))])
        self.assertEqual(obj.net_amount, Decimal('0'))


class ApprovalRuleTests(SimpleTestCase):
    """قواعد سطح تأیید بر اساس مبلغ (§۱۰)."""

    def test_rule_covers_ranges(self):
        from treasury.approval_models import TreasuryApprovalRule

        rule = TreasuryApprovalRule(
            min_amount=Decimal('100000000'), max_amount=Decimal('1000000000'),
        )
        self.assertFalse(rule.covers(Decimal('99999999')))
        self.assertTrue(rule.covers(Decimal('100000000')))
        self.assertTrue(rule.covers(Decimal('1000000000')))
        self.assertFalse(rule.covers(Decimal('1000000001')))

    def test_open_ended_rule(self):
        from treasury.approval_models import TreasuryApprovalRule

        rule = TreasuryApprovalRule(min_amount=Decimal('0'), max_amount=None)
        self.assertTrue(rule.covers(Decimal('9999999999999')))



class ReconciliationMatchTests(SimpleTestCase):
    """تطبیق خودکار گردش بانک با تراکنش‌ها (§۲۶)."""

    @staticmethod
    def _line(**kwargs):
        data = {
            'pk': 1, 'amount': Decimal('5000000'), 'direction': 'credit',
            'date': date(2025, 10, 11), 'reference': 'REF-1', 'entity_id': 3,
        }
        data.update(kwargs)
        return SimpleNamespace(**data)

    @staticmethod
    def _tx(**kwargs):
        data = {
            'pk': 10, 'amount': Decimal('5000000'), 'direction': 'receipt',
            'date': date(2025, 10, 11), 'reference_no': 'REF-1',
            'tracking_no': '', 'entity_id': 3,
        }
        data.update(kwargs)
        return SimpleNamespace(**data)

    def test_reference_and_same_day_scores_high(self):
        from treasury.reconciliation_service import match_score

        score = match_score(self._line(), self._tx())
        self.assertIsNotNone(score)
        self.assertGreaterEqual(score, 70)

    def test_direction_must_match(self):
        from treasury.reconciliation_service import match_score

        self.assertIsNone(match_score(self._line(), self._tx(direction='payment')))

    def test_amount_must_match(self):
        from treasury.reconciliation_service import match_score

        self.assertIsNone(match_score(self._line(), self._tx(amount=Decimal('1'))))

    def test_date_tolerance(self):
        from treasury.reconciliation_service import match_score

        self.assertIsNone(match_score(self._line(), self._tx(date=date(2025, 10, 30))))
        self.assertIsNotNone(
            match_score(self._line(), self._tx(date=date(2025, 10, 13)), day_tolerance=3),
        )

    def test_auto_match_does_not_reuse_transaction(self):
        from treasury.reconciliation_service import auto_match

        lines = [self._line(pk=1), self._line(pk=2, reference='X')]
        matches = auto_match(lines, [self._tx(pk=10)])
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0][1].pk, 10)


class NewModelContractTests(SimpleTestCase):
    """قرارداد مدل‌های جدید: دستور بین‌بانکی، مغایرت، قالب چاپ، کسورات."""

    def test_bank_payment_order_fields(self):
        from treasury.models import BankPaymentOrder

        names = {field.name for field in BankPaymentOrder._meta.get_fields()}
        for name in ('number', 'transfer_type', 'source_entity', 'source_iban',
                     'destination_iban', 'destination_bank_name', 'amount',
                     'cheque_number', 'status', 'company_national_id', 'customer_number'):
            self.assertIn(name, names)
        self.assertEqual(set(BankPaymentOrder.TransferType.values), {'satna', 'paya'})

    def test_statement_line_statuses(self):
        from treasury.models import TreasuryStatementLine

        self.assertEqual(
            set(TreasuryStatementLine.Status.values),
            {'unmatched', 'matched', 'partial', 'ignored', 'adjusted'},
        )

    def test_print_template_kinds_cover_documents(self):
        from treasury.models import TreasuryPrintTemplate
        from treasury.numbering import DOC_KINDS

        kinds = {row[0] for row in TreasuryPrintTemplate._meta.get_field('kind').choices}
        for kind in ('receipt', 'payment', 'bank_order'):
            self.assertIn(kind, kinds)
        self.assertIn('bank_order', DOC_KINDS)

    def test_transaction_voucher_fields(self):
        from treasury.models import TreasuryTransaction

        names = {field.name for field in TreasuryTransaction._meta.get_fields()}
        for name in ('instrument_kind', 'cheque_number', 'cheque_due_date', 'is_guarantee',
                     'party_national_id', 'invoice_number', 'invoice_date',
                     'invoice_amount', 'debit_account'):
            self.assertIn(name, names)
        self.assertIn('sheba', TreasuryTransaction.InstrumentKind.values)

    def test_payment_deduction_kinds(self):
        from treasury.models import PaymentDeduction

        self.assertEqual(
            set(PaymentDeduction.Kind.values),
            {'tax', 'insurance', 'retention', 'deposit', 'advance', 'other'},
        )

