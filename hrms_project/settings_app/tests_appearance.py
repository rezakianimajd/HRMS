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

    def test_info_cards_headers_tables_and_lists_are_validated(self):
        design = sanitize_design({
            'infoCards': {
                'variant': 'detailed', 'surface': 'glass', 'align': 'center',
                'showIcon': False, 'labelPosition': 'above', 'glassOpacity': 0.7,
                'glassBlur': 22, 'tint': 14,
            },
            'headers': {
                'variant': 'centered', 'surface': 'tinted', 'showSubtitle': True,
                'subtitlePosition': 'inline', 'showBadge': False,
            },
            'tables': {
                'striped': True, 'hover': False, 'headerStyle': 'plain',
                'cellPadding': 10, 'rowHeight': 44,
            },
            'lists': {'variant': 'compact', 'surface': 'glass', 'showDivider': False},
        })
        self.assertEqual(design['infoCards']['variant'], 'detailed')
        self.assertEqual(design['infoCards']['surface'], 'glass')
        self.assertEqual(design['infoCards']['align'], 'center')
        self.assertFalse(design['infoCards']['showIcon'])
        self.assertEqual(design['infoCards']['labelPosition'], 'above')
        self.assertAlmostEqual(design['infoCards']['glassOpacity'], 0.7)
        self.assertEqual(design['headers']['subtitlePosition'], 'inline')
        self.assertFalse(design['headers']['showBadge'])
        self.assertTrue(design['tables']['striped'])
        self.assertFalse(design['tables']['hover'])
        self.assertEqual(design['tables']['headerStyle'], 'plain')
        self.assertEqual(design['tables']['rowHeight'], 44)
        self.assertEqual(design['lists']['variant'], 'compact')
        self.assertFalse(design['lists']['showDivider'])


    def test_table_divider_align_and_frame_tokens_are_validated(self):
        design = sanitize_design({
            'tables': {
                'headerAlign': 'center', 'dividerStyle': 'dotted', 'dividerColor': '#7C3AED',
                'dividerOpacity': 140, 'frame': 'card', 'frameMarginX': 24,
                'framePadding': 10, 'singleLine': True, 'columnMinWidth': 130,
            },
        })
        tables = design['tables']
        self.assertEqual(tables['headerAlign'], 'center')
        self.assertEqual(tables['dividerStyle'], 'dotted')
        self.assertEqual(tables['dividerColor'], '#7c3aed')
        # مقدار خارج از بازه به پیش‌فرض برمی‌گردد (۱۰۰)
        self.assertEqual(tables['dividerOpacity'], 100)
        self.assertEqual(tables['frame'], 'card')
        self.assertEqual(tables['frameMarginX'], 24)
        self.assertEqual(tables['framePadding'], 10)
        self.assertTrue(tables['singleLine'])
        self.assertEqual(tables['columnMinWidth'], 130)

    def test_invalid_table_divider_values_fall_back_to_defaults(self):
        design = sanitize_design({
            'tables': {
                'headerAlign': 'middle', 'dividerStyle': 'wavy', 'dividerColor': 'url(x)',
                'frame': 'floating', 'singleLine': 'yes', 'frameMarginX': 900,
            },
        })
        tables = design['tables']
        self.assertEqual(tables['headerAlign'], 'center')
        self.assertEqual(tables['dividerStyle'], 'solid')
        self.assertEqual(tables['dividerColor'], '#e2e8f0')
        self.assertEqual(tables['frame'], 'card')
        self.assertTrue(tables['singleLine'])
        self.assertEqual(tables['frameMarginX'], 0)


    def test_table_typography_and_color_tokens_are_validated(self):
        design = sanitize_design({
            'tables': {
                'headerFontSize': 15.5, 'headerFontWeight': 800, 'headerHeight': 52,
                'headerColorMode': 'custom', 'headerColor': '#7C3AED',
                'cellFontSize': 12, 'cellFontWeight': 400, 'cellAlign': 'start',
                'cellColorMode': 'custom', 'cellColor': '#0F172A',
                'numberFont': 'mono', 'hoverTint': 12, 'stripeTint': 8, 'dividerWidth': 2,
            },
        })
        tables = design['tables']
        self.assertEqual(tables['headerFontSize'], 15.5)
        self.assertEqual(tables['headerFontWeight'], 800)
        self.assertEqual(tables['headerHeight'], 52)
        self.assertEqual(tables['headerColorMode'], 'custom')
        self.assertEqual(tables['headerColor'], '#7c3aed')
        self.assertEqual(tables['cellFontSize'], 12)
        self.assertEqual(tables['cellFontWeight'], 400)
        self.assertEqual(tables['cellAlign'], 'start')
        self.assertEqual(tables['cellColor'], '#0f172a')
        self.assertEqual(tables['numberFont'], 'mono')
        self.assertEqual(tables['hoverTint'], 12)
        self.assertEqual(tables['stripeTint'], 8)
        self.assertEqual(tables['dividerWidth'], 2)

    def test_invalid_table_typography_falls_back_to_defaults(self):
        tables = sanitize_design({
            'tables': {
                'headerFontSize': 90, 'headerFontWeight': 1000, 'cellAlign': 'middle',
                'headerColorMode': 'wrong', 'cellColorMode': 'wrong', 'numberFont': 'serif',
                'headerColor': 'red', 'cellColor': 'url(x)', 'dividerWidth': 9,
                'hoverTint': 200,
            },
        })['tables']
        self.assertEqual(tables['headerFontSize'], 13)
        self.assertEqual(tables['headerFontWeight'], 700)
        self.assertEqual(tables['cellAlign'], 'auto')
        self.assertEqual(tables['headerColorMode'], 'theme')
        self.assertEqual(tables['cellColorMode'], 'theme')
        self.assertEqual(tables['numberFont'], 'inherit')
        self.assertEqual(tables['headerColor'], '#334155')
        self.assertEqual(tables['cellColor'], '#334155')
        self.assertEqual(tables['dividerWidth'], 1)
        self.assertEqual(tables['hoverTint'], 6)

    def test_invalid_structural_values_fall_back(self):
        design = sanitize_design({
            'infoCards': {'variant': 'unknown', 'glassOpacity': 5},
            'tables': {'headerStyle': 'gradient', 'rowHeight': 2},
            'lists': {'variant': 'unknown'},
        })
        self.assertEqual(design['infoCards']['variant'], 'inline')
        self.assertAlmostEqual(design['infoCards']['glassOpacity'], 0.55)
        self.assertEqual(design['tables']['headerStyle'], 'filled')
        self.assertEqual(design['tables']['rowHeight'], 38)
        self.assertEqual(design['lists']['variant'], 'default')

    def test_toolbar_tokens_are_validated(self):
        toolbar = sanitize_design({'toolbar': {
            'searchVariant': 'filled', 'searchSurface': 'tinted', 'searchRadius': 20,
            'searchHeight': 48, 'searchWidth': 320, 'searchIconPosition': 'end',
            'searchPlaceholder': '<b>جستجو</b> در قراردادها', 'filtersVariant': 'contained',
            'filtersLabel': '  فیلترها  ', 'filtersIconPosition': 'end', 'filtersRadius': 14,
            'showFiltersCount': False, 'panelSurface': 'glass', 'panelRadius': 18,
            'panelPadding': 16, 'panelMinWidth': 220, 'panelGap': 12, 'labelsPosition': 'inline',
            'openByDefault': True, 'showActiveChips': False, 'chipStyle': 'outlined',
            'showReset': False, 'resetLabel': 'پاک‌سازی',
        }})['toolbar']
        self.assertEqual(toolbar['searchVariant'], 'filled')
        self.assertEqual(toolbar['searchPlaceholder'], 'جستجو در قراردادها')  # تگ‌های HTML حذف می‌شوند
        self.assertEqual(toolbar['filtersLabel'], 'فیلترها')
        self.assertEqual(toolbar['panelMinWidth'], 220)
        self.assertEqual(toolbar['panelGap'], 12)
        self.assertTrue(toolbar['openByDefault'])
        self.assertFalse(toolbar['showFiltersCount'])
        self.assertFalse(toolbar['showActiveChips'])
        self.assertEqual(toolbar['resetLabel'], 'پاک‌سازی')

    def test_invalid_toolbar_values_fall_back(self):
        toolbar = sanitize_design({'toolbar': {
            'searchVariant': 'neon', 'searchIconPosition': 'middle', 'filtersVariant': 'ghost',
            'panelSurface': 'metal', 'labelsPosition': 'left', 'chipStyle': 'solid',
            'searchHeight': 300, 'panelMinWidth': 999, 'filtersLabel': '   ',
        }})['toolbar']
        self.assertEqual(toolbar['searchVariant'], 'soft')
        self.assertEqual(toolbar['searchIconPosition'], 'start')
        self.assertEqual(toolbar['filtersVariant'], 'outlined')
        self.assertEqual(toolbar['panelSurface'], 'solid')
        self.assertEqual(toolbar['labelsPosition'], 'above')
        self.assertEqual(toolbar['chipStyle'], 'soft')
        self.assertEqual(toolbar['searchHeight'], 40)
        self.assertEqual(toolbar['panelMinWidth'], 160)
        self.assertEqual(toolbar['filtersLabel'], 'فیلترها')

    def test_table_pagination_tokens_are_validated(self):
        tables = sanitize_design({'tables': {
            'rowsPerPage': 50, 'showPagination': False, 'paginationVariant': 'simple',
            'paginationDense': False, 'showPaginationRange': False,
            'paginationColorMode': 'custom', 'paginationColor': '#0F766E',
            'paginationFontSize': 14,
        }})['tables']
        self.assertEqual(tables['rowsPerPage'], 50)
        self.assertFalse(tables['showPagination'])
        self.assertEqual(tables['paginationVariant'], 'simple')
        self.assertFalse(tables['paginationDense'])
        self.assertFalse(tables['showPaginationRange'])
        self.assertEqual(tables['paginationColorMode'], 'custom')
        self.assertEqual(tables['paginationColor'], '#0f766e')
        self.assertEqual(tables['paginationFontSize'], 14)

    def test_invalid_table_pagination_values_fall_back(self):
        tables = sanitize_design({'tables': {
            'rowsPerPage': 500, 'paginationVariant': 'carousel',
            'paginationColorMode': 'neon', 'paginationColor': 'blue',
            'paginationFontSize': 99,
        }})['tables']
        self.assertEqual(tables['rowsPerPage'], 20)
        self.assertEqual(tables['visibleRows'], 13)
        self.assertEqual(tables['paginationVariant'], 'pages')
        self.assertEqual(tables['paginationColorMode'], 'primary')
        self.assertEqual(tables['paginationColor'], '#6366f1')
        self.assertEqual(tables['paginationFontSize'], 12)

