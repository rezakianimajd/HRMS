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



class NameMappingTests(SimpleTestCase):
    """نرمال‌سازی و تطبیق نام‌های واردشده از اکسل (بدون دیتابیس)."""

    def test_normalize_name_strips_honorifics_and_normalizes_letters(self):
        from correspondences import matching

        self.assertEqual(matching.normalize_name('خ.حسینی'), 'حسینی')
        self.assertEqual(matching.normalize_name('خانم حسینی'), 'حسینی')
        self.assertEqual(matching.normalize_name('حسيني'), 'حسینی')
        self.assertEqual(matching.normalize_name('آقای دکتر رضایی'), 'رضایی')
        self.assertEqual(matching.normalize_name('شركت آلفا'), 'شرکت الفا')
        self.assertEqual(matching.normalize_name('سیده زهرا حسینی'), 'سیده زهرا حسینی')
        self.assertEqual(matching.normalize_name('مدیرعامل'), '')
        self.assertEqual(matching.normalize_name('  '), '')

    def test_similarity_matches_employee_shortcuts(self):
        from correspondences import matching

        self.assertEqual(matching.similarity('سیده زهرا حسینی', 'سیده زهرا حسینی'), 1.0)
        self.assertGreaterEqual(matching.similarity('خ.حسینی', 'سیده زهرا حسینی'), 0.85)
        self.assertGreaterEqual(matching.similarity('ز.حسینی', 'سیده زهرا حسینی'), 0.85)
        self.assertGreaterEqual(matching.similarity('حسيني', 'سیده زهرا حسینی'), 0.85)
        self.assertGreaterEqual(matching.similarity('رضایی محمد', 'محمد رضایی'), 0.85)
        # نام غیرمرتبط نباید تطبیق داده شود
        self.assertLess(matching.similarity('خ.حسینی', 'محمد رضایی'), 0.5)

    def test_generic_company_words_are_not_strong_evidence(self):
        from correspondences import matching

        self.assertLess(matching.similarity('شرکت بتا', 'شرکت آلفا تجارت'), 0.6)
        self.assertEqual(matching.similarity('شركت آلفا تجارت', 'شرکت آلفا تجارت'), 1.0)

    def test_best_matches_ranks_and_filters(self):
        from correspondences import matching

        candidates = ['سیده زهرا حسینی', 'محمد رضایی', 'اکبر اکبری']
        rows = matching.best_matches('خ.حسینی', candidates)
        self.assertTrue(rows)
        self.assertEqual(rows[0]['item'], 'سیده زهرا حسینی')
        self.assertGreaterEqual(rows[0]['score'], 0.85)
        self.assertEqual([row['item'] for row in rows[1:]], [])

    def test_alias_resolver_prefers_scope_then_any(self):
        from decimal import Decimal
        from types import SimpleNamespace

        from correspondences.mapping import AliasResolver

        referral_alias = SimpleNamespace(
            target_kind='employee', employee_id=11, party_id=None, correspondent_id=None,
        )
        any_alias = SimpleNamespace(
            target_kind='party', employee_id=None, party_id=22, correspondent_id=None,
        )
        resolver = AliasResolver({
            ('referral', 'حسینی'): referral_alias,
            ('any', 'حسینی'): any_alias,
        })
        self.assertEqual(resolver.employee_id('referral', 'خ.حسینی'), 11)
        # در دامنهٔ دیگر، نگاشت «همه» استفاده می‌شود
        self.assertEqual(resolver.party_id('sender', 'حسینی'), 22)
        self.assertIsNone(resolver.employee_id('sender', 'حسینی'))
        self.assertIsNone(resolver.employee_id('referral', 'نام ناشناس'))
        self.assertIsNone(resolver.employee_id('referral', ''))


class NameMappingHandlerTests(SimpleTestCase):
    """محافظ رگرسیون: هر هندلر اعمال نگاشت باید شمارنده برگرداند (وگرنه ۵۰۰ می‌دهد)."""

    def test_apply_handlers_return_counters(self):
        import inspect

        from correspondences import mapping

        for name in ('_apply_employee', '_apply_party', '_apply_correspondent'):
            handler = getattr(mapping, name)
            lines = [line for line in inspect.getsource(handler).splitlines() if line.strip()]
            self.assertTrue(
                lines[-1].strip().startswith('return'),
                f'{name} باید در پایان مقدار برگرداند (counts)',
            )

    def test_apply_alias_tolerates_missing_handler(self):
        from types import SimpleNamespace

        from correspondences import mapping

        alias = SimpleNamespace(
            target_kind='unknown', employee=None, party=None, correspondent=None,
            normalized='x', raw_name='x', scope='any', applied_count=0,
            last_applied_at=None, id=1, target_label='—', company_id=1,
        )
        result = mapping.apply_alias(alias, dry_run=True)
        self.assertEqual(result['total'], 0)
        self.assertTrue(result['dry_run'])


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



class PersianDisplayFormattingTests(SimpleTestCase):
    """نمایش تمام تاریخ‌ها/ساعت‌ها به شمسی و با اعداد فارسی."""

    def test_excel_export_dates_use_persian_digits(self):
        from datetime import date

        from correspondences.excel_export import _jalali

        text = _jalali(date(2026, 3, 25))
        self.assertEqual(text, '۱۴۰۵/۰۱/۰۵')
        self.assertTrue(all(char in '۰۱۲۳۴۵۶۷۸۹/' for char in text))

    def test_jalali_month_labels_are_complete(self):
        from correspondences.views import JALALI_MONTHS

        self.assertEqual(len(JALALI_MONTHS), 12)
        self.assertEqual(JALALI_MONTHS[0], 'فروردین')
        self.assertEqual(JALALI_MONTHS[-1], 'اسفند')

    def test_stats_trend_builds_jalali_labels(self):
        import inspect

        from correspondences import views

        source = inspect.getsource(views.LetterViewSet.stats)
        self.assertIn("'label': trend_map[key].get('label', key)", source)
        self.assertIn('_jdate.fromgregorian', source)



class WorkdeskSchemaTests(SimpleTestCase):
    """ساختار دادهٔ کارتابل: پرسنل/طرف حساب، تحویل نامه و درخواست‌ها."""

    def test_letter_exposes_personnel_and_contract_party_fields(self):
        from correspondences.models import Letter

        names = {field.name for field in Letter._meta.get_fields()}
        for field in (
            'sender_employee', 'receiver_employee', 'delivered_by', 'sender_party',
            'party_account', 'delivery_type', 'delivered_by_name',
        ):
            self.assertIn(field, names)

    def test_delivery_types_cover_operational_channels(self):
        from correspondences.models import Letter

        values = dict(Letter.DELIVERY_TYPES)
        for code in ('in_person', 'post', 'email', 'fax', 'courier', 'scanner', 'other'):
            self.assertIn(code, values)
        self.assertEqual(values['in_person'], 'حضوری / دستی')

    def test_referral_supports_personnel_purpose_and_margin(self):
        from correspondences.models import LetterReferral

        names = {field.name for field in LetterReferral._meta.get_fields()}
        for field in ('to_employee', 'from_employee', 'purpose', 'parent', 'margin_note',
                      'seen_at'):
            self.assertIn(field, names)
        purposes = dict(LetterReferral.PURPOSES)
        self.assertEqual(purposes['action'], 'اقدام / انجام کار')
        self.assertEqual(purposes['info'], 'اطلاع / مشاهده')
        statuses = dict(LetterReferral.STATUS_CHOICES)
        self.assertIn('forwarded', statuses)

    def test_referral_target_label_prefers_personnel(self):
        import inspect

        from correspondences.models import LetterReferral

        referral = LetterReferral(to_name='واحد مالی')
        self.assertEqual(referral.target_label, 'واحد مالی')
        source = inspect.getsource(LetterReferral.target_label.fget)
        self.assertIn('to_employee', source)
        self.assertIn('to_user', source)

    def test_request_model_defaults_are_workflow_ready(self):
        from correspondences.models import LetterRequest

        field_names = {field.name for field in LetterRequest._meta.get_fields()}
        for field in ('current_step', 'total_steps', 'current_assignee',
                      'current_assignee_employee', 'payload', 'events', 'status'):
            self.assertIn(field, field_names)
        self.assertEqual(LetterRequest._meta.get_field('status').default, 'submitted')
        self.assertEqual(LetterRequest._meta.get_field('current_step').default, 1)
        self.assertIn('in_review', dict(LetterRequest.STATUS_CHOICES))

    def test_serializers_expose_lookup_labels(self):
        from correspondences.serializers import (
            LetterReferralSerializer, LetterRequestSerializer, LetterSerializer,
        )

        letter_fields = LetterSerializer().fields
        for name in ('sender_label', 'party_label', 'receiver_label',
                     'sender_employee_label', 'receiver_employee_label',
                     'delivery_type_display', 'delivered_by_label'):
            self.assertIn(name, letter_fields)

        referral_fields = LetterReferralSerializer().fields
        for name in ('purpose', 'purpose_display', 'to_employee', 'to_employee_name',
                     'target_label', 'margin_note', 'seen_at'):
            self.assertIn(name, referral_fields)

        request_fields = LetterRequestSerializer().fields
        for name in ('number', 'request_type_title_display', 'requester_display',
                     'assignee_name', 'events', 'is_overdue'):
            self.assertIn(name, request_fields)

    def test_request_number_format_is_jalali_and_padded(self):
        from correspondences.numbering import render_number

        # شمارهٔ درخواست با همان قالب شماره‌گذاری شمسی ساخته می‌شود
        self.assertEqual(
            render_number('درخ/{year}/{seq}', year=1405, seq=12, padding=4),
            'درخ/1405/0012',
        )

