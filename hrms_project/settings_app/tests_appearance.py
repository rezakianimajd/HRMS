from django.test import SimpleTestCase

from settings_app.appearance_schema import sanitize_design
from settings_app.views import _sanitize_appearance


class AppearanceSchemaTests(SimpleTestCase):
    def test_legacy_typography_is_migrated_to_design_roles(self):
        result = _sanitize_appearance({
            'typography': {'headerSize': 26, 'bodySize': 14, 'family': 'tahoma'},
        })
        self.assertEqual(result['design']['typography']['roles']['pageHeader']['size'], 26)
        self.assertEqual(result['design']['typography']['roles']['body']['size'], 14)
        self.assertEqual(result['design']['typography']['family'], 'tahoma')
        self.assertEqual(result['typography']['headerSize'], 26)

    def test_design_only_payload_keeps_custom_roles_and_colors(self):
        result = _sanitize_appearance({
            'design': {
                'typography': {'roles': {'tableCell': {'size': 15, 'weight': 600}}},
                'colors': {'primary': '#123456'},
                'shape': {'large': 20},
            },
        })
        design = result['design']
        self.assertEqual(design['typography']['roles']['tableCell']['size'], 15)
        self.assertEqual(design['typography']['roles']['tableCell']['weight'], 600)
        self.assertEqual(design['colors']['primary'], '#123456')
        self.assertEqual(design['shape']['large'], 20)
        self.assertEqual(result['typography']['bodySize'], 13)

    def test_unknown_or_unsafe_values_fall_back_to_defaults(self):
        design = sanitize_design({
            'colors': {'primary': 'red'},
            'shape': {'large': 500},
            'shadows': {'card': 'javascript:alert(1)'},
            'surfaces': {'card': {'border': '1px solid red'}},
        })
        self.assertEqual(design['colors']['primary'], '#6366f1')
        self.assertEqual(design['shape']['large'], 16)
        self.assertEqual(design['shadows']['card'], '0 4px 18px rgba(15,23,42,0.06)')
        self.assertEqual(design['surfaces']['card']['border'], '1px solid #e8edf4')

    def test_zero_values_are_kept(self):
        design = sanitize_design({'shape': {'small': 0}, 'spacing': {'sectionGap': 0}})
        self.assertEqual(design['shape']['small'], 0)
        self.assertEqual(design['spacing']['sectionGap'], 0)
