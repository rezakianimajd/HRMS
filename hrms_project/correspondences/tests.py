"""تست‌های واحد ماژول مکاتبات اداری (بدون نیاز به دیتابیس)."""
from datetime import date, timedelta
from types import SimpleNamespace

from django.test import SimpleTestCase

from correspondences.numbering import (
    _clean_separators, jalali_year, preview_number, render_number,
)


class NumberingTests(SimpleTestCase):
    def test_render_number_uses_prefix_year_and_padding(self):
        self.assertEqual(
            render_number('{prefix}/{year}/{seq}', prefix='ص م', year=1405, seq=7, padding=3),
            'ص م/1405/007',
        )

    def test_render_number_drops_empty_segments(self):
        self.assertEqual(
            render_number('{prefix}/{year}/{seq}', prefix='', year=1405, seq=12, padding=2),
            '1405/12',
        )
        self.assertEqual(
            render_number('{prefix}-{seq}', prefix='', year=1405, seq=5, padding=0),
            '5',
        )

    def test_clean_separators_handles_duplicates_and_edges(self):
        self.assertEqual(_clean_separators('/ص م//1405//'), 'ص م/1405')
        self.assertEqual(_clean_separators('  123  '), '123')

    def test_render_number_falls_back_to_default_template(self):
        self.assertEqual(render_number('', prefix='و', year=1405, seq=1, padding=3), 'و/1405/001')

    def test_jalali_year_returns_integer(self):
        year = jalali_year(date(2026, 3, 25))
        self.assertEqual(year, 1405)

    def test_preview_number_resets_yearly_counter(self):
        series = SimpleNamespace(
            next_number=48, template='{prefix}/{year}/{seq}', prefix='ص',
            direction='outgoing', padding=3, reset_yearly=True, last_year=1404,
        )
        number = preview_number(series, date(2026, 3, 25))
        self.assertEqual(number, 'ص/1405/001')

    def test_preview_number_keeps_counter_within_same_year(self):
        series = SimpleNamespace(
            next_number=48, template='{prefix}/{year}/{seq}', prefix='ص',
            direction='outgoing', padding=3, reset_yearly=True, last_year=1405,
        )
        number = preview_number(series, date(2026, 3, 25))
        self.assertEqual(number, 'ص/1405/048')

    def test_preview_number_without_series_is_empty(self):
        self.assertEqual(preview_number(None), '')


class LetterModelHelpersTests(SimpleTestCase):
    def _letter(self, **kwargs):
        from correspondences.models import Letter

        defaults = {
            'due_date': None, 'status': 'registered', 'subject': 'موضوع', 'number': 'X-1',
        }
        defaults.update(kwargs)
        return Letter(**defaults)

    def test_overdue_flag_for_open_letter(self):
        letter = self._letter(due_date=date.today() - timedelta(days=2))
        self.assertTrue(letter.is_overdue)
        self.assertLess(letter.days_to_due, 0)

    def test_not_overdue_when_closed(self):
        letter = self._letter(due_date=date.today() - timedelta(days=2), status='closed')
        self.assertFalse(letter.is_overdue)

    def test_not_overdue_without_due_date(self):
        letter = self._letter()
        self.assertFalse(letter.is_overdue)
        self.assertIsNone(letter.days_to_due)

    def test_future_due_date_is_not_overdue(self):
        letter = self._letter(due_date=date.today() + timedelta(days=5))
        self.assertFalse(letter.is_overdue)
        self.assertGreater(letter.days_to_due, 0)


class LetterSerializerValidationTests(SimpleTestCase):
    def test_category_direction_must_match_letter_direction(self):
        from rest_framework import serializers as drf_serializers

        from correspondences.serializers import LetterSerializer

        serializer = LetterSerializer()
        category = SimpleNamespace(direction='outgoing', name='صادره', color='#000')
        with self.assertRaises(drf_serializers.ValidationError):
            serializer.validate({'direction': 'incoming', 'category': category})

    def test_matching_direction_is_accepted(self):
        from correspondences.serializers import LetterSerializer

        serializer = LetterSerializer()
        category = SimpleNamespace(direction='both', name='عمومی', color='#000')
        data = serializer.validate({'direction': 'incoming', 'category': category})
        self.assertEqual(data['direction'], 'incoming')

    def test_negative_amount_is_rejected(self):
        from rest_framework import serializers as drf_serializers

        from correspondences.serializers import LetterSerializer

        serializer = LetterSerializer()
        with self.assertRaises(drf_serializers.ValidationError):
            serializer.validate({'direction': 'outgoing', 'amount': -5})


class LettersMetaTests(SimpleTestCase):
    def test_letter_viewset_exposes_required_actions(self):
        from correspondences.views import LetterViewSet

        for name in ('register', 'refer', 'reply', 'archive', 'close', 'attachments',
                     'comment', 'stats', 'meta', 'number_preview', 'export_excel'):
            self.assertTrue(hasattr(LetterViewSet, name), f'action {name} missing')

    def test_urls_register_letters_endpoints(self):
        from django.urls import resolve

        match = resolve('/api/letters/stats/')
        self.assertEqual(match.func.__name__, 'LetterViewSet')
        match = resolve('/api/letters/5/refer/')
        self.assertEqual(match.kwargs.get('pk'), '5')
        match = resolve('/api/letter-series/3/preview/')
        self.assertEqual(match.func.__name__, 'LetterSeriesViewSet')
