"""تست‌های صورت معاملات فصلی (ماده ۱۶۹ مکرر) — فاز ۱.

پوشش: بازهٔ فصل شمسی، ذخیرهٔ گروهی اتمیک، اعتبارسنجی خطا/هشدار،
جمع‌های کنترل، خروجی اکسل سه‌شیتی و یکتایی گزارش هر دوره.
"""
import datetime

from django.db import IntegrityError, transaction
from django.test import TestCase

from accounting.models import (
    FiscalYear, SeasonalReport, SeasonalTransaction, seasonal_period_range,
)
from accounting.seasonal import (
    OFFICIAL_COLUMNS, build_workbook, control_totals, sync_rows, validate_report,
)
from accounting.serializers import SeasonalReportSerializer
from core.models import Company


def make_company(schema_name='seasonalco', name='شرکت تست فصلی'):
    company = Company(schema_name=schema_name, name=name)
    company.auto_create_schema = False
    company.save()
    return company


class SeasonalBaseTest(TestCase):
    def setUp(self):
        self.company = make_company()
        self.year = FiscalYear.objects.create(
            company=self.company, name='۱۴۰۵',
            start_date=datetime.date(2026, 3, 21), end_date=datetime.date(2027, 3, 20),
        )

    def make_report(self, quarter=1):
        return SeasonalReport.objects.create(
            company=self.company, fiscal_year=self.year, quarter=quarter,
        )

    def row(self, **overrides):
        data = {
            'name': 'شرکت آلفا تجارت',
            'person_type': 'legal',
            'economic_code': '10101010101',
            'national_id': '10101010101',
            'postal_code': '1234567890',
            'province': 'تهران',
            'city': 'تهران',
            'address': 'خیابان ولیعصر، پلاک ۱۲',
            'goods_service_desc': 'خدمات مشاوره مالی',
            'amount': 1000000,
            'vat': 100000,
            'kind': 1,
            'invoice_date': '2026-04-10',
            'invoice_no': 'A-12',
            'moadian_status': 'registered',
        }
        data.update(overrides)
        return data


class SeasonalPeriodTests(SeasonalBaseTest):

    def test_period_range_follows_jalali_quarters(self):
        self.assertEqual(seasonal_period_range(self.year.start_date, 1),
                         (datetime.date(2026, 3, 21), datetime.date(2026, 6, 21)))
        self.assertEqual(seasonal_period_range(self.year.start_date, 2),
                         (datetime.date(2026, 6, 22), datetime.date(2026, 9, 22)))
        self.assertEqual(seasonal_period_range(self.year.start_date, 3),
                         (datetime.date(2026, 9, 23), datetime.date(2026, 12, 21)))
        self.assertEqual(seasonal_period_range(self.year.start_date, 4),
                         (datetime.date(2026, 12, 22), datetime.date(2027, 3, 20)))

    def test_report_period_properties(self):
        report = self.make_report(quarter=2)
        self.assertEqual(report.period_start, datetime.date(2026, 6, 22))
        self.assertEqual(report.period_end, datetime.date(2026, 9, 22))
        self.assertFalse(report.is_locked)

    def test_one_report_per_fiscal_year_and_quarter(self):
        self.make_report(quarter=1)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_report(quarter=1)

    def test_serializer_rejects_duplicate_period(self):
        self.make_report(quarter=1)
        serializer = SeasonalReportSerializer(
            data={'fiscal_year': self.year.pk, 'quarter': 1},
            context={'company': self.company},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('quarter', serializer.errors)


class SeasonalSyncTests(SeasonalBaseTest):

    def test_sync_rows_renumbers_and_replaces(self):
        report = self.make_report()
        saved = sync_rows(report, [self.row(), self.row(invoice_no='A-13', name='شرکت بتا')])
        self.assertEqual(saved, 2)
        rows = list(report.transactions.order_by('line_no'))
        self.assertEqual([row.line_no for row in rows], [1, 2])

        # ذخیرهٔ مجدد با یک ردیف (حذف ردیف دوم) و ویرایش ردیف اول
        first = rows[0]
        sync_rows(report, [self.row(id=first.id, amount=2500000, vat=250000)])
        rows = list(report.transactions.all())
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].line_no, 1)
        self.assertEqual(int(rows[0].amount), 2500000)
        self.assertEqual(int(rows[0].total), 2750000)

    def test_sync_rows_skips_blank_rows_and_cleans_digits(self):
        report = self.make_report()
        saved = sync_rows(report, [
            self.row(economic_code='۱۰۱۰۱۰۱۰۱۰۱', postal_code='۱۲۳۴۵۶۷۸۹۰'),
            {'name': '', 'invoice_no': '', 'amount': '', 'vat': ''},
        ])
        self.assertEqual(saved, 1)
        row = report.transactions.first()
        self.assertEqual(row.economic_code, '10101010101')
        self.assertEqual(row.postal_code, '1234567890')
        self.assertEqual(row.source, SeasonalTransaction.Source.MANUAL)

    def test_sync_rows_can_reorder_existing_rows(self):
        report = self.make_report()
        sync_rows(report, [self.row(invoice_no='R-1'), self.row(invoice_no='R-2')])
        first, second = list(report.transactions.order_by('line_no'))
        # جابه‌جایی ترتیب دو ردیف موجود (شمارهٔ ردیف یکتا نباید تداخل کند)
        sync_rows(report, [
            self.row(id=second.id, invoice_no='R-2'),
            self.row(id=first.id, invoice_no='R-1'),
        ])
        rows = list(report.transactions.order_by('line_no'))
        self.assertEqual([row.invoice_no for row in rows], ['R-2', 'R-1'])
        self.assertEqual([row.line_no for row in rows], [1, 2])

    def test_sync_rows_blocked_after_submission(self):
        report = self.make_report()
        report.status = SeasonalReport.Status.SUBMITTED
        report.save(update_fields=['status'])
        with self.assertRaises(ValueError):
            sync_rows(report, [self.row()])


class SeasonalValidationTests(SeasonalBaseTest):

    def test_clean_row_has_no_issues(self):
        report = self.make_report()
        sync_rows(report, [self.row()])
        result = validate_report(report)
        self.assertEqual(result['issues'], [])
        self.assertEqual(result['summary']['errors'], 0)
        self.assertEqual(result['summary']['warnings'], 0)

    def test_hard_errors(self):
        report = self.make_report()
        sync_rows(report, [
            self.row(person_type='legal', economic_code='', invoice_no='E-1'),
            self.row(invoice_no='E-2', amount=1000, vat=5000),
            self.row(invoice_no='E-3', invoice_date='2025-01-05'),
            self.row(invoice_no='E-4', postal_code='123'),
        ])
        result = validate_report(report)
        messages = {(issue['row_no'], issue['field']) for issue in result['issues'] if issue['level'] == 'error'}
        self.assertIn((1, 'economic_code'), messages)
        self.assertIn((2, 'vat'), messages)
        self.assertIn((3, 'invoice_date'), messages)
        self.assertIn((4, 'postal_code'), messages)
        self.assertGreaterEqual(result['summary']['errors'], 4)

    def test_warnings_for_missing_companion_fields(self):
        report = self.make_report()
        sync_rows(report, [self.row(
            person_type='natural', economic_code='', postal_code='',
            invoice_no='', invoice_date='', goods_service_desc='',
            moadian_status='pending',
        )])
        result = validate_report(report)
        fields = {issue['field'] for issue in result['issues'] if issue['level'] == 'warning'}
        self.assertIn('economic_code', fields)
        self.assertIn('postal_code', fields)
        self.assertIn('invoice_no', fields)
        self.assertIn('invoice_date', fields)
        self.assertIn('goods_service_desc', fields)
        self.assertIn('moadian_status', fields)
        self.assertEqual(result['summary']['errors'], 0)

    def test_duplicate_invoice_number_is_error(self):
        report = self.make_report()
        sync_rows(report, [
            self.row(invoice_no='D-1', economic_code='10101010101'),
            self.row(invoice_no='D-1', economic_code='10101010101', name='شرکت آلفا تجارت'),
        ])
        result = validate_report(report)
        duplicates = [issue for issue in result['issues']
                      if issue['level'] == 'error' and issue['field'] == 'invoice_no']
        self.assertEqual(len(duplicates), 1)
        self.assertEqual(duplicates[0]['row_no'], 2)


class SeasonalTotalsAndExportTests(SeasonalBaseTest):

    def setUp(self):
        super().setUp()
        self.report = self.make_report()
        sync_rows(self.report, [
            self.row(amount=1000000, vat=100000, kind=1, moadian_status='registered'),
            self.row(amount=500000, vat=50000, kind=2, moadian_status='pending',
                     invoice_no='A-13', name='شرکت بتا'),
            self.row(amount=250000, vat=0, kind=2, invoice_no='A-14',
                     name='شخص حقیقی', person_type='natural', economic_code='10101010101'),
        ])

    def test_control_totals(self):
        totals = control_totals(self.report)
        self.assertEqual(totals['count'], 3)
        self.assertEqual(totals['amount'], 1750000)
        self.assertEqual(totals['vat'], 150000)
        self.assertEqual(totals['total'], 1900000)
        self.assertEqual(totals['registered'], 1)
        self.assertEqual(totals['pending'], 2)
        kinds = {item['kind']: item for item in totals['by_kind']}
        self.assertEqual(kinds[1]['count'], 1)
        self.assertEqual(kinds[2]['count'], 2)
        self.assertEqual(kinds[2]['amount'], 750000)

    def test_workbook_layout(self):
        workbook = build_workbook(self.report)
        self.assertEqual(workbook.sheetnames, ['داده', 'خلاصه', 'خطاها'])

        data = workbook['داده']
        headers = [data.cell(row=3, column=index).value for index in range(1, len(OFFICIAL_COLUMNS) + 1)]
        self.assertEqual(headers, OFFICIAL_COLUMNS)

        # سه ردیف داده از سطر ۴ و سطر جمع در ادامه
        self.assertEqual(data.cell(row=4, column=1).value, 1)
        self.assertEqual(data.cell(row=4, column=2).value, '10101010101')
        self.assertEqual(data.cell(row=4, column=10).value, 1000000)
        self.assertEqual(data.cell(row=4, column=12).value, 1100000)
        total_row = 4 + 3
        self.assertEqual(data.cell(row=total_row, column=10).value, 1750000)
        self.assertEqual(data.cell(row=total_row, column=12).value, 1900000)

        summary = workbook['خلاصه']
        summary_values = [cell.value for cell in summary['B']]
        self.assertIn(1750000, summary_values)
        self.assertIn(1900000, summary_values)

        issues = workbook['خطاها']
        self.assertEqual(issues.cell(row=1, column=5).value, 'پیام')

    def test_report_serializer_exposes_rows_and_totals(self):
        serializer = SeasonalReportSerializer(
            self.report, context={'company': self.company},
        )
        payload = serializer.data
        self.assertEqual(payload['rows_count'], 3)
        self.assertEqual(payload['control_totals']['count'], 3)
        self.assertEqual(len(payload['transactions']), 3)
        self.assertEqual(payload['period_start'], '2026-03-21')

