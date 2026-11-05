"""تست‌های گزارش‌گیری و مغایرت‌گیری «اکسل دفاتر» برای معاملات فصلی (خرید).

اجرای واقعی روی سرور: ``manage.py test accounting.tests_seasonal_reconcile``.
"""
import csv
import io
import json
import zipfile
from decimal import Decimal
from types import SimpleNamespace

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from accounting import seasonal_reconcile as rec
from accounting.seasonal import sync_rows
from accounting.tests_seasonal import SeasonalBaseTest


class ReconcileHelperTests(SeasonalBaseTest):
    """نرمال‌سازی متن/عدد/تاریخ و شباهت نام."""

    def test_digits_ids_and_invoices(self):
        self.assertEqual(rec.normalize_id('۱۰۱۰۱۰۱۰۱۰۱'), '10101010101')
        self.assertEqual(rec.normalize_id('101-010-10101'), '10101010101')
        self.assertEqual(rec.normalize_invoice('۰۰۰۱۰۰۱'), '1001')
        self.assertEqual(rec.normalize_invoice('0'), '')
        self.assertEqual(rec.normalize_invoice(''), '')

    def test_amounts_and_dates(self):
        self.assertEqual(rec.parse_amount('۱٬۲۵۰٬۰۰۰ ریال'), Decimal('1250000'))
        self.assertEqual(rec.parse_amount('(1,200)'), Decimal('-1200'))
        self.assertEqual(rec.parse_amount(None), Decimal('0'))
        self.assertEqual(rec.parse_date('1405/01/21').isoformat(), '2026-04-10')
        self.assertEqual(rec.parse_date('2026-04-10').isoformat(), '2026-04-10')
        self.assertIsNone(rec.parse_date('بدون تاریخ'))

    def test_name_similarity_ignores_suffixes_and_order(self):
        self.assertGreater(rec.name_similarity('شرکت آلفا تجارت', 'آلفا تجارت'), 0.9)
        self.assertGreater(rec.name_similarity('شرکت الفا تجارت', 'شرکت آلفا تجارت'), 0.8)
        self.assertLess(rec.name_similarity('فروشگاه گاما', 'شرکت بتا'), 0.4)


class LedgerReaderTests(SeasonalBaseTest):
    """خواندن فایل دفاتر (CSV و اکسل) و تشخیص ستون‌ها."""

    def test_csv_detects_columns_and_rows(self):
        content = (
            '\ufeffشماره فاکتور,تاریخ فاکتور,نام فروشنده,شناسه ملی,مبلغ,مالیات\n'
            '1001,1405/01/21,شرکت آلفا تجارت,10101010101,1000000,100000\n'
            ',,,,\n'
        ).encode('utf-8')
        parsed = rec.read_ledger_rows(SimpleUploadedFile('ledger.csv', content))
        self.assertEqual(len(parsed.rows), 1)
        self.assertEqual(parsed.mapping['invoice_no'], 0)
        self.assertEqual(parsed.rows[0]['invoice_no_key'], '1001')
        self.assertEqual(parsed.rows[0]['amount'], Decimal('1000000'))
        self.assertEqual(parsed.rows[0]['invoice_date'].isoformat(), '2026-04-10')

    def test_xlsx_header_is_detected_in_third_row(self):
        from openpyxl import Workbook

        workbook = Workbook()
        sheet = workbook.active
        sheet.append(['دفتر خرید'])
        sheet.append([])
        sheet.append(['تاریخ سند', 'شماره سند', 'طرف حساب', 'مبلغ'])
        sheet.append(['1405/01/21', '1001', 'شرکت آلفا تجارت', 1000000])
        stream = io.BytesIO()
        workbook.save(stream)
        stream.seek(0)

        parsed = rec.read_ledger_rows(SimpleUploadedFile('ledger.xlsx', stream.getvalue()))
        self.assertEqual(parsed.header_row, 3)
        self.assertEqual(len(parsed.rows), 1)
        self.assertEqual(parsed.rows[0]['party_name'], 'شرکت آلفا تجارت')

    def test_unsupported_format_is_rejected(self):
        with self.assertRaises(ValueError):
            rec.read_ledger_rows(SimpleUploadedFile('ledger.xls', b'binary'))


class ScopeFilterTests(SimpleTestCase):
    """دامنهٔ مغایرت‌گیری: ساخت درخت شرط، اعمال روی ردیف‌ها و برچسب خوانا (بدون دیتابیس)."""

    @staticmethod
    def _row(kind=1, status='pending', name='شرکت آلفا', invoice_no='1001'):
        return SimpleNamespace(
            id=kind * 10, kind=kind, moadian_status=status, name=name,
            first_name='', last_name='', person_type='legal',
            national_id='10101010101', invoice_no=invoice_no, invoice_date=None,
            amount=Decimal('1000'), vat=Decimal('100'), postal_code='',
            city='', province='', country='', address='', goods_service_desc='',
        )

    def test_status_and_kind_scope_filters_rows(self):
        filters = rec._clean_filters({'op': 'and', 'items': [
            {'field': 'moadian_status', 'operator': 'eq', 'value': 'pending'},
            {'field': 'kind', 'operator': 'in', 'value': [2, 3]},
        ]})
        rows = [
            self._row(kind=1, status='pending'),
            self._row(kind=2, status='pending'),
            self._row(kind=3, status='registered'),
            self._row(kind=3, status='pending'),
        ]
        scoped = rec._apply_filters(rows, filters)
        self.assertEqual([row.kind for row in scoped], [2, 3])

        info = rec._scope_info(filters, len(rows), len(scoped))
        self.assertTrue(info['active'])
        self.assertEqual(info['scoped_rows'], 2)
        self.assertEqual(info['excluded_rows'], 2)
        self.assertIn('درج‌نشده', info['label'])
        self.assertIn('نوع', info['label'])

    def test_search_scope_matches_name_id_and_invoice(self):
        filters = rec._clean_filters({'op': 'and', 'items': [{
            'op': 'or',
            'items': [
                {'field': 'name', 'operator': 'contains', 'value': 'بتا'},
                {'field': 'national_id', 'operator': 'contains', 'value': '999'},
                {'field': 'invoice_no', 'operator': 'contains', 'value': '2002'},
            ],
        }]})
        rows = [
            self._row(name='شرکت آلفا', invoice_no='1001'),
            self._row(name='شرکت بتا صنعت', invoice_no='1002'),
            self._row(name='شرکت گاما', invoice_no='2002'),
        ]
        scoped = rec._apply_filters(rows, filters)
        self.assertEqual([row.invoice_no for row in scoped], ['1002', '2002'])

    def test_empty_scope_is_reported_as_all_rows(self):
        cleaned = rec._clean_filters({'op': 'and', 'items': []})
        info = rec._scope_info(cleaned, 12, 12)
        self.assertFalse(info['active'])
        self.assertEqual(info['label'], 'همهٔ ردیف‌ها')
        self.assertEqual(info['excluded_rows'], 0)


class SuggestedUndoKeyTests(SimpleTestCase):
    """کلیدهای «جاافتاده‌ها» برای بازگردانی ردیف‌های افزوده‌شده (بدون دیتابیس)."""

    def test_suggested_keys_extracts_only_missing_in_seasonal(self):
        from accounting.seasonal_cleanup import suggested_keys

        run = SimpleNamespace(detail={'items': [
            {'kind': 'missing_in_seasonal', 'ledger': {
                'invoice_no': '۱۰۰۴', 'national_id': '40404040404',
                'party_name': 'شرکت دلتا', 'amount': 700000, 'vat': 70000,
            }},
            {'kind': 'matched', 'ledger': {'invoice_no': '1001'}},
            {'kind': 'missing_in_ledger', 'seasonal': {'invoice_no': '1003'}},
        ]})
        keys = suggested_keys(run)
        self.assertEqual(len(keys), 1)
        self.assertEqual(keys[0]['invoice_no'], '1004')
        self.assertEqual(keys[0]['amount'], Decimal('700000'))
        self.assertEqual(keys[0]['vat'], Decimal('70000'))
        self.assertEqual(suggested_keys(None), [])
        self.assertEqual(suggested_keys(SimpleNamespace(detail={})), [])

    def test_row_must_match_invoice_amount_and_vat(self):
        from accounting.seasonal_cleanup import _key_matches_row

        key = {
            'invoice_no': '1004', 'national_id': '', 'name': '',
            'amount': Decimal('700000'), 'vat': Decimal('70000'),
        }
        row = SimpleNamespace(
            invoice_no='1004', national_id='', name='شرکت دلتا',
            amount=Decimal('700000'), vat=Decimal('70000'),
        )
        self.assertTrue(_key_matches_row(key, row))
        row.amount = Decimal('700001')
        self.assertFalse(_key_matches_row(key, row))
        row.amount = Decimal('700000')
        row.vat = Decimal('0')
        self.assertFalse(_key_matches_row(key, row))
        row.vat = Decimal('70000')
        row.invoice_no = '9999'
        self.assertFalse(_key_matches_row(key, row))

    def test_rows_without_invoice_need_national_id_and_name(self):
        from accounting.seasonal_cleanup import _key_matches_row

        key = {
            'invoice_no': '', 'national_id': '40404040404',
            'name': rec.normalize_name('شرکت دلتا'),
            'amount': Decimal('500'), 'vat': Decimal('0'),
        }
        row = SimpleNamespace(
            invoice_no='', national_id='40404040404', name='شرکت دلتا',
            amount=Decimal('500'), vat=Decimal('0'),
        )
        self.assertTrue(_key_matches_row(key, row))
        row.national_id = '11111111111'
        self.assertFalse(_key_matches_row(key, row))


class ReconcileEngineTests(SeasonalBaseTest):
    """موتور تطبیق: تطبیق کامل، مغایرت مبلغ، فقط یک طرف و پیشنهاد افزودن ردیف."""

    def setUp(self):
        super().setUp()
        self.report = self.make_report()
        sync_rows(self.report, [
            self.row(invoice_no='1001', amount=1000000, vat=100000),
            self.row(invoice_no='1002', name='شرکت بتا صنعت', national_id='20202020202',
                     amount=500000, vat=50000),
            self.row(invoice_no='1003', name='شرکت گاما', national_id='30303030303',
                     amount=300000, vat=0),
        ])

    def ledger(self):
        def line(index, file_row, invoice, name, national_id, amount, vat):
            return {
                'index': index, 'file_row': file_row, 'invoice_no': invoice,
                'invoice_no_key': invoice, 'invoice_date': None, 'party_name': name,
                'name_key': rec.normalize_name(name), 'national_id': national_id,
                'amount': Decimal(amount), 'vat': Decimal(vat),
                'total': Decimal(amount) + Decimal(vat),
            }

        return [
            line(1, 2, '1001', 'شرکت آلفا تجارت', '10101010101', '1000000', '100000'),
            line(2, 3, '1002', 'شرکت بتا صنعت', '20202020202', '510000', '50000'),
            line(3, 4, '1004', 'شرکت دلتا', '40404040404', '700000', '70000'),
        ]

    def test_scope_limits_rows_and_marks_out_of_scope_ledger(self):
        """دامنهٔ باریک: فقط ردیف‌های در دامنه مغایرت‌گیری می‌شوند و بقیه «خارج از دامنه»."""
        from accounting.models import SeasonalTransaction

        SeasonalTransaction.objects.filter(report=self.report, invoice_no='1003').update(
            kind=2, moadian_status='pending',
        )
        filters = {'op': 'and', 'items': [
            {'field': 'kind', 'operator': 'eq', 'value': 2},
            {'field': 'moadian_status', 'operator': 'eq', 'value': 'pending'},
        ]}
        result = rec.reconcile(self.report, self.ledger(), rec.MatchOptions(), 'purchase',
                               filters=filters)
        summary = result['summary']
        self.assertTrue(result['scope']['active'])
        self.assertEqual(result['scope']['total_rows'], 3)
        self.assertEqual(result['scope']['scoped_rows'], 1)
        self.assertEqual(summary['seasonal']['count'], 1)
        # ۱۰۰۱ و ۱۰۰۲ فصلی هستند اما خارج از دامنه → مغایرت «فقط در دفاتر» نمی‌سازند
        self.assertEqual(summary['counts']['out_of_scope'], 2)
        self.assertEqual(summary['counts']['missing_in_seasonal'], 1)
        self.assertEqual(summary['counts']['missing_in_ledger'], 1)
        self.assertEqual(summary['only_in_ledger']['count'], 1)
        out_item = [item for item in result['items'] if item['kind'] == 'out_of_scope'][0]
        self.assertEqual(out_item['severity'], 'info')
        self.assertIn('خارج از دامنه', out_item['message'])

    def test_undo_suggested_keeps_manual_rows(self):
        """بازگردانی فقط ردیف‌های افزوده‌شده را حذف می‌کند و ردیف دستی کاربر را نگه می‌دارد."""
        from accounting import seasonal_cleanup
        from accounting.models import SeasonalReconciliation, SeasonalTransaction

        sync_rows(self.report, [
            self.row(invoice_no='2001', name='شرکت آلفا تجارت', amount=900000, vat=90000),
            self.row(invoice_no='1004', name='شرکت دلتا', national_id='40404040404',
                     amount=700000, vat=70000),
        ])
        ledger = [{
            'index': 1, 'file_row': 2, 'invoice_no': '1004', 'invoice_no_key': '1004',
            'invoice_date': None, 'party_name': 'شرکت دلتا',
            'name_key': rec.normalize_name('شرکت دلتا'), 'national_id': '40404040404',
            'amount': Decimal('700000'), 'vat': Decimal('70000'), 'total': Decimal('770000'),
        }]
        result = rec.reconcile(self.report, ledger, rec.MatchOptions(), 'purchase')
        run = SeasonalReconciliation.objects.create(
            report=self.report, direction='purchase', file_name='ledger.csv',
            summary=result['summary'], detail={'items': result['items']},
        )
        keys = seasonal_cleanup.suggested_keys(run)
        self.assertEqual(len(keys), 1)

        preview = seasonal_cleanup.remove_suggested_rows(self.report, keys, 'purchase', dry_run=True)
        self.assertEqual(len(preview['matched']), 1)
        self.assertEqual(SeasonalTransaction.objects.filter(report=self.report).count(), 2)

        outcome = seasonal_cleanup.remove_suggested_rows(self.report, keys, 'purchase')
        self.assertEqual(outcome['deleted'], 1)
        remaining = list(SeasonalTransaction.objects.filter(report=self.report).order_by('line_no'))
        self.assertEqual([row.invoice_no for row in remaining], ['2001'])
        self.assertEqual([row.line_no for row in remaining], [1])

    def test_matching_classifies_rows(self):
        result = rec.reconcile(self.report, self.ledger(), rec.MatchOptions(), 'purchase')
        summary = result['summary']
        self.assertEqual(summary['seasonal']['count'], 3)
        self.assertEqual(summary['matched']['count'], 2)
        self.assertEqual(summary['counts']['amount_mismatch'], 1)
        self.assertEqual(summary['counts']['missing_in_seasonal'], 1)
        self.assertEqual(summary['counts']['missing_in_ledger'], 1)
        self.assertEqual(summary['amount_delta'], float(1800000 - 2210000))
        self.assertEqual(result['suggested_rows'][0]['invoiceNo'], '1004')

    def test_amount_mismatch_has_evidence(self):
        result = rec.reconcile(self.report, self.ledger(), rec.MatchOptions(), 'purchase')
        mismatch = [item for item in result['items'] if item['kind'] == 'amount_mismatch'][0]
        self.assertEqual(mismatch['seasonal']['invoice_no'], '1002')
        self.assertTrue(mismatch['evidence']['invoice_exact'])
        self.assertEqual(mismatch['evidence']['amount_state'], 'different')
        self.assertTrue(any(diff['field'] == 'amount' for diff in mismatch['differences']))

    def test_tolerance_option_softens_minor_differences(self):
        options = rec.MatchOptions.from_payload({'amount_tolerance': 15000})
        result = rec.reconcile(self.report, self.ledger(), options, 'purchase')
        self.assertEqual(result['summary']['counts']['amount_mismatch'], 0)
        self.assertEqual(result['summary']['differences']['amount_minor'], 1)

    def test_name_only_match_without_invoice_number(self):
        rows = [{'index': 1, 'file_row': 2, 'invoice_no': '', 'invoice_no_key': '',
                 'invoice_date': None, 'party_name': 'شرکت گاما',
                 'name_key': rec.normalize_name('شرکت گاما'), 'national_id': '',
                 'amount': Decimal('300000'), 'vat': Decimal('0'), 'total': Decimal('300000')}]
        result = rec.reconcile(self.report, rows, rec.MatchOptions(), 'purchase')
        matched = [item for item in result['items'] if item['kind'] in ('matched', 'difference')]
        self.assertTrue(matched)
        self.assertEqual(matched[0]['seasonal']['invoice_no'], '1003')
        self.assertFalse(matched[0]['evidence']['invoice_exact'])

    def test_reconciliation_workbook_layout(self):
        result = rec.reconcile(self.report, self.ledger(), rec.MatchOptions(), 'purchase')
        workbook = rec.build_reconciliation_workbook(result)
        self.assertEqual(workbook.sheetnames, [
            'خلاصه', 'مغایرت‌ها', 'فقط در فصلی', 'فقط در دفاتر', 'تطبیق‌شده', 'نگاشت ستون‌ها',
        ])
        self.assertEqual(workbook['خلاصه'].cell(row=1, column=1).value,
                         'گزارش مغایرت‌گیری صورت معاملات فصلی خرید')
        self.assertEqual(workbook['فقط در دفاتر'].cell(row=1, column=2).value, 'نوع مغایرت')
        buffer = io.BytesIO()
        workbook.save(buffer)
        self.assertGreater(buffer.tell(), 3000)


class AnalyticsTests(SeasonalBaseTest):
    """شاخص‌های تحلیلی فصل."""

    def test_analytics_filters_by_kind_and_status(self):
        report = self.make_report()
        sync_rows(report, [
            self.row(invoice_no='K1', amount=1000000, vat=100000, kind=1),
            self.row(invoice_no='K2', name='شرکت بتا', national_id='20202020202',
                     amount=500000, vat=50000, kind=2, moadian_status='pending'),
            self.row(invoice_no='K3', name='شرکت گاما', national_id='30303030303',
                     amount=300000, vat=0, kind=2),
        ])

        only_kind2 = rec.build_analytics(report, 'purchase', {'kind': 2})
        self.assertEqual(only_kind2['totals']['count'], 2)
        self.assertEqual(only_kind2['totals']['amount'], 800000.0)
        self.assertTrue(only_kind2['active_filters'])
        self.assertEqual(only_kind2['unfiltered']['count'], 3)
        self.assertEqual(only_kind2['filters']['kind'], 2)

        pending = rec.build_analytics(report, 'purchase', {'moadian_status': 'pending'})
        self.assertEqual(pending['totals']['count'], 1)
        self.assertEqual(pending['totals']['amount'], 500000.0)

        combined = rec.build_analytics(report, 'purchase', {'kind': '2', 'moadian_status': 'pending'})
        self.assertEqual(combined['totals']['count'], 1)

        self.assertEqual(len(rec.filtered_rows(report, 'purchase', {'kind': 2})), 2)
        self.assertIsNone(rec.filters_from_query({'kind': '۹'})['kind'])

    def test_filter_options_and_analytics_workbook(self):
        report = self.make_report()
        sync_rows(report, [
            self.row(invoice_no='W1', amount=1000000, vat=100000, kind=1),
            self.row(invoice_no='W2', name='شرکت بتا', national_id='20202020202',
                     amount=500000, vat=50000, kind=2, moadian_status='pending'),
        ])
        analytics = rec.build_analytics(report, 'purchase', {'kind': 2})
        options = analytics['filter_options']
        self.assertTrue(any(option['value'] == 2 for option in options['kind']))
        self.assertEqual(options['total'], 2)
        self.assertEqual(analytics['filters']['kind'], 2)

        rows = rec.filtered_rows(report, 'purchase', {'kind': 2})
        workbook = rec.build_analytics_workbook(analytics, rows)
        self.assertEqual(workbook.sheetnames, [
            'خلاصه', 'ماهانه', 'نوع معامله', 'نوع طرف معامله', 'وضعیت مودیان', 'طرف‌های برتر', 'ردیف‌ها',
        ])
        self.assertEqual(workbook['ردیف‌ها'].max_row, 2)
        self.assertEqual(workbook['نوع معامله'].cell(row=1, column=1).value, 'نوع')
        buffer = io.BytesIO()
        workbook.save(buffer)
        self.assertGreater(buffer.tell(), 3000)

    def test_analytics_payload(self):
        report = self.make_report()
        sync_rows(report, [
            self.row(invoice_no='A1', amount=1000000, vat=100000, invoice_date='2026-04-10'),
            self.natural_row(invoice_no='A2', amount=500000, vat=50000, invoice_date='2026-05-10',
                             moadian_status='pending'),
            {'person_type': 'aggregate', 'amount': 250000, 'description': 'تجمیعی'},
        ])
        analytics = rec.build_analytics(report, 'purchase')
        self.assertEqual(analytics['totals']['count'], 3)
        self.assertEqual(analytics['totals']['amount'], 1750000.0)
        self.assertEqual(analytics['totals']['vat'], 150000.0)
        self.assertEqual(analytics['totals']['registered'], 1)
        self.assertEqual(analytics['quality']['aggregate_rows'], 1)
        self.assertTrue(analytics['by_month'])
        self.assertTrue(analytics['top_parties'])
        self.assertTrue(analytics['insights'])
        self.assertEqual(analytics['ruleset']['version'], rec.seasonal_rules.RULESET_VERSION)



class PartyPivotTests(SeasonalBaseTest):
    """جدول پیوت طرف حساب: جمع مبلغ هر طرف + تفکیک ستون‌ها + خروجی اکسل."""

    def setUp(self):
        super().setUp()
        self.report = self.make_report()
        sync_rows(self.report, [
            self.row(invoice_no='P1', amount=1000000, vat=100000, kind=1,
                     invoice_date='2026-04-10'),
            self.row(invoice_no='P2', amount=250000, vat=25000, kind=2,
                     invoice_date='2026-05-10', moadian_status='pending'),
            self.row(invoice_no='P3', name='شرکت بتا صنعت', national_id='20202020202',
                     amount=500000, vat=50000, kind=2, invoice_date='2026-04-20'),
            self.natural_row(invoice_no='P4', amount=200000, vat=20000, kind=1,
                             invoice_date='2026-06-01'),
        ])

    def test_pivot_groups_amounts_per_party(self):
        pivot = rec.build_party_pivot(self.report, 'purchase', None, 'kind')
        self.assertEqual(pivot['dimension'], 'kind')
        self.assertEqual([column['key'] for column in pivot['columns']], ['kind_1', 'kind_2'])
        self.assertEqual(pivot['totals']['parties'], 3)
        self.assertEqual(pivot['totals']['amount'], 1950000.0)
        self.assertEqual(pivot['totals']['count'], 4)

        first = pivot['rows'][0]
        self.assertEqual(first['name'], 'شرکت آلفا تجارت')
        self.assertEqual(first['count'], 2)
        self.assertEqual(first['amount'], 1250000.0)
        self.assertEqual(first['values']['kind_1'], 1000000.0)
        self.assertEqual(first['values']['kind_2'], 250000.0)
        self.assertEqual(pivot['column_totals']['kind_1'], 1200000.0)
        self.assertEqual(pivot['column_totals']['kind_2'], 750000.0)
        self.assertGreater(first['share'], 0.6)

    def test_pivot_other_dimensions_and_filters(self):
        by_month = rec.build_party_pivot(self.report, 'purchase', None, 'month')
        self.assertTrue(all(column['key'].startswith('1405') for column in by_month['columns']))

        by_status = rec.build_party_pivot(self.report, 'purchase', None, 'moadian_status')
        self.assertEqual(by_status['column_totals']['registered'], 1700000.0)
        self.assertEqual(by_status['column_totals']['pending'], 250000.0)

        filtered = rec.build_party_pivot(self.report, 'purchase', {'moadian_status': 'pending'}, 'kind')
        self.assertEqual(filtered['totals']['count'], 1)
        self.assertEqual(filtered['totals']['parties'], 1)
        self.assertEqual(filtered['rows'][0]['name'], 'شرکت آلفا تجارت')

        fallback = rec.build_party_pivot(self.report, 'purchase', None, 'invalid-dimension')
        self.assertEqual(fallback['dimension'], 'kind')

    def test_pivot_workbook_layout(self):
        pivot = rec.build_party_pivot(self.report, 'purchase', None, 'kind')
        workbook = rec.build_party_pivot_workbook(pivot)
        self.assertEqual(workbook.sheetnames, ['پیوت طرف حساب', 'خلاصه'])
        sheet = workbook['پیوت طرف حساب']
        self.assertEqual(sheet.cell(row=1, column=1).value, 'ردیف')
        self.assertEqual(sheet.cell(row=1, column=2).value, 'طرف حساب')
        self.assertEqual(sheet.cell(row=1, column=6).value, 'نوع 1')
        self.assertEqual(sheet.cell(row=2, column=2).value, 'شرکت آلفا تجارت')
        totals_row = 2 + len(pivot['rows'])
        self.assertEqual(sheet.cell(row=totals_row, column=1).value, 'جمع کل')
        self.assertEqual(sheet.cell(row=totals_row, column=6).value, 1200000.0)
        buffer = io.BytesIO()
        workbook.save(buffer)
        self.assertGreater(buffer.tell(), 3000)
class FilterExpressionTests(SeasonalBaseTest):
    """درخت شرط AND/OR: پاک‌سازی، تطبیق ردیف، گزارش تحلیلی و پیوت."""

    def setUp(self):
        super().setUp()
        self.report = self.make_report()
        sync_rows(self.report, [
            self.row(invoice_no='F1', amount=3000000, vat=300000, kind=2, invoice_date='2026-04-10'),
            self.natural_row(invoice_no='F2', amount=1200000, vat=120000, kind=3,
                             invoice_date='2026-05-10', moadian_status='pending'),
            {'person_type': 'aggregate', 'amount': 900000, 'vat': 0, 'invoice_no': 'F1'},
            self.row(invoice_no='F3', name='شرکت مس البرز', national_id='30303030303',
                     amount=45000000, vat=4500000, kind=2, invoice_date='2026-06-01'),
        ])

    def _ids(self, expression):
        rows = rec.filtered_rows(self.report, 'purchase', {'expression': expression})
        return [row.invoice_no or row.person_type for row in rows]

    def test_normalize_expression_drops_invalid_conditions(self):
        normalized = rec.normalize_expression({'op': 'any', 'items': [
            {'field': 'unknown', 'operator': 'eq', 'value': 1},
            {'field': 'amount', 'operator': 'between', 'value': 10},
            {'field': 'name', 'operator': 'contains', 'value': '   '},
            {'field': 'name', 'operator': 'contains', 'value': '  مس  '},
            {'op': 'and', 'items': []},
        ]})
        self.assertEqual(normalized, {'op': 'or', 'items': [
            {'field': 'name', 'operator': 'contains', 'value': 'مس', 'value2': None},
        ]})

    def test_and_or_expression_filters_rows(self):
        expression = {'op': 'and', 'items': [
            {'field': 'amount', 'operator': 'gte', 'value': '1000000'},
            {'op': 'or', 'items': [
                {'field': 'kind', 'operator': 'eq', 'value': 3},
                {'field': 'name', 'operator': 'contains', 'value': 'مس'},
            ]},
        ]}
        self.assertEqual(self._ids(expression), ['F2', 'F3'])

    def test_date_between_accepts_jalali_and_numbers(self):
        by_date = {'items': [{'field': 'invoice_date', 'operator': 'between',
                              'value': '1405/01/25', 'value2': '1405/02/20'}]}
        self.assertEqual(self._ids(by_date), ['F1', 'F2'])

        by_vat = {'items': [{'field': 'vat', 'operator': 'gte', 'value': '۳۰۰٬۰۰۰'}]}
        self.assertEqual(self._ids(by_vat), ['F1', 'F3'])

    def test_duplicate_aggregate_and_empty_flags(self):
        self.assertEqual(self._ids({'items': [
            {'field': 'duplicate', 'operator': 'is_true'}]}), ['F1', 'aggregate'])
        self.assertEqual(self._ids({'items': [
            {'field': 'aggregate', 'operator': 'is_true'}]}), ['aggregate'])
        self.assertEqual(self._ids({'items': [
            {'field': 'invoice_no', 'operator': 'not_empty'},
            {'field': 'aggregate', 'operator': 'is_false'},
        ]}), ['F1', 'F2', 'F3'])

    def test_expression_applies_to_analytics_and_pivot(self):
        expression = {'op': 'and', 'items': [
            {'field': 'kind', 'operator': 'eq', 'value': 2},
            {'field': 'amount', 'operator': 'lt', 'value': 10000000},
        ]}
        analytics = rec.build_analytics(self.report, 'purchase', {'expression': expression})
        self.assertEqual(analytics['totals']['count'], 1)
        self.assertEqual(analytics['totals']['amount'], 3000000.0)
        self.assertTrue(analytics['active_filters'])
        self.assertEqual(analytics['filters']['kind'], 2)
        self.assertIn('مبلغ کوچک‌تر از 10,000,000', analytics['filters_label'])

        pivot = rec.build_party_pivot(self.report, 'purchase', {'expression': expression}, 'kind')
        self.assertEqual(pivot['totals']['count'], 1)
        self.assertEqual(pivot['totals']['parties'], 1)
        self.assertIn('نوع معامله برابر باشد با نوع 2', pivot['filters_label'])

        empty = rec.build_analytics(self.report, 'purchase', {'expression': {'items': []}})
        self.assertFalse(empty['active_filters'])
        self.assertEqual(empty['totals']['count'], 4)

    def test_filters_from_query_parses_json_expression(self):
        import json

        params = {'expression': json.dumps({'items': [
            {'field': 'person_type', 'operator': 'eq', 'value': 'natural'}]})}
        cleaned = rec.filters_from_query(params)
        self.assertEqual(cleaned['person_type'], 'natural')
        self.assertEqual(cleaned['expression']['items'][0]['field'], 'person_type')

        broken = rec.filters_from_query({'expression': '{oops'})
        self.assertEqual(broken['expression']['items'], [])
        self.assertIsNone(broken['kind'])



class SavedViewTests(SeasonalBaseTest):
    """نمای ذخیره‌شدهٔ فیلتر: اعتبارسنجی، یکتایی نام و برچسب خوانا."""

    def setUp(self):
        super().setUp()
        self.report = self.make_report()

    def _serializer(self, data):
        from accounting.serializers import SeasonalSavedViewSerializer

        return SeasonalSavedViewSerializer(data=data, context={'company': self.company})

    def test_saved_view_validates_and_labels_filters(self):
        serializer = self._serializer({
            'report': self.report.pk,
            'name': 'خریدهای بزرگ حقوقی',
            'filters': {'op': 'and', 'items': [
                {'field': 'amount', 'operator': 'gte', 'value': 5000000},
                {'field': 'person_type', 'operator': 'eq', 'value': 'legal'},
            ]},
            'is_favorite': True,
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        view = serializer.save(company=self.company, owner_name='کاربر تست')
        self.assertEqual(view.filters['op'], 'and')
        self.assertEqual(len(view.filters['items']), 2)

        payload = serializer.__class__(view, context={'company': self.company}).data
        self.assertEqual(payload['filters_label'],
                         'مبلغ بزرگ‌تر یا مساوی 5,000,000 و نوع طرف معامله برابر باشد با شخص حقوقی')
        self.assertTrue(payload['is_favorite'])
        self.assertIn('فصل 1', payload['report_label'])

        duplicate = self._serializer({'report': self.report.pk, 'name': 'خریدهای بزرگ حقوقی'})
        self.assertFalse(duplicate.is_valid())
        self.assertIn('name', duplicate.errors)

    def test_saved_view_requires_name_and_limits_conditions(self):
        missing = self._serializer({'report': self.report.pk, 'name': '   '})
        self.assertFalse(missing.is_valid())
        self.assertIn('name', missing.errors)

        many = {'items': [{'field': 'name', 'operator': 'contains', 'value': f'n{index}'}
                          for index in range(31)]}
        too_many = self._serializer({'report': self.report.pk, 'name': 'زیاد', 'filters': many})
        self.assertFalse(too_many.is_valid())
        self.assertIn('filters', too_many.errors)


class TtmsPackageTests(SeasonalBaseTest):
    """بستهٔ درج در فایل Access نسخهٔ TTMS: ساختار، نگاشت، فیلتر و تاریخچه."""

    def setUp(self):
        super().setUp()
        self.report = self.make_report()
        self.save_rows(self.report, [
            self.row(invoice_no='P-1', amount=1000000, vat=100000),
            self.natural_row(invoice_no='P-2', amount=500000, vat=50000),
            self.row(invoice_no='P-3', name='Atlas GmbH', person_type='foreign',
                     national_id='', postal_code='', country='ترکیه',
                     amount=250000, vat=0),
        ])

    def _package(self, filters=None, options=None):
        from accounting import seasonal_ttms

        rows = rec.filtered_rows(self.report, 'purchase', filters or {})
        content, filename, manifest = seasonal_ttms.build_package(
            self.report, rows, options, filters,
        )
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            files = {name: archive.read(name) for name in archive.namelist()}
        return filename, manifest, files

    def test_package_layout_and_ttms_mapping(self):
        filename, manifest, files = self._package()
        self.assertEqual(
            set(files),
            {'rows.csv', 'manifest.json', 'README.txt', 'fill_ttms.ps1', 'run_fill.cmd'},
        )
        self.assertTrue(filename.startswith('ttms-fill-purchase-1405-q1-'))
        self.assertEqual(manifest['target']['hc_year_code'], 1405)
        self.assertEqual(manifest['target']['hc_fasl_type_code'], 1)
        self.assertEqual(manifest['target']['detail_table'], 'Kharid_Detail')
        self.assertEqual(len(manifest['columns']), 49)     # پوشش کامل Kharid_Detail
        self.assertTrue(manifest['coverage']['counts']['editable'])
        self.assertEqual(len(manifest['coverage']['out_of_scope']), 7)   # ۶ نرخ + شناسهٔ کالا
        self.assertEqual(
            manifest['totals'],
            {'rows': 3, 'amount': 1750000, 'vat': 150000, 'total': 1900000},
        )
        self.assertEqual(len(manifest['checksum']['rows_file_sha256']), 64)

        content = files['rows.csv'].decode('utf-8-sig')
        rows = list(csv.DictReader(io.StringIO(content)))
        self.assertEqual(len(rows), 3)
        legal, natural, foreign = rows

        # فروشندهٔ حقوقی: نوع ۲، شناسه ملی، نام شرکت در ستون نام خانوادگی/شرکت
        self.assertEqual(legal['Radif'], '1')
        self.assertEqual(legal['KalaType'], '12')
        self.assertEqual(legal['HCForoushandeTypeCode'], '2')
        self.assertEqual(legal['HCForoushandeType1Code'], '5')
        self.assertEqual(legal['ForoushandeLastNameSherkatName'], 'شرکت آلفا تجارت')
        self.assertEqual(legal['ForoushandeName'], '')
        self.assertEqual(legal['ForoushandeNationalCode'], '10101010101')
        self.assertEqual(legal['Price'], '1000000')
        self.assertEqual(legal['MaliatArzeshAfzoodeh'], '100000')
        self.assertTrue(legal['FactorDate'].startswith('1405/'))
        self.assertEqual(legal['IsSent'], 'False')
        self.assertEqual(legal['ForoushandeEconomicNO'], '')

        # فروشندهٔ حقیقی: نوع ۱ و نام/نام خانوادگی جدا
        self.assertEqual(natural['HCForoushandeTypeCode'], '1')
        self.assertEqual(natural['ForoushandeName'], 'علی')
        self.assertEqual(natural['ForoushandeLastNameSherkatName'], 'رضایی')
        self.assertEqual(natural['ForoushandeNationalCode'], '0012345678')

        # فروشندهٔ خارجی: وضعیت ۷ و نام در ستون شرکت
        self.assertEqual(foreign['HCForoushandeType1Code'], '7')
        self.assertEqual(foreign['ForoushandeLastNameSherkatName'], 'Atlas GmbH')

        # اسکریپت PowerShell با BOM (لازم برای فارسی در PowerShell 5.1)
        self.assertTrue(files['fill_ttms.ps1'].startswith(b'\xef\xbb\xbf'))
        self.assertIn('Kharid_Detail', files['fill_ttms.ps1'].decode('utf-8-sig'))
        readme = files['README.txt'].decode('utf-8-sig')
        self.assertIn('fill_ttms.ps1', readme)
        self.assertIn('tested-on-copy', readme)


    def test_package_applies_filters_and_options(self):
        from accounting import seasonal_ttms

        filters = {
            'expression': {'op': 'and', 'items': [
                {'field': 'person_type', 'operator': 'eq', 'value': 'legal'},
            ]},
        }
        _filename, manifest, files = self._package(
            filters, options={'kala_type': 7, 'seller_type1_code': 6, 'continue_radif': False},
        )
        self.assertEqual(manifest['totals']['rows'], 1)
        self.assertEqual(manifest['totals']['amount'], 1000000)
        self.assertEqual(manifest['mapping']['kala_type'], 7)
        self.assertEqual(manifest['mapping']['seller_type1_code'], 6)
        self.assertIn('شخص حقوقی', manifest['report']['filters_label'])

        rows = list(csv.DictReader(io.StringIO(files['rows.csv'].decode('utf-8-sig'))))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['KalaType'], '7')
        self.assertEqual(rows[0]['HCForoushandeType1Code'], '6')

        options = seasonal_ttms.normalize_options({'kala_type': 99, 'seller_type1_code': 3})
        self.assertEqual(options['kala_type'], 12)      # مقدار نامعتبر → پیش‌فرض
        self.assertIsNone(options['seller_type1_code'])

    def test_preview_maps_rows_and_zone_codes(self):
        from accounting import seasonal_ttms

        rows = rec.filtered_rows(self.report, 'purchase', {})
        payload = seasonal_ttms.preview(self.report, rows)

        self.assertEqual(len(payload['rows']), 3)
        self.assertEqual(payload['totals'], {'rows': 3, 'amount': 1750000,
                                             'vat': 150000, 'total': 1900000})
        self.assertTrue(payload['provinces'])
        self.assertIn('StateCode', payload['editable'])

        legal = payload['rows'][0]['values']
        self.assertEqual(legal['StateCode'], 10)          # تهران
        self.assertEqual(legal['CityCode'], 1001000)      # تهران
        self.assertEqual(legal['HCForoushandeTypeCode'], 2)

        codes = {item['code'] for item in payload['warnings']}
        self.assertIn('state_code', codes)                # ردیف خارجی بدون استان
        self.assertTrue(payload['currencies'])            # کدهای ارز جدول Arz
        self.assertGreaterEqual(payload['needs_fix_count'], 1)
        self.assertTrue(payload['rows'][0]['province_name'])

    def test_currency_and_discount_fields(self):
        from accounting import seasonal_ttms

        rows = rec.filtered_rows(self.report, 'purchase', {})
        key = seasonal_ttms._row_key(rows[0])

        payload = seasonal_ttms.preview(
            self.report, rows,
            overrides={key: {'ArzType': 36, 'Arz_Price': 100, 'TakhfifPrice': 2000000}},
        )
        values = payload['rows'][0]['values']
        self.assertEqual(values['ArzType'], 36)
        self.assertEqual(values['Arz_Price'], 100)
        self.assertEqual(values['TakhfifPrice'], 2000000)
        self.assertEqual(values['MoadelRialiPrice'], 1000000)   # معادل ریالی خودکار
        codes = {item['code'] for item in payload['warnings']}
        self.assertIn('fx_rate_manual', codes)
        self.assertIn('discount_gt_amount', codes)

        bad_bool = seasonal_ttms.preview(
            self.report, rows, overrides={key: {'BargashtType': 'شاید'}},
        )
        self.assertTrue(bad_bool['errors'])

        flags = seasonal_ttms.preview(
            self.report, rows, overrides={key: {'BargashtType': 'بله'}},
        )
        self.assertTrue(flags['rows'][0]['values']['BargashtType'])
        codes = {item['code'] for item in flags['warnings']}
        self.assertIn('return_row', codes)

        from accounting import seasonal_ttms

        rows = rec.filtered_rows(self.report, 'purchase', {})
        foreign_key = seasonal_ttms._row_key(rows[2])

        payload = seasonal_ttms.preview(
            self.report, rows, overrides={foreign_key: {'StateCode': '23', 'CityCode': 2301000}},
        )
        self.assertEqual(payload['rows'][2]['values']['StateCode'], 23)
        self.assertEqual(payload['rows'][2]['values']['CityCode'], 2301000)

        cleared = seasonal_ttms.preview(
            self.report, rows, overrides={foreign_key: {'StateCode': ''}},
        )
        self.assertIsNone(cleared['rows'][2]['values']['StateCode'])

        bad = seasonal_ttms.preview(
            self.report, rows, overrides={foreign_key: {'ForoushandePostCode': '123'}},
        )
        self.assertTrue(bad['errors'])
        self.assertEqual(bad['errors'][0]['column'], 'ForoushandePostCode')

        with self.assertRaises(seasonal_ttms.OverridesError):
            seasonal_ttms.build_package(
                self.report, rows, overrides={foreign_key: {'HCForoushandeType1Code': 9}},
            )

        content, _name, manifest = seasonal_ttms.build_package(
            self.report, rows, overrides={foreign_key: {'StateCode': 23}},
        )
        self.assertEqual(manifest['overrides']['rows'], 1)
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            parsed = list(csv.DictReader(io.StringIO(archive.read('rows.csv').decode('utf-8-sig'))))
        self.assertEqual(parsed[2]['StateCode'], '23')

    def test_export_run_serializer_labels_and_status(self):
        from accounting.models import SeasonalExportRun
        from accounting.serializers import SeasonalExportRunSerializer

        _filename, manifest, _files = self._package()
        run = SeasonalExportRun.objects.create(
            company=self.company, report=self.report,
            mapping_version=manifest['package']['version'],
            package_name=manifest['package']['name'],
            filters={'expression': {'op': 'and', 'items': [
                {'field': 'kind', 'operator': 'eq', 'value': 1},
            ]}},
            options=manifest['options'],
            row_count=manifest['totals']['rows'],
            amount_total=manifest['totals']['amount'],
            vat_total=manifest['totals']['vat'],
            created_by_name='کاربر تست',
        )
        payload = SeasonalExportRunSerializer(run, context={'company': self.company}).data
        self.assertEqual(payload['status'], 'generated')
        self.assertEqual(payload['status_display'], 'ساخته شد (در انتظار اجرا)')
        self.assertEqual(payload['totals']['total'], 1900000)
        self.assertIn('نوع معامله', payload['filters_label'])
        self.assertIn('سه‌ماهه اول', payload['report_label'])

        run.status = SeasonalExportRun.Status.FILLED
        run.filled_rows = 3
        run.message = 'درج شد'
        run.result = {'status': 'filled', 'inserted': 3}
        run.save()
        payload = SeasonalExportRunSerializer(run, context={'company': self.company}).data
        self.assertEqual(payload['status_display'], 'روی فایل TTMS درج شد')
        self.assertEqual(payload['filled_rows'], 3)
        self.assertEqual(payload['result']['inserted'], 3)


class ResultStatusTests(SimpleTestCase):
    """نرمال‌سازی وضعیت result.json اسکریپت ویندوز (بدون نیاز به دیتابیس)."""

    def test_accepts_script_statuses(self):
        from accounting import seasonal_ttms

        for status in ('filled', 'dry_run', 'failed', ' FILLED ', 'Dry-Run'):
            normalized, error = seasonal_ttms.resolve_result_status({'status': status})
            self.assertEqual(error, '')
            self.assertIn(normalized, seasonal_ttms.RESULT_STATUSES)

        self.assertEqual(
            seasonal_ttms.resolve_result_status({'status': 'Dry-Run'}),
            ('dry_run', ''),
        )

    def test_maps_legacy_aliases(self):
        from accounting import seasonal_ttms

        cases = {'ok': 'filled', 'success': 'filled', 'error': 'failed', 'dryrun': 'dry_run'}
        for raw, expected in cases.items():
            self.assertEqual(
                seasonal_ttms.resolve_result_status({'status': raw}), (expected, ''),
            )

    def test_infers_filled_from_inserted_and_rejects_manifest(self):
        from accounting import seasonal_ttms

        status, error = seasonal_ttms.resolve_result_status(
            {'inserted': 3, 'observed': {'rows': 3}},
        )
        self.assertEqual((status, error), ('filled', ''))

        status, error = seasonal_ttms.resolve_result_status(
            {'package': {'name': 'ttms-fill'}, 'totals': {'rows': 3}},
        )
        self.assertEqual(status, '')
        self.assertIn('manifest.json', error)

        status, error = seasonal_ttms.resolve_result_status({'hello': 'world'})
        self.assertEqual(status, '')
        self.assertIn('filled', error)

    def test_filler_script_supports_inspect_and_zero_insert_failure(self):
        from accounting import seasonal_ttms

        script = seasonal_ttms.filler_script().decode('utf-8-sig')
        self.assertIn('[switch]$Inspect', script)
        self.assertIn('output_path.txt', script)
        self.assertIn('Get-TableNames', script)
        self.assertIn('fill_ttms.log', script)
        self.assertIn("$result.status = 'dry_run'", script)
        self.assertIn("$result.status = 'failed'", script)

    def test_runner_cmd_forwards_arguments(self):
        from accounting import seasonal_ttms

        self.assertIn('%*', seasonal_ttms.RUNNER_CMD_CONTENT)
        self.assertIn(seasonal_ttms.FILLER_SCRIPT, seasonal_ttms.RUNNER_CMD_CONTENT)
