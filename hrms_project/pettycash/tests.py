"""تست‌های ماژول تنخواه.

تست‌های منطق خالص (بدون دیتابیس) با SimpleTestCase نوشته شده‌اند تا در محیط‌های
بدون PostgreSQL نیز قابل اجرا باشند. تست‌های نیازمند دیتابیس در فایل جداگانه
(با TestCase) توسعه داده می‌شوند.
"""
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from pettycash import access, services



class MoneyHelpersTests(SimpleTestCase):
    def test_none_and_empty_are_zero(self):
        self.assertEqual(services.money(None), Decimal('0'))
        self.assertEqual(services.money(''), Decimal('0'))

    def test_string_and_int_conversion(self):
        self.assertEqual(services.money('125000'), Decimal('125000'))
        self.assertEqual(services.money(1500), Decimal('1500'))

    def test_invalid_value_raises(self):
        with self.assertRaises(services.PettyCashError):
            services.money('abc')

    def test_positive_amount_guard(self):
        self.assertEqual(services.assert_amount_positive(100), Decimal('100'))
        with self.assertRaises(services.PettyCashError):
            services.assert_amount_positive(0)
        with self.assertRaises(services.PettyCashError):
            services.assert_amount_positive(-5)


class SegregationOfDutiesTests(SimpleTestCase):
    def _settings(self, enabled=True, allow_negative=True):
        return SimpleNamespace(
            enforce_segregation_of_duties=enabled,
            allow_negative_balance=allow_negative,
            max_single_payment=None,
        )

    def test_same_user_is_blocked(self):
        actor = SimpleNamespace(id=7)
        with self.assertRaises(services.PettyCashError):
            services.assert_segregation(self._settings(), 7, actor, 'تأیید')

    def test_different_user_is_allowed(self):
        actor = SimpleNamespace(id=9)
        services.assert_segregation(self._settings(), 7, actor, 'تأیید')

    def test_disabled_setting_skips_check(self):
        actor = SimpleNamespace(id=7)
        services.assert_segregation(self._settings(enabled=False), 7, actor, 'تأیید')

    def test_missing_submitter_allows_action(self):
        actor = SimpleNamespace(id=7)
        services.assert_segregation(self._settings(), None, actor, 'تأیید')


class PaymentMethodTests(SimpleTestCase):
    def test_default_method_when_empty(self):
        fund = SimpleNamespace(payment_methods=[], company_id=None)
        self.assertEqual(services.assert_payment_method_allowed(fund, None), 'cash')

    def test_disallowed_method_raises(self):
        fund = SimpleNamespace(payment_methods=['cash'], company_id=None)
        with self.assertRaises(services.PettyCashError):
            services.assert_payment_method_allowed(fund, 'bank_transfer')

    def test_allowed_method_passes(self):
        fund = SimpleNamespace(payment_methods=['cash', 'card'], company_id=None)
        self.assertEqual(services.assert_payment_method_allowed(fund, 'card'), 'card')


class SettlementSummaryTests(SimpleTestCase):
    def test_summary_math_with_patched_balance(self):
        fund = SimpleNamespace(
            kind='imprest',
            target_amount=Decimal('1000000'),
        )
        approved = SimpleNamespace(status='approved', total=Decimal('400000'))
        rejected = SimpleNamespace(status='rejected', total=Decimal('50000'))
        pending = SimpleNamespace(status='submitted', total=Decimal('100000'))
        with patch.object(services, 'fund_balance', return_value=Decimal('600000')):
            summary = services.settlement_summary(fund, [approved, rejected, pending], 550000)
        self.assertEqual(summary['expenses_total'], 400000.0)
        self.assertEqual(summary['rejected_total'], 50000.0)
        self.assertEqual(summary['pending_total'], 100000.0)
        self.assertEqual(summary['book_balance'], 600000.0)
        self.assertEqual(summary['shortage'], 50000.0)
        self.assertEqual(summary['overage'], 0.0)
        self.assertEqual(summary['returned_amount'], 550000.0)
        self.assertEqual(summary['recharge_amount'], 400000.0)
        self.assertEqual(summary['approved_count'], 1)
        self.assertEqual(summary['rejected_count'], 1)
        self.assertEqual(summary['pending_count'], 1)

    def test_summary_detects_overage(self):
        fund = SimpleNamespace(kind='occasional', target_amount=Decimal('0'))
        approved = SimpleNamespace(status='posted', total=Decimal('100000'))
        with patch.object(services, 'fund_balance', return_value=Decimal('50000')):
            summary = services.settlement_summary(fund, [approved], 80000)
        self.assertEqual(summary['shortage'], 0.0)
        self.assertEqual(summary['overage'], 30000.0)
        self.assertEqual(summary['recharge_amount'], 0.0)


class _FundList(list):
    """جایگزین سبک برای values_list در تست‌های بدون دیتابیس."""

    def values_list(self, *args, **kwargs):
        return list(self)


def _fake_user(pk=10, superuser=False, staff=False):
    user = MagicMock()
    user.pk = pk
    user.is_authenticated = True
    user.is_superuser = superuser
    user.is_staff = staff
    return user


class AccessControlTests(SimpleTestCase):
    def _settings(self, restrict=True, seniors=None):
        return SimpleNamespace(restrict_visibility=restrict, senior_manager_ids=seniors or [])

    def test_unrestricted_settings_returns_none(self):
        with patch.object(access, 'get_settings', return_value=self._settings(False)):
            self.assertIsNone(access.accessible_fund_ids(1, _fake_user()))

    def test_superuser_sees_everything(self):
        with patch.object(access, 'get_settings', return_value=self._settings(True)):
            self.assertIsNone(access.accessible_fund_ids(1, _fake_user(superuser=True)))

    def test_designated_senior_manager_ids(self):
        user = _fake_user(pk=77)
        settings_obj = self._settings(True, seniors=[77])
        with patch.object(access, 'get_settings', return_value=settings_obj), \
                patch.object(access, 'user_role', return_value='employee'):
            self.assertTrue(access.is_senior_manager(user, 1))

    def test_non_manager_without_assignment_sees_nothing(self):
        with patch.object(access, 'get_settings', return_value=self._settings(True)), \
                patch.object(access, 'is_senior_manager', return_value=False), \
                patch.object(access, 'assignments_for_user', return_value=[]):
            self.assertEqual(access.accessible_fund_ids(1, _fake_user()), set())

    def test_custodian_scope_includes_own_and_assigned_and_supervisor_funds(self):
        supervisor = SimpleNamespace(employee_id=2, funds=_FundList([60]))
        assignment = SimpleNamespace(employee_id=1, funds=_FundList([30]), supervisor=supervisor)
        fake_manager = MagicMock()
        fake_manager.filter.return_value = _FundList([20, 21])
        with patch.object(access, 'get_settings', return_value=self._settings(True)), \
                patch.object(access, 'is_senior_manager', return_value=False), \
                patch.object(access, 'assignments_for_user', return_value=[assignment]), \
                patch.object(access, 'PettyCashFund', SimpleNamespace(objects=fake_manager)):
            fund_ids = access.accessible_fund_ids(1, _fake_user())
        self.assertEqual(fund_ids, {20, 21, 30, 60})

    def test_scope_by_fund_filters_queryset(self):
        qs = MagicMock()
        qs.filter.return_value = 'filtered'
        with patch.object(access, 'accessible_fund_ids', return_value={3, 4}):
            self.assertEqual(access.scope_by_fund(qs, 1, _fake_user()), 'filtered')
            qs.filter.assert_called_with(fund_id__in=[3, 4])

    def test_scope_by_fund_empty_scope_returns_none_queryset(self):
        qs = MagicMock()
        qs.none.return_value = 'none'
        with patch.object(access, 'accessible_fund_ids', return_value=set()):
            self.assertEqual(access.scope_by_fund(qs, 1, _fake_user()), 'none')

    def test_scope_skipped_when_unrestricted(self):
        qs = MagicMock()
        with patch.object(access, 'accessible_fund_ids', return_value=None):
            self.assertIs(access.scope_by_fund(qs, 1, _fake_user()), qs)

