"""Serializers for the Settings module."""
from rest_framework import serializers
from settings_app.models import (
    SystemSetting, CompanyProfile, BaleContact, Signatory,
    Addition, Deduction, Currency, StorageProfile, ArchiveFolder,
    CompanyShareholder, CompanyBoardMember, CompanyBankAccount,
)


class SystemSettingSerializer(serializers.ModelSerializer):
    data_type_display = serializers.CharField(source='get_data_type_display', read_only=True)

    class Meta:
        model = SystemSetting
        fields = ['id', 'key', 'value', 'description', 'data_type', 'data_type_display', 'is_editable', 'is_active']
        read_only_fields = ['id', 'key']


class BaleContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaleContact
        fields = ['id', 'name', 'chat_id', 'category', 'tag', 'country_code', 'note', 'is_active', 'created_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class SignatorySerializer(serializers.ModelSerializer):
    signature_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Signatory
        fields = [
            'id', 'full_name', 'position', 'national_id', 'mobile', 'email',
            'signature_image', 'signature_image_url', 'signature_order',
            'is_default', 'can_sign_contracts', 'can_sign_financial',
            'note', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_signature_image_url(self, obj):
        if obj.signature_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.signature_image.url)
            return obj.signature_image.url
        return None


class CompanyShareholderSerializer(serializers.ModelSerializer):
    shareholder_type_display = serializers.CharField(source='get_shareholder_type_display', read_only=True)

    class Meta:
        model = CompanyShareholder
        fields = [
            'id', 'profile', 'shareholder_type', 'shareholder_type_display', 'name',
            'national_id', 'registration_number', 'economic_code',
            'representative_name', 'representative_national_id',
            'share_percent', 'shares_count', 'investment_amount',
            'start_date', 'end_date', 'sort_order', 'note',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'profile', 'created_at', 'updated_at']


class CompanyBoardMemberSerializer(serializers.ModelSerializer):
    membership_type_display = serializers.CharField(source='get_membership_type_display', read_only=True)

    class Meta:
        model = CompanyBoardMember
        fields = [
            'id', 'profile', 'full_name', 'position', 'membership_type',
            'membership_type_display', 'national_id', 'appointment_date', 'end_date',
            'share_percent', 'has_signature_authority', 'sort_order', 'note',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'profile', 'created_at', 'updated_at']


class CompanyBankAccountSerializer(serializers.ModelSerializer):
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    currency_name = serializers.CharField(source='currency.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)

    class Meta:
        model = CompanyBankAccount
        fields = [
            'id', 'profile', 'title', 'bank_name', 'branch_name', 'branch_code',
            'account_number', 'iban', 'card_number', 'account_type', 'account_type_display',
            'currency', 'currency_name', 'currency_code', 'swift_code', 'holder_name',
            'opening_date', 'is_official', 'sort_order', 'note',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'profile', 'created_at', 'updated_at']

    def validate_iban(self, value):
        value = (value or '').replace(' ', '').upper()
        if value and (not value.startswith('IR') or len(value) != 26):
            raise serializers.ValidationError('شماره شبا باید با IR شروع شود و ۲۶ کاراکتر باشد.')
        return value


class AdditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Addition
        fields = ['id', 'code', 'description', 'default_percent', 'is_active', 'created_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class DeductionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deduction
        fields = ['id', 'code', 'description', 'default_percent', 'is_active', 'created_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['id', 'code', 'name', 'symbol', 'country_code', 'exchange_rate', 'is_active', 'created_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class CompanyProfileSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    logo_url = serializers.SerializerMethodField()
    seal_image_url = serializers.SerializerMethodField()
    legal_form_display = serializers.CharField(source='get_legal_form_display', read_only=True)
    shareholders = CompanyShareholderSerializer(many=True, read_only=True)
    board_members = CompanyBoardMemberSerializer(many=True, read_only=True)
    bank_accounts = CompanyBankAccountSerializer(many=True, read_only=True)
    signatories = serializers.SerializerMethodField()

    class Meta:
        model = CompanyProfile
        fields = [
            'id', 'company', 'company_name',
            'legal_name', 'brand_name', 'legal_form', 'legal_form_display',
            'registration_number', 'registration_office', 'registration_date',
            'national_id', 'economic_code', 'tax_id', 'tax_office',
            'insurance_code', 'duns_number', 'stock_symbol',
            'phone', 'secondary_phone', 'fax', 'mobile', 'email',
            'address', 'address_line2', 'postal_code',
            'country', 'province', 'city', 'coordinates',
            'website', 'logo', 'logo_url', 'seal_image', 'seal_image_url',
            'established_date', 'fiscal_year_end',
            'registered_capital', 'paid_capital', 'total_shares', 'share_nominal_value',
            'legal_auditor', 'financial_advisor', 'description',
            'employer_rep_name', 'employer_rep_title', 'employer_rep_national_id',
            'notify_email_enabled', 'notify_bale_enabled',
            'bale_token', 'bale_chat_id',
            'base_storage_path', 'storage_path_employees',
            'storage_path_correspondences', 'storage_path_documents',
            'shareholders', 'board_members', 'bank_accounts', 'signatories',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo and hasattr(obj.logo, 'url'):
            return obj.logo.url
        return None

    def get_seal_image_url(self, obj):
        if obj.seal_image and hasattr(obj.seal_image, 'url'):
            return obj.seal_image.url
        return None

    def get_signatories(self, obj):
        queryset = Signatory.objects.filter(company=obj.company, is_active=True).order_by(
            'signature_order', 'full_name',
        )
        return SignatorySerializer(queryset, many=True, context=self.context).data


class StorageProfileSerializer(serializers.ModelSerializer):
    """پروفایل بایگانی یک ماژول + آمار محاسبه‌شده."""
    folder_count = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()
    total_size = serializers.SerializerMethodField()
    path_preview = serializers.SerializerMethodField()

    class Meta:
        model = StorageProfile
        fields = [
            'id', 'module_key', 'module_name', 'root_folder',
            'entity_folder_pattern', 'subfolders', 'allowed_extensions',
            'max_file_size_mb', 'include_company', 'color', 'icon',
            'sort_order', 'description', 'is_active',
            'folder_count', 'file_count', 'total_size', 'path_preview',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def _stats(self, obj):
        cache = self.context.setdefault('_stats_cache', {})
        if obj.id not in cache:
            from core.engines.archive_storage_engine import archive_engine
            cache[obj.id] = archive_engine.module_stats(obj.company_id, obj)
        return cache[obj.id]

    def get_folder_count(self, obj):
        try:
            return self._stats(obj)['folder_count']
        except Exception:
            return 0

    def get_file_count(self, obj):
        try:
            return self._stats(obj)['file_count']
        except Exception:
            return 0

    def get_total_size(self, obj):
        try:
            return self._stats(obj)['total_size']
        except Exception:
            return 0

    def get_path_preview(self, obj):
        """
        مسیر نسبی پوشهٔ ماژول داخل archive/ (برای نمایش و مرور فایل‌ها).
        با include_company=False پوشهٔ شرکت ساخته نمی‌شود.
        """
        root = obj.root_folder or ''
        if obj.include_company:
            return f'company_{obj.company_id}/{root}'.strip('/')
        return root


class ArchiveFolderSerializer(serializers.ModelSerializer):
    profile_name = serializers.CharField(source='profile.module_name', read_only=True)

    class Meta:
        model = ArchiveFolder
        fields = [
            'id', 'profile', 'profile_name', 'entity_type', 'entity_id',
            'label', 'relative_path', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']
