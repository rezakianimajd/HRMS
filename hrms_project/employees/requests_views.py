"""Views for HR administrative / workflow requests."""
from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import action

from employees.models import HRRequest
from employees.requests_serializers import HRRequestSerializer


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class HRRequestViewSet(viewsets.ModelViewSet):
    queryset = HRRequest.objects.select_related('employee')
    serializer_class = HRRequestSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id', 'description', 'target_value']
    ordering_fields = ['created_at', 'requested_date', 'employee__employee_id']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)
        return qs

    def perform_create(self, serializer):
        # default date = today if not provided
        from datetime import date
        data = dict(serializer.validated_data)
        data.setdefault('requested_date', date.today())
        data['company'] = _company(self.request)
        serializer.save(**data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        if obj.status != HRRequest.Status.PENDING:
            return Response({'error': 'فقط درخواست‌های در انتظار قابل تأیید هستند.'}, status=400)
        obj.status = HRRequest.Status.APPROVED
        obj.save(update_fields=['status', 'updated_at'])
        return Response(HRRequestSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        obj = self.get_object()
        if obj.status != HRRequest.Status.PENDING:
            return Response({'error': 'فقط درخواست‌های در انتظار قابل رد هستند.'}, status=400)
        obj.status = HRRequest.Status.REJECTED
        obj.save(update_fields=['status', 'updated_at'])
        return Response(HRRequestSerializer(obj).data)