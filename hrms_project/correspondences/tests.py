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


class LegacyExcelParsingTests(SimpleTestCase):
    """تبدیل داده‌های اکسل واحد مکاتبات به ردیف‌های استاندارد."""

    def test_parse_jalali_supports_slash_and_compact_formats(self):
        from correspondences.legacy import parse_jalali

        try:
            from jdatetime import date as jdate
        except Exception:  # noqa: BLE001
            self.skipTest('jdatetime نصب نیست')
        expected = jdate(1404, 6, 15).togregorian()
        self.assertEqual(parse_jalali('1404/06/15'), expected)
        self.assertEqual(parse_jalali(14040615), expected)
        self.assertIsNone(parse_jalali('05/ص م /5524'))
        self.assertIsNone(parse_jalali(''))

    def test_parse_amount_handles_separators_and_text(self):
        from correspondences.legacy import parse_amount

        self.assertEqual(parse_amount('2,235,080,000'), 2235080000)
        self.assertEqual(parse_amount('۲۲۳۵۰۸۰۰۰۰'), 2235080000)
        self.assertIsNone(parse_amount('جهت صدور سند'))

    def test_incoming_row_extracts_referrals(self):
        from correspondences.legacy import parse_incoming_row

        row = [''] * 20
        row[3] = '1404/06/15'
        row[4] = '1404-100-135'
        row[5] = 'شرکت ساز و کار'
        row[6] = 'معرفی شرکت جهت اخذ ردیف پیمان'
        row[7] = '1404/06/05'
        row[8] = 'ساز و کار هوشمند فاوا'
        row[9] = 'آقای اسدنژاد'
        row[10] = '1404/06/16'
        row[11] = 'خ.پژوه'
        parsed = parse_incoming_row(row, 2)
        self.assertEqual(parsed['direction'], 'incoming')
        self.assertEqual(parsed['number'], '1404-100-135')
        self.assertEqual(parsed['organization_name'], 'شرکت ساز و کار')
        self.assertEqual(len(parsed['referrals']), 1)
        self.assertEqual(parsed['referrals'][0]['to_name'], 'خ.پژوه')
        self.assertIsNotNone(parsed['referrals'][0]['referred_on'])
        self.assertEqual(parsed['status'], 'registered')
        self.assertEqual(parsed['source_ref'], 'incoming:2')

    def test_empty_incoming_row_is_skipped(self):
        from correspondences.legacy import parse_incoming_row

        self.assertIsNone(parse_incoming_row([''] * 20, 5))

    def test_contract_row_detects_number_and_company(self):
        from correspondences.legacy import parse_contract_row

        row = [''] * 17
        row[1] = '1404/05/20'
        row[2] = 'جهان پیمان کاسپین'
        row[3] = 'C-KPSMI-03-002'
        row[4] = 'الحاقیه 2 محوطه سازی قرارداد 002'
        parsed = parse_contract_row(row, 3)
        self.assertEqual(parsed['direction'], 'internal')
        self.assertEqual(parsed['status'], 'archived')
        self.assertEqual(parsed['contract_number'], 'C-KPSMI-03-002')
        self.assertEqual(parsed['organization_name'], 'جهان پیمان کاسپین')
        self.assertIsNotNone(parsed['letter_date'])

    def test_university_row_reads_amount_and_default_receiver(self):
        from correspondences.legacy import parse_university_row

        row = [''] * 12
        row[0] = '5'
        row[2] = '1404/05/26'
        row[3] = '1404/05/25'
        row[4] = 'بابت فیش بیمه درمان تکمیلی'
        row[5] = '2235080000'
        parsed = parse_university_row(row, 6)
        self.assertEqual(parsed['direction'], 'outgoing')
        self.assertEqual(parsed['amount'], 2235080000)
        self.assertEqual(parsed['receiver_name'], 'دانشگاه خاتم')
        self.assertEqual(parsed['category_code'], 'finance')

    def test_outgoing_row_maps_drafter_and_receiver(self):
        from correspondences.legacy import parse_outgoing_row

        row = [''] * 11
        row[0] = '3894'
        row[2] = '1404/05/08'
        row[3] = '04/ص م  /5000'
        row[4] = 'معرفی شرکت نظم و امنیت'
        row[5] = 'تامین اجتماعی شعبه رودهن'
        row[6] = 'آقای اسدنژاد'
        parsed = parse_outgoing_row(row, 2)
        self.assertEqual(parsed['direction'], 'outgoing')
        self.assertEqual(parsed['drafter_name'], 'آقای اسدنژاد')
        self.assertEqual(parsed['organization_name'], 'تامین اجتماعی شعبه رودهن')
        self.assertIn('legacy-incoming:3894', parsed['tags'])

    def test_bundled_legacy_bundle_is_valid(self):
        import gzip
        import json
        from pathlib import Path

        path = Path(__file__).resolve().parent / 'data' / 'legacy_letters.json.gz'
        self.assertTrue(path.exists(), 'بستهٔ دادهٔ مکاتبات موجود نیست')
        with gzip.open(path, 'rt', encoding='utf-8') as handle:
            rows = json.load(handle)
        self.assertGreater(len(rows), 5000)
        refs = {row['source_ref'] for row in rows}
        self.assertEqual(len(refs), len(rows), 'شناسه منبع تکراری در بستهٔ داده')
        required = {'source_ref', 'direction', 'subject', 'letter_date', 'sheet'}
        for row in rows[:200]:
            self.assertTrue(required.issubset(row.keys()))
            self.assertIn(row['direction'], ('incoming', 'outgoing', 'internal'))



class IncomingLetterSpecializationTests(SimpleTestCase):
    """فیلدهای تخصصی دفتر وارده: نحوهٔ ورود، دو شمارهٔ ثبت و ارجاع کامل."""

    def test_letter_serializer_exposes_incoming_fields(self):
        from correspondences.serializers import LetterSerializer

        fields = LetterSerializer().fields
        for name in (
            'entry_method', 'entry_method_display', 'entry_time', 'entered_by', 'entered_by_label',
            'entered_by_name', 'company_reg_no', 'company_reg_date', 'unit_reg_no', 'unit_reg_date',
            'unit_name', 'sender_organization', 'sender_organization_name', 'sender_title',
        ):
            self.assertIn(name, fields, f'فیلد {name} در سریالایزر نامه نیست')

    def test_letter_model_entry_method_choices(self):
        from correspondences.models import Letter

        values = dict(Letter.ENTRY_METHODS)
        self.assertIn('automation', values)
        self.assertIn('manual', values)
        self.assertEqual(Letter._meta.get_field('entry_method').default, 'manual')

    def test_referral_serializer_exposes_full_history_fields(self):
        from correspondences.serializers import LetterReferralSerializer

        fields = LetterReferralSerializer().fields
        for name in ('instruction', 'response', 'result', 'result_note', 'answered_on',
                     'answered_by', 'answered_by_name'):
            self.assertIn(name, fields, f'فیلد {name} در سریالایزر ارجاع نیست')

    def test_referral_viewset_has_complete_action(self):
        from correspondences.views import LetterReferralViewSet

        self.assertTrue(hasattr(LetterReferralViewSet, 'complete'))

    def test_urls_expose_referral_complete_endpoint(self):
        from django.urls import resolve

        match = resolve('/api/letter-referrals/12/complete/')
        self.assertEqual(match.func.__name__, 'LetterReferralViewSet')
        self.assertEqual(match.kwargs.get('pk'), '12')

    def test_meta_includes_entry_methods(self):
        import inspect

        from correspondences import views

        source = inspect.getsource(views.LetterViewSet.meta)
        self.assertIn('entry_methods', source)


    def test_parse_entry_time_extracts_hour_and_person(self):
        from correspondences.legacy import parse_entry_time

        entry_time, person = parse_entry_time('14:35 آقای اسدنژاد')
        self.assertEqual((entry_time.hour, entry_time.minute), (14, 35))
        self.assertEqual(person, 'آقای اسدنژاد')
        self.assertEqual(parse_entry_time('10')[0].hour, 10)
        self.assertEqual(parse_entry_time('13:30آملکی'), (parse_entry_time('13:30')[0], 'آملکی'))
        self.assertIsNone(parse_entry_time('')[0])

    def test_incoming_row_captures_entry_time_and_registrar(self):
        from correspondences.legacy import parse_incoming_row

        row = [''] * 20
        row[0] = '09:15 خانم حقیقی'
        row[3] = '1404/06/15'
        row[6] = 'موضوع آزمون'
        parsed = parse_incoming_row(row, 7)
        self.assertEqual(parsed['entry_method'], 'manual')
        self.assertEqual(parsed['entry_time'].hour, 9)
        self.assertEqual(parsed['entry_time'].minute, 15)
        self.assertEqual(parsed['entered_by_name'], 'خانم حقیقی')

    def test_bundle_contains_entry_metadata(self):
        import gzip
        import json
        from pathlib import Path

        path = Path(__file__).resolve().parent / 'data' / 'legacy_letters.json.gz'
        with gzip.open(path, 'rt', encoding='utf-8') as handle:
            rows = json.load(handle)
        with_time = [row for row in rows if row.get('entry_time')]
        with_person = [row for row in rows if row.get('entered_by_name')]
        self.assertGreater(len(with_time), 500)
        self.assertGreater(len(with_person), 500)

