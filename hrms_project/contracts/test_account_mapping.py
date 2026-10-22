"""تست نگاشت حساب‌های مالی قرارداد و خواندن آن توسط موتور حسابداری."""
from django.test import TestCase

from accounting.models import Account, AccountType, AuxiliaryCategory
from contracts.accounting_mapping import (
    MAPPING_DEFINITIONS, contract_mapping_rows, resolve_contract_mapping,
    resolve_event_mapping,
)
from contracts.models import ContractAccountMapping
from core.models import Company


def make_company(schema_name='testco-contract-mapping'):
    company = Company(schema_name=schema_name, name='شرکت تست نگاشت قرارداد')
    company.auto_create_schema = False
    company.save()
    return company


class ContractAccountMappingTests(TestCase):

    def setUp(self):
        self.company = make_company()
        self.account_type = AccountType.objects.create(
            company=self.company, code='2', name='بدهی', category='liability',
        )
        self.general = Account.objects.create(
            company=self.company, code='2001', name='حساب‌های پرداختنی',
            account_type=self.account_type, level=1,
        )
        self.subsidiary = Account.objects.create(
            company=self.company, code='200101', name='پرداختنی پیمانکاران',
            account_type=self.account_type, parent=self.general, level=2,
        )
        self.category = AuxiliaryCategory.objects.create(
            company=self.company, code='CTR', name='قراردادها', source='contract',
        )

    def test_all_mapping_definitions_are_returned_with_defaults(self):
        rows = contract_mapping_rows(self.company)
        self.assertEqual(len(rows), len(MAPPING_DEFINITIONS))
        self.assertEqual([row['key'] for row in rows], [item['key'] for item in MAPPING_DEFINITIONS])
        self.assertTrue(all(row['subsidiary_account'] is None for row in rows))
        self.assertEqual(rows[0]['definition']['label'], 'حساب معین پایه')

    def test_saved_mapping_is_read_with_general_account_and_auxiliary(self):
        ContractAccountMapping.objects.create(
            company=self.company, key='payable', subsidiary_account=self.subsidiary,
            auxiliary_source_1='auto', auxiliary_category_1=self.category,
            control_mode='strict', enforce_auxiliary=True,
        )
        row = resolve_contract_mapping(self.company, 'payable')
        self.assertEqual(row['subsidiary_account'], self.subsidiary.pk)
        self.assertEqual(row['general_account_detail']['code'], self.general.code)
        self.assertEqual(row['auxiliary_slots'][0]['category']['name'], self.category.name)
        self.assertEqual(row['control_mode'], 'strict')
        self.assertTrue(row['is_complete'])

    def test_payment_event_prefers_payable_mapping(self):
        ContractAccountMapping.objects.create(
            company=self.company, key='payable', subsidiary_account=self.subsidiary,
        )
        event = resolve_event_mapping(self.company, 'payment')
        self.assertTrue(event['ready'])
        self.assertEqual(event['primary']['key'], 'payable')
        self.assertIn('base_subsidiary', [row['key'] for row in event['mappings']])
