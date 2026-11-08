"""تست‌های واحد ماژول مکاتبات اداری (بدون نیاز به دیتابیس)."""
from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import patch

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

    def test_letter_supports_free_text_party_and_sender_kind(self):
        """شرکت بدون قرارداد: نام طرف حساب به‌صورت متن آزاد + نوع فرستنده ذخیره می‌شود."""
        from correspondences.models import Letter
        from correspondences.serializers import LetterListSerializer, LetterSerializer
        from correspondences.views import LetterViewSet

        names = {field.name for field in Letter._meta.get_fields()}
        self.assertIn('party_name', names)
        self.assertIn('sender_kind', names)
        self.assertIn('party_name', LetterSerializer.Meta.fields)
        self.assertIn('party_name', LetterListSerializer.Meta.fields)
        self.assertIn('sender_kind', LetterSerializer.Meta.fields)
        self.assertIn('party_name', LetterViewSet.SEARCH_FIELDS)
        choices = dict(Letter._meta.get_field('sender_kind').choices)
        self.assertEqual(set(choices), {'employee', 'party'})
        self.assertEqual(Letter._meta.get_field('sender_kind').default, 'employee')

    def test_effective_date_prefers_received_then_sent_then_letter_date(self):
        """ترتیب پیش‌فرض فهرست: تاریخ ورود → تاریخ ارسال → تاریخ نامه."""
        import inspect

        from correspondences.views import LetterViewSet

        source = inspect.getsource(LetterViewSet.get_queryset)
        self.assertIn(
            "Coalesce('received_date', 'sent_date', 'letter_date')", source,
        )

    def test_party_label_falls_back_to_free_text_name(self):
        """برچسب «طرف حساب» وقتی FK خالی است از نام آزاد پر می‌شود."""
        from types import SimpleNamespace

        from correspondences.serializers import LetterListSerializer

        row = SimpleNamespace(
            party_account_id=None, party_name='شرکت تازه‌تأسیس نمونه',
            organization_id=None, correspondent_id=None,
        )
        self.assertEqual(
            LetterListSerializer().get_party_label(row), 'شرکت تازه‌تأسیس نمونه',
        )


class NameMappingWorkspaceTests(SimpleTestCase):
    """بازطراحی صفحهٔ نگاشت: میزکار هر ستون (فیلد) با پیشنهاد و آدرس‌دهی دستی."""

    def test_alias_viewset_exposes_workspace_actions(self):
        from correspondences.views import CorrespondenceNameAliasViewSet

        for name in ('columns', 'unmapped', 'groups', 'meta', 'summary',
                     'suggestions', 'apply', 'apply_all'):
            self.assertTrue(hasattr(CorrespondenceNameAliasViewSet, name),
                            f'action {name} missing')

    def test_workspace_scopes_cover_every_name_column_but_not_date_or_number(self):
        from correspondences.views import CorrespondenceNameAliasViewSet

        scopes = CorrespondenceNameAliasViewSet.WORKSPACE_SCOPES
        for key in ('counterparty', 'sender', 'receiver', 'contact', 'organization',
                    'delivery', 'referral', 'referral_target', 'subject'):
            self.assertIn(key, scopes)
        # تاریخ و شمارهٔ نامه ستون نگاشت نیستند
        self.assertNotIn('date', scopes)
        self.assertNotIn('number', scopes)
        self.assertNotIn('any', scopes)

    def test_columns_endpoint_is_routed(self):
        from django.urls import resolve

        match = resolve('/api/correspondence-name-aliases/columns/')
        self.assertEqual(match.func.__name__, 'CorrespondenceNameAliasViewSet')
        self.assertEqual(match.url_name, 'correspondence-name-alias-columns')

    def test_unmapped_endpoint_accepts_scope_filter(self):
        import inspect

        from correspondences.views import CorrespondenceNameAliasViewSet

        source = inspect.getsource(CorrespondenceNameAliasViewSet.unmapped)
        self.assertIn("query_params.get('scope')", source)
        self.assertIn("query_params.get('kinds')", source)
        self.assertIn("query_params.get('search')", source)


class MatchingPrefilterTests(SimpleTestCase):
    """پیش‌فیلتر کاندیدها: سرعت پیشنهادها روی استخرهای بزرگ."""

    def test_prefilter_keeps_related_candidates_only(self):
        from types import SimpleNamespace

        from correspondences import matching

        candidates = [
            SimpleNamespace(id=1, name='شرکت آلفا تجارت'),
            SimpleNamespace(id=2, name='بتا صنعت پارس'),
            SimpleNamespace(id=3, name='گاما خدمات'),
            SimpleNamespace(id=4, name='الفا بازرگانی'),
        ]
        picked = matching.prefilter_candidates(
            'شرکت آلفا', candidates, key=lambda item: item.name,
        )
        ids = {item.id for item in picked}
        self.assertIn(1, ids)     # نام یکسان
        self.assertIn(4, ids)     # پیشوند مشترک
        self.assertNotIn(3, ids)  # بی‌ارتباط

    def test_prefilter_handles_empty_name(self):
        from correspondences import matching

        rows = ['الف', 'ب']
        self.assertEqual(matching.prefilter_candidates('', rows), rows)

    def test_best_matches_uses_prefilter_for_large_pools(self):
        from types import SimpleNamespace

        from correspondences import matching

        pool = [SimpleNamespace(id=index, name=f'شرکت نمونه شماره {index}')
                for index in range(400)]
        pool.append(SimpleNamespace(id=9999, name='آلفا تجارت'))
        matches = matching.best_matches(
            'آلفا تجارت', pool, limit=3, key=lambda item: item.name,
        )
        self.assertTrue(matches)
        self.assertEqual(matches[0]['item'].id, 9999)


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
        from types import SimpleNamespace

        from correspondences.mapping import AliasResolver

        referral_alias = SimpleNamespace(
            target_kind='employee', employee_id=11, party_id=None, correspondent_id=None,
        )
        second_alias = SimpleNamespace(
            target_kind='employee', employee_id=12, party_id=None, correspondent_id=None,
        )
        any_alias = SimpleNamespace(
            target_kind='party', employee_id=None, party_id=22, correspondent_id=None,
        )
        resolver = AliasResolver({
            ('referral', 'حسینی'): [referral_alias, second_alias],
            ('any', 'حسینی'): [any_alias],
        })
        self.assertEqual(resolver.employee_id('referral', 'خ.حسینی'), 11)
        # ارجاع چندنفره: همهٔ پرسنل‌ها به‌ترتیب نگاشت برمی‌گردند
        self.assertEqual(resolver.employee_ids('referral', 'خ.حسینی'), [11, 12])
        # در دامنهٔ دیگر، نگاشت «همه» استفاده می‌شود
        self.assertEqual(resolver.party_id('sender', 'حسینی'), 22)
        self.assertEqual(resolver.employee_ids('sender', 'حسینی'), [])
        self.assertIsNone(resolver.employee_id('referral', 'نام ناشناس'))
        self.assertIsNone(resolver.employee_id('referral', ''))

    def test_parse_link_variants(self):
        from correspondences import attachment_import as importer

        kind, value, name = importer.parse_link('file:///C:/scans/letter-1.pdf')
        self.assertEqual((kind, name), ('file', 'letter-1.pdf'))
        self.assertTrue(value.startswith('C:') or value.startswith('/C:'))

        kind, value, name = importer.parse_link(
            'file://fileserver/share/نامه.pdf',
        )
        self.assertEqual(kind, 'file')
        self.assertEqual(name, 'نامه.pdf')

        kind, _value, name = importer.parse_link(
            'https://example.test/docs/a%20b.pdf?v=2',
        )
        self.assertEqual((kind, name), ('url', 'a b.pdf'))

        kind, value, _name = importer.parse_link('sub/folder/scan.jpg', r'D:\letters')
        self.assertEqual(kind, 'file')
        self.assertIn('letters', value)

        self.assertEqual(importer.parse_link('')[0], 'none')
        self.assertEqual(importer.parse_link('   ')[0], 'none')

    def test_safe_filename_and_kind(self):
        from correspondences import attachment_import as importer

        self.assertEqual(importer.safe_filename('C:\\temp\\a.pdf'), 'a.pdf')
        self.assertEqual(importer.safe_filename('bad:name?.pdf'), 'bad_name_.pdf')
        self.assertTrue(importer.safe_filename('').startswith('attachment'))
        self.assertEqual(importer.guess_kind('scan.PDF'), 'letter')
        self.assertEqual(importer.guess_kind('doc.docx'), 'attachment')
        self.assertEqual(importer.guess_kind('x.bin', 'receipt'), 'receipt')

    def test_read_bytes_reports_missing_file(self):
        from correspondences import attachment_import as importer

        with self.assertRaises(RuntimeError):
            importer.read_bytes('file', r'C:\definitely-not-here\x.pdf')

    def test_looks_like_link_filters_plain_text(self):
        from correspondences import attachment_import as importer

        self.assertFalse(importer.looks_like_link('معرفی شرکت جهت اخذ ردیف پیمان'))
        self.assertFalse(importer.looks_like_link('1404/06/15'))
        self.assertFalse(importer.looks_like_link(''))
        self.assertTrue(importer.looks_like_link('../S.mousavi/اسکن/a.pdf'))
        self.assertTrue(importer.looks_like_link(r'\\192.168.1.6\share\a.pdf'))
        self.assertTrue(importer.looks_like_link('D:\\scans\\x.jpg'))
        self.assertTrue(importer.looks_like_link('https://x.test/a.pdf'))

    def test_parse_link_decodes_encoded_relative_paths(self):
        from correspondences import attachment_import as importer

        kind, value, name = importer.parse_link(
            'scan%20mali/اسکن%20های%20جدید/3857-2.pdf', r'D:\Group\Accounting',
        )
        self.assertEqual(kind, 'file')
        self.assertIn('scan mali', value)
        self.assertIn('اسکن های جدید', value)
        self.assertEqual(name, '3857-2.pdf')

    def test_find_by_tail_recovers_broken_relative_links(self):
        import tempfile
        from pathlib import Path

        from correspondences import attachment_import as importer

        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'Everyone' / 'S.mousavi' / 'اسکن' / 'x.pdf'
            target.parent.mkdir(parents=True)
            target.write_bytes(b'%PDF-1.4')
            found = importer.find_by_tail('../S.mousavi/اسکن/x.pdf', [str(Path(tmp) / 'Everyone')])
            self.assertEqual(found, str(target))
            self.assertEqual(importer.find_by_tail('../nope/y.pdf', [str(Path(tmp))]), '')

    def test_my_name_variants_cover_user_and_employee(self):
        from types import SimpleNamespace

        from correspondences.views import _my_name_variants

        user = SimpleNamespace(get_full_name=lambda: 'سیده زهرا حسینی', username='z.hosseini')
        employee = SimpleNamespace(
            full_name='سیده زهرا حسینی', first_name='زهرا', last_name='حسینی',
        )
        variants = _my_name_variants(user, employee)
        self.assertIn('سیده زهرا حسینی', variants)
        self.assertIn('زهرا حسینی', variants)
        self.assertIn('z hosseini', variants)
        # بدون پرسنل هم نام کاربر استفاده می‌شود
        only_user = _my_name_variants(user, None)
        self.assertIn('سیده زهرا حسینی', only_user)

    def test_alias_resolver_resolves_party_correspondent_organization(self):
        from types import SimpleNamespace

        from correspondences.mapping import AliasResolver

        def alias(kind, **ids):
            data = {'employee_id': None, 'party_id': None,
                    'correspondent_id': None, 'organization_id': None}
            data.update(ids)
            return SimpleNamespace(target_kind=kind, **data)

        resolver = AliasResolver({
            ('counterparty', 'شرکت الفا'): [alias('party', party_id=7)],
            ('contact', 'شرکت الفا'): [alias('correspondent', correspondent_id=9)],
            ('organization', 'شرکت الفا'): [alias('organization', organization_id=5)],
        })
        self.assertEqual(resolver.party_id('counterparty', 'شركت آلفا'), 7)
        self.assertEqual(resolver.correspondent_id('contact', 'شرکت الفا'), 9)
        self.assertEqual(resolver.organization_id('organization', 'شرکت الفا'), 5)
        # دامنهٔ نامرتبط → هیچ مقصدی
        self.assertIsNone(resolver.party_id('organization', 'شرکت الفا'))


class NameMappingHandlerTests(SimpleTestCase):
    """محافظ رگرسیون: هر هندلر اعمال نگاشت باید شمارنده برگرداند (وگرنه ۵۰۰ می‌دهد)."""

    def test_apply_handlers_return_counters(self):
        import inspect

        from correspondences import mapping

        for name in ('_apply_employee', '_apply_party', '_apply_correspondent',
                     '_apply_organization', '_apply_category'):
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



class LetterArchiveStorageTests(SimpleTestCase):
    """مسیر بایگانی پیوست نامه در ماژول «مکاتبات اداری»."""

    def _instance(self, **kwargs):
        from datetime import date
        from types import SimpleNamespace

        letter = SimpleNamespace(
            pk=kwargs.get('pk', 12),
            company_id=kwargs.get('company_id', 3),
            number=kwargs.get('number', '1404/م پ/067'),
            subject=kwargs.get('subject', 'صورت‌وضعیت شماره ۴'),
            letter_date=kwargs.get('letter_date', date(2025, 10, 11)),
            received_date=None, sent_date=None,
        )
        return SimpleNamespace(letter=letter, company_id=kwargs.get('company_id', 3))

    def test_jalali_archive_year_is_used(self):
        from correspondences.models import letter_archive_year

        self.assertEqual(letter_archive_year(self._instance().letter), '1404')


class NameAliasPurposeTests(SimpleTestCase):
    """کاربردهای تخصصی نگاشت نام: فراداده، دامنه‌ها و «نگاشت دو مسیره»."""

    def test_every_model_scope_has_a_purpose(self):
        from correspondences import alias_purposes
        from correspondences.models import CorrespondenceNameAlias

        scope_keys = {key for key, _label in CorrespondenceNameAlias.SCOPES}
        self.assertEqual(set(alias_purposes.PURPOSE_BY_KEY), scope_keys)
        self.assertEqual(len(alias_purposes.PURPOSES), len(scope_keys))

    def test_purposes_expose_labels_descriptions_and_valid_target_kinds(self):
        from correspondences import alias_purposes
        from correspondences.models import CorrespondenceNameAlias

        target_keys = {key for key, _label in CorrespondenceNameAlias.TARGET_KINDS}
        labels = dict(CorrespondenceNameAlias.SCOPES)
        payload = alias_purposes.purposes_payload({'referral': 3}, labels)
        by_key = {row['key']: row for row in payload}

        self.assertEqual(by_key['referral']['count'], 3)
        self.assertEqual(by_key['sender']['count'], 0)
        self.assertEqual(by_key['referral']['label'], labels['referral'])
        self.assertEqual(by_key['referral']['target_kinds'], ['employee'])
        self.assertEqual(by_key['subject']['target_kinds'], ['category'])
        for row in payload:
            self.assertTrue(row['label'], 'برچسب کاربرد خالی است')
            self.assertTrue(row['description'], 'توضیح کاربرد خالی است')
            self.assertTrue(row['group'], 'گروه کاربرد خالی است')
            self.assertTrue(set(row['target_kinds']).issubset(target_keys))

    def test_purpose_groups_cover_every_purpose(self):
        from correspondences import alias_purposes

        grouped = [
            key for group in alias_purposes.purpose_groups() for key in group['keys']
        ]
        self.assertEqual(sorted(grouped), sorted(alias_purposes.PURPOSE_BY_KEY))

    def test_bidirectional_is_only_for_letter_sides(self):
        from correspondences import alias_purposes

        self.assertEqual(alias_purposes.paired_scope('sender'), 'receiver')
        self.assertEqual(alias_purposes.paired_scope('receiver'), 'sender')
        self.assertIsNone(alias_purposes.paired_scope('referral'))
        self.assertTrue(alias_purposes.can_be_bidirectional('sender'))
        self.assertFalse(alias_purposes.can_be_bidirectional('subject'))
        for scope, pair in alias_purposes.PAIRED_SCOPES.items():
            self.assertEqual(alias_purposes.PAIRED_SCOPES.get(pair), scope)

    def test_resolve_scopes_expands_dual_mappings(self):
        from correspondences import alias_purposes, mapping

        self.assertEqual(
            alias_purposes.resolve_scopes('sender', False, mapping.PARTY_SCOPES),
            ('sender',),
        )
        self.assertEqual(
            alias_purposes.resolve_scopes('sender', True, mapping.PARTY_SCOPES),
            ('sender', 'receiver'),
        )
        self.assertEqual(
            alias_purposes.resolve_scopes('receiver', True, mapping.EMPLOYEE_SCOPES),
            ('receiver', 'sender'),
        )
        # دامنه‌ای که طرف مقابل ندارد، با فعال‌کردن فلگ هم تغییر نمی‌کند
        self.assertEqual(
            alias_purposes.resolve_scopes('referral', True, mapping.EMPLOYEE_SCOPES),
            ('referral',),
        )
        # دامنهٔ ناشناخته → نگاشت عمومی
        self.assertEqual(
            alias_purposes.resolve_scopes('unknown', False, mapping.EMPLOYEE_SCOPES),
            ('referral', 'sender', 'receiver', 'delivery'),
        )
        # نگاشت «موضوع نامه» فقط روی نوع مکاتبه اثر می‌گذارد
        self.assertEqual(
            alias_purposes.resolve_scopes('subject', False, mapping.CATEGORY_SCOPES),
            ('subject',),
        )
        self.assertEqual(
            alias_purposes.resolve_scopes('sender', False, mapping.CATEGORY_SCOPES),
            (),
        )


    def test_join_target_labels_put_a_dash_between_people(self):
        from correspondences import alias_purposes

        self.assertEqual(
            alias_purposes.join_target_labels(['سیده زهرا حسینی', 'مریم رضایی']),
            'سیده زهرا حسینی — مریم رضایی',
        )
        self.assertEqual(alias_purposes.join_target_labels(['آ', 'آ', ' ب ']), 'آ — ب')
        self.assertEqual(alias_purposes.join_target_labels([]), '—')
        self.assertEqual(alias_purposes.join_target_labels(['', None]), '—')

    def test_effective_scopes_helper_reads_the_model_flag(self):
        from types import SimpleNamespace

        from correspondences import mapping

        single = SimpleNamespace(scope='sender', bidirectional=False)
        dual = SimpleNamespace(scope='sender', bidirectional=True)
        legacy = SimpleNamespace(scope='sender')

        self.assertEqual(
            mapping.effective_scopes(single, mapping.ORGANIZATION_SCOPES), ('sender',),
        )
        self.assertEqual(
            mapping.effective_scopes(dual, mapping.ORGANIZATION_SCOPES),
            ('sender', 'receiver'),
        )
        # نگاشت‌های قدیمی که فیلد bidirectional ندارند خطا نمی‌دهند
        self.assertEqual(
            mapping.effective_scopes(legacy, mapping.PARTY_SCOPES), ('sender',),
        )


class NameAliasSpecializationTests(SimpleTestCase):
    """فیلدهای تخصصی مدل و سریالایزر نگاشت (نوع مکاتبه + نگاشت دو مسیره)."""

    def test_model_has_bidirectional_and_category_target(self):
        from correspondences.models import CorrespondenceNameAlias

        field_names = {field.name for field in CorrespondenceNameAlias._meta.get_fields()}
        for name in ('bidirectional', 'category', 'scope', 'target_kind', 'order'):
            self.assertIn(name, field_names)
        self.assertFalse(
            CorrespondenceNameAlias._meta.get_field('bidirectional').default,
        )
        self.assertIn('category', dict(CorrespondenceNameAlias.TARGET_KINDS))
        self.assertIn('subject', dict(CorrespondenceNameAlias.SCOPES))

    def test_applied_scopes_property(self):
        from correspondences.models import CorrespondenceNameAlias

        alias = CorrespondenceNameAlias(raw_name='خ.حسینی', scope='sender', bidirectional=True)
        self.assertEqual(alias.applied_scopes, ['sender', 'receiver'])
        alias.scope = 'subject'
        self.assertEqual(alias.applied_scopes, ['subject'])

    def test_serializers_expose_specialized_fields(self):
        from correspondences.serializers import (
            CorrespondenceNameAliasListSerializer, CorrespondenceNameAliasSerializer,
        )

        fields = CorrespondenceNameAliasSerializer().fields
        for name in ('bidirectional', 'category', 'category_name', 'applied_scopes',
                     'target_label', 'scope_display', 'target_kind_display'):
            self.assertIn(name, fields)

        light = CorrespondenceNameAliasListSerializer().fields
        for name in ('target_label', 'applied_scopes', 'bidirectional', 'scope_display'):
            self.assertIn(name, light)
        self.assertNotIn('note', light, 'فهرست نگاشت‌ها باید سبک باشد')

    def test_category_handler_returns_counters(self):
        import inspect

        from correspondences import mapping

        for name in ('_apply_employee', '_apply_party', '_apply_correspondent',
                     '_apply_organization', '_apply_category'):
            handler = getattr(mapping, name)
            lines = [line for line in inspect.getsource(handler).splitlines() if line.strip()]
            self.assertTrue(
                lines[-1].strip().startswith('return'),
                f'{name} باید در پایان مقدار برگرداند (counts)',
            )


class LetterArchivePathTests(SimpleTestCase):
    """ادامهٔ تست‌های مسیر ذخیرهٔ پیوست نامه در بایگانی مکاتبات."""

    def _instance(self, **kwargs):
        from datetime import date
        from types import SimpleNamespace

        letter = SimpleNamespace(
            pk=kwargs.get('pk', 12),
            company_id=kwargs.get('company_id', 3),
            number=kwargs.get('number', '1404/م پ/067'),
            subject=kwargs.get('subject', 'صورت‌وضعیت شماره ۴'),
            letter_date=kwargs.get('letter_date', date(2025, 10, 11)),
            received_date=None, sent_date=None,
        )
        return SimpleNamespace(letter=letter, company_id=kwargs.get('company_id', 3))

    def test_year_falls_back_when_letter_has_no_date(self):
        from correspondences.models import letter_archive_year

        self.assertEqual(letter_archive_year(self._instance(letter_date=None).letter), 'بدون_تاریخ')

    @patch('core.engines.archive_storage_engine.resolve_upload_path',
           return_value='archive/company_3/correspondences/1404/scan.pdf')
    def test_upload_path_uses_the_correspondence_archive_profile(self, mocked):
        from correspondences.models import letter_attachment_upload_path

        path = letter_attachment_upload_path(self._instance(), 'scan.pdf')

        self.assertEqual(path, 'archive/company_3/correspondences/1404/scan.pdf')
        call = mocked.call_args
        self.assertEqual(call.args[0], 3)
        self.assertEqual(call.args[1], 'hrms.correspondence')
        self.assertEqual(call.args[2]['year'], '1404')
        self.assertEqual(call.args[2]['number'], '1404/م پ/067')
        self.assertEqual(call.kwargs['fallback_dir'], 'correspondences/letters')

    def test_upload_path_keeps_legacy_folder_without_profile(self):
        """بدون پروفایل بایگانی (یا خطای دسترسی) مسیر قدیمی حفظ می‌شود."""
        from correspondences.models import letter_attachment_upload_path

        path = letter_attachment_upload_path(self._instance(), 'scan.pdf')

        self.assertTrue(path.startswith('correspondences/letters/'))
        self.assertTrue(path.endswith('.pdf'))

    def test_correspondence_profile_folder_pattern_is_year(self):
        from settings_app.models import default_storage_profiles

        profile = next(
            item for item in default_storage_profiles()
            if item['module_key'] == 'hrms.correspondence'
        )
        self.assertEqual(profile['entity_folder_pattern'], '{year}')
        self.assertEqual(profile['root_folder'], 'correspondences')


class LetterListPayloadTests(SimpleTestCase):
    """فهرست نامه‌ها باید سبک باشد تا جدول سریع بارگذاری شود."""

    def test_list_serializer_drops_heavy_fields(self):
        from correspondences.serializers import LetterListSerializer, LetterSerializer

        list_fields = set(LetterListSerializer().fields)
        detail_fields = set(LetterSerializer().fields)

        for heavy in ('body', 'events', 'referrals'):
            self.assertNotIn(heavy, list_fields, heavy)
            self.assertIn(heavy, detail_fields, heavy)
        for kept in ('attachments', 'last_referral', 'attachment_count', 'subject', 'number'):
            self.assertIn(kept, list_fields, kept)

    def test_list_attachment_brief_has_no_uploader_metadata(self):
        from correspondences.serializers import (
            LetterAttachmentBriefSerializer, LetterAttachmentSerializer,
        )

        brief = set(LetterAttachmentBriefSerializer().fields)
        full = set(LetterAttachmentSerializer().fields)

        self.assertTrue({'id', 'title', 'file_url', 'size'} <= brief)
        self.assertNotIn('uploaded_by_name', brief)
        self.assertIn('uploaded_by_name', full)

    def test_viewset_search_covers_referrals_parties_and_attachments(self):
        from correspondences.views import LetterViewSet

        plain = ' '.join(LetterViewSet.SEARCH_FIELDS)
        joined = ' '.join(LetterViewSet.SEARCH_JOIN_FIELDS)

        for field in ('subject', 'summary', 'body', 'party_account__name', 'tags'):
            self.assertIn(field, plain)
        for field in (
            'referrals__to_name', 'referrals__instruction',
            'referrals__to_user__first_name', 'referrals__to_employee__last_name',
            'referrals__to_employees__first_name', 'attachments__title',
        ):
            self.assertIn(field, joined)

    def test_viewset_uses_light_serializer_for_list(self):
        from correspondences.serializers import LetterListSerializer, LetterSerializer
        from correspondences.views import LetterViewSet

        view = LetterViewSet()
        view.action = 'list'
        self.assertIs(view.get_serializer_class(), LetterListSerializer)
        view.action = 'retrieve'
        self.assertIs(view.get_serializer_class(), LetterSerializer)


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

