from datetime import date

from django.test import SimpleTestCase

from projects.jalali_utils import (
    JALALI_MONTHS, jalali_key, jalali_label, jalali_parts, jalali_period_fields, jalali_short,
)


class JalaliUtilsTests(SimpleTestCase):
    """تبدیل‌های شمسی — مبنای درستی گزارش‌های ماهانهٔ فاز ۰."""

    def test_first_day_of_1405(self):
        self.assertEqual(jalali_parts(date(2026, 3, 21)), {'jy': 1405, 'jm': 1, 'jd': 1})

    def test_last_day_of_1404(self):
        self.assertEqual(jalali_parts(date(2026, 3, 20)), {'jy': 1404, 'jm': 12, 'jd': 29})

    def test_key_label_short(self):
        self.assertEqual(jalali_key(date(2026, 3, 21)), '1405-01')
        self.assertEqual(jalali_label(date(2026, 3, 21)), f'{JALALI_MONTHS[0]} 1405')
        self.assertEqual(jalali_short(date(2026, 3, 21)), '01/05')

    def test_mid_autumn(self):
        self.assertEqual(jalali_key(date(2026, 1, 1)), '1404-10')
        self.assertEqual(jalali_label(date(2026, 1, 1)), f'{JALALI_MONTHS[9]} 1404')
        self.assertEqual(jalali_short(date(2026, 1, 1)), '10/04')

    def test_period_fields_contract(self):
        fields = jalali_period_fields(date(2026, 3, 21))
        self.assertEqual(
            set(fields), {'month', 'month_short', 'month_label', 'jy', 'jm', 'jd'},
        )
        self.assertEqual(fields['month'], '1405-01')
        self.assertEqual(fields['month_short'], '01/05')
        self.assertEqual(fields['month_label'], f'{JALALI_MONTHS[0]} 1405')

    def test_empty_inputs(self):
        self.assertIsNone(jalali_parts(None))
        self.assertIsNone(jalali_key(None))
        self.assertEqual(jalali_label(None), '')
        self.assertEqual(jalali_short(None), '')
        self.assertIsNone(jalali_period_fields(None)['month'])

    def test_month_names(self):
        self.assertEqual(len(JALALI_MONTHS), 12)
        self.assertEqual(JALALI_MONTHS[11], 'اسفند')
