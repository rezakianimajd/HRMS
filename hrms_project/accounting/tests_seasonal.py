"""تست‌های زیرماژول «معاملات فصلی خرید» (ماده ۱۶۹ مکرر).

پوشش: بازهٔ فصل شمسی، ذخیرهٔ گروهی جهت‌محور، قواعد پویا بر اساس نوع فروشنده
(حقوقی/حقیقی/خارجی)، مبالغ و عوارض، تاریخ و تکرار فاکتور، جمع‌های کنترل،
خروجی اکسل خرید و بستهٔ «پیش‌نویس آزمایش‌نشده» TTMS.

اجرای واقعی: روی سرور (PostgreSQL) با ``manage.py test accounting.tests_seasonal``.
"""
import datetime
import io
import zipfile
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase

from accounting import seasonal_rules
from accounting.models import (
    FiscalYear, SeasonalReport, SeasonalTransaction, seasonal_period_range,
)
from accounting.seasonal import (
    PURCHASE_COLUMNS, build_ttms_draft, build_workbook, control_totals,
    sync_rows, validate_report,
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
        """ردیف خرید پیش‌فرض: فروشندهٔ حقوقی با شناسه ملی ۱۱ رقمی."""
        data = {
            'name': 'شرکت آلفا تجارت',
            'first_name': '',
            'last_name': '',
            'person_type': 'legal',
            'national_id': '10101010101',
            'postal_code': '1234567890',
            'country': '',
            'province': 'تهران',
            'city': 'تهران',
            'address': 'خیابان ولیعصر، پلاک ۱۲',
            'goods_service_desc': 'خرید مواد اولیه',
            'amount': 1000000,
            'vat': 100000,
            'duties': 20000,
            'kind': 1,
            'invoice_date': '2026-04-10',
            'invoice_no': 'P-12',
            'moadian_status': 'registered',
            'moadian_uid': 'UID-1',
        }
        data.update(overrides)
        return data

    def natural_row(self, **overrides):
        """ردیف خرید فروشندهٔ حقیقی: نام و نام خانوادگی جدا + کد ملی ۱۰ رقمی."""
        data = self.row(
            person_type='natural', name='', first_name='علی', last_name='رضایی',
            national_id='0012345678', postal_code='1234567890', invoice_no='N-1',
        )
        data.update(overrides)
        return data

    def save_rows(self, report, rows, direction='purchase'):
        return sync_rows(report, rows, direction)

    def error_fields(self, result):
        return {(issue['row_no'], issue['field']) for issue in result['issues'] if issue['level'] == 'error'}

    def warning_fields(self, result):
        return {(issue['row_no'], issue['field']) for issue in result['issues'] if issue['level'] == 'warning'}


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


class PurchaseSyncTests(SeasonalBaseTest):
    """ذخیره/بارگذاری، شماره‌گذاری و جداسازی جهت خرید از فروش."""

    def test_sync_saves_purchase_rows_and_round_trips(self):
        report = self.make_report()
        saved = self.save_rows(report, [self.row(), self.row(invoice_no='P-13', name='شرکت بتا')])
        self.assertEqual(saved, 2)

        rows = list(report.transactions.order_by('line_no'))
        self.assertEqual([row.line_no for row in rows], [1, 2])
        self.assertTrue(all(row.direction == 'purchase' for row in rows))
        self.assertEqual(int(rows[0].duties), 20000)
        self.assertEqual(int(rows[0].total), 1120000)     # مبلغ + ارزش افزوده + عوارض

        # بارگذاری مجدد از API (سریالایزر گزارش با جهت خرید)
        payload = SeasonalReportSerializer(
            report, context={'company': self.company, 'direction': 'purchase'},
        ).data
        self.assertEqual(payload['direction'], 'purchase')
        self.assertEqual(payload['rows_count'], 2)
        self.assertEqual(len(payload['transactions']), 2)
        self.assertEqual(payload['control_totals']['total'], 2240000)

        # ویرایش ردیف اول و حذف ردیف دوم
        first = rows[0]
        self.save_rows(report, [self.row(id=first.id, amount=2500000, vat=250000)])
        rows = list(report.transactions.all())
        self.assertEqual(len(rows), 1)
        self.assertEqual(int(rows[0].amount), 2500000)

    def test_sync_keeps_sale_rows_untouched(self):
        report = self.make_report()
        # یک ردیف فروش (برای آینده) مستقیماً در دیتابیس
        SeasonalTransaction.objects.create(
            company=self.company, report=report, direction='sale', line_no=1,
            name='مشتری فروش', amount=Decimal('9'), vat=Decimal('0'), duties=Decimal('0'),
        )
        self.save_rows(report, [self.row()])
        self.assertEqual(report.transactions.filter(direction='sale').count(), 1)
        self.assertEqual(report.transactions.filter(direction='purchase').count(), 1)
        # شماره‌گذاری خرید از ۱ و مستقل از فروش
        purchase_row = report.transactions.get(direction='purchase')
        self.assertEqual(purchase_row.line_no, 1)

        # ذخیرهٔ خرید دوباره، نباید ردیف فروش را حذف کند
        self.save_rows(report, [self.row(), self.row(invoice_no='P-14')])
        self.assertEqual(report.transactions.filter(direction='sale').count(), 1)

    def test_sync_rejects_sale_direction_in_this_version(self):
        report = self.make_report()
        with self.assertRaises(ValueError):
            sync_rows(report, [self.row()], 'sale')

    def test_sync_blocked_after_submission(self):
        report = self.make_report()
        report.status = SeasonalReport.Status.SUBMITTED
        report.save(update_fields=['status'])
        with self.assertRaises(ValueError):
            self.save_rows(report, [self.row()])

    def test_sync_skips_empty_rows_and_cleans_digits(self):
        report = self.make_report()
        saved = self.save_rows(report, [
            self.row(national_id='۱۰۱۰۱۰۱۰۱۰۱', postal_code='۱۲۳۴۵۶۷۸۹۰'),
            {'name': '', 'invoice_no': '', 'amount': '', 'vat': '', 'duties': ''},
        ])
        self.assertEqual(saved, 1)
        row = report.transactions.first()
        self.assertEqual(row.national_id, '10101010101')
        self.assertEqual(row.postal_code, '1234567890')
        self.assertEqual(row.source, SeasonalTransaction.Source.MANUAL)
        # قواعد ثابت این نسخه: مشمول = بله و نوع کالا/خدمات = سایر
        self.assertTrue(row.is_included)
        self.assertEqual(row.goods_service_type, SeasonalTransaction.GoodsServiceType.OTHER)

    def test_sync_composes_natural_full_name_and_ignores_economic_code(self):
        report = self.make_report()
        self.save_rows(report, [self.natural_row(economic_code='99999999999')])
        row = report.transactions.first()
        self.assertEqual(row.first_name, 'علی')
        self.assertEqual(row.last_name, 'رضایی')
        self.assertEqual(row.name, 'علی رضایی')
        self.assertEqual(row.economic_code, '')      # فیلد منسوخ؛ نوشته نمی‌شود

    def test_country_defaults_to_iran_except_foreign(self):
        report = self.make_report()
        self.save_rows(report, [
            self.row(invoice_no='C-1', country=''),
            self.row(invoice_no='C-2', country='', person_type='foreign', name='Atlas GmbH',
                     national_id='', postal_code=''),
        ])
        rows = {row.invoice_no: row for row in report.transactions.all()}
        self.assertEqual(rows['C-1'].country, seasonal_rules.DEFAULT_COUNTRY)
        self.assertEqual(rows['C-2'].country, '')     # خارجی: کاربر باید کشور را وارد کند

    def test_aggregate_row_is_saved_with_only_amount(self):
        report = self.make_report()
        saved = self.save_rows(report, [{
            'person_type': 'aggregate', 'amount': 750000,
        }])
        self.assertEqual(saved, 1)
        row = report.transactions.first()
        self.assertEqual(row.person_type, 'aggregate')
        self.assertEqual(int(row.amount), 750000)
        self.assertTrue(row.is_included)
        self.assertEqual(row.goods_service_type, SeasonalTransaction.GoodsServiceType.OTHER)



class PurchaseValidationTests(SeasonalBaseTest):
    """قواعد پویا بر اساس نوع فروشنده + مبالغ/تاریخ/تکرار."""

    def validate(self, rows):
        report = self.make_report()
        self.save_rows(report, rows)
        return validate_report(report, 'purchase')

    def test_legal_seller_with_all_required_fields(self):
        result = self.validate([self.row()])
        self.assertEqual(result['issues'], [])
        self.assertEqual(result['summary']['errors'], 0)
        self.assertEqual(result['summary']['warnings'], 0)

    def test_legal_seller_missing_or_invalid_national_id(self):
        result = self.validate([self.row(national_id='')])
        self.assertIn((1, 'national_id'), self.error_fields(result))

        result = self.validate([self.row(national_id='12345')])
        self.assertIn((1, 'national_id'), self.error_fields(result))

    def test_legal_seller_requires_company_name(self):
        result = self.validate([self.row(name='')])
        self.assertIn((1, 'name'), self.error_fields(result))

    def test_legal_seller_does_not_need_economic_code(self):
        # کد اقتصادی منسوخ است: نبودش نباید خطا/هشدار بسازد
        result = self.validate([self.row(economic_code='')])
        fields = {field for _no, field in self.error_fields(result)}
        self.assertNotIn('economic_code', fields)
        self.assertEqual(result['summary']['errors'], 0, result['issues'])

    def test_natural_seller_requires_separate_first_and_last_name(self):
        result = self.validate([self.natural_row()])
        self.assertEqual(result['summary']['errors'], 0, result['issues'])

        result = self.validate([self.natural_row(first_name='')])
        self.assertIn((1, 'first_name'), self.error_fields(result))

        result = self.validate([self.natural_row(last_name='')])
        self.assertIn((1, 'last_name'), self.error_fields(result))

    def test_natural_seller_invalid_national_id(self):
        result = self.validate([self.natural_row(national_id='12345')])
        self.assertIn((1, 'national_id'), self.error_fields(result))

    def test_foreign_seller_supported_with_country(self):
        result = self.validate([self.row(
            person_type='foreign', name='Atlas GmbH', national_id='', postal_code='',
            country='آلمان', invoice_no='F-1',
        )])
        self.assertEqual(result['summary']['errors'], 0, result['issues'])
        # شناسه‌های ایرانی برای خارجی نباید پر شود (هشدار)
        self.assertEqual(result['summary']['warnings'], 0, result['issues'])

    def test_foreign_seller_with_iranian_ids_warns(self):
        result = self.validate([self.row(
            person_type='foreign', name='Atlas GmbH', country='آلمان', national_id='10101010101',
        )])
        self.assertIn((1, 'national_id'), self.warning_fields(result))

    def test_foreign_seller_requires_country(self):
        result = self.validate([self.row(
            person_type='foreign', name='Atlas GmbH', national_id='', postal_code='', country='',
        )])
        self.assertIn((1, 'country'), self.error_fields(result))

    def test_optional_field_missing_is_not_blocking(self):
        result = self.validate([self.row(province='', city='', address='')])
        self.assertEqual(result['summary']['errors'], 0, result['issues'])
        self.assertEqual(self.warning_fields(result), set())

    def test_recommended_fields_missing_are_warnings_only(self):
        result = self.validate([self.row(
            postal_code='', invoice_no='', invoice_date=None, goods_service_desc='',
            moadian_status='pending',
        )])
        warnings = {field for _no, field in self.warning_fields(result)}
        self.assertEqual(result['summary']['errors'], 0, result['issues'])
        for field in ('postal_code', 'invoice_no', 'invoice_date', 'goods_service_desc', 'moadian_status'):
            self.assertIn(field, warnings)

    def test_invalid_amounts(self):
        result = self.validate([self.row(invoice_no='A1', amount=1000, vat=5000, duties=0)])
        self.assertIn((1, 'vat'), self.error_fields(result))

        result = self.validate([self.row(invoice_no='A2', amount=1000, vat=0, duties=5000)])
        self.assertIn((1, 'duties'), self.error_fields(result))

        result = self.validate([self.row(invoice_no='A3', amount=0, vat=0, duties=0)])
        self.assertIn((1, 'amount'), self.error_fields(result))

    def test_invoice_date_outside_quarter(self):
        result = self.validate([self.row(invoice_no='A4', invoice_date='2025-01-05')])
        self.assertIn((1, 'invoice_date'), self.error_fields(result))

        result = self.validate([self.row(invoice_no='A5', invoice_date='2026-09-01')])
        self.assertIn((1, 'invoice_date'), self.error_fields(result))

    def test_duplicate_invoice_number(self):
        result = self.validate([
            self.row(invoice_no='D-1'),
            self.row(id=None, invoice_no='D-1'),
        ])
        self.assertIn((2, 'invoice_no'), self.error_fields(result))

    def test_aggregate_row_needs_only_amount(self):
        result = self.validate([{'person_type': 'aggregate', 'amount': 750000}])
        self.assertEqual(result['issues'], [], result['issues'])
        self.assertEqual(result['summary']['errors'], 0)
        self.assertEqual(result['summary']['warnings'], 0)

    def test_aggregate_row_without_amount_is_error(self):
        result = self.validate([{'person_type': 'aggregate', 'amount': 0}])
        self.assertIn((1, 'amount'), self.error_fields(result))

    def test_country_required_only_for_foreign_seller(self):
        result = self.validate([self.row(country='', invoice_no='K-1')])
        self.assertNotIn((1, 'country'), self.error_fields(result))

        result = self.validate([self.row(
            person_type='foreign', name='Atlas GmbH', national_id='', postal_code='',
            country='', invoice_no='K-2',
        )])
        self.assertIn((1, 'country'), self.error_fields(result))

    def test_validation_issues_carry_rule_source(self):
        result = self.validate([self.row(national_id='123')])
        issue = next(item for item in result['issues'] if item['field'] == 'national_id')
        self.assertTrue(issue['code'])
        self.assertEqual(issue['source'], seasonal_rules.SOURCE_LEGAL)
        self.assertEqual(result['ruleset']['status'], 'unverified')



class PurchaseExportTests(SeasonalBaseTest):
    """جمع‌های کنترل، اکسل خرید و بستهٔ پیش‌نویس TTMS."""

    def setUp(self):
        super().setUp()
        self.report = self.make_report()
        self.save_rows(self.report, [
            self.row(invoice_no='P-1', amount=1000000, vat=100000, duties=20000),
            self.natural_row(invoice_no='P-2', amount=500000, vat=50000, duties=0, kind=2),
            self.row(invoice_no='P-3', name='Atlas GmbH', person_type='foreign',
                     national_id='', postal_code='', country='ترکیه',
                     amount=250000, vat=0, duties=0, moadian_status='pending'),
        ])
        # ردیف فروش (نباید در هیچ خروجی/جمعی بیاید)
        SeasonalTransaction.objects.create(
            company=self.company, report=self.report, direction='sale', line_no=1,
            name='مشتری فروش', amount=Decimal('9000000'), vat=Decimal('0'), duties=Decimal('0'),
        )

    def test_control_totals_purchase_only(self):
        totals = control_totals(self.report, 'purchase')
        self.assertEqual(totals['count'], 3)
        self.assertEqual(totals['amount'], 1750000)
        self.assertEqual(totals['vat'], 150000)
        self.assertEqual(totals['duties'], 20000)
        self.assertEqual(totals['total'], 1920000)
        self.assertEqual(totals['registered'], 2)
        self.assertEqual(totals['pending'], 1)
        kinds = {item['kind']: item for item in totals['by_kind']}
        self.assertEqual(kinds[1]['count'], 2)
        self.assertEqual(kinds[2]['count'], 1)
        person_types = {item['person_type']: item for item in totals['by_person_type']}
        self.assertEqual(person_types['legal']['count'], 2)
        self.assertEqual(person_types['natural']['count'], 1)

    def test_workbook_purchase_layout_and_totals(self):
        workbook = build_workbook(self.report, 'purchase')
        self.assertEqual(workbook.sheetnames, ['داده', 'خلاصه', 'خطاها'])

        data = workbook['داده']
        headers = [data.cell(row=3, column=index).value for index in range(1, len(PURCHASE_COLUMNS) + 1)]
        self.assertEqual(headers, PURCHASE_COLUMNS)
        self.assertEqual(data.freeze_panes, 'A4')
        self.assertTrue(data.auto_filter.ref)

        self.assertEqual(data.cell(row=4, column=1).value, 1)
        self.assertEqual(data.cell(row=4, column=2).value, 'شخص حقوقی')
        self.assertEqual(data.cell(row=4, column=3).value, 'شرکت آلفا تجارت')
        self.assertEqual(data.cell(row=4, column=6).value, '10101010101')
        self.assertEqual(data.cell(row=4, column=7).value, 'بله')          # مشمول
        self.assertEqual(data.cell(row=4, column=14).value, 'سایر')        # نوع کالا/خدمات
        self.assertEqual(data.cell(row=4, column=15).value, 1000000)
        self.assertEqual(data.cell(row=4, column=16).value, 100000)
        self.assertEqual(data.cell(row=4, column=17).value, 20000)
        self.assertEqual(data.cell(row=4, column=18).value, 1120000)
        self.assertTrue(data.cell(row=4, column=20).value.startswith('1405/'))
        # ردیف حقیقی: نام و نام خانوادگی جدا
        self.assertEqual(data.cell(row=5, column=4).value, 'علی')
        self.assertEqual(data.cell(row=5, column=5).value, 'رضایی')
        names = [data.cell(row=row, column=3).value for row in range(4, 7)]
        self.assertNotIn('مشتری فروش', names)
        self.assertEqual(data.max_row, 4 + 3)

        total_row = 4 + 3
        self.assertEqual(data.cell(row=total_row, column=15).value, 1750000)
        self.assertEqual(data.cell(row=total_row, column=16).value, 150000)
        self.assertEqual(data.cell(row=total_row, column=17).value, 20000)
        self.assertEqual(data.cell(row=total_row, column=18).value, 1920000)

        summary = workbook['خلاصه']
        summary_values = [cell.value for cell in summary['B']]
        self.assertIn(1920000, summary_values)
        self.assertIn(seasonal_rules.RULESET_VERSION, summary_values)

        issues = workbook['خطاها']
        self.assertEqual(issues.cell(row=1, column=5).value, 'پیام')
        self.assertEqual(issues.cell(row=1, column=7).value, 'منبع قاعده')

        buffer = io.BytesIO()
        workbook.save(buffer)
        self.assertGreater(buffer.tell(), 2000)



    def test_ttms_draft_bundle_is_marked_unverified(self):
        content, filename, warnings = build_ttms_draft(self.report, 'purchase')
        self.assertTrue(filename.startswith('ttms-draft-purchase-'))
        self.assertTrue(any('آزمایش‌نشده' in item for item in warnings))

        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            self.assertEqual(set(archive.namelist()), {'purchase-rows.csv', 'README.txt'})
            readme = archive.read('README.txt').decode('utf-8')
            csv_text = archive.read('purchase-rows.csv').decode('utf-8-sig')

        self.assertIn('UNVERIFIED', readme)
        self.assertIn('نامشخص (نیازمند قالب رسمی)', readme)
        self.assertIn(seasonal_rules.RULESET_VERSION, readme)
        self.assertIn('P-1', csv_text)
        self.assertNotIn('مشتری فروش', csv_text)
        self.assertEqual(len(csv_text.strip().splitlines()), 4)   # سرستون + ۳ ردیف خرید

    def test_reference_payload_matches_ruleset(self):
        reference = seasonal_rules.build_reference()
        self.assertEqual(reference['direction'], 'purchase')
        self.assertEqual(reference['ruleset_status'], 'unverified')
        self.assertNotIn('economic_code', reference['required']['legal'])
        self.assertIn('national_id', reference['required']['legal'])
        self.assertIn('first_name', reference['required']['natural'])
        self.assertIn('last_name', reference['required']['natural'])
        self.assertIn('country', reference['required']['foreign'])
        self.assertTrue(reference['rules'])


class LegacyCompatibilityTests(SeasonalBaseTest):
    """مهاجرت ۰۰۲۶: داده‌های قبلی باید با پیش‌فرض «خرید» و عوارض صفر سالم بمانند."""

    def test_existing_rows_default_to_purchase_with_zero_duties(self):
        report = self.make_report()
        legacy = SeasonalTransaction.objects.create(
            company=self.company, report=report, line_no=1, name='ردیف قدیمی',
            amount=Decimal('1000'), vat=Decimal('100'), invoice_no='OLD-1',
        )
        legacy.refresh_from_db()
        self.assertEqual(legacy.direction, SeasonalTransaction.Direction.PURCHASE)
        self.assertEqual(legacy.duties, 0)
        self.assertEqual(legacy.country, '')
        self.assertEqual(int(legacy.total), 1100)
        totals = control_totals(report, 'purchase')
        self.assertEqual(totals['count'], 1)
        self.assertEqual(totals['total'], 1100.0)

