"""Serializers for the Leaves module."""
from rest_framework import serializers
from leaves.models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'leave_type', 'leave_type_display',
            'status', 'status_display',
            'start_date', 'end_date', 'days', 'reason',
            'approved_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'approved_by', 'created_at', 'updated_at']