"""تست‌های بدون دیتابیس برای یکسان‌سازی شمارهٔ نامه‌های صادره."""
from django.test import SimpleTestCase

from correspondences.letter_numbers import (
    normalize_letter_number, parse_letter_number, university_number,
)


class ParseLetterNumberTests(SimpleTestCase):

    def test_canonical_number_is_unchanged(self):
        self.assertEqual(normalize_letter_number('05/ص م /5792'), '05/ص م/5792')

    def test_swapped_year_and_sequence(self):
        self.assertEqual(normalize_letter_number('5802/ص م/05'), '05/ص م/5802')
        self.assertEqual(normalize_letter_number('7596/ص م/05'), '05/ص م/7596')
        self.assertEqual(normalize_letter_number('5793/ص/05'), '05/ص/5793')

    def test_year_1405_is_shortened(self):
        self.assertEqual(normalize_letter_number('1405/950/ص م'), '05/ص م/950')

    def test_persian_digits_are_supported(self):
        self.assertEqual(normalize_letter_number('۰۵/ص م/۰۰۰۷'), '05/ص م/0007')

    def test_prefix_keeps_both_letters(self):
        self.assertEqual(normalize_letter_number('04/ص م  /5002'), '04/ص م/5002')

    def test_bank_style_number_picks_largest_serial(self):
        self.assertEqual(normalize_letter_number('ص/05/110/100087'), '05/ص/100087')

    def test_number_without_year_is_not_normalized(self):
        self.assertIsNone(normalize_letter_number('42/23184'))

    def test_number_without_prefix_is_not_normalized(self):
        self.assertIsNone(normalize_letter_number('05/5792'))

    def test_empty_number(self):
        self.assertIsNone(normalize_letter_number(''))
        self.assertIsNone(parse_letter_number(None))


class UniversityNumberTests(SimpleTestCase):

    def test_serial_becomes_three_digits(self):
        self.assertEqual(university_number('7'), '007')
        self.assertEqual(university_number('798'), '798')

    def test_empty_serial(self):
        self.assertEqual(university_number(''), '')
