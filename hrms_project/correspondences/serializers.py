"""Serializers for the Correspondences module."""
from rest_framework import serializers
from correspondences.models import IncomingLetter, OutgoingLetter, Announcement, Form, Organization, OrganizationalLetter


def _clean(data):
    """Drop empty-string values and file URL strings (not real uploads)."""
    cleaned = {}
    for k, v in data.items():
        if v == '' or v is None:
            continue
        if k == 'file' and isinstance(v, str):
            continue
        cleaned[k] = v
    return cleaned


class IncomingLetterSerializer(serializers.ModelSerializer):
    employee_names = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = IncomingLetter
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_employee_names(self, obj):
        return [e.full_name for e in obj.employees.all()]

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class OutgoingLetterSerializer(serializers.ModelSerializer):
    employee_names = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = OutgoingLetter
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_employee_names(self, obj):
        return [e.full_name for e in obj.employees.all()]

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class AnnouncementSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Announcement
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class FormSerializer(serializers.ModelSerializer):
    class Meta:
        model = Form
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class OrganizationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Organization
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))


class OrganizationalLetterSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    letter_type_display = serializers.CharField(source='get_letter_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = OrganizationalLetter
        fields = '__all__'
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        return super().to_internal_value(_clean(data))
