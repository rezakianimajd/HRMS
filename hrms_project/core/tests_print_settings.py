"""تست‌های تنظیمات چاپ (سربرگ/پاورقی/کاغذ) — بدون نیاز به دیتابیس."""
from unittest.mock import patch

from django.test import SimpleTestCase

from core.print_engine import layout, registry
from settings_app.print_settings import DEFAULT_PRINT_SETTINGS, sanitize_print

SETTINGS = {
    'paper': 'A4',
    'orientation': 'portrait',
    'font_size': 9.5,
    'margin': '10mm 9mm 12mm 9mm',
    'header': {
        'enabled': True, 'show_logo': True, 'show_meta': False,
        'title': 'مؤسسه خاتم پاسارگاد', 'subtitle': 'دبیرخانه مرکزی',
        'address': 'تهران، خیابان ولیعصر', 'phone': '02112345678',
        'email': 'info@example.com', 'website': 'example.com',
        'extra': 'کلیه مکاتبات با ذکر شمارهٔ اندیکاتور ارسال شود',
        'align': 'center', 'show_border': True,
    },
    'footer': {
        'enabled': True, 'text': 'این سند از سامانهٔ کیان ERP صادر شده است',
        'extra': 'نسخهٔ کنترل‌شده', 'show_page_number': True,
        'show_printed_at': False, 'align': 'center', 'show_border': True,
    },
}

DOCUMENT = {
    'title': 'گزارش نمونه',
    'subtitle': 'زیرعنوان سند',
    'company': {'name': 'شرکت نمونه', 'subtitle': 'کد ۱'},
    'meta': [('تاریخ', '۱۴۰۵/۰۱/۰۱')],
    'sections': [{'html': '<table><tr><td>۱</td></tr></table>'}],
    'signatures': '<div class="pe-sign-row"><div class="pe-sign">مهر و امضا</div></div>',
}


class SanitizePrintTests(SimpleTestCase):
    def test_defaults_when_empty(self):
        clean = sanitize_print(None)
        self.assertEqual(clean['paper'], 'A4')
        self.assertEqual(clean['orientation'], 'portrait')
        self.assertTrue(clean['header']['enabled'])
        self.assertTrue(clean['footer']['show_page_number'])
        self.assertEqual(clean['header']['title'], '')

    def test_values_are_clamped_and_validated(self):
        clean = sanitize_print({
            'paper': 'B5',
            'orientation': 'diagonal',
            'font_size': 40,
            'margin': 'bad-margin',
            'header': {'align': 'upside', 'title': ' x ' * 200},
            'footer': {'align': 'left'},
        })
        self.assertEqual(clean['paper'], 'A4')
        self.assertEqual(clean['orientation'], 'portrait')
        self.assertEqual(clean['font_size'], 14)
        self.assertEqual(clean['margin'], DEFAULT_PRINT_SETTINGS['margin'])
        self.assertEqual(clean['header']['align'], 'center')
        self.assertLessEqual(len(clean['header']['title']), 120)
        self.assertEqual(clean['footer']['align'], 'left')

    def test_truthy_strings_are_coerced(self):
        clean = sanitize_print({'header': {'enabled': 'false'}, 'footer': {'enabled': '1'}})
        self.assertFalse(clean['header']['enabled'])
        self.assertTrue(clean['footer']['enabled'])

    def test_header_sizes_are_clamped(self):
        clean = sanitize_print({
            'header': {'logo_width': 500, 'logo_height': 1, 'company_font_size': 99,
                       'title_font_size': 1, 'space_top': -5, 'space_bottom': 100},
        })
        self.assertEqual(clean['header']['logo_width'], 90)
        self.assertEqual(clean['header']['logo_height'], 6)
        self.assertEqual(clean['header']['company_font_size'], 24)
        self.assertEqual(clean['header']['title_font_size'], 8)
        self.assertEqual(clean['header']['space_top'], 0)
        self.assertEqual(clean['header']['space_bottom'], 40)

    def test_columns_default_and_filtering(self):
        clean = sanitize_print({})
        self.assertEqual(
            clean['columns']['letter-list'],
            ['number', 'date', 'direction', 'subject', 'party', 'status', 'attachments'],
        )
        custom = sanitize_print({
            'columns': {'letter-list': ['subject', 'bogus', 'subject', 'date']},
        })
        self.assertEqual(custom['columns']['letter-list'], ['subject', 'date'])
        empty = sanitize_print({'columns': {'letter-list': []}})
        self.assertEqual(len(empty['columns']['letter-list']), 7)


class HeaderFooterLayoutTests(SimpleTestCase):
    def test_custom_header_and_footer_are_rendered(self):
        html = layout.render_document(DOCUMENT, SETTINGS)
        # سربرگ: نام شرکت → عنوان سند (عنوان config فقط fallback است) → خط
        self.assertIn('شرکت نمونه', html)
        self.assertIn('گزارش نمونه', html)
        self.assertIn('02112345678', html)
        self.assertIn('کلیه مکاتبات با ذکر شمارهٔ اندیکاتور', html)
        self.assertIn('این سند از سامانهٔ کیان ERP صادر شده است', html)
        self.assertIn('pe-page-number', html)
        # زیرعنوان و متادیتا زیر عنوان چاپ چاپ نمی‌شوند
        self.assertNotIn('زیرعنوان سند', html)
        self.assertNotIn('۱۴۰۵/۰۱/۰۱', html)

    def test_header_sizes_and_spacing_are_applied(self):
        settings = {
            **SETTINGS,
            'header': {
                **SETTINGS['header'],
                'logo_width': 42, 'logo_height': 22,
                'company_font_size': 16, 'title_font_size': 15,
                'space_top': 4, 'space_bottom': 9, 'space_side': 3,
            },
        }
        document = {
            **DOCUMENT,
            'company': {'name': 'شرکت نمونه', 'logo': 'data:image/png;base64,AAAA'},
        }
        html = layout.render_document(document, settings)
        self.assertIn('width:42mm', html)
        self.assertIn('height:22mm', html)
        self.assertIn('font-size:16pt', html)
        self.assertIn('font-size:15pt', html)
        self.assertIn('padding:4mm 3mm 9mm', html)

    def test_footer_font_size_is_applied(self):
        settings = {
            **SETTINGS,
            'footer': {**SETTINGS['footer'], 'font_size': 9, 'space_bottom': 4},
        }
        html = layout.render_document(DOCUMENT, settings)
        self.assertIn('font-size:9pt', html)
        self.assertIn('padding-bottom:4mm', html)

    def test_signatures_live_in_fixed_footer(self):
        html = layout.render_document(DOCUMENT, SETTINGS)
        footer = html.split('<footer class="pe-footer"', 1)[1]
        self.assertIn('pe-footer-sign', footer)
        self.assertIn('مهر و امضا', footer)
        # امضاها فقط یک بار و داخل پاورقی
        self.assertEqual(html.count('مهر و امضا'), 1)
        self.assertIn('pe-footer', html)

    def test_signatures_fall_back_to_body_when_footer_disabled(self):
        html = layout.render_document(
            DOCUMENT, {**SETTINGS, 'footer': {**SETTINGS['footer'], 'enabled': False}},
        )
        self.assertNotIn('<footer class="pe-footer"', html)
        self.assertIn('مهر و امضا', html)

    def test_signature_toggle_keeps_them_out_of_footer(self):
        html = layout.render_document(
            DOCUMENT, {**SETTINGS, 'footer': {**SETTINGS['footer'], 'signatures': False}},
        )
        footer = html.split('<footer class="pe-footer"', 1)[1]
        self.assertNotIn('مهر و امضا', footer)
        self.assertIn('مهر و امضا', html)

    def test_page_margin_reserves_space_for_footer(self):
        html = layout.render_document(DOCUMENT, SETTINGS)
        self.assertIn('margin: 10mm 9mm 26mm 9mm', html)
        plain = layout.render_document(
            DOCUMENT, {**SETTINGS, 'footer': {**SETTINGS['footer'], 'enabled': False}},
        )
        self.assertIn('margin: 10mm 9mm 12mm 9mm', plain)

    def test_disabled_header_and_footer_are_hidden(self):
        settings = {
            **SETTINGS,
            'header': {**SETTINGS['header'], 'enabled': False},
            'footer': {**SETTINGS['footer'], 'enabled': False},
        }
        html = layout.render_document(DOCUMENT, settings)
        self.assertNotIn('<header class="pe-header"', html)
        self.assertNotIn('<footer class="pe-footer"', html)
        self.assertIn('گزارش نمونه', html)

    def test_paper_and_orientation_reach_css(self):
        html = layout.render_document(DOCUMENT, {**SETTINGS, 'paper': 'A4', 'orientation': 'landscape'})
        self.assertIn('size: A4 landscape', html)
        self.assertIn('297mm', html)  # عرض افقی A4


class LogoAndHeaderOrderTests(SimpleTestCase):
    def test_company_logo_is_rendered_as_centered_image(self):
        document = {
            **DOCUMENT,
            'company': {'name': 'شرکت نمونه', 'logo': 'data:image/png;base64,AAAA'},
        }
        html = layout.render_document(document, SETTINGS)
        self.assertIn('<img class="pe-print-logo"', html)
        self.assertIn('pe-header-center', html)
        # جعبهٔ متنی لوگو (حروف اول نام) دیگر نباید ساخته شود
        self.assertNotIn('<div class="pe-logo">', html)

    def test_header_order_is_logo_company_title_line(self):
        document = {
            **DOCUMENT,
            'company': {'name': 'شرکت نمونه', 'logo': 'data:image/png;base64,AAAA'},
        }
        html = layout.render_document(document, SETTINGS)
        logo_at = html.index('pe-print-logo')
        name_at = html.index('pe-brand-name')
        title_at = html.index('pe-title')
        header_end = html.index('</header>')
        self.assertLess(logo_at, name_at)
        self.assertLess(name_at, title_at)
        self.assertLess(title_at, header_end)
        self.assertIn('border-bottom:2px solid #0f172a', html)

    def test_header_title_prefers_document_title(self):
        html = layout.render_document({**DOCUMENT, 'title': 'فهرست نامه‌های وارده'}, SETTINGS)
        self.assertIn('فهرست نامه‌های وارده', html)
        self.assertNotIn('مؤسسه خاتم پاسارگاد', html)

    def test_logo_file_becomes_data_uri(self):
        import os
        import tempfile

        class FakeImage:
            pass

        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, 'logo.png')
            with open(path, 'wb') as handle:
                handle.write(b'\x89PNG\r\n\x1a\n')
            image = FakeImage()
            image.path = path
            uri = registry._logo_data_uri(image)
        self.assertTrue(uri.startswith('data:image/png;base64,'))
        self.assertEqual(registry._logo_data_uri(None), '')


class RenderOptionsTests(SimpleTestCase):
    def test_company_print_settings_are_merged(self):
        with patch('settings_app.print_settings.print_settings_for', return_value=SETTINGS):
            merged = registry._render_options({'orientation': 'landscape'}, None)
        self.assertEqual(merged['paper'], 'A4')
        self.assertEqual(merged['orientation'], 'landscape')  # explicit wins
        self.assertEqual(merged['header']['title'], 'مؤسسه خاتم پاسارگاد')

    def test_explicit_header_fields_override_settings(self):
        with patch('settings_app.print_settings.print_settings_for', return_value=SETTINGS):
            merged = registry._render_options(
                {'header': {'title': 'سربرگ این چاپ'}}, None,
            )
        self.assertEqual(merged['header']['title'], 'سربرگ این چاپ')
        self.assertEqual(merged['header']['phone'], '02112345678')

    def test_letter_list_document_is_registered(self):
        self.assertIn('letter-list', registry.DOCUMENTS)
        self.assertIn(
            'letter-list', {item['key'] for item in registry.available_documents()},
        )

    def test_column_catalog_lists_letter_list_columns(self):
        catalog = registry.column_catalog()
        keys = [column['key'] for column in catalog['letter-list']]
        self.assertEqual(
            keys, ['number', 'date', 'direction', 'subject', 'party', 'status', 'attachments'],
        )
