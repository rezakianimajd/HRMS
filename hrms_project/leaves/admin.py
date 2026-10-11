"""پنل ادمین مرخصی و مأموریت (leaves)."""
from django.contrib import admin

from leaves.models import LeaveRequest


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('employee', 'leave_type', 'status', 'start_date', 'end_date', 'days', 'hours')
    list_filter = ('status', 'leave_type')
    search_fields = ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'reason')
    list_select_related = ('employee', 'approved_by')
    raw_id_fields = ('employee', 'approved_by')
    date_hierarchy = 'start_date'
    ordering = ('-start_date',)
