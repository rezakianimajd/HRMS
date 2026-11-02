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
