"""
Serializers for the core app.
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from core.models import Company, Domain, AuditLog, UserProfile


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company (Tenant) model."""
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'code', 'schema_name',
            'email', 'phone', 'address', 'postal_code',
            'national_id', 'economic_code', 'registration_number',
            'logo', 'logo_url', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'schema_name', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo and hasattr(obj.logo, 'url'):
            return obj.logo.url
        return None


class DomainSerializer(serializers.ModelSerializer):
    """Serializer for Domain model."""
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)

    class Meta:
        model = Domain
        fields = ['id', 'domain', 'tenant', 'tenant_name', 'is_primary']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    companies = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_superuser', 'is_active', 'date_joined', 'last_login',
            'companies', 'role', 'permissions',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    @staticmethod
    def _profile(obj):
        try:
            return obj.profile
        except Exception:  # noqa: BLE001 — کاربر بدون پروفایل
            return None

    def get_role(self, obj):
        profile = self._profile(obj)
        if profile is not None:
            return profile.role
        return UserProfile.Role.SUPER_ADMIN if obj.is_superuser else UserProfile.Role.EMPLOYEE

    def get_permissions(self, obj):
        """Effective permission keys — used by the UI to hide restricted panels."""
        profile = self._profile(obj)
        if obj.is_superuser:
            permissions = dict(UserProfile.ROLE_DEFAULTS['super_admin'])
        elif profile is not None:
            permissions = dict(profile._effective_permissions())
        else:
            permissions = dict(UserProfile.ROLE_DEFAULTS['employee'])
        permissions['is_super_admin'] = bool(obj.is_superuser or (
            profile is not None and profile.role == UserProfile.Role.SUPER_ADMIN
        ))
        return permissions

    def get_companies(self, obj):
        """
        Get the companies accessible by this user.
        """
        # In future phases, this will use a proper user-company relationship
        if obj.is_superuser:
            companies = Company.objects.filter(is_active=True)
        elif hasattr(obj, 'profile') and hasattr(obj.profile, 'companies'):
            companies = obj.profile.companies.filter(is_active=True)
        else:
            companies = Company.objects.none()
        return CompanySerializer(companies, many=True).data


class LoginSerializer(serializers.Serializer):
    """Serializer for login request."""
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    company_id = serializers.IntegerField(required=False, allow_null=True)


class LoginResponseSerializer(serializers.Serializer):
    """Serializer for login response."""
    refresh = serializers.CharField()
    access = serializers.CharField()
    user = serializers.DictField()
    company = serializers.DictField(required=False, allow_null=True)


class LanguageSwitcherSerializer(serializers.Serializer):
    """Serializer for language switch request."""
    language = serializers.ChoiceField(
        choices=[('fa', 'فارسی'), ('en', 'English')],
        required=True,
    )


class CompanySwitchSerializer(serializers.Serializer):
    """Serializer for company switch request."""
    company_id = serializers.IntegerField(required=True)


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model."""
    user_username = serializers.CharField(source='user.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_username', 'company', 'company_name',
            'action', 'action_display', 'model_name', 'object_id',
            'changes', 'description', 'timestamp', 'ip_address',
        ]
        read_only_fields = ['id', 'timestamp']