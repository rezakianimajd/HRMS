"""Serializers for the Settings module."""
from rest_framework import serializers
from settings_app.models import SystemSetting, CompanyProfile


class SystemSettingSerializer(serializers.ModelSerializer):
    data_type_display = serializers.CharField(source='get_data_type_display', read_only=True)

    class Meta:
        model = SystemSetting
        fields = ['id', 'key', 'value', 'description', 'data_type', 'data_type_display', 'is_editable', 'is_active']
        read_only_fields = ['id', 'key']


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
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo and hasattr(obj.logo, 'url'):
            return obj.logo.url
        return None