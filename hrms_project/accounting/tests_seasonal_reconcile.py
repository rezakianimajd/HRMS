"""تست‌های گزارش‌گیری و مغایرت‌گیری «اکسل دفاتر» برای معاملات فصلی (خرید).

اجرای واقعی روی سرور: ``manage.py test accounting.tests_seasonal_reconcile``.
"""
import io
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile

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
