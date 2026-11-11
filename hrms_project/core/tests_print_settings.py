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
    'company': {'name': 'شرکت نمونه', 'subtitle': 'کد ۱', 'logo_text': 'ش‌ن'},
    'meta': [('تاریخ', '۱۴۰۵/۰۱/۰۱')],
    'sections': [{'html': '<table><tr><td>۱</td></tr></table>'}],
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


class HeaderFooterLayoutTests(SimpleTestCase):
    def test_custom_header_and_footer_are_rendered(self):
        html = layout.render_document(DOCUMENT, SETTINGS)
        self.assertIn('مؤسسه خاتم پاسارگاد', html)
        self.assertIn('دبیرخانه مرکزی', html)
        self.assertIn('02112345678', html)
        self.assertIn('کلیه مکاتبات با ذکر شمارهٔ اندیکاتور', html)
        self.assertIn('این سند از سامانهٔ کیان ERP صادر شده است', html)
        self.assertIn('pe-page-number', html)
        self.assertNotIn('۱۴۰۵/۰۱/۰۱</strong>', html)  # show_meta=False

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
