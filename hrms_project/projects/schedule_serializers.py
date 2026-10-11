"""سریالایزرهای فاز ۱ — زمان‌بندی، منابع و EVM."""
from rest_framework import serializers

from projects.jalali_utils import jalali_full
from projects.schedule_models import (
    Activity, ActivityProgress, ActivityRelationship, Baseline, BaselineActivity,
    CalendarException, ResourceAssignment, ResourceRate, WorkCalendar,
)


class WorkCalendarSerializer(serializers.ModelSerializer):
    exceptions_count = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = WorkCalendar
        fields = [
            'id', 'project', 'project_name', 'code', 'name', 'working_days',
            'half_working_days', 'hours_per_day', 'is_default', 'note',
            'exceptions_count', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_exceptions_count(self, obj):
        return obj.exceptions.count()


class CalendarExceptionSerializer(serializers.ModelSerializer):
    jalali_date = serializers.SerializerMethodField()

    class Meta:
        model = CalendarException
        fields = ['id', 'calendar', 'date', 'jalali_date', 'is_working', 'hours', 'title']
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_jalali_date(self, obj):
        return jalali_full(obj.date)


class ActivityRelationshipSerializer(serializers.ModelSerializer):
    predecessor_code = serializers.CharField(source='predecessor.code', read_only=True)
    successor_code = serializers.CharField(source='successor.code', read_only=True)
    rel_type_display = serializers.CharField(source='get_rel_type_display', read_only=True)

    class Meta:
        model = ActivityRelationship
        fields = [
            'id', 'project', 'predecessor', 'predecessor_code', 'successor',
            'successor_code', 'rel_type', 'rel_type_display', 'lag_days',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class ActivitySerializer(serializers.ModelSerializer):
    wbs_name = serializers.CharField(source='wbs.name', read_only=True)
    calendar_name = serializers.CharField(source='calendar.name', read_only=True)
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    constraint_type_display = serializers.CharField(source='get_constraint_type_display', read_only=True)
    start_jalali = serializers.SerializerMethodField()
    finish_jalali = serializers.SerializerMethodField()
    late_start_jalali = serializers.SerializerMethodField()
    late_finish_jalali = serializers.SerializerMethodField()
    actual_start_jalali = serializers.SerializerMethodField()
    actual_finish_jalali = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id', 'project', 'wbs', 'wbs_name', 'calendar', 'calendar_name',
            'code', 'name', 'activity_type', 'activity_type_display',
            'duration_days', 'constraint_type', 'constraint_type_display',
            'constraint_date', 'sequence',
            'early_start', 'early_finish', 'late_start', 'late_finish',
            'total_float', 'is_critical',
            'actual_start', 'actual_finish', 'percent_complete', 'weight',
            'planned_cost', 'actual_cost', 'progress_method', 'notes',
            'start_jalali', 'finish_jalali', 'late_start_jalali', 'late_finish_jalali',
            'actual_start_jalali', 'actual_finish_jalali', 'created_at',
        ]
        read_only_fields = [
            'id', 'company', 'created_at', 'updated_at',
            'early_start', 'early_finish', 'late_start', 'late_finish',
            'total_float', 'is_critical',
        ]

    def _jalali(self, value):
        return jalali_full(value)

    def get_start_jalali(self, obj):
        return self._jalali(obj.early_start)

    def get_finish_jalali(self, obj):
        return self._jalali(obj.early_finish)

    def get_late_start_jalali(self, obj):
        return self._jalali(obj.late_start)

    def get_late_finish_jalali(self, obj):
        return self._jalali(obj.late_finish)

    def get_actual_start_jalali(self, obj):
        return self._jalali(obj.actual_start)

    def get_actual_finish_jalali(self, obj):
        return self._jalali(obj.actual_finish)


class BaselineItemSerializer(serializers.ModelSerializer):
    activity_code = serializers.CharField(source='activity.code', read_only=True)

    class Meta:
        model = BaselineActivity
        fields = [
            'id', 'baseline', 'activity', 'activity_code', 'code', 'name',
            'early_start', 'early_finish', 'late_start', 'late_finish',
            'duration_days', 'total_float', 'planned_cost', 'weight',
        ]


class BaselineSerializer(serializers.ModelSerializer):
    items = BaselineItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Baseline
        fields = [
            'id', 'project', 'project_name', 'name', 'version', 'is_current',
            'total_cost', 'start_date', 'end_date', 'note',
            'items', 'items_count', 'created_at',
        ]
        read_only_fields = [
            'id', 'company', 'created_at', 'updated_at', 'version',
            'total_cost', 'start_date', 'end_date',
        ]

    def get_items_count(self, obj):
        return obj.items.count()


class ResourceRateSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)

    class Meta:
        model = ResourceRate
        fields = [
            'id', 'resource', 'resource_name', 'effective_from', 'rate',
            'currency', 'currency_code', 'note',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class ResourceAssignmentSerializer(serializers.ModelSerializer):
    activity_code = serializers.CharField(source='activity.code', read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)

    class Meta:
        model = ResourceAssignment
        fields = [
            'id', 'activity', 'activity_code', 'resource', 'resource_name',
            'units_per_day', 'planned_qty', 'actual_qty', 'unit_rate',
            'planned_cost', 'actual_cost',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']


class ActivityProgressSerializer(serializers.ModelSerializer):
    activity_code = serializers.CharField(source='activity.code', read_only=True)
    jalali_date = serializers.SerializerMethodField()

    class Meta:
        model = ActivityProgress
        fields = [
            'id', 'activity', 'activity_code', 'date', 'jalali_date',
            'percent_complete', 'quantity', 'note',
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']

    def get_jalali_date(self, obj):
        return jalali_full(obj.date)

