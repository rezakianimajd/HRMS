"""تست‌های بدون دیتابیس برای تطبیق «شماره ثبت» وارده با شیت اندیکاتور."""
from datetime import date

from django.test import SimpleTestCase

from correspondences.reg_numbers import (
    build_indexes, build_updates, digits, match_letter, normalize_number,
    normalize_text, to_jalali_text,
)


def excel_row(excel_row, company='', unit='', number='', received='', subject=''):
    return {
        'excel_row': excel_row,
        'company_reg_no': company,
        'unit_reg_no': unit,
        'number': number,
        'received_date': received,
        'subject': subject,
    }


def letter(**overrides):
    base = {
        'id': 1, 'number': '', 'external_number': '', 'received_date': None,
        'letter_date': None, 'subject': '', 'company_reg_no': '', 'unit_reg_no': '',
        'source_ref': '',
    }
    base.update(overrides)
    return base


class NormalizationTests(SimpleTestCase):

    def test_digits_converts_persian_and_arabic(self):
        self.assertEqual(digits('۱۲۳٤٥'), '12345')

    def test_numbers_ignore_spaces_and_direction_marks(self):
        self.assertEqual(normalize_number(' 05/ص م / 5445\u200e '), '05/صم/5445')

    def test_subject_normalization_strips_punctuation_and_spaces(self):
        self.assertEqual(normalize_text('بخش‌نامه: موضوع، ۱۲۳!'), 'بخشنامهموضوع123')

    def test_jalali_text_from_gregorian(self):
        # 2026-11-09 = 1405/08/18
        self.assertEqual(to_jalali_text('2026-11-09'), '1405/08/18')

    def test_jalali_text_keeps_jalali_input(self):
        self.assertEqual(to_jalali_text('1405/8/1'), '1405/08/01')

    def test_empty_dates(self):
        self.assertEqual(to_jalali_text(None), '')
        self.assertEqual(to_jalali_text(''), '')


class MatchTests(SimpleTestCase):

    def setUp(self):
        self.rows = [
            excel_row(2, company='10', unit='208', number='1404/خ/715', received='1404/07/16'),
            excel_row(3, company='4330', number='1404-100-135', received='1404/06/09',
                      subject='معرفی شرکت'),
            excel_row(4, company='4802', unit='300', number='05/ص م/5445', received='1405/02/30',
                      subject='تنظیم صورتجلسه'),
            excel_row(5, company='', unit='301', number='', received='1405/03/01',
                      subject='نامه بدون شماره'),
        ]
        self.indexes, _rows = build_indexes(self.rows)

    def test_match_by_source_ref(self):
        row, how = match_letter(self.indexes, letter(source_ref='incoming:3'))
        self.assertEqual(how, 'source_ref')
        self.assertEqual(row['excel_row'], 3)

    def test_match_by_number_and_date(self):
        row, how = match_letter(self.indexes, letter(
            number='1404/خ/715', received_date=date(2025, 10, 8),
        ))
        self.assertEqual(how, 'number+date')
        self.assertEqual(row['unit_reg_no'], '208')

    def test_match_by_unique_number(self):
        row, how = match_letter(self.indexes, letter(number='05/ص م/5445'))
        self.assertEqual(how, 'number')
        self.assertEqual(row['excel_row'], 4)

    def test_match_by_date_and_subject_when_number_missing(self):
        row, how = match_letter(self.indexes, letter(
            received_date=date(2026, 5, 22), subject='نامه بدون شماره',
        ))
        self.assertIn(how, ('date+subject', 'subject'))
        self.assertEqual(row['excel_row'], 5)

    def test_ambiguous_number_is_not_matched(self):
        rows = [
            excel_row(2, company='1', number='X-1', received='1404/01/01', subject='الف'),
            excel_row(3, company='2', number='X-1', received='1404/02/02', subject='ب'),
        ]
        indexes, _rows = build_indexes(rows)
        row, how = match_letter(indexes, letter(number='X-1'))
        self.assertIsNone(row)
        self.assertEqual(how, '')

    def test_unmatched_letter_returns_none(self):
        row, how = match_letter(self.indexes, letter(number='ناموجود-123'))
        self.assertIsNone(row)
        self.assertEqual(how, '')

    def test_match_by_reordered_number_segments(self):
        rows = [excel_row(9, company='77', unit='400', number='1405/پ9/1427', received='1405/08/13')]
        indexes, _rows = build_indexes(rows)
        row, how = match_letter(indexes, letter(number='1427/پ9/ 1405'))
        self.assertEqual(how, 'number-segments')
        self.assertEqual(row['unit_reg_no'], '400')

    def test_match_by_subject_prefix_on_same_date(self):
        rows = [excel_row(10, company='88', unit='401', number='X-9', received='1405/08/13',
                          subject='تنخواه 84 طرح اسلیم گستر شهریور ماه')]
        indexes, _rows = build_indexes(rows)
        row, how = match_letter(indexes, letter(
            number='', received_date=date(2026, 11, 4), subject='تنخواه 84',
        ))
        self.assertEqual(how, 'date+subject-prefix')
        self.assertEqual(row['excel_row'], 10)

    def test_short_subject_does_not_match_by_prefix(self):
        rows = [excel_row(11, company='99', unit='402', received='1405/08/13',
                          subject='تنخواه ۸۴ طرح دیگر')]
        indexes, _rows = build_indexes(rows)
        row, how = match_letter(indexes, letter(received_date=date(2026, 11, 4), subject='تنخواه'))
        self.assertIsNone(row)
        self.assertEqual(how, '')


class BuildUpdatesTests(SimpleTestCase):

    def setUp(self):
        self.rows = [
            excel_row(2, company='10', unit='208', number='A-1', received='1404/07/16'),
            excel_row(3, company='4330', unit='', number='A-2', received='1404/06/09'),
            excel_row(4, company='4802', unit='300', number='A-3', received='1405/02/30'),
        ]

    def test_fills_only_empty_fields(self):
        letters = [
            letter(id=1, number='A-1', company_reg_no='', unit_reg_no=''),
            letter(id=2, number='A-2', company_reg_no='4330', unit_reg_no=''),
        ]
        result = build_updates(letters, self.rows)
        updates = {row['id']: row for row in result['updates']}
        self.assertEqual(updates[1]['company_reg_no'], '10')
        self.assertEqual(updates[1]['unit_reg_no'], '208')
        # نامهٔ ۲ شرکت را از قبل داشت → فقط شمارندهٔ واحد خالی مانده و اکسل هم خالی است
        self.assertNotIn(2, updates)
        self.assertEqual(result['conflicts'], [])

    def test_conflicts_are_reported_not_overwritten(self):
        letters = [letter(id=3, number='A-3', company_reg_no='9999', unit_reg_no='')]
        result = build_updates(letters, self.rows)
        self.assertEqual(result['stats']['conflicts'], 1)
        self.assertEqual(result['conflicts'][0]['field'], 'company_reg_no')
        self.assertEqual(result['conflicts'][0]['current'], '9999')
        updates = {row['id']: row for row in result['updates']}
        self.assertEqual(updates[3].get('unit_reg_no'), '300')
        self.assertNotIn('company_reg_no', updates[3])

    def test_overwrite_replaces_conflicts(self):
        letters = [letter(id=3, number='A-3', company_reg_no='9999', unit_reg_no='555')]
        result = build_updates(letters, self.rows, overwrite=True)
        updates = {row['id']: row for row in result['updates']}
        self.assertEqual(updates[3]['company_reg_no'], '4802')
        self.assertEqual(updates[3]['unit_reg_no'], '300')
        self.assertEqual(result['conflicts'], [])

    def test_unmatched_letters_are_listed(self):
        letters = [letter(id=9, number='ناموجود', subject='هیچ')]
        result = build_updates(letters, self.rows)
        self.assertEqual(result['stats']['unmatched'], 1)
        self.assertEqual(result['unmatched'][0]['id'], 9)
        self.assertEqual(result['updates'], [])

    def test_stats_count_match_methods(self):
        letters = [
            letter(id=1, number='A-1'),
            letter(id=2, source_ref='incoming:2'),
        ]
        result = build_updates(letters, self.rows)
        self.assertEqual(result['stats']['matched'], 2)
        self.assertEqual(result['stats']['by_method'].get('source_ref'), 1)

    def test_empty_excel_values_do_not_touch_letters(self):
        rows = [excel_row(2, company='', unit='', number='B-1', received='1404/01/01')]
        letters = [letter(id=1, source_ref='incoming:2', company_reg_no='', unit_reg_no='')]
        result = build_updates(letters, rows)
        self.assertEqual(result['updates'], [])
        self.assertEqual(result['stats']['updates'], 0)

