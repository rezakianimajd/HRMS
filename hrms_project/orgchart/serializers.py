"""Serializers for the OrgChart module."""
from rest_framework import serializers
from orgchart.models import Position
from employees.models import Department


class NullableForeignKeyField(serializers.PrimaryKeyRelatedField):
    """ForeignKey field that converts '' to None (allows clearing via empty string)."""
    def to_internal_value(self, data):
        if data in (None, ''):
            return None
        return super().to_internal_value(data)


class PositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    parent_title = serializers.CharField(source='parent.title', read_only=True)
    occupant_count = serializers.SerializerMethodField()
    parent = NullableForeignKeyField(queryset=Position.objects.all(), required=False, allow_null=True)
    department = NullableForeignKeyField(queryset=Department.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Position
        fields = [
            'id', 'title', 'code', 'parent', 'parent_title', 'level',
            'department', 'department_name', 'description',
            'occupant_count', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def get_occupant_count(self, obj):
        return obj.occupants.count()