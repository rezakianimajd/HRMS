"""Serializers for the Leaves module."""
from rest_framework import serializers
from leaves.models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    start_date_display = serializers.SerializerMethodField()
    end_date_display = serializers.SerializerMethodField()
    created_at_display = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'leave_type', 'leave_type_display',
            'status', 'status_display',
            'start_date', 'start_date_display',
            'end_date', 'end_date_display',
            'days', 'hours', 'reason',
            'approved_by', 'created_at', 'created_at_display', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'approved_by', 'created_at', 'updated_at']

    def _jstr(self, value):
        from jdatetime import date as jd
        if not value:
            return ''
        try:
            j = jd.fromgregorian(date=value)
            return f'{j.year}/{j.month}/{j.day}'
        except Exception:
            return str(value)

    def get_start_date_display(self, obj):
        return self._jstr(obj.start_date)

    def get_end_date_display(self, obj):
        return self._jstr(obj.end_date)

    def get_created_at_display(self, obj):
        from jdatetime import datetime as jdt
        if not obj.created_at:
            return ''
        try:
            j = jdt.fromgregorian(datetime=obj.created_at)
            return f'{j.year}/{j.month}/{j.day} {j.hour:02d}:{j.minute:02d}'
        except Exception:
            return str(obj.created_at)[:16]
