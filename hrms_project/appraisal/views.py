"""Views for the Appraisal module."""
from rest_framework import viewsets, filters
from appraisal.models import AppraisalCycle, AppraisalRecord
from appraisal.serializers import AppraisalCycleSerializer, AppraisalRecordSerializer


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class AppraisalCycleViewSet(viewsets.ModelViewSet):
    serializer_class = AppraisalCycleSerializer
    queryset = AppraisalCycle.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'cycle_type']
    ordering = ['-start_date']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        serializer.save(company=company)


class AppraisalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AppraisalRecordSerializer
    queryset = AppraisalRecord.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'reviewed_by']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related('employee__department', 'employee__job_title')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        cycle_id = self.request.query_params.get('cycle')
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        serializer.save(company=company)