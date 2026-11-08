"""تست‌های موتور چاپ یکپارچه (بدون دیتابیس)."""
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from core.print_engine import components as pe
from core.print_engine import layout, registry


class ComponentTests(SimpleTestCase):
    """اجزای پایهٔ سند."""

    def test_escape_blocks_injection(self):
        self.assertEqual(pe.esc('<script>alert(1)</script>'),
                         '&lt;script&gt;alert(1)&lt;/script&gt;')
        self.assertEqual(pe.esc(None), '')

    def test_fa_digits(self):
        self.assertEqual(pe.fa_digits('1405/08'), '۱۴۰۵/۰۸')

    def test_money_formats_with_separator_and_unit(self):
        self.assertEqual(pe.money(1234567), '۱٬۲۳۴٬۵۶۷ ریال')
        self.assertEqual(pe.money('12000', 'تومان', with_unit=False), '۱۲٬۰۰۰')
        self.assertEqual(pe.money(None), '')

    def test_jalali_converts_and_pads(self):
        self.assertEqual(pe.jalali('2026-03-21'), '۱۴۰۵/۰۱/۰۱')
        self.assertEqual(pe.jalali(''), '')
        self.assertEqual(pe.jalali('not-a-date'), 'not-a-date')

    def test_amount_words_uses_treasury_helper(self):
        self.assertIn('میلیون', pe.amount_words(1000000))

    def test_field_grid_pads_rows_and_skips_empty(self):
        html = pe.field_grid([('الف', '۱'), ('ب', ''), ('ج', '۳')], columns=2)
        self.assertEqual(html.count('<tr>'), 1)
        self.assertIn('pe-label', html)
        self.assertNotIn('>ب<', html)

    def test_field_grid_allows_preformatted_html_values(self):
        html = pe.field_grid([('مبلغ', pe.raw('<strong>۱۲۳</strong>'))])
        self.assertIn('<strong>۱۲۳</strong>', html)

    def test_field_grid_escapes_plain_values(self):
        html = pe.field_grid([('نام', '<b>x</b>')])
        self.assertNotIn('<b>x</b>', html)

    def test_data_table_renders_columns_and_formats(self):
        html = pe.data_table(
            [{'key': 'n', 'label': 'شماره'}, {'key': 'd', 'label': 'تاریخ', 'format': 'jalali'},
             {'key': 'm', 'label': 'مبلغ', 'format': 'money'}],
            [{'n': 'A-1', 'd': '2026-03-21', 'm': 5000}],
        )
        self.assertIn('A-1', html)
        self.assertIn('۱۴۰۵/۰۱/۰۱', html)
        self.assertIn('۵٬۰۰۰ ریال', html)
        self.assertIn('<thead>', html)

    def test_data_table_empty_state_and_total_row(self):
        html = pe.data_table([{'key': 'a', 'label': 'الف'}], [], {
            'total_row': {'label': 'جمع', 'value': '۰'},
        })
        self.assertIn('داده‌ای برای چاپ نیست', html)
        self.assertIn('<tfoot>', html)

    def test_signatures_and_watermark(self):
        self.assertIn('مهر و امضا', pe.signatures([{'title': 'مهر و امضا'}]))
        self.assertEqual(pe.signatures([]), '')
        self.assertIn('پیش‌نویس', pe.watermark('پیش‌نویس'))
        self.assertEqual(pe.watermark(''), '')


class LayoutTests(SimpleTestCase):
    """قالب سند: اندازهٔ کاغذ، جهت، سرصفحه/پاصفحه و واترمارک."""

    @staticmethod
    def _document(**overrides):
        document = {
            'title': 'فیش دریافت',
            'subtitle': 'شمارهٔ ۱۲۳',
            'company': {'name': 'شرکت نمونه', 'subtitle': 'کد ۱'},
            'meta': [('شعبه', 'مرکزی'), ('خالی', '')],
            'sections': [{'title': 'مشخصات', 'html': pe.field_grid([('مبلغ', '۱۰۰')])}],
            'printed_on': '2026-11-08',
        }
        document.update(overrides)
        return document

    def test_paper_and_orientation(self):
        html = layout.render_document(self._document(), {'paper': 'A5', 'orientation': 'landscape'})
        self.assertIn('@page { size: A5 landscape', html)
        self.assertIn('dir="rtl"', html)

    def test_brand_header_and_meta(self):
        html = layout.render_document(self._document(), {})
        self.assertIn('شرکت نمونه', html)
        self.assertIn('شعبه', html)
        self.assertNotIn('خالی', html)

    def test_footer_has_page_number_and_print_date(self):
        html = layout.render_document(self._document(), {})
        self.assertIn('pe-page-number', html)
        self.assertIn('تاریخ چاپ', html)

    def test_watermark_note_and_barcode(self):
        html = layout.render_document(
            self._document(watermark='پیش‌نویس', note='یادداشت', barcode='<svg></svg>'), {},
        )
        self.assertIn('pe-watermark', html)
        self.assertIn('یادداشت', html)
        self.assertIn('pe-barcode', html)

    def test_sections_can_be_hidden(self):
        html = layout.render_document(
            self._document(), {'show_header': False, 'show_footer': False},
        )
        self.assertNotIn('<header class="pe-header">', html)
        self.assertNotIn('<footer class="pe-footer">', html)


class RegistryTests(SimpleTestCase):
    """نگاشت نوع سند به سازنده و کنترل مجوزها."""

    @staticmethod
    def _superuser_request():
        return SimpleNamespace(user=SimpleNamespace(is_authenticated=True, is_superuser=True))

    def test_unknown_document_raises(self):
        with self.assertRaises(registry.PrintError) as context:
            registry.render('nope', {})
        self.assertEqual(context.exception.status, 400)

    def test_table_requires_columns(self):
        with self.assertRaises(registry.PrintError) as context:
            registry.build_table({'module': 'hrms'}, {}, request=self._superuser_request())
        self.assertEqual(context.exception.status, 400)

    def test_table_renders_rows_with_superuser(self):
        html = registry.render('table', {
            'module': 'hrms',
            'title': 'گزارش آزمایشی',
            'columns': [{'key': 'a', 'label': 'الف'}],
            'rows': [{'a': '۱'}],
        }, request=self._superuser_request())
        self.assertIn('گزارش آزمایشی', html)
        self.assertIn('الف', html)

    def test_custom_requires_html(self):
        with self.assertRaises(registry.PrintError):
            registry.build_custom({'module': 'treasury'}, {}, request=self._superuser_request())

    def test_custom_wraps_html(self):
        html = registry.render('custom', {
            'module': 'treasury', 'title': 'فیش', 'html': '<p>محتوا</p>',
        }, request=self._superuser_request())
        self.assertIn('محتوا', html)
        self.assertIn('pe-sheet', html)

    def test_anonymous_cannot_print(self):
        request = SimpleNamespace(user=SimpleNamespace(is_authenticated=False))
        with self.assertRaises(registry.PrintError) as context:
            registry.build_table(
                {'module': 'hrms', 'columns': [{'key': 'a', 'label': 'ا'}]}, {}, request=request,
            )
        self.assertEqual(context.exception.status, 403)

    def test_legacy_user_without_codes_is_allowed(self):
        user = SimpleNamespace(is_authenticated=True, is_superuser=False, pk=7)
        with patch('core.engines.permission_engine.fine_permissions_for', return_value={}), \
                patch('core.engines.permission_engine.module_action_granted', return_value=False):
            self.assertTrue(registry.can_print(user, 'contracts'))

    def test_user_with_codes_needs_view_permission(self):
        user = SimpleNamespace(is_authenticated=True, is_superuser=False, pk=7)
        codes = {'treasury.receipts.edit': True}
        with patch('core.engines.permission_engine.fine_permissions_for', return_value=codes), \
                patch('core.engines.permission_engine.module_action_granted', return_value=False):
            self.assertFalse(registry.can_print(user, 'treasury'))
        with patch('core.engines.permission_engine.fine_permissions_for', return_value=codes), \
                patch('core.engines.permission_engine.module_action_granted', return_value=True):
            self.assertTrue(registry.can_print(user, 'treasury'))


class PrintApiTests(SimpleTestCase):
    """اندپوینت‌های چاپ."""

    def test_urls_are_registered(self):
        from django.urls import reverse

        self.assertTrue(reverse('api-print-preview').endswith('/print/preview/'))
        self.assertTrue(reverse('api-print-options').endswith('/print/options/'))

    def test_available_documents_payload(self):
        keys = {item['key'] for item in registry.available_documents()}
        self.assertEqual(keys, {'letter', 'table', 'custom'})
