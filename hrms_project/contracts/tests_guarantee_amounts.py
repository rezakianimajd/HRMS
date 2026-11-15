"""تست‌های خالص محاسبهٔ معادل ریالی تضمین قرارداد (بدون دیتابیس)."""
from types import SimpleNamespace

from django.test import SimpleTestCase

from contracts import guarantee_amounts as amounts


class GuaranteeAmountTests(SimpleTestCase):
    def test_rial_guarantee_uses_its_amount(self):
        self.assertEqual(amounts.guarantee_rial_amount(1000, None, None, None), 1000)
        euro = SimpleNamespace(code='EUR', name='یورو', symbol='€')
        self.assertEqual(amounts.guarantee_rial_amount(1000, 1, None, 'ریال'), 1000)
        self.assertFalse(amounts.currency_is_rial(euro))

    def test_currency_is_rial_detects_codes_and_names(self):
        self.assertTrue(amounts.currency_is_rial(None))
        self.assertTrue(amounts.currency_is_rial('IRR'))
        self.assertTrue(amounts.currency_is_rial('ریال'))
        self.assertTrue(amounts.currency_is_rial(
            SimpleNamespace(code='IRR', name='ریال', symbol='﷼'),
        ))
        self.assertFalse(amounts.currency_is_rial('USD'))
        self.assertFalse(amounts.currency_is_rial(
            SimpleNamespace(code='EUR', name='یورو', symbol='€'),
        ))

    def test_foreign_amount_converts_with_rate(self):
        euro = SimpleNamespace(code='EUR', name='یورو', symbol='€')
        self.assertEqual(
            amounts.guarantee_rial_amount(1500, 920000, None, euro),
            1380000000,
        )
        self.assertEqual(
            amounts.guarantee_rial_amount('2', '100.5', None, euro), 201,
        )

    def test_explicit_rial_amount_wins(self):
        euro = SimpleNamespace(code='EUR', name='یورو', symbol='€')
        self.assertEqual(
            amounts.guarantee_rial_amount(1500, 920000, 1000000, euro), 1000000,
        )

    def test_foreign_without_rate_is_unknown(self):
        euro = SimpleNamespace(code='EUR', name='یورو', symbol='€')
        self.assertIsNone(amounts.guarantee_rial_amount(1500, None, None, euro))
        self.assertIsNone(amounts.guarantee_rial_amount(1500, 0, None, euro))

    def test_invalid_values_are_zero(self):
        self.assertEqual(amounts.round_rial(None), 0)
        self.assertEqual(amounts.round_rial('bad'), 0)

    def test_guarantee_payload_exposes_currency_and_rial_equivalent(self):
        from types import SimpleNamespace as NS

        from contracts.guarantee_status import guarantee_payload

        euro = NS(name='یورو', code='EUR', symbol='€')
        guarantee = NS(
            id=7, contract_guarantee_index=None, number='G-EUR-7',
            guarantee_type='performance', instrument_type='bank_guarantee',
            amount=1500, currency=euro, exchange_rate=920000,
            settlement_type='cash_equivalent', rial_amount=None,
            contract=NS(currency=euro),
            bank='', issue_date=None, expiry_date=None,
            is_released=False, release_date=None, note='',
        )
        payload = guarantee_payload(guarantee)
        self.assertEqual(payload['currency_name'], 'یورو')
        self.assertEqual(payload['currency_code'], 'EUR')
        self.assertEqual(payload['amount_rial'], 1380000000.0)
        self.assertEqual(payload['settlement_type'], 'cash_equivalent')
        self.assertFalse(payload['is_rial_currency'])
        self.assertEqual(payload['contract_currency_name'], 'یورو')
