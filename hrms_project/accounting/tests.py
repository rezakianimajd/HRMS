"""تست موتور کدینگ حسابداری (والد-آگاه) — اجرا روی سرور (PostgreSQL).

بررسی می‌کند که کد پیشنهادی برای «حساب معین» بر پایهٔ **والد انتخاب‌شده** ساخته شود
و نوع حساب/ماهیت از والد یا گروه ارث ببرد (و به‌اشتباه «دارایی» نشود).
"""
from django.test import TestCase

from accounting.coding import next_code, resolve_inheritance, suggest_code
from accounting.models import Account, AccountGroup, AccountType
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
