"""Serializers for the Attendance module."""
from rest_framework import serializers
from attendance.models import AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    date_display = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'date', 'date_display',
            'status', 'status_display',
            'check_in', 'check_out',
            'work_hours', 'overtime_hours',
            'note',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_date_display(self, obj):
        """Render date as Jalali string for grid/list views."""
        try:
            from jdatetime import date as jdate
            jd = jdate.fromgregorian(date=obj.date)
            return f'{jd.year}/{jd.month}/{jd.day}'
        except Exception:
            return str(obj.date)