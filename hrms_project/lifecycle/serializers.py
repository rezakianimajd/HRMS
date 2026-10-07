"""Serializers for the Employee Lifecycle module."""
from rest_framework import serializers
from lifecycle.models import Asset, LifecycleChecklist, ChecklistItem, CalendarEvent


class AssetSerializer(serializers.ModelSerializer):
    asset_type_display = serializers.CharField(source='get_asset_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_department = serializers.CharField(source='employee.department.name', read_only=True, default='')

    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'asset_type', 'asset_type_display', 'serial_number', 'asset_number',
            'employee', 'employee_name', 'employee_code', 'employee_department',
            'assigned_date', 'return_due_date', 'returned_date', 'status', 'status_display', 'notes',
            'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = ['id', 'checklist', 'title', 'is_completed', 'completed_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class ChecklistItemWriteSerializer(serializers.ModelSerializer):
    """Nested item serializer where ``checklist`` comes from the parent."""
    class Meta:
        model = ChecklistItem
        fields = ['id', 'title', 'is_completed', 'completed_at']
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class LifecycleChecklistSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    items = ChecklistItemWriteSerializer(many=True, required=False)
    progress = serializers.FloatField(read_only=True)

    class Meta:
        model = LifecycleChecklist
        fields = [
            'id', 'employee', 'employee_name', 'employee_code', 'kind', 'kind_display', 'progress',
            'progress_note', 'items', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        checklist = LifecycleChecklist.objects.create(**validated_data)
        for item_data in items_data:
            ChecklistItem.objects.create(
                checklist=checklist,
                company=checklist.company,
                title=item_data.get('title', ''),
            )
        return checklist


class CalendarEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'event_date', 'event_type', 'event_type_display',
            'employee', 'employee_name', 'description', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']