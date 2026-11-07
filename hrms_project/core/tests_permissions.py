"""تست‌های کاتالوگ مجوزهای ریز و سازگاری لایهٔ قدیمی (بدون دیتابیس)."""
from types import SimpleNamespace
from unittest.mock import patch

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

    def test_legacy_permissions_from_fine_mixed_modules(self):
        fine = {
            'treasury.receipts.view',
            'treasury.receipts.approve',
            'documents.library.view',
        }
        derived = catalog_mod.legacy_permissions_from_fine(fine)
        self.assertTrue(derived['treasury_view'])
        self.assertTrue(derived['treasury_approve'])
        self.assertFalse(derived['treasury_execute'])
        self.assertTrue(derived['can_manage_documents'] is False)
        self.assertFalse(derived['can_delete_documents'])
        self.assertFalse(derived['can_approve_leaves'])

    def test_correspondence_legacy_mapping(self):
        fine = {'correspondence.incoming.delete'}
        self.assertTrue(engine._legacy_implied('can_delete_documents', fine))
        self.assertFalse(engine._legacy_implied('can_manage_documents', fine))
        created = {'correspondence.outgoing.create'}
        self.assertTrue(engine._legacy_implied('can_manage_documents', created))
        self.assertTrue(catalog_mod.legacy_permissions_from_fine(created)['can_manage_documents'])
        self.assertTrue(engine._fine_implied(
            'correspondence.incoming.delete', {'can_delete_documents': True},
        ))
        self.assertFalse(engine._fine_implied(
            'documents.library.delete', {'can_approve_documents': True},
        ))

    def test_module_action_granted_from_fine_and_legacy(self):
        user = SimpleNamespace(is_authenticated=True, is_superuser=False)
        with patch.object(engine, 'fine_permissions_for',
                          return_value={'correspondence.incoming.delete': True}), \
                patch.object(engine, 'permissions_for', return_value={}):
            self.assertTrue(engine.module_action_granted(user, 'correspondence', ('delete',)))
            self.assertFalse(engine.module_action_granted(user, 'correspondence', ('edit',)))
            self.assertFalse(engine.module_action_granted(user, 'documents', ('delete',)))

        with patch.object(engine, 'fine_permissions_for', return_value={}), \
                patch.object(engine, 'permissions_for', return_value={'can_delete_documents': True}):
            self.assertTrue(engine.module_action_granted(user, 'correspondence', ('delete',)))
            self.assertFalse(engine.module_action_granted(user, 'treasury', ('delete',)))

        self.assertFalse(engine.module_action_granted(None, 'correspondence', ('delete',)))
        self.assertTrue(engine.module_action_granted(
            SimpleNamespace(is_authenticated=True, is_superuser=True),
            'correspondence', ('delete',),
        ))
        with patch.object(engine, 'fine_permissions_for', return_value={}), \
                patch.object(engine, 'permissions_for', return_value={}):
            with self.assertRaises(Exception) as ctx:
                engine.require_module_action(user, 'correspondence', ('delete',), 'حذف مکاتبات')
            self.assertIn('دسترسی غیرمجاز', str(ctx.exception))

    def test_modules_brief_counts_per_module(self):
        brief = catalog_mod.modules_brief({
            'treasury.receipts.view', 'treasury.receipts.edit', 'settings.general.view',
        })
        by_slug = {row['slug']: row for row in brief}
        self.assertEqual(by_slug['treasury']['count'], 2)
        self.assertEqual(by_slug['settings']['count'], 1)
        self.assertIn('name', by_slug['treasury'])
        self.assertNotIn('accounting', by_slug)

    def test_user_access_model_fields(self):
        from core.models.user import UserAccess

        names = {field.name for field in UserAccess._meta.get_fields()}
        for name in ('user', 'is_full_access', 'permissions', 'applications',
                     'note', 'updated_by'):
            self.assertIn(name, names)
        self.assertEqual(UserAccess._meta.get_field('user').remote_field.related_name, 'access')
