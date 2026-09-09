from django.contrib import admin
from appraisal.models import AppraisalCycle, AppraisalRecord


@admin.register(AppraisalCycle)
class AppraisalCycleAdmin(admin.ModelAdmin):
    list_display = ['title', 'cycle_type', 'start_date', 'end_date', 'status']


@admin.register(AppraisalRecord)
class AppraisalRecordAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'employee', 'total_score', 'reviewed_by']
    list_filter = ['cycle']