"""تست‌های کاتالوگ مجوزهای ریز و سازگاری لایهٔ قدیمی (بدون دیتابیس)."""
from django.test import SimpleTestCase

from core import permission_catalog as catalog_mod
from core.engines import permission_engine as engine


class PermissionCatalogTests(SimpleTestCase):
    def test_catalog_covers_all_modules_and_menus(self):
        modules = catalog_mod.catalog()
        slugs = [module['slug'] for module in modules]
        for slug in ('hrms', 'treasury', 'accounting', 'documents',
                     'correspondence', 'contracts', 'projects',
                     'procurement', 'pettycash', 'settings'):
            self.assertIn(slug, slugs)

        menus = sum(module['menu_count'] for module in modules)
        self.assertGreaterEqual(menus, 250)

        treasury = next(module for module in modules if module['slug'] == 'treasury')
        self.assertGreaterEqual(treasury['menu_count'], 80)
        self.assertGreaterEqual(len(treasury['groups']), 15)

    def test_every_menu_has_codes_and_view_action(self):
        actions = set(catalog_mod.ACTION_KEYS)
        for module in catalog_mod.catalog():
            for group in module['groups']:
                self.assertTrue(group['items'], 'گروه بدون منو نباید باشد')
                for item in group['items']:
                    self.assertIn('view', item['actions'])
                    self.assertTrue(set(item['actions']) <= actions)
                    for action, code in item['codes'].items():
                        self.assertEqual(code, f"{module['slug']}.{item['id']}.{action}")

    def test_codes_are_unique(self):
        codes = catalog_mod.codes_for()
        self.assertEqual(len(codes), len(set(codes)))
        self.assertGreaterEqual(len(codes), 800)

    def test_is_valid_code_and_parse(self):
        self.assertTrue(catalog_mod.is_valid_code('treasury.receipts.view'))
        self.assertTrue(catalog_mod.is_valid_code('hrms.employees.edit'))
        self.assertFalse(catalog_mod.is_valid_code('treasury.unknown.view'))
        self.assertFalse(catalog_mod.is_valid_code('not-a-code'))
        self.assertEqual(
            catalog_mod.parse_code('treasury.receipts.view'),
            ('treasury', 'receipts', 'view'),
        )
        self.assertIsNone(catalog_mod.parse_code('treasury'))

    def test_stats_shape(self):
        stats = catalog_mod.stats()
        self.assertEqual(stats['modules'], 10)
        self.assertGreaterEqual(stats['menus'], 250)
        self.assertEqual(stats['codes'], len(catalog_mod.codes_for()))
        self.assertEqual(
            [row['key'] for row in stats['actions']],
            ['view', 'create', 'edit', 'delete', 'approve', 'export'],
        )

    def test_module_any_permission(self):
        granted = {'treasury.receipts.edit', 'treasury.receipts.view'}
        self.assertTrue(catalog_mod.module_any_permission(granted, 'treasury', ('view',)))
        self.assertTrue(catalog_mod.module_any_permission(granted, 'treasury', ('edit',)))
        self.assertFalse(catalog_mod.module_any_permission(granted, 'treasury', ('delete',)))
        self.assertFalse(catalog_mod.module_any_permission(granted, 'accounting', ('view',)))
        self.assertFalse(catalog_mod.module_any_permission(set(), 'treasury', ('view',)))


class PermissionCompatibilityTests(SimpleTestCase):
    def test_legacy_permissions_are_all_mapped(self):
        for legacy in engine.ALL_PERMISSIONS:
            self.assertIn(legacy, catalog_mod.LEGACY_RULES)

    def test_fine_codes_imply_legacy_permissions(self):
        granted = {'treasury.receipts.create', 'treasury.receipts.edit'}
        self.assertTrue(engine._legacy_implied('treasury_execute', granted))
        self.assertFalse(engine._legacy_implied('treasury_view', granted))
        self.assertFalse(engine._legacy_implied('treasury_approve', granted))

        approve = {'treasury.received-checks.approve'}
        self.assertTrue(engine._legacy_implied('treasury_approve', approve))

    def test_legacy_permissions_imply_fine_codes(self):
        legacy = {'treasury_view': True, 'treasury_execute': False}
        self.assertTrue(engine._fine_implied('treasury.receipts.view', legacy))
        self.assertFalse(engine._fine_implied('treasury.receipts.edit', legacy))
        self.assertFalse(engine._fine_implied('broken-code', legacy))

    def test_documents_legacy_mapping(self):
        legacy = {'can_approve_documents': True}
        self.assertTrue(engine._fine_implied('documents.library.view', legacy) is False)
        self.assertTrue(engine._fine_implied('documents.workflow.approve', legacy))
        fine = {'documents.library.delete'}
        self.assertTrue(engine._legacy_implied('can_delete_documents', fine))
