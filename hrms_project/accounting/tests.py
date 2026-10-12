"""تست موتور کدینگ حسابداری (والد-آگاه) — اجرا روی سرور (PostgreSQL).

بررسی می‌کند که کد پیشنهادی برای «حساب معین» بر پایهٔ **والد انتخاب‌شده** ساخته شود
و نوع حساب/ماهیت از والد یا گروه ارث ببرد (و به‌اشتباه «دارایی» نشود).
"""
from django.test import TestCase

from accounting.coding import next_code, resolve_inheritance, suggest_code
from accounting.maintenance import (
    analyze_account_types, infer_category_from_name, sync_account_types,
)
from accounting.models import Account, AccountGroup, AccountType
from accounting.serializers import AccountSerializer
from core.models import Company


def make_company(schema_name='testco', name='شرکت تست'):
    company = Company(schema_name=schema_name, name=name)
    company.auto_create_schema = False
    company.save()
    return company


class CodingSuggestionTests(TestCase):

    def setUp(self):
        self.company = make_company()
        self.asset = AccountType.objects.create(
            company=self.company, code='1', name='دارایی', category='asset',
            default_nature='debit',
        )
        self.liability = AccountType.objects.create(
            company=self.company, code='2', name='بدهی', category='liability',
            default_nature='credit',
        )
        self.asset_general = Account.objects.create(
            company=self.company, code='1001', name='موجودی نقد و بانک',
            account_type=self.asset, level=1, nature='debit',
        )
        self.liab_general = Account.objects.create(
            company=self.company, code='2001', name='حساب‌های پرداختنی',
            account_type=self.liability, level=1, nature='credit',
        )

    def test_subsidiary_code_follows_selected_parent(self):
        payload = next_code(self.company, 'subsidiary', parent=self.liab_general)
        self.assertEqual(payload['code_basis'], 'parent')
        self.assertTrue(payload['code'].startswith('2001'))
        self.assertEqual(payload['parent_code'], '2001')
        self.assertEqual(payload['full_code'], f'2001 / {payload["code"]}')

    def test_type_and_nature_inherited_from_parent(self):
        payload = next_code(self.company, 'subsidiary', parent=self.liab_general)
        self.assertEqual(payload['account_type'], self.liability.id)
        self.assertEqual(payload['account_type_name'], 'بدهی')
        self.assertEqual(payload['account_type_category'], 'liability')
        self.assertEqual(payload['nature'], 'credit')
        self.assertEqual(payload['inherited_from'], 'parent')

    def test_next_subsidiary_skips_codes_already_used_for_parent(self):
        first = next_code(self.company, 'subsidiary', parent=self.asset_general)['code']
        Account.objects.create(
            company=self.company, code=first, name='زیرحساب یک', account_type=self.asset,
            level=2, nature='debit', parent=self.asset_general,
        )
        second = next_code(self.company, 'subsidiary', parent=self.asset_general)['code']
        self.assertNotEqual(first, second)
        self.assertTrue(second.startswith('1001'))

    def test_without_parent_falls_back_to_global_range(self):
        payload = next_code(self.company, 'subsidiary')
        self.assertEqual(payload['code_basis'], 'range')
        self.assertIsNone(payload['inherited_from'])
        self.assertFalse(payload['code'].startswith('2001'))

    def test_general_account_inherits_from_group(self):
        group = AccountGroup.objects.create(
            company=self.company, account_type=self.liability, code='210',
            name='بدهی‌های جاری', nature='credit',
        )
        payload = next_code(self.company, 'general', group=group)
        self.assertEqual(payload['inherited_from'], 'group')
        self.assertEqual(payload['account_type'], self.liability.id)
        self.assertEqual(payload['nature'], 'credit')
        self.assertEqual(payload['code_basis'], 'range')

    def test_parent_wins_over_group(self):
        group = AccountGroup.objects.create(
            company=self.company, account_type=self.asset, code='110',
            name='دارایی جاری', nature='debit',
        )
        account_type, nature, source = resolve_inheritance(self.liab_general, group)
        self.assertEqual(source, 'parent')
        self.assertEqual(account_type, self.liability)
        self.assertEqual(nature, 'credit')

    def test_suggest_code_backward_compatible(self):
        code = suggest_code(self.company, 'subsidiary', '2001')
        self.assertTrue(code.startswith('2001'))

class CodingHealthSyncTests(TestCase):
    """رفع «ناهمگونی نوع حساب»: حساب زیر گروه بدهی که نوعش دارایی ثبت شده."""

    def setUp(self):
        self.company = make_company(schema_name='testco2')
        self.asset = AccountType.objects.create(
            company=self.company, code='1', name='دارایی', category='asset',
            default_nature='debit',
        )
        self.liability = AccountType.objects.create(
            company=self.company, code='2', name='بدهی', category='liability',
            default_nature='credit',
        )
        self.liab_group = AccountGroup.objects.create(
            company=self.company, account_type=self.liability, code='210',
            name='بدهی جاری', nature='credit',
        )
        self.broken = Account.objects.create(
            company=self.company, code='21001', name='حساب‌های پرداختنی تجاری',
            account_type=self.asset, level=1, nature='debit', group=self.liab_group,
        )

    def test_infer_category_from_name(self):
        self.assertEqual(infer_category_from_name('حساب‌های پرداختنی تجاری'), 'liability')
        self.assertEqual(infer_category_from_name('بهای تمام‌شده کالای فروش رفته'), 'cost_of_sales')
        self.assertIsNone(infer_category_from_name('چیز نامشخص'))

    def test_analyze_reports_group_based_mismatch(self):
        report = analyze_account_types(self.company)
        self.assertEqual(report['accounts_total'], 1)
        self.assertEqual(report['accounts_mismatched'], 1)
        row = report['changes'][0]
        self.assertEqual(row['source'], 'group')
        self.assertEqual(row['current_category'], 'asset')
        self.assertEqual(row['new_category'], 'liability')
        self.assertFalse(report['applied'])

    def test_analyze_detects_group_name_conflict(self):
        self.liab_group.account_type = self.asset
        self.liab_group.save(update_fields=['account_type'])
        report = analyze_account_types(self.company, fix_groups=True)
        self.assertEqual(len(report['groups_to_fix']), 1)
        self.assertEqual(report['groups_to_fix'][0]['to_category'], 'liability')
        self.assertEqual(report['changes'][0]['source'], 'group_name')

    def test_sync_applies_type_and_nature(self):
        report = sync_account_types(self.company)
        self.assertTrue(report['applied'])
        self.assertEqual(report['accounts_updated'], 1)
        self.broken.refresh_from_db()
        self.assertEqual(self.broken.account_type_id, self.liability.id)
        self.assertEqual(self.broken.nature, 'credit')
        self.assertEqual(analyze_account_types(self.company)['accounts_mismatched'], 0)

    def test_sync_with_fix_groups_repairs_group_too(self):
        self.liab_group.account_type = self.asset
        self.liab_group.save(update_fields=['account_type'])
        report = sync_account_types(self.company, fix_groups=True)
        self.assertEqual(report['groups_updated'], 1)
        self.liab_group.refresh_from_db()
        self.broken.refresh_from_db()
        self.assertEqual(self.liab_group.account_type_id, self.liability.id)
        self.assertEqual(self.broken.account_type_id, self.liability.id)

    def test_sync_is_noop_when_consistent(self):
        self.broken.account_type = self.liability
        self.broken.nature = 'credit'
        self.broken.save(update_fields=['account_type', 'nature'])
        report = sync_account_types(self.company)
        self.assertEqual(report['accounts_updated'], 0)
        self.assertEqual(report['accounts_mismatched'], 0)

    def test_parent_type_wins_over_group(self):
        parent = Account.objects.create(
            company=self.company, code='2001', name='حساب‌های پرداختنی',
            account_type=self.liability, level=1, nature='credit',
        )
        child = Account.objects.create(
            company=self.company, code='200100001', name='پرداختنی الف',
            account_type=self.asset, level=2, nature='debit',
            parent=parent, group=self.liab_group,
        )
        report = analyze_account_types(self.company)
        rows = {row['id']: row for row in report['changes']}
        self.assertEqual(rows[child.id]['source'], 'parent')
        self.assertEqual(rows[child.id]['new_category'], 'liability')

    def test_serializer_flags_type_mismatch(self):
        data = AccountSerializer(self.broken).data
        self.assertTrue(data['type_mismatch'])
        self.assertEqual(data['group_type_category'], 'liability')

