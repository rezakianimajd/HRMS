"""Serializers for HR administrative requests."""
from rest_framework import serializers
from employees.models import HRRequest


class HRRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = HRRequest
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'request_type', 'request_type_display',
            'status', 'status_display',
            'requested_date', 'target_value', 'description',
            'reviewed_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'reviewed_by', 'created_at', 'updated_at']