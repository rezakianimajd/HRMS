"""پنل ادمین حضور و غیاب (attendance)."""
from django.contrib import admin

from attendance.models import AttendanceRecord


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'status', 'check_in', 'check_out', 'work_hours', 'overtime_hours')
    list_filter = ('status', 'date')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'note')
    list_select_related = ('employee',)
    raw_id_fields = ('employee',)
    date_hierarchy = 'date'
    ordering = ('-date',)
