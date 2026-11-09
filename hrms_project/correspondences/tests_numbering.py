"""تست‌های بدون دیتابیس برای گروه‌های شماره‌گذاری مکاتبات.

قواعد کسب‌وکار: شماره از «شماره شروع» تا هر جا که کاربر شماره زده ادامه
می‌یابد، با تغییر سال شمسی (در صورت شمارش سالانه) به شماره شروع برمی‌گردد و
قالب می‌تواند تک‌قسمتی یا چندقسمتی با حروف فارسی باشد.
"""
from types import SimpleNamespace

from django.test import SimpleTestCase

from correspondences.numbering import (
    NumberingError, current_sequence, extract_sequence, jalali_year, preview_number,
    preview_payload, render_number, sequence_start, sync_series_counter,
    template_tokens, validate_template,
)


def make_series(**overrides):
    base = {
        'direction': 'outgoing',
        'prefix': 'ص م',
        'template': '{prefix}/{year}/{seq}',
        'start_number': 1,
        'next_number': 7,
        'end_number': None,
        'padding': 3,
        'reset_yearly': True,
        'last_year': None,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


class RenderNumberTests(SimpleTestCase):

    def test_multi_part_with_persian_prefix(self):
        number = render_number('{prefix}/{year}/{seq}', prefix='ص م', year=1405, seq=7, padding=3)
        self.assertEqual(number, 'ص م/1405/007')

    def test_single_part_is_just_the_sequence(self):
        self.assertEqual(render_number('{seq}', year=1405, seq=12, padding=4), '0012')

    def test_short_year_and_month_parts(self):
        number = render_number('{prefix}-{yy}-{month}-{seq}', prefix='دانشگاه',
                               year=1405, seq=3, padding=2, month=7)
        self.assertEqual(number, 'دانشگاه-05-07-03')

    def test_empty_prefix_drops_extra_separator(self):
        self.assertEqual(
            render_number('{prefix}/{year}/{seq}', prefix='', year=1405, seq=1, padding=3),
            '1405/001',
        )

    def test_zero_padding_keeps_plain_number(self):
        self.assertEqual(render_number('{seq}', year=1405, seq=42, padding=0), '42')


class TemplateValidationTests(SimpleTestCase):

    def test_tokens_are_detected(self):
        self.assertEqual(template_tokens('{prefix}/{year}/{seq}'), ['prefix', 'year', 'seq'])

    def test_unknown_token_is_rejected(self):
        with self.assertRaises(NumberingError):
            validate_template('{prefix}/{unknown}/{seq}')

    def test_sequence_token_is_required(self):
        with self.assertRaises(NumberingError):
            validate_template('{prefix}/{year}')

    def test_empty_template_is_rejected(self):
        with self.assertRaises(NumberingError):
            validate_template('   ')

    def test_valid_template_is_returned_trimmed(self):
        self.assertEqual(validate_template('  {seq}  '), '{seq}')


class SequenceStartTests(SimpleTestCase):

    def test_start_defaults_to_one(self):
        self.assertEqual(sequence_start(make_series(start_number=None)), 1)

    def test_start_is_respected(self):
        self.assertEqual(sequence_start(make_series(start_number=500)), 500)

    def test_current_sequence_is_max_of_start_and_next(self):
        self.assertEqual(current_sequence(make_series(start_number=500, next_number=503)), 503)
        self.assertEqual(current_sequence(make_series(start_number=500, next_number=10)), 500)

    def test_reset_yearly_returns_to_start(self):
        series = make_series(start_number=100, next_number=180, last_year=1403)
        expected = 180 if jalali_year() == 1403 else 100
        self.assertEqual(current_sequence(series, None), expected)

    def test_reset_off_keeps_counter(self):
        series = make_series(start_number=100, next_number=180, last_year=1403, reset_yearly=False)
        self.assertEqual(current_sequence(series, None), 180)


class PreviewTests(SimpleTestCase):

    def test_preview_uses_next_number(self):
        self.assertTrue(preview_number(make_series(), None).endswith('/007'))

    def test_preview_without_series_is_empty(self):
        self.assertEqual(preview_number(None), '')

    def test_preview_payload_reports_range(self):
        payload = preview_payload(make_series(start_number=5, next_number=9, end_number=8))
        self.assertEqual(payload['seq'], 9)
        self.assertEqual(payload['start_number'], 5)
        self.assertEqual(payload['end_number'], 8)
        self.assertTrue(payload['exhausted'])
        self.assertTrue(payload['number'].endswith('/009'))

    def test_preview_payload_not_exhausted_inside_range(self):
        payload = preview_payload(make_series(start_number=5, next_number=7, end_number=8))
        self.assertFalse(payload['exhausted'])


class ExtractSequenceTests(SimpleTestCase):

    def test_extracts_from_template_position(self):
        self.assertEqual(extract_sequence('ص م/1405/007', '{prefix}/{year}/{seq}'), 7)

    def test_seq_first_template(self):
        self.assertEqual(extract_sequence('007/1405', '{seq}/{year}'), 7)

    def test_falls_back_to_last_digit_group(self):
        self.assertEqual(extract_sequence('نامه 1405/457'), 457)

    def test_empty_number_returns_none(self):
        self.assertIsNone(extract_sequence(''))


class SyncCounterTests(SimpleTestCase):
    """شمارنده باید با شمارهٔ دستیِ جلوتر هم‌گام شود (بدون DB)."""

    def _series(self, **overrides):
        saved = {}

        def save(update_fields=None):
            saved['next'] = series.next_number
            saved['fields'] = update_fields

        series = make_series(**overrides)
        series.save = save
        return series, saved

    def test_jumps_forward_when_number_is_ahead(self):
        series, saved = self._series(next_number=5)
        sync_series_counter(series, 'ص م/1405/012')
        self.assertEqual(series.next_number, 13)
        self.assertEqual(saved['next'], 13)

    def test_keeps_counter_when_number_is_behind(self):
        series, saved = self._series(next_number=20)
        sync_series_counter(series, 'ص م/1405/003')
        self.assertEqual(series.next_number, 20)
        self.assertNotIn('next', saved)

    def test_ignores_numbers_without_digits(self):
        series, saved = self._series(next_number=20)
        sync_series_counter(series, 'بدون شماره')
        self.assertEqual(series.next_number, 20)
        self.assertNotIn('next', saved)

    def test_none_series_is_safe(self):
        self.assertIsNone(sync_series_counter(None, '007'))

