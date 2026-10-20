from datetime import date, datetime

import jdatetime
from django.test import SimpleTestCase

from datamapping.views import _normalize_import_doc_key, _parse_date


class ImportDocumentKeyTests(SimpleTestCase):
    def test_numeric_excel_key_is_stable(self):
        self.assertEqual(_normalize_import_doc_key('2.0'), '2')
        self.assertEqual(_normalize_import_doc_key(2), '2')

    def test_text_key_and_empty_values(self):
        self.assertEqual(_normalize_import_doc_key('  1405/12  '), '1405/12')
        self.assertEqual(_normalize_import_doc_key(None), '')


class ImportDateParsingTests(SimpleTestCase):
    def test_jalali_text_converts_to_gregorian(self):
        expected = jdatetime.date(1403, 12, 25).togregorian()
        self.assertEqual(_parse_date('1403/12/25'), expected)
        self.assertEqual(_parse_date('۱۴۰۳/۱۲/۲۵'), expected)

    def test_jalali_text_with_time_is_accepted(self):
        expected = jdatetime.date(1403, 12, 25).togregorian()
        self.assertEqual(_parse_date('1403/12/25 00:00:00'), expected)
        self.assertEqual(_parse_date('1403-12-25T10:30:00'), expected)

    def test_eight_digit_jalali_and_gregorian_dates(self):
        self.assertEqual(
            _parse_date(14031225),
            jdatetime.date(1403, 12, 25).togregorian(),
        )
        self.assertEqual(_parse_date('20250315'), date(2025, 3, 15))

    def test_invalid_date_is_rejected_not_replaced_with_today(self):
        self.assertIsNone(_parse_date('تاریخ نامعتبر'))

    def test_excel_and_datetime_cells(self):
        from openpyxl.utils.datetime import from_excel

        serial = 45200
        self.assertEqual(_parse_date(serial), from_excel(serial).date())
        self.assertEqual(_parse_date(str(serial)), from_excel(serial).date())
        self.assertEqual(_parse_date(datetime(2025, 3, 15, 9, 30)), date(2025, 3, 15))
