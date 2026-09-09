from django.contrib import admin
from recruitment.models import JobRequisition, Candidate, Interview


@admin.register(JobRequisition)
class JobRequisitionAdmin(admin.ModelAdmin):
    list_display = ['title', 'department', 'status', 'headcount', 'created_at']


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'requisition', 'stage', 'rating', 'mobile']


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'interviewer', 'interview_date', 'outcome', 'score']