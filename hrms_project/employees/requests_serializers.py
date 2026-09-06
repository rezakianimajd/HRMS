"""Serializers for HR administrative requests."""
from rest_framework import serializers
from employees.models import HRRequest


class HRRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    requested_date_display = serializers.SerializerMethodField(read_only=True)
    created_at_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = HRRequest
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'request_type', 'request_type_display',
            'status', 'status_display',
            'requested_date', 'requested_date_display',
            'target_value', 'description',
            'reviewed_by', 'created_at', 'created_at_display', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'reviewed_by', 'created_at', 'updated_at']

    def _julian(self, d):
        if not d:
            return ''
        from jdatetime import date as jdate
        try:
            j = jdate.fromgregorian(date=d)
            return f'{j.year}/{j.month}/{j.day}'
        except Exception:
            return ''

    def get_requested_date_display(self, obj):
        return self._julian(obj.requested_date)

    def get_created_at_display(self, obj):
        if not obj.created_at:
            return ''
        from jdatetime import datetime as jdt
        try:
            j = jdt.fromgregorian(datetime=obj.created_at)
            return f'{j.year}/{j.month}/{j.day} {j.hour:02d}:{j.minute:02d}'
        except Exception:
            return str(obj.created_at)[:16]
