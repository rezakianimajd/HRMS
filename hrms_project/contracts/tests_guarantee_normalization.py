from types import SimpleNamespace

from django.test import SimpleTestCase

from contracts.guarantee_normalization import normalize_contract_guarantees


class GuaranteeNormalizationTests(SimpleTestCase):
    def test_legacy_primary_is_cleared_when_items_exist(self):
        contract = SimpleNamespace(
            guarantee_items=[{'type': 'advance', 'amount': '1000'}],
            guarantee_type='performance', guarantee_amount='1000',
        )
        result = normalize_contract_guarantees(contract, guarantees=[])
        self.assertEqual(result['guarantee_type'], '')
        self.assertIsNone(result['guarantee_amount'])
        self.assertEqual(result['items'][0]['type'], 'advance')
        self.assertIn('legacy_primary_cleared', result['changes'])

    def test_primary_only_is_migrated_to_item(self):
        contract = SimpleNamespace(
            guarantee_items=[], guarantee_type='performance', guarantee_amount='2500',
        )
        result = normalize_contract_guarantees(contract, guarantees=[])
        self.assertEqual(len(result['items']), 1)
        self.assertEqual(result['items'][0]['type'], 'performance')
        self.assertEqual(result['items'][0]['amount'], '2500')
        self.assertEqual(result['guarantee_type'], '')
        self.assertIsNone(result['guarantee_amount'])

    def test_guarantee_link_is_fixed_and_item_amount_is_derived(self):
        guarantee = SimpleNamespace(
            id=9, guarantee_type='other', amount='700', contract_guarantee_index=4,
        )
        contract = SimpleNamespace(
            guarantee_items=[{'type': 'other', 'amount': '', 'percent': ''}],
            guarantee_type='', guarantee_amount=None,
        )
        result = normalize_contract_guarantees(contract, guarantees=[guarantee])
        self.assertEqual(result['items'][0]['amount'], '700')
        self.assertEqual(result['links'][9], 0)

    def test_invalid_index_is_repaired_by_guarantee_type(self):
        guarantee = SimpleNamespace(
            id=10, guarantee_type='execution', amount='50', contract_guarantee_index=9,
        )
        contract = SimpleNamespace(
            guarantee_items=[
                {'type': 'advance', 'amount': '100', 'percent': '10'},
                {'type': 'execution', 'amount': '50', 'percent': '5'},
            ],
            guarantee_type='', guarantee_amount=None,
        )
        result = normalize_contract_guarantees(contract, guarantees=[guarantee])
        self.assertEqual(result['links'][10], 1)
