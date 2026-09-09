"""Serializers for the Appraisal module."""
from rest_framework import serializers
from appraisal.models import AppraisalCycle, AppraisalRecord


class AppraisalCycleSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    records_count = serializers.IntegerField(read_only=True)
    avg_score = serializers.FloatField(read_only=True)

    class Meta:
        model = AppraisalCycle
        fields = [
            'id', 'title', 'cycle_type', 'start_date', 'end_date', 'status',
            'status_display', 'description', 'weights', 'records_count', 'avg_score',
            'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']


class AppraisalRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    department = serializers.CharField(source='employee.department.name', read_only=True)
    job_title = serializers.CharField(source='employee.job_title.name', read_only=True)

    class Meta:
        model = AppraisalRecord
        fields = [
            'id', 'cycle', 'employee', 'employee_name', 'employee_code',
            'department', 'job_title', 'total_score', 'breakdown',
            'self_score', 'manager_score', 'goals', 'strengths', 'improvements',
            'comments', 'reviewed_by', 'created_at',
        ]
        read_only_fields = ['id', 'company', 'is_active', 'created_at', 'updated_at']