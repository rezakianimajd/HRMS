"""تست‌های بدون دیتابیس برای «سازمان‌ها و اشخاص» (تعاریف حسابداری).

PostgreSQL محلی معمولاً خاموش است؛ پس منطق خالص، مجوز، مسیرها و سریالایزر
با `SimpleTestCase` و نمونه‌های ساخته‌شده در حافظه بررسی می‌شوند.
"""
from types import SimpleNamespace
from unittest.mock import patch

from django.core.exceptions import PermissionDenied
from django.test import SimpleTestCase

from accounting import org_parties as op
from accounting.permissions import MENU, has_permission, require
from accounting.serializers import OrgPartySerializer


class KindCatalogueTests(SimpleTestCase):
    """فهرست انواع باید همهٔ دسته‌های درخواستی را پوشش دهد."""

    REQUIRED = ('organization', 'regulatory', 'employer', 'shareholder', 'legal_person', 'natural_person')

    def test_required_kinds_present(self):
        for kind in self.REQUIRED:
            self.assertIn(kind, op.KIND_VALUES)

    def test_extra_useful_kinds(self):
        """بیمه‌گر، حسابرس و «سایر» هم برای حسابداری لازم‌اند."""
        for kind in ('insurer', 'auditor', 'other'):
            self.assertIn(kind, op.KIND_VALUES)

    def test_labels_are_persian_and_unique(self):
        labels = [label for _value, label in op.KINDS]
        self.assertEqual(len(labels), len(set(labels)))
        for label in labels:
            self.assertTrue(any('\u0600' <= ch <= '\u06ff' for ch in label), label)

    def test_every_kind_has_prefix_and_hint(self):
        for kind in op.KIND_VALUES:
            self.assertTrue(op.KIND_PREFIXES.get(kind), kind)
            self.assertTrue(op.KIND_HINTS.get(kind), kind)

    def test_kind_label_fallback(self):
        self.assertEqual(op.kind_label('regulatory'), 'مرجع قانونی و نظارتی')
        self.assertEqual(op.kind_label('unknown'), 'unknown')


class PersonTypeTests(SimpleTestCase):

    def test_only_natural_kind_is_natural(self):
        self.assertEqual(op.person_type_of('natural_person'), 'natural')
        self.assertEqual(op.person_type_label('natural_person'), 'شخص حقیقی')
        for kind in ('organization', 'regulatory', 'employer', 'shareholder', 'insurer',
                     'auditor', 'legal_person', 'other'):
            self.assertEqual(op.person_type_of(kind), 'legal')

    def test_unknown_kind_defaults_to_legal(self):
        self.assertEqual(op.person_type_of(''), 'legal')
        self.assertEqual(op.person_type_of(None), 'legal')


class CodeTests(SimpleTestCase):

    def test_prefix_per_kind(self):
        self.assertEqual(op.code_prefix('organization'), 'ORG')
        self.assertEqual(op.code_prefix('regulatory'), 'REG')
        self.assertEqual(op.code_prefix('natural_person'), 'NAT')
        self.assertEqual(op.code_prefix('nope'), 'OTH')

    def test_next_code_starts_at_one_and_pads(self):
        self.assertEqual(op.next_code('organization', []), 'ORG-0001')

    def test_next_code_uses_highest_existing(self):
        existing = ['ORG-0001', 'ORG-0007', 'REG-0099', 'bad', '']
        self.assertEqual(op.next_code('organization', existing), 'ORG-0008')
        self.assertEqual(op.next_code('regulatory', existing), 'REG-0100')

    def test_next_code_ignores_other_prefixes(self):
        self.assertEqual(op.next_code('employer', ['EMP-0003', 'ORG-0050']), 'EMP-0004')

    def test_code_number_and_format(self):
        self.assertEqual(op.code_number('SHR-0012'), 12)
        self.assertEqual(op.code_number('SHR-x'), 0)
        self.assertEqual(op.format_code('SHR', 12), 'SHR-0012')

    def test_normalize_code(self):
        self.assertEqual(op.normalize_code(' reg-7 '), 'REG-7')
        self.assertEqual(op.normalize_code(None), '')



class DisplayNameTests(SimpleTestCase):

    def test_unit_appended_in_parentheses(self):
        self.assertEqual(op.display_name('سازمان تأمین اجتماعی', 'شعبه ۱۲'), 'سازمان تأمین اجتماعی (شعبه ۱۲)')

    def test_name_only(self):
        self.assertEqual(op.display_name('  شهرداری تهران ', ''), 'شهرداری تهران')

    def test_unit_only_falls_back_to_unit(self):
        self.assertEqual(op.display_name('', 'شعبه ۵'), 'شعبه ۵')
        self.assertEqual(op.display_name(None, None), '')


class StatsTests(SimpleTestCase):

    def test_kinds_summary_is_ordered_and_zero_filled(self):
        rows = op.kinds_summary({'regulatory': 3, 'employer': 2})
        self.assertEqual([row['kind'] for row in rows], list(op.KIND_VALUES))
        by_kind = {row['kind']: row['count'] for row in rows}
        self.assertEqual(by_kind['regulatory'], 3)
        self.assertEqual(by_kind['employer'], 2)
        self.assertEqual(by_kind['auditor'], 0)

    def test_build_stats_payload(self):
        payload = op.build_stats({'organization': 4}, total=6, active=5, linked=2)
        self.assertEqual(payload['total'], 6)
        self.assertEqual(payload['active'], 5)
        self.assertEqual(payload['inactive'], 1)
        self.assertEqual(payload['linked'], 2)
        self.assertEqual(len(payload['kinds']), len(op.KIND_VALUES))
        self.assertEqual(len(payload['kinds_meta']), len(op.KIND_VALUES))

    def test_build_stats_ignores_negative_inactive(self):
        payload = op.build_stats({}, total=0, active=0)
        self.assertEqual(payload['inactive'], 0)

    def test_kinds_meta_matches_choices(self):
        meta = op.kinds_meta()
        self.assertEqual([row['value'] for row in meta], list(op.KIND_VALUES))
        for row in meta:
            self.assertEqual(row['prefix'], op.code_prefix(row['value']))
            self.assertEqual(row['person_type'], op.person_type_of(row['value']))


class PermissionTests(SimpleTestCase):

    def _user(self, **kwargs):
        defaults = {'is_authenticated': True, 'is_superuser': False}
        defaults.update(kwargs)
        return SimpleNamespace(**defaults)

    def _no_codes(self):
        """مجوزها را خالی می‌کند (کاربر بدون هیچ کد ریز و بدون نقش)."""
        return [
            patch('core.engines.permission_engine.fine_permissions_for', return_value={}),
            patch('core.engines.permission_engine.user_access_record', return_value=None),
            patch('core.engines.permission_engine.permissions_for', return_value={}),
        ]

    def test_anonymous_denied(self):
        self.assertFalse(has_permission(SimpleNamespace(is_authenticated=False), 'view'))
        self.assertFalse(has_permission(None, 'view'))

    def test_superuser_allowed(self):
        self.assertTrue(has_permission(self._user(is_superuser=True), 'delete'))

    def test_menu_code_grants_action(self):
        granted = {f'accounting.{MENU}.create': True}
        with patch('core.engines.permission_engine.fine_permissions_for', return_value=granted):
            self.assertTrue(has_permission(self._user(), 'create'))

    def test_edit_falls_back_to_create(self):
        granted = {f'accounting.{MENU}.create': True}
        with patch('core.engines.permission_engine.fine_permissions_for', return_value=granted):
            self.assertTrue(has_permission(self._user(), 'edit'))

    def test_no_code_denied(self):
        patches = self._no_codes()
        for item in patches:
            item.start()
        try:
            self.assertFalse(has_permission(self._user(), 'delete'))
        finally:
            for item in patches:
                item.stop()

    def test_require_raises_with_persian_message(self):
        patches = self._no_codes()
        for item in patches:
            item.start()
        try:
            with self.assertRaises(PermissionDenied) as ctx:
                require(self._user(), 'delete')
        finally:
            for item in patches:
                item.stop()
        self.assertIn('دسترسی غیرمجاز', str(ctx.exception))


class RouterTests(SimpleTestCase):
    """مسیر API و اکشن‌ها باید در دسترس باشند."""

    def test_org_parties_registered(self):
        from accounting.urls import router

        basenames = {entry[0]: entry[2] for entry in router.registry}
        self.assertEqual(basenames.get('org-parties'), 'org-party')

    def test_viewset_has_actions(self):
        from accounting.views import OrgPartyViewSet

        for name in ('stats', 'options', 'toggle_status'):
            self.assertTrue(hasattr(OrgPartyViewSet, name), name)

    def test_action_permission_map_covers_crud(self):
        from accounting.views import OrgPartyViewSet

        mapping = OrgPartyViewSet.action_permission_map
        self.assertEqual(mapping['list'], 'view')
        self.assertEqual(mapping['create'], 'create')
        self.assertEqual(mapping['partial_update'], 'edit')
        self.assertEqual(mapping['destroy'], 'delete')
        self.assertEqual(mapping['toggle_status'], 'edit')


class SerializerTests(SimpleTestCase):
    """سریالایزر با نمونه‌های ساخته‌شده در حافظه (بدون DB)."""

    def _instance(self, **overrides):
        from accounting.models import AuxiliaryAccount, OrgParty

        parent = OrgParty(name='سازمان تأمین اجتماعی')
        account = AuxiliaryAccount(code='2101', name='بیمه پرداختنی')
        instance = OrgParty(
            code='REG-0001', name='سازمان تأمین اجتماعی', unit_name='شعبه ۱۲',
            kind='regulatory', national_id='12345678901', share_percent=None,
            parent=parent, account=account,
        )
        instance.id = 1
        instance.contract_party = None
        instance.organization = None
        instance.correspondent = None
        for key, value in overrides.items():
            setattr(instance, key, value)
        return instance

    def test_computed_fields(self):
        data = OrgPartySerializer(self._instance()).data
        self.assertEqual(data['kind_display'], 'مرجع قانونی و نظارتی')
        self.assertEqual(data['person_type_display'], 'شخص حقوقی')
        self.assertEqual(data['full_name'], 'سازمان تأمین اجتماعی (شعبه ۱۲)')
        self.assertEqual(data['parent_name'], 'سازمان تأمین اجتماعی')
        self.assertEqual(data['account_display'], '2101 - بیمه پرداختنی')
        self.assertEqual(data['children_count'], 0)
        self.assertEqual(data['contract_party_name'], '')

    def test_natural_person_label(self):
        data = OrgPartySerializer(self._instance(kind='natural_person')).data
        self.assertEqual(data['person_type'], 'natural')
        self.assertEqual(data['person_type_display'], 'شخص حقیقی')

    def test_invalid_kind_rejected(self):
        serializer = OrgPartySerializer(self._instance(), data={'kind': 'nope'}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('kind', serializer.errors)

    def test_empty_name_rejected(self):
        serializer = OrgPartySerializer(self._instance(), data={'name': '   '}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)

    def test_share_percent_range(self):
        serializer = OrgPartySerializer(self._instance(), data={'share_percent': '120'}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('share_percent', serializer.errors)
