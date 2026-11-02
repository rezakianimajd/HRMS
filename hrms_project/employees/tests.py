"""تست‌های واحد ماژول منابع انسانی (بدون نیاز به دیتابیس)."""
from django.test import SimpleTestCase


class SupplementaryDependentSerializerTests(SimpleTestCase):
    """کد ملی و تاریخ تولد فرد تحت تکفل بیمه تکمیلی: اختیاری و اعتبارسنجی‌شده."""

    def _serializer(self):
        from employees.serializers import SupplementaryInsuranceDependentSerializer

        return SupplementaryInsuranceDependentSerializer()

    def test_fields_include_optional_identity_documents(self):
        serializer = self._serializer()
        for field in ('national_id', 'birth_date', 'relation', 'attachment_url', 'has_attachment'):
            self.assertIn(field, serializer.fields)
        self.assertTrue(serializer.fields['national_id'].allow_null)
        self.assertFalse(serializer.fields['national_id'].required)
        self.assertTrue(serializer.fields['birth_date'].allow_null)
        self.assertFalse(serializer.fields['birth_date'].required)

    def test_model_allows_empty_identity_values(self):
        from employees.models import SupplementaryInsuranceDependent

        national_field = SupplementaryInsuranceDependent._meta.get_field('national_id')
        birth_field = SupplementaryInsuranceDependent._meta.get_field('birth_date')
        self.assertTrue(national_field.null)
        self.assertTrue(national_field.blank)
        self.assertEqual(national_field.max_length, 10)
        self.assertTrue(birth_field.null)
        self.assertTrue(birth_field.blank)

    def test_national_id_is_normalized_to_english_digits(self):
        serializer = self._serializer()
        self.assertEqual(serializer.validate_national_id('۱۲۳۴۵۶۷۸۹۰'), '1234567890')
        self.assertEqual(serializer.validate_national_id(' 0123456789 '), '0123456789')

    def test_empty_national_id_is_allowed(self):
        serializer = self._serializer()
        self.assertEqual(serializer.validate_national_id(''), '')
        self.assertEqual(serializer.validate_national_id(None), '')

    def test_invalid_national_id_is_rejected(self):
        from rest_framework.serializers import ValidationError

        serializer = self._serializer()
        for invalid in ('123', 'abcd123456', '12345678901'):
            with self.assertRaises(ValidationError):
                serializer.validate_national_id(invalid)


class DependentsExportTests(SimpleTestCase):
    """خروجی اکسل گزارش افراد تحت تکفل: فیلترها، هدر جدول و ساخت کارپوشه."""

    @staticmethod
    def _row(**overrides):
        row = {
            'employee_name': 'مریم رضایی', 'employee_code': '1002',
            'department': 'مالی', 'job_title': 'کارشناس',
            'insurance_name': 'درمان تکمیلی', 'insurance_type': 'درمان', 'plan': 'طرح خانواده',
            'period': '1405/01/01 تا 1405/12/29', 'status': 'active', 'status_label': 'فعال',
            'dependent_name': 'نیما رضایی', 'relation': 'child', 'relation_label': 'فرزند',
            'national_id': '0012345678', 'birth_date': '1394/02/20', 'age': 10,
            'attachment': True, 'attachment_name': 'dependent.pdf', 'insurance_id': 1,
        }
        row.update(overrides)
        return row

    def test_filters_follow_screen_behaviour(self):
        from employees.dependents_export import apply_dependent_filters

        rows = [
            self._row(),
            self._row(dependent_name='سارا رضایی', relation='spouse', relation_label='همسر', attachment=False),
            self._row(employee_name='علی احمدی', dependent_name='حسین احمدی',
                      relation='father', relation_label='پدر', national_id='', department='فنی'),
        ]

        result, labels = apply_dependent_filters(rows, {'relation': 'child', 'attachment': 'with'})
        self.assertEqual([r['dependent_name'] for r in result], ['نیما رضایی'])
        self.assertIn('نسبت: فرزند', labels)
        self.assertIn('دارای پیوست', labels)

        result, labels = apply_dependent_filters(rows, {'national_id': 'missing'})
        self.assertEqual([r['dependent_name'] for r in result], ['حسین احمدی'])
        self.assertIn('بدون کد ملی', labels)

        result, _labels = apply_dependent_filters(rows, {'q': 'احمدی'})
        self.assertEqual([r['dependent_name'] for r in result], ['حسین احمدی'])

        result, labels = apply_dependent_filters(rows, {'department': 'فنی', 'status': 'active'})
        self.assertEqual(len(result), 1)
        self.assertIn('واحد: فنی', labels)

        result, labels = apply_dependent_filters(rows, {})
        self.assertEqual(len(result), 3)
        self.assertEqual(labels, [])

    def test_workbook_has_title_filter_row_header_and_data(self):
        from employees.dependents_export import HEADERS, build_dependents_workbook

        workbook = build_dependents_workbook([self._row(), self._row(dependent_name='سارا رضایی')],
                                             ['نسبت: فرزند'])
        sheet = workbook.active
        self.assertEqual(sheet.title, 'افراد تحت تکفل')
        self.assertTrue(sheet.sheet_view.rightToLeft)
        self.assertTrue(str(sheet['A1'].value).startswith('گزارش افراد تحت تکفل'))
        self.assertIn('نسبت: فرزند', sheet['A2'].value)
        self.assertIn('تعداد ردیف: 2', sheet['A2'].value)

        header_values = [sheet.cell(row=3, column=index).value for index in range(1, len(HEADERS) + 1)]
        self.assertEqual(header_values, HEADERS)

        self.assertEqual(sheet['A4'].value, 1)
        self.assertEqual(sheet['J4'].value, 'نیما رضایی')
        self.assertEqual(sheet['L4'].value, '0012345678')
        self.assertEqual(sheet['L4'].number_format, '@')
        self.assertEqual(sheet.freeze_panes, 'C4')
        self.assertTrue(str(sheet.auto_filter.ref).startswith('A3:'))

    def test_status_and_age_helpers(self):
        from datetime import date, timedelta

        from employees.dependents_export import age_of, status_of

        today = date(2026, 5, 20)
        self.assertEqual(status_of(today + timedelta(days=5), None, today), 'upcoming')
        self.assertEqual(status_of(today - timedelta(days=400), today - timedelta(days=1), today), 'expired')
        self.assertEqual(status_of(today - timedelta(days=10), today + timedelta(days=10), today), 'expiring')
        self.assertEqual(status_of(today - timedelta(days=10), today + timedelta(days=200), today), 'active')
        self.assertEqual(age_of(date(2010, 5, 20), today), 16)
        self.assertEqual(age_of(date(2010, 5, 21), today), 15)
        self.assertIsNone(age_of(None, today))
