from django.test import SimpleTestCase

from settings_app.models import (
    CompanyBankAccount, CompanyBoardMember, CompanyProfile, CompanyShareholder, Signatory,
)
from settings_app.serializers import (
    CompanyBankAccountSerializer, CompanyBoardMemberSerializer, CompanyProfileSerializer,
    CompanyShareholderSerializer, SignatorySerializer,
)


class CompanyProfileModelTests(SimpleTestCase):
    def test_profile_has_legal_and_contact_fields(self):
        for name in (
            'brand_name', 'legal_form', 'registration_office', 'registration_date',
            'tax_office', 'insurance_code', 'duns_number', 'stock_symbol', 'fax',
            'secondary_phone', 'mobile', 'address_line2', 'country', 'province',
            'city', 'coordinates', 'seal_image', 'fiscal_year_end', 'registered_capital',
            'paid_capital', 'total_shares', 'share_nominal_value', 'legal_auditor',
            'financial_advisor',
        ):
            self.assertIsNotNone(CompanyProfile._meta.get_field(name), name)

    def test_governance_models_have_required_fields(self):
        self.assertIsNotNone(CompanyShareholder._meta.get_field('share_percent'))
        self.assertIsNotNone(CompanyShareholder._meta.get_field('shares_count'))
        self.assertIsNotNone(CompanyBoardMember._meta.get_field('position'))
        self.assertIsNotNone(CompanyBoardMember._meta.get_field('has_signature_authority'))
        self.assertIsNotNone(CompanyBankAccount._meta.get_field('iban'))
        self.assertIsNotNone(CompanyBankAccount._meta.get_field('is_official'))

    def test_signatory_supports_multiple_authorities(self):
        for name in (
            'mobile', 'email', 'signature_order', 'is_default',
            'can_sign_contracts', 'can_sign_financial', 'note',
        ):
            self.assertIsNotNone(Signatory._meta.get_field(name), name)


class CompanyProfileSerializerTests(SimpleTestCase):
    def test_profile_serializer_exposes_governance_collections(self):
        fields = CompanyProfileSerializer().fields
        for name in (
            'shareholders', 'board_members', 'bank_accounts', 'signatories',
            'legal_form_display', 'seal_image_url', 'registered_capital',
        ):
            self.assertIn(name, fields)

    def test_related_serializers_include_business_fields(self):
        self.assertIn('share_percent', CompanyShareholderSerializer().fields)
        self.assertIn('has_signature_authority', CompanyBoardMemberSerializer().fields)
        self.assertIn('iban', CompanyBankAccountSerializer().fields)
        self.assertIn('can_sign_contracts', SignatorySerializer().fields)

    def test_iban_validation_accepts_iranian_sheba(self):
        serializer = CompanyBankAccountSerializer()
        self.assertEqual(
            serializer.validate_iban('ir 12 3456 7890 1234 5678 9012 34'),
            'IR123456789012345678901234',
        )
