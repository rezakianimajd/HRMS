"""تست‌های اعتبار تضامین — چک با گذشتن سررسید منقضی نمی‌شود (۵ سال از صدور).

بدون دیتابیس: مدل با ``SimpleNamespace`` جایگزین می‌شود.
"""
from datetime import date, timedelta
from types import SimpleNamespace

from django.test import SimpleTestCase

from contracts import guarantee_status, guarantee_validity
from contracts.guarantee_validity import add_years, guarantee_validity as validity_of


def _guarantee(**kwargs):
    base = {
        'id': 1,
        'instrument_type': 'check',
        'guarantee_type': 'performance',
        'number': 'CHK-1',
        'amount': 1000000,
        'issue_date': None,
        'expiry_date': None,
        'check_due_date': None,
        'promissory_due_date': None,
        'guarantee_expiry_date': None,
        'is_released': False,
        'release_date': None,
        'note': '',
        'contract_guarantee_index': None,
    }
    base.update(kwargs)
    return SimpleNamespace(**base)


def _years_ago(years):
    return date.today().replace(year=date.today().year - years)


class ValidityHelperTests(SimpleTestCase):
    def test_check_instrument_detection(self):
        self.assertTrue(guarantee_validity.is_check_instrument('check'))
        self.assertTrue(guarantee_validity.is_check_instrument('check_and_guarantee'))
        self.assertFalse(guarantee_validity.is_check_instrument('bank_guarantee'))
        self.assertFalse(guarantee_validity.is_check_instrument(''))

    def test_add_years_handles_leap_day(self):
        self.assertEqual(add_years(date(2020, 2, 29), 1), date(2021, 2, 28))
        self.assertEqual(add_years(date(2024, 3, 1), 5), date(2029, 3, 1))


class CheckValidityTests(SimpleTestCase):
    """چک: سررسید گذشته ⇒ منقضی نیست."""

    def test_past_due_check_is_still_valid(self):
        item = _guarantee(
            issue_date=_years_ago(2),
            check_due_date=date.today() - timedelta(days=365),
            expiry_date=date.today() - timedelta(days=365),
        )
        result = validity_of(item)
        self.assertFalse(result['is_expired'])
        self.assertEqual(result['expiry_kind'], 'validity')
        self.assertEqual(result['validity_years'], 5)
        self.assertEqual(result['valid_until'], add_years(_years_ago(2), 5).isoformat())
        self.assertGreater(result['days_to_expiry'], 900)

    def test_check_older_than_five_years_is_expired(self):
        item = _guarantee(issue_date=_years_ago(6), check_due_date=_years_ago(6))
        result = validity_of(item)
        self.assertTrue(result['is_expired'])
        self.assertLess(result['days_to_expiry'], 0)

    def test_check_without_issue_date_falls_back_to_due_date(self):
        due = date.today() - timedelta(days=200)
        item = _guarantee(check_due_date=due, expiry_date=due)
        result = validity_of(item)
        self.assertFalse(result['is_expired'])
        self.assertEqual(result['valid_until'], add_years(due, 5).isoformat())

    def test_check_and_guarantee_uses_later_guarantee_expiry(self):
        item = _guarantee(
            instrument_type='check_and_guarantee',
            issue_date=_years_ago(1),
            guarantee_expiry_date=date.today() + timedelta(days=2000),
        )
        result = validity_of(item)
        self.assertEqual(result['valid_until'], (date.today() + timedelta(days=2000)).isoformat())
        self.assertFalse(result['is_expired'])


class GuaranteeExpiryTests(SimpleTestCase):
    """ضمانت‌نامه: رفتار قبلی حفظ می‌شود."""

    def test_expired_bank_guarantee(self):
        item = _guarantee(
            instrument_type='bank_guarantee',
            guarantee_expiry_date=date.today() - timedelta(days=3),
        )
        result = validity_of(item)
        self.assertTrue(result['is_expired'])
        self.assertEqual(result['expiry_kind'], 'expiry')
        self.assertIsNone(result['validity_years'])

    def test_active_bank_guarantee(self):
        item = _guarantee(
            instrument_type='bank_guarantee',
            guarantee_expiry_date=date.today() + timedelta(days=90),
        )
        result = validity_of(item)
        self.assertFalse(result['is_expired'])
        self.assertEqual(result['days_to_expiry'], 90)


class GuaranteePayloadTests(SimpleTestCase):
    def test_payload_exposes_validity_fields(self):
        due = date.today() - timedelta(days=30)
        item = _guarantee(
            issue_date=_years_ago(1),
            check_due_date=due,
            expiry_date=due,
        )
        payload = guarantee_status.guarantee_payload(item)
        self.assertFalse(payload['is_expired'])
        self.assertTrue(payload['is_check'])
        self.assertEqual(payload['validity_years'], 5)
        self.assertEqual(payload['due_date'], due.isoformat())
        # تاریخ خام سررسید/انقضا دست‌نخورده می‌ماند
        self.assertEqual(payload['expiry_date'], due.isoformat())
        self.assertGreater(payload['days_to_expiry'], 0)


class ComplianceWarningTests(SimpleTestCase):
    def _contract(self):
        return SimpleNamespace(
            id=1,
            amount=1000000,
            guarantee_items=[{'type': 'performance', 'amount': 1000000}],
            guarantees=None,
        )

    def test_valid_check_produces_no_expiry_warning(self):
        contract = self._contract()
        item = _guarantee(
            issue_date=_years_ago(1),
            check_due_date=date.today() - timedelta(days=10),
        )
        result = guarantee_status.guarantee_compliance(
            contract, guarantees=[item], effective_amount=1000000,
        )
        # «منقضی نشده» مجاز است؛ عبارت «منقضی شده» نباید بیاید
        self.assertFalse(any('منقضی شده' in warning for warning in result['warnings']))

    def test_check_due_passed_warns_without_calling_it_expired(self):
        contract = self._contract()
        item = _guarantee(
            issue_date=_years_ago(1),
            check_due_date=date.today() - timedelta(days=20),
        )
        result = guarantee_status.guarantee_compliance(
            contract, guarantees=[item], effective_amount=1000000,
        )
        self.assertTrue(any('سررسید چک' in warning for warning in result['warnings']))
        self.assertFalse(any('منقضی شده' in warning for warning in result['warnings']))

    def test_check_near_due_warns_about_due_date(self):
        contract = self._contract()
        item = _guarantee(
            issue_date=_years_ago(1),
            check_due_date=date.today() + timedelta(days=10),
        )
        result = guarantee_status.guarantee_compliance(
            contract, guarantees=[item], effective_amount=1000000,
        )
        self.assertTrue(any('سررسید چک' in warning for warning in result['warnings']))

    def test_expired_check_warns_about_five_year_validity(self):
        contract = self._contract()
        item = _guarantee(issue_date=_years_ago(7), check_due_date=_years_ago(7))
        result = guarantee_status.guarantee_compliance(
            contract, guarantees=[item], effective_amount=1000000,
        )
        self.assertTrue(any('اعتبار قانونی چک' in warning for warning in result['warnings']))

    def test_check_near_validity_end_warns(self):
        contract = self._contract()
        # صدور ~۵ سال پیش ⇒ پایان اعتبار نزدیک است
        issue = date.today().replace(year=date.today().year - 5) + timedelta(days=20)
        item = _guarantee(issue_date=issue, check_due_date=date.today())
        result = guarantee_status.guarantee_compliance(
            contract, guarantees=[item], effective_amount=1000000,
        )
        self.assertTrue(any('اعتبار قانونی چک' in warning for warning in result['warnings']))
