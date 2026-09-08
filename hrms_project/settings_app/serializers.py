"""Serializers for the Settings module."""
from rest_framework import serializers
from settings_app.models import SystemSetting, CompanyProfile, BaleContact, Signatory


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
            'id', 'full_name', 'position', 'national_id',
            'signature_image', 'signature_image_url', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_signature_image_url(self, obj):
        if obj.signature_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.signature_image.url)
            return obj.signature_image.url
        return None


class CompanyProfileSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanyProfile
        fields = [
            'id', 'company', 'company_name',
            'legal_name', 'registration_number', 'national_id',
            'economic_code', 'phone', 'email', 'address', 'postal_code',
            'website', 'logo', 'logo_url', 'tax_id',
            'established_date', 'description',
            'employer_rep_name', 'employer_rep_title', 'employer_rep_national_id',
            'notify_email_enabled', 'notify_bale_enabled',
            'bale_token', 'bale_chat_id',
            'base_storage_path', 'storage_path_employees',
            'storage_path_correspondences', 'storage_path_documents',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo and hasattr(obj.logo, 'url'):
            return obj.logo.url
        return None