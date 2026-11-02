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


class FamilyMemberTests(SimpleTestCase):
    """بخش «خانواده» پروندهٔ پرسنلی و همگام‌سازی با بیمهٔ تکمیلی."""

    def test_model_fields_and_constraints(self):
        from employees.models import EmployeeFamilyMember

        fields = {field.name for field in EmployeeFamilyMember._meta.get_fields()}
        for name in ('employee', 'first_name', 'last_name', 'relation', 'national_id',
                     'birth_date', 'phone', 'is_dependent', 'source', 'source_key', 'notes'):
            self.assertIn(name, fields)

        constraint_names = {constraint.name for constraint in EmployeeFamilyMember._meta.constraints}
        self.assertIn('uniq_employee_family_source_key', constraint_names)

    def test_relation_choices_cover_insurance_relations(self):
        from employees.family_sync import RELATION_MAP
        from employees.models import EmployeeFamilyMember, SupplementaryInsuranceDependent

        insurance_values = {choice[0] for choice in SupplementaryInsuranceDependent._meta.get_field('relation').choices}
        family_values = {choice[0] for choice in EmployeeFamilyMember._meta.get_field('relation').choices}
        for value in insurance_values:
            self.assertIn(value, RELATION_MAP)
            self.assertIn(RELATION_MAP[value], family_values)

    def test_source_key_is_stable_per_dependent(self):
        from employees.family_sync import dependent_source_key

        class FakeDependent:
            pk = 12
            insurance_id = 5

        self.assertEqual(dependent_source_key(FakeDependent()), 'supp-ins-5-12')

    def test_full_name_and_age_properties(self):
        from datetime import date

        from employees.models import EmployeeFamilyMember

        member = EmployeeFamilyMember(first_name='سارا', last_name='احمدی')
        self.assertEqual(member.full_name, 'سارا احمدی')
        self.assertIsNone(member.age)

        today = date.today()
        member.birth_date = date(today.year - 10, 1, 1)
        expected = today.year - member.birth_date.year - (1 if (today.month, today.day) < (1, 1) else 0)
        self.assertEqual(member.age, expected)

    def test_serializer_exposes_display_fields_and_validates(self):
        from rest_framework.serializers import ValidationError

        from employees.serializers import EmployeeFamilyMemberSerializer

        serializer = EmployeeFamilyMemberSerializer()
        for field in ('relation', 'relation_display', 'source', 'source_display',
                      'is_dependent', 'age', 'full_name', 'phone'):
            self.assertIn(field, serializer.fields)

        self.assertEqual(serializer.validate_national_id('۱۲۳۴۵۶۷۸۹۰'), '1234567890')
        self.assertEqual(serializer.validate_national_id(''), '')
        with self.assertRaises(ValidationError):
            serializer.validate_national_id('12345')
        with self.assertRaises(ValidationError):
            serializer.validate_first_name('   ')
        self.assertEqual(serializer.validate_first_name(' نیما '), 'نیما')

    def test_viewset_routes_family_members_by_employee(self):
        from employees.views import EmployeeFamilyMemberViewSet

        self.assertEqual(EmployeeFamilyMemberViewSet.queryset.model.__name__, 'EmployeeFamilyMember')
        self.assertTrue(hasattr(EmployeeFamilyMemberViewSet, 'sync_from_insurance'))
        self.assertTrue(hasattr(EmployeeFamilyMemberViewSet, 'export_excel'))


class FamilyReportExportTests(SimpleTestCase):
    """گزارش «خانوادهٔ پرسنل»: منبع داده پروندهٔ پرسنلی و فیلترهای صفحه."""

    @staticmethod
    def _row(**overrides):
        row = {
            'employee_name': 'بیژن جعفری', 'employee_code': '1001',
            'department': 'فنی', 'job_title': 'کارشناس',
            'member_name': 'امین اله جعفری', 'relation': 'father', 'relation_label': 'پدر',
            'national_id': '0012345678', 'birth_date': '1345/02/12', 'age': 60,
            'is_dependent': True, 'dependent_label': 'بله',
            'source': 'supplementary_insurance', 'source_label': 'بیمه تکمیلی',
            'phone': '09120000000', 'notes': '',
            'insurance_name': 'درمان تکمیلی', 'status': 'active', 'status_label': 'فعال',
            'attachment': False, 'attachment_name': '',
        }
        row.update(overrides)
        return row

    def test_filters_apply_the_screen_options(self):
        from employees.family_export import apply_family_filters

        rows = [
            self._row(),
            self._row(member_name='سارا احمدی', relation='spouse', relation_label='همسر',
                      source='manual', source_label='ثبت دستی', is_dependent=False,
                      dependent_label='خیر', attachment=True, attachment_name='id.pdf'),
            self._row(member_name='نیما رضایی', relation='child', relation_label='فرزند',
                      national_id='', department='مالی', status='expired', status_label='منقضی'),
        ]

        result, labels = apply_family_filters(rows, {'relation': 'child'})
        self.assertEqual([row['member_name'] for row in result], ['نیما رضایی'])
        self.assertIn('نسبت: فرزند', labels)

        result, labels = apply_family_filters(rows, {'source': 'manual', 'dependent': 'no'})
        self.assertEqual([row['member_name'] for row in result], ['سارا احمدی'])
        self.assertIn('منبع: ثبت دستی', labels)
        self.assertIn('بدون تکفل', labels)

        result, labels = apply_family_filters(rows, {'national_id': 'missing'})
        self.assertEqual([row['member_name'] for row in result], ['نیما رضایی'])
        self.assertIn('بدون کد ملی', labels)

        result, _labels = apply_family_filters(rows, {'q': 'مالی'})
        self.assertEqual([row['member_name'] for row in result], ['نیما رضایی'])

        result, labels = apply_family_filters(rows, {'attachment': 'with', 'status': 'active'})
        self.assertEqual([row['member_name'] for row in result], ['سارا احمدی'])
        self.assertIn('دارای پیوست', labels)
        self.assertIn('وضعیت بیمه: فعال', labels)

        result, labels = apply_family_filters(rows, {})
        self.assertEqual(len(result), 3)
        self.assertEqual(labels, [])



    def test_workbook_has_family_title_filters_and_headers(self):
        from employees.family_export import HEADERS, build_family_workbook

        workbook = build_family_workbook(
            [self._row(), self._row(member_name='سارا احمدی')], ['نسبت: پدر'],
        )
        sheet = workbook.active
        self.assertEqual(sheet.title, 'خانواده پرسنل')
        self.assertTrue(sheet.sheet_view.rightToLeft)
        self.assertIn('گزارش خانوادهٔ پرسنل', sheet['A1'].value)
        self.assertIn('نسبت: پدر', sheet['A2'].value)
        self.assertIn('تعداد ردیف: 2', sheet['A2'].value)

        header_values = [sheet.cell(row=3, column=index).value for index in range(1, len(HEADERS) + 1)]
        self.assertEqual(header_values, HEADERS)
        self.assertIn('بیمهٔ تکمیلی', HEADERS)

        self.assertEqual(sheet['A4'].value, 1)
        self.assertEqual(sheet['F4'].value, 'امین اله جعفری')
        self.assertEqual(sheet['H4'].value, '0012345678')
        self.assertEqual(sheet['H4'].number_format, '@')
        self.assertEqual(sheet.freeze_panes, 'C4')

    def test_preferred_insurance_prefers_active_coverage(self):
        from datetime import date, timedelta

        from employees.family_export import _preferred_insurance, collect_family_rows

        today = date.today()

        class FakeInsurance:
            def __init__(self, pk, start, end, name='بیمه'):
                self.id = pk
                self.start_date = start
                self.end_date = end
                self.insurance_name = name
                self.insurance_type = 'درمان'
                self.plan = 'خانواده'

        class FakeDependent:
            def __init__(self, insurance, attachment=None):
                self.insurance = insurance
                self.attachment = attachment

        class FakeEmployee:
            pk = 7
            full_name = 'بیژن جعفری'
            employee_id = '1001'
            photo_url = ''
            gender = 'male'

            class department:
                name = 'فنی'

            class job_title:
                name = 'کارشناس'

        class FakeManager:
            def __init__(self, items):
                self._items = items

            def all(self):
                return self._items

        class FakeMember:
            pk = 3
            employee = FakeEmployee()
            first_name = 'امین اله'
            last_name = 'جعفری'
            full_name = 'امین اله جعفری'
            relation = 'father'
            national_id = '0012345678'
            birth_date = date(1966, 5, 2)
            phone = ''
            notes = ''
            is_dependent = True
            source = 'supplementary_insurance'

            def __init__(self, dependents):
                self.insurance_dependents = FakeManager(dependents)

        expired = FakeDependent(FakeInsurance(1, today - timedelta(days=400), today - timedelta(days=10), 'قدیمی'))
        active = FakeDependent(FakeInsurance(2, today - timedelta(days=30), today + timedelta(days=200)))
        member = FakeMember([expired, active])

        insurance, dependent = _preferred_insurance(member)
        self.assertEqual(insurance.id, 2)
        self.assertIs(dependent, active)

        row = collect_family_rows([member])[0]
        self.assertEqual(row['member_name'], 'امین اله جعفری')
        self.assertEqual(row['relation_label'], 'پدر')
        self.assertEqual(row['status'], 'active')
        self.assertEqual(row['status_label'], 'فعال')
        self.assertEqual(row['insurance_name'], 'بیمه')
        self.assertEqual(row['department'], 'فنی')
        self.assertEqual(row['source_label'], 'بیمه تکمیلی')

