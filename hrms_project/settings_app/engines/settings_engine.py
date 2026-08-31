"""Settings Engine for managing system settings per company."""
import json
from django.core.cache import cache
from settings_app.models import SystemSetting, CompanyProfile
from core.models import Company


class SettingsEngine:
    """Engine for managing system-wide settings per tenant."""

    @staticmethod
    def get_setting(key, company, default=None):
        """Get a setting by key, with caching and fallback to default."""
        cache_key = f"setting_{company.id}_{key}" if company else f"setting_public_{key}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            if company:
                setting = SystemSetting.objects.get(company=company, key=key, is_active=True)
            else:
                setting = SystemSetting.objects.get(company__isnull=True, key=key, is_active=True)
        except SystemSetting.DoesNotExist:
            return SettingsEngine._cast_value(default, 'string')

        value = SettingsEngine._cast_value(setting.value, setting.data_type)
        cache.set(cache_key, value, 300)
        return value

    @staticmethod
    def set_setting(key, value, company, description=None):
        """Set a setting value."""
        setting, _ = SystemSetting.objects.get_or_create(
            company=company, key=key,
            defaults={'value': str(value), 'description': description or '', 'data_type': 'string'}
        )
        if not _:  # already existed
            setting.value = str(value)
            if description:
                setting.description = description
            setting.save()
        cache_key = f"setting_{company.id}_{key}" if company else f"setting_public_{key}"
        cache.delete(cache_key)
        return setting

    @staticmethod
    def get_all_settings(company):
        """Get all settings for a company as a dict."""
        qs = SystemSetting.objects.filter(company=company, is_active=True)
        settings = {}
        for s in qs:
            settings[s.key] = SettingsEngine._cast_value(s.value, s.data_type)
        # Fill defaults for missing keys
        for default in SystemSetting.get_default_settings():
            if default['key'] not in settings:
                settings[default['key']] = SettingsEngine._cast_value(default['value'], default['data_type'])
        return settings

    @staticmethod
    def get_company_profile(company):
        """Get or create company profile."""
        profile, _ = CompanyProfile.objects.get_or_create(company=company)
        return profile

    @staticmethod
    def update_company_profile(company, data):
        """Update company profile fields."""
        profile, _ = CompanyProfile.objects.get_or_create(company=company)
        updatable = [
            'legal_name', 'registration_number', 'national_id', 'economic_code',
            'phone', 'email', 'address', 'postal_code', 'website',
            'tax_id', 'established_date', 'description',
        ]
        for field in updatable:
            if field in data:
                setattr(profile, field, data[field])
        if 'logo' in data:
            profile.logo = data['logo']
        profile.save()

        # Keep the Company.name (shown in the sidebar as company_name) in sync
        # with the legal name edited from the Settings/Definitions page.
        legal_name = getattr(profile, 'legal_name', None)
        if legal_name and legal_name != company.name:
            company.name = legal_name
            company.save(update_fields=['name'])

        return profile

    @staticmethod
    def _cast_value(value, data_type):
        """Cast stored string value to the correct Python type."""
        if value is None:
            return None
        if data_type == 'integer':
            try:
                return int(value)
            except (ValueError, TypeError):
                return 0
        if data_type == 'boolean':
            return str(value).lower() in ('true', '1', 'yes')
        if data_type == 'json':
            try:
                return json.loads(value) if isinstance(value, str) else value
            except json.JSONDecodeError:
                return []
        return str(value)